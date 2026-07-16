import { supabase } from '../../lib/supabase';
import { getVisitByRequestId } from '../visitsService';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { TABLE_NAME } from './constants';

export async function getEmergencyRequest(requestId) {
  try {
    return await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(requestId)) {
        query = query.eq('id', requestId);
      } else {
        query = query.eq('display_id', requestId);
      }

      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    });
  } catch (error) {
    console.error(`Error fetching emergency request ${requestId}:`, error);
    throw error;
  }
}

// ADOPT-21 read surfacing: the CURRENT assignment row behind
// emergency_requests.current_responder_assignment_id. Read-only single-row
// fetch after the request row lands; a null FK, missing row, or denied read
// resolves null so the timeline stays absent -- never fabricated.
export async function getCurrentResponderAssignment(request) {
  const assignmentId = request?.current_responder_assignment_id;
  if (!isValidUUID(assignmentId)) return null;

  const { data, error } = await supabase
    .from('emergency_responder_assignments')
    .select('id,status,offered_at,offer_expires_at,accepted_at,arrived_at,completed_at,ended_at,decline_reason')
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching responder assignment ${assignmentId}:`, error);
    return null;
  }
  return data || null;
}

export async function getLatestEmergencyPayment(requestId) {
  try {
    if (!isValidUUID(requestId)) {
      return {
        payment: null,
        visibilityState: 'not_created',
        error: null,
      };
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('emergency_request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        payment: null,
        visibilityState: 'failed',
        error,
      };
    }

    return {
      payment: data || null,
      visibilityState: data ? 'visible' : 'not_created',
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching latest emergency payment for ${requestId}:`, error);
    return {
      payment: null,
      visibilityState: 'failed',
      error,
    };
  }
}

export async function getEmergencyDetailProjection(requestId) {
  const request = await getEmergencyRequest(requestId);

  if (!request) {
    return {
      request: null,
      latestPayment: null,
      paymentVisibilityState: 'not_created',
      visitOutcome: null,
      visitVisibilityState: 'not_applicable',
      errors: {},
    };
  }

  const normalizedStatus = canonicalizeEmergencyStatus(request.status, request.status);
  const terminal = normalizedStatus === 'completed' || normalizedStatus === 'cancelled';
  const [paymentResult, visitResult] = await Promise.allSettled([
    getLatestEmergencyPayment(request.id),
    terminal ? getVisitByRequestId(request.id) : Promise.resolve(null),
  ]);

  const paymentPayload = paymentResult.status === 'fulfilled'
    ? paymentResult.value
    : { payment: null, visibilityState: 'failed', error: paymentResult.reason };
  const visitOutcome = visitResult.status === 'fulfilled' ? visitResult.value : null;

  return {
    request,
    latestPayment: paymentPayload.payment,
    paymentVisibilityState: paymentPayload.visibilityState,
    visitOutcome,
    visitVisibilityState: terminal
      ? (visitOutcome ? 'linked' : 'missing_terminal')
      : 'not_expected_yet',
    errors: {
      payment: paymentPayload.error || null,
      visit: visitResult.status === 'rejected' ? visitResult.reason : null,
    },
  };
}

export function subscribeToEmergencyDetail(requestId, callback) {
  if (!isValidUUID(requestId)) return () => {};

  const channel = supabase
    .channel(`emergency_detail_projection_${requestId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME, filter: `id=eq.${requestId}` },
      callback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `emergency_request_id=eq.${requestId}` },
      callback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'visits', filter: `request_id=eq.${requestId}` },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
