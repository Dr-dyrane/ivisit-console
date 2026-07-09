import fs from 'fs';
import { getMobileNavigationItems, MOBILE_NAV_CHROME } from '../../config/mobileNavigation';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { NAV_CONFIG, getAccessibleNav } from '../../config/navigation';

describe('Navigation shell contract', () => {
  const appSource = () => fs.readFileSync('src/App.js', 'utf8');
  const islandSource = () => fs.readFileSync('src/components/common/IslandNavigation.jsx', 'utf8');
  const railSource = () => fs.readFileSync('src/components/common/ConsoleModuleRail.jsx', 'utf8');
  const mobileMenuSource = () => fs.readFileSync('src/components/navigation/MobileNavMenu.jsx', 'utf8');
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
  const smartHeaderSource = () => fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
  const layoutSource = () => fs.readFileSync('src/contexts/LayoutContext.jsx', 'utf8');
  const supportHookSource = () => fs.readFileSync('src/hooks/useSupportTickets.js', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps the desktop app shell owning one left navigation surface', () => {
    const app = appSource();
    const island = islandSource();
    const hardgate = hardgateSource();

    expect(app).toContain('<IslandNavigation />');
    expect(app).toContain('<SmartHeader />');
    expect(app).toContain('id="main-content"');
    expect(app).toContain('<ContextPanelShell />');
    expect(app).toContain('<SmartFooter />');
    expect(app).toContain('{!pageShellConfig?.hideFab && <ContextAwareFAB />}');
    expect(app).toContain('<DynamicBottomBar />');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(app).toContain('<GlobalFinancialModals />');
    expect(app).toContain('const isBleedPage = !hideNav && pageShellConfig?.bleed;');
    expect(app).toContain('className={isBleedPage ? "" : "md:p-6"}');
    expect(app).toContain('hidden md:block');
    expect(island).toContain('data-desktop-nav-shell="true"');
    expect(island).toContain('aria-label="Primary desktop"');
    expect(island).toContain('aria-current={isActive ? \'page\' : undefined}');
    expect(island).toContain('data-desktop-nav-item={item.id}');
    expect(island).toContain('data-state={isActive ? \'active\' : \'idle\'}');
    expect(island).toContain('data-desktop-nav-group={id}');
    expect(island).toContain('aria-label={`${isOpen ? \'Hide\' : \'Show\'} ${label}`}');
    expect(island).not.toContain('hover-glow');
    expect(island).not.toContain("import ThemeToggle");
    expect(island).not.toContain('role="button"');
    expect(hardgate).toContain('src/components/common/IslandNavigation.jsx');
  });

  it('keeps visible navigation group labels simple and role-readable', () => {
    const adminNav = getAccessibleNav({ role: 'admin' });
    const providerNav = getAccessibleNav({ role: 'provider' });

    expect(NAV_CONFIG.ops.label).toBe('Care');
    expect(NAV_CONFIG.mgmt.label).toBe('Admin');
    expect(NAV_CONFIG.finance.label).toBe('Payments');
    expect(NAV_CONFIG.user.label).toBe('Account');

    expect(adminNav.ops.label).toBe('Care');
    expect(adminNav.mgmt.label).toBe('Admin');
    expect(adminNav.finance.label).toBe('Payments');
    expect(providerNav.ops.label).toBe('Care');
    expect(providerNav.mgmt.label).toBe('Admin');

    expect([
      NAV_CONFIG.ops.label,
      NAV_CONFIG.mgmt.label,
      NAV_CONFIG.finance.label,
      NAV_CONFIG.user.label,
    ]).not.toEqual(expect.arrayContaining(['Operations', 'Management', 'Finance']));
  });

  it('keeps LayoutContext as the route shell state owner', () => {
    const layout = layoutSource();

    expect(layout).toContain('const [headerConfig, setHeaderConfig] = useState');
    expect(layout).toContain('const [footerConfig, setFooterConfig] = useState');
    expect(layout).toContain('const [pageShellConfig, setPageShellConfig] = useState({ bleed: false, hideFab: false });');
    expect(layout).toContain('const openContextPanel = useCallback(() =>');
    expect(layout).toContain('const closeContextPanel = useCallback(() =>');
    expect(layout).toContain('setIsContextPanelOpen(false);');
    expect(layout).toContain('[location.pathname]');
    expect(layout).toContain("window.addEventListener('modal-opened', handleModalOpen)");
    expect(layout).toContain('export const usePageShell = ({ bleed = false, hideFab = false } = {}) =>');
    expect(layout).toContain('setPageShellConfig({ bleed, hideFab });');
    expect(layout).toContain('setPageShellConfig({ bleed: false, hideFab: false });');
  });

  it('keeps sidebar layout controls accessible without private dialog chrome', () => {
    const island = islandSource();

    expect(island).toContain("import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';");
    expect(island).toContain('aria-haspopup="dialog"');
    expect(island).toContain('aria-expanded={configOpen}');
    expect(island).toContain('style={{ borderWidth: 0 }}');
    expect(island).toContain('<DialogDescription className="sr-only">');
    expect(island).toContain('Choose how the desktop sidebar opens and stays visible.');
    expect(island).toContain('aria-pressed={sidebarMode === item.id}');
    expect(island).toContain('aria-label="Toggle theme"');
  });

  it('keeps Today and Requests using the shared route module rail, not private page sidebars', () => {
    const rail = railSource();
    const hardgate = hardgateSource();

    expect(getConsoleModuleRailItems('admin').map((item) => item.label)).toEqual([
      'Today',
      'Requests',
      'Staff',
      'Payments',
      'Help',
    ]);
    expect(getConsoleModuleRailItems('sponsor').map((item) => item.label)).toEqual([
      'Today',
      'Statistics',
    ]);
    expect(rail).toContain('aria-current={isActive ? \'page\' : undefined}');
    expect(rail).toContain('data-console-rail={id}');
    expect(rail).toContain('data-state={isOpening ? \'opening\' : \'idle\'}');
    expect(hardgate).toContain('src/components/common/ConsoleModuleRail.jsx');
    expect(hardgate).toContain('src/config/consoleModuleRail.js');
  });

  it('keeps mobile navigation split between bottom island and avatar sheet', () => {
    const mobileMenu = mobileMenuSource();
    const bottomBar = bottomBarSource();
    const smartHeader = smartHeaderSource();
    const hardgate = hardgateSource();

    expect(MOBILE_NAV_CHROME).toEqual({
      overflowOwner: 'avatar',
      bottomMenuButton: false,
      contextualFab: 'page-action',
    });
    expect(getMobileNavigationItems('admin').map((item) => item.label)).toEqual(['Today', 'Requests', 'Map', 'Settings']);
    expect(getMobileNavigationItems('provider').map((item) => item.label)).toEqual(['Today', 'Requests', 'Visits', 'Settings']);
    expect(mobileMenu).toContain("const [activeTab, setActiveTab] = useState('menu')");
    expect(mobileMenu).toContain('const isFinance = accessibleNav.finance?.items.some(item => item.path === location.pathname);');
    expect(mobileMenu).toContain("else if (isFinance) setActiveGroup('finance');");
    expect(mobileMenu).toContain("{['ops', 'mgmt', 'finance'].map(groupId => {");
    expect(mobileMenu).toContain('aria-label="Show quick actions"');
    expect(mobileMenu).toContain('Quick Actions');
    expect(mobileMenu).toContain('<ContextPanel />');
    expect(mobileMenu).not.toContain('Context</button>');
    expect(mobileMenu).not.toContain('Page Actions');
    expect(smartHeader).toContain('aria-label="Open account menu"');
    expect(smartHeader).toContain('aria-haspopup="dialog"');
    expect(smartHeader).toContain('aria-controls="quick-actions-panel"');
    expect(smartHeader).toContain("data-state={isContextPanelOpen ? 'open' : 'closed'}");
    expect(smartHeader).toContain("if (pathname.startsWith('/verification')) return 'Approvals';");
    expect(smartHeader).not.toContain("if (pathname.startsWith('/verification')) return 'Verification';");
    expect(smartHeader).toContain('<MobileNavMenu onClose={() => setMenuOpen(false)} />');
    expect(smartHeader).not.toContain('MenuIcon');
    expect(smartHeader).not.toContain('Hamburger');
    expect(bottomBar).toContain('getMobileNavigationItems(userRole)');
    expect(bottomBar).toContain('aria-current={isActive ? \'page\' : undefined}');
    expect(bottomBar).toContain('data-state={isActive ? \'active\' : \'idle\'}');
    expect(bottomBar).toContain('getRouteOwnedMobileAction(location.pathname, userRole)');
    expect(bottomBar).toContain('!hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />');
    expect(hardgate).toContain('src/components/navigation/MobileNavMenu.jsx');
    expect(hardgate).toContain('src/components/navigation/DynamicBottomBar.jsx');
    expect(hardgate).toContain('src/config/mobileNavigation.js');
  });

  it('keeps Today and Requests route actions from duplicating global FABs', () => {
    const fab = fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
    const bottomBar = bottomBarSource();

    expect(fab).toContain("location.pathname === '/'");
    expect(fab).toContain("location.pathname.startsWith('/emergencies')");
    expect(fab).toContain('const hideFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction');
    expect(fab).toContain('if (isMobile || isContextPanelOpen || hideFab) return null;');

    expect(bottomBar).toContain("location.pathname === '/'");
    expect(bottomBar).toContain("location.pathname.startsWith('/emergencies')");
    expect(bottomBar).toContain('const hideContextFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction;');
    expect(bottomBar).toContain('const routeOwnedAction = getRouteOwnedMobileAction(location.pathname, userRole);');
    expect(bottomBar).toContain('const showAnyAction = Boolean(routeOwnedAction) || !hideContextFab;');
    expect(bottomBar).toContain("if (pathname.startsWith('/emergencies') && (userRole === 'admin' || userRole === 'org_admin'))");
    expect(bottomBar).toContain("label: 'New request'");
    expect(bottomBar).toContain("action: () => window.dispatchEvent(new CustomEvent('openEmergencyModal'))");
    expect(bottomBar).not.toContain("if (pathname === '/')");
  });

  it('keeps global support actions command-only until the route owns support data', () => {
    const fab = fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
    const bottomBar = bottomBarSource();
    const supportHook = supportHookSource();

    expect(supportHook).toContain('autoFetch = true');
    expect(supportHook).toContain('autoSubscribe = true');
    expect(supportHook).toContain('quiet = false');
    expect(supportHook).toContain('const [loading, setLoading] = useState(Boolean(autoFetch));');
    expect(supportHook).toContain('if (!autoFetch) {');
    expect(supportHook).toContain('if (!autoSubscribe) return undefined;');
    expect(supportHook).toContain('quiet: Boolean(quiet || filter?.quiet)');

    expect(fab).toContain('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })');
    expect(bottomBar).toContain('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })');
    expect(fab).not.toContain('useSupportTickets()');
    expect(bottomBar).not.toContain('useSupportTickets()');
  });
});
