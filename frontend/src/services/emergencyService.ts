/**
 * Emergency Request Service
 * Handles all Supabase queries for emergency_requests table
 */

import { supabase } from '../lib/supabase';
import {
  EmergencyRequest,
  CreateEmergencyRequestInput,
  UpdateEmergencyRequestInput,
  EmergencyRequestFilter,
  EmergencyStats,
  EmergencyStatus,
} from '../types/emergency';

const TABLE_NAME = 'emergency_requests';

/**
 * Get all emergency requests with optional filters
 */
export async function getEmergencyRequests(
  filter?: EmergencyRequestFilter
): Promise<EmergencyRequest[]> {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter?.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
    }
    if (filter?.ambulance_id) {
      query = query.eq('ambulance_id', filter.ambulance_id);
    }
    if (filter?.service_type) {
      query = query.eq('service_type', filter.service_type);
    }

    if (filter?.date_from) {
      query = query.gte('created_at', filter.date_from);
    }
    if (filter?.date_to) {
      query = query.lte('created_at', filter.date_to);
    }

    // Sorting
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching emergency requests:', error);
    throw error;
  }
}

/**
 * Get single emergency request by ID
 */
export async function getEmergencyRequest(requestId: string): Promise<EmergencyRequest | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', requestId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    return data || null;
  } catch (error) {
    console.error(`Error fetching emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Create new emergency request
 */
export async function createEmergencyRequest(
  input: CreateEmergencyRequestInput
): Promise<EmergencyRequest> {
  try {
    const payload = {
      user_id: input.user_id,
      service_type: input.service_type,
      specialty: input.specialty,
      pickup_location: input.pickup_location,
      destination_location: input.destination_location,
      patient_snapshot: input.patient_snapshot,
      shared_data_snapshot: input.shared_data_snapshot,
      estimated_arrival: input.estimated_arrival,
      status: EmergencyStatus.IN_PROGRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(TABLE_NAME).insert([payload]).select().single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating emergency request:', error);
    throw error;
  }
}

/**
 * Update emergency request
 */
export async function updateEmergencyRequest(
  requestId: string,
  input: UpdateEmergencyRequestInput
): Promise<EmergencyRequest> {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Accept/Assign emergency request to ambulance
 */
export async function acceptEmergencyRequest(
  requestId: string,
  ambulanceId: string,
  responderId: string,
  responderName: string,
  responderPhone: string
): Promise<EmergencyRequest> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: EmergencyStatus.ACCEPTED,
        ambulance_id: ambulanceId,
        responder_id: responderId,
        responder_name: responderName,
        responder_phone: responderPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error accepting emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Complete emergency request
 */
export async function completeEmergencyRequest(requestId: string): Promise<EmergencyRequest> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: EmergencyStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error completing emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Cancel emergency request
 */
export async function cancelEmergencyRequest(requestId: string, reason?: string): Promise<EmergencyRequest> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: EmergencyStatus.CANCELLED,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error cancelling emergency request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Get active emergency requests (in_progress or accepted)
 */
export async function getActiveEmergencyRequests(): Promise<EmergencyRequest[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .in('status', [EmergencyStatus.IN_PROGRESS, EmergencyStatus.ACCEPTED])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching active emergency requests:', error);
    throw error;
  }
}

/**
 * Get emergency requests for specific user
 */
export async function getUserEmergencyRequests(userId: string): Promise<EmergencyRequest[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching emergency requests for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get emergency requests for specific hospital
 */
export async function getHospitalEmergencyRequests(hospitalId: string): Promise<EmergencyRequest[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching emergency requests for hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Update responder location and heading
 */
export async function updateResponderLocation(
  requestId: string,
  location: { type: 'Point'; coordinates: [number, number] },
  heading: number
): Promise<EmergencyRequest> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        responder_location: location,
        responder_heading: heading,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating responder location for ${requestId}:`, error);
    throw error;
  }
}

/**
 * Update patient location and heading
 */
export async function updatePatientLocation(
  requestId: string,
  location: { type: 'Point'; coordinates: [number, number] },
  heading: number
): Promise<EmergencyRequest> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        patient_location: location,
        patient_heading: heading,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating patient location for ${requestId}:`, error);
    throw error;
  }
}

/**
 * Get emergency statistics/analytics
 */
export async function getEmergencyStats(): Promise<EmergencyStats> {
  try {
    // Get total requests
    const { count: totalCount } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    // Get active requests
    const { data: activeData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', EmergencyStatus.IN_PROGRESS);

    // Get pending requests
    const { data: pendingData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', EmergencyStatus.PENDING);

    // Get today's completed
    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', EmergencyStatus.COMPLETED)
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`);

    // Get today's cancelled
    const { data: cancelledToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', EmergencyStatus.CANCELLED)
      .gte('cancelled_at', `${today}T00:00:00`)
      .lte('cancelled_at', `${today}T23:59:59`);

    // Calculate average response time
    const { data: responseTimeData } = await supabase
      .from(TABLE_NAME)
      .select('created_at, updated_at')
      .in('status', [EmergencyStatus.ACCEPTED, EmergencyStatus.COMPLETED]);

    let avgResponseTime = 0;
    if (responseTimeData && responseTimeData.length > 0) {
      const responseTimes = responseTimeData.map((r) => {
        const created = new Date(r.created_at).getTime();
        const updated = new Date(r.updated_at).getTime();
        return (updated - created) / 1000; // Convert to seconds
      });
      avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Calculate success rate
    const successCount = (completedToday?.length || 0);
    const totalToday = (completedToday?.length || 0) + (cancelledToday?.length || 0);
    const successRate = totalToday > 0 ? (successCount / totalToday) * 100 : 0;

    return {
      total_requests: totalCount || 0,
      active_requests: activeData?.length || 0,
      pending_requests: pendingData?.length || 0,
      completed_today: completedToday?.length || 0,
      cancelled_today: cancelledToday?.length || 0,
      avg_response_time_seconds: Math.round(avgResponseTime),
      success_rate: Math.round(successRate),
    };
  } catch (error) {
    console.error('Error fetching emergency stats:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time emergency request updates
 */
export function subscribeToEmergencyRequest(
  requestId: string,
  callback: (request: EmergencyRequest) => void
) {
  const channel = supabase
    .channel(`emergency_request_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as EmergencyRequest);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to all emergency request changes
 */
export function subscribeToAllEmergencyRequests(
  callback: (request: EmergencyRequest, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  const channel = supabase
    .channel('emergency_requests_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as EmergencyRequest, payload.eventType as any);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
