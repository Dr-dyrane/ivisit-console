import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import {
  cancelEmergencyRequest,
  getEmergencyRequestsPage,
  getUserActivePaymentMethods,
  retryPaymentWithDifferentMethod,
} from '../../services/emergencyService';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import * as walletService from '../../services/walletService';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import { PaginationControls } from '../ui/PaginationControls';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { withTimeout } from '../../lib/utils';
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
  Filter as FilterIcon,
  Hospital,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FilterSheet } from '../common/FilterSheet';
import { ConsoleModuleRail } from '../common/ConsoleModuleRail';
import { MobileEmergency } from '../mobile/MobileEmergency';
import { SEOHead } from '../common/SEOHead';
import { canonicalizeEmergencyStatus, isActiveEmergencyStatus } from '../../utils/emergencyStatus';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import {
  buildEmergencyRenderProjection,
  isCashPaymentMethod,
} from '../../utils/emergencyRequestMapper';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';

const routeFeedbackMs = 320;

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

const getFilterTriggerState = ({ isOpen, hasFilter }) => {
  if (isOpen) return 'open';
  if (hasFilter) return 'filtered';
  return 'idle';
};

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
    id: 'pending',
    label: 'Needs attention',
    icon: AlertCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/16 text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.20)]',
    restClass: 'bg-muted/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
  },
  {
    id: 'active',
    label: 'Active',
    icon: Clock,
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-200',
    restClass: 'bg-muted/30 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-200',
  },
  {
    id: 'bed',
    label: 'Beds',
    icon: BedDouble,
    colorClass: 'text-cyan-600 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_18px_54px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    restClass: 'bg-muted/30 text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200',
  },
  {
    id: 'ambulance',
    label: 'Ambulance',
    icon: Ambulance,
    colorClass: 'text-sky-600 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.14)] dark:text-sky-200',
    restClass: 'bg-muted/30 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-200',
  },
];

const statusStyles = {
  pending_approval: {
    label: 'Needs attention',
    className: 'bg-destructive/14 text-destructive shadow-[0_12px_38px_rgba(239,68,68,0.14)]',
  },
  in_progress: {
    label: 'Active',
    className: 'bg-amber-500/10 text-amber-700 shadow-[0_12px_38px_rgba(245,158,11,0.12)] dark:text-amber-200',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-cyan-500/10 text-cyan-700 shadow-[0_12px_38px_rgba(6,182,212,0.12)] dark:text-cyan-200',
  },
  arrived: {
    label: 'Arrived',
    className: 'bg-sky-500/10 text-sky-700 shadow-[0_12px_38px_rgba(14,165,233,0.12)] dark:text-sky-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCheck,
    className: 'bg-emerald-500/10 text-emerald-700 shadow-[0_12px_38px_rgba(16,185,129,0.12)] dark:text-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted/40 text-muted-foreground',
  },
  payment_declined: {
    label: 'Payment issue',
    className: 'bg-destructive/14 text-destructive shadow-[0_12px_38px_rgba(239,68,68,0.14)]',
  },
};

const serviceIconMap = {
  ambulance: Ambulance,
  bed: BedDouble,
  critical_care: ShieldCheck,
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
  if (id === 'pending') {
    const rowCount = requests.filter((request) => request.status === 'pending_approval').length;
    return normalizeCount(stats?.pending, rowCount);
  }
  if (id === 'active') {
    const rowCount = requests.filter((request) => isActiveEmergencyStatus(request.status)).length;
    return normalizeCount(stats?.active, rowCount);
  }
  if (id === 'critical') {
    const rowCount = requests.filter((request) => request.service_type === 'critical_care').length;
    return normalizeCount(stats?.critical, rowCount);
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

const getRequestSignal = ({ stats, requests, kpiFilter }) => {
  const activeId = kpiFilter || 'pending';
  const activeOption = kpiOptions.find((item) => item.id === activeId) || kpiOptions[0];
  const count = getKpiCount({ id: activeOption.id, stats, requests });

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

  return {
    icon: Ambulance,
    tone: 'primary',
    label: 'Ambulance',
    headline: count > 0 ? `${count} ambulance request${count === 1 ? '' : 's'}` : 'No ambulance requests',
    subhead: count > 0 ? 'Check response state before acting.' : 'Ambulance requests will appear here.',
  };
};

const isTransientRequestRefreshError = (error) => {
  const message = String(error?.message || error?.details || error || '');
  return error?.name === 'AbortError' || /failed to fetch|abort/i.test(message);
};

const getDefaultRequestKpi = (stats) => {
  const pending = normalizeCount(stats?.pending_approval ?? stats?.pending, 0);
  const active = normalizeCount(stats?.active, 0);
  const bed = normalizeCount(stats?.bed, 0);
  const ambulance = normalizeCount(stats?.ambulance, 0);

  if (pending > 0) return 'pending';
  if (active > 0) return 'active';
  if (bed > 0 && bed >= ambulance) return 'bed';
  if (ambulance > 0) return 'ambulance';
  if (bed > 0) return 'bed';
  return 'pending';
};

const requestToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-[0_16px_42px_rgba(239,68,68,0.16)]',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
  critical: 'bg-rose-500/10 text-rose-700 shadow-[0_16px_42px_rgba(244,63,94,0.14)] dark:text-rose-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
  primary: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

const railPrimaryActionClass = {
  review: 'bg-destructive text-white shadow-[0_18px_56px_rgba(239,68,68,0.28)] hover:bg-destructive/90',
  dispatch: 'bg-sky-600 text-white shadow-[0_18px_56px_rgba(14,165,233,0.22)] hover:bg-sky-500',
  complete: 'bg-emerald-600 text-white shadow-[0_18px_56px_rgba(16,185,129,0.22)] hover:bg-emerald-500',
  retry: 'bg-amber-500 text-slate-950 shadow-[0_18px_56px_rgba(245,158,11,0.22)] hover:bg-amber-400',
  details: 'bg-foreground text-background shadow-[0_18px_56px_rgba(0,0,0,0.24)] hover:bg-foreground/90',
};

const RequestsAtlasLayer = () => (
  <div className="absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--destructive) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(var(--destructive) / 0.11), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const EmergencyRequestsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isOrgAdmin, isProvider, orgId, profile, user, loading: authLoading } = useAuth();
  const { isMobile } = useNavigation();

  const currentUser = useMemo(() => ({
    isAdmin: () => isAdmin(),
    isOrgAdmin: () => isOrgAdmin(),
    isProvider: () => isProvider(),
    user,
    profile
  }), [isAdmin, isOrgAdmin, isProvider, user, profile]);

  const [requests, setRequests] = useState([]);
  const [requestStats, setRequestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [focusedRequestId, setFocusedRequestId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_REQUEST_FILTERS);
  const [kpiFilter, setKpiFilter] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Cancel'
  });
  const [completeModal, setCompleteModal] = useState({ open: false, request: null });
  const [retryModal, setRetryModal] = useState({ open: false, request: null, methods: [], selectedId: null });
  const [routingPath, setRoutingPath] = useState(null);
  const requestSeqRef = useRef(0);

  const pagination = usePagination(20);
  const authReady = Boolean(user?.id && profile?.role) && !authLoading;
  const selectedKpiFilter = useMemo(
    () => kpiFilter || getDefaultRequestKpi(requestStats),
    [kpiFilter, requestStats]
  );
  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return 'provider';
    return 'viewer';
  }, [isAdmin, isOrgAdmin, isProvider]);
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const handleRailNavigate = useCallback((path) => {
    if (!path) return;
    setRoutingPath(path);
    window.setTimeout(() => {
      if (path !== window.location.pathname) {
        navigate(path);
      }
      setRoutingPath(null);
    }, routeFeedbackMs);
  }, [navigate]);

  const getEmergencyLabel = useCallback((request) => (
    request?.display_id ||
    request?.hospital_name ||
    request?.service_type ||
    'selected request'
  ), []);

  const fetchRequests = useCallback(async () => {
    if (!authReady) {
      setLoading(true);
      return;
    }

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    try {
      setLoading(true);
      const serviceFilter = buildRequestsServiceFilter(filters);

      const { data, count, stats } = await withTimeout(
        getEmergencyRequestsPage({
          ...serviceFilter,
          kpiFilter: selectedKpiFilter,
          limit: pagination.itemsPerPage,
          offset: pagination.paginationRange.start,
          sortKey: sortConfig.key,
          sortDirection: sortConfig.direction,
          quiet: true,
        }),
        15000,
        'Failed to load requests - timeout'
      );

      if (requestSeq !== requestSeqRef.current) return;

      pagination.setTotalCount(count || 0);

      const normalizedRows = data || [];
      setRequests(normalizedRows);
      setRequestStats(stats || null);
      setLoadError(null);
      setSelectedRequest((prev) => {
        if (!prev?.id) return prev;
        return normalizedRows.find((row) => row.id === prev.id) || prev;
      });
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return;
      if (isTransientRequestRefreshError(error)) return;
      console.error('Error fetching requests:', error);
      const message = error.message || 'Failed to load requests';
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    filters,
    authReady,
    selectedKpiFilter,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    pagination.setTotalCount,
    sortConfig,
  ]);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchRequests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchRequests)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchRequests]);

  const handleCreateEmergency = useCallback(() => {
    setSelectedRequest(null);
    setIsEmergencyModalOpen(true);
  }, []);

  useEffect(() => {
    const handleOpenModal = () => handleCreateEmergency();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);

    window.addEventListener('openEmergencyModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openEmergencyModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateEmergency]);

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
      {hasFilter && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500 shadow-[0_0_24px_rgba(14,165,233,0.55)]" />
      )}
    </Button>
  ), [filterSheetOpen, filterTriggerState, hasFilter]);

  const headerActions = useMemo(() => {
    if (currentUser.isAdmin() || currentUser.isOrgAdmin()) {
      return (
        <Button
          onClick={handleCreateEmergency}
          data-state={isEmergencyModalOpen ? 'open' : 'idle'}
          className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
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
        try {
          await cancelEmergencyRequest(request.id, 'cancelled_from_console');
        } catch (error) {
          console.error('Error cancelling request:', error);
          toast.error(error.message || 'Failed to cancel request');
          return; // genuinely failed — keep the modal open, do not refresh
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
        fetchRequests();
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'destructive',
      confirmLabel: 'Cancel request'
    });
  }, [fetchRequests, getEmergencyLabel]);

  const handleViewDetails = useCallback((request) => {
    setFocusedRequestId(request?.id || null);
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  }, []);

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
      if (isOrgAdmin() || isAdmin()) {
        const targetOrgId = orgId || request.organization_id || request.hospital_id;
        if (targetOrgId && targetOrgId.length === 36) {
          const estimatedAmount = request.service_type === 'ambulance' ? 50 : 25;
          const isEligible = await walletService.checkCashEligibility(targetOrgId, estimatedAmount);

          if (!isEligible) {
            toast.error('Wallet balance is too low', {
              description: 'Top up the organization wallet before accepting cash jobs.'
            });
            return;
          }
        }
      }

      toast.loading('Dispatching request...', { id: 'dispatch' });
      const result = await dispatchEmergency(request.id, request);
      toast.success('Request dispatched', { id: 'dispatch' });
      toast.info(`Responder: ${result.assignments.ambulance?.type || 'Assigned'}`, { duration: 3000 });

      fetchRequests();
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
  }, [fetchRequests, isAdmin, isOrgAdmin, orgId]);

  const handleComplete = useCallback((request) => {
    setCompleteModal({ open: true, request });
  }, []);

  const executeComplete = useCallback(async (request) => {
    setCompleteModal({ open: false, request: null });
    try {
      await completeEmergency(request.id);

      if (isCashPaymentMethod(request.payment_method) && request.payment_status !== 'completed') {
        toast.warning('Cash follow-up needed', {
          description: 'Completion was saved. Cash settlement stays with the finance receiver pass.'
        });
      } else {
        toast.success('Request completed');
      }

      fetchRequests();
    } catch (error) {
      console.error('Complete failed:', error);
      toast.error('Failed to complete request');
    }
  }, [fetchRequests]);

  const handleProcessCash = useCallback(() => {
    toast.info('Cash settlement is not ready here yet', {
      description: 'The finance receiver pass still owns this action.'
    });
  }, []);

  const formatMethodLabel = useCallback((method, index) => {
    const brand = String(method?.brand || method?.provider || method?.type || 'Card').toUpperCase();
    const last4 = method?.last4 ? ` **** ${method.last4}` : '';
    const exp =
      Number.isFinite(Number(method?.expiry_month)) && Number.isFinite(Number(method?.expiry_year))
        ? ` - exp ${String(method.expiry_month).padStart(2, '0')}/${method.expiry_year}`
        : '';
    const defaultTag = method?.is_default ? ' (default)' : '';
    return `${index + 1}. ${brand}${last4}${exp}${defaultTag}`;
  }, []);

  const handleRetryPayment = useCallback(async (request, preferredPaymentMethodId = null) => {
    const actionState = getEmergencyActionState(request);
    if (!actionState.canRetryPayment) {
      toast.info('This request is not ready for payment retry. Refreshing list...');
      await fetchRequests();
      return false;
    }

    const requestId = request?.id;
    const userId = request?.user_id;
    if (!requestId || !userId) {
      toast.error('Missing request or patient identifier for retry');
      return false;
    }

    try {
      toast.loading('Preparing payment retry...', { id: 'retry-pay' });

      if (preferredPaymentMethodId) {
        await retryPaymentWithDifferentMethod(requestId, preferredPaymentMethodId, userId);
        toast.success('Payment retry created', { id: 'retry-pay' });
        await fetchRequests();
        return true;
      }

      const methods = await getUserActivePaymentMethods(userId);
      if (!Array.isArray(methods) || methods.length === 0) {
        throw new Error('No active payment methods found for this patient');
      }

      toast.dismiss('retry-pay');

      if (methods.length === 1) {
        await retryPaymentWithDifferentMethod(requestId, methods[0].id, userId);
        toast.success('Payment retry created', { id: 'retry-pay' });
        await fetchRequests();
        return true;
      }

      const defaultIndex = Math.max(0, methods.findIndex((method) => method.is_default));
      setRetryModal({
        open: true,
        request,
        methods,
        selectedId: methods[defaultIndex]?.id || methods[0]?.id
      });
      return false;
    } catch (error) {
      console.error('Payment retry failed:', error);
      toast.error(error.message || 'Failed to retry payment', { id: 'retry-pay' });
      return false;
    }
  }, [fetchRequests]);

  const closeRetryModal = useCallback(() => {
    setRetryModal({ open: false, request: null, methods: [], selectedId: null });
  }, []);

  const executeRetryPayment = useCallback(async () => {
    const { request, selectedId } = retryModal;
    closeRetryModal();
    if (!request?.id || !selectedId) return;
    try {
      toast.loading('Retrying payment...', { id: 'retry-pay' });
      await retryPaymentWithDifferentMethod(request.id, selectedId, request.user_id);
      toast.success('Payment retry created', { id: 'retry-pay' });
      await fetchRequests();
    } catch (error) {
      console.error('Payment retry failed:', error);
      toast.error(error.message || 'Failed to retry payment', { id: 'retry-pay' });
    }
  }, [retryModal, fetchRequests, closeRetryModal]);

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Requests" description="Review requests and route care from one place." />

      {isMobile ? (
        <MobileEmergency
          emergencies={requests}
          loading={loading}
          statistics={requestStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleViewDetails}
          onRefresh={fetchRequests}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isAdmin={isAdmin() || isOrgAdmin()}
          onOpenFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          loadError={loadError}
          onRetry={fetchRequests}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
        />
      ) : (
        <RequestsDesktopWorkspace
          requests={requests}
          loading={loading}
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
          onRetryPayment={handleRetryPayment}
          pagination={pagination}
          openFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          filterTriggerState={filterTriggerState}
          loadError={loadError}
          onRetry={fetchRequests}
          moduleRailItems={visibleModuleRail}
          routingPath={routingPath}
          onRailNavigate={handleRailNavigate}
        />
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
        request={selectedRequest}
        onRetryPayment={handleRetryPayment}
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
        analytics={requestStats || {
          total: requests.length,
          active: requests.filter((request) => isActiveEmergencyStatus(request.status)).length,
          pending: requests.filter((request) => request.status === 'pending_approval').length,
          critical: requests.filter((request) => request.service_type === 'critical_care').length,
          avgResponseTime: 0
        }}
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

      <ModalShell
        isOpen={retryModal.open}
        onClose={closeRetryModal}
        title="Select payment method"
        subtitle="Choose a saved method for the retry."
        icon={<RefreshCw className="h-4 w-4 text-primary" />}
        size="sm"
        footer={(
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 rounded-button"
              onClick={closeRetryModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-button font-bold"
              onClick={executeRetryPayment}
              disabled={!retryModal.selectedId}
            >
              Retry
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col gap-2 p-4 pt-1 md:px-6 md:pb-6">
          {retryModal.methods.map((method, index) => (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center gap-3 rounded-inner p-3 transition-colors ${retryModal.selectedId === method.id ? 'bg-primary/12 text-primary' : 'bg-muted/25 hover:bg-muted/40'}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={retryModal.selectedId === method.id}
                onChange={() => setRetryModal(prev => ({ ...prev, selectedId: method.id }))}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{formatMethodLabel(method, index)}</span>
            </label>
          ))}
        </div>
      </ModalShell>
    </div>
  );
};

const RequestsDesktopWorkspace = ({
  requests,
  loading,
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
  onRetryPayment,
  pagination,
  openFilters,
  filterSheetOpen,
  filterTriggerState,
  loadError,
  onRetry,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const signal = getRequestSignal({ stats, requests, kpiFilter });

  return (
    <section className="relative min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground">
      <RequestsAtlasLayer />
      <ConsoleModuleRail
        items={moduleRailItems}
        activePath="/emergencies"
        routingPath={routingPath}
        onNavigate={onRailNavigate}
      />

      <div className="relative z-10 flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col gap-5 px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28">
        <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
          <RequestSignalPanel
            signal={signal}
            stats={stats}
            requests={requests}
            kpiFilter={kpiFilter}
            setKpiFilter={setKpiFilter}
          />

          <div className="flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
            <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
            <RequestToolbar
              filters={filters}
              setFilters={setFilters}
              openFilters={openFilters}
              filterSheetOpen={filterSheetOpen}
              filterTriggerState={filterTriggerState}
            />

            <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
              <span>{loading ? 'Loading requests' : `${pagination.totalCount} requests`}</span>
              <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
              <div className="grid grid-cols-[minmax(150px,1.2fr)_minmax(92px,0.66fr)_minmax(124px,1fr)_64px_72px] gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>Person</span>
                <span>Service</span>
                <span>Facility</span>
                <span>Time</span>
                <span className="text-right">Action</span>
              </div>

              {loading && <RequestSkeletonRows />}
              {!loading && loadError && requests.length === 0 && (
                <RequestLoadErrorState message={loadError} onRetry={onRetry} />
              )}
              {!loading && loadError && requests.length > 0 && (
                <RequestLoadNotice message={loadError} onRetry={onRetry} />
              )}
              {!loading && !loadError && Number(pagination.totalCount) === 0 && (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-muted/16 p-10 text-center">
                  <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground/65" />
                  <h3 className="text-xl font-semibold">No matching requests</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Change filters or search again.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={openFilters}
                    data-state={filterTriggerState}
                    className="mt-5 rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                    aria-haspopup="dialog"
                    aria-expanded={filterSheetOpen}
                  >
                    Change filters
                  </Button>
                </div>
              )}
              {!loading && requests.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {requests.map((request, index) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      index={index}
                      selected={focusedRequest?.id === request.id}
                      onFocus={() => setFocusedRequestId(request.id)}
                      onView={onView}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              itemsPerPage={pagination.itemsPerPage}
              onPrevPage={pagination.prevPage}
              onNextPage={pagination.nextPage}
              hasPrevPage={pagination.hasPrevPage}
              hasNextPage={pagination.hasNextPage}
              loading={loading}
            />
          </div>
        </section>

        <RequestDetailRail
          request={focusedRequest}
          currentUser={currentUser}
          onView={onView}
          onDelete={onDelete}
          onDispatch={onDispatch}
          onComplete={onComplete}
          onProcessCash={onProcessCash}
          onRetryPayment={onRetryPayment}
        />
      </div>
    </section>
  );
};

const RequestSignalPanel = ({ signal, stats, requests, kpiFilter, setKpiFilter }) => {
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]"
    >
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${requestToneClass[signal.tone] || requestToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            {signal.headline}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {signal.subhead}
          </p>
        </div>

        <RequestKpiStrip
          stats={stats}
          requests={requests}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const RequestKpiStrip = ({ stats, requests, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
    {kpiOptions.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'pending') === item.id;
      const count = getKpiCount({ id: item.id, stats, requests });
      const clearPending = item.id === 'pending' && count === 0;
      const activeClass = clearPending
        ? 'bg-emerald-500/10 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-200'
        : item.activeClass;
      const colorClass = clearPending ? 'text-emerald-700 dark:text-emerald-200' : item.colorClass;
      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          data-request-kpi={item.id}
          data-state={active ? 'selected' : 'idle'}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`${item.label}: ${count}`}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 transition-transform group-hover:scale-105 ${active ? colorClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const RequestLoadErrorState = ({ message, onRetry }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-destructive/10 p-10 text-center shadow-[0_20px_64px_rgba(239,68,68,0.12)]">
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
  <div className="mb-3 flex flex-col gap-3 rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)] sm:flex-row sm:items-center sm:justify-between">
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

const RequestToolbar = ({ filters, setFilters, openFilters, filterSheetOpen, filterTriggerState }) => (
  <div className="flex items-center gap-3">
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
      <input
        type="search"
        value={filters.search || ''}
        onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
        placeholder="Search requests..."
        className="h-12 w-full rounded-button bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
      />
    </div>
    <Button
      variant="ghost"
      onClick={openFilters}
      data-state={filterTriggerState}
      className="h-12 rounded-button bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <FilterIcon className="mr-2 h-4 w-4" />
      Filters
    </Button>
  </div>
);

const RequestRow = ({ request, index, selected, onFocus, onView }) => {
  const projection = getRequestProjection(request);
  const status = getStatusMeta(request);
  const ServiceIcon = serviceIconMap[request?.service_type] || ClipboardCheck;
  const patientName = projection.patientDisplay.name;
  const facilityName = projection.facilityDisplay.name;
  const rowAvatarClass = getRequestAvatarClass(request);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.2) }}
      className={`mb-2 grid min-h-[78px] grid-cols-[minmax(150px,1.2fr)_minmax(92px,0.66fr)_minmax(124px,1fr)_64px_72px] items-center gap-2 rounded-card px-4 py-3 transition-all duration-200 ${selected ? 'bg-foreground/[0.07] shadow-[0_24px_70px_rgba(0,0,0,0.14)] dark:bg-white/[0.075]' : 'bg-muted/22 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgba(0,0,0,0.10)]'}`}
      data-request-row={request.id}
      data-state={selected ? 'selected' : 'idle'}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      aria-pressed={selected}
      aria-label={`${selected ? 'Selected' : 'Open'} ${patientName}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill text-sm font-semibold ${rowAvatarClass}`}>
          {getInitials(patientName)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground">{patientName}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{projection.patientDisplay.phone}</div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
          <ServiceIcon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium">{getServiceLabel(request)}</span>
      </div>

      <div className="min-w-0">
        <div className={`inline-flex max-w-full items-center rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
          <span className="truncate">{status.label}</span>
        </div>
        <div className="mt-2 truncate text-xs text-muted-foreground">{facilityName}</div>
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatRequestTime(request.created_at)}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(request);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold shadow-sm transition-all hover:bg-foreground hover:text-background active:scale-95"
      >
        Details
      </Button>
    </motion.div>
  );
};

const RequestDetailRail = ({
  request,
  currentUser,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
  onRetryPayment,
}) => {
  if (!request) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Info className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No request selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Requests that match your filters will appear here.
          </p>
        </div>
      </aside>
    );
  }

  const projection = getRequestProjection(request);
  const status = getStatusMeta(request);
  const avatarClass = getRequestAvatarClass(request);
  const actionState = getEmergencyActionState(request);
  const canManage = currentUser.isAdmin() || currentUser.isOrgAdmin();
  const canCompleteAsProvider = currentUser.isProvider() && actionState.canComplete;
  const primaryAction = getPrimaryRailAction({
    request,
    actionState,
    canManage,
    canCompleteAsProvider,
    onView,
    onDispatch,
    onComplete,
    onRetryPayment,
  });
  const PrimaryIcon = primaryAction.icon;
  const StatusIcon = status.icon || AlertCircle;
  const primaryClass = railPrimaryActionClass[primaryAction.kind] || railPrimaryActionClass.details;

  return (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Request details</h2>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>
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

      <div className="mb-5 flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-pill text-lg font-semibold ${avatarClass}`}>
          {getInitials(projection.patientDisplay.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{projection.patientDisplay.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRequestTime(request.created_at)} - {projection.patientDisplay.phone}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <DetailLine icon={Hospital} label="Facility" value={projection.facilityDisplay.name} />
        <DetailLine icon={MapPin} label="Location" value={projection.locationDisplay.label} />
        <DetailLine icon={ClipboardCheck} label="Service" value={getServiceLabel(request)} />
        <DetailLine icon={Clock} label="Requested" value={formatRequestTime(request.created_at)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className={`h-12 w-full rounded-button text-base font-semibold transition-all active:scale-[0.99] ${primaryClass}`}
          onClick={() => primaryAction.onClick(request)}
          disabled={primaryAction.disabled}
        >
          <PrimaryIcon className="mr-2 h-5 w-5" />
          {primaryAction.label}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {canManage && actionState.canDispatch && primaryAction.kind !== 'dispatch' && (
            <RailActionButton icon={Send} label="Dispatch" onClick={() => onDispatch(request)} />
          )}
          {(canManage || canCompleteAsProvider) && actionState.canComplete && primaryAction.kind !== 'complete' && (
            <RailActionButton icon={CheckCheck} label="Complete" onClick={() => onComplete(request)} />
          )}
          {actionState.canRetryPayment && primaryAction.kind !== 'retry' && (
            <RailActionButton icon={RefreshCw} label="Retry" onClick={() => onRetryPayment(request)} />
          )}
          <RailActionButton icon={Info} label="Details" onClick={() => onView(request)} />
        </div>

        {actionState.canProcessCash && (
          <Button
            variant="ghost"
            className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.99]"
            onClick={() => onProcessCash(request)}
          >
            Cash settlement not ready here
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

const DetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/20 p-2.5">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value || 'Not set'}</div>
    </div>
  </div>
);

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
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
  onRetryPayment,
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
  if (actionState.canRetryPayment) {
    return {
      kind: 'retry',
      label: 'Retry payment',
      icon: RefreshCw,
      onClick: onRetryPayment,
    };
  }
  return {
    kind: 'details',
    label: 'Details',
    icon: Info,
    onClick: onView,
  };
};

const RequestSkeletonRows = () => (
  <div className="space-y-2">
    {Array.from({ length: 7 }).map((_, index) => (
      <div
        key={index}
        className="h-[78px] animate-pulse rounded-card bg-muted/38 dark:bg-white/[0.055]"
      />
    ))}
  </div>
);
