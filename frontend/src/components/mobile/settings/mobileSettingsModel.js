import {
  formatSettingsAccountName,
  formatSettingsRoleLabel,
} from '../../pages/settings/settingsPageModel';

export const getMobileSettingsProjection = ({ profile, user }) => ({
  accountEmail: user?.email || profile?.email || 'Email not available',
  phone: profile?.phone || 'Not provided',
  roleLabel: formatSettingsRoleLabel(profile?.role, { omitEmpty: true }),
  displayName: formatSettingsAccountName(profile, 'Your account'),
});

export const shouldShowMobileSettingsSkeleton = ({ warmingUp, loading, profile, user }) => (
  warmingUp || loading || (!profile && !user)
);
