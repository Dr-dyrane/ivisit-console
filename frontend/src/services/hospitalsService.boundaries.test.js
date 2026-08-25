import {
  getHospital,
  getHospitals,
  getHospitalsPageData,
  subscribeToHospital,
} from './hospitalsService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('./supabaseHelpers', () => ({
  withAudit: async (_action, _entity, operation) => operation(),
  withRetry: async (operation) => operation(),
}));

const HOSPITAL_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';

const createQueryBuilder = (result) => {
  const builder = {};
  [
    'abortSignal',
    'contains',
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
  return builder;
};

describe('hospital read and realtime boundaries', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('preserves RLS rows, facility/org identity, filters, count, sort, and range scope', async () => {
    const abortController = new AbortController();
    const row = {
      id: HOSPITAL_ID,
      display_id: 'HSP-ABC123',
      organization_id: ORGANIZATION_ID,
      available_beds: 7,
    };
    const builder = createQueryBuilder({ data: [row], error: null, count: 41 });
    supabase.from.mockReturnValue(builder);

    await expect(getHospitals({
      id: HOSPITAL_ID,
      organization_id: ORGANIZATION_ID,
      status: ['available', 'busy'],
      verified: false,
      verification_status: 'pending',
      specialty: 'cardiology',
      date_from: '2026-07-01T00:00:00.000Z',
      date_to: '2026-07-31T23:59:59.999Z',
      search: ' East, %_ Clinic ',
      sortKey: 'name',
      sortDirection: 'asc',
      offset: 20,
      limit: 20,
      count: true,
      abortSignal: abortController.signal,
    })).resolves.toEqual({ data: [row], count: 41 });

    expect(supabase.from).toHaveBeenCalledWith('hospitals');
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(builder.eq).toHaveBeenCalledWith('id', HOSPITAL_ID);
    expect(builder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(builder.in).toHaveBeenCalledWith('status', ['available', 'busy']);
    expect(builder.eq).toHaveBeenCalledWith('verified', false);
    expect(builder.eq).toHaveBeenCalledWith('verification_status', 'pending');
    expect(builder.contains).toHaveBeenCalledWith('specialties', ['cardiology']);
    expect(builder.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00.000Z');
    expect(builder.lte).toHaveBeenCalledWith('created_at', '2026-07-31T23:59:59.999Z');
    expect(builder.or).toHaveBeenCalledWith(
      'name.ilike.%East Clinic%,address.ilike.%East Clinic%,display_id.ilike.%East Clinic%,phone.ilike.%East Clinic%'
    );
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(20, 39);
    expect(builder.limit).not.toHaveBeenCalled();
    expect(builder.abortSignal).toHaveBeenCalledWith(abortController.signal);
  });

  it('keeps the limit-only and deliberately unbounded read branches distinct', async () => {
    const limited = createQueryBuilder({ data: [], error: null });
    const unbounded = createQueryBuilder({ data: [], error: null });
    supabase.from
      .mockReturnValueOnce(limited)
      .mockReturnValueOnce(unbounded);

    await getHospitals({ limit: 500 });
    await getHospitals({});

    expect(limited.limit).toHaveBeenCalledWith(500);
    expect(limited.range).not.toHaveBeenCalled();
    expect(unbounded.limit).not.toHaveBeenCalled();
    expect(unbounded.range).not.toHaveBeenCalled();
  });

  it('resolves UUID and display-ID detail without collapsing organization identity', async () => {
    const uuidRow = { id: HOSPITAL_ID, organization_id: ORGANIZATION_ID };
    const displayRow = { id: HOSPITAL_ID, display_id: 'HSP-ABC123', organization_id: ORGANIZATION_ID };
    const uuidBuilder = createQueryBuilder({ data: uuidRow, error: null });
    const displayBuilder = createQueryBuilder({ data: displayRow, error: null });
    supabase.from
      .mockReturnValueOnce(uuidBuilder)
      .mockReturnValueOnce(displayBuilder);

    await expect(getHospital(HOSPITAL_ID, { organizationId: ORGANIZATION_ID })).resolves.toEqual(uuidRow);
    await expect(getHospital('HSP-ABC123')).resolves.toEqual(displayRow);

    expect(uuidBuilder.eq).toHaveBeenCalledWith('id', HOSPITAL_ID);
    expect(uuidBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(displayBuilder.eq).toHaveBeenCalledWith('display_id', 'HSP-ABC123');
  });

  it('combines a bounded page with independent exact counts and visible capacity scope', async () => {
    const rows = [
      { id: HOSPITAL_ID, organization_id: ORGANIZATION_ID, available_beds: '7', ambulances_count: 2 },
      { id: '33333333-3333-4333-8333-333333333333', organization_id: ORGANIZATION_ID, available_beds: 3, ambulances_count: '4' },
    ];
    const pageBuilder = createQueryBuilder({ data: rows, error: null, count: 42 });
    const countBuilders = [9, 4, 1, 2, 7]
      .map((count) => createQueryBuilder({ data: null, error: null, count }));
    const organizationsBuilder = createQueryBuilder({
      data: [{ id: ORGANIZATION_ID, name: ' Mercy Health Network ' }],
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(pageBuilder)
      .mockReturnValueOnce(countBuilders[0])
      .mockReturnValueOnce(countBuilders[1])
      .mockReturnValueOnce(countBuilders[2])
      .mockReturnValueOnce(countBuilders[3])
      .mockReturnValueOnce(countBuilders[4])
      .mockReturnValueOnce(organizationsBuilder);

    const enrichedRows = rows.map((row) => ({
      ...row,
      organization_name: 'Mercy Health Network',
    }));

    await expect(getHospitalsPageData({
      filters: { verification_status: 'approved' },
      statsFilters: { date_from: '2026-07-01T00:00:00.000Z' },
      limit: 20,
      offset: 20,
    })).resolves.toEqual({
      data: enrichedRows,
      count: 42,
      stats: {
        total: 9,
        available: 4,
        full: 1,
        busy: 2,
        verified: 7,
        exactCounts: true,
        visibleBeds: 10,
        visibleAmbulances: 6,
      },
      recent: enrichedRows,
    });

    expect(pageBuilder.range).toHaveBeenCalledWith(20, 39);
    countBuilders.forEach((builder) => {
      expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(builder.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00.000Z');
    });
    expect(countBuilders[1].eq).toHaveBeenCalledWith('status', 'available');
    expect(countBuilders[2].eq).toHaveBeenCalledWith('status', 'full');
    expect(countBuilders[3].eq).toHaveBeenCalledWith('status', 'busy');
    expect(countBuilders[4].eq).toHaveBeenCalledWith('verified', true);

    // ADOPT-60: ONE batched organizations read for the landed window, with the
    // shared organization id deduplicated and the name trimmed on the way in.
    expect(supabase.from).toHaveBeenLastCalledWith('organizations');
    expect(organizationsBuilder.select).toHaveBeenCalledWith('id, name');
    expect(organizationsBuilder.in).toHaveBeenCalledWith('id', [ORGANIZATION_ID]);
  });

  it('skips the organizations read entirely when the window carries no organization ids (ADOPT-60)', async () => {
    const rows = [{ id: HOSPITAL_ID, organization_id: null, available_beds: 1, ambulances_count: 0 }];
    const pageBuilder = createQueryBuilder({ data: rows, error: null, count: 1 });
    const countBuilders = [1, 1, 0, 0, 0]
      .map((count) => createQueryBuilder({ data: null, error: null, count }));
    supabase.from
      .mockReturnValueOnce(pageBuilder)
      .mockReturnValueOnce(countBuilders[0])
      .mockReturnValueOnce(countBuilders[1])
      .mockReturnValueOnce(countBuilders[2])
      .mockReturnValueOnce(countBuilders[3])
      .mockReturnValueOnce(countBuilders[4]);

    const result = await getHospitalsPageData({ limit: 20, offset: 0 });

    // 1 page read + 5 exact counts, and nothing else: no ids means no lookup.
    expect(supabase.from).toHaveBeenCalledTimes(6);
    expect(result.data[0]).toMatchObject({ organization_id: null, organization_name: null });
  });

  it('keeps the page read alive when organization resolution fails and leaves names honestly null (ADOPT-60)', async () => {
    const rows = [{ id: HOSPITAL_ID, organization_id: ORGANIZATION_ID, available_beds: 2, ambulances_count: 1 }];
    const pageBuilder = createQueryBuilder({ data: rows, error: null, count: 1 });
    const countBuilders = [1, 1, 0, 0, 0]
      .map((count) => createQueryBuilder({ data: null, error: null, count }));
    const deniedBuilder = createQueryBuilder({
      data: null,
      error: { code: '42501', message: 'permission denied for table organizations' },
    });
    supabase.from
      .mockReturnValueOnce(pageBuilder)
      .mockReturnValueOnce(countBuilders[0])
      .mockReturnValueOnce(countBuilders[1])
      .mockReturnValueOnce(countBuilders[2])
      .mockReturnValueOnce(countBuilders[3])
      .mockReturnValueOnce(countBuilders[4])
      .mockReturnValueOnce(deniedBuilder);

    const result = await getHospitalsPageData({ limit: 20, offset: 0, quiet: true });

    expect(result.count).toBe(1);
    expect(result.data[0]).toMatchObject({
      organization_id: ORGANIZATION_ID,
      organization_name: null,
    });
    // quiet read: the non-fatal resolution failure does not log either.
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('rethrows read errors unchanged and honors quiet logging', async () => {
    const error = { code: '42501', message: 'permission denied' };
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error }));

    await expect(getHospitals({ quiet: true })).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the hospital-id realtime filter, new-row callback, and channel cleanup', () => {
    let changeHandler;
    const subscribedChannel = { topic: 'hospital-topic' };
    const channelBuilder = {
      on: jest.fn((_event, _config, handler) => {
        changeHandler = handler;
        return channelBuilder;
      }),
      subscribe: jest.fn(() => subscribedChannel),
    };
    supabase.channel.mockReturnValue(channelBuilder);
    const callback = jest.fn();

    const cleanup = subscribeToHospital(HOSPITAL_ID, callback);

    expect(supabase.channel).toHaveBeenCalledWith(`hospital_${HOSPITAL_ID}`);
    expect(channelBuilder.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hospitals',
        filter: `id=eq.${HOSPITAL_ID}`,
      },
      expect.any(Function)
    );

    changeHandler({ old: { id: HOSPITAL_ID }, new: null });
    changeHandler({ new: { id: HOSPITAL_ID, status: 'busy' } });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ id: HOSPITAL_ID, status: 'busy' });

    cleanup();
    expect(supabase.removeChannel).toHaveBeenCalledWith(subscribedChannel);
  });
});
