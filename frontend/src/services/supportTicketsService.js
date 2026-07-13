/**
 * Support tickets service compatibility facade.
 *
 * Keep consumer imports stable while domain ownership lives in ./support-tickets.
 */

export {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from './support-tickets/constants';
export {
  getSupportTicketsPage,
  getSupportTicketsPageStats,
} from './support-tickets/pageQueries';
export {
  getOpenTicketsCount,
  getSupportTicket,
  getSupportTickets,
  getUserSupportTickets,
} from './support-tickets/queries';
export { getSupportTicketsAnalytics } from './support-tickets/analytics';
export {
  assignTicket,
  createSupportTicket,
  deleteSupportTicket,
  updateSupportTicket,
  updateTicketStatus,
} from './support-tickets/commands';
export { subscribeToSupportTickets } from './support-tickets/realtime';
