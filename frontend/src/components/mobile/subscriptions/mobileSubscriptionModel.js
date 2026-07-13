import { resolveVital } from '../../../constants/vitalTracks';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const planLabel = (type) => {
  const text = String(type || 'free').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const dateLabel = (value) => {
  if (!value) return 'Date unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unknown';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'unsubscribed',
  'bounced',
  'inactive',
  'cancelled',
  'expired',
]);

export const normalizeSubscriptionStatus = (subscriber) => (
  String(subscriber?.status || 'pending').toLowerCase()
);

export const subscriptionOrbClass = (status) => {
  if (status === 'active') {
    return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
  }
  if (TERMINAL_SUBSCRIPTION_STATUSES.has(status)) {
    return 'bg-muted/40 text-muted-foreground';
  }
  return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
};

const STATUS_ORDER = ['pending', 'active', 'unsubscribed', 'bounced'];

export const subscriptionStatusRank = (status) => {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
};

export const hasActiveSubscriptionFilters = (filters = {}) => Boolean(
  filters?.search
  || (Array.isArray(filters?.status) && filters.status.length > 0)
  || (Array.isArray(filters?.type) && filters.type.length > 0)
  || filters?.welcomeEmailSent
  || filters?.created_at
  || (filters?.dateRange && filters.dateRange !== 'all')
);

export const buildMobileSubscriptionKpis = (stats, fallbackTotal = 0) => [
  {
    id: 'all',
    label: 'All',
    value: metricValue(stats?.total, fallbackTotal),
    color: 'hsl(var(--muted-foreground))',
  },
  {
    id: 'active',
    label: 'Active',
    value: metricValue(stats?.active, 0),
    color: 'hsl(162 94% 24%)',
  },
  {
    id: 'pending',
    label: 'Pending',
    value: metricValue(stats?.pending, 0),
    color: 'hsl(192 91% 36%)',
  },
  {
    id: 'unsubscribed',
    label: 'Unsubscribed',
    value: metricValue(stats?.unsubscribed, 0),
    color: 'hsl(215 16% 47%)',
  },
];

export const getMobileSubscriptionScopeCount = ({ stats, activeKpi, fallbackTotal = 0 }) => {
  const kpiToKey = {
    all: 'total',
    active: 'active',
    pending: 'pending',
    unsubscribed: 'unsubscribed',
  };

  if (activeKpi === 'all' || !kpiToKey[activeKpi]) {
    return metricValue(stats?.total, fallbackTotal);
  }
  return metricValue(stats?.[kpiToKey[activeKpi]], 0);
};

export const welcomeEmailStatusDistributes = (subscribers = []) => {
  let sent = 0;
  let unsent = 0;

  for (const subscriber of subscribers) {
    if (subscriber?.welcome_email_sent === true) sent += 1;
    else unsent += 1;
    if (sent > 0 && unsent > 0) return true;
  }
  return false;
};

export const buildMobileSubscriptionGroups = (subscribers = []) => resolveAdaptiveGroups(subscribers, [
  {
    key: 'status',
    assign: (subscriber) => normalizeSubscriptionStatus(subscriber),
    labelFor: (key) => resolveVital('subscription', key)?.pill?.label ?? key,
    order: (keys) => keys.slice().sort((a, b) => (
      subscriptionStatusRank(a) - subscriptionStatusRank(b)
    )),
    orphanLabel: 'Other',
  },
  {
    type: 'coarse-recency',
    key: 'subscribed',
    getDate: (subscriber) => subscriber.subscription_date || subscriber.created_at,
  },
]).groups;
