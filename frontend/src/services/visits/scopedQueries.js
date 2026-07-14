import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { normalizeVisitForUI } from './normalization';
import {
  applyGenericVisitSourceScope,
  GENERIC_VISIT_SELECT,
} from './pageProjection';

const createGenericVisitQuery = (options) => applyGenericVisitSourceScope(
  supabase.from(TABLE_NAME).select(GENERIC_VISIT_SELECT, options),
);

export async function getUserVisits(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await createGenericVisitQuery()
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for user ${userId}:`, error);
    throw error;
  }
}

export async function getUserUpcomingVisits(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    const today = new Date().toISOString().split('T')[0];
    const data = await withRetry(async () => {
      const { data: rows, error } = await createGenericVisitQuery()
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching upcoming visits for user ${userId}:`, error);
    throw error;
  }
}

export async function getUserCompletedVisits(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await createGenericVisitQuery()
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching completed visits for user ${userId}:`, error);
    throw error;
  }
}

export async function getDoctorVisits(doctorId) {
  try {
    // doctor_name is text, not a UUID foreign key.
    const data = await withRetry(async () => {
      const { data: rows, error } = await createGenericVisitQuery()
        .eq('doctor_name', doctorId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for doctor ${doctorId}:`, error);
    throw error;
  }
}

export async function getHospitalVisits(hospitalId) {
  try {
    if (!isValidUUID(hospitalId)) return [];

    const data = await withRetry(async () => {
      const { data: rows, error } = await createGenericVisitQuery()
        .eq('hospital_id', hospitalId)
        .order('date', { ascending: false });

      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    console.error(`Error fetching visits for hospital ${hospitalId}:`, error);
    throw error;
  }
}

export async function getVisitStats() {
  try {
    const { count: totalCount } = await createGenericVisitQuery({
      count: 'exact',
      head: true,
    });

    const { data: scheduledData } = await createGenericVisitQuery({ count: 'exact' })
      .eq('status', 'scheduled');

    const { data: completedData } = await createGenericVisitQuery({ count: 'exact' })
      .eq('status', 'completed');

    const { data: cancelledData } = await createGenericVisitQuery({ count: 'exact' })
      .eq('status', 'cancelled');

    const { data: noShowData } = await createGenericVisitQuery({ count: 'exact' })
      .eq('status', 'no-show');

    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await createGenericVisitQuery()
      .eq('status', 'completed')
      .gte('date', `${today}T00:00:00`)
      .lte('date', `${today}T23:59:59`);

    const { data: scheduledUpcoming } = await createGenericVisitQuery()
      .eq('status', 'scheduled')
      .gte('date', today);

    return {
      total_visits: totalCount || 0,
      scheduled_visits: scheduledData?.length || 0,
      completed_visits: completedData?.length || 0,
      cancelled_visits: cancelledData?.length || 0,
      no_show_visits: noShowData?.length || 0,
      completed_today: completedToday?.length || 0,
      scheduled_upcoming: scheduledUpcoming?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching visit stats:', error);
    throw error;
  }
}
