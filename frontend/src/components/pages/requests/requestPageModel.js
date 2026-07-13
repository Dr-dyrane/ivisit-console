import {
  AlertCircle,
  Ambulance,
  BedDouble,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Info,
  LayoutGrid,
  Send,
  UserRound,
} from 'lucide-react';
import { canonicalizeEmergencyStatus, isActiveEmergencyStatus } from '../../../utils/emergencyStatus';
import { buildEmergencyRenderProjection } from '../../../utils/emergencyRequestMapper';

export const EMPTY_REQUEST_FILTERS = Object.freeze({
  search: '',
  status: [],
  created_at: { start: '', end: '' },
});

export const REQUEST_FILTER_SCHEMA = Object.freeze([
  {
    key: 'search',
    type: 'text',
    label: 'Search requests',
    placeholder: 'Search by request ID, facility, responder, or type...',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'pending_approval', label: 'Needs attention' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'arrived', label: 'Arrived' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'payment_declined', label: 'Payment issue' },
    ],
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Date range',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 days', value: '7days' },
      { label: 'Last 30 days', value: '30days' },
      { label: 'This month', value: 'month' },
    ],
  },
]);

export const hasActiveRequestFilters = (filters = {}) => Boolean(
  filters.search ||
  (Array.isArray(filters.status) && filters.status.length > 0) ||
  filters.created_at?.start ||
  filters.created_at?.end
);

export const buildRequestsServiceFilter = (filters = {}) => {
  const dateRange = filters.created_at || {};
  return {
    status: filters.status,
    search: filters.search,
    date_from: dateRange.start ? `${dateRange.start}T00:00:00.000Z` : undefined,
    date_to: dateRange.end ? `${dateRange.end}T23:59:59.999Z` : undefined,
  };
};

export const REQUEST_KPI_OPTIONS = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
  },
  {
    id: 'pending',
    label: 'Needs attention',
    icon: AlertCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/16 text-destructive shadow-e2',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
  },
  {
    id: 'active',
    label: 'Active',
    icon: Clock,
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-200',
  },
  {
    id: 'mine',
    label: 'Mine',
    icon: UserRound,
    colorClass: 'text-violet-600 dark:text-violet-200',
    activeClass: 'bg-violet-500/10 text-violet-700 shadow-e2 dark:text-violet-200',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-200',
  },
  {
    id: 'bed',
    label: 'Beds',
    icon: BedDouble,
    colorClass: 'text-cyan-600 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200',
  },
  {
    id: 'ambulance',
    label: 'Ambulance',
    icon: Ambulance,
    colorClass: 'text-sky-600 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-200',
  },
  {
    id: 'booking',
    label: 'Booking',
    icon: ClipboardCheck,
    colorClass: 'text-emerald-600 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
    restClass: 'bg-card/65 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-200',
  },
];

export const REQUEST_KPI_IMPORTANCE = {
  all: 0,
  pending: 1,
  active: 2,
  mine: 3,
  bed: 4,
  ambulance: 5,
  booking: 6,
};

export const REQUEST_PINNED_KPI_IDS = ['pending', 'active'];

export const REQUEST_STATUS_STYLES = {
  pending_approval: {
    label: 'Needs attention',
    className: 'bg-destructive/14 text-destructive shadow-e2',
  },
  in_progress: {
    label: 'Active',
    className: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  },
  arrived: {
    label: 'Arrived',
    className: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCheck,
    className: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted/40 text-muted-foreground',
  },
  payment_declined: {
    label: 'Payment issue',
    className: 'bg-destructive/14 text-destructive shadow-e2',
  },
};

export const REQUEST_SERVICE_ICON_MAP = {
  ambulance: Ambulance,
  bed: BedDouble,
  booking: ClipboardCheck,
};

export const REQUEST_STAGE_ORDER = ['pending_approval', 'accepted', 'arrived', 'in_progress', 'completed'];

export const REQUEST_STAGE_FILL = {
  pending_approval: 'bg-destructive',
  payment_declined: 'bg-destructive',
  accepted: 'bg-cyan-500',
  arrived: 'bg-sky-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

export const REQUEST_EMPTY_HEADINGS = {
  all: 'No requests yet',
  pending: 'Nothing needs attention',
  active: 'No active requests',
  bed: 'No bed requests',
  ambulance: 'No ambulance requests',
  mine: 'Nothing assigned to you',
};

export const REQUEST_TONE_CLASS = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const REQUEST_RAIL_PRIMARY_ACTION_CLASS = {
  review: 'bg-destructive text-white shadow-e2-strong hover:bg-destructive/90',
  dispatch: 'bg-sky-600 text-white shadow-e2-strong hover:bg-sky-500',
  complete: 'bg-emerald-600 text-white shadow-e2-strong hover:bg-emerald-500',
  details: 'bg-foreground text-background shadow-e2-strong hover:bg-foreground/90',
};

export const normalizeRequestCount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRequestInitials = (name = 'Request') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'R';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
};

export const formatRequestTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const getRequestStatusMeta = (request) => {
  const canonical = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  return REQUEST_STATUS_STYLES[canonical] || {
    label: 'New',
    className: 'bg-muted/40 text-muted-foreground',
  };
};

export const getRequestProjection = (request) => buildEmergencyRenderProjection(request || {});

export const getRequestAvatarClass = (request) => {
  const canonical = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  if (canonical === 'pending_approval' || canonical === 'payment_declined') {
    return 'bg-destructive/16 text-destructive';
  }
  if (canonical === 'completed') {
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  }
  if (canonical === 'cancelled') {
    return 'bg-muted/40 text-muted-foreground';
  }
  if (canonical === 'in_progress') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  }
  if (canonical === 'accepted') {
    return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  }
  if (canonical === 'arrived') {
    return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
  }
  return 'bg-muted/34 text-muted-foreground';
};

export const getRequestServiceLabel = (request) => {
  const raw = String(request?.service_type || 'request').replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getRequestKpiCount = ({ id, stats, requests = [] }) => {
  if (id === 'all') {
    return normalizeRequestCount(stats?.total, requests.length);
  }
  if (id === 'mine') {
    return normalizeRequestCount(stats?.mine, 0);
  }
  if (id === 'pending') {
    const rowCount = requests.filter((request) => request.status === 'pending_approval').length;
    return normalizeRequestCount(stats?.pending, rowCount);
  }
  if (id === 'active') {
    const rowCount = requests.filter((request) => isActiveEmergencyStatus(request.status)).length;
    return normalizeRequestCount(stats?.active, rowCount);
  }
  if (id === 'booking') {
    const rowCount = requests.filter((request) => request.service_type === 'booking').length;
    return normalizeRequestCount(stats?.booking, rowCount);
  }
  if (id === 'bed') {
    const rowCount = requests.filter((request) => request.service_type === 'bed').length;
    return normalizeRequestCount(stats?.bed, rowCount);
  }
  if (id === 'ambulance') {
    const rowCount = requests.filter((request) => request.service_type === 'ambulance').length;
    return normalizeRequestCount(stats?.ambulance, rowCount);
  }
  return normalizeRequestCount(stats?.total, requests.length);
};

export const getRequestSignal = ({ stats, requests = [], kpiFilter, loadError }) => {
  const activeId = kpiFilter || 'pending';
  const activeOption = REQUEST_KPI_OPTIONS.find((item) => item.id === activeId) || REQUEST_KPI_OPTIONS[0];
  const count = getRequestKpiCount({ id: activeOption.id, stats, requests });

  if (loadError && count === 0 && requests.length === 0) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Requests did not load',
      subhead: 'Retry to load the queue.',
    };
  }

  if (activeOption.id === 'pending') {
    const hasPending = count > 0;
    return {
      icon: hasPending ? AlertCircle : CheckCheck,
      tone: hasPending ? 'danger' : 'clear',
      label: hasPending ? 'Needs attention' : 'Clear',
      headline: hasPending ? `${count} request${count === 1 ? '' : 's'} to review` : 'No requests need review',
      subhead: hasPending ? 'Start with the newest item.' : 'Keep Requests open for new care needs.',
    };
  }

  if (activeOption.id === 'active') {
    return {
      icon: Clock,
      tone: 'warning',
      label: 'Active',
      headline: count > 0 ? `${count} active request${count === 1 ? '' : 's'}` : 'No active requests',
      subhead: count > 0 ? 'Check current care activity.' : 'Active requests will appear here.',
    };
  }

  if (activeOption.id === 'bed') {
    return {
      icon: BedDouble,
      tone: 'info',
      label: 'Beds',
      headline: count > 0 ? `${count} bed request${count === 1 ? '' : 's'}` : 'No bed requests',
      subhead: count > 0 ? 'Review facility needs first.' : 'Bed requests will appear here.',
    };
  }

  if (activeOption.id === 'booking') {
    return {
      icon: ClipboardCheck,
      tone: 'info',
      label: 'Booking',
      headline: count > 0 ? `${count} booking request${count === 1 ? '' : 's'}` : 'No booking requests',
      subhead: count > 0 ? 'Review scheduled care requests.' : 'Booking requests will appear here.',
    };
  }

  if (activeOption.id === 'mine') {
    return {
      icon: UserRound,
      tone: count > 0 ? 'primary' : 'muted',
      label: 'Mine',
      headline: count > 0 ? `${count} request${count === 1 ? '' : 's'} assigned to you` : 'Nothing assigned to you',
      subhead: count > 0 ? 'Start with your active run.' : 'Dispatches assigned to you will appear here.',
    };
  }

  if (activeOption.id === 'ambulance') {
    return {
      icon: Ambulance,
      tone: 'primary',
      label: 'Ambulance',
      headline: count > 0 ? `${count} ambulance request${count === 1 ? '' : 's'}` : 'No ambulance requests',
      subhead: count > 0 ? 'Check response state before acting.' : 'Ambulance requests will appear here.',
    };
  }

  return {
    icon: LayoutGrid,
    tone: 'muted',
    label: 'All',
    headline: count > 0 ? `${count} request${count === 1 ? '' : 's'}` : 'No requests yet',
    subhead: count > 0 ? 'Every request across services.' : 'New requests will appear here.',
  };
};

export const resolveRequestKpiActive = (item, count) => (
  item.id === 'pending' && count === 0
    ? {
        activeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
        colorClass: 'text-emerald-700 dark:text-emerald-200',
      }
    : null
);

export const getDefaultRequestKpi = (stats) => {
  const pending = normalizeRequestCount(stats?.pending_approval ?? stats?.pending, 0);
  const active = normalizeRequestCount(stats?.active, 0);
  if (pending > 0) return 'pending';
  if (active > 0) return 'active';
  return 'all';
};

export const getPrimaryRailAction = ({
  request,
  actionState,
  canManage,
  canCompleteAsProvider,
  onView,
  onDispatch,
  onComplete,
}) => {
  const status = canonicalizeEmergencyStatus(request?.status, null);
  if (status === 'pending_approval') {
    return {
      kind: 'review',
      label: 'Review',
      icon: ClipboardCheck,
      onClick: onView,
    };
  }
  if (canManage && actionState.canDispatch) {
    return {
      kind: 'dispatch',
      label: 'Dispatch',
      icon: Send,
      onClick: onDispatch,
    };
  }
  if ((canManage || canCompleteAsProvider) && actionState.canComplete) {
    return {
      kind: 'complete',
      label: 'Complete',
      icon: CheckCheck,
      onClick: onComplete,
    };
  }
  return {
    kind: 'details',
    label: 'Details',
    icon: Info,
    onClick: onView,
  };
};
