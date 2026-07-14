import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { driverManagementService } from '../../../services/driverManagementService';

const MIN_UPDATE_INTERVAL_MS = 12000;
const MIN_MOVEMENT_METERS = 20;
const TELEMETRY_HEARTBEAT_MS = 20000;
const PAGE_ACTIVE_RECOVERY_DEDUP_MS = 1000;
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 15000,
};
const FRESH_GEOLOCATION_OPTIONS = {
  ...GEOLOCATION_OPTIONS,
  maximumAge: 0,
};

const distanceInMeters = (left, right) => {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = radians(right.lat - left.lat);
  const longitudeDelta = radians(right.lng - left.lng);
  const leftLatitude = radians(left.lat);
  const rightLatitude = radians(right.lat);
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2
  );
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export function useDriverLocationTracking({ assignment, ambulance, enabled }) {
  const assignmentId = assignment?.assignment_id || null;
  const requestId = assignment?.request_id || null;
  const ambulanceId = assignment?.ambulance_id || ambulance?.id || null;
  const contextKey = `${ambulanceId || ''}:${requestId || ''}:${assignmentId || ''}`;
  const [status, setStatus] = useState('idle');
  const [lastSharedAt, setLastSharedAt] = useState(null);
  const [telemetryState, setTelemetryState] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef(null);
  const lastSentAtRef = useRef(0);
  const lastPointRef = useRef(null);
  const sequenceRef = useRef(Number(ambulance?.telemetry_sequence) || 0);
  const sendingRef = useRef(false);
  const contextRef = useRef(contextKey);
  const telemetryStateRef = useRef(null);
  const telemetryRefreshRef = useRef(null);
  const publishPositionRef = useRef(null);
  const heartbeatIdRef = useRef(null);
  const lastRecoveryAtRef = useRef(0);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIdRef.current !== null) {
      window.clearInterval(heartbeatIdRef.current);
      heartbeatIdRef.current = null;
    }
  }, []);

  const stop = useCallback(({ quiet = false } = {}) => {
    clearHeartbeat();
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    sendingRef.current = false;
    lastRecoveryAtRef.current = 0;
    setWatching(false);
    setStatus('idle');
    if (!quiet) toast.info('Live location stopped');
  }, [clearHeartbeat]);

  const refreshTelemetryState = useCallback(async () => {
    if (!requestId) return null;
    if (telemetryRefreshRef.current?.contextKey === contextKey) {
      return telemetryRefreshRef.current.promise;
    }

    const refreshPromise = driverManagementService.getTelemetryState(requestId).then((nextState) => {
      if (contextRef.current !== contextKey) return null;
      const currentSequence = Number(telemetryStateRef.current?.sequence) || 0;
      const nextSequence = Number(nextState?.sequence) || 0;
      sequenceRef.current = Math.max(sequenceRef.current, nextSequence);
      if (currentSequence > nextSequence) return telemetryStateRef.current;

      telemetryStateRef.current = nextState;
      setTelemetryState(nextState);
      setLastSharedAt(nextState?.received_at || null);
      return nextState;
    });
    const refreshEntry = { contextKey, promise: refreshPromise };
    telemetryRefreshRef.current = refreshEntry;
    try {
      return await refreshPromise;
    } finally {
      if (telemetryRefreshRef.current === refreshEntry) telemetryRefreshRef.current = null;
    }
  }, [contextKey, requestId]);

  const publishPosition = useCallback(async (position, { force = false } = {}) => {
    const coords = position?.coords;
    const point = { lat: Number(coords?.latitude), lng: Number(coords?.longitude) };
    const positionTimestamp = Number(position?.timestamp);
    const observedAt = new Date(
      Number.isFinite(positionTimestamp) ? positionTimestamp : Date.now(),
    ).toISOString();
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || sendingRef.current) {
      return false;
    }

    const now = Date.now();
    if (
      !force
      && lastSentAtRef.current
      && now - lastSentAtRef.current < MIN_UPDATE_INTERVAL_MS
      && distanceInMeters(lastPointRef.current, point) < MIN_MOVEMENT_METERS
    ) return false;

    sendingRef.current = true;
    try {
      if (requestId && !telemetryStateRef.current) await refreshTelemetryState();
      const sequence = sequenceRef.current + 1;
      const result = await driverManagementService.reportTelemetry({
        ambulanceId,
        requestId,
        assignmentId,
        sequence,
        observedAt,
        location: point,
        heading: Number.isFinite(coords?.heading) ? coords.heading : null,
        accuracyMeters: Number.isFinite(coords?.accuracy) ? coords.accuracy : null,
      });
      const resultSequence = Number(result.sequence);
      sequenceRef.current = Number.isFinite(resultSequence) ? resultSequence : sequence;
      lastSentAtRef.current = now;
      lastPointRef.current = point;
      setLastSharedAt(result.received_at || null);
      const nextTelemetryState = {
        ...telemetryStateRef.current,
        success: true,
        state: 'live',
        last_known: true,
        received_at: result.received_at,
        lease_expires_at: result.lease_expires_at,
        sequence: result.sequence,
      };
      telemetryStateRef.current = nextTelemetryState;
      setTelemetryState(nextTelemetryState);
      setError(null);
      setStatus('active');
      return true;
    } catch (trackingError) {
      setError(trackingError?.message || 'Location could not be shared');
      setStatus('error');
      return false;
    } finally {
      sendingRef.current = false;
    }
  }, [ambulanceId, assignmentId, refreshTelemetryState, requestId]);

  useEffect(() => {
    publishPositionRef.current = publishPosition;
  }, [publishPosition]);

  const requestFreshPosition = useCallback(({ force = false } = {}) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) {
      return Promise.resolve(false);
    }
    const requestedContext = contextRef.current;

    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (watchIdRef.current === null || contextRef.current !== requestedContext) {
              resolve(false);
              return;
            }
            Promise.resolve(publishPositionRef.current?.(position, { force }))
              .then((published) => resolve(Boolean(published)))
              .catch(() => resolve(false));
          },
          () => resolve(false),
          FRESH_GEOLOCATION_OPTIONS,
        );
      } catch {
        resolve(false);
      }
    });
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIdRef.current = window.setInterval(() => {
      if (watchIdRef.current !== null) void requestFreshPosition();
    }, TELEMETRY_HEARTBEAT_MS);
  }, [clearHeartbeat, requestFreshPosition]);

  const start = useCallback(() => {
    if (!enabled || !ambulanceId) {
      toast.warning('No staffed ambulance is available to track');
      return;
    }
    if (watchIdRef.current !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setError('Location is not available on this device');
      toast.error('Location is not available on this device');
      return;
    }

    setStatus('starting');
    setError(null);
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (watchIdRef.current !== null) void publishPositionRef.current?.(position);
        },
        (locationError) => {
          stop({ quiet: true });
          setStatus('error');
          setError(locationError?.message || 'Location permission is required');
          toast.error(locationError?.message || 'Location permission is required');
        },
        GEOLOCATION_OPTIONS,
      );
      startHeartbeat();
      setWatching(true);
    } catch (locationError) {
      setStatus('error');
      setError(locationError?.message || 'Location permission is required');
      toast.error(locationError?.message || 'Location permission is required');
    }
  }, [ambulanceId, enabled, startHeartbeat, stop]);

  const recoverPageActiveTracking = useCallback(() => {
    if (!enabled || !ambulanceId || watchIdRef.current === null) return;
    const now = Date.now();
    if (
      lastRecoveryAtRef.current
      && now - lastRecoveryAtRef.current < PAGE_ACTIVE_RECOVERY_DEDUP_MS
    ) return;

    lastRecoveryAtRef.current = now;
    void (async () => {
      if (requestId) {
        try {
          await refreshTelemetryState();
        } catch {
          // A fresh position can still recover the lease after a transient read failure.
        }
      }
      if (watchIdRef.current !== null && contextRef.current === contextKey) {
        await requestFreshPosition({ force: true });
      }
    })();
  }, [ambulanceId, contextKey, enabled, refreshTelemetryState, requestFreshPosition, requestId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') recoverPageActiveTracking();
    };
    const handleFocus = () => {
      if (document.visibilityState !== 'hidden') recoverPageActiveTracking();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [recoverPageActiveTracking]);

  useEffect(() => {
    if (contextRef.current !== contextKey) {
      stop({ quiet: true });
      lastSentAtRef.current = 0;
      lastPointRef.current = null;
      sequenceRef.current = Number(ambulance?.telemetry_sequence) || 0;
      setLastSharedAt(null);
      telemetryStateRef.current = null;
      telemetryRefreshRef.current = null;
      setTelemetryState(null);
      setError(null);
      lastRecoveryAtRef.current = 0;
      contextRef.current = contextKey;
    } else if (!enabled || !ambulanceId) stop({ quiet: true });
  }, [ambulance?.telemetry_sequence, ambulanceId, contextKey, enabled, stop]);

  useEffect(() => {
    if (requestId) void refreshTelemetryState().catch(() => {});
  }, [refreshTelemetryState, requestId]);

  useEffect(() => () => stop({ quiet: true }), [stop]);

  return {
    error,
    isActive: watching,
    lastSharedAt,
    refreshTelemetryState,
    start,
    status,
    stop,
    telemetryState,
  };
}
