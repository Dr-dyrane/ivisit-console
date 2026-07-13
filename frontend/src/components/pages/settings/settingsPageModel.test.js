import {
  buildSettingsRouteContext,
  formatSettingsAccountName,
  formatSettingsRoleLabel,
  resolveSettingsLoading,
  resolveSettingsRoleKind,
} from './settingsPageModel';
import {
  getSettingsMetrics,
  getSettingsSignal,
} from './settingsDesktopModel';

describe('settings page model characterization', () => {
  it('keeps the shared account-name and role-label fallback chains', () => {
    expect(formatSettingsAccountName({ full_name: 'Ada Lovelace', username: 'ada' })).toBe('Ada Lovelace');
    expect(formatSettingsAccountName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
    expect(formatSettingsAccountName({ username: 'ada' })).toBe('ada');
    expect(formatSettingsAccountName(null)).toBe('User profile');
    expect(formatSettingsRoleLabel('org_admin')).toBe('Org Admin');
    expect(formatSettingsRoleLabel('org__admin')).toBe('Org  Admin');
    expect(formatSettingsRoleLabel('org__admin', { omitEmpty: true })).toBe('Org Admin');
    expect(formatSettingsRoleLabel(null)).toBe('Viewer');
  });

  it('preserves explicit role precedence for the module rail', () => {
    expect(resolveSettingsRoleKind({ admin: true, orgAdmin: true, sponsor: true, provider: true, driver: true })).toBe('admin');
    expect(resolveSettingsRoleKind({ admin: false, orgAdmin: true, sponsor: true, provider: true, driver: true })).toBe('org_admin');
    expect(resolveSettingsRoleKind({ admin: false, orgAdmin: false, sponsor: true, provider: true, driver: true })).toBe('sponsor');
    expect(resolveSettingsRoleKind({ admin: false, orgAdmin: false, sponsor: false, provider: true, driver: true })).toBe('driver');
    expect(resolveSettingsRoleKind({ admin: false, orgAdmin: false, sponsor: false, provider: true, driver: false })).toBe('provider');
    expect(resolveSettingsRoleKind({ admin: false, orgAdmin: false, sponsor: false, provider: false, driver: false })).toBe('viewer');
  });

  it('waits for provider evidence without blocking non-provider accounts', () => {
    expect(resolveSettingsLoading({ authLoading: true, provider: false, doctorProfileLoading: false, doctorProfile: null })).toBe(true);
    expect(resolveSettingsLoading({ authLoading: false, provider: true, doctorProfileLoading: true, doctorProfile: null })).toBe(true);
    expect(resolveSettingsLoading({ authLoading: false, provider: true, doctorProfileLoading: true, doctorProfile: { id: 'doctor-1' } })).toBe(false);
    expect(resolveSettingsLoading({ authLoading: false, provider: false, doctorProfileLoading: true, doctorProfile: null })).toBe(false);
  });

  it('publishes own-account context while keeping billing unavailable', () => {
    const context = buildSettingsRouteContext({
      user: { id: 'auth-1' },
      profile: { id: 'profile-1' },
      displayId: 'USR-100',
      avatarUrl: '/avatar.png',
      avatarFallback: 'AL',
      darkMode: true,
      loading: false,
      isSigningOut: false,
      isProvider: true,
      doctorProfile: { id: 'doctor-1' },
      canOpenSupport: true,
    });

    expect(context).toEqual({
      user: { id: 'auth-1' },
      profile: { id: 'profile-1' },
      displayId: 'USR-100',
      avatarUrl: '/avatar.png',
      avatarFallback: 'AL',
      darkMode: true,
      loading: false,
      isSigningOut: false,
      isProvider: true,
      hasDoctorProfile: true,
      canOpenSupport: true,
      billingAvailable: false,
    });
  });

  it('keeps one account signal and exactly three grounded desktop metrics', () => {
    expect(getSettingsSignal('Provider')).toMatchObject({
      label: 'Provider account',
      headline: 'Your account settings',
      tone: 'account',
    });

    expect(getSettingsMetrics({ roleLabel: 'Provider', darkMode: true, phone: '+2348000000000' }))
      .toMatchObject([
        { id: 'access', value: 'Provider', priority: 1 },
        { id: 'theme', value: 'Dark', priority: 2 },
        { id: 'mobile', value: 'Added', priority: 3 },
      ]);
    expect(getSettingsMetrics({ roleLabel: 'Viewer', darkMode: false, phone: null }))
      .toHaveLength(3);
    expect(getSettingsMetrics({ roleLabel: 'Viewer', darkMode: false, phone: null })[2].value)
      .toBe('Not added');
  });
});
