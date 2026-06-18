/**
 * useVisits Hook
 * Manages visits data and operations using visitsService
 */

import { useState, useCallback } from 'react';
import {
  getVisits,
  getVisit,
  createVisit,
  updateVisit,
  deleteVisit,
  completeVisit,
  cancelVisit,
  markVisitAsNoShow,
  getUserVisits,
  getUserUpcomingVisits,
  getUserCompletedVisits,
  getVisitStats,
  subscribeToVisit,
  subscribeToUserVisits,
} from '../services/visitsService';

export function useVisits() {
  const [state, setState] = useState({
    visits: [],
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setVisits = useCallback((visits) => {
    setState((prev) => ({ ...prev, visits }));
  }, []);

  const fetchVisits = useCallback(
    async (filter) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVisits(filter);
        setVisits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch visits');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setVisits]
  );

  const fetchVisit = useCallback(async (visitId) => {
    try {
      setError(null);
      return await getVisit(visitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch visit');
      return null;
    }
  }, [setError]);

  const fetchUserVisits = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserVisits(userId);
        setVisits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user visits');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setVisits]
  );

  const fetchUpcomingVisits = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserUpcomingVisits(userId);
        setVisits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch upcoming visits');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setVisits]
  );

  const fetchCompletedVisits = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserCompletedVisits(userId);
        setVisits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch completed visits');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setVisits]
  );

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      return await getVisitStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch visit stats');
      return null;
    }
  }, [setError]);

  const addVisit = useCallback(
    async (input) => {
      try {
        setError(null);
        const visit = await createVisit(input);
        setVisits((prev) => [visit, ...prev]);
        return visit;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create visit');
        return null;
      }
    },
    [setError, setVisits]
  );

  const editVisit = useCallback(
    async (visitId, input) => {
      try {
        setError(null);
        const visit = await updateVisit(visitId, input);
        setVisits((prev) => prev.map((v) => (v.id === visitId ? visit : v)));
        return visit;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update visit');
        return null;
      }
    },
    [setError, setVisits]
  );

  const removeVisit = useCallback(
    async (visitId) => {
      try {
        setError(null);
        await deleteVisit(visitId);
        setVisits((prev) => prev.filter((v) => v.id !== visitId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete visit');
        return false;
      }
    },
    [setError, setVisits]
  );

  const finishVisit = useCallback(
    async (visitId, summary, prescriptions) => {
      try {
        setError(null);
        const visit = await completeVisit(visitId, summary, prescriptions);
        setVisits((prev) => prev.map((v) => (v.id === visitId ? visit : v)));
        return visit;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete visit');
        return null;
      }
    },
    [setError, setVisits]
  );

  const abortVisit = useCallback(
    async (visitId, reason) => {
      try {
        setError(null);
        const visit = await cancelVisit(visitId, reason);
        setVisits((prev) => prev.map((v) => (v.id === visitId ? visit : v)));
        return visit;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel visit');
        return null;
      }
    },
    [setError, setVisits]
  );

  const noShowVisit = useCallback(
    async (visitId) => {
      try {
        setError(null);
        const visit = await markVisitAsNoShow(visitId);
        setVisits((prev) => prev.map((v) => (v.id === visitId ? visit : v)));
        return visit;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark visit as no-show');
        return null;
      }
    },
    [setError, setVisits]
  );

  const subscribe = useCallback(
    (visitId, callback) => {
      try {
        return subscribeToVisit(visitId, callback);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to visit');
        return null;
      }
    },
    [setError]
  );

  const subscribeToUser = useCallback(
    (userId, callback) => {
      try {
        return subscribeToUserVisits(userId, (visit, eventType) => callback(visit, eventType));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to user visits');
        return null;
      }
    },
    [setError]
  );

  return {
    ...state,
    fetchVisits,
    fetchVisit,
    fetchUserVisits,
    fetchUpcomingVisits,
    fetchCompletedVisits,
    fetchStats,
    addVisit,
    editVisit,
    removeVisit,
    finishVisit,
    abortVisit,
    noShowVisit,
    subscribe,
    subscribeToUser,
  };
}
