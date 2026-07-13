import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useAuth } from '../../../contexts/AuthContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { getAnalyticsIntakePage } from '../../../services/analyticsService';
import { routeFeedbackMs, useWayfindingNav } from '../../console/WorkspaceStage';
import {
  ANALYTICS_DETAIL_UNAVAILABLE_MESSAGE,
  ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE,
  ANALYTICS_LOAD_ERROR_MESSAGE,
  ANALYTICS_REFRESH_PENDING_MESSAGE,
  ANALYTICS_STALE_SOURCE_MESSAGE,
  buildAnalyticsSnapshot,
  DEFAULT_ANALYTICS_STATS,
  DEFAULT_HOSPITAL_CAPACITY,
  DEFAULT_HOSPITAL_SAMPLE,
  DEFAULT_REQUEST_SAMPLE,
  getAnalyticsRoleKind,
  getAnalyticsSourceIssueSummary,
  getAnalyticsSourceReadiness,
  getFinanceCurrency,
  getFinanceSummary,
  getModalAnalytics,
  getVisibleAnalyticsSourceIssueSummary,
  normalizeSubscriptionStats,
} from './analyticsPageModel';

export const useAnalyticsPageController = () => {
  const {
    hasMinRole,
    isAdmin,
    isProvider,
    isPatient,
    isViewer,
    isSponsor,
    isOrgAdmin,
    isDriver,
  } = useAuth();
  const { isMobile } = useBreakpoint();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const admin = isAdmin();
  const provider = isProvider();
  const patient = isPatient();
  const viewer = isViewer();
  const sponsor = isSponsor();
  const orgAdmin = isOrgAdmin();
  const driver = isDriver();
  const canReadSubscriptionAnalytics = admin;
  const canReadFinanceAnalytics = admin;

  const [timeRange, setTimeRange] = useState('7d');
  const [snapshotTimeRange, setSnapshotTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const analyticsSnapshotReadyRef = useRef(false);
  const analyticsRequestIdRef = useRef(0);
  const [stats, setStats] = useState(DEFAULT_ANALYTICS_STATS);
  const [requestSample, setRequestSample] = useState(DEFAULT_REQUEST_SAMPLE);
  const [hospitalSample, setHospitalSample] = useState(DEFAULT_HOSPITAL_SAMPLE);
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

  const resolvedSubscriptionStats = useMemo(
    () => normalizeSubscriptionStats(subscriptionStats),
    [subscriptionStats],
  );
  const resolvedHospitalCapacity = useMemo(
    () => ({
      ...DEFAULT_HOSPITAL_CAPACITY,
      ...(hospitalCapacity || {}),
      sample: { ...DEFAULT_HOSPITAL_SAMPLE, ...(hospitalSample || {}) },
    }),
    [hospitalCapacity, hospitalSample],
  );
  const analyticsSourceIssueSummary = useMemo(
    () => getAnalyticsSourceIssueSummary(analyticsSourceIssues),
    [analyticsSourceIssues],
  );
  const visibleAnalyticsSourceIssueSummary = useMemo(
    () => getVisibleAnalyticsSourceIssueSummary({
      refreshNotice: analyticsRefreshNotice,
      issueSummary: analyticsSourceIssueSummary,
      snapshotTimeRange,
      timeRange,
    }),
    [analyticsRefreshNotice, analyticsSourceIssueSummary, snapshotTimeRange, timeRange],
  );
  const financeCurrency = useMemo(() => getFinanceCurrency(financeData), [financeData]);
  const sourceReadiness = useMemo(() => getAnalyticsSourceReadiness({
    snapshotReady,
    sourceIssues: analyticsSourceIssues,
    hospitalSample,
    subscriptionStats: resolvedSubscriptionStats,
    canReadSubscriptionAnalytics,
    canReadFinanceAnalytics,
    financeCurrency,
  }), [
    analyticsSourceIssues,
    canReadFinanceAnalytics,
    canReadSubscriptionAnalytics,
    financeCurrency,
    hospitalSample,
    resolvedSubscriptionStats,
    snapshotReady,
  ]);
  const financeSummary = useMemo(
    () => getFinanceSummary(financeData, financeCurrency),
    [financeCurrency, financeData],
  );
  const roleContext = useMemo(() => ({
    isAdmin: admin,
    isProvider: provider,
    isPatient: patient,
    isViewer: viewer,
    isSponsor: sponsor,
    isOrgAdmin: orgAdmin,
    hasMinRole,
  }), [admin, hasMinRole, orgAdmin, patient, provider, sponsor, viewer]);
  const roleKind = useMemo(() => getAnalyticsRoleKind({
    admin,
    orgAdmin,
    sponsor,
    provider,
    driver,
  }), [admin, driver, orgAdmin, provider, sponsor]);
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind],
  );

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

      const snapshot = buildAnalyticsSnapshot({
        analyticsPage,
        requestedRange,
        canReadSubscriptionAnalytics,
        canReadFinanceAnalytics,
      });
      setAnalyticsSourceIssues(snapshot.sourceIssues);
      setRequestSample(snapshot.requestSample);
      setHospitalSample(snapshot.hospitalSample);
      setFinanceData(snapshot.financeData);
      setSubscriptionStats(snapshot.subscriptionStats);
      setStats(snapshot.stats);
      setHospitalCapacity(snapshot.hospitalCapacity);
      setRequestsByDay(snapshot.requestsByDay);
      setRequestsByStatus(snapshot.requestsByStatus);
      setEmergencyTypes(snapshot.emergencyTypes);
      setDominantType(snapshot.dominantType);
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
  }, [canReadFinanceAnalytics, canReadSubscriptionAnalytics, timeRange]);

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

  const analyticsIsFetching = analyticsRefreshNotice === ANALYTICS_REFRESH_PENDING_MESSAGE;
  const analyticsRouteContext = useMemo(() => ({
    stats,
    requestSample,
    hospitalSample,
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
  }), [
    analyticsLoadError,
    hospitalSample,
    loading,
    requestSample,
    roleContext,
    snapshotReady,
    snapshotTimeRange,
    sourceReadiness,
    stats,
    timeRange,
    visibleAnalyticsSourceIssueSummary,
  ]);

  useEffect(() => {
    const publishAnalyticsRouteContext = () => window.dispatchEvent(
      new CustomEvent('analyticsRouteContextUpdated', { detail: analyticsRouteContext }),
    );
    publishAnalyticsRouteContext();
    window.addEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
    return () => window.removeEventListener('requestAnalyticsRouteContext', publishAnalyticsRouteContext);
  }, [analyticsRouteContext]);

  const modalAnalytics = useMemo(() => getModalAnalytics({
    stats,
    requestsByStatus,
    emergencyTypes,
  }), [emergencyTypes, requestsByStatus, stats]);

  return {
    isMobile,
    role: {
      canReadSubscriptionAnalytics,
      canReadFinanceAnalytics,
      roleContext,
    },
    data: {
      stats,
      requestSample,
      resolvedSubscriptionStats,
      financeSummary,
      resolvedHospitalCapacity,
      requestsByDay,
      requestsByStatus,
      emergencyTypes,
      dominantType,
      sourceReadiness,
      modalAnalytics,
    },
    state: {
      timeRange,
      snapshotTimeRange,
      loading,
      snapshotReady,
      analyticsLoadError,
      analyticsIsFetching,
      visibleAnalyticsSourceIssueSummary,
      commandNotice,
      analyticsModalOpen,
      detailsOpening,
    },
    actions: {
      fetchAnalytics,
      handleOpenDetails,
      handleCloseDetails,
      handleTimeRangeChange,
    },
    wayfinding: {
      visibleModuleRail,
      routingPath,
      handleRailNavigate,
    },
  };
};
