import React from 'react';
import { useHospitalsPageController } from './hospitals/useHospitalsPageController';
import { useHospitalsPageChrome } from './hospitals/useHospitalsPageChrome';
import { HospitalsPageView } from './hospitals/HospitalsPageView';

// Compatibility entry point for AppRoutes and existing named imports. Hospital-owned
// model, controller, and presentation modules live under ./hospitals.
export const HospitalsPage = () => {
  const controller = useHospitalsPageController();
  useHospitalsPageChrome(controller);

  return <HospitalsPageView controller={controller} />;
};
