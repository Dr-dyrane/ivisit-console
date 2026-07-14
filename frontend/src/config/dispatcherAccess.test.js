import { getMobileNavigationItems } from './mobileNavigation';
import { getConsoleModuleRailItems } from './consoleModuleRail';
import { getAccessibleNav } from './navigation';
import { getPageDataStartupDomainsForRole } from './pageDataAccess';
import { getProtectedRoutesForRole } from './routes';

describe('dispatcher console access', () => {
  const expectedPaths = ['/', '/map', '/emergencies', '/settings'];

  it('exposes only the explicit dispatch workspace routes', () => {
    const protectedRoutes = getProtectedRoutesForRole('dispatcher');
    expect(protectedRoutes).toEqual(expect.arrayContaining(expectedPaths));
    expect(protectedRoutes).not.toContain('/analytics');
    expect(protectedRoutes).not.toContain('/visits');
    expect(protectedRoutes).not.toContain('/wallet');

    const nav = getAccessibleNav({ role: 'dispatcher' });
    const paths = [
      ...nav.main,
      ...(nav.ops?.items || []),
      ...(nav.user?.items || []),
    ].map((item) => item.path);
    expect(paths).toEqual(expect.arrayContaining(expectedPaths));
    expect(paths).not.toContain('/analytics');
  });

  it('uses a four-slot dispatch dock and loads only emergency startup data', () => {
    expect(getMobileNavigationItems('dispatcher').map((item) => item.path))
      .toEqual(['/', '/emergencies', '/map', '/settings']);
    expect(getConsoleModuleRailItems('dispatcher').map((item) => item.path))
      .toEqual(['/', '/emergencies', '/map', '/settings']);
    expect(getPageDataStartupDomainsForRole('dispatcher', '/'))
      .toEqual(['emergency']);
  });
});
