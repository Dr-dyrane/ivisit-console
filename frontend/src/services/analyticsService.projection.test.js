import { getAnalyticsIntakePage } from './analyticsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('./profilesService', () => ({ getUserStatistics: jest.fn() }));
jest.mock('./emergencyService', () => ({ getEmergencyRequests: jest.fn() }));
jest.mock('./hospitalsService', () => ({ getHospitals: jest.fn() }));
jest.mock('./ambulancesService', () => ({ getAmbulances: jest.fn() }));
jest.mock('./walletService', () => ({ getFinanceAnalytics: jest.fn() }));
jest.mock('./subscriptionService', () => ({
  DEFAULT_ANALYTICS_SUBSCRIPTION_STATS: {
    total: 0,
    active: 0,
    paid: 0,
    free: 0,
  },
  getSubscriptionAnalytics: jest.fn(),
}));

const queryStates = [];
const hospitalRows = Array.from({ length: 1598 }, (_, index) => ({
  id: `hospital-${index + 1}`,
  total_beds: 20,
  available_beds: 5,
  icu_beds_available: 2,
}));

function responseFor(state) {
  if (state.table === 'emergency_requests') {
    return { data: [{ id: 'request-1', status: 'completed' }], count: 1, error: null };
  }
  if (state.table === 'profiles') {
    return { data: null, count: 12, error: null };
  }
  if (state.table === 'hospitals') {
    const [from, to] = state.range || [0, 999];
    return {
      data: hospitalRows.slice(from, to + 1),
      count: state.options?.count === 'exact' ? hospitalRows.length : null,
      error: null,
    };
  }
  if (state.table === 'ambulances') {
    return { data: null, count: 7, error: null };
  }
  return { data: null, count: 0, error: null };
}

function makeBuilder(table) {
  const state = { table, select: null, options: null, filters: [], limit: null, range: null, order: null };
  queryStates.push(state);
  const builder = {};

  builder.select = (select, options) => {
    state.select = select;
    state.options = options || null;
    return builder;
  };
  ['eq', 'in', 'gte'].forEach((method) => {
    builder[method] = (...args) => {
      state.filters.push({ method, args });
      return builder;
    };
  });
  builder.limit = (limit) => {
    state.limit = limit;
    return builder;
  };
  builder.order = (...args) => {
    state.order = args;
    return builder;
  };
  builder.range = (from, to) => {
    state.range = [from, to];
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => Promise.resolve(responseFor(state)).then(onFulfilled, onRejected);
  return builder;
}

describe('analytics intake projection integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    applyAuthFilter.mockImplementation((query) => query);
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  it('uses count-only network projections and pages the complete hospital capacity set', async () => {
    const projection = await getAnalyticsIntakePage({ timeRange: '7d' });

    const profilesQuery = queryStates.find((state) => state.table === 'profiles');
    const ambulancesQuery = queryStates.find((state) => state.table === 'ambulances');
    const hospitalsQueries = queryStates.filter((state) => state.table === 'hospitals');

    expect(profilesQuery).toMatchObject({ select: 'id', options: { count: 'exact', head: true } });
    expect(ambulancesQuery).toMatchObject({ select: 'id', options: { count: 'exact', head: true } });
    expect(hospitalsQueries[0]).toMatchObject({
      select: 'id, total_beds, available_beds, icu_beds_available',
      options: { count: 'exact' },
      order: ['id', { ascending: true }],
      range: [0, 999],
    });
    expect(hospitalsQueries[1]).toMatchObject({
      select: 'id, total_beds, available_beds, icu_beds_available',
      range: [1000, 1999],
    });
    expect(projection.usersCount).toBe(12);
    expect(projection.ambulancesCount).toBe(7);
    expect(projection.hospitalsCount).toBe(1598);
    expect(projection.hospitalSample).toEqual({
      returnedCount: 1598,
      totalCount: 1598,
      limit: 1000,
      complete: true,
    });
    expect(projection.sourceIssues).not.toContainEqual(expect.objectContaining({ source: 'hospitals' }));
  });

  it('uses a provider organization link when hospital ids are not populated', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'provider-1',
      role: 'provider',
      organization_id: 'organization-1',
      hospital_ids: null,
    });

    await getAnalyticsIntakePage({ timeRange: '7d' });

    const hospitalsQuery = queryStates.find((state) => state.table === 'hospitals');
    const ambulancesQuery = queryStates.find((state) => state.table === 'ambulances');
    expect(hospitalsQuery.filters).toContainEqual({
      method: 'eq',
      args: ['organization_id', 'organization-1'],
    });
    expect(ambulancesQuery.filters).toContainEqual({
      method: 'eq',
      args: ['organization_id', 'organization-1'],
    });
    expect(hospitalsQuery.filters).not.toContainEqual({
      method: 'eq',
      args: ['id', '00000000-0000-0000-0000-000000000000'],
    });
  });
});
