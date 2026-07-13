import { supabase } from '../../lib/supabase';
import { withRetry } from '../supabaseHelpers';

export async function getDrivers() {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('provider_type', 'driver')
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
}

export async function getAvailableDrivers() {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('provider_type', 'driver')
        .is('assigned_ambulance_id', null)
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    throw error;
  }
}
