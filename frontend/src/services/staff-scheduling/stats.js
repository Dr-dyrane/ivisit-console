import { getStaffSchedules } from './reads';

export async function getScheduleStats(hospitalId, dateFrom, dateTo) {
  const { schedules } = await getStaffSchedules({
    hospital_id: hospitalId,
    date_from: dateFrom,
    date_to: dateTo,
  });
  const today = new Date().toISOString().slice(0, 10);
  return {
    total_shifts: schedules.length,
    scheduled_today: schedules.filter((schedule) => schedule.date === today).length,
    this_week: schedules.length,
    available: schedules.filter((schedule) => schedule.is_available).length,
    unavailable: schedules.filter((schedule) => !schedule.is_available).length,
  };
}
