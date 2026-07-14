import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Navigation, RefreshCw } from 'lucide-react';
import { ConsoleModuleRail } from '../../common/ConsoleModuleRail';
import {
  GoogleMapsRenderer,
  LeafletMapRenderer,
  MapErrorBoundary,
  MapLayerControls,
  MapLoadingState,
  MapViewportSummary,
  MarkerDetailPanel,
} from '..';
import { DEFAULT_MAP_CENTER, MAP_VIEW_RADIUS_KM } from '../mapViewModel';
import { DriverAssignmentCard } from './DriverAssignmentCard';

export function GodModeMapDesktop({ controller, fallbackMap }) {
  const {
    activeRoutes,
    allMarkers,
    assignedAmbulance,
    driverAction,
    driverAssignment,
    driverFeedError,
    driverFeedLoading,
    driverHospitals,
    driverLocationRecorded,
    driverTracking,
    filteredRequests,
    focus,
    focusLocation,
    getPriorityColor,
    getStatusColor,
    handleDriverAssignmentAction,
    handleRailNavigate,
    handleRouteRecenter,
    hasMapPoints,
    isDriverMode,
    isSwitchingMap,
    loading,
    locationStatus,
    mapLens,
    mapProvider,
    mapStyles,
    moduleRailItems,
    processedAmbulances,
    processedHospitals,
    refresh,
    routePrimaryColor,
    routingPath,
    selectedMarker,
    setSelectedMarker,
    showLayers,
    switchToBackupMap,
    theme,
    toggleLayer,
    userLocation,
  } = controller;

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden bg-background">
      <ConsoleModuleRail
        items={moduleRailItems}
        activePath="/map"
        routingPath={routingPath}
        onNavigate={handleRailNavigate}
      />
      <div className="absolute inset-0">
        <div className="absolute inset-0 overflow-hidden bg-background">
          {loading && !hasMapPoints && !isSwitchingMap && <MapLoadingState />}
          {isSwitchingMap && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <AlertTriangle className="mb-4 h-12 w-12 animate-bounce text-destructive" />
              <h3 className="mb-2 text-xl font-semibold">Map Error Detected</h3>
              <p className="text-muted-foreground">Switching to backup provider...</p>
            </div>
          )}

          {mapProvider === 'google' ? (
            <MapErrorBoundary fallback={fallbackMap} onError={() => switchToBackupMap()}>
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
            <DriverAssignmentCard
              assignedAmbulance={assignedAmbulance}
              driverAction={driverAction}
              driverAssignment={driverAssignment}
              driverFeedError={driverFeedError}
              driverFeedLoading={driverFeedLoading}
              driverLocationRecorded={driverLocationRecorded}
              driverTracking={driverTracking}
              onAssignmentAction={handleDriverAssignmentAction}
              hospitals={driverHospitals}
            />
          ) : (
            <MapViewportSummary
              lens={mapLens}
              locationStatus={locationStatus}
              focusSource={focus.source}
              routeCount={activeRoutes.length}
            />
          )}

          <div className="absolute bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(event) => {
                event.stopPropagation();
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
              <MapLayerControls showLayers={showLayers} setShowLayers={toggleLayer} />
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(event) => {
                event.stopPropagation();
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

        <MarkerDetailPanel
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
