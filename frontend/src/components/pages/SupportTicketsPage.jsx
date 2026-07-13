import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useSupportTicketsQuery } from '../../hooks/useSupportTicketsQuery';
import {
  useSupportTicketsMutations,
  applyOptimisticUpsert,
  applyOptimisticRemove,
  settleSupportTicketDeletes,
} from '../../hooks/useSupportTicketsMutations';
import {
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  assignTicket,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from '../../services/supportTicketsService';
import { handleApiError } from '../../utils/errorHandler';
// Console design system: Support COMPOSES the shared workspace grammar (donor: Requests;
// closest analog: Users/Staff) instead of the bespoke signal/state-strip/rail look-alikes
// it used to inline. WorkspaceStage -> SignalPanel/KpiStrip -> one ActivitySheet +
// ListRowShell (one Time header) -> DetailRailShell rail. The React Query data layer
// (useSupportTicketsQuery + useSupportTicketsMutations + the support_tickets_page_changes
// channel) is CANON and untouched -- this is a pure visual recompose.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, CopyChip, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import { SEOHead } from '../common/SEOHead';
import { FilterSheet } from '../common/FilterSheet';
import { BulkActionBar } from '../common/BulkActionBar';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Filter,
  Flag,
  Headphones,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  Tag,
  Ticket,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileSupportTickets, pruneSupportTicketIdsFromCache } from '../mobile/MobileSupportTickets';

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

const PRIORITIES = SUPPORT_TICKET_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
  color: PRIORITY_COLORS[value],
}));
const STATUSES = SUPPORT_TICKET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
const CATEGORIES = SUPPORT_TICKET_CATEGORIES;

// KPI/state strip options: the STATUS axis (All / Open / Active / Resolved). `closed`
// folds into the Resolved tone; `urgent` is a cross-cut PRIORITY overlay (row + rail pill
// + FilterSheet), never a KPI chip. Literal palette + NEUTRAL shadows only; the shared
// KpiStrip owns the width/tile/smart-context (max 3, pinned-while-count>0). countKey maps
// each id onto the server stats bucket so the counts stay stable while the list narrows.
const SUPPORT_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Ticket, countKey: 'total', colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'open', label: 'Open', icon: AlertCircle, countKey: 'open', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'in_progress', label: 'Active', icon: Headphones, countKey: 'active', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle, countKey: 'resolved', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
];
const SUPPORT_KPI_IMPORTANCE = { all: 0, open: 1, in_progress: 2, resolved: 3 };
const PINNED_SUPPORT_KPI_IDS = ['open', 'in_progress'];

// SignalPanel eyebrow tones -- literal palette, NEUTRAL e2 shadows (no colored glow).
const supportToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

// Status vocabulary -> pill tone + icon well tone. `closed` reads neutral (resolved-adjacent);
// unknown status falls back to Open. Literal palette only (the theme status tokens render red).
const STATUS_META = {
  open: { label: 'Open', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  in_progress: { label: 'Active', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
  resolved: { label: 'Resolved', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  closed: { label: 'Closed', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
};

const getStatusMeta = (status) => STATUS_META[String(status || '').toLowerCase()] || STATUS_META.open;

// Priority -> pill tone. `urgent` is the cross-cut overlay that reads destructive.
const PRIORITY_TONE = {
  low: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  normal: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  high: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  urgent: 'bg-destructive/12 text-destructive',
};

const getPriorityMeta = (priority) => {
  const key = String(priority || 'normal').toLowerCase();
  const option = PRIORITIES.find((item) => item.value === key) || PRIORITIES[1];
  return { label: option.label, tone: PRIORITY_TONE[key] || PRIORITY_TONE.normal };
};

// Person | Status | Priority | Updated | Action
const SUPPORT_GRID_COLS = 'grid-cols-[minmax(180px,1.7fr)_minmax(92px,auto)_minmax(92px,auto)_minmax(96px,auto)_150px]';
const SUPPORT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(180px,1.7fr)_minmax(92px,auto)_minmax(92px,auto)_minmax(96px,auto)_150px]';

const SUPPORT_EMPTY_HEADINGS = {
  all: 'No support requests',
  open: 'No open requests',
  in_progress: 'Nothing active right now',
  resolved: 'No resolved requests',
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const hasActiveSupportFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search ||
  (Array.isArray(filters.status) && filters.status.length > 0) ||
  (Array.isArray(filters.priority) && filters.priority.length > 0) ||
  (Array.isArray(filters.category) && filters.category.length > 0) ||
  (kpiFilter && kpiFilter !== 'all')
);

const normalizeCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getStatsFilters = (filters = {}) => {
  const { status, ...rest } = filters || {};
  return rest;
};

// KPI count: the server stat bucket for the id, with a page-window fallback so the strip is
// never blank before the first stats settle (open->open, in_progress->active, resolved->resolved).
const getStateCount = ({ id, stats, tickets }) => {
  const rows = Array.isArray(tickets) ? tickets : [];
  const option = SUPPORT_KPI_OPTIONS.find((item) => item.id === id) || SUPPORT_KPI_OPTIONS[0];
  const fallback = id === 'all'
    ? rows.length
    : rows.filter((ticket) => ticket.status === id || (id === 'in_progress' && ticket.status === 'open')).length;

  return normalizeCount(stats?.[option.countKey], fallback);
};

// Signal adapter -> {icon,tone,label,headline,subhead}. Renders gracefully at zero (the REAL
// live state is an empty queue) and surfaces an honest failed-hero when the load fails cold.
const getSupportSignal = ({ stats, tickets, kpiFilter, isProviderOnly, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return { icon: AlertCircle, tone: 'danger', label: 'Load failed', headline: 'Support did not load', subhead: 'Retry to load the support queue.' };
  }

  const option = SUPPORT_KPI_OPTIONS.find((item) => item.id === kpiFilter) || SUPPORT_KPI_OPTIONS[0];
  const count = getStateCount({ id: option.id, stats, tickets });
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

const titleCase = (value) => String(value || '')
  .replace('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildAnalytics = (stats = {}, rows = []) => {
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

export const SupportTicketsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, profile } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const isProviderOnly = !isAdmin() && !isOrgAdmin() && isProvider();
  const canCreate = isAdmin() || isOrgAdmin() || isProvider();
  const canManageSupport = isAdmin() || isOrgAdmin();
  const queryClient = useQueryClient();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: [], priority: [], category: [], kpiFilter: 'all' });
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
  });
  const [deletePending, setDeletePending] = useState(false);
  const [assignPending, setAssignPending] = useState(false);
  const [confirmedDeletedTicketIds, setConfirmedDeletedTicketIds] = useState([]);
  const [createConvergenceNotice, setCreateConvergenceNotice] = useState(null);
  const pagination = usePagination(20);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const deepLinkHandledRef = useRef(null);
  const deletePendingRef = useRef(false);
  const assignPendingRef = useRef(false);

  const roleKind = isAdmin() ? 'admin' : (isOrgAdmin() ? 'org_admin' : (isProvider() ? 'provider' : 'viewer'));
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  // --- Read path: React Query (S3 migration; mirrors DoctorsPage/HospitalsPage) ---
  // The route-owned page projection (getSupportTicketsPage) flows through
  // useSupportTicketsQuery, so the ['support', queryFilter] cache is the single
  // store: this page reads it, the create/update mutations settle it, and realtime
  // invalidates it. The KPI status pill and sheet filters compose into one server
  // filter; stats are requested on the status-agnostic set (getStatsFilters) so the
  // KPI counts stay stable while the list narrows. Time-only sort (sortKey/sortDirection)
  // is threaded here; the service allowlists the sort field.
  const queryFilter = useMemo(() => {
    const routeFilters = {
      ...filters,
      ...(kpiFilter !== 'all' ? { status: kpiFilter } : {}),
    };
    delete routeFilters.kpiFilter;

    return {
      ...routeFilters,
      statsFilter: getStatsFilters(routeFilters),
      limit: pagination.itemsPerPage,
      offset: pagination.paginationRange.start,
      sortKey: sortConfig.key,
      sortDirection: sortConfig.direction,
      quiet: true,
    };
  }, [filters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start, sortConfig.key, sortConfig.direction]);

  const {
    tickets,
    count,
    stats: supportStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useSupportTicketsQuery(queryFilter);

  // RQ error object -> the page's existing degraded-state copy (kept verbatim). loadError is
  // the honest-failed-hero source threaded into the workspace signal.
  const supportError = queryError ? 'Support could not load. Try again.' : null;
  const loadError = supportError;
  // A successful explicit retry clears any post-create convergence warning. React Query's
  // refetch resolves with an error result, so inspect it instead of assuming fulfillment.
  const fetchSupportTickets = useCallback(async () => {
    const result = await refetch();
    if (!result?.error) setCreateConvergenceNotice(null);
    return result;
  }, [refetch]);

  const ticketRows = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);
  const recordConfirmedTicketDeletion = useCallback((requestedId, deletedTicket) => {
    const requestedKey = requestedId === null || requestedId === undefined
      ? ''
      : String(requestedId);
    const confirmedKey = deletedTicket?.id === null || deletedTicket?.id === undefined
      ? ''
      : String(deletedTicket.id);
    if (!requestedKey || confirmedKey !== requestedKey) {
      throw new Error('Support ticket deletion was not confirmed by the receiver.');
    }

    setConfirmedDeletedTicketIds((current) => (
      current.includes(requestedKey) ? current : [...current, requestedKey]
    ));
    queryClient.setQueriesData(
      { queryKey: ['support'] },
      (cache) => pruneSupportTicketIdsFromCache(cache, [requestedKey])
    );

    return requestedKey;
  }, [queryClient]);

  useEffect(() => {
    if (confirmedDeletedTicketIds.length === 0) return;
    queryClient.setQueriesData(
      { queryKey: ['support'] },
      (cache) => pruneSupportTicketIdsFromCache(cache, confirmedDeletedTicketIds)
    );
  }, [confirmedDeletedTicketIds, queryClient, ticketRows]);

  // Auto-select the focused record via the console-wide shared store (never empty when data).
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('support', ticketRows);
  const focusedTicket = focusedRecord;

  // Selection via the shared hook (shift-range + prune-to-visible). Selection and the
  // BulkActionBar are admin/org-admin only; each delete is still gated behind ConfirmationModal.
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(ticketRows);
  const selectable = canManageSupport;

  const hasFilter = hasActiveSupportFilters(filters, kpiFilter);
  const analytics = useMemo(() => buildAnalytics(supportStats, ticketRows), [supportStats, ticketRows]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (actionFeedbackTimerRef.current) {
        window.clearTimeout(actionFeedbackTimerRef.current);
      }
    };
  }, []);

  // Keep the shared pagination store's total in sync with the RQ count.
  useEffect(() => {
    pagination.setTotalCount(count || 0);
  }, [count, pagination.setTotalCount]);

  // A filter/sort change swaps the visible rows -- clear the selection so a bulk action can
  // never fire on rows the operator can no longer see (prune-to-visible also backstops this).
  useEffect(() => {
    clearSelection();
  }, [filters, kpiFilter, sortConfig, clearSelection]);

  const markActionFeedback = useCallback((actionId) => {
    if (!actionId) return;
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
    setActiveActionFeedback(actionId);
    actionFeedbackTimerRef.current = window.setTimeout(() => {
      setActiveActionFeedback((current) => (current === actionId ? null : current));
    }, 900);
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    pagination.resetPagination();
    setFilters((currentFilters) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [pagination.resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    pagination.resetPagination();
    setKpiFilter(nextFilter);
    setFilters((current) => ({ ...current, kpiFilter: nextFilter }));
  }, [pagination.resetPagination]);

  const handleSort = useCallback((key) => {
    pagination.resetPagination();
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, [pagination.resetPagination]);

  const setSearchFilter = useCallback((search) => {
    handleApplyFilters((current) => ({ ...current, search }));
  }, [handleApplyFilters]);

  const handleMobileFiltersChange = useCallback((nextFiltersOrUpdater) => {
    handleApplyFilters((current) => {
      const next = typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater({ ...current, kpiFilter })
        : nextFiltersOrUpdater;

      if (next?.kpiFilter !== undefined) {
        setKpiFilter(next.kpiFilter);
      }

      return next || current;
    });
  }, [handleApplyFilters, kpiFilter]);

  // Real-time updates: a support_tickets row change invalidates the ['support'] cache (the
  // single store) instead of a manual refetch. Any mounted useSupportTicketsQuery observer
  // converges on the next fetch. This page-level channel is the only support realtime on
  // /support-tickets (PageDataContext excludes supportTickets from the route's startup
  // domains), so it stays here rather than in the context.
  //
  // arrival-toast excluded by decision: support realtime CONVERGES via cache invalidation
  // (no manual refetch), so there is no INSERT refetch to throttle a toast against; the
  // list simply refreshes in place. (PAGE_REVAMP_GATE Support ledger, 2026-07-06.)
  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel('support_tickets_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        if (active && isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['support'] });
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleCreate = useCallback(() => {
    if (!canCreate) {
      toast.info('Support request access is unavailable');
      return;
    }
    markActionFeedback('create');
    setSelectedTicket(null);
    setModalMode('create');
  }, [canCreate, markActionFeedback]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsCreate = params.get('add') === 'true' || params.get('new') === 'true';
    const deepLinkKey = `${location.pathname}${location.search}`;

    if (!wantsCreate || deepLinkHandledRef.current === deepLinkKey) return;

    deepLinkHandledRef.current = deepLinkKey;
    handleCreate();
    params.delete('add');
    params.delete('new');
    params.delete('from');

    const nextSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    }, { replace: true });
  }, [handleCreate, location.pathname, location.search, navigate]);

  const handleView = useCallback((ticket) => {
    markActionFeedback(`view-${ticket?.id || 'unknown'}`);
    if (ticket?.id && !isFocused(ticket.id)) setFocused(ticket.id);
    setSelectedTicket(ticket);
    setModalMode('view');
  }, [markActionFeedback, setFocused, isFocused]);

  const canEditTicket = useCallback((ticket) => (
    canManageSupport || (isProvider() && ticket?.user_id === profile?.id)
  ), [canManageSupport, isProvider, profile?.id]);

  const handleEdit = useCallback((ticket) => {
    if (!canEditTicket(ticket)) {
      toast.info('This request is read only here');
      return;
    }
    markActionFeedback(`edit-${ticket?.id || 'unknown'}`);
    if (ticket?.id && !isFocused(ticket.id)) setFocused(ticket.id);
    setSelectedTicket(ticket);
    setModalMode('edit');
  }, [canEditTicket, markActionFeedback, setFocused, isFocused]);

  // --- Write path: React Query optimistic mutations (mirrors AmbulanceModal S3-3) --
  // createSupportTicket / updateSupportTicket stay imported from the service and are
  // handed in as the mutationFn - their RLS-scoped inserts/updates are never bypassed.
  // useSupportTicketsMutations wraps them with the onMutate snapshot -> optimistic
  // setQueryData -> onError rollback -> onSettled invalidateQueries(['support'])
  // lifecycle, so the ['support', queryFilter] cache is the single post-write refresh
  // (handleSave no longer refetches).
  //
  // Create cannot write a speculative row because the server owns the id. Once the insert
  // returns, applyCommitted writes that receiver-confirmed row immediately; a failed
  // invalidation is surfaced separately and never reclassified as an insert failure.
  const handleCreateConvergenceError = useCallback((_error, context) => {
    const ticketId = String(context?.data?.id || '').trim() || null;
    setCreateConvergenceNotice({
      ticketId,
      message: 'Request created. Refresh is unavailable, so the confirmed request is shown from the saved response.',
    });
    toast.warning('Request created, but the support list did not refresh.');
  }, []);

  const createTicketMutation = useSupportTicketsMutations({
    mutationFn: createSupportTicket,
    applyCommitted: applyOptimisticUpsert,
    onConvergenceError: handleCreateConvergenceError,
    filter: queryFilter,
  });
  const updateTicketMutation = useSupportTicketsMutations({
    mutationFn: ({ id, ...changes }) => updateSupportTicket(id, changes),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });
  // Delete removes the row optimistically (applyOptimisticRemove mirrors the
  // Doctors reference); deleteSupportTicket(id) takes the raw id as its variable.
  const deleteTicketMutation = useSupportTicketsMutations({
    mutationFn: deleteSupportTicket,
    applyOptimistic: applyOptimisticRemove,
    filter: queryFilter,
  });
  // Assign is a status-carrying upsert: the optimistic merge sets assigned_to +
  // status='in_progress' on the cached row, and the mutationFn strips the id back
  // off for assignTicket(id, assignedTo) (which returns the updated ticket).
  const assignTicketMutation = useSupportTicketsMutations({
    mutationFn: ({ id, assigned_to }) => assignTicket(id, assigned_to),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });

  const handleSave = useCallback(async (...args) => {
    if (args.length === 1) {
      setCreateConvergenceNotice(null);
      await createTicketMutation.mutateAsync(args[0]);
    } else {
      await updateTicketMutation.mutateAsync({ id: args[0], ...args[1] });
    }
    return true;
  }, [createTicketMutation, updateTicketMutation]);

  const closeConfirmation = useCallback(() => {
    if (deletePendingRef.current) return;
    setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Single delete: admin/org-admin only, always behind an explicit confirm.
  const handleDelete = useCallback((ticket) => {
    if (deletePendingRef.current) return;
    if (!canManageSupport || !ticket?.id) {
      toast.info('Delete is unavailable for this request');
      return;
    }
    setConfirmationModal({
      isOpen: true,
      title: 'Delete ticket',
      description: `Delete "${ticket.subject || 'this request'}"? This cannot be undone.`,
      onConfirm: async () => {
        if (deletePendingRef.current) return;
        deletePendingRef.current = true;
        setDeletePending(true);
        try {
          const deletedTicket = await deleteTicketMutation.mutateAsync(ticket.id);
          recordConfirmedTicketDeletion(ticket.id, deletedTicket);
          toast.success('Ticket deleted');
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          deletePendingRef.current = false;
          setDeletePending(false);
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, closeConfirmation, deleteTicketMutation, recordConfirmedTicketDeletion]);

  // Bulk delete settles every selected id. Only exact receiver-confirmed identities become
  // tombstones; failed rows are restored and remain selected for a deliberate retry.
  const handleBulkDelete = useCallback(() => {
    if (deletePendingRef.current) return;
    if (!canManageSupport || selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const count = ids.length;
    setConfirmationModal({
      isOpen: true,
      title: `Delete ${count} ticket${count === 1 ? '' : 's'}`,
      description: `Delete ${count} selected request${count === 1 ? '' : 's'}? This cannot be undone.`,
      onConfirm: async () => {
        if (deletePendingRef.current) return;
        deletePendingRef.current = true;
        setDeletePending(true);
        try {
          const outcome = await settleSupportTicketDeletes(
            ids,
            (id) => deleteTicketMutation.mutateAsync(id)
          );

          outcome.confirmed.forEach(({ id, ticket }) => {
            recordConfirmedTicketDeletion(id, ticket);
          });

          clearSelection();
          outcome.failed.forEach(({ id }) => handleToggleSelect(id, true));

          const deletedCount = outcome.confirmed.length;
          const failedCount = outcome.failed.length;
          if (failedCount === 0) {
            toast.success(`${deletedCount} ticket${deletedCount === 1 ? '' : 's'} deleted`);
          } else if (deletedCount === 0) {
            toast.error(`No tickets were deleted. ${failedCount} remain selected.`);
          } else {
            toast.warning(`${deletedCount} deleted. ${failedCount} could not be deleted and remain selected.`);
          }
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          deletePendingRef.current = false;
          setDeletePending(false);
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, clearSelection, closeConfirmation, deleteTicketMutation, handleToggleSelect, recordConfirmedTicketDeletion, selectedIds]);

  // Provider self-assign ("Assign to me"): mirrors main's canAssign = isProvider().
  const canAssign = isProvider();
  const handleAssign = useCallback(async (ticket) => {
    if (assignPendingRef.current) return;
    if (!ticket?.id || !profile?.id) {
      toast.info('Assignment is unavailable for this request');
      return;
    }
    assignPendingRef.current = true;
    setAssignPending(true);
    markActionFeedback(`assign-${ticket.id}`);
    try {
      await assignTicketMutation.mutateAsync({
        id: ticket.id,
        assigned_to: profile.id,
        status: 'in_progress',
      });
      toast.success('Ticket assigned to you');
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      assignPendingRef.current = false;
      setAssignPending(false);
    }
  }, [assignTicketMutation, markActionFeedback, profile?.id]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const supportPanelContext = useMemo(() => ({
    stats: supportStats || {},
    recent: ticketRows.slice(0, 4),
    focusedTicket,
    count: pagination.totalCount || ticketRows.length,
    loading,
    errorMessage: supportError,
    currentState: kpiFilter,
    canCreate,
    canManage: canManageSupport,
    isProviderOnly,
  }), [
    canCreate,
    canManageSupport,
    focusedTicket,
    isProviderOnly,
    kpiFilter,
    loading,
    pagination.totalCount,
    supportError,
    supportStats,
    ticketRows,
  ]);

  const publishSupportRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('supportTicketsRouteContextUpdated', {
      detail: supportPanelContext,
    }));
  }, [supportPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishSupportRouteContext();
    window.addEventListener('requestSupportTicketsRouteContext', publishSupportRouteContext);

    return () => {
      window.removeEventListener('requestSupportTicketsRouteContext', publishSupportRouteContext);
    };
  }, [publishSupportRouteContext]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({ search: '', status: [], priority: [], category: [], kpiFilter: 'all' });
  }, [handleApplyFilters, handleKpiFilterChange]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    window.addEventListener('openSupportTicketModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openSupportTicketModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  const headerActions = useMemo(() => (
    canCreate ? (
      <Button
        type="button"
        onClick={handleCreate}
        data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
        aria-busy={activeActionFeedback === 'create'}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
      >
        <Plus className="mr-2 h-4 w-4" />
        New ticket
      </Button>
    ) : null
  ), [activeActionFeedback, canCreate, handleCreate]);

  const filterButtonComponent = useMemo(() => {
    const hasFilters = hasActiveSupportFilters(filters, kpiFilter);

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpenFilters}
        className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
        aria-label="Filter support"
        aria-haspopup="dialog"
        aria-expanded={filterSheetOpen}
      >
        <Filter className="h-4 w-4" />
        {hasFilters && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
      </Button>
    );
  }, [filters, kpiFilter, filterSheetOpen, handleOpenFilters]);

  usePageHeader(
    isProviderOnly ? 'My support' : 'Support',
    headerActions,
    null,
    filterButtonComponent
  );
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const filterSchema = useMemo(() => [
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
      options: STATUSES,
    },
    {
      key: 'priority',
      type: 'multiselect',
      label: 'Priority',
      options: PRIORITIES.map((priority) => ({ value: priority.value, label: priority.label })),
    },
    {
      key: 'category',
      type: 'multiselect',
      label: 'Category',
      options: CATEGORIES.map((category) => ({
        value: category,
        label: titleCase(category),
      })),
    },
  ], []);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Support" description="Track support requests and issue follow-up." />
        <MobileSupportTickets
          tickets={tickets}
          stats={supportStats}
          filters={{ ...filters, kpiFilter }}
          setFilters={handleMobileFiltersChange}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssign={handleAssign}
          canAssign={canAssign}
          canEditTicket={canEditTicket}
          onRefresh={fetchSupportTickets}
          canManage={canManageSupport}
          loading={loading}
          isFetching={isFetching}
          errorMessage={supportError}
          convergenceMessage={createConvergenceNotice?.message || null}
          onRetry={fetchSupportTickets}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={canManageSupport ? handleOpenAnalytics : null}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          currentPage={pagination.currentPage}
          confirmedDeletedTicketIds={confirmedDeletedTicketIds}
        />
        <SupportPageModals
          modalMode={modalMode}
          selectedTicket={selectedTicket}
          setModalMode={setModalMode}
          onSave={handleSave}
          filterSheetOpen={filterSheetOpen}
          setFilterSheetOpen={setFilterSheetOpen}
          filterSchema={filterSchema}
          filters={{ ...filters, kpiFilter }}
          onApplyFilters={(next) => {
            setKpiFilter(next?.kpiFilter || 'all');
            handleApplyFilters(next);
          }}
          analyticsModalOpen={analyticsModalOpen}
          setAnalyticsModalOpen={setAnalyticsModalOpen}
          analytics={analytics}
          confirmationModal={confirmationModal}
          onCloseConfirmation={closeConfirmation}
          deletePending={deletePending}
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Support" description="Track support requests and issue follow-up." />

      <SupportDesktopWorkspace
        items={ticketRows}
        stats={supportStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        convergenceMessage={createConvergenceNotice?.message || null}
        isProviderOnly={isProviderOnly}
        canCreate={canCreate}
        canManage={canManageSupport}
        canAssign={canAssign}
        canEditTicket={canEditTicket}
        assignPending={assignPending}
        deletePending={deletePending}
        focusedTicket={focusedTicket}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={handleOpenFilters}
        onRetry={fetchSupportTickets}
        onClearFilters={handleClearFilters}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        selectable={selectable}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAssign={handleAssign}
        onCreate={handleCreate}
        activeActionFeedback={activeActionFeedback}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {canManageSupport && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || deletePending}
              aria-busy={deletePending}
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-[0.96] disabled:opacity-40"
              title="Delete selected"
              aria-label={`Delete ${selectedIds.length} selected ticket${selectedIds.length === 1 ? '' : 's'}`}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </BulkActionBar>
      )}

      <SupportPageModals
        modalMode={modalMode}
        selectedTicket={selectedTicket}
        setModalMode={setModalMode}
        onSave={handleSave}
        filterSheetOpen={filterSheetOpen}
        setFilterSheetOpen={setFilterSheetOpen}
        filterSchema={filterSchema}
        filters={{ ...filters, kpiFilter }}
        onApplyFilters={(next) => {
          setKpiFilter(next?.kpiFilter || 'all');
          handleApplyFilters(next);
        }}
        analyticsModalOpen={analyticsModalOpen}
        setAnalyticsModalOpen={setAnalyticsModalOpen}
        analytics={analytics}
        confirmationModal={confirmationModal}
        onCloseConfirmation={closeConfirmation}
        deletePending={deletePending}
        isMobile={isMobile}
      />
    </div>
  );
};

const SupportDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  convergenceMessage,
  isProviderOnly,
  canCreate,
  canManage,
  canAssign,
  canEditTicket,
  assignPending,
  deletePending,
  focusedTicket,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onCreate,
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getSupportSignal({ stats, tickets: items, kpiFilter, isProviderOnly, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedTicket,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-support-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/support-tickets"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <SupportDetailRail
          ticket={focusedTicket}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={focusedTicket ? canEditTicket(focusedTicket) : false}
          canManage={canManage}
          canAssign={canAssign}
          canCreate={canCreate}
          assignPending={assignPending}
          deletePending={deletePending}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssign={onAssign}
          onCreate={onCreate}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={supportToneClass}>
        <KpiStrip
          options={SUPPORT_KPI_OPTIONS}
          getCount={(id) => getStateCount({ id, stats, tickets: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_SUPPORT_KPI_IDS}
          importance={SUPPORT_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-support-state"
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
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search support by subject or message..."
            searchTestId="support-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="support"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        {convergenceMessage && (
          <div
            role="status"
            data-testid="support-create-convergence-warning"
            className="mt-3 flex flex-col gap-3 rounded-inner bg-amber-500/10 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100"
          >
            <div className="flex min-w-0 items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-medium leading-5">{convergenceMessage}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={onRetry}
              className="h-9 shrink-0 rounded-button bg-amber-500/10 px-4 text-xs font-semibold text-amber-900 hover:bg-amber-500/15 dark:text-amber-100"
            >
              Refresh
            </Button>
          </div>
        )}

        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Support list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <SupportListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Support did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Headphones}
              heading={hasFilter ? 'No matching requests' : (SUPPORT_EMPTY_HEADINGS[kpiFilter] || 'No support requests')}
              body={hasFilter ? 'Change filters or search again.' : 'Support requests for this scope will appear here.'}
            >
              {hasFilter ? (
                <Button
                  variant="ghost"
                  onClick={onClearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all requests
                </Button>
              ) : (canCreate && (
                <Button
                  onClick={onCreate}
                  className="rounded-pill bg-foreground px-5 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New ticket
                </Button>
              ))}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((ticket) => (
            <SupportTicketRow
              key={ticket.id}
              ticket={ticket}
              selected={focusedTicket?.id === ticket.id}
              canEdit={canEditTicket(ticket)}
              canManage={canManage}
              canAssign={canAssign}
              selectable={selectable}
              checked={selectedIds.includes(ticket.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
              onFocus={() => setFocused(ticket.id)}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
              assignPending={assignPending}
              deletePending={deletePending}
              activeActionFeedback={activeActionFeedback}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const SupportListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? SUPPORT_GRID_COLS_SELECT : SUPPORT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all tickets'}
        className="h-4 w-4"
      />
    )}
    {/* Request / Status / Priority are plain labels -- only Updated (updated_at) is a
        meaningful sort; status/priority/category belong in the FilterSheet (TIME-only sort). */}
    <span>Request</span>
    <span>Status</span>
    <span>Priority</span>
    <SortableColumnHeader label="Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const SupportTicketRow = ({
  ticket,
  selected,
  canEdit,
  canManage,
  canAssign,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
  onFocus,
  onView,
  onEdit,
  onDelete,
  onAssign,
  assignPending = false,
  deletePending = false,
  activeActionFeedback,
}) => {
  const statusMeta = getStatusMeta(ticket.status);
  const priorityMeta = getPriorityMeta(ticket.priority);
  const title = ticket.subject || 'Untitled request';

  return (
    <ListRowShell
      id={ticket.id}
      dataAttrName="data-support-row"
      gridCols={selectable ? SUPPORT_GRID_COLS_SELECT : SUPPORT_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(ticket)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(ticket.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${title}` : `Select ${title}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusMeta.tone}`}>
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={title}>{title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={ticket.message || undefined}>{ticket.message || 'No message added'}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={statusMeta.label} className={statusMeta.tone} compact />
      </div>

      <div className="min-w-0">
        <StatusPill label={priorityMeta.label} icon={Flag} className={priorityMeta.tone} compact />
      </div>

      <div className="text-sm font-medium text-muted-foreground">{formatDate(ticket.updated_at || ticket.created_at)}</div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(ticket); }}
          data-state={activeActionFeedback === `view-${ticket.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${title}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canAssign && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onAssign(ticket); }}
            disabled={assignPending}
            aria-busy={assignPending}
            data-state={activeActionFeedback === `assign-${ticket.id}` ? 'opening' : 'idle'}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Assign ${title} to me`}
          >
            {assignPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(ticket); }}
            data-state={activeActionFeedback === `edit-${ticket.id}` ? 'opening' : 'idle'}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Edit ${title}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onDelete(ticket); }}
            disabled={deletePending}
            aria-busy={deletePending}
            className="h-8 w-8 rounded-pill bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
            aria-label={`Delete ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ListRowShell>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick, disabled = false, spinning = false }) => (
  <Button
    variant="ghost"
    disabled={disabled}
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98] disabled:opacity-60"
    onClick={onClick}
  >
    {spinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
    {label}
  </Button>
);

const SupportDetailRail = ({ ticket, loading, hasFilter, canEdit, canManage, canAssign, canCreate, assignPending, deletePending, onView, onEdit, onDelete, onAssign, onCreate }) => {
  if (loading && !ticket) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!ticket) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Headphones className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No request selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Requests that match your filters will appear here.' : 'Select a request to see its details here.'}
          </p>
          {canCreate && (
            <Button
              onClick={onCreate}
              className="mt-5 h-11 rounded-button bg-foreground px-5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          )}
        </div>
      </DetailRailShell>
    );
  }

  const statusMeta = getStatusMeta(ticket.status);
  const priorityMeta = getPriorityMeta(ticket.priority);
  const displayId = ticket.display_id || (ticket.id ? `Request ${String(ticket.id).slice(0, 8)}` : null);

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Request details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy ticket ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Headphones className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(ticket)}
            aria-label="Open full request details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={ticket.subject || 'Untitled request'}>{ticket.subject || 'Untitled request'}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{ticket.message || 'No message was added.'}</p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={AlertCircle} label="Status" value={statusMeta.label} />
        <DetailLine icon={Flag} label="Priority" value={priorityMeta.label} />
        <DetailLine icon={Tag} label="Category" value={titleCase(ticket.category || 'general')} />
        <DetailLine icon={Clock} label="Created" value={formatDate(ticket.created_at)} />
        <DetailLine icon={Clock} label="Updated" value={formatDate(ticket.updated_at || ticket.created_at)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(ticket)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {(canEdit || canAssign) && (
          <div className={`grid gap-3 ${canEdit && canAssign ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {canEdit && <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(ticket)} />}
            {canAssign && (
              <RailActionButton
                icon={UserPlus}
                label="Assign to me"
                onClick={() => onAssign(ticket)}
                disabled={assignPending}
                spinning={assignPending}
              />
            )}
          </div>
        )}

        {canManage && (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]"
            onClick={() => onDelete(ticket)}
            disabled={deletePending}
            aria-busy={deletePending}
          >
            {deletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {deletePending ? 'Deleting...' : 'Delete request'}
          </Button>
        )}

        {/* Status transitions stay backend-owned (fail-closed by design): the console never
            resolves/closes a ticket the app cannot reconcile. The actions above are the
            proved support commands. */}
        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          Status transitions stay backend-owned; the actions above are the proved support commands.
        </div>
      </div>
    </DetailRailShell>
  );
};

const SupportPageModals = ({
  modalMode,
  selectedTicket,
  setModalMode,
  onSave,
  filterSheetOpen,
  setFilterSheetOpen,
  filterSchema,
  filters,
  onApplyFilters,
  analyticsModalOpen,
  setAnalyticsModalOpen,
  analytics,
  confirmationModal,
  onCloseConfirmation,
  deletePending,
  isMobile,
}) => (
  <>
    {modalMode && (
      <SupportTicketModal
        ticket={selectedTicket}
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onSave={onSave}
        priorities={PRIORITIES}
        categories={CATEGORIES}
      />
    )}
    <FilterSheet
      isOpen={filterSheetOpen}
      onOpenChange={setFilterSheetOpen}
      filterSchema={filterSchema}
      onApply={onApplyFilters}
      initialValues={filters}
      isMobile={isMobile}
    />
    <AnalyticsModal
      open={analyticsModalOpen}
      onClose={() => setAnalyticsModalOpen(false)}
      analytics={analytics}
      type="support"
    />
    <ConfirmationModal
      isOpen={confirmationModal?.isOpen || false}
      onClose={onCloseConfirmation}
      onConfirm={confirmationModal?.onConfirm || undefined}
      title={confirmationModal?.title}
      description={confirmationModal?.description}
      confirmLabel="Delete"
      variant="destructive"
      isLoading={deletePending}
    />
  </>
);
