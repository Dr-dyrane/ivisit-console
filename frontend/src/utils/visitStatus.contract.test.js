import {
  canonicalizeVisitStatus,
  countVisitsByResolvedStatus,
  resolveVisitStatus,
  visitMatchesResolvedState,
} from './visitStatus';

describe('visit status source-of-truth resolver', () => {
  it('canonicalizes legacy visit status aliases before UI counts render', () => {
    expect(canonicalizeVisitStatus('upcoming')).toBe('scheduled');
    expect(canonicalizeVisitStatus('active')).toBe('in_progress');
    expect(canonicalizeVisitStatus('no-show')).toBe('cancelled');
  });

  it('lets linked emergency lifecycle override unresolved scheduled/upcoming visit rows', () => {
    expect(resolveVisitStatus({ visitStatus: 'upcoming', emergencyStatus: 'accepted' })).toBe('in_progress');
    expect(resolveVisitStatus({ visitStatus: 'scheduled', emergencyStatus: 'completed' })).toBe('completed');
    expect(resolveVisitStatus({ visitStatus: 'upcoming', emergencyStatus: 'cancelled' })).toBe('cancelled');
    expect(resolveVisitStatus({ visitStatus: 'completed', emergencyStatus: 'accepted' })).toBe('completed');
  });

  it('counts rows from the resolved status, not the raw database label', () => {
    const rows = [
      { status: resolveVisitStatus({ visitStatus: 'upcoming', emergencyStatus: 'completed' }) },
      { status: resolveVisitStatus({ visitStatus: 'upcoming', emergencyStatus: 'accepted' }) },
      { status: resolveVisitStatus({ visitStatus: 'cancelled', emergencyStatus: 'completed' }) },
      { status: resolveVisitStatus({ visitStatus: 'scheduled', emergencyStatus: null }) },
    ];

    expect(countVisitsByResolvedStatus(rows)).toEqual({
      total: 4,
      scheduled: 1,
      inProgress: 1,
      completed: 1,
      cancelled: 1,
    });
    expect(visitMatchesResolvedState(rows[1], 'in_progress')).toBe(true);
  });
});
