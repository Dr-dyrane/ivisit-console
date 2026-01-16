/**
 * useHospitals Hook
 * Manages hospitals data and operations using hospitalsService
 */

import { useState, useCallback } from 'react';
import {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  getVerifiedHospitals,
  getHospitalsBySpecialty,
  updateHospitalBedCount,
  updateHospitalStatus,
  subscribeToHospital,
  HospitalFilter,
  CreateHospitalInput,
  UpdateHospitalInput,
} from '../services/hospitalsService';
import { Hospital } from '../types/index';

interface UseHospitalsState {
  hospitals: Hospital[];
  currentHospital: Hospital | null;
  loading: boolean;
  error: string | null;
}

interface UseHospitalsReturn extends UseHospitalsState {
  fetchHospitals: (filter?: HospitalFilter) => Promise<void>;
  fetchHospital: (hospitalId: string) => Promise<Hospital | null>;
  fetchVerified: () => Promise<void>;
  fetchBySpecialty: (specialty: string) => Promise<void>;
  addHospital: (input: CreateHospitalInput) => Promise<Hospital | null>;
  editHospital: (hospitalId: string, input: UpdateHospitalInput) => Promise<Hospital | null>;
  removeHospital: (hospitalId: string) => Promise<boolean>;
  setCurrentHospital: (hospital: Hospital | null) => void;
  updateBeds: (hospitalId: string, count: number) => Promise<Hospital | null>;
  updateStatus: (hospitalId: string, status: 'available' | 'busy' | 'full') => Promise<Hospital | null>;
  subscribe: (hospitalId: string, callback: (hospital: Hospital) => void) => (() => void) | null;
}

export function useHospitals(): UseHospitalsReturn {
  const [state, setState] = useState<UseHospitalsState>({
    hospitals: [],
    currentHospital: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setHospitals = useCallback((hospitals: Hospital[]) => {
    setState((prev) => ({ ...prev, hospitals }));
  }, []);

  const setCurrentHospital = useCallback((hospital: Hospital | null) => {
    setState((prev) => ({ ...prev, currentHospital: hospital }));
  }, []);

  const fetchHospitals = useCallback(
    async (filter?: HospitalFilter) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHospitals(filter);
        setHospitals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hospitals');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setHospitals]
  );

  const fetchHospital = useCallback(
    async (hospitalId: string): Promise<Hospital | null> => {
      try {
        setError(null);
        const hospital = await getHospital(hospitalId);
        if (hospital) {
          setCurrentHospital(hospital);
        }
        return hospital;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hospital');
        return null;
      }
    },
    [setError, setCurrentHospital]
  );

  const fetchVerified = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVerifiedHospitals();
      setHospitals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verified hospitals');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setHospitals]);

  const fetchBySpecialty = useCallback(
    async (specialty: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHospitalsBySpecialty(specialty);
        setHospitals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hospitals by specialty');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setHospitals]
  );

  const addHospital = useCallback(
    async (input: CreateHospitalInput): Promise<Hospital | null> => {
      try {
        setError(null);
        const hospital = await createHospital(input);
        setHospitals((prev) => [hospital, ...prev]);
        return hospital;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create hospital');
        return null;
      }
    },
    [setError, setHospitals]
  );

  const editHospital = useCallback(
    async (hospitalId: string, input: UpdateHospitalInput): Promise<Hospital | null> => {
      try {
        setError(null);
        const hospital = await updateHospital(hospitalId, input);
        setHospitals((prev) => prev.map((h) => (h.id === hospitalId ? hospital : h)));
        if (state.currentHospital?.id === hospitalId) {
          setCurrentHospital(hospital);
        }
        return hospital;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update hospital');
        return null;
      }
    },
    [setError, setHospitals, state.currentHospital]
  );

  const removeHospital = useCallback(
    async (hospitalId: string): Promise<boolean> => {
      try {
        setError(null);
        await deleteHospital(hospitalId);
        setHospitals((prev) => prev.filter((h) => h.id !== hospitalId));
        if (state.currentHospital?.id === hospitalId) {
          setCurrentHospital(null);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete hospital');
        return false;
      }
    },
    [setError, setHospitals, state.currentHospital]
  );

  const updateBeds = useCallback(
    async (hospitalId: string, count: number): Promise<Hospital | null> => {
      try {
        setError(null);
        const hospital = await updateHospitalBedCount(hospitalId, count);
        setHospitals((prev) => prev.map((h) => (h.id === hospitalId ? hospital : h)));
        if (state.currentHospital?.id === hospitalId) {
          setCurrentHospital(hospital);
        }
        return hospital;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update bed count');
        return null;
      }
    },
    [setError, setHospitals, state.currentHospital]
  );

  const updateStatus = useCallback(
    async (hospitalId: string, status: 'available' | 'busy' | 'full'): Promise<Hospital | null> => {
      try {
        setError(null);
        const hospital = await updateHospitalStatus(hospitalId, status);
        setHospitals((prev) => prev.map((h) => (h.id === hospitalId ? hospital : h)));
        if (state.currentHospital?.id === hospitalId) {
          setCurrentHospital(hospital);
        }
        return hospital;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
        return null;
      }
    },
    [setError, setHospitals, state.currentHospital]
  );

  const subscribe = useCallback(
    (hospitalId: string, callback: (hospital: Hospital) => void): (() => void) | null => {
      try {
        return subscribeToHospital(hospitalId, callback);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe');
        return null;
      }
    },
    [setError]
  );

  return {
    ...state,
    fetchHospitals,
    fetchHospital,
    fetchVerified,
    fetchBySpecialty,
    addHospital,
    editHospital,
    removeHospital,
    setCurrentHospital,
    updateBeds,
    updateStatus,
    subscribe,
  };
}
