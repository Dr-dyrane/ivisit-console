import { useCallback, useEffect, useRef, useState } from 'react';

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000,
};

const unavailableState = (error) => ({
  status: 'unavailable',
  coordinates: null,
  error: error || new Error('Location is unavailable.'),
});

export const useOperatorLocation = () => {
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const [location, setLocation] = useState({
    status: 'locating',
    coordinates: null,
    error: null,
  });

  const requestLocation = useCallback(() => {
    const requestId = ++requestRef.current;
    setLocation((current) => ({ ...current, status: 'locating', error: null }));

    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const next = unavailableState(new Error('This device does not provide browser location.'));
        if (mountedRef.current && requestRef.current === requestId) setLocation(next);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          };
          if (mountedRef.current && requestRef.current === requestId) {
            setLocation({ status: 'available', coordinates, error: null });
          }
          resolve(coordinates);
        },
        (error) => {
          if (mountedRef.current && requestRef.current === requestId) {
            setLocation(unavailableState(error));
          }
          resolve(null);
        },
        LOCATION_OPTIONS,
      );
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    requestLocation();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [requestLocation]);

  return { ...location, requestLocation };
};
