/**
 * Doctors Service
 * Handles all Supabase queries for doctors table
 * Doctor directory and credentials management
 */

import { getCurrentUser, applyAuthFilter } from './authService';
import { supabase } from '../lib/supabase';
import { withRetry } from './supabaseHelpers';
import { applyQueryAbortSignal, throwIfQueryAborted } from './queryAbort';

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

const getActorFacilityIds = (actor = {}) => {
  const facilityIds = [
    ...(Array.isArray(actor.hospital_ids) ? actor.hospital_ids : []),
    ...(Array.isArray(actor.facility_ids) ? actor.facility_ids : []),
    ...(Array.isArray(actor.organization_scope?.facilityIds)
      ? actor.organization_scope.facilityIds
      : []),
  ];

  return new Set(facilityIds.filter(Boolean));
};

const createDoctorScopeError = (message) => {
  const error = new Error(message);
  error.code = 'DOCTOR_SCOPE_DENIED';
  return error;
};

export function filterDoctorFacilityOptions(facilities, actor = {}) {
  const rows = Array.isArray(facilities) ? facilities : [];
  if (actor.role === 'admin') return rows;
  if (actor.role !== 'org_admin') return [];

  const allowedFacilityIds = getActorFacilityIds(actor);
  return rows.filter((facility) => allowedFacilityIds.has(facility?.id));
}

export function assertDoctorWriteScope(input = {}, actor = {}, { requireFacility = false } = {}) {
  if (!['admin', 'org_admin'].includes(actor?.role)) {
    throw createDoctorScopeError('This role cannot change staff directory records.');
  }
  if (actor.role === 'admin') return input;

  const submittedFacility = Object.prototype.hasOwnProperty.call(input, 'hospital_id');
  if (!submittedFacility && !requireFacility) return input;

  const hospitalId = input.hospital_id;
  if (!hospitalId || !getActorFacilityIds(actor).has(hospitalId)) {
    throw createDoctorScopeError('Select a facility in your organization.');
  }

  return input;
}

const DOCTOR_WORKFLOW_FIELDS = new Set([
  'profile_id',
  'status',
  'is_available',
  'is_on_call',
  'rating',
  'reviews_count',
  'max_patients',
  'current_patients',
  'display_id',
]);

export function assertDoctorWritableFields(input = {}) {
  const rejected = Object.keys(input || {}).filter((field) => DOCTOR_WORKFLOW_FIELDS.has(field));
  if (rejected.length > 0) {
    const error = new Error('Staff identity, availability, and lifecycle use their dedicated workflows.');
    error.code = 'DOCTOR_FIELD_AUTHORITY_DENIED';
    error.fields = rejected;
    throw error;
  }
  return input;
}

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

async function getDoctorExactCount(filter = {}, user, quiet = false, abortSignal) {
  try {
    throwIfQueryAborted(abortSignal);
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    query = applyDoctorFilters(query, user, filter);
    query = applyQueryAbortSignal(query, abortSignal);

    const { error, count } = await query;
    throwIfQueryAborted(abortSignal);
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

async function getDoctorPageStats(filter = {}, user, quiet = false, abortSignal) {
  const statsFilter = {
    search: filter.search,
    specialization: filter.specialization,
    status: filter.statsStatus,
    hospital_id: filter.hospital_id,
    created_at: filter.created_at,
  };

  const [total, available, onCall, busy, offDuty] = await Promise.all([
    getDoctorExactCount(statsFilter, user, quiet, abortSignal),
    getDoctorExactCount(withStatusForCount(statsFilter, 'available'), user, quiet, abortSignal),
    getDoctorExactCount(withStatusForCount(statsFilter, 'on_call'), user, quiet, abortSignal),
    getDoctorExactCount(withStatusForCount(statsFilter, 'busy'), user, quiet, abortSignal),
    getDoctorExactCount(withStatusForCount(statsFilter, 'off_duty'), user, quiet, abortSignal),
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
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    } else if (cleaned[key] === '') {
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
    const abortSignal = filter?.abortSignal;
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    const sortKey = DOCTOR_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    const sortDirection = filter.sortDirection === 'asc' ? 'asc' : 'desc';

    // L1 hardening: retry the primary doctors read with exponential backoff on
    // transient failures (network/timeout, 429, 5xx, serialization). The query
    // is rebuilt inside the callback because Supabase builders are single-use
    // thenables; non-retryable errors (auth/RLS/constraint) still throw on the
    // first attempt, preserving prior behavior.
    const { data, error, count } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*, hospitals(name)', { count: 'exact' });
      query = applyDoctorFilters(query, user, filter);
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      if (filter.limit) {
        const from = filter.offset || 0;
        query = query.range(from, from + filter.limit - 1);
      }
      query = applyQueryAbortSignal(query, abortSignal);

      const result = await query;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    // doctors.display_id is the canonical directory label. The former profile-id
    // enrichment queried the hospitals table and could overwrite real labels.
    const rows = data || [];
    const stats = await getDoctorPageStats(filter, user, filter?.quiet, abortSignal);
    throwIfQueryAborted(abortSignal);

    return { data: rows, count: count || 0, stats };
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
    const actor = await getCurrentUser();
    assertDoctorWriteScope(input, actor, { requireFacility: actor?.role === 'org_admin' });
    assertDoctorWritableFields(input);

    const payload = sanitizeInput({
      name: input.name,
      specialization: input.specialization,
      hospital_id: input.hospital_id === '' ? null : input.hospital_id,
      image: input.image,
      experience: input.experience,
      about: input.about,
      consultation_fee: input.consultation_fee,
      department: input.department,
      license_number: input.license_number,
      phone: input.phone,
      email: input.email,
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
    const actor = await getCurrentUser();
    assertDoctorWriteScope(input, actor);
    assertDoctorWritableFields(input);

    // Whitelist of writable doctor columns (mirrors ambulancesService.updateAmbulance
    // VALID_COLUMNS) so arbitrary/forged fields (including the `hospitals` join)
    // cannot be written. These service checks complement, but do not replace, RLS.
    const VALID_COLUMNS = [
      'name', 'specialization', 'hospital_id',
      'image', 'experience', 'about', 'consultation_fee',
      'department', 'license_number', 'phone', 'email',
    ];

    const source = input || {};
    const payload = {};
    for (const key of VALID_COLUMNS) {
      if (key in source) {
        // Sanitize empty strings to null for UUID/FK fields
        if (key === 'hospital_id') {
          payload[key] = source[key] === '' ? null : source[key];
        } else {
          payload[key] = source[key];
        }
      }
    }

    // Preserve existing empty-string → null normalization for the remaining columns
    const sanitized = sanitizeInput(payload);
    if (Object.keys(sanitized).length === 0) {
      const error = new Error('No supported staff directory changes were provided.');
      error.code = 'DOCTOR_NO_WRITABLE_FIELDS';
      throw error;
    }
    sanitized.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(sanitized)
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
  void doctorId;
  const error = new Error('Staff retirement is unavailable until a canonical retirement workflow is approved.');
  error.code = 'DOCTOR_RETIREMENT_UNAVAILABLE';
  throw error;
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
