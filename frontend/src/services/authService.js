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
      .select('role, organization_id, full_name, username')
      .eq('id', session.user.id)
      .single();

    const result = {
      ...session.user,
      role: profile?.role || 'viewer',
      organization_id: profile?.organization_id || null,
      full_name: profile?.full_name || profile?.username || null,
      hospital_ids: null // Will be populated for org_admin
    };

    // For org_admin: resolve all hospitals in the same organization
    // profiles.organization_id stores the PARENT organization UUID (organizations.id)
    // We find all hospitals under that organization
    if (result.role === 'org_admin' && result.organization_id) {
      try {
        // Fetch all hospitals under this organization
        const { data: orgHospitals } = await supabase
          .from('hospitals')
          .select('id')
          .eq('organization_id', result.organization_id);

        result.hospital_ids = (orgHospitals || []).map(h => h.id);
      } catch {
        // Fallback: empty — RLS will handle visibility
        result.hospital_ids = [];
      }

      // If no hospitals found, the org_admin won't see any scoped data
      // but RLS still works as a safety net
    }

    return result;
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
 * Apply authorization filters to service queries with role-based scoping
 * 
 * Supports:
 * - Admin: Full access (all records)
 * - Org Admin: Organization-scoped (their hospital's records)
 * - Provider (Doctor): Only records assigned to them
 * - Other roles: Only their own records
 * 
 * @param {object} baseQuery - Supabase query to apply filters to
 * @param {object} user - Current user object with role, id, organization_id
 * @param {object} options - Configuration options
 * @param {string} options.userIdField - Field name for user ownership (default: 'user_id')
 * @param {string} options.orgIdField - Field name for organization (default: 'organization_id')
 * @param {string} options.providerIdField - Field name for provider assignment (e.g., 'doctor_id')
 * @param {boolean} options.bypassForAdmin - Allow admins to see all (default: true)
 * @param {object} options.additionalFilters - Extra filters to apply
 * @param {string} options.resourceType - Type of resource ('visit', 'emergency', etc.) for smart scoping
 * @returns {object} Filtered query
 */
export function applyAuthFilter(baseQuery, user, options = {}) {
  const {
    userIdField = 'user_id',
    orgIdField = 'organization_id',
    providerIdField = 'doctor_id',
    bypassForAdmin = true,
    additionalFilters = {},
    resourceType = null
  } = options;

  let query = baseQuery;
  const role = user?.role || 'viewer';
  const orgId = user?.organization_id;
  const userId = user?.id;

  // 1. Apply Role-Based Scoping
  if (role === 'admin' && bypassForAdmin) {
    // Admin gets full access - no scoping applied
  } else if (role === 'org_admin' && orgId) {
    // Org Admin sees everything across all hospitals in their organization
    // Key fact: orgId is the PARENT organization UUID (from organizations.id)
    //   - If orgIdField = 'organization_id' → orgId matches directly
    //   - If orgIdField = 'hospital_id' → need hospital_ids (resolved in getCurrentUser)
    const hospitalIds = user?.hospital_ids;
    const isHospitalScoped = orgIdField === 'hospital_id';

    if (isHospitalScoped && hospitalIds?.length) {
      // Scope to all hospitals under this org admin's organization
      if (hospitalIds.length > 1) {
        query = query.in(orgIdField, hospitalIds);
      } else {
        query = query.eq(orgIdField, hospitalIds[0]);
      }
    } else if (isHospitalScoped) {
      // hospital_ids not resolved — skip client-side filter, RLS handles visibility
    } else {
      // orgIdField is 'organization_id' or similar — orgId matches directly
      query = query.eq(orgIdField, orgId);
    }
  } else if (role === 'provider' || role === 'doctor') {
    // Provider/Doctor sees only records assigned to them
    const hospitalIds = user?.hospital_ids;
    const isHospitalScoped = orgIdField === 'hospital_id';

    // For visits and emergencies, prioritizing hospital-based scoping
    if (resourceType === 'visit') {
      // Visits: scope by hospital_ids when available, then doctor assignment.
      if (isHospitalScoped && hospitalIds?.length) {
        query = hospitalIds.length > 1 ? query.in(orgIdField, hospitalIds) : query.eq(orgIdField, hospitalIds[0]);
      } else if (providerIdField && user?.full_name) {
        query = query.eq(providerIdField, user.full_name);
      } else if (userId) {
        query = query.eq(userIdField, userId);
      }
    } else if (resourceType === 'emergency') {
      // Emergencies: scope by hospital_ids when available, otherwise assigned responder.
      if (isHospitalScoped && hospitalIds?.length) {
        query = hospitalIds.length > 1 ? query.in(orgIdField, hospitalIds) : query.eq(orgIdField, hospitalIds[0]);
      } else if (providerIdField && userId) {
        // For emergencies, providerIdField should be 'responder_id' and userId is the provider's UUID
        query = query.eq(providerIdField, userId);
      } else if (userId) {
        // Fallback: see emergencies requested by the provider (as patient)
        query = query.eq(userIdField, userId);
      }
    } else if (resourceType === 'support') {
      // Support tickets: providers see only tickets they created.
      // support_tickets uses user_id as the ownership field.
      if (userId) {
        query = query.eq(userIdField, userId);
      }
    } else if (resourceType === 'news') {
      // News: providers can see all (read-only handled at UI level)
      // No filtering needed
    } else {
      // Default: providers see only their own records
      if (userId) {
        query = query.eq(userIdField, userId);
      }
    }
  } else {
    // Everyone else (patients, viewers, etc.) only sees their own data
    if (userId) {
      query = query.eq(userIdField, userId);
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
