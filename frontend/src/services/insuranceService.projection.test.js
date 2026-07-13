import {
  getInsuranceBillingOutcomeStats,
  getInsurancePage,
  getInsurancePageStats,
} from './insuranceService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
}));

const queryStates = [];
let projectionError = null;

const filtersFor = (state, column) => state.filters.filter((filter) => filter.args[0] === column);
const hasFilter = (state, method, column, value) => state.filters.some((filter) => (
  filter.method === method
  && (column === undefined || filter.args[0] === column)
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
  ['eq', 'in', 'ilike', 'lte', 'gte', 'or'].forEach((method) => {
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
    projectionError
      ? { data: null, count: null, error: projectionError }
      : state.options?.head
        ? { data: null, count: 1, error: null }
        : { data: [], count: 0, error: null },
  ).then(onFulfilled, onRejected);
  return builder;
}

describe('insurance projection integrity', () => {
  const admin = { id: 'admin-1', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    projectionError = null;
    getCurrentUser.mockResolvedValue(admin);
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  it('keeps status and verification KPI axes independent', async () => {
    await getInsurancePageStats({
      search: 'Acme',
      status: ['pending'],
      verified: 'unverified',
      type: 'Gold',
      kpiFilter: 'expired',
      created_at: { start: '2026-01-01', end: '2026-12-31' },
    }, admin, true);

    const countStates = queryStates.filter((state) => state.options?.head);
    expect(countStates).toHaveLength(7);

    const totalState = countStates.find((state) => (
      filtersFor(state, 'status').length === 0
      && filtersFor(state, 'verified').length === 0
    ));
    expect(totalState).toBeDefined();

    const activeState = countStates.find((state) => hasFilter(state, 'eq', 'status', 'active'));
    expect(activeState).toBeDefined();
    expect(hasFilter(activeState, 'eq', 'verified', false)).toBe(true);

    const verifiedState = countStates.find((state) => hasFilter(state, 'eq', 'verified', true));
    expect(verifiedState).toBeDefined();
    expect(hasFilter(verifiedState, 'eq', 'status', 'pending')).toBe(true);

    countStates.forEach((state) => {
      expect(hasFilter(state, 'ilike', 'plan_type')).toBe(true);
      expect(hasFilter(state, 'or')).toBe(true);
    });
    expect(hasFilter(totalState, 'eq', 'status', 'expired')).toBe(false);
  });

  it('strips the selected billing status before calculating sibling outcomes', async () => {
    await getInsuranceBillingOutcomeStats({ status: 'paid', hospitalId: 'hospital-1' }, admin, true);

    const countStates = queryStates.filter((state) => state.options?.head);
    expect(countStates).toHaveLength(5);
    const statusValues = countStates.map((state) => (
      filtersFor(state, 'status')[0]?.args[1] || null
    ));
    expect(statusValues).toEqual(expect.arrayContaining([null, 'pending', 'approved', 'paid', 'rejected']));
    countStates.forEach((state) => {
      expect(hasFilter(state, 'eq', 'hospital_id', 'hospital-1')).toBe(true);
    });
  });

  it('returns operator-safe copy when a policy projection fails', async () => {
    projectionError = { code: '42703', message: 'secret insurance column detail' };

    const projection = await getInsurancePage({ quiet: true, limit: 20, offset: 0 });

    expect(projection.failed).toBe(true);
    expect(projection.errorMessage).toBe('Insurance policies could not load. Try again.');
    expect(projection.errorMessage).not.toContain('secret');
  });
});
