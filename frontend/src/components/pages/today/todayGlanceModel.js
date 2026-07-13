import { ROLE_COPY, pluralize } from './todayRoleModel';

export function buildGlanceItems({
  roleKind,
  live,
  emergencyCount,
  emergencyReviewCount = emergencyCount,
  emergencyActiveCount = emergencyCount,
  approvalCount,
  visitCount,
  providerCount,
  skippedOnboarding = false,
  orgUnlinked = false,
}) {
  const role = ROLE_COPY[roleKind] || ROLE_COPY.viewer;
  const requestReviewCount = Number(emergencyReviewCount) || 0;
  const requestActiveCount = Number(emergencyActiveCount) || 0;
  const requestValue = requestReviewCount > 0
    ? `${requestReviewCount} to review`
    : requestActiveCount > 0
      ? `${requestActiveCount} active`
      : 'Clear';
  const requestTone = requestReviewCount > 0
    ? 'danger'
    : requestActiveCount > 0
      ? 'primary'
      : 'success';

  if (!live) {
    return [
      { label: 'Status', value: 'Retry needed', path: role.path, tone: 'muted' },
      { label: 'Role', value: role.label, path: '/settings', tone: 'muted' },
      { label: 'Next', value: role.primaryAction, path: role.path, tone: 'primary' },
    ];
  }

  if (roleKind === 'admin') {
    return [
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Approvals', value: approvalCount > 0 ? `${approvalCount} waiting` : 'Clear', path: '/verification', tone: approvalCount > 0 ? 'warning' : 'success' },
      { label: 'Staff', value: providerCount > 0 ? `${providerCount} ${pluralize(providerCount, 'record')}` : 'Check staff', path: '/doctors', tone: providerCount > 0 ? 'primary' : 'muted' },
    ];
  }

  if (roleKind === 'org_admin') {
    if (orgUnlinked) {
      return [
        { label: 'Organization', value: 'Not linked', path: '/settings', tone: 'warning' },
        { label: 'Role', value: role.label, path: '/settings', tone: 'muted' },
        { label: 'Access', value: 'Ask admin', path: '/settings', tone: 'warning' },
      ];
    }
    return [
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Approvals', value: approvalCount > 0 ? `${approvalCount} waiting` : 'Clear', path: '/verification', tone: approvalCount > 0 ? 'warning' : 'success' },
      { label: 'Staff', value: providerCount > 0 ? `${providerCount} ${pluralize(providerCount, 'record')}` : 'Check staff', path: '/doctors', tone: providerCount > 0 ? 'primary' : 'muted' },
    ];
  }

  if (roleKind === 'driver') {
    return [
      { label: 'Runs', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Live map', value: 'Open', path: '/map', tone: 'primary' },
      { label: 'Help', value: 'Available', path: '/support-tickets', tone: 'muted' },
    ];
  }

  if (roleKind === 'provider') {
    return [
      { label: 'Visits', value: visitCount > 0 ? `${visitCount} today` : 'Clear', path: '/visits', tone: visitCount > 0 ? 'primary' : 'muted' },
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Help', value: 'Available', path: '/support-tickets', tone: 'muted' },
    ];
  }

  if (roleKind === 'sponsor') {
    return [
      { label: 'Impact', value: 'Open report', path: '/analytics', tone: 'primary' },
      { label: 'Requests', value: 'In impact', path: '/analytics', tone: 'primary' },
      { label: 'Access', value: 'Read only', path: '/settings', tone: 'muted' },
    ];
  }

  if (skippedOnboarding) {
    return [
      { label: 'Setup', value: 'Resume', path: '/onboarding', tone: 'warning' },
      { label: 'Role', value: 'Limited', path: '/settings', tone: 'muted' },
      { label: 'Access', value: 'After setup', path: '/onboarding', tone: 'muted' },
    ];
  }

  return [
    { label: 'Setup', value: 'Settings', path: '/settings', tone: 'primary' },
    { label: 'Role', value: 'Limited', path: '/settings', tone: 'muted' },
    { label: 'Access', value: 'Ask admin', path: '/settings', tone: 'warning' },
  ];
}
