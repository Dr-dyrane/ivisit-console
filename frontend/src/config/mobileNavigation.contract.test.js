import { getMobileNavigationItems, MOBILE_NAV_CHROME } from './mobileNavigation';

const labelsFor = (role) => getMobileNavigationItems(role).map((item) => item.label);
const pathsFor = (role) => getMobileNavigationItems(role).map((item) => item.path);

describe('mobile navigation canonical contract', () => {
  it('keeps mobile chrome ownership simple', () => {
    expect(MOBILE_NAV_CHROME).toEqual({
      overflowOwner: 'avatar',
      bottomMenuButton: false,
      contextualFab: 'page-action',
    });
  });

  it('keeps admin bottom island focused on urgent movement', () => {
    // Slots rank by operational importance: requests + approvals (the Today hero's
    // own signals) beat Settings, which lives in the avatar sheet (overflowOwner).
    expect(labelsFor('admin')).toEqual(['Today', 'Requests', 'Approvals', 'Map']);
    expect(pathsFor('admin')).toEqual(['/', '/emergencies', '/verification', '/map']);
  });

  it('keeps org admin bottom island on approvals and staff', () => {
    expect(labelsFor('org_admin')).toEqual(['Today', 'Approvals', 'Staff', 'Settings']);
    expect(pathsFor('org_admin')).toEqual(['/', '/verification', '/doctors', '/settings']);
  });

  it('keeps provider bottom island on requests and visits', () => {
    expect(labelsFor('provider')).toEqual(['Today', 'Requests', 'Visits', 'Settings']);
    expect(pathsFor('provider')).toEqual(['/', '/emergencies', '/visits', '/settings']);
  });

  it('keeps sponsor bottom island read-only and settings-safe', () => {
    expect(labelsFor('sponsor')).toEqual(['Today', 'Statistics', 'Map', 'Settings']);
    expect(pathsFor('sponsor')).toEqual(['/', '/analytics', '/map', '/settings']);
  });

  it('keeps viewer bottom island limited to setup', () => {
    expect(labelsFor('viewer')).toEqual(['Today', 'Map', 'Settings']);
    expect(pathsFor('viewer')).toEqual(['/', '/map', '/settings']);
  });
});
