import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useSupportTicketsQuery } from '../../../hooks/useSupportTicketsQuery';
import { getSupportFAQs } from '../../../services/supportFaqsService';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import { pruneSupportTicketIdsFromCache } from '../../mobile/support/mobileSupportModel';
import {
  buildSupportAnalytics,
  buildSupportFaqTile,
  buildSupportQueryFilter,
  hasActiveSupportFilters,
} from './supportTicketsModel';
import { useSupportTicketCommands } from './useSupportTicketCommands';

const SUPPORT_FAQ_TILE_LIMIT = 5;

export const useSupportTicketsPageController = ({
  locationPathname,
  locationSearch,
  navigate,
}) => {
  const { isAdmin, isOrgAdmin, isProvider, profile } = useAuth();
  const { isMobile } = useNavigation();
  const isProviderOnly = !isAdmin() && !isOrgAdmin() && isProvider();
  const canCreate = isAdmin() || isOrgAdmin() || isProvider();
  const canManageSupport = isAdmin() || isOrgAdmin();
  const queryClient = useQueryClient();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: [],
    priority: [],
    category: [],
    assigned: 'all',
    kpiFilter: 'all',
  });
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [confirmedDeletedTicketIds, setConfirmedDeletedTicketIds] = useState([]);
  const pagination = usePagination(20);
  const { resetPagination, setTotalCount } = pagination;
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const deepLinkHandledRef = useRef(null);

  const roleKind = isAdmin()
    ? 'admin'
    : (isOrgAdmin() ? 'org_admin' : (isProvider() ? 'provider' : 'viewer'));
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  const queryFilter = useMemo(() => buildSupportQueryFilter({
    filters,
    kpiFilter,
    limit: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortConfig,
    viewerId: profile?.id || null,
  }), [
    filters,
    kpiFilter,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    profile?.id,
    sortConfig,
  ]);

  const {
    tickets,
    count,
    stats: supportStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useSupportTicketsQuery(queryFilter);

  const supportError = queryError ? 'Support could not load. Try again.' : null;
  const loadError = supportError;
  const ticketRows = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);

  const recordConfirmedTicketDeletion = useCallback((requestedId, deletedTicket) => {
    const requestedKey = requestedId === null || requestedId === undefined
      ? ''
      : String(requestedId);
    const confirmedKey = deletedTicket?.id === null || deletedTicket?.id === undefined
      ? ''
      : String(deletedTicket.id);

    if (!requestedKey || confirmedKey !== requestedKey) {
      throw new Error('Support request deletion could not be confirmed.');
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

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('support', ticketRows);
  const focusedTicket = focusedRecord;
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
  const analytics = useMemo(
    () => buildSupportAnalytics(supportStats, ticketRows),
    [supportStats, ticketRows]
  );

  // ADOPT-61: read-only FAQ reference tile for the route-owned context panel.
  // The enrichment read is NON-FATAL and isolated in its own query: an
  // RLS-blocked or failed support_faqs read renders the tile's unavailable
  // state and can never kill the ticket queue read above.
  const supportFaqsQuery = useQuery({
    queryKey: ['supportFaqs', 'reference', SUPPORT_FAQ_TILE_LIMIT],
    queryFn: () => getSupportFAQs({ limit: SUPPORT_FAQ_TILE_LIMIT }),
    staleTime: 60_000,
  });
  const supportFaqContext = useMemo(() => ({
    ...buildSupportFaqTile(supportFaqsQuery.data),
    loading: supportFaqsQuery.isLoading,
    errorMessage: supportFaqsQuery.error ? 'FAQs could not load.' : null,
  }), [supportFaqsQuery.data, supportFaqsQuery.error, supportFaqsQuery.isLoading]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (actionFeedbackTimerRef.current) {
        window.clearTimeout(actionFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTotalCount(count || 0);
  }, [count, setTotalCount]);

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
    resetPagination();
    setFilters((currentFilters) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    resetPagination();
    setKpiFilter(nextFilter);
    setFilters((current) => ({ ...current, kpiFilter: nextFilter }));
  }, [resetPagination]);

  const handleSort = useCallback((key) => {
    resetPagination();
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, [resetPagination]);

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

  const {
    assignPending,
    canAssign,
    canEditTicket,
    clearCreateConvergenceNotice,
    closeConfirmation,
    confirmationModal,
    createConvergenceNotice,
    deletePending,
    handleAssign,
    handleBulkDelete,
    handleCreate,
    handleDelete,
    handleEdit,
    handleSave,
    handleView,
    modalMode,
    selectedTicket,
    setModalMode,
  } = useSupportTicketCommands({
    canCreate,
    canManageSupport,
    clearSelection,
    handleToggleSelect,
    isFocused,
    isProvider,
    markActionFeedback,
    profile,
    queryFilter,
    recordConfirmedTicketDeletion,
    selectedIds,
    setFocused,
  });

  const fetchSupportTickets = useCallback(async () => {
    const result = await refetch();
    if (!result?.error) clearCreateConvergenceNotice();
    return result;
  }, [clearCreateConvergenceNotice, refetch]);

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const wantsCreate = params.get('add') === 'true' || params.get('new') === 'true';
    const deepLinkKey = `${locationPathname}${locationSearch}`;

    if (!wantsCreate || deepLinkHandledRef.current === deepLinkKey) return;

    deepLinkHandledRef.current = deepLinkKey;
    handleCreate();
    params.delete('add');
    params.delete('new');
    params.delete('from');

    const nextSearch = params.toString();
    navigate({
      pathname: locationPathname,
      search: nextSearch ? `?${nextSearch}` : '',
    }, { replace: true });
  }, [handleCreate, locationPathname, locationSearch, navigate]);

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
    faqs: supportFaqContext,
  }), [
    canCreate,
    canManageSupport,
    focusedTicket,
    isProviderOnly,
    kpiFilter,
    loading,
    pagination.totalCount,
    supportError,
    supportFaqContext,
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
    handleApplyFilters({ search: '', status: [], priority: [], category: [], assigned: 'all', kpiFilter: 'all' });
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

  return {
    activeActionFeedback,
    allSelected,
    analytics,
    analyticsModalOpen,
    assignPending,
    canAssign,
    canCreate,
    canEditTicket,
    canManageSupport,
    clearSelection,
    closeConfirmation,
    confirmedDeletedTicketIds,
    confirmationModal,
    createConvergenceNotice,
    deletePending,
    fetchSupportTickets,
    filterSheetOpen,
    filters,
    focusedTicket,
    handleApplyFilters,
    handleAssign,
    handleBulkDelete,
    handleClearFilters,
    handleCreate,
    handleDelete,
    handleEdit,
    handleKpiFilterChange,
    handleMobileFiltersChange,
    handleOpenAnalytics,
    handleOpenFilters,
    handleRailNavigate,
    handleSave,
    handleSelectAll,
    handleSelectClick,
    handleSort,
    handleToggleSelect,
    handleView,
    hasFilter,
    isFetching,
    isMobile,
    isProviderOnly,
    kpiFilter,
    loadError,
    loading,
    modalMode,
    pagination,
    routingPath,
    selectable,
    selectedIds,
    selectedTicket,
    setAnalyticsModalOpen,
    setFilterSheetOpen,
    setFocused,
    setKpiFilter,
    setModalMode,
    setSearchFilter,
    someSelected,
    sortConfig,
    supportError,
    supportStats,
    ticketRows,
    visibleModuleRail,
  };
};
