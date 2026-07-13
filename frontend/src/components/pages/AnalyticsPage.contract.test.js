import fs from 'fs';
import { execFileSync } from 'child_process';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (file) => fs.readFileSync(file, 'utf8');
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowBaseline = (file) => execFileSync(
  'git',
  ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${file}`],
  { encoding: 'utf8' },
);
const readBundle = (...files) => files.map(read).join('\n');
const readAnalyticsPage = () => readBundle(
  'src/components/pages/Analytics.jsx',
  'src/components/pages/analytics/AnalyticsPageView.jsx',
  'src/components/pages/analytics/useAnalyticsPageChrome.js',
  'src/components/pages/analytics/useAnalyticsPageController.js',
  'src/components/pages/analytics/analyticsPageModel.js',
);
const readAnalyticsDesktop = () => readBundle(
  'src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx',
  'src/components/pages/analytics/AnalyticsDesktopSections.jsx',
  'src/components/pages/analytics/AnalyticsDetailRail.jsx',
  'src/components/pages/analytics/analyticsDesktopModel.js',
);
const readAppRoutes = () => readBundle(
  'src/app/AppRoutes.jsx',
  'src/app/appRouteMetadata.js',
);

describe('Analytics Page 13 workspace contract', () => {
  it('keeps the Git-backed intake story while promoting the guarded Statistics surfaces', () => {
    const oldPage = gitShowBaseline('frontend/src/components/pages/Analytics.jsx');
    const oldMobile = gitShowBaseline('frontend/src/components/mobile/MobileAnalytics.jsx');
    const page = readAnalyticsPage();
    const mobile = read('src/components/mobile/MobileAnalytics.jsx');
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');
    const app = readAppRoutes();
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');
    const dock = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');

    expect(oldPage).toContain('usePageHeader("Impact Analytics", headerActions)');
    expect(oldPage).toContain('EXPORT');
    expect(oldMobile).toContain('Generate Analytics Report');
    expect(page).toContain("usePageHeader('Statistics', headerActions)");
    expect(dock).toContain("pathname.startsWith('/analytics')");
    expect(dock).toContain("label: 'View statistics'");
    expect(dock).toContain("action: dispatchWindowEvent('openAnalyticsModal')");
    expect(page).not.toContain('Impact Analytics');
    expect(page).not.toContain('>EXPORT<');
    expect(mobile).not.toContain('Generate Analytics Report');

    expect(gate).toContain('### Page 13 Intake Audit - Analytics');
    expect(gate).toContain('**RESOLUTION - Page 13 Analytics SUMMARY COMPOSITION ADMITTED (2026-07-12).**');
    expect(gate).toContain('important pinned measurements first, evidence-only highlights next, longitudinal trends after that');
    expect(gate).toContain('a valid empty slice may display zero');
    expect(gate).toContain('main.d4f0b892.js');

    [
      'src/components/pages/Analytics.jsx',
      'src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx',
      'src/components/analytics/AnalyticsSummaryPrimitives.jsx',
      'src/components/mobile/MobileAnalytics.jsx',
      'src/components/mobile/MobileSkeleton.jsx',
      'src/components/context/AnalyticsPanel.jsx',
    ].forEach((file) => expect(hardgate).toContain(file));

    expect(app).toContain("analytics: lazyNamedPage(() => import('../components/pages/Analytics'), 'Analytics')");
    expect(app).toContain("{ id: 'analytics', path: '/analytics', minRole: 'provider' }");
    expect(navigation).toContain("{ id: 'analytics', path: '/analytics', icon: TrendingUp, label: 'Statistics', resource: 'analytics', minRole: 'provider' }");
    expect(mobileNavigation).toContain("{ id: 'statistics', path: '/analytics', label: 'Statistics' }");
  });

  it('applies the selected request window before aggregation and preserves source truth', () => {
    const page = readAnalyticsPage();
    const service = read('src/services/analyticsService.js');

    expect(page).toContain('getAnalyticsIntakePage({');
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(page).not.toContain('applyAuthFilter');
    expect(service).toContain("const selectedWindowDays = {");
    expect(service).toContain("'7d': 7");
    expect(service).toContain("'30d': 30");
    expect(service).toContain("'90d': 90");
    expect(service).toContain("requestsQuery = requestsQuery.gte('created_at', windowStart.toISOString())");
    expect(service).toContain('const financeLookbackDays = Math.max(0, (selectedWindowDays || 30) - 1);');

    expect(page).toContain("canonicalizeEmergencyStatus(request.status, 'pending_approval') === 'completed'");
    expect(page).toContain('completedEmergencies: completed.length');
    expect(page).toContain('responseSampleSize: responseTimes.length');
    expect(page).toContain('successRate: requests.length > 0 ? Math.round((completed.length / requests.length) * 100) : 0');
    expect(page).toContain('const sourceReadiness = useMemo(() => getAnalyticsSourceReadiness({');
    expect(page).toContain("requests: snapshotReady && !issueSources.has('requests')");
    expect(page).toContain('subscriptionStats?.sample?.complete === true');
    expect(page).toContain("!issueSources.has('finance')");
    expect(page).toContain('&& Boolean(financeCurrency)');
    expect(page).toContain('const [requestSample, setRequestSample] = useState(DEFAULT_REQUEST_SAMPLE);');
    expect(page).toContain('requestSample: normalizeRequestSample(analyticsPage?.requestSample)');
    expect(page).toContain('setRequestSample(snapshot.requestSample)');
    expect(page).toContain('requestSample,');
    expect(page).toContain('const currency = financeData[0]?.currency;');
    expect(page).toContain('currency: financeCurrency');

    expect(page).toContain('const [snapshotTimeRange, setSnapshotTimeRange] = useState');
    expect(page).toContain('const analyticsRequestIdRef = useRef(0);');
    expect(page).toContain('if (requestId !== analyticsRequestIdRef.current) return;');
    expect(page).toContain('setSnapshotTimeRange(requestedRange)');
    expect(page).toContain('getLocalDayKey(created)');
    expect(page).not.toContain("created.toISOString().split('T')[0]");

    expect(service).toContain("includeSubscriptionAnalytics && user?.role === 'admin'");
    expect(service).toContain("const canReadFinanceAnalytics = includeFinanceAnalytics && user?.role === 'admin';");
    expect(service).not.toContain("getFinanceAnalytics(user, user?.role === 'admin'");
    expect(service).toContain("getAnalyticsSourceIssue('requests', requestsRes)");
    expect(service).toContain("getAnalyticsSourceIssue('finance', { error: financeError })");
    expect(service).toContain('requestSample: {');
    expect(service).toContain('requestTotalCount !== null');
    expect(service).toContain('requestTotalCount <= (requestsRes.data || []).length');
  });

  it('uses the donor desktop workspace grammar without turning measurements into filters', () => {
    const page = readAnalyticsPage();
    const desktop = readAnalyticsDesktop();
    const mobile = read('src/components/mobile/MobileAnalytics.jsx');
    const mobileSkeleton = read('src/components/mobile/MobileSkeleton.jsx');
    const analyticsSkeleton = mobileSkeleton.slice(mobileSkeleton.indexOf('export const MobileAnalyticsSkeleton'));
    const primitives = read('src/components/analytics/AnalyticsSummaryPrimitives.jsx');

    const mobileOrder = [
      'mobile-analytics-highlights-section',
      'mobile-analytics-trends-section',
      'mobile-analytics-breakdowns-section',
      'mobile-analytics-network-section',
    ].map((token) => mobile.indexOf(token));

    expect(mobileOrder.every((position) => position > -1)).toBe(true);
    expect(mobileOrder).toEqual([...mobileOrder].sort((left, right) => left - right));

    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).toContain("if (admin) return 'admin'");
    expect(page).toContain("if (orgAdmin) return 'org_admin'");
    expect(page).toContain("if (sponsor) return 'sponsor'");
    expect(page).toContain("if (provider) return driver ? 'driver' : 'provider'");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain('aria-busy={detailsOpening}');
    expect(page).toContain("data-state={detailsOpening ? 'opening' : 'idle'}");
    expect(page).toContain("{detailsOpening ? 'Opening...' : 'View details'}");

    expect(desktop).toContain('<WorkspaceStage');
    expect(desktop).toContain('<SignalPanel');
    expect(desktop).toContain('<MetricStrip');
    expect(desktop).toContain('<ActivitySheet');
    expect(desktop).toContain('<DetailRailShell>');
    expect(desktop.indexOf('<SignalPanel')).toBeLessThan(desktop.indexOf('<ActivitySheet'));
    expect(desktop).toContain('activePath="/analytics"');
    expect(desktop).toContain('max={3}');
    expect(desktop).toContain('dataAttr="data-analytics-metric"');
    expect(desktop).toContain("id: 'requests'");
    expect(desktop).toContain("id: 'completed'");
    expect(desktop).toContain("id: 'average-response'");
    expect(desktop).toContain("id: 'facilities'");
    expect(desktop).toContain('available: responseSampleSize === 0 && Boolean(sourceReadiness?.hospitals)');
    expect(desktop).not.toContain('<KpiStrip');
    expect(desktop).not.toContain('aria-pressed={');
    expect(desktop).not.toContain('selectable');
    expect(desktop).not.toContain('ListRowShell');
    expect(desktop.match(/<AreaChart/g)).toHaveLength(1);
    expect(desktop).toContain('data-testid="analytics-work-surface"');
    expect(desktop).toContain('data-testid="analytics-breakdowns-section"');
    expect(desktop).toContain('testId="analytics-network-section"');
    expect(desktop).toContain('<AnalyticsWorkSkeleton />');
    expect(desktop).toContain('bg-background/45 p-4 dark:bg-white/[0.04]');
    expect(desktop).toContain('rounded-card bg-foreground/[0.045] p-4 dark:bg-white/[0.055]');
    expect(desktop).toContain('rounded-inner bg-foreground/[0.045] px-3 py-2.5 dark:bg-white/[0.055]');
    expect(desktop.match(/bg-background\/45/g)).toHaveLength(2);
    expect(desktop.match(/bg-foreground\/\[0\.045\]/g)).toHaveLength(4);
    expect(desktop).not.toContain('bg-background/35');
    expect(desktop).not.toContain('dark:bg-black/[0.08]');
    expect(desktop).toContain('loading={loadingWorkspace}');
    expect(desktop).toContain('isLoading={loadingWorkspace}');
    expect(desktop).not.toContain('<Card');
    expect(desktop).not.toContain('Search Analytics');
    expect(desktop).not.toContain('analytics-pinned-section');
    expect(desktop).not.toContain('analytics-highlights-section');

    expect(desktop).toContain('data-testid="analytics-request-sample-state"');
    expect(desktop).toContain('`Latest ${formatMetricNumber(returnedRequestCount)} requests`');
    expect(desktop).toContain('subscriptionStats?.sample?.complete === true');
    expect(desktop).toContain('Subscriber statistics are unavailable because only part of the list loaded.');
    expect(desktop).toContain("new Intl.NumberFormat('en-US', {");
    expect(desktop).toContain('currency: safeCurrency');
    expect(desktop).toContain('formatAnalyticsCurrency(financeSummary?.totalCredits, financeSummary?.currency)');
    expect(desktop).not.toContain('`$${Number(financeSummary');

    expect(mobile).toContain('<MobileHero');
    expect(mobile).not.toContain('MobileKPIStrip');
    expect(mobile).toContain("import { MobileGlanceTile } from './canon/MobileGlanceTile';");
    expect(mobile).toContain("import { useSkeletonWarmup } from './canon/Loading';");
    expect(mobile).toContain('const showSkeleton = warmingUp || (isLoading && !snapshotReady);');
    expect(mobile).toContain('kpiStrip={showSkeleton ? null : summaryHeader}');
    expect(mobile).toContain('<CompactStatTile key={metric.label} {...metric} onClick={onOpenDetails} />');
    expect(mobile).not.toContain('min-h-[126px]');
    expect(mobile).not.toContain('The measurements worth checking first.');
    expect(mobile).not.toContain('Measured observations from this window.');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).not.toContain('Report unavailable');
    expect(mobile).not.toContain('Generate Analytics Report');
    expect(analyticsSkeleton).toContain('data-testid="mobile-analytics-skeleton"');
    expect(analyticsSkeleton).toContain('grid grid-cols-2 gap-3');
    expect(analyticsSkeleton).toContain('min-h-[72px]');
    expect(analyticsSkeleton).toContain('space-y-9 px-4');
    expect(analyticsSkeleton).not.toContain('<MobileKPIStripSkeleton');
    expect(analyticsSkeleton).not.toContain('<MobileFeaturedMetricSkeleton');
    expect(primitives).toContain('export const AnalyticsTimeRangeControl');
    expect(primitives).toContain('aria-pressed={selected}');
    expect(primitives).toContain('export const getVolumeComparison');
    expect(page).toContain('dataTimeRange={state.snapshotTimeRange}');
    expect(page).toContain('requestSample={data.requestSample}');
  });

  it('keeps loading, partial, stale, detail, and reporting states honest', () => {
    const page = readAnalyticsPage();
    const desktop = readAnalyticsDesktop();
    const mobile = read('src/components/mobile/MobileAnalytics.jsx');
    const panel = read('src/components/context/AnalyticsPanel.jsx');

    expect(page).toContain('data-testid="analytics-error-state"');
    expect(page).toContain('data-testid="analytics-source-state"');
    expect(page).toContain('ANALYTICS_STALE_SOURCE_MESSAGE');
    expect(page).toContain('The last loaded view stays visible while it refreshes.');
    expect(page).toContain('setCommandNotice(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE)');
    expect(page).toContain('toast.info(ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE)');
    expect(page).toContain('if (!sourceReadiness.requests)');
    expect(page).toContain('setAnalyticsModalOpen(true)');
    expect(page).toContain("window.addEventListener('openAnalyticsModal', handleOpenDetails)");
    expect(page).toContain("window.addEventListener('exportAnalytics', handleExport)");
    expect(page).toContain('<AnalyticsModal');
    expect(page).toContain("const ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE = 'Report downloads are not available yet.';");
    expect(page).toContain("usePageHeader('Statistics', headerActions)");

    expect(mobile).toContain('data-testid="mobile-analytics-error-state"');
    expect(mobile).toContain('data-testid="mobile-analytics-source-state"');
    expect(mobile).toContain('onClick={onRetry || onRefresh}');
    expect(mobile).not.toContain("'LIVE'");
    expect(mobile).not.toContain('defaultChartData');
    expect(mobile).not.toContain("dominantType?.name || 'Cardiac'");

    expect(panel).toContain('analyticsContext?.sourceReadiness');
    expect(panel).toContain('analyticsContext?.snapshotTimeRange');
    expect(panel).toContain('analyticsContext?.requestSample');
    expect(panel).toContain('const headlineMetrics = selectContextMetrics([');
    expect(panel).toContain('], 3);');
    expect(panel).toContain('Latest ${formatMetricNumber(returnedRequestCount)} requests');
    expect(panel).toContain('Useful context');
    expect(panel).toContain('Downloads unavailable');
    expect(panel).toContain('Report downloads are not available yet.');
    expect(panel).toContain('bg-foreground/[0.045]');
    expect(panel).toContain('dark:bg-white/[0.055]');
    expect(panel.match(/bg-foreground\/\[0\.045\]/g)).toHaveLength(4);
    expect(panel).not.toContain('bg-background/35');
    expect(panel).not.toContain('<button');
    expect(panel).not.toContain('supabase');
    expect(panel).not.toContain('analyticsService');
    expect(panel).not.toContain("new CustomEvent('exportAnalytics')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");

    [page, desktop, panel].forEach((source) => {
      expect(source).not.toContain('Measured route projection');
      expect(source).not.toContain('dataset scope');
      expect(source).not.toContain('redaction');
      expect(source).not.toContain('receiver authority');
    });
  });

  it('keeps route data, context panel, mobile navigation, and FAB ownership aligned', () => {
    const page = readAnalyticsPage();
    const pageData = readBundle(
      'src/contexts/PageDataContext.jsx',
      'src/contexts/page-data/adapters/analyticsPageData.js',
    );
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const designSystem = read('src/components/console/ConsoleDesignSystem.contract.test.js');

    expect(getPageDataStartupDomainsForRole('sponsor', '/analytics')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/analytics')).not.toContain('analytics');
    expect(routeOwnsStartupDomains('/analytics')).toBe(true);
    expect(pageData).toContain("getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true })");

    expect(page).toContain("new CustomEvent('analyticsRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestAnalyticsRouteContext'");
    expect(page).toContain('requestSample,');
    expect(contextPanel).toContain('<AnalyticsPanel analyticsContext={analyticsRouteContext} />');
    expect(contextPanel).toContain("new CustomEvent('requestAnalyticsRouteContext')");
    expect(contextPanel).not.toContain('<AnalyticsPanel analyticsData={analyticsData} />');
    expect(contextAction).toContain("label: 'View analytics'");
    expect(contextAction).toContain("new CustomEvent('openAnalyticsModal')");

    expect(designSystem).toContain("readProductionTree('src/components/pages/analytics')");
    expect(designSystem).toContain("mobileAnalytics: read('src/components/mobile/MobileAnalytics.jsx')");
    expect(designSystem).toContain("'OrganizationsPanel', 'AnalyticsPanel', 'MapPanel', 'SettingsPanel'");
  });
});
