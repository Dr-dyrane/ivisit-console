import { COPILOT_ACTION_IDS, COPILOT_COMMAND_IDS } from './model/copilotContracts';

const toneToStatus = (tone) => ({
  success: 'ready',
  warning: 'attention',
  danger: 'critical',
  destructive: 'critical',
  muted: 'neutral',
  primary: 'neutral',
}[tone] || 'neutral');

const evidenceItem = (label, value, status = 'neutral', description) => ({
  label,
  ...(value !== null && value !== undefined && value !== '' ? { value: String(value) } : {}),
  ...(description ? { description } : {}),
  status,
});

const workflowAction = (id, label, description, commandId) => ({
  id,
  label,
  description,
  availability: 'available',
  stages: ['prepare', 'confirm', 'execute'],
  requiresConfirmation: true,
  command: { id: commandId },
});

const dashboardWorkflowActions = (roleKind) => {
  const role = String(roleKind || '').toLowerCase();
  const actions = [];

  if (['admin', 'org_admin', 'provider', 'dispatcher'].includes(role)) {
    actions.push(workflowAction(
      'review.requests',
      'Review requests',
      'Open the active request workspace.',
      COPILOT_COMMAND_IDS.OPEN_REQUESTS,
    ));
  }
  if (['admin', 'org_admin'].includes(role)) {
    actions.push(
      workflowAction('review.approvals', 'Review approvals', 'Open the onboarding approval queue.', COPILOT_COMMAND_IDS.OPEN_APPROVALS),
      workflowAction('manage.facilities', 'Review facilities', 'Open facility readiness and capacity records.', COPILOT_COMMAND_IDS.OPEN_FACILITIES),
      workflowAction('manage.providers', 'Manage providers', 'Open the provider directory.', COPILOT_COMMAND_IDS.OPEN_PROVIDERS),
      workflowAction('prepare.schedules', 'Prepare schedules', 'Open staff scheduling.', COPILOT_COMMAND_IDS.OPEN_SCHEDULES),
    );
  }
  if (role === 'admin') {
    actions.splice(2, 0, workflowAction(
      'manage.organizations',
      'Review organizations',
      'Open organization onboarding and readiness.',
      COPILOT_COMMAND_IDS.OPEN_ORGANIZATIONS,
    ));
  }
  if (['provider', 'dispatcher'].includes(role)) {
    actions.push(workflowAction(
      'track.live',
      'Open live map',
      'Open live request and responder tracking.',
      COPILOT_COMMAND_IDS.OPEN_LIVE_MAP,
    ));
  }
  return actions.slice(0, 6);
};

const titleCaseToken = (value) => String(value)
  .toLowerCase()
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatPaymentEvidence = (value) => String(value)
  .split(/\s+\u00b7\s+/)
  .map((part) => {
    const token = part.trim();
    if (/^[A-Z][A-Z_]+$/.test(token)) return titleCaseToken(token);
    if (/^(completed|pending|failed|cancelled|canceled|refunded)$/i.test(token)) {
      return titleCaseToken(token);
    }
    return token;
  })
  .join(' \u00b7 ');

export const createDashboardExplainRequest = ({ today, live, glanceItems = [], roleKind }) => ({
  actionId: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
  context: {
    dashboard: {
      heading: today?.sheetTitle || today?.headline || 'Today',
      evidence: [
        evidenceItem('Dashboard status', today?.status || 'Unavailable', toneToStatus(today?.tone)),
        evidenceItem('Data connection', live ? 'Live' : 'Retry needed', live ? 'ready' : 'attention'),
        ...glanceItems.slice(0, 6).map((item) => (
          evidenceItem(item.label, item.value, toneToStatus(item.tone))
        )),
      ],
      suggestedActions: dashboardWorkflowActions(roleKind),
    },
  },
});

export const createOrganizationReadinessRequest = ({
  organization,
  verificationLabel,
  typeValue,
  walletValue,
  locationValue,
}) => {
  const verificationStatus = String(organization?.verification_status || '').toLowerCase();
  const status = verificationStatus === 'verified'
    ? 'ready'
    : verificationStatus === 'rejected'
      ? 'blocked'
      : verificationStatus ? 'attention' : 'neutral';

  return {
    actionId: COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS,
    context: {
      organization: {
        heading: organization?.name || 'Organization readiness',
        evidence: [
          evidenceItem('Verification', verificationLabel || 'Unavailable', status),
          evidenceItem('Organization type', typeValue || 'Not set'),
          evidenceItem('Wallet', walletValue || 'Unavailable'),
          evidenceItem('Location', locationValue || 'Not set'),
          ...(organization?.rejection_reason
            ? [evidenceItem('Rejection reason', organization.rejection_reason, 'blocked')]
            : []),
        ],
        suggestedActions: [
          workflowAction('organization.approvals', 'Review verification', 'Open organization and facility approvals.', COPILOT_COMMAND_IDS.OPEN_APPROVALS),
          workflowAction('organization.facilities', 'Review facilities', 'Open facilities linked to onboarding operations.', COPILOT_COMMAND_IDS.OPEN_FACILITIES),
          workflowAction('organization.providers', 'Manage providers', 'Open provider onboarding and access.', COPILOT_COMMAND_IDS.OPEN_PROVIDERS),
          workflowAction('organization.schedules', 'Prepare schedules', 'Open staff scheduling and rosters.', COPILOT_COMMAND_IDS.OPEN_SCHEDULES),
        ],
      },
    },
  };
};

export const createEmergencyNextActionRequest = ({
  heading,
  statusLabel,
  primaryAction,
  arrivalConfirmation,
  paymentValue,
  responderValue,
  destinationValue,
  canOpenFinance = false,
}) => {
  const nextActionStatus = !primaryAction?.available
    ? 'blocked'
    : primaryAction?.kind === 'details' ? 'neutral' : 'attention';

  return {
    actionId: COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
    context: {
      emergency: {
        heading: heading || 'Emergency request',
        evidence: [
          evidenceItem('Lifecycle status', statusLabel || 'Unavailable'),
          evidenceItem(
            'Next available action',
            primaryAction?.label || 'Unavailable',
            nextActionStatus,
            primaryAction?.available ? undefined : primaryAction?.reason,
          ),
          ...(arrivalConfirmation
            ? [evidenceItem('Patient arrival', arrivalConfirmation, arrivalConfirmation.startsWith('Confirmed') ? 'ready' : 'attention')]
            : []),
          ...(paymentValue ? [evidenceItem('Payment', formatPaymentEvidence(paymentValue))] : []),
          ...(responderValue ? [evidenceItem('Responder', responderValue)] : []),
          ...(destinationValue ? [evidenceItem('Destination', destinationValue)] : []),
        ],
        suggestedActions: [
          workflowAction('emergency.requests', 'Open request workspace', 'Review the request in its canonical workspace.', COPILOT_COMMAND_IDS.OPEN_REQUESTS),
          workflowAction('emergency.map', 'Open live map', 'Review responder and route tracking.', COPILOT_COMMAND_IDS.OPEN_LIVE_MAP),
          ...(canOpenFinance
            ? [workflowAction('emergency.finance', 'Open Finance', 'Review payment records and available finance actions.', COPILOT_COMMAND_IDS.OPEN_FINANCE)]
            : []),
        ],
      },
    },
  };
};
