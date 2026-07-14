/**
 * Compatibility facade for staff scheduling reads, commands, reporting, and realtime.
 * Keep existing imports on this module while domain ownership lives in ./staff-scheduling.
 */

export {
  getStaffScheduleById,
  getStaffSchedules,
  getScheduleFacilities,
} from './staff-scheduling/reads';
export { getAvailableStaff } from './staff-scheduling/rosterReads';
export {
  createStaffSchedule,
  confirmHospitalTimezone,
  deleteStaffSchedule,
  updateStaffSchedule,
} from './staff-scheduling/commands';
export { getScheduleStats } from './staff-scheduling/stats';
export { checkScheduleConflicts } from './staff-scheduling/conflicts';
export { subscribeToScheduleUpdates } from './staff-scheduling/realtime';
