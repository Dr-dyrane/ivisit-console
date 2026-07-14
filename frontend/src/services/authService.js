/**
 * Authorization Service
 * Handles role-based access control for service-level operations
 */

import { supabase } from '../lib/supabase';

const CURRENT_USER_CACHE_MS = 60000;
const RESPONDER_PROVIDER_TYPES = new Set(['driver', 'paramedic', 'ambulance', 'ambulance_service']);
let currentUserCache = { userId: null, value: null, expiresAt: 0 };
let currentUserPromise = null;

/**
 * Sanitize a display name before embedding it in a PostgREST `.or()` filter
 * list. Mirrors visitsService's sanitizeVisitSearchTerm: commas are the
 * or-list delimiter and percent is the ilike wildcard, so both are stripped
 * so a stored name can never widen or break the filter expression.
 */
const sanitizeNameForOrFilter = (value) => String(value || '')
  .trim()
  .replace(/[,%]/g, ' ')
  .replace(/\s+/g, ' ')
  .slice(0, 80);

function isSupabaseAuthLockAbort(errorLike) {
  const name = String(errorLike?.name || '');
  const message = String(errorLike?.message || errorLike || '');

  return (
    /AbortError/i.test(`${name} ${message}`) &&
    /signal is aborted without reason/i.test(message)
  );
}

export function clearCurrentUserCache() {
  currentUserCache = { userId: null, value: null, expiresAt: 0 };
  currentUserPromise = null;
}

export function primeCurrentUserCache(sessionUser, profile) {
  if (!sessionUser?.id || !profile) return;

  currentUserCache = {
    userId: sessionUser.id,
    value: {
      ...sessionUser,
      role: profile.role || 'viewer',
      organization_id: profile.organization_id || null,
      full_name: profile.full_name || profile.username || null,
      provider_type: profile.provider_type || null,
      hospital_ids: ['org_admin', 'dispatcher'].includes(profile.role)
        ? (Array.isArray(profile.hospital_ids) ? profile.hospital_ids : [])
        : null
    },
    expiresAt: Date.now() + CURRENT_USER_CACHE_MS
  };
  currentUserPromise = null;
}

async function loadCurrentUserWithProfile(sessionUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id, full_name, username, provider_type')
    .eq('id', sessionUser.id)
    .single();

  const result = {
    ...sessionUser,
    role: profile?.role || 'viewer',
    organization_id: profile?.organization_id || null,
    full_name: profile?.full_name || profile?.username || null,
    provider_type: profile?.provider_type || null,
    hospital_ids: null
  };

  if (['org_admin', 'dispatcher'].includes(result.role) && result.organization_id) {
    try {
      const { data: orgHospitals } = await supabase
        .from('hospitals')
        .select('id')
        .eq('organization_id', result.organization_id);

      result.hospital_ids = (orgHospitals || []).map(h => h.id);
    } catch {
      result.hospital_ids = [];
    }
  }

  return result;
}

/**
 * Get current authenticated user with profile
 */
export async function getCurrentUser(options = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      clearCurrentUserCache();
      return null;
    }

    const now = Date.now();
    if (
      !options.force &&
      currentUserCache.userId === session.user.id &&
      currentUserCache.value &&
      currentUserCache.expiresAt > now
    ) {
      return currentUserCache.value;
    }

    if (
      !options.force &&
      currentUserPromise?.userId === session.user.id &&
      currentUserPromise.promise
    ) {
      return currentUserPromise.promise;
    }

    const promise = loadCurrentUserWithProfile(session.user)
      .then((result) => {
        currentUserCache = {
          userId: session.user.id,
          value: result,
          expiresAt: Date.now() + CURRENT_USER_CACHE_MS,
        };
        return result;
      })
      .finally(() => {
        if (currentUserPromise?.userId === session.user.id) {
          currentUserPromise = null;
        }
      });

    currentUserPromise = { userId: session.user.id, promise };
    return promise;
  } catch (error) {
    if (!options.quiet && !isSupabaseAuthLockAbort(error)) {
      console.error('Error getting current user:', error);
    }
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
    //   - If orgIdField = 'organization_id' -> orgId matches directly
    //   - If orgIdField = 'hospital_id' -> need hospital_ids (resolved in getCurrentUser)
    const hospitalIds = user?.hospital_ids;
    const isHospitalScoped = orgIdField === 'hospital_id';

    if (isHospitalScoped && hospitalIds?.length) {
      // Scope to all hospitals under this org admin's organization
      if (hospitalIds.length > 1) {
        query = query.in(orgIdField, hospitalIds);
      } else {
        query = query.eq(orgIdField, hospitalIds[0]);
      }
    } else if (isHospitalScoped && Array.isArray(hospitalIds)) {
      // Contract: null/undefined hospital_ids = unresolved (trust RLS); resolved [] = org has no hospitals, scope to nothing.
      query = query.in(orgIdField, ['00000000-0000-0000-0000-000000000000']);
    } else if (isHospitalScoped) {
      // hospital_ids not resolved - skip client-side filter, RLS handles visibility
    } else {
      // orgIdField is 'organization_id' or similar - orgId matches directly
      query = query.eq(orgIdField, orgId);
    }
  } else if (role === 'dispatcher') {
    const hospitalIds = user?.hospital_ids;
    const isHospitalScoped = orgIdField === 'hospital_id';

    if (isHospitalScoped && hospitalIds?.length) {
      query = hospitalIds.length > 1
        ? query.in(orgIdField, hospitalIds)
        : query.eq(orgIdField, hospitalIds[0]);
    } else if (isHospitalScoped && Array.isArray(hospitalIds)) {
      query = query.in(orgIdField, ['00000000-0000-0000-0000-000000000000']);
    } else if (!isHospitalScoped && orgId) {
      query = query.eq(orgIdField, orgId);
    }
  } else if (role === 'provider') {
    // Provider sees only records assigned to them
    const hospitalIds = user?.hospital_ids;
    const isHospitalScoped = orgIdField === 'hospital_id';

    // For visits and emergencies, prioritizing hospital-based scoping
    if (resourceType === 'visit') {
      // Visits: scope by hospital_ids when available, then doctor assignment.
      // Interim per 2026-07-09 arbitration: visits key doctors by display name
      // (doctor_name TEXT), so the match is case-insensitive on exact-name
      // variants only — the bare profile name plus the common 'Dr.'/'Dr'
      // prefix forms. ilike with NO wildcards = case-insensitive exact match;
      // substring matching is deliberately excluded so two similarly named
      // doctors never see each other's visits. Identity column
      // (assigned_doctor_id) is queued app-side.
      const safeDoctorName = providerIdField ? sanitizeNameForOrFilter(user?.full_name) : '';
      if (isHospitalScoped && hospitalIds?.length) {
        query = hospitalIds.length > 1 ? query.in(orgIdField, hospitalIds) : query.eq(orgIdField, hospitalIds[0]);
      } else if (providerIdField && safeDoctorName) {
        const nameVariants = [...new Set([
          safeDoctorName,
          `Dr. ${safeDoctorName}`,
          `Dr ${safeDoctorName}`,
        ])];
        query = query.or(
          nameVariants.map((variant) => `${providerIdField}.ilike.${variant}`).join(',')
        );
      } else if (userId) {
        query = query.eq(userIdField, userId);
      }
    } else if (resourceType === 'emergency') {
      const isResponderProvider = RESPONDER_PROVIDER_TYPES.has(user?.provider_type);
      // Responder providers see only runs assigned to their UUID. Clinicians keep
      // their facility projection for non-driver emergency review.
      if (isResponderProvider && providerIdField && userId) {
        query = query.eq(providerIdField, userId);
      } else if (isHospitalScoped && hospitalIds?.length) {
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
