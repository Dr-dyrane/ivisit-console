import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const routePresentations = [
  ['../pages/TodayHome.jsx', 'TabletToday'],
  ['../pages/GodModeMap.jsx', 'TabletMap'],
  ['../pages/analytics/AnalyticsPageView.jsx', 'TabletAnalytics'],
  ['../pages/hospitals/HospitalsPageView.jsx', 'TabletHospitals'],
  ['../pages/ambulances/AmbulancesPageView.jsx', 'TabletAmbulances'],
  ['../pages/doctors/DoctorsPageView.jsx', 'TabletStaff'],
  ['../pages/VisitsPage.jsx', 'TabletVisits'],
  ['../pages/EmergencyRequestsPage.jsx', 'TabletEmergency'],
  ['../pages/VerificationQueue.jsx', 'TabletApprovals'],
  ['../pages/UsersPage.jsx', 'TabletUsers'],
  ['../pages/organizations/OrganizationsPageView.jsx', 'TabletOrganizations'],
  ['../pages/settings/SettingsPageView.jsx', 'TabletSettings'],
  ['../pages/health-news/HealthNewsPageView.jsx', 'TabletHealthNews'],
  ['../pages/SupportTicketsPage.jsx', 'TabletSupport'],
  ['../pages/insurance/InsurancePageView.jsx', 'TabletInsurance'],
  ['../pages/subscriptions/SubscriptionManagementPageView.jsx', 'TabletSubscriptions'],
  ['../pages/WalletManagementPage.jsx', 'TabletWallet'],
  ['../pages/pricing/PricingManagementPageView.jsx', 'TabletPricing'],
];

describe('dedicated tablet presentation ownership', () => {
  it.each(routePresentations)('%s explicitly forks to %s', (routePath, componentName) => {
    const source = read(routePath);

    expect(source).toContain('isPhone');
    expect(source).toContain('isTablet');
    expect(source).toContain(`<${componentName}`);
  });

  it('keeps every tablet module independent from phone presentation files', () => {
    const tabletFiles = fs.readdirSync(__dirname)
      .filter((fileName) => /^Tablet.*\.jsx$/.test(fileName));

    expect(tabletFiles.length).toBeGreaterThanOrEqual(routePresentations.length);

    tabletFiles.forEach((fileName) => {
      const source = read(`./${fileName}`);

      expect(source).not.toMatch(/from\s+['"][^'"]*\/mobile(?:\/|['"])/);
      expect(source).not.toContain('MobilePageShell');
      expect(source).not.toMatch(/<Mobile[A-Z]/);
    });
  });

  it('keeps the phone shell free of tablet presentation APIs', () => {
    const source = read('../mobile/MobilePageShell.jsx');

    expect(source).not.toContain('tabletPane');
    expect(source).not.toContain('tabletLayout');
    expect(source).not.toContain('isTablet');
    expect(source).not.toContain('useNavigation');
    expect(source).toContain('data-compact-size="phone"');
  });

  it('gives tablet list and detail columns independent scroll ownership', () => {
    const shell = read('./TabletPageShell.jsx');

    expect(shell).toContain('data-tablet-primary-pane');
    expect(shell).toContain('data-scroll-owner="primary"');
    expect(shell).toContain('data-tablet-detail-pane');
    expect(shell).toContain('data-scroll-owner="detail"');
    expect(shell).toContain('sticky top-0');
    expect(shell).toContain('overflow-y-auto');
  });

  it('keeps tablet KPI and selection grammar inside the tablet collection', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain('options.slice(0, 3)');
    expect(collection).toContain('onSelectAll');
    expect(collection).toContain("'indeterminate'");
    expect(collection).toContain('Select all visible records');
    expect(collection).toContain('role="checkbox"');
    expect(collection).toContain("aria-checked={indeterminate ? 'mixed' : selected}");
    expect(collection).not.toContain("from '../ui/checkbox'");
  });

  it('uses the shared emergency lifecycle presentation in the tablet request list', () => {
    const source = read('./TabletEmergency.jsx');

    expect(source).toContain("from '../pages/requests/emergencyLifecyclePresentation'");
    expect(source).toContain('buildEmergencyLifecyclePresentation(request)');
    expect(source).toContain('getRequestStatusMeta(request, lifecycle)');
  });

  it.each([
    '../pages/health-news/HealthNewsDetailRail.jsx',
    '../pages/support/SupportDetailRail.jsx',
    '../pages/users/UsersDetailRail.jsx',
    '../pages/verification/ApprovalDetailRail.jsx',
  ])('%s supports an embedded tablet rail', (railPath) => {
    const source = read(railPath);

    expect(source).toContain('embedded = false');
    expect(source).toContain('<DetailRailShell embedded={embedded}>');
  });

  it('centers Today without adding a second route title', () => {
    const today = read('./TabletToday.jsx');

    expect(today).toContain('<TabletPageShell mode="centered">');
    expect(today).not.toContain('<h1');
  });
});
