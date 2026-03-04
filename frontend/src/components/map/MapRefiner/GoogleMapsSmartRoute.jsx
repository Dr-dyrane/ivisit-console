import React, { useEffect, useMemo, useRef } from 'react';
import { useMap as useGoogleMap } from '@vis.gl/react-google-maps';

/**
 * GoogleMapsSmartRoute
 * Draws road-following routes using the modern Google Routes library.
 * Falls back to a deterministic straight segment if routing is unavailable.
 */
export const GoogleMapsSmartRoute = ({ start, end, options }) => {
	const map = useGoogleMap();
	const polylineRef = useRef(null);
	const routesLibPromiseRef = useRef(null);
	const requestSeqRef = useRef(0);

	const endpoints = useMemo(() => {
		if (!start || !end) return null;
		const startLat = Number(start.lat);
		const startLng = Number(start.lng);
		const endLat = Number(end.lat);
		const endLng = Number(end.lng);
		if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return null;
		return { startLat, startLng, endLat, endLng };
	}, [start, end]);

	useEffect(() => {
		if (!map) return undefined;

		if (!polylineRef.current) {
			polylineRef.current = new window.google.maps.Polyline({
				path: [],
				...options,
			});
			polylineRef.current.setMap(map);
		}

		return undefined;
	}, [map]);

	useEffect(() => {
		if (polylineRef.current) {
			polylineRef.current.setOptions({ ...options });
		}
	}, [options]);

	useEffect(() => {
		if (!map || !endpoints || !window.google?.maps) return undefined;
		let isCancelled = false;
		const requestId = ++requestSeqRef.current;

		const fallbackPath = [
			{ lat: endpoints.startLat, lng: endpoints.startLng },
			{ lat: endpoints.endLat, lng: endpoints.endLng },
		];

		const getRoutesLib = async () => {
			if (!routesLibPromiseRef.current) {
				routesLibPromiseRef.current = window.google.maps.importLibrary('routes');
			}
			return routesLibPromiseRef.current;
		};

		const updatePolyline = (path) => {
			if (!polylineRef.current) return;
			polylineRef.current.setOptions({
				...options,
				path,
			});
		};

		(async () => {
			try {
				const routesLib = await getRoutesLib();
				const Route = routesLib?.Route;
				if (!Route || typeof Route.computeRoutes !== 'function') {
					updatePolyline(fallbackPath);
					return;
				}

				const routeRequest = {
					origin: { lat: endpoints.startLat, lng: endpoints.startLng },
					destination: { lat: endpoints.endLat, lng: endpoints.endLng },
					travelMode: routesLib.TravelMode?.DRIVING ?? 'DRIVING',
					routingPreference:
						routesLib.RoutingPreference?.TRAFFIC_AWARE_OPTIMAL ??
						routesLib.RoutingPreference?.TRAFFIC_AWARE ??
						'TRAFFIC_AWARE',
					polylineQuality:
						routesLib.PolylineQuality?.HIGH_QUALITY ?? 'HIGH_QUALITY',
					fields: ['path'],
				};

				const response = await Route.computeRoutes(routeRequest);
				if (isCancelled || requestId !== requestSeqRef.current) return;

				const routePath = response?.routes?.[0]?.path;
				if (Array.isArray(routePath) && routePath.length > 1) {
					const normalizedPath = routePath
						.map((point) => {
							const lat = typeof point?.lat === 'function' ? point.lat() : Number(point?.lat);
							const lng = typeof point?.lng === 'function' ? point.lng() : Number(point?.lng);
							if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
							return { lat, lng };
						})
						.filter(Boolean);

					if (normalizedPath.length > 1) {
						updatePolyline(normalizedPath);
						return;
					}
				}

				updatePolyline(fallbackPath);
			} catch (error) {
				if (isCancelled || requestId !== requestSeqRef.current) return;
				console.warn('[GoogleMapsSmartRoute] Traffic-aware route unavailable, using fallback path.', error);
				updatePolyline(fallbackPath);
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, [map, endpoints]);

	useEffect(() => {
		return () => {
			if (polylineRef.current) {
				polylineRef.current.setMap(null);
				polylineRef.current = null;
			}
		};
	}, []);

	return null;
};
