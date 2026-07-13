import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { useOrganizationsQuery } from '../../../hooks/useOrganizationsQuery';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  buildOrganizationAnalytics,
  buildOrganizationQueryFilter,
  buildOrganizationsPanelContext,
  hasActiveOrganizationFilters,
  ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE,
  ORGANIZATION_DEFAULT_FILTERS,
  ORGANIZATION_DEFAULT_SORT,
  ORGANIZATION_FILTER_SCHEMA,
  ORGANIZATION_PAGE_SIZE,
} from './organizationPageModel';

export const useOrganizationsPageController = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const [filters, setFilters] = useState(ORGANIZATION_DEFAULT_FILTERS);
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState(ORGANIZATION_DEFAULT_SORT);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [organizationCommandNotice, setOrganizationCommandNotice] = useState(null);

  const pagination = usePagination(ORGANIZATION_PAGE_SIZE);
  const {
    itemsPerPage,
    paginationRange,
    resetPagination,
    setTotalCount,
  } = pagination;
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const deepLinkHandledRef = useRef(null);

  const canManageOrganizations = isAdmin();
  const selectable = canManageOrganizations;
  const roleKind = canManageOrganizations ? 'admin' : 'viewer';
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const queryFilter = useMemo(() => buildOrganizationQueryFilter({
    filters,
    kpiFilter,
    itemsPerPage,
    offset: paginationRange.start,
    sortConfig,
  }), [
    filters,
    itemsPerPage,
    kpiFilter,
    paginationRange.start,
    sortConfig,
  ]);

  const {
    organizations,
    count,
    stats: orgStats,
    loading,
    isFetching,
    isPlaceholderData,
    error: queryError,
    refetch,
  } = useOrganizationsQuery(queryFilter);

  const organizationError = queryError ? 'Organizations could not load. Try again.' : null;
  const loadError = organizationError;
  const fetchOrganizations = refetch;
  const orgRows = useMemo(
    () => (Array.isArray(organizations) ? organizations : []),
    [organizations]
  );

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('organizations', orgRows);
  const focusedOrg = focusedRecord;

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(orgRows);

  const hasFilter = hasActiveOrganizationFilters(filters, kpiFilter);

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

  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('organizations_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => {
        if (active && isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['organizations'] });
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const handleOrganizationCommandUnavailable = useCallback(() => {
    setOrganizationCommandNotice(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
    toast.info(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    resetPagination();
    setFilters((current) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(current)
        : (nextFiltersOrUpdater || {})
    ));
  }, [resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    resetPagination();
    setKpiFilter(nextFilter);
  }, [resetPagination]);

  const mobileFilters = useMemo(() => ({ ...filters, kpiFilter }), [filters, kpiFilter]);

  const handleMobileFiltersChange = useCallback((nextFiltersOrUpdater) => {
    const current = { ...filters, kpiFilter };
    const next = typeof nextFiltersOrUpdater === 'function'
      ? nextFiltersOrUpdater(current)
      : (nextFiltersOrUpdater || {});
    const nextSearch = next.search || '';
    const nextKpiFilter = next.kpiFilter || 'all';

    if (nextSearch === filters.search && nextKpiFilter === kpiFilter) return;
    resetPagination();
    setFilters({ search: nextSearch });
    setKpiFilter(nextKpiFilter);
  }, [filters, kpiFilter, resetPagination]);

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

  const handleView = useCallback((organization) => {
    markActionFeedback(`view-${organization?.id || 'unknown'}`);
    if (organization?.id && !isFocused(organization.id)) setFocused(organization.id);
    setSelectedOrg(organization);
    setModalMode('view');
  }, [isFocused, markActionFeedback, setFocused]);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedOrg(null);
  }, []);

  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    return handleOrganizationCommandUnavailable();
  }, [handleOrganizationCommandUnavailable, markActionFeedback]);

  const handleSave = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    return handleOrganizationCommandUnavailable();
  }, [handleOrganizationCommandUnavailable]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({ search: '' });
  }, [handleApplyFilters, handleKpiFilterChange]);

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
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  }, [handleCreate, location.pathname, location.search, navigate]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    window.addEventListener('openOrganizationModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openOrganizationModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  const organizationsPanelContext = useMemo(() => buildOrganizationsPanelContext({
    stats: orgStats,
    organizations: orgRows,
    focusedOrganization: focusedOrg,
    totalCount: pagination.totalCount,
    loading,
    errorMessage: organizationError,
    currentState: kpiFilter,
  }), [
    focusedOrg,
    kpiFilter,
    loading,
    organizationError,
    orgRows,
    orgStats,
    pagination.totalCount,
  ]);

  const publishOrganizationsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('organizationsRouteContextUpdated', {
      detail: organizationsPanelContext,
    }));
  }, [organizationsPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishOrganizationsRouteContext();
    window.addEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);

    return () => {
      window.removeEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);
    };
  }, [publishOrganizationsRouteContext]);

  const analytics = useMemo(() => buildOrganizationAnalytics(orgStats), [orgStats]);

  return {
    isMobile,
    role: {
      canManageOrganizations,
      selectable,
    },
    data: {
      organizations: orgRows,
      orgStats,
      loading,
      isFetching,
      isPlaceholderData,
      organizationError,
      loadError,
      fetchOrganizations,
    },
    state: {
      filters,
      mobileFilters,
      kpiFilter,
      sortConfig,
      filterSheetOpen,
      analyticsModalOpen,
      selectedOrg,
      modalMode,
      activeActionFeedback,
      organizationCommandNotice,
      focusedOrg,
      hasFilter,
    },
    setters: {
      setFilterSheetOpen,
      setAnalyticsModalOpen,
    },
    actions: {
      handleApplyFilters,
      handleKpiFilterChange,
      handleMobileFiltersChange,
      handleSort,
      setSearchFilter,
      handleView,
      handleModalClose,
      handleSave,
      handleOpenFilters,
      handleOpenAnalytics,
      handleClearFilters,
      setFocused,
    },
    selection: {
      selectedIds,
      handleSelectClick,
      handleToggleSelect,
      handleSelectAll,
      clearSelection,
      allSelected,
      someSelected,
    },
    pagination,
    filterSchema: ORGANIZATION_FILTER_SCHEMA,
    analytics,
    wayfinding: {
      visibleModuleRail,
      routingPath,
      handleRailNavigate,
    },
  };
};
