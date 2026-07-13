/**
 * Public analytics service compatibility surface.
 *
 * Acquisition, completeness, derivation, and cache ownership live in focused
 * modules so callers keep one stable import path without rebuilding a monolith.
 */

export { DEFAULT_ANALYTICS_SUBSCRIPTION_STATS } from './analytics/constants';
export { getAnalyticsIntakePage } from './analytics/intakeProjection';
export { getAnalyticsData, getAnalyticsSummary } from './analytics/dashboardProjection';
export { getTimeSeriesData, getPerformanceMetrics } from './analytics/timeSeriesProjection';
export { clearCache } from './analytics/cache';
