import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useEmergencyQuery } from '../../hooks/useEmergencyQuery';
import { useEmergencyMutations, applyOptimisticStatus } from '../../hooks/useEmergencyMutations';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import {
  cancelEmergencyRequest,
  EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
  getEmergencyRequest,
} from '../../services/emergencyService';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { Button } from '../ui/button';
// Console design system: the workspace grammar lives in shared components --
// pages compose the canon instead of re-remembering it. This page is the DONOR
// (the components carry its own markup verbatim), so adoption is zero-visual.
import { WorkspaceStage, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, getFilterTriggerState } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, CopyChip, DetailLine, StageStrip, EmptyState } from '../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { toast } from 'sonner';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import {
  AlertCircle,
  Ambulance,
  BedDouble,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Filter as FilterIcon,
  Hospital,
  Info,
  LayoutGrid,
  Loader2,
  MapPin,
  Send,
  Trash2,
  UserRound,
  Wallet
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FilterSheet } from '../common/FilterSheet';
import { BulkActionBar } from '../common/BulkActionBar';
import { Checkbox } from '../ui/checkbox';
import { MobileEmergency } from '../mobile/MobileEmergency';
import { SEOHead } from '../common/SEOHead';
import { canonicalizeEmergencyStatus, isActiveEmergencyStatus } from '../../utils/emergencyStatus';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import {
  buildEmergencyRenderProjection,
  formatEmergencyServiceToken,
  isCashPaymentMethod,
} from '../../utils/emergencyRequestMapper';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useLocation } from 'react-router-dom';

const EMPTY_REQUEST_FILTERS = Object.freeze({
  search: '',
  status: [],
  created_at: { start: '', end: '' },
});

const hasActiveRequestFilters = (filters = {}) => Boolean(
  filters.search ||
  (Array.isArray(filters.status) && filters.status.length > 0) ||
  filters.created_at?.start ||
  filters.created_at?.end
);

const buildRequestsServiceFilter = (filters = {}) => {
  const dateRange = filters.created_at || {};
  return {
    status: filters.status,
    search: filters.search,
    date_from: dateRange.start ? `${dateRange.start}T00:00:00.000Z` : undefined,
    date_to: dateRange.end ? `${dateRange.end}T23:59:59.999Z` : undefined,
  };
};

const kpiOptions = [
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
    // Responder persona chip (drivers): requests where responder_id = me. Only
    // rendered when includeMine (isDriver) — see selectPrimaryKpis.
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

// Canon: AT MOST 3 chips, data-driven smart context, Today-matched tile spec --
// the strip architecture now lives in the shared KpiStrip (S1.2); the page keeps
// only the DOMAIN inputs: options, importance, pins, counts.
const KPI_IMPORTANCE = { all: 0, pending: 1, active: 2, mine: 3, bed: 4, ambulance: 5, booking: 6 };

const statusStyles = {
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

const serviceIconMap = {
  ambulance: Ambulance,
  bed: BedDouble,
  booking: ClipboardCheck,
};

const normalizeCount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getInitials = (name = 'Request') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'R';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
};

const formatRequestTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Day-aware timestamp: clock-time alone made a 3-week-old request read like today's.
// today -> "2:14 PM"; yesterday -> "Yesterday, 2:14 PM"; this year -> "Jun 18, 2:14 PM";
// older -> "Jun 18, 2025".
const formatRequestDayTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDelta === 0) return time;
  if (dayDelta === 1) return `Yesterday, ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Canonical lifecycle stages for the rail's compact progression strip:
// [Needs attention, Accepted, Arrived, Active, Completed]. Cancelled renders all-muted.
const REQUEST_STAGE_ORDER = ['pending_approval', 'accepted', 'arrived', 'in_progress', 'completed'];
const REQUEST_STAGE_FILL = {
  pending_approval: 'bg-destructive',
  payment_declined: 'bg-destructive',
  accepted: 'bg-cyan-500',
  arrived: 'bg-sky-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

// Payment states that mean cash has been settled — anything else on a cash request
// stays visibly flagged for the operator.
const SETTLED_PAYMENT_STATUSES = new Set(['settled', 'succeeded', 'completed', 'paid']);
const isUnsettledCashRequest = (request) => (
  isCashPaymentMethod(request?.payment_method) &&
  !SETTLED_PAYMENT_STATUSES.has(String(request?.payment_status || '').toLowerCase())
);

// Filter-aware empty headings: the generic line only fits when no KPI narrows the list.
const REQUEST_EMPTY_HEADINGS = {
  all: 'No requests yet',
  pending: 'Nothing needs attention',
  active: 'No active requests',
  bed: 'No bed requests',
  ambulance: 'No ambulance requests',
  mine: 'Nothing assigned to you',
};

const getStatusMeta = (request) => {
  const canonical = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  return statusStyles[canonical] || {
    label: 'New',
    className: 'bg-muted/40 text-muted-foreground',
  };
};

const getRequestProjection = (request) => buildEmergencyRenderProjection(request || {});

const getRequestAvatarClass = (request) => {
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

const getServiceLabel = (request) => {
  const raw = String(request?.service_type || 'request').replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getKpiCount = ({ id, stats, requests }) => {
  if (id === 'all') {
    return normalizeCount(stats?.total, requests.length);
  }
  if (id === 'mine') {
    return normalizeCount(stats?.mine, 0);
  }
  if (id === 'pending') {
    const rowCount = requests.filter((request) => request.status === 'pending_approval').length;
    return normalizeCount(stats?.pending, rowCount);
  }
  if (id === 'active') {
    const rowCount = requests.filter((request) => isActiveEmergencyStatus(request.status)).length;
    return normalizeCount(stats?.active, rowCount);
  }
  if (id === 'booking') {
    const rowCount = requests.filter((request) => request.service_type === 'booking').length;
    return normalizeCount(stats?.booking, rowCount);
  }
  if (id === 'bed') {
    const rowCount = requests.filter((request) => request.service_type === 'bed').length;
    return normalizeCount(stats?.bed, rowCount);
  }
  if (id === 'ambulance') {
    const rowCount = requests.filter((request) => request.service_type === 'ambulance').length;
    return normalizeCount(stats?.ambulance, rowCount);
  }
  return normalizeCount(stats?.total, requests.length);
};

const getRequestSignal = ({ stats, requests, kpiFilter, loadError }) => {
  const activeId = kpiFilter || 'pending';
  const activeOption = kpiOptions.find((item) => item.id === activeId) || kpiOptions[0];
  const count = getKpiCount({ id: activeOption.id, stats, requests });

  // A failed load with nothing cached must not render a reassuring zero-derived
  // "all clear" hero above the list error state; surface the failure honestly.
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

  // Neutral fallback for 'all' (and any unexpected id) — never silently the
  // Ambulance signal. Count semantics stay the total across every service.
  return {
    icon: LayoutGrid,
    tone: 'muted',
    label: 'All',
    headline: count > 0 ? `${count} request${count === 1 ? '' : 's'}` : 'No requests yet',
    subhead: count > 0 ? 'Every request across services.' : 'New requests will appear here.',
  };
};

// Smart-context selection (pin-while-signal, count-desc fill, max 3) now lives in
// the shared KpiStrip's selectPrimaryKpis; the page keeps only the pinned ids.
const PINNED_KPI_IDS = ['pending', 'active'];

// Selected-state override for the shared strip: a zero-count "Needs attention"
// chip renders as the emerald all-clear instead of the destructive tone.
const resolveRequestKpiActive = (item, count) => (
  item.id === 'pending' && count === 0
    ? {
        activeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
        colorClass: 'text-emerald-700 dark:text-emerald-200',
      }
    : null
);

const getDefaultRequestKpi = (stats) => {
  const pending = normalizeCount(stats?.pending_approval ?? stats?.pending, 0);
  const active = normalizeCount(stats?.active, 0);

  // Default resolves to a chip that will actually render; falls back to All, never a
  // zero-count actionable chip.
  if (pending > 0) return 'pending';
  if (active > 0) return 'active';
  return 'all';
};

const requestToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

const railPrimaryActionClass = {
  review: 'bg-destructive text-white shadow-e2-strong hover:bg-destructive/90',
  dispatch: 'bg-sky-600 text-white shadow-e2-strong hover:bg-sky-500',
  complete: 'bg-emerald-600 text-white shadow-e2-strong hover:bg-emerald-500',
  details: 'bg-foreground text-background shadow-e2-strong hover:bg-foreground/90',
};

export const EmergencyRequestsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver, profile, user, loading: authLoading } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();

  const currentUser = useMemo(() => ({
    isAdmin: () => isAdmin(),
    isOrgAdmin: () => isOrgAdmin(),
    isProvider: () => isProvider(),
    user,
    profile
  }), [isAdmin, isOrgAdmin, isProvider, user, profile]);

  // Requests stats are mirrored from the React Query page projection (below) ONLY
  // to seed the KPI default (getDefaultRequestKpi) and the analytics/signal panels.
  // The Requests LIST + count are read straight from the ['emergency', filter]
  // cache via useEmergencyQuery - there is no parallel list store any more.
  const [requestStats, setRequestStats] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [focusedRequestId, setFocusedRequestId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_REQUEST_FILTERS);
  const [kpiFilter, setKpiFilter] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Cancel'
  });
  const [completeModal, setCompleteModal] = useState({ open: false, request: null });
  // Wayfinding dock: first-click-wins navigation with the pressed-pill feedback
  // window comes from the shared stage (useWayfindingNav).
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const queryClient = useQueryClient();
  const pagination = usePagination(20);
  const authReady = Boolean(user?.id && profile?.role) && !authLoading;
  const selectedKpiFilter = useMemo(
    () => kpiFilter || getDefaultRequestKpi(requestStats),
    [kpiFilter, requestStats]
  );
  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    // Mirror TodayHome's useRoleKind: responder providers resolve to the driver lens.
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isOrgAdmin, isProvider, isDriver]);
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const getEmergencyLabel = useCallback((request) => (
    request?.display_id ||
    request?.hospital_name ||
    request?.service_type ||
    'selected request'
  ), []);

  // Read path: React Query (S3 migration; mirrors DoctorsPage/SupportTicketsPage).
  // The route-owned page projection (getEmergencyRequestsPage) now flows through
  // useEmergencyQuery, so the ['emergency', queryFilter] cache is the single store:
  // this page reads it, the dispatch/complete/cancel mutations settle it, and
  // realtime invalidates it. The KPI pill and sheet filters compose into one server
  // filter; stats stay KPI-agnostic (getEmergencyRequestsPage strips kpiFilter for
  // its stats query) so the KPI counts stay stable while the list narrows.
  const queryFilter = useMemo(() => ({
    ...buildRequestsServiceFilter(filters),
    kpiFilter: selectedKpiFilter,
    limit: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [
    filters,
    selectedKpiFilter,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const {
    requests,
    count,
    stats,
    loading: queryLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useEmergencyQuery(queryFilter, { enabled: authReady });

  // Hold the shell in its loading state until auth resolves, so the disabled query
  // (enabled: authReady) does not flash an empty list before the first real fetch.
  const loading = !authReady || queryLoading;
  // RQ error object -> honest generic copy; the raw error (often Postgres/SQL text)
  // goes to the console only and never reaches the UI (data-sync audit S9.2).
  const loadError = queryError ? 'Check your connection and try again.' : null;
  useEffect(() => {
    if (queryError) console.error('[requests] load failed:', queryError);
  }, [queryError]);
  // fetchRequests is now the RQ refetch (Retry on desktop, pull-to-refresh on
  // mobile, modal-close reconcile, and the not-ready action guards).
  const fetchRequests = refetch;

  // Mirror the RQ page stats into local state to seed the KPI default and feed the
  // analytics/signal panels. Stats are KPI-agnostic, so this feedback converges to
  // a stable default without a fetch loop.
  useEffect(() => {
    setRequestStats(stats || null);
  }, [stats]);

  // Keep the shared pagination store's total in sync with the RQ count.
  useEffect(() => {
    pagination.setTotalCount(count || 0);
  }, [count, pagination.setTotalCount]);

  // Keep the open detail/selection pointer fresh as the cache updates, without
  // storing a second copy of the row (derived via useMemo, never stored).
  const activeDetailRequest = useMemo(() => {
    if (!selectedRequest?.id) return selectedRequest;
    return requests.find((row) => row.id === selectedRequest.id) || selectedRequest;
  }, [requests, selectedRequest]);

  // Write path: dispatch/complete/cancel route through their EXISTING reused RPC
  // service fns wrapped by useEmergencyMutations (onMutate snapshot -> optimistic
  // status setQueryData -> onError rollback -> onSettled invalidateQueries(['emergency'])).
  // The page never bypasses these service fns and never writes the table directly.
  const dispatchMutation = useEmergencyMutations({
    mutationFn: ({ id, request }) => dispatchEmergency(id, request),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'accepted'),
    filter: queryFilter,
  });
  const completeMutation = useEmergencyMutations({
    mutationFn: ({ id, request }) => completeEmergency(id, request),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'completed'),
    filter: queryFilter,
  });
  const cancelMutation = useEmergencyMutations({
    mutationFn: ({ id, reason }) => cancelEmergencyRequest(id, reason),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'cancelled'),
    filter: queryFilter,
  });

  // Realtime: an emergency_requests / payments change invalidates the ['emergency']
  // cache (the single Requests store) instead of a manual refetch. Any mounted
  // useEmergencyQuery observer converges on the next fetch. This page channel is
  // additive to PageDataContext (which also invalidates on emergency_requests); it
  // additionally covers the payments table for the retry-payment flow.
  // A brand-new request also announces itself (a fresh pending emergency used to land
  // silently); the toast is throttled to at most one per 10s so an insert burst
  // cannot stack toasts over the operator.
  const lastInsertToastAtRef = useRef(0);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel('emergency_requests_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, () => {
        if (active) queryClient.invalidateQueries({ queryKey: ['emergency'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_requests' }, (payload) => {
        if (!active || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        const serviceLabel = payload?.new?.service_type ? getServiceLabel(payload.new) : '';
        toast('New request received', serviceLabel ? { description: serviceLabel } : undefined);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        if (active) queryClient.invalidateQueries({ queryKey: ['emergency'] });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleCreateEmergency = useCallback(() => {
    setSelectedRequest(null);
    setIsEmergencyModalOpen(true);
  }, []);

  const handleOpenAnalytics = useCallback(() => {
    if (!requestStats) {
      const loadedCount = requests.length;
      toast.info('Statistics unavailable', {
        description: loadedCount > 0
          ? `${loadedCount} loaded request${loadedCount === 1 ? '' : 's'} are a preview, not complete statistics.`
          : 'Statistics are unavailable until the server summary loads.'
      });
      return;
    }
    setAnalyticsModalOpen(true);
  }, [requestStats, requests.length]);

  useEffect(() => {
    const handleOpenModal = () => handleCreateEmergency();
    const handleOpenFilters = () => setFilterSheetOpen(true);

    window.addEventListener('openEmergencyModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openEmergencyModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateEmergency, handleOpenAnalytics]);

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search requests',
      placeholder: 'Search by request ID, facility, responder, or type...'
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
      ]
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
        { label: 'This month', value: 'month' }
      ]
    }
  ], []);

  const hasFilter = hasActiveRequestFilters(filters);
  const filterTriggerState = getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter });

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      data-state={filterTriggerState}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter requests"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <FilterIcon className="h-4 w-4" />
      {/* Neutral-shadow law: the dot lost its colored glow on DS adoption (the
          documented self-debt); the sky dot itself stays (Visits precedent). */}
      {hasFilter && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, filterTriggerState, hasFilter]);

  const headerActions = useMemo(() => {
    if (currentUser.isAdmin() || currentUser.isOrgAdmin()) {
      return (
        <Button
          onClick={handleCreateEmergency}
          data-state={isEmergencyModalOpen ? 'open' : 'idle'}
          className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
          aria-label="Create new request"
          aria-haspopup="dialog"
          aria-expanded={isEmergencyModalOpen}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          New request
        </Button>
      );
    }
    return null;
  }, [handleCreateEmergency, currentUser, isEmergencyModalOpen]);

  usePageHeader(
    'Requests',
    headerActions,
    null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const focusedRequest = useMemo(() => (
    requests.find((request) => request.id === focusedRequestId) || requests[0] || null
  ), [requests, focusedRequestId]);

  const requestPanelContext = useMemo(() => ({
    stats: requestStats || {},
    recent: requests.slice(0, 4),
    focusedRequest,
    count: pagination.totalCount || requests.length,
    loading,
    errorMessage: loadError,
    currentState: selectedKpiFilter,
    hasFilters: hasFilter,
    canCreate: currentUser.isAdmin() || currentUser.isOrgAdmin(),
  }), [
    currentUser,
    focusedRequest,
    hasFilter,
    selectedKpiFilter,
    loadError,
    loading,
    pagination.totalCount,
    requestStats,
    requests,
  ]);

  const publishEmergencyRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('emergencyRouteContextUpdated', {
      detail: requestPanelContext,
    }));
  }, [requestPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishEmergencyRouteContext();
    window.addEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);

    return () => {
      window.removeEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);
    };
  }, [publishEmergencyRouteContext]);

  const handleDelete = useCallback(async (request) => {
    if (!getEmergencyActionState(request).canCancel) {
      toast.info('This request is already closed.');
      await fetchRequests();
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Cancel request',
      description: `Cancel ${getEmergencyLabel(request)}? This cannot be undone.`,
      onConfirm: async () => {
        // The cancel is authoritative. Only a cancel failure may report failure.
        // Routed through the reused console_cancel_emergency RPC (cancelEmergencyRequest)
        // wrapped by the mutation, whose onSettled invalidates ['emergency'].
        try {
          await cancelMutation.mutateAsync({ id: request.id, reason: 'cancelled_from_console' });
        } catch (error) {
          console.error('Error cancelling request:', error);
          toast.error(error.message || 'Failed to cancel request');
          return; // genuinely failed - keep the modal open, do not refresh
        }
        // Cancel committed. The notification is best-effort: a notification failure
        // must NOT report a committed cancel as failed (the false-negative bug).
        try {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CANCELLED,
            request.id,
            { message: 'Request has been cancelled' }
          );
        } catch (notifyError) {
          console.warn('Cancel succeeded but notification failed:', notifyError);
        }
        toast.success('Request cancelled');
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'destructive',
      confirmLabel: 'Cancel request'
    });
  }, [cancelMutation.mutateAsync, fetchRequests, getEmergencyLabel]);

  // Column-sort toggle for the list header. Same idiom as VisitsPage/HospitalsPage:
  // a new key sorts ascending; re-tapping the active key flips direction. The plumbing
  // (sortConfig -> queryFilter.sortKey/sortDirection) already feeds the service.
  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Drop any selected id that has left the current list (e.g. after a cancel settles
  // and the row disappears). Returning the same reference when nothing changed keeps
  // this from looping.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => requests.some((row) => row.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [requests]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Shift-click range select: Checkbox onCheckedChange has no native event, so the
  // checkbox onClick (which fires first) stashes shiftKey in a ref; the toggle then
  // reads it together with the last-toggled index anchor to expand over the range.
  const shiftSelectRef = useRef({ shiftKey: false, lastIndex: -1 });

  const handleSelectClick = useCallback((event) => {
    shiftSelectRef.current.shiftKey = Boolean(event?.shiftKey);
    event?.stopPropagation?.();
  }, []);

  const handleToggleSelect = useCallback((id, checked) => {
    const index = requests.findIndex((row) => row.id === id);
    const { shiftKey, lastIndex } = shiftSelectRef.current;
    shiftSelectRef.current = { shiftKey: false, lastIndex: index };

    if (shiftKey && index !== -1 && lastIndex !== -1 && lastIndex !== index) {
      const start = Math.min(lastIndex, index);
      const end = Math.max(lastIndex, index);
      const rangeIds = requests.slice(start, end + 1).map((row) => row.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rangeId) => {
          if (checked) next.add(rangeId);
          else next.delete(rangeId);
        });
        return Array.from(next);
      });
      return;
    }

    setSelectedIds((prev) => (
      checked
        ? (prev.includes(id) ? prev : [...prev, id])
        : prev.filter((selectedId) => selectedId !== id)
    ));
  }, [requests]);

  // Select-all covers EVERY visible row (Users-page parity). Bulk cancel then acts only on
  // the cancellable (non-terminal) subset — see executeBulkCancel / cancellableSelectedCount.
  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? requests.map((row) => row.id) : []);
  }, [requests]);

  // Bulk cancel loops the SAME reused console_cancel_emergency RPC path as the single
  // cancel (cancelMutation.mutateAsync); it never introduces a parallel service call.
  // Each cancel is authoritative and best-effort notified, exactly like handleDelete.
  const executeBulkCancel = useCallback(async () => {
    setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    const targets = requests.filter(
      (row) => selectedIds.includes(row.id) && getEmergencyActionState(row).canCancel
    );
    if (targets.length === 0) {
      clearSelection();
      return;
    }

    toast.loading(`Cancelling ${targets.length} request${targets.length === 1 ? '' : 's'}...`, { id: 'bulk-cancel' });
    let failed = 0;
    for (const request of targets) {
      try {
        await cancelMutation.mutateAsync({ id: request.id, reason: 'cancelled_from_console' });
        try {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CANCELLED,
            request.id,
            { message: 'Request has been cancelled' }
          );
        } catch (notifyError) {
          console.warn('Cancel succeeded but notification failed:', notifyError);
        }
      } catch (error) {
        console.error('Bulk cancel failed for request:', request.id, error);
        failed += 1;
      }
    }

    clearSelection();
    if (failed > 0) {
      toast.error(`${failed} cancel${failed === 1 ? '' : 's'} failed`, { id: 'bulk-cancel' });
    } else {
      toast.success(`${targets.length} request${targets.length === 1 ? '' : 's'} cancelled`, { id: 'bulk-cancel' });
    }
  }, [requests, selectedIds, cancelMutation.mutateAsync, clearSelection]);

  // Of the selected rows, how many are actually cancellable (non-terminal). Select-all
  // selects everything, but only these get cancelled.
  const cancellableSelectedCount = useMemo(
    () => requests.filter((row) => selectedIds.includes(row.id) && getEmergencyActionState(row).canCancel).length,
    [requests, selectedIds]
  );

  const handleBulkCancel = useCallback(() => {
    if (cancellableSelectedCount === 0) return;
    setConfirmationModal({
      isOpen: true,
      title: 'Cancel requests',
      description: `Cancel ${cancellableSelectedCount} cancellable request${cancellableSelectedCount === 1 ? '' : 's'}? Completed and cancelled ones are skipped. This cannot be undone.`,
      onConfirm: executeBulkCancel,
      variant: 'destructive',
      confirmLabel: 'Cancel requests',
    });
  }, [cancellableSelectedCount, executeBulkCancel]);

  const handleViewDetails = useCallback((request) => {
    setFocusedRequestId(request?.id || null);
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  }, []);

  const openedDeepLinkRef = useRef(null);
  useEffect(() => {
    const requestId = new URLSearchParams(location.search).get('id');
    if (!requestId || !authReady || openedDeepLinkRef.current === requestId) return undefined;

    const loadedRequest = requests.find((request) => request.id === requestId || request.display_id === requestId);
    if (loadedRequest) {
      openedDeepLinkRef.current = requestId;
      handleViewDetails(loadedRequest);
      return undefined;
    }

    let active = true;
    openedDeepLinkRef.current = requestId;
    getEmergencyRequest(requestId)
      .then((request) => {
        if (!active) return;
        if (!request) {
          toast.info('Request is unavailable in your current scope.');
          return;
        }
        handleViewDetails(request);
      })
      .catch(() => {
        if (!active) return;
        openedDeepLinkRef.current = null;
        toast.error('Failed to load request details.');
      });

    return () => {
      active = false;
    };
  }, [authReady, handleViewDetails, location.search, requests]);

  const handleCloseEmergencyModal = () => {
    setIsEmergencyModalOpen(false);
    fetchRequests();
  };

  const handleDispatch = useCallback(async (request) => {
    const actionState = getEmergencyActionState(request);
    if (!actionState.canDispatch) {
      toast.info('This request is not ready to dispatch. Refreshing list...');
      await fetchRequests();
      return;
    }

    try {
      toast.loading('Dispatching request...', { id: 'dispatch' });
      // Reused console_dispatch_emergency RPC (dispatchEmergency) wrapped by the
      // mutation; onSettled invalidates ['emergency'] so no manual refetch here.
      const result = await dispatchMutation.mutateAsync({ id: request.id, request });
      toast.success('Request dispatched', { id: 'dispatch' });
      toast.info(`Responder: ${result.assignments.ambulance?.type || 'Assigned'}`, { duration: 3000 });
    } catch (error) {
      console.error('Dispatch failed:', error);
      const message = String(error?.message || '');
      if (
        message.toLowerCase().includes('terminal emergency request') ||
        message.toLowerCase().includes('cannot dispatch before cash approval')
      ) {
        toast.info(message || 'Request state changed. Refreshing list.', { id: 'dispatch' });
        await fetchRequests();
        return;
      }
      // Surface the real server reason ("No available ambulance", "Ambulance is
      // currently assigned to another request", ...) instead of masking it, so the
      // operator knows why and does not retry blindly into the same collision.
      toast.error(message || 'Failed to dispatch request', { id: 'dispatch' });
    }
  }, [dispatchMutation.mutateAsync, fetchRequests]);

  const canCurrentActorCompleteRequest = useCallback((request) => {
    const actionState = getEmergencyActionState(request);
    if (!actionState.canComplete) return false;
    if (isAdmin() || isOrgAdmin()) return true;
    return isProvider() && Boolean(user?.id) && request?.responder_id === user.id;
  }, [isAdmin, isOrgAdmin, isProvider, user?.id]);

  const handleComplete = useCallback((request) => {
    if (!canCurrentActorCompleteRequest(request)) {
      toast.info('Only the assigned responder can complete this request.');
      return;
    }
    setCompleteModal({ open: true, request });
  }, [canCurrentActorCompleteRequest]);

  const executeComplete = useCallback(async (request) => {
    setCompleteModal({ open: false, request: null });
    if (!canCurrentActorCompleteRequest(request)) {
      toast.info('Only the assigned responder can complete this request.');
      return;
    }
    try {
      // Reused console_complete_emergency RPC (completeEmergency) wrapped by the
      // mutation; onSettled invalidates ['emergency'] so no manual refetch here.
      await completeMutation.mutateAsync({ id: request.id, request });

      if (isCashPaymentMethod(request.payment_method) && request.payment_status !== 'completed') {
        toast.warning('Cash follow-up needed', {
          description: 'Completion was saved. Cash settlement is handled in Finance.'
        });
      } else {
        toast.success('Request completed');
      }
    } catch (error) {
      console.error('Complete failed:', error);
      toast.error(error?.message || 'Failed to complete request');
    }
  }, [canCurrentActorCompleteRequest, completeMutation.mutateAsync]);

  const handleProcessCash = useCallback(() => {
    toast.info('Cash settlement is not ready here yet', {
      description: 'The finance receiver pass still owns this action.'
    });
  }, []);

  const handleRetryPaymentUnavailable = useCallback(() => {
    toast.info('Payment retry unavailable', {
      description: EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
    });
    return false;
  }, []);

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Requests" description="Review requests and route care from one place." />

      {isMobile ? (
        <MobileEmergency
          emergencies={requests}
          loading={loading}
          isFetching={isFetching}
          statistics={requestStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleViewDetails}
          onDispatch={handleDispatch}
          onComplete={handleComplete}
          onProcessCash={handleProcessCash}
          onRetryPayment={handleRetryPaymentUnavailable}
          onRefresh={fetchRequests}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin() || isOrgAdmin()}
          onOpenFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          currentPage={pagination.currentPage}
          loadError={loadError}
          onRetry={fetchRequests}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
          selectionEnabled={isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onBulkCancel={handleBulkCancel}
          cancellableCount={cancellableSelectedCount}
        />
      ) : (
        <RequestsDesktopWorkspace
          requests={requests}
          loading={loading}
          isFetching={isFetching}
          includeMine={isDriver()}
          dispatchPending={dispatchMutation.isPending}
          completePending={completeMutation.isPending}
          stats={requestStats}
          filters={filters}
          setFilters={setFilters}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
          focusedRequest={focusedRequest}
          setFocusedRequestId={setFocusedRequestId}
          currentUser={currentUser}
          onView={handleViewDetails}
          onDelete={handleDelete}
          onDispatch={handleDispatch}
          onComplete={handleComplete}
          onProcessCash={handleProcessCash}
          pagination={pagination}
          openFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          filterTriggerState={filterTriggerState}
          loadError={loadError}
          onRetry={fetchRequests}
          moduleRailItems={visibleModuleRail}
          routingPath={routingPath}
          onRailNavigate={handleRailNavigate}
          selectable={currentUser.isAdmin()}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectClick={handleSelectClick}
          onSelectAll={handleSelectAll}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}

      {!isMobile && currentUser.isAdmin() && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBulkCancel}
            disabled={cancelMutation.isPending || cancellableSelectedCount === 0}
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
            title={cancellableSelectedCount === 0 ? 'No cancellable requests selected' : `Cancel ${cancellableSelectedCount} cancellable request${cancellableSelectedCount === 1 ? '' : 's'}`}
            aria-label={cancellableSelectedCount === 0 ? 'No cancellable requests selected' : `Cancel ${cancellableSelectedCount} cancellable requests`}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <EmergencyDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={(shouldRefresh) => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
          if (shouldRefresh === true) {
            fetchRequests();
          }
        }}
        request={activeDetailRequest}
      />

      <EmergencyRequestModal
        isOpen={isEmergencyModalOpen}
        onClose={handleCloseEmergencyModal}
        request={selectedRequest}
        mode="create"
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        resetValues={EMPTY_REQUEST_FILTERS}
        resetLabel="Clear"
        title="Filters"
        description="Filter Requests by search, status, and date range."
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={requestStats}
        type="emergency"
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
        isLoading={cancelMutation.isPending}
      />

      <ConfirmationModal
        isOpen={completeModal.open}
        onClose={() => setCompleteModal({ open: false, request: null })}
        onConfirm={() => executeComplete(completeModal.request)}
        title="Mark request complete"
        description="Mark this request complete and free assigned resources?"
        variant="default"
        confirmLabel="Mark complete"
      />

    </div>
  );
};

const RequestsDesktopWorkspace = ({
  requests,
  loading,
  isFetching = false,
  includeMine = false,
  dispatchPending = false,
  completePending = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedRequest,
  setFocusedRequestId,
  currentUser,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
  pagination,
  openFilters,
  filterSheetOpen,
  filterTriggerState,
  loadError,
  onRetry,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  sortConfig,
  onSort,
}) => {
  const signal = getRequestSignal({ stats, requests, kpiFilter, loadError });
  const hasFilter = hasActiveRequestFilters(filters);
  const failedEmpty = Boolean(loadError) && requests.length === 0;
  const allSelected = selectable && requests.length > 0
    && requests.every((row) => selectedIds.includes(row.id));
  const someSelected = selectable && !allSelected && selectedIds.length > 0;
  const listScrollRef = useRef(null);
  // 'Mine' (responder_id = me) only exists for responder personas (drivers); the
  // pool is filtered BEFORE the shared strip ranks and selects chips.
  const kpiPool = includeMine ? kpiOptions : kpiOptions.filter((option) => option.id !== 'mine');

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: requests,
    focusedItem: focusedRequest,
    setFocusedId: setFocusedRequestId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-request-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/emergencies"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <RequestDetailRail
          request={focusedRequest}
          currentUser={currentUser}
          loading={loading}
          hasFilter={hasFilter}
          dispatchPending={dispatchPending}
          completePending={completePending}
          onView={onView}
          onDelete={onDelete}
          onDispatch={onDispatch}
          onComplete={onComplete}
          onProcessCash={onProcessCash}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={requestToneClass}>
        <KpiStrip
          options={kpiPool}
          getCount={(id) => getKpiCount({ id, stats, requests })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_KPI_IDS}
          importance={KPI_IMPORTANCE}
          defaultId="pending"
          dataAttr="data-request-kpi"
          resolveActive={resolveRequestKpiActive}
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="requests"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchPlaceholder="Search by request ID, facility, responder, or type..."
            searchTestId="requests-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="requests"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Requests list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <RequestListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}
          {!loading && loadError && requests.length === 0 && (
            <RequestLoadErrorState message={loadError} onRetry={onRetry} />
          )}
          {!loading && loadError && requests.length > 0 && (
            <RequestLoadNotice message={loadError} onRetry={onRetry} />
          )}
          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={ClipboardCheck}
              heading={hasFilter ? 'No matching requests' : (REQUEST_EMPTY_HEADINGS[kpiFilter] || 'No requests yet')}
              body={hasFilter ? 'Change filters or search again.' : 'New requests will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={openFilters}
                  data-state={filterTriggerState}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                  aria-haspopup="dialog"
                  aria-expanded={filterSheetOpen}
                >
                  Change filters
                </Button>
              )}
              {!hasFilter && kpiFilter && kpiFilter !== 'all' && (
                <Button
                  variant="ghost"
                  onClick={() => setKpiFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all requests
                </Button>
              )}
            </EmptyState>
          )}
          {/* Replace-in-place (lessons #15): the skeleton holds the exact final layout and
              rows swap in instantly -- no per-row stagger/translate entrance (that top-to-
              bottom cascade IS the "stacking" skew). layout="position" on the row keeps
              sort/removal reflow smooth without entrance motion. */}
          {!loading && requests.length > 0 && (
            requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                selected={focusedRequest?.id === request.id}
                onFocus={() => setFocusedRequestId(request.id)}
                onView={onView}
                selectable={selectable}
                checked={selectedIds.includes(request.id)}
                onToggleSelect={onToggleSelect}
                onSelectClick={onSelectClick}
              />
            ))
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const RequestLoadErrorState = ({ message, onRetry }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-destructive/10 p-10 text-center shadow-e2">
    <AlertCircle className="mb-4 h-12 w-12 text-destructive/75" />
    <h3 className="text-xl font-semibold">Requests did not load</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">
      {message || 'Try again to refresh this list.'}
    </p>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="mt-5 rounded-pill bg-destructive/10 px-5 font-semibold text-destructive transition-all hover:bg-destructive/15 active:scale-95"
    >
      Retry
    </Button>
  </div>
);

const RequestLoadNotice = ({ message, onRetry }) => (
  <div className="mb-3 flex flex-col gap-3 rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-e2 sm:flex-row sm:items-center sm:justify-between">
    <span className="font-medium">{message || 'Requests could not refresh.'}</span>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/15"
    >
      Retry
    </Button>
  </div>
);

// Person | Status | Service | Facility | Time | Action — status owns its own column
// (it used to hide stacked inside the Facility cell, under a header that lied).
const REQUEST_GRID_COLS = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';
const REQUEST_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';

const RequestListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? REQUEST_GRID_COLS_SELECT : REQUEST_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all requests'}
        className="h-4 w-4"
      />
    )}
    {/* Person / Service / Facility are plain labels — sorting them alphabetically isn't
        practical operationally, and Person has no scalar column to sort on (name lives in
        patient_snapshot JSON). Only Time is a meaningful sort. Service/facility filtering
        belongs in the FilterSheet. */}
    <span>Person</span>
    <span>Status</span>
    <span>Service</span>
    <span>Facility</span>
    <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const RequestRow = ({ request, selected, onFocus, onView, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const projection = getRequestProjection(request);
  const status = getStatusMeta(request);
  const ServiceIcon = serviceIconMap[request?.service_type] || ClipboardCheck;
  const patientName = projection.patientDisplay.name;
  const patientPhone = projection.patientDisplay.phone;
  const facilityName = projection.facilityDisplay.name;
  const serviceLabel = getServiceLabel(request);
  const rowAvatarClass = getRequestAvatarClass(request);
  const canonicalStatus = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  const showResponderHint = (
    (canonicalStatus === 'accepted' || canonicalStatus === 'arrived' || canonicalStatus === 'in_progress') &&
    projection.responderDisplay.hasResponder
  );
  const showCashChip = isUnsettledCashRequest(request);

  return (
    <motion.div
      layout="position"
      className={`group mb-2 grid min-h-[80px] ${selectable ? REQUEST_GRID_COLS_SELECT : REQUEST_GRID_COLS} items-center gap-2 rounded-card px-4 py-3.5 transition-[background,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'bg-card/88 shadow-e2-strong dark:bg-white/[0.08]' : 'bg-card/50 hover:-translate-y-0.5 hover:bg-card/72 hover:shadow-e2 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]'}`}
      data-request-row={request.id}
      data-state={selected ? 'selected' : 'idle'}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onView(request);
      }}
      onContextMenu={(event) => {
        // Cheap context-menu stand-in: right-click focuses the row so the rail (the
        // action home) reflects it. Full shadcn ContextMenu integration is deferred
        // to keep the row's button semantics intact.
        event.preventDefault();
        onFocus();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      aria-pressed={selected}
      aria-label={`${selected ? 'Selected' : 'Open'} ${patientName}`}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(request.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect request from ${patientName}` : `Select request from ${patientName}`}
          className="h-4 w-4"
        />
      )}
      <div className="flex min-w-0 items-center gap-3">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-pill text-sm font-semibold ${rowAvatarClass}`}>
          <span aria-hidden="true">{getInitials(patientName)}</span>
          {projection.patientDisplay.avatar && (
            <img
              src={projection.patientDisplay.avatar}
              alt=""
              className="absolute inset-0 h-full w-full rounded-pill object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={patientName}>{patientName}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={patientPhone}>{patientPhone}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <div className={`inline-flex max-w-full items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
          <span className="truncate" title={status.label}>{status.label}</span>
          {showResponderHint && (
            <Ambulance className="h-3 w-3 shrink-0 opacity-70" aria-label="Responder assigned" />
          )}
        </div>
        {showCashChip && (
          <span className="rounded-pill bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Cash</span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
          <ServiceIcon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium" title={serviceLabel}>{serviceLabel}</span>
      </div>

      <div className="min-w-0 truncate text-sm text-muted-foreground" title={facilityName}>{facilityName}</div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatRequestDayTime(request.created_at)}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(request);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
      >
        Details
      </Button>
    </motion.div>
  );
};

const RequestDetailRail = ({
  request,
  currentUser,
  loading,
  hasFilter = false,
  dispatchPending = false,
  completePending = false,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
}) => {
  // Hooks must run unconditionally — derive the projection before the early returns.
  const railProjection = request ? getRequestProjection(request) : null;
  // Transcribe raw coordinates into a readable place (ivisit-app provider chain:
  // Google when keyed → keyless OpenStreetMap → coords fallback), cached per spot.
  const { place: railPlace } = useReverseGeocode(
    railProjection?.locationDisplay?.canOpenExternalMap
      ? railProjection.locationDisplay.coordinates
      : null
  );

  if (loading) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-5 w-2/3 rounded-inner" />
            <Shimmer className="h-4 w-1/2 rounded-inner" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-[52px] w-full rounded-inner" />
          ))}
        </div>
        <div className="mt-5 space-y-2.5">
          <Shimmer className="h-12 w-full rounded-button" />
          <div className="grid grid-cols-2 gap-3">
            <Shimmer className="h-11 rounded-button" />
            <Shimmer className="h-11 rounded-button" />
          </div>
        </div>
      </aside>
    );
  }

  if (!request) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Info className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No request selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Requests that match your filters will appear here.'
              : 'Select a request to see its details here.'}
          </p>
        </div>
      </aside>
    );
  }

  const projection = railProjection;
  const status = getStatusMeta(request);
  const avatarClass = getRequestAvatarClass(request);
  const actionState = getEmergencyActionState(request);
  const railStatus = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  const railCancelled = railStatus === 'cancelled';
  const railStageIndex = Math.max(0, REQUEST_STAGE_ORDER.indexOf(railStatus));
  const railStageFill = REQUEST_STAGE_FILL[railStatus] || 'bg-foreground/60';
  const displayId = projection.identity.displayId;
  const patientEmail = projection.patientDisplay.email;
  const hasEmail = Boolean(patientEmail) && patientEmail !== 'No email';
  const railPhone = projection.patientDisplay.phone;
  const canCopyPhone = Boolean(railPhone) && !/^no\s/i.test(String(railPhone));
  const location = projection.locationDisplay;
  const responder = projection.responderDisplay;
  const payment = projection.paymentDisplay;
  const paymentAmount = payment.amountLabel && payment.amountLabel !== 'Unavailable' ? payment.amountLabel : '';
  const hasPaymentInfo = Boolean(payment.method || payment.status || paymentAmount);
  const paymentValue = [payment.methodLabel, paymentAmount, payment.status].filter(Boolean).join(' · ');
  const railCost = request?.confirmed_cost ?? request?.total_cost;
  const showAmount = railStatus === 'completed' && railCost !== null && railCost !== undefined && Boolean(paymentAmount);
  const bedDetail = request?.service_type === 'bed'
    ? [
        request?.bed_number ? `Bed ${request.bed_number}` : null,
        (request?.bed_type || request?.bed_category)
          ? formatEmergencyServiceToken(request.bed_type || request.bed_category, '')
          : null,
        request?.specialty ? formatEmergencyServiceToken(request.specialty, '') : null,
      ].filter(Boolean).join(' · ')
    : '';
  const canManage = currentUser.isAdmin() || currentUser.isOrgAdmin();
  const canCompleteAsProvider = currentUser.isProvider()
    && Boolean(currentUser.user?.id)
    && request?.responder_id === currentUser.user.id
    && actionState.canComplete;
  const primaryAction = getPrimaryRailAction({
    request,
    actionState,
    canManage,
    canCompleteAsProvider,
    onView,
    onDispatch,
    onComplete,
  });
  const PrimaryIcon = primaryAction.icon;
  const StatusIcon = status.icon || AlertCircle;
  const primaryClass = railPrimaryActionClass[primaryAction.kind] || railPrimaryActionClass.details;
  // In-place pending state for the write actions so the button itself (not just the
  // toast) acknowledges the round-trip and a double-tap cannot fire two RPCs.
  const primaryPending =
    (primaryAction.kind === 'dispatch' && dispatchPending) ||
    (primaryAction.kind === 'complete' && completePending);

  return (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      {/* Today-sheet surface recipe: a recessed inset panel holds the hero block, and the
          detail cards below read as fill-films over the pane (no per-card shadow). */}
      <RailInsetHero>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Request details</h2>
          {displayId && (
            <div className="mt-1 flex min-w-0 items-center gap-1">
              <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
              <CopyChip value={displayId} label="Copy case ID" />
            </div>
          )}
          <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>
          {/* Compact lifecycle progression: filled to the current canonical stage; cancelled all-muted. */}
          <StageStrip
            order={REQUEST_STAGE_ORDER}
            fillClass={railStageFill}
            activeIndex={railStageIndex}
            muted={railCancelled}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
          onClick={() => onView(request)}
          aria-label="Open full request details"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-pill text-lg font-semibold ${avatarClass}`}>
          <span aria-hidden="true">{getInitials(projection.patientDisplay.name)}</span>
          {projection.patientDisplay.avatar && (
            <img
              src={projection.patientDisplay.avatar}
              alt=""
              className="absolute inset-0 h-full w-full rounded-pill object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={projection.patientDisplay.name}>{projection.patientDisplay.name}</h3>
          <div className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <span className="truncate" title={`${formatRequestTime(request.created_at)} - ${railPhone}${displayId ? ` · ${displayId}` : ''}`}>
              {formatRequestTime(request.created_at)} - {railPhone}{displayId ? ` · ${displayId}` : ''}
            </span>
            {canCopyPhone && <CopyChip value={railPhone} label="Copy phone number" />}
          </div>
          {hasEmail && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{patientEmail}</p>
          )}
        </div>
      </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Hospital} label="Facility" value={projection.facilityDisplay.name} />
        <DetailLine
          icon={MapPin}
          label="Location"
          value={location.canOpenExternalMap && location.coordinates ? (
            <a
              href={`https://maps.google.com/?q=${location.coordinates.lat},${location.coordinates.lng}`}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
              title={railPlace?.formattedAddress || location.label}
            >
              {railPlace?.shortLabel || location.label}
            </a>
          ) : location.label}
        />
        <DetailLine icon={ClipboardCheck} label="Service" value={getServiceLabel(request)} />
        {bedDetail && <DetailLine icon={BedDouble} label="Bed" value={bedDetail} />}
        {responder.hasResponder && (
          <DetailLine
            icon={Ambulance}
            label="Responder"
            value={`${responder.label}${responder.etaLabel ? ` · ${responder.etaLabel}` : ''}`}
          />
        )}
        {hasPaymentInfo && <DetailLine icon={Wallet} label="Payment" value={paymentValue} />}
        {showAmount && <DetailLine icon={CreditCard} label="Amount" value={paymentAmount} />}
        <DetailLine icon={Clock} label="Requested" value={formatRequestDayTime(request.created_at)} />
        {request?.completed_at && (
          <DetailLine icon={CheckCheck} label="Completed" value={formatRequestDayTime(request.completed_at)} />
        )}
        {request?.cancelled_at && (
          <DetailLine icon={Clock} label="Cancelled" value={formatRequestDayTime(request.cancelled_at)} />
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className={`h-12 w-full rounded-button text-base font-semibold transition-all active:scale-[0.99] ${primaryClass}`}
          onClick={() => primaryAction.onClick(request)}
          disabled={primaryAction.disabled || primaryPending}
        >
          {primaryPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PrimaryIcon className="mr-2 h-5 w-5" />
          )}
          {primaryAction.label}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {canManage && actionState.canDispatch && primaryAction.kind !== 'dispatch' && (
            <RailActionButton icon={Send} label="Dispatch" onClick={() => onDispatch(request)} pending={dispatchPending} />
          )}
          {(canManage || canCompleteAsProvider) && actionState.canComplete && primaryAction.kind !== 'complete' && (
            <RailActionButton icon={CheckCheck} label="Complete" onClick={() => onComplete(request)} pending={completePending} />
          )}
          {primaryAction.kind !== 'details' && (
            <RailActionButton icon={Info} label="Details" onClick={() => onView(request)} />
          )}
        </div>

        {actionState.canProcessCash && (
          <Button
            variant="ghost"
            className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.99]"
            onClick={() => onProcessCash(request)}
          >
            Cash settlement handled in Finance
          </Button>
        )}

        {currentUser.isAdmin() && actionState.canCancel && (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]"
            onClick={() => onDelete(request)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel request
          </Button>
        )}
      </div>
    </aside>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick, pending = false }) => (
  <Button
    variant="ghost"
    className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98] disabled:opacity-50"
    onClick={onClick}
    disabled={pending}
  >
    {pending ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
    ) : (
      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    )}
    {label}
  </Button>
);

const getPrimaryRailAction = ({
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
