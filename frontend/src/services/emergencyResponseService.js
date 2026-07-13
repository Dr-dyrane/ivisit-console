/**
 * Emergency Response Service
 * Handles scoped dispatch and response coordination
 * Bridges app requests with console response actions
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { getAmbulance } from './ambulancesService';
import { getEmergencyActionState } from '../utils/emergencyActions';
import { extractCoordinatePair } from '../utils/emergencyRequestMapper';

const DISPATCH_RADIUS_KM = 50;
const DISPATCH_CANDIDATE_LIMIT = 50;

const normalizeType = (value) => String(value || '').trim().toLowerCase();

const matchesRequiredType = (ambulance, requiredType) => {
  const requested = normalizeType(requiredType);
  if (!requested || requested === 'any' || requested === 'standard') return true;

  return [ambulance?.type, ambulance?.call_sign]
    .map(normalizeType)
    .some((value) => value && (value === requested || value.includes(requested)));
};

const getActorHospitalIds = (actor) => new Set(
  Array.isArray(actor?.hospital_ids) ? actor.hospital_ids.filter(Boolean) : []
);

const assertDispatchRequestScope = (actor, emergencyDetails) => {
  if (actor?.role === 'admin') return;
  if (!['org_admin', 'dispatcher'].includes(actor?.role)) {
    throw new Error('This role cannot dispatch emergency requests.');
  }
  const hospitalIds = getActorHospitalIds(actor);
  if (!emergencyDetails?.hospital_id || !hospitalIds.has(emergencyDetails.hospital_id)) {
    throw new Error('Assign a facility in your organization before dispatching this request.');
  }
};

const ambulanceIsWithinActorScope = (ambulance, actor) => {
  if (actor?.role === 'admin') return true;
  if (!['org_admin', 'dispatcher'].includes(actor?.role) || !actor?.organization_id) return false;

  const hospitalIds = getActorHospitalIds(actor);
  if (ambulance?.organization_id) {
    return ambulance.organization_id === actor.organization_id;
  }
  return Boolean(ambulance?.hospital_id && hospitalIds.has(ambulance.hospital_id));
};

const getDispatchErrorMessage = (result, fallback) => {
  const code = String(result?.code || '').toUpperCase();
  if (code === 'NO_AMBULANCE_AVAILABLE' || code === 'AMBULANCE_UNAVAILABLE') {
    return 'No eligible ambulance is currently available.';
  }
  if (code === 'REQUEST_TERMINAL' || code === 'INVALID_TRANSITION') {
    return 'This request changed state and is no longer ready for that action.';
  }
  return fallback;
};

const DISPATCH_PUBLIC_MESSAGES = [
  /^Authentication required$/,
  /^This role cannot dispatch/,
  /^This request changed state/,
  /^Assign a facility/,
  /^No eligible ambulance/,
  /^A valid request location/,
  /^Ambulance matching is temporarily unavailable\.$/,
  /^The request could not be dispatched\.$/,
  /^The bed request could not be accepted\.$/,
];

const getPublicDispatchError = (error) => {
  const message = String(error?.message || '');
  return DISPATCH_PUBLIC_MESSAGES.some((pattern) => pattern.test(message))
    ? error
    : new Error('Request dispatch is temporarily unavailable.');
};

/**
 * Dispatch through the canonical receiver after selecting the nearest
 * RLS-visible available ambulance. Client-generated ETA, hospital, doctor, and
 * bed assignments are never presented as backend truth.
 */
export async function dispatchEmergency(emergencyId, emergencyDetails) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Authentication required');
    const actionState = getEmergencyActionState(emergencyDetails);
    if (!actionState.canDispatch) {
      throw new Error('This request changed state and is not ready to dispatch.');
    }

    const serviceType = String(
      emergencyDetails?.service_type ||
      emergencyDetails?.serviceType ||
      emergencyDetails?.emergency_type ||
      'ambulance'
    ).toLowerCase();
    const isBedFlow = serviceType === 'bed';
    const targetHospital = emergencyDetails?.hospital_id
      ? {
          id: emergencyDetails.hospital_id,
          name: emergencyDetails.hospital_name || null,
        }
      : null;

    assertDispatchRequestScope(user, emergencyDetails);

    if (isBedFlow && !targetHospital?.id) {
      throw new Error('Assign a facility before accepting this bed request.');
    }

    // Dispatch through the canonical RPC boundary.
    let dispatchedEmergency = null;
    let assignedAmbulance = null;
    if (isBedFlow) {
      const { data: updateResult, error } = await supabase.rpc('console_update_emergency_request', {
        p_request_id: emergencyId,
        p_payload: {
          status: 'accepted',
          hospital_id: targetHospital?.id || null,
          hospital_name: targetHospital?.name || null,
          bed_number: emergencyDetails?.bed_number || null,
        },
      });
      if (error) throw error;
      if (!updateResult?.success || !updateResult?.request) {
        throw new Error(getDispatchErrorMessage(updateResult, 'The bed request could not be accepted.'));
      }
      dispatchedEmergency = updateResult.request;
    } else {
      assignedAmbulance = await findNearestAvailableAmbulance(
        emergencyDetails,
        emergencyDetails?.ambulance_type,
        user
      );

      const { data: dispatchResult, error } = await supabase.rpc('console_dispatch_emergency', {
        p_request_id: emergencyId,
        p_ambulance_id: assignedAmbulance.id,
        p_hospital_id: targetHospital?.id || null,
        p_hospital_name: targetHospital?.name || null,
        p_bed_number: emergencyDetails?.bed_number || null,
        p_responder_name: assignedAmbulance?.crew?.[0]?.name || null,
        p_responder_phone: assignedAmbulance?.phone || null,
        p_responder_vehicle_type: assignedAmbulance?.type || null,
        p_responder_vehicle_plate: assignedAmbulance?.vehicle_number || null,
      });

      if (error) throw error;
      if (!dispatchResult?.success) {
        throw new Error(getDispatchErrorMessage(dispatchResult, 'The request could not be dispatched.'));
      }
      dispatchedEmergency = dispatchResult.request || null;
    }

    return {
      success: true,
      emergency: dispatchedEmergency,
      assignments: {
        ambulance: assignedAmbulance,
        hospital: targetHospital,
        doctor: null,
        bed: emergencyDetails?.bed_number
          ? { bedNumber: emergencyDetails.bed_number, hospitalId: targetHospital?.id || null }
          : null,
      }
    };

  } catch (error) {
    console.error('Emergency dispatch failed:', error);
    throw getPublicDispatchError(error);
  }
}

async function findNearestAvailableAmbulance(emergencyDetails, requiredType, actor) {
  const coordinates = extractCoordinatePair(
    emergencyDetails?.patient_location,
    emergencyDetails?.pickup_location,
    emergencyDetails?.location
  );
  if (!coordinates) {
    throw new Error('A valid request location is required before automatic dispatch.');
  }

  const { data, error } = await supabase.rpc('nearby_ambulances', {
    user_lat: coordinates.lat,
    user_lng: coordinates.lng,
    radius_km: DISPATCH_RADIUS_KM,
  });
  if (error) {
    console.error('Nearest ambulance lookup failed:', error);
    throw new Error('Ambulance matching is temporarily unavailable.');
  }

  const nearbyCandidates = (data || []).slice(0, DISPATCH_CANDIDATE_LIMIT);
  for (const candidate of nearbyCandidates) {
    const ambulance = await getAmbulance(candidate.id);
    if (!ambulance || normalizeType(ambulance.status) !== 'available') continue;
    if (!ambulanceIsWithinActorScope(ambulance, actor)) continue;
    if (!matchesRequiredType(ambulance, requiredType)) continue;

    return {
      ...ambulance,
      distance_km: Number.isFinite(Number(candidate.distance)) ? Number(candidate.distance) : null,
    };
  }

  throw new Error(`No eligible ambulance is available within ${DISPATCH_RADIUS_KM} km.`);
}

/**
 * Update responder location in real-time
 */
export async function updateResponderLocation(emergencyId, location, heading) {
  try {
    const { data: commandResult, error } = await supabase.rpc('console_update_responder_location', {
      p_request_id: emergencyId,
      p_location: location,
      p_heading: heading ?? null
    });

    if (error) throw error;
    if (!commandResult?.success) {
      throw new Error(commandResult?.error || 'Responder location update failed');
    }

    try {
      const { data: emergency, error: emergencyError } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', emergencyId)
        .single();
      if (emergencyError) throw emergencyError;

      return {
        success: true,
        commandResult,
        emergency,
        projectionState: 'loaded',
      };
    } catch (projectionError) {
      console.warn('Responder location updated, but its projection could not be reloaded:', projectionError);
      return {
        success: true,
        commandResult,
        emergency: null,
        projectionState: 'unavailable',
      };
    }
  } catch (error) {
    console.error('Failed to update responder location:', error);
    throw error;
  }
}

/**
 * Complete emergency response
 */
export async function completeEmergency(emergencyId, emergencyDetails = null) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Authentication required');
    if (emergencyDetails && !getEmergencyActionState(emergencyDetails).canComplete) {
      throw new Error('This request changed state and is not ready to complete.');
    }
    if (
      user.role === 'provider' &&
      (!emergencyDetails?.responder_id || emergencyDetails.responder_id !== user.id)
    ) {
      throw new Error('Only the assigned responder can complete this request.');
    }

    const { data, error } = await supabase.rpc('console_complete_emergency', {
      p_request_id: emergencyId
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Emergency completion failed');

    return { success: true, emergency: data?.request || null };
  } catch (error) {
    console.error('Failed to complete emergency:', error);
    const message = String(error?.message || '');
    if (/^This request changed state/.test(message)) throw error;
    if (/^Only the assigned responder/.test(message)) throw error;
    throw new Error('Request completion is temporarily unavailable.');
  }
}
