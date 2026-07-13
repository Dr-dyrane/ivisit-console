import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAmbulance } from '../../../services/ambulancesService';
import { getHospitals } from '../../../services/hospitalsService';
import { useAmbulancesQuery } from '../../../hooks/useAmbulancesQuery';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  AMBULANCE_DEFAULT_SORT,
  AMBULANCE_PAGE_SIZE,
  buildAmbulanceFilterSchema,
  buildAmbulanceQueryFilter,
  buildAmbulanceRouteContext,
  cycleAmbulanceSort,
  getAmbulanceRoleKind,
  hasActiveAmbulanceFilters,
} from './ambulancePageModel';

export const useAmbulancesPageController = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const admin = isAdmin();
  const orgAdmin = isOrgAdmin();
  const canManageFleet = admin || orgAdmin;

  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [hospitals, setHospitals] = useState([]);
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState(AMBULANCE_DEFAULT_SORT);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const actionFeedbackTimeoutRef = useRef(null);

  const pagination = usePagination(AMBULANCE_PAGE_SIZE);
  const {
    currentPage,
    itemsPerPage,
    paginationRange,
    setTotalCount,
    resetPagination,
  } = pagination;

  const roleKind = useMemo(
    () => getAmbulanceRoleKind({ admin, orgAdmin }),
    [admin, orgAdmin]
  );
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const queryFilter = useMemo(() => buildAmbulanceQueryFilter({
    filters,
    kpiFilter,
    sortConfig,
    isMobile,
    currentPage,
    itemsPerPage,
    offset: paginationRange.start,
  }), [
    filters,
    kpiFilter,
    sortConfig,
    isMobile,
    currentPage,
    itemsPerPage,
    paginationRange.start,
  ]);

  const {
    ambulances,
    count: ambulanceCount,
    stats: ambulancePageStats,
    loading,
    isFetching,
    error: ambulanceQueryError,
    refetch,
  } = useAmbulancesQuery(queryFilter);

  const fetchAmbulances = refetch;
  const loadError = ambulanceQueryError
    ? (ambulanceQueryError.message || 'Fleet could not load.')
    : null;

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('ambulances', ambulances);
  const focusedAmbulance = focusedRecord;

  const setKeyboardFocusedId = useCallback((id) => {
    if (id == null) {
      setFocused(null);
      return;
    }
    if (focusedAmbulance?.id !== id) setFocused(id);
  }, [focusedAmbulance, setFocused]);

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(ambulances);

  const markActionFeedback = useCallback((key) => {
    setActiveActionFeedback(key);
    if (actionFeedbackTimeoutRef.current) {
      window.clearTimeout(actionFeedbackTimeoutRef.current);
    }
    actionFeedbackTimeoutRef.current = window.setTimeout(
      () => setActiveActionFeedback(null),
      900
    );
  }, []);

  useEffect(() => () => {
    if (actionFeedbackTimeoutRef.current) {
      window.clearTimeout(actionFeedbackTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    getHospitals({ quiet: true, limit: 500 })
      .then((result) => {
        setHospitals(Array.isArray(result) ? result : result?.data || []);
      })
      .catch((error) => console.error('Error fetching ambulance station filters:', error));
  }, [admin]);

  useEffect(() => {
    setTotalCount(ambulanceCount || 0);
  }, [ambulanceCount, setTotalCount]);

  useEffect(() => {
    resetPagination();
  }, [filters, kpiFilter, sortConfig.key, sortConfig.direction, resetPagination]);

  const hasFilter = hasActiveAmbulanceFilters(filters);
  const failedEmpty = Boolean(loadError) && ambulances.length === 0;

  const ambulanceRouteContext = useMemo(() => buildAmbulanceRouteContext({
    ambulances,
    stats: ambulancePageStats,
    focusedAmbulance,
    totalCount: pagination.totalCount,
    loading,
    loadError,
    canEdit: canManageFleet,
  }), [
    ambulances,
    ambulancePageStats,
    focusedAmbulance,
    pagination.totalCount,
    loading,
    loadError,
    canManageFleet,
  ]);

  const publishAmbulancesRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('ambulancesRouteContextUpdated', {
      detail: ambulanceRouteContext,
    }));
  }, [ambulanceRouteContext]);

  useEffect(() => {
    publishAmbulancesRouteContext();
  }, [publishAmbulancesRouteContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
    return () => {
      window.removeEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
    };
  }, [publishAmbulancesRouteContext]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => cycleAmbulanceSort(current, key));
  }, []);

  const handleKpiFilterChange = useCallback((id) => {
    setKpiFilter(id);
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    setFilters((currentFilters) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setKpiFilter('all');
  }, []);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    setSelectedAmbulance(null);
    setModalMode('create');
  }, [markActionFeedback]);

  const handleView = useCallback((ambulance) => {
    markActionFeedback(`view-${ambulance.id}`);
    if (ambulance?.id) setFocused(ambulance.id);
    setSelectedAmbulance(ambulance);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleEdit = useCallback((ambulance) => {
    markActionFeedback(`edit-${ambulance.id}`);
    if (ambulance?.id) setFocused(ambulance.id);
    setSelectedAmbulance(ambulance);
    setModalMode('edit');
  }, [markActionFeedback, setFocused]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      handleCreate();
      return undefined;
    }

    const unitId = params.get('id');
    if (!unitId) return undefined;

    let active = true;
    getAmbulance(unitId)
      .then((unit) => {
        if (!active || !unit) return;
        setFocused(unit.id);
        setSelectedAmbulance(unit);
        setModalMode('view');
      })
      .catch((error) => console.error('Error loading ambulance deep link:', error));

    return () => {
      active = false;
    };
  }, [handleCreate, location.search, setFocused]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    window.addEventListener('openAmbulanceModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openAmbulanceModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedAmbulance(null);
  }, []);

  const filterSchema = useMemo(
    () => buildAmbulanceFilterSchema({ hospitals, admin }),
    [hospitals, admin]
  );

  return {
    isMobile,
    role: {
      admin,
      orgAdmin,
      canManageFleet,
    },
    data: {
      ambulances,
      ambulancePageStats,
      loading,
      isFetching,
      loadError,
      failedEmpty,
      fetchAmbulances,
    },
    state: {
      selectedAmbulance,
      modalMode,
      filterSheetOpen,
      filters,
      kpiFilter,
      analyticsModalOpen,
      activeActionFeedback,
      sortConfig,
      focusedAmbulance,
      hasFilter,
    },
    setters: {
      setFilterSheetOpen,
      setAnalyticsModalOpen,
    },
    actions: {
      handleSort,
      handleKpiFilterChange,
      handleApplyFilters,
      handleClearFilters,
      handleOpenFilters,
      handleOpenAnalytics,
      handleCreate,
      handleView,
      handleEdit,
      handleModalClose,
      setFocused,
      isFocused,
      setKeyboardFocusedId,
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
    queryFilter,
    filterSchema,
    wayfinding: {
      visibleModuleRail,
      routingPath,
      handleRailNavigate,
    },
  };
};
