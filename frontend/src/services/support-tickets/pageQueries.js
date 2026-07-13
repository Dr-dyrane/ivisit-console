import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { withRetry } from '../supabaseHelpers';
import { SUPPORT_TICKET_SORT_FIELDS, TABLE_NAME } from './constants';
import { normalizeSupportTicketRow } from './normalization';
import { applySupportTicketFilters, applySupportTicketScope } from './queryFilters';

async function getSupportTicketExactCount(filter = {}, quiet = false, scopedUser, abortSignal) {
  try {
    throwIfQueryAborted(abortSignal);
    const user = scopedUser || await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    const { count, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
      query = applySupportTicketScope(query, user);
      query = applySupportTicketFilters(query, filter);
      query = applyQueryAbortSignal(query, abortSignal);
      const result = await query;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching support ticket exact count:', error);
    }
    throw error;
  }
}

export async function getSupportTicketsPageStats(filter = {}, quiet = false, user, abortSignal) {
  const [total, open, inProgress, resolved, closed, urgent] = await Promise.all([
    getSupportTicketExactCount(filter, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'open' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'in_progress' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'resolved' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'closed' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, priority: 'urgent' }, quiet, user, abortSignal),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    urgent,
    active: open + inProgress,
    exactCounts: true,
  };
}

export async function getSupportTicketsPage(filter = {}) {
  try {
    const abortSignal = filter?.abortSignal;
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);
    const statsFilter = filter.statsFilter || {};

    const countPromise = getSupportTicketExactCount(filter, true, user, abortSignal);
    const statsPromise = getSupportTicketsPageStats(statsFilter, true, user, abortSignal);

    const sortKey = SUPPORT_TICKET_SORT_FIELDS.has(filter.sortKey)
      ? filter.sortKey
      : 'created_at';
    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;

    const dataPromise = withRetry(async () => {
      let dataQuery = supabase.from(TABLE_NAME).select('*');
      dataQuery = applySupportTicketScope(dataQuery, user);
      dataQuery = applySupportTicketFilters(dataQuery, filter);
      dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });
      if (Number.isFinite(limit) && limit > 0) {
        dataQuery = dataQuery.range(offset, offset + limit - 1);
      }
      dataQuery = applyQueryAbortSignal(dataQuery, abortSignal);
      const result = await dataQuery;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });

    const [{ count }, { data, error }, stats] = await Promise.all([
      countPromise.then((value) => ({ count: value })),
      dataPromise,
      statsPromise,
    ]);
    throwIfQueryAborted(abortSignal);

    if (error) throw error;

    return {
      data: (data || []).map(normalizeSupportTicketRow),
      count: count || 0,
      stats,
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching support tickets page:', error);
    }
    throw error;
  }
}
