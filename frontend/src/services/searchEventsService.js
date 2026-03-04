/**
 * Search Events Service
 * Handles all Supabase queries for search_events table
 * Detailed search interaction events tracking
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'search_events';

/**
 * Create search event
 */
export async function createSearchEvent(input) {
  try {
    const payload = {
      query: input.query,
      source: input.source,
      selected_key: input.selected_key,
      metadata: input.metadata ?? input.extra ?? null,
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
    console.error('Error creating search event:', error);
    throw error;
  }
}

/**
 * Get search event by ID
 */
export async function getSearchEvent(eventId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching search event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Get all search events
 */
export async function getSearchEvents(limit, offset) {
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
    console.error('Error fetching search events:', error);
    throw error;
  }
}

/**
 * Get search events by source
 */
export async function getSearchEventsBySource(source) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('source', source)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching search events by source ${source}:`, error);
    throw error;
  }
}

/**
 * Delete search event
 */
export async function deleteSearchEvent(eventId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting search event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to search events
 */
export function subscribeToSearchEvents(callback) {
  const channel = supabase
    .channel('search_events_all')
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
