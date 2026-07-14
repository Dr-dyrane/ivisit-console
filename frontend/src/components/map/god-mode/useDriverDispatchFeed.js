import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { driverManagementService } from '../../../services/driverManagementService';
import { selectCurrentDriverAssignment } from './driverAssignmentModel';

const DRIVER_FEED_REFRESH_MS = 15000;
const PAGE_ACTIVE_REFRESH_DEDUP_MS = 1000;
const EMPTY_STATE = { items: [], loading: false, error: null };

export function useDriverDispatchFeed({ enabled, responderId }) {
  const [state, setState] = useState(EMPTY_STATE);
  const lastPageActiveRefreshAtRef = useRef(0);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !responderId) return [];
    if (!silent) setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const items = await driverManagementService.getDispatchFeed();
      setState({ items, loading: false, error: null });
      return items;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error?.message || 'Driver assignments could not be loaded',
      }));
      return [];
    }
  }, [enabled, responderId]);

  useEffect(() => {
    if (!enabled || !responderId) {
      setState(EMPTY_STATE);
      lastPageActiveRefreshAtRef.current = 0;
      return undefined;
    }
    lastPageActiveRefreshAtRef.current = Date.now();
    void refresh();
    const unsubscribe = driverManagementService.subscribeToDispatchFeed(
      responderId,
      () => void refresh({ silent: true }),
    );
    const intervalId = window.setInterval(
      () => void refresh({ silent: true }),
      DRIVER_FEED_REFRESH_MS,
    );
    const refreshWhenPageActive = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (
        lastPageActiveRefreshAtRef.current
        && now - lastPageActiveRefreshAtRef.current < PAGE_ACTIVE_REFRESH_DEDUP_MS
      ) return;
      lastPageActiveRefreshAtRef.current = now;
      void refresh({ silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshWhenPageActive();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshWhenPageActive);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshWhenPageActive);
      unsubscribe();
    };
  }, [enabled, refresh, responderId]);

  const currentAssignment = useMemo(
    () => selectCurrentDriverAssignment(state.items),
    [state.items],
  );

  return {
    ...state,
    currentAssignment,
    refresh,
  };
}
