export const EMPTY_INSURANCE_PAGE = {
  data: [],
  count: 0,
  denied: false,
  failed: false,
  reason: null,
  stats: {
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    verified: 0,
    unverified: 0,
    expiringSoon: 0,
    exactCounts: true,
    scope: 'admin_policy_projection',
  },
};

export const EMPTY_INSURANCE_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
};

export const EMPTY_INSURANCE_BILLING_CONTEXT = {
  outcomes: [],
  recentBilling: [],
  stats: EMPTY_INSURANCE_BILLING_STATS,
  count: 0,
  loading: true,
  denied: false,
  failed: false,
  reason: null,
  errorMessage: null,
  scope: 'admin_billing_outcome_projection',
};

export const EMPTY_INSURANCE_FILTERS = Object.freeze({
  search: '',
  status: [],
  type: '',
  verified: '',
  created_at: { start: '', end: '' },
  kpiFilter: 'all',
});

export const INSURANCE_FILTER_SCHEMA = Object.freeze([
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search policies...',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'type',
    type: 'text',
    label: 'Plan type',
    placeholder: 'Basic, Gold, PPO...',
  },
  {
    key: 'verified',
    type: 'select',
    label: 'Verification',
    options: [
      { value: 'all', label: 'All' },
      { value: 'verified', label: 'Verified only' },
      { value: 'unverified', label: 'Unverified only' },
    ],
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Policy date',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 days', value: '7days' },
      { label: 'Last 30 days', value: '30days' },
      { label: 'This month', value: 'month' },
    ],
  },
]);

export const normalizeInsuranceStatus = (value) => (
  String(value || '').trim().toLowerCase() || 'unknown'
);

export const formatInsuranceStatusLabel = (value) => String(value || 'unknown')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatInsurancePlanType = (policy) => {
  const raw = policy?.policy_type || policy?.coverage_type || policy?.plan_type;
  if (!raw) return '';

  const text = String(raw).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export const formatInsuranceCoverage = (policy) => {
  const raw = policy?.coverage_percentage;
  if (raw === null || raw === undefined || raw === '') return null;

  const value = Number(raw);
  return Number.isFinite(value) ? `${value.toLocaleString()}%` : null;
};

// Dual-shape guard mirrored from the ivisit-app donor card
// (renderLinkedPaymentSummary): the projection boundary already normalizes
// linked_payment_method to snapshot object | scalar string | null, and this
// formatter renders each shape honestly instead of inventing card details.
export const formatInsuranceLinkedPayment = (linkedPayment) => {
  if (!linkedPayment) return 'Not linked';
  if (typeof linkedPayment === 'string') return 'Linked card';
  const brand = String(linkedPayment.brand || linkedPayment.type || 'Card').trim() || 'Card';
  const last4 = linkedPayment.last4 ? `**** ${linkedPayment.last4}` : '';
  const expiry = linkedPayment.expiry ? `| ${linkedPayment.expiry}` : '';
  return [brand, last4, expiry].filter(Boolean).join(' ');
};

export const formatInsuranceDate = (value, fallback = 'Not set') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString();
};

export const getInsuranceMetric = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const hasInsuranceFilterValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Boolean(value.start || value.end);
  return Boolean(value && value !== 'all');
};

export const hasActiveInsuranceFilters = (filters = {}) => (
  Object.entries(filters).some(([key, value]) => (
    key !== 'kpiFilter' && hasInsuranceFilterValue(value)
  ))
);

export const resolveInsuranceRoleKind = ({ admin, orgAdmin, provider, driver }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const buildVisibleInsuranceAnalytics = ({ rows = [], stats = {} }) => {
  const policies = Array.isArray(rows) ? rows : [];
  const byProvider = policies.reduce((counts, policy) => {
    const label = policy.provider_name || 'Unknown provider';
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const byCategory = policies.reduce((counts, policy) => {
    const label = policy.policy_type
      || policy.coverage_type
      || policy.plan_type
      || 'Unknown type';
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});

  return {
    total: stats.total,
    active: stats.active,
    pending: stats.pending,
    verified: stats.verified,
    expired: stats.expired,
    expiringSoon: stats.expiringSoon,
    byProvider,
    byCategory,
    visibleCount: policies.length,
    distributionScope: 'visible_page',
    distributionLabel: 'Visible page only',
  };
};

export const buildInsurancePanelContext = ({
  policies,
  focusedPolicy,
  stats,
  page,
  pagination,
  filters,
  hasFilters,
  sortConfig,
  loading,
  billing,
  errorMessage,
}) => ({
  policies,
  recentPolicies: policies.slice(0, 3),
  focusedPolicy,
  stats,
  count: pagination.totalCount || page.count || policies.length,
  currentPage: pagination.currentPage,
  totalPages: pagination.totalPages,
  filters,
  hasFilters,
  sortConfig,
  loading,
  billing,
  errorMessage,
  denied: page.denied,
  failed: page.failed,
  reason: page.reason,
  scope: stats.scope || 'admin_policy_projection',
  canManagePolicies: false,
});
