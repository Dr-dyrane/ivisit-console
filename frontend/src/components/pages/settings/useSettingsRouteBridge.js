import { useEffect, useState } from 'react';

import { getDisplayId } from '../../../services/displayIdService';

export const useSettingsDisplayId = (profileId) => {
  const [displayId, setDisplayId] = useState(null);

  useEffect(() => {
    const fetchId = async () => {
      if (profileId) {
        const id = await getDisplayId(profileId);
        setDisplayId(id);
      }
    };

    fetchId();
  }, [profileId]);

  return displayId;
};

export const useSettingsActionBridge = ({
  onOpenProfile,
  onOpenSecurity,
  onOpenSupport,
  onOpenDoctor,
}) => {
  useEffect(() => {
    window.addEventListener('openProfileModal', onOpenProfile);
    window.addEventListener('openSecurityModal', onOpenSecurity);
    window.addEventListener('openSupportModal', onOpenSupport);
    window.addEventListener('openDoctorModal', onOpenDoctor);

    const params = new URLSearchParams(window.location.search);
    if (params.get('quick') === 'true') {
      onOpenSecurity();
      window.history.replaceState({}, '', '/settings');
    }

    return () => {
      window.removeEventListener('openProfileModal', onOpenProfile);
      window.removeEventListener('openSecurityModal', onOpenSecurity);
      window.removeEventListener('openSupportModal', onOpenSupport);
      window.removeEventListener('openDoctorModal', onOpenDoctor);
    };
  }, [onOpenDoctor, onOpenProfile, onOpenSecurity, onOpenSupport]);
};

export const useSettingsRouteContextPublisher = (settingsRouteContext) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishSettingsRouteContext = () => window.dispatchEvent(
      new CustomEvent('settingsRouteContextUpdated', { detail: settingsRouteContext })
    );

    publishSettingsRouteContext();
    window.addEventListener('requestSettingsRouteContext', publishSettingsRouteContext);

    return () => window.removeEventListener('requestSettingsRouteContext', publishSettingsRouteContext);
  }, [settingsRouteContext]);
};
