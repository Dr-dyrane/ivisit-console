import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  GoogleMapsRenderer,
  LeafletMapRenderer,
  MapErrorBoundary,
  MapFallback,
} from '../../map';

export const MobileMapCanvas = ({
  activeRoutes,
  allMarkers,
  fallbackMap,
  filteredRequests,
  focusLocation,
  getPriorityColor,
  getStatusColor,
  isSwitchingMap,
  mapProvider,
  mapStyles,
  processedAmbulances,
  processedHospitals,
  routePrimaryColor,
  selectedMarker,
  setIsSwitchingMap,
  setMapProvider,
  setSelectedMarker,
  showLayers,
  theme,
  userLocation,
  viewRadiusKm,
}) => (
  <div className="absolute inset-0 pt-12">
    {isSwitchingMap && (
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-foreground/70" />
        <h3 className="text-sm font-semibold">Switching map</h3>
      </div>
    )}

    <div className="absolute inset-0">
      <MapErrorBoundary
        fallback={fallbackMap || (
          <MapFallback
            filteredRequests={filteredRequests}
            ambulances={processedAmbulances}
            hospitals={processedHospitals}
            activeRoutes={activeRoutes}
            showLayers={showLayers}
            userLocation={userLocation}
            focusLocation={focusLocation}
            viewRadiusKm={viewRadiusKm}
            selectedMarker={selectedMarker}
            setSelectedMarker={setSelectedMarker}
          />
        )}
        onError={() => {
          if (!isSwitchingMap) {
            setIsSwitchingMap(true);
            setMapProvider('leaflet');
            setTimeout(() => setIsSwitchingMap(false), 2000);
          }
        }}
      >
        {mapProvider === 'google' ? (
          <GoogleMapsRenderer
            theme={theme}
            mapStyles={mapStyles}
            userLocation={userLocation}
            focusLocation={focusLocation}
            viewRadiusKm={viewRadiusKm}
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
            fallback={fallbackMap || (
              <MapFallback
                filteredRequests={filteredRequests}
                ambulances={processedAmbulances}
                hospitals={processedHospitals}
                activeRoutes={activeRoutes}
                showLayers={showLayers}
                userLocation={userLocation}
                focusLocation={focusLocation}
                viewRadiusKm={viewRadiusKm}
                selectedMarker={selectedMarker}
                setSelectedMarker={setSelectedMarker}
              />
            )}
          />
        ) : (
          <LeafletMapRenderer
            center={focusLocation}
            zoom={12}
            emergencies={filteredRequests}
            ambulances={processedAmbulances}
            hospitals={processedHospitals}
            routes={activeRoutes}
            userLocation={userLocation}
            focusLocation={focusLocation}
            viewRadiusKm={viewRadiusKm}
            markers={allMarkers}
            showLayers={showLayers}
            onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            theme={theme}
          />
        )}
      </MapErrorBoundary>
    </div>
  </div>
);
