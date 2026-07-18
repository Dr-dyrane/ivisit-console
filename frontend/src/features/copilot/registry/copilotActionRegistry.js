import { COPILOT_ACTION_IDS } from '../model/copilotContracts';

export const COPILOT_ACTION_REGISTRY = Object.freeze({
  [COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN]: Object.freeze({
    id: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
    title: 'Explain this dashboard',
    contextKey: 'dashboard',
    kind: 'explanation',
    mode: 'proposal-only',
    authority: 'scoped-read-projection',
  }),
  [COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS]: Object.freeze({
    id: COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS,
    title: 'Explain readiness',
    contextKey: 'organization',
    kind: 'explanation',
    mode: 'proposal-only',
    authority: 'scoped-read-projection',
  }),
  [COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION]: Object.freeze({
    id: COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
    title: 'Explain next action',
    contextKey: 'emergency',
    kind: 'explanation',
    mode: 'proposal-only',
    authority: 'backend-derived-read-only-evidence',
  }),
});

export const getCopilotAction = (actionId) => COPILOT_ACTION_REGISTRY[actionId] || null;

export const isCopilotActionAllowed = (actionId) => Boolean(getCopilotAction(actionId));
