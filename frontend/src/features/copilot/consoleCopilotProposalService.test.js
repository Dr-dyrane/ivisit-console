import { COPILOT_ACTION_IDS } from './model/copilotContracts';
import { COPILOT_ACTION_REGISTRY } from './registry/copilotActionRegistry';
import { createLocalCopilotProposal } from './services/consoleCopilotProposalService';

describe('local Console Copilot proposals', () => {
  it.each([
    [COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN, 'dashboard'],
    [COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS, 'organization'],
    [COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION, 'emergency'],
  ])('returns a deterministic read-only proposal for %s', (actionId, contextKey) => {
    const proposal = createLocalCopilotProposal({
      actionId,
      context: { [contextKey]: { heading: 'Current evidence', evidence: [{ label: 'Status', value: 'Pending', status: 'attention' }] } },
    });

    expect(proposal).toMatchObject({
      actionId,
      proposalOnly: true,
      kind: 'explanation',
      availability: 'available',
      source: 'local-deterministic',
      suggestedActions: [],
    });
    expect(proposal.execution).toBeUndefined();
    expect(proposal.evidence).toEqual([{ label: 'Status', value: 'Pending', status: 'attention' }]);
  });

  it('reports unavailable instead of inventing a conclusion for empty evidence', () => {
    const proposal = createLocalCopilotProposal({
      actionId: COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
      context: { emergency: { evidence: [] } },
    });

    expect(proposal.availability).toBe('unavailable');
    expect(proposal.evidence).toEqual([]);
    expect(proposal.summary).toBe('No request details are available yet.');
  });

  it('keeps every registered P0 action proposal-only', () => {
    Object.values(COPILOT_ACTION_REGISTRY).forEach((action) => {
      expect(action.mode).toBe('proposal-only');
      expect(['scoped-read-projection', 'backend-derived-read-only-evidence']).toContain(action.authority);
    });
  });
});
