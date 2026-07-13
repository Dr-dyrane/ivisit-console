jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileOrganizations } from '../mobile/MobileOrganizations';
import { MobileOrganizationDetailSheet } from '../mobile/organizations/MobileOrganizationDetailSheet';
import { MobileOrganizationRow } from '../mobile/organizations/MobileOrganizationRow';
import { MobileOrganizationsAtlasLayer } from '../mobile/organizations/MobileOrganizationsAtlasLayer';
import { useMobileOrganizationsController } from '../mobile/organizations/useMobileOrganizationsController';
import { OrganizationsPage } from './OrganizationsPage';
import { OrganizationDetailRail } from './organizations/OrganizationDetailRail';
import { OrganizationsDesktopWorkspace } from './organizations/OrganizationsDesktopWorkspace';
import { OrganizationsPageView } from './organizations/OrganizationsPageView';
import { useOrganizationsPageChrome } from './organizations/useOrganizationsPageChrome';
import { useOrganizationsPageController } from './organizations/useOrganizationsPageController';

describe('Organizations module compatibility exports', () => {
  it.each([
    ['OrganizationsPage', OrganizationsPage],
    ['OrganizationsPageView', OrganizationsPageView],
    ['OrganizationsDesktopWorkspace', OrganizationsDesktopWorkspace],
    ['OrganizationDetailRail', OrganizationDetailRail],
    ['useOrganizationsPageController', useOrganizationsPageController],
    ['useOrganizationsPageChrome', useOrganizationsPageChrome],
    ['MobileOrganizations', MobileOrganizations],
    ['MobileOrganizationDetailSheet', MobileOrganizationDetailSheet],
    ['MobileOrganizationRow', MobileOrganizationRow],
    ['MobileOrganizationsAtlasLayer', MobileOrganizationsAtlasLayer],
    ['useMobileOrganizationsController', useMobileOrganizationsController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
