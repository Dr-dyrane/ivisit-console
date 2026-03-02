import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Smart Bed Management Service
 * Uses database triggers and views for efficient bed allocation
 * No manual bed count management needed - handled automatically
 */

export const bedManagementService = {
  /**
   * Get active bed reservations for a hospital
   * Manual joins since foreign key relationships don't exist
   */
  async getActiveReservations(hospitalId = null) {
    try {
      // Get emergency requests first
      let requestsQuery = supabase
        .from('emergency_requests')
        .select('*')
        .eq('service_type', 'bed')
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

      // Combine the data
      return requests.map(request => ({
        ...request,
        hospital_name: hospitals?.find(h => h.id === request.hospital_id)?.name || 'Unknown Hospital',
        patient_name: profiles?.find(p => p.id === request.user_id)?.full_name || 'Unknown Patient',
        patient_email: profiles?.find(p => p.id === request.user_id)?.email,
        reserved_at: request.created_at,
        status_display: request.status === 'in_progress' ? 'Reserved' :
                      request.status === 'accepted' ? 'Confirmed' :
                      request.status === 'arrived' ? 'Patient Arrived' : request.status
      }));
    } catch (error) {
      console.error('Error fetching active reservations:', error);
      toast.error('Failed to load bed reservations');
      return [];
    }
  },

  /**
   * Get bed utilization statistics for a hospital
   * For now, calculate manually since the complex function isn't deployed
   */
  async getBedUtilization(hospitalId) {
    try {
      // Get all bed requests for this hospital
      const { data: requests, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('service_type', 'bed');

      if (error) throw error;

      // Get hospital details
      const { data: hospital, error: hospitalError } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .single();

      if (hospitalError) throw hospitalError;

      // Calculate statistics
      const occupied = requests?.filter(r => ['arrived', 'completed'].includes(r.status)).length || 0;
      const reserved = requests?.filter(r => ['in_progress', 'accepted'].includes(r.status)).length || 0;
      const utilization = hospital.total_beds > 0 
        ? ((occupied + reserved) / hospital.total_beds) * 100 
        : 0;

      return {
        total_beds: hospital.total_beds || 0,
        available_beds: hospital.available_beds || 0,
        occupied_beds: occupied,
        reserved_beds: reserved,
        utilization_percentage: Math.round(utilization * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching bed utilization:', error);
      toast.error('Failed to load bed statistics');
      return null;
    }
  },

  /**
   * Discharge patient - Enhanced with automatic bed count update
   */
  async dischargePatient(requestId) {
    try {
      const { data, error } = await supabase.rpc('console_complete_emergency', {
        p_request_id: requestId
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to complete reservation');

      toast.success('Patient discharged - Bed count updated automatically');
      return data;
    } catch (error) {
      console.error('Error discharging patient:', error);
      toast.error('Failed to discharge patient');
      throw error;
    }
  },

  /**
   * Cancel bed reservation - Enhanced with automatic bed count update
   */
  async cancelBedReservation(requestId, reason = null) {
    try {
      const { data, error } = await supabase.rpc('console_cancel_emergency', {
        p_request_id: requestId,
        p_reason: reason
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel reservation');

      toast.success('Bed reservation cancelled - Bed count updated automatically');
      return data;
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation');
      throw error;
    }
  },

  /**
   * Subscribe to real-time bed reservation updates
   */
  subscribeToReservations(hospitalId, callback) {
    const channel = supabase
      .channel(`bed_reservations_${hospitalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_requests',
        filter: hospitalId ? `hospital_id=eq.${hospitalId}` : undefined
      }, (payload) => {
        if (payload.new?.service_type === 'bed' || payload.old?.service_type === 'bed') {
          callback(payload);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Subscribe to hospital bed count changes
   * Uses existing subscription from emergencyRequestsService
   */
  subscribeToBedCounts(hospitalId, callback) {
    const channel = supabase
      .channel(`hospital_beds_${hospitalId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hospitals',
        filter: `id=eq.${hospitalId}`
      }, callback)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Get bed status color based on availability
   */
  getBedStatusColor(availableBeds, totalBeds) {
    if (totalBeds === 0) return 'bg-gray-500/20 text-gray-500';
    
    const utilization = ((totalBeds - availableBeds) / totalBeds) * 100;
    
    if (utilization >= 90) return 'bg-red-500/20 text-red-500';
    if (utilization >= 70) return 'bg-orange-500/20 text-orange-500';
    if (utilization >= 40) return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-green-500/20 text-green-500';
  },

  /**
   * Get bed status text
   */
  getBedStatusText(availableBeds, totalBeds) {
    if (totalBeds === 0) return 'No beds configured';
    if (availableBeds === 0) return 'Full';
    if (availableBeds <= 2) return 'Limited';
    return 'Available';
  },

  /**
   * Format bed utilization for display
   */
  formatUtilization(utilization) {
    return `${Math.round(utilization)}%`;
  },

  /**
   * Get action buttons based on reservation status
   */
  getReservationActions(reservation) {
    const actions = [];
    
    switch (reservation.status) {
      case 'in_progress':
        actions.push({
          label: 'Cancel Reservation',
          action: () => this.cancelBedReservation(reservation.id),
          variant: 'destructive',
          icon: 'X'
        });
        break;
        
      case 'accepted':
        actions.push({
          label: 'Mark Arrived',
          action: () => this.updateReservationStatus(reservation.id, 'arrived'),
          variant: 'default',
          icon: 'CheckCircle'
        });
        break;
        
      case 'arrived':
        actions.push({
          label: 'Discharge Patient',
          action: () => this.dischargePatient(reservation.id),
          variant: 'default',
          icon: 'UserCheck'
        });
        break;
    }
    
    return actions;
  },

  /**
   * Update reservation status (for manual status changes)
   */
  async updateReservationStatus(requestId, newStatus) {
    try {
      const { data, error } = await supabase.rpc('console_update_emergency_request', {
        p_request_id: requestId,
        p_payload: {
          status: newStatus
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Status update failed');

      toast.success(`Status updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Error updating reservation status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  }
};
