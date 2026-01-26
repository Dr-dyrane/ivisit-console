import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Smart Driver Management Service
 * Uses database triggers and views for efficient driver assignment
 * Follows the same pattern as bed management service
 */

export const driverManagementService = {
  /**
   * Get active driver assignments for a hospital
   * Manual joins since foreign key relationships don't exist
   */
  async getActiveAssignments(hospitalId = null) {
    try {
      // Get emergency requests first
      let requestsQuery = supabase
        .from('emergency_requests')
        .select('*')
        .eq('service_type', 'ambulance')
        .in('status', ['in_progress', 'accepted', 'arrived'])
        .order('created_at', { ascending: false });

      if (hospitalId) {
        requestsQuery = requestsQuery.eq('hospital_id', hospitalId);
      }

      const { data: requests, error: requestsError } = await requestsQuery;

      if (requestsError) throw requestsError;

      if (!requests || requests.length === 0) {
        return [];
      }

      // Get hospital information
      const hospitalIds = [...new Set(requests.map(r => r.hospital_id).filter(Boolean))];
      const { data: hospitals, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('id, name')
        .in('id', hospitalIds);

      if (hospitalsError) throw hospitalsError;

      // Get patient information
      const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get ambulance information
      const ambulanceIds = [...new Set(requests.map(r => r.ambulance_id).filter(Boolean))];
      const { data: ambulances, error: ambulancesError } = await supabase
        .from('ambulances')
        .select('id, call_sign, type, vehicle_number')
        .in('id', ambulanceIds);

      if (ambulancesError) throw ambulancesError;

      // Combine the data
      return requests.map(request => ({
        ...request,
        hospital_name: hospitals?.find(h => h.id === request.hospital_id)?.name || 'Unknown Hospital',
        patient_name: profiles?.find(p => p.id === request.user_id)?.full_name || 'Unknown Patient',
        patient_email: profiles?.find(p => p.id === request.user_id)?.email,
        assigned_at: request.created_at,
        status_display: request.status === 'in_progress' ? 'Dispatched' :
                      request.status === 'accepted' ? 'En Route' :
                      request.status === 'arrived' ? 'Patient Picked Up' : request.status,
        ambulance_info: ambulances?.find(a => a.id === request.ambulance_id) || null
      }));
    } catch (error) {
      console.error('Error fetching active assignments:', error);
      toast.error('Failed to load driver assignments');
      return [];
    }
  },

  /**
   * Get driver utilization statistics for a hospital
   * Calculate manually since complex function isn't deployed
   */
  async getDriverUtilization(hospitalId) {
    try {
      // Get all ambulances for this hospital
      const { data: ambulances, error: ambulancesError } = await supabase
        .from('ambulances')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (ambulancesError) throw ambulancesError;

      // Get active ambulance requests for this hospital
      const { data: requests, error: requestsError } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('service_type', 'ambulance');

      if (requestsError) throw requestsError;

      // Calculate statistics
      const totalDrivers = ambulances?.length || 0;
      const availableDrivers = ambulances?.filter(a => a.status === 'available').length || 0;
      const busyDrivers = ambulances?.filter(a => a.status === 'busy').length || 0;
      const onTripDrivers = requests?.filter(r => ['in_progress', 'accepted', 'arrived'].includes(r.status)).length || 0;
      const utilization = totalDrivers > 0 
        ? (onTripDrivers / totalDrivers) * 100 
        : 0;

      return {
        total_drivers: totalDrivers,
        available_drivers: availableDrivers,
        busy_drivers: busyDrivers,
        on_trip_drivers: onTripDrivers,
        utilization_percentage: Math.round(utilization * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching driver utilization:', error);
      toast.error('Failed to load driver statistics');
      return null;
    }
  },

  /**
   * Complete trip and free up driver
   */
  async completeTrip(requestId) {
    try {
      const { data, error } = await supabase
        .rpc('complete_trip', { request_uuid: requestId });

      if (error) throw error;
      
      toast.success('Trip completed successfully');
      return data;
    } catch (error) {
      console.error('Error completing trip:', error);
      toast.error('Failed to complete trip');
      return false;
    }
  },

  /**
   * Cancel trip and free up driver
   */
  async cancelTrip(requestId, reason = null) {
    try {
      const { data, error } = await supabase
        .rpc('cancel_trip', { request_uuid: requestId, reason });

      if (error) throw error;
      
      toast.success('Trip cancelled successfully');
      return data;
    } catch (error) {
      console.error('Error cancelling trip:', error);
      toast.error('Failed to cancel trip');
      return false;
    }
  },

  /**
   * Update trip status (for manual status changes)
   */
  async updateTripStatus(requestId, newStatus) {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('service_type', 'ambulance')
        .select()
        .single();

      if (error) throw error;
      
      const statusMessages = {
        'accepted': 'Ambulance en route',
        'arrived': 'Patient picked up',
        'completed': 'Trip completed',
        'cancelled': 'Trip cancelled'
      };
      
      toast.success(statusMessages[newStatus] || 'Status updated');
      return data;
    } catch (error) {
      console.error('Error updating trip status:', error);
      toast.error('Failed to update trip status');
      return null;
    }
  },

  /**
   * Subscribe to real-time driver assignment updates
   */
  subscribeToAssignments(hospitalId, callback) {
    const channel = supabase
      .channel(`driver_assignments_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: `hospital_id=eq.${hospitalId}`
        },
        (payload) => {
          if (payload.new?.service_type === 'ambulance' || payload.old?.service_type === 'ambulance') {
            callback(payload);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Subscribe to ambulance status changes
   */
  subscribeToAmbulanceStatus(hospitalId, callback) {
    const channel = supabase
      .channel(`ambulance_status_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ambulances',
          filter: `hospital_id=eq.${hospitalId}`
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};
