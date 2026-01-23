import React, { useState } from 'react';
import {
	MapContainer,
	TileLayer,
	Marker,
	Polyline as LeafletPolylineComponent,
} from 'react-leaflet';
import { LeafletMapRefiner } from '../MapRefiner/LeafletMapRefiner';
import { createMarkerIcon } from '../MarkerIcons/createIcon';

export const LeafletMapRenderer = ({
	center,
	zoom,
	emergencies,
	ambulances,
	hospitals,
	routes, // Array of { positions: [[lat, lng], [lat, lng]], color: string }
	userLocation,
	markers, // For auto-zoom
	showLayers,
	onMarkerClick,
	getStatusColor,
	getPriorityColor,
	theme,
}) => {
	const [hasInitiallyZoomed, setHasInitiallyZoomed] = useState(false);

	return (
		<MapContainer
			key={theme} // Force remount for reliability
			center={center}
			zoom={zoom}
			style={{
				height: "100%",
				width: "100%",
				background: theme === "dark" ? "hsl(var(--background))" : "hsl(var(--background))",
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

			<LeafletMapRefiner
				userLocation={userLocation}
				markers={!hasInitiallyZoomed ? markers : []}
				onZoomComplete={() => setHasInitiallyZoomed(true)}
			/>

			{/* Routes/Polylines */}
			{routes &&
				routes.map((route, idx) => (
					<LeafletPolylineComponent
						key={`route-${idx}`}
						positions={route.positions}
						pathOptions={{
							color: route.color || "hsl(var(--primary))",
							weight: 10,
							opacity: 0.8,
							dashArray: "12, 12", // Dashed line for effect
						}}
					/>
				))}

			{userLocation && (
				<Marker
					position={[userLocation.lat, userLocation.lng]}
					icon={createMarkerIcon("user", null, getPriorityColor, getStatusColor)}
				/>
			)}

			{showLayers.emergencies &&
				emergencies.map((req) => (
					<Marker
						key={`emerg-${req.id}`}
						position={[req.lat, req.lng]}
						icon={createMarkerIcon("emergency", req, getPriorityColor, getStatusColor)}
						eventHandlers={{ click: () => onMarkerClick("emergency", req) }}
					/>
				))}

			{showLayers.ambulances &&
				ambulances.map((amb) => (
					<Marker
						key={`amb-${amb.id}`}
						position={[amb.lat, amb.lng]}
						icon={createMarkerIcon("ambulance", amb, getPriorityColor, getStatusColor)}
						eventHandlers={{ click: () => onMarkerClick("ambulance", amb) }}
					/>
				))}

			{showLayers.hospitals &&
				hospitals.map((hosp) => (
					<Marker
						key={`hosp-${hosp.id}`}
						position={[hosp.lat, hosp.lng]}
						icon={createMarkerIcon("hospital", hosp, getPriorityColor, getStatusColor)}
						eventHandlers={{ click: () => onMarkerClick("hospital", hosp) }}
					/>
				))}
		</MapContainer>
	);
};
