/**
 * Enhanced Analytics Service - Supports time-series, caching, and advanced features
 * Designed to work with useAnalytics hook for comprehensive analytics
 */

import { getUserStatistics } from './profilesService';
import { getEmergencyRequests } from './emergencyService';
import { getHospitals } from './hospitalsService';
import { getAmbulances } from './ambulancesService';
import { getSubscriptionAnalytics } from './subscriptionService';
import { applyAuthFilter, getCurrentUser } from './authService';
import { getFinanceAnalytics } from './walletService';
import { getAnalyticsHospitalCapacitySource } from './analytics/hospitalCapacityProjection';
import { supabase } from '../lib/supabase';

// Cache for performance optimization
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const ANALYTICS_REQUEST_SAMPLE_LIMIT = 1000;

export const DEFAULT_ANALYTICS_SUBSCRIPTION_STATS = {
  total: 0,
  active: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeEmailsSent: 0,
  paidConversionRate: 0,
  activeFree: 0,
  activePremium: 0,
  inactiveFree: 0,
  inactivePremium: 0,
};

const resolveAnalyticsSource = async (request) => {
  try {
    return await request;
  } catch (error) {
    return { data: null, count: 0, error };
  }
};

const getAnalyticsSourceErrorKind = (error) => {
  const status = String(error?.status || error?.code || '');
  const message = String(error?.message || error?.details || error || '');
  const sourceText = `${status} ${message}`;

  return /42501|401|403|permission|policy|rls|not authorized|forbidden|jwt/i.test(sourceText)
    ? 'denied'
    : 'failed';
};

const getAnalyticsSourceIssue = (source, result) => {
  if (!result?.error) return null;

  return {
    source,
    kind: getAnalyticsSourceErrorKind(result.error),
  };
};

const toExactCount = (value) => (
  value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : null
);

/**
 * Get cached data or fetch fresh data
 */
const getCachedOrFetch = async (key, fetchFunction, duration = CACHE_DURATION) => {
  const cached = cache.get(key);

  if (cached && (Date.now() - cached.timestamp) < duration) {
    return cached.data;
  }

  const data = await fetchFunction();
  cache.set(key, {
    data,
    timestamp: Date.now()
  });

  return data;
};

/**
 * Current intake projection for the live /analytics route.
 * This preserves the old page reads while moving acquisition out of the UI.
 */
export const getAnalyticsIntakePage = async ({
  timeRange = '7d',
  includeSubscriptionAnalytics = false,
  includeFinanceAnalytics = false,
} = {}) => {
  const user = await getCurrentUser();
  const canReadSubscriptionAnalytics = includeSubscriptionAnalytics && user?.role === 'admin';
  const canReadFinanceAnalytics = includeFinanceAnalytics && user?.role === 'admin';

  let requestsQuery = supabase
    .from('emergency_requests')
    .select('*', { count: 'exact' })
    .limit(ANALYTICS_REQUEST_SAMPLE_LIMIT);
  let usersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true });
  let ambulancesQuery = supabase.from('ambulances').select('id', { count: 'exact', head: true });

  const isProviderScoped = user?.role === 'provider';
  requestsQuery = applyAuthFilter(requestsQuery, user, {
    userIdField: 'user_id',
    orgIdField: 'hospital_id',
    providerIdField: 'responder_id',
    resourceType: 'emergency'
  });

  const selectedWindowDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }[timeRange];

  if (selectedWindowDays) {
    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - (selectedWindowDays - 1));
    requestsQuery = requestsQuery.gte('created_at', windowStart.toISOString());
  }

  usersQuery = applyAuthFilter(usersQuery, user, {
    userIdField: 'id',
    orgIdField: 'organization_id',
    resourceType: 'users'
  });

  if (isProviderScoped) {
    // Ambulances have no user_id column, so applyAuthFilter's provider fallback
    // would filter on a missing column (42703). Hospital capacity owns the same
    // provider scope in its paginated projection.
    if (Array.isArray(user?.hospital_ids) && user.hospital_ids.filter(Boolean).length) {
      const providerHospitalIds = user.hospital_ids.filter(Boolean);
      ambulancesQuery = providerHospitalIds.length > 1
        ? ambulancesQuery.in('hospital_id', providerHospitalIds)
        : ambulancesQuery.eq('hospital_id', providerHospitalIds[0]);
    } else if (user?.organization_id) {
      // Demo and current provider profiles carry the parent organization but do
      // not populate authService.hospital_ids. Use that canonical link before
      // falling back to an empty scope so Statistics sees the same organization
      // facilities/fleet that the operational projections can resolve.
      ambulancesQuery = ambulancesQuery.eq('organization_id', user.organization_id);
    } else {
      ambulancesQuery = user?.id
        ? ambulancesQuery.eq('profile_id', user.id)
        : ambulancesQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  } else {
    ambulancesQuery = applyAuthFilter(ambulancesQuery, user, {
      orgIdField: 'organization_id',
      resourceType: 'ambulances'
    });
  }

  const subscriptionAnalyticsRequest = canReadSubscriptionAnalytics
    ? resolveAnalyticsSource(getSubscriptionAnalytics({ quiet: true }).then((data) => ({ data })))
    : Promise.resolve({ data: DEFAULT_ANALYTICS_SUBSCRIPTION_STATS });

  const [requestsRes, usersRes, hospitalsRes, ambulancesRes, subscriptionRes] = await Promise.all([
    resolveAnalyticsSource(requestsQuery),
    resolveAnalyticsSource(usersQuery),
    resolveAnalyticsSource(getAnalyticsHospitalCapacitySource(user)),
    resolveAnalyticsSource(ambulancesQuery),
    subscriptionAnalyticsRequest,
  ]);

  const sourceIssues = [
    getAnalyticsSourceIssue('requests', requestsRes),
    getAnalyticsSourceIssue('users', usersRes),
    getAnalyticsSourceIssue('hospitals', hospitalsRes),
    getAnalyticsSourceIssue('ambulances', ambulancesRes),
    getAnalyticsSourceIssue('subscriptions', subscriptionRes),
  ].filter(Boolean);
  const requestTotalCount = toExactCount(requestsRes.count);
  const hospitalTotalCount = toExactCount(hospitalsRes.count);
  const usersCount = toExactCount(usersRes.count);
  const ambulancesCount = toExactCount(ambulancesRes.count);
  const hospitalReturnedCount = (hospitalsRes.data || []).length;
  const hospitalSampleComplete = !hospitalsRes.error && hospitalsRes.complete === true;

  if (!requestsRes.error && requestTotalCount === null) {
    sourceIssues.push({ source: 'requests', kind: 'failed', reason: 'count_unavailable' });
  }
  if (!usersRes.error && usersCount === null) {
    sourceIssues.push({ source: 'users', kind: 'failed', reason: 'count_unavailable' });
  }
  if (!ambulancesRes.error && ambulancesCount === null) {
    sourceIssues.push({ source: 'ambulances', kind: 'failed', reason: 'count_unavailable' });
  }
  if (!hospitalsRes.error && !hospitalSampleComplete) {
    sourceIssues.push({
      source: 'hospitals',
      kind: 'partial',
      reason: 'capacity_sample_incomplete',
      returnedCount: hospitalReturnedCount,
      totalCount: hospitalTotalCount,
    });
  }

  let financeData = [];
  if (canReadFinanceAnalytics) {
    try {
      // walletService treats its lookback as inclusive, so N - 1 yields N calendar dates.
      const financeLookbackDays = Math.max(0, (selectedWindowDays || 30) - 1);
      const resolvedFinanceData = await getFinanceAnalytics(user, true, financeLookbackDays, { quiet: true, throwOnError: true });
      financeData = Array.isArray(resolvedFinanceData) ? resolvedFinanceData : [];
    } catch (financeError) {
      sourceIssues.push(getAnalyticsSourceIssue('finance', { error: financeError }));
    }
  }

  return {
    user,
    requests: requestsRes.data || [],
    requestSample: {
      returnedCount: (requestsRes.data || []).length,
      totalCount: requestTotalCount,
      limit: ANALYTICS_REQUEST_SAMPLE_LIMIT,
      complete: !requestsRes.error
        && requestTotalCount !== null
        && requestTotalCount <= (requestsRes.data || []).length,
    },
    usersCount: usersCount || 0,
    hospitals: hospitalsRes.data || [],
    hospitalsCount: hospitalTotalCount || 0,
    hospitalSample: {
      returnedCount: hospitalReturnedCount,
      totalCount: hospitalTotalCount,
      limit: hospitalsRes.pageSize || 1000,
      complete: hospitalSampleComplete,
    },
    ambulancesCount: ambulancesCount || 0,
    subscriptionStats: canReadSubscriptionAnalytics
      ? { ...DEFAULT_ANALYTICS_SUBSCRIPTION_STATS, ...(subscriptionRes.data || {}) }
      : DEFAULT_ANALYTICS_SUBSCRIPTION_STATS,
    financeData,
    sourceIssues,
  };
};

/**
 * Get comprehensive analytics data for dashboard
 * @returns {Promise<Object>} Analytics data object
 */
export const getAnalyticsData = async (options = {}) => {
  try {
    const user = await getCurrentUser();
    // RBAC: Patients should not be accessing analytics (Console only)
    if (user?.role === 'patient') {
      return {
        totalUsers: 0, totalEmergencies: 0, avgResponseTime: 0, successRate: 0,
        successRateSource: 'unavailable', analyticsSourceState: 'unauthorized',
        totalHospitals: 0, totalAmbulances: 0, totalBeds: 0,
        subscriptionAnalytics: { totalSubscribers: 0, activeSubscribers: 0 },
        trends: { emergencyTrend: 0, emergencyTrendPercentage: 0, isPositiveTrend: true }
      };
    }

    const {
      timeRange = 'all',
      includeRawData = true,
      includeDerivedMetrics: _includeDerivedMetrics = true,
      quiet = false
    } = options;
    const quietOptions = { quiet };

    // Parallel fetch all required data
    const [userStats, emergencies, hospitals, ambulances, subscriptionData] = await Promise.all([
      getCachedOrFetch('userStats', () => getUserStatistics(quietOptions)),
      getCachedOrFetch('emergencies', () => getEmergencyRequests(quietOptions)),
      getCachedOrFetch('hospitals', () => getHospitals(quietOptions)),
      getCachedOrFetch('ambulances', () => getAmbulances(quietOptions)),
      getCachedOrFetch('subscriptionAnalytics', () => getSubscriptionAnalytics(quietOptions))
    ]);

    // Apply time range filtering
    let filteredEmergencies = emergencies;
    if (timeRange !== 'all') {
      const hours = getTimeRangeHours(timeRange);
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        filteredEmergencies = emergencies.filter(e =>
          new Date(e.created_at) >= cutoffDate
        );
      }
    }

    // Calculate derived metrics
    const completedEmergencies = filteredEmergencies.filter(e => e.status === 'completed');
    const totalEmergencies = filteredEmergencies.length;
    const avgResponseTime = completedEmergencies.length > 0
      ? completedEmergencies.reduce((acc, e) => acc + (e.response_time_minutes || 0), 0) / completedEmergencies.length
      : 0;
    const successRateSource = totalEmergencies > 0 ? 'measured' : 'source_pending';
    const successRate = totalEmergencies > 0
      ? Math.round((completedEmergencies.length / totalEmergencies) * 100)
      : 0;

    // Calculate trend data
    const trendData = calculateTrends(filteredEmergencies);

    // Return clean analytics object
    const analyticsData = {
      // User analytics
      totalUsers: userStats.totalUsers || 0,
      totalProfiles: userStats.totalProfiles || 0,
      recentSignups: userStats.recentSignups || 0,
      emailVerifiedUsers: userStats.emailVerifiedUsers || 0,
      phoneVerifiedUsers: userStats.phoneVerifiedUsers || 0,
      roleDistribution: userStats.roleDistribution || {},

      // Emergency analytics
      totalEmergencies,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      successRate,
      successRateSource,
      analyticsSourceState: successRateSource,

      // Infrastructure analytics
      totalHospitals: hospitals.length,
      totalAmbulances: ambulances.length,
      totalBeds: hospitals.reduce((acc, h) => acc + (h.available_beds || 0), 0),
      capacityFull: hospitals.filter(h => h.status === 'full').length,
      availableHospitals: hospitals.filter(h => h.status === 'available').length,
      verifiedHospitals: hospitals.filter(h => h.verified).length,

      // Subscription analytics
      subscriptionAnalytics: {
        totalSubscribers: subscriptionData.total || 0,
        activeSubscribers: subscriptionData.active || 0,
        paidSubscribers: subscriptionData.paid || 0,
        freeSubscribers: subscriptionData.free || 0,
        newUsers: subscriptionData.newUsers || 0,
        welcomeEmailsSent: subscriptionData.welcomeEmailsSent || 0,
        paidConversionRate: subscriptionData.paidConversionRate || 0,
        byType: subscriptionData.byType || {},
        byStatus: subscriptionData.byStatus || {},
        recentSubscriptions: subscriptionData.recentSubscriptions || 0,
      },

      // Trend analytics
      trends: trendData,

      // Raw data for charts (optional)
      ...(includeRawData && {
        emergencies: filteredEmergencies,
        hospitals,
        ambulances,
        subscriptionData,
      })
    };

    return analyticsData;
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching analytics data:', error);
    }
    throw new Error('Failed to fetch analytics data');
  }
};

/**
 * Get analytics summary for quick display
 * @returns {Promise<Object>} Summary analytics object
 */
export const getAnalyticsSummary = async (options = {}) => {
  try {
    const analytics = await getAnalyticsData({ ...options, includeRawData: false });

    // Return only key metrics for summary display
    return {
      totalUsers: analytics.totalUsers,
      totalEmergencies: analytics.totalEmergencies,
      avgResponseTime: analytics.avgResponseTime,
      successRate: analytics.successRate,
      successRateSource: analytics.successRateSource,
      analyticsSourceState: analytics.analyticsSourceState,
      totalHospitals: analytics.totalHospitals,
      totalAmbulances: analytics.totalAmbulances,
      // Add subscription summary metrics
      totalSubscribers: analytics.subscriptionAnalytics.totalSubscribers,
      activeSubscribers: analytics.subscriptionAnalytics.activeSubscribers,
      paidSubscribers: analytics.subscriptionAnalytics.paidSubscribers,
      paidConversionRate: analytics.subscriptionAnalytics.paidConversionRate,
      trends: analytics.trends
    };
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching analytics summary:', error);
    }
    throw new Error('Failed to fetch analytics summary');
  }
};

/**
 * Get time-series data for charts
 * @param {string} metric - Metric to get time-series for
 * @param {string} period - Time period (hour, day, week, month)
 * @returns {Promise<Array>} Time-series data
 */
export const getTimeSeriesData = async (metric = 'emergencies', period = 'day') => {
  try {
    const cacheKey = `timeseries_${metric}_${period}`;

    return await getCachedOrFetch(cacheKey, async () => {
      // This would typically call a database function optimized for time-series
      // For now, we'll simulate with the emergency requests
      const emergencies = await getEmergencyRequests();

      // Group by time period
      const grouped = emergencies.reduce((acc, emergency) => {
        const date = new Date(emergency.created_at);
        let key;

        switch (period) {
          case 'hour':
            key = date.toISOString().slice(0, 13) + ':00';
            break;
          case 'day':
            key = date.toISOString().slice(0, 10);
            break;
          case 'week': {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
            break;
          }
          case 'month':
            key = date.toISOString().slice(0, 7);
            break;
          default:
            key = date.toISOString().slice(0, 10);
        }

        if (!acc[key]) {
          acc[key] = { date: key, count: 0, responseTime: 0, completed: 0 };
        }

        acc[key].count += 1;
        if (emergency.response_time_minutes) {
          acc[key].responseTime += emergency.response_time_minutes;
        }
        if (emergency.status === 'completed') {
          acc[key].completed += 1;
        }

        return acc;
      }, {});

      // Convert to array and sort
      return Object.values(grouped)
        .map(item => ({
          ...item,
          avgResponseTime: item.count > 0 ? item.responseTime / item.count : 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    });
  } catch (error) {
    console.error('Error fetching time-series data:', error);
    throw new Error('Failed to fetch time-series data');
  }
};

/**
 * Get performance metrics
 * @returns {Promise<Object>} Performance metrics
 */
export const getPerformanceMetrics = async () => {
  try {
    const cacheKey = 'performance_metrics';

    return await getCachedOrFetch(cacheKey, async () => {
      // Simulate performance metrics
      const emergencies = await getEmergencyRequests();

      const responseTimes = emergencies
        .filter(e => e.response_time_minutes)
        .map(e => e.response_time_minutes);

      return {
        avgResponseTime: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
          : 0,
        medianResponseTime: responseTimes.length > 0
          ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
          : 0,
        p95ResponseTime: responseTimes.length > 0
          ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
          : 0,
        totalRequests: emergencies.length,
        completedRequests: emergencies.filter(e => e.status === 'completed').length,
        failedRequests: emergencies.filter(e => e.status === 'failed').length
      };
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw new Error('Failed to fetch performance metrics');
  }
};

/**
 * Clear analytics cache
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Helper function to get time range in hours
 */
const getTimeRangeHours = (range) => {
  const ranges = {
    '24h': 24,
    '7d': 168,
    '30d': 720,
    '90d': 2160,
    '1y': 8760,
    'all': null
  };

  return ranges[range] || null;
};

/**
 * Calculate trend data
 */
const calculateTrends = (emergencies) => {
  // Simple trend calculation - can be enhanced
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentWeek = emergencies.filter(e => new Date(e.created_at) >= lastWeek);
  const previousWeek = emergencies.filter(e =>
    new Date(e.created_at) >= twoWeeksAgo && new Date(e.created_at) < lastWeek
  );

  const trend = currentWeek.length - previousWeek.length;
  const trendPercentage = previousWeek.length > 0
    ? Math.round((trend / previousWeek.length) * 100)
    : 0;

  return {
    emergencyTrend: trend,
    emergencyTrendPercentage: trendPercentage,
    isPositiveTrend: trend >= 0
  };
};
