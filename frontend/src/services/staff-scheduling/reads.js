import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { getCurrentUser } from '../authService';
import {
  addScheduleDateDays,
  classifyScheduleError,
  getFacilityDateKey,
  getFacilityScheduleWindow,
  normalizeScheduleFacility,
  normalizeScheduleRows,
} from './projection';

const MAX_SCHEDULE_DAYS = 180;
const MAX_FACILITIES = 500;
const MAX_SCHEDULE_CLINICIANS = 5000;

export const getDefaultScheduleWindow = (timezone, instant = new Date()) => {
  const { from, to } = getFacilityScheduleWindow(timezone, { instant });
  return { date_from: from, date_to: to };
};

export const getScheduleDetailWindow = (instant = new Date()) => {
  const today = getFacilityDateKey('UTC', instant);
  const from = addScheduleDateDays(today, -30);
  return {
    date_from: from,
    date_to: addScheduleDateDays(from, MAX_SCHEDULE_DAYS - 1),
  };
};

const assertScheduleAuthority = async () => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'org_admin'].includes(user.role)) {
    throw classifyScheduleError(new Error('Not authorized to read doctor schedules.'));
  }
  return user;
};

const assertWindow = (dateFrom, dateTo) => {
  const from = new Date(`${dateFrom}T00:00:00Z`);
  const to = new Date(`${dateTo}T00:00:00Z`);
  const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  if (!Number.isFinite(days) || days < 1 || days > MAX_SCHEDULE_DAYS) {
    throw new Error(`Schedule windows must contain between 1 and ${MAX_SCHEDULE_DAYS} days.`);
  }
};

export async function getStaffSchedules(filter = {}) {
  try {
    await assertScheduleAuthority();
    const hasDateFrom = Boolean(filter.date_from);
    const hasDateTo = Boolean(filter.date_to);
    if (hasDateFrom !== hasDateTo) {
      throw new Error('Schedule reads require both date window boundaries.');
    }
    const defaults = hasDateFrom
      ? null
      : getDefaultScheduleWindow(filter.timezone);
    const dateFrom = filter.date_from || defaults.date_from;
    const dateTo = filter.date_to || defaults.date_to;
    assertWindow(dateFrom, dateTo);

    const args = { p_from_date: dateFrom, p_to_date: dateTo };
    if (filter.hospital_id) args.p_hospital_id = filter.hospital_id;

    const { data, error } = await supabase.rpc('get_console_doctor_schedules', args);
    if (error) throw error;
    const schedules = normalizeScheduleRows(data);
    return { schedules, total: schedules.length, date_from: dateFrom, date_to: dateTo };
  } catch (error) {
    if (error?.name === 'ScheduleContractError') throw error;
    throw classifyScheduleError(error);
  }
}

export async function getStaffScheduleById(scheduleId) {
  try {
    if (!isValidUUID(scheduleId)) return null;
    const detailWindow = getScheduleDetailWindow();
    const result = await getStaffSchedules(detailWindow);
    return result.schedules.find((schedule) => schedule.id === scheduleId) || null;
  } catch (error) {
    if (error?.name === 'ScheduleContractError') throw error;
    throw classifyScheduleError(error);
  }
}

export async function getScheduleFacilities() {
  try {
    const user = await assertScheduleAuthority();
    let facilityIds;

    if (user.role === 'org_admin') {
      facilityIds = Array.isArray(user.hospital_ids) ? user.hospital_ids.filter(Boolean) : [];
    } else {
      const { data: clinicianRows, error: clinicianError, count: clinicianCount } = await supabase
        .from('doctors')
        .select('hospital_id', { count: 'exact' })
        .not('hospital_id', 'is', null)
        .range(0, MAX_SCHEDULE_CLINICIANS - 1);
      if (clinicianError) throw clinicianError;
      if (Number.isFinite(clinicianCount) && clinicianCount > (clinicianRows || []).length) {
        throw new Error('The clinician directory is too large for the schedule facility selector.');
      }
      facilityIds = [...new Set((clinicianRows || []).map((row) => row.hospital_id).filter(Boolean))];
    }

    facilityIds = [...new Set(facilityIds)];
    if (facilityIds.length === 0) return [];
    if (facilityIds.length > MAX_FACILITIES) {
      throw new Error('The clinician facility list is too large for this selector. Narrow server scope first.');
    }

    let query = supabase
      .from('hospitals')
      .select('id, name, timezone, timezone_confirmed_at, timezone_confirmation_source')
      .in('id', facilityIds)
      .order('name', { ascending: true })
      .range(0, MAX_FACILITIES - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeScheduleFacility).filter(Boolean);
  } catch (error) {
    if (error?.name === 'ScheduleContractError') throw error;
    throw classifyScheduleError(error);
  }
}
