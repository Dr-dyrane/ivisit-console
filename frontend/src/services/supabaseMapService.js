import { supabase } from '../lib/supabase';

/**
 * Supabase Map Service
 * Aggregates data streams for the Console Map View (God Mode)
 */

export const supabaseMapService = {
  // --- Data Fetching ---

  /**
   * Fetch all initial data required for the map
   * Bypass standard service filters (like verified-only) to ensure God Mode sees everything.
   */
  async fetchInitialMapData() {
    try {
      // 1. Emergencies (All statuses often relevant for God Mode, or at least active)
      const { data: emergencies, error: errEmergencies } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // 2. Ambulances (All)
      const { data: ambulances, error: errAmbulances } = await supabase
        .from('ambulances')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. Hospitals (All - ignore verified status)
      const { data: hospitals, error: errHospitals } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (errEmergencies) console.error("Error fetching map emergencies:", errEmergencies);
      if (errAmbulances) console.error("Error fetching map ambulances:", errAmbulances);
      if (errHospitals) console.error("Error fetching map hospitals:", errHospitals);

      return {
        emergencies: emergencies || [],
        ambulances: ambulances || [],
        hospitals: hospitals || []
      };
    } catch (error) {
      console.error("Error fetching initial map data:", error);
      throw error;
    }
  },

  // --- Subscriptions ---

  /**
   * Subscribe to all changes in emergency_requests
   * @param {function} onChange - Callback receiving (eventType, newRecord, oldRecord)
   */
  subscribeToEmergencies(onChange) {
    const channel = supabase
      .channel('map_emergencies_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests'
        },
        (payload) => {
          onChange(payload.eventType, payload.new, payload.old);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Subscribe to all changes in ambulances
   * @param {function} onChange - Callback receiving (eventType, newRecord, oldRecord)
   */
  subscribeToAmbulances(onChange) {
    const channel = supabase
      .channel('map_ambulances_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ambulances'
        },
        (payload) => {
          onChange(payload.eventType, payload.new, payload.old);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Subscribe to all changes in users (for patient location tracking)
   * This assumes the 'users' table or similar exists and is public. 
   * Based on plan, we are monitoring 'users' table if it exists, roughly.
   * If 'users' table isn't heavily used yet, we might fallback to emergency_requests updates.
   */
  subscribeToUsers(onChange) {
    const channel = supabase
      .channel('map_users_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users' // Configured in migration
        },
        (payload) => {
          onChange(payload.eventType, payload.new, payload.old);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};
