import { canAccessContextPanel } from './contextPanelAccess';

const roles = (overrides = {}) => ({
  admin: false,
  orgAdmin: false,
  patient: false,
  provider: false,
  sponsor: false,
  viewer: false,
  ...overrides,
});

describe('contextPanelAccess', () => {
  it('keeps own-user and default panels available', () => {
    expect(canAccessContextPanel('/', roles({ viewer: true }))).toBe(true);
    expect(canAccessContextPanel('/settings', roles({ viewer: true }))).toBe(true);
    expect(canAccessContextPanel('/unknown', roles({ viewer: true }))).toBe(true);
  });

  it('keeps organization management panels at org-admin authority', () => {
    expect(canAccessContextPanel('/users', roles({ orgAdmin: true }))).toBe(true);
    expect(canAccessContextPanel('/verification', roles({ orgAdmin: true }))).toBe(true);
    expect(canAccessContextPanel('/users', roles({ provider: true }))).toBe(false);
    expect(canAccessContextPanel('/users/record', roles({ orgAdmin: true }))).toBe(true);
  });

  it('keeps platform-only panels admin-only', () => {
    expect(canAccessContextPanel('/insurance', roles({ admin: true }))).toBe(true);
    expect(canAccessContextPanel('/subscriptions', roles({ orgAdmin: true }))).toBe(false);
    expect(canAccessContextPanel('/organizations', roles({ provider: true }))).toBe(false);
  });

  it('keeps provider operational routes while denying patient and viewer roles', () => {
    expect(canAccessContextPanel('/map', roles({ provider: true }))).toBe(true);
    expect(canAccessContextPanel('/emergencies', roles({ patient: true }))).toBe(false);
    expect(canAccessContextPanel('/map', roles({ viewer: true }))).toBe(false);
  });
});
