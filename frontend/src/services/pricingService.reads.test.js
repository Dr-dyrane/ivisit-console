import { supabase } from '../lib/supabase';
import { getPricing } from './pricingService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const responses = {};
const queryStates = [];

const makeBuilder = (table) => {
  const state = { table, select: null, orders: [] };
  queryStates.push(state);
  const builder = {};
  builder.select = (select) => {
    state.select = select;
    return builder;
  };
  builder.order = (column, options) => {
    state.orders.push({ column, options });
    return builder;
  };
  builder.then = (onFulfilled, onRejected) => Promise.resolve(responses[table])
    .then(onFulfilled, onRejected);
  return builder;
};

describe('pricing compatibility reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryStates.length = 0;
    responses.hospitals = {
      data: [
        { id: 'hospital-1', organization_id: 'org-1' },
        { id: 'hospital-2', organization_id: 'org-2' },
      ],
      error: null,
    };
    responses.service_pricing = {
      data: [
        { id: 'global-service', hospital_id: null },
        { id: 'org-service', hospital_id: 'hospital-1' },
        { id: 'other-service', hospital_id: 'hospital-2' },
      ],
      error: null,
    };
    responses.room_pricing = {
      data: [{ id: 'room-1', hospital_id: 'hospital-2' }],
      error: null,
    };
    supabase.from.mockImplementation(makeBuilder);
  });

  it('keeps global rows and maps facility UUIDs to the requested organization UUID', async () => {
    const rows = await getPricing('services', 'org-1');

    expect(rows).toEqual([
      { id: 'global-service', hospital_id: null, organization_id: null },
      { id: 'org-service', hospital_id: 'hospital-1', organization_id: 'org-1' },
    ]);
    expect(queryStates).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'hospitals', select: 'id, organization_id' }),
      expect.objectContaining({
        table: 'service_pricing',
        select: '*',
        orders: [{ column: 'updated_at', options: { ascending: false } }],
      }),
    ]));
  });

  it('keeps every non-services type on the room pricing compatibility path', async () => {
    await expect(getPricing('rooms')).resolves.toEqual([
      { id: 'room-1', hospital_id: 'hospital-2', organization_id: 'org-2' },
    ]);
    expect(queryStates.some((state) => state.table === 'room_pricing')).toBe(true);
    expect(queryStates.some((state) => state.table === 'service_pricing')).toBe(false);
  });

  it('preserves hospital-read error precedence and pricing-read propagation', async () => {
    const hospitalError = new Error('hospital read denied');
    responses.hospitals = { data: null, error: hospitalError };
    responses.service_pricing = { data: null, error: new Error('pricing read denied') };
    await expect(getPricing()).rejects.toBe(hospitalError);

    responses.hospitals = { data: [], error: null };
    const pricingError = new Error('pricing read denied');
    responses.service_pricing = { data: null, error: pricingError };
    await expect(getPricing()).rejects.toBe(pricingError);
  });
});
