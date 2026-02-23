/**
 * Visits Service
 * Handles all Supabase queries for visits table
 * Manages medical visit records, appointments, and history
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'visits';

const VISIT_COLUMNS = new Set([
  'id',
  'user_id',
  'hospital_id',
  'request_id',
  'hospital_name',
  'doctor_name',
  'specialty',
  'date',
  'time',
  'type',
  'status',
  'notes',
  'cost',
  'lifecycle_state',
  'lifecycle_updated_at',
  'rating',
  'rating_comment',
  'rated_at',
  'display_id',
  'created_at',
  'updated_at'
]);

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

    if (!VISIT_COLUMNS.has(targetKey) || targetKey === 'id') continue;
    payload[targetKey] = value;
  }

  if (includeCreateDefaults) {
    if (!payload.date && input.date) payload.date = input.date;
    if (!payload.date && input.visit_date) payload.date = input.visit_date;
    if (!payload.type && input.type) payload.type = input.type;
    if (!payload.type && input.visit_type) payload.type = input.visit_type;
    if (!payload.doctor_name && input.doctor_name) payload.doctor_name = input.doctor_name;
    if (!payload.doctor_name && input.doctor) payload.doctor_name = input.doctor;
    if (!payload.status) payload.status = 'scheduled';
    payload.created_at = new Date().toISOString();
  }

  payload.updated_at = new Date().toISOString();
  return payload;
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
    console.error('Error fetching visits:', error);
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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'completed',
        summary: summary,
        prescriptions: prescriptions,
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
