/**
 * Subscription Service
 * Handles all Supabase queries for subscribers table
 * Subscription management and analytics
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const TABLE_NAME = 'subscribers';

/**
 * Get all subscribers with optional filters
 * Admin users can see all subscribers, others see only their own
 */
export async function getSubscribers(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // 1. Apply RBAC Scoping
    // Subscribers table doesn't have organization_id, so org_admins get all subscribers
    if (user?.role === 'admin') {
      // Admin gets all subscribers
    } else if (user?.role === 'org_admin') {
      // Org Admin gets all subscribers (no organization_id field to filter by)
    } else {
      // Other roles get no access to subscriber data
      return [];
    }

    // 2. Apply Custom Filters

    if (filter?.email) {
      query = query.ilike('email', `%${filter.email}%`);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.new_user !== undefined) {
      query = query.eq('new_user', filter.new_user);
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
      console.error('Subscribers query error:', error);
      return []; // Return empty array on error instead of throwing
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get single subscriber by ID
 */
export async function getSubscriber(subscriberId) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply authorization for single subscriber
    if (user?.role !== 'admin') {
      // Non-admin users can only see their own subscriptions
      // For now, assume public access
    }

    const { data, error } = await query.eq('id', subscriberId).single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching subscriber ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Create new subscriber
 */
export async function createSubscriber(input) {
  try {
    const user = await getCurrentUser();
    const payload = {
      email: input.email,
      type: input.type || 'free',
      status: input.status || 'pending',
      new_user: input.new_user !== undefined ? input.new_user : true,
      subscription_date: input.subscription_date || new Date().toISOString(),
      welcome_email_sent: input.welcome_email_sent || false,
      welcome_email_sent_at: input.welcome_email_sent_at || null,
      last_engagement_at: input.last_engagement_at || null,
      source: input.source || 'website',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Trigger welcome email automatically (Fire and forget to not block UI)
    if (data && data.email) {
      sendWelcomeEmail(data.email).catch(err =>
        console.error('Failed to auto-send welcome email:', err)
      );
    }

    return data;
  } catch (error) {
    console.error('Error creating subscriber:', error);
    throw error;
  }
}

/**
 * Update subscriber
 */
export async function updateSubscriber(subscriberId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', subscriberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating subscriber ${subscriberId}:`, error);
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

    return true;
  } catch (error) {
    console.error(`Error deleting subscriber ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Update subscriber status
 */
export async function updateSubscriberStatus(subscriberId, status) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating subscriber status for ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Update subscriber type (free/paid)
 */
export async function updateSubscriberType(subscriberId, type) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        type,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating subscriber type for ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Mark welcome email as sent
 */
export async function markWelcomeEmailSent(subscriberId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString(),
        new_user: false,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error marking welcome email sent for ${subscriberId}:`, error);
    throw error;
  }
}

/**
 * Get subscription analytics
 */
export async function getSubscriptionAnalytics() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('type, status, new_user, welcome_email_sent, created_at, subscription_date');

    if (error) throw error;

    // Calculate analytics
    const analytics = {
      total: data?.length || 0,
      byType: {},
      byStatus: {},
      newUsers: data?.filter(item => item.new_user).length || 0,
      welcomeEmailsSent: data?.filter(item => item.welcome_email_sent).length || 0,
      active: data?.filter(item => item.status === 'active').length || 0,
      paid: data?.filter(item => item.type === 'paid').length || 0,
      free: data?.filter(item => item.type === 'free').length || 0,
      paidConversionRate: 0,
      recentSubscriptions: data?.filter(item => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(item.subscription_date || item.created_at) >= thirtyDaysAgo;
      }).length || 0,
      // Add 4-segment breakdown for donut chart
      activeFree: data?.filter(item => item.status === 'active' && item.type === 'free').length || 0,
      activePremium: data?.filter(item => item.status === 'active' && item.type === 'paid').length || 0,
      inactiveFree: data?.filter(item => item.status !== 'active' && item.type === 'free').length || 0,
      inactivePremium: data?.filter(item => item.status !== 'active' && item.type === 'paid').length || 0,
    };

    // Calculate paid conversion rate
    if (analytics.total > 0) {
      analytics.paidConversionRate = Math.round((analytics.paid / analytics.total) * 100);
    }

    // Group by type
    data?.forEach(item => {
      analytics.byType[item.type] = (analytics.byType[item.type] || 0) + 1;
    });

    // Group by status
    data?.forEach(item => {
      analytics.byStatus[item.status] = (analytics.byStatus[item.status] || 0) + 1;
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    throw error;
  }
}

/**
 * Subscribe to subscriber changes
 */
export function subscribeToSubscribers(callback) {
  const channel = supabase
    .channel('subscribers_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to new subscribers only
 */
export function subscribeToNewSubscribers(callback) {
  const channel = supabase
    .channel('new_subscribers')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Send welcome email via Edge Function
 */
export async function sendWelcomeEmail(email) {
  try {
    const { data, error } = await supabase.functions.invoke('sendWelcome', {
      body: { email }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

/**
 * Send custom email to single subscriber
 */
export async function sendCustomEmail(subscriber, subject, content) {
  try {
    if (!subscriber.email) {
      throw new Error('No valid email address found');
    }

    const { data, error } = await supabase.functions.invoke('sendCustomEmail', {
      body: {
        email: subscriber.email,
        subject,
        content
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw error;
  }
}

/**
 * Send bulk email to multiple subscribers
 */
export async function sendBulkEmail(subscribers, subject, content) {
  try {
    const emails = subscribers.map(sub => sub.email).filter(email => email);

    if (emails.length === 0) {
      throw new Error('No valid email addresses found');
    }

    const { data, error } = await supabase.functions.invoke('sendBulkEmail', {
      body: {
        emails,
        subject,
        content
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending bulk email:', error);
    throw error;
  }
}

/**
 * Get subscribers for bulk email (active subscribers only)
 */
export async function getSubscribersForBulkEmail() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, email, type, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching subscribers for bulk email:', error);
    throw error;
  }
}
