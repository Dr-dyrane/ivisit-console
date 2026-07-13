import { routeOwnsShellAction } from './routeActionOwnership';

describe('route-owned shell actions', () => {
  it.each([
    '/',
    '/emergencies',
    '/users',
    '/visits',
    '/verification',
    '/doctors',
    '/hospitals',
    '/ambulances',
    '/health-news',
    '/support-tickets',
    '/insurance',
    '/organizations',
    '/subscriptions',
    '/map',
    '/analytics',
    '/wallet',
    '/pricing',
    '/settings',
  ])('keeps %s on its page-owned action or explicit no-action decision', (pathname) => {
    expect(routeOwnsShellAction(pathname)).toBe(true);
  });

  it('leaves unknown routes on the generic action path', () => {
    expect(routeOwnsShellAction('/not-a-console-route')).toBe(false);
  });
});
