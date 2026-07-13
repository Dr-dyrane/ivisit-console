import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { withAudit } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { assertAmbulanceWriteScope } from './scope';

export async function createAmbulance(input) {
  try {
    const actor = await getCurrentUser();
    const scopedInput = actor?.role === 'org_admin' && !input.organization_id
      ? { ...input, organization_id: actor.organization_id }
      : input;
    assertAmbulanceWriteScope(scopedInput, actor);

    const payload = {};

    if (scopedInput.id) payload.id = scopedInput.id;

    if (scopedInput.type) payload.type = scopedInput.type;
    if (scopedInput.call_sign) payload.call_sign = scopedInput.call_sign;
    payload.status = scopedInput.status || 'available';

    if (scopedInput.location) payload.location = scopedInput.location;
    if (scopedInput.eta) payload.eta = scopedInput.eta;
    if (scopedInput.crew) payload.crew = scopedInput.crew;
    if (scopedInput.hospital_id && scopedInput.hospital_id !== '') payload.hospital_id = scopedInput.hospital_id;
    if (scopedInput.organization_id && scopedInput.organization_id !== '') payload.organization_id = scopedInput.organization_id;
    if (scopedInput.vehicle_number) payload.vehicle_number = scopedInput.vehicle_number;
    if (scopedInput.license_plate) payload.license_plate = scopedInput.license_plate;
    if (scopedInput.base_price != null) payload.base_price = scopedInput.base_price;
    if (scopedInput.current_call) payload.current_call = scopedInput.current_call;
    if (scopedInput.profile_id) payload.profile_id = scopedInput.profile_id;
    if (scopedInput.driver_id) payload.profile_id = scopedInput.driver_id;

    payload.created_at = new Date().toISOString();
    payload.updated_at = new Date().toISOString();

    return await withAudit('ambulance.create', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { type: payload.type || null, hospital_id: payload.hospital_id || null });
  } catch (error) {
    console.error('Error creating ambulance:', error);
    throw error;
  }
}

export async function updateAmbulance(ambulanceId, input) {
  try {
    const actor = await getCurrentUser();
    assertAmbulanceWriteScope(input, actor);

    // Status is intentionally excluded: trip/dispatch workflows own that field.
    const VALID_COLUMNS = [
      'call_sign', 'type', 'vehicle_number',
      'hospital_id', 'location', 'eta', 'crew',
      'current_call', 'profile_id', 'organization_id',
      'base_price', 'license_plate'
    ];

    const payload = {};
    for (const key of VALID_COLUMNS) {
      if (key in input) {
        if (['hospital_id', 'profile_id', 'organization_id'].includes(key)) {
          payload[key] = input[key] === '' ? null : input[key];
        } else {
          payload[key] = input[key];
        }
      }
    }
    if ('driver_id' in input && !('profile_id' in payload)) {
      payload.profile_id = input.driver_id === '' ? null : input.driver_id;
    }

    payload.updated_at = new Date().toISOString();

    return await withAudit('ambulance.update', 'ambulance', async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', ambulanceId)
        .select()
        .single();

      if (error) throw error;

      return data;
    }, { ambulance_id: ambulanceId, fields: Object.keys(payload) });
  } catch (error) {
    console.error(`Error updating ambulance ${ambulanceId}:`, error);
    throw error;
  }
}

export async function deleteAmbulance(ambulanceId) {
  try {
    await withAudit('ambulance.delete', 'ambulance', async () => {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', ambulanceId);

      if (error) throw error;
      return { id: ambulanceId };
    }, { ambulance_id: ambulanceId });
  } catch (error) {
    console.error(`Error deleting ambulance ${ambulanceId}:`, error);
    throw error;
  }
}
