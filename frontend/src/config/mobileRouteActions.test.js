import { getProtectedRoutesForRole } from './routes';
import { canReachRoute, getRouteOwnedMobileAction } from './mobileRouteActions';

const CONSOLE_ROLES = ['viewer', 'provider', 'sponsor', 'org_admin', 'admin'];
const todayReadAction = {
  route: '/',
  icon: () => null,
  label: 'Refresh today',
  color: 'utility',
  action: jest.fn(),
};

describe('mobile route actions', () => {
  it.each(CONSOLE_ROLES)('provides one honest action on every protected route reachable by %s', (role) => {
    const reachableRoutes = getProtectedRoutesForRole(role);

    reachableRoutes.forEach((route) => {
      const pageAction = route === '/' ? todayReadAction : null;
      expect(getRouteOwnedMobileAction(route, role, pageAction)).toEqual(expect.objectContaining({
        label: expect.any(String),
        icon: expect.anything(),
      }));
    });
  });

  it('keeps request creation role-gated while providers receive the proved read action', () => {
    expect(getRouteOwnedMobileAction('/emergencies', 'admin')?.label).toBe('New request');
    expect(getRouteOwnedMobileAction('/emergencies', 'org_admin')?.label).toBe('New request');
    expect(getRouteOwnedMobileAction('/emergencies', 'provider')?.label).toBe('Request stats');
  });

  it('uses the registered Today read action only for roles without request-create authority', () => {
    expect(getRouteOwnedMobileAction('/', 'viewer', todayReadAction)).toBe(todayReadAction);
    expect(getRouteOwnedMobileAction('/', 'provider', todayReadAction)).toBe(todayReadAction);
    expect(getRouteOwnedMobileAction('/', 'sponsor', todayReadAction)).toBe(todayReadAction);
    expect(getRouteOwnedMobileAction('/', 'admin', todayReadAction)?.label).toBe('New request');
  });

  it('does not leak a registered page action onto another route', () => {
    expect(getRouteOwnedMobileAction('/not-a-route', 'viewer', todayReadAction)).toBeNull();
  });

  it('keeps read-only financial actions free of money movement or policy mutation', () => {
    expect(getRouteOwnedMobileAction('/wallet', 'org_admin')?.label).toBe('Payment stats');
    expect(getRouteOwnedMobileAction('/insurance', 'admin')?.label).toBe('Policy stats');
  });

  it('uses receiver-backed read actions for fail-closed management pages', () => {
    const dispatch = jest.spyOn(window, 'dispatchEvent');
    const organizations = getRouteOwnedMobileAction('/organizations', 'admin');
    const subscribers = getRouteOwnedMobileAction('/subscriptions', 'admin');
    const pricing = getRouteOwnedMobileAction('/pricing', 'org_admin');

    expect(organizations?.label).toBe('Organization stats');
    expect(subscribers?.label).toBe('Subscriber stats');
    expect(pricing?.label).toBe('Pricing stats');
    organizations.action();
    subscribers.action();
    pricing.action();
    expect(dispatch.mock.calls.map(([event]) => event.type)).toEqual([
      'openAnalyticsModal',
      'openAnalyticsModal',
      'openPricingAnalytics',
    ]);
    dispatch.mockRestore();
  });

  it('keeps platform facility review separate from hospital operations', () => {
    expect(getRouteOwnedMobileAction('/hospitals', 'admin')?.label).toBe('Facility approvals');
    expect(getRouteOwnedMobileAction('/hospitals', 'org_admin')?.label).toBe('Hospital stats');
  });

  it('keeps responder providers out of the clinician Visits action', () => {
    const driver = { role: 'provider', provider_type: 'driver' };
    expect(canReachRoute(driver, '/visits')).toBe(false);
    expect(canReachRoute(driver, '/map')).toBe(true);
    expect(getRouteOwnedMobileAction('/visits', driver)).toBeNull();
    expect(getRouteOwnedMobileAction('/map', driver)?.label).toBe('Center map');
  });
});
