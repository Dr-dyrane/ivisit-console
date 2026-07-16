export const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE = 'Organization changes are not available from this page.';

export const ORGANIZATION_PAGE_SIZE = 20;

export const ORGANIZATION_DEFAULT_FILTERS = Object.freeze({ search: '' });

export const ORGANIZATION_DEFAULT_SORT = Object.freeze({
  key: 'created_at',
  direction: 'desc',
});

export const ORGANIZATION_FILTER_SCHEMA = Object.freeze([
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search registry by name, email or Stripe ID',
  },
]);

const ORGANIZATION_COUNT_KEYS = Object.freeze({
  all: 'total',
  funded: 'funded',
  payout_gap: 'payoutGap',
});

export const normalizeOrganizationCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const isOrganizationFunded = (organization) => (
  Number(organization?.wallet_balance || 0) > 0
);

export const hasActiveOrganizationFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search || (kpiFilter && kpiFilter !== 'all')
);

export const getOrganizationStateCount = ({ id, stats, organizations }) => {
  const rows = Array.isArray(organizations) ? organizations : [];
  const stateId = ORGANIZATION_COUNT_KEYS[id] ? id : 'all';
  const fallback = stateId === 'all'
    ? rows.length
    : stateId === 'funded'
      ? rows.filter(isOrganizationFunded).length
      : rows.filter((organization) => !isOrganizationFunded(organization)).length;

  return normalizeOrganizationCount(stats?.[ORGANIZATION_COUNT_KEYS[stateId]], fallback);
};

export const buildOrganizationQueryFilter = ({
  filters,
  kpiFilter,
  itemsPerPage,
  offset,
  sortConfig,
}) => ({
  search: filters.search,
  kpiFilter,
  limit: itemsPerPage,
  offset,
  sortKey: sortConfig.key,
  sortDirection: sortConfig.direction,
  quiet: true,
});

export const buildOrganizationsPanelContext = ({
  stats,
  organizations,
  focusedOrganization,
  totalCount,
  loading,
  errorMessage,
  currentState,
}) => {
  const rows = Array.isArray(organizations) ? organizations : [];

  return {
    stats: stats || {},
    recent: rows.slice(0, 4),
    focused: focusedOrganization,
    count: totalCount || rows.length,
    loading,
    errorMessage,
    currentState,
    canManage: false,
  };
};

export const buildOrganizationAnalytics = (stats) => ({
  total: stats?.total || 0,
  funded: stats?.funded || 0,
  payoutGap: stats?.payoutGap || 0,
  byCategory: {
    funded: stats?.funded || 0,
    payoutGap: stats?.payoutGap || 0,
  },
});

export const formatOrganizationDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// organizations.organization_type is the real column (types/database.ts); the old
// row.type / row.org_type reads were dead. Honest null: absent value reads Unknown.
export const formatOrganizationType = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return 'Unknown';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatOrganizationWallet = (value) => {
  if (value == null || value === '') return 'Not available';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return `$${numeric.toLocaleString()}`;
};

export const getOrganizationStatusMeta = (isActive) => (isActive
  ? { label: 'Active', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' }
  : { label: 'Inactive', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' });
