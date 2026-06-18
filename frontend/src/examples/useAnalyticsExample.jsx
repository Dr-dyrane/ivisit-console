/**
 * Example of how to integrate useAnalytics hook into existing Analytics.jsx
 * This shows the minimal changes needed to upgrade from current implementation
 */

import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingUp, Download, RefreshCw } from 'lucide-react';

// This is a drop-in replacement for your current Analytics.jsx state management
export const AnalyticsWithHook = () => {
  const analytics = useAnalytics({
    defaultTimeRange: '7d',
    enableRealTime: true,
    autoRefresh: false, // Set to true for auto-refreshing dashboard
    cacheDuration: 5 * 60 * 1000, // 5 minutes cache
    refreshInterval: 30 * 1000 // 30 seconds refresh
  });

  // Destructure everything you need from the hook
  const {
    loading,
    error,
    timeRange,
    lastUpdated,
    data,
    summary,
    metrics,
    chartData,
    timeRangeOptions,
    chartColors,
    actions,
    isDataAvailable,
    hasError,
    isLoading,
    formatDateRange
  } = analytics;

  // Your existing chart components can use chartData directly
  // No need to transform data - the hook does it for you!
  const {
    responseTimeData,
    requestsByStatus,
    emergencyTypes,
    dailyRequests,
    dominantType
  } = chartData;

  return (
    <div className="analytics-dashboard">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {formatDateRange()} • Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={actions.changeTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={actions.refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="outline" size="sm" onClick={actions.exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <Card className="mb-6 p-4 border-destructive">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-destructive">Error loading analytics</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={actions.clearError}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !isDataAvailable && (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Analytics content */}
      {isDataAvailable && (
        <>
          {/* Summary cards - using metrics directly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="font-medium text-sm text-muted-foreground">Total Emergencies</h3>
              <p className="text-2xl font-semibold">{metrics.totalEmergencies}</p>
              {summary?.trends && (
                <div className="flex items-center text-sm">
                  <TrendingUp className={`w-4 h-4 mr-1 ${summary.trends.isPositiveTrend ? 'text-green-500' : 'text-red-500'}`} />
                  {summary.trends.emergencyTrendPercentage > 0 ? '+' : ''}{summary.trends.emergencyTrendPercentage}%
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-sm text-muted-foreground">Avg Response Time</h3>
              <p className="text-2xl font-semibold">{metrics.avgResponseTime.toFixed(1)} min</p>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-sm text-muted-foreground">Success Rate</h3>
              <p className="text-2xl font-semibold">{metrics.successRate}%</p>
              <p className="text-sm text-muted-foreground">Completed emergencies</p>
            </Card>
          </div>

          {/* Charts - use chartData directly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">Response Time Trend</h3>
              {/* Your existing LineChart component */}
              {/* <LineChart data={responseTimeData} colors={chartColors} /> */}
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Response time chart goes here
              </div>
            </Card>

            {/* Emergency Types Chart */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">Emergency Types</h3>
              {/* Your existing PieChart component */}
              {/* <PieChart data={emergencyTypes} colors={chartColors} /> */}
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Emergency types pie chart goes here
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

/*
MIGRATION GUIDE:
================

1. Replace your current state management with useAnalytics hook:

BEFORE:
const [loading, setLoading] = useState(true);
const [stats, setStats] = useState({...});
const [responseTimeData, setResponseTimeData] = useState([]);
// ... more state

AFTER:
const analytics = useAnalytics();
const { loading, metrics, chartData, actions } = analytics;

2. Replace data transformation logic:

BEFORE:
const transformedData = transformDataForCharts(rawData);

AFTER:
const { responseTimeData, requestsByStatus, emergencyTypes } = chartData;

3. Replace export functionality:

BEFORE:
const handleExport = () => { // custom CSV logic };

AFTER:
const handleExport = actions.exportCSV;

4. Replace time range handling:

BEFORE:
const [timeRange, setTimeRange] = useState('7d');

AFTER:
const { timeRange } = analytics;
// Use actions.changeTimeRange to update

BENEFITS:
✅ Automatic caching
✅ Real-time updates
✅ Error handling
✅ Loading states
✅ Export functionality
✅ Time range filtering
✅ Performance optimization
*/
