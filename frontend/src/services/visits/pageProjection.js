import {
  canonicalizeVisitStatus,
  countVisitsByResolvedStatus,
  getVisitStateFromKpi,
  visitMatchesResolvedState,
} from '../../utils/visitStatus';
import { getVisitPatientLabel } from '../../utils/visitRowProjection';

export const sanitizeVisitSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[,%]/g, ' ')
  .replace(/\s+/g, ' ')
  .slice(0, 80);

export const applyVisitPageFilters = (query, filters = {}) => {
  let nextQuery = query;
  const search = sanitizeVisitSearchTerm(filters.search);

  if (filters.visit_type && filters.visit_type.length > 0) {
    nextQuery = nextQuery.in('type', filters.visit_type);
  }

  if (filters.date) {
    if (filters.date.start) nextQuery = nextQuery.gte('date', filters.date.start);
    if (filters.date.end) nextQuery = nextQuery.lte('date', filters.date.end);
  }

  if (search) {
    const pattern = `%${search}%`;
    nextQuery = nextQuery.or([
      `display_id.ilike.${pattern}`,
      `type.ilike.${pattern}`,
      `status.ilike.${pattern}`,
      `notes.ilike.${pattern}`,
      `hospital_name.ilike.${pattern}`,
      `doctor_name.ilike.${pattern}`,
      `room_number.ilike.${pattern}`,
      `cost.ilike.${pattern}`,
    ].join(','));
  }

  return nextQuery;
};

const getResolvedStatusFilters = (filters = {}) => (
  Array.isArray(filters.status)
    ? filters.status.map((status) => canonicalizeVisitStatus(status, null)).filter(Boolean)
    : filters.status
      ? [canonicalizeVisitStatus(filters.status, null)].filter(Boolean)
      : []
);

export const applyResolvedVisitFilters = (visits = [], filters = {}, kpiFilter = 'all') => {
  const statusFilters = getResolvedStatusFilters(filters);
  const kpiState = getVisitStateFromKpi(kpiFilter);

  return (visits || []).filter((visit) => {
    if (statusFilters.length > 0 && !statusFilters.some((status) => visitMatchesResolvedState(visit, status))) {
      return false;
    }
    if (kpiState && !visitMatchesResolvedState(visit, kpiState)) {
      return false;
    }
    return true;
  });
};

const getVisitDateValue = (visit) => String(
  visit?.date || visit?.visit_date || visit?.created_at || ''
);

export function getVisitPageStatsFromRows(visits = []) {
  const today = new Date();
  const todayStart = today.toISOString().split('T')[0];
  const counts = countVisitsByResolvedStatus(visits);

  return {
    ...counts,
    today: (visits || []).filter((visit) => getVisitDateValue(visit).startsWith(todayStart)).length,
  };
}

// Only timestamp fields may use Date.parse; arbitrary labels compare as text.
const VISIT_DATE_SORT_KEYS = new Set(['date', 'visit_date', 'created_at', 'updated_at']);

const mapVisitSortKey = (key) => {
  if (key === 'visit_type') return 'type';
  if (key === 'doctor') return 'doctor_name';
  return key || 'date';
};

const parseVisitCostValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  const numeric = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const compareVisitValue = (left, right, { isDateKey = false, isCostKey = false } = {}) => {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return -1;
  if (right === null || right === undefined || right === '') return 1;

  if (isCostKey) {
    const leftCost = parseVisitCostValue(left);
    const rightCost = parseVisitCostValue(right);
    if (leftCost !== null && rightCost !== null && leftCost !== rightCost) {
      return leftCost - rightCost;
    }
  }

  if (isDateKey) {
    const leftDate = Date.parse(left);
    const rightDate = Date.parse(right);
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
      return leftDate - rightDate;
    }
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

// Patient and hospital sorts use the same enriched labels rendered by the UI.
const getVisitSortValue = (visit, sortKey, rawKey) => {
  if (sortKey === 'user_id') {
    return getVisitPatientLabel(visit);
  }
  if (sortKey === 'hospital_id') {
    return visit?.hospital_name ?? null;
  }
  return visit?.[sortKey] ?? visit?.[rawKey];
};

export const sortVisitsForPage = (
  visits = [],
  sortConfig = { key: 'status', direction: 'desc' }
) => {
  const rawKey = sortConfig.key || 'date';
  const sortKey = mapVisitSortKey(rawKey);
  const direction = sortConfig.direction === 'asc' ? 1 : -1;
  const compareOptions = {
    isDateKey: VISIT_DATE_SORT_KEYS.has(sortKey),
    isCostKey: sortKey === 'cost',
  };

  return [...(visits || [])].sort((left, right) => {
    const leftValue = getVisitSortValue(left, sortKey, rawKey);
    const rightValue = getVisitSortValue(right, sortKey, rawKey);
    return compareVisitValue(leftValue, rightValue, compareOptions) * direction;
  });
};
