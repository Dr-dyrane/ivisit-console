/**
 * Hospitals Service
 * Handles all Supabase queries for hospitals table
 * Hospital facility management and lookup
 */

import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'hospitals';
const HOSPITAL_CREATE_FIELDS = [
  'name',
  'address',
  'phone',
  'rating',
  'type',
  'image',
  'specialties',
  'service_types',
  'features',
  'emergency_level',
  'available_beds',
  'icu_beds_available',
  'total_beds',
  'ambulances_count',
  'emergency_wait_time_minutes',
  'wait_time',
  'price_range',
  'latitude',
  'longitude',
  'verified',
  'verification_status',
  'status',
  'place_id',
  'updated_at',
  'created_at',
];
const HOSPITAL_UPDATE_FIELDS = [
  'name',
  'address',
  'phone',
  'rating',
  'type',
  'image',
  'specialties',
  'service_types',
  'features',
  'emergency_level',
  'available_beds',
  'icu_beds_available',
  'total_beds',
  'ambulances_count',
  'emergency_wait_time_minutes',
  'wait_time',
  'price_range',
  'latitude',
  'longitude',
  'verified',
  'verification_status',
  'status',
  'place_id',
  'updated_at',
];

const toTrimmedOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toFiniteOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toNonNegativeIntOrNull = (value) => {
  const numberValue = toFiniteOrNull(value);
  if (numberValue === null) return null;
  return Math.max(0, Math.round(numberValue));
};

const toTextArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
};

function buildHospitalPayload(input = {}, { isCreate = false } = {}) {
  const payload = {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);

  const name = toTrimmedOrNull(input.name);
  const address = toTrimmedOrNull(input.address);
  if (isCreate) {
    payload.name = name || 'Unnamed Facility';
    payload.address = address || 'Address unavailable';
  } else {
    if (name !== null) payload.name = name;
    if (address !== null) payload.address = address;
  }

  const phone = toTrimmedOrNull(input.phone);
  if (phone !== null || isCreate) payload.phone = phone;

  const rating = toFiniteOrNull(input.rating);
  if (rating !== null || isCreate) payload.rating = rating ?? 0;

  const type = toTrimmedOrNull(input.type);
  if (type !== null || isCreate) payload.type = type ?? 'standard';

  const image = toTrimmedOrNull(input.image);
  if (image !== null || isCreate) payload.image = image;

  if (isCreate || hasOwn('specialties')) payload.specialties = toTextArray(input.specialties);
  if (isCreate || hasOwn('service_types')) payload.service_types = toTextArray(input.service_types);
  if (isCreate || hasOwn('features')) payload.features = toTextArray(input.features);

  const emergencyLevel = toTrimmedOrNull(input.emergency_level);
  if (emergencyLevel !== null || isCreate) payload.emergency_level = emergencyLevel;

  const availableBeds = toNonNegativeIntOrNull(input.available_beds);
  if (availableBeds !== null || isCreate) payload.available_beds = availableBeds ?? 0;

  const icuBedsAvailable = toNonNegativeIntOrNull(input.icu_beds_available);
  if (icuBedsAvailable !== null || isCreate) payload.icu_beds_available = icuBedsAvailable ?? 0;

  const totalBeds = toNonNegativeIntOrNull(input.total_beds);
  if (totalBeds !== null || isCreate) payload.total_beds = totalBeds ?? 0;

  const ambulancesCount = toNonNegativeIntOrNull(input.ambulances_count);
  if (ambulancesCount !== null || isCreate) payload.ambulances_count = ambulancesCount ?? 0;

  const emergencyWaitMinutes = toNonNegativeIntOrNull(input.emergency_wait_time_minutes);
  if (emergencyWaitMinutes !== null || isCreate) {
    payload.emergency_wait_time_minutes = emergencyWaitMinutes ?? 0;
  }

  const waitTime = toTrimmedOrNull(input.wait_time);
  if (waitTime !== null || isCreate) payload.wait_time = waitTime;

  const priceRange = toTrimmedOrNull(input.price_range);
  if (priceRange !== null || isCreate) payload.price_range = priceRange;

  const latitude = toFiniteOrNull(input.latitude);
  const longitude = toFiniteOrNull(input.longitude);
  if (latitude !== null || isCreate) payload.latitude = latitude;
  if (longitude !== null || isCreate) payload.longitude = longitude;

  const verified = typeof input.verified === 'boolean' ? input.verified : null;
  if (verified !== null || isCreate) payload.verified = verified ?? false;

  const verificationStatus = toTrimmedOrNull(input.verification_status);
  if (verificationStatus !== null || isCreate) payload.verification_status = verificationStatus ?? 'pending';

  const status = toTrimmedOrNull(input.status);
  if (status !== null || isCreate) payload.status = status ?? 'available';

  const placeId = toTrimmedOrNull(input.place_id);
  if (placeId !== null || isCreate) payload.place_id = placeId;

  const nowIso = new Date().toISOString();
  payload.updated_at = nowIso;
  if (isCreate) payload.created_at = nowIso;

  const allowedFields = new Set(isCreate ? HOSPITAL_CREATE_FIELDS : HOSPITAL_UPDATE_FIELDS);
  return Object.fromEntries(
    Object.entries(payload).filter(([field, value]) => allowedFields.has(field) && value !== undefined)
  );
}

/**
 * Get all hospitals with optional filters
 * Admin users can see all hospitals, org admins see only their hospital, others see verified ones
 */
export async function getHospitals(filter = {}) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');
    // Rely on database RLS for visibility and role scoping to avoid client-side role drift.
    // This keeps console/admin behavior consistent with backend policy changes.

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

    const { data, error, count } = await (filter?.count ? query.select('*', { count: 'exact' }) : query);
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

    const result = enrichedData;
    if (filter?.count) {
      return { data: result, count: count || 0 };
    }

    return result;
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
    let query = supabase.from(TABLE_NAME).select('*');

    if (isValidUUID(hospitalId)) {
      query = query.eq('id', hospitalId);
    } else {
      query = query.eq('display_id', hospitalId);
    }

    const { data, error } = await query.single();

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
    const payload = buildHospitalPayload(input, { isCreate: true });

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
    const payload = buildHospitalPayload(input, { isCreate: false });
    // We use a SECURITY DEFINER RPC to bypass RLS issues and handle 
    // column stripping (total_beds, etc.) on the server side.
    const { data, error } = await supabase.rpc('update_hospital_by_admin', {
      target_hospital_id: hospitalId,
      payload: payload
    });

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
    const { data, error } = await supabase.rpc('delete_hospital_by_admin', {
      target_hospital_id: hospitalId
    });
    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.error || 'Hospital deletion failed');
    }
    return data || null;
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
