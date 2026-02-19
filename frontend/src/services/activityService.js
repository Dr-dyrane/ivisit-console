/**
 * Activity Service
 * Handles all Supabase queries for user_activity table
 * Activity logging and retrieval for dashboard
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { resolveEntityId } from './displayIdService';

const TABLE_NAME = 'user_activity';

/**
 * Log user activity with automatic user detection
 */
export async function logActivity(action, entityType, entityId, description, metadata = {}) {
  try {
    const user = await getCurrentUser();

    // Resolve entityId if it's a display ID (fluid ID system support)
    const resolvedId = await resolveEntityId(entityId);

    const { data, error } = await supabase.rpc('log_user_activity', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: resolvedId,
      p_description: description,
      p_metadata: metadata,
      p_user_id: user?.id || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

/**
 * Get recent activity with user details
 */
export async function getRecentActivity(limit = 20, offset = 0) {
  try {
    const { data, error } = await supabase.rpc('get_recent_activity', {
      limit_count: limit,
      offset_count: offset
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
}

/**
 * Get activity statistics for analytics
 */
export async function getActivityStats(daysBack = 7) {
  try {
    const { data, error } = await supabase.rpc('get_activity_stats', {
      days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    throw error;
  }
}

/**
 * Get activity for specific entity
 */
export async function getEntityActivity(entityType, entityId, limit = 10) {
  try {
    // Resolve entityId if it's a display ID
    const resolvedId = await resolveEntityId(entityId);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        profiles:user_id (
          email,
          first_name,
          last_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', resolvedId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching entity activity:', error);
    throw error;
  }
}

/**
 * Get activity for current user
 */
export async function getUserActivity(limit = 20, offset = 0) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time activity updates
 */
export function subscribeToActivity(callback) {
  const channel = supabase
    .channel('activity_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to activity for specific entity
 */
export function subscribeToEntityActivity(entityType, entityId, callback) {
  const channel = supabase
    .channel(`entity_activity_${entityType}_${entityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `entity_type=eq.${entityType}&entity_id=eq.${entityId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Convenience functions for common activity types

/**
 * Log emergency-related activity
 */
export const logEmergencyActivity = {
  created: (emergencyId, description, metadata) =>
    logActivity('emergency_created', 'emergency_request', emergencyId, description, metadata),

  updated: (emergencyId, description, metadata) =>
    logActivity('emergency_updated', 'emergency_request', emergencyId, description, metadata),

  completed: (emergencyId, description, metadata) =>
    logActivity('emergency_completed', 'emergency_request', emergencyId, description, metadata)
};

/**
 * Log provider-related activity
 */
export const logProviderActivity = {
  verified: (providerId, description, metadata) =>
    logActivity('provider_verified', 'profile', providerId, description, metadata),

  registered: (providerId, description, metadata) =>
    logActivity('provider_registered', 'profile', providerId, description, metadata)
};

/**
 * Log ambulance-related activity
 */
export const logAmbulanceActivity = {
  dispatched: (ambulanceId, description, metadata) =>
    logActivity('ambulance_dispatched', 'ambulance', ambulanceId, description, metadata),

  returned: (ambulanceId, description, metadata) =>
    logActivity('ambulance_returned', 'ambulance', ambulanceId, description, metadata)
};

/**
 * Log visit-related activity
 */
export const logVisitActivity = {
  scheduled: (visitId, description, metadata) =>
    logActivity('visit_scheduled', 'visit', visitId, description, metadata),

  completed: (visitId, description, metadata) =>
    logActivity('visit_completed', 'visit', visitId, description, metadata)
};

/**
 * Log support ticket activity
 */
export const logSupportActivity = {
  created: (ticketId, description, metadata) =>
    logActivity('support_ticket_created', 'support_ticket', ticketId, description, metadata),

  resolved: (ticketId, description, metadata) =>
    logActivity('support_ticket_resolved', 'support_ticket', ticketId, description, metadata)
};

/**
 * Log subscription activity
 */
export const logSubscriptionActivity = {
  created: (subscriptionId, description, metadata) =>
    logActivity('subscription_created', 'subscription', subscriptionId, description, metadata),

  cancelled: (subscriptionId, description, metadata) =>
    logActivity('subscription_cancelled', 'subscription', subscriptionId, description, metadata)
};

/**
 * Log system activity
 */
export const logSystemActivity = {
  backup: (description, metadata) =>
    logActivity('system_backup', 'system', null, description, metadata),

  login: (description, metadata) =>
    logActivity('user_login', 'system', null, description, metadata),

  logout: (description, metadata) =>
    logActivity('user_logout', 'system', null, description, metadata),

  search: (description, metadata) =>
    logActivity('search_performed', 'search', null, description, metadata),

  profileUpdate: (userId, description, metadata) =>
    logActivity('profile_updated', 'profile', userId, description, metadata),

  adminAction: (description, metadata) =>
    logActivity('admin_action', 'system', null, description, metadata)
};
