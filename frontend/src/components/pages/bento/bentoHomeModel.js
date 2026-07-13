export const resolveBentoHomeRole = ({
  admin,
  orgAdmin,
  provider,
  patient,
  viewer,
  sponsor,
}) => {
  if (orgAdmin && !admin) return 'org_admin';
  if (provider && !admin && !orgAdmin && !sponsor && !patient && !viewer) return 'provider';
  if (sponsor && !admin && !orgAdmin) return 'sponsor';
  if (viewer) return 'viewer';
  if (admin) return 'admin';
  return null;
};
