import { supabase } from '../../lib/supabase';
import { applyAuthFilter, getCurrentUser } from '../authService';
import {
  applyQueryAbortSignal,
  createQueryAbortContext,
  retryTransientRead,
  throwIfQueryAborted,
} from '../queryAbort';
import {
  TABLE_NAME,
  VISIT_RESOLUTION_ROW_LIMIT,
} from './constants';
import { enrichVisitsForPage } from './pageEnrichment';
import {
  applyResolvedVisitFilters,
  applyVisitPageFilters,
  getVisitPageStatsFromRows,
  sortVisitsForPage,
} from './pageProjection';

const applyVisitPageAuth = (query, user) => applyAuthFilter(query, user, {
  userIdField: 'user_id',
  orgIdField: 'hospital_id',
  providerIdField: 'doctor_name',
  resourceType: 'visit',
});

async function getVisitResolutionRows({ filters = {}, user, abortSignal }) {
  let resolutionQuery = supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact' })
    .range(0, VISIT_RESOLUTION_ROW_LIMIT - 1);

  resolutionQuery = applyVisitPageAuth(resolutionQuery, user);
  resolutionQuery = applyVisitPageFilters(resolutionQuery, filters);
  resolutionQuery = applyQueryAbortSignal(resolutionQuery, abortSignal);

  const { data, error, count } = await resolutionQuery;
  throwIfQueryAborted(abortSignal);
  if (error) throw error;

  const rows = data || [];
  if (Number.isFinite(count) && count > rows.length) {
    throw new Error(
      'Visit source projection is larger than the client resolver limit; backend visit status projection required.'
    );
  }

  return enrichVisitsForPage(rows, abortSignal);
}

export async function getVisitsPageData({
  filters = {},
  kpiFilter = 'all',
  range = { start: 0, end: 19 },
  sortConfig = { key: 'status', direction: 'desc' },
  quiet = false,
  abortSignal,
} = {}) {
  try {
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    const request = createQueryAbortContext({
      abortSignal,
      timeoutMs: 8000,
      timeoutMessage: 'Failed to resolve visit source rows - timeout',
    });

    try {
      // This is the only automatic retry owner for the manual Visits page fetch.
      const resolvedRows = await retryTransientRead(
        () => getVisitResolutionRows({ filters, user, abortSignal: request.signal }),
        { abortSignal: request.signal }
      );
      request.throwIfAborted();

      const statsRows = applyResolvedVisitFilters(resolvedRows, { ...filters, status: undefined }, 'all');
      const filteredRows = applyResolvedVisitFilters(resolvedRows, filters, kpiFilter);
      const sortedRows = sortVisitsForPage(filteredRows, sortConfig);
      const start = Math.max(Number(range.start) || 0, 0);
      const end = Math.max(Number(range.end) || start, start);
      const visits = sortedRows.slice(start, end + 1);
      const stats = getVisitPageStatsFromRows(statsRows);

      return {
        visits,
        count: filteredRows.length,
        stats,
      };
    } catch (error) {
      request.abort(error);
      request.throwIfAborted();
      throw error;
    } finally {
      request.cleanup();
    }
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching visits page data:', error);
    }
    throw error;
  }
}
