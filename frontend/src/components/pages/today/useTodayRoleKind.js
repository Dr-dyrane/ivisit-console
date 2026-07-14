import { useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export function useTodayRoleKind(explicitRole) {
  const { isAdmin, isDispatcher, isOrgAdmin, isProvider, isSponsor, isViewer, profile } = useAuth();

  return useMemo(() => {
    // Driver lens: the profile-level identity rule GodModeMap already uses
    // (isDriverMode), widened to the responder set (driver/paramedic/ambulance/
    // ambulance_service - same RESPONDER_PROVIDER_TYPES canon as mobileNavigation;
    // user-blessed equivalence 2026-07-09). roleKind stays 'driver' and the label
    // stays 'Driver' - drivers are 367 of 367 live responders. It UPGRADES the
    // explicit 'provider' role BentoHome passes; any other explicit role wins untouched.
    const isDriver = profile?.role === 'provider' && ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type);
    if (isDriver && (!explicitRole || explicitRole === 'provider')) return 'driver';
    if (explicitRole) return explicitRole;
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isDispatcher()) return 'dispatcher';
    if (isProvider()) return 'provider';
    if (isSponsor()) return 'sponsor';
    if (isViewer()) return 'viewer';
    return 'viewer';
  }, [explicitRole, isAdmin, isDispatcher, isOrgAdmin, isProvider, isSponsor, isViewer, profile]);
}
