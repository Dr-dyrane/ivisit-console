import { supabase } from '../../lib/supabase';
import { getCurrentUser, applyAuthFilter } from '../authService';
import { withRetry } from '../supabaseHelpers';
import {
  buildLatestPaymentMap,
  normalizeEmergencyRequestRow,
} from '../../utils/emergencyRequestMapper';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { TABLE_NAME } from './constants';
import { isValidUUID } from '../../lib/utils';

const ORGANIZATION_OPERATOR_ROLES = new Set(['org_admin', 'dispatcher']);
const EMERGENCY_AUTH_SCOPE = {
  userIdField: 'user_id',
  orgIdField: 'hospital_id',
  providerIdField: 'responder_id',
  resourceType: 'emergency',
};

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
  if (kpiFilter === 'booking') return query.eq('service_type', 'booking');
  if (kpiFilter === 'pending') return query.eq('status', 'pending_approval');
  if (kpiFilter === 'inProgress') return query.eq('status', 'in_progress');
  if (kpiFilter === 'active') return query.in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);
  return query;
}

function applyEmergencyRequestScope(query, user) {
  const organizationId = user?.organization_id;
  const hasResolvedHospitalScope = Array.isArray(user?.hospital_ids);

  if (
    ORGANIZATION_OPERATOR_ROLES.has(user?.role)
    && isValidUUID(organizationId)
    && hasResolvedHospitalScope
  ) {
    const hospitalIds = user.hospital_ids.filter(isValidUUID);

    if (hospitalIds.length === 0) {
      return query.eq('dispatch_organization_id', organizationId);
    }

    return query.or(
      `hospital_id.in.(${hospitalIds.join(',')}),dispatch_organization_id.eq.${organizationId}`
    );
  }

  return applyAuthFilter(query, user, EMERGENCY_AUTH_SCOPE);
}

async function getEmergencyPageExactCount(filter = {}, user, abortSignal) {
  return withRetry(async () => {
    throwIfQueryAborted(abortSignal);
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    query = applyEmergencyRequestScope(query, user);
    query = applyEmergencyListFilters(query, filter);
    query = applyEmergencyKpiFilter(query, filter.kpiFilter);
    query = applyQueryAbortSignal(query, abortSignal);

    const { count, error } = await query;
    throwIfQueryAborted(abortSignal);
    if (error) throw error;
    return count || 0;
  });
}

export async function getEmergencyRequestsPageStats(filter = {}, user, quiet = false, abortSignal) {
  try {
    throwIfQueryAborted(abortSignal);
    const scopedUser = user || await getCurrentUser();
    throwIfQueryAborted(abortSignal);
    const baseFilter = { ...filter, kpiFilter: undefined, status: undefined };

    const [
      total,
      pending,
      active,
      bed,
      ambulance,
      booking,
      inProgress,
      accepted,
      arrived,
      completed,
      cancelled,
      mine,
    ] = await Promise.all([
      getEmergencyPageExactCount(baseFilter, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'pending_approval' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, kpiFilter: 'active' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'bed' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'ambulance' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, service_type: 'booking' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'in_progress' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'accepted' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'arrived' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'completed' }, scopedUser, abortSignal),
      getEmergencyPageExactCount({ ...baseFilter, status: 'cancelled' }, scopedUser, abortSignal),
      scopedUser?.id
        ? getEmergencyPageExactCount({ ...baseFilter, responder_id: scopedUser.id }, scopedUser, abortSignal)
        : Promise.resolve(0),
    ]);

    return {
      total,
      active,
      pending,
      pending_approval: pending,
      bed,
      ambulance,
      booking,
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

async function getLatestPaymentMapForRequests(rows, abortSignal) {
  const requestIds = (rows || []).map((row) => row.id).filter(Boolean);
  if (requestIds.length === 0) return new Map();

  const data = await withRetry(async () => {
    throwIfQueryAborted(abortSignal);
    let query = supabase
      .from('payments')
      .select('id,emergency_request_id,payment_method,status,amount,currency,created_at')
      .in('emergency_request_id', requestIds)
      .order('created_at', { ascending: false });
    query = applyQueryAbortSignal(query, abortSignal);
    const result = await query;
    throwIfQueryAborted(abortSignal);

    if (result.error) throw result.error;
    return result.data || [];
  });
  return buildLatestPaymentMap(data);
}

export async function getEmergencyRequests(filter) {
  try {
    const user = await getCurrentUser();

    return await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');
      query = applyEmergencyRequestScope(query, user);
      query = applyEmergencyListFilters(query, filter);
      query = query.order('created_at', { ascending: false });

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

export async function getEmergencyRequestsPage(filter = {}) {
  try {
    const abortSignal = filter?.abortSignal;
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    if (filter.kpiFilter === 'mine') {
      filter = { ...filter, responder_id: user?.id, kpiFilter: undefined };
    }

    const statsFilter = filter.statsFilter || { ...filter, kpiFilter: undefined, responder_id: undefined };
    const countPromise = getEmergencyPageExactCount(filter, user, abortSignal);
    const statsPromise = getEmergencyRequestsPageStats(statsFilter, user, true, abortSignal);

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
    dataQuery = applyQueryAbortSignal(dataQuery, abortSignal);

    const [{ data, error }, count, stats] = await Promise.all([
      dataQuery,
      countPromise,
      statsPromise,
    ]);
    throwIfQueryAborted(abortSignal);
    if (error) throw error;

    const paymentByRequestId = await getLatestPaymentMapForRequests(data || [], abortSignal);
    throwIfQueryAborted(abortSignal);
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
