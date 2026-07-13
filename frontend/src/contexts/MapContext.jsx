import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabaseMapService } from '../services/supabaseMapService';
import { toast } from 'sonner';

const MapContext = createContext();
const isMapPath = (pathname = '') => pathname === '/map' || pathname.startsWith('/map/');

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within MapProvider');
  }
  return context;
};

export const MapProvider = ({ children }) => {
  const location = useLocation();
  const mapRouteActive = isMapPath(location.pathname);
  const [mapData, setMapData] = useState({
    emergencyRequests: [],
    ambulances: [],
    hospitals: [],
    // PULLBACK NOTE: Changed defaults from false to true for better UX
    // OLD: showLayers: { emergencies: false, ambulances: true, hospitals: false }
    // NEW: showLayers: { emergencies: true, ambulances: true, hospitals: true }
    showLayers: { emergencies: true, ambulances: true, hospitals: true },
    filter: 'all',
    loading: false,
    selectedMarker: null,
    error: null,
    sourceState: {
      emergencies: { ready: false, partial: false, limit: 100 },
      ambulances: { ready: false, partial: false, limit: 1000 },
      hospitals: { ready: false, partial: false, limit: 1000 },
    },
  });

  const initializeMapData = React.useCallback(async ({ shouldCommit = () => true, showLoading = true } = {}) => {
    try {
      if (showLoading) setMapData(prev => ({ ...prev, loading: true }));
      const { emergencies, ambulances, hospitals, sourceState } = await supabaseMapService.fetchInitialMapData({ quiet: true });
      const failedSources = Object.entries(sourceState || {})
        .filter(([, state]) => !state?.ready)
        .map(([source]) => source);

      if (shouldCommit()) {
        setMapData(prev => ({
          ...prev,
          emergencyRequests: emergencies,
          ambulances: ambulances,
          hospitals: hospitals,
          sourceState,
          loading: false,
          error: failedSources.length
            ? new Error('Some live map data did not load.')
            : null,
        }));
      }
    } catch (error) {
      console.error("Failed to initialize map data:", error);
      if (shouldCommit()) setMapData(prev => ({ ...prev, loading: false, error }));
    }
  }, []);

  // Map data is route-owned. Keep it asleep until the live map is visible.
  useEffect(() => {
    let mounted = true;
    const subscriptions = [];
    let refreshTimer = null;

    if (!mapRouteActive) {
      setMapData(prev => (
        prev.loading || prev.error
          ? { ...prev, loading: false, error: null }
          : prev
      ));
      return () => {
        mounted = false;
      };
    }

    initializeMapData({ shouldCommit: () => mounted });

    const scheduleScopedRefresh = () => {
      if (!mounted) return;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        initializeMapData({ shouldCommit: () => mounted, showLoading: false });
      }, 250);
    };

    subscriptions.push(supabaseMapService.subscribeToEmergencies(scheduleScopedRefresh));
    subscriptions.push(supabaseMapService.subscribeToAmbulances(scheduleScopedRefresh));
    subscriptions.push(supabaseMapService.subscribeToHospitals(scheduleScopedRefresh));

    return () => {
      mounted = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      subscriptions.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [initializeMapData, mapRouteActive]);

  const refreshMapData = React.useCallback(() => {
    if (!mapRouteActive) {
      setMapData(prev => (
        prev.loading || prev.error
          ? { ...prev, loading: false, error: null }
          : prev
      ));
      return Promise.resolve();
    }

    return initializeMapData();
  }, [initializeMapData, mapRouteActive]);

  const value = {
    mapData,
    setMapData, // Expose setter if needed for manual overrides
    toggleLayer: (layer) => setMapData(prev => ({
      ...prev,
      showLayers: { ...prev.showLayers, [layer]: !prev.showLayers[layer] }
    })),
    setFilter: (filter) => setMapData(prev => ({ ...prev, filter })),
    setSelectedMarker: (marker) => setMapData(prev => ({ ...prev, selectedMarker: marker })),
    refresh: refreshMapData,
    recenterMap: () => {
      window.dispatchEvent(new CustomEvent('recenter-map'));
      toast.info("Recentering map to your location...");
    }
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};
