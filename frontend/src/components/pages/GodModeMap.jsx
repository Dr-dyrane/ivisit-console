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
import { getConsoleModuleRailItems } from "../../config/consoleModuleRail";
import { ConsoleModuleRail } from "../common/ConsoleModuleRail";
import { useWayfindingNav } from "../console/WorkspaceStage";
import { updateResponderLocation } from "../../services/emergencyResponseService";
import { driverManagementService } from "../../services/driverManagementService";
import { decodePostGISGeometry } from "../../utils/locationUtils";

// Import extracted map components
import {
	MapErrorBoundary,
	MapFallback,
	GoogleMapsRenderer,
	LeafletMapRenderer,
	MarkerDetailPanel,
	MapLayerControls,
	MapLoadingState,
	MapViewportSummary,
} from "../map";
import {
	DEFAULT_MAP_CENTER,
	MAP_VIEW_RADIUS_KM,
	buildRoutePreview,
	getMapFocus,
	getMapLensSummary,
	resolveMapEntityLocation,
} from "../map/mapViewModel";
import { useOperatorLocation } from "../map/useOperatorLocation";

const ACTIVE_AMBULANCE_STATUSES = new Set(["in_progress", "accepted", "arrived"]);
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

const statusLabel = (value, fallback = '') => {
	const text = String(value || fallback).replace(/[_-]+/g, ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
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
		error,
	} = mapData;

	const [driverAction, setDriverAction] = useState(null);
	const {
		coordinates: userLocation,
		status: locationStatus,
		requestLocation,
	} = useOperatorLocation();
	const roleKind = useMemo(() => {
		if (profile?.role === 'admin') return 'admin';
		if (profile?.role === 'org_admin') return 'org_admin';
		if (profile?.role === 'provider') {
			return ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type)
				? 'driver'
				: 'provider';
		}
		if (profile?.role === 'sponsor') return 'sponsor';
		return 'viewer';
	}, [profile?.provider_type, profile?.role]);
	const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
	const { routingPath, handleRailNavigate } = useWayfindingNav();

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
			case "en_route":
			case "on_route": return "hsl(199 89% 48%)"; // sky-500
			case "maintenance": return "hsl(var(--destructive))";
			default: return "hsl(var(--muted-foreground))";
		}
	};

	// Normalize real coordinates once at the map boundary. Missing points stay missing.
	const processedEmergencies = useMemo(() =>
		emergencyRequests.map(resolveMapEntityLocation).filter(Boolean),
		[emergencyRequests]);

	const processedAmbulances = useMemo(() =>
		ambulances.map(resolveMapEntityLocation).filter(Boolean),
		[ambulances]);

	const processedHospitals = useMemo(() =>
		hospitals.map(resolveMapEntityLocation).filter(Boolean),
		[hospitals]);

	// Filter processed requests based on selected filter
	const filteredRequests = useMemo(() => {
		if (filter === "all") return processedEmergencies;
		// return processedEmergencies.filter(req => req.priority === filter);
		return processedEmergencies.filter(req => req.service_type === filter);
	}, [processedEmergencies, filter]);

	const isDriverMode = profile?.role === "provider"
		&& ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type);
	const activeAmbulanceRequests = useMemo(
		() =>
			processedEmergencies.filter(
				(request) =>
					request?.service_type === "ambulance" &&
					ACTIVE_AMBULANCE_STATUSES.has(String(request?.status || "").toLowerCase())
			),
		[processedEmergencies]
	);

	const assignedAmbulance = useMemo(() => {
		if (!isDriverMode || !user?.id) return null;
		return (
			processedAmbulances.find((ambulance) =>
				[ambulance?.profile_id, ambulance?.driver_id].includes(user.id)
			) || null
		);
	}, [isDriverMode, processedAmbulances, user?.id]);

	const driverActiveEmergency = useMemo(() => {
		if (!isDriverMode || !user?.id) return null;

		const scoped = activeAmbulanceRequests.filter(
			(request) => request?.responder_id === user.id
		);

		if (!scoped.length) return null;
		return [...scoped].sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0))[0];
	}, [activeAmbulanceRequests, isDriverMode, user?.id]);

	const driverLocationRecorded = Boolean(
		decodePostGISGeometry(driverActiveEmergency?.responder_location)
	);

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
		if (!driverActiveEmergency?.id || driverActiveEmergency?.responder_id !== user?.id) {
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
	}, [driverActiveEmergency?.id, driverActiveEmergency?.responder_id, refresh, requestBrowserLocation, user?.id]);

	const handleDriverStatusUpdate = useCallback(async (status) => {
		if (!driverActiveEmergency?.id || driverActiveEmergency?.responder_id !== user?.id) {
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
			const updatedRequest = await driverManagementService.updateTripStatus(driverActiveEmergency.id, status);
			if (!updatedRequest) {
				toast.error(copy.error, { id: toastId });
				return;
			}
			toast.success(copy.success, { id: toastId });
			await refresh();
		} catch (error) {
			toast.error(error?.message || copy.error, { id: toastId });
		} finally {
			setDriverAction(null);
		}
	}, [driverActiveEmergency?.id, driverActiveEmergency?.responder_id, refresh, user?.id]);


	const allMarkers = useMemo(() => {
		return [...processedEmergencies, ...processedAmbulances, ...processedHospitals];
	}, [processedEmergencies, processedAmbulances, processedHospitals]);

	const focus = useMemo(() => getMapFocus({
		userLocation,
		assignedEmergency: driverActiveEmergency,
		selectedMarker,
		emergencies: filteredRequests,
		hospitals: processedHospitals,
		ambulances: processedAmbulances,
	}), [driverActiveEmergency, filteredRequests, processedAmbulances, processedHospitals, selectedMarker, userLocation]);
	const focusLocation = focus.coordinates;
	const mapLens = useMemo(() => getMapLensSummary({
		center: focusLocation,
		radiusKm: MAP_VIEW_RADIUS_KM,
		emergencies: filteredRequests,
		hospitals: processedHospitals,
		ambulances: processedAmbulances,
	}), [filteredRequests, focusLocation, processedAmbulances, processedHospitals]);
	const routeEmergency = selectedMarker?.type === 'emergency'
		? selectedMarker.data
		: driverActiveEmergency;
	const activeRoutes = useMemo(() => buildRoutePreview({
		emergency: routeEmergency,
		ambulances: processedAmbulances,
		hospitals: processedHospitals,
		color: routePrimaryColor,
	}), [processedAmbulances, processedHospitals, routeEmergency, routePrimaryColor]);
	const hasMapPoints = allMarkers.length > 0;

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

	const handleRouteRecenter = useCallback(async () => {
		let center = userLocation;
		if (!center && locationStatus !== 'locating') {
			const toastId = 'map-location-request';
			toast.loading('Requesting location...', { id: toastId });
			center = await requestLocation();
			if (center) toast.success('Location found', { id: toastId });
			else toast.info('Using the operational area', { id: toastId });
		}

		if (!center && locationStatus === 'locating') {
			toast.info('Location is still loading');
		}
		const nextCenter = center || focusLocation;
		window.dispatchEvent(new CustomEvent('recenter-map', { detail: { center: nextCenter } }));
	}, [focusLocation, locationStatus, requestLocation, userLocation]);

	useEffect(() => {
		window.addEventListener('mapRecenterRequested', handleRouteRecenter);
		return () => window.removeEventListener('mapRecenterRequested', handleRouteRecenter);
	}, [handleRouteRecenter]);

	useEffect(() => {
		if (error) handleApiError(error, 'fetch');
	}, [error]);

	const headerActions = useMemo(() => isMobile ? null : (
		<Button
			type="button"
			onClick={handleRouteRecenter}
			aria-busy={locationStatus === 'locating'}
			className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
		>
			<LocateFixed className="mr-2 h-4 w-4" />
			Recenter
		</Button>
	), [handleRouteRecenter, isMobile, locationStatus]);

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
			focusLocation={focusLocation}
			viewRadiusKm={MAP_VIEW_RADIUS_KM}
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
				focusLocation={focusLocation}
				focusSource={focus.source}
				locationStatus={locationStatus}
				mapLens={mapLens}
				viewRadiusKm={MAP_VIEW_RADIUS_KM}
				mapProvider={mapProvider}
				mapStyles={mapStyles}
				allMarkers={allMarkers}
				activeRoutes={activeRoutes}
				processedAmbulances={processedAmbulances}
				processedHospitals={processedHospitals}
				filteredRequests={filteredRequests}
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
			<ConsoleModuleRail
				items={moduleRailItems}
				activePath="/map"
				routingPath={routingPath}
				onNavigate={handleRailNavigate}
			/>
			<div className="absolute inset-0">
				{/* Map */}
				<div className="absolute inset-0 overflow-hidden bg-background">
					{loading && !hasMapPoints && !isSwitchingMap && <MapLoadingState />}
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
								focusLocation={focusLocation}
								viewRadiusKm={MAP_VIEW_RADIUS_KM}
								allMarkers={allMarkers}
								activeRoutes={activeRoutes}
								showLayers={showLayers}
								filteredRequests={filteredRequests}
								ambulances={processedAmbulances}
								hospitals={processedHospitals}
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
							center={focusLocation || DEFAULT_MAP_CENTER}
							zoom={12}
							emergencies={filteredRequests}
							ambulances={processedAmbulances}
							hospitals={processedHospitals}
							routes={activeRoutes}
							userLocation={userLocation}
							focusLocation={focusLocation}
							viewRadiusKm={MAP_VIEW_RADIUS_KM}
							markers={allMarkers}
							showLayers={showLayers}
							onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
							getStatusColor={getStatusColor}
							getPriorityColor={getPriorityColor}
							theme={theme}
						/>
						)}

						{isDriverMode ? (
							<div className="absolute left-6 top-6 z-[120] w-[20rem] rounded-card bg-card/68 p-4 shadow-e3 backdrop-blur-2xl">
								<div className="flex items-center justify-between mb-3">
									<div className="text-[11px] font-medium text-muted-foreground">Current request</div>
									<div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
										<Radio className="h-3.5 w-3.5" />
										Assigned
									</div>
								</div>

								{driverActiveEmergency ? (
									<>
										<div className="space-y-2 mb-3">
											<div className="text-sm font-semibold">
												Request #{driverActiveEmergency?.display_id || driverActiveEmergency?.id?.slice(-6)}
											</div>
											<div className="text-xs text-muted-foreground">
												Status: <span className="font-semibold text-foreground">{statusLabel(driverActiveEmergency?.status, 'Not recorded')}</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Unit: <span className="font-semibold text-foreground">{assignedAmbulance?.call_sign || assignedAmbulance?.vehicle_number || "Unassigned"}</span>
											</div>
											<div className="text-xs text-muted-foreground">
											Location: <span className="font-semibold text-foreground">{driverLocationRecorded ? 'Recorded' : 'Not recorded'}</span>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<Button
												size="sm"
												variant="ghost"
												onClick={handleDriverPingLocation}
												disabled={driverAction !== null}
												className="rounded-button bg-muted/40 hover:bg-muted/60"
												aria-label={driverAction === "ping" ? "Sharing location" : "Share location"}
												aria-busy={driverAction === "ping"}
											>
												{driverAction === "ping" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "ping" ? "Sharing" : "Share"}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleDriverStatusUpdate("accepted")}
												disabled={driverAction !== null || driverActiveEmergency?.status === "accepted"}
												className="rounded-button bg-sky-500/12 text-sky-700 hover:bg-sky-500/18 dark:text-sky-200"
												aria-label={driverAction === "accepted" ? "Saving on way" : "Mark on way"}
												aria-busy={driverAction === "accepted"}
											>
												{driverAction === "accepted" ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
												{driverAction === "accepted" ? "Saving" : "On way"}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleDriverStatusUpdate("arrived")}
												disabled={driverAction !== null || driverActiveEmergency?.status === "arrived"}
												className="rounded-button bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:text-emerald-200"
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
												className="rounded-button bg-foreground text-background hover:bg-foreground/90"
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
							<MapViewportSummary
								lens={mapLens}
								locationStatus={locationStatus}
								focusSource={focus.source}
								routeCount={activeRoutes.length}
							/>
						)}

						{/* 3. Floating map controls */}
						<div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-[100]">
						<motion.button
							whileTap={{ scale: 0.9 }}
							onClick={(e) => {
								e.stopPropagation();
								refresh();
							}}
							className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-button bg-card/68 shadow-e3 backdrop-blur-2xl transition-all hover:bg-card/80"
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
								handleRouteRecenter();
							}}
							aria-busy={locationStatus === 'locating'}
							className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-button bg-card/68 shadow-e3 backdrop-blur-2xl transition-all hover:bg-card/80"
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
