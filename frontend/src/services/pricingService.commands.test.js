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

describe('pricing compatibility commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('rejects organization-only room changes before choosing a facility', async () => {
    await expect(saveRoomPricing({
      organization_id: 'organization-uuid',
      room_name: 'Private room',
      room_type: 'private',
      price_per_night: '275.00',
      description: '',
    })).rejects.toThrow('Select a facility before changing organization pricing.');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
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

  it('rejects organization-only service changes before mutation', async () => {
    await expect(saveServicePricing({
      organization_id: 'organization-uuid',
      service_name: 'Assessment',
      service_type: 'assessment',
      base_price: 80,
    })).rejects.toThrow('Select a facility before changing organization pricing.');
    expect(supabase.from).not.toHaveBeenCalled();
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
