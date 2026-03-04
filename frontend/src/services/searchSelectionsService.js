/**
 * Search Selections Service
 * Handles all Supabase queries for search_selections table
 * Saved search filters and selections
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

const TABLE_NAME = 'search_selections';

const isMissingRelationError = (error) => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST204') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('search_selections') && message.includes('does not exist');
};

/**
 * Create search selection
 */
export async function createSearchSelection(input) {
  try {
    const user = await getCurrentUser();
    
    // Apply authorization - users can only create for themselves
    if (user?.id !== input.user_id) {
      throw new Error('Unauthorized: Cannot create search selections for other users');
    }
    
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

    if (error && isMissingRelationError(error)) return null;
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

    if (error && isMissingRelationError(error)) return null;
    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching search selection ${selectionId}:`, error);
    throw error;
  }
}

/**
 * Get user search selections
 * Users can only see their own search selections (Apple privacy standard)
 */
export async function getUserSearchSelections(userId) {
  try {
    const user = await getCurrentUser();
    
    // Apply authorization - users can only see their own search selections
    if (user?.id !== userId) {
      throw new Error('Unauthorized: Cannot access other users search selections');
    }
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && isMissingRelationError(error)) return [];
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching search selections for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all search selections - REMOVED for privacy
 * This function violates Apple privacy standards
 */
// export async function getSearchSelections(limit, offset) {
//   REMOVED - Users should not access other users' search data
// }

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

    if (error && isMissingRelationError(error)) return null;
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

    if (error && isMissingRelationError(error)) return false;
    if (error) throw error;
    return true;
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

    if (error && isMissingRelationError(error)) return [];
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
