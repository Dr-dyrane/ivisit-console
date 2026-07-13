import {
  createEditScheduleDraft,
  createScheduleDraft,
  getScheduleStatusColor,
  getShiftTypeColor,
  getStaffDisplayName,
  getStaffInitials,
} from './schedulePresentation';

describe('staff scheduling presentation model', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the existing default doctor-shift draft', () => {
    expect(createScheduleDraft('hospital-1')).toEqual({
      profile_id: '',
      hospital_id: 'hospital-1',
      date: '2026-07-13',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      notes: '',
      schedule_type: 'doctor_shift',
    });
  });

  it('normalizes an existing schedule into the unchanged edit draft', () => {
    expect(createEditScheduleDraft({
      profile_id: 42,
      date: '2026-07-15',
      start_time: '08:00',
      end_time: '16:00',
      shift_type: 'evening',
      notes: 'Cover ward',
      schedule_type: 'doctor_shift',
      doctor_id: 'doctor-42',
    }, 'hospital-1')).toEqual({
      profile_id: '42',
      hospital_id: 'hospital-1',
      date: '2026-07-15',
      start_time: '08:00',
      end_time: '16:00',
      shift_type: 'evening',
      notes: 'Cover ward',
      schedule_type: 'doctor_shift',
      doctor_id: 'doctor-42',
    });
  });

  it('preserves status, shift, initials, and display fallbacks', () => {
    expect(getScheduleStatusColor('on-duty')).toBe('bg-emerald-500/20 text-emerald-600');
    expect(getScheduleStatusColor('off_duty')).toBe('bg-muted/50 text-muted-foreground');
    expect(getShiftTypeColor('night')).toBe('bg-violet-500/20 text-violet-600');
    expect(getShiftTypeColor('unknown')).toBe('bg-muted/50 text-muted-foreground');
    expect(getStaffInitials({ profiles: { full_name: 'Ada Lovelace' } })).toBe('AL');
    expect(getStaffInitials({ profile_name: 'Grace Hopper' })).toBe('GH');
    expect(getStaffInitials({})).toBe('??');
    expect(getStaffDisplayName({})).toBe('Unknown Staff');
  });
});
