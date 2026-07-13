/**
 * Subscription Service
 * Handles all Supabase queries for subscribers table
 * Subscription management and analytics
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'subscribers';
const EMPTY_SUBSCRIPTION_STATS = Object.freeze({
  total: 0,
  active: 0,
  pending: 0,
  unsubscribed: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeSent: 0,
  exactCounts: true,
  scope: 'admin_subscriber_projection',
});
const TERMINAL_SUBSCRIBER_STATUSES = ['unsubscribed', 'bounced', 'inactive', 'cancelled', 'expired'];

const applySubscriberBaseFilters = (query, filter = {}) => {
  let next = query;
  if (filter.search) next = next.ilike('email', `%${String(filter.search).trim()}%`);
  if (Array.isArray(filter.status) && filter.status.length > 0) next = next.in('status', filter.status);
  if (Array.isArray(filter.type) && filter.type.length > 0) next = next.in('type', filter.type);
  if (filter.welcomeEmailSent === 'sent') next = next.eq('welcome_email_sent', true);
  if (filter.welcomeEmailSent === 'pending') next = next.eq('welcome_email_sent', false);
  if (filter.dateRange && filter.dateRange !== 'all') {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[filter.dateRange];
    if (days) next = next.gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
  }
  return next;
};

const applySubscriberKpiFilter = (query, kpiFilter = 'all') => {
  switch (kpiFilter) {
    case 'active': return query.eq('status', 'active');
    case 'pending': return query.not('status', 'eq', 'active').not('status', 'in', `(${TERMINAL_SUBSCRIBER_STATUSES.join(',')})`);
    case 'unsubscribed': return query.in('status', TERMINAL_SUBSCRIBER_STATUSES);
    case 'new': return query.eq('new_user', true);
    case 'paid': return query.eq('type', 'paid');
    case 'free': return query.eq('type', 'free');
    default: return query;
  }
};

const exactSubscriberCount = async (filter, applyBucket = (query) => query) => {
  let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
  query = applySubscriberBaseFilters(query, filter);
  query = applyBucket(query);
  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
};

export async function getSubscriptionsPage(filter = {}) {
  const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
  const offset = Math.max(Number(filter.offset) || 0, 0);
  const sortKey = ['created_at', 'subscription_date'].includes(filter.sortKey) ? filter.sortKey : 'created_at';
  const ascending = filter.sortDirection === 'asc';

  try {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') {
      return { data: [], count: 0, denied: true, failed: false, reason: 'admin_only', stats: { ...EMPTY_SUBSCRIPTION_STATS, exactCounts: false } };
    }

    let rowsQuery = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    rowsQuery = applySubscriberBaseFilters(rowsQuery, filter);
    rowsQuery = applySubscriberKpiFilter(rowsQuery, filter.kpiFilter);
    rowsQuery = rowsQuery.order(sortKey, { ascending, nullsFirst: false }).range(offset, offset + limit - 1);

    const [rowsResult, total, active, pending, unsubscribed, paid, free, newUsers, welcomeSent] = await Promise.all([
      rowsQuery,
      exactSubscriberCount(filter),
      exactSubscriberCount(filter, (query) => query.eq('status', 'active')),
      exactSubscriberCount(filter, (query) => query.not('status', 'eq', 'active').not('status', 'in', `(${TERMINAL_SUBSCRIBER_STATUSES.join(',')})`)),
      exactSubscriberCount(filter, (query) => query.in('status', TERMINAL_SUBSCRIBER_STATUSES)),
      exactSubscriberCount(filter, (query) => query.eq('type', 'paid')),
      exactSubscriberCount(filter, (query) => query.eq('type', 'free')),
      exactSubscriberCount(filter, (query) => query.eq('new_user', true)),
      exactSubscriberCount(filter, (query) => query.eq('welcome_email_sent', true)),
    ]);
    if (rowsResult.error) throw rowsResult.error;

    return {
      data: rowsResult.data || [],
      count: Number(rowsResult.count || 0),
      denied: false,
      failed: false,
      reason: null,
      stats: { total, active, pending, unsubscribed, paid, free, newUsers, welcomeSent, exactCounts: true, scope: 'admin_subscriber_projection' },
    };
  } catch (error) {
    if (!filter.quiet) console.error('Subscriber page query error:', error);
    return {
      data: [], count: 0, denied: false, failed: true, reason: 'query_failed',
      errorMessage: error?.message || 'Subscriber projection failed.',
      stats: { ...EMPTY_SUBSCRIPTION_STATS, exactCounts: false },
    };
  }
}
const WRITABLE_FIELDS = new Set([
  'email',
  'type',
  'status',
  'new_user',
  'welcome_email_sent',
  'subscription_date',
]);

function toSubscriberWritePayload(input = {}, { forInsert = false } = {}) {
  const now = new Date().toISOString();
  const payload = {};

  if (forInsert) {
    payload.type = 'free';
    payload.status = 'pending';
    payload.new_user = true;
    payload.welcome_email_sent = false;
    payload.subscription_date = now;
    payload.created_at = now;
  }

  Object.entries(input || {}).forEach(([key, value]) => {
    if (WRITABLE_FIELDS.has(key) && value !== undefined) {
      payload[key] = value;
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }

  payload.updated_at = now;
  return payload;
}

async function runSubscriberWrite(writeOperation, inputPayload) {
  const { data, error } = await writeOperation(inputPayload || {});
  if (error) throw error;
  return data;
}

/**
 * Get all subscribers with optional filters
 * Admin users can see the global subscriber list. Other roles receive neutral empty state.
 */
export async function getSubscribers(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    if (user?.role !== 'admin') {
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
      if (!filter?.quiet) {
        console.error('Subscribers query error:', error);
      }
      return []; // Return empty array on error instead of throwing
    }

    return data || [];
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching subscribers:', error);
    }
    return []; // Return empty array on error
  }
}

/**
 * Get single subscriber by ID
 */
export async function getSubscriber(subscriberId) {
  try {
    if (!isValidUUID(subscriberId)) return null;

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

export async function getSubscriberByEmail(email) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
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
    const email = String(input?.email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('email is required');
    }

    const payload = toSubscriberWritePayload({ ...input, email }, { forInsert: true });
    const data = await runSubscriberWrite(
      (candidate) =>
        supabase
          .from(TABLE_NAME)
          .insert([candidate])
          .select()
          .single(),
      payload
    );
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
    const payload = toSubscriberWritePayload(input, { forInsert: false });
    const data = await runSubscriberWrite(
      (candidate) =>
        supabase
          .from(TABLE_NAME)
          .update(candidate)
          .eq('id', subscriberId)
          .select()
          .single(),
      payload
    );

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
    const data = await runSubscriberWrite(
      (candidate) =>
        supabase
          .from(TABLE_NAME)
          .update(candidate)
          .eq('id', subscriberId)
          .select()
          .single(),
      toSubscriberWritePayload({ status }, { forInsert: false })
    );

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
    const data = await runSubscriberWrite(
      (candidate) =>
        supabase
          .from(TABLE_NAME)
          .update(candidate)
          .eq('id', subscriberId)
          .select()
          .single(),
      toSubscriberWritePayload({ type }, { forInsert: false })
    );

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
    const data = await runSubscriberWrite(
      (candidate) =>
        supabase
          .from(TABLE_NAME)
          .update(candidate)
          .eq('id', subscriberId)
          .select()
          .single(),
      toSubscriberWritePayload(
        {
          welcome_email_sent: true,
          new_user: false,
          status: 'active',
        },
        { forInsert: false }
      )
    );

    return data;
  } catch (error) {
    console.error(`Error marking welcome email sent for ${subscriberId}:`, error);
    throw error;
  }
}

export async function createSubscriberWithWelcome(input) {
  const subscriber = await createSubscriber(input);
  const result = await sendWelcomeToSubscriber(subscriber.id);
  return result.subscriber || subscriber;
}

/**
 * Get subscription analytics
 */
export async function getSubscriptionAnalytics(options = {}) {
  try {
    const { data, error, count } = await supabase
      .from(TABLE_NAME)
      .select('type, status, new_user, welcome_email_sent, created_at, subscription_date', { count: 'exact' });

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
      sample: {
        returnedCount: data?.length || 0,
        totalCount: Number.isFinite(Number(count)) ? Number(count) : null,
        complete: Number.isFinite(Number(count)) && Number(count) <= (data?.length || 0),
      },
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
    if (!options?.quiet) {
      console.error('Error fetching subscription analytics:', error);
    }
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

export async function sendWelcomeToSubscriber(subscriberId) {
  const subscriber = await getSubscriber(subscriberId);
  if (!subscriber?.email) {
    throw new Error('Subscriber not found');
  }

  if (subscriber.welcome_email_sent) {
    return {
      subscriber,
      emailResult: { success: true, skipped: true, reason: 'already_sent' },
      marked: true,
    };
  }

  const emailResult = await sendWelcomeEmail(subscriber.email);
  const refreshed = await getSubscriber(subscriberId);

  return {
    subscriber: refreshed || subscriber,
    emailResult,
    marked: Boolean(refreshed?.welcome_email_sent),
  };
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
