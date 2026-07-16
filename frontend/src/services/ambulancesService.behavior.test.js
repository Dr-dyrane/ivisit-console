import {
  assignDriverToAmbulance,
  getAmbulance,
  getAmbulances,
  getAmbulancesPageData,
  getDriverAmbulance,
  getHospitalAmbulances,
  subscribeToAllAmbulances,
  subscribeToAmbulance,
  updateAmbulance,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
} from './ambulancesService';
import { supabase } from '../lib/supabase';
import { applyAuthFilter, getCurrentUser } from './authService';
import { withAudit, withRetry } from './supabaseHelpers';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn((query) => query),
  getCurrentUser: jest.fn(),
}));

jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(async (_action, _entity, operation) => operation()),
  withRetry: jest.fn(async (operation) => operation()),
}));

const AMBULANCE_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';
const HOSPITAL_ID = '33333333-3333-4333-8333-333333333333';
const DRIVER_ID = '44444444-4444-4444-8444-444444444444';

function createQueryBuilder(result) {
  const builder = {};
  [
    'abortSignal',
    'delete',
    'eq',
    'gte',
    'in',
    'insert',
    'is',
    'limit',
    'lte',
    'or',
    'order',
    'range',
    'select',
    'update',
  ].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.single = jest.fn().mockResolvedValue(result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('ambulances service behavior boundaries', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    withAudit.mockImplementation(async (_action, _entity, operation) => operation());
    withRetry.mockImplementation(async (operation) => operation());
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('keeps UUID identity distinct from display-ID lookup and guards invalid UUID reads', async () => {
    const uuidRow = { id: AMBULANCE_ID, display_id: 'AMB-1' };
    const displayRow = { id: AMBULANCE_ID, display_id: 'AMB-1' };
    const uuidBuilder = createQueryBuilder({ data: uuidRow, error: null });
    const displayBuilder = createQueryBuilder({ data: displayRow, error: null });
    supabase.from
      .mockReturnValueOnce(uuidBuilder)
      .mockReturnValueOnce(displayBuilder);

    await expect(getAmbulance(AMBULANCE_ID)).resolves.toEqual(uuidRow);
    await expect(getAmbulance('AMB-1')).resolves.toEqual(displayRow);

    expect(uuidBuilder.eq).toHaveBeenCalledWith('id', AMBULANCE_ID);
    expect(displayBuilder.eq).toHaveBeenCalledWith('display_id', 'AMB-1');
    await expect(getDriverAmbulance('driver-label')).resolves.toBeNull();
    await expect(getHospitalAmbulances('hospital-label')).resolves.toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('preserves canonical org scope, legacy fallback, filters, and offset range', async () => {
    const builder = createQueryBuilder({ data: [{ id: AMBULANCE_ID }], error: null });
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [HOSPITAL_ID],
    });
    supabase.from.mockReturnValue(builder);

    await expect(getAmbulances({
      hospital_id: HOSPITAL_ID,
      status: 'available',
      type: 'ALS',
      limit: 20,
      offset: 40,
    })).resolves.toEqual([{ id: AMBULANCE_ID }]);

    expect(builder.or).toHaveBeenCalledWith(
      `organization_id.eq.${ORGANIZATION_ID},and(organization_id.is.null,hospital_id.in.(${HOSPITAL_ID}))`
    );
    expect(builder.eq).toHaveBeenCalledWith('hospital_id', HOSPITAL_ID);
    expect(builder.eq).toHaveBeenCalledWith('status', 'available');
    expect(builder.eq).toHaveBeenCalledWith('type', 'ALS');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(20);
    expect(builder.range).toHaveBeenCalledWith(40, 59);
    expect(applyAuthFilter).not.toHaveBeenCalled();
  });

  it('preserves quiet read failures without converting denied data to an empty list', async () => {
    const error = { code: '42501', message: 'permission denied' };
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error }));

    await expect(getAmbulances({ quiet: true })).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps exact page counts, search/status aliases, sorting, and bounded pagination', async () => {
    const row = {
      id: AMBULANCE_ID,
      hospital_id: HOSPITAL_ID,
      call_sign: 'UNIT-7',
      license_plate: 'IV-007',
    };
    const results = [
      { data: null, error: null, count: 42 },
      { data: [row], error: null, count: null },
      { data: null, error: null, count: 12 },
      { data: null, error: null, count: 5 },
      { data: null, error: null, count: 2 },
      { data: null, error: null, count: 6 },
      { data: null, error: null, count: 1 },
      // ADOPT-38: exact counts for the previously dormant DB-domain states --
      // a zero (pending_approval) stays an honest 0, never a fabricated presence.
      { data: null, error: null, count: 3 },
      { data: null, error: null, count: 4 },
      { data: null, error: null, count: 0 },
      { data: [{ id: HOSPITAL_ID, name: 'Central Station' }], error: null, count: null },
    ];
    const builders = [];
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [HOSPITAL_ID],
    });
    supabase.from.mockImplementation(() => {
      const builder = createQueryBuilder(results[builders.length]);
      builders.push(builder);
      return builder;
    });

    await expect(getAmbulancesPageData({
      filters: {
        search: 'Unit,7',
        status: 'on_route',
        type: ['ALS', 'BLS'],
        hospital: HOSPITAL_ID,
      },
      statsFilters: { type: 'ALS' },
      kpiFilter: 'busy',
      sortConfig: { key: 'call_sign', direction: 'asc' },
      limit: 20,
      offset: 20,
    })).resolves.toEqual({
      data: [{
        ...row,
        hospital: 'Central Station',
        station_name: 'Central Station',
        vehicle_label: 'IV-007',
      }],
      count: 42,
      stats: {
        total: 12,
        available: 5,
        onRoute: 2,
        busy: 6,
        maintenance: 1,
        returning: 3,
        offline: 4,
        pendingApproval: 0,
        exactCounts: true,
        source: 'ambulances.status',
      },
      recent: [{
        ...row,
        hospital: 'Central Station',
        station_name: 'Central Station',
        vehicle_label: 'IV-007',
      }],
    });

    const [countBuilder, pageBuilder, ...statAndHospitalBuilders] = builders;
    [countBuilder, pageBuilder].forEach((builder) => {
      expect(builder.or).toHaveBeenCalledWith(
        'call_sign.ilike.%Unit 7%,vehicle_number.ilike.%Unit 7%,license_plate.ilike.%Unit 7%'
      );
      expect(builder.eq).toHaveBeenCalledWith('status', 'en_route');
      expect(builder.in).toHaveBeenCalledWith(
        'status',
        ['dispatched', 'on_trip', 'en_route', 'on_scene']
      );
      expect(builder.in).toHaveBeenCalledWith('type', ['ALS', 'BLS']);
      expect(builder.eq).toHaveBeenCalledWith('hospital_id', HOSPITAL_ID);
    });
    expect(countBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(pageBuilder.order).toHaveBeenCalledWith('call_sign', { ascending: true });
    expect(pageBuilder.range).toHaveBeenCalledWith(20, 39);
    statAndHospitalBuilders.slice(0, 8).forEach((builder) => {
      expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  it('retains the update allowlist and direct operational write receivers', async () => {
    const updateBuilder = createQueryBuilder({ data: { id: AMBULANCE_ID }, error: null });
    const assignBuilder = createQueryBuilder({ data: { id: AMBULANCE_ID }, error: null });
    const locationBuilder = createQueryBuilder({ data: { id: AMBULANCE_ID }, error: null });
    const statusBuilder = createQueryBuilder({ data: { id: AMBULANCE_ID }, error: null });
    supabase.from
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(assignBuilder)
      .mockReturnValueOnce(locationBuilder)
      .mockReturnValueOnce(statusBuilder);

    await updateAmbulance(AMBULANCE_ID, {
      call_sign: 'UNIT-9',
      display_id: 'AMB-FORGED',
      driver_id: DRIVER_ID,
      hospital_id: '',
      organization_id: '',
      status: 'offline',
      unexpected_column: 'do-not-forward',
    });
    await assignDriverToAmbulance(AMBULANCE_ID, DRIVER_ID);
    await updateAmbulanceLocation(AMBULANCE_ID, { lat: 1, lng: 2 });
    await updateAmbulanceStatus(AMBULANCE_ID, 'maintenance');

    expect(updateBuilder.update).toHaveBeenCalledWith({
      call_sign: 'UNIT-9',
      hospital_id: null,
      organization_id: null,
      profile_id: DRIVER_ID,
      updated_at: expect.any(String),
    });
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', AMBULANCE_ID);
    expect(assignBuilder.update).toHaveBeenCalledWith({
      profile_id: DRIVER_ID,
      updated_at: expect.any(String),
    });
    expect(locationBuilder.update).toHaveBeenCalledWith({
      location: { lat: 1, lng: 2 },
      updated_at: expect.any(String),
    });
    expect(statusBuilder.update).toHaveBeenCalledWith({
      status: 'maintenance',
      updated_at: expect.any(String),
    });
    expect(withAudit).toHaveBeenCalledWith(
      'ambulance.assign_driver',
      'ambulance',
      expect.any(Function),
      { ambulance_id: AMBULANCE_ID, driver_id: DRIVER_ID }
    );
    expect(withAudit).toHaveBeenCalledWith(
      'ambulance.update_status',
      'ambulance',
      expect.any(Function),
      { ambulance_id: AMBULANCE_ID, status: 'maintenance' }
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('preserves realtime payload filtering, event forwarding, and channel cleanup', () => {
    const subscriptions = [];
    supabase.channel.mockImplementation((name) => {
      const subscribedChannel = { name: `${name}-subscribed` };
      const subscription = { name, subscribedChannel };
      const channelBuilder = {
        on: jest.fn((_event, config, handler) => {
          subscription.config = config;
          subscription.handler = handler;
          return channelBuilder;
        }),
        subscribe: jest.fn(() => subscribedChannel),
      };
      subscriptions.push(subscription);
      return channelBuilder;
    });
    const singleCallback = jest.fn();
    const allCallback = jest.fn();

    const cleanupSingle = subscribeToAmbulance(AMBULANCE_ID, singleCallback);
    const cleanupAll = subscribeToAllAmbulances(allCallback);

    expect(subscriptions[0].config).toEqual({
      event: '*',
      schema: 'public',
      table: 'ambulances',
      filter: `id=eq.${AMBULANCE_ID}`,
    });
    expect(subscriptions[1].config).toEqual({
      event: '*',
      schema: 'public',
      table: 'ambulances',
    });

    subscriptions[0].handler({ old: { id: AMBULANCE_ID }, new: null });
    subscriptions[0].handler({ new: { id: AMBULANCE_ID, status: 'available' } });
    subscriptions[1].handler({ new: { id: AMBULANCE_ID }, eventType: 'UPDATE' });

    expect(singleCallback).toHaveBeenCalledTimes(1);
    expect(singleCallback).toHaveBeenCalledWith({ id: AMBULANCE_ID, status: 'available' });
    expect(allCallback).toHaveBeenCalledWith({ id: AMBULANCE_ID }, 'UPDATE');

    cleanupSingle();
    cleanupAll();
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(1, subscriptions[0].subscribedChannel);
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(2, subscriptions[1].subscribedChannel);
  });
});
