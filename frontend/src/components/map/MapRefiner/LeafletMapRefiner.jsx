import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const LeafletMapRefiner = ({ userLocation, markers, onZoomComplete }) => {
	const map = useMap();
	const zoomedStatus = React.useRef('none');

	useEffect(() => {
		const handleRecenter = () => {
			if (userLocation) {
				map.setView([userLocation.lat, userLocation.lng], 15, {
					animate: true,
					duration: 1.5
				});
				zoomedStatus.current = 'user';
			}
		};

		window.addEventListener('recenter-map', handleRecenter);
		return () => window.removeEventListener('recenter-map', handleRecenter);
	}, [map, userLocation]);

	// Original effect
	useEffect(() => {
		if (!map || !userLocation) return;

		const top5 = markers && markers.length > 0 ? [...markers]
			.filter(m => m.lat && m.lng)
			.map(m => {
				const mLat = parseFloat(m.lat);
				const mLng = parseFloat(m.lng);
				return {
					pos: [mLat, mLng],
					dist: Math.pow(mLat - userLocation.lat, 2) + Math.pow(mLng - userLocation.lng, 2)
				};
			})
			.sort((a, b) => a.dist - b.dist)
			.slice(0, 5)
			.map(x => x.pos) : [];

		if (zoomedStatus.current === 'none') {
			map.setView([userLocation.lat, userLocation.lng], 15);
			zoomedStatus.current = 'user';
		}

		if (zoomedStatus.current === 'user' && top5.length > 0) {
			map.fitBounds([[userLocation.lat, userLocation.lng], ...top5], { padding: [100, 100], maxZoom: 15 });
			zoomedStatus.current = 'full';
		}

		if (onZoomComplete) onZoomComplete();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map, userLocation?.lat, userLocation?.lng, markers]);

	return null;
};
