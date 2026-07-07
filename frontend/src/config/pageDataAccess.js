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

function getRouteOwnedStartupDomains(pathname = '') {
  if (pathname === '/map' || pathname.startsWith('/map/')) {
    return ['map'];
  }

  if (pathname === '/emergencies' || pathname.startsWith('/emergencies/')) {
    return ['emergency'];
  }

  if (pathname === '/visits' || pathname.startsWith('/visits/')) {
    return ['visits'];
  }

  if (pathname === '/analytics' || pathname.startsWith('/analytics/')) {
    return ['analytics'];
  }

  if (pathname === '/verification' || pathname.startsWith('/verification/')) {
    return ['verification'];
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return ['users'];
  }

  if (pathname === '/doctors' || pathname.startsWith('/doctors/')) {
    return ['doctors'];
  }

  if (pathname === '/hospitals' || pathname.startsWith('/hospitals/')) {
    return ['hospitals'];
  }

  if (pathname === '/ambulances' || pathname.startsWith('/ambulances/')) {
    return ['ambulances'];
  }

  if (pathname === '/wallet' || pathname.startsWith('/wallet/')) {
    return ['wallet'];
  }

  if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
    return ['pricing'];
  }

  if (pathname === '/support-tickets' || pathname.startsWith('/support-tickets/')) {
    return ['supportTickets'];
  }

  if (pathname === '/insurance' || pathname.startsWith('/insurance/')) {
    return ['insurance'];
  }

  if (pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')) {
    return ['subscriptions'];
  }

  if (pathname === '/organizations' || pathname.startsWith('/organizations/')) {
    return ['organizations'];
  }

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return ['settings'];
  }

  return [];
}

export function getRouteStartupDomainOverride(pathname = '') {
  if (pathname === '/map' || pathname.startsWith('/map/')) {
    return [];
  }

  if (pathname === '/emergencies' || pathname.startsWith('/emergencies/')) {
    return [];
  }

  if (pathname === '/visits' || pathname.startsWith('/visits/')) {
    return [];
  }

  if (pathname === '/analytics' || pathname.startsWith('/analytics/')) {
    return [];
  }

  if (pathname === '/verification' || pathname.startsWith('/verification/')) {
    return [];
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return [];
  }

  if (pathname === '/doctors' || pathname.startsWith('/doctors/')) {
    return [];
  }

  if (pathname === '/hospitals' || pathname.startsWith('/hospitals/')) {
    return [];
  }

  if (pathname === '/ambulances' || pathname.startsWith('/ambulances/')) {
    return [];
  }

  if (pathname === '/wallet' || pathname.startsWith('/wallet/')) {
    return [];
  }

  if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
    return [];
  }

  if (pathname === '/support-tickets' || pathname.startsWith('/support-tickets/')) {
    return [];
  }

  if (pathname === '/insurance' || pathname.startsWith('/insurance/')) {
    return [];
  }

  if (pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')) {
    return [];
  }

  if (pathname === '/organizations' || pathname.startsWith('/organizations/')) {
    return [];
  }

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return [];
  }

  return null;
}

export function routeOwnsStartupDomains(pathname = '') {
  return Array.isArray(getRouteStartupDomainOverride(pathname));
}

export function getPageDataStartupDomainsForRole(role, pathname = '') {
  const {
    canLoadProviderData,
    canLoadAnalyticsData,
    canLoadOrgData,
    canLoadAdminData,
  } = getPageDataAccessForRole(role);

  const domains = [];

  if (canLoadProviderData) {
    domains.push('emergency', 'visits');
  }

  if (canLoadAnalyticsData) {
    domains.push('analytics');
  }

  if (canLoadOrgData) {
    domains.push(
      'verification',
      'doctors',
      'hospitals',
      'ambulances',
      'users',
      'wallet',
      'pricing'
    );
  }

  if (canLoadAdminData) {
    domains.push('organizations');
  }

  const routeStartupOverride = getRouteStartupDomainOverride(pathname);
  if (Array.isArray(routeStartupOverride)) {
    return routeStartupOverride.filter((domain) => domains.includes(domain));
  }

  const routeOwnedDomains = getRouteOwnedStartupDomains(pathname);
  if (routeOwnedDomains.length === 0) return domains;

  return domains.filter((domain) => !routeOwnedDomains.includes(domain));
}
