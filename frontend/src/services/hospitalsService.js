/**
 * Compatibility facade for hospital reads, projections, commands, and realtime.
 * Keep existing imports on this module while domain ownership lives in ./hospitals.
 */

export { buildHospitalPayload } from './hospitals/payload';
export { getHospitalVisibleStats } from './hospitals/stats';
export {
  getHospital,
  getHospitalOptions,
  getHospitals,
  getHospitalsBySpecialty,
  getVerifiedHospitals,
} from './hospitals/queries';
export {
  getHospitalPageStats,
  getHospitalsPageData,
} from './hospitals/pageQueries';
export {
  createHospital,
  deleteHospital,
  updateHospital,
  updateHospitalBedCount,
  updateHospitalStatus,
} from './hospitals/commands';
export { subscribeToHospital } from './hospitals/realtime';
