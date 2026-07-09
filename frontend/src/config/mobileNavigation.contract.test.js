import { getMobileNavigationItems, MOBILE_NAV_CHROME } from './mobileNavigation';

const labelsFor = (role, providerType) => getMobileNavigationItems(role, providerType).map((item) => item.label);
const pathsFor = (role, providerType) => getMobileNavigationItems(role, providerType).map((item) => item.path);

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

  it('gives responder providers a driver island with Map instead of Visits', () => {
    // The driver Today lens promotes /map; /visits is a dead-end for responders.
    for (const providerType of ['driver', 'paramedic', 'ambulance', 'ambulance_service']) {
      expect(labelsFor('provider', providerType)).toEqual(['Today', 'Requests', 'Map', 'Settings']);
      expect(pathsFor('provider', providerType)).toEqual(['/', '/emergencies', '/map', '/settings']);
    }
    expect(getMobileNavigationItems('provider', 'driver').map((item) => item.id))
      .toEqual(['today', 'emergencies', 'map', 'settings']);
    // Non-responder provider types keep the plain provider island.
    expect(labelsFor('provider', 'doctor')).toEqual(['Today', 'Requests', 'Visits', 'Settings']);
  });

  it('keeps sponsor bottom island read-only and settings-safe', () => {
    // No Map slot: routes.jsx excludes sponsor from /map (excludedRoles).
    expect(labelsFor('sponsor')).toEqual(['Today', 'Statistics', 'Settings']);
    expect(pathsFor('sponsor')).toEqual(['/', '/analytics', '/settings']);
  });

  it('keeps viewer bottom island limited to setup', () => {
    // No Map slot: routes.jsx gates /map at minRole provider.
    expect(labelsFor('viewer')).toEqual(['Today', 'Settings']);
    expect(pathsFor('viewer')).toEqual(['/', '/settings']);
  });
});
