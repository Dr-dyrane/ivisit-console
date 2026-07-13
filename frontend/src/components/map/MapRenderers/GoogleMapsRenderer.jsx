import React from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { GoogleMapsMapRefiner } from '../MapRefiner/GoogleMapsRefiner';
import { GoogleMapsSmartRoute } from '../MapRefiner/GoogleMapsSmartRoute';
import {
  AmbulanceMarkerLayer,
  EmergencyMarkerLayer,
  HospitalMarkerLayer,
  UserLocationMarker,
} from './google-maps/GoogleMapMarkerLayers';
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAP_ID,
  LAGOS_CENTER,
  getRouteStrokeOptions,
} from './google-maps/presentation';

export const GoogleMapsRenderer = ({
  theme,
  mapStyles,
  userLocation,
  focusLocation,
  viewRadiusKm,
  allMarkers: _allMarkers,
  activeRoutes,
  showLayers,
  filteredRequests,
  ambulances,
  hospitals,
  getPriorityColor,
  getStatusColor: _getStatusColor,
  routePrimaryColor,
  setSelectedMarker,
  selectedMarker,
  fallback,
}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return fallback || (
      <div className="flex h-full w-full items-center justify-center bg-background text-sm font-medium text-muted-foreground">
        Map provider unavailable
      </div>
    );
  }

  const useCloudMapStyling = Boolean(GOOGLE_MAP_ID);
  const canUseAdvancedMarkers = useCloudMapStyling;

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={canUseAdvancedMarkers ? ['marker'] : []}>
      <Map
        key={theme}
        {...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {})}
        defaultCenter={focusLocation || LAGOS_CENTER}
        defaultZoom={12}
        className="w-full h-full"
        gestureHandling="greedy"
        options={{
          disableDefaultUI: true,
          ...(useCloudMapStyling ? {} : { styles: mapStyles }),
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f8f8f8',
          tilt: 0,
          renderingType: 'RASTER',
        }}
      >
        <GoogleMapsMapRefiner
          focusLocation={focusLocation || LAGOS_CENTER}
          radiusKm={viewRadiusKm}
          styles={useCloudMapStyling ? null : mapStyles}
        />

        {activeRoutes.map((route) => (
          <GoogleMapsSmartRoute
            key={route.id}
            start={{ lat: route.positions[0][0], lng: route.positions[0][1] }}
            end={{ lat: route.positions[1][0], lng: route.positions[1][1] }}
            options={getRouteStrokeOptions({
              color: routePrimaryColor || route.color,
              dashed: route.dashed,
            })}
          />
        ))}

        {showLayers.emergencies && (
          <EmergencyMarkerLayer
            canUseAdvancedMarkers={canUseAdvancedMarkers}
            getPriorityColor={getPriorityColor}
            requests={filteredRequests}
            setSelectedMarker={setSelectedMarker}
          />
        )}

        {showLayers.ambulances && (
          <AmbulanceMarkerLayer
            ambulances={ambulances}
            canUseAdvancedMarkers={canUseAdvancedMarkers}
            selectedMarker={selectedMarker}
            setSelectedMarker={setSelectedMarker}
          />
        )}

        {showLayers.hospitals && (
          <HospitalMarkerLayer
            canUseAdvancedMarkers={canUseAdvancedMarkers}
            hospitals={hospitals}
            selectedMarker={selectedMarker}
            setSelectedMarker={setSelectedMarker}
          />
        )}

        <UserLocationMarker
          canUseAdvancedMarkers={canUseAdvancedMarkers}
          userLocation={userLocation}
        />
      </Map>
    </APIProvider>
  );
};
