export const SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE = 'Subscriber and email changes are not available yet.';

export const SUBSCRIPTION_PAGE_SIZE = 20;

export const SUBSCRIPTION_DEFAULT_SORT = Object.freeze({
  key: 'created_at',
  direction: 'desc',
});

export const createSubscriptionFilters = () => ({
  search: '',
  status: [],
  type: [],
  kpiFilter: 'all',
  welcomeEmailSent: '',
  dateRange: 'all',
});

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

const TERMINAL_SUBSCRIBER_STATUSES = new Set([
  'unsubscribed',
  'bounced',
  'inactive',
  'cancelled',
  'expired',
]);

export const buildVisibleSubscriptionStats = (rows = [], reason = 'stats_query_failed') => {
  const visibleRows = Array.isArray(rows) ? rows : [];
  const statuses = visibleRows.map((subscriber) => String(subscriber?.status || 'pending').toLowerCase());

  return {
    total: visibleRows.length,
    active: statuses.filter((status) => status === 'active').length,
    pending: statuses.filter((status) => (
      status !== 'active' && !TERMINAL_SUBSCRIBER_STATUSES.has(status)
    )).length,
    unsubscribed: statuses.filter((status) => TERMINAL_SUBSCRIBER_STATUSES.has(status)).length,
    paid: visibleRows.filter((subscriber) => subscriber?.type === 'paid').length,
    free: visibleRows.filter((subscriber) => subscriber?.type === 'free').length,
    newUsers: visibleRows.filter((subscriber) => subscriber?.new_user === true).length,
    welcomeSent: visibleRows.filter((subscriber) => subscriber?.welcome_email_sent === true).length,
    exactCounts: false,
    available: false,
    reason,
    scope: 'visible_rows',
  };
};

export const buildSubscriptionQueryFilter = ({ filters, pagination, sortConfig }) => ({
  ...filters,
  limit: pagination.itemsPerPage,
  offset: (pagination.currentPage - 1) * pagination.itemsPerPage,
  sortKey: sortConfig.key,
  sortDirection: sortConfig.direction,
  quiet: true,
});

export const getSubscriptionRoleKind = ({ admin, orgAdmin, provider, driver }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const hasActiveSubscriberFilters = (filters = {}) => Boolean(
  filters.search
  || filters.status?.length
  || filters.type?.length
  || filters.welcomeEmailSent
  || (filters.dateRange && filters.dateRange !== 'all')
  || filters.kpiFilter !== 'all'
);

export const buildSubscriptionAnalytics = ({
  displayStats,
  subscriberCount,
  statsUnavailable,
}) => {
  const total = Number(displayStats.total ?? subscriberCount ?? 0);
  const paid = Number(displayStats.paid ?? 0);
  const free = Number(displayStats.free ?? 0);
  const active = Number(displayStats.active ?? 0);
  const pending = Number(displayStats.pending ?? 0);
  const unsubscribed = Number(displayStats.unsubscribed ?? 0);

  return {
    total,
    active,
    paid,
    free,
    newUsers: Number(displayStats.newUsers ?? 0),
    welcomeEmailsSent: Number(displayStats.welcomeSent ?? 0),
    pending,
    unsubscribed,
    byType: { paid, free },
    byStatus: { active, pending, unsubscribed },
    statsAvailable: !statsUnavailable,
    distributionScope: statsUnavailable ? 'visible_page' : 'exact_filtered_projection',
    distributionLabel: statsUnavailable
      ? 'Loaded rows (statistics unavailable)'
      : 'Current filtered subscriber scope',
  };
};

export const buildSubscriptionsRouteContext = ({
  subscribers,
  focusedSubscriber,
  subscriberCount,
  displayStats,
  statsUnavailable,
  loading,
  error,
}) => {
  const subscriberRows = Array.isArray(subscribers) ? subscribers : [];

  return {
    subscribers: subscriberRows.slice(0, 8),
    focusedSubscriber,
    summary: {
      total: subscriberCount,
      active: displayStats.active || 0,
      pending: displayStats.pending || 0,
      free: displayStats.free || 0,
      paid: displayStats.paid || 0,
      newUsers: displayStats.newUsers || 0,
      statsAvailable: !statsUnavailable,
      statsScope: displayStats.scope,
      loading,
      error: error ? String(error?.message || error) : null,
      source: 'route',
    },
  };
};

export const getSubscriberStatusTone = (status) => {
  if (status === 'active') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  }
  if (['unsubscribed', 'bounced', 'inactive'].includes(status)) {
    return 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]';
  }
  return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
};

// Date-only values parse as UTC midnight and shift a calendar day in negative
// offsets; anchor them to local noon so the stored day always renders.
const DATE_ONLY_VALUE = /^\d{4}-\d{2}-\d{2}$/;

export const formatSubscriberEventDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const parsed = new Date(DATE_ONLY_VALUE.test(raw) ? `${raw}T12:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

// Welcome evidence is the recorded send timestamp; the bare boolean is the
// fallback for legacy rows and an absent timestamp renders as not sent.
export const getWelcomeEmailEvidenceLabel = (subscriber = {}) => {
  const sentAt = formatSubscriberEventDate(subscriber?.welcome_email_sent_at);
  if (sentAt) return `Sent ${sentAt}`;
  return subscriber?.welcome_email_sent === true ? 'Sent' : 'Not sent';
};

// Terminal evidence renders only on unsubscribed rows; a missing timestamp on
// such a row is reported as Unknown, never fabricated.
export const getUnsubscribedEvidenceLabel = (subscriber = {}) => {
  if (String(subscriber?.status || '').toLowerCase() !== 'unsubscribed') return null;
  return formatSubscriberEventDate(subscriber?.unsubscribed_at) || 'Unknown';
};

export const SUBSCRIPTION_FILTER_SCHEMA = Object.freeze([
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search subscribers...',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'unsubscribed', label: 'Unsubscribed' },
      { value: 'bounced', label: 'Bounced' },
    ],
  },
  {
    key: 'type',
    type: 'multiselect',
    label: 'Subscription Type',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
    ],
  },
  {
    key: 'welcomeEmailSent',
    type: 'select',
    label: 'Welcome Email',
    options: [
      { value: '', label: 'All' },
      { value: 'sent', label: 'Sent' },
      { value: 'pending', label: 'Pending' },
    ],
  },
  {
    key: 'dateRange',
    type: 'date',
    label: 'Subscription Date',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'month' },
    ],
  },
]);
