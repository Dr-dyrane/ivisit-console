import React, { useEffect, useState } from 'react';
import { decodePostGISGeometry } from '../../utils/locationUtils';

/**
 * LocationCell component for displaying formatted location addresses
 * Handles PostGIS geometry decoding and Google Geocoding
 */
export const LocationCell = ({ location, pickupLocation, responderLocation }) => {
  const [address, setAddress] = useState('Loading...');

  useEffect(() => {
    const formatLocation = () => {
      // Check patient_location first, then responder_location, then pickup_location
      const locationToUse = location || responderLocation || pickupLocation;

      if (!locationToUse) {
        setAddress('Location shared');
        return;
      }

      // If location is already a string (address)
      if (typeof locationToUse === 'string') {
        // Check if it's PostGIS geometry
        if (typeof locationToUse === 'string' && locationToUse.startsWith('0101')) {
          const coords = decodePostGISGeometry(locationToUse);
          if (coords) {
            // Try to get address from Google API
            setAddress('Loading address...');
            fetchGoogleAddress(coords.lat, coords.lng).then(address => {
              setAddress(address);
            }).catch(() => {
              // Fallback to coordinates if geocoding fails
              setAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
            });
          } else {
            setAddress('GPS Coordinates');
          }
        } else {
          setAddress(locationToUse);
        }
        return;
      }

      // If location is an object with address
      if (locationToUse.address) {
        setAddress(locationToUse.address);
        return;
      }

      // If location has coordinates, show them
      if (locationToUse.lat && locationToUse.lng) {
        setAddress('Loading address...');
        fetchGoogleAddress(locationToUse.lat, locationToUse.lng).then(address => {
          setAddress(address);
        }).catch(() => {
          setAddress(`${locationToUse.lat.toFixed(4)}, ${locationToUse.lng.toFixed(4)}`);
        });
        return;
      }

      // Default fallback
      setAddress('Location shared');
    };

    formatLocation();
  }, [location, pickupLocation, responderLocation]);

  return <span className="text-sm">{address}</span>;
};

/**
 * Fetch address from Google Geocoding API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Address or fallback coordinates
 */
const fetchGoogleAddress = async (lat, lng) => {
  try {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY') {
      throw new Error('No API key');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      return data.results[0].formatted_address;
    }

    throw new Error('No results found');
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error; // Let caller handle fallback
  }
};
