/**
 * Notifications Service
 * Handles all Supabase queries for notifications table
 * User notification management and delivery
 */

import { supabase } from '../lib/supabase';
import { Notification } from '../types/index';

const TABLE_NAME = 'notifications';

export interface NotificationFilter {
  user_id: string;
  read?: boolean;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  limit?: number;
  offset?: number;
}

export interface CreateNotificationInput {
  user_id: string;
  type: string;
  title: string;
  message: string;
  read?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_type?: string;
  action_data?: Record<string, any>;
}

export interface UpdateNotificationInput {
  read?: boolean;
  title?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_type?: string;
  action_data?: Record<string, any>;
}

/**
 * Get notifications for user with optional filters
 */
export async function getNotifications(filter: NotificationFilter): Promise<Notification[]> {
  try {
    let query = supabase.from(TABLE_NAME).select('*').eq('user_id', filter.user_id);

    if (filter.read !== undefined) {
      query = query.eq('read', filter.read);
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.priority) {
      query = query.eq('priority', filter.priority);
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
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Get single notification by ID
 */
export async function getNotification(notificationId: string): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', notificationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching notification ${notificationId}:`, error);
    throw error;
  }
}

/**
 * Create new notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  try {
    const payload = {
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      read: input.read || false,
      priority: input.priority || 'normal',
      action_type: input.action_type,
      action_data: input.action_data,
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
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Update notification
 */
export async function updateNotification(
  notificationId: string,
  input: UpdateNotificationInput
): Promise<Notification> {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating notification ${notificationId}:`, error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error marking notification as read ${notificationId}:`, error);
    throw error;
  }
}

/**
 * Mark notification as unread
 */
export async function markAsUnread(notificationId: string): Promise<Notification> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        read: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error marking notification as unread ${notificationId}:`, error);
    throw error;
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error(`Error marking all notifications as read for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    throw error;
  }
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error(`Error fetching unread count for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Get user unread notifications
 */
export async function getUserUnreadNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching unread notifications for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to user notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  const channel = supabase
    .channel(`notifications_${userId}`)
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
          callback(payload.new as Notification, payload.eventType as any);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to single notification updates
 */
export function subscribeToNotification(
  notificationId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notification_${notificationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${notificationId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as Notification);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
