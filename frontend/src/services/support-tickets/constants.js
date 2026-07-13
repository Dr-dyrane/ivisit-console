export const TABLE_NAME = 'support_tickets';

export const SUPPORT_TICKET_CREATE_FIELDS = [
  'subject',
  'message',
  'category',
  'priority',
];

export const SUPPORT_TICKET_UPDATE_FIELDS = [
  'subject',
  'message',
  'category',
  'priority',
];

// These TEXT fields have no database CHECK constraints. Keep the service
// boundary aligned with the mounted controls and maintained lifecycle.
export const SUPPORT_TICKET_CATEGORIES = Object.freeze([
  'general',
  'technical',
  'billing',
  'account',
  'feature_request',
  'bug_report',
  'medical',
]);

export const SUPPORT_TICKET_PRIORITIES = Object.freeze([
  'low',
  'normal',
  'high',
  'urgent',
]);

export const SUPPORT_TICKET_STATUSES = Object.freeze([
  'open',
  'in_progress',
  'resolved',
  'closed',
]);

export const SUPPORT_TICKET_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'subject',
  'status',
  'priority',
  'category',
]);
