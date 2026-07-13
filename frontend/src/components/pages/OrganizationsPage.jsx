import React from 'react';
import { OrganizationsPageView } from './organizations/OrganizationsPageView';
import { useOrganizationsPageChrome } from './organizations/useOrganizationsPageChrome';
import { useOrganizationsPageController } from './organizations/useOrganizationsPageController';

// Compatibility entry point for AppRoutes and existing named imports. Organization-owned
// model, controller, chrome, and presentation modules live under ./organizations.
export const OrganizationsPage = () => {
  const controller = useOrganizationsPageController();
  useOrganizationsPageChrome(controller);

  return <OrganizationsPageView controller={controller} />;
};
