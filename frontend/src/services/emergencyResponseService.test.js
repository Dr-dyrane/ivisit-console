import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { getAmbulance } from './ambulancesService';
import {
  completeEmergency,
  dispatchEmergency,
  reportResponderTelemetry,
  updateResponderLocation,
} from './emergencyResponseService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('./ambulancesService', () => ({
  getAmbulance: jest.fn(),
}));

describe('emergencyResponseService command guards', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getCurrentUser.mockResolvedValue({ id: 'operator-1', role: 'admin' });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('dispatches the nearest eligible RLS-visible ambulance through the canonical RPC', async () => {
    const ambulanceA = { id: 'ambulance-a', type: 'advanced', status: 'available', vehicle_number: 'A-1' };
    const ambulanceB = { id: 'ambulance-b', type: 'advanced', status: 'available', vehicle_number: 'B-1' };
    getAmbulance.mockImplementation(async (id) => (
      [ambulanceA, ambulanceB].find((ambulance) => ambulance.id === id) || null
    ));
    supabase.rpc.mockImplementation((name) => {
      if (name === 'nearby_ambulances') {
        return Promise.resolve({
          data: [
            { id: 'outside-current-scope', distance: 1 },
            { id: ambulanceB.id, distance: 3 },
            { id: ambulanceA.id, distance: 8 },
          ],
          error: null,
        });
      }
      if (name === 'get_ambulance_dispatch_readiness') {
        return Promise.resolve({ data: { ready: true }, error: null });
      }
      if (name === 'console_dispatch_emergency') {
        return Promise.resolve({ data: { success: true, request: { id: 'request-1' } }, error: null });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const result = await dispatchEmergency('request-1', {
      id: 'request-1',
      status: 'in_progress',
      service_type: 'ambulance',
      ambulance_type: 'advanced',
      patient_location: { lat: 6.5, lng: 3.4 },
    });

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'nearby_ambulances', {
      user_lat: 6.5,
      user_lng: 3.4,
      radius_km: 50,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_ambulance_dispatch_readiness', {
      p_ambulance_id: ambulanceB.id,
      p_request_id: 'request-1',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'console_dispatch_emergency', expect.objectContaining({
      p_request_id: 'request-1',
      p_ambulance_id: ambulanceB.id,
    }));
    expect(result.assignments.ambulance).toEqual(expect.objectContaining({
      id: ambulanceB.id,
      distance_km: 3,
    }));
  });

  it('defers ambulance equipment aliases to the canonical readiness snapshot', async () => {
    getAmbulance.mockResolvedValue({
      id: 'ambulance-bls',
      type: 'BLS',
      status: 'available',
    });
    supabase.rpc.mockImplementation((name) => {
      if (name === 'nearby_ambulances') {
        return Promise.resolve({
          data: [{ id: 'ambulance-bls', distance: 2 }],
          error: null,
        });
      }
      if (name === 'get_ambulance_dispatch_readiness') {
        return Promise.resolve({
          data: { ready: true, type_supported: true },
          error: null,
        });
      }
      if (name === 'console_dispatch_emergency') {
        return Promise.resolve({
          data: { success: true, request: { id: 'request-generic' } },
          error: null,
        });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const result = await dispatchEmergency('request-generic', {
      id: 'request-generic',
      status: 'in_progress',
      service_type: 'ambulance',
      ambulance_type: 'ambulance',
      patient_location: { lat: 6.5, lng: 3.4 },
    });

    expect(result.assignments.ambulance.id).toBe('ambulance-bls');
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_ambulance_dispatch_readiness',
      { p_ambulance_id: 'ambulance-bls', p_request_id: 'request-generic' },
    );
  });

  it('skips a nearer foreign ambulance and dispatches the first same-organization facility candidate', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'org-operator-1',
      role: 'org_admin',
      organization_id: 'organization-local',
      hospital_ids: ['hospital-local'],
    });
    const foreignAmbulance = {
      id: 'ambulance-foreign',
      status: 'available',
      type: 'advanced',
      organization_id: 'organization-foreign',
      hospital_id: 'hospital-foreign',
    };
    const localAmbulance = {
      id: 'ambulance-local',
      status: 'available',
      type: 'advanced',
      organization_id: 'organization-local',
      hospital_id: 'hospital-local',
    };
    getAmbulance.mockImplementation(async (id) => (
      [foreignAmbulance, localAmbulance].find((ambulance) => ambulance.id === id) || null
    ));
    supabase.rpc.mockImplementation((name) => {
      if (name === 'nearby_ambulances') {
        return Promise.resolve({
          data: [
            { id: foreignAmbulance.id, distance: 1 },
            { id: localAmbulance.id, distance: 4 },
          ],
          error: null,
        });
      }
      if (name === 'get_ambulance_dispatch_readiness') {
        return Promise.resolve({ data: { ready: true }, error: null });
      }
      if (name === 'console_dispatch_emergency') {
        return Promise.resolve({ data: { success: true, request: { id: 'request-1' } }, error: null });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const result = await dispatchEmergency('request-1', {
      id: 'request-1',
      status: 'in_progress',
      service_type: 'ambulance',
      ambulance_type: 'advanced',
      hospital_id: 'hospital-local',
      patient_location: { lat: 6.5, lng: 3.4 },
    });

    expect(getAmbulance).toHaveBeenNthCalledWith(1, foreignAmbulance.id);
    expect(getAmbulance).toHaveBeenNthCalledWith(2, localAmbulance.id);
    expect(supabase.rpc).toHaveBeenLastCalledWith('console_dispatch_emergency', expect.objectContaining({
      p_ambulance_id: localAmbulance.id,
      p_hospital_id: 'hospital-local',
    }));
    expect(result.assignments.ambulance.id).toBe(localAmbulance.id);
  });

  it('does not start nearest matching for an org-admin request outside resolved facilities', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'org-operator-1',
      role: 'org_admin',
      organization_id: 'organization-local',
      hospital_ids: ['hospital-local'],
    });

    await expect(dispatchEmergency('request-foreign', {
      status: 'in_progress',
      service_type: 'ambulance',
      hospital_id: 'hospital-foreign',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).rejects.toThrow('This request is outside your dispatch organization.');

    expect(getAmbulance).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('allows a dispatcher to use a directly organization-owned unit without a station', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'dispatcher-1',
      role: 'dispatcher',
      organization_id: 'organization-local',
      hospital_ids: ['hospital-local'],
    });
    getAmbulance.mockResolvedValue({
      id: 'ambulance-direct',
      status: 'available',
      type: 'advanced',
      organization_id: 'organization-local',
      hospital_id: null,
    });
    supabase.rpc.mockImplementation((name) => {
      if (name === 'nearby_ambulances') {
        return Promise.resolve({ data: [{ id: 'ambulance-direct', distance: 2 }], error: null });
      }
      if (name === 'get_ambulance_dispatch_readiness') {
        return Promise.resolve({ data: { ready: true }, error: null });
      }
      if (name === 'console_dispatch_emergency') {
        return Promise.resolve({ data: { success: true, request: { id: 'request-1' } }, error: null });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    await expect(dispatchEmergency('request-1', {
      status: 'in_progress',
      service_type: 'ambulance',
      hospital_id: 'hospital-foreign',
      dispatch_organization_id: 'organization-local',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).resolves.toEqual(expect.objectContaining({ success: true }));

    expect(supabase.rpc).toHaveBeenLastCalledWith(
      'console_dispatch_emergency',
      expect.objectContaining({ p_ambulance_id: 'ambulance-direct' })
    );
  });

  it('rejects a role without dispatch authority before candidate lookup', async () => {
    getCurrentUser.mockResolvedValue({ id: 'provider-1', role: 'provider' });

    await expect(dispatchEmergency('request-1', {
      status: 'in_progress',
      service_type: 'ambulance',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).rejects.toThrow('This role cannot dispatch emergency requests.');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not dispatch when request location cannot support proximity matching', async () => {
    await expect(dispatchEmergency('request-1', {
      status: 'in_progress',
      service_type: 'ambulance',
    })).rejects.toThrow('A valid request location is required before automatic dispatch.');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not dispatch from a lifecycle state that lacks the dispatch transition', async () => {
    await expect(dispatchEmergency('request-1', {
      status: 'pending_approval',
      service_type: 'ambulance',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).rejects.toThrow('This request changed state and is not ready to dispatch.');

    expect(getAmbulance).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not complete a request from a state without the complete transition', async () => {
    await expect(completeEmergency('request-1', {
      status: 'in_progress',
      service_type: 'ambulance',
    })).rejects.toThrow('This request changed state and is not ready to complete.');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not let an unassigned provider invoke request completion', async () => {
    getCurrentUser.mockResolvedValue({ id: 'provider-1', role: 'provider' });

    await expect(completeEmergency('request-1', {
      status: 'accepted',
      service_type: 'ambulance',
      responder_id: 'provider-2',
    })).rejects.toThrow('Only the assigned responder can complete this request.');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not expose raw receiver errors through completion feedback', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for internal_table' },
    });

    await expect(completeEmergency('request-1', {
      status: 'accepted',
      service_type: 'bed',
    })).rejects.toThrow('Request completion is temporarily unavailable.');
  });

  it('publishes assignment-bound telemetry through the canonical receiver', async () => {
    const commandResult = {
      success: true,
      request_id: 'request-1',
      assignment_id: 'assignment-1',
      sequence: 7,
      received_at: '2026-07-13T10:00:00.000Z',
    };
    supabase.rpc.mockResolvedValue({ data: commandResult, error: null });

    await expect(reportResponderTelemetry({
      ambulanceId: 'ambulance-1',
      requestId: 'request-1',
      assignmentId: 'assignment-1',
      sequence: 7,
      observedAt: '2026-07-13T09:59:59.000Z',
      location: { lat: 6.5, lng: 3.4 },
      heading: 90,
      accuracyMeters: 12,
    })).resolves.toEqual(commandResult);

    expect(supabase.rpc).toHaveBeenCalledWith('report_responder_telemetry', {
      p_payload: {
        ambulance_id: 'ambulance-1',
        request_id: 'request-1',
        assignment_id: 'assignment-1',
        sequence: 7,
        observed_at: '2026-07-13T09:59:59.000Z',
        location: { lat: 6.5, lng: 3.4 },
        heading: 90,
        accuracy_meters: 12,
      },
    });
  });

  it('keeps the compatibility location export assignment-bound and projection-free', async () => {
    const commandResult = {
      success: true,
      request_id: 'request-1',
      assignment_id: 'assignment-1',
      sequence: 8,
      received_at: '2026-07-13T10:00:20.000Z',
    };
    supabase.rpc.mockResolvedValue({ data: commandResult, error: null });

    await expect(updateResponderLocation({
      ambulanceId: 'ambulance-1',
      requestId: 'request-1',
      assignmentId: 'assignment-1',
      sequence: 8,
      observedAt: '2026-07-13T10:00:19.000Z',
      location: { lat: 6.5, lng: 3.4 },
    })).resolves.toEqual(commandResult);

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
