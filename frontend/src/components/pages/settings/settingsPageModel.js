export const formatSettingsRoleLabel = (role, { omitEmpty = false } = {}) => {
  if (!role) return 'Viewer';

  const parts = role.split('_');
  const visibleParts = omitEmpty ? parts.filter(Boolean) : parts;

  return visibleParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const formatSettingsAccountName = (profile, fallback = 'User profile') => (
  profile?.full_name
  || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  || profile?.username
  || fallback
);

export const resolveSettingsRoleKind = ({
  admin,
  orgAdmin,
  sponsor,
  provider,
  driver,
}) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (sponsor) return 'sponsor';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const resolveSettingsLoading = ({
  authLoading,
  provider,
  doctorProfileLoading,
  doctorProfile,
}) => Boolean(authLoading || (provider && doctorProfileLoading && !doctorProfile));

export const buildSettingsRouteContext = ({
  user,
  profile,
  displayId,
  avatarUrl,
  avatarFallback,
  darkMode,
  loading,
  isSigningOut,
  isProvider,
  doctorProfile,
  canOpenSupport,
}) => ({
  user,
  profile,
  displayId,
  avatarUrl,
  avatarFallback,
  darkMode,
  loading,
  isSigningOut,
  isProvider,
  hasDoctorProfile: Boolean(doctorProfile),
  canOpenSupport,
  billingAvailable: false,
});
