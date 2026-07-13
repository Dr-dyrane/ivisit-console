import { getUserStatistics } from '../profilesService';
import { getEmergencyRequests } from '../emergencyService';
import { getHospitals } from '../hospitalsService';
import { getAmbulances } from '../ambulancesService';
import { getSubscriptionAnalytics } from '../subscriptionService';
import { getCurrentUser } from '../authService';
import { getCachedOrFetch } from './cache';

export const getTimeRangeHours = (range) => {
  const ranges = {
    '24h': 24,
    '7d': 168,
    '30d': 720,
    '90d': 2160,
    '1y': 8760,
    all: null,
  };

  return ranges[range] || null;
};

export const calculateTrends = (emergencies) => {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentWeek = emergencies.filter((emergency) => new Date(emergency.created_at) >= lastWeek);
  const previousWeek = emergencies.filter((emergency) => (
    new Date(emergency.created_at) >= twoWeeksAgo
      && new Date(emergency.created_at) < lastWeek
  ));

  const trend = currentWeek.length - previousWeek.length;
  const trendPercentage = previousWeek.length > 0
    ? Math.round((trend / previousWeek.length) * 100)
    : 0;

  return {
    emergencyTrend: trend,
    emergencyTrendPercentage: trendPercentage,
    isPositiveTrend: trend >= 0,
  };
};

const getUnauthorizedAnalytics = () => ({
  totalUsers: 0,
  totalEmergencies: 0,
  avgResponseTime: 0,
  successRate: 0,
  successRateSource: 'unavailable',
  analyticsSourceState: 'unauthorized',
  totalHospitals: 0,
  totalAmbulances: 0,
  totalBeds: 0,
  subscriptionAnalytics: { totalSubscribers: 0, activeSubscribers: 0 },
  trends: { emergencyTrend: 0, emergencyTrendPercentage: 0, isPositiveTrend: true },
});

export const getAnalyticsData = async (options = {}) => {
  try {
    const user = await getCurrentUser();
    if (user?.role === 'patient') return getUnauthorizedAnalytics();

    const {
      timeRange = 'all',
      includeRawData = true,
      includeDerivedMetrics: _includeDerivedMetrics = true,
      quiet = false,
    } = options;
    const quietOptions = { quiet };

    const [userStats, emergencies, hospitals, ambulances, subscriptionData] = await Promise.all([
      getCachedOrFetch('userStats', () => getUserStatistics(quietOptions)),
      getCachedOrFetch('emergencies', () => getEmergencyRequests(quietOptions)),
      getCachedOrFetch('hospitals', () => getHospitals(quietOptions)),
      getCachedOrFetch('ambulances', () => getAmbulances(quietOptions)),
      getCachedOrFetch('subscriptionAnalytics', () => getSubscriptionAnalytics(quietOptions)),
    ]);

    let filteredEmergencies = emergencies;
    if (timeRange !== 'all') {
      const hours = getTimeRangeHours(timeRange);
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        filteredEmergencies = emergencies.filter(
          (emergency) => new Date(emergency.created_at) >= cutoffDate,
        );
      }
    }

    const completedEmergencies = filteredEmergencies.filter(
      (emergency) => emergency.status === 'completed',
    );
    const totalEmergencies = filteredEmergencies.length;
    const avgResponseTime = completedEmergencies.length > 0
      ? completedEmergencies.reduce(
        (total, emergency) => total + (emergency.response_time_minutes || 0),
        0,
      ) / completedEmergencies.length
      : 0;
    const successRateSource = totalEmergencies > 0 ? 'measured' : 'source_pending';
    const successRate = totalEmergencies > 0
      ? Math.round((completedEmergencies.length / totalEmergencies) * 100)
      : 0;
    const trendData = calculateTrends(filteredEmergencies);

    return {
      totalUsers: userStats.totalUsers || 0,
      totalProfiles: userStats.totalProfiles || 0,
      recentSignups: userStats.recentSignups || 0,
      emailVerifiedUsers: userStats.emailVerifiedUsers || 0,
      phoneVerifiedUsers: userStats.phoneVerifiedUsers || 0,
      roleDistribution: userStats.roleDistribution || {},
      totalEmergencies,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      successRate,
      successRateSource,
      analyticsSourceState: successRateSource,
      totalHospitals: hospitals.length,
      totalAmbulances: ambulances.length,
      totalBeds: hospitals.reduce((total, hospital) => total + (hospital.available_beds || 0), 0),
      capacityFull: hospitals.filter((hospital) => hospital.status === 'full').length,
      availableHospitals: hospitals.filter((hospital) => hospital.status === 'available').length,
      verifiedHospitals: hospitals.filter((hospital) => hospital.verified).length,
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
      trends: trendData,
      ...(includeRawData && {
        emergencies: filteredEmergencies,
        hospitals,
        ambulances,
        subscriptionData,
      }),
    };
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching analytics data:', error);
    }
    throw new Error('Failed to fetch analytics data');
  }
};

export const getAnalyticsSummary = async (options = {}) => {
  try {
    const analytics = await getAnalyticsData({ ...options, includeRawData: false });

    return {
      totalUsers: analytics.totalUsers,
      totalEmergencies: analytics.totalEmergencies,
      avgResponseTime: analytics.avgResponseTime,
      successRate: analytics.successRate,
      successRateSource: analytics.successRateSource,
      analyticsSourceState: analytics.analyticsSourceState,
      totalHospitals: analytics.totalHospitals,
      totalAmbulances: analytics.totalAmbulances,
      totalSubscribers: analytics.subscriptionAnalytics.totalSubscribers,
      activeSubscribers: analytics.subscriptionAnalytics.activeSubscribers,
      paidSubscribers: analytics.subscriptionAnalytics.paidSubscribers,
      paidConversionRate: analytics.subscriptionAnalytics.paidConversionRate,
      trends: analytics.trends,
    };
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching analytics summary:', error);
    }
    throw new Error('Failed to fetch analytics summary');
  }
};
