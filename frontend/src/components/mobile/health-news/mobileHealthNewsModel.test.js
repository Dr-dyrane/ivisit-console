import {
  buildMobileHealthNewsKpis,
  categoryLabel,
  getMobileHealthNewsGroups,
  getMobileHealthNewsScopeCount,
  hasActiveNewsFilters,
  isArticlePublished,
  metricValue,
} from './mobileHealthNewsModel';

describe('mobileHealthNewsModel', () => {
  it('normalizes compatible publication shapes without inventing a lifecycle', () => {
    expect(isArticlePublished({ published: true })).toBe(true);
    expect(isArticlePublished({ is_published: true })).toBe(true);
    expect(isArticlePublished({ status: 'published' })).toBe(true);
    expect(isArticlePublished({ status: 'draft' })).toBe(false);
    expect(isArticlePublished({})).toBe(false);
  });

  it('keeps KPI counts server-owned and the draft axis locked', () => {
    const kpis = buildMobileHealthNewsKpis({
      stats: { total: 8, published: 8, medical: 2, recent: 1, draft: 0 },
      articleCount: 3,
    });

    expect(kpis.map(({ id, value, delta }) => ({ id, value, delta }))).toEqual([
      { id: 'all', value: 8, delta: 'Current' },
      { id: 'published', value: 8, delta: 'Current' },
      { id: 'medical', value: 2, delta: 'Current' },
      { id: 'recent', value: 1, delta: 'Current' },
      { id: 'draft', value: 0, delta: 'Locked' },
    ]);
  });

  it('uses the active KPI count rather than the loaded row count', () => {
    expect(getMobileHealthNewsScopeCount({
      filters: { kpiFilter: 'medical' },
      stats: { total: 8, medical: 2 },
      articleCount: 3,
    })).toBe(2);
    expect(getMobileHealthNewsScopeCount({
      filters: { kpiFilter: 'all' },
      stats: null,
      articleCount: 3,
    })).toBe(3);
  });

  it('recognizes committed filters and normalizes labels safely', () => {
    expect(hasActiveNewsFilters({})).toBe(false);
    expect(hasActiveNewsFilters({ source: 'WHO' })).toBe(true);
    expect(hasActiveNewsFilters({ kpiFilter: 'recent' })).toBe(true);
    expect(categoryLabel('public_health')).toBe('Public health');
    expect(metricValue('12', 0)).toBe(12);
    expect(metricValue('not-a-number', 4)).toBe(4);
  });

  it('groups every visible article exactly once', () => {
    const articles = [
      { id: 'one', category: 'medical', created_at: '2026-07-12T12:00:00Z' },
      { id: 'two', category: 'policy', created_at: '2026-07-11T12:00:00Z' },
      { id: 'three', category: 'medical', created_at: '2026-06-01T12:00:00Z' },
    ];
    const { groups } = getMobileHealthNewsGroups(articles);
    const groupedIds = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(groupedIds.sort()).toEqual(['one', 'three', 'two']);
  });
});
