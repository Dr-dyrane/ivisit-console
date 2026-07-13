import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { getCurrentUser } from '../authService';
import { TABLE_NAME } from './constants';

/**
 * Get all subscribers with optional filters.
 * Admin users can see the global list; every other role receives neutral empty state.
 */
export async function getSubscribers(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    if (user?.role !== 'admin') {
      return [];
    }

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

export async function getSubscriber(subscriberId) {
  try {
    if (!isValidUUID(subscriberId)) return null;

    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // The compatibility read has no JavaScript provider scope. RLS remains the receiver gate.
    if (user?.role !== 'admin') {
      // Preserve the existing query path for non-admin callers.
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
 * Get active subscribers for the legacy bulk-email compatibility path.
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
