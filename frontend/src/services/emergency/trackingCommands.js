import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export async function updateResponderLocation(requestId, location, heading) {
  try {
    const { data: rpcResult, error } = await supabase.rpc('console_update_responder_location', {
      p_request_id: requestId,
      p_location: location,
      p_heading: heading ?? null,
    });
    if (error) throw error;
    if (!rpcResult?.success) {
      throw new Error(rpcResult?.error || 'Responder location update failed');
    }

    const { data: updatedRequest, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!updatedRequest) {
      throw new Error('Responder location updated but the request could not be reloaded');
    }

    return updatedRequest;
  } catch (error) {
    console.error(`Error updating responder location for ${requestId}:`, error);
    throw error;
  }
}

export async function updatePatientLocation(requestId, location, heading) {
  try {
    void heading;
    const { data: rpcResult, error } = await supabase.rpc('console_update_emergency_request', {
      p_request_id: requestId,
      p_payload: {
        patient_location: location,
      },
    });
    if (error) throw error;
    if (!rpcResult?.success || !rpcResult?.request) {
      throw new Error(rpcResult?.error || 'Patient location update failed');
    }
    return rpcResult.request;
  } catch (error) {
    console.error(`Error updating patient location for ${requestId}:`, error);
    throw error;
  }
}
