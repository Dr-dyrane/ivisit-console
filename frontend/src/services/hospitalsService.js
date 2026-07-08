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

function applyHospitalFilters(query, filter = {}) {
  if (filter?.id) {
    query = query.eq('id', filter.id);
  }

  const statusValues = normalizeFilterList(filter?.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  if (filter?.verified !== undefined) {
    query = query.eq('verified', filter.verified);
  }

  const verificationValues = normalizeFilterList(filter?.verification_status);
  if (verificationValues.length === 1) {
    query = query.eq('verification_status', verificationValues[0]);
  } else if (verificationValues.length > 1) {
    query = query.in('verification_status', verificationValues);
  }

  if (filter?.specialty) {
    query = query.contains('specialties', [filter.specialty]);
  }

  const search = sanitizeSearchTerm(filter?.search);
  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  return query;
}

export function getHospitalVisibleStats(rows = []) {
  const data = Array.isArray(rows) ? rows : [];
  const total = data.length;
  const available = data.filter(h => h.status === 'available').length;
  const full = data.filter(h => h.status === 'full').length;
  const busy = data.filter(h => h.status === 'busy').length;
  const verified = data.filter(h => h.verified).length;
  const totalBeds = data.reduce((acc, h) => acc + (Number(h.available_beds) || 0), 0);
  const totalAmbulances = data.reduce((acc, h) => acc + (Number(h.ambulances_count) || 0), 0);

  return { total, available, full, busy, verified, totalBeds, totalAmbulances };
}

async function getHospitalExactCount(filters = {}, quiet = false) {
  try {
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    query = applyHospitalFilters(query, filters);

    const { error, count } = await query;
    if (error) throw error;

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching hospital exact count:', error);
    }
    throw error;
  }
}

export async function getHospitalPageStats(filters = {}, quiet = false) {
  const [total, available, full, busy, verified] = await Promise.all([
    getHospitalExactCount(filters, quiet),
    getHospitalExactCount({ ...filters, status: 'available' }, quiet),
    getHospitalExactCount({ ...filters, status: 'full' }, quiet),
    getHospitalExactCount({ ...filters, status: 'busy' }, quiet),
    getHospitalExactCount({ ...filters, verified: true }, quiet),
  ]);

  return {
    total,
    available,
    full,
    busy,
    verified,
    exactCounts: true,
  };
}

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
    let query = filter?.count
      ? supabase.from(TABLE_NAME).select('*', { count: 'exact' })
      : supabase.from(TABLE_NAME).select('*');
    // Rely on database RLS for visibility and role scoping to avoid client-side role drift.
    // This keeps console/admin behavior consistent with backend policy changes.

    query = applyHospitalFilters(query, filter);

    query = query.order('created_at', { ascending: false });

    if (filter?.offset !== undefined && filter?.offset !== null) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    } else if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // NEW: Enrich with display IDs (ORG-XXXXXX)
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const orgIds = enrichedData.map(h => h.id);
      const displayIds = await getDisplayIds(orgIds, { quiet: filter?.quiet });

      enrichedData = enrichedData.map(h => ({
        ...h,
        display_id: displayIds.get(h.id) || null
      }));
    }

    const result = enrichedData;
    if (filter?.count) {
      return { data: result, count: Number.isFinite(count) ? count : result.length };
    }

    return result;
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching hospitals:', error);
    }
    throw error;
  }
}

/**
 * Route-owned Hospitals page projection.
 * Keeps list, exact count, filters, pagination, display IDs, and page stats in one service boundary.
 */
export async function getHospitalsPageData(options = {}) {
  const {
    filters = {},
    statsFilters = filters,
    limit = 20,
    offset = 0,
    quiet = false,
  } = options;

  try {
    const [pageResult, stats] = await Promise.all([
      getHospitals({
        ...filters,
        limit,
        offset,
        count: true,
        quiet,
      }),
      getHospitalPageStats(statsFilters, quiet),
    ]);

    const pageRows = pageResult?.data || [];
    const visibleStats = getHospitalVisibleStats(pageRows);

    return {
      data: pageRows,
      count: pageResult?.count || 0,
      stats: {
        ...stats,
        visibleBeds: visibleStats.totalBeds,
        visibleAmbulances: visibleStats.totalAmbulances,
      },
      recent: pageRows.slice(0, 5),
    };
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching hospitals page data:', error);
    }
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
    // Route through the SECURITY DEFINER RPC (hospitals has no direct write RLS
    // policy, so a raw .update() is silently denied). Same RPC as updateHospital.
    const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
      target_hospital_id: hospitalId,
      payload: { available_beds: availableBeds },
    });

    if (error) throw error;
    if (rpcResult && rpcResult.success === false) {
      throw new Error(rpcResult.error || 'Hospital bed count update failed');
    }

    // Re-read so callers keep receiving the hospital row (RPC returns {success,id}).
    const { data, error: readError } = await supabase
      .from(TABLE_NAME)
      .select()
      .eq('id', hospitalId)
      .maybeSingle();

    if (readError) throw readError;

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
    // Route through the SECURITY DEFINER RPC (hospitals has no direct write RLS
    // policy, so a raw .update() is silently denied). Same RPC as updateHospital.
    const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
      target_hospital_id: hospitalId,
      payload: { status: status },
    });

    if (error) throw error;
    if (rpcResult && rpcResult.success === false) {
      throw new Error(rpcResult.error || 'Hospital status update failed');
    }

    // Re-read so callers keep receiving the hospital row (RPC returns {success,id}).
    const { data, error: readError } = await supabase
      .from(TABLE_NAME)
      .select()
      .eq('id', hospitalId)
      .maybeSingle();

    if (readError) throw readError;

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
