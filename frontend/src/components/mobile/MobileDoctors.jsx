import React from 'react';
import { MobileDoctorsView } from './doctors/MobileDoctorsView';
import { useMobileDoctorsController } from './doctors/useMobileDoctorsController';

// Compatibility entry point for the Staff route. Mobile state/model and rendering
// remain page-owned under ./doctors while callers retain the same prop contract.
export const MobileDoctors = (props) => {
  const controller = useMobileDoctorsController(props);
  return <MobileDoctorsView {...props} controller={controller} />;
};
