import { supabase } from '../lib/supabase';
import {
  getResponderTelemetryState,
  reportResponderTelemetry,
} from './emergencyResponseService';

const ACTIVE_REQUEST_STATUSES = ['in_progress', 'accepted', 'arrived'];

const requireRpcSuccess = async (name, args, fallback) => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || fallback);
  return data;
};

export const normalizeDriverDispatchItem = (item) => {
  if (!item?.assignment_id || !item?.request_id || !item?.ambulance_id) return null;
  return {
    ...item,
    id: item.request_id,
    display_id: item.request_display_id || null,
    status: item.request_status || null,
    assignment_status: String(item.assignment_status || '').toLowerCase(),
  };
};

export const driverManagementService = {
  async getDispatchFeed() {
    const result = await requireRpcSuccess(
      'get_driver_dispatch_feed',
      {},
      'Driver assignments could not be loaded',
    );
    const items = (Array.isArray(result.items) ? result.items : [])
      .map(normalizeDriverDispatchItem)
      .filter(Boolean);
    return Promise.all(items.map(async (item) => {
      if (item.assignment_status !== 'arrived') return item;
      try {
        const { data, error } = await supabase.rpc('get_current_emergency_responder', {
          p_request_id: item.request_id,
        });
        if (error || !data?.success || !data?.available) {
          return { ...item, patient_acknowledgement_state: 'unavailable' };
        }
        return {
          ...item,
          patient_acknowledged_arrival_at: data.patient_acknowledged_arrival_at || null,
          patient_acknowledgement_state: data.patient_acknowledged_arrival_at
            ? 'confirmed'
            : 'pending',
        };
      } catch {
        return { ...item, patient_acknowledgement_state: 'unavailable' };
      }
    }));
  },

  subscribeToDispatchFeed(responderId, callback) {
    if (!responderId || typeof callback !== 'function') return () => {};
    const channel = supabase
      .channel(`driver_dispatch_feed_${responderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_responder_assignments',
          filter: `responder_id=eq.${responderId}`,
        },
        callback,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_requests',
          filter: `responder_id=eq.${responderId}`,
        },
        callback,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  acceptOffer(requestId) {
    return requireRpcSuccess(
      'responder_accept_emergency',
      { p_request_id: requestId },
      'The responder offer could not be accepted',
    );
  },

  declineOffer(requestId, reason) {
    const declineReason = String(reason || '').trim();
    if (!declineReason) throw new Error('A decline reason is required.');
    return requireRpcSuccess(
      'responder_decline_emergency',
      { p_request_id: requestId, p_reason: declineReason },
      'The responder offer could not be declined',
    );
  },

  arriveAtPatient(requestId) {
    return requireRpcSuccess(
      'responder_arrive_emergency',
      { p_request_id: requestId },
      'Arrival could not be confirmed',
    );
  },

  completeAssignment(requestId) {
    return requireRpcSuccess(
      'responder_complete_emergency',
      { p_request_id: requestId },
      'The trip could not be completed',
    );
  },

  releaseAssignment(requestId, reason) {
    const releaseReason = String(reason || '').trim();
    if (!releaseReason) throw new Error('A release reason is required.');
    return requireRpcSuccess(
      'dispatcher_release_responder_assignment',
      { p_request_id: requestId, p_reason: releaseReason },
      'The responder assignment could not be released',
    );
  },

  getTelemetryState(requestId) {
    return getResponderTelemetryState(requestId);
  },

  reportTelemetry(payload) {
    return reportResponderTelemetry(payload);
  },

  async getDispatchReadiness(ambulanceId, requestId = null) {
    const { data, error } = await supabase.rpc('get_ambulance_dispatch_readiness', {
      p_ambulance_id: ambulanceId,
      p_request_id: requestId,
    });
    if (error) throw error;
    if (!data || typeof data.ready !== 'boolean') {
      throw new Error('Ambulance readiness could not be checked');
    }
    return data;
  },

  async getEligibleResponders(organizationId = null) {
    const { data, error } = await supabase.rpc('get_eligible_ambulance_responders', {
      p_organization_id: organizationId,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  staffResponder(ambulanceId, responderId) {
    return requireRpcSuccess(
      'staff_ambulance_responder',
      { p_ambulance_id: ambulanceId, p_responder_id: responderId },
      'The responder could not be assigned to this ambulance',
    );
  },

  async updateTripStatus(requestId, nextStatus, { reason } = {}) {
    const status = String(nextStatus || '').toLowerCase();
    let result;
    if (status === 'accepted') result = await this.acceptOffer(requestId);
    else if (status === 'arrived') result = await this.arriveAtPatient(requestId);
    else if (status === 'completed') result = await this.completeAssignment(requestId);
    else if (status === 'declined') result = await this.declineOffer(requestId, reason);
    else throw new Error(`Unsupported responder lifecycle action: ${nextStatus}`);
    return result.request || result;
  },

  async completeTrip(requestId) {
    const result = await this.completeAssignment(requestId);
    return result.request || result;
  },

  async cancelTrip(requestId, reason = 'Released by dispatcher') {
    return this.releaseAssignment(requestId, reason);
  },

  async getActiveAssignments(hospitalId = null) {
    let query = supabase
      .from('emergency_requests')
      .select('*')
      .eq('service_type', 'ambulance')
      .in('status', ACTIVE_REQUEST_STATUSES);
    if (hospitalId) query = query.eq('hospital_id', hospitalId);

    const { data: requests, error: requestsError } = await query;
    if (requestsError) throw requestsError;
    if (!requests?.length) return [];

    const hospitalIds = [...new Set(requests.map((row) => row.hospital_id).filter(Boolean))];
    const patientIds = [...new Set(requests.map((row) => row.user_id).filter(Boolean))];
    const ambulanceIds = [...new Set(requests.map((row) => row.ambulance_id).filter(Boolean))];
    const [hospitalResult, patientResult, ambulanceResult] = await Promise.all([
      hospitalIds.length
        ? supabase.from('hospitals').select('id,name').in('id', hospitalIds)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length
        ? supabase.from('profiles').select('id,full_name,email').in('id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      ambulanceIds.length
        ? supabase.from('ambulances').select('id,call_sign,type,vehicle_number').in('id', ambulanceIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const projectionError = hospitalResult.error || patientResult.error || ambulanceResult.error;
    if (projectionError) throw projectionError;

    return requests.map((request) => ({
      ...request,
      hospital_name: hospitalResult.data?.find((row) => row.id === request.hospital_id)?.name || null,
      patient_name: patientResult.data?.find((row) => row.id === request.user_id)?.full_name || null,
      patient_email: patientResult.data?.find((row) => row.id === request.user_id)?.email || null,
      ambulance_info: ambulanceResult.data?.find((row) => row.id === request.ambulance_id) || null,
      status_display: request.status === 'in_progress'
        ? 'Awaiting responder'
        : request.status === 'accepted'
          ? 'En route'
          : request.status === 'arrived'
            ? 'At pickup'
            : request.status,
    }));
  },

  async getDriverUtilization(hospitalId) {
    const [ambulanceResult, requestResult] = await Promise.all([
      supabase.from('ambulances').select('id,status').eq('hospital_id', hospitalId),
      supabase
        .from('emergency_requests')
        .select('id,status')
        .eq('hospital_id', hospitalId)
        .eq('service_type', 'ambulance'),
    ]);
    if (ambulanceResult.error) throw ambulanceResult.error;
    if (requestResult.error) throw requestResult.error;

    const ambulances = ambulanceResult.data || [];
    const requests = requestResult.data || [];
    const totalDrivers = ambulances.length;
    const onTripDrivers = requests.filter((row) => ACTIVE_REQUEST_STATUSES.includes(row.status)).length;
    return {
      total_drivers: totalDrivers,
      available_drivers: ambulances.filter((row) => row.status === 'available').length,
      busy_drivers: ambulances.filter((row) => ['dispatched', 'on_trip'].includes(row.status)).length,
      on_trip_drivers: onTripDrivers,
      utilization_percentage: totalDrivers > 0
        ? Math.round((onTripDrivers / totalDrivers) * 10000) / 100
        : 0,
    };
  },

  subscribeToAssignments(hospitalId, callback) {
    const channel = supabase
      .channel(`driver_assignments_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: `hospital_id=eq.${hospitalId}`,
        },
        callback,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribeToAmbulanceStatus(hospitalId, callback) {
    const channel = supabase
      .channel(`ambulance_status_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ambulances',
          filter: `hospital_id=eq.${hospitalId}`,
        },
        callback,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};
