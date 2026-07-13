import {
  getInsuranceBillingOutcomes,
  getInsuranceBillingOutcomeStats,
  getInsurancePage,
  getInsurancePageStats,
  normalizeInsuranceBillingOutcome,
  normalizeInsurancePolicy,
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
let projectionRows = {};

const filtersFor = (state, column) => state.filters.filter((filter) => filter.args[0] === column);
const hasFilter = (state, method, column, value) => state.filters.some((filter) => (
  filter.method === method
  && (column === undefined || filter.args[0] === column)
  && (value === undefined || filter.args[1] === value)
));

function makeBuilder(table) {
  const state = {
    table,
    select: null,
    options: null,
    filters: [],
    orders: [],
    range: null,
    abortSignals: [],
  };
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
  builder.abortSignal = (signal) => {
    state.abortSignals.push(signal);
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => Promise.resolve(
    projectionError
      ? { data: null, count: null, error: projectionError }
      : state.options?.head
        ? { data: null, count: 1, error: null }
        : { data: projectionRows[table] || [], count: 0, error: null },
  ).then(onFulfilled, onRejected);
  return builder;
}

describe('insurance projection integrity', () => {
  const admin = { id: 'admin-1', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    projectionError = null;
    projectionRows = {};
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

  it('denies unauthenticated and non-admin policy or billing reads before querying', async () => {
    getCurrentUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'org-admin-1', role: 'org_admin', organization_id: 'org-1' });

    await expect(getInsurancePage()).resolves.toMatchObject({
      data: [],
      count: 0,
      denied: true,
      reason: 'not_authenticated',
      failed: false,
      exactCounts: true,
      scope: 'admin_policy_projection',
    });
    await expect(getInsuranceBillingOutcomes()).resolves.toMatchObject({
      data: [],
      count: 0,
      denied: true,
      reason: 'admin_only',
      failed: false,
      exactCounts: true,
      scope: 'admin_billing_outcome_projection',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('preserves policy parser fallbacks across object, JSON, scalar, and malformed shapes', () => {
    const linkedPayment = { id: 'payment-1', type: 'card' };
    const normalized = normalizeInsurancePolicy({
      id: 'policy-uuid',
      user_id: 'patient-uuid',
      status: ' ACTIVE ',
      plan_type: '',
      starts_at: '2026-01-01',
      expires_at: '2026-12-31',
      coverage_percentage: '80',
      coverage_details: JSON.stringify({
        coverage_type: 'PPO',
        policy_holder_name: 'Patient One',
        coverage_amount: 0,
        linked_payment_method_snapshot: linkedPayment,
      }),
    });

    expect(normalized).toMatchObject({
      id: 'policy-uuid',
      user_id: 'patient-uuid',
      status: 'active',
      coverage_type: 'PPO',
      policy_type: 'PPO',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      policy_holder_name: 'Patient One',
      linked_payment_method: linkedPayment,
      coverage_amount: 0,
      coverage_percentage: 80,
    });
    expect(normalizeInsurancePolicy({
      coverage_details: '{bad json',
      linked_payment_method: 'legacy-scalar',
    })).toMatchObject({
      status: 'unknown',
      coverage_type: '',
      linked_payment_method: 'legacy-scalar',
      coverage_amount: null,
      coverage_percentage: null,
    });
    expect(normalizeInsurancePolicy(null)).toBeNull();
  });

  it('preserves billing parser defaults and numeric coercion', () => {
    const normalized = normalizeInsuranceBillingOutcome({
      id: 'billing-uuid',
      insurance_policy_id: 'policy-uuid',
      status: 'UNKNOWN',
      claim_number: null,
      total_amount: '0',
      insurance_amount: '125.50',
      user_amount: 'not-a-number',
      coverage_percentage: null,
      billing_date: null,
      paid_date: null,
    });

    expect(normalized).toEqual({
      id: 'billing-uuid',
      insurance_policy_id: 'policy-uuid',
      status: 'pending',
      claim_number: '',
      total_amount: 0,
      insurance_amount: 125.5,
      user_amount: 0,
      coverage_percentage: null,
      billing_date: '',
      paid_date: '',
    });
    expect(normalizeInsuranceBillingOutcome(undefined)).toBeUndefined();
  });

  it('keeps policy search, exact count, sort allow-list, paging, and ignored abort behavior', async () => {
    const abortController = new AbortController();
    projectionRows.insurance_policies = [{
      id: 'policy-uuid',
      status: 'ACTIVE',
      plan_type: 'PPO',
      coverage_percentage: '75',
    }];

    const projection = await getInsurancePage({
      status: ['active', 'expired'],
      type: ' PPO,%_ ',
      verified: false,
      provider_name: 'Acme Health',
      created_at: { start: '2026-01-01', end: '2026-01-31' },
      search: ' Acme,%_ Gold ',
      sortKey: 'user_id',
      sortDirection: 'asc',
      offset: 20,
      limit: 20,
      abortSignal: abortController.signal,
    });

    const dataState = queryStates.find((state) => (
      state.table === 'insurance_policies' && !state.options?.head
    ));
    expect(projection).toMatchObject({
      count: 1,
      denied: false,
      failed: false,
      exactCounts: true,
      scope: 'admin_policy_projection',
      data: [{ id: 'policy-uuid', status: 'active', coverage_percentage: 75 }],
    });
    expect(hasFilter(dataState, 'in', 'status')).toBe(true);
    expect(hasFilter(dataState, 'ilike', 'plan_type', 'PPO ')).toBe(true);
    expect(hasFilter(dataState, 'eq', 'verified', false)).toBe(true);
    expect(hasFilter(dataState, 'eq', 'provider_name', 'Acme Health')).toBe(true);
    expect(dataState.filters).toContainEqual({
      method: 'or',
      args: ['policy_number.ilike.%Acme Gold%,provider_name.ilike.%Acme Gold%,plan_type.ilike.%Acme Gold%'],
    });
    expect(dataState.orders).toEqual([{ column: 'created_at', options: { ascending: true } }]);
    expect(dataState.range).toEqual([20, 39]);
    expect(dataState.abortSignals).toEqual([]);
  });

  it('keeps billing identity filters, exact count, search, allowed sort, and paging', async () => {
    projectionRows.insurance_billing = [{
      id: 'billing-uuid',
      insurance_policy_id: 'policy-uuid',
      status: 'PAID',
      total_amount: '50',
    }];

    const projection = await getInsuranceBillingOutcomes({
      status: 'paid',
      policyId: 'policy-uuid',
      policyIds: ['policy-uuid', 'policy-uuid-2'],
      userId: 'patient-uuid',
      hospitalId: 'hospital-uuid',
      emergencyRequestId: 'request-uuid',
      search: ' CLM,%_ 42 ',
      sortKey: 'paid_date',
      sortDirection: 'asc',
      offset: 10,
      limit: 10,
    });

    const dataState = queryStates.find((state) => (
      state.table === 'insurance_billing' && !state.options?.head
    ));
    expect(projection).toMatchObject({
      count: 1,
      denied: false,
      failed: false,
      exactCounts: true,
      scope: 'admin_billing_outcome_projection',
      data: [{
        id: 'billing-uuid',
        insurance_policy_id: 'policy-uuid',
        status: 'paid',
        total_amount: 50,
      }],
    });
    expect(hasFilter(dataState, 'eq', 'insurance_policy_id', 'policy-uuid')).toBe(true);
    expect(hasFilter(dataState, 'in', 'insurance_policy_id')).toBe(true);
    expect(hasFilter(dataState, 'eq', 'user_id', 'patient-uuid')).toBe(true);
    expect(hasFilter(dataState, 'eq', 'hospital_id', 'hospital-uuid')).toBe(true);
    expect(hasFilter(dataState, 'eq', 'emergency_request_id', 'request-uuid')).toBe(true);
    expect(dataState.filters).toContainEqual({
      method: 'or',
      args: ['claim_number.ilike.%CLM 42%'],
    });
    expect(dataState.orders).toEqual([{ column: 'paid_date', options: { ascending: true } }]);
    expect(dataState.range).toEqual([10, 19]);
    expect(queryStates.every((state) => state.table === 'insurance_billing')).toBe(true);
  });

  it('keeps quiet projection failures silent and returns exact failed-page boundaries', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    projectionError = { code: '42501', message: 'permission denied by RLS' };

    await expect(getInsurancePage({ quiet: true })).resolves.toEqual({
      data: [],
      count: 0,
      stats: {
        total: 0,
        active: 0,
        pending: 0,
        expired: 0,
        unverified: 0,
        verified: 0,
        expiringSoon: 0,
        exactCounts: true,
        scope: 'admin_policy_projection',
        failed: true,
        reason: 'query_failed',
      },
      denied: false,
      reason: 'query_failed',
      failed: true,
      errorMessage: 'Insurance policies could not load. Try again.',
      exactCounts: false,
      scope: 'admin_policy_projection',
    });
    expect(consoleError).not.toHaveBeenCalled();

    queryStates.length = 0;
    await getInsuranceBillingOutcomes({ quiet: false });
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching insurance billing outcomes:',
      projectionError
    );
    consoleError.mockRestore();
  });
});
