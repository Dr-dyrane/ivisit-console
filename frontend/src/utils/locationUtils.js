/**
 * Location Utilities for Emergency Requests
 * Handles conversion of location data to human-readable format
 */

/**
 * Format emergency location for display
 * @param {Object|string} location - Location data (geometry object or string)
 * @param {Object} pickupLocation - Alternative pickup location
 * @returns {string} Human-readable location
 */
export const formatEmergencyLocation = (location, pickupLocation) => {
  if (!location) {
    return 'Location shared';
  }

  // If location is already a string (address)
  if (typeof location === 'string') {
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
  return 'Coordinates available';
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
