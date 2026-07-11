import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useSupportTicketsQuery } from '../../hooks/useSupportTicketsQuery';
import { useSupportTicketsMutations, applyOptimisticUpsert, applyOptimisticRemove } from '../../hooks/useSupportTicketsMutations';
import {
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  assignTicket,
} from '../../services/supportTicketsService';
import { handleApiError } from '../../utils/errorHandler';
import { SEOHead } from '../common/SEOHead';
import { FilterSheet } from '../common/FilterSheet';
import { BulkActionBar } from '../common/BulkActionBar';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { Button } from '../ui/button';
import { PaginationControls } from '../ui/PaginationControls';
import { TableSkeleton } from '../ui/skeleton';
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle,
  ChevronRight,
  Edit,
  Eye,
  Filter,
  Headphones,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { MobileSupportTickets } from '../mobile/MobileSupportTickets';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'normal', label: 'Normal', color: 'green' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const CATEGORIES = [
  'general',
  'technical',
  'billing',
  'account',
  'feature_request',
  'bug_report',
  'medical',
];

const supportStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: Ticket,
    countKey: 'total',
    tone: 'primary',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-sky-600 dark:text-sky-200',
  },
  {
    id: 'open',
    label: 'Open',
    icon: AlertCircle,
    countKey: 'open',
    tone: 'warning',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-amber-600 dark:text-amber-200',
  },
  {
    id: 'in_progress',
    label: 'Active',
    icon: Headphones,
    countKey: 'active',
    tone: 'info',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-[0_18px_54px_rgba(6,182,212,0.16)] dark:text-cyan-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-cyan-600 dark:text-cyan-200',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: CheckCircle,
    countKey: 'resolved',
    tone: 'clear',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-emerald-600 dark:text-emerald-200',
  },
];

const supportToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-[0_16px_42px_rgb(0_0_0/0.08)]',
};

const normalizeCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getStatsFilters = (filters = {}) => {
  const { status, ...rest } = filters || {};
  return rest;
};

const getStateCount = ({ id, stats, tickets }) => {
  const rows = Array.isArray(tickets) ? tickets : [];
  const option = supportStateOptions.find((item) => item.id === id) || supportStateOptions[0];
  const fallback = id === 'all'
    ? rows.length
    : rows.filter((ticket) => ticket.status === id || (id === 'in_progress' && ticket.status === 'open')).length;

  return normalizeCount(stats?.[option.countKey], fallback);
};

const getSupportSignal = ({ stats, tickets, kpiFilter, isProviderOnly }) => {
  const option = supportStateOptions.find((item) => item.id === kpiFilter) || supportStateOptions[0];
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

const buildAnalytics = (stats = {}) => {
  const safeStats = stats || {};

  return {
    total: safeStats.total || 0,
    resolved: safeStats.resolved || 0,
    open: safeStats.open || 0,
    active: safeStats.active || 0,
    averageResolutionTime: 0,
    byStatus: {
      open: safeStats.open || 0,
      in_progress: safeStats.inProgress || 0,
      resolved: safeStats.resolved || 0,
      closed: safeStats.closed || 0,
    },
    byPriority: {
      urgent: safeStats.urgent || 0,
      high: safeStats.urgent || 0,
    },
    byCategory: {},
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
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  // Bulk-selection + destructive-confirm state (restored capability). Selection
  // and BulkActionBar are admin/org-admin only; the ConfirmationModal gates every
  // single/bulk delete behind an explicit "cannot be undone" confirm.
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
  });
  const pagination = usePagination(20);
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const deepLinkHandledRef = useRef(null);

  // --- Read path: React Query (S3 migration; mirrors DoctorsPage/HospitalsPage) ---
  // The route-owned page projection (getSupportTicketsPage) now flows through
  // useSupportTicketsQuery, so the ['support', queryFilter] cache is the single
  // store: this page reads it, the create/update mutations settle it, and realtime
  // invalidates it. The KPI status pill and sheet filters compose into one server
  // filter; stats are requested on the status-agnostic set (getStatsFilters) so the
  // KPI counts stay stable while the list narrows.
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
      quiet: true,
    };
  }, [filters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start]);

  const {
    tickets,
    count,
    stats: supportStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useSupportTicketsQuery(queryFilter);

  // RQ error object -> the page's existing degraded-state copy (kept verbatim).
  const supportError = queryError ? 'Support could not load. Try again.' : null;
  // fetchSupportTickets is now the RQ refetch (Retry on desktop, pull-to-refresh on mobile).
  const fetchSupportTickets = refetch;

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('support', tickets);
  const focusedTicket = focusedRecord;

  const analytics = useMemo(() => buildAnalytics(supportStats), [supportStats]);

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

  // Real-time updates: a support_tickets row change now invalidates the ['support']
  // cache (the single store) instead of a manual refetch. Any mounted
  // useSupportTicketsQuery observer converges on the next fetch. This page-level
  // channel is the only support realtime on /support-tickets (PageDataContext
  // excludes supportTickets from the route's startup domains), so it stays here
  // rather than in the context.
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
  // Create omits the optimistic reducer: the server owns the new id, so an optimistic
  // row would render keyless. onSettled invalidation refetches the real row. Update
  // carries the id in the variables so applyOptimisticUpsert merges the cached row;
  // the mutationFn strips it back off for updateSupportTicket(id, changes).
  const createTicketMutation = useSupportTicketsMutations({
    mutationFn: createSupportTicket,
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
    try {
      if (args.length === 1) {
        await createTicketMutation.mutateAsync(args[0]);
      } else {
        await updateTicketMutation.mutateAsync({ id: args[0], ...args[1] });
      }
      return true;
    } catch (error) {
      handleApiError(error, args.length === 1 ? 'create' : 'update');
      throw error;
    }
  }, [createTicketMutation, updateTicketMutation]);

  const closeConfirmation = useCallback(() => {
    setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Single delete: admin/org-admin only, always behind an explicit confirm.
  const handleDelete = useCallback((ticket) => {
    if (!canManageSupport || !ticket?.id) {
      toast.info('Delete is unavailable for this request');
      return;
    }
    setConfirmationModal({
      isOpen: true,
      title: 'Delete ticket',
      description: `Delete "${ticket.subject || 'this request'}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteTicketMutation.mutateAsync(ticket.id);
          setSelectedIds((prev) => prev.filter((id) => id !== ticket.id));
          toast.success('Ticket deleted');
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, closeConfirmation, deleteTicketMutation]);

  const handleSelect = useCallback((id, checked) => {
    if (!id) return;
    setSelectedIds((prev) => (
      checked ? Array.from(new Set([...prev, id])) : prev.filter((selectedId) => selectedId !== id)
    ));
  }, []);

  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? tickets.map((ticket) => ticket.id).filter(Boolean) : []);
  }, [tickets]);

  // Bulk delete loops the same delete mutation over the current selection so each
  // row leaves the cache optimistically; onSettled invalidation converges once.
  const handleBulkDelete = useCallback(() => {
    if (!canManageSupport || selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const count = ids.length;
    setConfirmationModal({
      isOpen: true,
      title: `Delete ${count} ticket${count === 1 ? '' : 's'}`,
      description: `Delete ${count} selected request${count === 1 ? '' : 's'}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const id of ids) {
            await deleteTicketMutation.mutateAsync(id);
          }
          setSelectedIds([]);
          toast.success(`${count} ticket${count === 1 ? '' : 's'} deleted`);
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, closeConfirmation, deleteTicketMutation, selectedIds]);

  // Provider self-assign ("Assign to me"): mirrors main's canAssign = isProvider().
  const canAssign = isProvider();
  const handleAssign = useCallback(async (ticket) => {
    if (!ticket?.id || !profile?.id) {
      toast.info('Assignment is unavailable for this request');
      return;
    }
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
    recent: tickets.slice(0, 4),
    focusedTicket,
    count: pagination.totalCount || tickets.length,
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
    tickets,
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
        className="h-9 rounded-button px-4 text-sm font-semibold shadow-[0_14px_34px_hsl(var(--primary)/0.18)]"
      >
        <Plus className="mr-2 h-4 w-4" />
        New ticket
      </Button>
    ) : null
  ), [activeActionFeedback, canCreate, handleCreate]);

  const filterButtonComponent = useMemo(() => {
    const hasFilters = Boolean(
      filters.search ||
      (Array.isArray(filters.status) && filters.status.length > 0) ||
      (Array.isArray(filters.priority) && filters.priority.length > 0) ||
      (Array.isArray(filters.category) && filters.category.length > 0) ||
      kpiFilter !== 'all'
    );

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpenFilters}
        data-state={activeActionFeedback === 'filters' ? 'opening' : hasFilters ? 'filtered' : 'idle'}
        aria-label="Filter support"
        className="relative h-9 w-9 rounded-button bg-muted/30 text-muted-foreground transition-[background,color,transform,box-shadow] hover:bg-muted/45 hover:text-primary active:scale-[0.98]"
      >
        <Filter className="h-4 w-4" />
        {hasFilters && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-primary" />}
      </Button>
    );
  }, [activeActionFeedback, filters, handleOpenFilters, kpiFilter]);

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
          onRetry={fetchSupportTickets}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={canManageSupport ? handleOpenAnalytics : null}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
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
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-8 pt-3 text-foreground md:px-6 lg:px-8">
      <SEOHead title="Support" description="Track support requests and issue follow-up." />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] gap-5 xl:gap-6">
        <main className="min-w-0 flex-1">
          <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.72fr)_minmax(560px,1.28fr)]">
            <SupportSignalPanel
              signal={getSupportSignal({ stats: supportStats, tickets, kpiFilter, isProviderOnly })}
              stats={supportStats}
              tickets={tickets}
              kpiFilter={kpiFilter}
              setKpiFilter={handleKpiFilterChange}
              loading={loading}
            />
            <SupportActivitySheet
              filters={{ ...filters, kpiFilter }}
              setFilters={handleApplyFilters}
              openFilters={handleOpenFilters}
              openAnalytics={canManageSupport ? handleOpenAnalytics : null}
              loading={loading}
              errorMessage={supportError}
              onRetry={fetchSupportTickets}
              pagination={pagination}
              activeActionFeedback={activeActionFeedback}
            >
              {loading && tickets.length === 0 && <SupportSkeletonRows />}
              {!loading && supportError && tickets.length === 0 && (
                <SupportEmptyState
                  title="Support did not load"
                  copy="Try again before treating the queue as clear."
                  actionLabel="Try again"
                  onAction={fetchSupportTickets}
                />
              )}
              {!loading && !supportError && pagination.totalCount === 0 && (
                <SupportEmptyState
                  title="No support requests"
                  copy="Create a request or adjust filters to review older support work."
                  actionLabel={canCreate ? 'New ticket' : 'Clear filters'}
                  onAction={canCreate ? handleCreate : handleClearFilters}
                />
              )}
              {tickets.length > 0 && (
                <LayoutGroup>
                  <div className="space-y-2">
                    {canManageSupport && (
                      <SupportSelectAllBar
                        allSelected={tickets.every((ticket) => selectedIds.includes(ticket.id))}
                        selectedCount={selectedIds.length}
                        onSelectAll={handleSelectAll}
                      />
                    )}
                    {tickets.map((ticket, index) => (
                      <SupportTicketRow
                        key={ticket.id}
                        ticket={ticket}
                        selected={isFocused(ticket.id)}
                        index={index}
                        canEdit={canEditTicket(ticket)}
                        canManage={canManageSupport}
                        canAssign={canAssign}
                        isChecked={selectedIds.includes(ticket.id)}
                        onSelect={handleSelect}
                        onFocus={() => setFocused(ticket.id)}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAssign={handleAssign}
                        activeActionFeedback={activeActionFeedback}
                      />
                    ))}
                  </div>
                </LayoutGroup>
              )}
            </SupportActivitySheet>
          </div>
        </main>

        <SupportDetailRail
          ticket={focusedTicket}
          loading={loading}
          canEdit={focusedTicket ? canEditTicket(focusedTicket) : false}
          canManage={canManageSupport}
          canAssign={canAssign}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssign={handleAssign}
          onCreate={handleCreate}
          canCreate={canCreate}
          activeActionFeedback={activeActionFeedback}
        />
      </div>

      <BulkActionBar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])}>
        {canManageSupport && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBulkDelete}
            className="h-10 w-10 rounded-button bg-destructive/15 text-destructive transition-[background,color,transform] hover:bg-destructive hover:text-destructive-foreground active:scale-[0.96]"
            title="Delete selected"
            aria-label={`Delete ${selectedIds.length} selected ticket${selectedIds.length === 1 ? '' : 's'}`}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </BulkActionBar>

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
          isMobile={isMobile}
        />
    </div>
  );
};

const SupportSignalPanel = ({ signal, stats, tickets, kpiFilter, setKpiFilter, loading }) => {
  const SignalIcon = signal.icon;

  return (
    <section className="relative overflow-hidden rounded-sheet bg-card/72 p-5 shadow-[0_28px_90px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/42 md:p-6 xl:min-h-[540px]">
      <div className="absolute inset-x-10 top-0 h-36 rounded-pill bg-primary/10 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col">
        <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-button ${supportToneClass[signal.tone] || supportToneClass.primary}`}>
          <SignalIcon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{signal.label}</p>
        <h1 className="mt-3 max-w-[680px] break-words text-[clamp(2.15rem,4.4vw,4.9rem)] font-semibold leading-[0.98] text-foreground">
          {loading ? 'Loading support' : signal.headline}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          {loading ? 'One moment while the support queue loads.' : signal.subhead}
        </p>

        <SupportStateStrip
          stats={stats}
          tickets={tickets}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />

        <div className="mt-auto grid gap-2 pt-8 sm:grid-cols-2">
          <SupportSignalStat label="Active" value={normalizeCount(stats?.active)} tone="info" />
          <SupportSignalStat label="Resolved" value={normalizeCount(stats?.resolved)} tone="clear" />
        </div>
      </div>
    </section>
  );
};

const SupportStateStrip = ({ stats, tickets, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-8 grid grid-cols-2 gap-2 2xl:grid-cols-4">
    {supportStateOptions.map((option) => {
      const Icon = option.icon;
      const selected = kpiFilter === option.id;
      const count = getStateCount({ id: option.id, stats, tickets });

      return (
        <button
          key={option.id}
          type="button"
          onClick={() => setKpiFilter(option.id)}
          data-state={selected ? 'selected' : 'idle'}
          aria-pressed={selected}
          className={`min-h-[82px] rounded-inner p-3 text-left transition-[background,box-shadow,transform,color] duration-200 active:scale-[0.98] ${selected ? option.activeClass : option.restClass}`}
        >
          <span className="flex items-center justify-between gap-2">
            <Icon className={`h-4 w-4 ${selected ? option.iconClass : 'text-muted-foreground'}`} />
            <span className="text-2xl font-semibold">{loading ? '...' : count}</span>
          </span>
          <span className="mt-2 block text-sm font-medium">{option.label}</span>
        </button>
      );
    })}
  </div>
);

const SupportSignalStat = ({ label, value, tone }) => (
  <div className={`rounded-inner p-4 ${supportToneClass[tone] || supportToneClass.muted}`}>
    <p className="text-xs font-medium opacity-75">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

const SupportActivitySheet = ({
  filters,
  setFilters,
  openFilters,
  openAnalytics,
  loading,
  errorMessage,
  onRetry,
  pagination,
  activeActionFeedback,
  children,
}) => {
  const hasFilters = Boolean(filters?.search || filters?.kpiFilter !== 'all');

  return (
    <section className="rounded-sheet bg-card/72 p-3 shadow-[0_28px_90px_rgb(0_0_0/0.14)] backdrop-blur-2xl dark:bg-card/42 md:p-4 xl:min-h-[540px]">
      <div className="flex flex-col gap-3 p-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Support queue</p>
          <h2 className="text-2xl font-semibold">
            {loading ? 'Loading support' : `${pagination.totalCount} request${pagination.totalCount === 1 ? '' : 's'}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px] flex-1 md:w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
            <input
              type="search"
              value={filters.search || ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search support"
              className="h-10 w-full rounded-button bg-muted/30 pl-9 pr-3 text-sm shadow-inner transition-[background,box-shadow] placeholder:text-muted-foreground/50 focus-visible:bg-muted/45 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
          </div>
          <button
            type="button"
            onClick={openFilters}
            data-state={activeActionFeedback === 'filters' ? 'opening' : hasFilters ? 'filtered' : 'idle'}
            className="flex h-10 w-10 items-center justify-center rounded-button bg-muted/30 text-muted-foreground transition-[background,color,transform] hover:bg-muted/45 hover:text-primary active:scale-[0.98]"
            aria-label="Filter support"
          >
            <Filter className="h-4 w-4" />
          </button>
          {openAnalytics && (
            <button
              type="button"
              onClick={openAnalytics}
              data-state={activeActionFeedback === 'analytics' ? 'opening' : 'idle'}
              className="flex h-10 w-10 items-center justify-center rounded-button bg-primary/10 text-primary transition-[background,transform] hover:bg-primary/15 active:scale-[0.98]"
              aria-label="Open support analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-2 mb-3 flex items-center justify-between rounded-inner bg-amber-500/10 p-3 text-amber-800 shadow-[0_14px_34px_rgba(245,158,11,0.12)] dark:text-amber-100">
          <span className="text-sm">{errorMessage}</span>
          <button type="button" onClick={onRetry} className="rounded-button bg-background/60 px-3 py-2 text-sm font-medium">
            Retry
          </button>
        </div>
      )}

      <div className="min-h-[420px] rounded-card bg-background/45 p-2 shadow-inner dark:bg-black/10">
        {children}
      </div>

      <div className="px-2 pt-3">
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
  );
};

const SupportSelectAllBar = ({ allSelected, selectedCount, onSelectAll }) => (
  <div className="flex items-center justify-between px-2 py-1">
    <button
      type="button"
      role="checkbox"
      aria-checked={allSelected}
      onClick={() => onSelectAll(!allSelected)}
      className="flex items-center gap-2 rounded-button px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-icon transition-colors ${allSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-transparent'}`}>
        <Check className="h-3 w-3" />
      </span>
      Select all
    </button>
    {selectedCount > 0 && (
      <span className="rounded-pill bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {selectedCount} selected
      </span>
    )}
  </div>
);

const SupportTicketRow = ({
  ticket,
  selected,
  index,
  canEdit,
  canManage,
  canAssign,
  isChecked,
  onSelect,
  onFocus,
  onView,
  onEdit,
  onDelete,
  onAssign,
  activeActionFeedback,
}) => {
  const statusOption = STATUSES.find((item) => item.value === ticket.status) || STATUSES[0];
  const priority = PRIORITIES.find((item) => item.value === ticket.priority) || PRIORITIES[1];
  const rowTone = ticket.status === 'resolved' || ticket.status === 'closed'
    ? supportToneClass.clear
    : ticket.status === 'in_progress'
      ? supportToneClass.info
      : supportToneClass.warning;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.2) }}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      data-state={selected ? 'selected' : 'idle'}
      className={`grid min-h-[88px] cursor-pointer grid-cols-[minmax(180px,1.4fr)_minmax(110px,0.7fr)_minmax(120px,0.7fr)_auto] items-center gap-3 rounded-card px-4 py-3 transition-[background,box-shadow,transform] duration-200 active:scale-[0.995] ${selected ? 'bg-foreground/[0.07] shadow-[0_24px_70px_rgb(0_0_0/0.14)] dark:bg-white/[0.075]' : 'bg-muted/22 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgb(0_0_0/0.10)]'}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {canManage && (
            <button
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(ticket.id, !isChecked);
              }}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-icon transition-colors ${isChecked ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-transparent hover:bg-muted/60'}`}
              aria-label={isChecked ? `Deselect ${ticket.subject}` : `Select ${ticket.subject}`}
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-button ${rowTone}`}>
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{ticket.subject}</h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{ticket.message || 'No message added'}</p>
          </div>
        </div>
      </div>
      <span className="rounded-pill bg-muted/36 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {statusOption.label}
      </span>
      <span className="rounded-pill bg-muted/36 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {priority.label}
      </span>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onView(ticket);
          }}
          data-state={activeActionFeedback === `view-${ticket.id}` ? 'opening' : 'idle'}
          className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground transition-[background,color,transform] hover:bg-background/90 hover:text-primary active:scale-[0.96]"
          aria-label={`View ${ticket.subject}`}
        >
          <Eye className="h-4 w-4" />
        </button>
        {canAssign && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAssign(ticket);
            }}
            data-state={activeActionFeedback === `assign-${ticket.id}` ? 'opening' : 'idle'}
            className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground transition-[background,color,transform] hover:bg-background/90 hover:text-primary active:scale-[0.96]"
            aria-label={`Assign ${ticket.subject} to me`}
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(ticket);
            }}
            data-state={activeActionFeedback === `edit-${ticket.id}` ? 'opening' : 'idle'}
            className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground transition-[background,color,transform] hover:bg-background/90 hover:text-primary active:scale-[0.96]"
            aria-label={`Edit ${ticket.subject}`}
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(ticket);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-button bg-destructive/10 text-destructive transition-[background,color,transform] hover:bg-destructive/20 active:scale-[0.96]"
            aria-label={`Delete ${ticket.subject}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.article>
  );
};

const SupportDetailRail = ({ ticket, loading, canEdit, canManage, canAssign, onView, onEdit, onDelete, onAssign, onCreate, canCreate, activeActionFeedback }) => (
  <aside className="hidden w-[340px] shrink-0 2xl:block">
    <div className="sticky top-5 rounded-sheet bg-card/72 p-5 shadow-[0_28px_90px_rgb(0_0_0/0.15)] backdrop-blur-2xl dark:bg-card/42">
      <p className="text-sm font-medium text-muted-foreground">Focused request</p>
      {loading && !ticket ? (
        <div className="mt-5">
          <TableSkeleton rows={4} />
        </div>
      ) : ticket ? (
        <>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">{ticket.subject}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{ticket.message || 'No message was added.'}</p>
          <div className="mt-5 space-y-2">
            <SupportDetailFact label="Status" value={titleCase(ticket.status || 'open')} />
            <SupportDetailFact label="Priority" value={titleCase(ticket.priority || 'normal')} />
            <SupportDetailFact label="Category" value={titleCase(ticket.category || 'general')} />
            <SupportDetailFact label="Created" value={ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Not available'} />
          </div>
          <div className="mt-6 space-y-2">
            <Button
              type="button"
              onClick={() => onView(ticket)}
              data-state={activeActionFeedback === `view-${ticket.id}` ? 'opening' : 'idle'}
              className="h-11 w-full rounded-button text-sm font-semibold shadow-[0_14px_34px_hsl(var(--primary)/0.18)]"
            >
              View details
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onEdit(ticket)}
                data-state={activeActionFeedback === `edit-${ticket.id}` ? 'opening' : 'idle'}
                className="h-11 w-full rounded-button bg-muted/36 text-sm font-semibold hover:bg-muted/50"
              >
                Edit request
              </Button>
            )}
            {canAssign && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onAssign(ticket)}
                data-state={activeActionFeedback === `assign-${ticket.id}` ? 'opening' : 'idle'}
                className="h-11 w-full rounded-button bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign to me
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(ticket)}
                className="h-11 w-full rounded-button bg-destructive/10 text-sm font-semibold text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete request
              </Button>
            )}
          </div>
          <p className="mt-5 rounded-inner bg-muted/24 p-3 text-xs leading-5 text-muted-foreground">
            Status transitions stay backend-owned; the actions above are the proved support commands.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-3 text-2xl font-semibold">No request selected</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Create a support request or change filters.</p>
          {canCreate && (
            <Button type="button" onClick={onCreate} className="mt-5 h-11 w-full rounded-button text-sm font-semibold">
              New ticket
            </Button>
          )}
        </>
      )}
    </div>
  </aside>
);

const SupportDetailFact = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-inner bg-muted/24 px-3 py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="max-w-[170px] truncate text-sm font-medium text-foreground">{value}</span>
  </div>
);

const SupportSkeletonRows = () => (
  <div className="space-y-2">
    {[0, 1, 2, 3].map((item) => (
      <div key={item} className="h-[88px] animate-pulse rounded-card bg-muted/26" />
    ))}
  </div>
);

const SupportEmptyState = ({ title, copy, actionLabel, onAction }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-button bg-primary/10 text-primary shadow-[0_16px_42px_hsl(var(--primary)/0.14)]">
      <Headphones className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-2xl font-semibold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
    {onAction && (
      <Button type="button" onClick={onAction} className="mt-5 h-10 rounded-button px-4 text-sm font-semibold">
        <RefreshCw className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    )}
  </div>
);

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
    />
  </>
);
