import {
  COPILOT_ACTION_IDS,
  validateCopilotProposal,
  validateCopilotRequest,
} from '../model/copilotContracts';
import { getCopilotAction } from '../registry/copilotActionRegistry';

const COPY = Object.freeze({
  [COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN]: {
    title: 'Dashboard overview',
    empty: 'No dashboard details are available yet.',
    guardrail: 'Review the details before acting.',
  },
  [COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS]: {
    title: 'Readiness overview',
    empty: 'No readiness details are available yet.',
    guardrail: 'Review the details before acting.',
  },
  [COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION]: {
    title: 'Next action',
    empty: 'No request details are available yet.',
    guardrail: 'Confirm the request status before acting.',
  },
  [COPILOT_ACTION_IDS.SUPPORT_TICKET_GUIDANCE]: {
    title: 'Support request review',
    empty: 'No request details are available yet.',
    guardrail: 'Any reply remains local until you send it through an approved support workflow.',
  },
  [COPILOT_ACTION_IDS.QUICK_SEARCH_ASK]: {
    title: 'Visible search results',
    empty: 'No visible search results are available yet.',
    guardrail: 'This guidance only reflects the results currently visible in search.',
  },
  [COPILOT_ACTION_IDS.HEALTH_NEWS_GUIDANCE]: {
    title: 'Article metadata review',
    empty: 'No article details are available yet.',
    guardrail: 'This guidance does not create, edit, publish, or validate editorial content.',
  },
});

const getEvidenceContext = (request, action) => request.context[action.contextKey];

const getSummary = ({ evidence, empty }) => {
  if (evidence.length === 0) return empty;
  return `${evidence.length} detail${evidence.length === 1 ? '' : 's'} to review.`;
};

/**
 * Creates a deterministic, read-only proposal from an already-authorized route
 * projection. This boundary intentionally does not import Supabase, a query
 * hook, an Edge Function client, or an LLM client.
 */
export const createLocalCopilotProposal = (request) => {
  const parsedRequest = validateCopilotRequest(request);
  const action = getCopilotAction(parsedRequest.actionId);
  const copy = COPY[parsedRequest.actionId];
  const context = getEvidenceContext(parsedRequest, action);
  const evidence = context.evidence;
  const suggestedActions = context.suggestedActions || [];

  return validateCopilotProposal({
    version: 2,
    proposalOnly: suggestedActions.length === 0,
    actionId: action.id,
    kind: suggestedActions.length > 0 ? 'guidance' : 'explanation',
    availability: evidence.length > 0 ? 'available' : 'unavailable',
    title: context.heading || copy.title,
    summary: getSummary({ evidence, empty: copy.empty }),
    evidence,
    guardrail: copy.guardrail,
    suggestedActions,
    source: 'local-deterministic',
  });
};
