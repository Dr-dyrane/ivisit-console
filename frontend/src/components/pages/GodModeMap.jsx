import React, { useState, useEffect, Component } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { supabase } from "../../lib/supabase";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
	Ambulance,
	Hospital,
	Activity,
	AlertTriangle,
	MapPin,
	Phone,
	Clock,
	RefreshCw,
	Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMap,
	Polyline as LeafletPolylineComponent,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../../contexts/ThemeContext";
import { MAP_STYLES } from "../../constants/mapStyles";

// Fix for Leaflet default icon issues in React
// Note: We'll use custom icons mostly, but this fixes the default fallback
delete L.Icon.Default.prototype._getIconUrl;
try {
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
		iconUrl: require("leaflet/dist/images/marker-icon.png"),
		shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
	});
} catch (e) {
	console.warn("Leaflet icons couldn't be loaded via require", e);
}

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

// Error Boundary for Google Maps
class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		if (this.props.onError) {
			this.props.onError(error);
		}
		console.error("Map Error Boundary caught error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}
		return this.props.children;
	}
}

// Map Fallback Component
const MapFallback = () => (
	<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
		{/* Simulated map grid */}
		<div className="absolute inset-0 opacity-20">
			{[...Array(10)].map((_, i) => (
				<div
					key={`h-${i}`}
					className="absolute w-full h-px bg-border"
					style={{ top: `${i * 10}%` }}
				/>
			))}
			{[...Array(10)].map((_, i) => (
				<div
					key={`v-${i}`}
					className="absolute h-full w-px bg-border"
					style={{ left: `${i * 10}%` }}
				/>
			))}
		</div>

		{/* Simulated markers */}
		<div className="absolute" style={{ top: "30%", left: "40%" }}>
			<div className="w-8 h-8 rounded-full bg-destructive/80 flex items-center justify-center animate-pulse">
				<AlertTriangle className="h-4 w-4 text-white" />
			</div>
		</div>
		<div className="absolute" style={{ top: "50%", left: "60%" }}>
			<div className="w-8 h-8 rounded-full bg-success/80 flex items-center justify-center">
				<Ambulance className="h-4 w-4 text-white" />
			</div>
		</div>
		<div className="absolute" style={{ top: "40%", left: "55%" }}>
			<div className="w-9 h-9 squircle bg-info/80 flex items-center justify-center">
				<Hospital className="h-5 w-5 text-white" />
			</div>
		</div>

		<div className="text-center z-10 glass squircle-lg p-8">
			<MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
			<p className="font-black text-lg mb-2">Map Preview Mode</p>
			<p className="text-sm text-muted-foreground max-w-xs">
				Google Maps API requires domain authorization. Using simulated view for
				preview.
			</p>
		</div>
	</div>
);

// Google Maps Polyline Component
const GoogleMapsPolyline = ({ path, options }) => {
	const map = useGoogleMap();
	const [polyline, setPolyline] = useState(null);

	useEffect(() => {
		if (!map) return;

		const line = new window.google.maps.Polyline({
			path,
			...options,
		});

		line.setMap(map);
		setPolyline(line);

		return () => {
			line.setMap(null);
		};
	}, [map]); // Re-create if map changes, update path via effect below

	useEffect(() => {
		if (polyline) {
			polyline.setOptions({ path, ...options });
		}
	}, [polyline, path, options]);

	return null;
};

// Hook to access Google Map instance
import { useMap as useGoogleMap } from "@vis.gl/react-google-maps";

const LeafletMap = ({
	center,
	zoom,
	emergencies,
	ambulances,
	hospitals,
	routes, // Array of { positions: [[lat, lng], [lat, lng]], color: string }
	showLayers,
	onMarkerClick,
	getStatusColor,
	getPriorityColor,
	theme,
}) => {
	const createIcon = (type, data) => {
		let html = "";

		if (type === "emergency") {
			const color = getPriorityColor(data.priority);
			// Using Lucide icons SVGs inline for the fallback map
			html = `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${color};
            border: 4px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px ${color}80;
            position: relative;
            backdrop-filter: blur(4px);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            ${
							data.priority === "critical"
								? '<span style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; border: 2px solid white;"></span>'
								: ""
						}
        </div>`;
		} else if (type === "ambulance") {
			const color = getStatusColor(data.status);
			html = `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${color};
            border: 4px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px ${color}80;
            backdrop-filter: blur(4px);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
        </div>`;
		} else if (type === "hospital") {
			html = `
        <div class="squircle" style="
            width: 44px;
            height: 44px;
            background-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        ">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M14 22v-4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"></path><path d="M22 22h-6"></path><path d="M10 22H4"></path><path d="M14 2h4a2 2 0 0 1 2 2v2"></path><path d="M4 22V6a2 2 0 0 1 2-2h4"></path><path d="M8 2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>`;
		}

		return L.divIcon({
			html: html,
			className: "bg-transparent", // Remove default styles
			iconSize: [44, 44],
			iconAnchor: [22, 22],
		});
	};

	return (
		<MapContainer
			center={center}
			zoom={zoom}
			style={{
				height: "100%",
				width: "100%",
				background: theme === "dark" ? "#212121" : "#f5f5f5",
			}}
		>
			<TileLayer
				url={
					theme === "dark"
						? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
						: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
				}
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
			/>

			{/* Routes/Polylines */}
			{routes &&
				routes.map((route, idx) => (
					<LeafletPolylineComponent
						key={`route-${idx}`}
						positions={route.positions}
						pathOptions={{
							color: route.color || "#3b82f6",
							weight: 4,
							opacity: 0.7,
							dashArray: "10, 10", // Dashed line for effect
						}}
					/>
				))}

			{showLayers.emergencies &&
				emergencies.map((req) => (
					<Marker
						key={`emerg-${req.id}`}
						position={[req.lat, req.lng]}
						icon={createIcon("emergency", req)}
						eventHandlers={{ click: () => onMarkerClick("emergency", req) }}
					/>
				))}

			{showLayers.ambulances &&
				ambulances.map((amb) => (
					<Marker
						key={`amb-${amb.id}`}
						position={[amb.lat, amb.lng]}
						icon={createIcon("ambulance", amb)}
						eventHandlers={{ click: () => onMarkerClick("ambulance", amb) }}
					/>
				))}

			{showLayers.hospitals &&
				hospitals.map((hosp) => (
					<Marker
						key={`hosp-${hosp.id}`}
						position={[hosp.lat, hosp.lng]}
						icon={createIcon("hospital", hosp)}
						eventHandlers={{ click: () => onMarkerClick("hospital", hosp) }}
					/>
				))}
		</MapContainer>
	);
};

export const GodModeMap = () => {
	const { theme } = useTheme();
	const [emergencyRequests, setEmergencyRequests] = useState([]);
	const [ambulances, setAmbulances] = useState([]);
	const [hospitals, setHospitals] = useState([]);
	const [activeRoutes, setActiveRoutes] = useState([]); // { id, path: [{lat, lng}], color }
	const [selectedMarker, setSelectedMarker] = useState(null);
	const [filter, setFilter] = useState("all");
	const [showLayers, setShowLayers] = useState({
		emergencies: true,
		ambulances: true,
		hospitals: true,
	});
	const [loading, setLoading] = useState(true);

	// Map Provider State
	const [mapProvider, setMapProvider] = useState("google"); // 'google' | 'leaflet'
	const [isSwitchingMap, setIsSwitchingMap] = useState(false);

	useEffect(() => {
		// Google Maps Auth Failure Listener
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

				// Wait 2 seconds then switch
				setTimeout(() => {
					setMapProvider("leaflet");
					setIsSwitchingMap(false);
					toast.success("Switched to OpenStreetMap");
				}, 2000);
			}
		};

		window.gm_authFailure = handleAuthFailure;

		fetchAllData();

		// Set up real-time subscriptions
		const emergencyChannel = supabase
			.channel("emergency_changes")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "emergency_requests" },
				fetchEmergencyRequests
			)
			.subscribe();

		const ambulanceChannel = supabase
			.channel("ambulance_changes")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "ambulances" },
				fetchAmbulances
			)
			.subscribe();

		return () => {
			window.gm_authFailure = null;
			supabase.removeChannel(emergencyChannel);
			supabase.removeChannel(ambulanceChannel);
		};
	}, [mapProvider, isSwitchingMap]);

	useEffect(() => {
		// Calculate routes whenever emergencies or ambulances update
		const routes = [];

		// 1. Link dispatched/en_route emergencies to assigned ambulances
		// Note: Since we don't have a real 'assigned_ambulance_id' in the mock data yet,
		// we will simulate this by linking 'en_route' emergencies to the nearest 'busy' ambulance.
		// In a real scenario, this would match IDs: req.ambulance_id === amb.id

		const activeEmergencies = emergencyRequests.filter((r) =>
			["dispatched", "en_route"].includes(r.status)
		);
		const busyAmbulances = ambulances.filter((a) => a.status === "busy");

		// Mock matching logic (replace with real ID matching later)
		activeEmergencies.forEach((req, index) => {
			// Find a "paired" ambulance (simplified for demo)
			const assignedAmbulance = busyAmbulances[index % busyAmbulances.length];

			if (assignedAmbulance) {
				routes.push({
					id: `route-${req.id}-${assignedAmbulance.id}`,
					path: [
						{ lat: assignedAmbulance.lat, lng: assignedAmbulance.lng },
						{ lat: req.lat, lng: req.lng },
					],
					positions: [
						// For Leaflet (requires [lat, lng] array)
						[assignedAmbulance.lat, assignedAmbulance.lng],
						[req.lat, req.lng],
					],
					color: getStatusColor(req.status), // Match the status color
					type: "dispatch",
				});
			}
		});

		setActiveRoutes(routes);
	}, [emergencyRequests, ambulances]);

	const fetchAllData = async () => {
		setLoading(true);
		await Promise.all([
			fetchEmergencyRequests(),
			fetchAmbulances(),
			fetchHospitals(),
		]);
		setLoading(false);
	};

	const fetchEmergencyRequests = async () => {
		try {
			const { data, error } = await supabase
				.from("emergency_requests")
				.select("*")
				.in("status", ["pending", "dispatched", "en_route", "arrived"]);

			if (error) throw error;

			const requestsWithLocations = (data || []).map((request) => ({
				...request,
				lat: request.latitude || LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.1,
				lng:
					request.longitude || LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.1,
			}));

			setEmergencyRequests(requestsWithLocations);
		} catch (error) {
			console.error("Error fetching emergency requests:", error);
		}
	};

	const fetchAmbulances = async () => {
		try {
			const { data, error } = await supabase.from("ambulances").select("*");

			if (error) throw error;

			const ambulancesWithLocations = (data || []).map((ambulance) => ({
				...ambulance,
				lat: LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.15,
				lng: LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.15,
			}));

			setAmbulances(ambulancesWithLocations);
		} catch (error) {
			console.error("Error fetching ambulances:", error);
		}
	};

	const fetchHospitals = async () => {
		try {
			const { data, error } = await supabase.from("hospitals").select("*");

			if (error) throw error;

			const hospitalsWithLocations = (data || []).map((hospital) => ({
				...hospital,
				lat:
					hospital.latitude || LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.12,
				lng:
					hospital.longitude || LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.12,
			}));

			setHospitals(hospitalsWithLocations);
		} catch (error) {
			console.error("Error fetching hospitals:", error);
		}
	};

	const filteredRequests =
		filter === "all"
			? emergencyRequests
			: emergencyRequests.filter((r) => r.status === filter);

	const getStatusColor = (status) => {
		const colors = {
			pending: "#f59e0b",
			dispatched: "#3b82f6",
			en_route: "#8b5cf6",
			arrived: "#10b981",
			available: "#10b981",
			busy: "#ef4444",
			off_duty: "#6b7280",
		};
		return colors[status] || "#f59e0b";
	};

	const getPriorityColor = (priority) => {
		const colors = {
			critical: "#ef4444",
			high: "#f59e0b",
			medium: "#3b82f6",
			low: "#10b981",
		};
		return colors[priority] || "#3b82f6";
	};

	const toggleLayer = (layer) => {
		setShowLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
	};

	return (
		<div className="min-h-screen bg-background p-6 md:p-8">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6"
			>
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div>
						<h1 className="editorial-title text-3xl mb-1">God Mode Map</h1>
						<p className="text-muted-foreground font-semibold">
							Real-time emergency response tracking
						</p>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{/* Layer Toggles */}
						<div className="flex items-center gap-1 glass squircle px-2 py-1">
							<Button
								variant={showLayers.emergencies ? "default" : "ghost"}
								size="sm"
								onClick={() => toggleLayer("emergencies")}
								className="squircle h-8 px-3"
							>
								<AlertTriangle className="h-4 w-4" />
							</Button>
							<Button
								variant={showLayers.ambulances ? "default" : "ghost"}
								size="sm"
								onClick={() => toggleLayer("ambulances")}
								className="squircle h-8 px-3"
							>
								<Ambulance className="h-4 w-4" />
							</Button>
							<Button
								variant={showLayers.hospitals ? "default" : "ghost"}
								size="sm"
								onClick={() => toggleLayer("hospitals")}
								className="squircle h-8 px-3"
							>
								<Hospital className="h-4 w-4" />
							</Button>
						</div>

						{/* Filter */}
						<div className="flex items-center gap-1 glass squircle px-2 py-1">
							{["all", "pending", "dispatched", "en_route"].map((f) => (
								<Button
									key={f}
									variant={filter === f ? "default" : "ghost"}
									size="sm"
									onClick={() => setFilter(f)}
									className="squircle h-8 px-3 capitalize"
								>
									{f.replace("_", " ")}
								</Button>
							))}
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={fetchAllData}
							className="squircle"
							disabled={loading}
						>
							<RefreshCw
								className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>
				</div>
			</motion.div>

			{/* Map Container */}
			<div className="flex gap-4 h-[calc(100vh-12rem)] relative">
				{/* Map */}
				<Card className="flex-1 squircle-2xl p-0 overflow-hidden glass border-0 relative shadow-premium">
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
						GOOGLE_MAPS_API_KEY ? (
							<ErrorBoundary
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
								<APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
									<Map
										defaultCenter={LAGOS_CENTER}
										defaultZoom={12}
										mapId="ivisit-god-mode"
										className="w-full h-full"
										disableDefaultUI={false}
										gestureHandling="greedy"
									>
										{/* Routes/Polylines */}
										{activeRoutes.map((route) => (
											<GoogleMapsPolyline
												key={route.id}
												path={route.path}
												options={{
													strokeColor: route.color,
													strokeOpacity: 0.8,
													strokeWeight: 4,
													geodesic: true,
													icons: [
														{
															icon: {
																path: "M 0,-1 0,1",
																strokeOpacity: 1,
																scale: 2,
															},
															offset: "0",
															repeat: "10px",
														},
													],
												}}
											/>
										))}

										{/* Emergency Request Markers */}
										{showLayers.emergencies &&
											filteredRequests
												.filter((request) => request.lat && request.lng) // Only render requests with valid coordinates
												.map((request) => (
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
											))}

										{/* Ambulance Markers */}
										{showLayers.ambulances &&
											ambulances
												.filter((ambulance) => ambulance.lat && ambulance.lng) // Only render ambulances with valid coordinates
												.map((ambulance) => (
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
													<div
														className="cursor-pointer transform hover:scale-110 transition-transform"
														style={{
															width: "36px",
															height: "36px",
															borderRadius: "50%",
															backgroundColor: getStatusColor(ambulance.status),
															boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													>
														<Ambulance
															style={{
																width: "18px",
																height: "18px",
																color: "white",
															}}
														/>
													</div>
												</AdvancedMarker>
											))}

										{/* Hospital Markers */}
										{showLayers.hospitals &&
											hospitals
												.filter((hospital) => hospital.lat && hospital.lng) // Only render hospitals with valid coordinates
												.map((hospital) => (
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
													<div
														className="cursor-pointer transform hover:scale-110 transition-transform"
														style={{
															width: "40px",
															height: "40px",
															borderRadius: "12px",
															backgroundColor: "#3b82f6",
															boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													>
														<Hospital
															style={{
																width: "20px",
																height: "20px",
																color: "white",
															}}
														/>
													</div>
												</AdvancedMarker>
											))}
									</Map>
								</APIProvider>
							</ErrorBoundary>
						) : (
							<MapFallback />
						)
					) : (
						<LeafletMap
							center={LAGOS_CENTER}
							zoom={12}
							emergencies={filteredRequests}
							ambulances={ambulances}
							hospitals={hospitals}
							routes={activeRoutes}
							showLayers={showLayers}
							onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
							getStatusColor={getStatusColor}
							getPriorityColor={getPriorityColor}
							theme={theme}
						/>
					)}
				</Card>
				{/* Floating Sidebar (Glass Island) */}
				<div className="absolute top-4 left-4 z-[400] w-80 space-y-4 hidden lg:block">
					{/* Live Stats */}
					<Card className="squircle-xl p-5 glass-strong border-0 shadow-premium backdrop-blur-xl bg-background/60">
						<h3 className="font-black text-lg mb-4 flex items-center gap-2">
							<Activity className="h-5 w-5 text-primary" />
							Live Statistics
						</h3>
						<div className="space-y-3">
							<div className="flex items-center justify-between p-3 squircle bg-destructive/10 hover:bg-destructive/20 transition-colors cursor-pointer group">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
									<span className="text-sm font-bold">Active Emergencies</span>
								</div>
								<Badge className="squircle bg-destructive text-destructive-foreground font-black group-hover:scale-110 transition-transform">
									{emergencyRequests.length}
								</Badge>
							</div>
							<div className="flex items-center justify-between p-3 squircle bg-success/10 hover:bg-success/20 transition-colors cursor-pointer group">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-success" />
									<span className="text-sm font-bold">Available Units</span>
								</div>
								<Badge className="squircle bg-success text-success-foreground font-black group-hover:scale-110 transition-transform">
									{ambulances.filter((a) => a.status === "available").length}
								</Badge>
							</div>
							<div className="flex items-center justify-between p-3 squircle bg-info/10 hover:bg-info/20 transition-colors cursor-pointer group">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-info" />
									<span className="text-sm font-bold">Hospitals</span>
								</div>
								<Badge className="squircle bg-info text-info-foreground font-black group-hover:scale-110 transition-transform">
									{hospitals.length}
								</Badge>
							</div>
						</div>
					</Card>

					{/* Recent Emergencies (Collapsible or Scrollable) */}
					<Card className="squircle-xl p-5 glass-strong border-0 shadow-premium backdrop-blur-xl bg-background/60">
						<h3 className="font-black text-lg mb-4 flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-warning" />
							Recent Alerts
						</h3>
						<div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
							{emergencyRequests.slice(0, 5).map((req) => (
								<div
									key={req.id}
									className="p-3 squircle bg-muted/40 hover:bg-primary/10 cursor-pointer transition-all hover:translate-x-1 group"
									onClick={() =>
										setSelectedMarker({ type: "emergency", data: req })
									}
								>
									<div className="flex items-center justify-between mb-1">
										<span className="font-bold text-xs text-muted-foreground">
											#{req.id?.slice(-6)}
										</span>
										<Badge
											className={`squircle-sm text-[10px] px-1.5 py-0 ${
												req.priority === "critical"
													? "bg-destructive/20 text-destructive"
													: req.priority === "high"
													? "bg-warning/20 text-warning"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{req.priority || "medium"}
										</Badge>
									</div>
									<p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
										{req.emergency_type || "Emergency Request"}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{req.location || "Unknown Location"}
									</p>
								</div>
							))}
							{emergencyRequests.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No active emergencies
								</p>
							)}
						</div>
					</Card>
				</div>

				{/* Selected Marker Details (Floating Right Panel) */}
				<AnimatePresence>
					{selectedMarker && (
						<motion.div
							initial={{ opacity: 0, x: 20, scale: 0.95 }}
							animate={{ opacity: 1, x: 0, scale: 1 }}
							exit={{ opacity: 0, x: 20, scale: 0.95 }}
							className="absolute top-4 right-4 z-[400] w-80"
						>
							<Card className="squircle-xl p-0 overflow-hidden glass-strong border-0 shadow-premium backdrop-blur-xl bg-background/60">
								{/* Header Image/Color */}
								<div
									className={`h-24 relative ${
										selectedMarker.type === "emergency"
											? "bg-destructive/20"
											: selectedMarker.type === "ambulance"
											? "bg-success/20"
											: "bg-info/20"
									}`}
								>
									<div className="absolute inset-0 flex items-center justify-center">
										{selectedMarker.type === "emergency" && (
											<AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
										)}
										{selectedMarker.type === "ambulance" && (
											<Ambulance className="h-10 w-10 text-success opacity-50" />
										)}
										{selectedMarker.type === "hospital" && (
											<Hospital className="h-10 w-10 text-info opacity-50" />
										)}
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setSelectedMarker(null)}
										className="absolute top-2 right-2 rounded-full hover:bg-black/10 h-8 w-8 p-0"
									>
										×
									</Button>
								</div>

								<div className="p-5 -mt-6 relative z-10">
									<div className="squircle-lg bg-background shadow-lg p-4 mb-4 flex items-center justify-between">
										<div>
											<p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
												{selectedMarker.type}
											</p>
											<h3 className="font-black text-xl truncate w-48">
												{selectedMarker.data.name ||
													selectedMarker.data.call_sign ||
													`#${selectedMarker.data.id?.slice(-6)}`}
											</h3>
										</div>
									</div>

									{selectedMarker.type === "emergency" && (
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<Badge
													className={`squircle font-bold ${
														selectedMarker.data.priority === "critical"
															? "bg-destructive text-destructive-foreground"
															: selectedMarker.data.priority === "high"
															? "bg-warning text-warning-foreground"
															: "bg-info text-info-foreground"
													}`}
												>
													{selectedMarker.data.priority || "medium"}
												</Badge>
												<Badge
													className="squircle bg-muted"
													variant="secondary"
												>
													{selectedMarker.data.status}
												</Badge>
											</div>

											<div className="p-3 squircle bg-muted/30">
												<div className="flex items-start gap-2 text-sm">
													<MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
													<span className="font-medium">
														{selectedMarker.data.location || "Location shared"}
													</span>
												</div>
											</div>

											<Button
												className="w-full squircle bg-primary shadow-glow font-bold"
												size="lg"
											>
												Dispatch Unit
											</Button>
										</div>
									)}

									{selectedMarker.type === "ambulance" && (
										<div className="space-y-4">
											<div className="grid grid-cols-2 gap-3">
												<div className="p-3 squircle bg-muted/30 text-center">
													<p className="text-xs text-muted-foreground font-bold">
														STATUS
													</p>
													<p
														className={`font-black ${
															selectedMarker.data.status === "available"
																? "text-success"
																: "text-warning"
														}`}
													>
														{selectedMarker.data.status?.toUpperCase()}
													</p>
												</div>
												<div className="p-3 squircle bg-muted/30 text-center">
													<p className="text-xs text-muted-foreground font-bold">
														TYPE
													</p>
													<p className="font-black">
														{selectedMarker.data.type || "BLS"}
													</p>
												</div>
											</div>
											<div className="p-3 squircle bg-muted/30 flex justify-between items-center">
												<span className="text-sm font-semibold text-muted-foreground">
													Vehicle No.
												</span>
												<span className="font-bold font-mono">
													{selectedMarker.data.vehicle_number}
												</span>
											</div>
										</div>
									)}

									{selectedMarker.type === "hospital" && (
										<div className="space-y-4">
											<p className="text-sm text-muted-foreground leading-snug">
												{selectedMarker.data.address}
											</p>
											<div className="grid grid-cols-2 gap-3">
												<div className="p-3 squircle bg-muted/30">
													<p className="text-xs text-muted-foreground font-bold mb-1">
														BEDS
													</p>
													<p className="font-black text-2xl text-primary">
														{selectedMarker.data.available_beds || 0}
													</p>
												</div>
												<div className="p-3 squircle bg-muted/30">
													<p className="text-xs text-muted-foreground font-bold mb-1">
														FLEET
													</p>
													<p className="font-black text-2xl">
														{selectedMarker.data.ambulances_count || 0}
													</p>
												</div>
											</div>
											{selectedMarker.data.phone && (
												<Button
													variant="outline"
													className="w-full squircle font-bold"
													size="sm"
												>
													<Phone className="h-4 w-4 mr-2" />
													Call Facility
												</Button>
											)}
										</div>
									)}
								</div>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};
