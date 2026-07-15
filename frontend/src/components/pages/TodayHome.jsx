import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePageData } from '../../contexts/PageDataContext';
import { usePageActions } from '../../contexts/PageActionsContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { routeFeedbackMs } from '../console/WorkspaceStage';
import { MobileToday } from '../mobile/MobileToday';
import { TabletToday } from '../tablet/TabletToday';
import { TodayDesktopView } from './today/TodayDesktopView';
import {
  ROLE_COPY,
  buildActionRows,
  buildGlanceItems,
  buildToday,
  countOrNull,
  resolveTodayProviderCount,
} from './today/todayModel';
import { useTodayRoleKind } from './today/useTodayRoleKind';

export {
  ROLE_COPY,
  buildActionRows,
  buildGlanceItems,
  buildToday,
  resolveTodayProviderCount,
} from './today/todayModel';

export function getTodayModuleRailItems(roleKind = 'viewer') {
  return getConsoleModuleRailItems(roleKind);
}

export const TodayHome = ({ role }) => {
  const navigate = useNavigate();
  const { registerPageAction } = usePageActions();
  const roleKind = useTodayRoleKind(role);
  // Profile-derived honesty signals (same flow as the driver lens: read the profile
  // once here, hand the builders plain params). isSkippedOnboarding is optional so
  // bare renders without an AuthContext provider stay on the plain-viewer copy.
  const { profile, isSkippedOnboarding } = useAuth();
  const skippedOnboarding = roleKind === 'viewer' && Boolean(isSkippedOnboarding?.());
  const orgUnlinked = roleKind === 'org_admin' && Boolean(profile) && !profile.organization_id;
  const {
    emergencyStats,
    verificationData,
    doctorsStats,
    visitsStats,
    userData,
    loading,
    domainLoading,
    domainFetching,
    useMockData,
    domainErrors,
    refreshAllData,
  } = usePageData();
  React.useLayoutEffect(() => registerPageAction({
    route: '/',
    icon: RefreshCw,
    label: 'Refresh today',
    color: 'utility',
    action: refreshAllData,
  }), [refreshAllData, registerPageAction]);
  // Presentation fork only: no provider (contract test's bare render) resolves to the
  // context default {} -> isMobile undefined -> desktop render.
  const { isPhone, isTablet } = useNavigation();
  const [expandedRow, setExpandedRow] = useState(null);
  const [routingPath, setRoutingPath] = useState(null);
  // Manual refresh state: navigation-only stays intact - refreshAllData is the
  // PageDataContext owner re-running its own fetchers, not a page-owned read.
  const [pageRefreshing, setPageRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (pageRefreshing) return;
    setPageRefreshing(true);
    try {
      await refreshAllData?.();
    } finally {
      setPageRefreshing(false);
    }
  }, [pageRefreshing, refreshAllData]);

  const todayDomainErrors = {
    admin: ['emergency', 'verification', 'doctors', 'users'],
    org_admin: ['emergency', 'verification', 'doctors', 'users'],
    dispatcher: ['emergency'],
    provider: ['emergency', 'visits'],
    driver: ['emergency'],
    sponsor: ['analytics'],
    viewer: [],
  };
  const todayDomains = todayDomainErrors[roleKind] || todayDomainErrors.viewer;
  const hasTodayDataError = todayDomains
    .some((domain) => Boolean(domainErrors?.[domain]));
  // C1 loading truth: domainLoading is PageData's per-domain first-load map (fetching
  // with nothing renderable yet). The legacy coarse loading-map clause stays alive so
  // existing consumers of that map keep driving the same not-live fold.
  const hasTodayInitialLoading = todayDomains
    .some((domain) => Boolean(domainLoading?.[domain]));
  const hasTodayLoading = hasTodayInitialLoading
    || todayDomains.some((domain) => Boolean(loading?.[domain]));
  const live = !useMockData && !hasTodayDataError && !hasTodayLoading;
  // T3 gate: honest loading presentation only during a true first load -- never over
  // an error, mock data, or a background refetch (those keep their own voices).
  const isTodayInitialLoading = hasTodayInitialLoading && !hasTodayDataError && !useMockData;
  // Background refetch signal (drives the mobile Updating pill; desktop adds no new
  // chrome for it -- the header refresh affordance already owns that surface).
  const isFetching = !hasTodayLoading && todayDomains.some((domain) => Boolean(domainFetching?.[domain]));
  const roleCopy = ROLE_COPY[roleKind] || ROLE_COPY.viewer;
  const visibleModuleRail = useMemo(
    () => getTodayModuleRailItems(roleKind),
    [roleKind]
  );

  const emergencyReviewCount = countOrNull(emergencyStats?.pending_approval ?? emergencyStats?.pending, live) ?? 0;
  const emergencyActiveCount = countOrNull(
    roleKind === 'driver' ? emergencyStats?.mine : emergencyStats?.active,
    live,
  ) ?? 0;
  const approvalCount = countOrNull(verificationData?.pending, live) ?? 0;
  const visitCount = countOrNull(visitsStats?.today, live) ?? 0;
  const providerCount = resolveTodayProviderCount({ doctorsStats, userData, live });

  const today = useMemo(() => {
    const built = buildToday({
      roleKind,
      live,
      emergencyReviewCount,
      emergencyActiveCount,
      approvalCount,
      visitCount,
      providerCount,
      skippedOnboarding,
      orgUnlinked,
    });
    // T3 honest first load: keep the not-live layout, speak "loading" not "retry".
    if (!isTodayInitialLoading) return built;
    return { ...built, status: 'Loading today', tone: 'muted' };
  }, [approvalCount, emergencyActiveCount, emergencyReviewCount, isTodayInitialLoading, live, orgUnlinked, providerCount, roleKind, skippedOnboarding, visitCount]);

  const glanceItems = useMemo(() => {
    const built = buildGlanceItems({
      roleKind,
      live,
      emergencyReviewCount,
      emergencyActiveCount,
      approvalCount,
      visitCount,
      providerCount,
      skippedOnboarding,
      orgUnlinked,
    });
    // T3 honest first load: counts are unknown, so say so -- em-dash placeholders in a
    // muted tone instead of the retry voice.
    if (!isTodayInitialLoading) return built;
    return built.map((item) => ({ ...item, value: '\u2014', tone: 'muted' }));
  }, [approvalCount, emergencyActiveCount, emergencyReviewCount, isTodayInitialLoading, live, orgUnlinked, providerCount, roleKind, skippedOnboarding, visitCount]);

  const headerAction = useMemo(() => (
    <span className="hidden md:inline-flex items-center gap-2">
      {/* Manual refresh (section 1.6 loading truth): every data page gets a refresh affordance. */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={pageRefreshing}
        aria-label={pageRefreshing ? 'Refreshing today' : 'Refresh today'}
        className="flex h-7 w-7 items-center justify-center rounded-pill bg-card/70 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pageRefreshing ? 'animate-spin' : ''}`} />
      </button>
      <span className="inline-flex items-center rounded-pill bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {roleCopy.label}
      </span>
    </span>
  ), [roleCopy.label, handleRefresh, pageRefreshing]);

  usePageHeader('Today', headerAction);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const rows = useMemo(() => {
    const built = buildActionRows({
      roleKind,
      live,
      emergencyReviewCount,
      emergencyActiveCount,
      approvalCount,
      visitCount,
      providerCount,
      roleCopy,
      loading,
      skippedOnboarding,
      orgUnlinked,
    });
    // T3 honest first load: the open-role-page row spins (DetailRow's Loader2 path)
    // while the first fetch is genuinely still in flight.
    if (!isTodayInitialLoading) return built;
    return built.map((row) => (row.id === 'open-role-page' ? { ...row, loading: true } : row));
  }, [approvalCount, emergencyActiveCount, emergencyReviewCount, isTodayInitialLoading, live, loading, orgUnlinked, providerCount, roleCopy, roleKind, skippedOnboarding, visitCount]);

  const activeExpandedRow = useMemo(() => {
    if (expandedRow === '__collapsed__') return null;
    if (rows.some((row) => row.id === expandedRow)) return expandedRow;
    return null;
  }, [expandedRow, rows]);

  const handleToggleRow = useCallback((rowId) => {
    setExpandedRow((current) => (current === rowId ? '__collapsed__' : rowId));
  }, []);

  const routeTimerRef = useRef(null);
  const handleAction = useCallback((path) => {
    if (!path) return;
    // First click wins: ignore while a route transition is already acknowledged, so a
    // double-click (or a second target) can never queue two navigations.
    if (routingPath) return;
    setRoutingPath(path);
    routeTimerRef.current = window.setTimeout(() => {
      navigate(path);
      // Same-route navigations don't unmount us - reset so the spinner never sticks.
      setRoutingPath(null);
    }, routeFeedbackMs);
  }, [navigate, routingPath]);

  useEffect(() => () => {
    if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current);
  }, []);

  const handlePrimary = useCallback(() => {
    handleAction(today.path);
  }, [handleAction, today.path]);

  const todayPanelContext = useMemo(() => ({
    page: 'today',
    roleKind,
    roleLabel: roleCopy.label,
    live,
    loading: hasTodayLoading,
    hasError: hasTodayDataError || useMockData,
    today: {
      headline: today.headline,
      status: today.status,
      primaryAction: today.primaryAction,
      path: today.path,
      sheetTitle: today.sheetTitle,
      sheetHint: today.sheetHint,
      tone: today.tone,
    },
    glanceItems,
    rows,
    counts: {
      requests: emergencyReviewCount,
      activeRequests: emergencyActiveCount,
      approvals: approvalCount,
      visits: visitCount,
      staff: providerCount,
    },
    routingPath,
    onNavigate: handleAction,
  }), [
    approvalCount,
    emergencyActiveCount,
    emergencyReviewCount,
    glanceItems,
    handleAction,
    hasTodayDataError,
    hasTodayLoading,
    live,
    providerCount,
    roleCopy.label,
    roleKind,
    routingPath,
    rows,
    today.headline,
    today.path,
    today.primaryAction,
    today.sheetHint,
    today.sheetTitle,
    today.status,
    today.tone,
    useMockData,
    visitCount,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishTodayRouteContext = () => {
      window.dispatchEvent(new CustomEvent('todayRouteContextUpdated', {
        detail: todayPanelContext,
      }));
    };

    publishTodayRouteContext();
    window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);

    return () => {
      window.removeEventListener('requestTodayRouteContext', publishTodayRouteContext);
    };
  }, [todayPanelContext]);

  // MOBILE FORK -- return-only, after every hook and effect (incl. the route-context
  // publisher) so mobile and desktop share one identical model and effect surface.
  // MobileToday is pure presentation; handleRefresh is async, so PullToRefresh can
  // await it (a re-entrant pull while pageRefreshing resolves immediately and settles).
  if (isPhone) {
    return (
      <MobileToday
        today={today}
        glanceItems={glanceItems}
        rows={rows}
        live={live}
        role={roleCopy}
        loading={hasTodayInitialLoading}
        isFetching={isFetching}
        routingPath={routingPath}
        onAction={handleAction}
        onRefresh={handleRefresh}
      />
    );
  }

  if (isTablet) {
    return (
      <TabletToday
        today={today}
        glanceItems={glanceItems}
        rows={rows}
        live={live}
        role={roleCopy}
        loading={hasTodayInitialLoading}
        isFetching={isFetching}
        routingPath={routingPath}
        onAction={handleAction}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <TodayDesktopView
      visibleModuleRail={visibleModuleRail}
      today={today}
      roleCopy={roleCopy}
      live={live}
      initialLoading={isTodayInitialLoading}
      glanceItems={glanceItems}
      rows={rows}
      expandedRow={activeExpandedRow}
      onToggleRow={handleToggleRow}
      onPrimary={handlePrimary}
      onAction={handleAction}
      routingPath={routingPath}
    />
  );
};

export default TodayHome;
