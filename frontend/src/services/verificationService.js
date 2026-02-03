/**
 * Verification Service
 * Handles provider verification with RBAC integration
 * Admin-only verification with proper authorization
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { logProviderActivity } from './activityService';
import { isAdmin, AuthorizationError, logAuthorizationEvent, handleServiceError } from './rbacPatterns';

const TABLE_NAME = 'profiles';

/**
 * Get verification queue with filters and pagination
 * Admin only - enforces RBAC at service layer
 */
export async function getVerificationQueue(filters = {}) {
  try {
    // Check if user can access verification queue
    const user = await getCurrentUser();
    const role = user?.role || 'viewer';

    if (!['admin', 'org_admin', 'sponsor'].includes(role)) {
      throw new AuthorizationError('Admin, Org Admin, or Sponsor access required for verification queue', 'verification', 'getQueue');
    }

    const {
      status = 'pending', // pending, approved, all
      search = '',
      page = 1,
      limit = 12,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = filters;

    // Build base query
    let query = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' });

    // Apply status filter
    if (status === 'pending') {
      query = query.eq('role', 'provider').eq('bvn_verified', false);
    } else if (status === 'approved') {
      query = query.eq('role', 'provider').eq('bvn_verified', true);
    } else if (status === 'rejected') {
      query = query.eq('role', 'provider').eq('bvn_verified', false); // Rejected providers are also unverified
    }
    // 'all' status should show all providers only
    if (status === 'all') {
      query = query.eq('role', 'provider');
    }

    // Apply search filter
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply ordering
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // NEW: Enrich with display IDs
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const profileIds = enrichedData.map(p => p.id);
      const displayIds = await getDisplayIds(profileIds);

      enrichedData = enrichedData.map(p => ({
        ...p,
        display_id: displayIds.get(p.id) || null
      }));
    }

    // Get global stats for providers only
    const statsQuery = supabase
      .from(TABLE_NAME)
      .select('role, bvn_verified')
      .eq('role', 'provider');

    const { data: allData, error: statsError } = await statsQuery;
    if (statsError) throw statsError;

    const stats = {
      pending: allData?.filter(u => !u.bvn_verified).length || 0,
      approved: allData?.filter(u => u.bvn_verified).length || 0,
      total: allData?.length || 0
    };

    logAuthorizationEvent('verification', 'getQueue', null, true);

    return {
      data: enrichedData,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };

  } catch (error) {
    return handleServiceError(error, 'verification', 'getQueue');
  }
}

/**
 * Verify or reject a provider
 * Admin only - enforces RBAC at service layer
 */
export async function verifyProvider(providerId, approved) {
  try {
    // Admin check - only admins can verify providers
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new AuthorizationError('Admin access required for provider verification', 'verification', 'verifyProvider');
    }

    // Get provider info for audit
    const { data: provider, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('username, email, role')
      .eq('id', providerId)
      .single();

    if (fetchError) throw fetchError;
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.role !== 'provider') {
      throw new Error('Only providers can be verified');
    }

    // Update verification status
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        bvn_verified: approved,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;

    logAuthorizationEvent('verification', 'verifyProvider', providerId, true,
      `${approved ? 'Approved' : 'Rejected'} provider: ${provider.username}`);

    // Log activity
    try {
      if (approved) {
        await logProviderActivity.verified(
          providerId,
          `New provider verified - ${provider.username}`,
          {
            email: provider.email,
            username: provider.username
          }
        );
      }
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
    }

    return data;

  } catch (error) {
    return handleServiceError(error, 'verification', 'verifyProvider');
  }
}

/**
 * Get verification statistics
 * Admin only
 */
export async function getVerificationStats() {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new AuthorizationError('Admin access required for verification stats', 'verification', 'getStats');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('role, bvn_verified, created_at')
      .eq('role', 'provider');

    if (error) throw error;

    const stats = {
      pending: data?.filter(u => !u.bvn_verified).length || 0,
      approved: data?.filter(u => u.bvn_verified).length || 0,
      total: data?.length || 0,
      recentSignups: data?.filter(u => {
        const signupDate = new Date(u.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return signupDate > weekAgo && !u.bvn_verified; // Recent unverified providers
      }).length || 0
    };

    logAuthorizationEvent('verification', 'getStats', null, true);

    return stats;

  } catch (error) {
    return handleServiceError(error, 'verification', 'getStats');
  }
}

/**
 * Subscribe to verification queue updates
 * Admin only subscription
 */
export function subscribeToVerificationQueue(callback) {
  // This function should be called after admin check is done
  const channel = supabase
    .channel('verification_queue_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: 'role=eq.provider'
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  logAuthorizationEvent('verification', 'subscribe', null, true, 'Subscribed to verification queue');

  return () => {
    supabase.removeChannel(channel);
    logAuthorizationEvent('verification', 'unsubscribe', null, true, 'Unsubscribed from verification queue');
  };
}

/**
 * Check if current user can verify providers
 */
export async function canVerifyProviders() {
  try {
    const user = await getCurrentUser();
    const role = user?.role || 'viewer';

    // Admins, Org Admins, and Sponsors can verify providers
    return ['admin', 'org_admin', 'sponsor'].includes(role);
  } catch (error) {
    logAuthorizationEvent('verification', 'canVerify', null, false, error.message);
    return false;
  }
}
