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
