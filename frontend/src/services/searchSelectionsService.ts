/**
 * Search Selections Service
 * Handles all Supabase queries for search_selections table
 * Saved search filters and selections
 */

import { supabase } from '../lib/supabase';
import { SearchSelection } from '../types/index';

const TABLE_NAME = 'search_selections';

export interface CreateSearchSelectionInput {
  user_id?: string;
  query: string;
  result_type: string;
  result_id: string;
  source?: string;
}

export interface UpdateSearchSelectionInput {
  query?: string;
  result_type?: string;
  result_id?: string;
  source?: string;
}

/**
 * Create search selection
 */
export async function createSearchSelection(
  input: CreateSearchSelectionInput
): Promise<SearchSelection> {
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
export async function getSearchSelection(selectionId: string): Promise<SearchSelection | null> {
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
export async function getUserSearchSelections(userId: string): Promise<SearchSelection[]> {
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
export async function getSearchSelections(limit?: number, offset?: number): Promise<SearchSelection[]> {
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
export async function updateSearchSelection(
  selectionId: string,
  input: UpdateSearchSelectionInput
): Promise<SearchSelection> {
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
export async function deleteSearchSelection(selectionId: string): Promise<void> {
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
export async function getSelectionsByResultType(resultType: string): Promise<SearchSelection[]> {
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
export function subscribeToSearchSelections(
  callback: (selection: SearchSelection, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
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
          callback(payload.new as SearchSelection, payload.eventType as any);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
