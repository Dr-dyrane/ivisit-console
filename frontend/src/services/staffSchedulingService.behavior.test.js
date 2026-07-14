import {
  checkScheduleConflicts,
  confirmHospitalTimezone,
  createStaffSchedule,
  deleteStaffSchedule,
  getAvailableStaff,
  getScheduleFacilities,
  getStaffScheduleById,
  getStaffSchedules,
  subscribeToScheduleUpdates,
  updateStaffSchedule,
} from './staffSchedulingService';
import { getCurrentUser } from './authService';
import { getDefaultScheduleWindow } from './staff-scheduling/reads';
import { supabase } from '../lib/supabase';

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
}));

const HOSPITAL_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_DOCTOR_ID = '33333333-3333-4333-8333-333333333333';
const SCHEDULE_ID = '44444444-4444-4444-8444-444444444444';
const PROFILE_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_SCHEDULE_ID = '66666666-6666-4666-8666-666666666666';

const scheduleDraft = {
  doctor_id: DOCTOR_ID,
  date: '2026-07-15',
  start_time: '09:00',
  end_time: '17:00',
  shift_type: 'day',
  is_available: true,
};

const rpcSchedule = {
  schedule_id: SCHEDULE_ID,
  doctor_id: DOCTOR_ID,
  doctor_name: 'Dr. Morgan Lee',
  hospital_id: HOSPITAL_ID,
  hospital_name: 'North Clinic',
  scheduled_timezone: 'America/Los_Angeles',
  schedule_date: '2026-07-15',
  start_time: '09:00:00',
  end_time: '17:00:00',
  shift_type: 'day',
  is_available: true,
  updated_at: '2026-07-13T12:00:00.000Z',
};

const createQueryBuilder = (result) => {
  const builder = {};
  ['eq', 'gt', 'in', 'lt', 'neq', 'not', 'order', 'range', 'select'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

describe('staff scheduling canonical contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: PROFILE_ID, role: 'admin' });
    supabase.rpc.mockResolvedValue({ data: [], error: null });
  });

  it('reads and normalizes the canonical schedule RPC projection', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [rpcSchedule], error: null });

    const result = await getStaffSchedules({
      hospital_id: HOSPITAL_ID,
      date_from: '2026-07-14',
      date_to: '2026-07-27',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_console_doctor_schedules', {
      p_hospital_id: HOSPITAL_ID,
      p_from_date: '2026-07-14',
      p_to_date: '2026-07-27',
    });
    expect(result).toMatchObject({ total: 1, date_from: '2026-07-14', date_to: '2026-07-27' });
    expect(result.schedules[0]).toMatchObject({
      id: SCHEDULE_ID,
      doctor_id: DOCTOR_ID,
      doctor_name: 'Dr. Morgan Lee',
      hospital_id: HOSPITAL_ID,
      date: '2026-07-15',
      status: 'available',
      source_kind: 'doctor_schedule',
    });
  });

  it('derives default read boundaries from the requested facility timezone', () => {
    expect(getDefaultScheduleWindow(
      'America/Los_Angeles',
      new Date('2026-07-14T01:00:00.000Z'),
    )).toEqual({
      date_from: '2026-07-13',
      date_to: '2026-07-26',
    });
  });

  it('fails closed before schedule reads for unsupported roles', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: PROFILE_ID, role: 'provider' });

    await expect(getStaffSchedules()).rejects.toMatchObject({
      name: 'ScheduleContractError',
      code: 'authorization_denied',
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('uses only schedule RPC receivers for create, update, delete, and timezone confirmation', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: rpcSchedule, error: null })
      .mockResolvedValueOnce({ data: rpcSchedule, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { timezone: 'America/Los_Angeles' }, error: null });

    await createStaffSchedule(scheduleDraft);
    await updateStaffSchedule(SCHEDULE_ID, { ...scheduleDraft, shift_type: 'evening' });
    await deleteStaffSchedule(SCHEDULE_ID);
    await confirmHospitalTimezone(HOSPITAL_ID, ' America/Los_Angeles ');

    expect(supabase.rpc.mock.calls).toEqual([
      ['upsert_doctor_schedule', {
        p_doctor_id: DOCTOR_ID,
        p_date: '2026-07-15',
        p_start_time: '09:00',
        p_end_time: '17:00',
        p_shift_type: 'day',
        p_is_available: true,
      }],
      ['upsert_doctor_schedule', {
        p_doctor_id: DOCTOR_ID,
        p_date: '2026-07-15',
        p_start_time: '09:00',
        p_end_time: '17:00',
        p_shift_type: 'evening',
        p_is_available: true,
        p_schedule_id: SCHEDULE_ID,
      }],
      ['delete_doctor_schedule', { p_schedule_id: SCHEDULE_ID }],
      ['confirm_hospital_timezone', {
        p_hospital_id: HOSPITAL_ID,
        p_timezone: 'America/Los_Angeles',
      }],
    ]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects an empty or invalid timezone before calling the confirmation RPC', async () => {
    await expect(confirmHospitalTimezone(HOSPITAL_ID, 'UTC+8')).rejects.toMatchObject({
      name: 'ScheduleContractError',
      code: 'invalid_timezone',
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('resolves schedule detail through the canonical RPC without a table seed read', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    supabase.rpc.mockResolvedValueOnce({ data: [rpcSchedule], error: null });

    await expect(getStaffScheduleById(SCHEDULE_ID)).resolves.toMatchObject({ id: SCHEDULE_ID });
    expect(supabase.rpc).toHaveBeenCalledWith('get_console_doctor_schedules', {
      p_from_date: '2026-06-13',
      p_to_date: '2026-12-09',
    });
    expect(supabase.from).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('keeps facility and clinician selectors explicitly scoped', async () => {
    getCurrentUser.mockResolvedValue({
      id: PROFILE_ID,
      role: 'org_admin',
      hospital_ids: [HOSPITAL_ID],
    });
    const facilityQuery = createQueryBuilder({
      data: [{
        id: HOSPITAL_ID,
        name: 'North Clinic',
        timezone: 'UTC',
        timezone_confirmed_at: null,
        timezone_confirmation_source: null,
      }],
      error: null,
      count: 1,
    });
    const rosterQuery = createQueryBuilder({
      data: [{
        id: DOCTOR_ID,
        name: 'Dr. Morgan Lee',
        profile_id: PROFILE_ID,
        specialization: 'Cardiology',
        status: 'available',
        hospital_id: HOSPITAL_ID,
      }],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(facilityQuery).mockReturnValueOnce(rosterQuery);

    const facilities = await getScheduleFacilities();
    const roster = await getAvailableStaff(HOSPITAL_ID);

    expect(supabase.from.mock.calls).toEqual([['hospitals'], ['doctors']]);
    expect(facilityQuery.in).toHaveBeenCalledWith('id', [HOSPITAL_ID]);
    expect(rosterQuery.eq).toHaveBeenCalledWith('hospital_id', HOSPITAL_ID);
    expect(facilities[0]).toMatchObject({
      id: HOSPITAL_ID,
      timezone: 'UTC',
      timezone_confirmed_at: null,
      timezone_confirmation_source: null,
    });
    expect(roster[0]).toMatchObject({ doctor_id: DOCTOR_ID, hospital_id: HOSPITAL_ID });
  });

  it('limits the admin facility selector to facilities that have clinicians', async () => {
    const clinicianFacilityQuery = createQueryBuilder({
      data: [{ hospital_id: HOSPITAL_ID }, { hospital_id: HOSPITAL_ID }],
      error: null,
      count: 2,
    });
    const facilityQuery = createQueryBuilder({
      data: [{
        id: HOSPITAL_ID,
        name: 'North Clinic',
        timezone: 'America/Los_Angeles',
        timezone_confirmed_at: '2026-07-13T12:00:00.000Z',
        timezone_confirmation_source: 'manual',
      }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(clinicianFacilityQuery).mockReturnValueOnce(facilityQuery);

    await expect(getScheduleFacilities()).resolves.toHaveLength(1);

    expect(supabase.from.mock.calls).toEqual([['doctors'], ['hospitals']]);
    expect(clinicianFacilityQuery.select).toHaveBeenCalledWith('hospital_id', { count: 'exact' });
    expect(clinicianFacilityQuery.not).toHaveBeenCalledWith('hospital_id', 'is', null);
    expect(facilityQuery.in).toHaveBeenCalledWith('id', [HOSPITAL_ID]);
  });

  it('uses the canonical schedule RPC projection for advisory overlap evidence', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        rpcSchedule,
        {
          ...rpcSchedule,
          schedule_id: OTHER_SCHEDULE_ID,
          start_time: '16:00:00',
          end_time: '18:00:00',
        },
        {
          ...rpcSchedule,
          schedule_id: '77777777-7777-4777-8777-777777777777',
          start_time: '08:00:00',
          end_time: '09:00:00',
        },
        {
          ...rpcSchedule,
          schedule_id: '88888888-8888-4888-8888-888888888888',
          doctor_id: OTHER_DOCTOR_ID,
        },
      ],
      error: null,
    });

    await expect(checkScheduleConflicts(
      DOCTOR_ID,
      '2026-07-15',
      '09:00',
      '17:00',
      SCHEDULE_ID,
      HOSPITAL_ID,
    )).resolves.toMatchObject({
      has_conflicts: true,
      conflicts: [expect.objectContaining({ id: OTHER_SCHEDULE_ID })],
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_console_doctor_schedules', {
      p_hospital_id: HOSPITAL_ID,
      p_from_date: '2026-07-15',
      p_to_date: '2026-07-15',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('scopes realtime to selected-facility roster doctor IDs and cleans up the channel', () => {
    const channel = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    channel.on.mockReturnValue(channel);
    supabase.channel.mockReturnValue(channel);
    const callback = jest.fn();

    const cleanup = subscribeToScheduleUpdates(
      HOSPITAL_ID,
      [DOCTOR_ID, OTHER_DOCTOR_ID, DOCTOR_ID, 'not-a-uuid'],
      callback,
    );

    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining(`doctor-schedules-${HOSPITAL_ID}-`));
    expect(channel.on).toHaveBeenCalledTimes(2);
    expect(channel.on).toHaveBeenNthCalledWith(1, 'postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'doctor_schedules',
      filter: `doctor_id=eq.${DOCTOR_ID}`,
    }, expect.any(Function));
    expect(channel.on).toHaveBeenNthCalledWith(2, 'postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'doctor_schedules',
      filter: `doctor_id=eq.${OTHER_DOCTOR_ID}`,
    }, expect.any(Function));
    expect(channel.subscribe).toHaveBeenCalledTimes(1);

    cleanup();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('does not create a broad realtime subscription without a safe roster scope', () => {
    const cleanup = subscribeToScheduleUpdates(HOSPITAL_ID, [], jest.fn());
    cleanup();
    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
