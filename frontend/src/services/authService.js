/**
 * Authorization Service
 * Handles role-based access control for service-level operations
 */

import { supabase } from '../lib/supabase';

/**
 * Get current authenticated user with profile
 */
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    return {
      ...session.user,
      role: profile?.role || 'viewer'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has admin privileges
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Build query with admin bypass logic
 * If admin: returns full query
 * If not admin: adds user_id filter
 */
export function buildAuthQuery(query, user, userIdField = 'user_id') {
  if (user?.role === 'admin') {
    // Admin gets full access - no filtering
    return query;
  }
  
  // Non-admin users only see their own data
  return query.eq(userIdField, user?.id);
}

/**
 * Apply authorization filters to service queries
 */
export function applyAuthFilter(baseQuery, user, options = {}) {
  const { 
    userIdField = 'user_id', 
    bypassForAdmin = true,
    additionalFilters = {}
  } = options;

  let query = baseQuery;

  // Apply admin bypass
  if (bypassForAdmin && user?.role === 'admin') {
    // Admin gets full access - skip user filtering
  } else {
    // Non-admin users get filtered data
    query = query.eq(userIdField, user?.id);
  }

  // Apply any additional filters
  Object.entries(additionalFilters).forEach(([field, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(field, value);
    }
  });

  return query;
}
