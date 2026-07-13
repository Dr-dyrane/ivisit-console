import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { PROFILE_TABLE_NAME } from './constants';
import { normalizeAuthProfile } from './normalization';

async function getProfilesWithAuthData(filter) {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase.rpc('get_all_auth_users', {
        p_organization_id: filter?.organization_id || null,
      });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    let profiles = (data || []).map(normalizeAuthProfile);

    if (filter?.role) {
      const roles = Array.isArray(filter.role) ? filter.role : [filter.role];
      if (roles.length > 0) profiles = profiles.filter((profile) => roles.includes(profile.role));
    }
    if (filter?.provider_type) {
      const types = Array.isArray(filter.provider_type) ? filter.provider_type : [filter.provider_type];
      if (types.length > 0) {
        profiles = profiles.filter((profile) => types.includes(profile.provider_type));
      }
    }
    if (filter?.verified !== undefined) {
      profiles = profiles.filter((profile) => profile.bvn_verified === filter.verified);
    }

    if (filter?.offset || filter?.limit) {
      const start = filter?.offset || 0;
      const end = start + (filter?.limit || 10);
      profiles = profiles.slice(start, end);
    }

    if (profiles.length > 0) {
      const { getDisplayIds } = await import('../displayIdService');
      const profileIds = profiles.map((profile) => profile.id);
      const displayIds = await getDisplayIds(profileIds, { quiet: filter?.quiet });

      profiles = profiles.map((profile) => ({
        ...profile,
        display_id: displayIds.get(profile.id) || null,
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

export async function getUserStatistics(options = {}) {
  try {
    const user = await getCurrentUser();
    if (user?.role === 'patient') {
      return { totalUsers: 0, totalProfiles: 0, recentSignups: 0, roleDistribution: {} };
    }

    const { data, error } = await withRetry(async () => {
      const result = await supabase.rpc('get_user_statistics');
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return data && data.length > 0
      ? {
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
            dispatcher: data[0].dispatcher_count,
          },
        }
      : {};
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching user statistics:', error);
    }
    throw error;
  }
}

export async function searchUsers(searchTerm) {
  try {
    const user = await getCurrentUser();
    if (user?.role === 'patient') return [];

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

export async function getProfiles(filter = {}) {
  try {
    const user = await getCurrentUser();
    const isAdminRole =
      user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'dispatcher';

    if (isAdminRole && filter?.includeAuthData) {
      const scopingId =
        user.role === 'admin'
          ? filter.organization_id
          : user.organization_id || filter.organization_id;
      return await getProfilesWithAuthData({ ...filter, organization_id: scopingId });
    }

    const { data, error } = await withRetry(async () => {
      let query = supabase.from(PROFILE_TABLE_NAME).select('*');

      query = applyAuthFilter(query, user, {
        userIdField: 'id',
        orgIdField: 'organization_id',
      });

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

      if (filter?.limit) query = query.limit(filter.limit);
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const { getDisplayIds } = await import('../displayIdService');
      const profileIds = enrichedData.map((profile) => profile.id);
      const displayIds = await getDisplayIds(profileIds, { quiet: filter?.quiet });

      enrichedData = enrichedData.map((profile) => ({
        ...profile,
        display_id:
          profile.display_id ||
          (displayIds.get ? displayIds.get(profile.id) : displayIds[profile.id]) ||
          null,
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

export async function getProfile(profileId) {
  try {
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(PROFILE_TABLE_NAME).select('*');

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

export async function getProfileByEmail(email) {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(PROFILE_TABLE_NAME)
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

export async function getProfilesByRole(role) {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(PROFILE_TABLE_NAME)
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

export async function getProvidersByType(providerType) {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(PROFILE_TABLE_NAME)
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
