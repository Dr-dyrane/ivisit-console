import { formatRelativeTime } from '../../../utils/activityUtils';

export const PRICING_MUTATION_COMMANDS_ENABLED = false;

export const PRICING_SCOPE_UNAVAILABLE_MESSAGE =
  'Price changes need a selected facility before they can run.';

export const EMPTY_PRICING_SUMMARY = Object.freeze({
  globalFallbackCount: 0,
  facilityPriceCount: 0,
  averageAmount: null,
  recentCount: 0,
  basis: 'current_filter',
});

export const EMPTY_PRICING_PROJECTION = Object.freeze({
  rows: [],
  totalCount: 0,
  summary: EMPTY_PRICING_SUMMARY,
  readState: Object.freeze({
    basis: 'current_filter',
  }),
});

export const PRICING_KPI_DEFINITIONS = Object.freeze([
  {
    id: 'all',
    label: 'Rules',
    countKey: 'total',
    colorClass: 'text-sky-700 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  },
  {
    id: 'override',
    label: 'Facility',
    countKey: 'facilityPriceCount',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'global',
    label: 'Platform',
    countKey: 'globalFallbackCount',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
]);

export const PRICING_SIGNAL_TONES = Object.freeze({
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
});

export const normalizePricingProjection = (projection = EMPTY_PRICING_PROJECTION) => {
  const source = projection && typeof projection === 'object'
    ? projection
    : EMPTY_PRICING_PROJECTION;

  return {
    ...EMPTY_PRICING_PROJECTION,
    ...source,
    rows: Array.isArray(source.rows) ? source.rows : [],
    totalCount: Number(source.totalCount) || 0,
    summary: {
      ...EMPTY_PRICING_SUMMARY,
      ...(source.summary || {}),
    },
    readState: {
      ...EMPTY_PRICING_PROJECTION.readState,
      ...(source.readState || {}),
    },
  };
};

export const getPricingRoleKind = ({ admin, orgAdmin, provider, driver }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const buildPricingPageQuery = ({
  activeTab,
  organizationId,
  searchTerm,
  kpiFilter,
  sortDirection,
  isMobile,
  currentPage,
  itemsPerPage,
}) => ({
  family: activeTab,
  organizationId,
  search: searchTerm,
  scope: kpiFilter,
  sortDirection,
  page: isMobile ? 1 : currentPage,
  pageSize: isMobile ? currentPage * itemsPerPage : itemsPerPage,
});

export const buildPricingAnalytics = ({ summary, totalCount }) => ({
  total: totalCount,
  active: totalCount,
  recent: summary?.recentCount || 0,
  byCategory: {
    global: summary?.globalFallbackCount || 0,
    override: summary?.facilityPriceCount || 0,
  },
});

export const buildPricingRouteContext = ({
  pricing,
  focusedPrice,
  summary,
  totalCount,
  activeTab,
  kpiFilter,
  searchTerm,
  loading,
  loadError,
  projection,
}) => ({
  pricing,
  recentPricing: pricing.slice(0, 4),
  focusedPrice,
  summary,
  totalCount,
  activeTab,
  kpiFilter,
  searchTerm,
  loading,
  error: loadError,
  readState: projection.readState,
  scope: projection.scope,
  canManagePricing: PRICING_MUTATION_COMMANDS_ENABLED,
});

export const createPricingDesktopFilters = ({ searchTerm, activeTab, kpiFilter }) => ({
  search: searchTerm,
  family: activeTab,
  kpiFilter,
});

export const getPricingKpiCount = (summary, totalCount, id) => {
  if (id === 'all') return Number(summary?.totalCount ?? totalCount ?? 0);
  const definition = PRICING_KPI_DEFINITIONS.find((option) => option.id === id);
  return Number(summary?.[definition?.countKey] || 0);
};

export const getPricingRuleName = (row = {}) => (
  row.name || row.service_name || row.room_name || 'Unnamed pricing rule'
);

export const getPricingAmountValue = (row = {}) => (
  Number(row.amount ?? row.base_price ?? row.price_per_night ?? 0) || 0
);

export const formatPricingAmount = (row = {}) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: row.currency || 'USD',
}).format(getPricingAmountValue(row));

export const formatPricingDate = (value) => (
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleDateString()
    : 'Not set'
);

// ADOPT-59: created_at vs updated_at rendered distinctly (new rule vs
// repriced) with the shared relative formatter. Null stays null so DetailLine
// renders its honest absent state.
export const formatPricingRelativeDate = (value) => (
  value && !Number.isNaN(new Date(value).getTime())
    ? formatRelativeTime(value)
    : null
);

// ADOPT-58: room_pricing.price_per_night is the only unit truth on pricing
// rows (types/database.ts room_pricing.Row); service_pricing.base_price has
// no unit or duration column, so service rows render no suffix.
export const getPricingUnitSuffix = (row = {}) => {
  const family = row.family || row._pricingType;
  if (family === 'room') return '/ night';
  if (!family && Object.prototype.hasOwnProperty.call(row, 'price_per_night')) return '/ night';
  return null;
};

export const formatPricingAmountWithUnit = (row = {}) => {
  const suffix = getPricingUnitSuffix(row);
  const amount = formatPricingAmount(row);
  return suffix ? `${amount} ${suffix}` : amount;
};

// ADOPT-64: honest render states for the read-only resolved-price preview.
// Loading/idle stay null (the rail shims those); every other state names
// itself instead of inventing a price.
export const formatResolvedPricePreview = (preview, row = {}) => {
  if (!preview || preview.status === 'idle' || preview.status === 'loading') return null;
  if (preview.status === 'error') return 'Preview unavailable';
  if (preview.status === 'unavailable') return 'No resolution key';
  if (preview.status !== 'resolved' || !preview.row) return 'No resolved price';
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: preview.row.currency || 'USD',
  }).format(preview.row.price);
  const suffix = getPricingUnitSuffix(row);
  const amountLabel = suffix ? `${amount} ${suffix}` : amount;
  return preview.row.name ? [amountLabel, preview.row.name].join(' \u00b7 ') : amountLabel;
};

// service_type / room_type are the price-resolution keys: they say WHICH price
// a rule resolves. Normalized rows carry them as `type`; raw rows keep the
// family-specific column names.
export const getPricingRuleType = (row = {}) => {
  const type = row.type || row.service_type || row.room_type;
  const trimmed = typeof type === 'string' ? type.trim() : '';
  return trimmed || null;
};

export const getPricingDescription = (row = {}) => {
  const description = typeof row.description === 'string' ? row.description.trim() : '';
  return description || null;
};

export const getPricingRowMetaLine = (row = {}) => [
  formatPricingAmountWithUnit(row),
  getPricingRuleType(row),
].filter(Boolean).join(' \u00b7 ');

export const isGlobalPricingRule = (row = {}) => !row.hospital_id && !row.hospitalId;

export const getPricingScopeTone = (row) => (
  isGlobalPricingRule(row)
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200'
    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
);

export const getPricingWorkspaceState = ({
  summary,
  totalCount,
  active,
  error,
  rowCount,
}) => {
  const option = PRICING_KPI_DEFINITIONS.find((item) => item.id === active)
    || PRICING_KPI_DEFINITIONS[0];
  const activeCount = getPricingKpiCount(summary, totalCount, active);
  const failedEmpty = Boolean(error) && rowCount === 0;
  const signalHeadline = activeCount
    ? `${activeCount} ${active === 'all' ? 'pricing ' : `${option.label.toLowerCase()} `}rule${activeCount === 1 ? '' : 's'}`
    : active === 'all'
      ? 'No pricing rules'
      : `No ${option.label.toLowerCase()} rules`;

  return {
    activeCount,
    failedEmpty,
    option,
    signal: failedEmpty
      ? {
        iconId: 'error',
        tone: 'danger',
        label: 'Load failed',
        headline: 'Pricing did not load',
        subhead: 'Try again to view pricing rules.',
      }
      : {
        iconId: option.id,
        tone: activeCount
          ? active === 'override'
            ? 'clear'
            : active === 'global'
              ? 'warning'
              : 'primary'
          : 'muted',
        label: option.label,
        headline: signalHeadline,
        subhead: 'Review platform fallbacks and facility prices. Select a facility before changing prices.',
      },
  };
};
