import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';

export async function getSupportTickets(filter = {}) {
  try {
    const user = await getCurrentUser();

    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      query = applyAuthFilter(query, user, {
        userIdField: 'user_id',
        orgIdField: 'organization_id',
        resourceType: 'support',
      });

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

      const limit = Number(filter.limit);
      const offset = Number(filter.offset) || 0;
      if (Number.isFinite(limit) && limit > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return data || [];
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching support tickets:', error);
    }
    throw error;
  }
}

export async function getSupportTicket(ticketId) {
  try {
    if (!isValidUUID(ticketId)) return null;

    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching support ticket ${ticketId}:`, error);
    throw error;
  }
}

export async function getUserSupportTickets(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching support tickets for user ${userId}:`, error);
    throw error;
  }
}

export async function getOpenTicketsCount() {
  try {
    const { count, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('id', { count: 'exact' })
        .eq('status', 'open');
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error fetching open tickets count:', error);
    throw error;
  }
}
