import { supabase } from '../../lib/supabase';
import {
  classifyScheduleError,
  isValidIanaTimezone,
  normalizeIanaTimezone,
  unwrapScheduleMutationRow,
  validateScheduleDraft,
} from './projection';

const assertValidDraft = (scheduleData) => {
  const errors = validateScheduleDraft(scheduleData);
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0]);
    error.code = 'invalid_schedule_draft';
    throw error;
  }
};

const upsertSchedule = async (scheduleData, scheduleId = null) => {
  try {
    assertValidDraft(scheduleData);
    const args = {
      p_doctor_id: scheduleData.doctor_id,
      p_date: scheduleData.date,
      p_start_time: scheduleData.start_time,
      p_end_time: scheduleData.end_time,
      p_shift_type: scheduleData.shift_type,
      p_is_available: scheduleData.is_available !== false,
    };
    if (scheduleId) args.p_schedule_id = scheduleId;
    const { data, error } = await supabase.rpc('upsert_doctor_schedule', args);
    if (error) throw error;
    return unwrapScheduleMutationRow(data);
  } catch (error) {
    if (error?.code === 'invalid_schedule_draft') throw error;
    throw classifyScheduleError(error);
  }
};

export async function createStaffSchedule(scheduleData) {
  return upsertSchedule(scheduleData, null);
}

export async function updateStaffSchedule(scheduleId, scheduleData) {
  return upsertSchedule(scheduleData, scheduleId);
}

export async function deleteStaffSchedule(scheduleId) {
  try {
    const { data, error } = await supabase.rpc('delete_doctor_schedule', {
      p_schedule_id: scheduleId,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    throw classifyScheduleError(error);
  }
}

export async function confirmHospitalTimezone(hospitalId, timezone) {
  try {
    const normalizedTimezone = normalizeIanaTimezone(timezone);
    if (!hospitalId || !isValidIanaTimezone(normalizedTimezone)) {
      throw new Error('Enter a valid IANA timezone before confirming.');
    }
    const { data, error } = await supabase.rpc('confirm_hospital_timezone', {
      p_hospital_id: hospitalId,
      p_timezone: normalizedTimezone,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    throw classifyScheduleError(error);
  }
}
