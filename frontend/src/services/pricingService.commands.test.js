import { supabase } from '../lib/supabase';
import {
  deleteRoomPricing,
  deleteServicePricing,
  saveRoomPricing,
  saveServicePricing,
} from './pricingService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

let hospitalResponse;
let hospitalQueryState;

const makeHospitalBuilder = () => {
  hospitalQueryState = { select: null, filters: [], orders: [], limit: null };
  const builder = {};
  builder.select = (select) => {
    hospitalQueryState.select = select;
    return builder;
  };
  builder.eq = (...args) => {
    hospitalQueryState.filters.push({ method: 'eq', args });
    return builder;
  };
  builder.order = (column, options) => {
    hospitalQueryState.orders.push({ column, options });
    return builder;
  };
  builder.limit = (limit) => {
    hospitalQueryState.limit = limit;
    return builder;
  };
  builder.maybeSingle = () => Promise.resolve(hospitalResponse);
  return builder;
};

describe('pricing compatibility commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hospitalQueryState = null;
    hospitalResponse = { data: { id: 'first-hospital-uuid' }, error: null };
    supabase.from.mockImplementation((table) => {
      expect(table).toBe('hospitals');
      return makeHospitalBuilder();
    });
    supabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('sends an explicitly selected facility UUID to the service upsert receiver unchanged', async () => {
    const result = await saveServicePricing({
      id: 'service-rule-uuid',
      hospital_id: 'selected-hospital-uuid',
      organization_id: 'organization-uuid',
      category: 'consultation',
      service_name: 'Consultation',
      base_price: '125.50',
      description: null,
      metadata: { description: 'Metadata description' },
    });

    expect(result).toEqual({ success: true });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_service_pricing', {
      payload: {
        id: 'service-rule-uuid',
        hospital_id: 'selected-hospital-uuid',
        service_type: 'consultation',
        service_name: 'Consultation',
        base_price: '125.50',
        description: 'Metadata description',
      },
    });
  });

  it('preserves the legacy earliest-facility organization resolution for room upserts', async () => {
    await saveRoomPricing({
      organization_id: 'organization-uuid',
      room_name: 'Private room',
      room_type: 'private',
      price_per_night: '275.00',
      description: '',
    });

    expect(hospitalQueryState).toEqual({
      select: 'id',
      filters: [{ method: 'eq', args: ['organization_id', 'organization-uuid'] }],
      orders: [{ column: 'created_at', options: { ascending: true } }],
      limit: 1,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_room_pricing', {
      payload: {
        id: null,
        hospital_id: 'first-hospital-uuid',
        room_name: 'Private room',
        room_type: 'private',
        price_per_night: '275.00',
        description: null,
      },
    });
  });

  it('keeps global service pricing represented by a null facility UUID', async () => {
    await saveServicePricing({
      service_type: 'ambulance',
      service_name: 'Ambulance',
      base_price: 150,
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_service_pricing', {
      payload: {
        id: null,
        hospital_id: null,
        service_type: 'ambulance',
        service_name: 'Ambulance',
        base_price: 150,
        description: null,
      },
    });
  });

  it('fails before mutation when organization resolution has no facility', async () => {
    hospitalResponse = { data: null, error: null };

    await expect(saveRoomPricing({
      organization_id: 'organization-uuid',
      room_name: 'Ward',
      room_type: 'general',
      price_per_night: 80,
    })).rejects.toThrow(
      'No hospital found for the selected organization. Create a hospital first to manage organization pricing.'
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('keeps delete receiver names and target UUID payloads exact', async () => {
    await expect(deleteServicePricing('service-rule-uuid')).resolves.toEqual({ success: true });
    await expect(deleteRoomPricing('room-rule-uuid')).resolves.toEqual({ success: true });

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'delete_service_pricing', {
      target_id: 'service-rule-uuid',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'delete_room_pricing', {
      target_id: 'room-rule-uuid',
    });
  });

  it('propagates transport errors and converts receiver failures to command errors', async () => {
    const transportError = new Error('rpc denied');
    supabase.rpc.mockResolvedValueOnce({ data: null, error: transportError });
    await expect(deleteServicePricing('service-rule-uuid')).rejects.toBe(transportError);

    supabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'hospital outside actor organization' },
      error: null,
    });
    await expect(deleteRoomPricing('room-rule-uuid'))
      .rejects
      .toThrow('hospital outside actor organization');
  });
});
