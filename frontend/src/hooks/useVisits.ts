/**
 * useVisits Hook
 * Manages visits data and operations using visitsService
 */

import { useState, useEffect, useCallback } from 'react';
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
  VisitFilter,
  CreateVisitInput,
  UpdateVisitInput,
  VisitStats,
} from '../services/visitsService';
import { Visit } from '../types/index';

interface UseVisitsState {
  visits: Visit[];
  loading: boolean;
  error: string | null;
}

interface UseVisitsReturn extends UseVisitsState {
  fetchVisits: (filter?: VisitFilter) => Promise<void>;
  fetchVisit: (visitId: string) => Promise<Visit | null>;
  fetchUserVisits: (userId: string) => Promise<void>;
  fetchUpcomingVisits: (userId: string) => Promise<void>;
  fetchCompletedVisits: (userId: string) => Promise<void>;
  fetchStats: () => Promise<VisitStats | null>;
  addVisit: (input: CreateVisitInput) => Promise<Visit | null>;
  editVisit: (visitId: string, input: UpdateVisitInput) => Promise<Visit | null>;
  removeVisit: (visitId: string) => Promise<boolean>;
  finishVisit: (visitId: string, summary?: string, prescriptions?: string[]) => Promise<Visit | null>;
  abortVisit: (visitId: string, reason?: string) => Promise<Visit | null>;
  noShowVisit: (visitId: string) => Promise<Visit | null>;
  subscribe: (visitId: string, callback: (visit: Visit) => void) => (() => void) | null;
  subscribeToUser: (userId: string, callback: (visit: Visit, eventType: string) => void) => (() => void) | null;
}

export function useVisits(): UseVisitsReturn {
  const [state, setState] = useState<UseVisitsState>({
    visits: [],
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setVisits = useCallback((visits: Visit[]) => {
    setState((prev) => ({ ...prev, visits }));
  }, []);

  const fetchVisits = useCallback(
    async (filter?: VisitFilter) => {
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

  const fetchVisit = useCallback(async (visitId: string): Promise<Visit | null> => {
    try {
      setError(null);
      return await getVisit(visitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch visit');
      return null;
    }
  }, [setError]);

  const fetchUserVisits = useCallback(
    async (userId: string) => {
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
    async (userId: string) => {
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
    async (userId: string) => {
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

  const fetchStats = useCallback(async (): Promise<VisitStats | null> => {
    try {
      setError(null);
      return await getVisitStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch visit stats');
      return null;
    }
  }, [setError]);

  const addVisit = useCallback(
    async (input: CreateVisitInput): Promise<Visit | null> => {
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
    async (visitId: string, input: UpdateVisitInput): Promise<Visit | null> => {
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
    async (visitId: string): Promise<boolean> => {
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
    async (visitId: string, summary?: string, prescriptions?: string[]): Promise<Visit | null> => {
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
    async (visitId: string, reason?: string): Promise<Visit | null> => {
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
    async (visitId: string): Promise<Visit | null> => {
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
    (visitId: string, callback: (visit: Visit) => void): (() => void) | null => {
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
    (userId: string, callback: (visit: Visit, eventType: string) => void): (() => void) | null => {
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
