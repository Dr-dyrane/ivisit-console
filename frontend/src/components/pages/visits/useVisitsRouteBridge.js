import React, { useCallback, useEffect } from 'react';

export const useVisitsRouteBridge = ({
  canCreate,
  canEdit,
  canManageFocused,
  count,
  currentState,
  errorMessage,
  focusedVisit,
  loading,
  markActionFeedback,
  onCreate,
  onManageScheduledVisit,
  onOpenAnalytics,
  onOpenFilters,
  recent,
  setEmergencyModal,
  stats,
  viewMode,
}) => {
  const visitPanelContext = React.useMemo(() => ({
    stats: stats || {},
    recent: recent.slice(0, 4),
    focusedVisit,
    count,
    loading,
    errorMessage,
    currentState,
    canCreate,
    canEdit,
    canManageFocused,
    viewMode,
  }), [
    canCreate,
    canEdit,
    canManageFocused,
    count,
    currentState,
    errorMessage,
    focusedVisit,
    loading,
    recent,
    stats,
    viewMode,
  ]);

  const publishVisitsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('visitsRouteContextUpdated', {
      detail: visitPanelContext,
    }));
  }, [visitPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishVisitsRouteContext();
    window.addEventListener('requestVisitsRouteContext', publishVisitsRouteContext);

    return () => {
      window.removeEventListener('requestVisitsRouteContext', publishVisitsRouteContext);
    };
  }, [publishVisitsRouteContext]);

  useEffect(() => {
    const handleOpenModal = () => {
      onCreate();
    };

    const handleOpenEmergency = (e) => {
      markActionFeedback('emergency-context');
      setEmergencyModal({
        isOpen: true,
        request: e.detail.request || e.detail,
      });
    };

    const handleManageFocused = () => {
      if (canManageFocused && focusedVisit) onManageScheduledVisit(focusedVisit);
    };

    window.addEventListener('openVisitModal', handleOpenModal);
    window.addEventListener('openEmergencyDetails', handleOpenEmergency);
    window.addEventListener('openFilters', onOpenFilters);
    window.addEventListener('openVisitAnalytics', onOpenAnalytics);
    window.addEventListener('openAnalyticsModal', onOpenAnalytics);
    window.addEventListener('manageFocusedScheduledVisit', handleManageFocused);

    return () => {
      window.removeEventListener('openVisitModal', handleOpenModal);
      window.removeEventListener('openEmergencyDetails', handleOpenEmergency);
      window.removeEventListener('openFilters', onOpenFilters);
      window.removeEventListener('openVisitAnalytics', onOpenAnalytics);
      window.removeEventListener('openAnalyticsModal', onOpenAnalytics);
      window.removeEventListener('manageFocusedScheduledVisit', handleManageFocused);
    };
  }, [canManageFocused, focusedVisit, markActionFeedback, onCreate, onManageScheduledVisit, onOpenAnalytics, onOpenFilters, setEmergencyModal]);

  return visitPanelContext;
};
