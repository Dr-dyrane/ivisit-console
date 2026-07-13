/**
 * Visits Service
 * Handles all Supabase queries for visits table
 * Manages medical visit records, appointments, and history
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';
import { withRetry } from './supabaseHelpers';
import {
  applyQueryAbortSignal,
  createQueryAbortContext,
  retryTransientRead,
  throwIfQueryAborted,
} from './queryAbort';
import {
  canonicalizeVisitStatus,
  countVisitsByResolvedStatus,
  getVisitStateFromKpi,
  resolveVisitStatus,
  visitMatchesResolvedState,
} from '../utils/visitStatus';
import { getVisitPatientLabel } from '../utils/visitRowProjection';

const TABLE_NAME = 'visits';
const VISIT_RESOLUTION_ROW_LIMIT = 5000;
export const VISIT_MUTATION_UNAVAILABLE_REASON = 'Visit changes are unavailable until an authorized workflow receiver is connected.';
// PostgREST .in() lists ride the request URL, which caps out far below the
// 5000-row resolver limit — chunk enrichment lookups and merge the results.
const ENRICHMENT_ID_CHUNK_SIZE = 200;

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

// Sort honesty: 'room_number' (the Location column) used to silently remap to
// hospital_name; it now sorts as itself.
const mapVisitSortKey = (key) => {
  if (key === 'visit_type') return 'type';
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

// Only true timestamp columns may route through Date.parse; arbitrary strings
// (statuses, display ids, names) must never be compared as dates.
const VISIT_DATE_SORT_KEYS = new Set(['date', 'visit_date', 'created_at', 'updated_at']);

// Costs are stored/rendered with currency formatting ("NGN 5,000", "$1,200.50");
// strip formatting so the Cost column sorts numerically.
const parseVisitCostValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  const numeric = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const compareVisitValue = (left, right, { isDateKey = false, isCostKey = false } = {}) => {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return -1;
  if (right === null || right === undefined || right === '') return 1;

  if (isCostKey) {
    const leftCost = parseVisitCostValue(left);
    const rightCost = parseVisitCostValue(right);
    if (leftCost !== null && rightCost !== null && leftCost !== rightCost) {
      return leftCost - rightCost;
    }
  }

  if (isDateKey) {
    const leftDate = Date.parse(left);
    const rightDate = Date.parse(right);
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
      return leftDate - rightDate;
    }
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

// Sort honesty: the Patient and Hospital columns display enriched names, so
// sorting uses the same display values instead of the raw UUID foreign keys.
const getVisitSortValue = (visit, sortKey, rawKey) => {
  if (sortKey === 'user_id') {
    return getVisitPatientLabel(visit);
  }
  if (sortKey === 'hospital_id') {
    return visit?.hospital_name ?? null;
  }
  return visit?.[sortKey] ?? visit?.[rawKey];
};

const sortVisitsForPage = (visits = [], sortConfig = { key: 'status', direction: 'desc' }) => {
  const rawKey = sortConfig.key || 'date';
  const sortKey = mapVisitSortKey(rawKey);
  const direction = sortConfig.direction === 'asc' ? 1 : -1;
  const compareOptions = {
    isDateKey: VISIT_DATE_SORT_KEYS.has(sortKey),
    isCostKey: sortKey === 'cost',
  };

  return [...(visits || [])].sort((left, right) => {
    const leftValue = getVisitSortValue(left, sortKey, rawKey);
    const rightValue = getVisitSortValue(right, sortKey, rawKey);
    return compareVisitValue(leftValue, rightValue, compareOptions) * direction;
  });
};

const chunkIdList = (ids = [], size = ENRICHMENT_ID_CHUNK_SIZE) => {
  const chunks = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
};

// Enrichment reads tolerate partial failure exactly like the previous
// destructured `{ data }` reads did: each chunk contributes `data || []`.
async function fetchChunkedRows(ids, buildChunkQuery, abortSignal) {
  if (!ids.length) return [];
  const results = await Promise.all(
    chunkIdList(ids).map((chunk) => (
      applyQueryAbortSignal(buildChunkQuery(chunk), abortSignal)
    ))
  );
  throwIfQueryAborted(abortSignal);
  return results.flatMap(({ data }) => data || []);
}

async function enrichVisitsForPage(visits = [], abortSignal) {
  if (!visits.length) return [];

  const userIds = [...new Set(visits.map(v => v.user_id).filter(Boolean))];
  // Only visits that actually link an emergency (request_id) join the lookup;
  // bare visit ids used to flood the .in() list with ids that are not
  // emergency ids, pushing the request URL past PostgREST limits.
  const emergencyLookupIds = [...new Set(visits.map((v) => v.request_id).filter(Boolean))];
  const directHospitalIds = [...new Set(visits.map(v => v.hospital_id).filter(Boolean))];

  const [profiles, emergencyRows] = await Promise.all([
    fetchChunkedRows(userIds, (chunk) => supabase
      .from('profiles')
      .select('id, username, email, full_name')
      .in('id', chunk), abortSignal),
    fetchChunkedRows(emergencyLookupIds, (chunk) => supabase
      .from('emergency_requests')
      .select('id, hospital_id, hospital_name, status, service_type, assigned_doctor_id')
      .in('id', chunk), abortSignal)
  ]);
  throwIfQueryAborted(abortSignal);

  const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  const emergencyByRequest = (emergencyRows || []).reduce((acc, row) => ({ ...acc, [row.id]: row }), {});

  const doctorIds = [
    ...new Set((emergencyRows || []).map(r => r.assigned_doctor_id).filter(Boolean))
  ];

  let doctorsMap = {};
  if (doctorIds.length > 0) {
    const doctors = await fetchChunkedRows(doctorIds, (chunk) => supabase
      .from('doctors')
      .select('id, name')
      .in('id', chunk), abortSignal);
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
    const hospitalRows = await fetchChunkedRows(hospitalIds, (chunk) => supabase
      .from('hospitals')
      .select('id, name, address')
      .in('id', chunk), abortSignal);
    hospitalsMap = (hospitalRows || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {});
  }

  return visits.map((visit) => {
    // Lookup is request_id-keyed only; the legacy `emergencyByRequest[visit.id]`
    // fallback could never resolve once bare visit ids left the lookup set.
    const emergency =
      (visit.request_id ? emergencyByRequest[visit.request_id] : null) || null;
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

async function getVisitResolutionRows({ filters = {}, user, abortSignal }) {
  let resolutionQuery = supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact' })
    .range(0, VISIT_RESOLUTION_ROW_LIMIT - 1);

  resolutionQuery = applyVisitPageAuth(resolutionQuery, user);
  resolutionQuery = applyVisitPageFilters(resolutionQuery, filters);
  resolutionQuery = applyQueryAbortSignal(resolutionQuery, abortSignal);

  const { data, error, count } = await resolutionQuery;
  throwIfQueryAborted(abortSignal);
  if (error) throw error;

  const rows = data || [];
  if (Number.isFinite(count) && count > rows.length) {
    throw new Error('Visit source projection is larger than the client resolver limit; backend visit status projection required.');
  }

  return enrichVisitsForPage(rows, abortSignal);
}

export async function getVisitsPageData({
  filters = {},
  kpiFilter = 'all',
  range = { start: 0, end: 19 },
  sortConfig = { key: 'status', direction: 'desc' },
  quiet = false,
  abortSignal,
} = {}) {
  try {
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    const request = createQueryAbortContext({
      abortSignal,
      timeoutMs: 8000,
      timeoutMessage: 'Failed to resolve visit source rows - timeout',
    });

    try {
      // This service is the only automatic retry owner for the manual Visits
      // page fetch. Transient transport failures retry within one request budget;
      // timeout and cancellation never start another Supabase attempt.
      const resolvedRows = await retryTransientRead(
        () => getVisitResolutionRows({ filters, user, abortSignal: request.signal }),
        { abortSignal: request.signal }
      );
      request.throwIfAborted();

      const statsRows = applyResolvedVisitFilters(resolvedRows, { ...filters, status: undefined }, 'all');
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
      request.abort(error);
      request.throwIfAborted();
      throw error;
    } finally {
      request.cleanup();
    }
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

    // Idempotent read: rebuild the query on each retry attempt so the
    // PostgREST builder is never awaited twice. Behavior-compatible.
    const data = await withRetry(async () => {
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

      const { data: rows, error } = await query;

      if (error) throw error;
      return rows;
    });

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
    // Read by id OR display_id: under RLS this can return 0 rows, so use
    // maybeSingle() (never single(), which would 406/PGRST116 on empty).
    const data = await withRetry(async () => {
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

      const { data: row, error } = await query.maybeSingle();
      if (error) throw error;
      return row;
    });

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

    const data = await withRetry(async () => {
      const { data: row, error } = await supabase
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
      return row;
    });

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
export async function createVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Update visit
 */
export async function updateVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Delete visit
 */
export async function deleteVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Complete visit
 */
export async function completeVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Cancel visit
 */
export async function cancelVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Mark visit as no-show
 */
export async function markVisitAsNoShow() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

/**
 * Get visits for specific user
 */
export async function getUserVisits(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

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
    if (!isValidUUID(userId)) return [];

    const today = new Date().toISOString().split('T')[0];
    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) throw error;
      return rows;
    });

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
    if (!isValidUUID(userId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

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
    // NOTE: `doctor_name` is a TEXT column, not a UUID FK, so no UUID guard here.
    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('doctor_name', doctorId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

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
    if (!isValidUUID(hospitalId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

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
