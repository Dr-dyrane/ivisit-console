import {
  checkScheduleConflicts,
  createStaffSchedule,
  deleteStaffSchedule,
  getAvailableStaff,
  getScheduleStats,
  getStaffScheduleById,
  getStaffSchedules,
  subscribeToScheduleUpdates,
  updateStaffSchedule,
} from './staffSchedulingService';
import { applyAuthFilter, getCurrentUser } from './authService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn(),
  getCurrentUser: jest.fn(),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';
const FACILITY_ID = '33333333-3333-4333-8333-333333333333';
const PROFILE_ID = '44444444-4444-4444-8444-444444444444';
const PROVIDER_ID = '55555555-5555-4555-8555-555555555555';
const DOCTOR_ID = '66666666-6666-4666-8666-666666666666';
const AMBULANCE_ID = '77777777-7777-4777-8777-777777777777';
const NOW = '2026-07-13T12:34:56.000Z';
const TODAY = '2026-07-13';

const user = {
  id: USER_ID,
  organization_id: ORGANIZATION_ID,
  role: 'org_admin',
};

const createQueryBuilder = (result) => {
  const builder = {};
  ['eq', 'in', 'select', 'update'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.single = jest.fn().mockResolvedValue(result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

const compactSelect = (value) => value.replace(/\s/g, '');

describe('staff scheduling service behavior', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(NOW));
    getCurrentUser.mockResolvedValue(user);
    applyAuthFilter.mockImplementation((query) => query);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    jest.useRealTimers();
  });

  it('preserves scoped schedule reads, exact projections, filters, and UTC date/time defaults', async () => {
    const ambulance = {
      id: AMBULANCE_ID,
      call_sign: 'MED-7',
      crew: ['Taylor Reed'],
      hospital_id: FACILITY_ID,
      hospital: 'North Clinic',
      status: 'available',
      type: 'als',
      created_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-12T10:00:00.000Z',
    };
    const doctor = {
      id: DOCTOR_ID,
      name: 'Fallback Name',
      profile_id: PROFILE_ID,
      specialization: 'Cardiology',
      status: 'available',
      experience: 8,
      hospital_id: FACILITY_ID,
      created_at: '2026-06-01T10:00:00.000Z',
      updated_at: '2026-07-11T10:00:00.000Z',
      profiles: { full_name: 'Dr. Morgan Lee' },
    };
    const ambulanceQuery = createQueryBuilder({ data: [ambulance], error: null });
    const doctorQuery = createQueryBuilder({ data: [doctor], error: null });
    supabase.from
      .mockReturnValueOnce(ambulanceQuery)
      .mockReturnValueOnce(doctorQuery);

    await expect(getStaffSchedules({
      hospital_id: FACILITY_ID,
      status: 'on_duty',
      date_from: TODAY,
      date_to: TODAY,
    })).resolves.toEqual({
      schedules: [
        {
          id: `${AMBULANCE_ID}_crew_0`,
          profile_id: null,
          profile_name: 'Taylor Reed',
          ambulance_id: AMBULANCE_ID,
          ambulance_call_sign: 'MED-7',
          hospital_id: FACILITY_ID,
          hospital_name: 'North Clinic',
          date: TODAY,
          start_time: '00:00',
          end_time: '23:59',
          shift_type: 'day',
          status: 'on_duty',
          notes: 'Assigned to MED-7',
          created_at: '2026-07-01T10:00:00.000Z',
          updated_at: '2026-07-12T10:00:00.000Z',
          schedule_type: 'ambulance_crew',
        },
        {
          id: `doctor_${DOCTOR_ID}`,
          profile_id: PROFILE_ID,
          profile_name: 'Dr. Morgan Lee',
          doctor_id: DOCTOR_ID,
          hospital_id: FACILITY_ID,
          specialization: 'Cardiology',
          date: TODAY,
          start_time: '09:00',
          end_time: '17:00',
          shift_type: 'day',
          status: 'on_duty',
          notes: 'Cardiology - 8 years experience',
          created_at: '2026-06-01T10:00:00.000Z',
          updated_at: '2026-07-11T10:00:00.000Z',
          schedule_type: 'doctor_shift',
        },
      ],
      total: 2,
    });

    expect(supabase.from.mock.calls).toEqual([
      ['ambulances'],
      ['doctors'],
    ]);
    expect(compactSelect(ambulanceQuery.select.mock.calls[0][0])).toBe(
      'id,call_sign,crew,hospital_id,hospital,status,type,created_at,updated_at'
    );
    expect(compactSelect(doctorQuery.select.mock.calls[0][0])).toBe(
      'id,name,profile_id,specialization,status,experience,hospital_id,created_at,updated_at,profiles!inner(id,full_name,username,email,phone)'
    );
    expect(applyAuthFilter).toHaveBeenNthCalledWith(1, ambulanceQuery, user, {
      orgIdField: 'hospital_id',
      resourceType: 'ambulance',
    });
    expect(applyAuthFilter).toHaveBeenNthCalledWith(2, doctorQuery, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital_id',
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('preserves doctor and provider UUID ownership in the available roster read', async () => {
    const doctorQuery = createQueryBuilder({
      data: [{
        id: DOCTOR_ID,
        name: 'Fallback Doctor',
        profile_id: PROFILE_ID,
        specialization: 'Neurology',
        experience: 5,
        hospital_id: FACILITY_ID,
        profiles: {
          full_name: 'Dr. Casey Hall',
          email: 'casey@example.test',
          phone: '555-0100',
        },
      }],
      error: null,
    });
    const providerQuery = createQueryBuilder({
      data: [{
        id: PROVIDER_ID,
        full_name: 'Jordan Ellis',
        username: 'jordan',
        email: 'jordan@example.test',
        phone: '555-0101',
        role: 'provider',
        provider_type: 'paramedic',
        organization_id: FACILITY_ID,
      }],
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(doctorQuery)
      .mockReturnValueOnce(providerQuery);

    await expect(getAvailableStaff(FACILITY_ID)).resolves.toEqual([
      {
        id: PROFILE_ID,
        name: 'Dr. Casey Hall',
        role: 'Doctor',
        department: 'Neurology',
        email: 'casey@example.test',
        phone: '555-0100',
        profile_type: 'doctor',
        doctor_id: DOCTOR_ID,
        hospital_id: FACILITY_ID,
        experience: 5,
      },
      {
        id: PROVIDER_ID,
        name: 'Jordan Ellis',
        role: 'Paramedic',
        department: 'Emergency Services',
        email: 'jordan@example.test',
        phone: '555-0101',
        profile_type: 'paramedic',
        hospital_id: FACILITY_ID,
      },
    ]);

    expect(supabase.from.mock.calls).toEqual([['doctors'], ['profiles']]);
    expect(compactSelect(doctorQuery.select.mock.calls[0][0])).toBe(
      'id,name,profile_id,specialization,status,experience,hospital_id,profiles!inner(id,full_name,username,email,phone,role,provider_type)'
    );
    expect(compactSelect(providerQuery.select.mock.calls[0][0])).toBe(
      'id,full_name,username,email,phone,role,provider_type,organization_id'
    );
    expect(doctorQuery.eq).toHaveBeenCalledWith('status', 'available');
    expect(doctorQuery.eq).toHaveBeenCalledWith('hospital_id', FACILITY_ID);
    expect(providerQuery.eq).toHaveBeenCalledWith('role', 'provider');
    expect(providerQuery.in).toHaveBeenCalledWith(
      'provider_type',
      ['driver', 'paramedic', 'ambulance_service']
    );
    expect(applyAuthFilter).toHaveBeenNthCalledWith(1, doctorQuery, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital_id',
    });
    expect(applyAuthFilter).toHaveBeenNthCalledWith(2, providerQuery, user, {
      orgIdField: 'organization_id',
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('preserves doctor-status create, update, and delete receivers and timestamps', async () => {
    const createQuery = createQueryBuilder({
      data: { id: DOCTOR_ID, status: 'available' },
      error: null,
    });
    const updateQuery = createQueryBuilder({
      data: { id: DOCTOR_ID, status: 'busy' },
      error: null,
    });
    const deleteQuery = createQueryBuilder({ error: null });
    supabase.from
      .mockReturnValueOnce(createQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery);

    await expect(createStaffSchedule({
      schedule_type: 'doctor_shift',
      doctor_id: DOCTOR_ID,
      status: 'on_duty',
    })).resolves.toEqual({
      id: DOCTOR_ID,
      status: 'available',
      schedule_type: 'doctor_shift',
    });
    await expect(updateStaffSchedule(`doctor_${DOCTOR_ID}`, {
      status: 'scheduled',
    })).resolves.toEqual({
      id: DOCTOR_ID,
      status: 'busy',
      schedule_type: 'doctor_shift',
    });
    await expect(deleteStaffSchedule(`doctor_${DOCTOR_ID}`)).resolves.toBe(true);

    expect(supabase.from.mock.calls).toEqual([
      ['doctors'],
      ['doctors'],
      ['doctors'],
    ]);
    expect(createQuery.update).toHaveBeenCalledWith({
      status: 'available',
      updated_at: NOW,
    });
    expect(createQuery.eq).toHaveBeenCalledWith('id', DOCTOR_ID);
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: 'busy',
      updated_at: NOW,
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', DOCTOR_ID);
    expect(deleteQuery.update).toHaveBeenCalledWith({
      status: 'off_duty',
      updated_at: NOW,
    });
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', DOCTOR_ID);
    expect(getCurrentUser).toHaveBeenCalledTimes(3);
  });

  it('rethrows doctor command receiver errors unchanged', async () => {
    const error = { code: '42501', message: 'write denied' };
    const query = createQueryBuilder({ data: null, error });
    supabase.from.mockReturnValue(query);

    await expect(createStaffSchedule({
      schedule_type: 'doctor_shift',
      doctor_id: DOCTOR_ID,
      status: 'on_duty',
    })).rejects.toBe(error);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('Error creating staff schedule:', error);
  });

  it('keeps unsupported ambulance and non-doctor schedule actions fail-closed', async () => {
    await expect(createStaffSchedule({
      schedule_type: 'ambulance_crew',
      ambulance_id: AMBULANCE_ID,
    })).rejects.toThrow('Ambulance crew scheduling requires manual crew management');
    await expect(updateStaffSchedule(`${AMBULANCE_ID}_crew_0`, {
      status: 'on_duty',
    })).rejects.toThrow('Only doctor schedules can be updated through this service');
    await expect(deleteStaffSchedule(`${AMBULANCE_ID}_crew_0`))
      .rejects.toThrow('Only doctor schedules can be deleted through this service');

    expect(supabase.from).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(3);
    expect(getCurrentUser).toHaveBeenCalledTimes(3);
  });

  it('rethrows read errors unchanged, logs them, and does not add retries or quiet suppression', async () => {
    const error = { code: '42501', message: 'permission denied' };
    const ambulanceQuery = createQueryBuilder({ data: null, error });
    supabase.from.mockReturnValue(ambulanceQuery);

    await expect(getStaffSchedules({ quiet: true })).rejects.toBe(error);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(applyAuthFilter).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('Error fetching staff schedules:', error);
  });

  it('preserves facility-scoped status statistics and their exact projection', async () => {
    const doctorQuery = createQueryBuilder({
      data: [
        { status: 'available', hospital_id: FACILITY_ID },
        { status: 'busy', hospital_id: FACILITY_ID },
        { status: 'off_duty', hospital_id: FACILITY_ID },
      ],
      error: null,
    });
    const ambulanceQuery = createQueryBuilder({
      data: [
        { status: 'available' },
        { status: 'en_route' },
        { status: 'on_scene' },
        { status: 'maintenance' },
      ],
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(doctorQuery)
      .mockReturnValueOnce(ambulanceQuery);

    await expect(getScheduleStats(
      FACILITY_ID,
      '2026-07-01',
      '2026-07-31'
    )).resolves.toEqual({
      total_shifts: 7,
      scheduled_today: 3,
      this_week: 2,
      by_status: {
        scheduled: 3,
        on_duty: 2,
        completed: 0,
        cancelled: 0,
      },
      by_shift_type: {
        day: 3,
        evening: 2,
        night: 1,
      },
    });

    expect(doctorQuery.select).toHaveBeenCalledWith('status, hospital_id');
    expect(ambulanceQuery.select).toHaveBeenCalledWith('status');
    expect(doctorQuery.eq).toHaveBeenCalledWith('hospital_id', FACILITY_ID);
    expect(ambulanceQuery.eq).toHaveBeenCalledWith('hospital_id', FACILITY_ID);
    expect(applyAuthFilter).not.toHaveBeenCalled();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('preserves profile-scoped current-status conflict checks', async () => {
    const query = createQueryBuilder({
      data: { status: 'on_call' },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    await expect(checkScheduleConflicts(
      PROFILE_ID,
      TODAY,
      '09:00',
      '17:00',
      `doctor_${DOCTOR_ID}`
    )).resolves.toEqual({
      has_conflicts: true,
      conflicts: [{
        reason: 'Doctor is currently on_call',
        doctor_status: 'on_call',
      }],
    });

    expect(supabase.from).toHaveBeenCalledWith('doctors');
    expect(query.select).toHaveBeenCalledWith('status');
    expect(query.eq.mock.calls).toEqual([['profile_id', PROFILE_ID]]);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('preserves single-doctor detail shape and UTC date normalization', async () => {
    const profiles = {
      id: PROFILE_ID,
      full_name: 'Dr. Morgan Lee',
      username: 'morgan',
      email: 'morgan@example.test',
      phone: '555-0102',
      role: 'provider',
      provider_type: 'doctor',
    };
    const query = createQueryBuilder({
      data: {
        id: DOCTOR_ID,
        name: 'Fallback Name',
        profile_id: PROFILE_ID,
        hospital_id: FACILITY_ID,
        specialization: 'Cardiology',
        experience: 8,
        status: 'available',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-07-11T10:00:00.000Z',
        profiles,
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    await expect(getStaffScheduleById(`doctor_${DOCTOR_ID}`)).resolves.toEqual({
      id: `doctor_${DOCTOR_ID}`,
      profile_id: PROFILE_ID,
      profile_name: 'Dr. Morgan Lee',
      doctor_id: DOCTOR_ID,
      hospital_id: FACILITY_ID,
      specialization: 'Cardiology',
      date: TODAY,
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      status: 'on_duty',
      notes: 'Cardiology - 8 years experience',
      created_at: '2026-06-01T10:00:00.000Z',
      updated_at: '2026-07-11T10:00:00.000Z',
      schedule_type: 'doctor_shift',
      profiles,
    });

    expect(query.eq).toHaveBeenCalledWith('id', DOCTOR_ID);
    expect(query.single).toHaveBeenCalledTimes(1);
    expect(compactSelect(query.select.mock.calls[0][0])).toBe(
      '*,profiles!inner(id,full_name,username,email,phone,role,provider_type)'
    );
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('preserves both realtime payload envelopes and removes both subscribed channels', () => {
    let doctorHandler;
    let ambulanceHandler;
    const subscribedDoctorChannel = { topic: 'doctor-subscription' };
    const subscribedAmbulanceChannel = { topic: 'ambulance-subscription' };
    const doctorChannel = {
      on: jest.fn((_event, _config, handler) => {
        doctorHandler = handler;
        return doctorChannel;
      }),
      subscribe: jest.fn(() => subscribedDoctorChannel),
    };
    const ambulanceChannel = {
      on: jest.fn((_event, _config, handler) => {
        ambulanceHandler = handler;
        return ambulanceChannel;
      }),
      subscribe: jest.fn(() => subscribedAmbulanceChannel),
    };
    supabase.channel
      .mockReturnValueOnce(doctorChannel)
      .mockReturnValueOnce(ambulanceChannel);
    const callback = jest.fn();

    const cleanup = subscribeToScheduleUpdates(FACILITY_ID, callback);

    expect(supabase.channel.mock.calls).toEqual([
      ['doctor_schedule_updates'],
      ['ambulance_schedule_updates'],
    ]);
    expect(doctorChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'doctors' },
      expect.any(Function)
    );
    expect(ambulanceChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ambulances' },
      expect.any(Function)
    );

    const doctorPayload = { new: { id: DOCTOR_ID } };
    const ambulancePayload = { old: { id: AMBULANCE_ID } };
    doctorHandler(doctorPayload);
    ambulanceHandler(ambulancePayload);
    expect(callback.mock.calls).toEqual([
      [{ type: 'doctor_update', payload: doctorPayload }],
      [{ type: 'ambulance_update', payload: ambulancePayload }],
    ]);

    cleanup();
    expect(supabase.removeChannel.mock.calls).toEqual([
      [subscribedDoctorChannel],
      [subscribedAmbulanceChannel],
    ]);
  });
});
