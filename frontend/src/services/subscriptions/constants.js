export const TABLE_NAME = 'subscribers';

export const SUBSCRIPTION_PROJECTION_ERROR_MESSAGE = 'Subscribers could not load. Try again.';

export const EMPTY_SUBSCRIPTION_STATS = Object.freeze({
  total: 0,
  active: 0,
  pending: 0,
  unsubscribed: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeSent: 0,
  exactCounts: true,
  available: true,
  scope: 'admin_subscriber_projection',
});

export const UNAVAILABLE_SUBSCRIPTION_STATS = Object.freeze({
  total: null,
  active: null,
  pending: null,
  unsubscribed: null,
  paid: null,
  free: null,
  newUsers: null,
  welcomeSent: null,
  exactCounts: false,
  available: false,
  reason: 'stats_query_failed',
  scope: 'admin_subscriber_projection',
});

export const TERMINAL_SUBSCRIBER_STATUSES = [
  'unsubscribed',
  'bounced',
  'inactive',
  'cancelled',
  'expired',
];
