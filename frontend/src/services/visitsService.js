/**
 * Visits Service
 * Handles all Supabase queries for visits table
 * Manages medical visit records, appointments, and history
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID, withTimeout } from '../lib/utils';
import {
  canonicalizeVisitStatus,
  countVisitsByResolvedStatus,
  getVisitStateFromKpi,
  resolveVisitStatus,
  visitMatchesResolvedState,
} from '../utils/visitStatus';

const TABLE_NAME = 'visits';
const VISIT_RESOLUTION_ROW_LIMIT = 5000;

const VISIT_PAGE_WRITE_COLUMNS = new Set([
  'user_id',
  'hospital_id',
  'date',
  'time',
  'type',
  'status',
  'notes',
  'cost',
  'preparation',
  'room_number',
  'estimated_duration',
  'insurance_covered'
]);

const VISIT_PAGE_STATUS_VALUES = new Set([
  'scheduled',
  'upcoming',
  'in_progress'
]);

const sanitizeVisitSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[,%]/g, ' ')
  .replace(/\s+/g, ' ')
  .slice(0, 80);

function normalizeVisitForUI(visit) {
  if (!visit) return visit;
  return {
    ...visit,
    doctor: visit.doctor ?? visit.doctor_name ?? null,
    visit_type: visit.visit_type ?? visit.type ?? null,
    room_number: visit.room_number ?? null
  };
}

function buildVisitWritePayload(input = {}, { includeCreateDefaults = false } = {}) {
  const payload = {};

  const aliases = {
    visit_date: 'date',
    visit_type: 'type',
    doctor: 'doctor_name'
  };

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const targetKey = aliases[key] || key;

    if (!VISIT_PAGE_WRITE_COLUMNS.has(targetKey)) continue;
    if (targetKey === 'status' && !VISIT_PAGE_STATUS_VALUES.has(value)) continue;
    payload[targetKey] = value;
  }

  if (includeCreateDefaults) {
    if (!payload.date && input.date) payload.date = input.date;
    if (!payload.date && input.visit_date) payload.date = input.visit_date;
    if (!payload.type && input.type) payload.type = input.type;
    if (!payload.type && input.visit_type) payload.type = input.visit_type;
    if (!payload.status) payload.status = 'scheduled';
    payload.created_at = new Date().toISOString();
  }

  payload.updated_at = new Date().toISOString();
  return payload;
}

const mapVisitSortKey = (key) => {
  if (key === 'visit_type') return 'type';
  if (key === 'room_number') return 'hospital_name';
  if (key === 'doctor') return 'doctor_name';
  return key || 'date';
};

const applyVisitPageFilters = (query, filters = {}) => {
  let nextQuery = query;
  const search = sanitizeVisitSearchTerm(filters.search);

  if (filters.visit_type && filters.visit_type.length > 0) {
    nextQuery = nextQuery.in('type', filters.visit_type);
  }

  if (filters.date) {
    if (filters.date.start) nextQuery = nextQuery.gte('date', filters.date.start);
    if (filters.date.end) nextQuery = nextQuery.lte('date', filters.date.end);
  }

  if (search) {
    const pattern = `%${search}%`;
    nextQuery = nextQuery.or([
      `display_id.ilike.${pattern}`,
      `type.ilike.${pattern}`,
      `status.ilike.${pattern}`,
      `notes.ilike.${pattern}`,
      `hospital_name.ilike.${pattern}`,
      `doctor_name.ilike.${pattern}`,
      `room_number.ilike.${pattern}`,
      `cost.ilike.${pattern}`,
    ].join(','));
  }

  return nextQuery;
};

const getResolvedStatusFilters = (filters = {}) => (
  Array.isArray(filters.status)
    ? filters.status.map((status) => canonicalizeVisitStatus(status, null)).filter(Boolean)
    : filters.status
      ? [canonicalizeVisitStatus(filters.status, null)].filter(Boolean)
      : []
);

const applyResolvedVisitFilters = (visits = [], filters = {}, kpiFilter = 'all') => {
  const statusFilters = getResolvedStatusFilters(filters);
  const kpiState = getVisitStateFromKpi(kpiFilter);

  return (visits || []).filter((visit) => {
    if (statusFilters.length > 0 && !statusFilters.some((status) => visitMatchesResolvedState(visit, status))) {
      return false;
    }
    if (kpiState && !visitMatchesResolvedState(visit, kpiState)) {
      return false;
    }
    return true;
  });
};

const applyVisitPageAuth = (query, user) => applyAuthFilter(query, user, {
  userIdField: 'user_id',
  orgIdField: 'hospital_id',
  providerIdField: 'doctor_name',
  resourceType: 'visit'
});

const getVisitDateValue = (visit) => String(visit?.date || visit?.visit_date || visit?.created_at || '');

function getVisitPageStatsFromRows(visits = []) {
  const today = new Date();
  const todayStart = today.toISOString().split('T')[0];
  const counts = countVisitsByResolvedStatus(visits);

  return {
    ...counts,
    today: (visits || []).filter((visit) => getVisitDateValue(visit).startsWith(todayStart)).length,
  };
}

const compareVisitValue = (left, right) => {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return -1;
  if (right === null || right === undefined || right === '') return 1;

  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

const sortVisitsForPage = (visits = [], sortConfig = { key: 'status', direction: 'desc' }) => {
  const sortKey = mapVisitSortKey(sortConfig.key || 'date');
  const direction = sortConfig.direction === 'asc' ? 1 : -1;

  return [...(visits || [])].sort((left, right) => {
    const leftValue = left?.[sortKey] ?? left?.[sortConfig.key];
    const rightValue = right?.[sortKey] ?? right?.[sortConfig.key];
    return compareVisitValue(leftValue, rightValue) * direction;
  });
};

async function enrichVisitsForPage(visits = []) {
  if (!visits.length) return [];

  const userIds = [...new Set(visits.map(v => v.user_id).filter(Boolean))];
  const emergencyLookupIds = [
    ...new Set(
      visits
        .map((v) => v.request_id || v.id)
        .filter(Boolean)
    )
  ];
  const directHospitalIds = [...new Set(visits.map(v => v.hospital_id).filter(Boolean))];

  const [{ data: profiles }, { data: emergencyRows }] = await Promise.all([
    userIds.length > 0
      ? supabase
        .from('profiles')
        .select('id, username, email, full_name')
        .in('id', userIds)
      : Promise.resolve({ data: [] }),
    emergencyLookupIds.length > 0
      ? supabase
        .from('emergency_requests')
        .select('id, hospital_id, hospital_name, status, service_type, assigned_doctor_id')
        .in('id', emergencyLookupIds)
      : Promise.resolve({ data: [] })
  ]);

  const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  const emergencyByRequest = (emergencyRows || []).reduce((acc, row) => ({ ...acc, [row.id]: row }), {});

  const doctorIds = [
    ...new Set((emergencyRows || []).map(r => r.assigned_doctor_id).filter(Boolean))
  ];

  let doctorsMap = {};
  if (doctorIds.length > 0) {
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, name')
      .in('id', doctorIds);
    doctorsMap = (doctors || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
  }

  const hospitalIds = [
    ...new Set([
      ...directHospitalIds,
      ...(emergencyRows || []).map(r => r.hospital_id).filter(Boolean)
    ])
  ];

  let hospitalsMap = {};
  if (hospitalIds.length > 0) {
    const { data: hospitalRows } = await supabase
      .from('hospitals')
      .select('id, name, address')
      .in('id', hospitalIds);
    hospitalsMap = (hospitalRows || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {});
  }

  return visits.map((visit) => {
    const emergency =
      (visit.request_id ? emergencyByRequest[visit.request_id] : null) ||
      emergencyByRequest[visit.id] ||
      null;
    const linkedHospitalId = visit.hospital_id || emergency?.hospital_id || null;
    const linkedHospitalName =
      visit.hospital_name ||
      emergency?.hospital_name ||
      hospitalsMap[linkedHospitalId]?.name ||
      null;
    const normalizedStatus = resolveVisitStatus({
      visitStatus: visit.status,
      emergencyStatus: emergency?.status,
    });
    const emergencyDoctorName = emergency?.assigned_doctor_id
      ? doctorsMap[emergency.assigned_doctor_id]?.name || null
      : null;
    const doctorName = visit.doctor_name || emergencyDoctorName || null;
    const visitType = visit.visit_type || visit.type || emergency?.service_type || null;

    return normalizeVisitForUI({
      ...visit,
      request_id: visit.request_id || emergency?.id || null,
      hospital_id: linkedHospitalId,
      hospital_name: linkedHospitalName,
      source_status: visit.status || null,
      emergency_status: emergency?.status || null,
      status: normalizedStatus,
      type: visitType,
      visit_type: visitType,
      doctor_name: doctorName,
      patient: profilesMap[visit.user_id] || null,
      doctor: visit.doctor || doctorName || null
    });
  });
}

async function getVisitResolutionRows({ filters = {}, user }) {
  let resolutionQuery = supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact' })
    .range(0, VISIT_RESOLUTION_ROW_LIMIT - 1);

  resolutionQuery = applyVisitPageAuth(resolutionQuery, user);
  resolutionQuery = applyVisitPageFilters(resolutionQuery, filters);

  const { data, error, count } = await withTimeout(
    resolutionQuery,
    8000,
    'Failed to resolve visit source rows - timeout'
  );
  if (error) throw error;

  const rows = data || [];
  if (Number.isFinite(count) && count > rows.length) {
    throw new Error('Visit source projection is larger than the client resolver limit; backend visit status projection required.');
  }

  return enrichVisitsForPage(rows);
}

export async function getVisitsPageData({
  filters = {},
  kpiFilter = 'all',
  range = { start: 0, end: 19 },
  sortConfig = { key: 'status', direction: 'desc' },
  quiet = false,
} = {}) {
  try {
    const user = await getCurrentUser();

    const resolvedRows = await getVisitResolutionRows({ filters, user });
    const statsRows = applyResolvedVisitFilters(resolvedRows, filters, 'all');
    const filteredRows = applyResolvedVisitFilters(resolvedRows, filters, kpiFilter);
    const sortedRows = sortVisitsForPage(filteredRows, sortConfig);
    const start = Math.max(Number(range.start) || 0, 0);
    const end = Math.max(Number(range.end) || start, start);
    const visits = sortedRows.slice(start, end + 1);
    const stats = getVisitPageStatsFromRows(statsRows);

    return {
      visits,
      count: filteredRows.length,
      stats,
    };
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching visits page data:', error);
    }
    throw error;
  }
}

/**
 * Get all visits with optional filters
 * Admin users can see all visits, others see only their own
 */
export async function getVisits(filter = {}) {
  try {
    const user = await getCurrentUser();
    // hospital_id is a UUID FK to the hospitals table.
    let query = supabase.from(TABLE_NAME).select(`
      *,
      profiles!visits_user_id_fkey (
        id,
        username,
        email,
        full_name,
        phone,
        avatar_url
      )
    `);

    // 1. Apply RBAC Scoping with improved hospital/doctor logic
    query = applyAuthFilter(query, user, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id', // Org admins see visits at their hospital
      providerIdField: 'doctor_name', // Providers may match by display name fallback
      resourceType: 'visit' // Enables provider-specific logic
    });

    // 2. Apply Custom Filters
    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter?.doctor) {
      query = query.eq('doctor_name', filter.doctor);
    }
    if (filter?.doctor_name) {
      query = query.eq('doctor_name', filter.doctor_name);
    }
    if (filter?.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.visit_type) {
      query = query.eq('type', filter.visit_type);
    }

    if (filter?.date_from) {
      query = query.gte('date', filter.date_from);
    }
    if (filter?.date_to) {
      query = query.lte('date', filter.date_to);
    }

    // 3. Apply ordering and pagination
    query = query.order('date', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to include nested patient info
    return (data || []).map(visit => normalizeVisitForUI({
      ...visit,
      patient: visit.profiles, // Map profiles to patient for consistency
      profiles: undefined, // Remove original profiles to avoid confusion
    }));
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching visits:', error);
    }
    throw error;
  }
}

/**
 * Get single visit by ID
 */
export async function getVisit(visitId) {
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        profiles!visits_user_id_fkey (
          id,
          username,
          email,
          full_name,
          phone,
          avatar_url
        )
      `);

    if (isValidUUID(visitId)) {
      query = query.eq('id', visitId);
    } else {
      query = query.eq('display_id', visitId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;

    // Transform data to include nested patient info
    if (data) {
      return {
        ...normalizeVisitForUI(data),
        patient: data.profiles, // Map profiles to patient for consistency
        profiles: undefined // Remove original profiles to avoid confusion
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching visit ${visitId}:`, error);
    throw error;
  }
}

/**
 * Get the visit linked to an emergency request.
 * PULLBACK NOTE: Pass 1 emergency detail alignment.
 * OLD: callers passed emergency request ids into getVisit(), which only reads visits.id/display_id.
 * NEW: request-derived clinical records read by visits.request_id first, then legacy id/display_id fallback.
 */
export async function getVisitByRequestId(requestId) {
  try {
    if (!requestId) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        profiles!visits_user_id_fkey (
          id,
          username,
          email,
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq('request_id', requestId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        ...normalizeVisitForUI(data),
        patient: data.profiles,
        profiles: undefined
      };
    }

    return getVisit(requestId);
  } catch (error) {
    console.error(`Error fetching visit for request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Create new visit
 */
export async function createVisit(input) {
  try {
    const payload = buildVisitWritePayload(input, { includeCreateDefaults: true });

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return normalizeVisitForUI(data);
  } catch (error) {
    console.error('Error creating visit:', error);
    throw error;
  }
}

/**
 * Update visit
 */
export async function updateVisit(visitId, input) {
  try {
    const payload = buildVisitWritePayload(input);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;

    return normalizeVisitForUI(data);
  } catch (error) {
    console.error(`Error updating visit ${visitId}:`, error);
    throw error;
  }
}

/**
 * Delete visit
 */
export async function deleteVisit(visitId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', visitId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting visit ${visitId}:`, error);
    throw error;
  }
}

/**
 * Complete visit
 */
export async function completeVisit(visitId, summary, prescriptions) {
  try {
    // PULLBACK NOTE: Write to dedicated summary/prescriptions columns (now in pillar)
    // OLD: collapsed both fields into notes as "summaryText | prescriptionsText"
    // NEW: summary -> TEXT column, prescriptions -> TEXT[] column, notes preserved separately
    const summaryText = String(summary || '').trim() || null;
    const prescriptionsArray = Array.isArray(prescriptions)
      ? prescriptions.filter(Boolean)
      : prescriptions
        ? String(prescriptions).split(',').map(s => s.trim()).filter(Boolean)
        : null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'completed',
        ...(summaryText ? { summary: summaryText } : {}),
        ...(prescriptionsArray?.length ? { prescriptions: prescriptionsArray } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error completing visit ${visitId}:`, error);
    throw error;
  }
}

/**
 * Cancel visit
 */
export async function cancelVisit(visitId, reason) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error cancelling visit ${visitId}:`, error);
    throw error;
  }
}

/**
 * Mark visit as no-show
 */
export async function markVisitAsNoShow(visitId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'no-show',
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error marking visit as no-show ${visitId}:`, error);
    throw error;
  }
}

/**
 * Get visits for specific user
 */
export async function getUserVisits(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get upcoming visits for user
 */
export async function getUserUpcomingVisits(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching upcoming visits for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get completed visits for user
 */
export async function getUserCompletedVisits(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching completed visits for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get visits for specific doctor
 */
export async function getDoctorVisits(doctorId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('doctor_name', doctorId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for doctor ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Get visits for specific hospital
 */
export async function getHospitalVisits(hospitalId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Get visits statistics/analytics
 */
export async function getVisitStats() {
  try {
    const { count: totalCount } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    const { data: scheduledData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'scheduled');

    const { data: completedData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'completed');

    const { data: cancelledData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'cancelled');

    const { data: noShowData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'no-show');

    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'completed')
      .gte('date', `${today}T00:00:00`)
      .lte('date', `${today}T23:59:59`);

    const { data: scheduledUpcoming } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'scheduled')
      .gte('date', today);

    return {
      total_visits: totalCount || 0,
      scheduled_visits: scheduledData?.length || 0,
      completed_visits: completedData?.length || 0,
      cancelled_visits: cancelledData?.length || 0,
      no_show_visits: noShowData?.length || 0,
      completed_today: completedToday?.length || 0,
      scheduled_upcoming: scheduledUpcoming?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching visit stats:', error);
    throw error;
  }
}

/**
 * Subscribe to single visit updates
 */
export function subscribeToVisit(visitId, callback) {
  const channel = supabase
    .channel(`visit_${visitId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${visitId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to all visit changes
 */
export function subscribeToAllVisits(callback) {
  const channel = supabase
    .channel('visits_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to user's visit updates
 */
export function subscribeToUserVisits(userId, callback) {
  const channel = supabase
    .channel(`user_visits_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
