import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import {
  applyInsuranceBillingFilters,
  applyInsuranceBillingScope,
  INSURANCE_BILLING_SORT_FIELDS,
} from './billingFilters';
import { normalizeInsuranceBillingOutcome } from './billingNormalization';

const BILLING_TABLE_NAME = 'insurance_billing';
const INSURANCE_BILLING_PROJECTION_ERROR_MESSAGE = 'Insurance billing outcomes could not load. Try again.';
const EMPTY_INSURANCE_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
  exactCounts: true,
  scope: 'admin_billing_outcome_projection',
};

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
