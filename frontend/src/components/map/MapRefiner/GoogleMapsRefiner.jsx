import React, { useState, useEffect } from 'react';
import { useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import { getRadiusBounds, MAP_VIEW_RADIUS_KM } from '../mapViewModel';

const WORLD_TILE_SIZE = 256;

const latitudeRadians = (latitude) => {
	const bounded = Math.max(-85, Math.min(85, Number(latitude) || 0));
	const sine = Math.sin((bounded * Math.PI) / 180);
	const radians = Math.log((1 + sine) / (1 - sine)) / 2;
	return Math.max(-Math.PI, Math.min(Math.PI, radians)) / 2;
};

const zoomForFraction = (pixels, fraction) => (
	Math.log(pixels / WORLD_TILE_SIZE / Math.max(fraction, Number.EPSILON)) / Math.LN2
);

const getViewportPadding = (map) => {
	const compact = (map?.getDiv()?.clientWidth || 0) <= 640;
	return compact
		? { top: 160, bottom: 128, left: 24, right: 24 }
		: { top: 96, bottom: 128, left: 72, right: 72 };
};

const getViewportZoom = (map, bounds, padding) => {
	const mapElement = map?.getDiv();
	if (!mapElement) return 12;

	const availableWidth = Math.max(1, mapElement.clientWidth - padding.left - padding.right);
	const availableHeight = Math.max(1, mapElement.clientHeight - padding.top - padding.bottom);
	const latitudeFraction = Math.abs(
		(latitudeRadians(bounds.north) - latitudeRadians(bounds.south)) / Math.PI
	);
	const longitudeFraction = Math.abs((bounds.east - bounds.west) / 360);
	const target = Math.floor(Math.min(
		zoomForFraction(availableWidth, longitudeFraction),
		zoomForFraction(availableHeight, latitudeFraction),
	));

	return Math.max(3, Math.min(18, target));
};

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

export const GoogleMapsMapRefiner = ({
	focusLocation,
	radiusKm = MAP_VIEW_RADIUS_KM,
	styles,
}) => {
	const map = useGoogleMap();

	// Sync map styles
	useEffect(() => {
		if (map && styles) map.setOptions({ styles });
	}, [map, styles]);

	const applyViewport = React.useCallback((center = focusLocation) => {
		if (!map || !center) return;
		const bounds = getRadiusBounds(center, radiusKm);
		const padding = getViewportPadding(map);
		const targetZoom = getViewportZoom(map, bounds, padding);
		map.fitBounds(
			{
				south: bounds.south,
				west: bounds.west,
				north: bounds.north,
				east: bounds.east,
			},
			padding,
		);
		// fitBounds can run before Google has measured the map div and leave the
		// camera at a world-scale zoom. Pin the same radius deterministically.
		map.setCenter(center);
		map.setZoom(targetZoom);
	}, [focusLocation, map, radiusKm]);

	useEffect(() => {
		applyViewport();
	}, [applyViewport]);

	// Listen for re-center events
	useEffect(() => {
		const handleRecenter = (event) => {
			applyViewport(event?.detail?.center || focusLocation);
		};
		window.addEventListener('recenter-map', handleRecenter);
		return () => window.removeEventListener('recenter-map', handleRecenter);
	}, [applyViewport, focusLocation]);

	return null;
};
