import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const MAP_REQUEST_LIMIT = 100;
const MAP_ENTITY_LIMIT = 1000;
const MAP_REQUEST_TYPES = ['ambulance', 'bed'];
const MAP_ACTIVE_ROUTE_STATUSES = ['in_progress', 'accepted', 'arrived'];

const getSourceState = (error, rows, count, limit) => ({
  ready: !error,
  partial: !error && (Number.isFinite(count) ? count > rows.length : rows.length >= limit),
  limit,
  total: Number.isFinite(count) ? count : null,
});

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
  async fetchInitialMapData(options = {}) {
    const quiet = Boolean(options?.quiet);

    try {
      const user = await getCurrentUser();

      const emergencyScope = {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'responder_id',
        resourceType: 'emergency'
      };
      // 1. Emergencies with RBAC
      let emergenciesQuery = supabase
        .from('emergency_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(MAP_REQUEST_LIMIT);

      emergenciesQuery = applyAuthFilter(emergenciesQuery, user, emergencyScope);
      const emergencyFacetQueries = MAP_REQUEST_TYPES.map((serviceType) => (
        applyAuthFilter(
          supabase
            .from('emergency_requests')
            .select('id', { count: 'exact', head: true }),
          user,
          emergencyScope
        ).eq('service_type', serviceType)
      ));
      const activeRoutesQuery = applyAuthFilter(
        supabase
          .from('emergency_requests')
          .select('id', { count: 'exact', head: true }),
        user,
        emergencyScope
      )
        .eq('service_type', 'ambulance')
        .in('status', MAP_ACTIVE_ROUTE_STATUSES);

      // 2. Ambulances with RBAC
      let ambulancesQuery = supabase
        .from('ambulances')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(MAP_ENTITY_LIMIT);

      // Apply RBAC for ambulances
      ambulancesQuery = applyAuthFilter(ambulancesQuery, user, {
        userIdField: 'profile_id',
        orgIdField: 'hospital_id',
        resourceType: 'ambulance'
      });

      // 3. Hospitals with RBAC
      let hospitalsQuery = supabase
        .from('hospitals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(MAP_ENTITY_LIMIT);

      // Apply RBAC for hospitals (org admins see their org's hospitals, admins see all)
      if (user?.role !== 'admin' && user?.hospital_ids?.length) {
        // Org admin: scope to all hospitals under their organization
        hospitalsQuery = hospitalsQuery.in('id', user.hospital_ids);
      } else if (user?.role !== 'admin' && user?.organization_id) {
        // Fallback: match by organization_id
        hospitalsQuery = hospitalsQuery.eq('organization_id', user.organization_id);
      } else if (user?.role !== 'admin') {
        // Non-admin without org see no hospitals
        hospitalsQuery = hospitalsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      const [emergencyResult, ambulanceResult, hospitalResult, activeRoutesResult, ...emergencyFacetResults] = await Promise.all([
        emergenciesQuery,
        ambulancesQuery,
        hospitalsQuery,
        activeRoutesQuery,
        ...emergencyFacetQueries,
      ]);
      const { data: emergencies, error: errEmergencies, count: emergencyCount } = emergencyResult;
      const { data: ambulances, error: errAmbulances, count: ambulanceCount } = ambulanceResult;
      const { data: hospitals, error: errHospitals, count: hospitalCount } = hospitalResult;

      if (errEmergencies && !quiet) console.error("Error fetching map emergencies:", errEmergencies);
      if (errAmbulances && !quiet) console.error("Error fetching map ambulances:", errAmbulances);
      if (errHospitals && !quiet) console.error("Error fetching map hospitals:", errHospitals);
      if (activeRoutesResult.error && !quiet) console.error("Error counting active map routes:", activeRoutesResult.error);

      const emergencyFacets = Object.fromEntries(MAP_REQUEST_TYPES.map((serviceType, index) => {
        const result = emergencyFacetResults[index] || {};
        if (result.error && !quiet) console.error(`Error counting ${serviceType} map requests:`, result.error);
        return [serviceType, {
          ready: !result.error,
          total: !result.error && Number.isFinite(result.count) ? result.count : null,
        }];
      }));

      const sourceState = {
        emergencies: {
          ...getSourceState(errEmergencies, emergencies || [], emergencyCount, MAP_REQUEST_LIMIT),
          facets: emergencyFacets,
          activeRoutes: {
            ready: !activeRoutesResult.error,
            exact: !activeRoutesResult.error && Number.isFinite(activeRoutesResult.count),
            total: !activeRoutesResult.error && Number.isFinite(activeRoutesResult.count)
              ? activeRoutesResult.count
              : null,
          },
        },
        ambulances: getSourceState(errAmbulances, ambulances || [], ambulanceCount, MAP_ENTITY_LIMIT),
        hospitals: getSourceState(errHospitals, hospitals || [], hospitalCount, MAP_ENTITY_LIMIT),
      };

      return {
        emergencies: emergencies || [],
        ambulances: ambulances || [],
        hospitals: hospitals || [],
        sourceState,
      };
    } catch (error) {
      if (!quiet) console.error("Error fetching initial map data:", error);
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
   * Subscribe to hospital changes so the map can refresh its scoped facility
   * projection when availability or location changes.
   */
  subscribeToHospitals(onChange) {
    const channel = supabase
      .channel('map_hospitals_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hospitals'
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
  async getNearbyHospitals(userLocation, radiusKm = 50, options = {}) {
    const quiet = Boolean(options?.quiet);

    try {
      const { data, error } = await supabase
        .rpc('nearby_hospitals', {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          radius_km: radiusKm
        });

      if (error) {
        if (!quiet) console.error('Error fetching nearby hospitals:', error);
        throw new Error('Nearby facility search is temporarily unavailable.');
      }

      return data || [];
    } catch (error) {
      if (!quiet) console.error('Error in getNearbyHospitals:', error);
      throw error;
    }
  }
};
