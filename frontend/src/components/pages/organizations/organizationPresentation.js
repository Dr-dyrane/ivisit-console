import { AlertCircle, Building2, Wallet } from 'lucide-react';
import { getOrganizationStateCount } from './organizationPageModel';

export const ORGANIZATION_KPI_OPTIONS = [
  { id: 'all', label: 'Registry', icon: Building2, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'funded', label: 'Funded', icon: Wallet, countKey: 'funded', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'payout_gap', label: 'Payout gap', icon: AlertCircle, countKey: 'payoutGap', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
];

export const ORGANIZATION_KPI_IMPORTANCE = { all: 0, funded: 1, payout_gap: 2 };
export const PINNED_ORGANIZATION_KPI_IDS = ['funded', 'payout_gap'];

export const organizationToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const ORGANIZATION_GRID_COLS = 'grid-cols-[minmax(200px,1.9fr)_minmax(96px,auto)_minmax(120px,auto)_minmax(112px,auto)_96px]';
export const ORGANIZATION_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(200px,1.9fr)_minmax(96px,auto)_minmax(120px,auto)_minmax(112px,auto)_96px]';

export const getOrganizationSignal = ({ stats, organizations, kpiFilter, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Organizations did not load',
      subhead: 'Retry to load the organization registry.',
    };
  }

  const option = ORGANIZATION_KPI_OPTIONS.find((item) => item.id === kpiFilter)
    || ORGANIZATION_KPI_OPTIONS[0];
  const count = getOrganizationStateCount({ id: option.id, stats, organizations });

  if (option.id === 'funded') {
    return {
      icon: Wallet,
      tone: 'clear',
      label: 'Funded',
      headline: count > 0
        ? `${count} funded ${count === 1 ? 'organization' : 'organizations'}`
        : 'No funded organizations',
      subhead: count > 0
        ? 'Review account balances and payout readiness. Changes are not available here.'
        : 'Organizations gain a positive wallet balance once funded.',
    };
  }

  if (option.id === 'payout_gap') {
    return {
      icon: AlertCircle,
      tone: 'warning',
      label: 'Payout gap',
      headline: count > 0 ? `${count} in payout gap` : 'No payout gap',
      subhead: count > 0
        ? 'Payout gap counts zero-balance or wallet-less organizations. Review readiness; do not change it here.'
        : 'Every organization currently carries a funded wallet.',
    };
  }

  return {
    icon: Building2,
    tone: 'primary',
    label: 'Registry',
    headline: count > 0
      ? `${count} ${count === 1 ? 'organization' : 'organizations'}`
      : 'No organizations found',
    subhead: count > 0
      ? 'Review organization details, balances, and payout readiness.'
      : 'Organizations will appear here when available.',
  };
};
