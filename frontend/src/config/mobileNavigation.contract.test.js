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
    expect(labelsFor('admin')).toEqual(['Today', 'Requests', 'Map']);
    expect(pathsFor('admin')).toEqual(['/', '/emergencies', '/map']);
  });

  it('keeps org admin bottom island on approvals and staff', () => {
    expect(labelsFor('org_admin')).toEqual(['Today', 'Approvals', 'Staff']);
    expect(pathsFor('org_admin')).toEqual(['/', '/verification', '/doctors']);
  });

  it('keeps provider bottom island on requests and visits', () => {
    expect(labelsFor('provider')).toEqual(['Today', 'Requests', 'Visits']);
    expect(pathsFor('provider')).toEqual(['/', '/emergencies', '/visits']);
  });

  it('keeps sponsor bottom island read-only and settings-safe', () => {
    expect(labelsFor('sponsor')).toEqual(['Today', 'Statistics', 'Settings']);
    expect(pathsFor('sponsor')).toEqual(['/', '/analytics', '/settings']);
  });

  it('keeps viewer bottom island limited to setup', () => {
    expect(labelsFor('viewer')).toEqual(['Today', 'Settings']);
    expect(pathsFor('viewer')).toEqual(['/', '/settings']);
  });
});
