import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useIslandNavigationController } from './useIslandNavigationController';

const mockNavigate = jest.fn();
const mockSetSidebarMode = jest.fn();
const mockToggleTheme = jest.fn();
const mockCan = jest.fn();
const mockGetAccessibleNav = jest.fn();

let mockAuthState;
let mockLayoutState;
let mockLocationState;
let mockThemeState;

jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocationState,
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../config/navigation', () => ({
  getAccessibleNav: (...args) => mockGetAccessibleNav(...args),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../../../contexts/LayoutContext', () => ({
  useLayout: () => mockLayoutState,
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => mockThemeState,
}));

const accessibleNav = {
  main: [{ id: 'today', label: 'Today', path: '/' }],
  ops: { id: 'ops', items: [{ id: 'requests', path: '/emergencies' }] },
  mgmt: { id: 'mgmt', items: [{ id: 'doctors', path: '/doctors' }] },
  finance: { id: 'finance', items: [{ id: 'wallet', path: '/wallet' }] },
};

describe('useIslandNavigationController', () => {
  let container;
  let latest;
  let root;

  const Harness = () => {
    latest = useIslandNavigationController();
    return null;
  };

  const renderHarness = async () => {
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockAuthState = {
      profile: { id: 'profile-1', role: 'org_admin', full_name: 'Ada Lovelace' },
      user: { id: 'user-1' },
      can: mockCan,
    };
    mockLayoutState = {
      sidebarMode: 'smart',
      setSidebarMode: mockSetSidebarMode,
      isScrolledDown: false,
    };
    mockLocationState = { pathname: '/doctors/' };
    mockThemeState = { theme: 'dark', toggle: mockToggleTheme };
    mockGetAccessibleNav.mockReturnValue(accessibleNav);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('derives role-filtered navigation and opens the active route group', async () => {
    await renderHarness();

    expect(mockGetAccessibleNav).toHaveBeenCalledWith(mockAuthState.profile, mockCan);
    expect(latest.accessibleNav).toBe(accessibleNav);
    expect(latest.openGroups).toEqual(['mgmt']);
    expect(latest.pathname).toBe('/doctors');
    expect(latest.avatarToneClass).toContain('bg-blue-500/15');
  });

  it('preserves smart reveal, navigation, back, and keyboard cleanup behavior', async () => {
    await renderHarness();

    expect(latest.isBroad).toBe(false);
    expect(latest.navWidth).toBe(72);

    act(() => latest.onNavMouseEnter());
    expect(latest.isBroad).toBe(true);
    expect(latest.navWidth).toBe(260);

    act(() => latest.handleNavigate('/settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(latest.isBroad).toBe(false);

    act(() => latest.onNavFocus());
    expect(latest.isBroad).toBe(true);
    act(() => latest.handleNavKeyDown({ key: 'Escape' }));
    expect(latest.isBroad).toBe(false);

    act(() => latest.handleBack());
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('keeps one group open and delays layout-dialog dismissal for feedback', async () => {
    jest.useFakeTimers();
    await renderHarness();

    act(() => latest.toggleGroup('mgmt'));
    expect(latest.openGroups).toEqual([]);
    act(() => latest.toggleGroup('finance'));
    expect(latest.openGroups).toEqual(['finance']);

    act(() => latest.setConfigOpen(true));
    expect(latest.configOpen).toBe(true);
    act(() => latest.handleSidebarModeSelect('expanded'));
    expect(mockSetSidebarMode).toHaveBeenCalledWith('expanded');
    expect(latest.configOpen).toBe(true);

    act(() => jest.advanceTimersByTime(200));
    expect(latest.configOpen).toBe(false);
  });
});
