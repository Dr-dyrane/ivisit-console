import { isDemoOrganization } from '../../../utils/demoProvenance';

export const metricValue = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const isFundedOrganization = (organization) => (
  !isDemoOrganization(organization)
  && Number(organization?.wallet_balance || 0) > 0
);

export const formatMobileOrganizationWallet = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return `$${numeric.toLocaleString()}`;
};

export const formatMobileOrganizationWalletForRow = (organization) => (
  isDemoOrganization(organization)
    ? 'Simulated'
    : formatMobileOrganizationWallet(organization?.wallet_balance)
);

export const formatMobileOrganizationDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getMobileOrganizationPill = (organization) => {
  if (isDemoOrganization(organization)) {
    return {
      label: 'Demo',
      className: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
      dataStatus: 'demo',
    };
  }

  return organization?.is_active
    ? {
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
      dataStatus: 'active',
    }
    : {
      label: 'Inactive',
      className: 'bg-muted/40 text-muted-foreground',
      dataStatus: 'inactive',
    };
};

export const getOrganizationReadinessLabel = (key) => (
  key === 'funded' ? 'Funded' : 'Payout gap'
);

export const hasActiveMobileOrganizationFilters = (filters = {}) => Boolean(
  filters.search || (filters.kpiFilter && filters.kpiFilter !== 'all')
);

export const buildMobileOrganizationKpis = (statistics, sourceOrganizations) => [
  {
    id: 'all',
    label: 'Registry',
    value: metricValue(statistics?.total, sourceOrganizations.length),
    color: 'hsl(var(--muted-foreground))',
  },
  {
    id: 'funded',
    label: 'Funded',
    value: metricValue(statistics?.funded, 0),
    color: 'hsl(162 94% 24%)',
  },
  {
    id: 'payout_gap',
    label: 'Payout gap',
    value: metricValue(statistics?.payoutGap, 0),
    color: 'hsl(38 92% 50%)',
  },
];

export const getMobileOrganizationScopeCount = ({
  activeKpi,
  statistics,
  sourceOrganizations,
}) => {
  if (activeKpi === 'funded') return metricValue(statistics?.funded, 0);
  if (activeKpi === 'payout_gap') return metricValue(statistics?.payoutGap, 0);
  return metricValue(statistics?.total, sourceOrganizations.length);
};
