/**
 * Subscription service compatibility facade.
 *
 * Keep consumer imports stable while subscriber projections, compatibility
 * operations, email receivers, analytics, and realtime live in focused modules.
 */

export { SUBSCRIPTION_PROJECTION_ERROR_MESSAGE } from './subscriptions/constants';
export { getSubscriptionsPage } from './subscriptions/pageQueries';
export {
  getSubscriber,
  getSubscriberByEmail,
  getSubscribers,
  getSubscribersForBulkEmail,
} from './subscriptions/reads';
export {
  createSubscriber,
  deleteSubscriber,
  markWelcomeEmailSent,
  updateSubscriber,
  updateSubscriberStatus,
  updateSubscriberType,
} from './subscriptions/unsupportedOperations';
export {
  sendBulkEmail,
  sendCustomEmail,
  sendWelcomeEmail,
  sendWelcomeToSubscriber,
} from './subscriptions/emailCommands';
export { createSubscriberWithWelcome } from './subscriptions/workflows';
export { getSubscriptionAnalytics } from './subscriptions/analytics';
export {
  subscribeToNewSubscribers,
  subscribeToSubscribers,
} from './subscriptions/realtime';
