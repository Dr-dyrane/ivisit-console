import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePageFooter, usePageHeader, usePageShell } from "../../contexts/LayoutContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { MobileMap } from "../mobile/MobileMap";
import { Button } from "../ui/button";
import {
	AlertTriangle,
	RefreshCw,
	Navigation,
	MapPin,
	Clock,
	CheckCircle2,
	LocateFixed,
	Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { MAP_STYLES } from "../../constants/mapStyles";
import { useMapContext } from "../../contexts/MapContext";
import { supabaseMapService } from "../../services/supabaseMapService";
import { updateResponderLocation } from "../../services/emergencyResponseService";
import { driverManagementService } from "../../services/driverManagementService";
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
	MapLayerControls
} from "../map";

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
const ACTIVE_AMBULANCE_STATUSES = new Set(["in_progress", "accepted", "arrived"]);
const TELEMETRY_STALE_MS = 30000;
const TELEMETRY_LOST_MS = 120000;
const ROUTE_PRIMARY_LIGHT = "#86100E";
const ROUTE_PRIMARY_DARK = "#B83432";
const DRIVER_STATUS_COPY = {
	accepted: {
		loading: "Marking on way...",
		success: "On way saved",
		error: "Could not mark on way",
	},
	arrived: {
		loading: "Marking arrived...",
		success: "Arrived saved",
		error: "Could not mark arrived",
	},
	completed: {
		loading: "Closing request...",
		success: "Request closed",
		error: "Could not close request",
	},
};

const parseTimestampMs = (value) => {
	if (!value) return null;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const deriveTelemetryState = (updatedAt, hasResponderLocation) => {
	if (!updatedAt || !hasResponderLocation) {
		return { state: "inactive", ageMs: null, ageLabel: null };
	}

	const ts = parseTimestampMs(updatedAt);
	if (!ts) {
		return { state: "inactive", ageMs: null, ageLabel: null };
	}

	const ageMs = Math.max(0, Date.now() - ts);
	const ageSec = Math.floor(ageMs / 1000);
	const ageLabel = ageSec < 60
		? `${ageSec}s`
		: `${Math.floor(ageSec / 60)}m ${ageSec % 60}s`;

	if (ageMs > TELEMETRY_LOST_MS) {
		return { state: "lost", ageMs, ageLabel };
	}
	if (ageMs > TELEMETRY_STALE_MS) {
		return { state: "stale", ageMs, ageLabel };
	}
	return { state: "live", ageMs, ageLabel };
};

const GodModeMapContent = () => {
	const { theme } = useTheme();
	const { profile, user } = useAuth();
	const isDark = theme === 'dark';
	const { isMobile } = useBreakpoint();
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
	const [driverAction, setDriverAction] = useState(null);

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
	const routePrimaryColor = useMemo(
		() => (isDark ? ROUTE_PRIMARY_DARK : ROUTE_PRIMARY_LIGHT),
		[isDark]
	);

	// Map Provider State
	const [mapProvider, setMapProvider] = useState("google"); // 'google' | 'leaflet'
	const [isSwitchingMap, setIsSwitchingMap] = useState(false);

	// Marker colors — literal palette so the rendered map surface never shows theme-red
	// for non-danger states (destructive stays for genuine critical/maintenance).
	const getPriorityColor = (priority) => {
		switch (priority) {
			case "critical": return "hsl(var(--destructive))";
			case "high": return "hsl(38 92% 50%)"; // amber-500
			case "medium": return "hsl(199 89% 48%)"; // sky-500
			case "low": return "hsl(160 84% 39%)"; // emerald-500
			default: return "hsl(var(--muted-foreground))";
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "available": return "hsl(160 84% 39%)"; // emerald-500
			case "busy": return "hsl(38 92% 50%)"; // amber-500
			case "on_route": return "hsl(199 89% 48%)"; // sky-500
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
					console.info("[GodModeMap] Geolocation unavailable; using default map center");
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
				const nearby = await supabaseMapService.getNearbyHospitals(userLocation, 100, { quiet: true }); // 100km radius
				setNearbyHospitals(nearby);
				console.log(`[GodModeMap] Found ${nearby.length} nearby hospitals`);
			} catch (error) {
				console.info('[GodModeMap] Nearby hospitals unavailable');
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

			// REMOVED: Simulation fallback for production
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

	const isDriverMode = profile?.role === "provider" && profile?.provider_type === "driver";
	const activeAmbulanceRequests = useMemo(
		() =>
			processedEmergencies.filter(
				(request) =>
					request?.service_type === "ambulance" &&
					ACTIVE_AMBULANCE_STATUSES.has(String(request?.status || "").toLowerCase())
			),
		[processedEmergencies]
	);

	const liveStatusSummary = useMemo(() => {
		return activeAmbulanceRequests.reduce(
			(acc, request) => {
				const hasResponderLocation = !!decodePostGISGeometry(request?.responder_location);
				const telemetry = deriveTelemetryState(request?.updated_at, hasResponderLocation);
				acc.total += 1;
				acc[telemetry.state] += 1;
				return acc;
			},
			{ total: 0, live: 0, stale: 0, lost: 0, inactive: 0 }
		);
	}, [activeAmbulanceRequests]);

	const assignedAmbulance = useMemo(() => {
		if (!isDriverMode || !user?.id) return null;
		return (
			processedAmbulances.find((ambulance) =>
				[ambulance?.profile_id, ambulance?.driver_id].includes(user.id)
			) ||
			processedAmbulances[0] ||
			null
		);
	}, [isDriverMode, processedAmbulances, user?.id]);

	const driverActiveEmergency = useMemo(() => {
		if (!isDriverMode || !user?.id) return null;

		const scoped = activeAmbulanceRequests.filter((request) => {
			const responderMatch = request?.responder_id === user.id;
			const ambulanceMatch = assignedAmbulance?.id && request?.ambulance_id === assignedAmbulance.id;
			return responderMatch || ambulanceMatch;
		});

		if (!scoped.length) return null;
		return [...scoped].sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0))[0];
	}, [activeAmbulanceRequests, assignedAmbulance?.id, isDriverMode, user?.id]);

	const driverLocationStatus = useMemo(() => {
		if (!driverActiveEmergency) {
			return { state: "inactive", ageLabel: null };
		}
		const hasResponderLocation = !!decodePostGISGeometry(driverActiveEmergency?.responder_location);
		return deriveTelemetryState(driverActiveEmergency?.updated_at, hasResponderLocation);
	}, [driverActiveEmergency]);

	const requestBrowserLocation = useCallback(() => {
		return new Promise((resolve, reject) => {
			if (!("geolocation" in navigator)) {
				reject(new Error("Geolocation is not available on this device"));
				return;
			}

			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 10000,
			});
		});
	}, []);

	const handleDriverPingLocation = useCallback(async () => {
		if (!driverActiveEmergency?.id) {
			toast.warning("No active assignment to publish location for");
			return;
		}

		const toastId = "map-driver-location";
		setDriverAction("ping");
		toast.loading("Sharing location...", { id: toastId });
		try {
			const position = await requestBrowserLocation();
			const coords = position?.coords || {};
			await updateResponderLocation(
				driverActiveEmergency.id,
				{
					lat: Number(coords.latitude),
					lng: Number(coords.longitude),
				},
				Number.isFinite(coords.heading) ? coords.heading : null
			);
			toast.success("Location shared", { id: toastId });
			await refresh();
		} catch (error) {
			toast.error(error?.message || "Could not share location", { id: toastId });
		} finally {
			setDriverAction(null);
		}
	}, [driverActiveEmergency?.id, refresh, requestBrowserLocation]);

	const handleDriverStatusUpdate = useCallback(async (status) => {
		if (!driverActiveEmergency?.id) {
			toast.warning("No active assignment to update");
			return;
		}

		setDriverAction(status);
		const copy = DRIVER_STATUS_COPY[status] || {
			loading: "Updating request...",
			success: "Request updated",
			error: "Could not update request",
		};
		const toastId = `map-driver-${status}`;
		toast.loading(copy.loading, { id: toastId });
		try {
			await driverManagementService.updateTripStatus(driverActiveEmergency.id, status);
			toast.success(copy.success, { id: toastId });
			await refresh();
		} catch (error) {
			toast.error(error?.message || copy.error, { id: toastId });
		} finally {
			setDriverAction(null);
		}
	}, [driverActiveEmergency?.id, refresh]);


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
					a.id === emergency.ambulance_id || (a.profile_id || a.driver_id) === emergency.responder_id
				);

				if (ambulance) {
					routes.push({
						id: `route-amb-${emergency.id}`,
						positions: [[ambulance.lat, ambulance.lng], patientLoc],
						color: routePrimaryColor,
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
						color: routePrimaryColor,
						dashed: false
					});
				}
			}
		});

		setActiveRoutes(routes);
	}, [processedEmergencies, processedAmbulances, processedHospitals, loading, routePrimaryColor]);

	// Handle Google Maps Auth Failure
	useEffect(() => {
		const handleAuthFailure = () => {
			if (mapProvider === "google" && !isSwitchingMap) {
				console.info("[GodModeMap] Switching to backup map provider");
				setIsSwitchingMap(true);
				toast.info("Switching to backup map...", { duration: 4000 });
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

	// Header actions - Simplified for desktop (Filters only)
	const headerActions = useMemo(() => (
		<div className="flex items-center gap-3">
			<div className="flex items-center">
				{/* We can keep filters here if needed, but the primary controls move to the map */}
			</div>
		</div>
	), []);

	usePageHeader("Live Map", headerActions);
	usePageFooter(null, "status", false);
	usePageShell({ bleed: true, hideFab: true });

	const fallbackMap = (
		<MapFallback
			filteredRequests={filteredRequests}
			ambulances={processedAmbulances}
			hospitals={processedHospitals}
			activeRoutes={activeRoutes}
			showLayers={showLayers}
			userLocation={userLocation}
			selectedMarker={selectedMarker}
			setSelectedMarker={setSelectedMarker}
		/>
	);

	if (isMobile) {
		return (
			<MobileMap
				mapData={mapData}
				toggleLayer={toggleLayer}
				setFilter={setFilter}
				setSelectedMarker={setSelectedMarker}
				refresh={refresh}
				userLocation={userLocation}
				mapProvider={mapProvider}
				mapStyles={mapStyles}
				allMarkers={allMarkers}
				activeRoutes={activeRoutes}
				processedAmbulances={processedAmbulances}
				processedHospitals={processedHospitals}
				filteredRequests={filteredRequests}
				simulatedSessionId={simulatedSessionId}
				getPriorityColor={getPriorityColor}
				getStatusColor={getStatusColor}
				routePrimaryColor={routePrimaryColor}
				theme={theme}
				isSwitchingMap={isSwitchingMap}
				setMapProvider={setMapProvider}
				setIsSwitchingMap={setIsSwitchingMap}
				fallbackMap={fallbackMap}
			/>
		);
	}

	return (
		<div className="relative h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden bg-background">
			<div className="absolute inset-0">
				{/* Map */}
				<div className="absolute inset-0 overflow-hidden bg-background">
					{isSwitchingMap && (
						<div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
							<AlertTriangle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
							<h3 className="text-xl font-semibold mb-2">Map Error Detected</h3>
							<p className="text-muted-foreground">Switching to backup provider...</p>
						</div>
					)}

					{mapProvider === "google" ? (
						<MapErrorBoundary
							fallback={fallbackMap}
							onError={() => {
								if (!isSwitchingMap) {
									setIsSwitchingMap(true);
									toast.info("Switching to backup map...");
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
								routePrimaryColor={routePrimaryColor}
								setSelectedMarker={setSelectedMarker}
								selectedMarker={selectedMarker}
								fallback={fallbackMap}
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

						{isDriverMode ? (
							<div className="absolute top-6 left-6 z-[120] w-[20rem] rounded-card bg-card/68 backdrop-blur-2xl p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
								<div className="flex items-center justify-between mb-3">
									<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current request</div>
									<div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
										<Radio className="h-3.5 w-3.5" />
										Live
									</div>
								</div>

								{driverActiveEmergency ? (
									<>
										<div className="space-y-2 mb-3">
											<div className="text-sm font-semibold">
												Request #{driverActiveEmergency?.display_id || driverActiveEmergency?.id?.slice(-6)}
											</div>
											<div className="text-xs text-muted-foreground">
												Status: <span className="font-semibold text-foreground">{String(driverActiveEmergency?.status || "").toUpperCase()}</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Unit: <span className="font-semibold text-foreground">{assignedAmbulance?.call_sign || assignedAmbulance?.vehicle_number || "Unassigned"}</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Location:{" "}
												<span
													className={`font-semibold ${
														driverLocationStatus.state === "lost"
															? "text-destructive"
															: driverLocationStatus.state === "stale"
																? "text-amber-600 dark:text-amber-300"
																: "text-emerald-600 dark:text-emerald-300"
													}`}
												>
													{driverLocationStatus.state.toUpperCase()}
												</span>
												{driverLocationStatus.ageLabel ? ` - ${driverLocationStatus.ageLabel} ago` : ""}
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={handleDriverPingLocation}
												disabled={driverAction !== null}
												className="rounded-button"
												aria-label={driverAction === "ping" ? "Sharing location" : "Share location"}
												aria-busy={driverAction === "ping"}
											>
												{driverAction === "ping" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "ping" ? "Sharing" : "Share"}
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleDriverStatusUpdate("accepted")}
												disabled={driverAction !== null || driverActiveEmergency?.status === "accepted"}
												className="rounded-button"
												aria-label={driverAction === "accepted" ? "Saving on way" : "Mark on way"}
												aria-busy={driverAction === "accepted"}
											>
												{driverAction === "accepted" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "accepted" ? "Saving" : "On way"}
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleDriverStatusUpdate("arrived")}
												disabled={driverAction !== null || driverActiveEmergency?.status === "arrived"}
												className="rounded-button"
												aria-label={driverAction === "arrived" ? "Saving arrived" : "Mark arrived"}
												aria-busy={driverAction === "arrived"}
											>
												{driverAction === "arrived" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "arrived" ? "Saving" : "Arrived"}
											</Button>
											<Button
												size="sm"
												onClick={() => handleDriverStatusUpdate("completed")}
												disabled={driverAction !== null || !["arrived", "accepted", "in_progress"].includes(String(driverActiveEmergency?.status || "").toLowerCase())}
												className="rounded-button"
												aria-label={driverAction === "completed" ? "Closing request" : "Close request"}
												aria-busy={driverAction === "completed"}
											>
												{driverAction === "completed" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "completed" ? "Closing" : "Done"}
											</Button>
										</div>
									</>
								) : (
									<div className="text-xs text-muted-foreground">
										No active assignment yet. Keep this map open for updates.
									</div>
								)}
							</div>
						) : (
							<div className="absolute top-6 left-6 z-[120] w-[18rem] rounded-card bg-card/68 backdrop-blur-2xl p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
								<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Live status</div>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="rounded-inner bg-muted/40 p-2">
										<div className="text-muted-foreground">Active routes</div>
										<div className="text-sm font-semibold">{liveStatusSummary.total}</div>
									</div>
									<div className="rounded-inner bg-muted/40 p-2">
										<div className="text-emerald-600 dark:text-emerald-300">Current</div>
										<div className="text-sm font-semibold">{liveStatusSummary.live}</div>
									</div>
									<div className="rounded-inner bg-muted/40 p-2">
										<div className="text-amber-600 dark:text-amber-300">Delayed</div>
										<div className="text-sm font-semibold">{liveStatusSummary.stale}</div>
									</div>
									<div className="rounded-inner bg-muted/40 p-2">
										<div className="text-destructive">Offline</div>
										<div className="text-sm font-semibold">{liveStatusSummary.lost}</div>
									</div>
								</div>
							</div>
						)}

						{/* 3. Floating map controls */}
						<div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-[100]">
						<motion.button
							whileTap={{ scale: 0.9 }}
							onClick={(e) => {
								e.stopPropagation();
								refresh();
							}}
							className="w-12 h-12 rounded-button bg-card/68 backdrop-blur-2xl flex items-center justify-center shadow-[0_18px_48px_rgb(0_0_0/0.18)] hover:bg-card/80 transition-all pointer-events-auto"
							title="Refresh map"
							aria-label="Refresh map"
							aria-busy={loading}
						>
							<RefreshCw size={20} className={`${loading ? 'animate-spin' : ''} text-foreground/70`} />
						</motion.button>

							{!isDriverMode && (
								<MapLayerControls
									showLayers={showLayers}
									setShowLayers={toggleLayer}
								/>
							)}

						<motion.button
							whileTap={{ scale: 0.9 }}
							onClick={(e) => {
								e.stopPropagation();
								if (userLocation) {
									toast.info("Re-centering map...");
									window.dispatchEvent(new CustomEvent('recenter-map'));
								} else {
									toast.info("Location not ready");
								}
							}}
							className="w-12 h-12 rounded-button bg-card/68 backdrop-blur-2xl flex items-center justify-center shadow-[0_18px_48px_rgb(0_0_0/0.18)] hover:bg-card/80 transition-all pointer-events-auto"
							title="Center map"
							aria-label="Center map"
						>
							<Navigation size={20} className="text-foreground/60" />
						</motion.button>
					</div>
				</div>

				{/* Selected marker details panel */}
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
	return <GodModeMapContent />;
};
