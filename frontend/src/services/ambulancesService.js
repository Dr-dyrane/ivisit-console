/**
 * Ambulance service compatibility facade.
 *
 * Keep consumer imports stable while fleet scope, reads, commands, and realtime
 * ownership live in focused modules under ./ambulances.
 */

export {
  applyAmbulanceOrgAdminScope,
  assertAmbulanceWriteScope,
  filterAmbulanceStationOptions,
} from './ambulances/scope';
export { getAmbulancesPageData } from './ambulances/pageQueries';
export {
  getAmbulance,
  getAmbulances,
  getAvailableAmbulances,
  getDriverAmbulance,
  getHospitalAmbulances,
} from './ambulances/reads';
export {
  getAvailableDrivers,
  getDrivers,
} from './ambulances/driverReads';
export {
  createAmbulance,
  deleteAmbulance,
  updateAmbulance,
} from './ambulances/commands';
export {
  assignDriverToAmbulance,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
} from './ambulances/operationalCommands';
export {
  subscribeToAllAmbulances,
  subscribeToAmbulance,
} from './ambulances/realtime';
