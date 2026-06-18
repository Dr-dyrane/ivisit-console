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

export const GoogleMapsMapRefiner = ({ userLocation, hospitals = [], styles }) => {
	const map = useGoogleMap();
	const zoomedStatus = React.useRef('none'); // 'none' | 'user' | 'full'

	// Sync map styles
	useEffect(() => {
		if (map && styles) map.setOptions({ styles });
	}, [map, styles]);

	// Memoize top 5 closest hospitals (not emergencies) for deterministic zooming
	const top5Hospitals = React.useMemo(() => {
		if (!userLocation || !hospitals || hospitals.length === 0) return [];
		const uLat = userLocation.lat;
		const uLng = userLocation.lng;

		return [...hospitals]
			.filter(m => m.lat && m.lng)
			.map(m => {
				const mLat = parseFloat(m.lat);
				const mLng = parseFloat(m.lng);
				if (!Number.isFinite(mLat) || !Number.isFinite(mLng)) return null;
				return {
					lat: mLat,
					lng: mLng,
					dist: Math.pow(mLat - uLat, 2) + Math.pow(mLng - uLng, 2)
				};
			})
			.filter(Boolean)
			.sort((a, b) => a.dist - b.dist)
			.slice(0, 5);
	}, [userLocation, hospitals]);

	const hospitalZoomKey = React.useMemo(
		() => top5Hospitals.map((m) => `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`).join('|'),
		[top5Hospitals]
	);

	// State to force re-run of centering logic
	const [recenterTrigger, setRecenterTrigger] = useState(0);

	useEffect(() => {
		if (!map) return;
		zoomedStatus.current = 'none';
	}, [map]);

	useEffect(() => {
		if (!map || !userLocation) return;

		// Stage 1: Absolute immediate snap to user coordinate (Fast Focus)
		if (zoomedStatus.current === 'none') {
			console.log("MapRefiner: Stage 1 - Immediate snap to user location");
			map.setCenter(userLocation);
			map.setZoom(15);
			zoomedStatus.current = 'user';
		}
	}, [map, userLocation, recenterTrigger]);

	useEffect(() => {
		if (!map || !userLocation) return;

		// Stage 2: Upgrade to smart zoom once nearby hospitals are loaded
		if (zoomedStatus.current === 'user' && top5Hospitals.length > 0) {
			console.log("MapRefiner: Stage 2 - Expanding to include closest hospitals");
			const bounds = new window.google.maps.LatLngBounds();
			bounds.extend(userLocation);
			top5Hospitals.forEach(m => bounds.extend(m));

			map.fitBounds(bounds, {
				padding: { top: 150, bottom: 150, left: 100, right: 100 }
			});
			zoomedStatus.current = 'full';
		}
	}, [map, userLocation, top5Hospitals, hospitalZoomKey, recenterTrigger]);

	// Listen for re-center events
	useEffect(() => {
		const handleRecenter = () => {
			console.log("MapRefiner: Resetting focus status for re-center request");
			zoomedStatus.current = 'none';
			setRecenterTrigger(prev => prev + 1); // Trigger the main effect
		};
		window.addEventListener('recenter-map', handleRecenter);
		return () => window.removeEventListener('recenter-map', handleRecenter);
	}, []);

	return null;
};
