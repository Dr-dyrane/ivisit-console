import { supabase } from '../../lib/supabase';
import { withAudit } from '../supabaseHelpers';

export async function acceptEmergencyRequest(
  requestId,
  ambulanceId,
  responderId,
  responderName,
  responderPhone
) {
  try {
    void responderId;
    return await withAudit('emergency.dispatch', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_dispatch_emergency', {
        p_request_id: requestId,
        p_ambulance_id: ambulanceId,
        p_responder_name: responderName || null,
        p_responder_phone: responderPhone || null,
      });

      if (error) throw error;
      if (!rpcResult?.success || !rpcResult?.request) {
        throw new Error(rpcResult?.error || 'Emergency dispatch failed');
      }

      return rpcResult.request;
    }, { request_id: requestId, ambulance_id: ambulanceId });
  } catch (error) {
    console.error(`Error accepting emergency request ${requestId}:`, error);
    throw error;
  }
}

export async function completeEmergencyRequest(requestId) {
  try {
    return await withAudit('emergency.complete', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_complete_emergency', {
        p_request_id: requestId,
      });
      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Emergency completion failed');
      }
      return rpcResult.request || null;
    }, { request_id: requestId });
  } catch (error) {
    console.error(`Error completing emergency request ${requestId}:`, error);
    throw error;
  }
}

export async function cancelEmergencyRequest(requestId, reason) {
  try {
    return await withAudit('emergency.cancel', 'emergency_requests', async () => {
      const { data: rpcResult, error } = await supabase.rpc('console_cancel_emergency', {
        p_request_id: requestId,
        p_reason: reason || null,
      });
      if (error) throw error;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Emergency cancellation failed');
      }
      return rpcResult.request || null;
    }, { request_id: requestId, reason: reason || null });
  } catch (error) {
    console.error(`Error cancelling emergency request ${requestId}:`, error);
    throw error;
  }
}
