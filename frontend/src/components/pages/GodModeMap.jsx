import React, { useState, useEffect, useMemo } from "react";
import { usePageHeader } from "../../contexts/LayoutContext";
import { Card } from "../ui/card";
import {
	AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { useTheme } from "../../contexts/ThemeContext";
import { MAP_STYLES } from "../../constants/mapStyles";
import { MapProvider, useMapContext } from "../../contexts/MapContext";
import { supabaseMapService } from "../../services/supabaseMapService";
// PULLBACK NOTE: Added imports for PostGIS geometry support and patient data standardization
// NEW: import { decodePostGISGeometry } from "../../utils/locationUtils";
// NEW: import { getStandardizedPatient } from "../../utils/patientUtils";
import { decodePostGISGeometry } from "../../utils/locationUtils";
import { getStandardizedPatient } from "../../utils/patientUtils";

// Import extracted map components
import {
	MapErrorBoundary,
	MapFallback,
	GoogleMapsRenderer,
	LeafletMapRenderer,
	MarkerDetailPanel,
	MapLayerControls,
	RefreshControls
} from "../map";

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

const GodModeMapContent = () => {
	const { theme } = useTheme();
	const isDark = theme === 'dark';
	const { mapData, toggleLayer, setFilter, setSelectedMarker, refresh } = useMapContext();
	const {
		emergencyRequests,
		ambulances,
		hospitals,
		showLayers,
		filter,
		selectedMarker,
		loading,
		error
	} = mapData;

	const [activeRoutes, setActiveRoutes] = useState([]); // { id, path: [{lat, lng}], color }
	const [userLocation, setUserLocation] = useState(null);
	const [nearbyHospitals, setNearbyHospitals] = useState([]);

	// Simulate ID based on location (optional aesthetic)
	const simulatedSessionId = useMemo(() => {
		if (!userLocation) return "PENDING...";
		const latPart = Math.abs(Math.floor(userLocation.lat * 1000)).toString(16).toUpperCase();
		const lngPart = Math.abs(Math.floor(userLocation.lng * 1000)).toString(16).toUpperCase();
		return `NODE-${latPart}-${lngPart}`;
	}, [userLocation]);

	const mapStyles = useMemo(() =>
		isDark ? MAP_STYLES.dark : MAP_STYLES.light
		, [isDark]);

	// Map Provider State
	const [mapProvider, setMapProvider] = useState("google"); // 'google' | 'leaflet'
	const [isSwitchingMap, setIsSwitchingMap] = useState(false);

	// Apple semantic colors
	const getPriorityColor = (priority) => {
		switch (priority) {
			case "critical": return "hsl(var(--destructive))";
			case "high": return "hsl(var(--warning))";
			case "medium": return "hsl(var(--primary))";
			case "low": return "hsl(var(--success))";
			default: return "hsl(var(--muted-foreground))";
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "available": return "hsl(var(--success))";
			case "busy": return "hsl(var(--warning))";
			case "on_route": return "hsl(var(--primary))";
			case "maintenance": return "hsl(var(--destructive))";
			default: return "hsl(var(--muted-foreground))";
		}
	};

	// Get user location
	useEffect(() => {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setUserLocation({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					});
				},
				(error) => {
					console.error("Geolocation error:", error);
					setUserLocation(LAGOS_CENTER);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000,
				}
			);
		} else {
			setUserLocation(LAGOS_CENTER);
		}
	}, []);

	// Fetch nearby hospitals when user location is available
	useEffect(() => {
		if (!userLocation) return;

		const fetchNearbyHospitals = async () => {
			try {
				const nearby = await supabaseMapService.getNearbyHospitals(userLocation, 100); // 100km radius
				setNearbyHospitals(nearby);
				console.log(`[GodModeMap] Found ${nearby.length} nearby hospitals`);
			} catch (error) {
				console.error('Error fetching nearby hospitals:', error);
			}
		};

		fetchNearbyHospitals();
	}, [userLocation]);



	// Helper to resolve location (PRODUCTION READY - Handles PostGIS geometry)
	// PULLBACK NOTE: Enhanced to support new PostGIS geometry fields from emergency schema
	// OLD: Only handled legacy lat/lng fields
	// NEW: Handles patient_location, pickup_location, responder_location (PostGIS) + legacy lat/lng
	const resolveLocation = useMemo(() => {
		return (item, indexSeed, forceSimulate = false) => {
			if (!item) return null;

			// PULLBACK NOTE: NEW - Handle emergency requests with PostGIS geometry
			if (item.patient_location) {
				const decoded = decodePostGISGeometry(item.patient_location);
				if (decoded && decoded.lat && decoded.lng) {
					return {
						...item,
						lat: decoded.lat,
						lng: decoded.lng,
						isSimulated: false
					};
				}
			}

			// PULLBACK NOTE: NEW - Handle pickup_location for ambulances
			if (item.pickup_location) {
				const decoded = decodePostGISGeometry(item.pickup_location);
				if (decoded && decoded.lat && decoded.lng) {
					return {
						...item,
						lat: decoded.lat,
						lng: decoded.lng,
						isSimulated: false
					};
				}
			}

			// PULLBACK NOTE: NEW - Handle responder_location for ambulances
			if (item.responder_location) {
				const decoded = decodePostGISGeometry(item.responder_location);
				if (decoded && decoded.lat && decoded.lng) {
					return {
						...item,
						lat: decoded.lat,
						lng: decoded.lng,
						isSimulated: false
					};
				}
			}

			// PULLBACK NOTE: UNCHANGED - Handle legacy lat/lng fields (backward compatibility)
			const valLat = parseFloat(item.lat || item.latitude);
			const valLng = parseFloat(item.lng || item.longitude);
			const hasRealLoc = !isNaN(valLat) && !isNaN(valLng) && valLat !== 0;

			if (hasRealLoc) {
				return {
					...item,
					lat: valLat,
					lng: valLng,
					isSimulated: false
				};
			}

			// ❌ REMOVED: Simulation fallback for production
			// Items without real locations will not be displayed
			return null;
		};
	}, []); // Removed userLocation dependency

	// 1. Process & Normalize All Entities with Location Logic
	const processedEmergencies = useMemo(() =>
		emergencyRequests.map((r, i) => resolveLocation(r, i)).filter(Boolean),
		[emergencyRequests, resolveLocation]);

	const processedAmbulances = useMemo(() =>
		ambulances.map((a, i) => resolveLocation(a, i + 1000)).filter(Boolean),
		[ambulances, resolveLocation]);

	const processedHospitals = useMemo(() => {
		// Use nearby hospitals if available, otherwise fall back to all hospitals
		const hospitalSource = nearbyHospitals.length > 0 ? nearbyHospitals : hospitals;
		return hospitalSource.map((h, i) => resolveLocation(h, i + 2000, false)).filter(Boolean);
	}, [hospitals, nearbyHospitals, resolveLocation]);

	// Filter processed requests based on selected filter
	const filteredRequests = useMemo(() => {
		if (filter === "all") return processedEmergencies;
		// return processedEmergencies.filter(req => req.priority === filter);
		return processedEmergencies.filter(req => req.service_type === filter);
	}, [processedEmergencies, filter]);


	// 2. Combine for Rendering Markers
	const allMarkers = useMemo(() => {
		return [...processedEmergencies, ...processedAmbulances, ...processedHospitals];
	}, [processedEmergencies, processedAmbulances, processedHospitals]);

	// 3. Calculate Routes (Polylines) connecting the entities
	useEffect(() => {
		if (loading) return;

		const routes = [];

		processedEmergencies.forEach(emergency => {
			const status = emergency.status || 'pending';
			if (status === 'completed' || status === 'cancelled') return;

			// START Point: Patient
			const patientLoc = [emergency.lat, emergency.lng];

			// LEG 1: Ambulance -> Patient
			if (emergency.responder_id || emergency.ambulance_id) {
				const ambulance = processedAmbulances.find(a =>
					a.id === emergency.ambulance_id || a.driver_id === emergency.responder_id
				);

				if (ambulance) {
					routes.push({
						id: `route-amb-${emergency.id}`,
						positions: [[ambulance.lat, ambulance.lng], patientLoc],
						color: 'hsl(var(--primary))', // Apple primary
						dashed: true
					});
				}
			}

			// LEG 2: Patient -> Hospital
			if (emergency.hospital_id) {
				const hospital = processedHospitals.find(h => h.id === emergency.hospital_id);

				if (hospital) {
					routes.push({
						id: `route-hosp-${emergency.id}`,
						positions: [patientLoc, [hospital.lat, hospital.lng]],
						color: 'hsl(var(--destructive))', // Apple destructive
						dashed: false
					});
				}
			}
		});

		setActiveRoutes(routes);
	}, [processedEmergencies, processedAmbulances, processedHospitals, loading]);

	// Handle Google Maps Auth Failure
	useEffect(() => {
		const handleAuthFailure = () => {
			if (mapProvider === "google" && !isSwitchingMap) {
				console.error("Google Maps Auth Failure detected.");
				setIsSwitchingMap(true);
				toast.error("Google Maps API Error. Switching to backup map...", { duration: 4000 });
				setTimeout(() => {
					setMapProvider("leaflet");
					setIsSwitchingMap(false);
				}, 2000);
			}
		};
		window.addEventListener('google-maps-auth-failure', handleAuthFailure);
		return () => window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
	}, [mapProvider, isSwitchingMap]);

	if (error) {
		handleApiError(error, 'fetch');
	}

	// Register map controls in header
	const headerActions = useMemo(() => (
		<div className="flex items-center gap-3">
			<MapLayerControls
				showLayers={showLayers}
				setShowLayers={toggleLayer}
			/>
			<div className="w-px h-4 bg-border/30" />
			<div className="flex items-center">
				<RefreshControls
					fetchAllData={refresh}
					loading={loading}
				/>
			</div>
		</div>
	), [showLayers, loading, toggleLayer, refresh]);

	usePageHeader("Live Map", headerActions);

	return (
		<div className="min-h-screen py-6 md:py-8 pt-4">
			<div className="flex gap-4 h-[calc(100vh-12rem)] relative">
				{/* Map */}
				<Card className="flex-1 squircle-2xl p-0 overflow-hidden bg-background/35 backdrop-blur-xs border-0 relative shadow-premium">
					{isSwitchingMap && (
						<div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
							<AlertTriangle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
							<h3 className="text-xl font-semibold mb-2">Map Error Detected</h3>
							<p className="text-muted-foreground">Switching to backup provider...</p>
						</div>
					)}

					{mapProvider === "google" ? (
						<MapErrorBoundary
							fallback={<MapFallback />}
							onError={() => {
								if (!isSwitchingMap) {
									setIsSwitchingMap(true);
									toast.error("Map Render Error. Switching to backup map...");
									setTimeout(() => {
										setMapProvider("leaflet");
										setIsSwitchingMap(false);
									}, 2000);
								}
							}}
						>
							<GoogleMapsRenderer
								theme={theme}
								mapStyles={mapStyles}
								userLocation={userLocation}
								allMarkers={allMarkers}
								activeRoutes={activeRoutes}
								showLayers={showLayers}
								filteredRequests={filteredRequests}
								ambulances={processedAmbulances}
								hospitals={processedHospitals}
								simulatedSessionId={simulatedSessionId}
								getPriorityColor={getPriorityColor}
								getStatusColor={getStatusColor}
								setSelectedMarker={setSelectedMarker}
							/>
						</MapErrorBoundary>
					) : (
						<LeafletMapRenderer
							center={LAGOS_CENTER}
							zoom={12}
							emergencies={filteredRequests}
							ambulances={processedAmbulances}
							hospitals={processedHospitals}
							routes={activeRoutes}
							userLocation={userLocation}
							markers={allMarkers}
							showLayers={showLayers}
							onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
							getStatusColor={getStatusColor}
							getPriorityColor={getPriorityColor}
							theme={theme}
						/>
					)}
				</Card>

				{/* Selected Marker Details Panel with Dispatch Actions */}
				<MarkerDetailPanel
					selectedMarker={selectedMarker}
					setSelectedMarker={setSelectedMarker}
					onRefresh={refresh}
				/>

			</div>
		</div>
	);
};

export const GodModeMap = () => {
	return (
		<MapProvider>
			<GodModeMapContent />
		</MapProvider>
	);
};
