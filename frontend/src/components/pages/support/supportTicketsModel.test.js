import {
  buildSupportAnalytics,
  buildSupportQueryFilter,
  getSupportSignal,
  getSupportStateCount,
  hasActiveSupportFilters,
} from './supportTicketsModel';

describe('Support page projection model', () => {
  it('preserves the route query, stats scope, pagination, and time sort contract', () => {
    expect(buildSupportQueryFilter({
      filters: {
        search: 'billing',
        status: ['closed'],
        priority: ['urgent'],
        category: ['billing'],
        kpiFilter: 'all',
      },
      kpiFilter: 'open',
      limit: 20,
      offset: 40,
      sortConfig: { key: 'updated_at', direction: 'desc' },
    })).toEqual({
      search: 'billing',
      status: 'open',
      priority: ['urgent'],
      category: ['billing'],
      statsFilter: {
        search: 'billing',
        priority: ['urgent'],
        category: ['billing'],
      },
      limit: 20,
      offset: 40,
      sortKey: 'updated_at',
      sortDirection: 'desc',
      quiet: true,
    });
  });

  it('keeps sheet status filters when the KPI scope is All while stats stay status-agnostic', () => {
    const projection = buildSupportQueryFilter({
      filters: {
        search: '',
        status: ['resolved', 'closed'],
        priority: [],
        category: [],
        kpiFilter: 'all',
      },
      kpiFilter: 'all',
      limit: 20,
      offset: 0,
      sortConfig: { key: 'updated_at', direction: 'asc' },
    });

    expect(projection.status).toEqual(['resolved', 'closed']);
    expect(projection.statsFilter).not.toHaveProperty('status');
    expect(projection).not.toHaveProperty('kpiFilter');
  });

  it('characterizes visible-page analytics without inventing timing or priority totals', () => {
    const analytics = buildSupportAnalytics(
      { total: 8, open: 3, active: 4, resolved: 2 },
      [
        {
          status: 'resolved',
          priority: 'high',
          category: 'billing',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-01T06:00:00.000Z',
        },
        { status: 'open', priority: 'normal', category: 'technical' },
      ]
    );

    expect(analytics).toMatchObject({
      total: 8,
      open: 3,
      active: 4,
      resolved: 2,
      averageResolutionTime: 6,
      averageResolutionScope: 'visible_page',
      distributionScope: 'visible_page',
      distributionLabel: 'Current page',
      visibleCount: 2,
      byStatus: { resolved: 1, open: 1 },
      byPriority: { high: 1, normal: 1 },
      byCategory: { billing: 1, technical: 1 },
    });

    expect(buildSupportAnalytics({}, [])).toMatchObject({
      averageResolutionTime: null,
      visibleCount: 0,
    });
  });

  it('preserves KPI fallbacks, active-filter truth, and the cold-load error signal', () => {
    const tickets = [{ status: 'open' }, { status: 'in_progress' }, { status: 'closed' }];
    expect(getSupportStateCount({ id: 'in_progress', stats: {}, tickets })).toBe(2);
    expect(getSupportStateCount({ id: 'in_progress', stats: { active: 7 }, tickets })).toBe(7);
    expect(hasActiveSupportFilters({ search: '', status: [], priority: [], category: [] }, 'all')).toBe(false);
    expect(hasActiveSupportFilters({ search: 'help' }, 'all')).toBe(true);
    expect(getSupportSignal({
      stats: {},
      tickets: [],
      kpiFilter: 'all',
      isProviderOnly: false,
      loadError: 'failed',
      hasAny: false,
    })).toMatchObject({
      tone: 'danger',
      label: 'Load failed',
      headline: 'Support did not load',
    });
  });
});
