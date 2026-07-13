import React from 'react';
import { useAmbulancesPageController } from './ambulances/useAmbulancesPageController';
import { useAmbulancesPageChrome } from './ambulances/useAmbulancesPageChrome';
import { AmbulancesPageView } from './ambulances/AmbulancesPageView';

// Compatibility entry point for AppRoutes and existing named imports. Ambulance-owned
// model, controller, responsive view, and desktop workspace live under ./ambulances.
export const AmbulancesPage = () => {
  const controller = useAmbulancesPageController();
  useAmbulancesPageChrome(controller);

  return <AmbulancesPageView controller={controller} />;
};
