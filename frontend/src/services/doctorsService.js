/**
 * Doctors Service
 * Handles all Supabase queries for doctors table
 * Doctor directory and credentials management
 */

import { getCurrentUser, applyAuthFilter } from './authService';
import { supabase } from '../lib/supabase';

const TABLE_NAME = 'doctors';
const STAFF_STATUSES = ['available', 'on_call', 'busy', 'off_duty'];
const DOCTOR_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'name',
  'specialization',
  'status',
  'phone',
  'experience'
]);

const normalizeFilterList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const sanitizeSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

const applyDateRange = (query, dateRange) => {
  if (!dateRange || typeof dateRange !== 'object') return query;
  if (dateRange.start) {
    query = query.gte('created_at', new Date(`${dateRange.start}T00:00:00`).toISOString());
  }
  if (dateRange.end) {
    query = query.lte('created_at', new Date(`${dateRange.end}T23:59:59.999`).toISOString());
  }
  return query;
};

function applyDoctorFilters(query, user, filter = {}) {
  query = applyAuthFilter(query, user, {
    userIdField: 'profile_id',
    orgIdField: 'hospital_id'
  });

  if (filter.forceEmpty) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (filter.hospital_id) {
    query = query.eq('hospital_id', filter.hospital_id);
  }

  const specializationValues = normalizeFilterList(filter.specialization);
  if (specializationValues.length === 1) {
    query = query.eq('specialization', specializationValues[0]);
  } else if (specializationValues.length > 1) {
    query = query.in('specialization', specializationValues);
  }

  const statusValues = normalizeFilterList(filter.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(`name.ilike.%${search}%,specialization.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  return applyDateRange(query, filter.created_at);
}

async function getDoctorExactCount(filter = {}, user, quiet = false) {
  try {
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    query = applyDoctorFilters(query, user, filter);

    const { error, count } = await query;
    if (error) throw error;
    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching staff exact count:', error);
    }
    throw error;
  }
}

const withStatusForCount = (filter = {}, status) => {
  const statusValues = normalizeFilterList(filter.status);
  if (statusValues.length > 0 && !statusValues.includes(status)) {
    return { ...filter, status, forceEmpty: true };
  }
  return { ...filter, status };
};

async function getDoctorPageStats(filter = {}, user, quiet = false) {
  const statsFilter = {
    search: filter.search,
    specialization: filter.specialization,
    status: filter.statsStatus,
    hospital_id: filter.hospital_id,
    created_at: filter.created_at,
  };

  const [total, available, onCall, busy, offDuty] = await Promise.all([
    getDoctorExactCount(statsFilter, user, quiet),
    getDoctorExactCount(withStatusForCount(statsFilter, 'available'), user, quiet),
    getDoctorExactCount(withStatusForCount(statsFilter, 'on_call'), user, quiet),
    getDoctorExactCount(withStatusForCount(statsFilter, 'busy'), user, quiet),
    getDoctorExactCount(withStatusForCount(statsFilter, 'off_duty'), user, quiet),
  ]);

  return {
    total,
    totalDoctors: total,
    available,
    on_call: onCall,
    onCall,
    busy,
    off_duty: offDuty,
    exactCounts: true,
  };
}

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
    query = applyDoctorFilters(query, user, filter);

    const sortKey = DOCTOR_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    const sortDirection = filter.sortDirection === 'asc' ? 'asc' : 'desc';
    query = query.order(sortKey, { ascending: sortDirection === 'asc' });

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
      const displayIds = await getDisplayIds(profileIds, { quiet: filter?.quiet });

      enrichedData = enrichedData.map(d => ({
        ...d,
        display_id: displayIds.get(d.profile_id) || null
      }));
    }

    const stats = await getDoctorPageStats(filter, user, filter?.quiet);

    return { data: enrichedData, count: count || 0, stats };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching doctors:', error);
    }
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
      rating: input.rating ?? null,
      reviews_count: input.reviews_count ?? 0,
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
