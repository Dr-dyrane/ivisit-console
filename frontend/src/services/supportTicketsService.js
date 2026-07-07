/**
 * Support Tickets Service
 * Handles all Supabase queries for support_tickets table
 * Help desk and support ticket management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'support_tickets';
const SUPPORT_TICKET_CREATE_FIELDS = [
  'subject',
  'message',
  'category',
  'priority',
];
const SUPPORT_TICKET_UPDATE_FIELDS = [
  'subject',
  'message',
  'category',
  'priority',
];

const SUPPORT_TICKET_SORT_FIELDS = new Set(['created_at', 'updated_at', 'subject', 'status', 'priority', 'category']);

const normalizeFilterList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const sanitizeSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

const normalizeSupportTicketRow = (row = {}) => ({
  ...row,
  id: row.id,
  user_id: row.user_id || null,
  organization_id: row.organization_id || null,
  subject: String(row.subject || 'Support request').trim() || 'Support request',
  message: String(row.message || '').trim(),
  category: row.category || 'general',
  priority: row.priority || 'normal',
  status: row.status || 'open',
  assigned_to: row.assigned_to || null,
  customer_name: row.customer_name || row.requester_name || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

function applySupportTicketScope(query, user) {
  return applyAuthFilter(query, user, {
    userIdField: 'user_id',
    orgIdField: 'organization_id',
    resourceType: 'support'
  });
}

function applySupportTicketFilters(query, filter = {}) {
  const statusValues = normalizeFilterList(filter.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  const priorityValues = normalizeFilterList(filter.priority);
  if (priorityValues.length === 1) {
    query = query.eq('priority', priorityValues[0]);
  } else if (priorityValues.length > 1) {
    query = query.in('priority', priorityValues);
  }

  const categoryValues = normalizeFilterList(filter.category);
  if (categoryValues.length === 1) {
    query = query.eq('category', categoryValues[0]);
  } else if (categoryValues.length > 1) {
    query = query.in('category', categoryValues);
  }

  if (filter.assigned_to) {
    query = query.eq('assigned_to', filter.assigned_to);
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%,category.ilike.%${search}%`);
  }

  return query;
}

async function getSupportTicketExactCount(filter = {}, quiet = false) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    query = applySupportTicketScope(query, user);
    query = applySupportTicketFilters(query, filter);

    const { count, error } = await query;
    if (error) throw error;

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching support ticket exact count:', error);
    }
    throw error;
  }
}

export async function getSupportTicketsPageStats(filter = {}, quiet = false) {
  const [total, open, inProgress, resolved, closed, urgent] = await Promise.all([
    getSupportTicketExactCount(filter, quiet),
    getSupportTicketExactCount({ ...filter, status: 'open' }, quiet),
    getSupportTicketExactCount({ ...filter, status: 'in_progress' }, quiet),
    getSupportTicketExactCount({ ...filter, status: 'resolved' }, quiet),
    getSupportTicketExactCount({ ...filter, status: 'closed' }, quiet),
    getSupportTicketExactCount({ ...filter, priority: 'urgent' }, quiet),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    urgent,
    active: open + inProgress,
    exactCounts: true,
  };
}

function pickAllowedSupportTicketFields(input, allowedFields) {
  const payload = {};
  if (!input || typeof input !== 'object') return payload;
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      payload[field] = input[field];
    }
  }
  return payload;
}

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

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching support tickets:', error);
    }
    if (filter?.quiet) throw error;
    return [];
  }
}

/**
 * Get the Support page projection with exact count and scoped status metrics.
 */
export async function getSupportTicketsPage(filter = {}) {
  try {
    const user = await getCurrentUser();
    const statsFilter = filter.statsFilter || {};

    const countPromise = getSupportTicketExactCount(filter, true);
    const statsPromise = getSupportTicketsPageStats(statsFilter, true);

    let dataQuery = supabase.from(TABLE_NAME).select('*');
    dataQuery = applySupportTicketScope(dataQuery, user);
    dataQuery = applySupportTicketFilters(dataQuery, filter);

    const sortKey = SUPPORT_TICKET_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
    dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });

    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;
    if (Number.isFinite(limit) && limit > 0) {
      dataQuery = dataQuery.range(offset, offset + limit - 1);
    }

    const [{ count }, { data, error }, stats] = await Promise.all([
      countPromise.then((value) => ({ count: value })),
      dataQuery,
      statsPromise,
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(normalizeSupportTicketRow),
      count: count || 0,
      stats,
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching support tickets page:', error);
    }
    throw error;
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
    const user = await getCurrentUser();
    const payload = pickAllowedSupportTicketFields(input, SUPPORT_TICKET_CREATE_FIELDS);
    payload.user_id = payload.user_id || user?.id || null;
    payload.organization_id = payload.organization_id || user?.organization_id || null;
    payload.subject = (payload.subject || '').trim();
    payload.message = (payload.message || '').trim();
    payload.category = payload.category || 'general';
    payload.priority = payload.priority || 'normal';
    payload.assigned_to = payload.assigned_to || null;
    payload.status = payload.status || 'open';

    if (!payload.subject) {
      throw new Error('Support ticket subject is required');
    }
    if (!payload.message) {
      throw new Error('Support ticket message is required');
    }

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
    const payload = pickAllowedSupportTicketFields(input, SUPPORT_TICKET_UPDATE_FIELDS);

    if (Object.prototype.hasOwnProperty.call(payload, 'subject')) {
      payload.subject = (payload.subject || '').trim();
      if (!payload.subject) {
        throw new Error('Support ticket subject cannot be empty');
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
      payload.message = (payload.message || '').trim();
      if (!payload.message) {
        throw new Error('Support ticket message cannot be empty');
      }
    }

    if (Object.keys(payload).length === 0) {
      return getSupportTicket(ticketId);
    }

    payload.updated_at = new Date().toISOString();

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
    const user = await getCurrentUser();
    let query = supabase
      .from(TABLE_NAME)
      .select('status, priority, category, created_at, updated_at');
    query = applySupportTicketScope(query, user);

    const { data, error } = await query;

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
