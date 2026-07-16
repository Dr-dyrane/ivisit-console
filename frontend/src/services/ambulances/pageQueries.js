import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { getCurrentUser } from '../authService';
import {
  applyQueryAbortSignal,
  createQueryAbortContext,
  throwIfQueryAborted,
} from '../queryAbort';
import { ACTIVE_AMBULANCE_STATUSES, TABLE_NAME } from './constants';
import { applyAmbulancePageFilters, applyAmbulancePageSort } from './filters';
import { applyAmbulancePageAuth } from './scope';

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

  // ADOPT-38 (read-only): returning/offline/pending_approval are in the DB
  // status CHECK domain and VALID_AMBULANCE_STATUSES but had no exact counts,
  // so their KPI chips could not render honest fleet-wide numbers. Same
  // head-count read as the existing states; no write path is touched.
  const [
    total,
    available,
    onRoute,
    busy,
    maintenance,
    returning,
    offline,
    pendingApproval,
  ] = await Promise.all([
    readAmbulanceCount(createCountQuery(filters.status)),
    readAmbulanceCount(createCountQuery('available')),
    readAmbulanceCount(createCountQuery('en_route')),
    readAmbulanceCount(createCountQuery(ACTIVE_AMBULANCE_STATUSES)),
    readAmbulanceCount(createCountQuery('maintenance')),
    readAmbulanceCount(createCountQuery('returning')),
    readAmbulanceCount(createCountQuery('offline')),
    readAmbulanceCount(createCountQuery('pending_approval')),
  ]);

  return {
    total,
    available,
    onRoute,
    busy,
    maintenance,
    returning,
    offline,
    pendingApproval,
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
