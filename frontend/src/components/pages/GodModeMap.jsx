import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePageHeader } from "../../contexts/LayoutContext";
import { supabase } from "../../lib/supabase";
import { getAmbulances } from "../../services/ambulancesService";
import { getHospitals } from "../../services/hospitalsService";
import { getEmergencyRequests } from "../../services/emergencyService";
import { Card } from "../ui/card";
import {
	AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../../contexts/ThemeContext";
import { MAP_STYLES } from "../../constants/mapStyles";
import { MapProvider, useMapContext } from "../../contexts/MapContext";

// Import extracted map components
import {
	MapErrorBoundary,
	MapFallback,
	GoogleMapsRenderer,
	LeafletMapRenderer,
	MarkerDetailPanel,
	MapLayerControls,
	RefreshControls,
} from "../map";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

const GodModeMapContent = () => {
	const { theme } = useTheme();
	const isDark = theme === 'dark';
	const { mapData, updateEmergencyRequests, updateAmbulances, updateHospitals, setSelectedMarker, toggleLayer, setLoading } = useMapContext();
	const [userLocation, setUserLocation] = useState(null);
	const [activeRoutes, setActiveRoutes] = useState([]); // { id, path: [{lat, lng}], color }
	const [mapProvider, setMapProvider] = useState("google"); // 'google' | 'leaflet'
	const [isSwitchingMap, setIsSwitchingMap] = useState(false);

	// Color utilities
	const getPriorityColor = (priority) => {
		switch (priority) {
			case "critical": return "#ef4444";
			case "high": return "#f59e0b";
			case "medium": return "#3b82f6";
			case "low": return "#10b981";
			default: return "#6b7280";
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "available": return "#10b981";
			case "busy": return "#f59e0b";
			case "on_route": return "#3b82f6";
			case "maintenance": return "#ef4444";
			default: return "#6b7280";
		}
	};

	// Fetch Functions (Wrapped in useCallback)
	const fetchEmergencyRequests = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("emergency_requests")
				.select("*")
				.in("status", ["pending", "dispatched", "en_route", "arrived"]);

			if (error) throw error;

			const requestsWithLocations = (data || []).map((request) => ({
				...request,
				lat: (userLocation?.lat || LAGOS_CENTER.lat) + (Math.random() - 0.5) * 0.08,
				lng: (userLocation?.lng || LAGOS_CENTER.lng) + (Math.random() - 0.5) * 0.08,
			}));

			updateEmergencyRequests(requestsWithLocations);
		} catch (error) {
			console.error("Error fetching emergency requests:", error);
		}
	}, [userLocation, updateEmergencyRequests]);

	const fetchAmbulances = useCallback(async () => {
		try {
			// Use service with admin bypass
			const data = await getAmbulances();
			updateAmbulances(data || []);
		} catch (error) {
			console.error("Error fetching ambulances:", error);
			toast.error("Failed to load ambulances");
		}
	}, [updateAmbulances]);

	const fetchHospitals = useCallback(async () => {
		try {
			// Use service with admin bypass
			const data = await getHospitals();
			updateHospitals(data || []);
		} catch (error) {
			console.error("Error fetching hospitals:", error);
			toast.error("Failed to load hospitals");
		}
	}, [updateHospitals]);

	const fetchAllData = useCallback(async () => {
		await Promise.all([
			fetchEmergencyRequests(),
			fetchAmbulances(),
			fetchHospitals(),
		]);
	}, [fetchEmergencyRequests, fetchAmbulances, fetchHospitals]);

	// Register map controls in header - memoized to prevent infinite loops
	const headerActions = useMemo(() => (
		<div className="flex items-center gap-3">
			<MapLayerControls 
				showLayers={mapData.showLayers}
				setShowLayers={toggleLayer}
			/>
			<div className="w-px h-4 bg-border/30" />
			<div className="flex items-center gap-2">
				<RefreshControls 
					fetchAllData={fetchAllData}
					loading={mapData.loading}
				/>
			</div>
		</div>
	), [mapData.showLayers, mapData.loading, toggleLayer, fetchAllData]);

	usePageHeader("Command Center", headerActions);

	// Re-fetch once user location is acquired to center simulation
	const hasHijackedRef = React.useRef(false);
	useEffect(() => {
		if (userLocation && !hasHijackedRef.current) {
			console.log("GodModeMap: Hijacking locations around user coordinates...");
			fetchAllData();
			hasHijackedRef.current = true;
		}
	}, [userLocation, fetchAllData]);

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
					setUserLocation(LAGOS_CENTER); // Fallback to Lagos
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000, // 5 minutes
				}
			);
		} else {
			setUserLocation(LAGOS_CENTER); // Fallback
		}
	}, []);

	// Memoize all markers for map refiner
	const allMarkers = React.useMemo(() => [
		...mapData.emergencyRequests.map(r => ({ ...r, lat: parseFloat(r.lat), lng: parseFloat(r.lng) })),
		...mapData.ambulances.map(a => ({ ...a, lat: parseFloat(a.lat), lng: parseFloat(a.lng) })),
		...mapData.hospitals.map(h => ({ ...h, lat: parseFloat(h.lat), lng: parseFloat(h.lng) }))
	], [mapData.emergencyRequests, mapData.ambulances, mapData.hospitals]);

	// Filter emergency requests based on selected filter
	const filteredRequests = React.useMemo(() => {
		if (mapData.filter === "all") return mapData.emergencyRequests;
		return mapData.emergencyRequests.filter(req => req.priority === mapData.filter);
	}, [mapData.emergencyRequests, mapData.filter]);

	// Google Maps Auth Failure Listener
	useEffect(() => {
		const handleAuthFailure = () => {
			if (mapProvider === "google" && !isSwitchingMap) {
				console.error("Google Maps Auth Failure detected.");
				setIsSwitchingMap(true);
				toast.error(
					"Google Maps API Error. Switching to backup map provider...",
					{
						duration: 4000,
					}
				);
				setTimeout(() => {
					setMapProvider("leaflet");
					setIsSwitchingMap(false);
				}, 2000);
			}
		};

		window.addEventListener('google-maps-auth-failure', handleAuthFailure);
		return () => window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
	}, [mapProvider, isSwitchingMap]);

	const mapStyles = React.useMemo(() =>
		isDark ? MAP_STYLES.dark : MAP_STYLES.light
		, [isDark]);

	return (
		<div className="min-h-screen py-6 md:py-8 pt-4">
			{/* Map Container */}
			<div className="flex gap-4 h-[calc(100vh-12rem)] relative">
				{/* Map */}
				<Card className="flex-1 squircle-2xl p-0 overflow-hidden bg-background/35 backdrop-blur-xs border-0 relative shadow-premium">
					{isSwitchingMap && (
						<div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
							<AlertTriangle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
							<h3 className="text-xl font-bold mb-2">Map Error Detected</h3>
							<p className="text-muted-foreground">
								Switching to backup provider...
							</p>
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
								showLayers={mapData.showLayers}
								filteredRequests={filteredRequests}
								ambulances={mapData.ambulances}
								hospitals={mapData.hospitals}
								simulatedSessionId={`NODE-${Math.abs(Math.floor(userLocation?.lat * 1000)).toString(16).toUpperCase()}-${Math.abs(Math.floor(userLocation?.lng * 1000)).toString(16).toUpperCase()}`}
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
							ambulances={mapData.ambulances}
							hospitals={mapData.hospitals}
							routes={activeRoutes}
							userLocation={userLocation}
							markers={allMarkers}
							showLayers={mapData.showLayers}
							onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
							getStatusColor={getStatusColor}
							getPriorityColor={getPriorityColor}
							theme={theme}
						/>
					)}
				</Card>

				{/* Selected Marker Details Panel */}
				<MarkerDetailPanel 
					selectedMarker={mapData.selectedMarker} 
					setSelectedMarker={setSelectedMarker} 
				/>
			</div>
		</div>
	);
};

export const GodModeMap = () => <GodModeMapContent />;
