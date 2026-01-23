/**
 * Ambulances Service
 * Handles all Supabase queries for ambulances table
 * Ambulance fleet management and real-time tracking
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const TABLE_NAME = 'ambulances';

/**
 * Get all ambulances with optional filters
 * Admin users can see all ambulances, others see only available ones
 */
export async function getAmbulances(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // 1. Apply RBAC Scoping
    query = applyAuthFilter(query, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital'
    });

    // 2. Apply Custom Filters

    if (filter?.hospital_id) {
      query = query.eq('hospital', filter.hospital_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }

    query = query.order('created_at', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching ambulances:', error);
    throw error;
  }
}

/**
 * Get single ambulance by ID
 */
export async function getAmbulance(ambulanceId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', ambulanceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Create new ambulance
 */
export async function createAmbulance(input) {
  try {
    const payload = {
      profile_id: input.profile_id,
      type: input.type,
      call_sign: input.call_sign,
      status: input.status || 'available',
      location: input.location,
      eta: input.eta,
      crew: input.crew,
      hospital: input.hospital || input.hospital_id,
      vehicle_number: input.vehicle_number,
      last_maintenance: input.last_maintenance,
      rating: input.rating,
      current_call: input.current_call,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating ambulance:', error);
    throw error;
  }
}

/**
 * Update ambulance
 */
export async function updateAmbulance(ambulanceId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', ambulanceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Delete ambulance
 */
export async function deleteAmbulance(ambulanceId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', ambulanceId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Get available ambulances
 */
export async function getAvailableAmbulances() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching available ambulances:', error);
    throw error;
  }
}

/**
 * Get ambulances by hospital
 */
export async function getHospitalAmbulances(hospitalId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('hospital', hospitalId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching ambulances for hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Update ambulance location
 */
export async function updateAmbulanceLocation(ambulanceId, location) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        location: location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ambulanceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating ambulance location ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Update ambulance status
 */
export async function updateAmbulanceStatus(ambulanceId, status) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ambulanceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating ambulance status ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to ambulance updates
 */
export function subscribeToAmbulance(ambulanceId, callback) {
  const channel = supabase
    .channel(`ambulance_${ambulanceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${ambulanceId}`,
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
 * Subscribe to all ambulance changes
 */
export function subscribeToAllAmbulances(callback) {
  const channel = supabase
    .channel('ambulances_all')
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
