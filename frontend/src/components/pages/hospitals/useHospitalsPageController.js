import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { usePagination } from '../../../hooks/usePagination';
import { useHospitalsQuery } from '../../../hooks/useHospitalsQuery';
import { applyOptimisticUpsert, useHospitalsMutations } from '../../../hooks/useHospitalsMutations';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { createNotification, NotificationActions, NotificationTypes } from '../../../services/notificationService';
import { getHospital, updateHospital } from '../../../services/hospitalsService';
import { isQueryAbortError } from '../../../services/queryAbort';
import { handleApiError } from '../../../utils/errorHandler';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  buildHospitalQueryFilter,
  canActorEditHospital,
  buildHospitalPanelContext,
  getHospitalRoleKind,
  HOSPITAL_DEFAULT_SORT,
  HOSPITAL_FILTER_SCHEMA,
  HOSPITAL_PAGE_SIZE,
} from './hospitalPageModel';

export const useHospitalsPageController = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver, orgId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useNavigation();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const admin = isAdmin();
  const orgAdmin = isOrgAdmin();
  const provider = isProvider();
  const driver = isDriver();
  const canEditHospitals = admin || orgAdmin;

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [sortConfig, setSortConfig] = useState(HOSPITAL_DEFAULT_SORT);

  const pagination = usePagination(HOSPITAL_PAGE_SIZE);
  const { resetPagination, setTotalCount } = pagination;
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const lastInsertToastAtRef = useRef(0);

  const canEditHospital = useCallback((hospital) => canActorEditHospital({
    admin,
    orgAdmin,
    orgId,
  }, hospital), [admin, orgAdmin, orgId]);

  const roleKind = useMemo(() => getHospitalRoleKind({
    admin,
    orgAdmin,
    provider,
    driver,
  }), [admin, orgAdmin, provider, driver]);

  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const queryFilter = useMemo(() => buildHospitalQueryFilter({
    filters,
    kpiFilter,
    itemsPerPage: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortConfig,
  }), [
    filters,
    kpiFilter,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig,
  ]);

  const {
    hospitals,
    count,
    stats: hospitalPageStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useHospitalsQuery(queryFilter);

  const hospitalPageError = queryError ? 'Hospitals could not load. Try again.' : null;
  const fetchHospitals = refetch;

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('hospitals', hospitals);
  const focusedHospital = focusedRecord;

  const setKeyboardFocusedId = useCallback((id) => {
    if (id == null) {
      setFocused(null);
      return;
    }
    if (focusedHospital?.id !== id) {
      setFocused(id);
    }
  }, [focusedHospital, setFocused]);

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(hospitals);

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
    setTotalCount(count);
  }, [count, setTotalCount]);

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
  }, [resetPagination]);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel('hospitals_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        if (active && isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['hospitals'] });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hospitals' }, (payload) => {
        if (!active || !isMountedRef.current || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        toast('New facility added', payload?.new?.name ? { description: payload.new.name } : undefined);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hospitalId = params.get('id');
    if (!hospitalId) return undefined;

    let active = true;
    const controller = new AbortController();
    getHospital(hospitalId, { abortSignal: controller.signal })
      .then((specificHospital) => {
        if (!active || !isMountedRef.current || !specificHospital) return;
        setFocused(specificHospital.id);
        setSelectedHospital(specificHospital);
        setModalMode('view');
      })
      .catch((error) => {
        if (isQueryAbortError(error)) return;
        handleApiError(error, 'fetch');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [location.search, setFocused]);

  const handleFacilityApprovals = useCallback(() => {
    markActionFeedback('facility-approvals');
    navigate('/verification?queue=organizations');
  }, [markActionFeedback, navigate]);

  const handleCreateUnavailable = useCallback(() => {
    markActionFeedback('create-unavailable');
    toast.info('Add facility is unavailable');
  }, [markActionFeedback]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const hospitalPanelContext = useMemo(() => buildHospitalPanelContext({
    stats: hospitalPageStats,
    hospitals,
    focusedHospital,
    totalCount: pagination.totalCount,
    loading,
    errorMessage: hospitalPageError,
    currentState: kpiFilter,
    canEdit: canEditHospitals,
  }), [
    canEditHospitals,
    focusedHospital,
    hospitalPageError,
    hospitalPageStats,
    hospitals,
    kpiFilter,
    loading,
    pagination.totalCount,
  ]);

  const publishHospitalsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('hospitalsRouteContextUpdated', {
      detail: hospitalPanelContext,
    }));
  }, [hospitalPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishHospitalsRouteContext();
    window.addEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);

    return () => {
      window.removeEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);
    };
  }, [publishHospitalsRouteContext]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      handleCreateUnavailable();
    }
  }, [handleCreateUnavailable, location.search]);

  useEffect(() => {
    const handleOpenModal = () => handleCreateUnavailable();

    window.addEventListener('openHospitalModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openHospitalModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateUnavailable, handleOpenAnalytics, handleOpenFilters]);

  const handleView = useCallback((hospital) => {
    markActionFeedback(`view-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleEdit = useCallback((hospital) => {
    if (!canEditHospital(hospital)) {
      toast.info('Edit is limited to facilities in your organization');
      return;
    }
    markActionFeedback(`edit-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('edit');
  }, [canEditHospital, markActionFeedback, setFocused]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({});
  }, [handleApplyFilters, handleKpiFilterChange]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const updateHospitalMutation = useHospitalsMutations({
    mutationFn: (formData) => updateHospital(selectedHospital.id, formData),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });

  const handleSave = useCallback(async (formData) => {
    try {
      if (modalMode !== 'edit' || !selectedHospital?.id) {
        throw new Error('Facility edit requires a selected facility');
      }

      const updatedHospital = await updateHospitalMutation.mutateAsync(formData);
      const updatedHospitalName = formData.name || selectedHospital.name || 'Facility';

      try {
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.UPDATED,
          updatedHospital?.id || selectedHospital.id,
          { message: `${updatedHospitalName} has been updated` }
        );
      } catch (notifyError) {
        console.warn('Save succeeded but notification failed:', notifyError);
      }

      toast.success('Facility updated');
      return true;
    } catch (error) {
      console.error('Error saving hospital:', error);
      handleApiError(error, 'update');
      throw error;
    }
  }, [modalMode, selectedHospital, updateHospitalMutation]);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedHospital(null);
  }, []);

  return {
    isMobile,
    role: {
      admin,
      orgAdmin,
      canEditHospitals,
      canEditHospital,
    },
    data: {
      hospitals,
      hospitalPageStats,
      loading,
      isFetching,
      hospitalPageError,
      fetchHospitals,
    },
    state: {
      selectedHospital,
      modalMode,
      filterSheetOpen,
      filters,
      kpiFilter,
      analyticsModalOpen,
      activeActionFeedback,
      sortConfig,
      focusedHospital,
    },
    setters: {
      setFilterSheetOpen,
      setAnalyticsModalOpen,
    },
    actions: {
      handleApplyFilters,
      handleKpiFilterChange,
      handleFacilityApprovals,
      handleOpenFilters,
      handleOpenAnalytics,
      handleView,
      handleEdit,
      handleClearFilters,
      handleSort,
      handleSave,
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
    filterSchema: HOSPITAL_FILTER_SCHEMA,
    wayfinding: {
      visibleModuleRail,
      routingPath,
      handleRailNavigate,
    },
  };
};
