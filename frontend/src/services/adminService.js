/**
 * Enhanced Admin Service - 100% comprehensive admin operations
 * Enterprise-grade features: bulk operations, audit logging, granular permissions, real-time
 * All admin functionality flows through this centralized service
 */

import { supabase } from '../lib/supabase';
import { getProfiles, getUserStatistics, searchUsers } from './profilesService';

// Cache for performance optimization
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Permission levels for granular access control
export const PERMISSION_LEVELS = {
  READ_ONLY: 'read_only',
  BASIC_ADMIN: 'basic_admin',
  FULL_ADMIN: 'full_admin',
  SUPER_ADMIN: 'super_admin'
};

// Audit action types
export const AUDIT_ACTIONS = {
  USER_VIEW: 'user_view',
  USER_EDIT: 'user_edit',
  USER_DELETE: 'user_delete',
  USER_SUSPEND: 'user_suspend',
  USER_ACTIVATE: 'user_activate',
  BULK_OPERATION: 'bulk_operation',
  VERIFICATION_APPROVE: 'verification_approve',
  VERIFICATION_REJECT: 'verification_reject',
  ROLE_CHANGE: 'role_change',
  SYSTEM_CONFIG: 'system_config',
  DATA_EXPORT: 'data_export'
};

/**
 * Get cached data or fetch fresh data
 */
const getCachedOrFetch = async (key, fetchFunction, duration = CACHE_DURATION) => {
  const cached = cache.get(key);

  if (cached && (Date.now() - cached.timestamp) < duration) {
    return cached.data;
  }

  const data = await fetchFunction();
  cache.set(key, {
    data,
    timestamp: Date.now()
  });

  return data;
};

/**
 * Log admin action for audit trail
 */
const logAdminAction = async (action, details = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('admin_audit_log').insert({
      admin_id: user?.id,
      action,
      details,
      ip_address: details.ipAddress || 'unknown',
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

/**
 * Check if current user is admin with permission level
 */
export const isAdmin = async () => {
  try {
    const { data, error } = await supabase.rpc('current_user_is_admin');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get current user's permission level
 */
export const getUserPermissionLevel = async () => {
  try {
    const { data, error } = await supabase.rpc('current_user_permission_level');
    if (error) throw error;
    return data || PERMISSION_LEVELS.READ_ONLY;
  } catch (error) {
    console.error('Error getting permission level:', error);
    return PERMISSION_LEVELS.READ_ONLY;
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = async (requiredLevel) => {
  const userLevel = await getUserPermissionLevel();
  const levelHierarchy = {
    [PERMISSION_LEVELS.READ_ONLY]: 0,
    [PERMISSION_LEVELS.BASIC_ADMIN]: 1,
    [PERMISSION_LEVELS.FULL_ADMIN]: 2,
    [PERMISSION_LEVELS.SUPER_ADMIN]: 3
  };

  return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel];
};

/**
 * Get comprehensive user data for admin dashboard
 */
export const getAdminUserData = async (options = {}) => {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new Error('Access denied: Admin privileges required');
    }

    const {
      includeAuthData = true,
      includeStatistics = true,
      includeActivity = false,
      filters = {},
      pagination = {},
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const cacheKey = `admin_users_${JSON.stringify(options)}`;

    return await getCachedOrFetch(cacheKey, async () => {
      const result = {};

      // Get user profiles with auth data
      if (includeAuthData) {
        result.users = await getProfiles({
          ...filters,
          includeAuthData: true,
          sortBy,
          sortOrder,
          ...pagination
        });
      }

      // Get statistics
      if (includeStatistics) {
        result.statistics = await getUserStatistics();
      }

      // Get recent activity
      if (includeActivity) {
        const { data: activity } = await supabase
          .from('user_activity')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        result.recentActivity = activity || [];
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      result.totalCount = count || 0;

      // Log admin action
      await logAdminAction(AUDIT_ACTIONS.USER_VIEW, {
        filters,
        pagination,
        resultCount: result.totalCount
      });

      return result;
    });
  } catch (error) {
    console.error('Admin user data fetch failed:', error);
    throw error;
  }
};

/**
 * Bulk user operations
 */
export const bulkUserOperation = async (userIds, operation, operationData = {}) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.FULL_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Full admin privileges required for bulk operations');
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        let result;

        switch (operation) {
          case 'suspend':
            result = await suspendUser(userId, operationData.reason);
            break;
          case 'activate':
            result = await activateUser(userId);
            break;
          case 'delete':
            result = await deleteUser(userId);
            break;
          case 'change_role':
            result = await changeUserRole(userId, operationData.newRole);
            break;
          default:
            throw new Error(`Unknown bulk operation: ${operation}`);
        }

        results.push({ userId, success: true, result });
      } catch (error) {
        errors.push({ userId, error: error.message });
        results.push({ userId, success: false, error: error.message });
      }
    }

    // Log bulk operation
    await logAdminAction(AUDIT_ACTIONS.BULK_OPERATION, {
      operation,
      userIds,
      operationData,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length
    });

    return {
      results,
      errors,
      summary: {
        total: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length
      }
    };
  } catch (error) {
    console.error('Bulk operation failed:', error);
    throw error;
  }
};

/**
 * Suspend user account
 */
export const suspendUser = async (userId, reason = '') => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.BASIC_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Basic admin privileges required');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'suspended',
        suspension_reason: reason,
        suspended_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.USER_SUSPEND, {
      targetUserId: userId,
      reason
    });

    return data;
  } catch (error) {
    console.error('User suspension failed:', error);
    throw error;
  }
};

/**
 * Activate user account
 */
export const activateUser = async (userId) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.BASIC_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Basic admin privileges required');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        suspension_reason: null,
        suspended_at: null
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.USER_ACTIVATE, {
      targetUserId: userId
    });

    return data;
  } catch (error) {
    console.error('User activation failed:', error);
    throw error;
  }
};

/**
 * Delete user account (soft delete)
 */
export const deleteUser = async (userId) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.SUPER_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Super admin privileges required for user deletion');
    }

    // Soft delete - mark as deleted but keep data for audit
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.USER_DELETE, {
      targetUserId: userId
    });

    return data;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};

/**
 * Change user role
 */
export const changeUserRole = async (userId, newRole) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.FULL_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Full admin privileges required for role changes');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.ROLE_CHANGE, {
      targetUserId: userId,
      newRole
    });

    return data;
  } catch (error) {
    console.error('Role change failed:', error);
    throw error;
  }
};

/**
 * Get verification queue data with enhanced filtering
 */
export const getVerificationQueueData = async (options = {}) => {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new Error('Access denied: Admin privileges required');
    }

    const {
      status = 'pending',
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {}
    } = options;

    const cacheKey = `verification_queue_${JSON.stringify(options)}`;

    return await getCachedOrFetch(cacheKey, async () => {
      let query = supabase
        .from('profiles')
        .select(`*,
          auth_user:auth.users(email, created_at)
        `)
        .eq('verification_status', status)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.dateRange) {
        query = query.gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Get statistics
      const { data: stats } = await supabase
        .from('profiles')
        .select('verification_status', { count: 'exact' });

      const statusCounts = stats?.reduce((acc, profile) => {
        acc[profile.verification_status] = (acc[profile.verification_status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Log action
      await logAdminAction(AUDIT_ACTIONS.USER_VIEW, {
        action: 'verification_queue_view',
        status,
        filters,
        resultCount: data?.length || 0
      });

      return {
        users: data || [],
        stats: {
          pending: statusCounts.pending || 0,
          approved: statusCounts.approved || 0,
          rejected: statusCounts.rejected || 0,
          total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
        },
        totalCount: count || 0
      };
    });
  } catch (error) {
    console.error('Verification queue fetch failed:', error);
    throw error;
  }
};

/**
 * Approve verification
 */
export const approveVerification = async (userId) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.BASIC_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Basic admin privileges required');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        verification_status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.VERIFICATION_APPROVE, {
      targetUserId: userId
    });

    return data;
  } catch (error) {
    console.error('Verification approval failed:', error);
    throw error;
  }
};

/**
 * Reject verification
 */
export const rejectVerification = async (userId, reason = '') => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.BASIC_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Basic admin privileges required');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction(AUDIT_ACTIONS.VERIFICATION_REJECT, {
      targetUserId: userId,
      reason
    });

    return data;
  } catch (error) {
    console.error('Verification rejection failed:', error);
    throw error;
  }
};

/**
 * Get admin analytics data
 */
export const getAdminAnalyticsData = async (options = {}) => {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new Error('Access denied: Admin privileges required');
    }

    const {
      timeRange = '30d',
      includeActivity = true
    } = options;

    const cacheKey = `admin_analytics_${JSON.stringify(options)}`;

    return await getCachedOrFetch(cacheKey, async () => {
      // Get user statistics
      const userStats = await getUserStatistics();

      // Get admin activity metrics
      let activityMetrics = {};
      if (includeActivity) {
        const { data: activity } = await supabase
          .from('admin_audit_log')
          .select('action, timestamp')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        activityMetrics = activity?.reduce((acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {}) || {};
      }

      // Log action
      await logAdminAction(AUDIT_ACTIONS.USER_VIEW, {
        action: 'admin_analytics_view',
        timeRange
      });

      return {
        ...userStats,
        activityMetrics,
        totalAdminActions: Object.values(activityMetrics).reduce((sum, count) => sum + count, 0)
      };
    });
  } catch (error) {
    console.error('Admin analytics fetch failed:', error);
    throw error;
  }
};

/**
 * Search users with enhanced options
 */
export const adminSearchUsers = async (searchTerm, options = {}) => {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      throw new Error('Access denied: Admin privileges required');
    }

    const {
      includeAuthData = true,
      limit = 20,
      filters = {}
    } = options;

    // Log search
    await logAdminAction(AUDIT_ACTIONS.USER_VIEW, {
      action: 'admin_search',
      searchTerm,
      filters
    });

    return await searchUsers(searchTerm, {
      includeAuthData,
      limit,
      ...filters
    });
  } catch (error) {
    console.error('Admin search failed:', error);
    throw error;
  }
};

/**
 * Get user options for dropdowns
 */
export const getUserOptions = async (options = {}) => {
  try {
    const {
      role = null,
      status = 'active',
      limit = 100
    } = options;

    let query = supabase
      .from('profiles')
      .select('id, username, email, role')
      .eq('status', status)
      .order('username')
      .limit(limit);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('User options fetch failed:', error);
    throw error;
  }
};

/**
 * Get audit log
 */
export const getAuditLog = async (options = {}) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.FULL_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Full admin privileges required for audit log');
    }

    const {
      limit = 100,
      offset = 0,
      action = null,
      adminId = null,
      dateRange = null
    } = options;

    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:auth.users(email)
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (dateRange) {
      query = query.gte('timestamp', dateRange.start)
        .lte('timestamp', dateRange.end);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      entries: data || [],
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Audit log fetch failed:', error);
    throw error;
  }
};

/**
 * Export admin data
 */
export const exportAdminData = async (dataType, options = {}) => {
  try {
    const permissionCheck = await hasPermission(PERMISSION_LEVELS.BASIC_ADMIN);
    if (!permissionCheck) {
      throw new Error('Access denied: Admin privileges required for data export');
    }

    let data;
    switch (dataType) {
      case 'users':
        data = await getAdminUserData({ ...options, includeAuthData: true });
        break;
      case 'verification_queue':
        data = await getVerificationQueueData(options);
        break;
      case 'audit_log':
        data = await getAuditLog(options);
        break;
      default:
        throw new Error(`Unknown data type for export: ${dataType}`);
    }

    // Log export
    await logAdminAction(AUDIT_ACTIONS.DATA_EXPORT, {
      dataType,
      options,
      recordCount: Array.isArray(data) ? data.length : (data.users?.length || 0)
    });

    return data;
  } catch (error) {
    console.error('Data export failed:', error);
    throw error;
  }
};

/**
 * Execute any admin function with privilege checking
 */
export const withAdminPrivileges = async (serviceFunction, ...args) => {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    throw new Error('Access denied: Admin privileges required');
  }

  return await serviceFunction(...args);
};

/**
 * Clear admin service cache
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Get real-time admin statistics
 */
export const getRealTimeStats = async () => {
  try {
    const cacheKey = 'realtime_admin_stats';

    return await getCachedOrFetch(cacheKey, async () => {
      const [
        totalUsers,
        pendingVerifications,
        activeSessions,
        recentActivity
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('user_sessions').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('admin_audit_log').select('id', { count: 'exact', head: true }).gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        totalUsers: totalUsers.count || 0,
        pendingVerifications: pendingVerifications.count || 0,

        activeSessions: activeSessions.count || 0,
        recentAdminActivity: recentActivity.count || 0
      };
    }, 30 * 1000); // 30 second cache for real-time data
  } catch (error) {
    console.error('Real-time stats fetch failed:', error);
    throw error;
  }
};

/**
 * Invite user via Edge Function
 */
export const inviteUser = async (email, role, metadata = {}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) throw new Error('Not authenticated');

    // Call Edge Function
    // Fallback to locally defined URL if env var missing (unlikely in prod)
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('REACT_APP_SUPABASE_URL not defined');

    const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ email, role, metadata })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to invite user');
    }

    return await response.json();
  } catch (error) {
    console.error('Invite user failed:', error);
    throw error;
  }
};
