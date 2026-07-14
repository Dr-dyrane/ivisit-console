import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('regular-width tablet composition contract', () => {
  it('bounds list, dock, sheet, and detail primitives instead of stretching phone UI', () => {
    const shell = read('src/components/mobile/MobilePageShell.jsx');
    const dock = read('src/components/navigation/DynamicBottomBar.jsx');
    const filters = read('src/components/common/FilterSheet.jsx');
    const details = read('src/components/mobile/MobileDetailIslands.jsx');

    expect(shell).toContain("readable: 'max-w-lg'");
    expect(shell).toContain("wide: 'max-w-5xl'");
    expect(shell).toContain("const resolvedTabletLayout = hasTabletPane ? 'split' : tabletLayout;");
    expect(shell).toContain('data-tablet-layout={isTablet ? resolvedTabletLayout : undefined}');
    expect(shell).toContain("data-tablet-navigation={isWideTablet ? 'rail' : isTablet ? 'dock' : undefined}");
    expect(shell).toContain('data-tablet-split-shell');
    expect(shell).toContain('grid-cols-[minmax(0,32rem)_minmax(320px,1fr)]');
    expect(shell).toContain('data-scroll-owner="independent"');
    expect(shell).toContain('sticky top-4 max-h-[calc(100dvh-2rem)]');
    expect(shell).toContain('overflow-y-auto overscroll-contain no-scrollbar');
    expect(shell).toContain("'min-h-[calc(100dvh-10rem-var(--safe-bottom))]'");
    expect(shell).toContain("const shellHeightClass = isTablet ? tabletAvailableHeightClass : 'min-h-screen';");
    expect(shell).toContain(": '!min-h-0'");
    expect(shell).toContain(": 'contents';");
    expect(shell).not.toContain('max-w-4xl');
    expect(dock).toContain('w-full max-w-3xl px-4');
    expect(filters).toContain('const isTabletSheet = Boolean(isMobile && isTablet);');
    expect(filters).toContain('const usesSheetPresentation = Boolean(isMobile && usesCompactNavigation);');
    expect(filters).toContain('grid max-h-[58dvh] grid-cols-2 items-start gap-5');
    expect(details).toContain('md:grid md:grid-cols-2 md:items-stretch');
  });

  it('adapts navigation without switching tablet pages to desktop composition', () => {
    const breakpoints = read('src/config/breakpoints.js');
    const appShell = read('src/app/AppShell.jsx');
    const header = read('src/components/navigation/SmartHeader.jsx');
    const dock = read('src/components/navigation/DynamicBottomBar.jsx');
    const contextPanel = read('src/components/navigation/ResponsiveSidebar.jsx');

    expect(breakpoints).toContain('export const TABLET_NAV_BREAKPOINT = 1024;');
    expect(breakpoints).toContain('const isWideTablet = isTablet && viewportWidth >= TABLET_NAV_BREAKPOINT;');
    expect(breakpoints).toContain('const usesCompactNavigation = isPhone || (isTablet && !isWideTablet);');
    expect(breakpoints).toContain('isMobile: isCompactSurface');
    expect(appShell).toContain('{!hideNav && !usesCompactNavigation && (');
    expect(header).toContain('const { usesCompactNavigation } = useNavigation();');
    expect(dock).toContain('if (!usesCompactNavigation) return null;');
    expect(contextPanel).toContain('if (usesCompactNavigation) {');
  });

  it('centers Today and gives Visits the route-owned desktop detail pane', () => {
    const today = read('src/components/mobile/MobileToday.jsx');
    const kpis = read('src/components/mobile/MobileKPIStrip.jsx');
    const visits = read('src/components/mobile/MobileVisits.jsx');
    const visitsPage = read('src/components/pages/VisitsPage.jsx');
    const visitsDesktop = read('src/components/pages/visits/VisitsDesktopWorkspace.jsx');

    expect(today).toContain('tabletLayout="wide"');
    expect(today).toContain('tabletVerticalAlign="center"');
    expect(today).toContain('md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]');
    expect(visits).toContain('tabletPane={tabletPane}');
    expect(visits).not.toContain('aria-label="Visit source view"');
    expect(visits).toContain('onFocusVisit?.(visit.id)');
    expect(visits).toContain("const effectiveActiveKpi = usesKpiSourceLanes && viewMode === 'scheduled'");
    expect(visits).toContain('getCompactVisitKpiTransition({');
    expect(visits).toContain("preserveActiveKpiIds={usesKpiSourceLanes ? ['scheduled'] : undefined}");
    expect(kpis).toContain('!preserveActiveKpiIds.includes(kpi.id)');
    expect(visitsPage).toContain('useVisitsDataSource({ filters, kpiFilter, pagination, sortConfig, viewMode })');
    expect(visitsPage).toContain('<VisitsDetailRail');
    expect(visitsPage).toContain('embedded');
    expect(visitsDesktop).toContain('export const VisitsDetailRail');
    expect(visitsDesktop).toContain('<DetailRailShell embedded={embedded}>');
  });

  it('reuses route-owned desktop rails beside constrained mobile content on priority routes', () => {
    const requestsPage = read('src/components/pages/EmergencyRequestsPage.jsx');
    const requestsMobile = read('src/components/mobile/MobileEmergency.jsx');
    const requestsRail = read('src/components/pages/requests/RequestDetailRail.jsx');
    const walletPage = read('src/components/pages/WalletManagementPage.jsx');
    const walletMobile = read('src/components/mobile/MobileWallet.jsx');
    const walletRail = read('src/components/pages/wallet/PaymentDetailRail.jsx');
    const pricingPage = read('src/components/pages/pricing/PricingManagementPageView.jsx');
    const pricingMobile = read('src/components/mobile/MobilePricing.jsx');
    const pricingRail = read('src/components/pages/pricing/PricingDetailRail.jsx');
    const insurancePage = read('src/components/pages/insurance/InsurancePageView.jsx');
    const insuranceMobile = read('src/components/mobile/MobileInsurance.jsx');
    const insuranceRail = read('src/components/pages/insurance/InsuranceDetailRail.jsx');
    const subscriptionsPage = read('src/components/pages/subscriptions/SubscriptionManagementPageView.jsx');
    const subscriptionsMobile = read('src/components/mobile/MobileSubscriptions.jsx');
    const subscriptionsRail = read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx');

    expect(requestsPage).toContain('<RequestDetailRail');
    expect(requestsPage).toContain('onFocusRequest={setFocusedRequestId}');
    expect(requestsMobile).toContain('onFocusRequest(request.id)');
    expect(requestsMobile).toContain('!hasTabletDetailPane && (');
    expect(requestsRail).toContain('<DetailRailShell embedded>');

    expect(walletPage).toContain('renderTabletPane={(activeEntry) => (');
    expect(walletPage).toContain('<PaymentDetailRail');
    expect(walletMobile).toContain('renderTabletPane(controller.activeEntry)');
    expect(walletMobile).toContain('detailProps && !hasTabletDetailPane');
    expect(walletRail).toContain('<DetailRailShell embedded={embedded}>');

    expect(pricingPage).toContain('<PricingDetailRail');
    expect(pricingPage).toContain('onFocusPrice={setFocused}');
    expect(pricingMobile).toContain('onFocusPrice(item.id)');
    expect(pricingRail).toContain('<DetailRailShell embedded={embedded}>');

    expect(insurancePage).toContain('<InsuranceDetailRail');
    expect(insurancePage).toContain('onFocusPolicy={setFocused}');
    expect(insuranceMobile).toContain('onFocusPolicy(policy.id)');
    expect(insuranceRail).toContain('<DetailRailShell embedded={embedded}>');

    expect(subscriptionsPage).toContain('<SubscriberDetailRail');
    expect(subscriptionsPage).toContain('onFocusSubscriber={actions.setFocused}');
    expect(subscriptionsMobile).toContain('onFocusSubscriber(subscriber.id)');
    expect(subscriptionsRail).toContain('export const SubscriberDetailRail');
    expect(subscriptionsRail).toContain('<DetailRailShell embedded={embedded}>');
  });

  it('keeps dashboard context route-aware without widening the mobile stack', () => {
    const analyticsPage = read('src/components/pages/analytics/AnalyticsPageView.jsx');
    const analyticsMobile = read('src/components/mobile/MobileAnalytics.jsx');
    const analyticsSkeleton = read('src/components/mobile/MobileSkeleton.jsx');
    const analyticsDesktop = read('src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx');
    const analyticsRail = read('src/components/pages/analytics/AnalyticsDetailRail.jsx');
    const settingsPage = read('src/components/pages/settings/SettingsPageView.jsx');
    const settingsMobile = read('src/components/mobile/settings/MobileSettingsView.jsx');
    const settingsContent = read('src/components/mobile/settings/MobileSettingsContent.jsx');
    const settingsSkeleton = read('src/components/mobile/settings/MobileSettingsSkeleton.jsx');
    const settingsRail = read('src/components/pages/settings/SettingsDetailRail.jsx');
    const map = read('src/components/mobile/MobileMap.jsx');

    expect(analyticsPage).toContain('<AnalyticsDetailRail');
    expect(analyticsDesktop).toContain('export const getAnalyticsDetailRailProps');
    expect(analyticsMobile).toContain('tabletPane={tabletPane}');
    expect(analyticsMobile).not.toContain('tabletLayout="wide"');
    expect(analyticsMobile).not.toContain('md:grid-cols-2');
    expect(analyticsSkeleton).not.toContain('md:grid-cols-2');
    expect(analyticsRail).toContain('<DetailRailShell embedded={embedded}>');

    expect(settingsPage).toContain('<SettingsDetailRail {...desktopProps} embedded />');
    expect(settingsMobile).toContain('tabletPane={tabletPane}');
    expect(settingsMobile).not.toContain('tabletLayout="wide"');
    expect(settingsContent).not.toContain('md:grid-cols-2');
    expect(settingsSkeleton).not.toContain('md:grid-cols-2');
    expect(settingsRail).toContain('<DetailRailShell embedded={embedded}>');

    expect(map).toContain('className="fixed inset-0 z-[20] bg-background overflow-hidden"');
  });

  it('documents the HIG-derived readable and wide layout rule', () => {
    const design = read('docs/design-system/MOBILE_DESIGN_SYSTEM.md');

    expect(design).toContain('## 11. Tablet regular-width contract');
    expect(design).toContain('tabletLayout="readable"');
    expect(design).toContain('tabletLayout="wide"');
    expect(design).toContain('never exceeds `max-w-lg`');
    expect(design).toContain('tabletPane');
    expect(design).toContain('independent viewport-bounded scroll owner');
    expect(design).toContain('vertically centers');
    expect(design).toContain('top-to-bottom fallback');
    expect(design).toContain('Requests, Payments, Pricing, Insurance, Subscribers, Statistics, and');
    expect(design).toContain('`1024px <= width < 1280px`');
    expect(design).toContain('`834x1194`, `1024x768`, and `1194x834`');
  });
});
