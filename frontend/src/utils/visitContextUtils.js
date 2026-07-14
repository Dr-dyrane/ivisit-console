/**
 * Visit Context Utilities
 * Maps visit and linked-request data without crossing identity boundaries.
 */

import { getProfile } from '../services/profilesService';
import { getHospital } from '../services/hospitalsService';
import { getDoctor } from '../services/doctorsService';
import { getEmergencyRequest } from '../services/emergencyService';
import { buildRequestVisitIdentityProjection } from './requestVisitIdentityProjection';

const valueFromResult = (result) => (
  result?.status === 'fulfilled' ? result.value : null
);

const errorFromResult = (result) => (
  result?.status === 'rejected' ? result.reason : null
);

const toPatientContext = (patient) => ({
  id: patient.profileId,
  fullName: patient.name,
  phone: patient.phone,
  email: patient.email,
  avatar: patient.avatar,
});

const toDoctorContext = (doctor) => doctor.hasDoctor ? ({
  id: doctor.doctorId,
  name: doctor.name,
  specialty: doctor.specialty,
  phone: doctor.phone,
  avatar: doctor.avatar,
}) : null;

const toResponderContext = (responder) => responder.hasResponder ? ({
  id: responder.profileId,
  name: responder.name,
  phone: responder.phone,
  avatar: responder.avatar,
  ambulanceId: responder.ambulanceId,
  vehicleType: responder.vehicleType,
  vehiclePlate: responder.vehiclePlate,
}) : null;

const toHospitalContext = (hospital) => hospital ? ({
  id: hospital.id,
  name: hospital.name,
  address: hospital.address || hospital.google_address,
  phone: hospital.phone || hospital.google_phone,
  specialty: hospital.specialty,
}) : null;

export const fetchRequestVisitIdentity = async ({
  request = null,
  requestId = null,
  visit = null,
} = {}) => {
  let sourceRequest = request;
  let requestError = null;
  const linkedRequestId = requestId || visit?.request_id || null;

  if (!sourceRequest && linkedRequestId) {
    try {
      sourceRequest = await getEmergencyRequest(linkedRequestId);
    } catch (error) {
      requestError = error;
    }
  }

  const initialIdentity = buildRequestVisitIdentityProjection({
    request: sourceRequest,
    visit,
  });
  const patientRead = initialIdentity.patient.profileId
    && initialIdentity.patient.source !== 'profile_relation'
    ? getProfile(initialIdentity.patient.profileId)
    : Promise.resolve(null);
  const doctorRead = initialIdentity.doctor.doctorId
    && initialIdentity.doctor.source !== 'doctor_relation'
    ? getDoctor(initialIdentity.doctor.doctorId)
    : Promise.resolve(null);
  const responderRead = initialIdentity.responder.profileId
    && initialIdentity.responder.source !== 'profile_relation'
    ? getProfile(initialIdentity.responder.profileId)
    : Promise.resolve(null);
  const [patientResult, doctorResult, responderResult] = await Promise.allSettled([
    patientRead,
    doctorRead,
    responderRead,
  ]);
  const errors = {
    request: requestError,
    patient: errorFromResult(patientResult),
    doctor: errorFromResult(doctorResult),
    responder: errorFromResult(responderResult),
  };
  const identity = buildRequestVisitIdentityProjection({
    request: sourceRequest,
    visit,
    patientProfile: valueFromResult(patientResult),
    doctorRecord: valueFromResult(doctorResult),
    responderProfile: valueFromResult(responderResult),
  });

  return {
    request: sourceRequest,
    identity,
    relationshipState: Object.values(errors).some(Boolean) ? 'degraded' : 'complete',
    errors,
  };
};

/**
 * Fetch comprehensive visit context using existing services
 * @param {Object} visit - Visit object with user_id, hospital_id, doctor_id
 * @returns {Promise<Object>} Complete visit context with patient, hospital, doctor info
 */
export const fetchVisitContext = async (visit) => {
  try {
    if (!visit) return null;
    const identityContext = await fetchRequestVisitIdentity({ visit });
    const hospitalId = visit.hospital_id || identityContext.request?.hospital_id || null;
    const facilityRecord = visit.facility || (typeof visit.hospital === 'object' ? visit.hospital : null);
    const nestedHospital = facilityRecord && (!hospitalId || facilityRecord.id === hospitalId)
      ? facilityRecord
      : null;
    const hospitalResult = nestedHospital || !hospitalId
      ? { status: 'fulfilled', value: nestedHospital }
      : await Promise.resolve(getHospital(hospitalId)).then(
          (value) => ({ status: 'fulfilled', value }),
          (error) => ({ status: 'rejected', reason: error })
        );
    const identity = identityContext.identity;

    return {
      request: identityContext.request,
      identity,
      patient: toPatientContext(identity.patient),
      hospital: toHospitalContext(valueFromResult(hospitalResult)),
      doctor: toDoctorContext(identity.doctor),
      responder: toResponderContext(identity.responder),
      relationshipState: identityContext.relationshipState === 'degraded'
        || hospitalResult.status === 'rejected'
        ? 'degraded'
        : 'complete',
      errors: {
        ...identityContext.errors,
        hospital: errorFromResult(hospitalResult),
      },
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
    const identityContext = await fetchRequestVisitIdentity({ requestId });
    const emergencyRequest = identityContext.request;
    if (!emergencyRequest) return null;
    const hospitalResult = emergencyRequest.hospital_id
      ? await Promise.resolve(getHospital(emergencyRequest.hospital_id)).then(
          (value) => ({ status: 'fulfilled', value }),
          (error) => ({ status: 'rejected', reason: error })
        )
      : { status: 'fulfilled', value: null };
    const identity = identityContext.identity;

    return {
      emergency: {
        ...emergencyRequest,
        id: emergencyRequest.id,
        serviceType: emergencyRequest.service_type,
        status: emergencyRequest.status,
        createdAt: emergencyRequest.created_at,
        description: emergencyRequest.description,
        patientLocation: emergencyRequest.patient_location,
        hospitalName: emergencyRequest.hospital_name
      },
      identity,
      patient: toPatientContext(identity.patient),
      doctor: toDoctorContext(identity.doctor),
      responder: toResponderContext(identity.responder),
      hospital: toHospitalContext(valueFromResult(hospitalResult)),
      relationshipState: identityContext.relationshipState === 'degraded'
        || hospitalResult.status === 'rejected'
        ? 'degraded'
        : 'complete',
      errors: {
        ...identityContext.errors,
        hospital: errorFromResult(hospitalResult),
      },
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
  const dateSource = visit.scheduled_start_at || visit.date || visit.created_at;
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
