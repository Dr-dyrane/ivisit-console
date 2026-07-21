import { supabase } from '../lib/supabase';
import { driverManagementService } from './driverManagementService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('./emergencyResponseService', () => ({
  getResponderTelemetryState: jest.fn(),
  reportResponderTelemetry: jest.fn(),
}));

const arrivedItem = {
  assignment_id: 'assignment-1',
  assignment_status: 'arrived',
  ambulance_id: 'ambulance-1',
  request_id: 'request-1',
};

describe('driverManagementService dispatch projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enriches arrived assignments with patient acknowledgement truth', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: { success: true, items: [arrivedItem] }, error: null })
      .mockResolvedValueOnce({
        data: {
          success: true,
          available: true,
          patient_acknowledged_arrival_at: '2026-07-18T12:00:00.000Z',
        },
        error: null,
      });

    await expect(driverManagementService.getDispatchFeed()).resolves.toEqual([
      expect.objectContaining({
        patient_acknowledgement_state: 'confirmed',
        patient_acknowledged_arrival_at: '2026-07-18T12:00:00.000Z',
      }),
    ]);
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_current_emergency_responder', {
      p_request_id: 'request-1',
    });
  });

  it('keeps the arrived assignment safe when acknowledgement cannot be read', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: { success: true, items: [arrivedItem] }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });

    await expect(driverManagementService.getDispatchFeed()).resolves.toEqual([
      expect.objectContaining({ patient_acknowledgement_state: 'unavailable' }),
    ]);
  });

  it('refreshes for assignment and patient acknowledgement changes', () => {
    const channel = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    supabase.channel.mockReturnValue(channel);
    const callback = jest.fn();

    const unsubscribe = driverManagementService.subscribeToDispatchFeed('driver-1', callback);

    expect(channel.on).toHaveBeenNthCalledWith(1, 'postgres_changes', expect.objectContaining({
      table: 'emergency_responder_assignments',
      filter: 'responder_id=eq.driver-1',
    }), callback);
    expect(channel.on).toHaveBeenNthCalledWith(2, 'postgres_changes', expect.objectContaining({
      table: 'emergency_requests',
      filter: 'responder_id=eq.driver-1',
    }), callback);
    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
