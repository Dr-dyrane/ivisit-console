import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { applySupportTicketScope } from './queryFilters';

export async function getSupportTicketsAnalytics() {
  try {
    const user = await getCurrentUser();

    const { data, error } = await withRetry(async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('status, priority, category, created_at, updated_at');
      query = applySupportTicketScope(query, user);
      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    const analytics = {
      total: data?.length || 0,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      recent: data?.filter((item) => {
        const createdAt = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length || 0,
      resolved: data?.filter((item) => item.status === 'resolved').length || 0,
      averageResolutionTime: 0,
    };

    data?.forEach((item) => {
      analytics.byStatus[item.status] = (analytics.byStatus[item.status] || 0) + 1;
    });

    data?.forEach((item) => {
      analytics.byPriority[item.priority] = (analytics.byPriority[item.priority] || 0) + 1;
    });

    data?.forEach((item) => {
      analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1;
    });

    const resolvedTickets = data?.filter((item) => (
      item.status === 'resolved' && item.updated_at && item.created_at
    ));
    if (resolvedTickets?.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const updated = new Date(ticket.updated_at);
        return sum + (updated - created);
      }, 0);
      analytics.averageResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60);
    }

    return analytics;
  } catch (error) {
    console.error('Error fetching support tickets analytics:', error);
    throw error;
  }
}
