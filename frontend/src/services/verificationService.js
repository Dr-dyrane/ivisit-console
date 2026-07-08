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
const PROVIDER_STATS_CACHE_MS = 30000;
let providerVerificationStatsCache = {
  timestamp: 0,
  value: null,
  promise: null
};

function clearProviderVerificationStatsCache() {
  providerVerificationStatsCache = {
    timestamp: 0,
    value: null,
    promise: null
  };
}

async function getProviderCount(applyFilters = query => query) {
  const query = applyFilters(
    supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('role', 'provider')
  );

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function getProviderVerificationStats() {
  const now = Date.now();
  if (
    providerVerificationStatsCache.value &&
    now - providerVerificationStatsCache.timestamp < PROVIDER_STATS_CACHE_MS
  ) {
    return providerVerificationStatsCache.value;
  }

  if (providerVerificationStatsCache.promise) {
    return providerVerificationStatsCache.promise;
  }

  providerVerificationStatsCache.promise = Promise.all([
    getProviderCount(query => query.eq('bvn_verified', false)),
    getProviderCount(query => query.eq('bvn_verified', true)),
    getProviderCount()
  ]).then(([pending, approved, total]) => {
    const stats = {
      pending,
      approved,
      rejected: 0,
      total
    };

    providerVerificationStatsCache.value = stats;
    providerVerificationStatsCache.timestamp = Date.now();
    return stats;
  }).finally(() => {
    providerVerificationStatsCache.promise = null;
  });

  return providerVerificationStatsCache.promise;
}

/**
 * Get verification queue with filters and pagination
 * Admin only - enforces RBAC at service layer
 */
export async function getVerificationQueue(filters = {}) {
  try {
    // Check if user can access verification queue
    const user = await getCurrentUser();
    const role = user?.role || 'viewer';

    // Silent Guard: Return empty instead of throwing for unauthorized console access
    if (!['admin', 'org_admin'].includes(role)) {
      if (role === 'patient') {
        return {
          data: [],
          stats: { pending: 0, approved: 0, total: 0 },
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }
        };
      }
      throw new AuthorizationError('Admin or Org Admin access required for approvals', 'verification', 'getQueue');
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

    const enrichedData = (data || []).map(p => ({
      ...p,
      display_id: p.display_id || null
    }));

    const stats = await getProviderVerificationStats();

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
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.role !== 'provider') {
      throw new Error('Only providers can be verified');
    }

    // Update verification status.
    // Admin verifies ANOTHER user's row; owner-only RLS on profiles makes a
    // direct .update()...single() match 0 rows and 406 ("Cannot coerce the
    // result to a single JSON object"). Route through the SECURITY DEFINER RPC
    // already used by profilesService.updateProfile. RPC returns
    // jsonb {success, id}; mirror that handling.
    const { data, error } = await supabase.rpc('update_profile_by_admin', {
      target_user_id: providerId,
      profile_data: { bvn_verified: approved }
    });

    if (error) throw error;

    clearProviderVerificationStatsCache();

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

// Cache for verification stats to prevent repeated admin checks
const verificationStatsCache = new Map();
const STATS_CACHE_DURATION = 10 * 1000; // 10 seconds

/**
 * Get verification statistics
 * Admin only
 */
export async function getVerificationStats() {
  const now = Date.now();

  // Check cache first
  if (verificationStatsCache.has('stats')) {
    const cached = verificationStatsCache.get('stats');
    if (now - cached.timestamp < STATS_CACHE_DURATION) {
      logAuthorizationEvent('verification', 'getStats', null, true, 'Cache hit');
      return cached.data;
    }
  }

  try {
    const user = await getCurrentUser();
    const role = user?.role || 'viewer';

    // Silent Guard: Return empty instead of throwing for unauthorized console access
    if (!['admin', 'org_admin', 'sponsor', 'viewer'].includes(role)) {
      if (role === 'patient') {
        return { pending: 0, approved: 0, total: 0, recentSignups: 0 };
      }
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

    // Cache the result
    verificationStatsCache.set('stats', {
      data: stats,
      timestamp: now
    });

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
 * Check if the current user can approve provider records.
 */
export async function canVerifyProviders() {
  try {
    const user = await getCurrentUser();
    const role = user?.role || 'viewer';

    return role === 'admin';
  } catch (error) {
    logAuthorizationEvent('verification', 'canVerify', null, false, error.message);
    return false;
  }
}
