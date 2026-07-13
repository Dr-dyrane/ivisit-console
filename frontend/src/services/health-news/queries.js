import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { getCurrentUser } from '../authService';
import { TABLE_NAME } from './constants';

/**
 * Get all health news with optional filters.
 * Admin users can see all news, others see only published news.
 */
export async function getHealthNews(filter) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    if (user?.role !== 'admin') {
      query = query.eq('published', true);
    }

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.source) {
      query = query.eq('source', filter.source);
    }
    if (filter?.published !== undefined) {
      query = query.eq('published', filter.published);
    }

    query = query.order('created_at', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Health news query error:', error);
      return []; // Return empty array on error instead of throwing
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching health news:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get single health news by ID.
 */
export async function getHealthNewsItem(newsId) {
  try {
    if (!isValidUUID(newsId)) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', newsId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching health news ${newsId}:`, error);
    throw error;
  }
}

/**
 * Get latest health news.
 */
export async function getLatestHealthNews(limit = 10) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching latest health news:', error);
    throw error;
  }
}

/**
 * Get news by category.
 */
export async function getNewsByCategory(category) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching news by category ${category}:`, error);
    throw error;
  }
}
