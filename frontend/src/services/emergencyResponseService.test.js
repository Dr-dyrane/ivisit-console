import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { getAmbulance } from './ambulancesService';
import {
  completeEmergency,
  dispatchEmergency,
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
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'console_dispatch_emergency', expect.objectContaining({
      p_request_id: 'request-1',
      p_ambulance_id: ambulanceB.id,
    }));
    expect(result.assignments.ambulance).toEqual(expect.objectContaining({
      id: ambulanceB.id,
      distance_km: 3,
    }));
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
    })).rejects.toThrow('Assign a facility in your organization before dispatching this request.');

    expect(getAmbulance).not.toHaveBeenCalled();
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
      service_type: 'ambulance',
    })).rejects.toThrow('Request completion is temporarily unavailable.');
  });

  it('preserves successful location command evidence when only the projection reload fails', async () => {
    const commandResult = {
      success: true,
      request_id: 'request-1',
      status: 'accepted',
      updated_at: '2026-07-13T10:00:00.000Z',
    };
    const requestQuery = {};
    requestQuery.select = jest.fn(() => requestQuery);
    requestQuery.eq = jest.fn(() => requestQuery);
    requestQuery.single = jest.fn().mockRejectedValue(new Error('projection unavailable'));
    supabase.rpc.mockResolvedValue({ data: commandResult, error: null });
    supabase.from.mockReturnValue(requestQuery);
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(updateResponderLocation(
      'request-1',
      { lat: 6.5, lng: 3.4 },
      90
    )).resolves.toEqual({
      success: true,
      commandResult,
      emergency: null,
      projectionState: 'unavailable',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('console_update_responder_location', {
      p_request_id: 'request-1',
      p_location: { lat: 6.5, lng: 3.4 },
      p_heading: 90,
    });
    consoleWarn.mockRestore();
  });
});
