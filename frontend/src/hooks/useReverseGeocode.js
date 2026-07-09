import { useEffect, useState } from 'react';

/**
 * useReverseGeocode — transcribe raw coordinates into a readable place label.
 *
 * Mirrors ivisit-app's utils/locationHelpers.js provider chain:
 *   stored address (caller handles) → Google (when REACT_APP_GOOGLE_MAPS_API_KEY
 *   is configured) → OpenStreetMap Nominatim (keyless fallback) → null
 *   (caller falls back to raw coordinates).
 *
 * Results are cached module-wide by rounded coordinates and in-flight requests
 * are deduped, so the detail rail / modal / rows never re-fetch the same spot.
 */

const addressCache = new Map();
const inFlight = new Map();

const cacheKey = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const normalizeCoordinates = (input) => {
  if (!input || typeof input !== 'object') return null;
  const lat = Number(input.lat ?? input.latitude);
  const lng = Number(input.lng ?? input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

// Label shaping mirrors ivisit-app buildPlaceModelFromOpenStreetMap:
// primary = house+road → neighbourhood/suburb → locality; secondary = suburb, city, state.
const shapeOsmPlace = (payload) => {
  const address = payload?.address || {};
  const locality =
    address.city || address.town || address.village || address.hamlet || address.county;
  const primaryText =
    [address.house_number, address.road].filter(Boolean).join(' ').trim() ||
    address.neighbourhood ||
    address.suburb ||
    locality ||
    payload?.name ||
    null;
  const secondaryText = [address.suburb, locality, address.state]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');
  if (!primaryText && !payload?.display_name) return null;

  return {
    shortLabel: [primaryText, locality].filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ') || payload.display_name,
    formattedAddress:
      typeof payload?.display_name === 'string' && payload.display_name.trim()
        ? payload.display_name.trim()
        : [primaryText, secondaryText].filter(Boolean).join(', '),
  };
};

const fetchGooglePlace = async ({ lat, lng }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY') return null;
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
  );
  if (!response.ok) return null;
  const data = await response.json();
  const formatted = data?.status === 'OK' ? data.results?.[0]?.formatted_address : null;
  if (!formatted) return null;
  // Google's formatted_address front-loads the specific part — first two segments read well short.
  const shortLabel = formatted.split(',').slice(0, 2).join(',').trim() || formatted;
  return { shortLabel, formattedAddress: formatted };
};

const fetchOsmPlace = async ({ lat, lng }) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: { Accept: 'application/json', 'Accept-Language': 'en' } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.display_name && !data?.address) return null;
  return shapeOsmPlace(data);
};

const resolvePlace = (coords) => {
  const key = cacheKey(coords.lat, coords.lng);
  if (addressCache.has(key)) return Promise.resolve(addressCache.get(key));
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    let place = null;
    try {
      place = await fetchGooglePlace(coords);
    } catch {
      place = null;
    }
    if (!place) {
      try {
        place = await fetchOsmPlace(coords);
      } catch {
        place = null;
      }
    }
    addressCache.set(key, place);
    inFlight.delete(key);
    return place;
  })();

  inFlight.set(key, promise);
  return promise;
};

/**
 * @param {object|null} coordinates {lat,lng} or {latitude,longitude}
 * @returns {{ place: {shortLabel, formattedAddress}|null, status: 'idle'|'loading'|'done' }}
 */
export const useReverseGeocode = (coordinates) => {
  const coords = normalizeCoordinates(coordinates);
  const key = coords ? cacheKey(coords.lat, coords.lng) : null;
  const [state, setState] = useState(() => ({
    key,
    place: key && addressCache.has(key) ? addressCache.get(key) : null,
    status: key ? (addressCache.has(key) ? 'done' : 'loading') : 'idle',
  }));

  useEffect(() => {
    if (!key) {
      setState({ key: null, place: null, status: 'idle' });
      return undefined;
    }
    if (addressCache.has(key)) {
      setState({ key, place: addressCache.get(key), status: 'done' });
      return undefined;
    }
    let cancelled = false;
    setState({ key, place: null, status: 'loading' });
    resolvePlace({ lat: Number(key.split(',')[0]), lng: Number(key.split(',')[1]) }).then((place) => {
      if (!cancelled) setState({ key, place, status: 'done' });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Guard against a stale place flashing for new coordinates.
  if (state.key !== key) {
    return { place: null, status: key ? 'loading' : 'idle' };
  }
  return { place: state.place, status: state.status };
};

export default useReverseGeocode;
