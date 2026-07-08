/**
 * Profiles Service
 * Handles all Supabase queries for profiles table
 * User accounts, authentication, and role management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { isValidUUID } from '../lib/utils';
import { withRetry, withAudit } from './supabaseHelpers';

const TABLE_NAME = 'profiles';

/**
 * Check if current user is admin
 */
async function isAdmin() {
  try {
    const { data, error } = await supabase.rpc('current_user_is_admin');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get profiles with auth data (admin only)
 */
async function getProfilesWithAuthData(filter) {
  try {
    // Get all auth users with profile data, scoped by organization if provided.
    // L1 hardening: retry the idempotent RPC read on transient failures
    // (network/timeout, 429, 5xx). The RPC is re-issued inside the callback and
    // its error is thrown so non-retryable errors (auth/RLS) still surface on the
    // first attempt, preserving prior throw-on-error behavior for callers.
    const { data, error } = await withRetry(async () => {
      const result = await supabase.rpc('get_all_auth_users', {
        p_organization_id: filter?.organization_id || null
      });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    let profiles = (data || []).map(u => ({
      ...u,
      // Map RPC specific fields to standard profile fields
      role: u.profile_role || u.role,
      username: u.profile_username || u.username,
      first_name: u.profile_first_name || u.first_name,
      last_name: u.profile_last_name || u.last_name,
      full_name: u.profile_full_name || u.full_name,
      provider_type: u.profile_provider_type || u.provider_type,
      bvn_verified: u.profile_bvn_verified || u.bvn_verified,
      organization_id: u.profile_organization_id || u.organization_id,
      organization_name: u.organization_name || u.profile_organization_name || 'Independent',
      display_id: u.profile_display_id || u.display_id,
      // Handle image_uri/avatar if present in RPC, otherwise rely on fallbacks
      image_uri: u.profile_image_uri || u.image_uri,
      avatar_url: u.profile_avatar_url || u.avatar_url
    }));

    // Apply filters
    if (filter?.role) {
      const roles = Array.isArray(filter.role) ? filter.role : [filter.role];
      if (roles.length > 0) {
        profiles = profiles.filter(p => roles.includes(p.role));
      }
    }
    if (filter?.provider_type) {
      const types = Array.isArray(filter.provider_type) ? filter.provider_type : [filter.provider_type];
      if (types.length > 0) {
        profiles = profiles.filter(p => types.includes(p.provider_type));
      }
    }
    if (filter?.verified !== undefined) {
      profiles = profiles.filter(p => p.bvn_verified === filter.verified);
    }

    // Apply pagination
    if (filter?.offset || filter?.limit) {
      const start = filter?.offset || 0;
      const end = start + (filter?.limit || 10);
      profiles = profiles.slice(start, end);
    }

    // NEW: Enrich with display IDs
    if (profiles.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const profileIds = profiles.map(p => p.id);
      const displayIds = await getDisplayIds(profileIds, { quiet: filter?.quiet });

      profiles = profiles.map(p => ({
        ...p,
        display_id: displayIds.get(p.id) || null
      }));
    }

    return profiles;
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching profiles with auth data:', error);
    }
    throw error;
  }
}


/**
 * Get user statistics (admin only)
 */
export async function getUserStatistics(options = {}) {
  try {
    const user = await getCurrentUser();
    // RBAC: Patients should not be calling statistics (Console only)
    if (user?.role === 'patient') {
      return { totalUsers: 0, totalProfiles: 0, recentSignups: 0, roleDistribution: {} };
    }

    // L1 hardening: retry the idempotent statistics RPC on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase.rpc('get_user_statistics');
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    // Transform the row data into a more usable format
    return data && data.length > 0 ? {
      totalUsers: data[0].total_users,
      totalProfiles: data[0].total_profiles,
      recentSignups: data[0].recent_signups,
      emailVerifiedUsers: data[0].email_verified_users,
      phoneVerifiedUsers: data[0].phone_verified_users,
      roleDistribution: {
        admin: data[0].admin_count,
        provider: data[0].provider_count,
        sponsor: data[0].sponsor_count,
        viewer: data[0].viewer_count,
        patient: data[0].patient_count,
        org_admin: data[0].org_admin_count,
        dispatcher: data[0].dispatcher_count
      }
    } : {};
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching user statistics:', error);
    }
    throw error;
  }
}

/**
 * Search users (admin only)
 */
export async function searchUsers(searchTerm) {
  try {
    const user = await getCurrentUser();
    // RBAC: Patients should not be searching users (Console only)
    if (user?.role === 'patient') {
      return [];
    }

    // L1 hardening: retry the idempotent search RPC on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase.rpc('search_auth_users', { search_term: searchTerm });
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Get all profiles with optional filters
 * Admin users can see all profiles + auth data, others see only their own
 */
export async function getProfiles(filter = {}) {
  try {
    const user = await getCurrentUser();

    // Use the enhanced RPC path for any role that has administrative permissions (admin, org_admin, dispatcher)
    const isAdminRole = user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'dispatcher';

    if (isAdminRole && filter?.includeAuthData) {
      // Pass the organization_id filter if the user is scoped (org_admin/dispatcher)
      const scopingId = user.role === 'admin' ? filter.organization_id : (user.organization_id || filter.organization_id);
      return await getProfilesWithAuthData({ ...filter, organization_id: scopingId });
    }

    // L1 hardening: retry the primary profiles read on transient failures. The
    // query is rebuilt inside the callback because Supabase builders are
    // single-use thenables; non-retryable errors (auth/RLS/constraint) still
    // throw on the first attempt, preserving prior throw-on-error behavior.
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      // 1. Apply RBAC Scoping
      query = applyAuthFilter(query, user, {
        userIdField: 'id',
        orgIdField: 'organization_id'
      });

      // 2. Apply Custom Filters

      // Apply additional filters
      if (filter?.role) {
        if (Array.isArray(filter.role)) {
          if (filter.role.length > 0) query = query.in('role', filter.role);
        } else {
          query = query.eq('role', filter.role);
        }
      }
      if (filter?.provider_type) {
        if (Array.isArray(filter.provider_type)) {
          if (filter.provider_type.length > 0) query = query.in('provider_type', filter.provider_type);
        } else {
          query = query.eq('provider_type', filter.provider_type);
        }
      }
      if (filter?.verified !== undefined) {
        query = query.eq('bvn_verified', filter.verified);
      }

      const sortBy = filter?.sortBy || 'created_at';
      const ascending = filter?.ascending !== undefined ? filter.ascending : false;
      query = query.order(sortBy, { ascending });

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    // NEW: Enrich with display IDs
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('./displayIdService');
      const profileIds = enrichedData.map(p => p.id);
      const displayIds = await getDisplayIds(profileIds, { quiet: filter?.quiet });

      enrichedData = enrichedData.map(p => ({
        ...p,
        display_id: p.display_id || (displayIds.get ? displayIds.get(p.id) : displayIds[p.id]) || null
      }));
    }

    return enrichedData;
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching profiles:', error);
    }
    throw error;
  }
}

/**
 * Get single profile by ID
 */
export async function getProfile(profileId) {
  try {
    // NOTE: no UUID early-return here - this function intentionally falls back to
    // a display_id lookup for non-UUID input, so a display label is a valid key.
    // L1 hardening: .maybeSingle() (not .single()) so a 0-row RLS-scoped read
    // returns null instead of PGRST116/406; retried on transient failures.
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(profileId)) {
        query = query.eq('id', profileId);
      } else {
        query = query.eq('display_id', profileId);
      }

      const result = await query.maybeSingle();
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching profile ${profileId}:`, error);
    throw error;
  }
}

/**
 * Create new profile
 */
/**
 * Create new profile
 */
export async function createProfile(input) {
  try {
    const normalizeString = (value) => typeof value === 'string' ? value.trim() : value;
    const payload = {
      id: input.id,
      email: normalizeString(input.email),
      phone: normalizeString(input.phone) || null,
      username: normalizeString(input.username) || null,
      first_name: normalizeString(input.first_name) || null,
      last_name: normalizeString(input.last_name) || null,
      full_name: normalizeString(input.full_name),
      image_uri: input.image_uri || input.avatar_url,
      role: normalizeString(input.role) || 'patient',
      organization_id: input.organization_id === '' ? null : input.organization_id || null,
      provider_type: normalizeString(input.provider_type) || null,
      bvn_verified: input.bvn_verified || false,
      address: normalizeString(input.address) || null,
      gender: normalizeString(input.gender) || null,
      date_of_birth: normalizeString(input.date_of_birth) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove undefined keys
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Critical mutation on the shared `profiles` table - wrap in withAudit so the
    // insert is logged (fire-and-forget) without altering the return contract.
    // .single() is safe here: an insert...select returns exactly the one new row.
    const data = await withAudit('profile.create', 'profile', async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (result.error) throw result.error;

      return result.data;
    }, { role: payload.role });

    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
}

/**
 * Update profile
 *
 * FIX: Direct supabase.from('profiles').update() fails for admin updating
 * OTHER users' profiles (RLS USING clause with get_current_user_role()
 * silently returns 0 rows, causing PGRST116). For admin edits on other
 * users, we use the update_profile_by_admin SECURITY DEFINER RPC.
 * Self-updates still use the direct path (own-row RLS works fine).
 * See migration 20260216070800.
 */
export async function updateProfile(profileId, input) {
  try {
    // Whitelist allowed fields to prevent contaminating the DB with join fields
    const allowedFields = [
      'email', 'phone', 'username', 'first_name', 'last_name', 'full_name',
      'image_uri', 'avatar_url', 'role', 'organization_id', 'provider_type',
      'bvn_verified', 'address', 'gender', 'date_of_birth'
    ];

    const payload = {};
    const nullableStringFields = new Set([
      'phone', 'username', 'first_name', 'last_name', 'address', 'gender', 'date_of_birth'
    ]);
    const enumFields = new Set(['role', 'provider_type']);

    const normalizeString = (value) => typeof value === 'string' ? value.trim() : value;

    allowedFields.forEach(field => {
      if (input[field] !== undefined) {
        if (field === 'avatar_url' && !payload.image_uri) {
          payload.image_uri = input[field];
        } else if (field === 'organization_id') {
          // Convert empty string to null for UUID fields
          payload[field] = input[field] === '' ? null : input[field];
        } else if (typeof input[field] === 'string') {
          const normalized = normalizeString(input[field]);

          // Empty enum values should not overwrite existing valid DB values.
          if (enumFields.has(field) && normalized === '') {
            return;
          }

          // Optional text/date fields should store null instead of empty strings.
          if (nullableStringFields.has(field) && normalized === '') {
            payload[field] = null;
            return;
          }

          payload[field] = normalized;
        } else {
          payload[field] = input[field];
        }
      }
    });

    // Guard provider consistency on update. If provider type is set but role is omitted/empty, preserve provider.
    if (payload.provider_type && !payload.role) {
      payload.role = 'provider';
    }

    payload.updated_at = new Date().toISOString();

    // Check if this is a self-update or admin updating another user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isSelfUpdate = currentUser?.id === profileId;

    // Critical mutation on the shared `profiles` table - wrap in withAudit. The
    // branch return shapes are preserved exactly (self-update returns the row;
    // admin RPC returns whatever update_profile_by_admin returns).
    return await withAudit('profile.update', 'profile', async () => {
      if (isSelfUpdate) {
        // Self-update: direct table update works (own-row RLS)
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .update(payload)
          .eq('id', profileId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Admin updating another user: use SECURITY DEFINER RPC
        const { data, error } = await supabase.rpc('update_profile_by_admin', {
          target_user_id: profileId,
          profile_data: payload
        });

        if (error) throw error;
        return data;
      }
    }, { entityId: profileId, self: isSelfUpdate });
  } catch (error) {
    console.error(`Error updating profile ${profileId}:`, error);
    throw error;
  }
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(email) {
  try {
    // L1 hardening: .maybeSingle() so a 0-row (or RLS-scoped) email lookup
    // returns null instead of PGRST116/406; retried on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching profile by email ${email}:`, error);
    throw error;
  }
}

/**
 * Get all profiles by role
 */
export async function getProfilesByRole(role) {
  try {
    // L1 hardening: retry the idempotent role-scoped read on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching profiles by role ${role}:`, error);
    throw error;
  }
}

/**
 * Get all providers by type
 */
export async function getProvidersByType(providerType) {
  try {
    // L1 hardening: retry the idempotent provider-type read on transient failures.
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('provider_type', providerType)
        .eq('role', 'provider')
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching providers by type ${providerType}:`, error);
    throw error;
  }
}

/**
 * Verify profile BVN
 */
export async function verifyProfileBVN(profileId) {
  try {
    // Admin verifies ANOTHER user's row; owner-only RLS makes a direct
    // .update()...single() match 0 rows and 406. Route through the same
    // SECURITY DEFINER RPC updateProfile uses. The RPC returns jsonb
    // {success, id}, not the row, so re-read the full profile to preserve
    // the caller contract (useProfiles.verifyBVN splices the full row into state).
    // Critical identity mutation on the shared `profiles` table - wrap the RPC in
    // withAudit. The re-read below (getProfile) preserves the caller contract:
    // useProfiles.verifyBVN splices the full row back into state.
    await withAudit('profile.verify_bvn', 'profile', async () => {
      const { error } = await supabase.rpc('update_profile_by_admin', {
        target_user_id: profileId,
        profile_data: { bvn_verified: true },
      });

      if (error) throw error;

      return { id: profileId };
    }, { entityId: profileId });

    return await getProfile(profileId);
  } catch (error) {
    console.error(`Error verifying profile BVN ${profileId}:`, error);
    throw error;
  }
}

/**
 * Update profile avatar
 */
export async function updateProfileAvatar(profileId, avatarUrl) {
  try {
    // Direct write to the shared `profiles` table - wrap in withAudit. .single()
    // is safe: this updates the caller's own row (owner-scoped RLS) and returns it.
    const data = await withAudit('profile.update_avatar', 'profile', async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .update({
          image_uri: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .select()
        .single();

      if (result.error) throw result.error;

      return result.data;
    }, { entityId: profileId });

    return data;
  } catch (error) {
    console.error(`Error updating profile avatar ${profileId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to profile updates
 */
export function subscribeToProfile(profileId, callback) {
  const channel = supabase
    .channel(`profile_${profileId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${profileId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Upload profile avatar to storage
 */
export async function uploadProfileAvatar(userId, file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}
