import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  Heart,
  Calendar,
  Download,
  Ambulance,
  Hospital,
  AlertTriangle,
  ChevronRight,
  FileText,
  Plus,
  Mail,
  Crown,
  CheckCircle,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { usePageHeader } from '../../contexts/LayoutContext';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { DEFAULT_ANALYTICS_SUBSCRIPTION_STATS, getAnalyticsIntakePage } from '../../services/analyticsService';
import { Wallet } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { MobileAnalytics } from '../mobile/MobileAnalytics';
import { MobileAnalyticsSkeleton } from '../mobile/MobileSkeleton';
import { SEOHead } from '../common/SEOHead';

const CHART_COLORS = {
  primary: 'hsl(var(--foreground))',
  success: 'hsl(var(--foreground))',
  warning: 'hsl(var(--foreground))',
  info: 'hsl(var(--foreground))',
  secondary: 'hsl(var(--foreground))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))'
};

const ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE = 'Reports unavailable until analytics scope is verified.';
const ANALYTICS_LOAD_ERROR_MESSAGE = 'Statistics did not load.';
const ANALYTICS_REFRESH_PENDING_MESSAGE = 'Refreshing statistics.';
const ANALYTICS_STALE_SOURCE_MESSAGE = 'Statistics could not refresh. Showing the last loaded view.';
const ANALYTICS_PARTIAL_SOURCE_MESSAGE = 'Some statistics are unavailable.';
const ANALYTICS_DENIED_SOURCE_MESSAGE = 'Some statistics are not available for this role.';
const SOURCE_PENDING_LABEL = 'Source pending';
const ADMIN_ONLY_LABEL = 'Admin only';
const SCOPE_PENDING_LABEL = 'Scope pending';
const ANALYTICS_SOURCE_LABELS = {
  requests: 'Requests',
  users: 'Users',
  hospitals: 'Hospitals',
  ambulances: 'Ambulances',
  subscriptions: 'Subscriptions',
  finance: 'Payments',
};
const RESPONSE_TIME_CHART_HEIGHT = 300;
const DAILY_VOLUME_CHART_HEIGHT = 250;
const CASE_TYPE_CHART_HEIGHT = 200;
const PIE_CHART_SIZE = 220;
const FINANCE_CHART_HEIGHT = 160;
const RESPONSE_TIME_INITIAL_DIMENSION = { width: 1, height: RESPONSE_TIME_CHART_HEIGHT };
const DAILY_VOLUME_INITIAL_DIMENSION = { width: 1, height: DAILY_VOLUME_CHART_HEIGHT };
const CASE_TYPE_INITIAL_DIMENSION = { width: 1, height: CASE_TYPE_CHART_HEIGHT };
const PIE_CHART_INITIAL_DIMENSION = { width: PIE_CHART_SIZE, height: PIE_CHART_SIZE };
const FINANCE_CHART_INITIAL_DIMENSION = { width: 1, height: FINANCE_CHART_HEIGHT };
const DEFAULT_SUBSCRIPTION_STATS = {
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
  ...(DEFAULT_ANALYTICS_SUBSCRIPTION_STATS || {}),
};
const DEFAULT_HOSPITAL_CAPACITY = { total: 0, occupied: 0, icu: 0 };

const normalizeSubscriptionStats = (value) => ({
  ...DEFAULT_SUBSCRIPTION_STATS,
  ...(value || {}),
});

const getAnalyticsSourceIssueSummary = (issues = []) => {
  if (!issues.length) return null;

  const deniedLabels = issues
    .filter((issue) => issue.kind === 'denied')
    .map((issue) => ANALYTICS_SOURCE_LABELS[issue.source] || issue.source);
  const failedLabels = issues
    .filter((issue) => issue.kind !== 'denied')
    .map((issue) => ANALYTICS_SOURCE_LABELS[issue.source] || issue.source);
  const detailParts = [
    deniedLabels.length ? `${deniedLabels.join(', ')} need role access.` : null,
    failedLabels.length ? `${failedLabels.join(', ')} did not load.` : null,
  ].filter(Boolean);

  return {
    kind: deniedLabels.length ? 'denied' : 'failed',
    title: deniedLabels.length && !failedLabels.length
      ? ANALYTICS_DENIED_SOURCE_MESSAGE
      : ANALYTICS_PARTIAL_SOURCE_MESSAGE,
    detail: detailParts.join(' ') || 'Try again when the source is ready.',
  };
};

const AnalyticsLoadErrorBanner = ({ onRetry }) => (
  <div
    data-testid="analytics-error-state"
    role="alert"
    className="mb-4 mx-4 md:mx-6 rounded-button bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{ANALYTICS_LOAD_ERROR_MESSAGE}</p>
        <p className="mt-1 text-xs text-destructive/75">
          Retry when the source is available.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRetry}
        className="self-start rounded-pill bg-background/70 px-4 text-xs font-semibold text-destructive hover:bg-background/90 sm:self-auto"
      >
        Retry
      </Button>
    </div>
  </div>
);

const AnalyticsSourceIssueBanner = ({ issueSummary, onRetry }) => {
  if (!issueSummary) return null;

  return (
    <div
      data-testid="analytics-source-state"
      role="status"
      aria-live="polite"
      className="mb-4 mx-4 md:mx-6 rounded-button bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{issueSummary.title}</p>
          <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-100/70">
            {issueSummary.detail}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="self-start rounded-pill bg-background/70 px-4 text-xs font-semibold text-amber-900 hover:bg-background/90 dark:text-amber-100 sm:self-auto"
        >
          Retry
        </Button>
      </div>
    </div>
  );
};

export const Analytics = () => {
  const { hasMinRole, isAdmin, isProvider, isPatient, isViewer, isSponsor, isOrgAdmin } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const analyticsSnapshotReadyRef = useRef(false);
  const [stats, setStats] = useState({
    totalEmergencies: 0,
    avgResponseTime: 0,
    totalUsers: 0,
    successRate: 0,
    totalHospitals: 0,
    totalAmbulances: 0,
  });
  const [analyticsLoadError, setAnalyticsLoadError] = useState(null);
  const [analyticsRefreshNotice, setAnalyticsRefreshNotice] = useState(null);

  const [subscriptionStats, setSubscriptionStats] = useState(() => normalizeSubscriptionStats());

  const [financeData, setFinanceData] = useState([]);
  const [analyticsSourceIssues, setAnalyticsSourceIssues] = useState([]);

  const [responseTimeData, setResponseTimeData] = useState([]);
  const [requestsByStatus, setRequestsByStatus] = useState([]);
  const [requestsByDay, setRequestsByDay] = useState([]);
  const [emergencyTypes, setEmergencyTypes] = useState([]);
  const [dominantType, setDominantType] = useState(null); // Storytelling state
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [commandNotice, setCommandNotice] = useState(null);
  const [demandHeatmap, setDemandHeatmap] = useState([]);
  const [hospitalCapacity, setHospitalCapacity] = useState({ total: 0, occupied: 0, icu: 0 });
  const [sparseBannerDismissed, setSparseBannerDismissed] = useState(false);
  const resolvedSubscriptionStats = useMemo(
    () => normalizeSubscriptionStats(subscriptionStats),
    [subscriptionStats],
  );
  const resolvedHospitalCapacity = useMemo(
    () => ({ ...DEFAULT_HOSPITAL_CAPACITY, ...(hospitalCapacity || {}) }),
    [hospitalCapacity],
  );
  const isDataSparse = !sparseBannerDismissed && (!stats?.totalEmergencies || stats.totalEmergencies < 5);
  const hospitalCapacityPercent = resolvedHospitalCapacity.total > 0
    ? Math.round((resolvedHospitalCapacity.occupied / resolvedHospitalCapacity.total) * 100)
    : 0;
  const canReadSubscriptionAnalytics = isAdmin();
  const canReadFinanceAnalytics = isAdmin() || isSponsor();
  const subscriptionScopeLabel = canReadSubscriptionAnalytics ? SOURCE_PENDING_LABEL : ADMIN_ONLY_LABEL;
  const financeScopeLabel = canReadFinanceAnalytics ? SOURCE_PENDING_LABEL : SCOPE_PENDING_LABEL;
  const analyticsSourceIssueSummary = useMemo(
    () => getAnalyticsSourceIssueSummary(analyticsSourceIssues),
    [analyticsSourceIssues],
  );
  const visibleAnalyticsSourceIssueSummary = useMemo(() => {
    if (analyticsRefreshNotice) {
      return {
        kind: 'stale',
        title: analyticsRefreshNotice,
        detail: analyticsRefreshNotice === ANALYTICS_REFRESH_PENDING_MESSAGE
          ? 'Last loaded view stays visible.'
          : 'Retry when the source is available.',
      };
    }

    return analyticsSourceIssueSummary;
  }, [analyticsRefreshNotice, analyticsSourceIssueSummary]);

  const handleExport = useCallback(() => {
    setCommandNotice(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE);
    toast.info(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE);
  }, []);

  // Prepare analytics data for reports
  const analyticsDataForReports = useMemo(() => ({
    totalEmergencies: stats.totalEmergencies,
    avgResponseTime: stats.avgResponseTime,
    successRate: stats.successRate,
    totalUsers: stats.totalUsers,
    totalHospitals: stats.totalHospitals,
    totalAmbulances: stats.totalAmbulances,
    responseTimeData,
    requestsByStatus,
    requestsByDay,
    emergencyTypes,
    dominantType,
    // Add subscription analytics only for the proved admin subscriber scope.
    subscriptionAnalytics: canReadSubscriptionAnalytics
      ? {
        totalSubscribers: resolvedSubscriptionStats.total,
        activeSubscribers: resolvedSubscriptionStats.active,
        paidSubscribers: resolvedSubscriptionStats.paid,
        freeSubscribers: resolvedSubscriptionStats.free,
        newUsers: resolvedSubscriptionStats.newUsers,
        welcomeEmailsSent: resolvedSubscriptionStats.welcomeEmailsSent,
        paidConversionRate: resolvedSubscriptionStats.paidConversionRate,
      }
      : {
        scope: ADMIN_ONLY_LABEL,
      }
  }), [stats, responseTimeData, requestsByStatus, requestsByDay, emergencyTypes, dominantType, resolvedSubscriptionStats, canReadSubscriptionAnalytics]);

  // Financial summary metrics
  const financeSummary = useMemo(() => {
    const defaultRes = { total: 0, weeklyAvg: 0, today: 0, health: 0 };
    if (!financeData || !financeData.length) return defaultRes;

    const total = financeData.reduce((sum, d) => sum + (Number(d.income) || 0), 0);
    const today = Number(financeData[financeData.length - 1]?.income) || 0;
    const weeklyAvg = total / (financeData.length || 1);
    const health = weeklyAvg > 0 ? Math.min(100, (today / weeklyAvg) * 50 + 50) : 0;

    return {
      total: total || 0,
      weeklyAvg: weeklyAvg || 0,
      today: today || 0,
      health: health || 0
    };
  }, [financeData]);
  const hasFinanceData = Array.isArray(financeData) && financeData.length > 0;
  const hasMeasuredResponseSeries = responseTimeData.some((point) => Number(point?.avgTime) > 0);
  const responseScopeBadge = hasMeasuredResponseSeries ? 'Measured avg' : SOURCE_PENDING_LABEL;
  const providerResponseScopeBadge = hasMeasuredResponseSeries ? 'Personal' : SOURCE_PENDING_LABEL;
  const financeScale = Math.max(
    Number(financeSummary.total) || 0,
    Number(financeSummary.weeklyAvg) * 7 || 0,
    Number(financeSummary.today) || 0,
    1
  );
  const formatFinanceValue = (value) => (
    hasFinanceData ? `$${Number(value || 0).toFixed(0)}` : financeScopeLabel
  );
  const financeMetricRows = [
    {
      label: 'Today',
      value: formatFinanceValue(financeSummary.today),
      progress: hasFinanceData ? Math.min(100, Math.round(((Number(financeSummary.today) || 0) / financeScale) * 100)) : 0,
      color: 'muted'
    },
    {
      label: 'Avg/Week',
      value: formatFinanceValue((Number(financeSummary.weeklyAvg) || 0) * 7),
      progress: hasFinanceData ? Math.min(100, Math.round((((Number(financeSummary.weeklyAvg) || 0) * 7) / financeScale) * 100)) : 0,
      color: 'muted'
    },
    {
      label: 'Total',
      value: formatFinanceValue(financeSummary.total),
      progress: hasFinanceData ? Math.min(100, Math.round(((Number(financeSummary.total) || 0) / financeScale) * 100)) : 0,
      color: 'muted'
    }
  ];
  const paidConversionLabel = canReadSubscriptionAnalytics && Number(resolvedSubscriptionStats.paidConversionRate) > 0
    ? `${Number(resolvedSubscriptionStats.paidConversionRate).toFixed(1)}%`
    : subscriptionScopeLabel;
  const avgPerRequestLabel = hasFinanceData && stats.totalEmergencies > 0
    ? `$${(financeSummary.total / stats.totalEmergencies).toFixed(0)}`
    : financeScopeLabel;

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-3">
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-[140px] h-9 rounded-card bg-card shadow-sm text-xs font-semibold">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent className="rounded-inner shadow-sm bg-card">
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="bg-card h-9 px-4 text-[10px] font-bold"
        onClick={handleExport}
        aria-describedby={commandNotice ? 'analytics-export-feedback' : undefined}
      >
        <Download className="h-3 w-3 mr-2" />
        EXPORT
      </Button>
    </div>
  ), [timeRange, handleExport, commandNotice]);

  usePageHeader("Impact Analytics", headerActions);



  const extractResponseMinutes = useCallback((req) => {
    const direct = Number(req?.response_time_minutes ?? req?.response_time ?? req?.avg_response_time);
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const created = req?.created_at ? new Date(req.created_at) : null;
    const endTs = req?.responded_at || req?.dispatched_at || req?.completed_at || req?.updated_at;
    const ended = endTs ? new Date(endTs) : null;
    if (created && ended && !Number.isNaN(created.getTime()) && !Number.isNaN(ended.getTime())) {
      const mins = (ended.getTime() - created.getTime()) / 60000;
      if (Number.isFinite(mins) && mins >= 0) return mins;
    }
    return null;
  }, []);

  const generateChartData = useCallback((requests) => {
    const safeRequests = Array.isArray(requests) ? requests : [];
    const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - (rangeDays - 1));
    start.setHours(0, 0, 0, 0);

    const dayKeys = [];
    const dayMap = new Map();
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dayKeys.push(key);
      dayMap.set(key, { requests: 0, completed: 0, responseTotal: 0, responseCount: 0, date: d });
    }

    const statusPalette = {
      completed: CHART_COLORS.success,
      in_progress: CHART_COLORS.primary,
      accepted: CHART_COLORS.info,
      arrived: CHART_COLORS.secondary,
      pending_approval: CHART_COLORS.warning,
      payment_declined: CHART_COLORS.destructive,
      cancelled: CHART_COLORS.destructive,
    };
    const statusCounts = {};
    const typeCounts = {};
    const hourBuckets = Array(24).fill(0);

    safeRequests.forEach((req) => {
      if (!req?.created_at) return;
      const created = new Date(req.created_at);
      if (Number.isNaN(created.getTime()) || created < start || created > now) return;

      const dayKey = created.toISOString().split('T')[0];
      const bucket = dayMap.get(dayKey);
      if (!bucket) return;

      bucket.requests += 1;
      const status = canonicalizeEmergencyStatus(req.status, 'pending_approval');
      if (status === 'completed') bucket.completed += 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const responseMins = extractResponseMinutes(req);
      if (responseMins !== null) {
        bucket.responseTotal += responseMins;
        bucket.responseCount += 1;
      }

      const typeKey = String(req.service_type || req.emergency_type || req.type || 'other')
        .replace(/[_-]/g, ' ')
        .trim()
        .toLowerCase();
      typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

      hourBuckets[created.getHours()] += 1;
    });

    const dayData = dayKeys.map((key) => {
      const row = dayMap.get(key);
      const avg = row.responseCount > 0 ? row.responseTotal / row.responseCount : 0;
      return {
        day: row.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        shortDay: row.date.toLocaleDateString('en-US', { weekday: 'short' }),
        avgTime: Math.round(avg * 10) / 10,
        requests: row.requests,
        completed: row.completed,
      };
    });
    const hasLiveVolume = dayData.some((d) => d.requests > 0 || d.avgTime > 0);

    const statusData = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: statusPalette[name] || CHART_COLORS.mutedForeground
      }))
      .sort((a, b) => b.value - a.value);

    const typePalette = [CHART_COLORS.destructive, CHART_COLORS.warning, CHART_COLORS.info, CHART_COLORS.secondary, CHART_COLORS.primary];
    const sortedTypes = Object.entries(typeCounts)
      .map(([name, value], idx) => ({
        name: name.replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        baseColor: typePalette[idx % typePalette.length]
      }))
      .sort((a, b) => b.value - a.value);
    const maxVal = sortedTypes[0]?.value || 0;
    const normalizedTypes = sortedTypes.map((type) => ({
      ...type,
      color: type.value === maxVal ? type.baseColor : 'hsl(var(--muted))',
      isDominant: type.value === maxVal
    }));
    const hasLiveBreakdown = statusData.length > 0 || normalizedTypes.length > 0;

    const maxBucketValue = Math.max(...hourBuckets, 0);
    const heatmapData = hourBuckets.map((count, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      value: maxBucketValue > 0 ? Math.round((count / maxBucketValue) * 100) : 0,
      color: i >= 16 && i <= 20 ? CHART_COLORS.destructive : i >= 8 && i <= 15 ? CHART_COLORS.info : CHART_COLORS.muted
    }));

    // Source-pending fallback: do not synthesize measured analytics.
    if (!hasLiveVolume && !hasLiveBreakdown && maxBucketValue === 0) {
      setResponseTimeData([]);
      setRequestsByDay([]);
      setRequestsByStatus([]);
      setEmergencyTypes([]);
      setDominantType(null);
      setDemandHeatmap([]);
      return;
    }

    setResponseTimeData(dayData);
    setRequestsByDay(dayData);
    setRequestsByStatus(statusData);
    setEmergencyTypes(normalizedTypes);
    setDominantType(normalizedTypes[0] || null);
    setDemandHeatmap(heatmapData);
  }, [extractResponseMinutes, timeRange]);

  const fetchAnalytics = useCallback(async () => {
    const hasVisibleSnapshot = analyticsSnapshotReadyRef.current;

    if (!hasVisibleSnapshot) {
      setLoading(true);
      setAnalyticsSourceIssues([]);
    }
    setAnalyticsLoadError(null);
    setAnalyticsRefreshNotice(hasVisibleSnapshot ? ANALYTICS_REFRESH_PENDING_MESSAGE : null);
    try {
      const analyticsPage = await getAnalyticsIntakePage({
        timeRange,
        includeSubscriptionAnalytics: canReadSubscriptionAnalytics,
        includeFinanceAnalytics: canReadFinanceAnalytics,
      });
      setFinanceData(canReadFinanceAnalytics ? analyticsPage.financeData || [] : []);
      setAnalyticsSourceIssues(analyticsPage.sourceIssues || []);

      const requests = analyticsPage.requests || [];
      const completed = requests.filter(r => r.status === 'completed');
      const totalRequests = requests.length;

      const requestResponseTimes = requests
        .map(extractResponseMinutes)
        .filter((v) => v !== null);
      const avgResponseTime = requestResponseTimes.length
        ? requestResponseTimes.reduce((sum, value) => sum + value, 0) / requestResponseTimes.length
        : 0;

      setStats({
        totalEmergencies: totalRequests,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        totalUsers: analyticsPage.usersCount || 0,
        successRate: totalRequests > 0 ? Math.round((completed.length / totalRequests) * 100) : 0,
        totalHospitals: analyticsPage.hospitalsCount || 0,
        totalAmbulances: analyticsPage.ambulancesCount || 0,
      });

      // Calculate Hospital Capacity Metrics
      const hospitals = analyticsPage.hospitals || [];
      const totalBeds = hospitals.reduce((sum, h) => sum + (h.total_beds || 0), 0);
      const availableBeds = hospitals.reduce((sum, h) => sum + (h.available_beds || 0), 0);
      const icuAvailable = hospitals.reduce((sum, h) => sum + (h.icu_beds_available || 0), 0);

      setHospitalCapacity({
        total: totalBeds || 0,
        occupied: Math.max(0, totalBeds - availableBeds),
        icu: icuAvailable || 0
      });

      setSubscriptionStats(canReadSubscriptionAnalytics
        ? normalizeSubscriptionStats(analyticsPage.subscriptionStats)
        : normalizeSubscriptionStats());

      generateChartData(requests);
      analyticsSnapshotReadyRef.current = true;
      setAnalyticsRefreshNotice(null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (hasVisibleSnapshot) {
        setAnalyticsLoadError(null);
        setAnalyticsRefreshNotice(ANALYTICS_STALE_SOURCE_MESSAGE);
        toast.error(ANALYTICS_STALE_SOURCE_MESSAGE);
      } else {
        setAnalyticsLoadError(ANALYTICS_LOAD_ERROR_MESSAGE);
        setAnalyticsRefreshNotice(null);
        setAnalyticsSourceIssues([]);
        toast.error(ANALYTICS_LOAD_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  }, [canReadFinanceAnalytics, canReadSubscriptionAnalytics, extractResponseMinutes, generateChartData, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Listen for context panel events
  useEffect(() => {
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    const handleExportAnalytics = () => {
      handleExport();
    };

    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    window.addEventListener('exportAnalytics', handleExportAnalytics);

    return () => {
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
      window.removeEventListener('exportAnalytics', handleExportAnalytics);
    };
  }, [handleExport]);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/35 backdrop-blur-xs rounded-inner p-3 shadow-sm">
          <p className="font-semibold text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-pill" style={{ backgroundColor: entry.color }} />
              <span className="font-normal" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const { isMobile } = useBreakpoint();

  const roleContext = useMemo(() => ({
    isAdmin: isAdmin(),
    isProvider: isProvider(),
    isPatient: isPatient(),
    isViewer: isViewer(),
    isSponsor: isSponsor(),
    isOrgAdmin: isOrgAdmin(),
    hasMinRole
  }), [isAdmin, isProvider, isPatient, isViewer, isSponsor, isOrgAdmin, hasMinRole]);

  const analyticsRouteContext = useMemo(() => ({
    stats,
    timeRange,
    loading,
    error: analyticsLoadError,
    sourceIssueSummary: visibleAnalyticsSourceIssueSummary,
    subscriptionStats: resolvedSubscriptionStats,
    subscriptionScopeLabel,
    financeSummary,
    financeScopeLabel,
    hospitalCapacity: resolvedHospitalCapacity,
    hasFinanceData,
    roleContext,
    canExport: false,
  }), [analyticsLoadError, financeScopeLabel, financeSummary, hasFinanceData, loading, resolvedHospitalCapacity, resolvedSubscriptionStats, roleContext, stats, subscriptionScopeLabel, timeRange, visibleAnalyticsSourceIssueSummary]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const publishAnalyticsRouteContext = () => window.dispatchEvent(new CustomEvent('analyticsRouteContextUpdated', { detail: analyticsRouteContext }));
    publishAnalyticsRouteContext();
    window.addEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
    return () => window.removeEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
  }, [analyticsRouteContext]);

  if (isMobile && loading) {
    return <MobileAnalyticsSkeleton />;
  }

  if (isMobile) {
    return (
      <>
        <SEOHead title="Statistics" description="Review source-pending analytics and scoped reporting readiness in iVisit Console." />
        <MobileAnalytics
          stats={stats}
          subscriptionStats={resolvedSubscriptionStats}
          financeSummary={financeSummary}
          hospitalCapacity={resolvedHospitalCapacity}
          responseTimeData={responseTimeData}
          requestsByStatus={requestsByStatus}
          emergencyTypes={emergencyTypes}
          dominantType={dominantType}
          financeData={financeData}
          demandHeatmap={demandHeatmap}
          timeRange={timeRange}
          onRefresh={fetchAnalytics}
          loadError={analyticsLoadError}
          onRetry={fetchAnalytics}
          handleExport={handleExport}
          exportNotice={commandNotice}
          sourceIssueSummary={visibleAnalyticsSourceIssueSummary}
          subscriptionScopeLabel={subscriptionScopeLabel}
          financeScopeLabel={financeScopeLabel}
          canReadSubscriptionAnalytics={canReadSubscriptionAnalytics}
          canReadFinanceAnalytics={canReadFinanceAnalytics}
          roleContext={roleContext}
        />
        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={{
            total: stats.totalEmergencies,
            active: stats.totalAmbulances,
            verified: stats.totalHospitals,
            emergency: stats.totalEmergencies,
            ...resolvedSubscriptionStats
          }}
          type="emergency"
        />
      </>
    );
  }

  return (
    <>
      <SEOHead title="Statistics" description="Review source-pending analytics and scoped reporting readiness in iVisit Console." />
      <div className="min-h-screen py-6 md:py-8">
        {analyticsLoadError && (
          <AnalyticsLoadErrorBanner onRetry={fetchAnalytics} />
        )}
        <AnalyticsSourceIssueBanner
          issueSummary={visibleAnalyticsSourceIssueSummary}
          onRetry={fetchAnalytics}
        />
        {isDataSparse && (
          <div className="mb-4 mx-4 md:mx-6 rounded-inner bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 flex items-center justify-between">
            <span>Analytics source is pending. Verify report scope before using these charts.</span>
            <button onClick={() => setSparseBannerDismissed(true)} className="ml-4 shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400">Close</button>
          </div>
        )}
        {commandNotice && (
          <div
            id="analytics-export-feedback"
            role="status"
            aria-live="polite"
            className="mb-4 mx-4 md:mx-6 rounded-button bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
          >
            {commandNotice}
          </div>
        )}
        {/* Layout padding adjustment */}
        <div className="pt-2" />

        {/* Fluid Bento Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense"
        >

          {/* Stat Cards - Row 1 - Role-based visibility */}
          {/* Admin see system-wide stats */}
          {isAdmin() && [
            { title: "Total Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: null, trendValue: null, color: CHART_COLORS.destructive, colSpan: "col-span-1 lg:col-span-2", shape: "rounded-inner" },
            { title: "Avg Response", value: `${stats.avgResponseTime.toFixed(1)}m`, icon: Clock, trend: null, trendValue: null, color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: null, trendValue: null, color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`${stat.colSpan}`}
            >
              <Card className={`h-full min-h-[160px] ${stat.shape} bg-card shadow-sm p-6 relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-pill -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: stat.color }} />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-inner flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    {stat.trend && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card ${stat.trend === 'up' && stat.color !== CHART_COLORS.destructive ? 'bg-muted text-emerald-700 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                        {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-4xl font-bold">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Org Admin see organization-level stats */}
          {isOrgAdmin() && [
            { title: "Org Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: null, trendValue: null, color: CHART_COLORS.warning, colSpan: "col-span-1 lg:col-span-2", shape: "rounded-inner" },
            { title: "Avg Response", value: `${stats.avgResponseTime.toFixed(1)}m`, icon: Clock, trend: null, trendValue: null, color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: null, trendValue: null, color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={`org-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`${stat.colSpan}`}
            >
              <Card className={`h-full min-h-[160px] ${stat.shape} bg-card shadow-sm p-6 relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-pill -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: stat.color }} />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-inner flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    {stat.trend && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card ${stat.color === CHART_COLORS.warning ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200' : stat.color === CHART_COLORS.success ? 'bg-muted text-emerald-700 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                        {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-4xl font-bold">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Sponsor see system-wide stats */}
          {isSponsor() && [
            { title: "Total Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: null, trendValue: null, color: CHART_COLORS.destructive, colSpan: "col-span-1 lg:col-span-2", shape: "rounded-inner" },
            { title: "Avg Response", value: `${stats.avgResponseTime.toFixed(1)}m`, icon: Clock, trend: null, trendValue: null, color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: null, trendValue: null, color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={`sponsor-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`${stat.colSpan}`}
            >
              <Card className={`h-full min-h-[160px] ${stat.shape} bg-card shadow-sm p-6 relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-pill -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: stat.color }} />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-inner flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    {stat.trend && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card ${stat.trend === 'up' && stat.color !== CHART_COLORS.destructive ? 'bg-muted text-emerald-700 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                        {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-4xl font-bold">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Provider-specific limited stats */}
          {isProvider() && [
            { title: "Your Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: null, trendValue: null, color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2", shape: "rounded-inner" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: null, trendValue: null, color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2 xl:col-span-1", shape: "rounded-inner" },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={`provider-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`${stat.colSpan}`}
            >
              <Card className={`h-full min-h-[160px] ${stat.shape} bg-card shadow-sm p-6 relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-pill -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: stat.color }} />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-inner flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    {stat.trend && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card ${stat.color === CHART_COLORS.success ? 'bg-muted text-emerald-700 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                        {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-4xl font-bold">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Response Time Trend - Large Chart -> GEO-SHARD (Dynamic Flow) */}
          {/* Admin see system-wide trends */}
          {isAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col justify-between group relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="font-bold text-2xl tracking-tight">System Response Time Trend</h3>
                    <p className="text-muted-foreground font-medium">System-wide average response time over {timeRange}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-muted text-emerald-700 dark:text-emerald-200 font-semibold px-3 py-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {responseScopeBadge}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height={RESPONSE_TIME_CHART_HEIGHT} initialDimension={RESPONSE_TIME_INITIAL_DIMENSION}>
                    <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}m`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="avgTime"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={4}
                        fill="url(#colorTime)"
                        name="System Avg Time (min)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Org Admin see organization-level trends */}
          {isOrgAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col justify-between group relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="font-bold text-2xl tracking-tight">Organization Response Time Trend</h3>
                    <p className="text-muted-foreground font-medium">Your organization's response time over {timeRange}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-amber-500/15 text-amber-700 dark:text-amber-200 font-semibold px-3 py-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {responseScopeBadge}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height={RESPONSE_TIME_CHART_HEIGHT} initialDimension={RESPONSE_TIME_INITIAL_DIMENSION}>
                    <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTimeOrg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}m`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="avgTime"
                        stroke={CHART_COLORS.warning}
                        strokeWidth={4}
                        fill="url(#colorTimeOrg)"
                        name="Org Response Time (min)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Sponsor see system-wide trends */}
          {isSponsor() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col justify-between group relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="font-bold text-2xl tracking-tight">System Response Time Trend</h3>
                    <p className="text-muted-foreground font-medium">System-wide average response time over {timeRange}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-muted text-emerald-700 dark:text-emerald-200 font-semibold px-3 py-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {responseScopeBadge}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height={RESPONSE_TIME_CHART_HEIGHT} initialDimension={RESPONSE_TIME_INITIAL_DIMENSION}>
                    <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTimeSponsor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}m`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="avgTime"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={4}
                        fill="url(#colorTimeSponsor)"
                        name="System Avg Time (min)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Provider-specific Response Time Chart */}
          {isProvider() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col justify-between group relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="font-bold text-2xl tracking-tight">Your Response Times</h3>
                    <p className="text-muted-foreground font-medium">Your personal response time performance</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-muted text-muted-foreground font-semibold px-3 py-1">
                      <Activity className="h-4 w-4 mr-1" />
                      {providerResponseScopeBadge}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height={RESPONSE_TIME_CHART_HEIGHT} initialDimension={RESPONSE_TIME_INITIAL_DIMENSION}>
                    <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTimeProvider" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}m`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="avgTime"
                        stroke={CHART_COLORS.info}
                        strokeWidth={4}
                        fill="url(#colorTimeProvider)"
                        name="Your Response Time (min)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Request Status Breakdown - Pie Chart -> GEO-TICKET (Rounded cutouts) */}
          {/* Admin see system-wide status */}
          {isAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden group">
                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-xl mb-1 tracking-tight">System Status</h3>
                <p className="text-sm text-muted-foreground font-medium mb-6 w-3/4">Current distribution of all system requests</p>

                <div className="flex-1 relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  <ResponsiveContainer width={PIE_CHART_SIZE} height={PIE_CHART_SIZE} minWidth={200} aspect={1} initialDimension={PIE_CHART_INITIAL_DIMENSION}>
                    <PieChart>
                      <Pie
                        data={requestsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {requestsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{stats.successRate}%</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">SYSTEM SUCCESS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {requestsByStatus.slice(0, 3).map((status, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-muted/20 text-xs font-medium">
                      <div className="w-2 h-2 rounded-pill" style={{ backgroundColor: status.color }} />
                      <span className="opacity-80">{status.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Org Admin see organization-level status */}
          {isOrgAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Activity className="h-6 w-6 text-amber-700 dark:text-amber-200" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-xl mb-1 tracking-tight">Organization Status</h3>
                <p className="text-sm text-muted-foreground font-medium mb-6 w-3/4">Current distribution of your organization's requests</p>

                <div className="flex-1 relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  <ResponsiveContainer width={PIE_CHART_SIZE} height={PIE_CHART_SIZE} minWidth={200} aspect={1} initialDimension={PIE_CHART_INITIAL_DIMENSION}>
                    <PieChart>
                      <Pie
                        data={requestsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {requestsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{stats.successRate}%</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">ORG SUCCESS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {requestsByStatus.slice(0, 3).map((status, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-muted/20 text-xs font-medium">
                      <div className="w-2 h-2 rounded-pill" style={{ backgroundColor: status.color }} />
                      <span className="opacity-80">{status.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Sponsor see system-wide status */}
          {isSponsor() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-xl mb-1 tracking-tight">System Status</h3>
                <p className="text-sm text-muted-foreground font-medium mb-6 w-3/4">Current distribution of all system requests</p>

                <div className="flex-1 relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  <ResponsiveContainer width={PIE_CHART_SIZE} height={PIE_CHART_SIZE} minWidth={200} aspect={1} initialDimension={PIE_CHART_INITIAL_DIMENSION}>
                    <PieChart>
                      <Pie
                        data={requestsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {requestsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{stats.successRate}%</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">SYSTEM SUCCESS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {requestsByStatus.slice(0, 3).map((status, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-muted/20 text-xs font-medium">
                      <div className="w-2 h-2 rounded-pill" style={{ backgroundColor: status.color }} />
                      <span className="opacity-80">{status.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Provider-specific Status Breakdown */}
          {isProvider() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full min-h-[400px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden group">
                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-xl mb-1 tracking-tight">Your Status</h3>
                <p className="text-sm text-muted-foreground font-medium mb-6 w-3/4">Current distribution of your requests</p>

                <div className="flex-1 relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  <ResponsiveContainer width={PIE_CHART_SIZE} height={PIE_CHART_SIZE} minWidth={200} aspect={1} initialDimension={PIE_CHART_INITIAL_DIMENSION}>
                    <PieChart>
                      <Pie
                        data={requestsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {requestsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color === CHART_COLORS.primary ? CHART_COLORS.info : entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{stats.successRate}%</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">YOUR SUCCESS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {requestsByStatus.slice(0, 3).map((status, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-muted/30 text-xs font-medium">
                      <div className="w-2 h-2 rounded-pill" style={{ backgroundColor: status.color === CHART_COLORS.primary ? CHART_COLORS.info : status.color }} />
                      <span className="opacity-80">{status.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Subscription Analytics Card - Admin/Sponsor Only */}
          {(isAdmin() || isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden group">
                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Mail className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <h3 className="font-bold text-xl tracking-tight">Subscriptions</h3>
                  <p className="text-sm text-muted-foreground font-medium">Community engagement overview</p>
                </div>

                <div className="flex-1 relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  <ResponsiveContainer width={PIE_CHART_SIZE} height={PIE_CHART_SIZE} minWidth={200} aspect={1} initialDimension={PIE_CHART_INITIAL_DIMENSION}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: resolvedSubscriptionStats.active, fill: CHART_COLORS.success },
                          { name: 'Inactive', value: resolvedSubscriptionStats.total - resolvedSubscriptionStats.active, fill: CHART_COLORS.muted },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        <Cell fill={CHART_COLORS.success} />
                        <Cell fill={CHART_COLORS.muted} />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{resolvedSubscriptionStats.total}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">TOTAL</p>
                    </div>
                  </div>
                </div>

                {/* Type Pills Below */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-amber-500/15 text-xs font-medium">
                    <div className="w-2 h-2 rounded-pill bg-amber-500" />
                    <span>Premium {resolvedSubscriptionStats.paid}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-muted/20 text-xs font-medium">
                    <div className="w-2 h-2 rounded-pill bg-muted" />
                    <span>Free {resolvedSubscriptionStats.free}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Small Stat Cards - Row 3 - Role-based visibility */}
          {/* Admin/Org Admin/Sponsor see system-wide stats */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && [
            { title: "Ambulances", value: stats.totalAmbulances, icon: Ambulance, trend: null, trendValue: null, color: CHART_COLORS.success },
            { title: "Total Users", value: stats.totalUsers, icon: Users, trend: null, trendValue: null, color: CHART_COLORS.secondary, },
            { title: "Hospitals", value: stats.totalHospitals, icon: Hospital, trend: null, trendValue: null, color: CHART_COLORS.info },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={`small-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + (idx * 0.1) }}
              className="col-span-1 lg:col-span-2"
            >
              <Card className="h-full min-h-[140px] rounded-card bg-card p-6 relative overflow-hidden group flex items-center justify-between">
                {/* Top Right Icon Style Applied Here Too */}
                <div className="absolute -top-3 -right-3 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <div className="w-24 h-24 rounded-pill" style={{ backgroundColor: stat.color }} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-sm relative z-10">
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">{stat.title}</p>
                  </div>
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Provider-specific limited stats */}
          {isProvider() && [
            { title: "Your Performance", value: `${stats.successRate}%`, icon: Activity, trend: null, trendValue: null, color: CHART_COLORS.info },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={`provider-small-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + (idx * 0.1) }}
              className="col-span-1 lg:col-span-2"
            >
              <Card className="h-full min-h-[140px] rounded-card bg-card p-6 relative overflow-hidden group flex items-center justify-between">
                <div className="absolute -top-3 -right-3 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <div className="w-24 h-24 rounded-pill" style={{ backgroundColor: stat.color }} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-sm relative z-10">
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">{stat.title}</p>
                  </div>
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* New Horizontal Card - Fleet Readiness - Appears under Ambulance (Row 4, Col 5-6) */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
              className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2"
            >
              <Card className="h-full min-h-[140px] rounded-card bg-card shadow-sm p-6 flex flex-col justify-between group relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground mb-1">Fleet Readiness</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-bold">
                        {stats.totalAmbulances}
                        <span className="text-sm text-muted-foreground font-medium ml-1">units</span>
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card bg-muted/30 text-muted-foreground text-[10px] font-bold">{SOURCE_PENDING_LABEL}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-pill bg-muted flex items-center justify-center">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="h-1.5 w-full bg-muted/20 rounded-pill overflow-hidden">
                    <motion.div
                      className="h-full bg-muted"
                      initial={{ width: 0 }}
                      animate={{ width: 0 }}
                      transition={{ duration: 1.5, delay: 0.7 }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium flex justify-between">
                    <span>Readiness Source</span>
                    <span>{SOURCE_PENDING_LABEL}</span>
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Hospital Resources Card - The REFINED one */}
          {
            (isAdmin() || isOrgAdmin() || isSponsor()) && (
              <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.58 }} className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
                <Card className="h-full min-h-[140px] rounded-card bg-card shadow-sm p-6 flex flex-col justify-between group relative overflow-hidden">
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground mb-1">Hospital Resources</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold">
                          {resolvedHospitalCapacity.occupied || 0}
                          <span className="text-sm text-muted-foreground font-medium ml-1">/ {resolvedHospitalCapacity.total || 0} BEDS</span>
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card bg-muted text-muted-foreground text-[10px] font-bold">{resolvedHospitalCapacity.total > 0 ? 'Current' : SOURCE_PENDING_LABEL}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-pill bg-muted flex items-center justify-center">
                      <Hospital className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 relative z-10">
                    <div className="flex-1 space-y-2">
                      <div className="h-1.5 w-full bg-muted/20 rounded-pill overflow-hidden">
                        <motion.div className="h-full bg-muted" initial={{ width: 0 }} animate={{ width: `${hospitalCapacityPercent}%` }} transition={{ duration: 1.5, delay: 0.8 }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium flex justify-between">
                        <span>Occ. Rate</span>
                        <span>{resolvedHospitalCapacity.total > 0 ? `${hospitalCapacityPercent}% Capacity` : SOURCE_PENDING_LABEL}</span>
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted/30 rounded-inner ">
                      <p className="text-[8px] font-bold text-muted-foreground">ICU Free</p>
                      <p className="text-sm font-black text-foreground">{resolvedHospitalCapacity.icu || 0}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          }

          {/* Daily Volume Bar Chart - Admin/Org Admin/Sponsor Only */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="h-full min-h-[350px] rounded-card bg-card shadow-sm p-8 flex flex-col relative group">
                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <h3 className="font-bold text-xl tracking-tight">Daily Volume</h3>
                  <p className="text-sm text-muted-foreground font-medium">System requests per day</p>
                </div>

                <div className="flex-1 w-full min-h-[250px] min-w-[300px] relative z-10">
                  <ResponsiveContainer width="100%" height={DAILY_VOLUME_CHART_HEIGHT} initialDimension={DAILY_VOLUME_INITIAL_DIMENSION}>
                    <BarChart data={requestsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                      <Bar
                        dataKey="requests"
                        fill={CHART_COLORS.primary}
                        radius={[4, 4, 4, 4]}
                        name="Total Requests"
                        barSize={24}
                        animationDuration={1500}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Peak Demand Heatmap - Row-Span-2 */}
          {
            (isAdmin() || isOrgAdmin() || isSponsor()) && (
              <motion.div layout className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3 row-span-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }}>
                <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
                  <div className="relative z-10 flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[10px] font-black text-destructive mb-1">System Load</p>
                      <h3 className="font-bold text-xl tracking-tight leading-tight">Demand Velocity Heatmap</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-pill bg-muted" />
                        <p className="text-[10px] font-bold">{SOURCE_PENDING_LABEL}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-2 relative z-10">
                    {demandHeatmap.map((item, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + (idx * 0.02) }} className="relative group/cell">
                        <div className={`w-full h-full rounded-inner transition-all duration-500 cursor-crosshair ${item.value > 80 ? 'bg-destructive/60' : item.value > 50 ? 'bg-amber-500/15' : item.value > 30 ? 'bg-muted/40' : 'bg-muted/30'}`} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-background/90 backdrop-blur-md rounded-inner text-[8px] font-bold opacity-0 group-hover/cell:opacity-100 transition-opacity z-50 whitespace-nowrap  shadow-sm pointer-events-none">
                          {item.hour} - {item.value > 0 ? `${item.value}% load` : SOURCE_PENDING_LABEL}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-8 flex items-center justify-between pt-6">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-pill bg-destructive/60" />
                        <span className="text-[8px] font-bold text-muted-foreground">Critical</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground/50 italic">{SOURCE_PENDING_LABEL}</p>
                  </div>
                </Card>
              </motion.div>
            )
          }

          {/* Provider-specific Daily Volume */}
          {isProvider() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="h-full min-h-[350px] rounded-card bg-card shadow-sm p-8 flex flex-col relative group">
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <h3 className="font-bold text-xl tracking-tight">Your Daily Volume</h3>
                  <p className="text-sm text-muted-foreground font-medium">Your requests per day</p>
                </div>

                <div className="flex-1 w-full min-h-[250px] min-w-[300px] relative z-10">
                  <ResponsiveContainer width="100%" height={DAILY_VOLUME_CHART_HEIGHT} initialDimension={DAILY_VOLUME_INITIAL_DIMENSION}>
                    <BarChart data={requestsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                      <XAxis
                        dataKey="shortDay"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                      <Bar
                        dataKey="requests"
                        fill={CHART_COLORS.info}
                        radius={[4, 4, 4, 4]}
                        name="Your Requests"
                        barSize={24}
                        animationDuration={1500}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Emergency Types Bar Chart - Admin/Org Admin/Sponsor Only */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <Card className="h-full min-h-[350px] rounded-card bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                </div>

                <div className="mb-2 relative z-10">
                  <h3 className="font-bold text-xl tracking-tight">Dominant System Case</h3>
                  {dominantType && stats.totalEmergencies > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-3xl font-bold text-destructive">{dominantType.name}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-destructive/10 text-destructive font-semibold">
                        {Math.round((dominantType.value / stats.totalEmergencies) * 100)}% of system cases
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">{SOURCE_PENDING_LABEL}</p>
                  )}
                </div>

                <div className="flex-1 w-full min-h-[200px] min-w-[300px] mt-4 relative z-10">
                  <ResponsiveContainer width="100%" height={CASE_TYPE_CHART_HEIGHT} initialDimension={CASE_TYPE_INITIAL_DIMENSION}>
                    <BarChart data={emergencyTypes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={13}
                        width={100}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.destructive}
                        radius={[0, 8, 8, 0]}
                        animationDuration={1500}
                      >
                        {emergencyTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Provider-specific Emergency Types */}
          {isProvider() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 z-20">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="mb-2 relative z-10">
                  <h3 className="font-bold text-xl tracking-tight">Your Case Types</h3>
                  {dominantType && stats.totalEmergencies > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-3xl font-bold text-muted-foreground">{dominantType.name}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-inner bg-muted text-muted-foreground font-semibold">
                        {Math.round((dominantType.value / stats.totalEmergencies) * 100)}% of your cases
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">{SOURCE_PENDING_LABEL}</p>
                  )}
                </div>

                <div className="flex-1 w-full min-h-[200px] mt-4 relative z-10">
                  <ResponsiveContainer width="100%" height={CASE_TYPE_CHART_HEIGHT} initialDimension={CASE_TYPE_INITIAL_DIMENSION}>
                    <BarChart data={emergencyTypes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={13}
                        width={100}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.info}
                        radius={[0, 8, 8, 0]}
                        animationDuration={1500}
                      >
                        {emergencyTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color === CHART_COLORS.destructive ? CHART_COLORS.info : entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Additional Analytics Cards - Search Analytics and Performance Metrics */}

          {/* Search Analytics Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
              {/* Top Right Icon */}
              <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                  <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <h3 className="font-bold text-xl tracking-tight">Search Analytics</h3>
                <p className="text-sm text-muted-foreground font-medium">User search patterns and trends</p>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 relative z-10">
                {[
                  { label: 'Total Searches', value: SOURCE_PENDING_LABEL, change: 'Pending', positive: true },
                  { label: 'Success Rate', value: SOURCE_PENDING_LABEL, change: 'Pending', positive: true },
                  { label: 'Avg Time', value: SOURCE_PENDING_LABEL, change: 'Pending', positive: true },
                  { label: 'No Results', value: SOURCE_PENDING_LABEL, change: 'Pending', positive: true }
                ].map((metric, idx) => (
                  <div key={idx} className="p-4 rounded-inner bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">{metric.label}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card bg-muted/30 text-muted-foreground font-bold text-xs">
                        {metric.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Performance Metrics Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
              {/* Top Right Icon */}
              <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                  <div className="w-12 h-12 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                    <Activity className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <h3 className="font-bold text-xl tracking-tight">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground font-medium">System health and efficiency</p>
              </div>

              <div className="space-y-4 flex-1 relative z-10">
                {[
                  { label: 'API Response Time', value: SOURCE_PENDING_LABEL, target: SOURCE_PENDING_LABEL, status: 'pending' },
                  { label: 'Database Query Time', value: SOURCE_PENDING_LABEL, target: SOURCE_PENDING_LABEL, status: 'pending' },
                  { label: 'Page Load Time', value: SOURCE_PENDING_LABEL, target: SOURCE_PENDING_LABEL, status: 'pending' },
                  { label: 'Error Rate', value: SOURCE_PENDING_LABEL, target: SOURCE_PENDING_LABEL, status: 'pending' },
                  { label: 'Uptime', value: SOURCE_PENDING_LABEL, target: SOURCE_PENDING_LABEL, status: 'pending' }
                ].map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-inner bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{metric.label}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-card ${metric.status === 'excellent' ? 'bg-muted text-emerald-700 dark:text-emerald-200' : metric.status === 'good' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200' : 'bg-muted/30 text-muted-foreground'
                          } font-bold text-xs`}>
                          {metric.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-lg font-bold">{metric.value}</span>
                        <span className="text-xs text-muted-foreground">Target: {metric.target}</span>
                      </div>
                    </div>
                    <div className="w-16 h-2 bg-muted/30 rounded-card overflow-hidden">
                      <motion.div
                        className={`h-full ${metric.status === 'excellent' ? 'bg-muted' : metric.status === 'pending' ? 'bg-muted' : 'bg-amber-500'
                          } rounded-card`}
                        initial={{ width: 0 }}
                        animate={{
                          width: metric.status === 'pending'
                            ? 0
                            : metric.status === 'excellent'
                            ? '90%'
                            : metric.status === 'good'
                              ? '75%'
                              : '60%'
                        }}
                        transition={{ duration: 1, delay: 0.8 + (idx * 0.1) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Financial Performance Card - Admin/Sponsor only until org finance scope is proved */}
          {canReadFinanceAnalytics && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="h-full min-h-[350px] rounded-inner bg-card shadow-sm p-8 flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground mb-1">Financial</p>
                    <h3 className="font-bold text-xl tracking-tight">Revenue Performance</h3>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Body - always 2 columns */}
                <div className="flex-1 grid grid-cols-2 gap-4 relative z-10">

                  {/* LEFT: Revenue Metrics */}
                  <div className="flex flex-col justify-between gap-3">
                    {financeMetricRows.map((m, idx) => (
                      <div key={idx} className="space-y-1.5 p-3 rounded-inner bg-muted/30">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground">{m.label}</span>
                          <span className="text-base font-black tracking-tight">{m.value}</span>
                        </div>
                        <div className="h-1 bg-muted/30 rounded-card overflow-hidden">
                          <motion.div
                            className={`h-full bg-${m.color} rounded-card`}
                            initial={{ width: 0 }}
                            animate={{ width: `${m.progress}%` }}
                            transition={{ duration: 1, delay: 0.9 + (idx * 0.1) }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Health Score Row */}
                    <div className="flex items-center gap-3 p-3 rounded-inner bg-muted/30">
                      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-muted/10" />
                          <circle
                            cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
                            strokeDasharray={100}
                            strokeDashoffset={100 - financeSummary.health}
                            className="text-muted-foreground transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black">{Math.round(financeSummary.health)}%</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground">Health</p>
                        <p className="text-[8px] text-muted-foreground leading-tight">{SOURCE_PENDING_LABEL}</p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Area Chart */}
                  <div className="flex flex-col gap-3">
                    <div className="h-[160px] min-h-[160px] bg-emerald-500/5 rounded-button overflow-hidden p-2">
                      <ResponsiveContainer width="100%" height={FINANCE_CHART_HEIGHT} initialDimension={FINANCE_CHART_INITIAL_DIMENSION}>
                        <AreaChart data={financeData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                          <defs>
                            <linearGradient id="financeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--muted))" vertical={false} opacity={0.3} />
                          <XAxis dataKey="day" fontSize={8} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                          <YAxis fontSize={8} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke={CHART_COLORS.success}
                            fill="url(#financeGrad)"
                            strokeWidth={2}
                            name="Income"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Quick Stat Tiles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-inner bg-muted/30 text-center">
                        <p className="text-[8px] font-bold text-muted-foreground">Paid Conv.</p>
                        <p className="text-sm font-black text-foreground">{paidConversionLabel}</p>
                      </div>
                      <div className="p-2 rounded-inner bg-muted/30 text-center">
                        <p className="text-[8px] font-bold text-muted-foreground">Avg/Req</p>
                        <p className="text-sm font-black text-foreground">{avgPerRequestLabel}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </Card>
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* Analytics Modal */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={{
          total: stats.totalEmergencies,
          active: stats.totalAmbulances,
          verified: stats.totalHospitals,
          emergency: stats.totalEmergencies,
          ...resolvedSubscriptionStats
        }}
        type="emergency"
      />
    </>
  );
};
