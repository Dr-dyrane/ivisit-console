import { getPricingPageData } from './pricingService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const daysAgo = (days) => new Date(Date.now() - (days * 86400000)).toISOString();

const serviceRows = [
  { id: 'service-1', hospital_id: 'hospital-1', service_name: 'Ambulance', service_type: 'ambulance', base_price: 120, updated_at: daysAgo(1) },
  { id: 'service-2', hospital_id: null, service_name: 'Bed', service_type: 'bed', base_price: 80, updated_at: daysAgo(3) },
  { id: 'service-3', hospital_id: 'hospital-2', service_name: 'Critical care', service_type: 'critical_care', base_price: 240, updated_at: daysAgo(5) },
];

const roomRows = [
  { id: 'room-1', hospital_id: 'hospital-1', room_name: 'Private room', room_type: 'private', price_per_night: 160, updated_at: daysAgo(2) },
  { id: 'room-2', hospital_id: null, room_name: 'General ward', room_type: 'ward', price_per_night: 60, updated_at: daysAgo(4) },
];

const hospitals = [
  { id: 'hospital-1', organization_id: 'org-1', name: 'Central Hospital' },
  { id: 'hospital-2', organization_id: 'org-2', name: 'North Hospital' },
];

const queryStates = [];
let truncateRowWindows = false;

const hasFilter = (state, method, column) => state.filters.some(
  (filter) => filter.method === method && filter.args[0] === column,
);

const getFilter = (state, method, column) => state.filters.find(
  (filter) => filter.method === method && filter.args[0] === column,
);

function rowsForState(state) {
  const source = state.table === 'service_pricing' ? serviceRows : roomRows;
  let rows = [...source];
  if (hasFilter(state, 'is', 'hospital_id')) rows = rows.filter((row) => !row.hospital_id);
  if (hasFilter(state, 'not', 'hospital_id')) rows = rows.filter((row) => Boolean(row.hospital_id));
  const updatedAfter = getFilter(state, 'gte', 'updated_at')?.args[1];
  if (updatedAfter) rows = rows.filter((row) => row.updated_at >= updatedAfter);

  const ascending = state.orders[0]?.options?.ascending === true;
  rows.sort((left, right) => {
    const delta = new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
    return ascending ? delta : -delta;
  });
  return rows;
}

function respond(state) {
  if (state.table === 'hospitals') {
    const ids = getFilter(state, 'in', 'id')?.args[1];
    const data = ids ? hospitals.filter((hospital) => ids.includes(hospital.id)) : hospitals;
    return { data, count: state.options?.count === 'exact' ? data.length : null, error: null };
  }

  const rows = rowsForState(state);
  if (state.options?.head) return { data: null, count: rows.length, error: null };

  const [start, end] = state.range || [0, rows.length - 1];
  const data = rows.slice(start, end + 1);
  return {
    data: truncateRowWindows && data.length ? data.slice(0, -1) : data,
    count: null,
    error: null,
  };
}

function makeBuilder(table) {
  const state = { table, select: null, options: null, filters: [], orders: [], range: null, limit: null };
  queryStates.push(state);
  const builder = {};

  builder.select = (select, options) => {
    state.select = select;
    state.options = options || null;
    return builder;
  };
  ['eq', 'in', 'is', 'not', 'or', 'gte', 'ilike'].forEach((method) => {
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
  builder.limit = (limit) => {
    state.limit = limit;
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => Promise.resolve(respond(state)).then(onFulfilled, onRejected);
  return builder;
}

describe('pricingService exact page projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    truncateRowWindows = false;
    supabase.from.mockImplementation((table) => makeBuilder(table));
  });

  it('merges server-windowed service and room rows while keeping exact KPI counts', async () => {
    const projection = await getPricingPageData({ family: 'all', page: 1, pageSize: 3 });

    expect(projection.rows.map((row) => row.id)).toEqual(['service-1', 'room-1', 'service-2']);
    expect(projection.totalCount).toBe(5);
    expect(projection.summary).toMatchObject({
      totalCount: 5,
      globalFallbackCount: 2,
      facilityPriceCount: 3,
      recentCount: 5,
      averageAmount: null,
      averageAvailable: false,
      exactCounts: true,
      basis: 'exact_server_counts',
    });
    expect(projection.readState).toMatchObject({
      complete: true,
      pagination: 'server_windowed_union',
      facilityHydration: 'complete',
    });

    const rowWindows = queryStates.filter((state) => state.select === '*');
    expect(rowWindows).toHaveLength(2);
    expect(rowWindows.map((state) => state.range)).toEqual(expect.arrayContaining([[0, 2], [0, 1]]));
    expect(queryStates.filter((state) => state.options?.head)).toHaveLength(8);
  });

  it('fails closed when the server returns less than the counted page window', async () => {
    truncateRowWindows = true;

    await expect(getPricingPageData({ family: 'services', page: 1, pageSize: 2 }))
      .rejects
      .toMatchObject({
        code: 'pricing_page_window_incomplete',
        message: 'Pricing rules could not be verified for this scope.',
      });
  });
});
