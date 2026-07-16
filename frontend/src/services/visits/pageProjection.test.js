import {
  applyResolvedVisitFilters,
  getVisitPageStatsFromRows,
  visitOccursToday,
} from './pageProjection';

// ADOPT-65 gates: the Today KPI count and the Today KPI filter must share one
// calendar-day predicate so the chip number and the filtered list can never
// disagree, and 'today' must never masquerade as a lifecycle status.

const todayIso = new Date().toISOString().split('T')[0];
const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const rows = [
  { id: 'today-scheduled', status: 'scheduled', date: `${todayIso}T08:00:00Z` },
  { id: 'today-done', status: 'completed', date: `${todayIso}T09:30:00Z` },
  { id: 'today-created-only', status: 'completed', date: null, created_at: `${todayIso}T04:15:00Z` },
  { id: 'yesterday', status: 'scheduled', date: `${yesterdayIso}T10:00:00Z` },
];

describe('visits page projection Today scope (ADOPT-65)', () => {
  it('scopes by calendar day with the stats fallback chain, never fabricating a match', () => {
    expect(visitOccursToday(rows[0])).toBe(true);
    // created_at fallback: identical to the stats derivation chain.
    expect(visitOccursToday(rows[2])).toBe(true);
    expect(visitOccursToday(rows[3])).toBe(false);
    // Honest null: a row without any date truth is never counted as today.
    expect(visitOccursToday({ id: 'dateless', status: 'scheduled' })).toBe(false);
  });

  it('keeps the Today chip count and the Today-filtered list in exact agreement', () => {
    const stats = getVisitPageStatsFromRows(rows);
    const filtered = applyResolvedVisitFilters(rows, {}, 'today');

    expect(stats.today).toBe(3);
    expect(filtered.map((row) => row.id)).toEqual([
      'today-scheduled',
      'today-done',
      'today-created-only',
    ]);
    expect(filtered).toHaveLength(stats.today);
    // The lifecycle counts stay untouched by the Today derivation.
    expect(stats).toMatchObject({ total: 4, scheduled: 2, completed: 2, cancelled: 0 });
  });

  it("keeps 'today' out of the status lane while composing with status filters", () => {
    // FilterSheet status filters still apply on top of the day scope.
    expect(applyResolvedVisitFilters(rows, { status: ['completed'] }, 'today').map((row) => row.id))
      .toEqual(['today-done', 'today-created-only']);
    // A status KPI is untouched by the day predicate.
    expect(applyResolvedVisitFilters(rows, {}, 'scheduled').map((row) => row.id))
      .toEqual(['today-scheduled', 'yesterday']);
    // The all scope stays whole.
    expect(applyResolvedVisitFilters(rows, {}, 'all')).toHaveLength(4);
  });
});
