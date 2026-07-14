import { useCallback } from 'react';

const ROLE_HIERARCHY = {
  admin: 5,
  org_admin: 4,
  sponsor: 3,
  provider: 2,
  viewer: 1,
};

export const useAuthCapabilities = (profile) => {
  const hasRole = useCallback((roles) => {
    if (!profile) return false;
    if (Array.isArray(roles)) return roles.includes(profile.role);
    return profile.role === roles;
  }, [profile]);

  const hasMinRole = useCallback((minRole) => {
    if (!profile) return false;
    const userLevel = ROLE_HIERARCHY[profile.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  }, [profile]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSponsor = useCallback(() => hasRole('sponsor'), [hasRole]);
  const isOrgAdmin = useCallback(() => hasRole('org_admin'), [hasRole]);
  const isDispatcher = useCallback(() => hasRole('dispatcher'), [hasRole]);
  const isProvider = useCallback(() => hasRole('provider'), [hasRole]);
  const isDriver = useCallback(
    () => hasRole('provider') && ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type),
    [hasRole, profile],
  );
  const isViewer = useCallback(() => hasRole('viewer'), [hasRole]);
  const isPatient = useCallback(() => hasRole('patient'), [hasRole]);
  const canOperateDispatch = useCallback(
    () => isAdmin() || isOrgAdmin() || isDispatcher(),
    [isAdmin, isOrgAdmin, isDispatcher],
  );
  const isOnboarding = useCallback(
    () => profile?.onboarding_status === 'pending',
    [profile],
  );
  const isSkippedOnboarding = useCallback(
    () => profile?.onboarding_status === 'skipped',
    [profile],
  );

  const can = useCallback((action, resource) => {
    if (isAdmin()) return true;
    const normalizedResource = resource === 'emergencies' ? 'emergency_requests' : resource;

    if (isDispatcher()) {
      return action === 'view' && [
        'dashboard',
        'map',
        'emergency_requests',
        'settings',
      ].includes(normalizedResource);
    }

    if (['finance', 'analytics', 'subscriptions'].includes(normalizedResource)) {
      if (isAdmin() || isOrgAdmin() || isSponsor()) {
        if (isSponsor() && action !== 'view') return false;
        return true;
      }
      return false;
    }

    if (isOrgAdmin()) {
      const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests', 'drivers', 'staff'];
      if (manageable.includes(normalizedResource)) return true;
    }

    if (isSponsor()) {
      const viewable = ['emergency_requests', 'hospitals', 'visits'];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    if (isProvider()) {
      const viewable = [
        'doctors',
        'ambulances',
        'visits',
        'hospitals',
        'emergency_requests',
        'medical_profiles',
      ];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    if (isViewer() && action === 'view') return true;
    return false;
  }, [isAdmin, isDispatcher, isOrgAdmin, isProvider, isSponsor, isViewer]);

  return {
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isOrgAdmin,
    isDispatcher,
    isProvider,
    isDriver,
    isViewer,
    isPatient,
    canOperateDispatch,
    isOnboarding,
    isSkippedOnboarding,
    can,
  };
};
