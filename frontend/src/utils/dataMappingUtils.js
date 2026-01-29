/**
 * Data Mapping Utilities Index
 * Centralized exports for all standardized data mapping utilities
 * Follows Alexander-Apple DRY principles
 */

export {
  getPatientName,
  getPatientContact,
  getPatientAvatar,
  getPatientInitials,
  getStandardizedPatient
} from './patientUtils';

export {
  getHospitalName,
  getHospitalAddress,
  getHospitalContact,
  getHospitalId,
  getStandardizedHospital
} from './hospitalUtils';

/**
 * Complete standardized data object for any record
 * @param {Object} data - Raw data object
 * @returns {Object} Complete standardized object with patient and hospital info
 */
export const getStandardizedRecord = (data) => {
  return {
    patient: getStandardizedPatient(data),
    hospital: getStandardizedHospital(data),
    originalData: data
  };
};
