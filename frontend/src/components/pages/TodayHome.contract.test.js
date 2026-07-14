jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });

let mockPageData = {
  doctorsStats: {},
  emergencyStats: {},
  loading: {},
  domainErrors: {},
  useMockData: false,
  userData: { users: [], statistics: null },
  verificationData: {},
  visitsStats: {},
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    hasMinRole: () => true,
    isAdmin: () => false,
    isOrgAdmin: () => false,
    isProvider: () => false,
    isSponsor: () => false,
    isViewer: () => true,
  }),
}));

jest.mock('../../contexts/PageDataContext', () => ({
  usePageData: () => mockPageData,
}));

jest.mock('../../contexts/PageActionsContext', () => ({
  usePageActions: () => ({ registerPageAction: jest.fn() }),
}));

jest.mock('../../contexts/LayoutContext', () => ({
  usePageFooter: jest.fn(),
  usePageHeader: jest.fn(),
  usePageShell: jest.fn(),
}));

jest.mock('../common/SEOHead', () => ({
  SEOHead: () => null,
}));

import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  TodayHome,
  ROLE_COPY,
  buildActionRows,
  buildGlanceItems,
  buildToday,
  getTodayModuleRailItems,
  resolveTodayProviderCount,
} from './TodayHome';
import { resolveBentoHomeRole } from './bento/bentoHomeModel';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NAV_CONFIG, getAccessibleNav } from '../../config/navigation';
import { getProtectedRoutesForRole, getRouteProtection, getRouteTitle } from '../../config/routes';

const readSource = (path) => fs.readFileSync(path, 'utf8');
const todayImplementationPaths = [
  'src/components/pages/TodayHome.jsx',
  'src/components/pages/today/todayModel.js',
  'src/components/pages/today/todayActionModel.js',
  'src/components/pages/today/todayGlanceModel.js',
  'src/components/pages/today/todayRoleModel.js',
  'src/components/pages/today/todaySummaryModel.js',
  'src/components/pages/today/useTodayRoleKind.js',
  'src/components/pages/today/TodayDesktopView.jsx',
];
const bentoImplementationPaths = [
  'src/components/pages/bento/LegacyBentoHome.jsx',
  'src/components/pages/bento/LegacyBentoCards.jsx',
  'src/components/pages/bento/LegacyBentoFooter.jsx',
  'src/components/pages/bento/LegacyBentoGrid.jsx',
  'src/components/pages/bento/LegacyBentoLoadingView.jsx',
  'src/components/pages/bento/LegacyBentoOperationsCards.jsx',
  'src/components/pages/bento/LegacyBentoRoleCards.jsx',
  'src/components/pages/bento/LegacyQuickActionCard.jsx',
  'src/components/pages/bento/useLegacyBentoData.js',
];
const todaySource = () => todayImplementationPaths.map(readSource).join('\n');
const bentoSource = () => bentoImplementationPaths.map(readSource).join('\n');

const liveCounts = {
  live: true,
  emergencyCount: 3,
  approvalCount: 12,
  visitCount: 2,
  providerCount: 8,
};

function rowsFor(roleKind, overrides = {}) {
  return buildActionRows({
    roleKind,
    roleCopy: ROLE_COPY[roleKind],
    loading: {},
    ...liveCounts,
    ...overrides,
  });
}

function renderTodayRole(roleKind, overrides = {}) {
  mockPageData = {
    doctorsStats: { totalDoctors: 8, total: 8 },
    emergencyStats: { active: 3, pending_approval: 3, pending: 3 },
    loading: {},
    domainErrors: {},
    useMockData: false,
    userData: { users: [], statistics: null },
    verificationData: { pending: 12 },
    visitsStats: { today: 2 },
    ...overrides,
  };

  return renderToStaticMarkup(<TodayHome role={roleKind} />);
}

function collectTodayPaths(roleKind, live = true) {
  const base = {
    roleKind,
    live,
    emergencyCount: 3,
    approvalCount: 12,
    visitCount: 2,
    providerCount: 8,
  };
  const roleCopy = ROLE_COPY[roleKind] || ROLE_COPY.viewer;

  return [
    buildToday(base).path,
    ...buildGlanceItems(base).map((item) => item.path),
    ...buildActionRows({
      ...base,
      roleCopy,
      loading: {},
    }).map((row) => row.path),
    ...getTodayModuleRailItems(roleKind).map((item) => item.path),
  ].filter(Boolean);
}

describe('TodayHome role contract', () => {
  afterEach(() => {
    mockPageData = {
      doctorsStats: {},
      emergencyStats: {},
      loading: {},
      domainErrors: {},
      useMockData: false,
      userData: { users: [], statistics: null },
      verificationData: {},
      visitsStats: {},
    };
  });

  it('keeps Today route and Approvals route labels aligned with simple UI copy', () => {
    expect(getRouteProtection('/')).toEqual({
      public: false,
      minRole: 'viewer',
      resource: 'dashboard',
      title: 'Today',
      additionalRoles: ['dispatcher'],
    });
    expect(getRouteTitle('/verification')).toBe('Approvals');
    expect(NAV_CONFIG.mgmt.items.find((item) => item.id === 'verification')?.label).toBe('Approvals');
  });

  it('keeps Bento composition role precedence identical before mounting either home', () => {
    expect(resolveBentoHomeRole({ admin: true, orgAdmin: true })).toBe('admin');
    expect(resolveBentoHomeRole({ admin: false, orgAdmin: true })).toBe('org_admin');
    expect(resolveBentoHomeRole({ dispatcher: true })).toBe('dispatcher');
    expect(resolveBentoHomeRole({ provider: true })).toBe('provider');
    expect(resolveBentoHomeRole({ sponsor: true })).toBe('sponsor');
    expect(resolveBentoHomeRole({ viewer: true })).toBe('viewer');
    expect(resolveBentoHomeRole({ provider: true, patient: true })).toBeNull();
    expect(resolveBentoHomeRole({ patient: true })).toBeNull();
  });

  it('keeps Health News as an org-admin management route across source contracts', () => {
    expect(getRouteProtection('/health-news').minRole).toBe('org_admin');
    expect(NAV_CONFIG.mgmt.items.find((item) => item.id === 'news')?.minRole).toBe('org_admin');

    const appSource = [
      readSource('src/App.js'),
      readSource('src/app/AppRoutes.jsx'),
    ].join('\n');
    expect(appSource).toContain("healthNews: lazyNamedPage(() => import('../components/pages/HealthNewsManagementPage'), 'HealthNewsManagementPage')");
    expect(getRouteProtection('/health-news').minRole).toBe('org_admin');
  });

  it('keeps protected route access scoped by role', () => {
    expect(getRouteProtection('/emergencies')).toEqual({
      minRole: 'provider',
      resource: 'emergency_requests',
      title: 'Requests',
      excludedRoles: ['sponsor'],
      additionalRoles: ['dispatcher'],
    });

    expect(NAV_CONFIG.ops.items.find((item) => item.id === 'emergencies')).toMatchObject({
      label: 'Requests',
      resource: 'emergency_requests',
      minRole: 'provider',
      excludedRoles: ['sponsor'],
      additionalRoles: ['dispatcher'],
    });

    expect(getProtectedRoutesForRole('viewer')).toEqual(expect.arrayContaining(['/', '/settings']));
    expect(getProtectedRoutesForRole('viewer')).not.toEqual(expect.arrayContaining(['/map', '/verification']));

    expect(getProtectedRoutesForRole('provider')).toEqual(expect.arrayContaining(['/', '/emergencies', '/visits']));
    expect(getProtectedRoutesForRole('provider')).not.toEqual(expect.arrayContaining(['/verification', '/doctors']));

    expect(getProtectedRoutesForRole('org_admin')).toEqual(expect.arrayContaining(['/', '/verification', '/doctors', '/wallet']));
    expect(getProtectedRoutesForRole('org_admin')).not.toEqual(expect.arrayContaining(['/organizations']));

    expect(getProtectedRoutesForRole('dispatcher')).toEqual(expect.arrayContaining(['/', '/emergencies', '/map', '/settings']));
    expect(getProtectedRoutesForRole('dispatcher')).not.toEqual(expect.arrayContaining(['/analytics', '/visits', '/verification']));

    expect(getProtectedRoutesForRole('sponsor')).toEqual(expect.arrayContaining(['/', '/analytics', '/settings']));
    expect(getProtectedRoutesForRole('sponsor')).not.toEqual(expect.arrayContaining([
      '/map',
      '/emergencies',
      '/visits',
      '/support-tickets',
      '/verification',
      '/wallet',
    ]));
  });

  it('keeps accessible nav labels role-specific for Today', () => {
    const viewerNav = getAccessibleNav({ role: 'viewer' });
    const providerNav = getAccessibleNav({ role: 'provider' });
    const orgAdminNav = getAccessibleNav({ role: 'org_admin' });
    const sponsorNav = getAccessibleNav({ role: 'sponsor' });

    expect(viewerNav.main.map((item) => item.label)).toEqual(['Today']);
    expect(viewerNav.user.items.map((item) => item.label)).toEqual(['Settings']);

    expect(providerNav.ops.items.map((item) => item.label)).toEqual(['Visits', 'Requests']);
    expect(providerNav.mgmt.items.map((item) => item.label)).toEqual(['Support']);

    expect(orgAdminNav.mgmt.items.map((item) => item.label)).toEqual(expect.arrayContaining(['Approvals', 'Users']));
    expect(orgAdminNav.finance.items.map((item) => item.label)).toEqual(expect.arrayContaining(['Payments', 'Pricing']));

    expect(sponsorNav.main.map((item) => item.label)).toEqual(['Today', 'Statistics']);
    expect(sponsorNav.ops).toBeNull();
    expect(sponsorNav.mgmt).toBeNull();
    expect(sponsorNav.user.items.map((item) => item.label)).toEqual(['Settings']);
  });

  it('keeps the Today desktop rail explicitly scoped by role', () => {
    const labelsFor = (role) => getTodayModuleRailItems(role).map((item) => item.label);
    const pathsFor = (role) => getTodayModuleRailItems(role).map((item) => item.path);

    expect(labelsFor('admin')).toEqual(['Today', 'Requests', 'Staff', 'Payments', 'Help']);
    expect(pathsFor('admin')).toEqual(['/', '/emergencies', '/doctors', '/wallet', '/support-tickets']);

    expect(labelsFor('org_admin')).toEqual(['Today', 'Requests', 'Staff', 'Payments', 'Help']);
    expect(pathsFor('org_admin')).toEqual(['/', '/emergencies', '/doctors', '/wallet', '/support-tickets']);

    expect(labelsFor('provider')).toEqual(['Today', 'Requests', 'Help']);
    expect(pathsFor('provider')).toEqual(['/', '/emergencies', '/support-tickets']);

    expect(labelsFor('sponsor')).toEqual(['Today', 'Statistics']);
    expect(pathsFor('sponsor')).toEqual(['/', '/analytics']);
    expect(pathsFor('sponsor')).not.toEqual(expect.arrayContaining(['/emergencies', '/support-tickets', '/wallet']));

    expect(labelsFor('viewer')).toEqual(['Today']);
    expect(pathsFor('viewer')).toEqual(['/']);
  });

  it('keeps every visible Today destination accessible to the role that sees it', () => {
    const roles = ['admin', 'org_admin', 'provider', 'sponsor', 'viewer'];

    roles.forEach((role) => {
      const accessiblePaths = getProtectedRoutesForRole(role);
      const paths = [
        ...collectTodayPaths(role, true),
        ...collectTodayPaths(role, false),
      ];

      paths.forEach((path) => {
        expect(accessiblePaths).toContain(path);
      });
    });
  });

  it('renders role-specific Today surfaces without relying on live account switching', () => {
    const adminHtml = renderTodayRole('admin');
    expect(adminHtml).toContain('3 requests to review');
    expect(adminHtml).toContain('Review requests');
    expect(adminHtml).toContain('Review organizations');

    const orgAdminHtml = renderTodayRole('org_admin', {
      emergencyStats: { active: 0 },
      verificationData: { pending: 12 },
    });
    expect(orgAdminHtml).toContain('12 pending approvals');
    expect(orgAdminHtml).toContain('Review pending approvals');
    expect(orgAdminHtml).toContain('Check payments');

    const providerHtml = renderTodayRole('provider');
    expect(providerHtml).toContain('2 visit items');
    expect(providerHtml).toContain('Your visits');
    expect(providerHtml).toContain('Open today&#x27;s visits');
    expect(providerHtml).not.toContain('Review pending approvals');

    const sponsorHtml = renderTodayRole('sponsor');
    expect(sponsorHtml).toContain('Impact is ready to review');
    expect(sponsorHtml).toContain('Read-only report');
    expect(sponsorHtml).toContain('Review request activity');
    expect(sponsorHtml).toContain('In impact');
    // The DS shadow token + active-state utility pair ('...shadow-e3 active:...')
    // carries the bare substring '3 active' inside class attributes, so this guard
    // pins the rendered copy forms instead: text nodes and aria-label values.
    expect(sponsorHtml).not.toContain('3 active<');
    expect(sponsorHtml).not.toContain(': 3 active');
    expect(sponsorHtml).not.toContain('Open requests');
    expect(sponsorHtml).not.toContain('/emergencies');
    expect(sponsorHtml).not.toContain('/support-tickets');

    const viewerHtml = renderTodayRole('viewer');
    expect(viewerHtml).toContain('Activation needed');
    expect(viewerHtml).toContain('Ask admin for access');
    expect(viewerHtml).toContain('Role assignment needed');
    expect(viewerHtml).not.toContain('Review requests');
  });

  it('keeps admin focused on pending request review first', () => {
    const today = buildToday({ roleKind: 'admin', ...liveCounts });
    const glanceItems = buildGlanceItems({ roleKind: 'admin', ...liveCounts });
    const rows = rowsFor('admin');

    expect(today.status).toBe('Needs attention');
    expect(today.path).toBe('/emergencies');
    expect(today.primaryAction).toBe('Review');
    expect(glanceItems.map((item) => [item.label, item.path])).toEqual([
      ['Requests', '/emergencies'],
      ['Approvals', '/verification'],
      ['Staff', '/doctors'],
    ]);
    expect(rows.map((row) => row.id)).toEqual([
      'requests',
      'approvals',
      'staff',
      'organizations',
    ]);
  });

  it('does not label active requests as review-needed work', () => {
    const counts = {
      live: true,
      emergencyReviewCount: 0,
      emergencyActiveCount: 1,
      approvalCount: 736,
      visitCount: 0,
      providerCount: 322,
    };
    const today = buildToday({ roleKind: 'admin', ...counts });
    const glanceItems = buildGlanceItems({ roleKind: 'admin', ...counts });
    const rows = buildActionRows({
      roleKind: 'admin',
      roleCopy: ROLE_COPY.admin,
      loading: {},
      ...counts,
    });
    const requestCard = glanceItems.find((item) => item.label === 'Requests');
    const requestRow = rows.find((row) => row.id === 'requests');

    expect(today.headline).toBe('736 pending approvals');
    expect(today.status).toBe('Needs attention');
    expect(today.path).toBe('/verification');
    expect(requestCard).toMatchObject({
      value: '1 active',
      tone: 'primary',
    });
    expect(requestRow).toMatchObject({
      label: 'Check requests',
      meta: '1 active',
      tone: 'primary',
    });
    expect(rows[0].id).toBe('approvals');
    expect(rows[1].id).toBe('requests');
    expect(today.headline).not.toContain('request to review');
    expect(requestRow.meta).not.toContain('to review');
  });

  it('uses provider profile statistics for Staff when doctor directory stats are empty', () => {
    expect(resolveTodayProviderCount({
      doctorsStats: { totalDoctors: 0, total: 0 },
      userData: { statistics: { roleDistribution: { provider: 268 } } },
      live: true,
    })).toBe(268);

    const adminHtml = renderTodayRole('admin', {
      doctorsStats: { totalDoctors: 0, total: 0 },
      userData: { statistics: { roleDistribution: { provider: 268 } } },
    });

    expect(adminHtml).toContain('Staff');
    expect(adminHtml).toContain('Staff: 268 records');
    expect(adminHtml).toContain('268 records');
    expect(adminHtml).not.toContain('Staff: Check staff');
    expect(adminHtml).not.toContain('No staff count yet');
  });

  it('keeps org admin approval work visible without inventing write authority', () => {
    const today = buildToday({
      roleKind: 'org_admin',
      ...liveCounts,
      emergencyCount: 0,
      approvalCount: 12,
    });
    const glanceItems = buildGlanceItems({
      roleKind: 'org_admin',
      ...liveCounts,
      emergencyCount: 0,
      approvalCount: 12,
    });
    const rows = rowsFor('org_admin', { emergencyCount: 0, approvalCount: 12 });

    expect(today.sheetTitle).toBe('Pending approvals');
    expect(today.path).toBe('/verification');
    expect(glanceItems.map((item) => [item.label, item.path])).toEqual([
      ['Requests', '/emergencies'],
      ['Approvals', '/verification'],
      ['Staff', '/doctors'],
    ]);
    expect(rows.map((row) => row.path)).toEqual([
      '/verification',
      '/emergencies',
      '/doctors',
      '/wallet',
    ]);
  });

  it('keeps providers on visits, requests, help, and settings', () => {
    const today = buildToday({ roleKind: 'provider', ...liveCounts });
    const glanceItems = buildGlanceItems({ roleKind: 'provider', ...liveCounts });
    const rows = rowsFor('provider');

    expect(today.sheetTitle).toBe('Your visits');
    expect(today.path).toBe('/visits');
    expect(glanceItems.map((item) => item.label)).toEqual(['Visits', 'Requests', 'Help']);
    expect(glanceItems.map((item) => item.path)).toEqual(['/visits', '/emergencies', '/support-tickets']);
    expect(rows.map((row) => row.path)).toEqual([
      '/visits',
      '/emergencies',
      '/support-tickets',
      '/settings',
    ]);
  });

  it('keeps sponsor work read-only and impact-led', () => {
    const today = buildToday({ roleKind: 'sponsor', ...liveCounts });
    const glanceItems = buildGlanceItems({ roleKind: 'sponsor', ...liveCounts });
    const rows = rowsFor('sponsor');

    expect(today.status).toBe('Read only');
    expect(today.path).toBe('/analytics');
    expect(glanceItems.map((item) => [item.label, item.path])).toEqual([
      ['Impact', '/analytics'],
      ['Requests', '/analytics'],
      ['Access', '/settings'],
    ]);
    expect(glanceItems.find((item) => item.label === 'Requests')?.value).toBe('In impact');
    expect(rows.map((row) => row.id)).toEqual(['impact', 'requests', 'settings']);
    expect(rows[0].actionLabel).toBe('Open impact');
    expect(rows[1].meta).toBe('In impact');
    expect(rows[1].detail).toBe('Request activity is visible in Impact without changing care work.');
    expect(rows[1].path).toBeUndefined();
    expect(rows[1].actionLabel).toBeUndefined();
  });

  it('keeps viewer limited to setup and access request guidance', () => {
    const today = buildToday({ roleKind: 'viewer', ...liveCounts });
    const rows = rowsFor('viewer');
    const viewerHtml = renderTodayRole('viewer');

    expect(today.status).toBe('Limited access');
    expect(today.path).toBe('/settings');
    expect(rows[0].path).toBe('/settings');
    expect(rows[1].disabled).toBe(true);
    expect(rows[1].disabledReason).toBe('An admin needs to assign your role before this action is available.');
    expect(viewerHtml).toContain('data-state="unavailable"');
    expect(viewerHtml).toContain('aria-disabled="true"');
    expect(viewerHtml).toContain('An admin needs to assign your role before this action is available.');
  });

  it('uses not-ready copy when live data is unavailable', () => {
    const today = buildToday({
      roleKind: 'provider',
      live: false,
      emergencyCount: 0,
      approvalCount: 0,
      visitCount: 0,
      providerCount: 0,
    });
    const rows = rowsFor('provider', {
      live: false,
      emergencyCount: 0,
      approvalCount: 0,
      visitCount: 0,
      providerCount: 0,
    });

    expect(today.status).toBe('Not ready yet');
    expect(rows[0].meta).toBe('Live details not ready');
  });

  it('keeps Today summary-owned by PageData instead of a route-owned page query', () => {
    const source = todaySource();

    expect(source).toContain("import { usePageData } from '../../contexts/PageDataContext';");
    expect(source).toContain('} = usePageData();');
    expect(source).toContain('emergencyStats,');
    expect(source).toContain('emergencyStats?.pending_approval ?? emergencyStats?.pending');
    expect(source).toContain('emergencyStats?.active');
    expect(source).toContain('activeRequests: emergencyActiveCount');
    expect(source).toContain('verificationData,');
    expect(source).toContain('doctorsStats,');
    expect(source).toContain('visitsStats,');
    expect(source).toContain('domainErrors,');
    expect(source).toContain('useMockData,');
    expect(source).not.toContain('getEmergencyRequestsPage');
    expect(source).not.toContain('getEmergencyRequestsPageStats');
    expect(source).not.toContain("supabase.from('emergency_requests')");
    expect(source).not.toContain('PaginationControls');
    expect(source).not.toContain('setTotalCount');
    expect(source).not.toContain('paginationRange');
    expect(source).not.toContain('sortConfig');
    expect(source).not.toContain('date_from');
    expect(source).not.toContain('date_to');
  });

  it('keeps Today free of page realtime and domain side-effect owners except its route-context publisher', () => {
    const source = todaySource();

    expect(source).not.toContain("from '../../lib/supabase'");
    expect(source).not.toContain('supabase.');
    expect(source).not.toContain('.channel(');
    expect(source).not.toContain('postgres_changes');
    expect(source).not.toContain('.subscribe(');
    expect(source).not.toContain('removeChannel');
    expect(source).not.toContain('getUserActivePaymentMethods');
    expect(source).not.toContain('getEmergencyRequestsPage');
    expect(source).toContain('const todayPanelContext = useMemo(() => ({');
    expect(source).toContain("page: 'today'");
    expect(source).toContain('onNavigate: handleAction');
    expect(source).toContain("window.dispatchEvent(new CustomEvent('todayRouteContextUpdated', {");
    expect(source).toContain("window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);");
    expect(source).toContain("window.removeEventListener('requestTodayRouteContext', publishTodayRouteContext);");
    expect(source).toContain('window.setTimeout(() => {');
    expect(source).toContain('navigate(path);');
  });

  it('uses not-ready copy while role-critical Today data is still loading', () => {
    const adminHtml = renderTodayRole('admin', {
      emergencyStats: { active: 0 },
      verificationData: { pending: 0 },
      doctorsStats: { totalDoctors: 0, total: 0 },
      loading: { emergency: true },
    });

    expect(adminHtml).toContain('Live details are not ready');
    expect(adminHtml).toContain('Retry needed');
    expect(adminHtml).not.toContain('No requests right now');
    expect(adminHtml).not.toContain('All clear for now');
  });

  it('uses not-ready copy instead of clear copy when a role-critical data domain fails', () => {
    const source = todaySource();

    expect(source).toContain("provider: ['emergency', 'visits']");
    expect(source).not.toContain("provider: ['emergency', 'visits', 'supportTickets']");

    const providerHtml = renderTodayRole('provider', {
      domainErrors: { emergency: 'Failed to load requests' },
    });

    expect(providerHtml).toContain('Live details are not ready');
    expect(providerHtml).toContain('Retry needed');
    expect(providerHtml).not.toContain('Requests</span><span class="mt-1 block truncate text-[13px] font-semibold text-foreground sm:text-sm">Clear');
  });

  it('keeps canonical Today ahead of every legacy Bento data owner', () => {
    const composition = readSource('src/components/pages/BentoHome.jsx');
    const legacy = bentoSource();

    expect(composition).not.toContain('usePageData');
    expect(composition).not.toContain('getSubscriptionAnalytics({ quiet: true })');
    expect(composition).not.toContain('walletService');
    expect(composition).not.toContain('subscriptionService');
    expect(composition.indexOf('if (roleHomeKind) return <TodayHome role={roleHomeKind} />;'))
      .toBeLessThan(composition.indexOf('return <LegacyBentoHome />;'));
    expect(legacy).not.toContain("from '../../../hooks/useSubscription'");
    expect(legacy).not.toContain('fetchSubscriptionAnalytics');
    expect(legacy).toContain('getSubscriptionAnalytics({ quiet: true })');
    expect(legacy).toContain('if (!shouldLoadSubscriptionStats) return undefined;');
    expect(legacy).not.toContain("from '../TodayHome'");
  });

  it('keeps the Today refresh FAB on the PageData refresh owner after composition splits', () => {
    const source = readSource('src/components/pages/TodayHome.jsx');

    expect(source).toContain("import { usePageActions } from '../../contexts/PageActionsContext';");
    expect(source).toContain("label: 'Refresh today'");
    expect(source).toContain('action: refreshAllData');
    expect(source).toContain('}), [refreshAllData, registerPageAction]);');
  });

  it('keeps legacy Today surfaces free of decorative chrome', () => {
    const chromeCleanFiles = [
      'src/components/pages/BentoHome.jsx',
      ...bentoImplementationPaths,
      'src/components/mobile/MobileDashboard.jsx',
      'src/components/dashboard/StatsCard.jsx',
      'src/components/pages/AdminHome.jsx',
      'src/components/pages/DoctorHome.jsx',
      'src/components/pages/OrgAdminHome.jsx',
      'src/components/pages/SponsorHome.jsx',
      'src/components/pages/ViewerHome.jsx',
      'src/components/pages/Overview.jsx',
    ];
    const bannedChromeTokens = [
      'glass-card',
      'hover-glow',
      'hover-lift',
      'blur-xl',
      'backdrop-blur',
      'shadow-2xl',
      'shadow-premium',
      'rounded-2xl',
      'rounded-3xl',
      'geo-sharp',
      'squircle-lg',
      'squircle-sm',
      'border-0',
    ];

    chromeCleanFiles.forEach((file) => {
      const chromeSource = fs.readFileSync(file, 'utf8');
      bannedChromeTokens.forEach((token) => {
        expect(chromeSource).not.toContain(token);
      });
    });
  });

  it('keeps Today in the shared stage and sheet visual system', () => {
    const source = todaySource();
    const railSource = fs.readFileSync('src/config/consoleModuleRail.js', 'utf8');
    const railComponentSource = fs.readFileSync('src/components/common/ConsoleModuleRail.jsx', 'utf8');

    expect(source).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(source).toContain("usePageFooter(null, 'status', false)");
    expect(source).toContain('const AtlasLayer = () => (');
    expect(source).toContain('min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground');
    expect(source).toContain('rounded-t-sheet bg-card/78');
    expect(source).toContain('md:rounded-sheet');
    expect(source).toContain('rounded-modal bg-background/55');
    expect(source).not.toContain('rounded-t-[44px]');
    expect(source).not.toContain('md:rounded-[44px]');
    expect(source).toContain('mx-auto mb-3 h-1.5 w-[42px]');
    expect(source).toContain('lg:self-stretch');
    expect(source).toContain('bg-foreground px-4 py-2.5 text-sm font-semibold text-background');
    expect(source).not.toContain('bg-primary px-4 py-2.5 text-sm font-semibold text-white');
    expect(source).toContain("primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100'");
    expect(source).not.toContain("primary: 'bg-primary/10 text-primary");
    expect(source).toContain('focus-visible:bg-foreground/10');
    expect(source).not.toContain('focus-visible:bg-primary/10');
    expect(source).not.toContain('dark:focus-visible:bg-primary/20');
    // The glance tile composes from the console DS: GlanceTile locks the motion,
    // aria, data-state, and orb-swap anatomy once (ConsoleDesignSystem.contract.test.js);
    // the page wires its domain only -- tone map + the Today data attribute.
    expect(source).toContain("import { GlanceTile } from '../../console/GlanceTile';");
    expect(source).toContain('<GlanceTile');
    expect(source).toContain('toneClassMap={rowToneClass}');
    expect(source).toContain('dataAttr="data-today-glance"');
    expect(source).toContain("data-state={isOpening ? 'opening' : 'idle'}");
    expect(source).toContain('<ArrowRight className="h-3.5 w-3.5" />');
    expect(source).toContain('<Loader2 className="h-3.5 w-3.5 animate-spin" />');
    expect(source).toContain("data-state={routingPath === today.path ? 'opening' : 'idle'}");
    expect(source).toContain("const rowState = row.disabled ? 'unavailable' : isOpening ? 'opening' : expanded ? 'expanded' : 'idle';");
    expect(source).toContain('data-today-row={row.id}');
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain("data-state={isOpening ? 'opening' : 'idle'}");
    expect(source).toContain('ConsoleModuleRail');
    expect(source).toContain('getConsoleModuleRailItems(roleKind)');
    // The glance value/label anatomy lives in the DS GlanceTile now; prove it
    // still renders through this page (tile spec + data attribute + rest state).
    const adminHtml = renderTodayRole('admin');
    expect(adminHtml).toContain('data-today-glance="requests"');
    expect(adminHtml).toContain('shadow-e2-lift');
    expect(adminHtml).toContain('data-state="idle"');
    expect(adminHtml).toContain('font-semibold leading-tight text-foreground [overflow-wrap:anywhere]');
    expect(source).not.toContain('block truncate text-[13px] font-semibold text-foreground');
    expect(railSource).toContain("sponsor: ['today', 'statistics']");
    expect(railComponentSource).toContain('data-console-rail={id}');
    expect(source).not.toContain('container mx-auto');
    expect(source).not.toContain('SYSTEM STATUS');
  });

  it('keeps Today out of private shell chrome', () => {
    const source = todaySource();
    const forbiddenShellOwners = [
      'SmartHeader',
      'ResponsiveSidebar',
      'IslandNavigation',
      'DynamicBottomBar',
      'ContextAwareFAB',
      'NotificationCenter',
      'MobileNavMenu',
      'ContextPanelShell',
      'SmartFooter',
    ];

    forbiddenShellOwners.forEach((owner) => {
      expect(source).not.toContain(owner);
    });

    expect(source).toContain("import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';");
    expect(source).toContain("import { ConsoleModuleRail } from '../../common/ConsoleModuleRail';");
    expect(source).toContain("usePageHeader('Today', headerAction);");
    expect(source).toContain("usePageFooter(null, 'status', false);");
    expect(source).toContain('usePageShell({ bleed: true, hideFab: true });');
  });

  it('keeps Today loading, unavailable, opening, and expanded states explicit', () => {
    const source = todaySource();

    expect(source).toContain("headline: 'Live details are not ready'");
    expect(source).toContain("value: 'Retry needed'");
    expect(source).toContain("meta: 'Live details not ready'");
    expect(source).toContain('const live = !useMockData && !hasTodayDataError && !hasTodayLoading;');
    expect(source).toContain("const rowState = row.disabled ? 'unavailable' : isOpening ? 'opening' : expanded ? 'expanded' : 'idle';");
    expect(source).toContain('aria-disabled={row.disabled ? \'true\' : undefined}');
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain("aria-label={`${row.label}: ${row.meta}${row.disabledReason ? `. ${row.disabledReason}` : ''}`}");
    expect(source).toContain("data-state={routingPath === today.path ? 'opening' : 'idle'}");
    expect(source).toContain("data-state={isOpening ? 'opening' : 'idle'}");
    expect(source).toContain("{isOpening ? 'Opening...' : row.actionLabel}");

    const notReadyHtml = renderTodayRole('admin', {
      loading: { emergency: true },
      emergencyStats: { active: 0 },
      verificationData: { pending: 0 },
    });

    expect(notReadyHtml).toContain('Live details are not ready');
    expect(notReadyHtml).toContain('Retry needed');
    expect(notReadyHtml).not.toContain('All clear for now');
    expect(notReadyHtml).not.toContain('No requests right now');
  });

  it('keeps Today action authority navigation-only', () => {
    const source = todaySource();

    expect(source).toContain("import { useNavigate } from 'react-router-dom';");
    // routeFeedbackMs is the DS token now (WorkspaceStage exports 320, locked in
    // ConsoleDesignSystem.contract.test.js). handleAction stays PAGE-LOCAL on
    // purpose: it adds first-click-wins + timer-ref cleanup that the shared
    // useWayfindingNav does not carry yet (recorded kit gap).
    expect(source).toContain("import { routeFeedbackMs } from '../console/WorkspaceStage';");
    expect(source).toContain('const handleAction = useCallback((path) => {');
    expect(source).toContain('if (routingPath) return;');
    expect(source).toContain('if (!path) return;');
    expect(source).toContain('setRoutingPath(path);');
    expect(source).toContain('window.setTimeout(() => {');
    expect(source).toContain('navigate(path);');
    expect(source).toContain('}, routeFeedbackMs);');

    expect(source).not.toContain("from '../../lib/supabase'");
    expect(source).not.toContain("from '../../services/emergencyService'");
    expect(source).not.toContain("from '../../services/emergencyResponseService'");
    expect(source).not.toContain('dispatchEmergency');
    expect(source).not.toContain('completeEmergency');
    expect(source).not.toContain('cancelEmergencyRequest');
    expect(source).not.toContain('retryPaymentWithDifferentMethod');
    expect(source).not.toContain('toast.success');
    expect(source).not.toContain('toast.error');
  });

  it('keeps Today right panel route-context owned instead of global-dashboard owned', () => {
    const today = todaySource();
    const dashboardPanel = fs.readFileSync('src/components/context/DashboardPanel.jsx', 'utf8');
    const contextPanel = fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
    const hardgate = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
    // Preservation baseline f31f29f: the revamp landed on top of it and checkpoint commits advanced HEAD past it, so this old-behavior proof reads the baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
    const oldDashboardPanel = execFileSync('git', ['-C', '..', 'show', 'f31f29f:frontend/src/components/context/DashboardPanel.jsx'], { encoding: 'utf8' });

    expect(oldDashboardPanel).toContain("import { usePageData } from '../../contexts/PageDataContext';");
    expect(oldDashboardPanel).toContain('refreshAllData');
    expect(oldDashboardPanel).toContain("new CustomEvent('openEmergencyModal')");
    expect(oldDashboardPanel).toContain("new CustomEvent('openAnalyticsModal'");
    expect(oldDashboardPanel).toContain("fetch('/api/backup'");

    expect(today).toContain('const todayPanelContext = useMemo(() => ({');
    expect(today).toContain("window.dispatchEvent(new CustomEvent('todayRouteContextUpdated', {");
    expect(today).toContain("window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);");

    expect(contextPanel).toContain('const [todayRouteContext, setTodayRouteContext] = React.useState(null);');
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestTodayRouteContext'));");
    expect(contextPanel).toContain('<DashboardPanel todayContext={todayRouteContext} />');
    expect(contextPanel).not.toContain('refreshAllData={refreshAllData}');
    expect(contextPanel).not.toContain('activityData={activityData}');
    expect(contextPanel).not.toContain('analyticsData={analyticsData}');
    expect(contextPanel).not.toContain('doctorsData={doctorsData}');

    expect(dashboardPanel).toContain('export const DashboardPanel = ({ todayContext }) =>');
    expect(dashboardPanel).toContain('Today overview');
    expect(dashboardPanel).toContain('Current route scope');
    expect(dashboardPanel).toContain('Panel actions');
    expect(dashboardPanel).toContain('Current list');
    expect(dashboardPanel).toContain('role="status" aria-live="polite"');
    expect(dashboardPanel).toContain('context.onNavigate(action.path)');
    expect(dashboardPanel).not.toContain('usePageData');
    expect(dashboardPanel).not.toContain('refreshAllData');
    expect(dashboardPanel).not.toContain('openEmergencyModal');
    expect(dashboardPanel).not.toContain('openAnalyticsModal');
    expect(dashboardPanel).not.toContain('/api/backup');
    expect(dashboardPanel).not.toContain('Quick Actions');
    expect(dashboardPanel).not.toContain('System Backup');
    expect(hardgate).toContain('src/components/context/DashboardPanel.jsx');
  });
});
