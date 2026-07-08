/**
 * doctorsService.getDoctors - L1 hardening (withRetry) behavior test.
 *
 * Covers Step S2-5: the primary doctors read is wrapped with withRetry so a
 * transient failure is retried with backoff, while a non-retryable error still
 * throws on the first attempt (behavior preserved).
 *
 * Supabase / auth / displayId dependencies are mocked so no real client or env
 * vars are required. The mock query builder is a chainable thenable that yields
 * a queued response per await, and a fresh builder is returned per from() call
 * (matching how withRetry rebuilds the single-use Supabase builder each attempt).
 */

import { getDoctors } from './doctorsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';
import { getDisplayIds } from './displayIdService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('./displayIdService', () => ({
  getDisplayIds: jest.fn(),
}));

const BUILDER_METHODS = ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'range'];

// Build a chainable, thenable mock query builder. Each await consumes one
// response from the shared FIFO queue.
function makeBuilder(responses) {
  const builder = {};
  BUILDER_METHODS.forEach((method) => {
    builder[method] = () => builder;
  });
  builder.then = (onFulfilled, onRejected) => {
    const response = responses.length
      ? responses.shift()
      : { data: null, error: null, count: 0 };
    return Promise.resolve(response).then(onFulfilled, onRejected);
  };
  return builder;
}

describe('doctorsService.getDoctors withRetry hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'admin' });
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('retries the primary read after a transient error, then resolves with server truth', async () => {
    const responses = [
      // attempt 1: transient network error -> retryable
      { data: null, error: { message: 'network fetch failed' }, count: null },
      // attempt 2: success
      { data: [{ id: 'doc-1', profile_id: 'prof-1' }], error: null, count: 1 },
      // getDoctorPageStats: five exact-count reads
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
    ];
    supabase.from.mockImplementation(() => makeBuilder(responses));
    getDisplayIds.mockResolvedValue(new Map([['prof-1', 'PRV-000001']]));

    const result = await getDoctors({ quiet: true });

    // Resolving with the SECOND response's row proves the transient error was
    // retried rather than thrown.
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('doc-1');
    expect(result.data[0].display_id).toBe('PRV-000001');
    expect(result.count).toBe(1);
    // Primary read consumed at least two from() calls (fail + retry).
    expect(supabase.from.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not retry a non-retryable RLS error and rejects on the first attempt', async () => {
    const responses = [
      { data: null, error: { code: '42501', message: 'permission denied' }, count: null },
    ];
    supabase.from.mockImplementation(() => makeBuilder(responses));

    await expect(getDoctors({ quiet: true })).rejects.toMatchObject({ code: '42501' });
    // Exactly one primary read attempt; stats reads are never reached.
    expect(supabase.from.mock.calls.length).toBe(1);
  });
});
