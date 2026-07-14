import {
  createEditScheduleDraft,
  createScheduleDraft,
  formatScheduleDate,
  formatScheduleTime,
  formatTimezoneConfirmationTime,
  getShiftTypeColor,
  getStaffDisplayName,
  getStaffInitials,
  groupSchedulesByDate,
} from './schedulePresentation';

describe('staff scheduling presentation model', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T01:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds canonical create and edit drafts without notes or synthetic status fields', () => {
    expect(createScheduleDraft({
      hospitalId: 'hospital-1',
      doctorId: 'doctor-1',
      timezone: 'America/Los_Angeles',
    })).toEqual({
      doctor_id: 'doctor-1',
      hospital_id: 'hospital-1',
      date: '2026-07-13',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      is_available: true,
    });

    expect(createEditScheduleDraft({
      doctor_id: 'doctor-2',
      hospital_id: 'hospital-2',
      schedule_date: '2026-07-15',
      start_time: '08:00:00',
      end_time: '16:00:00',
      shift_type: 'evening',
      is_available: false,
    })).toEqual({
      doctor_id: 'doctor-2',
      hospital_id: 'hospital-2',
      date: '2026-07-15',
      start_time: '08:00',
      end_time: '16:00',
      shift_type: 'evening',
      is_available: false,
    });

    expect(createEditScheduleDraft({
      doctor_id: 'doctor-3',
      hospital_id: 'hospital-3',
    }, { timezone: 'America/Los_Angeles' })).toMatchObject({
      date: '2026-07-13',
    });
  });

  it('groups shifts deterministically by date and start time', () => {
    expect(groupSchedulesByDate([
      { id: '3', date: '2026-07-16', start_time: '09:00' },
      { id: '2', date: '2026-07-15', start_time: '10:00' },
      { id: '1', date: '2026-07-15', start_time: '08:00' },
    ])).toEqual([
      { date: '2026-07-15', rows: [
        { id: '1', date: '2026-07-15', start_time: '08:00' },
        { id: '2', date: '2026-07-15', start_time: '10:00' },
      ] },
      { date: '2026-07-16', rows: [{ id: '3', date: '2026-07-16', start_time: '09:00' }] },
    ]);
  });

  it('uses canonical clinician names and stable formatting fallbacks', () => {
    expect(getStaffInitials({ doctor_name: 'Ada Lovelace' })).toBe('AL');
    expect(getStaffInitials({})).toBe('UC');
    expect(getStaffDisplayName({})).toBe('Unknown clinician');
    expect(getShiftTypeColor('night')).toContain('indigo');
    expect(getShiftTypeColor('unknown')).toContain('muted');
    expect(formatScheduleTime('09:30:00')).toBe('09:30');
    expect(formatScheduleTime(null)).toBe('Not set');
    expect(formatScheduleDate('2026-07-13', 'Pacific/Kiritimati')).toBe('Mon, Jul 13');
    expect(formatTimezoneConfirmationTime('invalid')).toBe('Confirmation recorded');
  });
});
