import {
  getMobileSettingsProjection,
  shouldShowMobileSettingsSkeleton,
} from './mobileSettingsModel';

describe('mobile settings model characterization', () => {
  it('uses the same identity chain with mobile-safe terminal fallbacks', () => {
    expect(getMobileSettingsProjection({
      profile: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        role: 'org_admin',
        phone: '+2348000000000',
      },
      user: { email: 'ada@example.com' },
    })).toEqual({
      accountEmail: 'ada@example.com',
      phone: '+2348000000000',
      roleLabel: 'Org Admin',
      displayName: 'Ada Lovelace',
    });

    expect(getMobileSettingsProjection({ profile: null, user: null })).toEqual({
      accountEmail: 'Email not available',
      phone: 'Not provided',
      roleLabel: 'Viewer',
      displayName: 'Your account',
    });
  });

  it('keeps structural loading for warmup, auth loading, and missing identity only', () => {
    expect(shouldShowMobileSettingsSkeleton({ warmingUp: true, loading: false, profile: {}, user: {} })).toBe(true);
    expect(shouldShowMobileSettingsSkeleton({ warmingUp: false, loading: true, profile: {}, user: {} })).toBe(true);
    expect(shouldShowMobileSettingsSkeleton({ warmingUp: false, loading: false, profile: null, user: null })).toBe(true);
    expect(shouldShowMobileSettingsSkeleton({ warmingUp: false, loading: false, profile: { id: 'profile-1' }, user: null })).toBe(false);
  });
});
