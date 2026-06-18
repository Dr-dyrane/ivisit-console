/**
 * useEmergency Hook
 * Manages emergency requests data and operations using emergencyService
 */

import { useState, useCallback } from 'react';
import {
  getEmergencyRequests,
  getEmergencyRequest,
  createEmergencyRequest,
  updateEmergencyRequest,
  acceptEmergencyRequest,
  completeEmergencyRequest,
  cancelEmergencyRequest,
  getActiveEmergencyRequests,
  getUserEmergencyRequests,
  getHospitalEmergencyRequests,
  updateResponderLocation,
  updatePatientLocation,
  getEmergencyStats,
  subscribeToEmergencyRequest,
} from '../services/emergencyService';

export function useEmergency() {
  const [state, setState] = useState({
    requests: [],
    currentRequest: null,
    activeRequests: [],
    stats: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setRequests = useCallback((requests) => {
    setState((prev) => ({ ...prev, requests }));
  }, []);

  const setCurrentRequest = useCallback((currentRequest) => {
    setState((prev) => ({ ...prev, currentRequest }));
  }, []);

  const setActiveRequests = useCallback((activeRequests) => {
    setState((prev) => ({ ...prev, activeRequests }));
  }, []);

  const setStats = useCallback((stats) => {
    setState((prev) => ({ ...prev, stats }));
  }, []);

  const fetchRequests = useCallback(async (filter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmergencyRequests(filter);
      setRequests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch emergency requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setRequests]);

  const fetchRequest = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmergencyRequest(requestId);
      if (data) {
        setCurrentRequest(data);
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest]);

  const fetchActiveRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveEmergencyRequests();
      setActiveRequests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch active emergency requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setActiveRequests]);

  const fetchUserRequests = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserEmergencyRequests(userId);
      setRequests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user emergency requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setRequests]);

  const fetchHospitalRequests = useCallback(async (hospitalId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHospitalEmergencyRequests(hospitalId);
      setRequests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch hospital emergency requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setRequests]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmergencyStats();
      setStats(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch emergency statistics';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setStats]);

  const createRequest = useCallback(async (input) => {
    setLoading(true);
    setError(null);
    try {
      const data = await createEmergencyRequest(input);
      setCurrentRequest(data);
      setRequests((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest, setRequests]);

  const updateRequest = useCallback(async (requestId, input) => {
    setLoading(true);
    setError(null);
    try {
      const data = await updateEmergencyRequest(requestId, input);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest, setRequests]);

  const acceptRequest = useCallback(async (
    requestId,
    ambulanceId,
    responderId,
    responderName,
    responderPhone
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await acceptEmergencyRequest(requestId, ambulanceId, responderId, responderName, responderPhone);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest, setRequests]);

  const completeRequest = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await completeEmergencyRequest(requestId);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest, setRequests]);

  const cancelRequest = useCallback(async (requestId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const data = await cancelEmergencyRequest(requestId, reason);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel emergency request';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentRequest, setRequests]);

  const updateResponderLocationData = useCallback(async (
    requestId,
    location,
    heading
  ) => {
    try {
      const data = await updateResponderLocation(requestId, location, heading);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update responder location';
      setError(message);
      return null;
    }
  }, [setError, setCurrentRequest, setRequests]);

  const updatePatientLocationData = useCallback(async (
    requestId,
    location,
    heading
  ) => {
    try {
      const data = await updatePatientLocation(requestId, location, heading);
      setCurrentRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update patient location';
      setError(message);
      return null;
    }
  }, [setError, setCurrentRequest, setRequests]);

  const subscribe = useCallback((requestId, callback) => {
    try {
      return subscribeToEmergencyRequest(requestId, callback);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe to emergency request';
      setError(message);
      return null;
    }
  }, [setError]);

  return {
    requests: state.requests,
    currentRequest: state.currentRequest,
    activeRequests: state.activeRequests,
    stats: state.stats,
    loading: state.loading,
    error: state.error,
    fetchRequests,
    fetchRequest,
    fetchActiveRequests,
    fetchUserRequests,
    fetchHospitalRequests,
    fetchStats,
    createRequest,
    updateRequest,
    acceptRequest,
    completeRequest,
    cancelRequest,
    updateResponderLocationData,
    updatePatientLocationData,
    setCurrentRequest,
    subscribe,
  };
}
