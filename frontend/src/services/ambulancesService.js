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
 * Admin users can see all ambulances, others see only available ones or their assigned ones
 */
export async function getAmbulances(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply RBAC Scoping
    if (user?.role === 'provider' && user?.provider_type === 'driver') {
      // Drivers see only their assigned ambulance
      query = query.eq('driver_id', user.id);
    } else {
      // Apply standard RBAC for other roles
      query = applyAuthFilter(query, user, {
        userIdField: 'profile_id',
        orgIdField: 'organization_id',
        resourceType: 'ambulance'
      });
    }

    // 2. Apply Custom Filters
    if (filter?.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
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
    // Build payload, omitting undefined/null/empty values so DB defaults apply
    const payload = {};

    // Only include id if explicitly provided; otherwise let DB DEFAULT generate it
    if (input.id) payload.id = input.id;

    // Required fields
    if (input.type) payload.type = input.type;
    if (input.call_sign) payload.call_sign = input.call_sign;
    payload.status = input.status || 'available';

    // Optional fields — only include if truthy
    if (input.location) payload.location = input.location;
    if (input.eta) payload.eta = input.eta;
    if (input.crew) payload.crew = input.crew;
    if (input.hospital) payload.hospital = input.hospital;
    if (input.hospital_id && input.hospital_id !== '') payload.hospital_id = input.hospital_id;
    if (input.vehicle_number) payload.vehicle_number = input.vehicle_number;
    if (input.last_maintenance) payload.last_maintenance = input.last_maintenance;
    if (input.rating != null) payload.rating = input.rating;
    if (input.current_call) payload.current_call = input.current_call;
    if (input.driver_id) payload.driver_id = input.driver_id;

    payload.created_at = new Date().toISOString();
    payload.updated_at = new Date().toISOString();

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
    // Whitelist of valid ambulance table columns to prevent PGRST204 errors
    const VALID_COLUMNS = [
      'call_sign', 'type', 'status', 'vehicle_number',
      'hospital_id', 'hospital', 'location', 'eta', 'crew',
      'rating', 'last_maintenance', 'current_call',
      'driver_id', 'profile_id', 'organization_id',
      'base_price', 'currency'
    ];

    const payload = {};
    for (const key of VALID_COLUMNS) {
      if (key in input) {
        // Sanitize empty strings to null for UUID/FK fields
        if (['hospital_id', 'driver_id', 'profile_id', 'organization_id'].includes(key)) {
          payload[key] = input[key] === '' ? null : input[key];
        } else {
          payload[key] = input[key];
        }
      }
    }

    payload.updated_at = new Date().toISOString();

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
 * Assign driver to ambulance
 */
export async function assignDriverToAmbulance(ambulanceId, driverId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        driver_id: driverId,
        updated_at: new Date().toISOString()
      })
      .eq('id', ambulanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error assigning driver to ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

/**
 * Update ambulance location (for driver app)
 */
export async function updateAmbulanceLocation(ambulanceId, location) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        driver_location: location,
        last_location_update: new Date().toISOString()
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
 * Get driver's assigned ambulance
 */
export async function getDriverAmbulance(driverId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error(`Error getting driver's ambulance ${driverId}:`, error);
    throw error;
  }
}

/**
 * Get all drivers (provider type = 'driver')
 */
export async function getDrivers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('provider_type', 'driver')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
}

/**
 * Get available drivers (not assigned to ambulance)
 */
export async function getAvailableDrivers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('provider_type', 'driver')
      .is('driver_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available drivers:', error);
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
