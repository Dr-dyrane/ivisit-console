import { useEffect } from 'react';

export const usePricingRouteBridge = ({
  pricingRouteContext,
  showPricingCommandUnavailable,
  handleOpenPricingStats,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const publishPricingRouteContext = () => window.dispatchEvent(new CustomEvent(
      'pricingRouteContextUpdated',
      { detail: pricingRouteContext },
    ));

    publishPricingRouteContext();
    window.addEventListener('requestPricingRouteContext', publishPricingRouteContext);
    return () => window.removeEventListener(
      'requestPricingRouteContext',
      publishPricingRouteContext,
    );
  }, [pricingRouteContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOpenAdd = () => showPricingCommandUnavailable();
    window.addEventListener('openPricingModal', handleOpenAdd);
    window.addEventListener('openPricingAnalytics', handleOpenPricingStats);
    return () => {
      window.removeEventListener('openPricingModal', handleOpenAdd);
      window.removeEventListener('openPricingAnalytics', handleOpenPricingStats);
    };
  }, [handleOpenPricingStats, showPricingCommandUnavailable]);
};
