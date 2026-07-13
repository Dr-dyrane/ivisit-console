const RESPONDER_PROVIDER_TYPES = new Set([
  'driver',
  'paramedic',
  'ambulance',
  'ambulance_service',
]);

const TODAY_STARTUP_DOMAINS = Object.freeze({
  admin: Object.freeze(['emergency', 'verification', 'doctors', 'users']),
  org_admin: Object.freeze(['emergency', 'verification', 'doctors', 'users']),
  provider: Object.freeze(['emergency', 'visits']),
  sponsor: Object.freeze(['analytics']),
  viewer: Object.freeze([]),
  patient: Object.freeze([]),
});

const isTodayPath = (pathname = '') => pathname === '' || pathname === '/';

export function getPageDataAccessForRole(role) {
  const userRole = role || 'viewer';
  const canLoadProviderData = ['provider', 'org_admin', 'admin'].includes(userRole);
  const canLoadSponsorData = userRole === 'sponsor';
  const canLoadOrgData = ['org_admin', 'admin'].includes(userRole);
  const canLoadAdminData = userRole === 'admin';
  const canLoadAnalyticsData = canLoadSponsorData || canLoadOrgData;

  return {
    canLoadProviderData,
    canLoadSponsorData,
    canLoadAnalyticsData,
    canLoadOrgData,
    canLoadAdminData,
  };
}

export function getRouteStartupDomainOverride(pathname = '') {
  return isTodayPath(pathname) ? null : [];
}

export function routeOwnsStartupDomains(pathname = '') {
  return !isTodayPath(pathname);
}

export function getPageDataStartupDomainsForRole(role, pathname = '', providerType) {
  if (routeOwnsStartupDomains(pathname)) return [];

  const userRole = role || 'viewer';
  if (userRole === 'provider' && RESPONDER_PROVIDER_TYPES.has(providerType)) {
    return ['emergency'];
  }

  return [...(TODAY_STARTUP_DOMAINS[userRole] || TODAY_STARTUP_DOMAINS.viewer)];
}
