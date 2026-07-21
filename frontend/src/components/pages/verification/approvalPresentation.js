import {
  Ambulance,
  Ban,
  CheckCircle,
  Clock,
  LayoutGrid,
  Shield,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { getProviderPersonaKind } from './verificationQueueModel';

export const APPROVAL_KPI_OPTIONS = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  },
  {
    id: 'pending',
    label: 'Needs review',
    icon: Clock,
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    id: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: Ban,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/12 text-destructive shadow-e2',
  },
];

export const APPROVAL_KPI_IMPORTANCE = { all: 0, pending: 1, approved: 2, rejected: 3 };
export const APPROVAL_PINNED_KPI_IDS = ['pending', 'approved'];

export const APPROVAL_TONE_CLASS = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const APPROVAL_GRID_COLS = 'grid-cols-[minmax(150px,1.5fr)_minmax(120px,auto)_minmax(96px,0.7fr)_minmax(92px,auto)_72px]';
export const APPROVAL_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(150px,1.5fr)_minmax(120px,auto)_minmax(96px,0.7fr)_minmax(92px,auto)_72px]';

export const getApprovalKpiCount = (id, activeStats) => {
  if (id === 'all') return activeStats.total || 0;
  if (id === 'pending') return activeStats.pending || 0;
  if (id === 'approved') return activeStats.approved || 0;
  if (id === 'rejected') return activeStats.rejected || 0;
  return activeStats.total || 0;
};

export const getApprovalSignal = ({ queueType, activeStats, activeId, loadError, hasAny }) => {
  const noun = queueType === 'providers' ? 'provider' : 'facility';
  const nounPlural = queueType === 'providers' ? 'providers' : 'facilities';

  if (loadError && !hasAny) {
    return {
      icon: ShieldAlert,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Approvals did not load',
      subhead: 'Retry to load the queue.',
    };
  }

  if (activeId === 'approved') {
    const count = activeStats.approved || 0;
    return {
      icon: CheckCircle,
      tone: 'clear',
      label: 'Approved',
      headline: count > 0
        ? `${count} approved ${count === 1 ? noun : nounPlural}`
        : `No approved ${nounPlural}`,
      subhead: count > 0 ? 'Already cleared to operate.' : `Approved ${nounPlural} will appear here.`,
    };
  }

  if (activeId === 'rejected') {
    const count = activeStats.rejected || 0;
    return {
      icon: Ban,
      tone: 'danger',
      label: 'Rejected',
      headline: count > 0
        ? `${count} rejected ${count === 1 ? noun : nounPlural}`
        : `No rejected ${nounPlural}`,
      subhead: count > 0 ? 'Declined during review.' : `Rejected ${nounPlural} will appear here.`,
    };
  }

  if (activeId === 'all') {
    const count = activeStats.total || 0;
    return {
      icon: Shield,
      tone: 'muted',
      label: 'All',
      headline: count > 0
        ? `${count} ${count === 1 ? noun : nounPlural} in review`
        : `No ${nounPlural} yet`,
      subhead: count > 0 ? `Every application across ${nounPlural}.` : 'New applications will appear here.',
    };
  }

  const pending = activeStats.pending || 0;
  return {
    icon: pending > 0 ? Clock : CheckCircle,
    tone: pending > 0 ? 'warning' : 'clear',
    label: pending > 0 ? 'Needs review' : 'Clear',
    headline: pending > 0
      ? `${pending} ${pending === 1 ? noun : nounPlural} to review`
      : `No ${nounPlural} need review`,
    subhead: pending > 0 ? 'Start with the oldest application.' : 'Keep Approvals open for new applications.',
  };
};

export const getProviderTypeIcon = (providerType) => {
  const kind = getProviderPersonaKind(providerType);
  if (kind === 'responder') return Ambulance;
  if (kind === 'clinician') return Stethoscope;
  return UserRound;
};
