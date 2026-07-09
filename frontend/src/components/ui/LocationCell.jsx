import React from 'react';
import { decodePostGISGeometry } from '../../utils/locationUtils';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';

/**
 * LocationCell — formatted location address for modal/table cells.
 *
 * Resolution order: stored address string → PostGIS/`{lat,lng}` coordinates
 * reverse-geocoded through the shared useReverseGeocode hook (Google when a key
 * is configured, keyless OpenStreetMap fallback — the ivisit-app chain, cached
 * module-wide) → raw coordinates → 'Location shared'.
 */
export const LocationCell = ({ location, pickupLocation, responderLocation }) => {
  const locationToUse = location || responderLocation || pickupLocation;

  // Derive either a direct address string or coordinates for the hook.
  let directAddress = null;
  let coords = null;

  if (typeof locationToUse === 'string') {
    if (locationToUse.startsWith('0101')) {
      coords = decodePostGISGeometry(locationToUse);
    } else {
      directAddress = locationToUse;
    }
  } else if (locationToUse && typeof locationToUse === 'object') {
    if (locationToUse.address) {
      directAddress = locationToUse.address;
    } else if (locationToUse.lat != null && locationToUse.lng != null) {
      coords = { lat: locationToUse.lat, lng: locationToUse.lng };
    }
  }

  const { place, status } = useReverseGeocode(directAddress ? null : coords);

  let label = 'Location shared';
  if (directAddress) {
    label = directAddress;
  } else if (coords) {
    if (place?.formattedAddress) {
      label = place.formattedAddress;
    } else if (status === 'loading') {
      label = 'Loading address...';
    } else {
      label = `${Number(coords.lat).toFixed(4)}, ${Number(coords.lng).toFixed(4)}`;
    }
  }

  return <span className="text-sm" title={label}>{label}</span>;
};
