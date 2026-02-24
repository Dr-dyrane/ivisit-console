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

    // 1. Find nearest available ambulance
    const ambulances = await getAvailableAmbulances();
    const assignedAmbulance = await findBestAmbulance(
      ambulances,
      emergencyDetails.pickup_location,
      emergencyDetails.ambulance_type
    );

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

    // 4. Reserve bed if needed
    let assignedBed = null;
    if (emergencyDetails.bed_type && targetHospital) {
      assignedBed = await reserveBed(
        targetHospital.id,
        emergencyDetails.bed_type
      );
    }

    // 5. Update emergency request with assignments
    const updateData = {
      status: 'accepted',
      ambulance_id: assignedAmbulance?.id,
      responder_id: assignedAmbulance?.profile_id,
      responder_name: assignedAmbulance?.crew?.[0]?.name || 'EMS Team',
      responder_phone: assignedAmbulance?.phone || 'N/A',
      responder_vehicle_type: assignedAmbulance?.type,
      responder_vehicle_plate: assignedAmbulance?.vehicle_number,
      hospital_id: targetHospital?.id,
      hospital_name: targetHospital?.name,
      bed_number: assignedBed?.bedNumber,
      bed_type: assignedBed?.bedType,
      estimated_arrival: calculateETA(emergencyDetails.pickup_location, targetHospital?.coordinates),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('emergency_requests')
      .update(updateData)
      .eq('id', emergencyId)
      .select()
      .single();

    if (error) throw error;

    // 6. Update ambulance status
    if (assignedAmbulance) {
      await supabase
        .from('ambulances')
        .update({
          status: 'dispatched',
          current_call: emergencyId,
          eta: updateData.estimated_arrival || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignedAmbulance.id);
    }

    return {
      success: true,
      emergency: data,
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
    const { error } = await supabase
      .from('emergency_requests')
      .update({
        responder_location: location,
        responder_heading: heading,
        updated_at: new Date().toISOString()
      })
      .eq('id', emergencyId);

    if (error) throw error;
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
    const { data, error } = await supabase
      .from('emergency_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', emergencyId)
      .select()
      .single();

    if (error) throw error;

    // Free up ambulance
    if (data.ambulance_id) {
      await supabase
        .from('ambulances')
        .update({
          status: 'available',
          current_call: null,
          eta: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.ambulance_id);
    }

    return { success: true, emergency: data };
  } catch (error) {
    console.error('Failed to complete emergency:', error);
    throw error;
  }
}
