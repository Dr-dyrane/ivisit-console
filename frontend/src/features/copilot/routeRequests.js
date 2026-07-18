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
  ...(value !== null && value !== undefined && value !== '' ? { value: String(value).trim().slice(0, 280) } : {}),
  ...(description ? { description: String(description).trim().slice(0, 600) } : {}),
  status,
});

const copyableEvidenceItem = (label, value, copyText, status = 'neutral', description) => ({
  ...evidenceItem(label, value, status, description),
  copyText: String(copyText).trim().slice(0, 1200),
});

const titleCase = (value) => String(value || '')
  .trim()
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Unavailable';

const safeText = (value, fallback = 'Unavailable') => {
  const textValue = String(value || '').trim();
  return textValue || fallback;
};

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

const getMatchingFaqs = (ticket, faqs) => {
  const ticketText = `${ticket?.subject || ''} ${ticket?.message || ''} ${ticket?.category || ''}`.toLowerCase();
  const keywords = new Set(ticketText.match(/[a-z0-9]{4,}/g) || []);

  return (Array.isArray(faqs) ? faqs : [])
    .filter((faq) => faq?.question)
    .filter((faq) => {
      const faqText = `${faq.question || ''} ${faq.category || ''}`.toLowerCase();
      return [...keywords].some((keyword) => faqText.includes(keyword));
    })
    .slice(0, 2);
};

export const createSupportTicketGuidanceRequest = ({ ticket, faqs = [] } = {}) => {
  const subject = safeText(ticket?.subject, 'Support request');
  const status = titleCase(ticket?.status || 'open');
  const priority = titleCase(ticket?.priority || 'normal');
  const category = titleCase(ticket?.category || 'general');
  const matchingFaqs = getMatchingFaqs(ticket, faqs);
  const nextStep = /^(resolved|closed)$/i.test(ticket?.status || '')
    ? 'Confirm the resolution matches the request before replying.'
    : /^(urgent|high)$/i.test(ticket?.priority || '')
      ? 'Review the request promptly before preparing a response.'
      : 'Review the request details and any matching FAQ before responding.';
  const replyDraft = `Hello,\n\nThank you for contacting iVisit about "${subject}". Your request is currently marked ${status}. We are reviewing the details provided and will share any update through the approved support channel.\n\n— iVisit Support`;

  return {
    actionId: COPILOT_ACTION_IDS.SUPPORT_TICKET_GUIDANCE,
    context: {
      supportTicket: {
        heading: subject,
        evidence: [
          evidenceItem('Request summary', subject, 'neutral', safeText(ticket?.message, 'No message was provided.')),
          evidenceItem('Current status', status),
          evidenceItem('Priority', priority, /^(urgent|high)$/i.test(ticket?.priority || '') ? 'attention' : 'neutral'),
          evidenceItem('Category', category),
          evidenceItem(
            'FAQ matches',
            matchingFaqs.length ? matchingFaqs.map((faq) => faq.question).join(' · ') : 'No matching FAQ in the current references',
            matchingFaqs.length ? 'ready' : 'neutral',
            matchingFaqs.length ? 'Matches are based only on the FAQ references already visible on this route.' : 'No additional FAQ search was run.',
          ),
          evidenceItem('Suggested next step', nextStep, /^(urgent|high)$/i.test(ticket?.priority || '') ? 'attention' : 'neutral'),
          copyableEvidenceItem(
            'Local reply draft',
            replyDraft,
            replyDraft,
            'neutral',
            'Copy this draft to an approved support channel after review. It is not sent or saved here.',
          ),
        ],
      },
    },
  };
};

export const createQuickSearchAskRequest = ({ query, resultGroups = [] } = {}) => {
  const visibleGroups = (Array.isArray(resultGroups) ? resultGroups : [])
    .filter((group) => group?.category && Array.isArray(group.items) && group.items.length > 0)
    .slice(0, 8);
  const total = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

  return {
    actionId: COPILOT_ACTION_IDS.QUICK_SEARCH_ASK,
    context: {
      quickSearch: {
        heading: `Search: ${safeText(query, 'Current results')}`.slice(0, 160),
        evidence: [
          evidenceItem('Visible results', `${total} result${total === 1 ? '' : 's'} across ${visibleGroups.length} group${visibleGroups.length === 1 ? '' : 's'}`),
          ...visibleGroups.map((group) => evidenceItem(
            group.category,
            `${group.items.length} visible result${group.items.length === 1 ? '' : 's'}`,
            'neutral',
            group.items.slice(0, 3).map((item) => safeText(item?.title, 'Untitled')).join(' · '),
          )),
          evidenceItem('Suggested next step', 'Open a visible result to review its route-owned details.'),
        ],
      },
    },
  };
};

export const createHealthNewsGuidanceRequest = ({ article, relatedEntries = [] } = {}) => {
  const title = safeText(article?.title, 'Health update');
  const category = safeText(article?.category, 'General');
  const source = safeText(article?.source_host || article?.source, 'Unknown source');
  const validSourceUrl = Boolean(article?.source_url_valid && article?.url);
  const related = (Array.isArray(relatedEntries) ? relatedEntries : [])
    .filter((entry) => entry?.id && entry.id !== article?.id)
    .filter((entry) => String(entry?.category || '').trim().toLowerCase() === category.toLowerCase())
    .slice(0, 3);

  return {
    actionId: COPILOT_ACTION_IDS.HEALTH_NEWS_GUIDANCE,
    context: {
      healthNews: {
        heading: title,
        evidence: [
          evidenceItem('Publication', article?.published === false ? 'Not published' : 'Published', article?.published === false ? 'attention' : 'ready'),
          evidenceItem('Source', source),
          evidenceItem(
            'Source link check',
            validSourceUrl ? 'Valid http(s) link' : 'No valid source link',
            validSourceUrl ? 'ready' : 'blocked',
            validSourceUrl ? 'The URL format is valid; publisher authority still needs review.' : 'No source-quality conclusion can be made without a valid link.',
          ),
          evidenceItem('Category', category),
          evidenceItem(
            'Related entries in this list',
            related.length ? related.map((entry) => safeText(entry.title, 'Untitled article')).join(' · ') : 'No related entries in the current list',
            'neutral',
            'Related entries use only the currently visible list and matching category.',
          ),
          evidenceItem('Suggested next step', 'Review the source, link, and related entries before relying on this article.', 'attention'),
        ],
      },
    },
  };
};
