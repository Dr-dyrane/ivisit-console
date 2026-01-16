/**
 * Doctors Service
 * Handles all Supabase queries for doctors table
 * Doctor directory and credentials management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'doctors';

/**
 * Get all doctors with optional filters
 */
export async function getDoctors(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
    }
    if (filter?.specialty) {
      query = query.eq('specialty', filter.specialty);
    }
    if (filter?.is_available !== undefined) {
      query = query.eq('is_available', filter.is_available);
    }

    query = query.order('rating', { ascending: false });

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
      .select('*')
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
    const payload = {
      name: input.name,
      specialty: input.specialty,
      hospital_id: input.hospital_id,
      image: input.image,
      rating: input.rating || 0,
      reviews_count: input.reviews_count || 0,
      years_experience: input.years_experience,
      about: input.about,
      consultation_fee: input.consultation_fee,
      is_available: input.is_available !== undefined ? input.is_available : true,
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
    console.error('Error creating doctor:', error);
    throw error;
  }
}

/**
 * Update doctor
 */
export async function updateDoctor(doctorId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

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
 * Get available doctors
 */
export async function getAvailableDoctors() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('is_available', true)
      .order('rating', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    throw error;
  }
}

/**
 * Get doctors by specialty
 */
export async function getDoctorsBySpecialty(specialty) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('specialty', specialty)
      .order('rating', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching doctors by specialty ${specialty}:`, error);
    throw error;
  }
}

/**
 * Get doctors by hospital
 */
export async function getHospitalDoctors(hospitalId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('rating', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching doctors for hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Update doctor availability
 */
export async function updateDoctorAvailability(doctorId, isAvailable) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating doctor availability ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Update doctor rating
 */
export async function updateDoctorRating(doctorId, newRating, reviewCount) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        rating: newRating,
        reviews_count: reviewCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating doctor rating ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to doctor updates
 */
export function subscribeToDoctor(doctorId, callback) {
  const channel = supabase
    .channel(`doctor_${doctorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${doctorId}`,
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
