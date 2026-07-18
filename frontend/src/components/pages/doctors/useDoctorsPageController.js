import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDoctorsQuery } from '../../../hooks/useDoctorsQuery';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { scheduledCareRelease } from '../../../config/scheduledCareRelease';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  buildStaffQueryFilter,
  buildStaffStats,
  getStaffRoleKind,
  hasActiveStaffFilters,
  STAFF_DEFAULT_SORT,
  STAFF_FILTER_SCHEMA,
  STAFF_PAGE_SIZE,
} from './staffPageModel';
import { useDoctorsRouteBridge } from './useDoctorsRouteBridge';

export const useDoctorsPageController = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useNavigation();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleInitialDoctor, setScheduleInitialDoctor] = useState(null);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [sortConfig, setSortConfig] = useState(STAFF_DEFAULT_SORT);

  const pagination = usePagination(STAFF_PAGE_SIZE);
  const { resetPagination, setTotalCount } = pagination;
  const canManageStaff = isAdmin() || isOrgAdmin();
  const canManageSchedules = canManageStaff && scheduledCareRelease.scheduleReads;
  const admin = isAdmin();
  const orgAdmin = isOrgAdmin();

  const roleKind = getStaffRoleKind({ admin, orgAdmin });
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  const queryFilter = useMemo(() => buildStaffQueryFilter({
    filters: {
      kpiFilter: filters.kpiFilter,
      search: filters.search,
      specialization: filters.specialization,
      status: filters.status,
      created_at: filters.created_at,
    },
    isMobile,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortConfig: {
      key: sortConfig.key,
      direction: sortConfig.direction,
    },
  }), [
    filters.kpiFilter,
    filters.search,
    filters.specialization,
    filters.status,
    filters.created_at,
    isMobile,
    pagination.currentPage,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const {
    doctors,
    count,
    stats: staffStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useDoctorsQuery(queryFilter);

  const loadError = queryError ? 'Staff could not load. Check your connection and try again.' : null;
  useEffect(() => {
    if (queryError) console.error('[staff] load failed:', queryError);
  }, [queryError]);

  const derivedStats = useMemo(
    () => buildStaffStats({ staffStats, count }),
    [staffStats, count]
  );
  const staffRows = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);

  const {
    focusedRecord: focusedStaff,
    setFocused,
    isFocused,
  } = useFocusedRecord('doctors', staffRows);

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(staffRows);

  const hasFilter = hasActiveStaffFilters(filters);
  const activeStaffFilter = filters.kpiFilter || 'all';

  useEffect(() => {
    setTotalCount(count);
  }, [count, setTotalCount]);

  useEffect(() => {
    resetPagination();
    clearSelection();
  }, [filters, sortConfig, resetPagination, clearSelection]);

  const fetchDoctors = refetch;

  const handleCreate = useCallback(() => {
    if (!canManageStaff) return;
    setSelectedDoctor(null);
    setModalMode('create');
  }, [canManageStaff]);

  const handleOpenFilters = useCallback(() => {
    setFilterSheetOpen(true);
  }, []);

  const handleOpenAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleView = useCallback((doctor) => {
    const id = doctor?.id || null;
    if (id && !isFocused(id)) setFocused(id);
    setSelectedDoctor(doctor);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleEdit = useCallback((doctor) => {
    if (!canManageStaff) return;
    setSelectedDoctor(doctor);
    setModalMode('edit');
  }, [canManageStaff]);

  const handleSchedule = useCallback((doctor = null) => {
    if (!canManageSchedules) return;
    const requestedDoctor = doctor?.id && doctor?.hospital_id ? doctor : focusedStaff;
    setScheduleInitialDoctor(requestedDoctor || null);
    setScheduleModalOpen(true);
  }, [canManageSchedules, focusedStaff]);

  const handleScheduleClose = useCallback(() => {
    setScheduleModalOpen(false);
    setScheduleInitialDoctor(null);
    const params = new URLSearchParams(location.search);
    if (params.has('schedule')) {
      params.delete('schedule');
    }
    if (params.has('copilot')) params.delete('copilot');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const scheduleId = useMemo(
    () => new URLSearchParams(location.search).get('schedule'),
    [location.search],
  );
  const copilotScheduleRequested = useMemo(
    () => new URLSearchParams(location.search).get('copilot') === 'schedule',
    [location.search],
  );

  useEffect(() => {
    if (!scheduleId || !canManageSchedules) return;
    setScheduleInitialDoctor(null);
    setScheduleModalOpen(true);
  }, [canManageSchedules, scheduleId]);

  useEffect(() => {
    if (!copilotScheduleRequested || !canManageSchedules) return;
    setScheduleInitialDoctor(null);
    setScheduleModalOpen(true);
  }, [canManageSchedules, copilotScheduleRequested]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedDoctor(null);
  }, []);

  const setKpiFilter = useCallback((id) => {
    setFilters((previous) => ({ ...previous, kpiFilter: id || 'all' }));
  }, []);

  const setSearchFilter = useCallback((search) => {
    setFilters((previous) => ({ ...previous, search }));
  }, []);

  useDoctorsRouteBridge({
    staffRows,
    stats: derivedStats,
    focusedStaff,
    loading,
    count,
    canManageStaff,
    fetchDoctors,
    setFocused,
    handleCreate,
    handleOpenFilters,
    handleOpenAnalytics,
    handleSchedule,
    canManageSchedules,
  });

  return {
    isMobile,
    role: {
      admin,
      orgAdmin,
      canManageStaff,
      canManageSchedules,
    },
    data: {
      staffRows,
      count,
      derivedStats,
      loading,
      isFetching,
      loadError,
      fetchDoctors,
    },
    state: {
      selectedDoctor,
      modalMode,
      analyticsModalOpen,
      filterSheetOpen,
      scheduleModalOpen,
      scheduleInitialDoctor,
      scheduleId,
      filters,
      sortConfig,
      focusedStaff,
      hasFilter,
      activeStaffFilter,
    },
    setters: {
      setAnalyticsModalOpen,
      setFilterSheetOpen,
      setFilters,
    },
    actions: {
      handleCreate,
      handleOpenFilters,
      handleOpenAnalytics,
      handleView,
      handleEdit,
      handleSchedule,
      handleScheduleClose,
      handleSort,
      handleModalClose,
      setKpiFilter,
      setSearchFilter,
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
      selectable: canManageStaff,
    },
    pagination,
    filterSchema: STAFF_FILTER_SCHEMA,
    queryFilter,
    wayfinding: {
      visibleModuleRail,
      routingPath,
      handleRailNavigate,
    },
  };
};
