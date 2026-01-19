import React, { useState, useEffect } from 'react';
import { useMap as useGoogleMap, useMapsLibrary } from '@vis.gl/react-google-maps';

/**
 * GoogleMapsSmartRoute
 * Uses the Directions Service to fetch a real road path between two points
 * and renders it using a custom Polyline for styling control.
 */
export const GoogleMapsSmartRoute = ({ start, end, options }) => {
    const map = useGoogleMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState(null);
    const [fetchedPath, setFetchedPath] = useState(null);
    const [polyline, setPolyline] = useState(null);

    // Initialize Directions Service
    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
    }, [routesLibrary, map]);

    // Fetch Route
    useEffect(() => {
        if (!directionsService || !start || !end) return;

        // Debounce slightly to avoid hammering the API
        const timeoutId = setTimeout(() => {
            directionsService.route(
                {
                    origin: { lat: start.lat, lng: start.lng },
                    destination: { lat: end.lat, lng: end.lng },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        const route = result.routes[0];
                        if (route && route.overview_path) {
                            setFetchedPath(route.overview_path);
                        }
                    } else {
                        console.warn(`Directions request failed due to ${status}`);
                        // Fallback to straight line if directions fail
                        setFetchedPath([
                            { lat: start.lat, lng: start.lng },
                            { lat: end.lat, lng: end.lng }
                        ]);
                    }
                }
            );
        }, 200);

        return () => clearTimeout(timeoutId);
    }, [directionsService, start, end]);

    // Create & Update Polyline
    useEffect(() => {
        if (!map || !fetchedPath) return;

        if (!polyline) {
            const line = new window.google.maps.Polyline({
                path: fetchedPath,
                ...options
            });
            line.setMap(map);
            setPolyline(line);
        } else {
            polyline.setOptions({
                path: fetchedPath,
                ...options
            });
        }

        return () => {
            if (polyline) polyline.setMap(null);
        };
    }, [map, fetchedPath, options, polyline]);

    return null;
};
