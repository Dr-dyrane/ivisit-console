import { getCompactVisitKpiTransition } from './mobileVisitsModel';

describe('compact visit KPI source transitions', () => {
  it('keeps status filtering local when scheduled reads are unavailable', () => {
    expect(getCompactVisitKpiTransition({
      nextKpi: 'scheduled',
      viewMode: 'all',
      scheduledViewEnabled: false,
    })).toEqual({ nextKpi: 'scheduled', nextViewMode: null });
  });

  it('uses the Scheduled KPI to enter and leave the scheduled source', () => {
    expect(getCompactVisitKpiTransition({
      nextKpi: 'scheduled',
      viewMode: 'all',
      scheduledViewEnabled: true,
    })).toEqual({ nextKpi: null, nextViewMode: 'scheduled' });

    expect(getCompactVisitKpiTransition({
      nextKpi: 'scheduled',
      viewMode: 'scheduled',
      scheduledViewEnabled: true,
    })).toEqual({ nextKpi: null, nextViewMode: 'all' });
  });

  it('returns to the ordinary source before applying another status KPI', () => {
    expect(getCompactVisitKpiTransition({
      nextKpi: 'completed',
      viewMode: 'scheduled',
      scheduledViewEnabled: true,
    })).toEqual({ nextKpi: 'completed', nextViewMode: 'all' });
  });

  it('lets All leave the scheduled source without a duplicate KPI write', () => {
    expect(getCompactVisitKpiTransition({
      nextKpi: 'all',
      viewMode: 'scheduled',
      scheduledViewEnabled: true,
    })).toEqual({ nextKpi: null, nextViewMode: 'all' });
  });
});
