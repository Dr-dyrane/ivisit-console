import { getAnalyticsData } from '../../../services/analyticsService';

export const loadAnalyticsPageData = async () => {
  const fullAnalytics = await getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true });

  return {
    totalRequests: fullAnalytics.totalEmergencies,
    avgResponseTime: fullAnalytics.avgResponseTime,
    completionRate: fullAnalytics.successRate,
    completionRateSource: fullAnalytics.successRateSource,
    sourceState: fullAnalytics.analyticsSourceState,
    activeHospitals: fullAnalytics.totalHospitals,
    availableAmbulances: fullAnalytics.totalAmbulances,
    onRouteAmbulances: null,
    onRouteAmbulancesSource: 'source_pending',
  };
};
