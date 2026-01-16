/**
 * Search Selections Service
 * Handles all Supabase queries for search_selections table
 * Saved search filters and selections
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'search_selections';

/**
 * Create search selection
 */
export async function createSearchSelection(input) {
  try {
    const payload = {
      user_id: input.user_id,
      query: input.query,
      result_type: input.result_type,
      result_id: input.result_id,
      source: input.source,
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
    console.error('Error creating search selection:', error);
    throw error;
  }
}

/**
 * Get search selection by ID
 */
export async function getSearchSelection(selectionId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', selectionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching search selection ${selectionId}:`, error);
    throw error;
  }
}

/**
 * Get user search selections
 */
export async function getUserSearchSelections(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching search selections for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all search selections
 */
export async function getSearchSelections(limit, offset) {
  try {
    let query = supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset && limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching search selections:', error);
    throw error;
  }
}

/**
 * Update search selection
 */
export async function updateSearchSelection(selectionId, input) {
  try {
    const payload = {
      ...input,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', selectionId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating search selection ${selectionId}:`, error);
    throw error;
  }
}

/**
 * Delete search selection
 */
export async function deleteSearchSelection(selectionId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', selectionId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting search selection ${selectionId}:`, error);
    throw error;
  }
}

/**
 * Get selections by result type
 */
export async function getSelectionsByResultType(resultType) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('result_type', resultType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching selections by result type ${resultType}:`, error);
    throw error;
  }
}

/**
 * Subscribe to search selections
 */
export function subscribeToSearchSelections(callback) {
  const channel = supabase
    .channel('search_selections_all')
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
