import fs from 'fs';
import { getPageDataAccessForRole, getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../config/pageDataAccess';
import { readSourceEstate } from '../test/sourceEstates';

const readPageDataImplementation = () => [
  'src/contexts/PageDataContext.jsx',
  'src/contexts/page-data/usePageDataDomains.js',
  'src/contexts/page-data/usePageDataRealtime.js',
  'src/contexts/page-data/pageDataSelectors.js',
  'src/contexts/page-data/adapters/emergencyPageData.js',
  'src/contexts/page-data/adapters/verificationPageData.js',
  'src/contexts/page-data/adapters/doctorsPageData.js',
  'src/contexts/page-data/adapters/visitsPageData.js',
  'src/contexts/page-data/adapters/analyticsPageData.js',
  'src/contexts/page-data/adapters/usersPageData.js',
  'src/contexts/page-data/adapters/walletPageData.js',
].map((path) => fs.readFileSync(path, 'utf8')).join('\n');

const readEmergencyServiceImplementation = () => readSourceEstate({
  files: ['src/services/emergencyService.js'],
  directories: ['src/services/emergency'],
});

describe('PageDataContext role loading contract', () => {
  it('keeps viewers out of startup domain loads', () => {
    expect(getPageDataAccessForRole('viewer')).toEqual({
      canLoadProviderData: false,
      canLoadSponsorData: false,
      canLoadAnalyticsData: false,
      canLoadOrgData: false,
      canLoadAdminData: false,
    });
  });

  it('keeps providers scoped to provider startup domains only', () => {
    const source = readPageDataImplementation();

    expect(getPageDataAccessForRole('provider')).toEqual({
      canLoadProviderData: true,
      canLoadSponsorData: false,
      canLoadAnalyticsData: false,
      canLoadOrgData: false,
      canLoadAdminData: false,
    });
    expect(source).toContain('getPageDataStartupDomainsForRole(profile?.role, location.pathname, profile?.provider_type)');
  });

  it('keeps sponsors read-only and out of provider realtime domains', () => {
    expect(getPageDataAccessForRole('sponsor')).toEqual({
      canLoadProviderData: false,
      canLoadSponsorData: true,
      canLoadAnalyticsData: true,
      canLoadOrgData: false,
      canLoadAdminData: false,
    });
  });

  it('keeps org admins on provider, analytics, and org domains', () => {
    expect(getPageDataAccessForRole('org_admin')).toEqual({
      canLoadProviderData: true,
      canLoadSponsorData: false,
      canLoadAnalyticsData: true,
      canLoadOrgData: true,
      canLoadAdminData: false,
    });
  });

  it('keeps admins on every console domain', () => {
    expect(getPageDataAccessForRole('admin')).toEqual({
      canLoadProviderData: true,
      canLoadSponsorData: false,
      canLoadAnalyticsData: true,
      canLoadOrgData: true,
      canLoadAdminData: true,
    });
  });

  it('keeps global analytics startup loads in summary mode', () => {
    const source = readPageDataImplementation();

    expect(source).toContain("getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true })");
    expect(source).not.toContain("getAnalyticsData({ timeRange: 'all', includeRawData: true })");
  });

  it('keeps PageData analytics summaries from inventing healthy numbers', () => {
    const pageDataSource = readPageDataImplementation();
    const analyticsSource = fs.readFileSync('src/services/analyticsService.js', 'utf8');

    expect(analyticsSource).toContain("const successRateSource = totalEmergencies > 0 ? 'measured' : 'source_pending';");
    expect(analyticsSource).toContain('successRateSource,');
    expect(analyticsSource).toContain('analyticsSourceState: successRateSource');
    expect(analyticsSource).not.toContain('successRate: totalEmergencies > 0 ? Math.round((completedEmergencies.length / totalEmergencies) * 100) : 95');

    expect(pageDataSource).toContain('completionRateSource: fullAnalytics.successRateSource');
    expect(pageDataSource).toContain('sourceState: fullAnalytics.analyticsSourceState');
    expect(pageDataSource).toContain('onRouteAmbulances: null');
    expect(pageDataSource).toContain("onRouteAmbulancesSource: 'source_pending'");
    expect(pageDataSource).not.toContain("sourceState: 'mock_unavailable'");
    expect(pageDataSource).not.toContain('totalRequests: 156');
    expect(pageDataSource).not.toContain('completionRate: 94');
    expect(pageDataSource).not.toContain('onRouteAmbulances: 4');
    expect(pageDataSource).not.toContain('Math.floor(fullAnalytics.totalAmbulances * 0.3)');

    // Operational PageData has no embedded records or switchable mock path. The constant
    // compatibility flag keeps old render-only consumers honest while they migrate.
    expect(pageDataSource).toContain('const [verificationData, setVerificationData] = useState(null);');
    expect(pageDataSource).toContain('useMockData: false');
    expect(pageDataSource).not.toContain('const mockEmergencyData');
    expect(pageDataSource).not.toContain('const mockAnalyticsData');
    expect(pageDataSource).not.toContain('const mockDoctorsData');
    expect(pageDataSource).not.toContain('const mockVisitsData');
    expect(pageDataSource).not.toContain('const mockVerificationData');
    expect(pageDataSource).not.toContain('mockData: {');
    expect(pageDataSource).not.toContain('setUseMockData');
  });

  it('keeps provider Today emergency failures as UI state instead of noisy console fallback', () => {
    const pageDataSource = readPageDataImplementation();
    const emergencySource = readEmergencyServiceImplementation();

    expect(pageDataSource).toContain("getEmergencyRequests({ quiet: true, limit: 10 })");
    expect(pageDataSource).toContain("getEmergencyRequestsPageStats({}, undefined, true)");
    expect(pageDataSource).toContain("domain: 'emergency'");
    expect(pageDataSource).toContain('markDomainError(domain, error)');
    expect(pageDataSource).toContain('domainErrors,');
    expect(emergencySource).toContain("if (!filter?.quiet) {");
  });

  it('keeps Today and explicitly invoked finance failures as explicit domain errors', () => {
    const pageDataSource = readPageDataImplementation();

    for (const domain of [
      'verification',
      'doctors',
      'visits',
      'analytics',
      'users',
      'wallet',
    ]) {
      expect(pageDataSource).toContain(`domain: '${domain}'`);
    }

    expect(pageDataSource).toContain('markDomainError(domain, error)');
    expect(pageDataSource).toContain('clearDomainError(domain)');

    expect(pageDataSource).toContain('getDoctors({ quiet: true })');
    expect(pageDataSource).toContain('getVisitsPageData({');
    expect(pageDataSource).toContain('range: { start: 0, end: 4 }');
    expect(pageDataSource).toContain('stats: page?.stats || null');
    expect(pageDataSource).toContain('getUserStatistics({ quiet: true })');
    expect(pageDataSource).toContain('getProfiles({ quiet: true })');
    expect(pageDataSource).not.toContain("from '../services/supportTicketsService'");
    expect(pageDataSource).not.toContain("from '../services/hospitalsService'");
    expect(pageDataSource).not.toContain("from '../services/ambulancesService'");
    expect(pageDataSource).not.toContain("from '../services/insuranceService'");
    expect(pageDataSource).not.toContain("from '../services/organizationsService'");
    expect(pageDataSource).not.toContain("from '../services/pricingService'");
    expect(pageDataSource).not.toContain("console.error('Error fetching doctors data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching visits data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching analytics data:'");
    expect(pageDataSource).not.toContain("console.error('[PageDataContext] Support tickets fetch failed:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching hospitals data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching ambulances data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching users data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching insurance policies:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching wallet data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching pricing data:'");
    expect(pageDataSource).not.toContain("console.error('Error fetching organizations data:'");
  });

  it('keeps Today startup service fan-out quiet below PageData', () => {
    const analyticsSource = fs.readFileSync('src/services/analyticsService.js', 'utf8');
    const profilesSource = readSourceEstate({
      files: ['src/services/profilesService.js'],
      directories: ['src/services/profiles'],
    });
    const doctorsSource = fs.readFileSync('src/services/doctorsService.js', 'utf8');

    expect(analyticsSource).toContain('const quietOptions = { quiet };');
    expect(analyticsSource).toContain('getHospitals(quietOptions)');
    expect(analyticsSource).toContain('getAmbulances(quietOptions)');
    expect(analyticsSource).toContain('getSubscriptionAnalytics(quietOptions)');
    expect(analyticsSource).toContain('if (!options?.quiet) {');
    expect(profilesSource).toContain('getDisplayIds(profileIds, { quiet: filter?.quiet })');
    expect(profilesSource).toContain('if (!options?.quiet) {');
    expect(doctorsSource).toContain('const rows = data || [];');
    expect(doctorsSource).not.toContain('getDisplayIds(profileIds');
  });

  it('loads only the domains each Today role actually renders', () => {
    const pageDataSource = readPageDataImplementation();

    expect(routeOwnsStartupDomains('/')).toBe(false);
    expect(routeOwnsStartupDomains('/emergencies')).toBe(true);
    expect(routeOwnsStartupDomains('/emergencies/REQ-123')).toBe(true);
    expect(routeOwnsStartupDomains('/analytics')).toBe(true);

    expect(getPageDataStartupDomainsForRole('provider')).toEqual([
      'emergency',
      'visits',
    ]);
    expect(getPageDataStartupDomainsForRole('provider', '/')).toEqual([
      'emergency',
      'visits',
    ]);
    expect(getPageDataStartupDomainsForRole('provider', '/', 'driver')).toEqual(['emergency']);
    expect(getPageDataStartupDomainsForRole('provider', '/', 'paramedic')).toEqual(['emergency']);
    expect(getPageDataStartupDomainsForRole('provider', '/emergencies')).toEqual([]);

    expect(getPageDataStartupDomainsForRole('sponsor')).toEqual(['analytics']);
    expect(getPageDataStartupDomainsForRole('sponsor', '/analytics')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('sponsor', '/verification')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin')).toEqual([
      'emergency',
      'verification',
      'doctors',
      'users',
    ]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/')).toEqual([
      'emergency',
      'verification',
      'doctors',
      'users',
    ]);
    expect(getPageDataStartupDomainsForRole('admin', '/')).toEqual([
      'emergency',
      'verification',
      'doctors',
      'users',
    ]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/emergencies')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/analytics')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/verification')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/users')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/hospitals')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/ambulances')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/wallet')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/emergencies')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/analytics')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/verification')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/users')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/hospitals')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/ambulances')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/wallet')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/insurance')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/subscriptions')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/organizations')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/settings')).toEqual([]);
    expect(routeOwnsStartupDomains('/emergencies')).toBe(true);
    expect(routeOwnsStartupDomains('/analytics')).toBe(true);
    expect(routeOwnsStartupDomains('/verification')).toBe(true);
    expect(routeOwnsStartupDomains('/users')).toBe(true);
    expect(routeOwnsStartupDomains('/doctors')).toBe(true);
    expect(routeOwnsStartupDomains('/hospitals')).toBe(true);
    expect(routeOwnsStartupDomains('/ambulances')).toBe(true);
    expect(routeOwnsStartupDomains('/wallet')).toBe(true);
    expect(routeOwnsStartupDomains('/insurance')).toBe(true);
    expect(routeOwnsStartupDomains('/subscriptions')).toBe(true);
    expect(routeOwnsStartupDomains('/organizations')).toBe(true);
    expect(routeOwnsStartupDomains('/settings')).toBe(true);
    expect(routeOwnsStartupDomains('/health-news')).toBe(true);
    expect(routeOwnsStartupDomains('/unknown-console-route')).toBe(true);
    expect(pageDataSource).toContain('if (routeOwnsStartup) {');

    for (const routeOwnedDomain of [
      'supportTickets',
      'insurance',
      'organizations',
      'hospitals',
      'ambulances',
      'wallet',
      'pricing',
      'visits',
      'analytics',
    ]) {
      expect(getPageDataStartupDomainsForRole('admin')).not.toContain(routeOwnedDomain);
      expect(getPageDataStartupDomainsForRole('org_admin')).not.toContain(routeOwnedDomain);
    }
    expect(getPageDataStartupDomainsForRole('admin', '/emergencies')).not.toContain('emergency');
    expect(getPageDataStartupDomainsForRole('admin', '/analytics')).not.toContain('analytics');
    expect(getPageDataStartupDomainsForRole('admin', '/verification')).not.toContain('verification');
    expect(getPageDataStartupDomainsForRole('admin', '/users')).not.toContain('users');
    expect(getPageDataStartupDomainsForRole('admin', '/hospitals')).not.toContain('hospitals');
    expect(getPageDataStartupDomainsForRole('admin', '/ambulances')).not.toContain('ambulances');
    expect(getPageDataStartupDomainsForRole('admin', '/wallet')).not.toContain('wallet');
    expect(getPageDataStartupDomainsForRole('admin', '/insurance')).not.toContain('insurance');
    expect(getPageDataStartupDomainsForRole('admin', '/subscriptions')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/organizations')).not.toContain('organizations');
    expect(getPageDataStartupDomainsForRole('admin', '/settings')).toEqual([]);
    expect(pageDataSource).not.toContain("startupDomains.includes('supportTickets')");
    expect(pageDataSource).not.toContain("startupDomains.includes('insurance')");

    for (const role of ['provider', 'sponsor', 'org_admin', 'admin']) {
      expect(getPageDataStartupDomainsForRole(role)).not.toContain('activity');
    }

    expect(pageDataSource).not.toContain("table: 'user_activity'");
    expect(pageDataSource).not.toContain("channel('user_activity_changes')");
    expect(pageDataSource).not.toContain("from '../services/activityService'");
    expect(pageDataSource).not.toContain('fetchActivityData');
    expect(pageDataSource).not.toContain('activityData');
  });

  it('does not start the legacy wallet summary before rendering canonical Today', () => {
    const bentoEntry = fs.readFileSync('src/components/pages/BentoHome.jsx', 'utf8');
    const legacyData = readSourceEstate({
      files: ['src/components/pages/bento/useLegacyBentoData.js'],
    });
    const todayGuard = bentoEntry.indexOf('if (roleHomeKind) return <TodayHome role={roleHomeKind} />;');
    const legacyMount = bentoEntry.indexOf('return <LegacyBentoHome />;');

    expect(todayGuard).toBeGreaterThan(-1);
    expect(legacyMount).toBeGreaterThan(todayGuard);
    expect(legacyData).toContain('getWalletSummary(profile, isAdmin() || isSponsor())');
  });

  it('keeps map data route-owned instead of loading from the app shell', () => {
    const mapContextSource = fs.readFileSync('src/contexts/MapContext.jsx', 'utf8');
    const mapPageSource = fs.readFileSync('src/components/pages/GodModeMap.jsx', 'utf8');

    expect(mapContextSource).toContain("const isMapPath = (pathname = '') => pathname === '/map' || pathname.startsWith('/map/')");
    expect(mapContextSource).toContain('const mapRouteActive = isMapPath(location.pathname)');
    expect(mapContextSource.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContextSource.indexOf('initializeMapData({ shouldCommit: () => mounted })'));
    expect(mapContextSource.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContextSource.indexOf('supabaseMapService.subscribeToEmergencies'));
    expect(mapContextSource.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContextSource.indexOf('supabaseMapService.subscribeToAmbulances'));
    expect(mapPageSource).not.toContain('<MapProvider>');
  });

  it('keeps only Today-owned realtime subscriptions behind Today startup domains', () => {
    const pageDataSource = readPageDataImplementation();

    for (const domain of [
      'emergency',
      'doctors',
      'visits',
      'verification',
      'users',
    ]) {
      expect(pageDataSource).toContain(`startupDomains.includes('${domain}')`);
    }

    for (const routeDomain of [
      'insurance',
      'organizations',
      'pricing',
      'supportTickets',
      'hospitals',
      'ambulances',
      'wallet',
    ]) {
      expect(pageDataSource).not.toContain(`startupDomains.includes('${routeDomain}')`);
    }

    expect(pageDataSource).not.toContain('!canLoadProviderData) return;');
    expect(pageDataSource).not.toContain('!canLoadOrgData) return;');
    expect(pageDataSource).not.toContain('!canLoadAdminData) return;');
  });
});
