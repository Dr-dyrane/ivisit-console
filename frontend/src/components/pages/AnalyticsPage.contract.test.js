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

describe('Analytics Page 13 Summary contract', () => {
  it('keeps the Git-backed intake story while promoting the guarded Summary surfaces', () => {
    const oldPage = gitShowBaseline('frontend/src/components/pages/Analytics.jsx');
    const oldMobile = gitShowBaseline('frontend/src/components/mobile/MobileAnalytics.jsx');
    const page = read('src/components/pages/Analytics.jsx');
    const mobile = read('src/components/mobile/MobileAnalytics.jsx');
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');
    const app = read('src/App.js');
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');

    expect(oldPage).toContain('usePageHeader("Impact Analytics", headerActions)');
    expect(oldPage).toContain('EXPORT');
    expect(oldMobile).toContain('Generate Analytics Report');
    expect(page).toContain("usePageHeader('Statistics')");
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

    expect(app).toContain('<Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />');
    expect(navigation).toContain("{ id: 'analytics', path: '/analytics', icon: TrendingUp, label: 'Statistics', resource: 'analytics', minRole: 'provider' }");
    expect(mobileNavigation).toContain("{ id: 'statistics', path: '/analytics', label: 'Statistics' }");
  });

  it('applies the selected request window before aggregation and preserves source truth', () => {
    const page = read('src/components/pages/Analytics.jsx');
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
    expect(page).toContain('const sourceReadiness = useMemo(() => ({');
    expect(page).toContain("requests: snapshotReady && !issueSources.has('requests')");
    expect(page).toContain("subscriptions: snapshotReady && canReadSubscriptionAnalytics && !issueSources.has('subscriptions')");
    expect(page).toContain("finance: snapshotReady && canReadFinanceAnalytics && !issueSources.has('finance')");

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
  });

  it('locks the Apple Health-inspired information hierarchy without reviving the bento dashboard', () => {
    const page = read('src/components/pages/Analytics.jsx');
    const desktop = read('src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx');
    const mobile = read('src/components/mobile/MobileAnalytics.jsx');
    const mobileSkeleton = read('src/components/mobile/MobileSkeleton.jsx');
    const analyticsSkeleton = mobileSkeleton.slice(mobileSkeleton.indexOf('export const MobileAnalyticsSkeleton'));
    const primitives = read('src/components/analytics/AnalyticsSummaryPrimitives.jsx');

    const desktopOrder = [
      'analytics-pinned-section',
      'analytics-highlights-section',
      'analytics-trends-section',
      'analytics-breakdowns-section',
      'analytics-network-section',
    ].map((token) => desktop.indexOf(token));
    const mobileOrder = [
      'mobile-analytics-highlights-section',
      'mobile-analytics-trends-section',
      'mobile-analytics-breakdowns-section',
      'mobile-analytics-network-section',
    ].map((token) => mobile.indexOf(token));

    expect(desktopOrder.every((position) => position > -1)).toBe(true);
    expect(desktopOrder).toEqual([...desktopOrder].sort((left, right) => left - right));
    expect(mobileOrder.every((position) => position > -1)).toBe(true);
    expect(mobileOrder).toEqual([...mobileOrder].sort((left, right) => left - right));

    expect(desktop).toContain('<h1 className="mt-3 text-[42px]');
    expect(desktop).toContain('>Summary</h1>');
    expect(desktop).toContain('title="Pinned"');
    expect(desktop).toContain('title="Highlights"');
    expect(desktop).toContain('title="Trends"');
    expect(desktop.match(/<AreaChart/g)).toHaveLength(1);
    expect(desktop).toContain('Recent-half volume compared with the earlier half of this window.');
    expect(desktop).toContain('Current scoped snapshots, separate from the selected request window.');
    expect(desktop).not.toContain('<Card');
    expect(desktop).not.toContain('Search Analytics');
    expect(desktop).not.toContain('Performance Metrics');
    expect(desktop).not.toContain('Demand Velocity Heatmap');

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
    expect(page).toContain('dataTimeRange={snapshotTimeRange}');
  });

  it('keeps loading, partial, stale, detail, and reporting states honest', () => {
    const page = read('src/components/pages/Analytics.jsx');
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

    expect(mobile).toContain('data-testid="mobile-analytics-error-state"');
    expect(mobile).toContain('data-testid="mobile-analytics-source-state"');
    expect(mobile).toContain('onClick={onRetry || onRefresh}');
    expect(mobile).not.toContain("'LIVE'");
    expect(mobile).not.toContain('defaultChartData');
    expect(mobile).not.toContain("dominantType?.name || 'Cardiac'");

    expect(panel).toContain('analyticsContext?.sourceReadiness');
    expect(panel).toContain('analyticsContext?.snapshotTimeRange');
    expect(panel).toContain('Reports unavailable');
    expect(panel).toContain('Export stays off until dataset scope, redaction, and receiver authority are verified.');
    expect(panel).not.toContain('<button');
    expect(panel).not.toContain("new CustomEvent('exportAnalytics')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");
  });

  it('keeps route data, context panel, mobile navigation, and FAB ownership aligned', () => {
    const page = read('src/components/pages/Analytics.jsx');
    const pageData = read('src/contexts/PageDataContext.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const designSystem = read('src/components/console/ConsoleDesignSystem.contract.test.js');

    expect(getPageDataStartupDomainsForRole('sponsor', '/analytics')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/analytics')).not.toContain('analytics');
    expect(routeOwnsStartupDomains('/analytics')).toBe(true);
    expect(pageData).toContain("getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true })");

    expect(page).toContain("new CustomEvent('analyticsRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestAnalyticsRouteContext'");
    expect(contextPanel).toContain('<AnalyticsPanel analyticsContext={analyticsRouteContext} />');
    expect(contextPanel).toContain("new CustomEvent('requestAnalyticsRouteContext')");
    expect(contextPanel).not.toContain('<AnalyticsPanel analyticsData={analyticsData} />');
    expect(contextAction).toContain("label: 'View analytics'");
    expect(contextAction).toContain("new CustomEvent('openAnalyticsModal')");

    expect(designSystem).toContain("analyticsDesktopWorkspace: read('src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx')");
    expect(designSystem).toContain("mobileAnalytics: read('src/components/mobile/MobileAnalytics.jsx')");
    expect(designSystem).toContain("'OrganizationsPanel', 'AnalyticsPanel', 'MapPanel', 'SettingsPanel'");
  });
});
