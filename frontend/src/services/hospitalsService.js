/**
 * Hospitals Service
 * Handles all Supabase queries for hospitals table
 * Hospital facility management and lookup
 */

import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';
import { withRetry, withAudit } from './supabaseHelpers';

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
const HOSPITAL_STATUS_VALUES = new Set(['available', 'busy', 'closed', 'full']);

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

const toNonNegativeIntOrNull = (value, fieldName) => {
  const numberValue = toFiniteOrNull(value);
  if (numberValue === null) return null;
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} must be a whole number of zero or more`);
  }
  return numberValue;
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

// F1 (HOSPITALS_REVAMP_CONSTITUTION_2026-07-09): only real, meaningfully
// orderable columns may enter .order() (donor: emergencyService
// EMERGENCY_REQUEST_SORT_FIELDS). The page's single sortable header is Time ->
// created_at; anything else falls back to the created_at default.
const HOSPITAL_SORT_FIELDS = new Set(['created_at']);

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

  // Dead-filter fix (2026-07-09): the FilterSheet has offered a "Registered On" date
  // range since intake, but nothing read it. Donor-identical to emergencyService.
  if (filter?.date_from) {
    query = query.gte('created_at', filter.date_from);
  }
  if (filter?.date_to) {
    query = query.lte('created_at', filter.date_to);
  }

  const search = sanitizeSearchTerm(filter?.search);
  if (search) {
    // F9 second half (HOSPITALS_REVAMP_CONSTITUTION_2026-07-09): display_id and
    // phone are real hospitals columns (database.ts) operators actually paste
    // into search; the debounce half lives in the shared SheetToolbar.
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,display_id.ilike.%${search}%,phone.ilike.%${search}%`);
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
    // L1 hardening: retry this idempotent count read on transient failures. The
    // builder is rebuilt inside the callback because Supabase builders are
    // single-use thenables; non-retryable errors (auth/RLS) throw on attempt 1.
    const { error, count } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
      query = applyHospitalFilters(query, filters);

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
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

export function buildHospitalPayload(input = {}, { isCreate = false } = {}) {
  const payload = {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);

  const name = toTrimmedOrNull(input.name);
  const address = toTrimmedOrNull(input.address);
  if (isCreate) {
    payload.name = name || 'Unnamed Facility';
    payload.address = address || 'Address unavailable';
  } else {
    if (hasOwn('name') && name === null) throw new Error('Facility name is required');
    if (hasOwn('address') && address === null) throw new Error('Facility address is required');
    if (name !== null) payload.name = name;
    if (address !== null) payload.address = address;
  }

  const phone = toTrimmedOrNull(input.phone);
  if (isCreate || hasOwn('phone')) payload.phone = phone ?? '';

  const rating = toFiniteOrNull(input.rating);
  if (rating !== null || isCreate) payload.rating = rating ?? 0;

  const type = toTrimmedOrNull(input.type);
  if (!isCreate && hasOwn('type') && type === null) throw new Error('Facility tier is required');
  if (type !== null || isCreate) payload.type = type ?? 'standard';

  const image = toTrimmedOrNull(input.image);
  if (isCreate || hasOwn('image')) payload.image = image ?? '';

  if (isCreate || hasOwn('specialties')) payload.specialties = toTextArray(input.specialties);
  if (isCreate || hasOwn('service_types')) payload.service_types = toTextArray(input.service_types);
  if (isCreate || hasOwn('features')) payload.features = toTextArray(input.features);

  const emergencyLevel = toTrimmedOrNull(input.emergency_level);
  if (isCreate || hasOwn('emergency_level')) payload.emergency_level = emergencyLevel ?? '';

  const availableBeds = toNonNegativeIntOrNull(input.available_beds, 'Available beds');
  if (availableBeds !== null || isCreate) payload.available_beds = availableBeds ?? 0;

  const icuBedsAvailable = toNonNegativeIntOrNull(input.icu_beds_available, 'ICU beds');
  if (icuBedsAvailable !== null || isCreate) payload.icu_beds_available = icuBedsAvailable ?? 0;

  const totalBeds = toNonNegativeIntOrNull(input.total_beds, 'Total beds');
  if (totalBeds !== null || isCreate) payload.total_beds = totalBeds ?? 0;

  const ambulancesCount = toNonNegativeIntOrNull(input.ambulances_count, 'Ambulances');
  if (ambulancesCount !== null || isCreate) payload.ambulances_count = ambulancesCount ?? 0;

  const emergencyWaitMinutes = toNonNegativeIntOrNull(input.emergency_wait_time_minutes, 'Emergency wait time');
  if (emergencyWaitMinutes !== null || isCreate) {
    payload.emergency_wait_time_minutes = emergencyWaitMinutes ?? 0;
  }

  const waitTime = toTrimmedOrNull(input.wait_time);
  if (isCreate || hasOwn('wait_time')) payload.wait_time = waitTime ?? '';

  const priceRange = toTrimmedOrNull(input.price_range);
  if (isCreate || hasOwn('price_range')) payload.price_range = priceRange ?? '';

  const latitude = toFiniteOrNull(input.latitude);
  const longitude = toFiniteOrNull(input.longitude);
  if (latitude !== null || isCreate) payload.latitude = latitude;
  if (longitude !== null || isCreate) payload.longitude = longitude;

  const verified = typeof input.verified === 'boolean' ? input.verified : null;
  if (verified !== null || isCreate) payload.verified = verified ?? false;

  const verificationStatus = toTrimmedOrNull(input.verification_status);
  if (verificationStatus !== null || isCreate) payload.verification_status = verificationStatus ?? 'pending';

  const status = toTrimmedOrNull(input.status);
  if (status !== null && !HOSPITAL_STATUS_VALUES.has(status)) {
    throw new Error('Operational status is not recognized');
  }
  if (status !== null || isCreate) payload.status = status ?? 'available';

  const placeId = toTrimmedOrNull(input.place_id);
  if (isCreate || hasOwn('place_id')) payload.place_id = placeId ?? '';

  if (availableBeds !== null && totalBeds !== null && availableBeds > totalBeds) {
    throw new Error('Available beds cannot exceed total beds');
  }
  if (icuBedsAvailable !== null && availableBeds !== null && icuBedsAvailable > availableBeds) {
    throw new Error('ICU beds cannot exceed available beds');
  }
  if (status === 'available' && availableBeds === 0) {
    throw new Error('Available facilities must report at least one available bed');
  }
  if (status === 'full' && availableBeds !== null && availableBeds > 0) {
    throw new Error('Full facilities cannot report available beds');
  }

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
    // L1 hardening: retry the primary hospitals read on transient failures. The
    // query is rebuilt inside the callback because Supabase builders are single-use
    // thenables; non-retryable errors (auth/RLS/constraint) still throw on the first
    // attempt, preserving prior behavior.
    const { data, error, count } = await withRetry(async () => {
      let query = filter?.count
        ? supabase.from(TABLE_NAME).select('*', { count: 'exact' })
        : supabase.from(TABLE_NAME).select('*');
      // Rely on database RLS for visibility and role scoping to avoid client-side role drift.
      // This keeps console/admin behavior consistent with backend policy changes.

      query = applyHospitalFilters(query, filter);

      // F1: the sort key is allowlisted (HOSPITAL_SORT_FIELDS) and the direction
      // defaults to the prior created_at desc behavior when the caller sends none.
      const sortKey = HOSPITAL_SORT_FIELDS.has(filter?.sortKey) ? filter.sortKey : 'created_at';
      query = query.order(sortKey, { ascending: filter?.sortDirection === 'asc' });

      if (filter?.offset !== undefined && filter?.offset !== null) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      } else if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    // F12 (HOSPITALS_REVAMP_CONSTITUTION_2026-07-09): display_id is a REAL
    // hospitals column already returned by select('*'); the old display-id
    // enrichment was a second service read that could clobber genuine ids with
    // null on a lookup miss. Read the column directly.
    const result = data || [];
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
 * Narrow facility identity projection for selectors owned by other domains.
 * Database RLS remains the visibility owner; callers receive no operational fields.
 */
export async function getHospitalOptions() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
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
    sortKey,
    sortDirection,
    quiet = false,
  } = options;

  try {
    const [pageResult, stats] = await Promise.all([
      getHospitals({
        ...filters,
        limit,
        offset,
        sortKey,
        sortDirection,
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
    // maybeSingle(): this is a non-owner lookup (operators/admins fetch any
    // facility), so 0 rows under RLS must resolve to null, not PGRST116/HTTP 406.
    // NOTE: no isValidUUID early-return here - this function intentionally accepts
    // a display_id (ORG-XXXXXX label) as well as a UUID, so a strict UUID guard
    // would break display-ID deep-links. Retry transient failures; PGRST116 (a
    // >1-row ambiguity that id/display_id uniqueness should prevent) is not
    // transient, so it is returned, not retried, and the guard below preserves the
    // prior 0/many -> null contract.
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(hospitalId)) {
        query = query.eq('id', hospitalId);
      } else {
        query = query.eq('display_id', hospitalId);
      }

      const result = await query.maybeSingle();
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

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

    // withAudit: critical write to the shared `hospitals` table. The insert
    // .select().single() is a write-return of exactly one just-created row (not a
    // non-owner read), so .single() is retained. Return shape unchanged.
    return await withAudit('hospital.create', 'hospital', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { fields: Object.keys(payload) });
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
    // We use a SECURITY DEFINER RPC to bypass RLS issues and handle column
    // stripping (total_beds, etc.) on the server side. The RPC now preserves
    // specialties/service_types/features when the payload omits the key (COALESCE),
    // so no client-side array merge is needed.
    // withAudit: critical write to the shared `hospitals` table via SECURITY
    // DEFINER RPC. Return shape unchanged (the RPC's data).
    return await withAudit('hospital.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload
      });

      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Facility update was not confirmed');
      }

      const { data, error: readError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle();

      if (readError) throw readError;
      if (!data) throw new Error('Facility no longer exists');
      return data;
    }, { hospital_id: hospitalId });
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
    // withAudit: critical delete on the shared `hospitals` table via SECURITY
    // DEFINER RPC. Return shape unchanged (data || null).
    return await withAudit('hospital.delete', 'hospital', async () => {
      const { data, error } = await supabase.rpc('delete_hospital_by_admin', {
        target_hospital_id: hospitalId
      });
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Hospital deletion failed');
      }
      return data || null;
    }, { hospital_id: hospitalId });
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
    // L1 hardening: idempotent read, retried on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('verified', true)
        .order('rating', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

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
    // L1 hardening: idempotent read, retried on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .contains('specialties', [specialty])
        .order('rating', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

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
    // policy, so a raw .update() is silently denied). Same RPC as updateHospital;
    // it now preserves arrays on omitted keys, so this narrow payload is safe as-is.
    const payload = { available_beds: availableBeds };
    // withAudit: critical write to the shared `hospitals` table via SECURITY
    // DEFINER RPC. Return shape unchanged (the re-read hospital row).
    return await withAudit('hospital.bed_count.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload,
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
    }, { hospital_id: hospitalId });
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
    // policy, so a raw .update() is silently denied). Same RPC as updateHospital;
    // it now preserves arrays on omitted keys, so this narrow payload is safe as-is.
    const payload = { status: status };
    // withAudit: critical write to the shared `hospitals` table via SECURITY
    // DEFINER RPC. Return shape unchanged (the re-read hospital row).
    return await withAudit('hospital.status.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload,
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
    }, { hospital_id: hospitalId });
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
