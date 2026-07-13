export const CACHE_DURATION = 5 * 60 * 1000;
export const ANALYTICS_REQUEST_SAMPLE_LIMIT = 1000;

export const ANALYTICS_WINDOW_DAYS = Object.freeze({
  '7d': 7,
  '30d': 30,
  '90d': 90,
});

export const DEFAULT_ANALYTICS_SUBSCRIPTION_STATS = {
  total: 0,
  active: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeEmailsSent: 0,
  paidConversionRate: 0,
  activeFree: 0,
  activePremium: 0,
  inactiveFree: 0,
  inactivePremium: 0,
};
