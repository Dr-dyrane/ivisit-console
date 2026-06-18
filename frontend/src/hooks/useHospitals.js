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
} from '../services/hospitalsService';

export function useHospitals() {
  const [state, setState] = useState({
    hospitals: [],
    currentHospital: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setHospitals = useCallback((hospitals) => {
    setState((prev) => ({ ...prev, hospitals }));
  }, []);

  const setCurrentHospital = useCallback((hospital) => {
    setState((prev) => ({ ...prev, currentHospital: hospital }));
  }, []);

  const fetchHospitals = useCallback(
    async (filter) => {
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
    async (hospitalId) => {
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
    async (specialty) => {
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
    async (input) => {
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
    async (hospitalId, input) => {
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
    async (hospitalId) => {
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
    async (hospitalId, count) => {
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
    async (hospitalId, status) => {
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
    (hospitalId, callback) => {
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
