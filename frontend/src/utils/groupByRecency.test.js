import { groupByRecency, RECENCY_GROUP_ORDER, RECENCY_GROUP_LABELS } from './groupByRecency';

// Wed Jul 22 2026, noon local. Chosen late enough in the month that every relative band
// (today -> older) is reachable; local Date constructor avoids UTC-offset flakiness.
const now = new Date(2026, 6, 22, 12, 0, 0);

const getDate = (x) => x.d;
const getStatus = (x) => x.s;

describe('groupByRecency', () => {
  it('exposes the canonical bucket order and labels', () => {
    expect(RECENCY_GROUP_ORDER).toEqual([
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
    expect(RECENCY_GROUP_LABELS.active_now).toBe('Active now');
    expect(RECENCY_GROUP_LABELS.this_week).toBe('This week');
  });

  it('returns buckets in canonical order and drops empties', () => {
    const items = [
      { id: 'active', d: new Date(2025, 0, 1, 8), s: 'in_progress' },
      { id: 'today', d: new Date(2026, 6, 22, 9), s: 'completed' },
      { id: 'older', d: new Date(2025, 0, 1, 8), s: 'completed' },
    ];
    const out = groupByRecency(items, getDate, getStatus, now);
    expect(out.map((g) => g.key)).toEqual(['active_now', 'today', 'older']);
    expect(out.map((g) => g.label)).toEqual(['Active now', 'Today', 'Older']);
  });

  it('routes active-ish statuses to active_now regardless of date', () => {
    const items = [{ id: 'a', d: new Date(2025, 0, 1, 8), s: 'arrived' }];
    const out = groupByRecency(items, getDate, getStatus, now);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('active_now');
    expect(out[0].items.map((i) => i.id)).toEqual(['a']);
  });

  it('skips the active_now bucket when getStatus is omitted', () => {
    const items = [{ id: 'a', d: new Date(2026, 6, 22, 9), s: 'in_progress' }];
    const out = groupByRecency(items, getDate, undefined, now);
    expect(out.map((g) => g.key)).toEqual(['today']);
  });

  it('buckets future non-active items as upcoming', () => {
    const items = [{ id: 'future', d: new Date(2026, 6, 25, 9), s: 'completed' }];
    const out = groupByRecency(items, getDate, getStatus, now);
    expect(out.map((g) => g.key)).toEqual(['upcoming']);
  });

  it('resolves relative day/week/month bands', () => {
    const items = [
      { id: 'today', d: new Date(2026, 6, 22, 8) },
      { id: 'yesterday', d: new Date(2026, 6, 21, 8) },
      { id: 'thisWeek', d: new Date(2026, 6, 20, 8) },
      { id: 'lastWeek', d: new Date(2026, 6, 15, 8) },
      { id: 'thisMonth', d: new Date(2026, 6, 5, 8) },
      { id: 'lastMonth', d: new Date(2026, 5, 15, 8) },
      { id: 'older', d: new Date(2026, 3, 1, 8) },
    ];
    const out = groupByRecency(items, getDate, undefined, now);
    expect(out.map((g) => g.key)).toEqual([
      'today',
      'yesterday',
      'this_week',
      'last_week',
      'this_month',
      'last_month',
      'older',
    ]);
    expect(out.map((g) => g.items[0].id)).toEqual([
      'today',
      'yesterday',
      'thisWeek',
      'lastWeek',
      'thisMonth',
      'lastMonth',
      'older',
    ]);
  });

  it('sends bad or missing dates to older', () => {
    const items = [
      { id: 'bad', d: 'not-a-date', s: 'completed' },
      { id: 'missing', d: null, s: 'completed' },
    ];
    const out = groupByRecency(items, getDate, getStatus, now);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('older');
    expect(out[0].items.map((i) => i.id).sort()).toEqual(['bad', 'missing']);
  });

  it('orders items newest-first within a bucket', () => {
    const items = [
      { id: 'earlier', d: new Date(2026, 6, 22, 8), s: 'completed' },
      { id: 'later', d: new Date(2026, 6, 22, 10), s: 'completed' },
    ];
    const out = groupByRecency(items, getDate, getStatus, now);
    expect(out[0].key).toBe('today');
    expect(out[0].items.map((i) => i.id)).toEqual(['later', 'earlier']);
  });

  it('is safe on non-array input', () => {
    expect(groupByRecency(null, getDate, getStatus, now)).toEqual([]);
    expect(groupByRecency(undefined, getDate, getStatus, now)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const items = [
      { id: 'a', d: new Date(2026, 6, 22, 8), s: 'completed' },
      { id: 'b', d: new Date(2026, 6, 21, 8), s: 'completed' },
    ];
    const copy = [...items];
    groupByRecency(items, getDate, getStatus, now);
    expect(items).toEqual(copy);
  });
});
