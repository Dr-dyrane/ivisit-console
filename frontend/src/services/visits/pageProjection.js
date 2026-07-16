import {
  canonicalizeVisitStatus,
  countVisitsByResolvedStatus,
  getVisitStateFromKpi,
  visitMatchesResolvedState,
} from '../../utils/visitStatus';
import { getVisitPatientLabel } from '../../utils/visitRowProjection';

// Generic history reads deliberately omit clinical/consult content. Scheduled
// care is projected through scheduledQueries.js and is excluded below.
export const GENERIC_VISIT_SELECT = `
  id,
  display_id,
  request_id,
  user_id,
  doctor_id,
  hospital_id,
  type,
  status,
  date,
  time,
  room_number,
  cost,
  estimated_duration,
  insurance_covered,
  preparation,
  hospital_name,
  doctor_name,
  created_at,
  updated_at
`;

export const GENERIC_VISIT_WITH_PATIENT_SELECT = `
  ${GENERIC_VISIT_SELECT},
  patient:profiles!visits_user_id_fkey (
    id,
    username,
    email,
    full_name,
    phone,
    avatar_url
  )
`;

// Any request-independent row with an admitted scheduled care mode stays out of
// generic history, even when malformed and missing its scheduled start.
export const GENERIC_VISIT_SOURCE_FILTER = [
  'request_id.not.is.null',
  'care_mode.is.null',
  'care_mode.not.in.(in_person,telemedicine_async)',
].join(',');

export const applyGenericVisitSourceScope = (query) => (
  query.or(GENERIC_VISIT_SOURCE_FILTER)
);

const normalizeQueryScopeValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(normalizeQueryScopeValue)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = normalizeQueryScopeValue(value[key]);
      return result;
    }, {});
  }
  return value;
};

export const getVisitQueryScopeKey = ({
  filters = {},
  kpiFilter = 'all',
  sortConfig = {},
  viewMode = 'all',
} = {}) => JSON.stringify(normalizeQueryScopeValue({
  filters,
  kpiFilter: kpiFilter || 'all',
  sortConfig,
  viewMode,
}));

export const createMobileVisitAccumulator = () => ({
  pages: new Map(),
  sequence: 0,
  signature: null,
});

export const mergeMobileVisitPageSnapshot = (store, {
  pageStart = 0,
  scopeKey,
  totalCount,
  visits = [],
} = {}) => {
  if (!store || !(store.pages instanceof Map)) return [];
  if (store.signature !== scopeKey) {
    store.pages = new Map();
    store.sequence = 0;
    store.signature = scopeKey;
  }

  const start = Number.isFinite(Number(pageStart)) ? Math.max(Number(pageStart), 0) : 0;
  const rows = (Array.isArray(visits) ? visits : []).filter((row) => (
    row?.id !== null && row?.id !== undefined
  ));
  store.sequence += 1;
  store.pages.set(start, { rows, sequence: store.sequence });

  const boundedCount = Number(totalCount);
  if (Number.isFinite(boundedCount) && boundedCount >= 0) {
    [...store.pages.keys()].forEach((key) => {
      if (key >= boundedCount) store.pages.delete(key);
    });
  }

  const pages = [...store.pages.entries()].sort(([left], [right]) => left - right);
  const latestRows = new Map();
  [...pages]
    .sort(([, left], [, right]) => left.sequence - right.sequence)
    .forEach(([, page]) => page.rows.forEach((row) => latestRows.set(row.id, row)));

  const seen = new Set();
  const accumulated = [];
  pages.forEach(([, page]) => {
    page.rows.forEach((row) => {
      if (seen.has(row.id)) return;
      seen.add(row.id);
      accumulated.push(latestRows.get(row.id));
    });
  });

  return Number.isFinite(boundedCount) && boundedCount >= 0
    ? accumulated.slice(0, boundedCount)
    : accumulated;
};

export const sanitizeVisitSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[,%]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
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
      `hospital_name.ilike.${pattern}`,
      `doctor_name.ilike.${pattern}`,
      `room_number.ilike.${pattern}`,
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
