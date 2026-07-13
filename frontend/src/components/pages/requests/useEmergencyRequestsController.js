import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getEmergencyRequest } from '../../../services/emergencyService';
import { getFilterTriggerState } from '../../console/ActivitySheet';
import { hasActiveRequestFilters, REQUEST_FILTER_SCHEMA } from './requestPageModel';
import { useEmergencyRequestCommands } from './useEmergencyRequestCommands';
import { useEmergencyRequestsChrome } from './useEmergencyRequestsChrome';
import { useEmergencyRequestsQueryState } from './useEmergencyRequestsQueryState';
import { useEmergencyRequestsRealtime } from './useEmergencyRequestsRealtime';

export const useEmergencyRequestsController = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver, profile, user, loading: authLoading } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const currentUser = useMemo(() => ({
    isAdmin: () => isAdmin(),
    isOrgAdmin: () => isOrgAdmin(),
    isProvider: () => isProvider(),
    user,
    profile,
  }), [isAdmin, isOrgAdmin, isProvider, profile, user]);
  const authReady = Boolean(user?.id && profile?.role) && !authLoading;

  const {
    requests,
    loading,
    isFetching,
    requestStats,
    filters,
    setFilters,
    selectedKpiFilter,
    setKpiFilter,
    pagination,
    loadError,
    fetchRequests,
    sortConfig,
    handleSort,
    queryFilter,
  } = useEmergencyRequestsQueryState({ authReady });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [focusedRequestId, setFocusedRequestId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  const activeDetailRequest = useMemo(() => {
    if (!selectedRequest?.id) return selectedRequest;
    return requests.find((row) => row.id === selectedRequest.id) || selectedRequest;
  }, [requests, selectedRequest]);
  const focusedRequest = useMemo(() => (
    requests.find((request) => request.id === focusedRequestId) || requests[0] || null
  ), [focusedRequestId, requests]);
  const hasFilter = hasActiveRequestFilters(filters);
  const filterTriggerState = getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter });

  useEmergencyRequestsRealtime();

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
          : 'Statistics are unavailable until the server summary loads.',
      });
      return;
    }
    setAnalyticsModalOpen(true);
  }, [requestStats, requests.length]);

  const {
    visibleModuleRail,
    routingPath,
    handleRailNavigate,
  } = useEmergencyRequestsChrome({
    isAdmin,
    isOrgAdmin,
    isProvider,
    isDriver,
    currentUser,
    requestStats,
    requests,
    focusedRequest,
    pagination,
    loading,
    loadError,
    selectedKpiFilter,
    hasFilter,
    handleCreateEmergency,
    handleOpenAnalytics,
    setFilterSheetOpen,
  });

  const {
    handleDelete,
    handleDispatch,
    handleComplete,
    handleProcessCash,
    handleRetryPaymentUnavailable,
    dispatchPending,
    completePending,
    cancelPending,
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBulkCancel,
    cancellableSelectedCount,
    confirmationModal,
    closeConfirmationModal,
    completeModal,
    closeCompleteModal,
    executeComplete,
  } = useEmergencyRequestCommands({
    requests,
    queryFilter,
    fetchRequests,
    isAdmin,
    isOrgAdmin,
    isProvider,
    user,
  });

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

  const handleCloseEmergencyModal = useCallback(() => {
    setIsEmergencyModalOpen(false);
    fetchRequests();
  }, [fetchRequests]);

  const closeDetailsModal = useCallback((shouldRefresh) => {
    setIsDetailsModalOpen(false);
    setSelectedRequest(null);
    if (shouldRefresh === true) fetchRequests();
  }, [fetchRequests]);

  return {
    isMobile,
    includeMine: isDriver(),
    currentUser,
    requests,
    loading,
    isFetching,
    requestStats,
    filters,
    setFilters,
    selectedKpiFilter,
    setKpiFilter,
    focusedRequest,
    setFocusedRequestId,
    pagination,
    loadError,
    fetchRequests,
    filterSheetOpen,
    setFilterSheetOpen,
    filterTriggerState,
    hasFilter,
    analyticsModalOpen,
    setAnalyticsModalOpen,
    sortConfig,
    handleSort,
    visibleModuleRail,
    routingPath,
    handleRailNavigate,
    handleCreateEmergency,
    handleOpenAnalytics,
    handleViewDetails,
    handleDelete,
    handleDispatch,
    handleComplete,
    handleProcessCash,
    handleRetryPaymentUnavailable,
    dispatchPending,
    completePending,
    cancelPending,
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBulkCancel,
    cancellableSelectedCount,
    isDetailsModalOpen,
    activeDetailRequest,
    closeDetailsModal,
    isEmergencyModalOpen,
    selectedRequest,
    handleCloseEmergencyModal,
    confirmationModal,
    closeConfirmationModal,
    completeModal,
    closeCompleteModal,
    executeComplete,
    filterSchema: REQUEST_FILTER_SCHEMA,
  };
};
