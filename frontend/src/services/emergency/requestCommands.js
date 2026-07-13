import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { logEmergencyActivity } from '../activityService';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { getEmergencyRequest } from './detailProjection';
import { EMERGENCY_CREATE_FACILITY_LIMIT } from './constants';
import {
  buildConsoleCreatePayload,
  buildConsoleUpdatePayload,
  buildLegacyEmergencyPayload,
  calculateResponseTime,
  normalizeConsoleServiceType,
  parsePointInput,
} from './payloadNormalization';

async function requireScopedCreateFacility(input, user) {
  if (user?.role !== 'org_admin') return input;
  if (!user?.organization_id || !input?.hospital_id) {
    throw new Error('Select a facility in your organization before creating this request.');
  }

  const { data, error } = await supabase
    .from('hospitals')
    .select('id,name,organization_id')
    .eq('id', input.hospital_id)
    .eq('organization_id', user.organization_id)
    .maybeSingle();

  if (error) {
    console.error('Emergency create facility scope check failed:', error);
    throw new Error('Facility scope could not be verified. Try again.');
  }
  if (!data) {
    throw new Error('Select a facility in your organization before creating this request.');
  }

  return {
    ...input,
    hospital_id: data.id,
    hospital_name: data.name,
  };
}

export async function getEmergencyCreateFacilityOptions() {
  const user = await getCurrentUser();
  if (!user || !['admin', 'org_admin'].includes(user.role)) {
    return { data: [], isPartial: false };
  }
  if (user.role === 'org_admin' && !user.organization_id) {
    throw new Error('Facility scope is unavailable for this account.');
  }

  let query = supabase
    .from('hospitals')
    .select('id,name,organization_id', { count: 'exact' })
    .order('name', { ascending: true })
    .limit(EMERGENCY_CREATE_FACILITY_LIMIT);

  if (user.role === 'org_admin') {
    query = query.eq('organization_id', user.organization_id);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Emergency create facility options failed:', error);
    throw new Error('Facilities could not be loaded. Try again.');
  }

  const rows = data || [];
  return {
    data: rows,
    isPartial: Number.isFinite(count) && count > rows.length,
  };
}

export async function createEmergencyRequest(input) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Authentication required');
    const scopedInput = await requireScopedCreateFacility(input, user);
    const createInput = {
      ...scopedInput,
      service_type: normalizeConsoleServiceType(scopedInput?.service_type),
    };
    const normalizedPatientLocation =
      parsePointInput(createInput.patient_location) ||
      parsePointInput(createInput.pickup_location);

    const canUseAtomicRpc = Boolean(
      createInput?.user_id &&
      createInput?.hospital_id &&
      createInput?.service_type &&
      normalizedPatientLocation
    );

    let data;

    if (canUseAtomicRpc) {
      const requestData = {
        hospital_id: createInput.hospital_id,
        hospital_name: createInput.hospital_name,
        service_type: createInput.service_type,
        specialty: createInput.specialty,
        ambulance_type: createInput.ambulance_type,
        patient_snapshot: createInput.patient_snapshot || {},
        patient_location: normalizedPatientLocation
      };

      const paymentMethod = createInput.payment_method || createInput.payment_method_id || null;
      const paymentData = paymentMethod ? {
        method: paymentMethod,
        method_id: createInput.payment_method_id || null,
        total_amount: createInput.total_cost ?? createInput.amount ?? 0,
        fee_amount: createInput.ivisit_fee_amount ?? null,
        currency: createInput.currency || 'USD'
      } : null;

      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_emergency_v4', {
        p_user_id: createInput.user_id,
        p_request_data: requestData,
        p_payment_data: paymentData
      });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success || !rpcResult?.request_id) {
        throw new Error(rpcResult?.error || 'Emergency creation RPC returned an invalid result');
      }

      data = await getEmergencyRequest(rpcResult.request_id);
      if (!data) {
        throw new Error('Emergency created but could not be reloaded');
      }
    } else {
      const payload = buildLegacyEmergencyPayload(createInput);
      const fallbackPayload = buildConsoleCreatePayload(createInput, payload);

      const { data: rpcResult, error: rpcError } = await supabase.rpc('console_create_emergency_request', {
        p_payload: fallbackPayload,
      });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success || !rpcResult?.request) {
        throw new Error(rpcResult?.error || 'Console emergency creation failed');
      }

      data = rpcResult.request;
    }

    try {
      await logEmergencyActivity.created(
        data.id,
        `New emergency request from ${createInput.pickup_location?.address || createInput.patient_snapshot?.location_text || 'Unknown location'}`,
        {
          service_type: createInput.service_type,
          specialty: createInput.specialty,
          location: createInput.pickup_location?.address || createInput.patient_snapshot?.location_text,
          priority: createInput.priority || createInput.patient_snapshot?.priority || 'medium'
        }
      );
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
    }

    return data;
  } catch (error) {
    console.error('Error creating emergency request:', error);
    throw error;
  }
}

export async function updateEmergencyRequest(requestId, input) {
  try {
    const normalizedStatus = input?.status !== undefined
      ? canonicalizeEmergencyStatus(input.status, null)
      : undefined;
    const payload = buildConsoleUpdatePayload(input, normalizedStatus);

    const { data: rpcResult, error } = await supabase.rpc('console_update_emergency_request', {
      p_request_id: requestId,
      p_payload: payload,
    });
    if (error) throw error;
    if (!rpcResult?.success || !rpcResult?.request) {
      throw new Error(rpcResult?.error || 'Emergency update failed');
    }
    const data = rpcResult.request;

    if (normalizedStatus === 'completed') {
      try {
        await logEmergencyActivity.completed(
          requestId,
          `Emergency response completed - ${data.destination_location?.address || 'Location'}`,
          {
            location: data.destination_location?.address,
            response_time: calculateResponseTime(data.created_at),
            service_type: data.service_type
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    } else if (normalizedStatus) {
      try {
        await logEmergencyActivity.updated(
          requestId,
          `Emergency request updated to ${normalizedStatus}`,
          {
            old_status: data.status,
            new_status: normalizedStatus,
            location: data.pickup_location?.address
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    }

    return data;
  } catch (error) {
    console.error(`Error updating emergency request ${requestId}:`, error);
    throw error;
  }
}
