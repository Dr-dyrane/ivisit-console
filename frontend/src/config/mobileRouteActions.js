import {
  BarChart3,
  ClipboardCheck,
  FileCheck,
  Navigation,
  Plus,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { getAccessibleNav } from './navigation';
import { getRouteProtection } from './routes';

const getAccessiblePaths = (profile, canHelper) => {
  const navigation = getAccessibleNav(profile, canHelper);
  return [
    ...(navigation.main || []),
    ...(navigation.ops?.items || []),
    ...(navigation.mgmt?.items || []),
    ...(navigation.finance?.items || []),
    ...(navigation.user?.items || []),
  ].map((item) => item.path);
};

export const canReachRoute = (profileOrRole, to = '', canHelper) => {
  const profile = typeof profileOrRole === 'string'
    ? { role: profileOrRole }
    : (profileOrRole || { role: 'viewer' });
  const route = String(to).split('?')[0];
  const protection = getRouteProtection(route);
  if (!getAccessiblePaths(profile, canHelper).includes(route)) return false;
  if (canHelper && protection?.resource && !canHelper('view', protection.resource)) return false;
  return true;
};

const pageActionMatchesRoute = (pageAction, pathname) => {
  const owner = pageAction?.route;
  if (!owner) return false;
  return owner === '/' ? pathname === '/' : pathname.startsWith(owner);
};

const dispatchWindowEvent = (name) => () => {
  window.dispatchEvent(new CustomEvent(name));
};

/**
 * Resolve the one mobile dock action owned by the current route and role.
 *
 * Existing window events remain compatibility receivers for pages that have not
 * yet moved to PageActionsContext. A registered page action is accepted only for
 * its declaring route, preventing a stale action from leaking during navigation.
 */
export const getRouteOwnedMobileAction = (
  pathname = '',
  profileOrRole = 'viewer',
  pageAction = null,
  canHelper,
) => {
  const userRole = typeof profileOrRole === 'string'
    ? profileOrRole
    : (profileOrRole?.role || 'viewer');
  const canReach = (to) => canReachRoute(profileOrRole, to, canHelper);

  if (pathname === '/') {
    if (userRole === 'admin' || userRole === 'org_admin') {
      return {
        icon: Plus,
        label: 'New request',
        color: 'destructive',
        modal: 'emergency',
      };
    }

    return pageActionMatchesRoute(pageAction, pathname) ? pageAction : null;
  }

  if (pathname.startsWith('/emergencies') && canReach('/emergencies')) {
    if (userRole === 'admin' || userRole === 'org_admin') {
      return {
        icon: Plus,
        label: 'New request',
        color: 'destructive',
        action: dispatchWindowEvent('openEmergencyModal'),
      };
    }

    return {
      icon: BarChart3,
      label: 'Request stats',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/map') && canReach('/map')) {
    return {
      icon: Navigation,
      label: 'Center map',
      color: 'utility',
      action: dispatchWindowEvent('mapRecenterRequested'),
    };
  }

  if (pathname.startsWith('/settings') && canReach('/settings')) {
    return {
      icon: ShieldCheck,
      label: 'Security',
      color: 'utility',
      action: dispatchWindowEvent('openSecurityModal'),
    };
  }

  if (pathname.startsWith('/analytics') && canReach('/analytics')) {
    return {
      icon: BarChart3,
      label: 'View statistics',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/doctors') && canReach('/doctors')) {
    return {
      icon: Stethoscope,
      label: 'Add staff',
      color: 'staff',
      action: dispatchWindowEvent('openDoctorModal'),
    };
  }

  if (pathname.startsWith('/visits') && canReach('/visits')) {
    return {
      icon: BarChart3,
      label: 'View statistics',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/hospitals') && canReach('/verification')) {
    return {
      icon: FileCheck,
      label: 'Facility approvals',
      color: 'staff',
      to: '/verification?queue=organizations',
    };
  }

  if (pathname.startsWith('/ambulances') && canReach('/ambulances')) {
    return {
      icon: Plus,
      label: 'Add unit',
      color: 'staff',
      action: dispatchWindowEvent('openAmbulanceModal'),
    };
  }

  if (pathname.startsWith('/support-tickets') && canReach('/support-tickets')) {
    return {
      icon: ClipboardCheck,
      label: 'New ticket',
      color: 'staff',
      action: dispatchWindowEvent('openSupportTicketModal'),
    };
  }

  if (pathname.startsWith('/verification') && canReach('/verification')) {
    return {
      icon: ShieldCheck,
      label: 'Review pending',
      color: 'staff',
      action: dispatchWindowEvent('approvalsReviewPending'),
    };
  }

  if (pathname.startsWith('/users') && canReach('/users')) {
    return {
      icon: UserPlus,
      label: 'Invite user',
      color: 'staff',
      action: dispatchWindowEvent('openUserModal'),
    };
  }

  if (pathname.startsWith('/organizations') && canReach('/organizations')) {
    return {
      icon: BarChart3,
      label: 'Organization stats',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/health-news') && canReach('/health-news')) {
    return {
      icon: BarChart3,
      label: 'News stats',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/wallet') && canReach('/wallet')) {
    return {
      icon: BarChart3,
      label: 'Payment stats',
      color: 'utility',
      action: dispatchWindowEvent('openWalletAnalytics'),
    };
  }

  if (pathname.startsWith('/insurance') && canReach('/insurance')) {
    return {
      icon: BarChart3,
      label: 'Policy stats',
      color: 'utility',
      action: dispatchWindowEvent('openInsuranceAnalytics'),
    };
  }

  if (pathname.startsWith('/subscriptions') && canReach('/subscriptions')) {
    return {
      icon: BarChart3,
      label: 'Subscriber stats',
      color: 'utility',
      action: dispatchWindowEvent('openAnalyticsModal'),
    };
  }

  if (pathname.startsWith('/pricing') && canReach('/pricing')) {
    return {
      icon: BarChart3,
      label: 'Pricing stats',
      color: 'utility',
      action: dispatchWindowEvent('openPricingAnalytics'),
    };
  }

  return pageActionMatchesRoute(pageAction, pathname) ? pageAction : null;
};
