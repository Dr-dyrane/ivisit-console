import { ROLE_LEVELS } from './navigation';

export const MOBILE_NAV_CHROME = {
  overflowOwner: 'avatar',
  bottomMenuButton: false,
  contextualFab: 'page-action',
};

const roleSlots = {
  admin: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'map', path: '/map', label: 'Map' },
  ],
  org_admin: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'approvals', path: '/verification', label: 'Approvals' },
    { id: 'staff', path: '/doctors', label: 'Staff' },
  ],
  sponsor: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'statistics', path: '/analytics', label: 'Statistics' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
  provider: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'visits', path: '/visits', label: 'Visits' },
  ],
  viewer: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'settings', path: '/settings', label: 'Settings' },
  ],
};

export function getMobileNavigationItems(role = 'viewer') {
  const userRole = role || 'viewer';
  const userLevel = ROLE_LEVELS[userRole] || 0;

  if (userLevel >= ROLE_LEVELS.admin) return roleSlots.admin;
  if (userLevel >= ROLE_LEVELS.org_admin) return roleSlots.org_admin;
  if (userRole === 'sponsor') return roleSlots.sponsor;
  if (userLevel >= ROLE_LEVELS.provider) return roleSlots.provider;
  return roleSlots.viewer;
}
