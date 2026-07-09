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
    // Golden three (Today/Requests/Map) hold fixed slots; the LAST slot is the
    // morph slot -- Approvals at rest (2026-07-09 wayfinding decision).
    expect(labelsFor('admin')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    expect(pathsFor('admin')).toEqual(['/', '/emergencies', '/map', '/verification']);
  });

  it('morphs the last slot into the current page when off-slate (wayfinding)', () => {
    const withPath = (role, path, providerType) =>
      getMobileNavigationItems(role, providerType, path).map((item) => item.label);
    // Off-slate route: the last pill becomes the current page.
    expect(withPath('admin', '/doctors')).toEqual(['Today', 'Requests', 'Map', 'Staff']);
    expect(withPath('admin', '/settings')).toEqual(['Today', 'Requests', 'Map', 'Settings']);
    expect(withPath('admin', '/wallet')).toEqual(['Today', 'Requests', 'Map', 'Payments']);
    // Golden three + the resting default keep the slate untouched.
    expect(withPath('admin', '/')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    expect(withPath('admin', '/emergencies')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    expect(withPath('admin', '/map')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    expect(withPath('admin', '/verification')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    // Unknown routes never morph.
    expect(withPath('admin', '/login')).toEqual(['Today', 'Requests', 'Map', 'Approvals']);
    // Works for every slate: provider on /doctors swaps its last slot (Settings).
    expect(withPath('provider', '/doctors')).toEqual(['Today', 'Requests', 'Visits', 'Staff']);
    // Responder slate morphs too (driver on /visits gets wayfinding back).
    expect(withPath('provider', '/visits', 'driver')).toEqual(['Today', 'Requests', 'Map', 'Visits']);
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
