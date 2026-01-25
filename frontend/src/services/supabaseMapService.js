import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

/**
 * Supabase Map Service
 * Aggregates data streams for the Console Map View with RBAC
 */

export const supabaseMapService = {
  // --- Data Fetching ---

  /**
   * Fetch all initial data required for the map
   * Applies RBAC filters based on user role and organization
   */
  async fetchInitialMapData() {
    try {
      const user = await getCurrentUser();
      
      // 1. Emergencies with RBAC
      let emergenciesQuery = supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply RBAC for emergencies
      emergenciesQuery = applyAuthFilter(emergenciesQuery, user, {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'responder_id',
        resourceType: 'emergency'
      });

      // 2. Ambulances with RBAC
      let ambulancesQuery = supabase
        .from('ambulances')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply RBAC for ambulances
      ambulancesQuery = applyAuthFilter(ambulancesQuery, user, {
        userIdField: 'profile_id',
        orgIdField: 'hospital_id',
        resourceType: 'ambulance'
      });

      // 3. Hospitals with RBAC
      let hospitalsQuery = supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply RBAC for hospitals (org admins see their hospital, admins see all)
      if (user?.role !== 'admin' && user?.organization_id) {
        hospitalsQuery = hospitalsQuery.eq('id', user.organization_id);
      } else if (user?.role !== 'admin') {
        // Non-admin without org see no hospitals
        hospitalsQuery = hospitalsQuery.eq('id', 'none');
      }

      const { data: emergencies, error: errEmergencies } = await emergenciesQuery;
      const { data: ambulances, error: errAmbulances } = await ambulancesQuery;
      const { data: hospitals, error: errHospitals } = await hospitalsQuery;

      if (errEmergencies) console.error("Error fetching map emergencies:", errEmergencies);
      if (errAmbulances) console.error("Error fetching map ambulances:", errAmbulances);
      if (errHospitals) console.error("Error fetching map hospitals:", errHospitals);

      console.log(`[Map RBAC] User ${user?.role} loaded:`, {
        emergencies: emergencies?.length || 0,
        ambulances: ambulances?.length || 0,
        hospitals: hospitals?.length || 0
      });

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
  },

  /**
   * Get nearby hospitals using geospatial query
   * @param {Object} userLocation - User's current location {lat, lng}
   * @param {number} radiusKm - Search radius in kilometers (default: 50)
   * @returns {Promise<Array>} Array of nearby hospitals with distance
   */
  async getNearbyHospitals(userLocation, radiusKm = 50) {
    try {
      const { data, error } = await supabase
        .rpc('nearby_hospitals', {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          radius_km: radiusKm
        });

      if (error) {
        console.error('Error fetching nearby hospitals:', error);
        // Fallback to basic hospital query if function doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('hospitals')
          .select('*')
          .eq('status', 'available')
          .order('name');

        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNearbyHospitals:', error);
      return [];
    }
  }
};
