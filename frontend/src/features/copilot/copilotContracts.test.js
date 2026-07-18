import {
  COPILOT_ACTION_IDS,
  COPILOT_COMMAND_IDS,
  CopilotContractError,
  validateCopilotCommand,
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

  it('rejects legacy or uncontracted executable proposals', () => {
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

  it('admits only fixed commands with no path, payload, RPC, or SQL input', () => {
    expect(validateCopilotCommand({ id: COPILOT_COMMAND_IDS.OPEN_APPROVALS }))
      .toEqual({ id: COPILOT_COMMAND_IDS.OPEN_APPROVALS });

    [
      { id: 'workflow.open_anything' },
      { id: COPILOT_COMMAND_IDS.OPEN_APPROVALS, path: '/admin' },
      { id: COPILOT_COMMAND_IDS.OPEN_APPROVALS, payload: { verified: true } },
      { id: COPILOT_COMMAND_IDS.OPEN_APPROVALS, rpc: 'verify_organization' },
      { id: COPILOT_COMMAND_IDS.OPEN_APPROVALS, sql: 'select * from profiles' },
    ].forEach((command) => {
      expect(() => validateCopilotCommand(command)).toThrow(CopilotContractError);
    });
  });
});
