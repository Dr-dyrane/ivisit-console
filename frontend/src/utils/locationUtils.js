/**
 * Location Utilities for Emergency Requests
 * Handles conversion of location data to human-readable format
 */

/**
 * Decode PostGIS geometry string to extract coordinates
 * @param {string} geometry - PostGIS geometry string (e.g., "0101000020E6100000A41A55E4B23F5DC07D6669E068E04040")
 * @returns {Object|null} Coordinates {lat, lng} or null
 */
export const decodePostGISGeometry = (geometry) => {
  if (!geometry) return null;

  // Handle already decoded objects (e.g. GeoJSON format)
  if (typeof geometry === 'object') {
    if (geometry.lat && geometry.lng) return { lat: geometry.lat, lng: geometry.lng };
    if (geometry.coordinates && geometry.coordinates.length >= 2) {
      // GeoJSON Point is [lng, lat]
      return { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
    }
  }

  if (typeof geometry !== 'string' || !geometry.startsWith('0101')) {
    return null;
  }

  try {
    // PostGIS Point (SRID 4326) format: 0101000020E6100000 + coordinate data
    // Extract the coordinate data after the SRID prefix
    const hexData = geometry.substring(16); // Remove "0101000020E6100000"

    // Handle both 32-char (standard) and 34-char (extended) formats
    if (hexData.length !== 32 && hexData.length !== 34) {
      return null;
    }

    // For 34-char format, skip the first 2 bytes (likely metadata) and take last 32
    const coordHex = hexData.length === 34 ? hexData.substring(2) : hexData;

    // Convert hex to float64 (little-endian) in browser
    const lngHex = coordHex.substring(0, 16);
    const latHex = coordHex.substring(16);

    // Helper function to convert hex to double
    const hexToDouble = (hex) => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);

      // Convert hex to bytes (little-endian)
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, parseInt(hex.substr(i * 2, 2), 16));
      }

      return view.getFloat64(0, true); // true for little-endian
    };

    const lng = hexToDouble(lngHex);
    const lat = hexToDouble(latHex);

    return { lat, lng };
  } catch (error) {
    console.error('Error decoding PostGIS geometry:', error);
    return null;
  }
};

/**
 * Format emergency location for display
 * @param {Object|string} location - Location data (geometry object, string, or PostGIS geometry)
 * @param {Object} pickupLocation - Alternative pickup location
 * @returns {string} Human-readable location
 */
export const formatEmergencyLocation = (location, pickupLocation) => {
  if (!location) {
    return 'Location shared';
  }

  // If location is already a string (address)
  if (typeof location === 'string') {
    // Check if it's PostGIS geometry
    if (typeof location === 'string' && location.startsWith('0101')) {
      const coords = decodePostGISGeometry(location);
      if (coords) {
        return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      }
      return 'GPS Coordinates';
    }
    return location;
  }

  // If location is an object with address
  if (location.address) {
    return location.address;
  }

  // Check pickup_location as fallback
  if (pickupLocation?.address) {
    return pickupLocation.address;
  }

  // If location has coordinates, show them as fallback
  if (location.lat && location.lng) {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }

  // Default fallback
  return 'Location shared';
};

/**
 * Extract coordinates from location object
 * @param {Object|string} location - Location data
 * @returns {Object|null} Coordinates {lat, lng} or null
 */
export const extractCoordinates = (location) => {
  if (!location || typeof location === 'string') {
    return null;
  }

  if (location.lat && location.lng) {
    return {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng)
    };
  }

  return null;
};
