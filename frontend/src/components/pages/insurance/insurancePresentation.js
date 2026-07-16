import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Clock,
  Eye,
  Shield,
} from 'lucide-react';
import { resolveVital } from '../../../constants/vitalTracks';
import {
  formatInsuranceDate,
  getInsuranceMetric,
  hasInsuranceFilterValue,
  normalizeInsuranceStatus,
} from './insurancePageModel';

export const INSURANCE_STATE_OPTIONS = [
  {
    id: 'all',
    label: 'Policies',
    icon: Shield,
    countKey: 'total',
    colorClass: 'text-sky-700 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  },
  {
    id: 'active',
    label: 'Active',
    icon: CheckCircle,
    countKey: 'active',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: Clock,
    countKey: 'pending',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  },
  {
    id: 'expired',
    label: 'Expired',
    icon: AlertTriangle,
    countKey: 'expired',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    // 30-day renewal-risk window; count binds to the exact expiringSoon
    // projection stat. Canonical position sits before 'unverified' because
    // expiring-soon has no filter-sheet fallback, while verification stays
    // reachable through the Verification filter.
    id: 'expiringSoon',
    label: 'Expiring soon',
    icon: CalendarClock,
    countKey: 'expiringSoon',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    id: 'unverified',
    label: 'Unverified',
    icon: Eye,
    countKey: 'unverified',
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-foreground/[0.055] text-foreground shadow-e2 dark:bg-white/[0.06]',
  },
];

export const INSURANCE_STATE_IMPORTANCE = {
  all: 0,
  pending: 1,
  expiringSoon: 2,
  unverified: 3,
  active: 4,
  expired: 5,
};

export const INSURANCE_GRID = 'grid-cols-[minmax(210px,1.8fr)_minmax(120px,1fr)_minmax(100px,auto)_minmax(105px,auto)_96px]';
export const SELECTABLE_INSURANCE_GRID = 'grid-cols-[28px_minmax(210px,1.8fr)_minmax(120px,1fr)_minmax(100px,auto)_minmax(105px,auto)_96px]';

export const INSURANCE_TONE_CLASSES = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const getInsurancePolicyPill = (status) => (
  resolveVital('insurance', normalizeInsuranceStatus(status))?.pill || {
    label: 'Unknown',
    className: 'bg-muted/40 text-muted-foreground',
  }
);

const EXPIRING_SOON_WINDOW_DAYS = 30;

// Row-level mirror of the service's active + 30-day expires_at window,
// used only as a visible-rows fallback when exact stats are absent.
export const isInsurancePolicyExpiringSoon = (policy) => {
  if (normalizeInsuranceStatus(policy?.status) !== 'active') return false;
  const expiresAt = new Date(policy?.end_date || policy?.expires_at || '');
  if (Number.isNaN(expiresAt.getTime())) return false;
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + EXPIRING_SOON_WINDOW_DAYS);
  return expiresAt >= now && expiresAt <= horizon;
};

export const getInsuranceStateCount = (stats, rows, id) => {
  const key = INSURANCE_STATE_OPTIONS.find((option) => option.id === id)?.countKey || 'total';
  const value = getInsuranceMetric(stats?.[key], Number.NaN);
  if (Number.isFinite(value)) return value;
  if (id === 'all') return rows.length;
  if (id === 'unverified') return rows.filter((row) => !row.verified).length;
  if (id === 'expiringSoon') return rows.filter(isInsurancePolicyExpiringSoon).length;
  return rows.filter((row) => normalizeInsuranceStatus(row.status) === id).length;
};

export const hasInsuranceWorkspaceFilter = (filters = {}) => Boolean(
  filters.search
  || (filters.kpiFilter || 'all') !== 'all'
  || hasInsuranceFilterValue(filters.status)
  || hasInsuranceFilterValue(filters.type)
  || hasInsuranceFilterValue(filters.verified)
  || filters.created_at?.start
  || filters.created_at?.end
);

export const buildInsuranceSignal = ({ active, activeCount, denied, failedEmpty }) => {
  const activeOption = INSURANCE_STATE_OPTIONS.find((option) => option.id === active)
    || INSURANCE_STATE_OPTIONS[0];
  const signalHeadline = activeCount
    ? `${activeCount} ${active === 'all' ? '' : `${activeOption.label.toLowerCase()} `}${activeCount === 1 ? 'policy' : 'policies'}`
    : active === 'all'
      ? 'No policies'
      : `No ${activeOption.label.toLowerCase()} policies`;

  if (denied) {
    return {
      icon: Shield,
      tone: 'muted',
      label: 'Access unavailable',
      headline: 'Insurance access is unavailable',
      subhead: 'This account does not have access to policy records.',
    };
  }

  if (failedEmpty) {
    return {
      icon: AlertTriangle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Insurance did not load',
      subhead: 'Try again to view policy records.',
    };
  }

  return {
    icon: activeOption.icon,
    tone: activeCount
      ? active === 'active'
        ? 'clear'
        : active === 'expired' || active === 'expiringSoon'
          ? 'warning'
          : 'primary'
      : 'muted',
    label: activeOption.label,
    headline: signalHeadline,
    subhead: 'View policy details and billing outcomes. Policy changes are currently unavailable.',
  };
};

export const formatInsuranceRowDate = (value) => formatInsuranceDate(value);
