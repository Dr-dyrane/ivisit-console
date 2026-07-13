import { resolveVital } from '../../../constants/vitalTracks';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';
import {
  formatInsuranceStatusLabel,
  getInsuranceMetric,
  normalizeInsuranceStatus,
} from '../../pages/insurance/insurancePageModel';

export const INSURANCE_STATUS_ORDER = ['pending', 'active', 'expired', 'inactive'];

export const getMobileInsuranceVital = (status) => {
  const normalized = normalizeInsuranceStatus(status);
  return INSURANCE_STATUS_ORDER.includes(normalized)
    ? resolveVital('insurance', normalized)
    : null;
};

export const getMobileInsurancePill = (status) => (
  getMobileInsuranceVital(status)?.pill || {
    label: formatInsuranceStatusLabel(status),
    className: 'bg-muted/40 text-muted-foreground',
  }
);

export const getMobileInsuranceOrbClass = (status) => {
  switch (normalizeInsuranceStatus(status)) {
    case 'active':
      return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    case 'pending':
      return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
    case 'expired':
      return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
    case 'inactive':
    default:
      return 'bg-muted/40 text-muted-foreground';
  }
};

export const hasActiveMobileInsuranceFilters = (filters = {}) => Boolean(
  filters?.search
  || (Array.isArray(filters?.status) && filters.status.length > 0)
  || (Array.isArray(filters?.type)
    ? filters.type.length > 0
    : Boolean(String(filters?.type || '').trim()))
  || (filters?.verified && filters.verified !== 'all')
  || filters?.created_at?.start
  || filters?.created_at?.end
);

export const buildMobileInsuranceKpis = (stats, loadedCount) => [
  {
    id: 'all',
    label: 'Policies',
    value: getInsuranceMetric(stats?.total, loadedCount),
    color: 'hsl(var(--muted-foreground))',
  },
  {
    id: 'active',
    label: 'Active',
    value: getInsuranceMetric(stats?.active, 0),
    color: 'hsl(162 94% 24%)',
  },
  {
    id: 'pending',
    label: 'Pending',
    value: getInsuranceMetric(stats?.pending, 0),
    color: 'hsl(192 91% 36%)',
  },
  {
    id: 'expired',
    label: 'Expired',
    value: getInsuranceMetric(stats?.expired, 0),
    color: 'hsl(26 90% 37%)',
  },
  {
    id: 'unverified',
    label: 'Unverified',
    value: getInsuranceMetric(stats?.unverified, 0),
    color: 'hsl(215 16% 47%)',
  },
];

export const buildMobileInsuranceGroups = (policies) => resolveAdaptiveGroups(policies, [
  {
    key: 'status',
    assign: (policy) => normalizeInsuranceStatus(policy.status),
    labelFor: (key) => getMobileInsurancePill(key).label,
    order: (keys) => keys.slice().sort((left, right) => {
      const leftIndex = INSURANCE_STATUS_ORDER.indexOf(left);
      const rightIndex = INSURANCE_STATUS_ORDER.indexOf(right);
      const leftRank = leftIndex === -1 ? INSURANCE_STATUS_ORDER.length : leftIndex;
      const rightRank = rightIndex === -1 ? INSURANCE_STATUS_ORDER.length : rightIndex;
      return leftRank - rightRank;
    }),
    orphanLabel: 'Other',
  },
  {
    type: 'coarse-recency',
    key: 'opened',
    getDate: (policy) => policy.created_at,
  },
]);

export const buildMobileInsuranceHeading = ({
  loading,
  denied,
  error,
  visibleCount,
  scopeCount,
}) => {
  if (loading) return 'Loading policies...';
  if (denied) return 'Insurance access unavailable';
  if (error && visibleCount === 0) return 'Policies did not load';
  return `${scopeCount} ${scopeCount === 1 ? 'policy' : 'policies'}`;
};
