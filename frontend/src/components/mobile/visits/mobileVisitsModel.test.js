import { mobileVisitStates } from './mobileVisitsModel';

describe('compact visit status KPIs', () => {
  it('keeps Scheduled as a status filter instead of overloading it as a source switch', () => {
    expect(mobileVisitStates.map((state) => state.id)).toEqual([
      'all',
      'scheduled',
      'in_progress',
      'completed',
      'cancelled',
    ]);
  });
});
