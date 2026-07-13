import {
  Ambulance,
  BarChart3,
  CircleDashed,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { ROLE_COPY, pluralize } from './todayRoleModel';

export function buildToday({
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

  if (!live) {
    return {
      headline: 'Live details are not ready',
      subhead: `Open ${role.primaryAction.toLowerCase()} or try again when the data finishes loading.`,
      sheetTitle: 'Today',
      sheetHint: 'Start with the page that matches your role.',
      status: 'Not ready yet',
      primaryAction: role.primaryAction,
      path: role.path,
      icon: role.icon,
      tone: 'muted',
    };
  }

  if (roleKind === 'org_admin' && orgUnlinked) {
    return {
      headline: 'No organization linked',
      subhead: 'Your account is not linked to an organization. Ask a platform admin to link it.',
      sheetTitle: 'Account setup',
      sheetHint: 'A platform admin links your account to your organization.',
      status: 'Not linked',
      primaryAction: 'Open settings',
      path: '/settings',
      icon: LockKeyhole,
      tone: 'warning',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && requestReviewCount > 0) {
    return {
      headline: `${requestReviewCount} ${pluralize(requestReviewCount, 'request')} to review`,
      subhead: 'Open requests and start with the newest item that needs review.',
      sheetTitle: 'Requests',
      sheetHint: 'Review the first waiting request.',
      status: 'Needs attention',
      primaryAction: 'Review',
      path: '/emergencies',
      icon: Ambulance,
      tone: 'danger',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && approvalCount > 0) {
    const canClearApprovals = roleKind === 'admin';
    return {
      headline: `${approvalCount} pending ${pluralize(approvalCount, 'approval')}`,
      subhead: canClearApprovals
        ? 'Open approvals and clear the first waiting record.'
        : 'Review your providers awaiting platform approval.',
      sheetTitle: 'Pending approvals',
      sheetHint: canClearApprovals
        ? 'Clear the oldest approval first.'
        : 'Review the oldest first; an admin completes approval.',
      status: 'Needs attention',
      primaryAction: 'Review approvals',
      path: '/verification',
      icon: ShieldCheck,
      tone: 'danger',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && requestActiveCount > 0) {
    return {
      headline: `${requestActiveCount} active ${pluralize(requestActiveCount, 'request')}`,
      subhead: 'Open Requests to check current care activity.',
      sheetTitle: 'Requests',
      sheetHint: 'Check the active request.',
      status: 'Active',
      primaryAction: 'Open requests',
      path: '/emergencies',
      icon: Ambulance,
      tone: 'primary',
    };
  }

  if (roleKind === 'driver') {
    return {
      headline: requestActiveCount > 0 ? `${requestActiveCount} active ${pluralize(requestActiveCount, 'run')}` : 'No runs right now',
      subhead: requestActiveCount > 0 ? 'Open requests and start with the current run.' : 'Keep Today open; assigned runs will appear here.',
      sheetTitle: 'Your runs',
      sheetHint: requestActiveCount > 0 ? 'Start with the active run.' : 'Check the live map or stay ready for dispatch.',
      status: requestActiveCount > 0 ? 'On duty' : 'Clear',
      primaryAction: 'Open requests',
      path: '/emergencies',
      icon: Ambulance,
      tone: requestActiveCount > 0 ? 'warning' : 'muted',
    };
  }

  if (roleKind === 'provider') {
    return {
      headline: visitCount > 0 ? `${visitCount} visit ${pluralize(visitCount, 'item')}` : 'No visits right now',
      subhead: visitCount > 0 ? 'Open visits and start with the next care item.' : 'Keep Today open; assigned visits will appear here.',
      sheetTitle: 'Your visits',
      sheetHint: visitCount > 0 ? 'Start with the next visit.' : 'Check requests or ask for help if work is missing.',
      status: visitCount > 0 ? 'Ready' : 'Clear',
      primaryAction: 'Open visits',
      path: '/visits',
      icon: Stethoscope,
      tone: visitCount > 0 ? 'primary' : 'muted',
    };
  }

  if (roleKind === 'sponsor') {
    return {
      headline: 'Impact is ready to review',
      subhead: 'Open impact to review current outcomes and request activity.',
      sheetTitle: 'Impact',
      sheetHint: 'Review outcomes before asking for changes.',
      status: 'Read only',
      primaryAction: 'View impact',
      path: '/analytics',
      icon: BarChart3,
      tone: 'primary',
    };
  }

  if (roleKind === 'viewer') {
    if (skippedOnboarding) {
      return {
        headline: 'Finish your organization setup',
        subhead: 'Resume setup to finish your organization details and unlock your console.',
        sheetTitle: 'Organization setup',
        sheetHint: 'Resume where you left off.',
        status: 'Setup incomplete',
        primaryAction: 'Resume setup',
        path: '/onboarding',
        icon: CircleDashed,
        tone: 'warning',
      };
    }
    return {
      headline: 'Activation needed',
      subhead: 'Open settings, confirm your profile, then ask an admin for access.',
      sheetTitle: 'Account setup',
      sheetHint: 'Start with your profile.',
      status: 'Limited access',
      primaryAction: 'Open settings',
      path: '/settings',
      icon: LockKeyhole,
      tone: 'muted',
    };
  }

  return {
    headline: 'All clear for now',
    subhead: providerCount > 0 ? 'Check routine work or leave Today open for new requests.' : 'Start with routine checks or leave Today open.',
    sheetTitle: 'Today',
    sheetHint: 'Choose one routine check.',
    status: 'Clear',
    primaryAction: role.primaryAction,
    path: role.path,
    icon: role.icon,
    tone: 'success',
  };
}
