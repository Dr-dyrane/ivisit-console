import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import {
  HEALTH_NEWS_SORT_FIELDS,
  HEALTH_NEWS_STATS_UNAVAILABLE,
  TABLE_NAME,
} from './constants';
import { normalizeHealthNewsRow } from './normalization';
import { applyHealthNewsFilters } from './queryFilters';

async function getHealthNewsExactCount(filter = {}, quiet = false) {
  try {
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    query = applyHealthNewsFilters(query, filter);

    const { count, error } = await query;
    if (error) throw error;

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching health news exact count:', error);
    }
    throw error;
  }
}

async function getHealthNewsCategoryCount(filter = {}, quiet = false) {
  try {
    let query = supabase.from(TABLE_NAME).select('category');
    query = applyHealthNewsFilters(query, filter);

    const { data, error } = await query;
    if (error) throw error;

    return new Set((data || []).map((row) => row.category).filter(Boolean)).size;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching health news category count:', error);
    }
    throw error;
  }
}

export async function getHealthNewsPageStats(filter = {}, quiet = false) {
  const [total, medical, recent, categories] = await Promise.all([
    getHealthNewsExactCount(filter, quiet),
    getHealthNewsExactCount({ ...filter, category: 'medical' }, quiet),
    getHealthNewsExactCount({ ...filter, kpiFilter: 'recent' }, quiet),
    getHealthNewsCategoryCount(filter, quiet),
  ]);

  return {
    total,
    published: total,
    draft: 0,
    medical,
    recent,
    categories,
    exactCounts: true,
    available: true,
    scope: 'published_feed',
    draftUnavailable: true,
  };
}

/**
 * Get the Health News page projection for the proved curated published feed.
 */
export async function getHealthNewsPage(filter = {}) {
  try {
    await getCurrentUser();
    const statsFilter = filter.statsFilter || {};

    const statsPromise = getHealthNewsPageStats(statsFilter, true)
      .then((stats) => ({ stats }))
      .catch(() => ({ stats: HEALTH_NEWS_STATS_UNAVAILABLE }));

    let dataQuery = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    dataQuery = applyHealthNewsFilters(dataQuery, filter);

    const sortKey = HEALTH_NEWS_SORT_FIELDS.has(filter.sortKey)
      ? filter.sortKey
      : 'created_at';
    dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      dataQuery = dataQuery.range(offset, offset + limit - 1);
    }

    const [{ data, count, error }, { stats }] = await Promise.all([
      dataQuery,
      statsPromise,
    ]);

    if (error) throw error;
    if (count === null || count === undefined || !Number.isFinite(Number(count))) {
      throw new Error('Health news page count is unavailable.');
    }

    return {
      data: (data || []).map(normalizeHealthNewsRow),
      count: Number(count),
      stats,
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching health news page:', error);
    }
    throw error;
  }
}
