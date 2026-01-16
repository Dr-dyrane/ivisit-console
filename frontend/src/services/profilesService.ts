/**
 * Profiles Service
 * Handles all Supabase queries for profiles table
 * User accounts, authentication, and role management
 */

import { supabase } from '../lib/supabase';
import { Profile } from '../types/index';

const TABLE_NAME = 'profiles';

export interface ProfileFilter {
  role?: string;
  provider_type?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateProfileInput {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  image_uri?: string;
  role: string;
  provider_type?: string;
  bvn_verified?: boolean;
}

export interface UpdateProfileInput {
  email?: string;
  phone?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  image_uri?: string;
  role?: string;
  provider_type?: string;
  bvn_verified?: boolean;
}

/**
 * Get all profiles with optional filters
 */
export async function getProfiles(filter?: ProfileFilter): Promise<Profile[]> {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.role) {
      query = query.eq('role', filter.role);
    }
    if (filter?.provider_type) {
      query = query.eq('provider_type', filter.provider_type);
    }
    if (filter?.verified !== undefined) {
      query = query.eq('bvn_verified', filter.verified);
    }

    query = query.order('created_at', { ascending: false });

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
export async function getProfile(profileId: string): Promise<Profile | null> {
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
export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  try {
    const payload = {
      id: input.id,
      email: input.email,
      phone: input.phone,
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      full_name: input.full_name,
      image_uri: input.image_uri,
      role: input.role,
      provider_type: input.provider_type,
      bvn_verified: input.bvn_verified || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
export async function updateProfile(
  profileId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

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
export async function getProfileByEmail(email: string): Promise<Profile | null> {
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
export async function getProfilesByRole(role: string): Promise<Profile[]> {
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
export async function getProvidersByType(providerType: string): Promise<Profile[]> {
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
export async function verifyProfileBVN(profileId: string): Promise<Profile> {
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
export async function updateProfileAvatar(profileId: string, avatarUrl: string): Promise<Profile> {
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
export function subscribeToProfile(
  profileId: string,
  callback: (profile: Profile) => void
) {
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
          callback(payload.new as Profile);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
