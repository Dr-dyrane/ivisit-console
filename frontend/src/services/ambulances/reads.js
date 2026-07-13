import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { applyAmbulanceOrgAdminScope } from './scope';

/**
 * Get all ambulances with optional filters.
 * Admin users can see all ambulances, others see only available or assigned units.
 */
export async function getAmbulances(filter = {}) {
  try {
    const user = await getCurrentUser();

    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (user?.role === 'provider' && user?.provider_type === 'driver') {
        query = query.eq('profile_id', user.id);
      } else if (user?.role === 'org_admin' && user?.organization_id) {
        query = applyAmbulanceOrgAdminScope(query, user);
      } else {
        query = applyAuthFilter(query, user, {
          userIdField: 'profile_id',
          orgIdField: 'hospital_id',
          resourceType: 'ambulance'
        });
      }

      if (filter?.hospital_id) {
        query = query.eq('hospital_id', filter.hospital_id);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.type) {
        query = query.eq('type', filter.type);
      }

      query = query.order('created_at', { ascending: false });

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

    return data || [];
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching ambulances:', error);
    }
    throw error;
  }
}

export async function getAmbulance(ambulanceId) {
  try {
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(ambulanceId)) {
        query = query.eq('id', ambulanceId);
      } else {
        query = query.eq('display_id', ambulanceId);
      }

      const result = await query.maybeSingle();
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

export async function getDriverAmbulance(driverId) {
  try {
    if (!isValidUUID(driverId)) return null;

    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('profile_id', driverId)
        .maybeSingle();

      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error(`Error getting driver's ambulance ${driverId}:`, error);
    throw error;
  }
}

export async function getAvailableAmbulances() {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: true });

      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching available ambulances:', error);
    throw error;
  }
}

export async function getHospitalAmbulances(hospitalId) {
  try {
    if (!isValidUUID(hospitalId)) return [];

    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching ambulances for hospital ${hospitalId}:`, error);
    throw error;
  }
}
