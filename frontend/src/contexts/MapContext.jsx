import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabaseMapService } from '../services/supabaseMapService';
import { toast } from 'sonner';

const MapContext = createContext();
const TRUTH_SYNC_INTERVAL_MS = 30000;
const RECOVERY_SYNC_DEBOUNCE_MS = 6000;
const RECOVERY_STATUSES = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

const parseRecordVersionMs = (record) => {
  if (!record || typeof record !== 'object') return 0;
  const ts = record.updated_at || record.created_at || null;
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : 0;
};

const upsertRecordByFreshness = (records, incoming, { prepend = false } = {}) => {
  if (!incoming?.id) return records;
  const idx = records.findIndex((item) => item.id === incoming.id);
  if (idx === -1) {
    return prepend ? [incoming, ...records] : [...records, incoming];
  }

  const current = records[idx];
  const incomingVersionMs = parseRecordVersionMs(incoming);
  const currentVersionMs = parseRecordVersionMs(current);
  if (incomingVersionMs < currentVersionMs) {
    return records;
  }

  const next = [...records];
  next[idx] = incoming;
  return next;
};

const removeRecordById = (records, row) => {
  const rowId = row?.id;
  if (!rowId) return records;
  return records.filter((item) => item.id !== rowId);
};

const applyRealtimeChange = (records, eventType, newRecord, oldRecord, options = {}) => {
  const normalizedEvent = String(eventType || '').toUpperCase();
  if (normalizedEvent === 'INSERT' || normalizedEvent === 'UPDATE') {
    return upsertRecordByFreshness(records, newRecord, options);
  }
  if (normalizedEvent === 'DELETE') {
    return removeRecordById(records, oldRecord || newRecord);
  }
  return records;
};

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

  const syncInFlightRef = useRef(false);
  const lastRecoverySyncMsRef = useRef(0);
  const mountedRef = useRef(true);

  const initializeMapData = useCallback(async (isMounted = true, { silent = false } = {}) => {
    try {
      if (!silent) {
        setMapData(prev => ({ ...prev, loading: true, error: null }));
      }

      const { emergencies, ambulances, hospitals } = await supabaseMapService.fetchInitialMapData();

      if (isMounted && mountedRef.current) {
        setMapData(prev => ({
          ...prev,
          emergencyRequests: emergencies,
          ambulances: ambulances,
          hospitals: hospitals,
          loading: false,
          error: null
        }));
      }
    } catch (error) {
      console.error("Failed to initialize map data:", error);
      if (isMounted && mountedRef.current) setMapData(prev => ({ ...prev, loading: false, error }));
    }
  }, []);

  const runTruthSync = useCallback((reason = 'manual') => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    Promise.resolve(
      initializeMapData(true, { silent: reason !== 'manual' })
    )
      .catch((error) => {
        console.error(`[MapContext] Truth sync failed (${reason}):`, error);
      })
      .finally(() => {
        syncInFlightRef.current = false;
      });
  }, [initializeMapData]);

  // Fetch initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    const subscriptions = [];

    initializeMapData(mounted, { silent: false });

    const handleChannelStatus = (channelName) => (status) => {
      if (!RECOVERY_STATUSES.has(status)) return;

      const now = Date.now();
      if (now - lastRecoverySyncMsRef.current < RECOVERY_SYNC_DEBOUNCE_MS) {
        return;
      }
      lastRecoverySyncMsRef.current = now;
      console.warn(`[MapContext] ${channelName} realtime status=${status}; triggering truth sync`);
      runTruthSync(`recovery:${channelName}:${status}`);
    };

    // Subscribe to Emergencies
    const unsubEmergencies = supabaseMapService.subscribeToEmergencies(
      (eventType, newRecord, oldRecord) => {
        setMapData(prev => ({
          ...prev,
          emergencyRequests: applyRealtimeChange(
            prev.emergencyRequests,
            eventType,
            newRecord,
            oldRecord,
            { prepend: true }
          ),
        }));
      },
      handleChannelStatus('emergency_requests')
    );
    subscriptions.push(unsubEmergencies);

    // Subscribe to Ambulances
    const unsubAmbulances = supabaseMapService.subscribeToAmbulances(
      (eventType, newRecord, oldRecord) => {
        setMapData(prev => ({
          ...prev,
          ambulances: applyRealtimeChange(prev.ambulances, eventType, newRecord, oldRecord),
        }));
      },
      handleChannelStatus('ambulances')
    );
    subscriptions.push(unsubAmbulances);

    // Subscribe to Users (if needed/avail)
    const unsubUsers = supabaseMapService.subscribeToUsers(
      (eventType, newRecord, oldRecord) => {
        setMapData(prev => ({
          ...prev,
          users: applyRealtimeChange(prev.users, eventType, newRecord, oldRecord),
        }));
      },
      handleChannelStatus('users')
    );
    subscriptions.push(unsubUsers);

    const truthSyncInterval = setInterval(() => {
      if (!mounted) return;
      runTruthSync('interval');
    }, TRUTH_SYNC_INTERVAL_MS);

    return () => {
      mounted = false;
      mountedRef.current = false;
      clearInterval(truthSyncInterval);
      subscriptions.forEach(unsub => unsub());
    };
  }, [initializeMapData, runTruthSync]);

  const value = {
    mapData,
    setMapData, // Expose setter if needed for manual overrides
    toggleLayer: (layer) => setMapData(prev => ({
      ...prev,
      showLayers: { ...prev.showLayers, [layer]: !prev.showLayers[layer] }
    })),
    setFilter: (filter) => setMapData(prev => ({ ...prev, filter })),
    setSelectedMarker: (marker) => setMapData(prev => ({ ...prev, selectedMarker: marker })),
    refresh: () => runTruthSync('manual'),
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
