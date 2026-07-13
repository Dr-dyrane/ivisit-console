import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';

export async function getActiveEmergencyRequests() {
  try {
    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error('Error fetching active emergency requests:', error);
    throw error;
  }
}

export async function getUserEmergencyRequests(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error(`Error fetching emergency requests for user ${userId}:`, error);
    throw error;
  }
}

export async function getHospitalEmergencyRequests(hospitalId) {
  try {
    if (!isValidUUID(hospitalId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error(`Error fetching emergency requests for hospital ${hospitalId}:`, error);
    throw error;
  }
}

export async function getEmergencyStats() {
  try {
    const { count: totalCount } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    const { data: activeData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);

    const { data: pendingData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'pending_approval');

    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`);

    const { data: cancelledToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'cancelled')
      .gte('cancelled_at', `${today}T00:00:00`)
      .lte('cancelled_at', `${today}T23:59:59`);

    const { data: responseTimeData } = await supabase
      .from(TABLE_NAME)
      .select('created_at, updated_at')
      .in('status', ['accepted', 'completed']);

    let avgResponseTime = 0;
    if (responseTimeData && responseTimeData.length > 0) {
      // Reserved for the existing response-time implementation.
    }

    return {
      total_requests: totalCount || 0,
      active_requests: activeData?.length || 0,
      pending_requests: pendingData?.length || 0,
      completed_today: completedToday?.length || 0,
      cancelled_today: cancelledToday?.length || 0,
      avg_response_time_seconds: avgResponseTime,
      success_rate: totalCount ? (completedToday?.length / totalCount) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching emergency stats:', error);
    throw error;
  }
}
