/**
 * Health News Service
 * Handles all Supabase queries for health_news table
 * Health news feed and content management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'health_news';

/**
 * Get all health news with optional filters
 */
export async function getHealthNews(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.source) {
      query = query.eq('source', filter.source);
    }

    query = query.order('created_at', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching health news:', error);
    throw error;
  }
}

/**
 * Get single health news by ID
 */
export async function getHealthNewsItem(newsId) {
  try {
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
 * Create new health news
 */
export async function createHealthNews(input) {
  try {
    const payload = {
      title: input.title,
      description: input.description,
      content: input.content,
      image_url: input.image_url,
      source: input.source,
      time: input.time,
      icon: input.icon,
      category: input.category,
      url: input.url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating health news:', error);
    throw error;
  }
}

/**
 * Update health news
 */
export async function updateHealthNews(newsId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', newsId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating health news ${newsId}:`, error);
    throw error;
  }
}

/**
 * Delete health news
 */
export async function deleteHealthNews(newsId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', newsId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting health news ${newsId}:`, error);
    throw error;
  }
}

/**
 * Get latest health news
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
 * Get news by category
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

/**
 * Subscribe to health news updates
 */
export function subscribeToHealthNews(callback) {
  const channel = supabase
    .channel('health_news_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
