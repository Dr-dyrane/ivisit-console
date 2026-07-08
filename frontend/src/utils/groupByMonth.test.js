import { groupByMonth, monthLabel, timeOf } from './groupByMonth';

describe('monthLabel', () => {
  it('formats a parseable date as "Month YYYY"', () => {
    expect(monthLabel('2026-05-14T10:00:00Z')).toBe('May 2026');
  });
  it('returns null for absent/unparseable values', () => {
    expect(monthLabel(null)).toBeNull();
    expect(monthLabel('')).toBeNull();
    expect(monthLabel('not-a-date')).toBeNull();
  });
});

describe('timeOf', () => {
  it('returns epoch ms for a date and 0 for junk', () => {
    expect(timeOf('2026-01-01T00:00:00Z')).toBeGreaterThan(0);
    expect(timeOf(null)).toBe(0);
    expect(timeOf('nope')).toBe(0);
  });
});

describe('groupByMonth', () => {
  const get = (x) => x.d;

  // Fixtures use mid-month midday UTC so no real timezone offset (<=14h) can shift the
  // local month, matching the flagship's local toLocaleDateString grouping.
  it('sorts newest-first and marks a header at each month boundary', () => {
    const items = [
      { id: 'a', d: '2026-03-15T12:00:00Z' },
      { id: 'b', d: '2026-05-10T12:00:00Z' },
      { id: 'c', d: '2026-05-25T12:00:00Z' },
      { id: 'd', d: '2026-04-15T12:00:00Z' },
    ];
    const out = groupByMonth(items, get);
    expect(out.map((o) => o.item.id)).toEqual(['c', 'b', 'd', 'a']); // desc by date
    expect(out.map((o) => o.header)).toEqual(['May 2026', null, 'April 2026', 'March 2026']);
  });

  it('emits no header for undated rows and sinks them to the bottom', () => {
    const items = [
      { id: 'x', d: null },
      { id: 'y', d: '2026-06-15T12:00:00Z' },
    ];
    const out = groupByMonth(items, get);
    expect(out.map((o) => o.item.id)).toEqual(['y', 'x']);
    expect(out.map((o) => o.header)).toEqual(['June 2026', null]);
  });

  it('does not mutate the input array', () => {
    const items = [{ id: 'a', d: '2026-01-01' }, { id: 'b', d: '2026-02-01' }];
    const copy = [...items];
    groupByMonth(items, get);
    expect(items).toEqual(copy);
  });

  it('is safe on non-array input', () => {
    expect(groupByMonth(null, get)).toEqual([]);
    expect(groupByMonth(undefined, get)).toEqual([]);
  });
});
