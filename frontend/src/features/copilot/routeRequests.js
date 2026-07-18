import { COPILOT_ACTION_IDS } from './model/copilotContracts';

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

export const createDashboardExplainRequest = ({ today, live, glanceItems = [] }) => ({
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
      },
    },
  };
};
