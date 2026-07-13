import { useCallback, useEffect, useMemo } from 'react';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';

export const useEmergencyRequestsChrome = ({
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
}) => {
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isDriver, isOrgAdmin, isProvider]);
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

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
  }, [handleCreateEmergency, handleOpenAnalytics, setFilterSheetOpen]);

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
    loadError,
    loading,
    pagination.totalCount,
    requestStats,
    requests,
    selectedKpiFilter,
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

  return {
    visibleModuleRail,
    routingPath,
    handleRailNavigate,
  };
};
