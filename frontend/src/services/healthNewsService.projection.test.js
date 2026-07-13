import { getHealthNewsPage } from './healthNewsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
}));

const queryStates = [];
let rowProjectionError = null;
let statsProjectionError = null;

function makeBuilder(table) {
  const state = { table, select: null, options: null, filters: [], order: null, range: null };
  queryStates.push(state);
  const builder = {};

  builder.select = (select, options) => {
    state.select = select;
    state.options = options || null;
    return builder;
  };
  ['eq', 'gt', 'gte', 'lte', 'or'].forEach((method) => {
    builder[method] = (...args) => {
      state.filters.push({ method, args });
      return builder;
    };
  });
  builder.order = (column, options) => {
    state.order = { column, options };
    return builder;
  };
  builder.range = (start, end) => {
    state.range = [start, end];
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => {
    const statsQuery = state.options?.head || state.select === 'category';
    const queryError = statsQuery ? statsProjectionError : rowProjectionError;
    let result;

    if (queryError) {
      result = { data: null, count: null, error: queryError };
    } else if (state.options?.head) {
      result = { data: null, count: 1, error: null };
    } else if (state.select === 'category') {
      result = { data: [{ category: 'medical' }], count: null, error: null };
    } else {
      result = {
        data: [{
          id: 'news-1',
          title: 'Verified update',
          source: 'Health Authority',
          category: 'medical',
          published: true,
          created_at: '2026-07-13T12:00:00.000Z',
          url: 'https://example.com/update',
        }],
        count: 1,
        error: null,
      };
    }

    return Promise.resolve(result).then(onFulfilled, onRejected);
  };

  return builder;
}

describe('health news page projection integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    rowProjectionError = null;
    statsProjectionError = null;
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  it('keeps readable rows when an auxiliary statistics query fails', async () => {
    statsProjectionError = { code: '57014', message: 'statistics query timed out' };

    const projection = await getHealthNewsPage({ limit: 20, offset: 0, quiet: true });

    expect(projection.data).toHaveLength(1);
    expect(projection.data[0]).toMatchObject({
      id: 'news-1',
      title: 'Verified update',
      source_url_valid: true,
    });
    expect(projection.count).toBe(1);
    expect(projection.stats).toMatchObject({
      available: false,
      exactCounts: false,
      reason: 'stats_query_failed',
      scope: 'published_feed',
    });
    expect(projection.stats.total).toBeNull();
  });

  it('still fails closed when the primary row projection fails', async () => {
    rowProjectionError = { code: '42501', message: 'row projection denied' };

    await expect(getHealthNewsPage({ quiet: true })).rejects.toMatchObject({ code: '42501' });
  });

  it('owns the exact page count on the primary row query', async () => {
    await getHealthNewsPage({ limit: 20, offset: 20, quiet: true });

    const rowsState = queryStates.find((state) => state.select === '*' && !state.options?.head);
    expect(rowsState?.options).toEqual({ count: 'exact' });
    expect(rowsState?.range).toEqual([20, 39]);
  });
});
