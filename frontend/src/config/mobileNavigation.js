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
  // Admin order: the golden three (Today / Requests / Map) hold fixed slots; the
  // LAST slot is the morph slot — Approvals at rest, the current page when the
  // user is on any route outside the slate (see getMobileNavigationItems).
  admin: [
    { id: 'today', path: '/', label: 'Today' },
    { id: 'emergencies', path: '/emergencies', label: 'Requests' },
    { id: 'map', path: '/map', label: 'Map' },
    { id: 'approvals', path: '/verification', label: 'Approvals' },
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

// Wayfinding registry for the MORPH slot (user decision 2026-07-09): when the
// current route is not represented in the role's slate, the LAST pill becomes
// the current page so the dock always shows where you are. Longest prefix wins;
// routes not listed here (login, unknown) never morph.
const MORPH_ROUTE_SLOTS = [
  { prefix: '/verification', id: 'approvals', path: '/verification', label: 'Approvals' },
  { prefix: '/doctors', id: 'staff', path: '/doctors', label: 'Staff' },
  { prefix: '/visits', id: 'visits', path: '/visits', label: 'Visits' },
  { prefix: '/settings', id: 'settings', path: '/settings', label: 'Settings' },
  { prefix: '/analytics', id: 'statistics', path: '/analytics', label: 'Statistics' },
  { prefix: '/hospitals', id: 'hospitals', path: '/hospitals', label: 'Hospitals' },
  { prefix: '/ambulances', id: 'ambulances', path: '/ambulances', label: 'Ambulances' },
  { prefix: '/wallet', id: 'payments', path: '/wallet', label: 'Payments' },
  // /pricing and /subscriptions are deliberately ABSENT: their page contracts lock
  // those paths out of the mobile nav config entirely (desk-admin surfaces) — they
  // keep the resting slate instead of morphing.
  { prefix: '/insurance', id: 'insurance', path: '/insurance', label: 'Insurance' },
  { prefix: '/users', id: 'users', path: '/users', label: 'Users' },
  { prefix: '/organizations', id: 'organizations', path: '/organizations', label: 'Organizations' },
  { prefix: '/health-news', id: 'news', path: '/health-news', label: 'News' },
  { prefix: '/support-tickets', id: 'support', path: '/support-tickets', label: 'Support' },
];

export function getMobileNavigationItems(role = 'viewer', providerType = undefined, currentPath = undefined) {
  const userRole = role || 'viewer';
  const userLevel = ROLE_LEVELS[userRole] || 0;

  let slate = roleSlots.viewer;
  if (userLevel >= ROLE_LEVELS.admin) slate = roleSlots.admin;
  else if (userLevel >= ROLE_LEVELS.org_admin) slate = roleSlots.org_admin;
  else if (userRole === 'sponsor') slate = roleSlots.sponsor;
  else if (userLevel >= ROLE_LEVELS.provider) {
    slate = RESPONDER_PROVIDER_TYPES.includes(providerType) ? roleSlots.driver : roleSlots.provider;
  }

  // Morph the LAST slot into the current page when off-slate. On-slate routes
  // (the golden three + the role's own defaults) keep the resting slate intact.
  if (currentPath && !slate.some((item) => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path)))) {
    const morph = MORPH_ROUTE_SLOTS
      .filter((entry) => currentPath.startsWith(entry.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];
    if (morph && !slate.some((item) => item.id === morph.id)) {
      return [...slate.slice(0, -1), { id: morph.id, path: morph.path, label: morph.label }];
    }
  }

  return slate;
}
