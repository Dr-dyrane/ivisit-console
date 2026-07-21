import { getApprovalSignal } from './approvalPresentation';

describe('approval presentation', () => {
  it('describes the same oldest-first order used by the facility queue', () => {
    expect(getApprovalSignal({
      queueType: 'facilities',
      activeStats: { pending: 4 },
      activeId: 'pending',
      loadError: null,
      hasAny: true,
    })).toMatchObject({
      headline: '4 facilities to review',
      subhead: 'Start with the oldest application.',
    });
  });
});
