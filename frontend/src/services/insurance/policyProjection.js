import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import {
  applyInsurancePageFilters,
  applyInsurancePageScope,
  INSURANCE_SORT_FIELDS,
  withoutInsuranceFilterDimensions,
} from './policyFilters';
import { normalizeInsurancePolicy } from './policyNormalization';

const TABLE_NAME = 'insurance_policies';
const INSURANCE_PROJECTION_ERROR_MESSAGE = 'Insurance policies could not load. Try again.';
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
