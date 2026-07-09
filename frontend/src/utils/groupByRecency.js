/**
 * groupByRecency.js - the shared iOS-Settings recency grouping for temporal feeds.
 *
 * Mirrors the ivisit-app grouped-list model (hooks/visits/useVisitHistorySelectors.js:
 * selectGroupedHistoryBuckets -> resolveGroupKey). One rounded PANEL per recency bucket;
 * this util owns only the bucketing, never the rendering. The app decides bucket by an
 * "active" status axis first, then a future/upcoming axis, then the resolved date
 * relative to `now`.
 *
 * Pure: no module-scope Date.now(); the caller passes `now` (defaults to a fresh Date at
 * call time). Defensive: bad/missing dates sink to 'older'. Safe to unit test
 * (utils/groupByRecency.test.js).
 *
 * Public API:
 *   groupByRecency(items, getDate, getStatus?, now?) -> Array<{ key, label, items }>
 *     Ordered buckets (canonical order below), empties dropped, newest-first within each.
 */

// Active-ish statuses (canonical emergency vocabulary) route to 'active_now' regardless
// of date. Callers that don't pass getStatus simply never populate this bucket.
const ACTIVE_STATUSES = new Set(['pending_approval', 'in_progress', 'accepted', 'arrived']);

export const RECENCY_GROUP_ORDER = Object.freeze([
  'active_now',
  'upcoming',
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'older',
]);

export const RECENCY_GROUP_LABELS = Object.freeze({
  active_now: 'Active now',
  upcoming: 'Upcoming',
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  last_week: 'Last week',
  this_month: 'This month',
  last_month: 'Last month',
  older: 'Older',
});

/** Coerce a date-ish value into a valid Date, or null when unparseable/absent. */
const toDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

/**
 * Resolve the bucket key for one item. Precedence: active status -> future date ->
 * relative-to-now date bands. Bad/missing dates that are not active fall to 'older'.
 */
const resolveRecencyKey = (date, status, now, hasStatus) => {
  if (hasStatus && status != null && ACTIVE_STATUSES.has(status)) {
    return 'active_now';
  }
  if (!date) {
    return 'older';
  }
  if (date.getTime() > now.getTime()) {
    return 'upcoming';
  }

  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const thisWeek = startOfWeek(now);
  const lastWeek = addDays(thisWeek, -7);
  const thisMonth = startOfMonth(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const ts = date.getTime();
  if (ts >= today.getTime()) return 'today';
  if (ts >= yesterday.getTime()) return 'yesterday';
  if (ts >= thisWeek.getTime()) return 'this_week';
  if (ts >= lastWeek.getTime()) return 'last_week';
  if (ts >= thisMonth.getTime()) return 'this_month';
  if (ts >= lastMonth.getTime()) return 'last_month';
  return 'older';
};

/**
 * Group items into ordered recency buckets.
 *
 * @param {Array} items
 * @param {(item:any) => (string|number|Date|null|undefined)} getDate  extracts the date-ish field
 * @param {((item:any) => (string|null|undefined))} [getStatus]  extracts a status; omit to skip 'active_now'
 * @param {Date} [now]  reference instant (defaults to a fresh Date at call time)
 * @returns {Array<{ key:string, label:string, items:any[] }>} ordered, non-empty buckets
 */
export function groupByRecency(items, getDate, getStatus, now = new Date()) {
  const list = Array.isArray(items) ? items : [];
  const hasStatus = typeof getStatus === 'function';
  const referenceNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const buckets = new Map(RECENCY_GROUP_ORDER.map((key) => [key, []]));

  list.forEach((item) => {
    let date = null;
    try {
      date = toDate(typeof getDate === 'function' ? getDate(item) : null);
    } catch {
      date = null;
    }
    let status = null;
    if (hasStatus) {
      try {
        status = getStatus(item);
      } catch {
        status = null;
      }
    }
    const key = resolveRecencyKey(date, status, referenceNow, hasStatus);
    buckets.get(key).push({ item, ts: date ? date.getTime() : Number.NEGATIVE_INFINITY });
  });

  return RECENCY_GROUP_ORDER.map((key) => ({
    key,
    label: RECENCY_GROUP_LABELS[key],
    items: buckets
      .get(key)
      .sort((a, b) => b.ts - a.ts)
      .map((entry) => entry.item),
  })).filter((group) => group.items.length > 0);
}

export default groupByRecency;
