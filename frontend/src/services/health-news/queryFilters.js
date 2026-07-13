import { RECENT_NEWS_WINDOW_MS } from './constants';
import { normalizePublishedFilter, sanitizeSearchTerm } from './normalization';

export function applyHealthNewsPublishedScope(query) {
  // Current maintained policy proves only the curated published feed.
  return query.eq('published', true);
}

export function applyHealthNewsFilters(query, filter = {}) {
  query = applyHealthNewsPublishedScope(query);

  const kpiFilter = String(filter.kpiFilter || 'all');
  if (kpiFilter === 'draft') query = query.eq('published', false);
  if (kpiFilter === 'medical') query = query.eq('category', 'medical');
  if (kpiFilter === 'recent') {
    query = query.gt('created_at', new Date(Date.now() - RECENT_NEWS_WINDOW_MS).toISOString());
  }

  const published = normalizePublishedFilter(filter.published);
  if (published !== undefined) {
    query = query.eq('published', published);
  }

  if (filter.category) query = query.eq('category', filter.category);
  if (filter.source) query = query.eq('source', filter.source);

  const dateRange = filter.created_at;
  if (dateRange?.start) {
    query = query.gte('created_at', new Date(`${dateRange.start}T00:00:00`).toISOString());
  }
  if (dateRange?.end) {
    query = query.lte('created_at', new Date(`${dateRange.end}T23:59:59`).toISOString());
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,source.ilike.%${search}%,category.ilike.%${search}%`
    );
  }

  return query;
}
