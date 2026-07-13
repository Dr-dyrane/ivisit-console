import React from 'react';
import { MobileMapCanvas } from './mobile-map/MobileMapCanvas';
import { MobileMapChrome } from './mobile-map/MobileMapChrome';
import { MobileMapDetailSheet } from './mobile-map/MobileMapDetailSheet';
import { useMobileMapController } from './mobile-map/useMobileMapController';

export const MobileMap = ({
  mapData,
  toggleLayer,
  setFilter,
  setSelectedMarker,
  refresh,
  userLocation,
  focusLocation,
  focusSource,
  locationStatus,
  mapLens,
  viewRadiusKm,
  mapProvider,
  mapStyles,
  allMarkers,
  activeRoutes,
  processedAmbulances,
  processedHospitals,
  filteredRequests,
  getPriorityColor,
  getStatusColor,
  routePrimaryColor,
  theme,
  isSwitchingMap,
  setMapProvider,
  setIsSwitchingMap,
  fallbackMap,
}) => {
  const controller = useMobileMapController({
    allMarkers,
    mapData,
    refresh,
    setFilter,
    setSelectedMarker,
  });
  const { selectedMarker, showLayers } = mapData;

  return (
    <div className="fixed inset-0 z-[20] bg-background overflow-hidden">
      <MobileMapCanvas
        activeRoutes={activeRoutes}
        allMarkers={allMarkers}
        fallbackMap={fallbackMap}
        filteredRequests={filteredRequests}
        focusLocation={focusLocation}
        getPriorityColor={getPriorityColor}
        getStatusColor={getStatusColor}
        isSwitchingMap={isSwitchingMap}
        mapProvider={mapProvider}
        mapStyles={mapStyles}
        processedAmbulances={processedAmbulances}
        processedHospitals={processedHospitals}
        routePrimaryColor={routePrimaryColor}
        selectedMarker={selectedMarker}
        setIsSwitchingMap={setIsSwitchingMap}
        setMapProvider={setMapProvider}
        setSelectedMarker={setSelectedMarker}
        showLayers={showLayers}
        theme={theme}
        userLocation={userLocation}
        viewRadiusKm={viewRadiusKm}
      />

      <MobileMapChrome
        activeRoutes={activeRoutes}
        controller={controller}
        focusSource={focusSource}
        isSwitchingMap={isSwitchingMap}
        locationStatus={locationStatus}
        mapData={mapData}
        mapLens={mapLens}
        toggleLayer={toggleLayer}
      />

      <MobileMapDetailSheet
        controller={controller}
        setSelectedMarker={setSelectedMarker}
      />
    </div>
  );
};
