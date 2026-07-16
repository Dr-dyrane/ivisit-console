import {
  buildHealthNewsAnalytics,
  buildHealthNewsPanelContext,
  buildHealthNewsQueryFilter,
  buildTrendingTopicsTile,
  buildVisibleHealthNewsStats,
  getNewsSignal,
  hasAppliedFilters,
  isUsableHealthNewsTableAnalytics,
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

  it('adopts whole-table analytics only when the read returned rows (ADOPT-62)', () => {
    const tableAnalytics = {
      total: 40,
      published: 31,
      recent: 6,
      bySource: { WHO: 22, CDC: 18 },
      byCategory: { medical: 25, policy: 15 },
    };

    expect(isUsableHealthNewsTableAnalytics(tableAnalytics)).toBe(true);
    expect(buildHealthNewsAnalytics({
      rows: [{ source: 'WHO', category: 'Medical' }],
      stats: { total: 12 },
      statsUnavailable: false,
      tableAnalytics,
    })).toMatchObject({
      total: 40,
      published: 31,
      recent: 6,
      bySource: { WHO: 22, CDC: 18 },
      byCategory: { medical: 25, policy: 15 },
      distributionScope: 'whole_table',
      distributionLabel: 'All articles',
    });

    // The service swallows query errors into an all-zero shape; that shape must
    // NOT masquerade as whole-table truth while the page clearly has rows.
    const zeroShape = { total: 0, published: 0, bySource: {}, byCategory: {}, recent: 0 };
    expect(isUsableHealthNewsTableAnalytics(zeroShape)).toBe(false);
    expect(isUsableHealthNewsTableAnalytics(null)).toBe(false);
    expect(buildHealthNewsAnalytics({
      rows: [{ source: 'WHO', category: 'Medical' }],
      stats: { total: 12 },
      statsUnavailable: false,
      tableAnalytics: zeroShape,
    })).toMatchObject({
      distributionScope: 'visible_page',
      distributionLabel: 'Current page',
      bySource: { WHO: 1 },
    });
  });

  it('builds the trending topics tile from the data-owned timestamps (ADOPT-63)', () => {
    expect(buildTrendingTopicsTile([
      { id: 't1', query: ' flu shots ', category: 'wellness', rank: 1, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-10T09:00:00Z' },
      { id: 't2', query: 'heat safety', category: '', rank: '2', created_at: '2026-07-12T00:00:00Z' },
      { id: 't3', query: '   ', category: 'noise', rank: 3, updated_at: '2026-07-14T00:00:00Z' },
    ])).toEqual({
      topics: [
        { id: 't1', query: 'flu shots', category: 'wellness', rank: 1 },
        { id: 't2', query: 'heat safety', category: null, rank: 2 },
      ],
      count: 2,
      // Stamp comes from the rendered rows' own updated_at/created_at, never
      // the fetch time; the filtered-out blank row cannot contribute its stamp.
      updatedAt: '2026-07-12T00:00:00.000Z',
    });

    // Number('') === 0 must not fabricate a rank of zero.
    expect(buildTrendingTopicsTile([
      { id: 't4', query: 'allergy season', category: 'wellness', rank: '' },
    ]).topics[0].rank).toBeNull();

    expect(buildTrendingTopicsTile([])).toEqual({ topics: [], count: 0, updatedAt: null });
    expect(buildTrendingTopicsTile(null)).toEqual({ topics: [], count: 0, updatedAt: null });
  });

  it('publishes the trending tile through the route context untouched (ADOPT-63)', () => {
    const trendingTopics = { topics: [], count: 0, updatedAt: null, loading: false, errorMessage: null };
    expect(buildHealthNewsPanelContext({
      newsRows: [],
      focusedNews: null,
      stats: { total: 0 },
      pagination: { totalCount: 0, currentPage: 1, totalPages: 1 },
      filters: {},
      kpiFilter: 'all',
      loading: false,
      healthNewsError: null,
      statsUnavailable: false,
      trendingTopics,
    }).trendingTopics).toBe(trendingTopics);
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
