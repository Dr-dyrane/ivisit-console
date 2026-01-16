/**
 * useAmbulances Hook
 * Manages ambulances data and operations using ambulancesService
 */

import { useState, useCallback } from 'react';
import {
  getAmbulances,
  getAmbulance,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
  getAvailableAmbulances,
  getHospitalAmbulances,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
  subscribeToAmbulance,
  subscribeToAllAmbulances,
} from '../services/ambulancesService';

export function useAmbulances() {
  const [state, setState] = useState({
    ambulances: [],
    currentAmbulance: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setAmbulances = useCallback((ambulances) => {
    setState((prev) => ({ ...prev, ambulances }));
  }, []);

  const setCurrentAmbulance = useCallback((ambulance) => {
    setState((prev) => ({ ...prev, currentAmbulance: ambulance }));
  }, []);

  const fetchAmbulances = useCallback(
    async (filter) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAmbulances(filter);
        setAmbulances(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ambulances');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setAmbulances]
  );

  const fetchAmbulance = useCallback(
    async (ambulanceId) => {
      try {
        setError(null);
        const ambulance = await getAmbulance(ambulanceId);
        if (ambulance) {
          setCurrentAmbulance(ambulance);
        }
        return ambulance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ambulance');
        return null;
      }
    },
    [setError, setCurrentAmbulance]
  );

  const fetchAvailable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailableAmbulances();
      setAmbulances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available ambulances');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setAmbulances]);

  const fetchByHospital = useCallback(
    async (hospitalId) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHospitalAmbulances(hospitalId);
        setAmbulances(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hospital ambulances');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setAmbulances]
  );

  const addAmbulance = useCallback(
    async (input) => {
      try {
        setError(null);
        const ambulance = await createAmbulance(input);
        setAmbulances((prev) => [ambulance, ...prev]);
        return ambulance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create ambulance');
        return null;
      }
    },
    [setError, setAmbulances]
  );

  const editAmbulance = useCallback(
    async (ambulanceId, input) => {
      try {
        setError(null);
        const ambulance = await updateAmbulance(ambulanceId, input);
        setAmbulances((prev) => prev.map((a) => (a.id === ambulanceId ? ambulance : a)));
        if (state.currentAmbulance?.id === ambulanceId) {
          setCurrentAmbulance(ambulance);
        }
        return ambulance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update ambulance');
        return null;
      }
    },
    [setError, setAmbulances, state.currentAmbulance]
  );

  const removeAmbulance = useCallback(
    async (ambulanceId) => {
      try {
        setError(null);
        await deleteAmbulance(ambulanceId);
        setAmbulances((prev) => prev.filter((a) => a.id !== ambulanceId));
        if (state.currentAmbulance?.id === ambulanceId) {
          setCurrentAmbulance(null);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete ambulance');
        return false;
      }
    },
    [setError, setAmbulances, state.currentAmbulance]
  );

  const updateLocation = useCallback(
    async (ambulanceId, location) => {
      try {
        setError(null);
        const ambulance = await updateAmbulanceLocation(ambulanceId, location);
        setAmbulances((prev) => prev.map((a) => (a.id === ambulanceId ? ambulance : a)));
        if (state.currentAmbulance?.id === ambulanceId) {
          setCurrentAmbulance(ambulance);
        }
        return ambulance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update location');
        return null;
      }
    },
    [setError, setAmbulances, state.currentAmbulance]
  );

  const updateStatus = useCallback(
    async (ambulanceId, status) => {
      try {
        setError(null);
        const ambulance = await updateAmbulanceStatus(ambulanceId, status);
        setAmbulances((prev) => prev.map((a) => (a.id === ambulanceId ? ambulance : a)));
        if (state.currentAmbulance?.id === ambulanceId) {
          setCurrentAmbulance(ambulance);
        }
        return ambulance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
        return null;
      }
    },
    [setError, setAmbulances, state.currentAmbulance]
  );

  const subscribe = useCallback(
    (ambulanceId, callback) => {
      try {
        return subscribeToAmbulance(ambulanceId, callback);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe');
        return null;
      }
    },
    [setError]
  );

  const subscribeAll = useCallback(
    (callback) => {
      try {
        return subscribeToAllAmbulances((ambulance, eventType) => callback(ambulance, eventType));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe');
        return null;
      }
    },
    [setError]
  );

  return {
    ...state,
    fetchAmbulances,
    fetchAmbulance,
    fetchAvailable,
    fetchByHospital,
    addAmbulance,
    editAmbulance,
    removeAmbulance,
    setCurrentAmbulance,
    updateLocation,
    updateStatus,
    subscribe,
    subscribeAll,
  };
}
