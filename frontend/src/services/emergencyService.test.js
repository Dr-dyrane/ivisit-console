import fs from 'fs';
import { supabase } from '../lib/supabase';
import { applyAuthFilter, getCurrentUser } from './authService';
import { logEmergencyActivity } from './activityService';
import { parsePointInput } from './emergency/payloadNormalization';
import * as emergencyService from './emergencyService';

const {
  approveCashPayment,
  cancelEmergencyRequest,
  createEmergencyRequest,
  EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
  getEmergencyDetailProjection,
  getEmergencyRequests,
  getLatestEmergencyPayment,
  retryPaymentWithDifferentMethod,
  subscribeToEmergencyDetail,
  updateEmergencyRequest,
} = emergencyService;

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('./activityService', () => ({
  logEmergencyActivity: {
    completed: jest.fn(),
    created: jest.fn(),
    updated: jest.fn(),
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
    logEmergencyActivity.completed.mockResolvedValue(undefined);
    logEmergencyActivity.created.mockResolvedValue(undefined);
    logEmergencyActivity.updated.mockResolvedValue(undefined);
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

  it('preserves the atomic receiver payload and canonical request reload', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const request = { id: requestId, status: 'pending_approval' };
    const requestQuery = {};
    requestQuery.select = jest.fn(() => requestQuery);
    requestQuery.eq = jest.fn(() => requestQuery);
    requestQuery.maybeSingle = jest.fn().mockResolvedValue({ data: request, error: null });
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    supabase.from.mockReturnValue(requestQuery);
    supabase.rpc.mockResolvedValue({
      data: { success: true, request_id: requestId },
      error: null,
    });

    await expect(createEmergencyRequest({
      user_id: 'patient-1',
      hospital_id: 'hospital-1',
      hospital_name: 'Hospital One',
      service_type: 'ambulance',
      specialty: 'cardiology',
      ambulance_type: 'advanced',
      bed_number: 'B-12',
      patient_snapshot: { incident_type: 'cardiac' },
      patient_location: { type: 'Point', coordinates: [3.4, 6.5] },
      payment_method: 'card',
      payment_method_id: 'payment-method-1',
      total_cost: 125,
      ivisit_fee_amount: 12.5,
      currency: 'NGN',
    })).resolves.toBe(request);

    expect(supabase.rpc).toHaveBeenCalledWith('create_emergency_v4', {
      p_user_id: 'patient-1',
      p_request_data: {
        hospital_id: 'hospital-1',
        hospital_name: 'Hospital One',
        service_type: 'ambulance',
        specialty: 'cardiology',
        ambulance_type: 'advanced',
        patient_snapshot: { incident_type: 'cardiac' },
        patient_location: { lat: 6.5, lng: 3.4 },
      },
      p_payment_data: {
        method: 'card',
        method_id: 'payment-method-1',
        total_amount: 125,
        fee_amount: 12.5,
        currency: 'NGN',
      },
    });
    expect(requestQuery.eq).toHaveBeenCalledWith('id', requestId);
  });

  it('preserves the update allowlist and canonical status payload', async () => {
    const request = {
      id: 'request-1',
      status: 'arrived',
      pickup_location: null,
    };
    supabase.rpc.mockResolvedValue({
      data: { success: true, request },
      error: null,
    });

    await expect(updateEmergencyRequest('request-1', {
      status: 'arrived',
      hospital_id: 'hospital-1',
      patient_location: { lat: 6.5, lng: 3.4 },
      unsupported_field: 'must not be forwarded',
    })).resolves.toBe(request);

    expect(supabase.rpc).toHaveBeenCalledWith('console_update_emergency_request', {
      p_request_id: 'request-1',
      p_payload: {
        status: 'arrived',
        hospital_id: 'hospital-1',
        patient_location: { lat: 6.5, lng: 3.4 },
      },
    });
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

describe('emergencyService compatibility facade', () => {
  it('preserves the complete public export manifest', () => {
    expect(Object.keys(emergencyService).sort()).toEqual([
      'EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON',
      'acceptEmergencyRequest',
      'approveCashPayment',
      'cancelEmergencyRequest',
      'completeEmergencyRequest',
      'createEmergencyRequest',
      'declineCashPayment',
      'getActiveEmergencyRequests',
      'getEmergencyCreateFacilityOptions',
      'getEmergencyDetailProjection',
      'getEmergencyRequest',
      'getEmergencyRequests',
      'getEmergencyRequestsPage',
      'getEmergencyRequestsPageStats',
      'getEmergencyStats',
      'getHospitalEmergencyRequests',
      'getLatestEmergencyPayment',
      'getUserActivePaymentMethods',
      'getUserEmergencyRequests',
      'retryPaymentWithDifferentMethod',
      'subscribeToEmergencyDetail',
      'updateEmergencyRequest',
      'updatePatientLocation',
      'updateResponderLocation',
    ].sort());
  });

  it('keeps the facade thin and every emergency owner module bounded', () => {
    const facadePath = 'src/services/emergencyService.js';
    const moduleDirectory = 'src/services/emergency';
    const modulePaths = fs.readdirSync(moduleDirectory)
      .filter((fileName) => fileName.endsWith('.js'))
      .map((fileName) => `${moduleDirectory}/${fileName}`);
    const lineCount = (filePath) => fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;

    expect(lineCount(facadePath)).toBeLessThanOrEqual(60);
    expect(modulePaths.length).toBeGreaterThan(1);
    expect(modulePaths.filter((filePath) => lineCount(filePath) > 300)).toEqual([]);
    expect(fs.readFileSync(facadePath, 'utf8')).not.toContain('supabase.');
  });

  it('keeps the exact RPC receiver inventory behind the facade', () => {
    const source = fs.readdirSync('src/services/emergency')
      .filter((fileName) => fileName.endsWith('.js'))
      .map((fileName) => fs.readFileSync(`src/services/emergency/${fileName}`, 'utf8'))
      .join('\n');
    const receivers = [...source.matchAll(/supabase\.rpc\('([^']+)'/g)]
      .map((match) => match[1])
      .sort();

    expect(receivers).toEqual([
      'approve_cash_payment',
      'console_cancel_emergency',
      'console_complete_emergency',
      'console_create_emergency_request',
      'console_dispatch_emergency',
      'console_update_emergency_request',
      'console_update_emergency_request',
      'console_update_responder_location',
      'create_emergency_v4',
      'decline_cash_payment',
    ].sort());
    expect(source).not.toContain("supabase.rpc('retry_payment_with_different_method'");
  });
});

describe('emergencyService location normalization', () => {
  it.each([
    [{ lat: '6.5', lng: '3.4' }, { lat: 6.5, lng: 3.4 }],
    [{ latitude: 6.5, longitude: 3.4 }, { lat: 6.5, lng: 3.4 }],
    [{ type: 'Point', coordinates: [3.4, 6.5] }, { lat: 6.5, lng: 3.4 }],
    ['POINT (3.4 6.5)', { lat: 6.5, lng: 3.4 }],
  ])('normalizes %p without changing coordinate order', (input, expected) => {
    expect(parsePointInput(input)).toEqual(expected);
  });

  it.each([
    [{ lat: 91, lng: 3.4 }],
    [{ lat: 6.5, lng: 181 }],
    ['not-a-point'],
    [null],
  ])('rejects invalid point input %p', (input) => {
    expect(parsePointInput(input)).toBeNull();
  });
});

describe('emergencyService list query characterization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('preserves RBAC scope, filters, ordering, and legacy pagination calls', async () => {
    const user = { id: 'provider-1', role: 'provider' };
    const row = { id: 'request-1' };
    const query = {};
    [
      'select',
      'in',
      'eq',
      'or',
      'gte',
      'lte',
      'order',
      'limit',
      'range',
    ].forEach((method) => {
      query[method] = jest.fn(() => query);
    });
    query.then = jest.fn((resolve, reject) => (
      Promise.resolve({ data: [row], error: null }).then(resolve, reject)
    ));
    getCurrentUser.mockResolvedValue(user);
    supabase.from.mockReturnValue(query);

    await expect(getEmergencyRequests({
      status: ['accepted', 'arrived'],
      responder_id: 'responder-1',
      user_id: 'patient-1',
      hospital_id: 'hospital-1',
      ambulance_id: 'ambulance-1',
      service_type: 'ambulance',
      search: 'Alpha,Beta',
      date_from: '2026-07-01T00:00:00Z',
      date_to: '2026-07-13T23:59:59Z',
      limit: 20,
      offset: 10,
    })).resolves.toEqual([row]);

    expect(supabase.from).toHaveBeenCalledWith('emergency_requests');
    expect(applyAuthFilter).toHaveBeenCalledWith(query, user, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id',
      providerIdField: 'responder_id',
      resourceType: 'emergency',
    });
    expect(query.in).toHaveBeenCalledWith('status', ['accepted', 'arrived']);
    expect(query.eq.mock.calls).toEqual([
      ['responder_id', 'responder-1'],
      ['user_id', 'patient-1'],
      ['hospital_id', 'hospital-1'],
      ['ambulance_id', 'ambulance-1'],
      ['service_type', 'ambulance'],
    ]);
    expect(query.or).toHaveBeenCalledWith(
      'display_id.ilike.%Alpha Beta%,service_type.ilike.%Alpha Beta%,hospital_name.ilike.%Alpha Beta%,responder_name.ilike.%Alpha Beta%'
    );
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00Z');
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-07-13T23:59:59Z');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(query.range).toHaveBeenCalledWith(10, 29);
  });
});

describe('emergencyService detail and command characterization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the failed latest-payment result shape without throwing', async () => {
    const paymentError = { code: '42501', message: 'Payment row is not visible' };
    const paymentQuery = {};
    paymentQuery.select = jest.fn(() => paymentQuery);
    paymentQuery.eq = jest.fn(() => paymentQuery);
    paymentQuery.order = jest.fn(() => paymentQuery);
    paymentQuery.limit = jest.fn(() => paymentQuery);
    paymentQuery.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: paymentError });
    supabase.from.mockReturnValue(paymentQuery);

    await expect(getLatestEmergencyPayment(
      '11111111-1111-4111-8111-111111111111'
    )).resolves.toEqual({
      payment: null,
      visibilityState: 'failed',
      error: paymentError,
    });
  });

  it('keeps detail realtime scoped to request, payment, and visit rows with exact cleanup', () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const callback = jest.fn();
    const channel = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    supabase.channel.mockReturnValue(channel);

    const cleanup = subscribeToEmergencyDetail(requestId, callback);

    expect(supabase.channel).toHaveBeenCalledWith(`emergency_detail_projection_${requestId}`);
    expect(channel.on.mock.calls.map(([, config]) => config)).toEqual([
      {
        event: '*',
        schema: 'public',
        table: 'emergency_requests',
        filter: `id=eq.${requestId}`,
      },
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `emergency_request_id=eq.${requestId}`,
      },
      {
        event: '*',
        schema: 'public',
        table: 'visits',
        filter: `request_id=eq.${requestId}`,
      },
    ]);
    channel.on.mock.calls.forEach((call) => expect(call[2]).toBe(callback));

    cleanup();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('keeps invalid detail identifiers subscription-free', () => {
    const cleanup = subscribeToEmergencyDetail('REQ-1001', jest.fn());

    cleanup();
    expect(supabase.channel).not.toHaveBeenCalled();
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });

  it('preserves the cancellation receiver payload and returned request', async () => {
    const request = { id: 'request-1', status: 'cancelled' };
    supabase.rpc.mockImplementation(async (receiver) => {
      if (receiver === 'console_cancel_emergency') {
        return { data: { success: true, request }, error: null };
      }
      return { data: { success: true }, error: null };
    });

    await expect(cancelEmergencyRequest('request-1', 'Duplicate request')).resolves.toBe(request);
    expect(supabase.rpc).toHaveBeenCalledWith('console_cancel_emergency', {
      p_request_id: 'request-1',
      p_reason: 'Duplicate request',
    });
  });

  it('preserves the active-ambulance approval conflict error shape', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key emergency_requests_one_active_ambulance_per_user_idx',
      },
    });

    await expect(approveCashPayment('payment-1', 'request-1')).rejects.toThrow(
      'Cannot approve dispatch: patient already has another active ambulance request (accepted/in-progress/arrived). Complete or cancel the existing trip first.'
    );
  });
});
