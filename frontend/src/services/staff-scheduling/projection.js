const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const SHIFT_TYPES = new Set(['day', 'evening', 'night']);

const asText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

export const normalizeIanaTimezone = (value) => asText(value);

export const isValidIanaTimezone = (value) => {
  const timezone = normalizeIanaTimezone(value);
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
};

const isValidDateKey = (value) => {
  if (!DATE_PATTERN.test(String(value || ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const getFacilityDateKey = (timezone, instant = new Date()) => {
  if (!isValidIanaTimezone(timezone)) {
    throw new RangeError('A valid IANA facility timezone is required.');
  }
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) throw new RangeError('A valid schedule instant is required.');

  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: normalizeIanaTimezone(timezone),
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const addScheduleDateDays = (dateKey, days) => {
  if (!isValidDateKey(dateKey) || !Number.isInteger(days)) {
    throw new RangeError('A valid schedule date and whole-day offset are required.');
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export const getFacilityScheduleWindow = (
  timezone,
  { days = 14, instant = new Date() } = {},
) => {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError('Schedule windows must contain at least one whole day.');
  }
  const from = getFacilityDateKey(timezone, instant);
  return { from, to: addScheduleDateDays(from, days - 1) };
};

export const normalizeScheduleRow = (row) => {
  if (!row || typeof row !== 'object') return null;

  const scheduleId = asText(row.schedule_id ?? row.id);
  const scheduleDate = asText(row.schedule_date ?? row.date);
  const doctorId = asText(row.doctor_id);
  const hospitalId = asText(row.hospital_id);
  if (!scheduleId || !scheduleDate || !doctorId || !hospitalId) return null;

  const isAvailable = row.is_available !== false;
  return {
    id: scheduleId,
    schedule_id: scheduleId,
    doctor_id: doctorId,
    doctor_name: asText(row.doctor_name) || 'Unknown clinician',
    profile_name: asText(row.doctor_name) || 'Unknown clinician',
    hospital_id: hospitalId,
    hospital_name: asText(row.hospital_name) || 'Unknown facility',
    scheduled_timezone: asText(row.scheduled_timezone),
    timezone_confirmed_at: asText(row.timezone_confirmed_at),
    timezone_confirmation_source: asText(row.timezone_confirmation_source),
    schedule_date: scheduleDate,
    date: scheduleDate,
    start_time: asText(row.start_time),
    end_time: asText(row.end_time),
    shift_type: asText(row.shift_type) || 'day',
    is_available: isAvailable,
    status: isAvailable ? 'available' : 'unavailable',
    updated_at: asText(row.updated_at),
    source_kind: 'doctor_schedule',
  };
};

export const normalizeScheduleRows = (rows) => (
  (Array.isArray(rows) ? rows : []).map(normalizeScheduleRow).filter(Boolean)
);

export const normalizeScheduleFacility = (row) => {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: asText(row.name) || 'Unknown facility',
    timezone: asText(row.timezone),
    timezone_confirmed_at: asText(row.timezone_confirmed_at),
    timezone_confirmation_source: asText(row.timezone_confirmation_source),
  };
};

export const isScheduleTimezoneConfirmed = (value) => Boolean(
  isValidIanaTimezone(value?.timezone)
  && value?.timezone_confirmed_at
  && value?.timezone_confirmation_source
);

export const validateScheduleDraft = (draft = {}) => {
  const errors = {};
  if (!asText(draft.doctor_id)) errors.doctor_id = 'Choose a clinician.';
  if (!DATE_PATTERN.test(String(draft.date || ''))) errors.date = 'Choose a valid date.';
  if (!TIME_PATTERN.test(String(draft.start_time || ''))) errors.start_time = 'Choose a valid start time.';
  if (!TIME_PATTERN.test(String(draft.end_time || ''))) errors.end_time = 'Choose a valid end time.';
  if (draft.start_time && draft.end_time && draft.end_time <= draft.start_time) {
    errors.end_time = 'End time must be after start time.';
  }
  if (!SHIFT_TYPES.has(String(draft.shift_type || ''))) errors.shift_type = 'Choose a valid shift type.';
  return errors;
};

const errorRules = [
  ['invalid_schedule_boundary', /schedule boundaries must align to 15-minute increments/i,
    'Start and end times must use 15-minute increments.'],
  ['invalid_local_time', /schedule boundaries must be valid facility-local times/i,
    'That start or end time does not exist in the facility timezone because of daylight saving time. Choose another time.'],
  ['non_positive_window', /schedule must resolve to a positive facility-local window/i,
    'This shift does not resolve to a positive window in the facility timezone. Choose different start and end times.'],
  ['invalid_timezone', /iana|valid timezone/i,
    'Enter a valid IANA timezone, such as America/Los_Angeles.'],
  ['timezone_unconfirmed', /timezone.*(?:unconfirmed|confirm|required)|confirm.*timezone/i,
    'Confirm the facility timezone before changing its schedule.'],
  ['schedule_conflict', /overlap|conflict/i,
    'This shift overlaps another schedule. Adjust the date or time and try again.'],
  ['booked_visit_protection', /booked|active visit|scheduled visit/i,
    'This shift has an active booking and cannot be changed or removed.'],
  ['invalid_interval', /end time.*start time|start time.*end time|interval/i,
    'End time must be after start time.'],
  ['authorization_denied', /permission|unauthori[sz]ed|not authorized|forbidden|row-level security|rls/i,
    'You do not have permission to manage this facility schedule.'],
  ['not_found', /not found|no rows/i, 'The schedule is no longer available.'],
];

export const classifyScheduleError = (error) => {
  const message = String(error?.message || error || 'Schedule request failed.');
  const matched = errorRules.find(([, pattern]) => pattern.test(message));
  const classified = new Error(matched?.[2] || 'The schedule could not be updated. Try again.');
  classified.name = 'ScheduleContractError';
  classified.code = matched?.[0] || error?.code || 'schedule_request_failed';
  classified.cause = error;
  return classified;
};

export const unwrapScheduleMutationRow = (value) => {
  if (Array.isArray(value)) return value[0] || null;
  if (value?.schedule && typeof value.schedule === 'object') return value.schedule;
  if (value?.data && typeof value.data === 'object') return value.data;
  return value && typeof value === 'object' ? value : null;
};
