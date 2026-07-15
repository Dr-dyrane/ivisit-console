import React from 'react';
import { AlertTriangle, Navigation, RefreshCw } from 'lucide-react';
import {
  GoogleMapsRenderer,
  LeafletMapRenderer,
  MapErrorBoundary,
  MapLayerControls,
  MapLoadingState,
  MapViewportSummary,
  MarkerDetailPanel,
} from '../map';
import { DEFAULT_MAP_CENTER, MAP_VIEW_RADIUS_KM } from '../map/mapViewModel';
import { DriverAssignmentCard } from '../map/god-mode/DriverAssignmentCard';
import { TabletPageShell } from './TabletPageShell';
import { TABLET_FOCUS_RING } from './TabletCollectionPage';

const TabletMapButton = ({ label, busy = false, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    aria-label={label}
    aria-busy={busy}
    title={label}
    className={`flex h-11 w-11 items-center justify-center rounded-button bg-card/76 text-foreground shadow-e3 backdrop-blur-2xl transition-all active:scale-95 disabled:opacity-60 ${TABLET_FOCUS_RING}`}
  >
    {children}
  </button>
);

export const TabletMap = ({ controller, fallbackMap }) => {
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
    handleRouteRecenter,
    hasMapPoints,
    isDriverMode,
    isSwitchingMap,
    loading,
    locationStatus,
    mapLens,
    mapProvider,
    mapStyles,
    processedAmbulances,
    processedHospitals,
    refresh,
    routePrimaryColor,
    selectedMarker,
    setSelectedMarker,
    showLayers,
    switchToBackupMap,
    theme,
    toggleLayer,
    userLocation,
  } = controller;

  return (
    <TabletPageShell mode="full">
      <section className="relative h-full min-h-0 overflow-hidden bg-background" data-tablet-map>
        {loading && !hasMapPoints && !isSwitchingMap && <MapLoadingState />}

        {isSwitchingMap && (
          <div className="absolute inset-0 z-[450] flex flex-col items-center justify-center bg-background/82 px-8 text-center backdrop-blur-sm">
            <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-200" />
            <p className="mt-4 text-base font-semibold text-foreground">Changing map provider</p>
            <p className="mt-1 text-sm text-muted-foreground">Your map view will return in a moment.</p>
          </div>
        )}

        {mapProvider === 'google' ? (
          <MapErrorBoundary fallback={fallbackMap} onError={switchToBackupMap}>
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

        <div className="absolute bottom-5 right-5 z-[320] flex flex-col items-end gap-2">
          <TabletMapButton label={loading ? 'Refreshing map' : 'Refresh map'} busy={loading} onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </TabletMapButton>
          {!isDriverMode && <MapLayerControls showLayers={showLayers} setShowLayers={toggleLayer} />}
          <TabletMapButton label="Center map" busy={locationStatus === 'locating'} onClick={handleRouteRecenter}>
            <Navigation className="h-4 w-4" />
          </TabletMapButton>
        </div>

        <MarkerDetailPanel
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          onRefresh={refresh}
        />
      </section>
    </TabletPageShell>
  );
};

export default TabletMap;
