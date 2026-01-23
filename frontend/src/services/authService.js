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

    // Get user profile with role and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', session.user.id)
      .single();

    return {
      ...session.user,
      role: profile?.role || 'viewer',
      organization_id: profile?.organization_id || null
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
 * Supports Admin (all), Org Admin (scoped to org), and User (scoped to own record)
 */
export function applyAuthFilter(baseQuery, user, options = {}) {
  const {
    userIdField = 'user_id',
    orgIdField = 'organization_id',
    bypassForAdmin = true,
    additionalFilters = {}
  } = options;

  let query = baseQuery;
  const role = user?.role || 'viewer';
  const orgId = user?.organization_id;

  // 1. Apply Role-Based Scoping
  if (role === 'admin' && bypassForAdmin) {
    // Admin gets full access - skip scoping
  } else if (role === 'org_admin' && orgId) {
    // Org Admin sees everything in their organization
    query = query.eq(orgIdField, orgId);
  } else {
    // Everyone else only sees their own data
    // (Or records assigned to them)
    if (user?.id) {
      query = query.eq(userIdField, user.id);
    }
  }

  // 2. Apply any additional filters provided
  Object.entries(additionalFilters).forEach(([field, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        query = query.in(field, value);
      } else {
        query = query.eq(field, value);
      }
    }
  });

  return query;
}
/**
 * Update user password
 */
export async function updatePassword(password) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}
