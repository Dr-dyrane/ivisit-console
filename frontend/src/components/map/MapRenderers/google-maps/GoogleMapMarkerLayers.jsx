import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { AlertTriangle } from 'lucide-react';
import { GoogleMapsOverlayMarker } from './GoogleMapsOverlayMarker';
import {
  AMBULANCE_MARKER_IMAGE,
  HOSPITAL_MARKER_IMAGE,
  HOSPITAL_MARKER_SELECTED_IMAGE,
  LAGOS_CENTER,
  createEmergencyOverlayNode,
  createImageOverlayNode,
  createUserOverlayNode,
  markerLabel,
} from './presentation';

const getPosition = (item) => ({
  lat: parseFloat(item.lat) || LAGOS_CENTER.lat,
  lng: parseFloat(item.lng) || LAGOS_CENTER.lng,
});

export function EmergencyMarkerLayer({
  canUseAdvancedMarkers,
  getPriorityColor,
  requests,
  setSelectedMarker,
}) {
  return requests
    .filter((request) => request.lat && request.lng)
    .map((request) => (
      canUseAdvancedMarkers ? (
        <AdvancedMarker
          key={`emergency-${request.id}`}
          title={markerLabel('emergency', request)}
          position={getPosition(request)}
          onClick={() => setSelectedMarker({ type: 'emergency', data: request })}
        >
          <div
            className="relative cursor-pointer transform hover:scale-110 transition-transform"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: getPriorityColor(request.priority),
              boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle style={{ width: '18px', height: '18px', color: 'white' }} />
            {request.priority === 'critical' && (
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-pill bg-destructive" />
            )}
          </div>
        </AdvancedMarker>
      ) : (
        <GoogleMapsOverlayMarker
          key={`emergency-${request.id}`}
          ariaLabel={markerLabel('emergency', request)}
          position={getPosition(request)}
          onClick={() => setSelectedMarker({ type: 'emergency', data: request })}
          anchor="center"
          zIndex={220}
          renderNode={() => createEmergencyOverlayNode({
            color: getPriorityColor(request.priority),
            critical: request.priority === 'critical',
          })}
          renderKey={`${request.id}:${request.priority}:${request.status || ''}`}
        />
      )
    ));
}

export function AmbulanceMarkerLayer({
  ambulances,
  canUseAdvancedMarkers,
  selectedMarker,
  setSelectedMarker,
}) {
  return ambulances
    .filter((ambulance) => ambulance.lat && ambulance.lng)
    .map((ambulance) => {
      const selected = selectedMarker?.type === 'ambulance'
        && selectedMarker?.data?.id === ambulance.id;
      const size = selected ? 26 : 22;

      return canUseAdvancedMarkers ? (
        <AdvancedMarker
          key={`ambulance-${ambulance.id}`}
          title={markerLabel('ambulance', ambulance)}
          position={getPosition(ambulance)}
          onClick={() => setSelectedMarker({ type: 'ambulance', data: ambulance })}
        >
          <img
            src={AMBULANCE_MARKER_IMAGE}
            alt="Ambulance"
            className="cursor-pointer transform hover:scale-110 transition-transform"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: 0.94,
              filter: 'saturate(0.95)',
            }}
          />
        </AdvancedMarker>
      ) : (
        <GoogleMapsOverlayMarker
          key={`ambulance-${ambulance.id}`}
          ariaLabel={markerLabel('ambulance', ambulance)}
          position={getPosition(ambulance)}
          onClick={() => setSelectedMarker({ type: 'ambulance', data: ambulance })}
          anchor="center"
          zIndex={240}
          renderNode={() => createImageOverlayNode({
            src: AMBULANCE_MARKER_IMAGE,
            width: size,
            height: size,
            opacity: 0.94,
          })}
          renderKey={`${ambulance.id}:${selected ? 'selected' : 'default'}`}
        />
      );
    });
}

export function HospitalMarkerLayer({
  canUseAdvancedMarkers,
  hospitals,
  selectedMarker,
  setSelectedMarker,
}) {
  return hospitals
    .filter((hospital) => hospital.lat && hospital.lng)
    .map((hospital) => {
      const selected = selectedMarker?.type === 'hospital'
        && selectedMarker?.data?.id === hospital.id;
      const src = selected ? HOSPITAL_MARKER_SELECTED_IMAGE : HOSPITAL_MARKER_IMAGE;
      const width = selected ? 33 : 24;
      const height = selected ? 56 : 41;
      const opacity = selected ? 1 : 0.95;

      return canUseAdvancedMarkers ? (
        <AdvancedMarker
          key={`hospital-${hospital.id}`}
          title={markerLabel('hospital', hospital)}
          position={getPosition(hospital)}
          onClick={() => setSelectedMarker({ type: 'hospital', data: hospital })}
        >
          <img
            src={src}
            alt="Hospital"
            className="cursor-pointer transform hover:scale-110 transition-transform"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              opacity,
            }}
          />
        </AdvancedMarker>
      ) : (
        <GoogleMapsOverlayMarker
          key={`hospital-${hospital.id}`}
          ariaLabel={markerLabel('hospital', hospital)}
          position={getPosition(hospital)}
          onClick={() => setSelectedMarker({ type: 'hospital', data: hospital })}
          anchor="bottom"
          zIndex={260}
          renderNode={() => createImageOverlayNode({ src, width, height, opacity })}
          renderKey={`${hospital.id}:${selected ? 'selected' : 'default'}`}
        />
      );
    });
}

export function UserLocationMarker({ canUseAdvancedMarkers, userLocation }) {
  if (!userLocation) return null;

  return canUseAdvancedMarkers ? (
    <AdvancedMarker
      position={userLocation}
      zIndex={300}
      title={markerLabel('user')}
    >
      <div className="relative">
        <div className="absolute inset-0 scale-150 animate-ping rounded-pill bg-violet-600/25" />
        <div className="relative flex h-6 w-6 items-center justify-center rounded-pill bg-violet-600 shadow-e2">
          <div className="h-2 w-2 rounded-pill bg-white" />
        </div>
      </div>
    </AdvancedMarker>
  ) : (
    <GoogleMapsOverlayMarker
      position={userLocation}
      zIndex={300}
      anchor="center"
      ariaLabel={markerLabel('user')}
      renderNode={createUserOverlayNode}
      renderKey="user-location"
    />
  );
}
