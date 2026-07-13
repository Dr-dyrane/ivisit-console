import fs from 'fs';
import { APP_ROUTE_METADATA } from './appRouteMetadata';
import {
  AUTHENTICATED_SHELL_ROUTES,
  PUBLIC_SHELL_ROUTES,
  normalizeShellPath,
  shouldHideShellChrome,
} from './shellVisibility';

const read = (file) => fs.readFileSync(file, 'utf8');

const expectInOrder = (source, markers) => {
  let previousIndex = -1;

  markers.forEach((marker) => {
    const index = source.indexOf(marker);
    expect(index).toBeGreaterThan(previousIndex);
    previousIndex = index;
  });
};

describe('APP-01 composition contract', () => {
  const appSource = () => read('src/App.js');
  const layoutSource = () => read('src/app/AppLayout.jsx');
  const routesSource = () => read('src/app/AppRoutes.jsx');
  const shellSource = () => read('src/app/AppShell.jsx');
  const loadingSource = () => read('src/app/RouteLoadingState.jsx');

  it('preserves the root provider and global mount order', () => {
    const app = appSource();

    expectInOrder(app, [
      '<QueryClientProvider client={queryClient}>',
      '<ErrorBoundary>',
      '<ThemeProvider>',
      '<PageActionsProvider>',
      '<PWAProvider>',
      '<FeedbackProvider>',
      '<FocusedRecordProvider>',
      '<Router>',
      '<AppRoutes />',
      '<Toaster position="top-right" richColors />',
      '<PWADebugTracker />',
    ]);
    expect(app).toContain("process.env.NODE_ENV === 'development' && process.env.REACT_APP_QUERY_DEVTOOLS === 'true'");
    expect(app).toContain('<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />');
    expect(app).not.toContain('GlobalFinancialModals');
  });

  it('preserves the route list, lazy imports, and protection metadata', () => {
    const routes = routesSource();
    const expectedMetadata = [
      { id: 'login', path: '/login', public: true },
      { id: 'setPassword', path: '/set-password', public: true },
      { id: 'onboarding', path: '/onboarding', public: true },
      { id: 'onboardingSuccess', path: '/onboarding-success', public: true },
      { id: 'unauthorized', path: '/unauthorized', public: true },
      { id: 'home', path: '/' },
      { id: 'map', path: '/map', minRole: 'provider' },
      { id: 'analytics', path: '/analytics', minRole: 'provider' },
      { id: 'hospitals', path: '/hospitals', minRole: 'org_admin' },
      { id: 'ambulances', path: '/ambulances', minRole: 'org_admin' },
      { id: 'doctors', path: '/doctors', minRole: 'org_admin' },
      { id: 'visits', path: '/visits', minRole: 'provider' },
      { id: 'emergencies', path: '/emergencies', minRole: 'provider' },
      { id: 'verification', path: '/verification', minRole: 'org_admin' },
      { id: 'users', path: '/users', minRole: 'org_admin' },
      { id: 'organizations', path: '/organizations', minRole: 'admin' },
      { id: 'settings', path: '/settings' },
      { id: 'healthNews', path: '/health-news', minRole: 'org_admin' },
      { id: 'supportTickets', path: '/support-tickets', minRole: 'provider' },
      { id: 'insurance', path: '/insurance', minRole: 'admin' },
      { id: 'subscriptions', path: '/subscriptions', minRole: 'admin' },
      { id: 'wallet', path: '/wallet', minRole: 'org_admin' },
      { id: 'pricing', path: '/pricing', minRole: 'org_admin' },
      { id: 'notFound', path: '*', public: true },
    ];

    expect(APP_ROUTE_METADATA).toEqual(expectedMetadata);
    const componentIds = [...routes.matchAll(/^\s{2}(\w+): (?:lazyNamedPage|UnauthorizedPage)/gm)]
      .map((match) => match[1]);

    expect(componentIds).toEqual(expectedMetadata.map(({ id }) => id));
    expect((routes.match(/: lazyNamedPage\(/g) || [])).toHaveLength(23);
    expect(routes).toContain('unauthorized: UnauthorizedPage');
    expect(routes).toContain('if (isPublic) return page;');
    expect(routes).toContain('if (minRole) return <ProtectedRoute minRole={minRole}>{page}</ProtectedRoute>;');
    expect(routes).toContain('<AuthProvider pathname={location.pathname}>');
    expect(routes).toContain('<React.Suspense fallback={<RouteLoadingState />}>');
    expect(routes).toContain('{APP_ROUTE_METADATA.map((route) => (');
  });

  it('preserves layout-provider order and responsive shell behavior', () => {
    const layout = layoutSource();
    const shell = shellSource();

    expectInOrder(layout, [
      '<MapProvider>',
      '<PageDataProvider>',
      '<NavigationProvider>',
      '<LayoutProvider>',
      '<AppShell>',
    ]);
    expect(shell).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(shell).toContain('const isMobile = window.innerWidth < 768;');
    expect(shell).toContain('const isBleedPage = !hideNav && pageShellConfig?.bleed;');
    expect(shell).toContain('{!hideNav && <SmartHeader />}');
    expect(shell).toContain('<IslandNavigation />');
    expect(shell).toContain('id="main-content"');
    expect(shell).toContain('<ContextPanelShell />');
    expect(shell).toContain('<SmartFooter />');
    expect(shell).toContain('{!pageShellConfig?.hideFab && <ContextAwareFAB />}');
    expect(shell).toContain('<DynamicBottomBar />');
    expect(shell).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
  });

  it('preserves public and unknown-route shell suppression', () => {
    expect(PUBLIC_SHELL_ROUTES).toEqual([
      '/login',
      '/set-password',
      '/onboarding',
      '/onboarding-success',
      '/unauthorized',
    ]);
    expect(AUTHENTICATED_SHELL_ROUTES).toEqual(APP_ROUTE_METADATA
      .filter((route) => !route.public)
      .map((route) => route.path));
    expect(normalizeShellPath('/analytics/')).toBe('/analytics');
    expect(normalizeShellPath('/')).toBe('/');
    expect(shouldHideShellChrome('/login')).toBe(true);
    expect(shouldHideShellChrome('/analytics')).toBe(false);
    expect(shouldHideShellChrome('/analytics/')).toBe(false);
    expect(shouldHideShellChrome('/unknown')).toBe(true);
  });

  it('preserves the structural startup loading treatment', () => {
    const loading = loadingSource();

    expect(loading).toContain('data-testid="route-loading-state"');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain('Loading page');
    expect(loading).toContain('relative min-h-[calc(100dvh-3rem)] overflow-hidden');
    expect(loading).toContain('animate-pulse bg-muted/38');
    expect(appSource()).toContain('rounded-pill shadow-2xl');
  });
});
