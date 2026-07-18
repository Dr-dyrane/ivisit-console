import {
  COPILOT_ACTION_IDS,
  validateCopilotProposal,
  validateCopilotRequest,
} from '../model/copilotContracts';
import { getCopilotAction } from '../registry/copilotActionRegistry';

const COPY = Object.freeze({
  [COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN]: {
    title: 'Dashboard explanation',
    empty: 'This dashboard has no current signals available to explain.',
    guardrail: 'This response explains only the evidence passed from the current screen. It cannot change dashboard data or perform an action.',
  },
  [COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS]: {
    title: 'Readiness explanation',
    empty: 'This organization has no current readiness evidence available to explain.',
    guardrail: 'This response explains only the current readiness evidence. It cannot change organization eligibility, status, or verification.',
  },
  [COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION]: {
    title: 'Emergency next-action explanation',
    empty: 'This emergency has no current lifecycle evidence available to explain.',
    guardrail: 'This response explains only the current emergency evidence. It cannot dispatch, cancel, complete, or otherwise change the emergency lifecycle.',
  },
});

const getEvidenceContext = (request, action) => request.context[action.contextKey];

const getSummary = ({ heading, evidence, empty }) => {
  if (evidence.length === 0) return empty;
  const subject = heading ? `${heading} has` : 'This screen has';
  return `${subject} ${evidence.length} current signal${evidence.length === 1 ? '' : 's'} available for review.`;
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

  return validateCopilotProposal({
    version: 1,
    proposalOnly: true,
    actionId: action.id,
    kind: 'explanation',
    availability: evidence.length > 0 ? 'available' : 'unavailable',
    title: context.heading || copy.title,
    summary: getSummary({ heading: context.heading, evidence, empty: copy.empty }),
    evidence,
    guardrail: copy.guardrail,
    suggestedActions: [],
    source: 'local-deterministic',
  });
};
