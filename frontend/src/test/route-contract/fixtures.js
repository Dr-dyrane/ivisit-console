const ROLE_DEFAULTS = {
  admin: {},
  organization_admin: {},
  provider: { provider_type: 'hospital' },
  sponsor: {},
  viewer: {},
};

export const createProfileFixture = (role = 'admin', overrides = {}) => {
  const roleDefaults = ROLE_DEFAULTS[role] || {};
  const fixtureKey = role.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  return {
    id: `${fixtureKey}-profile`,
    user_id: `${fixtureKey}-user`,
    email: `${fixtureKey}@ivisit.test`,
    full_name: `${role.replace(/_/g, ' ')} fixture`,
    role,
    organization_id: role === 'viewer' ? null : 'organization-fixture',
    hospital_id: role === 'provider' ? 'hospital-fixture' : null,
    status: 'active',
    ...roleDefaults,
    ...overrides,
  };
};

export const createAuthFixture = (role = 'admin', overrides = {}) => {
  const profile = createProfileFixture(role, overrides.profile);

  return {
    user: {
      id: profile.user_id,
      email: profile.email,
      ...overrides.user,
    },
    profile,
    loading: false,
    initializing: false,
    can: overrides.can || (() => true),
    ...overrides,
  };
};
