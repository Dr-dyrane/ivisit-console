export function buildActionRows({
  roleKind,
  live,
  emergencyCount,
  emergencyReviewCount = emergencyCount,
  emergencyActiveCount = emergencyCount,
  approvalCount,
  visitCount,
  providerCount,
  roleCopy,
  loading,
  skippedOnboarding = false,
  orgUnlinked = false,
}) {
  const requestReviewCount = Number(emergencyReviewCount) || 0;
  const requestActiveCount = Number(emergencyActiveCount) || 0;

  if (!live) {
    return [
      {
        id: 'open-role-page',
        label: roleCopy.primaryAction,
        meta: 'Live details not ready',
        detail: 'Open the role page and check whether the work is available there.',
        actionLabel: roleCopy.primaryAction,
        path: roleCopy.path,
        loading: Boolean(loading?.emergency),
        tone: 'muted',
      },
      {
        id: 'check-profile',
        label: 'Check account access',
        meta: `${roleCopy.label} access`,
        detail: 'Open Settings if this role or account does not look right.',
        actionLabel: 'Open settings',
        path: '/settings',
        tone: 'muted',
      },
    ];
  }

  const requestsRow = {
    id: 'requests',
    label: requestReviewCount > 0 ? 'Review requests' : 'Check requests',
    meta: requestReviewCount > 0
      ? `${requestReviewCount} to review`
      : requestActiveCount > 0
        ? `${requestActiveCount} active`
        : 'No requests to review',
    detail: requestReviewCount > 0
      ? 'Open Requests and start with the newest item that needs review.'
      : requestActiveCount > 0
        ? 'Open Requests to check current care activity.'
        : 'Open Requests only if you need recent activity.',
    actionLabel: requestReviewCount > 0 ? 'Review requests' : 'Open requests',
    path: '/emergencies',
    done: requestReviewCount === 0 && requestActiveCount === 0,
    loading: Boolean(loading?.emergency),
    tone: requestReviewCount > 0 ? 'danger' : requestActiveCount > 0 ? 'primary' : 'success',
  };

  const approvalsRow = {
    id: 'approvals',
    label: 'Review pending approvals',
    meta: approvalCount > 0 ? `${approvalCount} waiting` : 'Nothing waiting',
    detail: approvalCount > 0
      ? 'Open Approvals and clear the oldest waiting record first.'
      : 'No approval work is waiting right now.',
    actionLabel: 'Open approvals',
    path: '/verification',
    done: approvalCount === 0,
    tone: approvalCount > 0 ? 'warning' : 'success',
  };

  const staffRow = {
    id: 'staff',
    label: 'Check staff records',
    meta: providerCount > 0 ? `${providerCount} records` : 'No staff count yet',
    detail: 'Open Staff before making access, schedule, or care-team changes.',
    actionLabel: 'Open staff',
    path: '/doctors',
    done: providerCount > 0,
    tone: providerCount > 0 ? 'primary' : 'muted',
  };

  const visitsRow = {
    id: 'visits',
    label: 'Open today\'s visits',
    meta: visitCount > 0 ? `${visitCount} today` : 'No visits right now',
    detail: visitCount > 0
      ? 'Open Visits and start with the next assigned care item.'
      : 'Open Visits if an assignment is missing or delayed.',
    actionLabel: 'Open visits',
    path: '/visits',
    done: visitCount > 0,
    tone: visitCount > 0 ? 'primary' : 'muted',
  };

  const supportRow = {
    id: 'support',
    label: 'Ask for help',
    meta: 'Support is available',
    detail: 'Open Help when a request, visit, or account state does not look right.',
    actionLabel: 'Open help',
    path: '/support-tickets',
    done: true,
    tone: 'muted',
  };

  const settingsRow = {
    id: 'settings',
    label: 'Confirm account setup',
    meta: `${roleCopy.label} access`,
    detail: 'Open Settings and confirm your profile before asking for more access.',
    actionLabel: 'Open settings',
    path: '/settings',
    done: roleKind !== 'viewer',
    tone: roleKind === 'viewer' ? 'warning' : 'muted',
  };

  if (roleKind === 'admin') {
    const organizationRow = {
      id: 'organizations',
      label: 'Review organizations',
      meta: 'Admin access',
      detail: 'Open Organizations before changing sponsor, hospital, or billing ownership.',
      actionLabel: 'Open organizations',
      path: '/organizations',
      done: true,
      tone: 'muted',
    };

    if (requestReviewCount === 0 && approvalCount > 0) {
      return [approvalsRow, requestsRow, staffRow, organizationRow];
    }

    return [requestsRow, approvalsRow, staffRow, organizationRow];
  }

  if (roleKind === 'org_admin' && orgUnlinked) {
    return [
      {
        id: 'link-organization',
        label: 'Ask admin to link your organization',
        meta: 'Organization link needed',
        detail: 'Hospital tools stay empty until a platform admin links your account to an organization.',
        disabledReason: 'A platform admin needs to link your account to an organization before this action is available.',
        disabled: true,
        tone: 'warning',
      },
      settingsRow,
      supportRow,
    ];
  }

  if (roleKind === 'org_admin') {
    return [approvalsRow, requestsRow, staffRow, {
      id: 'payments',
      label: 'Check payments',
      meta: 'Wallet and pricing',
      detail: 'Open Payments before making wallet, pricing, or billing changes.',
      actionLabel: 'Open payments',
      path: '/wallet',
      done: true,
      tone: 'muted',
    }];
  }

  if (roleKind === 'driver') {
    return [
      requestsRow,
      {
        id: 'live-map',
        label: 'Open the live map',
        meta: 'Driver mode',
        detail: 'Track your assigned ambulance and the active run on the live map.',
        actionLabel: 'Open map',
        path: '/map',
        done: true,
        tone: 'primary',
      },
      supportRow,
      settingsRow,
    ];
  }

  if (roleKind === 'dispatcher') {
    return [
      requestsRow,
      {
        id: 'live-map',
        label: 'Open the live map',
        meta: 'Dispatch view',
        detail: 'Review active requests and available response units on the map.',
        actionLabel: 'Open map',
        path: '/map',
        done: true,
        tone: 'primary',
      },
      settingsRow,
    ];
  }

  if (roleKind === 'provider') {
    return [visitsRow, requestsRow, supportRow, settingsRow];
  }

  if (roleKind === 'sponsor') {
    return [
      {
        id: 'impact',
        label: 'Review impact',
        meta: 'Read-only report',
        detail: 'Open Impact to review outcomes and recent request activity.',
        actionLabel: 'Open impact',
        path: '/analytics',
        done: true,
        tone: 'primary',
      },
      {
        id: 'requests',
        label: 'Review request activity',
        meta: 'In impact',
        detail: 'Request activity is visible in Impact without changing care work.',
        done: true,
        tone: 'primary',
      },
      settingsRow,
    ];
  }

  if (skippedOnboarding) {
    return [
      {
        id: 'resume-onboarding',
        label: 'Resume organization setup',
        meta: 'Setup incomplete',
        detail: 'Resume onboarding to finish your organization details and submit them for review.',
        actionLabel: 'Resume setup',
        path: '/onboarding',
        tone: 'warning',
      },
      settingsRow,
    ];
  }

  return [
    settingsRow,
    {
      id: 'request-access',
      label: 'Ask admin for access',
      meta: 'Role assignment needed',
      detail: 'Contact an admin after confirming your profile details in Settings.',
      disabledReason: 'An admin needs to assign your role before this action is available.',
      disabled: true,
      tone: 'muted',
    },
  ];
}
