import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { logEmergencyActivity } from './activityService';
import {
  createEmergencyRequest,
  EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
  getEmergencyDetailProjection,
  retryPaymentWithDifferentMethod,
} from './emergencyService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('./activityService', () => ({
  logEmergencyActivity: {
    created: jest.fn(),
  },
}));

jest.mock('./visitsService', () => ({
  getVisitByRequestId: jest.fn(),
}));

const buildFacilityLookup = (result) => {
  const query = {};
  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.maybeSingle = jest.fn().mockResolvedValue(result);
  return query;
};

describe('emergencyService create command contract', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: 'organization-local',
    });
    logEmergencyActivity.created.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('requires an explicit facility before an org admin can create', async () => {
    await expect(createEmergencyRequest({
      service_type: 'ambulance',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).rejects.toThrow('Select a facility in your organization before creating this request.');

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('preserves verified facility, coordinates, and incident metadata in the console payload', async () => {
    const facilityLookup = buildFacilityLookup({
      data: {
        id: 'hospital-local',
        name: 'Local Hospital',
        organization_id: 'organization-local',
      },
      error: null,
    });
    supabase.from.mockReturnValue(facilityLookup);
    supabase.rpc.mockResolvedValue({
      data: {
        success: true,
        request: { id: 'request-1', status: 'pending_approval' },
      },
      error: null,
    });

    await createEmergencyRequest({
      hospital_id: 'hospital-local',
      hospital_name: 'Untrusted form label',
      service_type: 'ambulance',
      status: 'pending_approval',
      patient_location: { lat: 6.5, lng: 3.4 },
      patient_snapshot: {
        incident_type: 'cardiac',
        description: 'Chest pain',
      },
    });

    expect(facilityLookup.eq).toHaveBeenNthCalledWith(1, 'id', 'hospital-local');
    expect(facilityLookup.eq).toHaveBeenNthCalledWith(2, 'organization_id', 'organization-local');
    expect(supabase.rpc).toHaveBeenCalledWith('console_create_emergency_request', {
      p_payload: expect.objectContaining({
        hospital_id: 'hospital-local',
        hospital_name: 'Local Hospital',
        service_type: 'ambulance',
        patient_location: { lat: 6.5, lng: 3.4 },
        latitude: 6.5,
        longitude: 3.4,
        patient_snapshot: expect.objectContaining({
          incident_type: 'cardiac',
        }),
      }),
    });
  });

  it('rejects an incident token used as an unsupported service type', async () => {
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });

    await expect(createEmergencyRequest({
      service_type: 'cardiac',
      patient_location: { lat: 6.5, lng: 3.4 },
    })).rejects.toThrow('Select Ambulance, Bed, or Booking as the request service.');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('keeps payment retry fail-closed without invoking the insecure receiver', async () => {
    await expect(retryPaymentWithDifferentMethod(
      'request-1',
      'payment-method-1',
      'patient-1'
    )).rejects.toThrow(EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON);

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('re-reads the canonical request when refreshing a detail projection', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const requestQuery = {};
    requestQuery.select = jest.fn(() => requestQuery);
    requestQuery.eq = jest.fn(() => requestQuery);
    requestQuery.maybeSingle = jest.fn().mockResolvedValue({
      data: { id: requestId, status: 'arrived', responder_name: 'Fresh responder' },
      error: null,
    });

    const paymentQuery = {};
    paymentQuery.select = jest.fn(() => paymentQuery);
    paymentQuery.eq = jest.fn(() => paymentQuery);
    paymentQuery.order = jest.fn(() => paymentQuery);
    paymentQuery.limit = jest.fn(() => paymentQuery);
    paymentQuery.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    supabase.from.mockImplementation((table) => (
      table === 'emergency_requests' ? requestQuery : paymentQuery
    ));

    const projection = await getEmergencyDetailProjection(requestId, {
      id: requestId,
      status: 'in_progress',
      responder_name: 'Stale responder',
    });

    expect(requestQuery.eq).toHaveBeenCalledWith('id', requestId);
    expect(projection.request).toEqual(expect.objectContaining({
      status: 'arrived',
      responder_name: 'Fresh responder',
    }));
  });
});
