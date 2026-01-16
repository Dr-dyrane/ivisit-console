/**
 * Support Tickets Service
 * Handles all Supabase queries for support_tickets table
 * Help desk and support ticket management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'support_tickets';

/**
 * Get support tickets with optional filters
 */
export async function getSupportTickets(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    query = query.order('created_at', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw error;
  }
}

/**
 * Get single support ticket by ID
 */
export async function getSupportTicket(ticketId) {
  try {
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
 * Subscribe to support tickets
 */
export function subscribeToSupportTickets(callback) {
  const channel = supabase
    .channel('support_tickets_all')
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
