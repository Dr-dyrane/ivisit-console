/**
 * Visit Context Utilities
 * Properly maps visit data to patient, hospital, and doctor information using existing services
 */

import { getProfiles } from '../services/profilesService';
import { getHospitals } from '../services/hospitalsService';
import { getDoctors } from '../services/doctorsService';
import { getEmergencyRequests } from '../services/emergencyService';

/**
 * Fetch comprehensive visit context using existing services
 * @param {Object} visit - Visit object with user_id, hospital_id, doctor_id
 * @returns {Promise<Object>} Complete visit context with patient, hospital, doctor info
 */
export const fetchVisitContext = async (visit) => {
  try {
    if (!visit) return null;

    // Parallel fetch all context data using existing services
    const [patientProfiles, hospitals, doctors] = await Promise.all([
      visit.user_id ? getProfiles({ userId: visit.user_id }) : Promise.resolve([]),
      visit.hospital_id ? getHospitals({ id: visit.hospital_id }) : Promise.resolve([]),
      visit.doctor_id ? getDoctors({ id: visit.doctor_id }) : Promise.resolve([])
    ]);

    const patientProfile = patientProfiles[0] || null;
    const hospitalInfo = hospitals[0] || null;
    const doctorInfo = doctors[0] || null;

    return {
      patient: patientProfile ? {
        id: patientProfile.id,
        fullName: patientProfile.full_name || patientProfile.username || 'Unknown Patient',
        phone: patientProfile.phone,
        email: patientProfile.email,
        avatar: patientProfile.avatar_url
      } : null,
      
      hospital: hospitalInfo ? {
        id: hospitalInfo.id,
        name: hospitalInfo.name,
        address: hospitalInfo.address,
        phone: hospitalInfo.phone,
        specialty: hospitalInfo.specialty
      } : null,
      
      doctor: doctorInfo ? {
        id: doctorInfo.id,
        name: doctorInfo.name,
        specialty: doctorInfo.specialization,
        phone: doctorInfo.phone,
        avatar: doctorInfo.avatar_url
      } : null
    };
  } catch (error) {
    console.error('Error fetching visit context:', error);
    return null;
  }
};

/**
 * Fetch emergency context for visit originated from emergency
 * @param {string} requestId - Emergency request ID
 * @returns {Promise<Object>} Emergency context with patient and hospital info
 */
export const fetchEmergencyContext = async (requestId) => {
  try {
    if (!requestId) return null;

    const emergencyRequests = await getEmergencyRequests();
    const emergencyRequest = emergencyRequests.find(req => req.id === requestId);
    
    if (!emergencyRequest) return null;

    // Fetch patient and hospital context using existing services
    const [patientProfiles, hospitals] = await Promise.all([
      emergencyRequest.user_id ? getProfiles({ userId: emergencyRequest.user_id }) : Promise.resolve([]),
      emergencyRequest.hospital_id ? getHospitals({ id: emergencyRequest.hospital_id }) : Promise.resolve([])
    ]);

    const patientProfile = patientProfiles[0] || null;
    const hospitalInfo = hospitals[0] || null;

    return {
      emergency: {
        id: emergencyRequest.id,
        serviceType: emergencyRequest.service_type,
        status: emergencyRequest.status,
        createdAt: emergencyRequest.created_at,
        description: emergencyRequest.description,
        patientLocation: emergencyRequest.patient_location,
        hospitalName: emergencyRequest.hospital_name
      },
      patient: patientProfile ? {
        id: patientProfile.id,
        fullName: patientProfile.full_name || patientProfile.username || 'Unknown Patient',
        phone: patientProfile.phone,
        email: patientProfile.email
      } : null,
      hospital: hospitalInfo ? {
        id: hospitalInfo.id,
        name: hospitalInfo.name,
        address: hospitalInfo.address,
        phone: hospitalInfo.phone
      } : null
    };
  } catch (error) {
    console.error('Error fetching emergency context:', error);
    return null;
  }
};

/**
 * Format visit date/time properly without manual parsing
 * @param {Object} visit - Visit object
 * @returns {string} Formatted datetime-local string
 */
export const formatVisitDateTime = (visit) => {
  if (!visit) return '';

  // Prefer the clinical `date` field: this value pre-fills the edit form and is
  // written back into `payload.date` on save, so preferring `created_at` here
  // corrupted the scheduled visit date with the row-creation timestamp.
  // `created_at` is only a fallback for legacy rows that never got a date.
  const dateSource = visit.date || visit.created_at;
  if (!dateSource) return '';
  
  // Handle ISO dates directly
  if (dateSource.includes('T')) {
    return dateSource.slice(0, 16);
  }
  
  // Handle date-only strings
  const date = new Date(dateSource);
  return date.toISOString().slice(0, 16);
};

/**
 * Check if visit originated from emergency request
 * @param {Object} visit - Visit object
 * @returns {boolean} True if visit is emergency-related
 */
export const isEmergencyVisit = (visit) => {
  if (!visit) return false;
  
  return (
    visit.request_id ||
    visit.type === 'Ambulance Ride' ||
    visit.type === 'Bed Booking' ||
    visit.visit_type === 'Ambulance Ride' ||
    visit.visit_type === 'Bed Booking'
  );
};

/**
 * Get service type display name
 * @param {string} serviceType - Service type from emergency
 * @returns {string} Display name
 */
export const getServiceTypeDisplay = (serviceType) => {
  const displayMap = {
    'ambulance': 'Ambulance Dispatch',
    'bed': 'Bed Booking',
    'critical_care': 'Critical Care',
    'emergency_room': 'Emergency Room'
  };
  
  return displayMap[serviceType] || serviceType || 'Emergency Service';
};
