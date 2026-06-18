/**
 * useAnalytics Hook - 100% ready analytics system
 * Comprehensive analytics with time-series, caching, exports, and real-time support
 * Designed to match existing Analytics.jsx UI patterns
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAnalyticsData, getAnalyticsSummary } from '../services/analyticsService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Chart colors matching Analytics.jsx
const CHART_COLORS = {
  primary: '#7a1a1a',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  destructive: '#ef4444',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))'
};

// Time range configurations
const TIME_RANGES = {
  '24h': { label: 'Last 24 Hours', hours: 24 },
  '7d': { label: 'Last 7 Days', hours: 168 },
  '30d': { label: 'Last 30 Days', hours: 720 },
  '90d': { label: 'Last 90 Days', hours: 2160 },
  '1y': { label: 'Last Year', hours: 8760 },
  'all': { label: 'All Time', hours: null }
};

export const useAnalytics = (options = {}) => {
  const {
    defaultTimeRange = '7d',
    enableRealTime = false,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 30 * 1000 // 30 seconds
  } = options;

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Caching
  const cacheRef = useRef(new Map());
  const realTimeSubscriptionRef = useRef(null);

  // Get date range for filtering
  const getDateRange = useCallback((range) => {
    if (range === 'all') return { startDate: null, endDate: null };
    
    const hours = TIME_RANGES[range]?.hours;
    if (!hours) return { startDate: null, endDate: null };
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
    
    return { startDate, endDate };
  }, []);

  // Generate cache key
  const getCacheKey = useCallback((range) => {
    return `analytics_${range}_${Date.now()}`;
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback((cacheEntry) => {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < cacheDuration;
  }, [cacheDuration]);

  // Transform data for charts (matches Analytics.jsx patterns)
  const transformDataForCharts = useCallback((rawData) => {
    if (!rawData) return {};

    const { emergencies, hospitals, ambulances } = rawData;

    // Response time data for line chart
    const responseTimeData = emergencies?.reduce((acc, emergency) => {
      const date = new Date(emergency.created_at).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.responseTime = (existing.responseTime + (emergency.response_time_minutes || 0)) / 2;
        existing.requests += 1;
      } else {
        acc.push({
          date,
          responseTime: emergency.response_time_minutes || 0,
          requests: 1
        });
      }
      
      return acc;
    }, []) || [];

    // Requests by status for pie chart
    const statusCounts = emergencies?.reduce((acc, emergency) => {
      const status = emergency.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    const requestsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CHART_COLORS[name.toLowerCase()] || CHART_COLORS.primary
    }));

    // Emergency types for pie chart
    const typeCounts = emergencies?.reduce((acc, emergency) => {
      const type = emergency.emergency_type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}) || {};

    const emergencyTypes = Object.entries(typeCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CHART_COLORS[name.toLowerCase()] || CHART_COLORS.warning
    }));

    // Daily requests for bar chart
    const dailyRequests = emergencies?.reduce((acc, emergency) => {
      const date = new Date(emergency.created_at).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      
      return acc;
    }, []) || [];

    return {
      responseTimeData,
      requestsByStatus,
      emergencyTypes,
      dailyRequests,
      dominantType: emergencyTypes.length > 0 ? emergencyTypes[0] : null
    };
  }, []);

  // Fetch analytics data with caching
  const fetchAnalytics = useCallback(async (range = timeRange) => {
    const cacheKey = getCacheKey(range);
    const cached = cacheRef.current.get(cacheKey);

    // Return cached data if valid
    if (isCacheValid(cached)) {
      setData(cached.data);
      setSummary(cached.summary);
      setLastUpdated(cached.timestamp);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange(range);
      
      // Fetch both full data and summary
      const [analyticsData, analyticsSummary] = await Promise.all([
        getAnalyticsData(),
        getAnalyticsSummary()
      ]);

      // Apply time range filtering if needed
      let filteredData = analyticsData;
      if (dateRange.startDate) {
        filteredData = {
          ...analyticsData,
          emergencies: analyticsData.emergencies?.filter(e => 
            new Date(e.created_at) >= dateRange.startDate
          ) || []
        };
      }

      // Cache the results
      const cacheEntry = {
        data: filteredData,
        summary: analyticsSummary,
        timestamp: Date.now()
      };
      
      cacheRef.current.set(cacheKey, cacheEntry);
      
      setData(filteredData);
      setSummary(analyticsSummary);
      setLastUpdated(Date.now());

      return filteredData;
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      setError(err.message);
      toast.error('Failed to load analytics data');
      
      // Return empty structure for graceful degradation
      const emptyData = {
        totalUsers: 0,
        totalEmergencies: 0,
        avgResponseTime: 0,
        successRate: 0,
        totalHospitals: 0,
        totalAmbulances: 0,
        emergencies: [],
        hospitals: [],
        ambulances: []
      };
      
      setData(emptyData);
      setSummary(emptyData);
      return emptyData;
    } finally {
      setLoading(false);
    }
  }, [timeRange, getCacheKey, isCacheValid, getDateRange]);

  // Export data to CSV (matches Analytics.jsx export pattern)
  const exportToCSV = useCallback(() => {
    if (!data || !summary) {
      toast.error('No data available to export');
      return;
    }

    const chartData = transformDataForCharts(data);
    
    const csvData = [
      ['Metric', 'Value', 'Trend'],
      ['Total Emergencies', summary.totalEmergencies, ''],
      ['Avg Response Time (min)', summary.avgResponseTime.toFixed(1), ''],
      ['Success Rate (%)', summary.successRate, ''],
      ['Total Users', summary.totalUsers, ''],
      ['Total Hospitals', summary.totalHospitals, ''],
      ['Total Ambulances', summary.totalAmbulances, ''],
      [],
      ['Emergency Types', 'Count', 'Percentage'],
      ...(chartData.emergencyTypes || []).map(type => [
        type.name,
        type.value,
        `${Math.round((type.value / summary.totalEmergencies) * 100)}%`
      ]),
      [],
      ['Request Status', 'Count', 'Percentage'],
      ...(chartData.requestsByStatus || []).map(status => [
        status.name,
        status.value,
        `${Math.round((status.value / chartData.requestsByStatus.reduce((sum, s) => sum + s.value, 0)) * 100)}%`
      ]),
      [],
      ['Daily Response Times', 'Day', 'Avg Time (min)', 'Requests'],
      ...(chartData.responseTimeData || []).map(day => [
        day.date,
        day.responseTime.toFixed(1),
        day.requests
      ])
    ];

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported successfully');
  }, [data, summary, timeRange, transformDataForCharts]);

  // Export to PDF (placeholder for future implementation)
  const exportToPDF = useCallback(() => {
    toast.info('PDF export coming soon');
  }, []);

  // Real-time subscription setup
  const setupRealTimeSubscription = useCallback(() => {
    if (!enableRealTime) return;

    const subscription = supabase
      .channel('analytics_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'emergency_requests' },
        () => {
          // Refresh data when changes occur
          fetchAnalytics(timeRange);
        }
      )
      .subscribe();

    realTimeSubscriptionRef.current = subscription;
  }, [enableRealTime, fetchAnalytics, timeRange]);

  // Cleanup real-time subscription
  const cleanupRealTimeSubscription = useCallback(() => {
    if (realTimeSubscriptionRef.current) {
      supabase.removeChannel(realTimeSubscriptionRef.current);
      realTimeSubscriptionRef.current = null;
    }
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    let interval;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        fetchAnalytics(timeRange);
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, fetchAnalytics, timeRange]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange, fetchAnalytics]);

  // Real-time setup/cleanup
  useEffect(() => {
    if (enableRealTime) {
      setupRealTimeSubscription();
    }

    return () => {
      cleanupRealTimeSubscription();
    };
  }, [enableRealTime, setupRealTimeSubscription, cleanupRealTimeSubscription]);

  // Computed values
  const chartData = useMemo(() => transformDataForCharts(data), [data, transformDataForCharts]);
  
  const metrics = useMemo(() => ({
    totalEmergencies: summary?.totalEmergencies || 0,
    avgResponseTime: summary?.avgResponseTime || 0,
    totalUsers: summary?.totalUsers || 0,
    successRate: summary?.successRate || 0,
    totalHospitals: summary?.totalHospitals || 0,
    totalAmbulances: summary?.totalAmbulances || 0,
  }), [summary]);

  const timeRangeOptions = useMemo(() => 
    Object.entries(TIME_RANGES).map(([key, { label }]) => ({
      value: key,
      label
    }))
  , []);

  // Actions
  const actions = {
    refresh: () => fetchAnalytics(timeRange),
    changeTimeRange: setTimeRange,
    exportCSV: exportToCSV,
    exportPDF: exportToPDF,
    clearCache: () => {
      cacheRef.current.clear();
      toast.success('Analytics cache cleared');
    },
    clearError: () => setError(null)
  };

  return {
    // State
    loading,
    error,
    timeRange,
    lastUpdated,
    
    // Data
    data,
    summary,
    metrics,
    chartData,
    
    // Configuration
    timeRangeOptions,
    chartColors: CHART_COLORS,
    
    // Actions
    ...actions,
    
    // Computed
    isDataAvailable: !!(data && summary),
    hasError: !!error,
    isLoading: loading,
    
    // Utilities
    formatDateRange: () => {
      const range = getDateRange(timeRange);
      if (!range.startDate) return 'All Time';
      return `${range.startDate.toLocaleDateString()} - ${range.endDate?.toLocaleDateString() || 'Present'}`;
    }
  };
};
