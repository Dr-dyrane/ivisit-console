import {
  AlertCircle,
  CheckCircle,
  Headphones,
  Ticket,
} from 'lucide-react';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from '../../../services/supportTicketsService';

const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_COLORS = {
  low: 'blue',
  normal: 'green',
  high: 'orange',
  urgent: 'red',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_PRIORITIES = SUPPORT_TICKET_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
  color: PRIORITY_COLORS[value],
}));

export const SUPPORT_STATUSES = SUPPORT_TICKET_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export const SUPPORT_CATEGORIES = SUPPORT_TICKET_CATEGORIES;

export const SUPPORT_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Ticket, countKey: 'total', colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'open', label: 'Open', icon: AlertCircle, countKey: 'open', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'in_progress', label: 'Active', icon: Headphones, countKey: 'active', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle, countKey: 'resolved', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
];

export const SUPPORT_KPI_IMPORTANCE = { all: 0, open: 1, in_progress: 2, resolved: 3 };
export const PINNED_SUPPORT_KPI_IDS = ['open', 'in_progress'];

export const SUPPORT_TONE_CLASS = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

const STATUS_META = {
  open: { label: 'Open', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  in_progress: { label: 'Active', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
  resolved: { label: 'Resolved', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  closed: { label: 'Closed', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
};

const PRIORITY_TONE = {
  low: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  normal: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  high: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  urgent: 'bg-destructive/12 text-destructive',
};

export const SUPPORT_GRID_COLS = 'grid-cols-[minmax(180px,1.7fr)_minmax(92px,auto)_minmax(92px,auto)_minmax(96px,auto)_150px]';
export const SUPPORT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(180px,1.7fr)_minmax(92px,auto)_minmax(92px,auto)_minmax(96px,auto)_150px]';

export const SUPPORT_EMPTY_HEADINGS = {
  all: 'No support requests',
  open: 'No open requests',
  in_progress: 'Nothing active right now',
  resolved: 'No resolved requests',
};

export const EMPTY_SUPPORT_FILTERS = Object.freeze({
  search: '',
  status: [],
  priority: [],
  category: [],
  kpiFilter: 'all',
});

export const SUPPORT_FILTER_SCHEMA = [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search support',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: SUPPORT_STATUSES,
  },
  {
    key: 'priority',
    type: 'multiselect',
    label: 'Priority',
    options: SUPPORT_PRIORITIES.map((priority) => ({
      value: priority.value,
      label: priority.label,
    })),
  },
  {
    key: 'category',
    type: 'multiselect',
    label: 'Category',
    options: SUPPORT_CATEGORIES.map((category) => ({
      value: category,
      label: titleCase(category),
    })),
  },
];

export const formatSupportDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const hasActiveSupportFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search
  || (Array.isArray(filters.status) && filters.status.length > 0)
  || (Array.isArray(filters.priority) && filters.priority.length > 0)
  || (Array.isArray(filters.category) && filters.category.length > 0)
  || (kpiFilter && kpiFilter !== 'all')
);

export const normalizeSupportCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getSupportStatsFilters = (filters = {}) => {
  const { status: _status, ...rest } = filters || {};
  return rest;
};

export const buildSupportQueryFilter = ({
  filters,
  kpiFilter,
  limit,
  offset,
  sortConfig,
}) => {
  const routeFilters = {
    ...filters,
    ...(kpiFilter !== 'all' ? { status: kpiFilter } : {}),
  };
  delete routeFilters.kpiFilter;

  return {
    ...routeFilters,
    statsFilter: getSupportStatsFilters(routeFilters),
    limit,
    offset,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  };
};

export const getSupportStatusMeta = (status) => (
  STATUS_META[String(status || '').toLowerCase()] || STATUS_META.open
);

export const getSupportPriorityMeta = (priority) => {
  const key = String(priority || 'normal').toLowerCase();
  const option = SUPPORT_PRIORITIES.find((item) => item.value === key) || SUPPORT_PRIORITIES[1];
  return { label: option.label, tone: PRIORITY_TONE[key] || PRIORITY_TONE.normal };
};

export const getSupportStateCount = ({ id, stats, tickets }) => {
  const rows = Array.isArray(tickets) ? tickets : [];
  const option = SUPPORT_KPI_OPTIONS.find((item) => item.id === id) || SUPPORT_KPI_OPTIONS[0];
  const fallback = id === 'all'
    ? rows.length
    : rows.filter((ticket) => ticket.status === id || (id === 'in_progress' && ticket.status === 'open')).length;

  return normalizeSupportCount(stats?.[option.countKey], fallback);
};

export const getSupportSignal = ({ stats, tickets, kpiFilter, isProviderOnly, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return { icon: AlertCircle, tone: 'danger', label: 'Load failed', headline: 'Support did not load', subhead: 'Retry to load the support queue.' };
  }

  const option = SUPPORT_KPI_OPTIONS.find((item) => item.id === kpiFilter) || SUPPORT_KPI_OPTIONS[0];
  const count = getSupportStateCount({ id: option.id, stats, tickets });
  const noun = isProviderOnly ? 'support request' : 'ticket';

  if (option.id === 'open') {
    return {
      icon: AlertCircle,
      tone: 'warning',
      label: 'Open',
      headline: count > 0 ? `${count} open ${noun}${count === 1 ? '' : 's'}` : 'No open support requests',
      subhead: count > 0 ? 'Start with one request and keep the next action clear.' : 'New support requests will appear here.',
    };
  }

  if (option.id === 'in_progress') {
    return {
      icon: Headphones,
      tone: 'info',
      label: 'Active',
      headline: count > 0 ? `${count} active ${noun}${count === 1 ? '' : 's'}` : 'Nothing active right now',
      subhead: count > 0 ? 'Review the active queue without changing assignment here yet.' : 'Assigned work will appear after support takes ownership.',
    };
  }

  if (option.id === 'resolved') {
    return {
      icon: CheckCircle,
      tone: 'clear',
      label: 'Resolved',
      headline: count > 0 ? `${count} resolved ${noun}${count === 1 ? '' : 's'}` : 'No resolved requests in view',
      subhead: count > 0 ? 'Resolved support stays visible as backend evidence.' : 'Resolved items will appear after support closes the loop.',
    };
  }

  return {
    icon: Ticket,
    tone: 'primary',
    label: isProviderOnly ? 'My support' : 'Support',
    headline: count > 0 ? `${count} support ${count === 1 ? 'request' : 'requests'}` : 'No support requests found',
    subhead: count > 0 ? 'Scan the queue, open one request, then use the proved action.' : 'Create a request or change filters to see support work.',
  };
};

export function titleCase(value) {
  return String(value || '')
    .replace('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const buildSupportAnalytics = (stats = {}, rows = []) => {
  const safeStats = stats || {};
  const visibleRows = Array.isArray(rows) ? rows : [];
  const byStatus = {};
  const byPriority = {};
  const byCategory = {};
  const resolutionHours = [];

  visibleRows.forEach((ticket) => {
    const status = String(ticket?.status || 'unknown').trim().toLowerCase() || 'unknown';
    const priority = String(ticket?.priority || 'unknown').trim().toLowerCase() || 'unknown';
    const category = String(ticket?.category || 'uncategorized').trim().toLowerCase() || 'uncategorized';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    byCategory[category] = (byCategory[category] || 0) + 1;

    if (status === 'resolved' && ticket?.created_at && ticket?.updated_at) {
      const createdAt = new Date(ticket.created_at).getTime();
      const updatedAt = new Date(ticket.updated_at).getTime();
      if (Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt >= createdAt) {
        resolutionHours.push((updatedAt - createdAt) / 3600000);
      }
    }
  });

  return {
    total: safeStats.total || 0,
    resolved: safeStats.resolved || 0,
    open: safeStats.open || 0,
    active: safeStats.active || 0,
    averageResolutionTime: resolutionHours.length > 0
      ? resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length
      : null,
    averageResolutionScope: 'visible_page',
    byStatus,
    byPriority,
    byCategory,
    distributionScope: 'visible_page',
    distributionLabel: 'Current page',
    visibleCount: visibleRows.length,
  };
};
