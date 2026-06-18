import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import { GoogleMapsMapRefiner } from '../MapRefiner/GoogleMapsRefiner';
import { GoogleMapsSmartRoute } from '../MapRefiner/GoogleMapsSmartRoute';
import { AlertTriangle } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_ID =
	(process.env.REACT_APP_GOOGLE_MAP_ID || process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || '').trim() || null;
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
const HOSPITAL_MARKER_IMAGE = '/map/hospital.png';
const HOSPITAL_MARKER_SELECTED_IMAGE = '/map/selected_hospital.png';
const AMBULANCE_MARKER_IMAGE = '/map/ambulance.png';

const sanitizeStrokeColor = (value, fallback = '#86100E') => {
	if (typeof value !== 'string') return fallback;
	const color = value.trim();
	if (!color || color.includes('var(')) return fallback;
	return color;
};

const createImageOverlayNode = ({ src, width, height, opacity = 1 }) => {
	const img = document.createElement('img');
	img.src = src;
	img.alt = '';
	img.draggable = false;
	img.style.width = `${width}px`;
	img.style.height = `${height}px`;
	img.style.opacity = String(opacity);
	img.style.userSelect = 'none';
	img.style.pointerEvents = 'none';
	return img;
};

const createEmergencyOverlayNode = ({ color, critical = false }) => {
	const root = document.createElement('div');
	root.style.width = '30px';
	root.style.height = '42px';
	root.style.position = 'relative';
	root.style.pointerEvents = 'none';

	const pin = document.createElement('div');
	pin.style.position = 'absolute';
	pin.style.left = '0';
	pin.style.top = '0';
	pin.style.width = '30px';
	pin.style.height = '30px';
	pin.style.background = color || '#ef4444';
	pin.style.borderRadius = '50% 50% 50% 0';
	pin.style.transform = 'rotate(-45deg)';
	pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';

	const icon = document.createElement('div');
	icon.textContent = '!';
	icon.style.position = 'absolute';
	icon.style.left = '8px';
	icon.style.top = '4px';
	icon.style.color = '#ffffff';
	icon.style.fontWeight = '900';
	icon.style.fontSize = '15px';
	icon.style.transform = 'rotate(45deg)';
	icon.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

	pin.appendChild(icon);
	root.appendChild(pin);

	if (critical) {
		const dot = document.createElement('div');
		dot.style.position = 'absolute';
		dot.style.right = '-2px';
		dot.style.top = '-2px';
		dot.style.width = '8px';
		dot.style.height = '8px';
		dot.style.borderRadius = '999px';
		dot.style.background = '#ef4444';
		dot.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.7)';
		root.appendChild(dot);
	}

	return root;
};

const createUserOverlayNode = () => {
	const root = document.createElement('div');
	root.style.width = '18px';
	root.style.height = '18px';
	root.style.borderRadius = '999px';
	root.style.background = '#2563eb';
	root.style.border = '2px solid #ffffff';
	root.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
	root.style.pointerEvents = 'none';
	return root;
};

const GoogleMapsOverlayMarker = ({
	position,
	zIndex = 200,
	anchor = 'bottom', // 'bottom' | 'center'
	onClick,
	renderNode,
	renderKey,
}) => {
	const map = useGoogleMap();
	const overlayRef = useRef(null);
	const containerRef = useRef(null);
	const clickRef = useRef(onClick);
	const renderNodeRef = useRef(renderNode);

	useEffect(() => {
		clickRef.current = onClick;
	}, [onClick]);

	useEffect(() => {
		renderNodeRef.current = renderNode;
	}, [renderNode]);

	useEffect(() => {
		if (!map || !window.google || !position) return undefined;
		const lat = Number(position.lat);
		const lng = Number(position.lng);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

		const container = document.createElement('div');
		container.style.position = 'absolute';
		container.style.pointerEvents = 'auto';
		container.style.userSelect = 'none';
		container.style.transform =
			anchor === 'center' ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)';
		container.style.zIndex = String(zIndex);

		const handleClick = (event) => {
			event.stopPropagation();
			clickRef.current?.();
		};
		container.addEventListener('click', handleClick);

		class DomOverlay extends window.google.maps.OverlayView {
			onAdd() {
				const panes = this.getPanes();
				if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(container);
			}

			draw() {
				const projection = this.getProjection();
				if (!projection) return;
				const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
				if (!point) return;
				container.style.left = `${point.x}px`;
				container.style.top = `${point.y}px`;
			}

			onRemove() {
				if (container.parentNode) container.parentNode.removeChild(container);
			}
		}

		const overlay = new DomOverlay();
		overlay.setMap(map);

		containerRef.current = container;
		overlayRef.current = overlay;

		return () => {
			container.removeEventListener('click', handleClick);
			if (overlayRef.current) {
				overlayRef.current.setMap(null);
				overlayRef.current = null;
			}
			containerRef.current = null;
		};
	}, [map, position?.lat, position?.lng, anchor, zIndex]);

	useEffect(() => {
		if (!containerRef.current || typeof renderNodeRef.current !== 'function') return;
		const node = renderNodeRef.current();
		containerRef.current.replaceChildren(node);
	}, [renderKey]);

	return null;
};

export const GoogleMapsRenderer = ({
	theme,
	mapStyles,
	userLocation,
	allMarkers,
	activeRoutes,
	showLayers,
	filteredRequests,
	ambulances,
	hospitals,
	simulatedSessionId,
	getPriorityColor,
	getStatusColor,
	routePrimaryColor,
	setSelectedMarker,
	selectedMarker,
}) => {
	if (!GOOGLE_MAPS_API_KEY) {
		return <div>Google Maps API key not configured</div>;
	}

	const useCloudMapStyling = Boolean(GOOGLE_MAP_ID);
	const canUseAdvancedMarkers = useCloudMapStyling;

	return (
		<APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={canUseAdvancedMarkers ? ['marker'] : []}>
			<Map
				key={theme} // Force remount on theme change for style reliability
				{...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {})}
				defaultCenter={LAGOS_CENTER}
				defaultZoom={12}
				className="w-full h-full"
				gestureHandling="greedy"
				options={{
					disableDefaultUI: true,
					...(useCloudMapStyling ? {} : { styles: mapStyles }),
					backgroundColor: theme === "dark" ? "#0a0a0a" : "#f8f8f8",
					tilt: 0,
					renderingType: 'RASTER',
				}}
			>
				{/* Map Badge Overlay */}
				<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
					<div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						<span className="text-[10px] font-mono font-semibold tracking-wider uppercase opacity-70">
							Session ID: {simulatedSessionId}
						</span>
					</div>
				</div>

				<GoogleMapsMapRefiner
					userLocation={userLocation}
					hospitals={hospitals}
					styles={useCloudMapStyling ? null : mapStyles}
				/>

				{/* Routes/Polylines */}
				{/* Routes/Polylines - Traffic Aware */}
				{activeRoutes.map((route) => (
					<GoogleMapsSmartRoute
						key={route.id}
						start={{ lat: route.positions[0][0], lng: route.positions[0][1] }}
						end={{ lat: route.positions[1][0], lng: route.positions[1][1] }}
						options={{
							strokeColor: sanitizeStrokeColor(routePrimaryColor || route.color, '#86100E'),
							strokeOpacity: route.dashed ? 0.62 : 0.82,
							strokeWeight: route.dashed ? 4 : 5,
							geodesic: false,
						}}
					/>
				))}

				{/* Emergency Request Markers */}
				{showLayers.emergencies &&
					filteredRequests
						.filter((request) => request.lat && request.lng) // Only render requests with valid coordinates
						.map((request) => (
							canUseAdvancedMarkers ? (
								<AdvancedMarker
									key={`emergency-${request.id}`}
									position={{
										lat: parseFloat(request.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(request.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "emergency",
											data: request,
										})
									}
								>
									<div
										className="relative cursor-pointer transform hover:scale-110 transition-transform"
										style={{
											width: "36px",
											height: "36px",
											borderRadius: "50%",
											backgroundColor: getPriorityColor(
												request.priority
											),
											boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<AlertTriangle
											style={{
												width: "18px",
												height: "18px",
												color: "white",
											}}
										/>
										{request.priority === "critical" && (
											<span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
										)}
									</div>
								</AdvancedMarker>
							) : (
								<GoogleMapsOverlayMarker
									key={`emergency-${request.id}`}
									position={{
										lat: parseFloat(request.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(request.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "emergency",
											data: request,
										})
									}
									anchor="center"
									zIndex={220}
									renderNode={() =>
										createEmergencyOverlayNode({
											color: getPriorityColor(request.priority),
											critical: request.priority === 'critical',
										})
									}
									renderKey={`${request.id}:${request.priority}:${request.status || ''}`}
								/>
							)
						))}

				{/* Ambulance Markers */}
				{showLayers.ambulances &&
					ambulances
						.filter((ambulance) => ambulance.lat && ambulance.lng) // Only render ambulances with valid coordinates
						.map((ambulance) => (
							canUseAdvancedMarkers ? (
								<AdvancedMarker
									key={`ambulance-${ambulance.id}`}
									position={{
										lat: parseFloat(ambulance.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(ambulance.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "ambulance",
											data: ambulance,
										})
									}
								>
									<img
										src={AMBULANCE_MARKER_IMAGE}
										alt="Ambulance"
										className="cursor-pointer transform hover:scale-110 transition-transform"
										style={{
											width:
												selectedMarker?.type === "ambulance" && selectedMarker?.data?.id === ambulance.id
													? "26px"
													: "22px",
											height:
												selectedMarker?.type === "ambulance" && selectedMarker?.data?.id === ambulance.id
													? "26px"
													: "22px",
											opacity: 0.94,
											filter: "saturate(0.95)",
										}}
									/>
								</AdvancedMarker>
							) : (
								<GoogleMapsOverlayMarker
									key={`ambulance-${ambulance.id}`}
									position={{
										lat: parseFloat(ambulance.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(ambulance.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "ambulance",
											data: ambulance,
										})
									}
									anchor="center"
									zIndex={240}
									renderNode={() =>
										createImageOverlayNode({
											src: AMBULANCE_MARKER_IMAGE,
											width:
												selectedMarker?.type === "ambulance" && selectedMarker?.data?.id === ambulance.id
													? 26
													: 22,
											height:
												selectedMarker?.type === "ambulance" && selectedMarker?.data?.id === ambulance.id
													? 26
													: 22,
											opacity: 0.94,
										})
									}
									renderKey={`${ambulance.id}:${selectedMarker?.type === 'ambulance' && selectedMarker?.data?.id === ambulance.id ? 'selected' : 'default'}`}
								/>
							)
						))}

				{/* Hospital Markers */}
				{showLayers.hospitals &&
					hospitals
						.filter((hospital) => hospital.lat && hospital.lng) // Only render hospitals with valid coordinates
						.map((hospital) => (
							canUseAdvancedMarkers ? (
								<AdvancedMarker
									key={`hospital-${hospital.id}`}
									position={{
										lat: parseFloat(hospital.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(hospital.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "hospital",
											data: hospital,
										})
									}
								>
									<img
										src={
											selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
												? HOSPITAL_MARKER_SELECTED_IMAGE
												: HOSPITAL_MARKER_IMAGE
										}
										alt="Hospital"
										className="cursor-pointer transform hover:scale-110 transition-transform"
										style={{
											width:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? "33px"
													: "24px",
											height:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? "56px"
													: "41px",
											opacity:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? 1
													: 0.95,
										}}
									/>
								</AdvancedMarker>
							) : (
								<GoogleMapsOverlayMarker
									key={`hospital-${hospital.id}`}
									position={{
										lat: parseFloat(hospital.lat) || LAGOS_CENTER.lat,
										lng: parseFloat(hospital.lng) || LAGOS_CENTER.lng
									}}
									onClick={() =>
										setSelectedMarker({
											type: "hospital",
											data: hospital,
										})
									}
									anchor="bottom"
									zIndex={260}
									renderNode={() =>
										createImageOverlayNode({
											src:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? HOSPITAL_MARKER_SELECTED_IMAGE
													: HOSPITAL_MARKER_IMAGE,
											width:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? 33
													: 24,
											height:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? 56
													: 41,
											opacity:
												selectedMarker?.type === "hospital" && selectedMarker?.data?.id === hospital.id
													? 1
													: 0.95,
										})
									}
									renderKey={`${hospital.id}:${selectedMarker?.type === 'hospital' && selectedMarker?.data?.id === hospital.id ? 'selected' : 'default'}`}
								/>
							)
						))}

				{/* User Location Marker */}
				{userLocation && (
					canUseAdvancedMarkers ? (
						<AdvancedMarker
							position={userLocation}
							zIndex={300}
						>
						<div className="relative">
							<div className="absolute inset-0 bg-primary/30 rounded-full animate-ping scale-150" />
							<div className="relative w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
								<div className="w-2 h-2 bg-white rounded-full" />
							</div>
						</div>
						</AdvancedMarker>
					) : (
						<GoogleMapsOverlayMarker
							position={userLocation}
							zIndex={300}
							anchor="center"
							renderNode={createUserOverlayNode}
							renderKey="user-location"
						/>
					)
				)}
			</Map>
		</APIProvider>
	);
};
