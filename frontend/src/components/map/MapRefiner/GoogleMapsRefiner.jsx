import React, { useState, useEffect } from 'react';
import { useMap as useGoogleMap } from '@vis.gl/react-google-maps';

// Google Maps Polyline Component
export const GoogleMapsPolyline = ({ path, options }) => {
	const map = useGoogleMap();
	const [polyline, setPolyline] = useState(null);

	// Create Polyline on mount
	useEffect(() => {
		if (!map) return;

		const line = new window.google.maps.Polyline({
			path: [], // Initialize empty
			...options,
		});

		line.setMap(map);
		setPolyline(line);

		return () => {
			line.setMap(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map]);

	// Update path and options
	useEffect(() => {
		if (polyline) {
			polyline.setOptions({ path, ...options });
		}
	}, [polyline, path, options]);

	return null;
};

export const GoogleMapsMapRefiner = ({ userLocation, markers, styles }) => {
	const map = useGoogleMap();
	const zoomedStatus = React.useRef('none'); // 'none' | 'user' | 'full'

	// Sync map styles
	useEffect(() => {
		if (map && styles) map.setOptions({ styles });
	}, [map, styles]);

	// Memoize top 5 closest markers for stability and performance
	const top5 = React.useMemo(() => {
		if (!userLocation || !markers || markers.length === 0) return [];
		const uLat = userLocation.lat;
		const uLng = userLocation.lng;

		return [...markers]
			.filter(m => m.lat && m.lng)
			.map(m => {
				const mLat = parseFloat(m.lat);
				const mLng = parseFloat(m.lng);
				return {
					lat: mLat,
					lng: mLng,
					dist: Math.pow(mLat - uLat, 2) + Math.pow(mLng - uLng, 2)
				};
			})
			.sort((a, b) => a.dist - b.dist)
			.slice(0, 5);
	}, [userLocation, markers]);

	useEffect(() => {
		if (!map || !userLocation) return;

		// Stage 1: Absolute immediate snap to user coordinate (Fast Focus)
		if (zoomedStatus.current === 'none') {
			console.log("MapRefiner: Stage 1 - Immediate snap to user location");
			map.setCenter(userLocation);
			map.setZoom(15);
			zoomedStatus.current = 'user';
		}

		// Stage 2: Upgrade to smart zoom once markers catch up
		if (zoomedStatus.current === 'user' && top5.length > 0) {
			console.log("MapRefiner: Stage 2 - Expanding to include closest markers");
			const bounds = new window.google.maps.LatLngBounds();
			bounds.extend(userLocation);
			top5.forEach(m => bounds.extend(m));

			map.fitBounds(bounds, {
				padding: { top: 150, bottom: 150, left: 100, right: 100 }
			});
			zoomedStatus.current = 'full';
		}
	}, [map, userLocation, top5]);

	// Listen for re-center events
	useEffect(() => {
		const handleRecenter = () => {
			console.log("MapRefiner: Resetting focus status for re-center request");
			zoomedStatus.current = 'none';
		};
		window.addEventListener('recenter-map', handleRecenter);
		return () => window.removeEventListener('recenter-map', handleRecenter);
	}, []);

	return null;
};
