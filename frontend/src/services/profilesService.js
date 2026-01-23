/**
 * Profiles Service
 * Handles all Supabase queries for profiles table
 * User accounts, authentication, and role management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

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
    // Get all auth users with profile data
    const { data, error } = await supabase.rpc('get_all_auth_users');
    if (error) throw error;

    let profiles = (data || []).map(u => ({
      ...u,
      // Map RPC specific fields to standard profile fields
      role: u.profile_role,
      username: u.profile_username,
      first_name: u.profile_first_name,
      last_name: u.profile_last_name,
      full_name: u.profile_full_name,
      provider_type: u.profile_provider_type,
      bvn_verified: u.profile_bvn_verified,
      organization_id: u.profile_organization_id || u.organization_id,
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

    return profiles;
  } catch (error) {
    console.error('Error fetching profiles with auth data:', error);
    throw error;
  }
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStatistics() {
  try {
    const { data, error } = await supabase.rpc('get_user_statistics');
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
      }
    } : {};
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Search users (admin only)
 */
export async function searchUsers(searchTerm) {
  try {
    const { data, error } = await supabase.rpc('search_auth_users', { search_term: searchTerm });
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

    // If admin and wants full user data, use admin service
    if (user?.role === 'admin' && filter?.includeAuthData) {
      return await getProfilesWithAuthData(filter);
    }

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

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
}

/**
 * Get single profile by ID
 */
export async function getProfile(profileId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', profileId)
      .single();

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
    const payload = {
      id: input.id,
      email: input.email,
      phone: input.phone,
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      full_name: input.full_name,
      image_uri: input.image_uri || input.avatar_url,
      role: input.role,
      organization_id: input.organization_id || null,
      provider_type: input.provider_type,
      bvn_verified: input.bvn_verified || false,
      address: input.address,
      gender: input.gender,
      date_of_birth: input.date_of_birth,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove undefined keys
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
}

/**
 * Update profile
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
    allowedFields.forEach(field => {
      if (input[field] !== undefined) {
        if (field === 'avatar_url' && !payload.image_uri) {
          payload.image_uri = input[field];
        } else {
          payload[field] = input[field];
        }
      }
    });

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;

    return data;
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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('email', email)
      .single();

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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('provider_type', providerType)
      .eq('role', 'provider')
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        bvn_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;

    return data;
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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        image_uri: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;

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
