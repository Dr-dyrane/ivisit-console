import {
  buildHealthNewsAnalytics,
  buildHealthNewsPanelContext,
  buildHealthNewsQueryFilter,
  buildVisibleHealthNewsStats,
  getNewsSignal,
  hasAppliedFilters,
  mergeMobileNewsFeed,
} from './healthNewsPageModel';

describe('healthNewsPageModel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the list filter scoped while statistics stay status agnostic', () => {
    expect(buildHealthNewsQueryFilter({
      filters: { search: 'care', published: true, category: 'medical' },
      kpiFilter: 'recent',
      itemsPerPage: 20,
      offset: 40,
      sortConfig: { key: 'created_at', direction: 'desc' },
    })).toEqual({
      search: 'care',
      published: true,
      category: 'medical',
      kpiFilter: 'recent',
      statsFilter: { search: 'care', category: 'medical' },
      limit: 20,
      offset: 40,
      sortKey: 'created_at',
      sortDirection: 'desc',
      quiet: true,
    });
  });

  it('degrades failed statistics to visible-row counts without hiding the feed', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-13T12:00:00Z').getTime());
    const stats = buildVisibleHealthNewsStats([
      { id: 'one', published: true, category: 'Medical', created_at: '2026-07-12T12:00:00Z' },
      { id: 'two', published: false, category: 'policy', created_at: '2026-06-01T12:00:00Z' },
    ]);

    expect(stats).toMatchObject({
      total: 2,
      published: 1,
      draft: 1,
      medical: 1,
      recent: 1,
      categories: 2,
      exactCounts: false,
      available: false,
      reason: 'stats_query_failed',
      scope: 'visible_rows',
      draftUnavailable: true,
    });
  });

  it('labels source/category distributions as visible-page evidence', () => {
    const analytics = buildHealthNewsAnalytics({
      rows: [
        { source: 'WHO', category: 'Medical' },
        { source: 'WHO', category: 'Policy' },
      ],
      stats: { total: 12 },
      statsUnavailable: true,
    });

    expect(analytics).toMatchObject({
      total: 12,
      bySource: { WHO: 2 },
      byCategory: { medical: 1, policy: 1 },
      distributionScope: 'visible_page',
      distributionLabel: 'Loaded rows (statistics unavailable)',
      visibleCount: 2,
    });
  });

  it('replaces page one and appends later mobile windows without duplicate ids', () => {
    const firstPage = [{ id: 'one' }, { id: 'two' }];
    expect(mergeMobileNewsFeed({
      previousRows: [{ id: 'old' }],
      pageRows: firstPage,
      currentPage: 1,
    })).toEqual(firstPage);

    expect(mergeMobileNewsFeed({
      previousRows: firstPage,
      pageRows: [{ id: 'two' }, { id: 'three' }],
      currentPage: 2,
    })).toEqual([{ id: 'one' }, { id: 'two' }, { id: 'three' }]);
  });

  it('publishes an explicitly read-only route context', () => {
    expect(buildHealthNewsPanelContext({
      newsRows: [{ id: 'one' }],
      focusedNews: { id: 'one' },
      stats: { total: 1, scope: 'published_feed' },
      pagination: { totalCount: 1, currentPage: 1, totalPages: 1 },
      filters: { category: 'medical' },
      kpiFilter: 'all',
      loading: false,
      healthNewsError: null,
      statsUnavailable: false,
    })).toMatchObject({
      count: 1,
      hasFilters: true,
      authoringAvailable: false,
      statsAvailable: true,
      scope: 'published_feed',
    });
  });

  it('keeps filter and locked-draft signals honest', () => {
    expect(hasAppliedFilters({}, 'all')).toBe(false);
    expect(hasAppliedFilters({ search: 'news' }, 'all')).toBe(true);
    expect(getNewsSignal({
      stats: { draft: 0 },
      news: [],
      kpiFilter: 'draft',
      loadError: null,
      hasAny: false,
    })).toMatchObject({
      label: 'Drafts',
      headline: 'Draft writing is locked',
    });
  });
});
