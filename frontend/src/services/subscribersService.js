/**
 * Subscribers Service
 * Handles all Supabase queries for subscribers table
 * Email subscribers management
 */

import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'subscribers';
const WRITABLE_FIELDS = new Set([
  'email',
  'type',
  'status',
  'new_user',
  'welcome_email_sent',
  'subscription_date',
]);

function buildSubscriberPayload(input = {}, { forInsert = false } = {}) {
  const now = new Date().toISOString();
  const payload = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (WRITABLE_FIELDS.has(key) && value !== undefined) {
      payload[key] = value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }

  if (forInsert) {
    payload.created_at = now;
  }

  payload.updated_at = now;
  return payload;
}

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
    if (!isValidUUID(subscriberId)) return null;

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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('email', normalizedEmail)
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
    const payload = buildSubscriberPayload(input, { forInsert: true });
    if (!payload.email) {
      throw new Error('email is required');
    }

    const existing = await getSubscriberByEmail(payload.email);
    if (existing) {
      return existing;
    }

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
