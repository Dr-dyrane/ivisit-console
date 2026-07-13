import { supabase } from '../../lib/supabase';
import { withAudit } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { buildHospitalPayload } from './payload';

export async function createHospital(input) {
  try {
    const payload = buildHospitalPayload(input, { isCreate: true });

    return await withAudit('hospital.create', 'hospital', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { fields: Object.keys(payload) });
  } catch (error) {
    console.error('Error creating hospital:', error);
    throw error;
  }
}

export async function updateHospital(hospitalId, input) {
  try {
    const payload = buildHospitalPayload(input, { isCreate: false });

    return await withAudit('hospital.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload
      });

      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Facility update was not confirmed');
      }

      const { data, error: readError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle();

      if (readError) throw readError;
      if (!data) throw new Error('Facility no longer exists');
      return data;
    }, { hospital_id: hospitalId });
  } catch (error) {
    console.error(`Error updating hospital ${hospitalId}:`, error);
    throw error;
  }
}

export async function deleteHospital(hospitalId) {
  try {
    return await withAudit('hospital.delete', 'hospital', async () => {
      const { data, error } = await supabase.rpc('delete_hospital_by_admin', {
        target_hospital_id: hospitalId
      });
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Hospital deletion failed');
      }
      return data || null;
    }, { hospital_id: hospitalId });
  } catch (error) {
    console.error(`Error deleting hospital ${hospitalId}:`, error);
    throw error;
  }
}

export async function updateHospitalBedCount(hospitalId, availableBeds) {
  try {
    const payload = { available_beds: availableBeds };
    return await withAudit('hospital.bed_count.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload,
      });

      if (error) throw error;
      if (rpcResult && rpcResult.success === false) {
        throw new Error(rpcResult.error || 'Hospital bed count update failed');
      }

      const { data, error: readError } = await supabase
        .from(TABLE_NAME)
        .select()
        .eq('id', hospitalId)
        .maybeSingle();

      if (readError) throw readError;
      return data;
    }, { hospital_id: hospitalId });
  } catch (error) {
    console.error(`Error updating hospital bed count ${hospitalId}:`, error);
    throw error;
  }
}

export async function updateHospitalStatus(hospitalId, status) {
  try {
    const payload = { status: status };
    return await withAudit('hospital.status.update', 'hospital', async () => {
      const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
        target_hospital_id: hospitalId,
        payload,
      });

      if (error) throw error;
      if (rpcResult && rpcResult.success === false) {
        throw new Error(rpcResult.error || 'Hospital status update failed');
      }

      const { data, error: readError } = await supabase
        .from(TABLE_NAME)
        .select()
        .eq('id', hospitalId)
        .maybeSingle();

      if (readError) throw readError;
      return data;
    }, { hospital_id: hospitalId });
  } catch (error) {
    console.error(`Error updating hospital status ${hospitalId}:`, error);
    throw error;
  }
}
