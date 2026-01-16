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
  AmbulanceFilter,
  CreateAmbulanceInput,
  UpdateAmbulanceInput,
} from '../services/ambulancesService';
import { Ambulance } from '../types/index';
import { Point } from 'geojson';

interface UseAmbulancesState {
  ambulances: Ambulance[];
  currentAmbulance: Ambulance | null;
  loading: boolean;
  error: string | null;
}

interface UseAmbulancesReturn extends UseAmbulancesState {
  fetchAmbulances: (filter?: AmbulanceFilter) => Promise<void>;
  fetchAmbulance: (ambulanceId: string) => Promise<Ambulance | null>;
  fetchAvailable: () => Promise<void>;
  fetchByHospital: (hospitalId: string) => Promise<void>;
  addAmbulance: (input: CreateAmbulanceInput) => Promise<Ambulance | null>;
  editAmbulance: (ambulanceId: string, input: UpdateAmbulanceInput) => Promise<Ambulance | null>;
  removeAmbulance: (ambulanceId: string) => Promise<boolean>;
  setCurrentAmbulance: (ambulance: Ambulance | null) => void;
  updateLocation: (ambulanceId: string, location: Point) => Promise<Ambulance | null>;
  updateStatus: (ambulanceId: string, status: 'available' | 'en_route' | 'on_scene' | 'returning') => Promise<Ambulance | null>;
  subscribe: (ambulanceId: string, callback: (ambulance: Ambulance) => void) => (() => void) | null;
  subscribeAll: (callback: (ambulance: Ambulance, eventType: string) => void) => (() => void) | null;
}

export function useAmbulances(): UseAmbulancesReturn {
  const [state, setState] = useState<UseAmbulancesState>({
    ambulances: [],
    currentAmbulance: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setAmbulances = useCallback((ambulances: Ambulance[]) => {
    setState((prev) => ({ ...prev, ambulances }));
  }, []);

  const setCurrentAmbulance = useCallback((ambulance: Ambulance | null) => {
    setState((prev) => ({ ...prev, currentAmbulance: ambulance }));
  }, []);

  const fetchAmbulances = useCallback(
    async (filter?: AmbulanceFilter) => {
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
    async (ambulanceId: string): Promise<Ambulance | null> => {
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
    async (hospitalId: string) => {
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
    async (input: CreateAmbulanceInput): Promise<Ambulance | null> => {
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
    async (ambulanceId: string, input: UpdateAmbulanceInput): Promise<Ambulance | null> => {
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
    async (ambulanceId: string): Promise<boolean> => {
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
    async (ambulanceId: string, location: Point): Promise<Ambulance | null> => {
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
    async (ambulanceId: string, status: 'available' | 'en_route' | 'on_scene' | 'returning'): Promise<Ambulance | null> => {
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
    (ambulanceId: string, callback: (ambulance: Ambulance) => void): (() => void) | null => {
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
    (callback: (ambulance: Ambulance, eventType: string) => void): (() => void) | null => {
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
