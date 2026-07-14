import {
  getFacilityDateKey,
  isValidIanaTimezone,
} from '../../../services/staff-scheduling/projection';

const getDefaultDate = (timezone, instant) => (
  isValidIanaTimezone(timezone) ? getFacilityDateKey(timezone, instant) : ''
);

export const getScheduleErrorMessage = (error, fallback) => {
  if (!error) return null;
  return typeof error === 'string' ? error : error.message || fallback;
};

export const createScheduleDraft = ({
  hospitalId = '',
  doctorId = '',
  timezone = '',
  instant = new Date(),
} = {}) => ({
  doctor_id: doctorId || '',
  hospital_id: hospitalId || '',
  date: getDefaultDate(timezone, instant),
  start_time: '09:00',
  end_time: '17:00',
  shift_type: 'day',
  is_available: true,
});

export const createEditScheduleDraft = (schedule, {
  timezone = schedule?.scheduled_timezone,
  instant = new Date(),
} = {}) => ({
  doctor_id: schedule?.doctor_id || '',
  hospital_id: schedule?.hospital_id || '',
  date: schedule?.date || schedule?.schedule_date || getDefaultDate(timezone, instant),
  start_time: String(schedule?.start_time || '09:00').slice(0, 5),
  end_time: String(schedule?.end_time || '17:00').slice(0, 5),
  shift_type: schedule?.shift_type || 'day',
  is_available: schedule?.is_available !== false,
});

export const getShiftTypeColor = (type) => {
  if (type === 'day') return 'bg-amber-500/12 text-amber-700 dark:text-amber-200';
  if (type === 'evening') return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200';
  if (type === 'night') return 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-200';
  return 'bg-muted/40 text-muted-foreground';
};

export const getStaffInitials = (schedule) => String(schedule?.doctor_name || 'Unknown clinician')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((name) => name[0])
  .join('')
  .toUpperCase();

export const getStaffDisplayName = (schedule) => schedule?.doctor_name || 'Unknown clinician';

export const groupSchedulesByDate = (schedules = []) => {
  const groups = new Map();
  [...schedules]
    .sort((left, right) => (
      `${left.date}T${left.start_time}|${left.id}`.localeCompare(`${right.date}T${right.start_time}|${right.id}`)
    ))
    .forEach((schedule) => {
      if (!groups.has(schedule.date)) groups.set(schedule.date, []);
      groups.get(schedule.date).push(schedule);
    });
  return [...groups.entries()].map(([date, rows]) => ({ date, rows }));
};

export const formatScheduleDate = (date) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date || 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(parsed);
};

export const formatScheduleTime = (value) => String(value || '').slice(0, 5) || 'Not set';

export const formatTimezoneConfirmationTime = (value) => {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return 'Confirmation recorded';
  return `Confirmed ${parsed.toLocaleString()}`;
};
