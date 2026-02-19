/**
 * Support Tickets Service
 * Handles all Supabase queries for support_tickets table
 * Help desk and support ticket management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'support_tickets';

/**
 * Get support tickets with optional filters
 * Admin users can see all tickets, others see only their own
 */
export async function getSupportTickets(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply RBAC filter using centralized service
    query = applyAuthFilter(query, user, {
      userIdField: 'user_id',
      orgIdField: 'organization_id',
      resourceType: 'support'
    });

    // 2. Apply Custom Filters
    if (filter.status) {
      if (Array.isArray(filter.status) && filter.status.length > 0) {
        query = query.in('status', filter.status);
      } else if (!Array.isArray(filter.status)) {
        query = query.eq('status', filter.status);
      }
    }
    if (filter.priority) {
      if (Array.isArray(filter.priority) && filter.priority.length > 0) {
        query = query.in('priority', filter.priority);
      } else if (!Array.isArray(filter.priority)) {
        query = query.eq('priority', filter.priority);
      }
    }
    if (filter.category) {
      if (Array.isArray(filter.category) && filter.category.length > 0) {
        query = query.in('category', filter.category);
      } else if (!Array.isArray(filter.category)) {
        query = query.eq('category', filter.category);
      }
    }
    if (filter.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
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
    console.error('Error fetching support tickets:', error);
    return [];
  }
}

/**
 * Get single support ticket by ID
 */
export async function getSupportTicket(ticketId) {
  try {
    if (!isValidUUID(ticketId)) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching support ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Create new support ticket
 */
export async function createSupportTicket(input) {
  try {
    const payload = {
      user_id: input.user_id,
      subject: input.subject,
      message: input.message,
      status: input.status || 'open',
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
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(ticketId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating support ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Delete support ticket
 */
export async function deleteSupportTicket(ticketId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', ticketId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting support ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Get user support tickets
 */
export async function getUserSupportTickets(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching support tickets for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(ticketId, status) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating ticket status ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Get open tickets count
 */
export async function getOpenTicketsCount() {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'open');

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error fetching open tickets count:', error);
    return 0;
  }
}

/**
 * Assign ticket to agent
 */
export async function assignTicket(ticketId, assignedTo) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        assigned_to: assignedTo,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error assigning ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Get support ticket analytics
 */
export async function getSupportTicketsAnalytics() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('status, priority, category, created_at, updated_at');

    if (error) throw error;

    // Calculate analytics
    const analytics = {
      total: data?.length || 0,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      recent: data?.filter(item => {
        const createdAt = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length || 0,
      resolved: data?.filter(item => item.status === 'resolved').length || 0,
      averageResolutionTime: 0,
    };

    // Group by status
    data?.forEach(item => {
      analytics.byStatus[item.status] = (analytics.byStatus[item.status] || 0) + 1;
    });

    // Group by priority
    data?.forEach(item => {
      analytics.byPriority[item.priority] = (analytics.byPriority[item.priority] || 0) + 1;
    });

    // Group by category
    data?.forEach(item => {
      analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedTickets = data?.filter(item =>
      item.status === 'resolved' && item.updated_at && item.created_at
    );
    if (resolvedTickets?.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const updated = new Date(ticket.updated_at);
        return sum + (updated - created);
      }, 0);
      analytics.averageResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // in hours
    }

    return analytics;
  } catch (error) {
    console.error('Error fetching support tickets analytics:', error);
    throw error;
  }
}

/**
 * Subscribe to support tickets changes
 */
export function subscribeToSupportTickets(callback) {
  const channel = supabase
    .channel('support_tickets_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
