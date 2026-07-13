import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { DEFAULT_ANALYTICS_SUBSCRIPTION_STATS, getAnalyticsIntakePage } from '../../services/analyticsService';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { Button } from '../ui/button';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileAnalytics } from '../mobile/MobileAnalytics';
import { formatAnalyticsWindow } from '../analytics/AnalyticsSummaryPrimitives';
import { routeFeedbackMs, useWayfindingNav } from '../console/WorkspaceStage';
import { AnalyticsDesktopWorkspace } from './analytics/AnalyticsDesktopWorkspace';

const ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE = 'Report downloads are not available yet.';
const ANALYTICS_DETAIL_UNAVAILABLE_MESSAGE = 'Detailed statistics are unavailable until request data loads.';
const ANALYTICS_LOAD_ERROR_MESSAGE = 'Statistics did not load.';
const ANALYTICS_REFRESH_PENDING_MESSAGE = 'Refreshing statistics.';
const ANALYTICS_STALE_SOURCE_MESSAGE = 'Statistics could not refresh. Showing the last loaded view.';
const ANALYTICS_PARTIAL_SOURCE_MESSAGE = 'Some statistics are unavailable.';
const ANALYTICS_DENIED_SOURCE_MESSAGE = 'Some statistics are not available for this role.';
const ANALYTICS_SOURCE_LABELS = {
  requests: 'Requests',
  users: 'Users',
  hospitals: 'Hospitals',
  ambulances: 'Ambulances',
  subscriptions: 'Subscriptions',
  finance: 'Payments',
};

const DEFAULT_STATS = {
  totalEmergencies: 0,
  completedEmergencies: 0,
  avgResponseTime: 0,
  responseSampleSize: 0,
  totalUsers: 0,
  successRate: 0,
  totalHospitals: 0,
  totalAmbulances: 0,
};

const DEFAULT_REQUEST_SAMPLE = {
  returnedCount: 0,
  totalCount: null,
  limit: 1000,
  complete: false,
};

const DEFAULT_SUBSCRIPTION_SAMPLE = {
  returnedCount: 0,
  totalCount: null,
  complete: false,
};

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
  sample: DEFAULT_SUBSCRIPTION_SAMPLE,
};

const DEFAULT_HOSPITAL_CAPACITY = { total: 0, occupied: 0, icu: 0 };

const normalizeRequestSample = (value) => ({
  ...DEFAULT_REQUEST_SAMPLE,
  ...(value || {}),
});

const normalizeSubscriptionStats = (value) => ({
  ...DEFAULT_SUBSCRIPTION_STATS,
  ...(value || {}),
  sample: {
    ...DEFAULT_SUBSCRIPTION_SAMPLE,
    ...(value?.sample || {}),
  },
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
    detail: detailParts.join(' ') || 'Try again when the data is ready.',
  };
};

const AnalyticsLoadErrorBanner = ({ onRetry }) => (
  <div
    data-testid="analytics-error-state"
    role="alert"
    className="mt-3 rounded-inner bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-e2"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{ANALYTICS_LOAD_ERROR_MESSAGE}</p>
        <p className="mt-1 text-xs text-destructive/75">Try again in a moment.</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRetry}
        className="self-start rounded-button bg-background/70 px-4 text-xs font-semibold text-destructive hover:bg-background/90 sm:self-auto"
      >
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
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
      className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 shadow-e2 dark:text-amber-200"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{issueSummary.title}</p>
          <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-100/70">{issueSummary.detail}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="self-start rounded-button bg-background/70 px-4 text-xs font-semibold text-amber-900 hover:bg-background/90 dark:text-amber-100 sm:self-auto"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
};

const getRangeDays = (timeRange) => ({ '7d': 7, '30d': 30, '90d': 90 }[timeRange] || 7);

const getLocalDayKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const Analytics = () => {
  const { hasMinRole, isAdmin, isProvider, isPatient, isViewer, isSponsor, isOrgAdmin, isDriver } = useAuth();
  const { isMobile } = useBreakpoint();
  const [timeRange, setTimeRange] = useState('7d');
  const [snapshotTimeRange, setSnapshotTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const analyticsSnapshotReadyRef = useRef(false);
  const analyticsRequestIdRef = useRef(0);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [requestSample, setRequestSample] = useState(DEFAULT_REQUEST_SAMPLE);
  const [analyticsLoadError, setAnalyticsLoadError] = useState(null);
  const [analyticsRefreshNotice, setAnalyticsRefreshNotice] = useState(null);
  const [analyticsSourceIssues, setAnalyticsSourceIssues] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(() => normalizeSubscriptionStats());
  const [financeData, setFinanceData] = useState([]);
  const [requestsByStatus, setRequestsByStatus] = useState([]);
  const [requestsByDay, setRequestsByDay] = useState([]);
  const [emergencyTypes, setEmergencyTypes] = useState([]);
  const [dominantType, setDominantType] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [detailsOpening, setDetailsOpening] = useState(false);
  const detailsFeedbackTimerRef = useRef(null);
  const [commandNotice, setCommandNotice] = useState(null);
  const [hospitalCapacity, setHospitalCapacity] = useState(DEFAULT_HOSPITAL_CAPACITY);
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const canReadSubscriptionAnalytics = isAdmin();
  const canReadFinanceAnalytics = isAdmin();
  const resolvedSubscriptionStats = useMemo(
    () => normalizeSubscriptionStats(subscriptionStats),
    [subscriptionStats],
  );
  const resolvedHospitalCapacity = useMemo(
    () => ({ ...DEFAULT_HOSPITAL_CAPACITY, ...(hospitalCapacity || {}) }),
    [hospitalCapacity],
  );
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
          ? snapshotTimeRange === timeRange
            ? 'The last loaded view stays visible while it refreshes.'
            : `Loading ${formatAnalyticsWindow(timeRange).toLowerCase()}; the ${formatAnalyticsWindow(snapshotTimeRange).toLowerCase()} snapshot stays visible.`
          : 'Try again when the data is available.',
      };
    }
    return analyticsSourceIssueSummary;
  }, [analyticsRefreshNotice, analyticsSourceIssueSummary, snapshotTimeRange, timeRange]);

  const issueSources = useMemo(
    () => new Set(analyticsSourceIssues.map((issue) => issue.source)),
    [analyticsSourceIssues],
  );
  const financeCurrency = useMemo(() => {
    const currency = financeData[0]?.currency;
    return typeof currency === 'string' && currency.trim()
      ? currency.trim().toUpperCase()
      : null;
  }, [financeData]);
  const sourceReadiness = useMemo(() => ({
    requests: snapshotReady && !issueSources.has('requests'),
    users: snapshotReady && !issueSources.has('users'),
    hospitals: snapshotReady && !issueSources.has('hospitals'),
    ambulances: snapshotReady && !issueSources.has('ambulances'),
    subscriptions: snapshotReady
      && canReadSubscriptionAnalytics
      && !issueSources.has('subscriptions')
      && resolvedSubscriptionStats.sample.complete === true,
    finance: snapshotReady && canReadFinanceAnalytics && !issueSources.has('finance') && Boolean(financeCurrency),
  }), [canReadFinanceAnalytics, canReadSubscriptionAnalytics, financeCurrency, issueSources, resolvedSubscriptionStats.sample.complete, snapshotReady]);

  const financeSummary = useMemo(() => {
    if (!Array.isArray(financeData) || !financeData.length) {
      return { totalCredits: 0, totalDebits: 0, todayCredits: 0, dailyAverageCredits: 0, currency: null };
    }
    const totalCredits = financeData.reduce((sum, point) => sum + (Number(point?.income) || 0), 0);
    const totalDebits = financeData.reduce((sum, point) => sum + (Number(point?.outflow) || 0), 0);
    return {
      totalCredits,
      totalDebits,
      todayCredits: Number(financeData[financeData.length - 1]?.income) || 0,
      dailyAverageCredits: totalCredits / financeData.length,
      currency: financeCurrency,
    };
  }, [financeCurrency, financeData]);

  const roleContext = useMemo(() => ({
    isAdmin: isAdmin(),
    isProvider: isProvider(),
    isPatient: isPatient(),
    isViewer: isViewer(),
    isSponsor: isSponsor(),
    isOrgAdmin: isOrgAdmin(),
    hasMinRole,
  }), [hasMinRole, isAdmin, isOrgAdmin, isPatient, isProvider, isSponsor, isViewer]);

  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isSponsor()) return 'sponsor';
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isDriver, isOrgAdmin, isProvider, isSponsor]);
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind],
  );

  const extractResponseMinutes = useCallback((request) => {
    const direct = Number(request?.response_time_minutes ?? request?.response_time ?? request?.avg_response_time);
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const created = request?.created_at ? new Date(request.created_at) : null;
    const endTimestamp = request?.responded_at || request?.dispatched_at || request?.completed_at || request?.updated_at;
    const ended = endTimestamp ? new Date(endTimestamp) : null;
    if (created && ended && !Number.isNaN(created.getTime()) && !Number.isNaN(ended.getTime())) {
      const minutes = (ended.getTime() - created.getTime()) / 60000;
      if (Number.isFinite(minutes) && minutes >= 0) return minutes;
    }
    return null;
  }, []);

  const generateChartData = useCallback((requests, requestedRange) => {
    const safeRequests = Array.isArray(requests) ? requests : [];
    const rangeDays = getRangeDays(requestedRange);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - (rangeDays - 1));
    start.setHours(0, 0, 0, 0);

    const dayMap = new Map();
    for (let index = 0; index < rangeDays; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      dayMap.set(getLocalDayKey(date), {
        requests: 0,
        completed: 0,
        responseTotal: 0,
        responseCount: 0,
        date,
      });
    }

    const statusCounts = {};
    const typeCounts = {};

    safeRequests.forEach((request) => {
      if (!request?.created_at) return;
      const created = new Date(request.created_at);
      if (Number.isNaN(created.getTime()) || created < start || created > now) return;
      const day = dayMap.get(getLocalDayKey(created));
      if (!day) return;

      day.requests += 1;
      const status = canonicalizeEmergencyStatus(request.status, 'pending_approval');
      if (status === 'completed') day.completed += 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const responseMinutes = extractResponseMinutes(request);
      if (responseMinutes !== null) {
        day.responseTotal += responseMinutes;
        day.responseCount += 1;
      }

      const type = String(request.service_type || request.emergency_type || request.type || 'other')
        .replace(/[_-]/g, ' ')
        .trim()
        .toLowerCase();
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    if (!safeRequests.length) {
      setRequestsByDay([]);
      setRequestsByStatus([]);
      setEmergencyTypes([]);
      setDominantType(null);
      return;
    }

    const dayData = Array.from(dayMap.values()).map((day) => ({
      day: day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      shortDay: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgTime: day.responseCount > 0 ? Math.round((day.responseTotal / day.responseCount) * 10) / 10 : 0,
      requests: day.requests,
      completed: day.completed,
    }));
    const statusData = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value,
      }))
      .sort((left, right) => right.value - left.value);
    const typeData = Object.entries(typeCounts)
      .map(([name, value]) => ({
        name: name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value,
      }))
      .sort((left, right) => right.value - left.value);

    setRequestsByDay(dayData);
    setRequestsByStatus(statusData);
    setEmergencyTypes(typeData);
    setDominantType(typeData[0] || null);
  }, [extractResponseMinutes]);

  const fetchAnalytics = useCallback(async () => {
    const requestedRange = timeRange;
    const requestId = analyticsRequestIdRef.current + 1;
    analyticsRequestIdRef.current = requestId;
    const hasVisibleSnapshot = analyticsSnapshotReadyRef.current;

    if (!hasVisibleSnapshot) {
      setLoading(true);
      setAnalyticsSourceIssues([]);
    }
    setAnalyticsLoadError(null);
    setAnalyticsRefreshNotice(hasVisibleSnapshot ? ANALYTICS_REFRESH_PENDING_MESSAGE : null);

    try {
      const analyticsPage = await getAnalyticsIntakePage({
        timeRange: requestedRange,
        includeSubscriptionAnalytics: canReadSubscriptionAnalytics,
        includeFinanceAnalytics: canReadFinanceAnalytics,
      });
      if (requestId !== analyticsRequestIdRef.current) return;

      const sourceIssues = analyticsPage.sourceIssues || [];
      const requests = analyticsPage.requests || [];
      const completed = requests.filter(
        (request) => canonicalizeEmergencyStatus(request.status, 'pending_approval') === 'completed',
      );
      const responseTimes = requests.map(extractResponseMinutes).filter((value) => value !== null);
      const avgResponseTime = responseTimes.length
        ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
        : 0;

      setAnalyticsSourceIssues(sourceIssues);
      setRequestSample(normalizeRequestSample(analyticsPage.requestSample));
      setFinanceData(canReadFinanceAnalytics ? analyticsPage.financeData || [] : []);
      setSubscriptionStats(canReadSubscriptionAnalytics
        ? normalizeSubscriptionStats(analyticsPage.subscriptionStats)
        : normalizeSubscriptionStats());
      setStats({
        totalEmergencies: requests.length,
        completedEmergencies: completed.length,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        responseSampleSize: responseTimes.length,
        totalUsers: analyticsPage.usersCount || 0,
        successRate: requests.length > 0 ? Math.round((completed.length / requests.length) * 100) : 0,
        totalHospitals: analyticsPage.hospitalsCount || 0,
        totalAmbulances: analyticsPage.ambulancesCount || 0,
      });

      const hospitals = analyticsPage.hospitals || [];
      const totalBeds = hospitals.reduce((sum, hospital) => sum + (Number(hospital.total_beds) || 0), 0);
      const availableBeds = hospitals.reduce((sum, hospital) => sum + (Number(hospital.available_beds) || 0), 0);
      const icuAvailable = hospitals.reduce((sum, hospital) => sum + (Number(hospital.icu_beds_available) || 0), 0);
      setHospitalCapacity({
        total: totalBeds,
        occupied: Math.max(0, totalBeds - availableBeds),
        icu: icuAvailable,
      });

      generateChartData(requests, requestedRange);
      analyticsSnapshotReadyRef.current = true;
      setSnapshotReady(true);
      setSnapshotTimeRange(requestedRange);
      setAnalyticsRefreshNotice(null);
    } catch (error) {
      if (requestId !== analyticsRequestIdRef.current) return;
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
      if (requestId === analyticsRequestIdRef.current) setLoading(false);
    }
  }, [canReadFinanceAnalytics, canReadSubscriptionAnalytics, extractResponseMinutes, generateChartData, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = useCallback(() => {
    setCommandNotice(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE);
    toast.info(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE);
  }, []);

  const handleOpenDetails = useCallback(() => {
    if (!sourceReadiness.requests) {
      setDetailsOpening(false);
      setCommandNotice(ANALYTICS_DETAIL_UNAVAILABLE_MESSAGE);
      toast.info(ANALYTICS_DETAIL_UNAVAILABLE_MESSAGE);
      return;
    }
    setCommandNotice(null);
    setDetailsOpening(true);
    setAnalyticsModalOpen(true);

    if (detailsFeedbackTimerRef.current) window.clearTimeout(detailsFeedbackTimerRef.current);
    detailsFeedbackTimerRef.current = window.setTimeout(() => {
      setDetailsOpening(false);
      detailsFeedbackTimerRef.current = null;
    }, routeFeedbackMs);
  }, [sourceReadiness.requests]);

  const handleCloseDetails = useCallback(() => {
    setAnalyticsModalOpen(false);
    setDetailsOpening(false);
  }, []);

  useEffect(() => () => {
    if (detailsFeedbackTimerRef.current) window.clearTimeout(detailsFeedbackTimerRef.current);
  }, []);

  const handleTimeRangeChange = useCallback((nextRange) => {
    setCommandNotice(null);
    setTimeRange(nextRange);
  }, []);

  useEffect(() => {
    window.addEventListener('openAnalyticsModal', handleOpenDetails);
    window.addEventListener('exportAnalytics', handleExport);
    return () => {
      window.removeEventListener('openAnalyticsModal', handleOpenDetails);
      window.removeEventListener('exportAnalytics', handleExport);
    };
  }, [handleExport, handleOpenDetails]);

  const headerActions = useMemo(() => (
    <Button
      type="button"
      onClick={handleOpenDetails}
      aria-busy={detailsOpening}
      data-state={detailsOpening ? 'opening' : 'idle'}
      aria-label={detailsOpening ? 'Opening detailed statistics' : 'View detailed statistics'}
      className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-[background,transform] hover:bg-foreground/90 active:scale-95 ${detailsOpening ? 'scale-95' : ''}`}
    >
      {detailsOpening
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <BarChart3 className="mr-2 h-4 w-4" />}
      {detailsOpening ? 'Opening...' : 'View details'}
    </Button>
  ), [detailsOpening, handleOpenDetails]);

  usePageHeader('Statistics', headerActions);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const analyticsIsFetching = analyticsRefreshNotice === ANALYTICS_REFRESH_PENDING_MESSAGE;
  const analyticsRouteContext = useMemo(() => ({
    stats,
    requestSample,
    timeRange,
    snapshotTimeRange,
    loading,
    snapshotReady,
    error: analyticsLoadError,
    sourceIssueSummary: visibleAnalyticsSourceIssueSummary,
    sourceReadiness,
    roleContext,
    canExport: false,
    reportingState: 'unavailable',
  }), [analyticsLoadError, loading, requestSample, roleContext, snapshotReady, snapshotTimeRange, sourceReadiness, stats, timeRange, visibleAnalyticsSourceIssueSummary]);

  useEffect(() => {
    const publishAnalyticsRouteContext = () => window.dispatchEvent(
      new CustomEvent('analyticsRouteContextUpdated', { detail: analyticsRouteContext }),
    );
    publishAnalyticsRouteContext();
    window.addEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
    return () => window.removeEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
  }, [analyticsRouteContext]);

  const modalAnalytics = {
    total: stats.totalEmergencies,
    completed: stats.completedEmergencies,
    active: stats.totalAmbulances,
    verified: stats.totalHospitals,
    emergency: stats.totalEmergencies,
    avgResponseTime: stats.avgResponseTime,
    byStatus: Object.fromEntries(requestsByStatus.map((item) => [item.name, item.value])),
    byCategory: Object.fromEntries(emergencyTypes.map((item) => [item.name, item.value])),
  };

  if (isMobile) {
    return (
      <>
        <SEOHead title="Statistics" description="Review request, response, network, and payment statistics in iVisit Console." />
        <MobileAnalytics
          stats={stats}
          requestSample={requestSample}
          subscriptionStats={resolvedSubscriptionStats}
          financeSummary={financeSummary}
          hospitalCapacity={resolvedHospitalCapacity}
          requestsByDay={requestsByDay}
          requestsByStatus={requestsByStatus}
          emergencyTypes={emergencyTypes}
          dominantType={dominantType}
          timeRange={timeRange}
          snapshotTimeRange={snapshotTimeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onRefresh={fetchAnalytics}
          onRetry={fetchAnalytics}
          onOpenDetails={handleOpenDetails}
          loadError={analyticsLoadError}
          commandNotice={commandNotice}
          sourceIssueSummary={visibleAnalyticsSourceIssueSummary}
          sourceReadiness={sourceReadiness}
          canReadSubscriptionAnalytics={canReadSubscriptionAnalytics}
          canReadFinanceAnalytics={canReadFinanceAnalytics}
          roleContext={roleContext}
          snapshotReady={snapshotReady}
          isLoading={loading && !snapshotReady}
          isFetching={analyticsIsFetching}
        />
        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={handleCloseDetails}
          analytics={modalAnalytics}
          type="emergency"
        />
      </>
    );
  }

  return (
    <>
      <SEOHead title="Statistics" description="Review request, response, network, and payment statistics in iVisit Console." />
      <AnalyticsDesktopWorkspace
        stats={stats}
        requestSample={requestSample}
        timeRange={timeRange}
        dataTimeRange={snapshotTimeRange}
        onTimeRangeChange={handleTimeRangeChange}
        requestsByDay={requestsByDay}
        requestsByStatus={requestsByStatus}
        emergencyTypes={emergencyTypes}
        dominantType={dominantType}
        hospitalCapacity={resolvedHospitalCapacity}
        subscriptionStats={resolvedSubscriptionStats}
        financeSummary={financeSummary}
        roleContext={roleContext}
        sourceReadiness={sourceReadiness}
        canReadSubscriptionAnalytics={canReadSubscriptionAnalytics}
        canReadFinanceAnalytics={canReadFinanceAnalytics}
        isLoading={loading && !snapshotReady}
        isFetching={analyticsIsFetching}
        snapshotReady={snapshotReady}
        loadError={analyticsLoadError}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
        statusBanners={(
          <>
            {analyticsLoadError && <AnalyticsLoadErrorBanner onRetry={fetchAnalytics} />}
            <AnalyticsSourceIssueBanner issueSummary={visibleAnalyticsSourceIssueSummary} onRetry={fetchAnalytics} />
            {commandNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground shadow-e2"
              >
                {commandNotice}
              </div>
            )}
          </>
        )}
      />
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={handleCloseDetails}
        analytics={modalAnalytics}
        type="emergency"
      />
    </>
  );
};

export default Analytics;
