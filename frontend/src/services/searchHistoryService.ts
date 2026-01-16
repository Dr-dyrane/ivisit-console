/**
 * Search History Service
 * Handles all Supabase queries for search_history table
 * User search activity and analytics
 */

import { supabase } from '../lib/supabase';
import { SearchHistory } from '../types/index';

const TABLE_NAME = 'search_history';

export interface SearchHistoryFilter {
  user_id: string;
  query_type?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSearchHistoryInput {
  user_id: string;
  query: string;
  query_type?: string;
  results_count?: number;
}

/**
 * Get search history for user
 */
export async function getSearchHistory(filter: SearchHistoryFilter): Promise<SearchHistory[]> {
  try {
    let query = supabase.from(TABLE_NAME).select('*').eq('user_id', filter.user_id);

    if (filter.query_type) {
      query = query.eq('query_type', filter.query_type);
    }

    query = query.order('created_at', { ascending: false });

    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw error;
  }
}

/**
 * Get single search history entry by ID
 */
export async function getSearchHistoryEntry(entryId: string): Promise<SearchHistory | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', entryId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching search history entry ${entryId}:`, error);
    throw error;
  }
}

/**
 * Create search history entry
 */
export async function createSearchHistory(
  input: CreateSearchHistoryInput
): Promise<SearchHistory> {
  try {
    const payload = {
      user_id: input.user_id,
      query: input.query,
      query_type: input.query_type,
      result_count: input.results_count,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating search history:', error);
    throw error;
  }
}

/**
 * Delete search history entry
 */
export async function deleteSearchHistory(entryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting search history entry ${entryId}:`, error);
    throw error;
  }
}

/**
 * Clear all search history for user
 */
export async function clearUserSearchHistory(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error clearing search history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get popular searches
 */
export async function getPopularSearches(limit: number = 10): Promise<SearchHistory[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    throw error;
  }
}

/**
 * Subscribe to user search history
 */
export function subscribeToSearchHistory(
  userId: string,
  callback: (entry: SearchHistory, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  const channel = supabase
    .channel(`search_history_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as SearchHistory, payload.eventType as any);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
