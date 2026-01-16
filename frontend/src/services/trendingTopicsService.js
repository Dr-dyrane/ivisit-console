/**
 * Trending Topics Service
 * Handles all Supabase queries for trending_topics table
 * Trending health topics management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'trending_topics';

/**
 * Get all trending topics with optional filters
 */
export async function getTrendingTopics(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    query = query.order('rank', { ascending: true });

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
    console.error('Error fetching trending topics:', error);
    throw error;
  }
}

/**
 * Get single trending topic by ID
 */
export async function getTrendingTopic(topicId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', topicId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching trending topic ${topicId}:`, error);
    throw error;
  }
}

/**
 * Create new trending topic
 */
export async function createTrendingTopic(input) {
  try {
    const payload = {
      query: input.query,
      category: input.category,
      rank: input.rank || 999,
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
    console.error('Error creating trending topic:', error);
    throw error;
  }
}

/**
 * Update trending topic
 */
export async function updateTrendingTopic(topicId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', topicId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating trending topic ${topicId}:`, error);
    throw error;
  }
}

/**
 * Delete trending topic
 */
export async function deleteTrendingTopic(topicId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', topicId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting trending topic ${topicId}:`, error);
    throw error;
  }
}

/**
 * Get top trending topics
 */
export async function getTopTrendingTopics(limit = 10) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching top trending topics:', error);
    throw error;
  }
}

/**
 * Get trending topics by category
 */
export async function getTrendingTopicsByCategory(category) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('category', category)
      .order('rank', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching trending topics by category ${category}:`, error);
    throw error;
  }
}

/**
 * Subscribe to trending topics updates
 */
export function subscribeToTrendingTopics(callback) {
  const channel = supabase
    .channel('trending_topics_all')
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
