/**
 * Emergency Response Service
 * Handles intelligent dispatch and response coordination
 * Bridges app requests with console response actions
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { getAvailableAmbulances } from './ambulancesService';
import { getHospitals, getHospital } from './hospitalsService';
import { getDoctors } from './doctorsService';

/**
 * Intelligent Emergency Dispatch
 * Automatically assigns optimal resources based on emergency details
 */
export async function dispatchEmergency(emergencyId, emergencyDetails) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Authentication required');
    const serviceType = String(
      emergencyDetails?.service_type ||
      emergencyDetails?.serviceType ||
      emergencyDetails?.emergency_type ||
      'ambulance'
    ).toLowerCase();
    const isBedFlow = serviceType === 'bed';

    // 1. Find nearest available ambulance (ambulance-only dispatch path).
    let assignedAmbulance = null;
    if (!isBedFlow) {
      const ambulances = await getAvailableAmbulances();
      assignedAmbulance = await findBestAmbulance(
        ambulances,
        emergencyDetails.pickup_location,
        emergencyDetails.ambulance_type
      );
    }

    // 2. Find suitable hospital if not assigned
    let targetHospital = null;
    if (emergencyDetails.hospital_id) {
      targetHospital = await getHospital(emergencyDetails.hospital_id);
    } else {
      targetHospital = await findBestHospital(
        emergencyDetails.pickup_location,
        emergencyDetails.specialty
      );
    }

    // 3. Find on-call doctor for critical cases
    let assignedDoctor = null;
    if (emergencyDetails.priority === 'critical' && emergencyDetails.specialty) {
      assignedDoctor = await findOnCallDoctor(
        emergencyDetails.specialty,
        targetHospital?.id
      );
    }

    // 4. Reserve bed if needed.
    let assignedBed = null;
    if (emergencyDetails.bed_type && targetHospital) {
      assignedBed = await reserveBed(
        targetHospital.id,
        emergencyDetails.bed_type
      );
    }

    if (!isBedFlow && !assignedAmbulance?.id) {
      throw new Error('No available ambulance to dispatch');
    }

    // 5. Dispatch through canonical RPC boundary.
    let dispatchedEmergency = null;
    if (isBedFlow) {
      const { data: updateResult, error } = await supabase.rpc('console_update_emergency_request', {
        p_request_id: emergencyId,
        p_payload: {
          status: 'accepted',
          hospital_id: targetHospital?.id || null,
          hospital_name: targetHospital?.name || null,
          bed_number: assignedBed?.bedNumber || null,
        },
      });
      if (error) throw error;
      if (!updateResult?.success || !updateResult?.request) {
        throw new Error(updateResult?.error || 'Bed dispatch update failed');
      }
      dispatchedEmergency = updateResult.request;
    } else {
      const { data: dispatchResult, error } = await supabase.rpc('console_dispatch_emergency', {
        p_request_id: emergencyId,
        p_ambulance_id: assignedAmbulance.id,
        p_hospital_id: targetHospital?.id || null,
        p_hospital_name: targetHospital?.name || null,
        p_bed_number: assignedBed?.bedNumber || null,
        p_responder_name: assignedAmbulance?.crew?.[0]?.name || null,
        p_responder_phone: assignedAmbulance?.phone || null,
        p_responder_vehicle_type: assignedAmbulance?.type || null,
        p_responder_vehicle_plate: assignedAmbulance?.vehicle_number || null,
      });

      if (error) throw error;
      if (!dispatchResult?.success) {
        throw new Error(dispatchResult?.error || 'Dispatch RPC failed');
      }
      dispatchedEmergency = dispatchResult.request || null;
    }

    return {
      success: true,
      emergency: dispatchedEmergency,
      assignments: {
        ambulance: assignedAmbulance,
        hospital: targetHospital,
        doctor: assignedDoctor,
        bed: assignedBed
      }
    };

  } catch (error) {
    console.error('Emergency dispatch failed:', error);
    throw error;
  }
}

/**
 * Find best ambulance based on proximity and capability
 */
async function findBestAmbulance(ambulances, pickupLocation, requiredType) {
  if (!ambulances || ambulances.length === 0) return null;

  // Simple proximity-based selection (can be enhanced with traffic data)
  return ambulances[0]; // For now, return first available
}

/**
 * Find best hospital based on specialty and availability
 */
async function findBestHospital(patientLocation, specialty) {
  const hospitals = await getHospitals({ verified: true });

  // Filter by specialty and available beds
  const suitable = hospitals.filter(h =>
    h.available_beds > 0 &&
    (!specialty || h.specialties?.includes(specialty))
  );

  return suitable[0] || null;
}

/**
 * Find on-call doctor for specialty
 */
async function findOnCallDoctor(specialty, hospitalId) {
  const doctors = await getDoctors({
    specialization: specialty,
    hospital_id: hospitalId,
    status: 'available'
  });

  return doctors[0] || null;
}

/**
 * Reserve hospital bed
 */
async function reserveBed(hospitalId, bedType) {
  const bedNumber = `B-${Math.floor(Math.random() * 900) + 100}`;

  return {
    bedNumber,
    bedType: bedType || 'standard',
    hospitalId
  };
}

/**
 * Calculate ETA between two points
 */
function calculateETA(pickupLocation, hospitalCoords) {
  // Simple calculation - can be enhanced with real traffic data
  return `${Math.floor(Math.random() * 10) + 5} mins`;
}

/**
 * Update responder location in real-time
 */
export async function updateResponderLocation(emergencyId, location, heading) {
  try {
    const { data, error } = await supabase.rpc('console_update_responder_location', {
      p_request_id: emergencyId,
      p_location: location,
      p_heading: heading ?? null
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Responder location update failed');
    return { success: true };
  } catch (error) {
    console.error('Failed to update responder location:', error);
    throw error;
  }
}

/**
 * Complete emergency response
 */
export async function completeEmergency(emergencyId) {
  try {
    const { data, error } = await supabase.rpc('console_complete_emergency', {
      p_request_id: emergencyId
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Emergency completion failed');

    return { success: true, emergency: data?.request || null };
  } catch (error) {
    console.error('Failed to complete emergency:', error);
    throw error;
  }
}
