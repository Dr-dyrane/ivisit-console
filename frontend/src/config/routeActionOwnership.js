const ROUTE_ACTION_PREFIXES = [
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
  '/wallet',
  '/pricing',
  '/settings',
];

export const routeOwnsShellAction = (pathname = '') => (
  pathname === '/' || ROUTE_ACTION_PREFIXES.some((prefix) => pathname.startsWith(prefix))
);
