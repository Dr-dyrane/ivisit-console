/**
 * Emergency Request Service
 * Handles all Supabase queries for emergency_requests table
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { logEmergencyActivity } from './activityService';
import { getVisitByRequestId } from './visitsService';
import { isValidUUID } from '../lib/utils';
import { withRetry, withAudit } from './supabaseHelpers';
import { canonicalizeEmergencyStatus } from '../utils/emergencyStatus';
import {
  buildLatestPaymentMap,
  normalizeEmergencyRequestRow,
} from '../utils/emergencyRequestMapper';

const TABLE_NAME = 'emergency_requests';
// PULLBACK NOTE: Expanded to include all columns added to logistics pillar during schema audit
// OLD: minimal set - missing cost breakdown, bed/patient metadata, payment tracking columns
// NEW: full parity with database.ts emergency_requests Row type
const EMERGENCY_REQUEST_WRITABLE_FIELDS = new Set([
  'user_id',
  'service_type',
  'specialty',
  'status',
  'hospital_id',
  'hospital_name',
  'ambulance_type',
  'bed_number',
  'total_cost',
  'payment_status',
  'patient_snapshot',
  'patient_location',
  'pickup_location',
  'destination_location',
  // Cost breakdown (from calculate_service_cost RPC)
  'base_cost',
  'distance_surcharge',
  'urgency_surcharge',
  'cost_breakdown',
  'confirmed_cost',
  // Bed booking metadata
  'bed_count',
  // Patient/navigation metadata
  'patient_heading',
  'shared_data_snapshot',
  // Payment tracking
  'payment_method_id',
  'payment_id',
]);

const CONSOLE_CREATE_EMERGENCY_PAYLOAD_FIELDS = [
  'user_id',
  'hospital_id',
  'service_type',
  'status',
  'total_cost',
  'payment_status',
  'patient_snapshot',
  'patient_location',
  'latitude',
  'longitude',
  'description',
  'transition_reason',
  'reason',
  'hospital_name',
  'specialty',
  'ambulance_type',
  'bed_number',
];

const CONSOLE_UPDATE_EMERGENCY_PAYLOAD_FIELDS = [
  'status',
  'transition_reason',
  'reason',
  'hospital_id',
  'hospital_name',
  'service_type',
  'specialty',
  'ambulance_type',
  'bed_number',
  'responder_id',
  'responder_name',
  'responder_phone',
  'responder_vehicle_type',
  'responder_vehicle_plate',
  'responder_heading',
  'responder_location',
  'patient_snapshot',
  'patient_location',
  'total_cost',
  'payment_status',
];

function parsePointInput(input) {
  if (!input) return null;

  if (typeof input === 'object') {
    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng };
    }
    if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
      return { lat: input.latitude, lng: input.longitude };
    }
    if (
      input.type === 'Point' &&
      Array.isArray(input.coordinates) &&
      input.coordinates.length >= 2
    ) {
      const [lng, lat] = input.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }

  if (typeof input === 'string') {
    const match = input.match(/POINT\s*\(\s*([-.\d]+)\s+([-.\d]+)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

function buildLegacyEmergencyPayload(input) {
  const payload = {
    user_id: input.user_id,
    service_type: input.service_type,
    specialty: input.specialty,
    pickup_location: input.pickup_location,
    destination_location: input.destination_location,
    patient_snapshot: input.patient_snapshot,
    hospital_id: input.hospital_id,
    hospital_name: input.hospital_name,
    ambulance_type: input.ambulance_type,
    payment_status: input.payment_status,
    total_cost: input.total_cost,
    status: canonicalizeEmergencyStatus(input.status, 'in_progress'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Strip undefined to avoid invalid column writes and let DB defaults apply.
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function pickDefinedPayloadFields(input, allowedFields) {
  const payload = {};
  for (const field of allowedFields) {
    if (input?.[field] !== undefined) {
      payload[field] = input[field];
    }
  }
  return payload;
}

function buildConsoleCreatePayload(input, fallbackPayload) {
  const payload = pickDefinedPayloadFields(
    {
      ...fallbackPayload,
      user_id: input?.user_id ?? fallbackPayload?.user_id ?? null,
      service_type: input?.service_type ?? fallbackPayload?.service_type ?? 'ambulance',
      status: fallbackPayload?.status ?? canonicalizeEmergencyStatus(input?.status, 'in_progress'),
      latitude:
        input?.latitude ??
        input?.pickup_location?.latitude ??
        input?.pickup_location?.lat ??
        null,
      longitude:
        input?.longitude ??
        input?.pickup_location?.longitude ??
        input?.pickup_location?.lng ??
        null,
      description: input?.description ?? null,
    },
    CONSOLE_CREATE_EMERGENCY_PAYLOAD_FIELDS
  );

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function buildConsoleUpdatePayload(input, normalizedStatus) {
  // PULLBACK NOTE: Pass 1B UI-to-DB payload contraction.
  // OLD: updateEmergencyRequest forwarded the full UI object to the RPC.
  // NEW: only fields consumed by console_update_emergency_request are submitted.
  const payload = pickDefinedPayloadFields(
    {
      ...input,
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
    },
    CONSOLE_UPDATE_EMERGENCY_PAYLOAD_FIELDS
  );

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

/**
 * Calculate response time in minutes
 */
function calculateResponseTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  return Math.round(diffMs / 60000); // Convert to minutes
}

// Only real, meaningfully-orderable scalar columns (database.ts truth). Pruned per
// the data-sync audit (S10.3): requester_name/requester_phone do not exist on
// emergency_requests, and patient_location is PostGIS geography — wiring any of
// them into a sort would throw a raw PostgREST column error at the user.
const EMERGENCY_REQUEST_SORT_FIELDS = new Set([
  'created_at',
  'display_id',
  'service_type',
  'status',
  'hospital_name',
  'payment_status',
]);

function applyEmergencyListFilters(query, filter = {}) {
  if (Array.isArray(filter.status)) {
    if (filter.status.length > 0) {
      query = query.in('status', filter.status);
    }
  } else if (filter.status) {
    query = query.eq('status', filter.status);
  }

  if (filter.responder_id) {
    query = query.eq('responder_id', filter.responder_id);
  }

  if (filter.user_id) {
    query = query.eq('user_id', filter.user_id);
  }
  if (filter.hospital_id) {
    query = query.eq('hospital_id', filter.hospital_id);
  }
  if (filter.ambulance_id) {
    query = query.eq('ambulance_id', filter.ambulance_id);
  }
  if (filter.service_type) {
    query = query.eq('service_type', filter.service_type);
  }
  if (filter.search) {
    const term = String(filter.search).replace(/,/g, ' ').trim();
    if (term) {
      query = query.or(`display_id.ilike.%${term}%,service_type.ilike.%${term}%,hospital_name.ilike.%${term}%,responder_name.ilike.%${term}%`);
    }
  }
  if (filter.date_from) {
    query = query.gte('created_at', filter.date_from);
  }
  if (filter.date_to) {
    query = query.lte('created_at', filter.date_to);
  }

  return query;
}

function applyEmergencyKpiFilter(query, kpiFilter) {
  if (kpiFilter === 'ambulance') return query.eq('service_type', 'ambulance');
  if (kpiFilter === 'bed') return query.eq('service_type', 'bed');
  if (kpiFilter === 'critical') return query.eq('service_type', 'critical_care');
  if (kpiFilter === 'pending') return query.eq('status', 'pending_approval');
  if (kpiFilter === 'inProgress') return query.eq('status', 'in_progress');
  if (kpiFilter === 'active') return query.in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);
  return query;
}

function applyEmergencyRequestScope(query, user) {
  return applyAuthFilter(query, user, {
    userIdField: 'user_id',
    orgIdField: 'hospital_id',
    providerIdField: 'responder_id',
    resourceType: 'emergency'
  });
}

async function getEmergencyPageExactCount(filter = {}, user) {
  // L1 hardening: retry the idempotent count read on transient failures. The
  // query is rebuilt inside the callback because Supabase builders are single-use
  // thenables; non-retryable errors (auth/RLS) still throw on the first attempt.
  return withRetry(async () => {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    query = applyEmergencyRequestScope(query, user);
    query = applyEmergencyListFilters(query, filter);
    query = applyEmergencyKpiFilter(query, filter.kpiFilter);

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  });
}

export async function getEmergencyRequestsPageStats(filter = {}, user, quiet = false) {
  try {
    const scopedUser = user || await getCurrentUser();
    // Stats contract: the KPI chips ARE the status dimension, so chip counts ignore the
    // sheet status filter (search/date/service filters still apply). Each count below
    // sets its own status/kpi scope on this one consistent base.
    const baseFilter = { ...filter, kpiFilter: undefined, status: undefined };

    const [
      total,
      pending,
      active,
      bed,
      ambulance,
      critical,
      emergency,
      inProgress,
      accepted,
      arrived,
      completed,
      cancelled,
      mine,
    ] = await Promise.all([
      getEmergencyPageExactCount(baseFilter, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'pending_approval' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, kpiFilter: 'active' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'bed' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'ambulance' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'critical_care' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'emergency_room' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'in_progress' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'accepted' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'arrived' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'completed' }, scopedUser),
      getEmergencyPageExactCount({ ...baseFilter, status: 'cancelled' }, scopedUser),
      scopedUser?.id
        ? getEmergencyPageExactCount({ ...baseFilter, responder_id: scopedUser.id }, scopedUser)
        : Promise.resolve(0),
    ]);

    return {
      total,
      active,
      pending,
      pending_approval: pending,
      bed,
      ambulance,
      critical,
      emergency,
      inProgress,
      accepted,
      arrived,
      completed,
      cancelled,
      mine,
    };
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching emergency requests page stats:', error);
    }
    throw error;
  }
}

async function getLatestPaymentMapForRequests(rows) {
  const requestIds = (rows || []).map((row) => row.id).filter(Boolean);
  if (requestIds.length === 0) return new Map();

  const data = await withRetry(async () => {
    const result = await supabase
      .from('payments')
      .select('id,emergency_request_id,payment_method,status,amount,currency,created_at')
      .in('emergency_request_id', requestIds)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    return result.data || [];
  });
  return buildLatestPaymentMap(data);
}

/**
 * Get all emergency requests with optional filters
 * Admin users can see all requests, org admins see their hospital's, providers see assigned
 */
export async function getEmergencyRequests(filter) {
  try {
    const user = await getCurrentUser();

    // L1 hardening: retry the idempotent list read on transient failures. Query
    // rebuilt inside the callback because Supabase builders are single-use.
    return await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      // Apply RBAC Scoping with enhanced filtering
      query = applyEmergencyRequestScope(query, user);
      query = applyEmergencyListFilters(query, filter);

      // Sorting
      query = query.order('created_at', { ascending: false });

      // Pagination
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    });
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching emergency requests:', error);
    }
    throw error;
  }
}

/**
 * Get the Requests page projection with exact count and payment-method enrichment.
 */
export async function getEmergencyRequestsPage(filter = {}) {
  try {
    const user = await getCurrentUser();

    // 'mine' is the responder-persona chip (drivers): resolve it to a concrete
    // responder_id filter here so count/stats/list all inherit it without the
    // KPI applier needing user context.
    if (filter.kpiFilter === 'mine') {
      filter = { ...filter, responder_id: user?.id, kpiFilter: undefined };
    }

    const statsFilter = filter.statsFilter || { ...filter, kpiFilter: undefined, responder_id: undefined };
    const countPromise = getEmergencyPageExactCount(filter, user);
    const statsPromise = getEmergencyRequestsPageStats(statsFilter, user, true);

    let dataQuery = supabase.from(TABLE_NAME).select('*');
    dataQuery = applyEmergencyRequestScope(dataQuery, user);
    dataQuery = applyEmergencyListFilters(dataQuery, filter);
    dataQuery = applyEmergencyKpiFilter(dataQuery, filter.kpiFilter);

    const sortKey = EMERGENCY_REQUEST_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      dataQuery = dataQuery.range(offset, offset + limit - 1);
    }

    const [{ data, error }, count, stats] = await Promise.all([
      dataQuery,
      countPromise,
      statsPromise,
    ]);
    if (error) throw error;

    const paymentByRequestId = await getLatestPaymentMapForRequests(data || []);
    const normalizedRows = (data || []).map((row) =>
      normalizeEmergencyRequestRow(row, paymentByRequestId.get(row.id))
    );

    return {
      data: normalizedRows,
      count: count || 0,
      stats,
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching emergency requests page:', error);
    }
    throw error;
  }
}

/**
 * Get single emergency request by ID
 */
export async function getEmergencyRequest(requestId) {
  try {
    // L1 hardening: retry the idempotent single-row read on transient failures.
    // Uses .maybeSingle() so a 0-row RLS result returns null instead of a 406.
    return await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(requestId)) {
        query = query.eq('id', requestId);
      } else {
        query = query.eq('display_id', requestId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found / multiple

      return data || null;
    });
  } catch (error) {
    console.error(`Error fetching emergency request ${requestId}:`, error);
    throw error;
  }
}

export async function getLatestEmergencyPayment(requestId) {
  try {
    if (!isValidUUID(requestId)) {
      return {
        payment: null,
        visibilityState: 'not_created',
        error: null,
      };
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('emergency_request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        payment: null,
        visibilityState: 'failed',
        error,
      };
    }

    return {
      payment: data || null,
      visibilityState: data ? 'visible' : 'not_created',
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching latest emergency payment for ${requestId}:`, error);
    return {
      payment: null,
      visibilityState: 'failed',
      error,
    };
  }
}

export async function getEmergencyDetailProjection(requestId, initialRequest = null) {
  const request = initialRequest?.id === requestId
    ? initialRequest
    : await getEmergencyRequest(requestId);

  if (!request) {
    return {
      request: null,
      latestPayment: null,
      paymentVisibilityState: 'not_created',
      visitOutcome: null,
      visitVisibilityState: 'not_applicable',
      errors: {},
    };
  }

  const normalizedStatus = canonicalizeEmergencyStatus(request.status, request.status);
  const terminal = normalizedStatus === 'completed' || normalizedStatus === 'cancelled';
  const [paymentResult, visitResult] = await Promise.allSettled([
    getLatestEmergencyPayment(request.id),
    terminal ? getVisitByRequestId(request.id) : Promise.resolve(null),
  ]);

  const paymentPayload = paymentResult.status === 'fulfilled'
    ? paymentResult.value
    : { payment: null, visibilityState: 'failed', error: paymentResult.reason };
  const visitOutcome = visitResult.status === 'fulfilled' ? visitResult.value : null;

  return {
    request,
    latestPayment: paymentPayload.payment,
    paymentVisibilityState: paymentPayload.visibilityState,
    visitOutcome,
    visitVisibilityState: terminal
      ? (visitOutcome ? 'linked' : 'missing_terminal')
      : 'not_expected_yet',
    errors: {
      payment: paymentPayload.error || null,
      visit: visitResult.status === 'rejected' ? visitResult.reason : null,
    },
  };
}

export function subscribeToEmergencyDetail(requestId, callback) {
  if (!isValidUUID(requestId)) return () => {};

  const channel = supabase
    .channel(`emergency_detail_projection_${requestId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME, filter: `id=eq.${requestId}` },
      callback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `emergency_request_id=eq.${requestId}` },
      callback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'visits', filter: `request_id=eq.${requestId}` },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Create new emergency request
 */
export async function createEmergencyRequest(input) {
  try {
    const normalizedPatientLocation =
      parsePointInput(input.patient_location) ||
      parsePointInput(input.pickup_location);

    const canUseAtomicRpc = Boolean(
      input?.user_id &&
      input?.hospital_id &&
      input?.service_type &&
      normalizedPatientLocation
    );

    let data;

    if (canUseAtomicRpc) {
      const requestData = {
        hospital_id: input.hospital_id,
        hospital_name: input.hospital_name,
        service_type: input.service_type,
        specialty: input.specialty,
        ambulance_type: input.ambulance_type,
        patient_snapshot: input.patient_snapshot || {},
        patient_location: normalizedPatientLocation
      };

      const paymentMethod = input.payment_method || input.payment_method_id || null;
      const paymentData = paymentMethod ? {
        method: paymentMethod,
        method_id: input.payment_method_id || null,
        total_amount: input.total_cost ?? input.amount ?? 0,
        fee_amount: input.ivisit_fee_amount ?? null,
        currency: input.currency || 'USD'
      } : null;

      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_emergency_v4', {
        p_user_id: input.user_id,
        p_request_data: requestData,
        p_payment_data: paymentData
      });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success || !rpcResult?.request_id) {
        throw new Error(rpcResult?.error || 'Emergency creation RPC returned an invalid result');
      }

      data = await getEmergencyRequest(rpcResult.request_id);
      if (!data) {
        throw new Error('Emergency created but could not be reloaded');
      }
    } else {
      // Fallback path for console-created records with incomplete payment context.
      const payload = buildLegacyEmergencyPayload(input);
      const fallbackPayload = buildConsoleCreatePayload(input, payload);

      const { data: rpcResult, error: rpcError } = await supabase.rpc('console_create_emergency_request', {
        p_payload: fallbackPayload,
      });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success || !rpcResult?.request) {
        throw new Error(rpcResult?.error || 'Console emergency creation failed');
      }

      data = rpcResult.request;
    }

    // Log activity
    try {
      await logEmergencyActivity.created(
        data.id,
        `New emergency request from ${input.pickup_location?.address || 'Unknown location'}`,
        {
          service_type: input.service_type,
          specialty: input.specialty,
          location: input.pickup_location?.address,
          priority: input.priority || 'medium'
        }
      );
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
    }

    return data;
  } catch (error) {
    console.error('Error creating emergency request:', error);
    throw error;
  }
}

/**
 * Update emergency request
 */
export async function updateEmergencyRequest(requestId, input) {
  try {
    const normalizedStatus = input?.status !== undefined
      ? canonicalizeEmergencyStatus(input.status, null)
      : undefined;

    const payload = buildConsoleUpdatePayload(input, normalizedStatus);

    const { data: rpcResult, error } = await supabase.rpc('console_update_emergency_request', {
      p_request_id: requestId,
      p_payload: payload,
    });
    if (error) throw error;
    if (!rpcResult?.success || !rpcResult?.request) {
      throw new Error(rpcResult?.error || 'Emergency update failed');
    }
    const data = rpcResult.request;

    // Log activity for completed emergencies
    if (normalizedStatus === 'completed') {
      try {
        await logEmergencyActivity.completed(
          requestId,
          `Emergency response completed - ${data.destination_location?.address || 'Location'}`,
          {
            location: data.destination_location?.address,
            response_time: calculateResponseTime(data.created_at),
            service_type: data.service_type
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    } else if (normalizedStatus) {
      try {
        await logEmergencyActivity.updated(
          requestId,
          `Emergency request updated to ${normalizedStatus}`,
          {
            old_status: data.status,
            new_status: normalizedStatus,
            location: data.pickup_location?.address
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    }

    return data;
  } catch (error) {
    console.error(`Error updating emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Accept/Assign emergency request to ambulance
 */
export async function acceptEmergencyRequest(
  requestId,
  ambulanceId,
  responderId,
  responderName,
  responderPhone
) {
  try {
    void responderId;
    return await withAudit('emergency.dispatch', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_dispatch_emergency', {
        p_request_id: requestId,
        p_ambulance_id: ambulanceId,
        p_responder_name: responderName || null,
        p_responder_phone: responderPhone || null,
      });

      if (error) throw error;
      if (!rpcResult?.success || !rpcResult?.request) {
        throw new Error(rpcResult?.error || 'Emergency dispatch failed');
      }

      return rpcResult.request;
    }, { request_id: requestId, ambulance_id: ambulanceId });
  } catch (error) {
    console.error(`Error accepting emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Complete emergency request
 */
export async function completeEmergencyRequest(requestId) {
  try {
    return await withAudit('emergency.complete', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_complete_emergency', {
        p_request_id: requestId,
      });
      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Emergency completion failed');
      }
      return rpcResult.request || null;
    }, { request_id: requestId });
  } catch (error) {
    console.error(`Error completing emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Cancel emergency request
 */
export async function cancelEmergencyRequest(requestId, reason) {
  try {
    return await withAudit('emergency.cancel', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_cancel_emergency', {
        p_request_id: requestId,
        p_reason: reason || null,
      });
      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Emergency cancellation failed');
      }
      return rpcResult.request || null;
    }, { request_id: requestId, reason: reason || null });
  } catch (error) {
    console.error(`Error cancelling emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Approve a pending cash payment (called by org_admin).
 */
export async function approveCashPayment(paymentId, requestId) {
  try {
    return await withAudit('payment.approve_cash', 'payments', async () => {
      const { data, error } = await supabase.rpc('approve_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');

      return data;
    }, { payment_id: paymentId, request_id: requestId });
  } catch (error) {
    if (
      error?.code === '23505' &&
      typeof error?.message === 'string' &&
      error.message.includes('emergency_requests_one_active_ambulance_per_user_idx')
    ) {
      throw new Error('Cannot approve dispatch: patient already has another active ambulance request (accepted/in-progress/arrived). Complete or cancel the existing trip first.');
    }
    if (
      error?.code === '23505' &&
      typeof error?.message === 'string' &&
      error.message.includes('emergency_requests_one_active_bed_per_user_idx')
    ) {
      throw new Error('Cannot approve booking: patient already has another active bed request (accepted/in-progress/arrived). Complete or cancel the existing booking first.');
    }
    console.error('Error approving cash payment:', error);
    throw error;
  }
}

/**
 * Decline a pending cash payment (called by org_admin).
 */
export async function declineCashPayment(paymentId, requestId) {
  try {
    return await withAudit('payment.decline_cash', 'payments', async () => {
      const { data, error } = await supabase.rpc('decline_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Decline failed');

      return data;
    }, { payment_id: paymentId, request_id: requestId });
  } catch (error) {
    console.error('Error declining cash payment:', error);
    throw error;
  }
}

/**
 * Get active emergency requests (in_progress or accepted)
 */
export async function getActiveEmergencyRequests() {
  try {
    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  } catch (error) {
    console.error('Error fetching active emergency requests:', error);
    throw error;
  }
}

/**
 * Get emergency requests for specific user
 */
export async function getUserEmergencyRequests(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  } catch (error) {
    console.error(`Error fetching emergency requests for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get emergency requests for specific hospital
 */
export async function getHospitalEmergencyRequests(hospitalId) {
  try {
    if (!isValidUUID(hospitalId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  } catch (error) {
    console.error(`Error fetching emergency requests for hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Update responder location and heading
 */
export async function updateResponderLocation(requestId, location, heading) {
  try {
    const { data: rpcResult, error } = await supabase.rpc('console_update_responder_location', {
      p_request_id: requestId,
      p_location: location,
      p_heading: heading ?? null,
    });
    if (error) throw error;
    if (!rpcResult?.success) {
      throw new Error(rpcResult?.error || 'Responder location update failed');
    }

    const { data: updatedRequest, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!updatedRequest) {
      throw new Error('Responder location updated but the request could not be reloaded');
    }

    return updatedRequest;
  } catch (error) {
    console.error(`Error updating responder location for ${requestId}:`, error);
    throw error;
  }
}

/**
 * List active payment methods available for a user.
 * Used by console operators when retrying declined payments.
 */
export async function getUserActivePaymentMethods(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(
          'id,type,provider,brand,last4,expiry_month,expiry_year,is_default,is_active,created_at'
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error(`Error loading payment methods for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Retry a declined emergency payment with a different payment method.
 */
export async function retryPaymentWithDifferentMethod(requestId, paymentMethodId, userId) {
  try {
    if (!isValidUUID(requestId) || !isValidUUID(paymentMethodId) || !isValidUUID(userId)) {
      throw new Error('Missing valid request, payment method, or user identifier');
    }

    return await withAudit('payment.retry', 'payments', async () => {
      const { data, error } = await supabase.rpc('retry_payment_with_different_method', {
        p_emergency_request_id: requestId,
        p_new_payment_method_id: paymentMethodId,
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment retry failed');

      return data;
    }, { request_id: requestId, payment_method_id: paymentMethodId, user_id: userId });
  } catch (error) {
    console.error(`Error retrying payment for request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Update patient location and heading
 */
export async function updatePatientLocation(requestId, location, heading) {
  try {
    void heading;
    const { data: rpcResult, error } = await supabase.rpc('console_update_emergency_request', {
      p_request_id: requestId,
      p_payload: {
        patient_location: location,
      },
    });
    if (error) throw error;
    if (!rpcResult?.success || !rpcResult?.request) {
      throw new Error(rpcResult?.error || 'Patient location update failed');
    }
    return rpcResult.request;
  } catch (error) {
    console.error(`Error updating patient location for ${requestId}:`, error);
    throw error;
  }
}

/**
 * Get emergency statistics/analytics
 */
export async function getEmergencyStats() {
  try {
    // Get total requests
    const { count: totalCount } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    // Get active requests
    const { data: activeData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);

    // Get pending requests (new cash approval flow)
    const { data: pendingData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'pending_approval');

    // Get today's completed
    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`);

    // Get today's cancelled
    const { data: cancelledToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'cancelled')
      .gte('cancelled_at', `${today}T00:00:00`)
      .lte('cancelled_at', `${today}T23:59:59`);

    // Calculate average response time
    const { data: responseTimeData } = await supabase
      .from(TABLE_NAME)
      .select('created_at, updated_at')
      .in('status', ['accepted', 'completed']);

    let avgResponseTime = 0;
    if (responseTimeData && responseTimeData.length > 0) {
      // Implementation here if needed
    }

    return {
      total_requests: totalCount || 0,
      active_requests: activeData?.length || 0,
      pending_requests: pendingData?.length || 0,
      completed_today: completedToday?.length || 0,
      cancelled_today: cancelledToday?.length || 0,
      avg_response_time_seconds: avgResponseTime,
      success_rate: totalCount ? (completedToday?.length / totalCount) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching emergency stats:', error);
    throw error;
  }
}
