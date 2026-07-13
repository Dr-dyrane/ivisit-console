import { supabase } from '../../lib/supabase';
import { withAudit } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';

export async function assignDriverToAmbulance(ambulanceId, driverId) {
  try {
    return await withAudit('ambulance.assign_driver', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          profile_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ambulanceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { ambulance_id: ambulanceId, driver_id: driverId || null });
  } catch (error) {
    console.error(`Error assigning driver to ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

export async function updateAmbulanceLocation(ambulanceId, location) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        location,
        updated_at: new Date().toISOString()
      })
      .eq('id', ambulanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating ambulance location ${ambulanceId}:`, error);
    throw error;
  }
}

export async function updateAmbulanceStatus(ambulanceId, status) {
  try {
    return await withAudit('ambulance.update_status', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ambulanceId)
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { ambulance_id: ambulanceId, status: status || null });
  } catch (error) {
    console.error(`Error updating ambulance status ${ambulanceId}:`, error);
    throw error;
  }
}
