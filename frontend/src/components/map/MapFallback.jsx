import React, { useMemo } from 'react';
import { AlertTriangle, Ambulance, Hospital, LocateFixed, MapPin } from 'lucide-react';
import { isWithinMapRadius, MAP_VIEW_RADIUS_KM } from './mapViewModel';

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

const MARKER_META = {
	emergency: {
		Icon: AlertTriangle,
		tone: 'bg-destructive text-white',
		label: 'Request',
	},
	ambulance: {
		Icon: Ambulance,
		tone: 'bg-success text-white',
		label: 'Unit',
	},
	hospital: {
		Icon: Hospital,
		tone: 'bg-info text-white',
		label: 'Hospital',
	},
	user: {
		Icon: LocateFixed,
		tone: 'bg-violet-600 text-white',
		label: 'You',
	},
};

const readCoordinate = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const getMarkerName = (marker) => {
	if (marker.type === 'user') return 'Your location';
	const data = marker.data || {};
	return (
		data.name ||
		data.call_sign ||
		data.vehicle_number ||
		data.display_id ||
		(data.id ? `#${String(data.id).slice(-6)}` : MARKER_META[marker.type]?.label || 'Location')
	);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getBounds = (markers) => {
	const fallback = {
		minLat: LAGOS_CENTER.lat - 0.04,
		maxLat: LAGOS_CENTER.lat + 0.04,
		minLng: LAGOS_CENTER.lng - 0.04,
		maxLng: LAGOS_CENTER.lng + 0.04,
	};

	if (!markers.length) return fallback;

	return markers.reduce(
		(bounds, marker) => ({
			minLat: Math.min(bounds.minLat, marker.lat),
			maxLat: Math.max(bounds.maxLat, marker.lat),
			minLng: Math.min(bounds.minLng, marker.lng),
			maxLng: Math.max(bounds.maxLng, marker.lng),
		}),
		{
			minLat: markers[0].lat,
			maxLat: markers[0].lat,
			minLng: markers[0].lng,
			maxLng: markers[0].lng,
		}
	);
};

const positionMarker = (marker, bounds, index) => {
	const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.01);
	const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.01);
	const jitter = (index % 5) * 1.8;

	return {
		left: `${clamp(8 + ((marker.lng - bounds.minLng) / lngSpan) * 84 + jitter, 8, 92)}%`,
		top: `${clamp(8 + (1 - (marker.lat - bounds.minLat) / latSpan) * 84 - jitter, 8, 92)}%`,
	};
};

export const MapFallback = ({
	filteredRequests = [],
	ambulances = [],
	hospitals = [],
	activeRoutes = [],
	showLayers = {},
	userLocation = null,
	focusLocation = null,
	viewRadiusKm = MAP_VIEW_RADIUS_KM,
	selectedMarker = null,
	setSelectedMarker = null,
}) => {
	const markers = useMemo(() => {
		const collected = [];

		if (showLayers.emergencies !== false) {
			for (const request of filteredRequests) {
				const lat = readCoordinate(request?.lat);
				const lng = readCoordinate(request?.lng);
				if (lat !== null && lng !== null) {
					collected.push({ type: 'emergency', id: `emergency-${request.id}`, lat, lng, data: request });
				}
			}
		}

		if (showLayers.ambulances !== false) {
			for (const ambulance of ambulances) {
				const lat = readCoordinate(ambulance?.lat);
				const lng = readCoordinate(ambulance?.lng);
				if (lat !== null && lng !== null) {
					collected.push({ type: 'ambulance', id: `ambulance-${ambulance.id}`, lat, lng, data: ambulance });
				}
			}
		}

		if (showLayers.hospitals !== false) {
			for (const hospital of hospitals) {
				const lat = readCoordinate(hospital?.lat);
				const lng = readCoordinate(hospital?.lng);
				if (lat !== null && lng !== null) {
					collected.push({ type: 'hospital', id: `hospital-${hospital.id}`, lat, lng, data: hospital });
				}
			}
		}

		if (userLocation) {
			const lat = readCoordinate(userLocation.lat);
			const lng = readCoordinate(userLocation.lng);
			if (lat !== null && lng !== null) {
				collected.push({ type: 'user', id: 'user-location', lat, lng, data: { id: 'user-location' } });
			}
		}

		return collected;
	}, [ambulances, filteredRequests, hospitals, showLayers, userLocation]);

	const visibleMarkers = useMemo(() => {
		if (!focusLocation) return markers;
		return markers.filter((marker) => (
			marker.type === 'user'
			|| isWithinMapRadius(marker, focusLocation, viewRadiusKm)
		));
	}, [focusLocation, markers, viewRadiusKm]);
	const bounds = useMemo(() => getBounds(visibleMarkers), [visibleMarkers]);
	const selectedId = selectedMarker?.data?.id ? `${selectedMarker.type}-${selectedMarker.data.id}` : null;

	return (
		<div className="relative h-full w-full overflow-hidden bg-background" data-map-fallback="route-owned">
			<div
				className="absolute inset-0 opacity-30"
				style={{
					backgroundImage:
						'linear-gradient(to right, hsl(var(--muted-foreground) / 0.12) 0.0625rem, transparent 0.0625rem), linear-gradient(to bottom, hsl(var(--muted-foreground) / 0.12) 0.0625rem, transparent 0.0625rem)',
					backgroundSize: '12% 12%',
				}}
			/>
			<div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/70 to-transparent" />
			<div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background/70 to-transparent" />

			<div className="absolute left-5 top-5 z-20 rounded-card bg-background/72 px-4 py-3 shadow-e3 backdrop-blur-xl">
				<div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
					<MapPin className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
					Limited map
				</div>
				<div className="mt-1 text-sm font-semibold text-foreground">
					{visibleMarkers.length ? 'Select a point' : 'No map points in this area'}
				</div>
			</div>

			<div className="absolute right-5 top-5 z-20 rounded-card bg-background/72 px-4 py-3 text-right shadow-e3 backdrop-blur-xl">
				<div className="text-[11px] font-medium text-muted-foreground">Live data</div>
				<div className="mt-1 text-sm font-semibold text-foreground">
					{visibleMarkers.length} points shown / {activeRoutes.length} route previews
				</div>
			</div>

			{visibleMarkers.map((marker, index) => {
				const meta = MARKER_META[marker.type] || MARKER_META.emergency;
				const Icon = meta.Icon;
				const isSelected = marker.id === selectedId;
				const isInteractive = marker.type !== 'user';
				const MarkerElement = isInteractive ? 'button' : 'div';
				const position = positionMarker(marker, bounds, index);
				const markerProps = isInteractive
					? {
						type: 'button',
						onClick: () => setSelectedMarker?.({ type: marker.type, data: marker.data }),
						'aria-pressed': isSelected,
					}
					: { role: 'img' };

				return (
					<MarkerElement
						key={marker.id}
						{...markerProps}
						className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform ${isInteractive ? 'hover:scale-105 active:scale-95' : ''}`}
						style={position}
						aria-label={`${meta.label}: ${getMarkerName(marker)}`}
					>
						<span
							className={`flex h-11 w-11 items-center justify-center rounded-pill shadow-e2 ${meta.tone} ${
								isSelected ? 'scale-110' : ''
							}`}
						>
							<Icon className="h-5 w-5" />
						</span>
						<span className="max-w-[8rem] rounded-pill bg-background/80 px-2 py-1 text-[10px] font-semibold text-foreground shadow-e2 backdrop-blur-md">
							{getMarkerName(marker)}
						</span>
					</MarkerElement>
				);
			})}
		</div>
	);
};
