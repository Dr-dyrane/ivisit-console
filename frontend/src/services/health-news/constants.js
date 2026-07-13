export const TABLE_NAME = 'health_news';
export const RECENT_NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const HEALTH_NEWS_SORT_FIELDS = new Set([
  'created_at',
  'title',
  'source',
  'category',
  'published',
]);
export const HEALTH_NEWS_STATS_UNAVAILABLE = Object.freeze({
  total: null,
  published: null,
  draft: null,
  medical: null,
  recent: null,
  categories: null,
  exactCounts: false,
  available: false,
  reason: 'stats_query_failed',
  scope: 'published_feed',
  draftUnavailable: true,
});
export const WRITABLE_COLUMNS = new Set([
  'title',
  'source',
  'category',
  'url',
  'published',
  'image_url',
]);
