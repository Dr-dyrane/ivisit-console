import { isValidUUID } from '../../lib/utils';
import {
  ACTIVE_AMBULANCE_STATUSES,
  AMBULANCE_PAGE_SORT_COLUMNS,
  VALID_AMBULANCE_STATUSES,
} from './constants';

function normalizeFilterList(value) {
  if (!value || value === 'all') return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => item !== 'all');
}

function sanitizeAmbulanceSearchTerm(value) {
  return String(value || '').replace(/[,%]/g, ' ').trim();
}

function normalizeAmbulanceStatusValues(value) {
  return normalizeFilterList(value)
    .flatMap((status) => {
      if (status === 'on_route') return ['en_route'];
      if (status === 'busy') return ACTIVE_AMBULANCE_STATUSES;
      return [status];
    })
    .filter((status, index, statuses) => (
      VALID_AMBULANCE_STATUSES.includes(status) && statuses.indexOf(status) === index
    ));
}

function applyAmbulancePageStatusFilter(query, statusValues) {
  if (statusValues.length === 1) {
    return query.eq('status', statusValues[0]);
  }
  if (statusValues.length > 1) {
    return query.in('status', statusValues);
  }
  return query;
}

export function applyAmbulancePageFilters(query, filters = {}, kpiFilter = 'all') {
  const search = sanitizeAmbulanceSearchTerm(filters.search);
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`call_sign.ilike.${pattern},vehicle_number.ilike.${pattern},license_plate.ilike.${pattern}`);
  }

  const statusValues = normalizeAmbulanceStatusValues(filters.status);
  query = applyAmbulancePageStatusFilter(query, statusValues);

  const kpiStatusValues = normalizeAmbulanceStatusValues(kpiFilter);
  query = applyAmbulancePageStatusFilter(query, kpiStatusValues);

  const typeValues = normalizeFilterList(filters.type);
  if (typeValues.length === 1) {
    query = query.eq('type', typeValues[0]);
  } else if (typeValues.length > 1) {
    query = query.in('type', typeValues);
  }

  if (filters.hospital && filters.hospital !== 'all' && isValidUUID(filters.hospital)) {
    query = query.eq('hospital_id', filters.hospital);
  }

  const dateRange = filters.dateRange || filters.created_at;

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }

  if (dateRange?.end) {
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endDate.toISOString());
  }

  return query;
}

export function applyAmbulancePageSort(query, sortConfig = {}) {
  const hasSortKey = AMBULANCE_PAGE_SORT_COLUMNS.has(sortConfig?.key);
  const sortKey = hasSortKey ? sortConfig.key : 'created_at';
  const ascending = hasSortKey ? sortConfig.direction === 'asc' : false;
  return query.order(sortKey, { ascending });
}
