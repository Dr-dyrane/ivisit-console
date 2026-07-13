import { useCallback, useEffect } from 'react';

export const useInsuranceRouteBridge = ({
  panelContext,
  setFilterSheetOpen,
  setAnalyticsModalOpen,
  setSelectedPolicy,
  setModalMode,
}) => {
  useEffect(() => {
    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };
    const handleOpenFocusedRecord = (event) => {
      if (!event.detail) return;
      setSelectedPolicy(event.detail);
      setModalMode('view');
    };

    window.addEventListener('openInsuranceFilters', handleOpenFilters);
    window.addEventListener('openInsuranceAnalytics', handleOpenAnalytics);
    window.addEventListener('openFocusedInsuranceRecord', handleOpenFocusedRecord);

    return () => {
      window.removeEventListener('openInsuranceFilters', handleOpenFilters);
      window.removeEventListener('openInsuranceAnalytics', handleOpenAnalytics);
      window.removeEventListener('openFocusedInsuranceRecord', handleOpenFocusedRecord);
    };
  }, [
    setAnalyticsModalOpen,
    setFilterSheetOpen,
    setModalMode,
    setSelectedPolicy,
  ]);

  const publishInsuranceRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('insuranceRouteContextUpdated', {
      detail: panelContext,
    }));
  }, [panelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishInsuranceRouteContext();
    window.addEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);

    return () => {
      window.removeEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);
    };
  }, [publishInsuranceRouteContext]);
};
