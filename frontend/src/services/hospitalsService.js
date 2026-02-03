/**
 * Hospitals Service
 * Handles all Supabase queries for hospitals table
 * Hospital facility management and lookup
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const TABLE_NAME = 'hospitals';

/**
 * Get all hospitals with optional filters
 * Admin users can see all hospitals, org admins see only their hospital, others see verified ones
 */
export async function getHospitals(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Providers shouldn't filter hospitals by user_id - they see all verified hospitals
    if (user?.role !== 'admin' && user?.role !== 'org_admin') {
      // For providers and other roles, only show verified hospitals without user_id filtering
      query = query.eq('verified', true);
    } else {
      // Apply RBAC Scoping only for admins and org admins
      query = applyAuthFilter(query, user, {
        orgIdField: 'id', // Org admins can only see THEIR hospital (single record)
        bypassForAdmin: true
      });
    }

    // Remove user_id filter as it doesn't exist in hospitals table

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.verified !== undefined) {
      query = query.eq('verified', filter.verified);
    }
    // NEW: Support verification_status filter (pending, verified, rejected)
    if (filter?.verification_status) {
      query = query.eq('verification_status', filter.verification_status);
    }
    if (filter?.specialty) {
      query = query.contains('specialties', [filter.specialty]);
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

    // NEW: Enrich with display IDs (ORG-XXXXXX)
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const orgIds = enrichedData.map(h => h.id);
      const displayIds = await getDisplayIds(orgIds);

      enrichedData = enrichedData.map(h => ({
        ...h,
        display_id: displayIds.get(h.id) || null
      }));
    }

    return enrichedData;
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    throw error;
  }
}

/**
 * Get single hospital by ID
 */
export async function getHospital(hospitalId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', hospitalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Create new hospital
 */
export async function createHospital(input) {
  try {
    const payload = {
      name: input.name,
      address: input.address,
      phone: input.phone,
      rating: input.rating,
      type: input.type || 'standard',
      image: input.image,
      specialties: input.specialties,
      service_types: input.service_types,
      features: input.features,
      emergency_level: input.emergency_level,
      available_beds: input.available_beds,
      ambulances_count: input.ambulances_count,
      wait_time: input.wait_time,
      price_range: input.price_range,
      latitude: input.latitude,
      longitude: input.longitude,
      verified: input.verified || false,
      verification_status: input.verification_status || 'pending', // NEW
      status: input.status || 'available',
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
    console.error('Error creating hospital:', error);
    throw error;
  }
}

/**
 * Update hospital
 */
export async function updateHospital(hospitalId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', hospitalId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Delete hospital
 */
export async function deleteHospital(hospitalId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', hospitalId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Get verified hospitals
 */
export async function getVerifiedHospitals() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('verified', true)
      .order('rating', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching verified hospitals:', error);
    throw error;
  }
}

/**
 * Get hospitals by specialty
 */
export async function getHospitalsBySpecialty(specialty) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .contains('specialties', [specialty])
      .order('rating', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching hospitals by specialty ${specialty}:`, error);
    throw error;
  }
}

/**
 * Update hospital bed availability
 */
export async function updateHospitalBedCount(hospitalId, availableBeds) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        available_beds: availableBeds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hospitalId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating hospital bed count ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Update hospital status
 */
export async function updateHospitalStatus(hospitalId, status) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hospitalId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating hospital status ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to hospital updates
 */
export function subscribeToHospital(hospitalId, callback) {
  const channel = supabase
    .channel(`hospital_${hospitalId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${hospitalId}`,
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
