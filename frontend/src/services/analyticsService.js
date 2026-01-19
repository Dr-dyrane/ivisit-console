/**
 * Enhanced Analytics Service - Supports time-series, caching, and advanced features
 * Designed to work with useAnalytics hook for comprehensive analytics
 */

import { getUserStatistics } from './profilesService';
import { getEmergencyRequests } from './emergencyService';
import { getHospitals } from './hospitalsService';
import { getAmbulances } from './ambulancesService';
import { getSubscriptionAnalytics } from './subscriptionService';
import { supabase } from '../lib/supabase';

// Cache for performance optimization
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
 * Get comprehensive analytics data for dashboard
 * @returns {Promise<Object>} Analytics data object
 */
export const getAnalyticsData = async (options = {}) => {
  try {
    const {
      timeRange = 'all',
      includeRawData = true,
      includeDerivedMetrics = true
    } = options;

    // Parallel fetch all required data
    const [userStats, emergencies, hospitals, ambulances, subscriptionData] = await Promise.all([
      getCachedOrFetch('userStats', getUserStatistics),
      getCachedOrFetch('emergencies', getEmergencyRequests),
      getCachedOrFetch('hospitals', getHospitals),
      getCachedOrFetch('ambulances', getAmbulances),
      getCachedOrFetch('subscriptionAnalytics', getSubscriptionAnalytics)
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
      successRate: totalEmergencies > 0 ? Math.round((completedEmergencies.length / totalEmergencies) * 100) : 95,
      
      // Infrastructure analytics
      totalHospitals: hospitals.length,
      totalAmbulances: ambulances.length,
      
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
    console.error('Error fetching analytics data:', error);
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
    console.error('Error fetching analytics summary:', error);
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
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
            break;
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
