import React from 'react';
import { DoctorsPageView } from './doctors/DoctorsPageView';
import { useDoctorsPageChrome } from './doctors/useDoctorsPageChrome';
import { useDoctorsPageController } from './doctors/useDoctorsPageController';

// Compatibility entry point for AppRoutes and existing named imports. Staff-owned
// model, controller, route bridge, and presentations live under ./doctors.
export const DoctorsPage = () => {
  const controller = useDoctorsPageController();
  useDoctorsPageChrome(controller);

  return <DoctorsPageView controller={controller} />;
};
