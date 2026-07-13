import { getVisitsPageData } from './visitsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: (query) => query,
}));

const queryStates = [];
let resolveQuery;

const flushMicrotasks = async () => {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

function makeBuilder(table) {
  const state = { table, signal: null };
  queryStates.push(state);
  const builder = {};

  ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'range'].forEach((method) => {
    builder[method] = () => builder;
  });
  builder.abortSignal = (signal) => {
    state.signal = signal;
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => (
    Promise.resolve().then(() => resolveQuery(state)).then(onFulfilled, onRejected)
  );

  return builder;
}

const pendingUntilAbort = (state) => new Promise((resolve) => {
  const finish = () => resolve({
    data: null,
    count: null,
    error: { name: 'AbortError', message: 'request aborted' },
  });
  if (state.signal?.aborted) finish();
  else state.signal?.addEventListener('abort', finish, { once: true });
});

describe('visits page query cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('threads one scoped signal through source and every enrichment read', async () => {
    resolveQuery = (state) => {
      if (state.table === 'visits') {
        return {
          data: [{
            id: 'visit-1',
            user_id: 'user-1',
            request_id: 'request-1',
            hospital_id: 'hospital-1',
            status: 'scheduled',
          }],
          count: 1,
          error: null,
        };
      }
      if (state.table === 'profiles') {
        return { data: [{ id: 'user-1', full_name: 'Patient One' }], error: null };
      }
      if (state.table === 'emergency_requests') {
        return {
          data: [{ id: 'request-1', hospital_id: 'hospital-1', assigned_doctor_id: 'doctor-1' }],
          error: null,
        };
      }
      if (state.table === 'doctors') {
        return { data: [{ id: 'doctor-1', name: 'Doctor One' }], error: null };
      }
      return { data: [{ id: 'hospital-1', name: 'Central' }], error: null };
    };

    const result = await getVisitsPageData({ quiet: true });

    expect(result.visits[0]).toMatchObject({
      patient: { full_name: 'Patient One' },
      doctor_name: 'Doctor One',
      hospital_name: 'Central',
    });
    expect(queryStates).toHaveLength(5);
    expect(queryStates.every((state) => state.signal instanceof AbortSignal)).toBe(true);
    expect(new Set(queryStates.map((state) => state.signal)).size).toBe(1);
  });

  it('keeps transient retry at the service owner inside one request budget', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    let attempts = 0;
    resolveQuery = (state) => {
      if (state.table !== 'visits') return { data: [], error: null };
      attempts += 1;
      if (attempts === 1) {
        return { data: null, count: null, error: { message: 'network fetch failed' } };
      }
      return { data: [], count: 0, error: null };
    };

    const result = getVisitsPageData({ quiet: true });
    await flushMicrotasks();
    expect(attempts).toBe(1);

    jest.advanceTimersByTime(500);
    await expect(result).resolves.toMatchObject({ visits: [], count: 0 });

    expect(attempts).toBe(2);
    expect(queryStates.filter((state) => state.table === 'visits')).toHaveLength(2);
    expect(new Set(queryStates.map((state) => state.signal)).size).toBe(1);
  });

  it('aborts the source read at the deadline and does not retry the timeout', async () => {
    jest.useFakeTimers();
    resolveQuery = pendingUntilAbort;

    const result = getVisitsPageData({ quiet: true });
    const rejection = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
      code: 'QUERY_TIMEOUT',
    });
    await flushMicrotasks();

    expect(queryStates.filter((state) => state.table === 'visits')).toHaveLength(1);
    jest.advanceTimersByTime(8000);
    await rejection;

    expect(queryStates.filter((state) => state.table === 'visits')).toHaveLength(1);
    expect(queryStates[0].signal?.aborted).toBe(true);
  });
});
