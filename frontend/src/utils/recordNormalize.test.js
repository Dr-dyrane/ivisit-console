import { dedupeByIdKeepNewest, recordIdentity } from './recordNormalize';

describe('dedupeByIdKeepNewest', () => {
  it('keeps the newest row per id (newest-wins) regardless of input order', () => {
    const older = { id: 'a', updated_at: '2026-01-01T00:00:00Z', v: 'old' };
    const newer = { id: 'a', updated_at: '2026-06-01T00:00:00Z', v: 'new' };

    // newer appears last
    expect(dedupeByIdKeepNewest([older, newer])).toEqual([newer]);
    // newer appears first -> still wins, still one row
    expect(dedupeByIdKeepNewest([newer, older])).toEqual([newer]);
  });

  it('is idempotent: re-running on a deduped list is a structural no-op', () => {
    const list = [
      { id: 'a', updated_at: '2026-01-01T00:00:00Z', v: 1 },
      { id: 'b', updated_at: '2026-02-01T00:00:00Z', v: 2 },
      { id: 'a', updated_at: '2026-05-01T00:00:00Z', v: 3 },
      { id: 'c', updated_at: '2026-03-01T00:00:00Z', v: 4 },
    ];

    const once = dedupeByIdKeepNewest(list);
    const twice = dedupeByIdKeepNewest(once);

    expect(twice).toEqual(once);
    // stronger no-op guarantee: same array length and same object references
    expect(twice).toHaveLength(once.length);
    twice.forEach((row, i) => expect(row).toBe(once[i]));
  });

  it('preserves first-occurrence position while swapping in the newer content', () => {
    const list = [
      { id: 'a', updated_at: 1, v: 'a-old' },
      { id: 'b', updated_at: 1, v: 'b' },
      { id: 'a', updated_at: 2, v: 'a-new' },
    ];
    // 'a' keeps slot 0 but takes the newer content; 'b' stays at slot 1.
    expect(dedupeByIdKeepNewest(list)).toEqual([
      { id: 'a', updated_at: 2, v: 'a-new' },
      { id: 'b', updated_at: 1, v: 'b' },
    ]);
  });

  it('breaks ties and missing timestamps deterministically (first-seen wins)', () => {
    const first = { id: 'a', v: 'first' };
    const second = { id: 'a', v: 'second' };
    expect(dedupeByIdKeepNewest([first, second])).toEqual([first]);

    const tie1 = { id: 'a', updated_at: '2026-01-01T00:00:00Z', v: 'tie1' };
    const tie2 = { id: 'a', updated_at: '2026-01-01T00:00:00Z', v: 'tie2' };
    expect(dedupeByIdKeepNewest([tie1, tie2])).toEqual([tie1]);
  });

  it('keeps unidentifiable (null/undefined id) rows in place without collapsing', () => {
    const list = [
      { id: null, v: 1 },
      { id: 'a', updated_at: 1 },
      { v: 2 }, // no id at all
      { id: 'a', updated_at: 2 },
    ];
    expect(dedupeByIdKeepNewest(list)).toEqual([
      { id: null, v: 1 },
      { id: 'a', updated_at: 2 },
      { v: 2 },
    ]);
  });

  it('supports custom getId / getTs selectors', () => {
    const list = [
      { key: 'x', rev: 5, tag: 'stale' },
      { key: 'x', rev: 9, tag: 'fresh' },
    ];
    const out = dedupeByIdKeepNewest(list, (r) => r.key, (r) => r.rev);
    expect(out).toEqual([{ key: 'x', rev: 9, tag: 'fresh' }]);
  });

  it('returns an empty array for non-array input', () => {
    expect(dedupeByIdKeepNewest(null)).toEqual([]);
    expect(dedupeByIdKeepNewest(undefined)).toEqual([]);
    expect(dedupeByIdKeepNewest('nope')).toEqual([]);
  });
});

describe('recordIdentity', () => {
  it('returns fully-populated fallbacks for an empty object', () => {
    expect(recordIdentity({})).toEqual({
      id: null,
      primary: 'Untitled record',
      secondary: '',
      status: 'unknown',
      meta: '',
    });
  });

  it('returns the same safe fallbacks for null / undefined / non-object input', () => {
    const fallback = {
      id: null,
      primary: 'Untitled record',
      secondary: '',
      status: 'unknown',
      meta: '',
    };
    expect(recordIdentity(null)).toEqual(fallback);
    expect(recordIdentity(undefined)).toEqual(fallback);
    expect(recordIdentity(42)).toEqual(fallback);
  });

  it('treats blank/whitespace-only fields as empty and applies fallbacks', () => {
    const out = recordIdentity({ id: 'r1', name: '   ', status: '  ' });
    // name is blank -> falls through to the resolved id as the primary anchor
    expect(out.primary).toBe('r1');
    expect(out.status).toBe('unknown');
    expect(out.secondary).toBe('');
  });

  it('resolves an id from the fallback ladder', () => {
    expect(recordIdentity({ request_id: 'req-9' }).id).toBe('req-9');
    expect(recordIdentity({ display_id: 'D-3' }).id).toBe('D-3');
    expect(recordIdentity({ id: 7 }).id).toBe(7);
  });

  it('projects a visit-shaped row onto the generic identity contract', () => {
    const visit = {
      id: 'v1',
      hospital_name: 'St. Mary General',
      service_type: 'Emergency',
      status: 'in_progress',
      created_at: '2026-07-01T10:00:00Z',
    };
    expect(recordIdentity(visit)).toEqual({
      id: 'v1',
      primary: 'St. Mary General',
      secondary: 'Emergency',
      status: 'in_progress',
      meta: '2026-07-01T10:00:00Z',
    });
  });

  it('projects an emergency-shaped row and normalizes status casing', () => {
    const emergency = {
      request_id: 'ER-42',
      patient_name: 'Jane Doe',
      type: 'Cardiac',
      status: 'DISPATCHED',
      location: 'Zone 4',
    };
    expect(recordIdentity(emergency)).toEqual({
      id: 'ER-42',
      primary: 'Jane Doe',
      secondary: 'Cardiac',
      status: 'dispatched',
      meta: 'Zone 4',
    });
  });

  it('falls back to the resolved id for primary when no label field exists', () => {
    expect(recordIdentity({ id: 'only-id' }).primary).toBe('only-id');
  });
});
