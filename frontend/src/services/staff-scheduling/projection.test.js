import {
  addScheduleDateDays,
  classifyScheduleError,
  getFacilityDateKey,
  getFacilityScheduleWindow,
  isScheduleTimezoneConfirmed,
  isValidIanaTimezone,
  normalizeScheduleRow,
  validateScheduleDraft,
} from './projection';

describe('staff schedule projection boundary', () => {
  it('normalizes only rows with canonical schedule, doctor, facility, and date identities', () => {
    expect(normalizeScheduleRow({
      schedule_id: 'schedule-1',
      doctor_id: 'doctor-1',
      doctor_name: 'Dr. Ada Lovelace',
      hospital_id: 'hospital-1',
      hospital_name: 'North Clinic',
      schedule_date: '2026-07-15',
      start_time: '09:00:00',
      end_time: '17:00:00',
      shift_type: 'day',
      is_available: false,
    })).toMatchObject({
      id: 'schedule-1',
      doctor_id: 'doctor-1',
      hospital_id: 'hospital-1',
      date: '2026-07-15',
      status: 'unavailable',
      source_kind: 'doctor_schedule',
    });
    expect(normalizeScheduleRow({ schedule_id: 'schedule-1' })).toBeNull();
  });

  it('requires all timezone confirmation evidence instead of trusting a stored default', () => {
    expect(isScheduleTimezoneConfirmed({ timezone: 'UTC' })).toBe(false);
    expect(isScheduleTimezoneConfirmed({
      timezone: 'America/Los_Angeles',
      timezone_confirmed_at: '2026-07-13T12:00:00.000Z',
      timezone_confirmation_source: 'console',
    })).toBe(true);
    expect(isScheduleTimezoneConfirmed({
      timezone: 'UTC+8',
      timezone_confirmed_at: '2026-07-13T12:00:00.000Z',
      timezone_confirmation_source: 'console',
    })).toBe(false);
  });

  it('validates explicit IANA timezone input', () => {
    expect(isValidIanaTimezone('America/Los_Angeles')).toBe(true);
    expect(isValidIanaTimezone(' UTC ')).toBe(true);
    expect(isValidIanaTimezone('UTC+8')).toBe(false);
    expect(isValidIanaTimezone('')).toBe(false);
  });

  it('derives date keys and windows from the facility calendar instead of UTC', () => {
    const instant = new Date('2026-07-14T01:00:00.000Z');

    expect(getFacilityDateKey('America/Los_Angeles', instant)).toBe('2026-07-13');
    expect(getFacilityDateKey('Asia/Tokyo', instant)).toBe('2026-07-14');
    expect(getFacilityScheduleWindow('America/Los_Angeles', { instant })).toEqual({
      from: '2026-07-13',
      to: '2026-07-26',
    });
    expect(addScheduleDateDays('2026-03-07', 1)).toBe('2026-03-08');
  });

  it('enforces complete, ordered schedule intervals and known shift types', () => {
    expect(validateScheduleDraft({
      doctor_id: 'doctor-1',
      date: '2026-07-15',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
    })).toEqual({});
    expect(validateScheduleDraft({
      doctor_id: '',
      date: 'July 15',
      start_time: '17:00',
      end_time: '09:00',
      shift_type: 'custom',
    })).toEqual({
      doctor_id: 'Choose a clinician.',
      date: 'Choose a valid date.',
      end_time: 'End time must be after start time.',
      shift_type: 'Choose a valid shift type.',
    });
  });

  it('maps receiver failures to user-facing schedule errors', () => {
    expect(classifyScheduleError(new Error('schedule overlap')).code).toBe('schedule_conflict');
    expect(classifyScheduleError(new Error('permission denied'))).toMatchObject({
      code: 'authorization_denied',
      message: 'You do not have permission to manage this facility schedule.',
    });
  });

  it.each([
    [
      'Schedule boundaries must align to 15-minute increments',
      'invalid_schedule_boundary',
      'Start and end times must use 15-minute increments.',
    ],
    [
      'Schedule boundaries must be valid facility-local times',
      'invalid_local_time',
      'That start or end time does not exist in the facility timezone because of daylight saving time. Choose another time.',
    ],
    [
      'Schedule must resolve to a positive facility-local window',
      'non_positive_window',
      'This shift does not resolve to a positive window in the facility timezone. Choose different start and end times.',
    ],
  ])('maps canonical receiver message %s to specific operator copy', (receiverMessage, code, message) => {
    expect(classifyScheduleError(new Error(receiverMessage))).toMatchObject({ code, message });
  });
});
