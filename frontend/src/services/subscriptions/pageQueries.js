import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import {
  EMPTY_SUBSCRIPTION_STATS,
  SUBSCRIPTION_PROJECTION_ERROR_MESSAGE,
  TABLE_NAME,
  TERMINAL_SUBSCRIBER_STATUSES,
  UNAVAILABLE_SUBSCRIPTION_STATS,
} from './constants';
import {
  applySubscriberBaseFilters,
  applySubscriberKpiFilter,
  withoutSubscriberFilterDimensions,
} from './queryFilters';

const exactSubscriberCount = async (filter, applyBucket = (query) => query) => {
  let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
  query = applySubscriberBaseFilters(query, filter);
  query = applyBucket(query);
  const { count, error } = await query;
  if (error) throw error;
  if (count === null || count === undefined || !Number.isFinite(Number(count))) {
    throw new Error('Subscriber count is unavailable.');
  }
  return Number(count);
};

export async function getSubscriptionsPage(filter = {}) {
  const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
  const offset = Math.max(Number(filter.offset) || 0, 0);
  const sortKey = ['created_at', 'subscription_date'].includes(filter.sortKey)
    ? filter.sortKey
    : 'created_at';
  const ascending = filter.sortDirection === 'asc';

  try {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') {
      return {
        data: [],
        count: 0,
        denied: true,
        failed: false,
        reason: 'admin_only',
        stats: {
          ...EMPTY_SUBSCRIPTION_STATS,
          exactCounts: false,
          available: false,
          reason: 'admin_only',
        },
      };
    }

    let rowsQuery = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    rowsQuery = applySubscriberBaseFilters(rowsQuery, filter);
    rowsQuery = applySubscriberKpiFilter(rowsQuery, filter.kpiFilter);
    rowsQuery = rowsQuery
      .order(sortKey, { ascending, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // KPI counts navigate independent status and type dimensions while retaining
    // the shared search, date, and welcome-email scope.
    const kpiAgnosticFilter = withoutSubscriberFilterDimensions(filter);
    const totalStatsFilter = withoutSubscriberFilterDimensions(filter, ['status', 'type']);
    const statusStatsFilter = withoutSubscriberFilterDimensions(filter, ['status']);
    const typeStatsFilter = withoutSubscriberFilterDimensions(filter, ['type']);

    const statsPromise = Promise.all([
      exactSubscriberCount(totalStatsFilter),
      exactSubscriberCount(statusStatsFilter, (query) => query.eq('status', 'active')),
      exactSubscriberCount(
        statusStatsFilter,
        (query) => query
          .not('status', 'eq', 'active')
          .not('status', 'in', `(${TERMINAL_SUBSCRIBER_STATUSES.join(',')})`)
      ),
      exactSubscriberCount(
        statusStatsFilter,
        (query) => query.in('status', TERMINAL_SUBSCRIBER_STATUSES)
      ),
      exactSubscriberCount(typeStatsFilter, (query) => query.eq('type', 'paid')),
      exactSubscriberCount(typeStatsFilter, (query) => query.eq('type', 'free')),
      exactSubscriberCount(kpiAgnosticFilter, (query) => query.eq('new_user', true)),
      exactSubscriberCount(kpiAgnosticFilter, (query) => query.eq('welcome_email_sent', true)),
    ]).then(([total, active, pending, unsubscribed, paid, free, newUsers, welcomeSent]) => ({
      total,
      active,
      pending,
      unsubscribed,
      paid,
      free,
      newUsers,
      welcomeSent,
      exactCounts: true,
      available: true,
      scope: 'admin_subscriber_projection',
    })).catch(() => UNAVAILABLE_SUBSCRIPTION_STATS);

    const [rowsResult, stats] = await Promise.all([rowsQuery, statsPromise]);
    if (rowsResult.error) throw rowsResult.error;
    if (
      rowsResult.count === null
      || rowsResult.count === undefined
      || !Number.isFinite(Number(rowsResult.count))
    ) {
      throw new Error('Subscriber page count is unavailable.');
    }

    return {
      data: rowsResult.data || [],
      count: Number(rowsResult.count),
      denied: false,
      failed: false,
      reason: null,
      stats,
    };
  } catch (error) {
    if (!filter.quiet) console.error('Subscriber page query error:', error);
    return {
      data: [],
      count: 0,
      denied: false,
      failed: true,
      reason: 'query_failed',
      errorMessage: SUBSCRIPTION_PROJECTION_ERROR_MESSAGE,
      stats: {
        ...EMPTY_SUBSCRIPTION_STATS,
        exactCounts: false,
        available: false,
        reason: 'query_failed',
      },
    };
  }
}
