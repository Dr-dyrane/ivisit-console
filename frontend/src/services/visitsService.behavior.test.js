import {
  getDoctorVisits,
  getHospitalVisits,
  getUserVisits,
  getVisit,
  getVisitByRequestId,
  getVisits,
  getVisitsPageData,
  subscribeToAllVisits,
  subscribeToUserVisits,
  subscribeToVisit,
} from './visitsService';
import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';
import { applyAuthFilter, getCurrentUser } from './authService';
import { withRetry } from './supabaseHelpers';
import {
  GENERIC_VISIT_SELECT,
  GENERIC_VISIT_SOURCE_FILTER,
  GENERIC_VISIT_WITH_PATIENT_SELECT,
} from './visits/pageProjection';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../lib/utils', () => ({
  isValidUUID: jest.fn(),
}));

jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn(),
  getCurrentUser: jest.fn(),
}));

jest.mock('./supabaseHelpers', () => ({
  withRetry: jest.fn(),
}));

const tableResults = new Map();
const queryBuilders = [];

const setTableResults = (table, ...results) => {
  tableResults.set(table, [...results]);
};

const getBuildersFor = (table) => (
  queryBuilders.filter((entry) => entry.table === table).map((entry) => entry.builder)
);

const createQueryBuilder = (table, result) => {
  const builder = {};
  [
    'abortSignal',
    'eq',
    'gte',
    'in',
    'limit',
    'lte',
    'or',
    'order',
    'range',
    'select',
  ].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  queryBuilders.push({ table, builder });
  return builder;
};

describe('visits service read and realtime behavior', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    tableResults.clear();
    queryBuilders.length = 0;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    applyAuthFilter.mockImplementation((query) => query);
    withRetry.mockImplementation((operation) => operation());
    isValidUUID.mockReturnValue(true);
    supabase.from.mockImplementation((table) => {
      const queue = tableResults.get(table) || [];
      const result = queue.length > 0
        ? queue.shift()
        : { data: [], error: null, count: 0 };
      return createQueryBuilder(table, result);
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('keeps RBAC, search, resolved filtering, exact count, sorting, and pagination service-owned', async () => {
    const rows = [
      { id: 'visit-scheduled', status: 'scheduled', type: 'emergency', date: '2020-02-02' },
      { id: 'visit-active', status: 'active', type: 'emergency', date: '2020-01-01' },
      { id: 'visit-completed', status: 'completed', type: 'emergency', date: '2020-03-03' },
      { id: 'visit-no-show', status: 'no-show', type: 'emergency', date: '2020-04-04' },
    ];
    setTableResults('visits', { data: rows, error: null, count: 4 });

    await expect(getVisitsPageData({
      filters: {
        search: '  ER, % urgent  ',
        visit_type: ['emergency'],
        status: ['scheduled', 'in_progress'],
        date: { start: '2020-01-01', end: '2020-12-31' },
      },
      range: { start: 1, end: 1 },
      sortConfig: { key: 'date', direction: 'asc' },
      quiet: true,
    })).resolves.toEqual({
      visits: [expect.objectContaining({
        id: 'visit-scheduled',
        status: 'scheduled',
        visit_type: 'emergency',
      })],
      count: 2,
      stats: {
        total: 4,
        scheduled: 1,
        inProgress: 1,
        completed: 1,
        cancelled: 1,
        today: 0,
      },
    });

    const [query] = getBuildersFor('visits');
    expect(applyAuthFilter).toHaveBeenCalledWith(query, { id: 'admin-1', role: 'admin' }, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id',
      providerIdField: 'doctor_name',
      resourceType: 'visit',
    });
    expect(query.select).toHaveBeenCalledWith(GENERIC_VISIT_SELECT, { count: 'exact' });
    expect(query.range).toHaveBeenCalledWith(0, 4999);
    expect(query.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(query.in).toHaveBeenCalledWith('type', ['emergency']);
    expect(query.gte).toHaveBeenCalledWith('date', '2020-01-01');
    expect(query.lte).toHaveBeenCalledWith('date', '2020-12-31');
    expect(query.or).toHaveBeenCalledWith([
      'display_id.ilike.%ER urgent%',
      'type.ilike.%ER urgent%',
      'hospital_name.ilike.%ER urgent%',
      'doctor_name.ilike.%ER urgent%',
      'room_number.ilike.%ER urgent%',
    ].join(','));
    expect(query.eq).not.toHaveBeenCalledWith('status', expect.anything());
    expect(query.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('preserves request-derived status and identity enrichment as read-only evidence', async () => {
    setTableResults('visits', {
      data: [{
        id: 'visit-1',
        request_id: 'request-1',
        user_id: 'patient-1',
        status: 'scheduled',
      }],
      error: null,
      count: 1,
    });
    setTableResults('profiles', {
      data: [{ id: 'patient-1', full_name: 'Patient One' }],
      error: null,
    });
    setTableResults('emergency_requests', {
      data: [{
        id: 'request-1',
        status: 'accepted',
        hospital_id: 'hospital-1',
        service_type: 'ambulance',
        assigned_doctor_id: 'doctor-1',
      }],
      error: null,
    });
    setTableResults('doctors', {
      data: [{ id: 'doctor-1', name: 'Doctor One' }],
      error: null,
    });
    setTableResults('hospitals', {
      data: [{ id: 'hospital-1', name: 'Central Hospital', address: 'Main Road' }],
      error: null,
    });

    const result = await getVisitsPageData({ quiet: true });

    expect(result.visits[0]).toMatchObject({
      id: 'visit-1',
      request_id: 'request-1',
      source_status: 'scheduled',
      emergency_status: 'accepted',
      status: 'in_progress',
      hospital_id: 'hospital-1',
      hospital_name: 'Central Hospital',
      doctor_name: 'Doctor One',
      doctor: 'Doctor One',
      type: 'ambulance',
      visit_type: 'ambulance',
      patient: { id: 'patient-1', full_name: 'Patient One' },
    });
    expect(getBuildersFor('emergency_requests')[0].in)
      .toHaveBeenCalledWith('id', ['request-1']);
  });

  it('fails honestly when the scoped source exceeds the resolver limit', async () => {
    setTableResults('visits', {
      data: [{ id: 'visit-1' }],
      error: null,
      count: 5001,
    });

    await expect(getVisitsPageData({ quiet: true })).rejects.toThrow(
      'Visit source projection is larger than the client resolver limit; backend visit status projection required.'
    );

    expect(getBuildersFor('visits')).toHaveLength(1);
    expect(getBuildersFor('visits')[0].range).toHaveBeenCalledWith(0, 4999);
  });

  it('preserves broad read RBAC, filter, range, and normalized patient behavior', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'provider-1',
      role: 'provider',
      organization_id: 'org-1',
    });
    setTableResults('visits', {
      data: [{
        id: 'visit-1',
        doctor_name: 'Doctor One',
        type: 'checkup',
        profiles: { id: 'patient-1', full_name: 'Patient One' },
      }],
      error: null,
    });

    const result = await getVisits({
      user_id: 'patient-1',
      doctor_name: 'Doctor One',
      hospital_id: 'hospital-1',
      status: 'scheduled',
      visit_type: 'checkup',
      date_from: '2020-01-01',
      date_to: '2020-12-31',
      limit: 10,
      offset: 20,
    });

    expect(result).toEqual([expect.objectContaining({
      id: 'visit-1',
      doctor: 'Doctor One',
      visit_type: 'checkup',
      patient: { id: 'patient-1', full_name: 'Patient One' },
      profiles: undefined,
    })]);

    const [query] = getBuildersFor('visits');
    expect(query.select).toHaveBeenCalledWith(GENERIC_VISIT_WITH_PATIENT_SELECT);
    expect(query.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(applyAuthFilter).toHaveBeenCalledWith(query, {
      id: 'provider-1',
      role: 'provider',
      organization_id: 'org-1',
    }, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id',
      providerIdField: 'doctor_name',
      resourceType: 'visit',
    });
    expect(query.eq).toHaveBeenCalledWith('user_id', 'patient-1');
    expect(query.eq).toHaveBeenCalledWith('doctor_name', 'Doctor One');
    expect(query.eq).toHaveBeenCalledWith('hospital_id', 'hospital-1');
    expect(query.eq).toHaveBeenCalledWith('status', 'scheduled');
    expect(query.eq).toHaveBeenCalledWith('type', 'checkup');
    expect(query.gte).toHaveBeenCalledWith('date', '2020-01-01');
    expect(query.lte).toHaveBeenCalledWith('date', '2020-12-31');
    expect(query.order).toHaveBeenCalledWith('date', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.range).toHaveBeenCalledWith(20, 29);
  });

  it('keeps UUID detail identity distinct from display-ID lookup identity', async () => {
    const visitUuid = '11111111-1111-4111-8111-111111111111';
    setTableResults(
      'visits',
      { data: { id: visitUuid, display_id: 'VIS-1' }, error: null },
      { data: { id: visitUuid, display_id: 'VIS-1' }, error: null }
    );
    isValidUUID.mockImplementation((value) => value === visitUuid);

    await getVisit(visitUuid);
    await getVisit('VIS-1');

    const [uuidQuery, displayQuery] = getBuildersFor('visits');
    expect(uuidQuery.select).toHaveBeenCalledWith(GENERIC_VISIT_WITH_PATIENT_SELECT);
    expect(displayQuery.select).toHaveBeenCalledWith(GENERIC_VISIT_WITH_PATIENT_SELECT);
    expect(uuidQuery.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(displayQuery.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(uuidQuery.eq).toHaveBeenCalledWith('id', visitUuid);
    expect(uuidQuery.eq).not.toHaveBeenCalledWith('display_id', expect.anything());
    expect(displayQuery.eq).toHaveBeenCalledWith('display_id', 'VIS-1');
    expect(displayQuery.eq).not.toHaveBeenCalledWith('id', expect.anything());
    expect(uuidQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(displayQuery.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('queries request_id first and preserves the legacy display-ID fallback', async () => {
    setTableResults(
      'visits',
      { data: null, error: null },
      {
        data: {
          id: 'visit-legacy',
          display_id: 'request-legacy',
          profiles: { id: 'patient-1' },
        },
        error: null,
      }
    );
    isValidUUID.mockReturnValue(false);

    await expect(getVisitByRequestId('request-legacy')).resolves.toMatchObject({
      id: 'visit-legacy',
      display_id: 'request-legacy',
      patient: { id: 'patient-1' },
    });

    const [requestQuery, fallbackQuery] = getBuildersFor('visits');
    expect(requestQuery.select).toHaveBeenCalledWith(GENERIC_VISIT_WITH_PATIENT_SELECT);
    expect(requestQuery.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(fallbackQuery.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(requestQuery.eq).toHaveBeenCalledWith('request_id', 'request-legacy');
    expect(requestQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(requestQuery.limit).toHaveBeenCalledWith(1);
    expect(fallbackQuery.eq).toHaveBeenCalledWith('display_id', 'request-legacy');
  });

  it('guards UUID-scoped user and hospital reads without applying that guard to doctor_name', async () => {
    isValidUUID.mockReturnValue(false);

    await expect(getUserVisits('not-a-uuid')).resolves.toEqual([]);
    await expect(getHospitalVisits('not-a-uuid')).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();

    setTableResults('visits', {
      data: [{ id: 'visit-1', doctor_name: 'Doctor One' }],
      error: null,
    });
    await expect(getDoctorVisits('Doctor One')).resolves.toEqual([
      expect.objectContaining({ id: 'visit-1', doctor: 'Doctor One' }),
    ]);

    const [doctorQuery] = getBuildersFor('visits');
    expect(doctorQuery.select).toHaveBeenCalledWith(GENERIC_VISIT_SELECT, undefined);
    expect(doctorQuery.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(doctorQuery.eq).toHaveBeenCalledWith('doctor_name', 'Doctor One');
    expect(isValidUUID).toHaveBeenCalledTimes(2);
  });

  it('rethrows read errors by identity and honors quiet logging', async () => {
    const error = { code: '42501', message: 'permission denied' };
    setTableResults('visits', { data: null, error });

    await expect(getVisits({ quiet: true })).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('preserves realtime channel filters, callback signatures, and cleanup', () => {
    const subscriptions = new Map();
    supabase.channel.mockImplementation((name) => {
      const subscribedChannel = { name };
      const channelBuilder = {
        on: jest.fn((_event, config, handler) => {
          subscriptions.set(name, { config, handler, subscribedChannel });
          return channelBuilder;
        }),
        subscribe: jest.fn(() => subscribedChannel),
      };
      return channelBuilder;
    });

    const visitCallback = jest.fn();
    const userCallback = jest.fn();
    const cleanVisit = subscribeToVisit('visit-1', visitCallback);
    expect(() => subscribeToAllVisits(jest.fn())).toThrow(
      'Unscoped visits realtime is unavailable.',
    );
    const cleanUser = subscribeToUserVisits('user-1', userCallback);

    expect(subscriptions.get('visit_visit-1').config).toEqual({
      event: '*',
      schema: 'public',
      table: 'visits',
      filter: 'id=eq.visit-1',
    });
    expect(subscriptions.has('visits_all')).toBe(false);
    expect(subscriptions.get('user_visits_user-1').config).toEqual({
      event: '*',
      schema: 'public',
      table: 'visits',
      filter: 'user_id=eq.user-1',
    });

    subscriptions.get('visit_visit-1').handler({ new: null, eventType: 'DELETE' });
    subscriptions.get('visit_visit-1').handler({ new: { id: 'visit-1' }, eventType: 'UPDATE' });
    subscriptions.get('user_visits_user-1').handler({
      new: { id: 'visit-3' },
      eventType: 'UPDATE',
    });

    expect(visitCallback).toHaveBeenCalledWith({ id: 'visit-1' });
    expect(userCallback).toHaveBeenCalledWith({ id: 'visit-3' }, 'UPDATE');

    cleanVisit();
    cleanUser();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(
      1,
      subscriptions.get('visit_visit-1').subscribedChannel
    );
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(
      2,
      subscriptions.get('user_visits_user-1').subscribedChannel
    );
  });
});
