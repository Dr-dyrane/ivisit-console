/**
 * Data Mapping Utilities Index
 * Centralized exports for all standardized data mapping utilities
 * Follows Alexander-Apple DRY principles
 */

import {
  getPatientName,
  getPatientContact,
  getPatientAvatar,
  getPatientInitials,
  getStandardizedPatient
} from './patientUtils';

import {
  getHospitalName,
  getHospitalAddress,
  getHospitalContact,
  getHospitalId,
  getStandardizedHospital
} from './hospitalUtils';

import {
  formatEmergencyLocation,
  extractCoordinates,
  decodePostGISGeometry
} from './locationUtils';

export {
  getPatientName,
  getPatientContact,
  getPatientAvatar,
  getPatientInitials,
  getStandardizedPatient,
  getHospitalName,
  getHospitalAddress,
  getHospitalContact,
  getHospitalId,
  getStandardizedHospital,
  formatEmergencyLocation,
  extractCoordinates,
  decodePostGISGeometry
};

/**
 * Complete standardized data object for any record
 * @param {Object} data - Raw data object
 * @returns {Object} Complete standardized object with patient and hospital info
 */
export const getStandardizedRecord = (data) => {
  return {
    patient: getStandardizedPatient(data),
    hospital: getStandardizedHospital(data),
    location: formatEmergencyLocation(data.patient_location, data.pickup_location),
    originalData: data
  };
};
