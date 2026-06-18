/**
 * Protected Routes Configuration
 * Maps all application routes to their protection requirements
 * Uses navigation config for consistent access control
 */

import { NAV_CONFIG } from './navigation';

/**
 * Route protection configuration
 * Each route specifies how it should be protected
 */
export const ROUTE_PROTECTION = {
  // Public routes
  '/': {
    public: true,
    title: 'Dashboard'
  },
  '/login': {
    public: true,
    title: 'Login'
  },
  '/unauthorized': {
    public: true,
    title: 'Unauthorized'
  },
  '/map': {
    public: false,
    minRole: 'provider',
    resource: 'map',
    title: 'Live Map'
  },

  // Protected routes - use navigation config for access control
  '/analytics': {
    minRole: 'provider',
    resource: 'analytics',
    title: 'Statistics'
  },

  // Operations routes
  '/visits': {
    minRole: 'provider',
    resource: 'visits',
    title: 'Visits'
  },
  '/emergencies': {
    minRole: 'provider',
    resource: 'emergencies',
    title: 'Emergencies'
  },
  '/hospitals': {
    minRole: 'org_admin',
    resource: 'hospitals',
    title: 'Hospitals'
  },
  '/ambulances': {
    minRole: 'org_admin',
    resource: 'ambulances',
    title: 'Ambulances'
  },
  '/doctors': {
    minRole: 'org_admin',
    resource: 'doctors',
    title: 'Doctors'
  },

  // Management routes
  '/support-tickets': {
    minRole: 'provider',
    resource: 'support',
    title: 'Support'
  },
  '/health-news': {
    minRole: 'provider',
    resource: 'news',
    title: 'Health News'
  },
  '/verification': {
    minRole: 'org_admin',
    resource: 'verification',
    title: 'Queue'
  },
  '/users': {
    minRole: 'org_admin',
    resource: 'users',
    title: 'Users'
  },
  '/insurance': {
    minRole: 'admin',
    resource: 'insurance',
    title: 'Insurance'
  },
  '/subscriptions': {
    minRole: 'admin',
    resource: 'subscriptions',
    title: 'Subscriptions'
  },
  '/wallet': {
    minRole: 'org_admin',
    resource: 'wallet',
    title: 'Wallet'
  },
  '/pricing': {
    minRole: 'org_admin',
    resource: 'pricing',
    title: 'Pricing'
  },
  '/settings': {
    minRole: 'viewer',
    resource: 'settings',
    title: 'Settings'
  },

  '/organizations': {
    minRole: 'admin',
    resource: 'organizations',
    title: 'Organizations'
  },
  '/set-password': {
    public: true,
    title: 'Set Password'
  },
  '/onboarding': {
    public: true,
    title: 'Onboarding'
  },
  '/onboarding-success': {
    public: true,
    title: 'Onboarding Complete'
  }
};

/**
 * Get route protection config for a path
 */
export function getRouteProtection(path) {
  return ROUTE_PROTECTION[path] || { public: false, minRole: 'admin' };
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(path) {
  const protection = getRouteProtection(path);
  return !protection.public;
}

/**
 * Get all protected routes for a user role
 */
export function getProtectedRoutesForRole(userRole) {
  return Object.entries(ROUTE_PROTECTION)
    .filter(([path, config]) => !config.public && isRoleAllowed(userRole, config))
    .map(([path]) => path);
}

/**
 * Check if a role is allowed for a route configuration
 */
function isRoleAllowed(userRole, config) {
  if (!config.minRole) return true;

  const ROLE_LEVELS = {
    patient: 10,
    viewer: 20,
    provider: 40,
    sponsor: 60,
    org_admin: 80,
    admin: 100
  };

  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[config.minRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Navigation-based route protection
 * Uses the same logic as navigation config
 */
export function checkRouteAccess(path, userProfile, canHelper) {
  // Public routes are always accessible
  if (ROUTE_PROTECTION[path]?.public) {
    return true;
  }

  // Get accessible navigation based on user profile
  const { getAccessibleNav } = require('./navigation');
  const accessibleNav = getAccessibleNav(userProfile, canHelper);

  // Check if current path is in accessible navigation
  const mainItem = accessibleNav.main?.find(item => item.path === path);
  if (mainItem) return true;

  const opsItem = accessibleNav.ops?.items?.find(item => item.path === path);
  if (opsItem) return true;

  const mgmtItem = accessibleNav.mgmt?.items?.find(item => item.path === path);
  if (mgmtItem) return true;

  // [BUG-FIX] Check finance and user groups as well
  const financeItem = accessibleNav.finance?.items?.find(item => item.path === path);
  if (financeItem) return true;

  const userItem = accessibleNav.user?.items?.find(item => item.path === path);
  if (userItem) return true;

  return false;
}

/**
 * Get route title for breadcrumbs and page headers
 */
export function getRouteTitle(path) {
  return ROUTE_PROTECTION[path]?.title || 'Unknown Page';
}

/**
 * Default export for convenience
 */
export default ROUTE_PROTECTION;
