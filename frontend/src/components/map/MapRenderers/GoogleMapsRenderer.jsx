import React from 'react';
import { APIProvider, Map, Marker as GoogleMarker } from '@vis.gl/react-google-maps';
import { GoogleMapsPolyline, GoogleMapsMapRefiner } from '../MapRefiner/GoogleMapsRefiner';
import { GoogleMapsSmartRoute } from '../MapRefiner/GoogleMapsSmartRoute';
import { AlertTriangle, Ambulance, Hospital, MapPin } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

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
	setSelectedMarker,
}) => {
	if (!GOOGLE_MAPS_API_KEY) {
		return <div>Google Maps API key not configured</div>;
	}

	return (
		<APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
			<Map
				key={theme} // Force remount on theme change for style reliability
				defaultCenter={LAGOS_CENTER}
				defaultZoom={12}
				className="w-full h-full"
				gestureHandling="greedy"
				styles={mapStyles}
				options={{
					disableDefaultUI: true,
					backgroundColor: theme === "dark" ? "#121212" : "#f0f0f0",
					tilt: 45,
				}}
			>
				{/* Map Badge Overlay */}
				<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
					<div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						<span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-70">
							Session ID: {simulatedSessionId}
						</span>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							if (userLocation) {
								toast.info("Re-centering and re-calculating smart zoom...");
								window.dispatchEvent(new CustomEvent('recenter-map'));
							}
						}}
						className="bg-background/35 backdrop-blur-xs squircle-full h-8 px-3 text-[10px] font-bold"
					>
						<MapPin className="h-3 w-3 mr-1" />
						RE-CENTER
					</Button>
				</div>

				<GoogleMapsMapRefiner
					userLocation={userLocation}
					markers={allMarkers}
					styles={mapStyles}
				/>

				{/* Routes/Polylines */}
				{/* Routes/Polylines - Traffic Aware */}
				{activeRoutes.map((route) => (
					<GoogleMapsSmartRoute
						key={route.id}
						start={{ lat: route.positions[0][0], lng: route.positions[0][1] }}
						end={{ lat: route.positions[1][0], lng: route.positions[1][1] }}
						options={{
							strokeColor: route.color,
							strokeOpacity: 0.8,
							strokeWeight: 6,
							geodesic: true,
							icons: [
								{
									icon: {
										path: "M 0,-1 0,1",
										strokeOpacity: 1,
										scale: 3,
									},
									offset: "0",
									repeat: "12px",
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
							<GoogleMarker
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
							</GoogleMarker>
						))}

				{/* Ambulance Markers */}
				{showLayers.ambulances &&
					ambulances
						.filter((ambulance) => ambulance.lat && ambulance.lng) // Only render ambulances with valid coordinates
						.map((ambulance) => (
							<GoogleMarker
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
							</GoogleMarker>
						))}

				{/* Hospital Markers */}
				{showLayers.hospitals &&
					hospitals
						.filter((hospital) => hospital.lat && hospital.lng) // Only render hospitals with valid coordinates
						.map((hospital) => (
							<GoogleMarker
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
							</GoogleMarker>
						))}

				{/* User Location Marker */}
				{userLocation && (
					<GoogleMarker
						position={userLocation}
						zIndex={100}
					>
						<div className="relative">
							<div className="absolute inset-0 bg-primary/30 rounded-full animate-ping scale-150" />
							<div className="relative w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
								<div className="w-2 h-2 bg-white rounded-full" />
							</div>
						</div>
					</GoogleMarker>
				)}
			</Map>
		</APIProvider>
	);
};
