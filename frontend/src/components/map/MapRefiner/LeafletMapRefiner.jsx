import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { getRadiusBounds, MAP_VIEW_RADIUS_KM } from '../mapViewModel';

export const LeafletMapRefiner = ({
	focusLocation,
	radiusKm = MAP_VIEW_RADIUS_KM,
}) => {
	const map = useMap();
	const applyViewport = React.useCallback((center = focusLocation, animate = false) => {
		if (!map || !center) return;
		const bounds = getRadiusBounds(center, radiusKm);
		map.fitBounds(
			[[bounds.south, bounds.west], [bounds.north, bounds.east]],
			{ padding: [72, 72], animate, duration: animate ? 0.6 : undefined },
		);
	}, [focusLocation, map, radiusKm]);

	useEffect(() => {
		const handleRecenter = (event) => {
			applyViewport(event?.detail?.center || focusLocation, true);
		};

		window.addEventListener('recenter-map', handleRecenter);
		return () => window.removeEventListener('recenter-map', handleRecenter);
	}, [applyViewport, focusLocation]);

	useEffect(() => {
		applyViewport();
	}, [applyViewport]);

	return null;
};
