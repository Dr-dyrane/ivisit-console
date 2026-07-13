import React, { useMemo } from 'react';
import { LocateFixed } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { MobileMap } from '../mobile/MobileMap';
import { MapFallback } from '../map';
import { MAP_VIEW_RADIUS_KM } from '../map/mapViewModel';
import { GodModeMapDesktop } from '../map/god-mode/GodModeMapDesktop';
import { useGodModeMapController } from '../map/god-mode/useGodModeMapController';
import { Button } from '../ui/button';

const GodModeMapContent = () => {
  const controller = useGodModeMapController();
  const {
    activeRoutes,
    allMarkers,
    filteredRequests,
    focus,
    focusLocation,
    getPriorityColor,
    getStatusColor,
    handleRouteRecenter,
    isMobile,
    isSwitchingMap,
    locationStatus,
    mapData,
    mapLens,
    mapProvider,
    mapStyles,
    processedAmbulances,
    processedHospitals,
    refresh,
    routePrimaryColor,
    selectedMarker,
    setFilter,
    setIsSwitchingMap,
    setMapProvider,
    setSelectedMarker,
    showLayers,
    theme,
    toggleLayer,
    userLocation,
  } = controller;

  const headerActions = useMemo(() => (isMobile ? null : (
    <Button
      type="button"
      onClick={handleRouteRecenter}
      aria-busy={locationStatus === 'locating'}
      className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
    >
      <LocateFixed className="mr-2 h-4 w-4" />
      Recenter
    </Button>
  )), [handleRouteRecenter, isMobile, locationStatus]);

  usePageHeader('Live Map', headerActions);
  usePageFooter(null, 'status', false);
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

  return <GodModeMapDesktop controller={controller} fallbackMap={fallbackMap} />;
};

export const GodModeMap = () => <GodModeMapContent />;
