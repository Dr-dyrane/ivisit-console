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

const getActorHospitalIds = (actor) => new Set(
  Array.isArray(actor?.hospital_ids) ? actor.hospital_ids.filter(Boolean) : []
);

const assertDispatchRequestScope = (actor, emergencyDetails) => {
  if (actor?.role === 'admin') return;
  if (!['org_admin', 'dispatcher'].includes(actor?.role)) {
    throw new Error('This role cannot dispatch emergency requests.');
  }
  const hospitalIds = getActorHospitalIds(actor);
  const ownsFacility = Boolean(
    emergencyDetails?.hospital_id && hospitalIds.has(emergencyDetails.hospital_id)
  );
  const ownsDispatch = Boolean(
    actor?.organization_id
    && emergencyDetails?.dispatch_organization_id === actor.organization_id
  );
  if (!ownsFacility && !ownsDispatch) {
    throw new Error('This request is outside your dispatch organization.');
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
  if (code === 'AMBULANCE_NOT_READY' || code === 'RESPONDER_NOT_READY') {
    return 'No staffed ambulance with fresh location is ready for this request.';
  }
  if (code === 'PAYMENT_NOT_CONFIRMED') {
    return 'Payment must be confirmed before a responder offer can be sent.';
  }
  if (code === 'RESPONDER_PREVIOUSLY_RELEASED') {
    return 'That responder has already been released from this request.';
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
  /^This request is outside your dispatch organization\.$/,
  /^No eligible ambulance/,
  /^No staffed ambulance/,
  /^Payment must be confirmed/,
  /^That responder has already been released/,
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
    let assignment = null;
    if (isBedFlow) {
      const { data: updateResult, error } = await supabase.rpc('console_accept_bed_emergency', {
        p_request_id: emergencyId,
        p_hospital_id: targetHospital?.id || null,
        p_bed_number: emergencyDetails?.bed_number || null,
      });
      if (error) throw error;
      if (!updateResult?.success || !updateResult?.request) {
        throw new Error(getDispatchErrorMessage(updateResult, 'The bed request could not be accepted.'));
      }
      dispatchedEmergency = updateResult.request;
    } else {
      assignedAmbulance = await findNearestAvailableAmbulance(
        emergencyId,
        emergencyDetails,
        user
      );

      const { data: dispatchResult, error } = await supabase.rpc('console_dispatch_emergency', {
        p_request_id: emergencyId,
        p_ambulance_id: assignedAmbulance.id,
        p_hospital_id: targetHospital?.id || null,
        p_hospital_name: targetHospital?.name || null,
        p_bed_number: emergencyDetails?.bed_number || null,
      });

      if (error) throw error;
      if (!dispatchResult?.success) {
        throw new Error(getDispatchErrorMessage(dispatchResult, 'The request could not be dispatched.'));
      }
      dispatchedEmergency = dispatchResult.request || null;
      assignment = {
        id: dispatchResult.assignment_id || null,
        status: dispatchResult.assignment_status || 'offered',
        responderId: dispatchResult.responder_id || null,
        ambulanceId: dispatchResult.ambulance_id || assignedAmbulance.id,
        offerExpiresAt: dispatchResult.offer_expires_at || null,
      };
    }

    return {
      success: true,
      outcome: isBedFlow ? 'bed_accepted' : 'offer_sent',
      awaitingResponder: !isBedFlow && assignment?.status === 'offered',
      emergency: dispatchedEmergency,
      assignment,
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

async function findNearestAvailableAmbulance(emergencyId, emergencyDetails, actor) {
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

    const { data: readiness, error: readinessError } = await supabase.rpc(
      'get_ambulance_dispatch_readiness',
      {
        p_ambulance_id: ambulance.id,
        p_request_id: emergencyId,
      },
    );
    if (readinessError) {
      console.warn('Ambulance readiness check failed:', readinessError);
      continue;
    }
    // Type aliases are part of the server readiness contract (for example,
    // advanced/ALS and critical/CCT). Do not maintain a second client matcher.
    if (!readiness?.ready) continue;

    return {
      ...ambulance,
      dispatch_readiness: readiness,
      distance_km: Number.isFinite(Number(candidate.distance)) ? Number(candidate.distance) : null,
    };
  }

  throw new Error(`No eligible ambulance is available within ${DISPATCH_RADIUS_KM} km.`);
}

/**
 * Publish assignment-bound telemetry through the canonical responder command.
 */
export async function reportResponderTelemetry({
  ambulanceId,
  requestId = null,
  assignmentId = null,
  sequence,
  observedAt,
  location,
  heading = null,
  accuracyMeters = null,
} = {}) {
  try {
    if (!ambulanceId || !Number.isInteger(sequence) || sequence <= 0 || !observedAt || !location) {
      throw new Error('Complete responder telemetry context is required.');
    }
    if (Boolean(requestId) !== Boolean(assignmentId)) {
      throw new Error('Request and assignment must be reported together.');
    }

    const { data: commandResult, error } = await supabase.rpc('report_responder_telemetry', {
      p_payload: {
        ambulance_id: ambulanceId,
        request_id: requestId,
        assignment_id: assignmentId,
        sequence,
        observed_at: observedAt,
        location,
        heading,
        accuracy_meters: accuracyMeters,
      },
    });

    if (error) throw error;
    if (!commandResult?.success) {
      throw new Error(commandResult?.error || 'Responder location update failed');
    }

    return commandResult;
  } catch (error) {
    console.error('Failed to report responder telemetry:', error);
    throw error;
  }
}

export async function getResponderTelemetryState(requestId) {
  const { data, error } = await supabase.rpc('get_responder_telemetry_state', {
    p_request_id: requestId,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Responder telemetry is unavailable');
  return data;
}

export async function updateResponderLocation(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new Error('Responder location now requires ambulance, request, assignment, and sequence context.');
  }
  return reportResponderTelemetry(context);
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
    const serviceType = normalizeType(emergencyDetails?.service_type);
    if (serviceType === 'ambulance' && user.role !== 'provider') {
      throw new Error('The assigned responder must complete an ambulance request.');
    }
    if (
      serviceType === 'ambulance'
      && (!emergencyDetails?.responder_id || emergencyDetails.responder_id !== user.id)
    ) {
      throw new Error('Only the assigned responder can complete this request.');
    }

    const receiver = serviceType === 'ambulance'
      ? 'responder_complete_emergency'
      : 'console_complete_emergency';
    const { data, error } = await supabase.rpc(receiver, {
      p_request_id: emergencyId
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Emergency completion failed');

    return { success: true, emergency: data?.request || null };
  } catch (error) {
    console.error('Failed to complete emergency:', error);
    const message = String(error?.message || '');
    if (/^This request changed state/.test(message)) throw error;
    if (/^The assigned responder/.test(message)) throw error;
    if (/^Only the assigned responder/.test(message)) throw error;
    throw new Error('Request completion is temporarily unavailable.');
  }
}
