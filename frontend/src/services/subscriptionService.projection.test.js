import {
  getSubscriptionsPage,
  SUBSCRIPTION_PROJECTION_ERROR_MESSAGE,
} from './subscriptionService';
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

const filtersFor = (state, column) => state.filters.filter((filter) => filter.args[0] === column);
const hasFilter = (state, method, column, value) => state.filters.some((filter) => (
  filter.method === method
  && filter.args[0] === column
  && (value === undefined || filter.args[1] === value)
));

function makeBuilder(table) {
  const state = { table, select: null, options: null, filters: [], orders: [], range: null };
  queryStates.push(state);
  const builder = {};

  builder.select = (select, options) => {
    state.select = select;
    state.options = options || null;
    return builder;
  };
  ['eq', 'in', 'not', 'ilike', 'gte', 'lte'].forEach((method) => {
    builder[method] = (...args) => {
      state.filters.push({ method, args });
      return builder;
    };
  });
  builder.order = (column, options) => {
    state.orders.push({ column, options: options || {} });
    return builder;
  };
  builder.range = (start, end) => {
    state.range = [start, end];
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => Promise.resolve(
    (state.options?.head ? statsProjectionError : rowProjectionError)
      ? { data: null, count: null, error: state.options?.head ? statsProjectionError : rowProjectionError }
      : state.options?.head
        ? { data: null, count: 1, error: null }
        : { data: [{ id: 'subscriber-1', email: 'user@example.com' }], count: 1, error: null },
  ).then(onFulfilled, onRejected);
  return builder;
}

describe('subscription page projection integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    rowProjectionError = null;
    statsProjectionError = null;
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  it('strips only the KPI bucket dimension while preserving unrelated filters', async () => {
    await getSubscriptionsPage({
      search: 'example',
      status: ['active'],
      type: ['paid'],
      kpiFilter: 'unsubscribed',
      dateRange: '30d',
      quiet: true,
    });

    const countStates = queryStates.filter((state) => state.options?.head);
    expect(countStates).toHaveLength(8);

    const totalState = countStates.find((state) => (
      filtersFor(state, 'status').length === 0
      && filtersFor(state, 'type').length === 0
      && filtersFor(state, 'new_user').length === 0
      && filtersFor(state, 'welcome_email_sent').length === 0
    ));
    expect(totalState).toBeDefined();

    const activeState = countStates.find((state) => hasFilter(state, 'eq', 'status', 'active'));
    expect(activeState).toBeDefined();
    expect(hasFilter(activeState, 'in', 'type')).toBe(true);
    expect(hasFilter(activeState, 'in', 'status')).toBe(false);

    const paidState = countStates.find((state) => hasFilter(state, 'eq', 'type', 'paid'));
    expect(paidState).toBeDefined();
    expect(hasFilter(paidState, 'in', 'status')).toBe(true);
    expect(hasFilter(paidState, 'in', 'type')).toBe(false);

    countStates.forEach((state) => {
      expect(hasFilter(state, 'ilike', 'email')).toBe(true);
      expect(hasFilter(state, 'gte', 'created_at')).toBe(true);
    });
  });

  it('never exposes a backend error message through the page projection', async () => {
    rowProjectionError = { code: '42501', message: 'secret policy and table detail' };

    const projection = await getSubscriptionsPage({ quiet: true });

    expect(projection.failed).toBe(true);
    expect(projection.errorMessage).toBe(SUBSCRIPTION_PROJECTION_ERROR_MESSAGE);
    expect(projection.errorMessage).not.toContain('secret');
  });

  it('keeps readable rows when an auxiliary statistics query fails', async () => {
    statsProjectionError = { code: '57014', message: 'statistics query timed out' };

    const projection = await getSubscriptionsPage({ quiet: true });

    expect(projection.failed).toBe(false);
    expect(projection.data).toEqual([{ id: 'subscriber-1', email: 'user@example.com' }]);
    expect(projection.count).toBe(1);
    expect(projection.stats).toMatchObject({
      available: false,
      exactCounts: false,
      reason: 'stats_query_failed',
      scope: 'admin_subscriber_projection',
    });
    expect(projection.stats.total).toBeNull();
  });

  it('applies the FilterSheet start and end date contract to rows and exact counts', async () => {
    await getSubscriptionsPage({
      dateRange: { start: '2026-07-01', end: '2026-07-10' },
      quiet: true,
    });

    expect(queryStates).toHaveLength(9);
    queryStates.forEach((state) => {
      expect(hasFilter(state, 'gte', 'created_at', '2026-07-01T00:00:00.000Z')).toBe(true);
      expect(hasFilter(state, 'lte', 'created_at', '2026-07-10T23:59:59.999Z')).toBe(true);
    });
  });

  it('reads later mobile windows as fixed offset pages', async () => {
    await getSubscriptionsPage({ limit: 20, offset: 100, quiet: true });

    const rowsState = queryStates.find((state) => state.select === '*' && !state.options?.head);
    expect(rowsState?.range).toEqual([100, 119]);
  });
});
