/**
 * Doctors Service
 * Handles all Supabase queries for doctors table
 * Doctor directory and credentials management
 */

import { getCurrentUser, applyAuthFilter } from './authService';
import { supabase } from '../lib/supabase';

const TABLE_NAME = 'doctors';

// Helper to clean empty strings to null (Fixes UUID "" error)
const sanitizeInput = (input) => {
  const cleaned = { ...input };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '') {
      cleaned[key] = null;
    }
  });
  return cleaned;
};

/**
 * Get all doctors with optional filters
 */
export async function getDoctors(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*, hospitals(name)', { count: 'exact' });

    // 1. Apply RBAC Scoping
    query = applyAuthFilter(query, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital_id'
    });

    // 2. Apply Custom Filters
    if (filter.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
    }
    if (filter.specialization) {
      if (Array.isArray(filter.specialization)) {
        query = query.in('specialization', filter.specialization);
      } else {
        query = query.eq('specialization', filter.specialization);
      }
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query = query.in('status', filter.status);
      } else {
        query = query.eq('status', filter.status);
      }
    }
    if (filter.search) {
      query = query.ilike('name', `%${filter.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (filter.limit) {
      const from = filter.offset || 0;
      query = query.range(from, from + filter.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // NEW: Enrich with display IDs (PRV-XXXXXX) via profile_id
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const profileIds = enrichedData.map(d => d.profile_id).filter(Boolean);
      const displayIds = await getDisplayIds(profileIds);

      enrichedData = enrichedData.map(d => ({
        ...d,
        display_id: displayIds.get(d.profile_id) || null
      }));
    }

    return { data: enrichedData, count: count || 0 };
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
}

/**
 * Get single doctor by ID
 */
export async function getDoctor(doctorId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*, hospitals(name)')
      .eq('id', doctorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching doctor ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Create new doctor
 */
export async function createDoctor(input) {
  try {
    const payload = sanitizeInput({
      profile_id: input.profile_id, // Added
      name: input.name,
      specialization: input.specialization,
      hospital_id: input.hospital_id === '' ? null : input.hospital_id,
      image: input.image,
      rating: input.rating || 4.5,
      reviews_count: input.reviews_count || 0,
      experience: input.experience,
      about: input.about,
      consultation_fee: input.consultation_fee,
      license_number: input.license_number,
      status: input.status || 'available',
      phone: input.phone,
      email: input.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating doctor:', error);
    throw error;
  }
}

/**
 * Update doctor
 */
export async function updateDoctor(doctorId, input) {
  try {
    const payload = sanitizeInput({
      ...input,
      updated_at: new Date().toISOString(),
    });

    // Remove join fields if present to avoid error
    delete payload.hospitals;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating doctor ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Delete doctor
 */
export async function deleteDoctor(doctorId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', doctorId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting doctor ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Get doctor by user profile ID
 */
export async function getDoctorByProfileId(profileId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*, hospitals(name)')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching doctor profile ${profileId}:`, error);
    throw error;
  }
}
