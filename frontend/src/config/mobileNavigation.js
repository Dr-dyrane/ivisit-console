import { ROLE_LEVELS } from './navigation';

export const MOBILE_NAV_CHROME = {
  overflowOwner: 'avatar',
  bottomMenuButton: false,
  contextualFab: 'page-action',
};

// Dock slots rank by OPERATIONAL importance for the role — Settings does not claim
// a slot by right (the avatar sheet owns overflow, see MOBILE_NAV_CHROME above).
// Admin's daily work is requests + approvals (the Today hero's own signals), then map;
// Settings stays reachable via the avatar sheet.
const roleSlots = {
  admin: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'approvals', path: '/verification', label: 'Approvals' },
    { id: 'map', path: '/map', label: 'Map' },
  ],
  org_admin: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'approvals', path: '/verification', label: 'Approvals' },
    { id: 'staff', path: '/doctors', label: 'Staff' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
  // No Map slot: routes.jsx excludes sponsor from /map (excludedRoles), so a
  // sponsor tap on Map would dead-end at /unauthorized.
  sponsor: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'statistics', path: '/analytics', label: 'Statistics' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
  provider: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'visits', path: '/visits', label: 'Visits' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
  // Responder providers (driver/paramedic/ambulance crews): the driver Today
  // lens promotes /map, and /visits is a dead-end for responders — swap
  // Visits for Map while keeping the provider request loop.
  driver: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'map', path: '/map', label: 'Map' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
  // No Map slot: routes.jsx gates /map at minRole provider, so a viewer tap
  // on Map would dead-end at /unauthorized.
  viewer: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
};

// provider_type values that resolve to the responder (driver) slate when the
// role itself resolves provider.
const RESPONDER_PROVIDER_TYPES = ['driver', 'paramedic', 'ambulance', 'ambulance_service'];

export function getMobileNavigationItems(role = 'viewer', providerType = undefined) {
  const userRole = role || 'viewer';
  const userLevel = ROLE_LEVELS[userRole] || 0;

  if (userLevel >= ROLE_LEVELS.admin) return roleSlots.admin;
  if (userLevel >= ROLE_LEVELS.org_admin) return roleSlots.org_admin;
  if (userRole === 'sponsor') return roleSlots.sponsor;
  if (userLevel >= ROLE_LEVELS.provider) {
    if (RESPONDER_PROVIDER_TYPES.includes(providerType)) return roleSlots.driver;
    return roleSlots.provider;
  }
  return roleSlots.viewer;
}
