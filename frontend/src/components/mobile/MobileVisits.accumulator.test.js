import {
  createMobileVisitAccumulator,
  mergeMobileVisitPageSnapshot,
} from '../../services/visits/pageProjection';

const row = (id, status = 'scheduled') => ({ id, status });

describe('MobileVisits page accumulation', () => {
  it('accumulates distinct server pages in range order', () => {
    const store = createMobileVisitAccumulator();

    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 3,
      visits: [row('a'), row('b')],
    });
    const result = mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 2,
      totalCount: 3,
      visits: [row('c')],
    });

    expect(result.map((visit) => visit.id)).toEqual(['a', 'b', 'c']);
  });

  it('replaces a refetched page so removed and transitioned rows do not linger', () => {
    const store = createMobileVisitAccumulator();

    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 3,
      visits: [row('a'), row('transitioned')],
    });
    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 2,
      totalCount: 3,
      visits: [row('c')],
    });
    const result = mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 3,
      visits: [row('a', 'in_progress'), row('replacement')],
    });

    expect(result).toEqual([
      row('a', 'in_progress'),
      row('replacement'),
      row('c'),
    ]);
    expect(result.map((visit) => visit.id)).not.toContain('transitioned');
  });

  it('drops stale tail pages when server count contracts', () => {
    const store = createMobileVisitAccumulator();

    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 3,
      visits: [row('a'), row('b')],
    });
    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 2,
      totalCount: 3,
      visits: [row('c')],
    });
    const result = mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 1,
      visits: [row('a')],
    });

    expect(result).toEqual([row('a')]);
    expect([...store.pages.keys()]).toEqual([0]);
  });

  it('resets all accumulated pages when care_mode changes the scope key', () => {
    const store = createMobileVisitAccumulator();

    mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=in_person',
      pageStart: 0,
      totalCount: 2,
      visits: [row('in-person')],
    });
    const result = mergeMobileVisitPageSnapshot(store, {
      scopeKey: 'care_mode=telemedicine_async',
      pageStart: 0,
      totalCount: 1,
      visits: [row('async')],
    });

    expect(result).toEqual([row('async')]);
  });
});
