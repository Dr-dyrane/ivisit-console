/**
 * Health News Service
 * Handles all Supabase queries for health_news table
 * Health news feed and content management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'health_news';

/**
 * Get all health news with optional filters
 * Admin users can see all news, others see only published news
 */
export async function getHealthNews(filter) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply authorization - admins get full access, others get filtered
    if (user?.role !== 'admin') {
      // Non-admin users can only see published news
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
 * Get single health news by ID
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
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Toggle publish status
 */
export async function toggleHealthNewsPublish(newsId, published) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        published,
        updated_at: new Date().toISOString()
      })
      .eq('id', newsId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling publish status for ${newsId}:`, error);
    throw error;
  }
}

/**
 * Bulk import health news from array
 */
export async function bulkImportHealthNews(newsItems) {
  try {
    const itemsWithTimestamps = newsItems.map(item => ({
      title: item.title,
      source: item.source,
      time: item.time || 'Just now',
      icon: item.icon || 'medical-outline',
      url: item.url,
      category: item.category || 'general',
      published: item.published !== undefined ? item.published : true,
      priority: item.priority || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(itemsWithTimestamps)
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error bulk importing health news:', error);
    throw error;
  }
}

/**
 * Get health news analytics
 */
export async function getHealthNewsAnalytics() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('source, category, published, created_at');

    if (error) {
      console.error('Analytics query error:', error);
      // Return default analytics if query fails
      return {
        total: 0,
        published: 0,
        bySource: {},
        byCategory: {},
        recent: 0,
      };
    }

    // Handle empty data gracefully
    if (!data || data.length === 0) {
      return {
        total: 0,
        published: 0,
        bySource: {},
        byCategory: {},
        recent: 0,
      };
    }

    // Calculate analytics
    const analytics = {
      total: data?.length || 0,
      published: data?.filter(item => item.published).length || 0,
      bySource: {},
      byCategory: {},
      recent: data?.filter(item => {
        const createdAt = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length || 0,
    };

    // Group by source
    data?.forEach(item => {
      if (item.source) {
        analytics.bySource[item.source] = (analytics.bySource[item.source] || 0) + 1;
      }
    });

    // Group by category
    data?.forEach(item => {
      if (item.category) {
        analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1;
      }
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching health news analytics:', error);
    // Return default analytics on error
    return {
      total: 0,
      published: 0,
      bySource: {},
      byCategory: {},
      recent: 0,
    };
  }
}
