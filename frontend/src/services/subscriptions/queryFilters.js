import { TERMINAL_SUBSCRIBER_STATUSES } from './constants';

export const withoutSubscriberFilterDimensions = (filter = {}, dimensions = []) => {
  const next = { ...filter, kpiFilter: undefined };
  dimensions.forEach((dimension) => {
    delete next[dimension];
  });
  return next;
};

const toSubscriberDateBoundary = (value, endOfDay = false) => {
  const text = String(value || '').trim();
  if (!text) return null;

  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : text;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const applySubscriberBaseFilters = (query, filter = {}) => {
  let next = query;
  if (filter.search) next = next.ilike('email', `%${String(filter.search).trim()}%`);
  if (Array.isArray(filter.status) && filter.status.length > 0) next = next.in('status', filter.status);
  if (Array.isArray(filter.type) && filter.type.length > 0) next = next.in('type', filter.type);
  if (filter.welcomeEmailSent === 'sent') next = next.eq('welcome_email_sent', true);
  if (filter.welcomeEmailSent === 'pending') next = next.eq('welcome_email_sent', false);
  if (filter.dateRange && filter.dateRange !== 'all') {
    if (typeof filter.dateRange === 'object') {
      const start = toSubscriberDateBoundary(filter.dateRange.start);
      const end = toSubscriberDateBoundary(filter.dateRange.end, true);
      if (start) next = next.gte('created_at', start);
      if (end) next = next.lte('created_at', end);
    } else {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[filter.dateRange];
      if (days) next = next.gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
    }
  }
  return next;
};

export const applySubscriberKpiFilter = (query, kpiFilter = 'all') => {
  switch (kpiFilter) {
    case 'active': return query.eq('status', 'active');
    case 'pending': return query.not('status', 'eq', 'active').not('status', 'in', `(${TERMINAL_SUBSCRIBER_STATUSES.join(',')})`);
    case 'unsubscribed': return query.in('status', TERMINAL_SUBSCRIBER_STATUSES);
    case 'new': return query.eq('new_user', true);
    case 'paid': return query.eq('type', 'paid');
    case 'free': return query.eq('type', 'free');
    default: return query;
  }
};
