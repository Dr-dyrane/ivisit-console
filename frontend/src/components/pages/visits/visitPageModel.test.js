import {
  getDefaultVisitKpi,
  getVisitSignal,
  getVisitStateCount,
  hasActiveVisitFilters,
} from './visitPageModel';
import {
  countNumber,
  getMobileVisitStateCount,
  hasMobileVisitFilters,
  mobileVisitStates,
  visitWhen,
} from '../../mobile/visits/mobileVisitsModel';

describe('visit page projection models', () => {
  const visits = [
    { id: 'scheduled-1', status: 'scheduled', date: '2026-07-14T08:00:00Z' },
    { id: 'active-1', status: 'in_progress', scheduled_at: '2026-07-14T09:00:00Z' },
    { id: 'done-1', status: 'completed', created_at: '2026-07-14T10:00:00Z' },
  ];

  it('prefers authoritative statistics and falls back to the loaded projection', () => {
    expect(getVisitStateCount({ id: 'scheduled', stats: { scheduled: 8 }, visits })).toBe(8);
    expect(getVisitStateCount({ id: 'in_progress', stats: null, visits })).toBe(1);
    expect(getVisitStateCount({ id: 'all', stats: null, visits })).toBe(3);
  });

  it('selects the first actionable KPI carrying signal', () => {
    expect(getDefaultVisitKpi({ scheduled: 2, inProgress: 4 })).toBe('scheduled');
    expect(getDefaultVisitKpi({ scheduled: 0, inProgress: 4 })).toBe('in_progress');
    expect(getDefaultVisitKpi({ scheduled: 0, inProgress: 0 })).toBe('all');
  });

  // ADOPT-65: the Today chip prefers the service stat and its fallback uses
  // the calendar-day predicate -- never a status === 'today' match (which is
  // always zero) and never a fabricated count.
  it('counts the Today chip from stats or the calendar-day fallback', () => {
    const todayIso = new Date().toISOString().split('T')[0];
    const dayScopedVisits = [
      { id: 'v-today', status: 'completed', date: `${todayIso}T08:00:00Z` },
      { id: 'v-old', status: 'scheduled', date: '2020-01-01T08:00:00Z' },
    ];

    expect(getVisitStateCount({ id: 'today', stats: { today: 7 }, visits: dayScopedVisits })).toBe(7);
    expect(getVisitStateCount({ id: 'today', stats: null, visits: dayScopedVisits })).toBe(1);
    expect(getVisitStateCount({ id: 'today', stats: null, visits: [] })).toBe(0);
  });

  it('carries an honest Today signal for both zero and populated counts', () => {
    expect(getVisitSignal({ stats: { today: 0 }, visits: [], kpiFilter: 'today', loadError: null }))
      .toEqual(expect.objectContaining({ tone: 'primary', label: 'Today', headline: 'No visits today' }));
    expect(getVisitSignal({ stats: { today: 2 }, visits: [], kpiFilter: 'today', loadError: null }))
      .toEqual(expect.objectContaining({ headline: '2 visits today' }));
  });

  it('keeps failed-empty and normal visit signals distinct', () => {
    expect(getVisitSignal({ stats: null, visits: [], kpiFilter: 'all', loadError: 'failed' }))
      .toEqual(expect.objectContaining({ tone: 'danger', headline: 'Visits did not load' }));
    expect(getVisitSignal({ stats: { total: 3 }, visits, kpiFilter: 'all', loadError: null }))
      .toEqual(expect.objectContaining({ tone: 'primary', headline: '3 visit records' }));
  });

  it('normalizes the same filter and timestamp contract for desktop and mobile', () => {
    expect(hasActiveVisitFilters({ status: ['scheduled'] })).toBe(true);
    expect(hasMobileVisitFilters({ visit_type: ['Emergency'] })).toBe(true);
    expect(hasActiveVisitFilters({})).toBe(false);
    expect(hasMobileVisitFilters({})).toBe(false);
    expect(visitWhen(visits[0])).toBe(visits[0].date);
    expect(visitWhen(visits[1])).toBe(visits[1].scheduled_at);
    expect(visitWhen(visits[2])).toBe(visits[2].created_at);
  });

  it('uses service statistics for mobile KPIs without manufacturing invalid counts', () => {
    const active = mobileVisitStates.find((item) => item.id === 'in_progress');
    expect(countNumber('12', 0)).toBe(12);
    expect(countNumber('not-a-number', 4)).toBe(4);
    expect(getMobileVisitStateCount({ item: active, statistics: { inProgress: 9 }, visits }))
      .toBe(9);
    expect(getMobileVisitStateCount({ item: active, statistics: null, visits })).toBe(1);
  });
});
