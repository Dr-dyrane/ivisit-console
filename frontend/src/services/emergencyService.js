/**
 * Emergency Request Service
 * Handles all Supabase queries for emergency_requests table
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { logEmergencyActivity } from './activityService';

const TABLE_NAME = 'emergency_requests';

/**
 * Calculate response time in minutes
 */
function calculateResponseTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  return Math.round(diffMs / 60000); // Convert to minutes
}

/**
 * Get all emergency requests with optional filters
 * Admin users can see all requests, others see only their own
 */
export async function getEmergencyRequests(filter) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply authorization - admins get full access, others get filtered
    if (user?.role === 'admin') {
      // Full access
    } else if (user?.role === 'org_admin' && user?.organization_id) {
      // Org admins see all emergency requests in their organization
      query = query.eq('hospital_id', user.organization_id);
    } else {
      // Non-admin users can only see their own requests
      query = query.eq('user_id', user?.id);
    }

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
export async function getEmergencyRequest(requestId) {
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
export async function createEmergencyRequest(input) {
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
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(TABLE_NAME).insert([payload]).select().single();

    if (error) throw error;

    // Log activity
    try {
      await logEmergencyActivity.created(
        data.id,
        `New emergency request from ${input.pickup_location?.address || 'Unknown location'}`,
        {
          service_type: input.service_type,
          specialty: input.specialty,
          location: input.pickup_location?.address,
          priority: input.priority || 'medium'
        }
      );
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
    }

    return data;
  } catch (error) {
    console.error('Error creating emergency request:', error);
    throw error;
  }
}

/**
 * Update emergency request
 */
export async function updateEmergencyRequest(requestId, input) {
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

    // Log activity for completed emergencies
    if (input.status === 'completed') {
      try {
        await logEmergencyActivity.completed(
          requestId,
          `Emergency response completed - ${data.destination_location?.address || 'Location'}`,
          {
            location: data.destination_location?.address,
            response_time: calculateResponseTime(data.created_at),
            service_type: data.service_type
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    } else if (input.status) {
      try {
        await logEmergencyActivity.updated(
          requestId,
          `Emergency request updated to ${input.status}`,
          {
            old_status: data.status,
            new_status: input.status,
            location: data.pickup_location?.address
          }
        );
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
    }

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
  requestId,
  ambulanceId,
  responderId,
  responderName,
  responderPhone
) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'accepted',
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
export async function completeEmergencyRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'completed',
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
export async function cancelEmergencyRequest(requestId, reason) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: 'cancelled',
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
export async function getActiveEmergencyRequests() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .in('status', ['in_progress', 'accepted'])
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
export async function getUserEmergencyRequests(userId) {
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
export async function getHospitalEmergencyRequests(hospitalId) {
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
export async function updateResponderLocation(requestId, location, heading) {
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
export async function updatePatientLocation(requestId, location, heading) {
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
export async function getEmergencyStats() {
  try {
    // Get total requests
    const { count: totalCount } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    // Get active requests
    const { data: activeData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'in_progress');

    // Get pending requests
    const { data: pendingData } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    // Get today's completed
    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`);

    // Get today's cancelled
    const { data: cancelledToday } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'cancelled')
      .gte('cancelled_at', `${today}T00:00:00`)
      .lte('cancelled_at', `${today}T23:59:59`);

    // Calculate average response time
    const { data: responseTimeData } = await supabase
      .from(TABLE_NAME)
      .select('created_at, updated_at')
      .in('status', ['accepted', 'completed']);

    let avgResponseTime = 0;
    if (responseTimeData && responseTimeData.length > 0) {
      // Implementation here if needed
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
