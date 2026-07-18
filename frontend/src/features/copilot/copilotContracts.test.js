import {
  COPILOT_ACTION_IDS,
  CopilotContractError,
  validateCopilotProposal,
  validateCopilotRequest,
} from './model/copilotContracts';

describe('Copilot proposal contracts', () => {
  it('accepts only the P0 action allowlist with bounded context', () => {
    expect(validateCopilotRequest({
      actionId: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
      context: { dashboard: { evidence: [{ label: 'Open requests', value: 2 }] } },
    }).actionId).toBe(COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN);

    expect(() => validateCopilotRequest({
      actionId: 'invite.prepare',
      context: { invitation: { evidence: [] } },
    })).toThrow(CopilotContractError);
  });

  it('rejects executable proposals and uncontracted fields', () => {
    expect(() => validateCopilotProposal({
      version: 1,
      proposalOnly: true,
      actionId: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
      kind: 'explanation',
      availability: 'available',
      title: 'Dashboard explanation',
      summary: 'This screen has 1 current signal available for review.',
      evidence: [{ label: 'Open requests' }],
      guardrail: 'This response is read-only.',
      suggestedActions: [],
      execution: { action: 'dispatch' },
      source: 'local-deterministic',
    })).toThrow(CopilotContractError);
  });
});
