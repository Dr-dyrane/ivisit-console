import { resolveVital } from '../../../constants/vitalTracks';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';

export const EMPTY_TICKET_IDS = Object.freeze([]);

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const ticketIdKey = (value) => {
  if (value === null || value === undefined) return null;
  const key = String(value).trim();
  return key || null;
};

export const deletedTicketIdSet = (ticketIds = EMPTY_TICKET_IDS) => new Set(
  (Array.isArray(ticketIds) ? ticketIds : [])
    .map(ticketIdKey)
    .filter(Boolean)
);

export const createMobileSupportAccumulator = () => ({
  signature: null,
  pages: new Map(),
  lastSourceByPage: new Map(),
  deletedIds: new Set(),
});

export const reconcileMobileSupportAccumulator = ({
  accumulator,
  signature,
  pageKey = 1,
  sourceTickets = [],
  confirmedDeletedTicketIds = EMPTY_TICKET_IDS,
}) => {
  const store = accumulator || createMobileSupportAccumulator();
  if (!(store.pages instanceof Map)) store.pages = new Map();
  if (!(store.lastSourceByPage instanceof Map)) store.lastSourceByPage = new Map();
  if (!(store.deletedIds instanceof Set)) store.deletedIds = new Set();

  const normalizedPage = Number.isFinite(Number(pageKey)) && Number(pageKey) > 0
    ? Number(pageKey)
    : 1;
  const rows = Array.isArray(sourceTickets) ? sourceTickets : [];

  deletedTicketIdSet(confirmedDeletedTicketIds).forEach((id) => store.deletedIds.add(id));

  if (store.signature !== signature) {
    store.signature = signature;
    store.pages = new Map();
    store.lastSourceByPage = new Map();
  }

  if (store.lastSourceByPage.get(normalizedPage) !== rows) {
    store.lastSourceByPage.set(normalizedPage, rows);
    store.pages.set(normalizedPage, rows.filter((ticket) => {
      const id = ticketIdKey(ticket?.id);
      return id && !store.deletedIds.has(id);
    }));
  }

  for (const [page, pageRows] of store.pages.entries()) {
    const visibleRows = pageRows.filter((ticket) => {
      const id = ticketIdKey(ticket?.id);
      return id && !store.deletedIds.has(id);
    });
    if (visibleRows.length !== pageRows.length) store.pages.set(page, visibleRows);
  }

  const orderedPages = [...store.pages.entries()].sort(([left], [right]) => Number(left) - Number(right));
  const order = [];
  const byId = new Map();
  orderedPages.forEach(([, pageRows]) => {
    pageRows.forEach((ticket) => {
      const id = ticketIdKey(ticket?.id);
      if (!id || store.deletedIds.has(id)) return;
      if (!byId.has(id)) order.push(id);
      byId.set(id, ticket);
    });
  });

  return order.map((id) => byId.get(id));
};

export const pruneSupportTicketIdsFromCache = (cache, ticketIds = EMPTY_TICKET_IDS) => {
  if (!cache || !Array.isArray(cache.data)) return cache;

  const deletedIds = deletedTicketIdSet(ticketIds);
  if (deletedIds.size === 0) return cache;

  const data = cache.data.filter((ticket) => !deletedIds.has(ticketIdKey(ticket?.id)));
  const removedCount = cache.data.length - data.length;
  if (removedCount === 0) return cache;

  const currentCount = Number(cache.count);
  return {
    ...cache,
    data,
    count: Number.isFinite(currentCount)
      ? Math.max(0, currentCount - removedCount)
      : cache.count,
  };
};

export const priorityLabel = (value) => {
  const text = String(value || 'normal').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const categoryLabel = (value) => {
  const text = String(value || 'general').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const requesterName = (ticket) => (
  ticket?.customer_name
  || ticket?.requester_name
  || ticket?.user_name
  || ticket?.name
  || ticket?.email
  || ticket?.user?.email
  || 'Unknown requester'
);

export const openedLabel = (ticket) => {
  const value = ticket?.created_at;
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const isResolved = (status) => status === 'resolved' || status === 'closed';

export const orbClassFor = (status) => {
  switch (status) {
    case 'open': return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
    case 'in_progress': return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
    case 'resolved': return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
    case 'closed': return 'bg-muted/40 text-muted-foreground';
    default: return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
  }
};

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];

export const statusRank = (status) => {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
};

export const hasActiveMobileSupportFilters = (filters = {}) => Boolean(
  filters?.search
  || (filters?.kpiFilter && filters.kpiFilter !== 'all')
  || (Array.isArray(filters?.status) && filters.status.length > 0)
  || (Array.isArray(filters?.priority) && filters.priority.length > 0)
  || (Array.isArray(filters?.category) && filters.category.length > 0)
);

export const getMobileSupportFilterSignature = (filters = {}) => JSON.stringify({
  search: filters?.search || '',
  kpi: filters?.kpiFilter || 'all',
  status: filters?.status || [],
  priority: filters?.priority || [],
  category: filters?.category || [],
});

export const buildMobileSupportKpis = (stats, sourceTickets) => [
  { id: 'all', label: 'All', value: metricValue(stats?.total, sourceTickets.length), color: 'hsl(var(--muted-foreground))' },
  { id: 'open', label: 'Open', value: metricValue(stats?.open, 0), color: 'hsl(200 98% 39%)' },
  { id: 'in_progress', label: 'Active', value: metricValue(stats?.active, 0), color: 'hsl(26 90% 37%)' },
  { id: 'resolved', label: 'Resolved', value: metricValue(stats?.resolved, 0), color: 'hsl(162 94% 24%)' },
];

export const getMobileSupportScopeCount = (stats, sourceTickets, activeKpi) => {
  const kpiToKey = { all: 'total', open: 'open', in_progress: 'inProgress', resolved: 'resolved' };
  return activeKpi === 'all'
    ? metricValue(stats?.total, sourceTickets.length)
    : metricValue(stats?.[kpiToKey[activeKpi]], 0);
};

export const groupMobileSupportTickets = (tickets) => resolveAdaptiveGroups(tickets, [
  {
    key: 'status',
    assign: (ticket) => ticket.status || 'open',
    labelFor: (key) => resolveVital('support', key)?.pill?.label ?? key,
    order: (keys) => keys.slice().sort((left, right) => statusRank(left) - statusRank(right)),
    orphanLabel: 'Other',
  },
  { type: 'coarse-recency', key: 'opened', getDate: (ticket) => ticket.created_at },
]);
