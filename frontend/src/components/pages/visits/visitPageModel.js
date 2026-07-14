import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  LayoutGrid,
  PlayCircle,
} from 'lucide-react';

const normalizeVisitCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const visitStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    countKey: 'total',
    tone: 'primary',
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: Clock,
    countKey: 'scheduled',
    tone: 'info',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  },
  {
    id: 'in_progress',
    label: 'Active',
    icon: PlayCircle,
    countKey: 'inProgress',
    tone: 'warning',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    id: 'completed',
    label: 'Done',
    icon: CheckCircle,
    countKey: 'completed',
    tone: 'clear',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertCircle,
    countKey: 'cancelled',
    tone: 'muted',
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/36 text-foreground shadow-e2',
  },
];

export const VISIT_KPI_IMPORTANCE = {
  all: 0,
  scheduled: 1,
  in_progress: 2,
  completed: 3,
  cancelled: 4,
};

export const PINNED_VISIT_STATE_IDS = ['scheduled', 'in_progress'];

export const getVisitStateCount = ({ id, stats, visits }) => {
  const option = visitStateOptions.find((item) => item.id === id) || visitStateOptions[0];
  const fallback = id === 'all'
    ? visits.length
    : visits.filter((visit) => visit.status === id).length;

  return normalizeVisitCount(stats?.[option.countKey], fallback);
};

export const getDefaultVisitKpi = (stats) => {
  if (normalizeVisitCount(stats?.scheduled, 0) > 0) return 'scheduled';
  if (normalizeVisitCount(stats?.inProgress, 0) > 0) return 'in_progress';
  return 'all';
};

export const visitToneClass = {
  primary: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-e2',
  danger: 'bg-destructive/14 text-destructive shadow-e2',
};

export const visitStatusPillClass = {
  scheduled: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  in_progress: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  completed: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  cancelled: 'bg-muted/40 text-muted-foreground',
};

export const visitStatusLabel = {
  scheduled: 'Scheduled',
  in_progress: 'Active',
  completed: 'Done',
  cancelled: 'Cancelled',
};

export const visitStatusIcon = {
  scheduled: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle,
  cancelled: AlertCircle,
};

export const getVisitAvatarClass = (visit) => {
  const status = visit?.status || 'scheduled';
  if (status === 'completed') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  if (status === 'in_progress') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (status === 'cancelled') return 'bg-muted/40 text-muted-foreground';
  if (status === 'scheduled') return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  return 'bg-muted/34 text-muted-foreground';
};

export const VISIT_STAGE_ORDER = ['scheduled', 'in_progress', 'completed'];

export const VISIT_STAGE_FILL = {
  scheduled: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

export const getVisitSignal = ({ stats, visits, kpiFilter, loadError }) => {
  const activeId = kpiFilter || 'all';
  const option = visitStateOptions.find((item) => item.id === activeId) || visitStateOptions[0];
  const count = getVisitStateCount({ id: option.id, stats, visits });

  if (loadError && count === 0 && visits.length === 0) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Visits did not load',
      subhead: 'Retry to load the schedule.',
    };
  }

  if (option.id === 'scheduled') {
    return {
      icon: Clock,
      tone: 'info',
      label: 'Scheduled',
      headline: count > 0 ? `${count} scheduled visit${count === 1 ? '' : 's'}` : 'No scheduled visits',
      subhead: count > 0 ? 'Open the next visit to review its details.' : 'New scheduled visits will appear here.',
    };
  }

  if (option.id === 'in_progress') {
    return {
      icon: PlayCircle,
      tone: 'warning',
      label: 'Active',
      headline: count > 0 ? `${count} active visit${count === 1 ? '' : 's'}` : 'No active visits',
      subhead: count > 0 ? 'Check the focused record before acting.' : 'Active visits will appear here.',
    };
  }

  if (option.id === 'completed') {
    return {
      icon: CheckCircle,
      tone: 'clear',
      label: 'Done',
      headline: count > 0 ? `${count} completed visit${count === 1 ? '' : 's'}` : 'No completed visits',
      subhead: count > 0 ? 'Use completed visits as read-only care history.' : 'Completed visits will appear here.',
    };
  }

  if (option.id === 'cancelled') {
    return {
      icon: AlertCircle,
      tone: 'muted',
      label: 'Cancelled',
      headline: count > 0 ? `${count} cancelled visit${count === 1 ? '' : 's'}` : 'No cancelled visits',
      subhead: count > 0 ? 'Review these records without changing outcomes.' : 'Cancelled visits will appear here.',
    };
  }

  return {
    icon: Calendar,
    tone: 'primary',
    label: 'Visits',
    headline: count > 0 ? `${count} visit record${count === 1 ? '' : 's'}` : 'No visit records',
    subhead: count > 0 ? 'Pick one record, then review its details.' : 'No visit records are available in this scope.',
  };
};

export const VISIT_EMPTY_HEADINGS = {
  scheduled: 'No scheduled visits',
  in_progress: 'No active visits',
  completed: 'No completed visits',
  cancelled: 'No cancelled visits',
};

export const hasActiveVisitFilters = (filters = {}) => Boolean(
  filters.search
  || (filters.status && filters.status.length > 0)
  || (filters.visit_type && filters.visit_type.length > 0)
  || (filters.care_mode && filters.care_mode.length > 0)
  || filters.date
);
