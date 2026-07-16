import { getAmbulancesPageData } from './ambulancesService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: (query) => query,
}));

const HOSPITAL_ID = '11111111-1111-4111-8111-111111111111';
const queryStates = [];
let resolveQuery;

const flushMicrotasks = async () => {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

function makeBuilder(table) {
  const state = { table, options: null, range: null, signal: null };
  queryStates.push(state);
  const builder = {};

  builder.select = (_columns, options) => {
    state.options = options || null;
    return builder;
  };
  ['eq', 'in', 'or', 'gte', 'lte', 'order'].forEach((method) => {
    builder[method] = () => builder;
  });
  builder.range = (start, end) => {
    state.range = [start, end];
    return builder;
  };
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

describe('ambulance page query cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('threads one scoped signal through list, count, stats, and enrichment reads', async () => {
    resolveQuery = (state) => {
      if (state.table === 'hospitals') {
        return { data: [{ id: HOSPITAL_ID, name: 'Central' }], error: null, count: null };
      }
      if (state.range) {
        return {
          data: [{ id: 'unit-1', hospital_id: HOSPITAL_ID, call_sign: 'UNIT-1' }],
          error: null,
          count: null,
        };
      }
      return { data: null, error: null, count: 1 };
    };

    const result = await getAmbulancesPageData();

    expect(result.data[0]).toMatchObject({ hospital: 'Central', station_name: 'Central' });
    // 11 = list + exact count + 8 status head-counts (ADOPT-38 added exact
    // returning/offline/pending_approval counts) + hospitals enrichment.
    expect(queryStates).toHaveLength(11);
    expect(queryStates.every((state) => state.signal instanceof AbortSignal)).toBe(true);
    expect(new Set(queryStates.map((state) => state.signal)).size).toBe(1);
  });

  it('aborts every underlying request at the deadline without a service retry', async () => {
    jest.useFakeTimers();
    resolveQuery = pendingUntilAbort;

    const result = getAmbulancesPageData();
    const rejection = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
      code: 'QUERY_TIMEOUT',
    });
    await flushMicrotasks();

    // 10 = list + exact count + 8 status head-counts; enrichment never starts
    // because the deadline aborts first, and no retry may add an 11th.
    expect(queryStates).toHaveLength(10);
    jest.advanceTimersByTime(8000);
    await rejection;

    expect(queryStates).toHaveLength(10);
    expect(queryStates.every((state) => state.signal?.aborted)).toBe(true);
  });
});
