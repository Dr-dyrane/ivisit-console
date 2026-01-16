/**
 * Subscribers Service
 * Handles all Supabase queries for subscribers table
 * Email subscribers management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'subscribers';

/**
 * Get all subscribers
 */
export async function getSubscribers() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    throw error;
  }
}

/**
 * Get subscriber by ID
 */
export async function getSubscriber(subscriberId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', subscriberId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching subscriber ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Get subscriber by email
 */
export async function getSubscriberByEmail(email) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching subscriber by email ${email}:`, error);
    throw error;
  }
}

/**
 * Create new subscriber
 */
export async function createSubscriber(input) {
  try {
    const existing = await getSubscriberByEmail(input.email);
    if (existing) {
      return existing;
    }

    const payload = {
      email: input.email,
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
    console.error('Error creating subscriber:', error);
    throw error;
  }
}

/**
 * Delete subscriber
 */
export async function deleteSubscriber(subscriberId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', subscriberId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting subscriber ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Delete subscriber by email
 */
export async function deleteSubscriberByEmail(email) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('email', email);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting subscriber with email ${email}:`, error);
    throw error;
  }
}

/**
 * Get subscriber count
 */
export async function getSubscriberCount() {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error fetching subscriber count:', error);
    return 0;
  }
}

/**
 * Check if email is subscribed
 */
export async function isSubscribed(email) {
  try {
    const subscriber = await getSubscriberByEmail(email);
    return !!subscriber;
  } catch (error) {
    console.error(`Error checking subscription for email ${email}:`, error);
    return false;
  }
}

/**
 * Subscribe to subscribers changes
 */
export function subscribeToSubscribers(callback) {
  const channel = supabase
    .channel('subscribers_all')
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
