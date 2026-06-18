import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseMapService } from '../services/supabaseMapService';
import { toast } from 'sonner';

const MapContext = createContext();

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within MapProvider');
  }
  return context;
};

export const MapProvider = ({ children }) => {
  const [mapData, setMapData] = useState({
    emergencyRequests: [],
    ambulances: [],
    hospitals: [],
    users: [], // Patient locations
    // PULLBACK NOTE: Changed defaults from false to true for better UX
    // OLD: showLayers: { emergencies: false, ambulances: true, hospitals: false }
    // NEW: showLayers: { emergencies: true, ambulances: true, hospitals: true }
    showLayers: { emergencies: true, ambulances: true, hospitals: true },
    filter: 'all',
    loading: true,
    selectedMarker: null,
    error: null
  });

  const initializeMapData = React.useCallback(async (isMounted = true) => {
    try {
      setMapData(prev => ({ ...prev, loading: true }));
      const { emergencies, ambulances, hospitals } = await supabaseMapService.fetchInitialMapData();

      if (isMounted) {
        setMapData(prev => ({
          ...prev,
          emergencyRequests: emergencies,
          ambulances: ambulances,
          hospitals: hospitals,
          loading: false
        }));
      }
    } catch (error) {
      console.error("Failed to initialize map data:", error);
      if (isMounted) setMapData(prev => ({ ...prev, loading: false, error }));
    }
  }, []);

  // Fetch initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;
    const subscriptions = [];

    initializeMapData(mounted);

    // Subscribe to Emergencies
    const unsubEmergencies = supabaseMapService.subscribeToEmergencies((eventType, newRecord, oldRecord) => {
      setMapData(prev => {
        let newList = [...prev.emergencyRequests];
        if (eventType === 'INSERT') {
          newList.unshift(newRecord);
        } else if (eventType === 'UPDATE') {
          newList = newList.map(item => item.id === newRecord.id ? newRecord : item);
        } else if (eventType === 'DELETE') {
          newList = newList.filter(item => item.id !== oldRecord.id);
        }
        return { ...prev, emergencyRequests: newList };
      });
    });
    subscriptions.push(unsubEmergencies);

    // Subscribe to Ambulances
    const unsubAmbulances = supabaseMapService.subscribeToAmbulances((eventType, newRecord, oldRecord) => {
      setMapData(prev => {
        let newList = [...prev.ambulances];
        if (eventType === 'INSERT') {
          newList.push(newRecord);
        } else if (eventType === 'UPDATE') {
          newList = newList.map(item => item.id === newRecord.id ? newRecord : item);
        } else if (eventType === 'DELETE') {
          newList = newList.filter(item => item.id !== oldRecord.id);
        }
        return { ...prev, ambulances: newList };
      });
    });
    subscriptions.push(unsubAmbulances);

    // Subscribe to Users (if needed/avail)
    const unsubUsers = supabaseMapService.subscribeToUsers((eventType, newRecord, oldRecord) => {
      setMapData(prev => {
        let newList = [...prev.users];
        if (eventType === 'INSERT') {
          newList.push(newRecord);
        } else if (eventType === 'UPDATE') {
          newList = newList.map(item => item.id === newRecord.id ? newRecord : item);
        } else if (eventType === 'DELETE') {
          newList = newList.filter(item => item.id !== oldRecord.id);
        }
        return { ...prev, users: newList };
      });
    });
    subscriptions.push(unsubUsers);

    return () => {
      mounted = false;
      subscriptions.forEach(unsub => unsub());
    };
  }, [initializeMapData]);

  const value = {
    mapData,
    setMapData, // Expose setter if needed for manual overrides
    toggleLayer: (layer) => setMapData(prev => ({
      ...prev,
      showLayers: { ...prev.showLayers, [layer]: !prev.showLayers[layer] }
    })),
    setFilter: (filter) => setMapData(prev => ({ ...prev, filter })),
    setSelectedMarker: (marker) => setMapData(prev => ({ ...prev, selectedMarker: marker })),
    refresh: () => initializeMapData(true),
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
