/**
 * Insurance Service
 * Handles all Supabase queries for insurance_policies table
 * Insurance policy management and verification
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

const TABLE_NAME = 'insurance_policies';
const BILLING_TABLE_NAME = 'insurance_billing';
const INSURANCE_PROJECTION_ERROR_MESSAGE = 'Insurance policies could not load. Try again.';
const INSURANCE_BILLING_PROJECTION_ERROR_MESSAGE = 'Insurance billing outcomes could not load. Try again.';
const INSURANCE_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'provider_name',
  'policy_number',
  'status',
  'verified',
  'plan_type',
  'expires_at',
]);
const INSURANCE_BILLING_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'billing_date',
  'paid_date',
  'status',
  'claim_number',
  'total_amount',
  'insurance_amount',
  'user_amount',
]);

const EMPTY_INSURANCE_STATS = {
  total: 0,
  active: 0,
  pending: 0,
  expired: 0,
  unverified: 0,
  verified: 0,
  expiringSoon: 0,
  exactCounts: true,
  scope: 'admin_policy_projection',
};

const EMPTY_INSURANCE_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
  exactCounts: true,
  scope: 'admin_billing_outcome_projection',
};

const throwLegacyInsuranceReadUnavailable = () => {
  throw new Error('Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.');
};

const buildInsuranceFailedPage = () => ({
  data: [],
  count: 0,
  stats: {
    ...EMPTY_INSURANCE_STATS,
    failed: true,
    reason: 'query_failed',
  },
  denied: false,
  reason: 'query_failed',
  failed: true,
  errorMessage: INSURANCE_PROJECTION_ERROR_MESSAGE,
  exactCounts: false,
  scope: 'admin_policy_projection',
});

const buildInsuranceBillingFailedPage = () => ({
  data: [],
  count: 0,
  stats: {
    ...EMPTY_INSURANCE_BILLING_STATS,
    failed: true,
    reason: 'query_failed',
  },
  denied: false,
  reason: 'query_failed',
  failed: true,
  errorMessage: INSURANCE_BILLING_PROJECTION_ERROR_MESSAGE,
  exactCounts: false,
  scope: 'admin_billing_outcome_projection',
});

const sanitizeSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

function normalizeFilterList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  return text && text !== 'all' ? [text] : [];
}

function withoutInsuranceFilterDimensions(filter = {}, dimensions = []) {
  const next = { ...filter };
  delete next.kpiFilter;
  dimensions.forEach((dimension) => {
    delete next[dimension];
  });
  return next;
}

function parseCoverageDetails(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return { ...value };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function parseLinkedPaymentSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

const normalizeInsurancePolicyStatus = (value) => (
  String(value || '').trim().toLowerCase() || 'unknown'
);

export function normalizeInsurancePolicy(record) {
  if (!record) return record;
  const details = parseCoverageDetails(record.coverage_details);
  const linkedPaymentSnapshot =
    parseLinkedPaymentSnapshot(details.linked_payment_method_snapshot) ||
    parseLinkedPaymentSnapshot(record.linked_payment_method);

  return {
    ...record,
    status: normalizeInsurancePolicyStatus(record.status),
    coverage_type: record.plan_type || details.coverage_type || '',
    policy_type: record.plan_type || details.coverage_type || '',
    start_date: record.starts_at || '',
    end_date: record.expires_at || '',
    policy_holder_name: details.policy_holder_name || '',
    group_number: details.group_number || '',
    front_image_url: details.front_image_url || '',
    back_image_url: details.back_image_url || '',
    linked_payment_method: linkedPaymentSnapshot || record.linked_payment_method || null,
    coverage_amount: details.coverage_amount ?? record.coverage_amount ?? null,
    coverage_percentage:
      record.coverage_percentage !== null && record.coverage_percentage !== undefined
        ? Number(record.coverage_percentage)
        : null,
  };
}

function applyInsurancePageScope(query, user) {
  if (!user?.id || user.role !== 'admin') {
    return {
      query,
      denied: true,
      reason: !user?.id ? 'not_authenticated' : 'admin_only',
    };
  }

  return {
    query,
    denied: false,
    reason: null,
  };
}

function applyInsuranceBillingScope(query, user) {
  if (!user?.id || user.role !== 'admin') {
    return {
      query,
      denied: true,
      reason: !user?.id ? 'not_authenticated' : 'admin_only',
    };
  }

  return {
    query,
    denied: false,
    reason: null,
  };
}

function applyInsurancePageFilters(query, filter = {}) {
  const kpiFilter = String(filter.kpiFilter || 'all');
  if (['active', 'pending', 'expired'].includes(kpiFilter)) {
    query = query.eq('status', kpiFilter);
  }
  if (kpiFilter === 'unverified') {
    query = query.eq('verified', false);
  }

  const statusValues = normalizeFilterList(filter.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  const typeValues = normalizeFilterList(filter.type || filter.policy_type || filter.plan_type);
  if (typeValues.length === 1) {
    const planType = sanitizeSearchTerm(typeValues[0]);
    if (planType) query = query.ilike('plan_type', planType);
  } else if (typeValues.length > 1) {
    query = query.in('plan_type', typeValues);
  }

  if (filter.provider_name) {
    query = query.eq('provider_name', filter.provider_name);
  }

  if (filter.expiresBefore) {
    query = query.lte('expires_at', filter.expiresBefore);
  }
  if (filter.expiresAfter) {
    query = query.gte('expires_at', filter.expiresAfter);
  }

  if (filter.verified === 'verified' || filter.verified === true) {
    query = query.eq('verified', true);
  } else if (filter.verified === 'unverified' || filter.verified === false) {
    query = query.eq('verified', false);
  }

  const dateRange = filter.created_at;
  if (dateRange?.start) {
    query = query.gte('created_at', new Date(`${dateRange.start}T00:00:00`).toISOString());
  }
  if (dateRange?.end) {
    query = query.lte('created_at', new Date(`${dateRange.end}T23:59:59`).toISOString());
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(
      `policy_number.ilike.%${search}%,provider_name.ilike.%${search}%,plan_type.ilike.%${search}%`
    );
  }

  return query;
}

function normalizeInsuranceBillingStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['pending', 'approved', 'paid', 'rejected'].includes(status) ? status : '';
}

function applyInsuranceBillingFilters(query, filter = {}) {
  const status = normalizeInsuranceBillingStatus(filter.status);
  if (status) {
    query = query.eq('status', status);
  }

  if (filter.policyId) {
    query = query.eq('insurance_policy_id', filter.policyId);
  }
  if (Array.isArray(filter.policyIds) && filter.policyIds.length > 0) {
    query = query.in('insurance_policy_id', filter.policyIds);
  }
  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.hospitalId) {
    query = query.eq('hospital_id', filter.hospitalId);
  }
  if (filter.emergencyRequestId) {
    query = query.eq('emergency_request_id', filter.emergencyRequestId);
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(`claim_number.ilike.%${search}%`);
  }

  return query;
}

function toCurrencyNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeInsuranceBillingOutcome(record) {
  if (!record) return record;

  return {
    ...record,
    status: normalizeInsuranceBillingStatus(record.status) || 'pending',
    claim_number: record.claim_number || '',
    total_amount: toCurrencyNumber(record.total_amount),
    insurance_amount: toCurrencyNumber(record.insurance_amount),
    user_amount: toCurrencyNumber(record.user_amount),
    coverage_percentage:
      record.coverage_percentage === null || record.coverage_percentage === undefined
        ? null
        : Number(record.coverage_percentage),
    billing_date: record.billing_date || '',
    paid_date: record.paid_date || '',
  };
}

async function getInsuranceExactCount(filter = {}, user, quiet = false) {
  try {
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    const scope = applyInsurancePageScope(query, user);
    if (scope.denied) return 0;
    query = applyInsurancePageFilters(scope.query, filter);

    const { count, error } = await query;
    if (error) throw error;
    if (count === null || count === undefined || !Number.isFinite(Number(count))) {
      throw new Error('Insurance policy count is unavailable.');
    }
    return Number(count);
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching insurance exact count:', error);
    }
    throw error;
  }
}

async function getInsuranceExpiringSoonCount(filter = {}, user, quiet = false) {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return getInsuranceExactCount(
    {
      ...filter,
      status: 'active',
      expiresAfter: now.toISOString(),
      expiresBefore: thirtyDaysFromNow.toISOString(),
    },
    user,
    quiet
  );
}

export async function getInsurancePageStats(filter = {}, user, quiet = false) {
  if (!user?.id || user.role !== 'admin') {
    return {
      ...EMPTY_INSURANCE_STATS,
      denied: true,
      reason: !user?.id ? 'not_authenticated' : 'admin_only',
    };
  }

  const totalStatsFilter = withoutInsuranceFilterDimensions(filter, ['status', 'verified']);
  const statusStatsFilter = withoutInsuranceFilterDimensions(filter, ['status']);
  const verificationStatsFilter = withoutInsuranceFilterDimensions(filter, ['verified']);

  const [total, active, pending, expired, verified, unverified, expiringSoon] = await Promise.all([
    getInsuranceExactCount(totalStatsFilter, user, quiet),
    getInsuranceExactCount({ ...statusStatsFilter, status: 'active' }, user, quiet),
    getInsuranceExactCount({ ...statusStatsFilter, status: 'pending' }, user, quiet),
    getInsuranceExactCount({ ...statusStatsFilter, status: 'expired' }, user, quiet),
    getInsuranceExactCount({ ...verificationStatsFilter, verified: 'verified' }, user, quiet),
    getInsuranceExactCount({ ...verificationStatsFilter, verified: 'unverified' }, user, quiet),
    getInsuranceExpiringSoonCount(statusStatsFilter, user, quiet),
  ]);

  return {
    ...EMPTY_INSURANCE_STATS,
    total,
    active,
    pending,
    expired,
    verified,
    unverified,
    expiringSoon,
  };
}

/**
 * Get the Insurance page projection with route-owned paging and exact counts.
 * Current Console policy management remains blocked; this is read projection only.
 */
export async function getInsurancePage(filter = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || user.role !== 'admin') {
      const reason = !user?.id ? 'not_authenticated' : 'admin_only';
      return {
        data: [],
        count: 0,
        stats: {
          ...EMPTY_INSURANCE_STATS,
          denied: true,
          reason,
        },
        denied: true,
        reason,
        failed: false,
        exactCounts: true,
        scope: 'admin_policy_projection',
      };
    }

    const statsFilter = filter.statsFilter || { ...filter, kpiFilter: 'all' };
    const countPromise = getInsuranceExactCount(filter, user, true);
    const statsPromise = getInsurancePageStats(statsFilter, user, true);

    let dataQuery = supabase.from(TABLE_NAME).select('*');
    const scope = applyInsurancePageScope(dataQuery, user);
    if (scope.denied) {
      return {
        data: [],
        count: 0,
        stats: {
          ...EMPTY_INSURANCE_STATS,
          denied: true,
          reason: scope.reason,
        },
        denied: true,
        reason: scope.reason,
        failed: false,
        exactCounts: true,
        scope: 'admin_policy_projection',
      };
    }

    dataQuery = applyInsurancePageFilters(scope.query, filter);
    const sortKey = INSURANCE_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      dataQuery = dataQuery.range(offset, offset + limit - 1);
    }

    const [{ count }, { data, error }, stats] = await Promise.all([
      countPromise.then((value) => ({ count: value })),
      dataQuery,
      statsPromise,
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(normalizeInsurancePolicy),
      count: count || 0,
      stats,
      denied: false,
      reason: null,
      failed: false,
      exactCounts: true,
      scope: 'admin_policy_projection',
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching insurance page:', error);
    }
    return buildInsuranceFailedPage(error);
  }
}

async function getInsuranceBillingExactCount(filter = {}, user, quiet = false) {
  try {
    let query = supabase.from(BILLING_TABLE_NAME).select('id', { count: 'exact', head: true });
    const scope = applyInsuranceBillingScope(query, user);
    if (scope.denied) return 0;
    query = applyInsuranceBillingFilters(scope.query, filter);

    const { count, error } = await query;
    if (error) throw error;
    if (count === null || count === undefined || !Number.isFinite(Number(count))) {
      throw new Error('Insurance billing count is unavailable.');
    }
    return Number(count);
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching insurance billing exact count:', error);
    }
    throw error;
  }
}

export async function getInsuranceBillingOutcomeStats(filter = {}, user, quiet = false) {
  if (!user?.id || user.role !== 'admin') {
    return {
      ...EMPTY_INSURANCE_BILLING_STATS,
      denied: true,
      reason: !user?.id ? 'not_authenticated' : 'admin_only',
    };
  }

  const statusStatsFilter = { ...filter };
  delete statusStatsFilter.status;

  const [total, pending, approved, paid, rejected] = await Promise.all([
    getInsuranceBillingExactCount(statusStatsFilter, user, quiet),
    getInsuranceBillingExactCount({ ...statusStatsFilter, status: 'pending' }, user, quiet),
    getInsuranceBillingExactCount({ ...statusStatsFilter, status: 'approved' }, user, quiet),
    getInsuranceBillingExactCount({ ...statusStatsFilter, status: 'paid' }, user, quiet),
    getInsuranceBillingExactCount({ ...statusStatsFilter, status: 'rejected' }, user, quiet),
  ]);

  return {
    ...EMPTY_INSURANCE_BILLING_STATS,
    total,
    pending,
    approved,
    paid,
    rejected,
  };
}

/**
 * Read-only projection for trigger-created insurance billing outcomes.
 * This observes claim/billing truth; it does not create, settle, or repair billing rows.
 */
export async function getInsuranceBillingOutcomes(filter = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || user.role !== 'admin') {
      const reason = !user?.id ? 'not_authenticated' : 'admin_only';
      return {
        data: [],
        count: 0,
        stats: {
          ...EMPTY_INSURANCE_BILLING_STATS,
          denied: true,
          reason,
        },
        denied: true,
        reason,
        failed: false,
        exactCounts: true,
        scope: 'admin_billing_outcome_projection',
      };
    }

    const statsFilter = filter.statsFilter || filter;
    const countPromise = getInsuranceBillingExactCount(filter, user, true);
    const statsPromise = getInsuranceBillingOutcomeStats(statsFilter, user, true);

    let dataQuery = supabase.from(BILLING_TABLE_NAME).select('*');
    const scope = applyInsuranceBillingScope(dataQuery, user);
    if (scope.denied) {
      return {
        data: [],
        count: 0,
        stats: {
          ...EMPTY_INSURANCE_BILLING_STATS,
          denied: true,
          reason: scope.reason,
        },
        denied: true,
        reason: scope.reason,
        failed: false,
        exactCounts: true,
        scope: 'admin_billing_outcome_projection',
      };
    }

    dataQuery = applyInsuranceBillingFilters(scope.query, filter);
    const sortKey = INSURANCE_BILLING_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      dataQuery = dataQuery.range(offset, offset + limit - 1);
    }

    const [{ count }, { data, error }, stats] = await Promise.all([
      countPromise.then((value) => ({ count: value })),
      dataQuery,
      statsPromise,
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(normalizeInsuranceBillingOutcome),
      count: count || 0,
      stats,
      denied: false,
      reason: null,
      failed: false,
      exactCounts: true,
      scope: 'admin_billing_outcome_projection',
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching insurance billing outcomes:', error);
    }
    return buildInsuranceBillingFailedPage(error);
  }
}

export function buildInsuranceWritePayload(
  _input = {},
  _options = {}
) {
  throw new Error('Insurance write payload construction is unavailable until admin policy authority is verified.');
}

/**
 * Compatibility export. Reads are owned by getInsurancePage().
 */
export async function getInsurancePolicies() {
  return throwLegacyInsuranceReadUnavailable();
}

/**
 * Compatibility export. Reads are owned by getInsurancePage().
 */
export async function getInsurancePolicy() {
  return throwLegacyInsuranceReadUnavailable();
}

/**
 * Create new insurance policy
 */
export async function createInsurancePolicy() {
  throw new Error('Insurance policy create is unavailable until admin policy authority is verified.');
}

/**
 * Update insurance policy
 */
export async function updateInsurancePolicy() {
  throw new Error('Insurance policy update is unavailable until admin policy authority is verified.');
}

/**
 * Delete insurance policy
 */
export async function deleteInsurancePolicy() {
  throw new Error('Insurance policy delete is unavailable until admin policy authority is verified.');
}

/**
 * Update policy status
 */
export async function updatePolicyStatus() {
  throw new Error('Insurance policy status update is unavailable until admin policy authority is verified.');
}

/**
 * Verify insurance policy
 */
export async function verifyInsurancePolicy() {
  throw new Error('Insurance policy verification is unavailable until admin policy authority is verified.');
}

/**
 * Get insurance analytics
 */
export async function getInsuranceAnalytics() {
  throw new Error('Insurance analytics export is unavailable until route-wide distribution scope is verified.');
}

/**
 * Subscribe to insurance policy changes
 */
export function subscribeToInsurancePolicies(callback, channelName = 'insurance_policies_changes') {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to trigger-created insurance billing outcome changes.
 */
export function subscribeToInsuranceBillingOutcomes(callback, channelName = 'insurance_billing_changes') {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: BILLING_TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Insurance card uploads are disabled until Console/App storage ownership is proved.
 */
export async function uploadInsuranceCardImage() {
  throw new Error('Insurance card upload is unavailable until private storage ownership is verified.');
}
