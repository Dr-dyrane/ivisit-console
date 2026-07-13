/**
 * Ambulances Service
 * Handles all Supabase queries for ambulances table
 * Ambulance fleet management and real-time tracking
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';
import { withRetry, withAudit } from './supabaseHelpers';
import {
  applyQueryAbortSignal,
  createQueryAbortContext,
  throwIfQueryAborted,
} from './queryAbort';

const TABLE_NAME = 'ambulances';

const ACTIVE_AMBULANCE_STATUSES = ['dispatched', 'on_trip', 'en_route', 'on_scene'];
const VALID_AMBULANCE_STATUSES = [
  'available',
  'dispatched',
  'on_trip',
  'en_route',
  'on_scene',
  'returning',
  'maintenance',
  'offline',
  'pending_approval',
];
const AMBULANCE_PAGE_SORT_COLUMNS = new Set([
  'call_sign',
  'vehicle_number',
  'license_plate',
  'type',
  'status',
  'eta',
  'created_at',
  'updated_at',
  'hospital_id',
]);

const getActorFacilityIds = (actor = {}) => {
  const facilityIds = [
    ...(Array.isArray(actor.hospital_ids) ? actor.hospital_ids : []),
    ...(Array.isArray(actor.facility_ids) ? actor.facility_ids : []),
    ...(Array.isArray(actor.organization_scope?.facilityIds)
      ? actor.organization_scope.facilityIds
      : []),
  ];

  return new Set(facilityIds.filter(isValidUUID));
};

const createAmbulanceScopeError = (message) => {
  const error = new Error(message);
  error.code = 'AMBULANCE_SCOPE_DENIED';
  return error;
};

export function filterAmbulanceStationOptions(stations, actor = {}) {
  const rows = Array.isArray(stations) ? stations : [];
  if (actor.role === 'admin') return rows;
  if (actor.role !== 'org_admin') return [];

  const allowedFacilityIds = getActorFacilityIds(actor);
  return rows.filter((station) => allowedFacilityIds.has(station?.id));
}

export function assertAmbulanceWriteScope(input = {}, actor = {}) {
  if (actor.role !== 'org_admin') return input;

  const actorOrganizationId = actor.organization_id;
  if (!isValidUUID(actorOrganizationId)) {
    throw createAmbulanceScopeError('Your organization scope could not be verified.');
  }

  if (input.organization_id && input.organization_id !== actorOrganizationId) {
    throw createAmbulanceScopeError('This ambulance belongs to another organization.');
  }

  if (input.hospital_id) {
    const allowedFacilityIds = getActorFacilityIds(actor);
    if (!allowedFacilityIds.has(input.hospital_id)) {
      throw createAmbulanceScopeError('Select a station in your organization.');
    }
  }

  return input;
}

function normalizeFilterList(value) {
  if (!value || value === 'all') return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => item !== 'all');
}

function sanitizeAmbulanceSearchTerm(value) {
  return String(value || '').replace(/[,%]/g, ' ').trim();
}

function normalizeAmbulanceStatusValues(value) {
  return normalizeFilterList(value)
    .flatMap((status) => {
      if (status === 'on_route') return ['en_route'];
      if (status === 'busy') return ACTIVE_AMBULANCE_STATUSES;
      return [status];
    })
    .filter((status, index, statuses) => (
      VALID_AMBULANCE_STATUSES.includes(status) && statuses.indexOf(status) === index
    ));
}

// Direct organization ownership is canonical. The facility edge is a fallback
// only for legacy rows whose organization_id is null. This mirrors RLS and keeps
// historical cross-edge mismatches visible only to the direct owner for repair.
export function applyAmbulanceOrgAdminScope(query, user) {
  const orgId = user.organization_id;
  const hospitalIds = (Array.isArray(user.hospital_ids) ? user.hospital_ids : [])
    .filter(isValidUUID);

  if (hospitalIds.length > 0) {
    return query.or(
      `organization_id.eq.${orgId},and(organization_id.is.null,hospital_id.in.(${hospitalIds.join(',')}))`
    );
  }
  return query.eq('organization_id', orgId);
}

function applyAmbulancePageAuth(query, user) {
  if (user?.role === 'org_admin' && user?.organization_id) {
    return applyAmbulanceOrgAdminScope(query, user);
  }
  return applyAuthFilter(query, user, {
    userIdField: 'profile_id',
    orgIdField: 'organization_id',
    resourceType: 'ambulances',
  });
}

function applyAmbulancePageStatusFilter(query, statusValues) {
  if (statusValues.length === 1) {
    return query.eq('status', statusValues[0]);
  }
  if (statusValues.length > 1) {
    return query.in('status', statusValues);
  }
  return query;
}

function applyAmbulancePageFilters(query, filters = {}, kpiFilter = 'all') {
  const search = sanitizeAmbulanceSearchTerm(filters.search);
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`call_sign.ilike.${pattern},vehicle_number.ilike.${pattern},license_plate.ilike.${pattern}`);
  }

  const statusValues = normalizeAmbulanceStatusValues(filters.status);
  query = applyAmbulancePageStatusFilter(query, statusValues);

  const kpiStatusValues = normalizeAmbulanceStatusValues(kpiFilter);
  query = applyAmbulancePageStatusFilter(query, kpiStatusValues);

  const typeValues = normalizeFilterList(filters.type);
  if (typeValues.length === 1) {
    query = query.eq('type', typeValues[0]);
  } else if (typeValues.length > 1) {
    query = query.in('type', typeValues);
  }

  if (filters.hospital && filters.hospital !== 'all' && isValidUUID(filters.hospital)) {
    query = query.eq('hospital_id', filters.hospital);
  }

  const dateRange = filters.dateRange || filters.created_at;

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }

  if (dateRange?.end) {
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endDate.toISOString());
  }

  return query;
}

function applyAmbulancePageSort(query, sortConfig = {}) {
  const hasSortKey = AMBULANCE_PAGE_SORT_COLUMNS.has(sortConfig?.key);
  const sortKey = hasSortKey ? sortConfig.key : 'created_at';
  const ascending = hasSortKey ? sortConfig.direction === 'asc' : false;
  return query.order(sortKey, { ascending });
}

async function readAmbulanceCount(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function enrichAmbulanceRowsForPage(rows, abortSignal) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const hospitalIds = [...new Set(rows.map((row) => row.hospital_id).filter(isValidUUID))];
  let hospitalNameById = new Map();

  if (hospitalIds.length > 0) {
    let hospitalQuery = supabase
      .from('hospitals')
      .select('id,name')
      .in('id', hospitalIds);
    hospitalQuery = applyQueryAbortSignal(hospitalQuery, abortSignal);

    const { data, error } = await hospitalQuery;
    throwIfQueryAborted(abortSignal);

    if (error) throw error;
    hospitalNameById = new Map((data || []).map((hospital) => [hospital.id, hospital.name]));
  }

  return rows.map((ambulance) => {
    const stationName = hospitalNameById.get(ambulance.hospital_id) || ambulance.hospital || null;

    return {
      ...ambulance,
      hospital: stationName,
      station_name: stationName,
      vehicle_label: ambulance.license_plate
        || ambulance.vehicle_number
        || ambulance.call_sign
        || null,
    };
  });
}

async function getAmbulancePageStats(user, filters = {}, abortSignal) {
  const createCountQuery = (status) => {
    let query = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    query = applyAmbulancePageAuth(query, user);
    query = applyAmbulancePageFilters(query, { ...filters, status }, 'all');
    return applyQueryAbortSignal(query, abortSignal);
  };

  const [total, available, onRoute, busy, maintenance] = await Promise.all([
    readAmbulanceCount(createCountQuery(filters.status)),
    readAmbulanceCount(createCountQuery('available')),
    readAmbulanceCount(createCountQuery('en_route')),
    readAmbulanceCount(createCountQuery(ACTIVE_AMBULANCE_STATUSES)),
    readAmbulanceCount(createCountQuery('maintenance')),
  ]);

  return {
    total,
    available,
    onRoute,
    busy,
    maintenance,
    exactCounts: true,
    source: 'ambulances.status',
  };
}

export async function getAmbulancesPageData({
  filters = {},
  statsFilters = filters,
  kpiFilter = 'all',
  sortConfig = {},
  limit = 20,
  offset = 0,
  abortSignal,
} = {}) {
  throwIfQueryAborted(abortSignal);
  const user = await getCurrentUser();
  throwIfQueryAborted(abortSignal);

  const request = createQueryAbortContext({
    abortSignal,
    timeoutMs: 8000,
    timeoutMessage: 'Ambulance page data query timed out',
  });

  try {
    const safeLimit = Math.max(1, Number(limit) || 20);
    const safeOffset = Math.max(0, Number(offset) || 0);

    let countQuery = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    countQuery = applyAmbulancePageAuth(countQuery, user);
    countQuery = applyAmbulancePageFilters(countQuery, filters, kpiFilter);
    countQuery = applyQueryAbortSignal(countQuery, request.signal);

    let dataQuery = supabase
      .from(TABLE_NAME)
      .select('*');
    dataQuery = applyAmbulancePageAuth(dataQuery, user);
    dataQuery = applyAmbulancePageFilters(dataQuery, filters, kpiFilter);
    dataQuery = applyAmbulancePageSort(dataQuery, sortConfig)
      .range(safeOffset, safeOffset + safeLimit - 1);
    dataQuery = applyQueryAbortSignal(dataQuery, request.signal);

    const [count, pageResult, stats] = await Promise.all([
      readAmbulanceCount(countQuery),
      dataQuery,
      getAmbulancePageStats(user, statsFilters, request.signal),
    ]);
    request.throwIfAborted();

    if (pageResult.error) throw pageResult.error;

    const rows = await enrichAmbulanceRowsForPage(pageResult.data || [], request.signal);
    request.throwIfAborted();

    return {
      data: rows,
      count,
      stats,
      recent: rows.slice(0, 5),
    };
  } catch (error) {
    request.abort(error);
    request.throwIfAborted();
    throw error;
  } finally {
    request.cleanup();
  }
}

/**
 * Get all ambulances with optional filters
 * Admin users can see all ambulances, others see only available ones or their assigned ones
 */
export async function getAmbulances(filter = {}) {
  try {
    const user = await getCurrentUser();

    // L1 hardening: retry the read with exponential backoff on transient failures
    // (network/timeout, 429, 5xx, serialization). The query is rebuilt inside the
    // callback because Supabase builders are single-use thenables; non-retryable
    // errors (auth/RLS/constraint) still throw on the first attempt, preserving
    // prior behavior.
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      // Apply RBAC Scoping
      if (user?.role === 'provider' && user?.provider_type === 'driver') {
        // Drivers see only their assigned ambulance
        query = query.eq('profile_id', user.id);
      } else if (user?.role === 'org_admin' && user?.organization_id) {
        // Same primary-owner/fallback scope as the page projection and RLS.
        query = applyAmbulanceOrgAdminScope(query, user);
      } else {
        // Apply standard RBAC for other roles
        query = applyAuthFilter(query, user, {
          userIdField: 'profile_id',
          orgIdField: 'hospital_id',
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

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching ambulances:', error);
    }
    throw error;
  }
}

/**
 * Get single ambulance by ID
 */
export async function getAmbulance(ambulanceId) {
  try {
    // Dual-key lookup: a UUID resolves by id, anything else by display_id (a label,
    // never a write key). This is a non-owner read that can legitimately match 0 rows
    // under RLS, so use maybeSingle (no PGRST116/406 on the empty case) and null-guard.
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(ambulanceId)) {
        query = query.eq('id', ambulanceId);
      } else {
        query = query.eq('display_id', ambulanceId);
      }

      const result = await query.maybeSingle();
      // PGRST116 (multi-row) stays a soft-null like the prior .single() contract;
      // it is not retryable, so it must not throw out of the retry callback.
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

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
    const actor = await getCurrentUser();
    const scopedInput = actor?.role === 'org_admin' && !input.organization_id
      ? { ...input, organization_id: actor.organization_id }
      : input;
    assertAmbulanceWriteScope(scopedInput, actor);

    // Build payload, omitting undefined/null/empty values so DB defaults apply
    const payload = {};

    // Only include id if explicitly provided; otherwise let DB DEFAULT generate it
    if (scopedInput.id) payload.id = scopedInput.id;

    // Required fields
    if (scopedInput.type) payload.type = scopedInput.type;
    if (scopedInput.call_sign) payload.call_sign = scopedInput.call_sign;
    payload.status = scopedInput.status || 'available';

    // Optional fields - only include if truthy
    if (scopedInput.location) payload.location = scopedInput.location;
    if (scopedInput.eta) payload.eta = scopedInput.eta;
    if (scopedInput.crew) payload.crew = scopedInput.crew;
    if (scopedInput.hospital_id && scopedInput.hospital_id !== '') payload.hospital_id = scopedInput.hospital_id;
    if (scopedInput.organization_id && scopedInput.organization_id !== '') payload.organization_id = scopedInput.organization_id;
    if (scopedInput.vehicle_number) payload.vehicle_number = scopedInput.vehicle_number;
    if (scopedInput.license_plate) payload.license_plate = scopedInput.license_plate;
    if (scopedInput.base_price != null) payload.base_price = scopedInput.base_price;
    if (scopedInput.current_call) payload.current_call = scopedInput.current_call;
    if (scopedInput.profile_id) payload.profile_id = scopedInput.profile_id;
    if (scopedInput.driver_id) payload.profile_id = scopedInput.driver_id;

    payload.created_at = new Date().toISOString();
    payload.updated_at = new Date().toISOString();

    // Critical fleet mutation: audit-wrap (fire-and-forget log, never blocks or
    // changes the return). insert/select/single is preserved -- exactly one row is
    // written and returned, so a 0-row RLS outcome should still surface as an error.
    return await withAudit('ambulance.create', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { type: payload.type || null, hospital_id: payload.hospital_id || null });
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
    const actor = await getCurrentUser();
    assertAmbulanceWriteScope(input, actor);

    // Whitelist of valid ambulance table columns to prevent PGRST204 errors
    // Status is intentionally excluded: trip/dispatch workflows own that field.
    // The separate updateAmbulanceStatus receiver retains its own authority burden.
    const VALID_COLUMNS = [
      'call_sign', 'type', 'vehicle_number',
      'hospital_id', 'location', 'eta', 'crew',
      'current_call', 'profile_id', 'organization_id',
      'base_price', 'license_plate'
    ];

    const payload = {};
    for (const key of VALID_COLUMNS) {
      if (key in input) {
        // Sanitize empty strings to null for UUID/FK fields
        if (['hospital_id', 'profile_id', 'organization_id'].includes(key)) {
          payload[key] = input[key] === '' ? null : input[key];
        } else {
          payload[key] = input[key];
        }
      }
    }
    if ('driver_id' in input && !('profile_id' in payload)) {
      payload.profile_id = input.driver_id === '' ? null : input.driver_id;
    }

    payload.updated_at = new Date().toISOString();

    // Critical fleet mutation: audit-wrap. update/select/single is preserved so a
    // 0-row (bad id / RLS) outcome still throws rather than silently returning null.
    return await withAudit('ambulance.update', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', ambulanceId)
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { ambulance_id: ambulanceId, fields: Object.keys(payload) });
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
    // Critical fleet mutation (driver <-> unit assignment): audit-wrap.
    return await withAudit('ambulance.assign_driver', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          profile_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ambulanceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { ambulance_id: ambulanceId, driver_id: driverId || null });
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
        location,
        updated_at: new Date().toISOString()
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
    // UUID guard before an id-keyed query: an invalid id can never match a row, so
    // return the same null this function already returns for the no-row case (and
    // avoid a 22P02 invalid-uuid round-trip). This function has no callers today, so
    // returning null on bad input rather than throwing has no ripple.
    if (!isValidUUID(driverId)) return null;

    // maybeSingle: a driver may map to 0 rows under RLS; PGRST116 (multi-row) stays a
    // soft-null exactly like the prior .single() contract.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('profile_id', driverId)
        .maybeSingle();

      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

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
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('provider_type', 'driver')
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

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
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('provider_type', 'driver')
        .is('assigned_ambulance_id', null)
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

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
    // Critical fleet mutation: audit-wrap. The function still resolves to undefined
    // (no return value forwarded) -- only the audit log sees the entity id.
    await withAudit('ambulance.delete', 'ambulance', async () => {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', ambulanceId);

      if (error) throw error;
      return { id: ambulanceId };
    }, { ambulance_id: ambulanceId });
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
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: true });

      if (result.error) throw result.error;
      return result;
    });

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
    // UUID guard before an id-keyed query. This read's contract is an array, so the
    // guard returns [] (not null) to keep every caller's array destructure safe.
    if (!isValidUUID(hospitalId)) return [];

    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

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
    // Critical fleet state transition: audit-wrap. update/select/single preserved so
    // a 0-row (bad id / RLS) outcome still throws.
    return await withAudit('ambulance.update_status', 'ambulance', async () => {
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
    }, { ambulance_id: ambulanceId, status: status || null });
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
