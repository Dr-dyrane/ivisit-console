import { supabase } from '../../lib/supabase';
import { withRetry } from '../supabaseHelpers';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { TABLE_NAME } from './constants';
import { applyHospitalFilters } from './filters';
import {
  attachHospitalOrganizationNames,
  resolveHospitalOrganizationNames,
} from './organizationNames';
import { getHospitals } from './queries';
import { getHospitalVisibleStats } from './stats';

async function getHospitalExactCount(filters = {}, quiet = false, abortSignal) {
  try {
    throwIfQueryAborted(abortSignal);
    const { error, count } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
      query = applyHospitalFilters(query, filters);
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
      console.error('Error fetching hospital exact count:', error);
    }
    throw error;
  }
}

export async function getHospitalPageStats(filters = {}, quiet = false, abortSignal) {
  const [total, available, full, busy, verified] = await Promise.all([
    getHospitalExactCount(filters, quiet, abortSignal),
    getHospitalExactCount({ ...filters, status: 'available' }, quiet, abortSignal),
    getHospitalExactCount({ ...filters, status: 'full' }, quiet, abortSignal),
    getHospitalExactCount({ ...filters, status: 'busy' }, quiet, abortSignal),
    getHospitalExactCount({ ...filters, verified: true }, quiet, abortSignal),
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

/**
 * Route-owned Hospitals projection: bounded rows, exact counts, and visible
 * capacity/fleet values share one service boundary.
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
    abortSignal,
  } = options;

  try {
    throwIfQueryAborted(abortSignal);
    const [pageResult, stats] = await Promise.all([
      getHospitals({
        ...filters,
        limit,
        offset,
        sortKey,
        sortDirection,
        count: true,
        quiet,
        abortSignal,
      }),
      getHospitalPageStats(statsFilters, quiet, abortSignal),
    ]);
    throwIfQueryAborted(abortSignal);

    const pageRows = pageResult?.data || [];
    const visibleStats = getHospitalVisibleStats(pageRows);

    // ADOPT-60: enrichment is non-fatal; a failed organizations read returns an
    // empty map and every organization_name stays honestly null.
    const organizationNames = await resolveHospitalOrganizationNames(pageRows, abortSignal, quiet);
    throwIfQueryAborted(abortSignal);
    const enrichedRows = attachHospitalOrganizationNames(pageRows, organizationNames);

    return {
      data: enrichedRows,
      count: pageResult?.count || 0,
      stats: {
        ...stats,
        visibleBeds: visibleStats.totalBeds,
        visibleAmbulances: visibleStats.totalAmbulances,
      },
      recent: enrichedRows.slice(0, 5),
    };
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching hospitals page data:', error);
    }
    throw error;
  }
}
