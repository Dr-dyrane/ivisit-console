import { supabase } from '../../lib/supabase';
import { getResolvedPricePreview } from './resolvedPrice';

jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

describe('resolved price preview read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the service resolver with the trimmed rule type and facility scope', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ service_name: 'Consultation', price: 40, currency: 'USD' }],
      error: null,
    });

    await expect(getResolvedPricePreview({
      family: 'service',
      type: ' consultation ',
      hospitalId: 'hospital-1',
    })).resolves.toEqual({
      status: 'resolved',
      row: { name: 'Consultation', price: 40, currency: 'USD' },
    });
    expect(supabase.rpc).toHaveBeenCalledWith('get_service_price', {
      p_service_type: 'consultation',
      p_hospital_id: 'hospital-1',
    });
  });

  it('calls the room resolver with platform scope when the rule is global', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ room_name: 'General Ward', price: '120.50', currency: 'USD' }],
      error: null,
    });

    await expect(getResolvedPricePreview({ family: 'room', type: 'general' }))
      .resolves.toEqual({
        status: 'resolved',
        row: { name: 'General Ward', price: 120.5, currency: 'USD' },
      });
    expect(supabase.rpc).toHaveBeenCalledWith('get_room_price', {
      p_room_type: 'general',
      p_hospital_id: null,
    });
  });

  it('returns honest empty and unavailable states without inventing zero prices', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    await expect(getResolvedPricePreview({ family: 'room', type: 'icu' }))
      .resolves.toEqual({ status: 'empty', row: null });

    supabase.rpc.mockResolvedValue({
      data: [{ room_name: 'Ward', price: '', currency: 'USD' }],
      error: null,
    });
    await expect(getResolvedPricePreview({ family: 'room', type: 'icu' }))
      .resolves.toEqual({ status: 'empty', row: null });

    await expect(getResolvedPricePreview({ family: 'unknown', type: 'icu' }))
      .resolves.toEqual({ status: 'unavailable', row: null });
    await expect(getResolvedPricePreview({ family: 'service', type: '   ' }))
      .resolves.toEqual({ status: 'unavailable', row: null });
    await expect(getResolvedPricePreview({}))
      .resolves.toEqual({ status: 'unavailable', row: null });
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it('propagates resolver read errors instead of masking them', async () => {
    const readError = new Error('rpc read denied');
    supabase.rpc.mockResolvedValue({ data: null, error: readError });

    await expect(getResolvedPricePreview({ family: 'service', type: 'consultation' }))
      .rejects.toBe(readError);
  });
});
