/**
 * Emergency service compatibility facade.
 *
 * Keep consumer imports stable while domain ownership lives in ./emergency.
 */

export {
  getEmergencyRequests,
  getEmergencyRequestsPage,
  getEmergencyRequestsPageStats,
} from './emergency/listQueries';
export {
  getEmergencyRequest,
  getLatestEmergencyPayment,
  getEmergencyDetailProjection,
  subscribeToEmergencyDetail,
} from './emergency/detailProjection';
export {
  getEmergencyCreateFacilityOptions,
  createEmergencyRequest,
  updateEmergencyRequest,
} from './emergency/requestCommands';
export {
  acceptEmergencyRequest,
  acceptBedEmergencyRequest,
  completeEmergencyRequest,
  cancelEmergencyRequest,
  releaseResponderAssignment,
} from './emergency/lifecycleCommands';
export {
  approveCashPayment,
  declineCashPayment,
  getUserActivePaymentMethods,
  retryPaymentWithDifferentMethod,
} from './emergency/paymentCommands';
export {
  getResponderLocationState,
  updateResponderLocation,
  updatePatientLocation,
} from './emergency/trackingCommands';
export {
  getActiveEmergencyRequests,
  getUserEmergencyRequests,
  getHospitalEmergencyRequests,
  getEmergencyStats,
} from './emergency/summaryQueries';
export { EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON } from './emergency/constants';
