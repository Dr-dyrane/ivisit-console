import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TodayHome } from './TodayHome';
import { LegacyBentoHome } from './bento/LegacyBentoHome';
import { resolveBentoHomeRole } from './bento/bentoHomeModel';

export { resolveBentoHomeRole } from './bento/bentoHomeModel';

export const BentoHome = () => {
  const {
    isAdmin,
    isDispatcher,
    isOrgAdmin,
    isProvider,
    isPatient,
    isViewer,
    isSponsor,
  } = useAuth();

  const roleHomeKind = resolveBentoHomeRole({
    admin: isAdmin(),
    dispatcher: isDispatcher(),
    orgAdmin: isOrgAdmin(),
    provider: isProvider(),
    patient: isPatient(),
    viewer: isViewer(),
    sponsor: isSponsor(),
  });

  if (roleHomeKind) return <TodayHome role={roleHomeKind} />;
  return <LegacyBentoHome />;
};
