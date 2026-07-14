/**
 * Visits service compatibility facade.
 *
 * Keep consumer imports stable while domain ownership lives in ./visits.
 */

export { VISIT_MUTATION_UNAVAILABLE_REASON } from './visits/constants';
export { getVisitsPageData } from './visits/pageQueries';
export {
  getScheduledVisitById,
  getScheduledVisitsPageData,
  SCHEDULED_VISIT_PAGE_SIZE,
} from './visits/scheduledQueries';
export {
  getVisit,
  getVisitByRequestId,
  getVisits,
} from './visits/queries';
export {
  getDoctorVisits,
  getHospitalVisits,
  getUserCompletedVisits,
  getUserUpcomingVisits,
  getUserVisits,
  getVisitStats,
} from './visits/scopedQueries';
export {
  cancelVisit,
  completeVisit,
  createVisit,
  deleteVisit,
  markVisitAsNoShow,
  updateVisit,
} from './visits/commands';
export {
  SCHEDULED_VISIT_ACTIONS,
  transitionScheduledVisit,
  zonedLocalDateTimeToUtc,
} from './visits/scheduledCommands';
export {
  subscribeToAllVisits,
  subscribeToUserVisits,
  subscribeToVisit,
} from './visits/realtime';
