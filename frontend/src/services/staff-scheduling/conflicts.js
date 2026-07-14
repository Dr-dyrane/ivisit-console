import { classifyScheduleError } from './projection';
import { getStaffSchedules } from './reads';

const toTimeValue = (value) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3] || 0);
};

export async function checkScheduleConflicts(
  doctorId,
  date,
  startTime,
  endTime,
  excludeScheduleId = null,
  hospitalId = null,
) {
  try {
    if (!doctorId || !date || !startTime || !endTime) {
      return { has_conflicts: false, conflicts: [] };
    }

    const requestedStart = toTimeValue(startTime);
    const requestedEnd = toTimeValue(endTime);
    const { schedules } = await getStaffSchedules({
      date_from: date,
      date_to: date,
      hospital_id: hospitalId || undefined,
    });
    const conflicts = schedules.filter((schedule) => {
      if (schedule.doctor_id !== doctorId || schedule.id === excludeScheduleId) return false;
      const existingStart = toTimeValue(schedule.start_time);
      const existingEnd = toTimeValue(schedule.end_time);
      return existingStart !== null
        && existingEnd !== null
        && requestedStart !== null
        && requestedEnd !== null
        && existingStart < requestedEnd
        && existingEnd > requestedStart;
    });
    return { has_conflicts: conflicts.length > 0, conflicts };
  } catch (error) {
    if (error?.name === 'ScheduleContractError') throw error;
    throw classifyScheduleError(error);
  }
}
