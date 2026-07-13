import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useMapContext } from '../../../contexts/MapContext';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import { updateResponderLocation } from '../../../services/emergencyResponseService';
import { driverManagementService } from '../../../services/driverManagementService';
import { decodePostGISGeometry } from '../../../utils/locationUtils';
import { handleApiError } from '../../../utils/errorHandler';
import { MAP_STYLES } from '../../../constants/mapStyles';
import {
  MAP_VIEW_RADIUS_KM,
  buildRoutePreview,
  getMapFocus,
  getMapLensSummary,
  resolveMapEntityLocation,
} from '../mapViewModel';
import { useOperatorLocation } from '../useOperatorLocation';
import {
  ACTIVE_AMBULANCE_STATUSES,
  DRIVER_STATUS_COPY,
  getPriorityColor,
  getRoutePrimaryColor,
  getStatusColor,
} from './mapPresentation';

const isDriverProvider = (profile) => profile?.role === 'provider'
  && ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type);

const getRoleKind = (profile) => {
  if (profile?.role === 'admin') return 'admin';
  if (profile?.role === 'org_admin') return 'org_admin';
  if (profile?.role === 'provider') return isDriverProvider(profile) ? 'driver' : 'provider';
  if (profile?.role === 'sponsor') return 'sponsor';
  return 'viewer';
};

const requestBrowserLocation = () => new Promise((resolve, reject) => {
  if (!('geolocation' in navigator)) {
    reject(new Error('Geolocation is not available on this device'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 10000,
  });
});

export function useGodModeMapController() {
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const { isMobile } = useBreakpoint();
  const { mapData, toggleLayer, setFilter, setSelectedMarker, refresh } = useMapContext();
  const {
    emergencyRequests,
    ambulances,
    hospitals,
    showLayers,
    filter,
    selectedMarker,
    loading,
    error,
  } = mapData;
  const [driverAction, setDriverAction] = useState(null);
  const [mapProvider, setMapProvider] = useState('google');
  const [isSwitchingMap, setIsSwitchingMap] = useState(false);
  const {
    coordinates: userLocation,
    status: locationStatus,
    requestLocation,
  } = useOperatorLocation();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const isDark = theme === 'dark';
  const roleKind = useMemo(
    () => getRoleKind(profile),
    [profile],
  );
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
  const mapStyles = useMemo(() => (isDark ? MAP_STYLES.dark : MAP_STYLES.light), [isDark]);
  const routePrimaryColor = useMemo(() => getRoutePrimaryColor(isDark), [isDark]);

  const processedEmergencies = useMemo(
    () => emergencyRequests.map(resolveMapEntityLocation).filter(Boolean),
    [emergencyRequests],
  );
  const processedAmbulances = useMemo(
    () => ambulances.map(resolveMapEntityLocation).filter(Boolean),
    [ambulances],
  );
  const processedHospitals = useMemo(
    () => hospitals.map(resolveMapEntityLocation).filter(Boolean),
    [hospitals],
  );
  const filteredRequests = useMemo(
    () => (filter === 'all'
      ? processedEmergencies
      : processedEmergencies.filter((request) => request.service_type === filter)),
    [filter, processedEmergencies],
  );

  const isDriverMode = isDriverProvider(profile);
  const activeAmbulanceRequests = useMemo(
    () => processedEmergencies.filter((request) => (
      request?.service_type === 'ambulance'
      && ACTIVE_AMBULANCE_STATUSES.has(String(request?.status || '').toLowerCase())
    )),
    [processedEmergencies],
  );
  const assignedAmbulance = useMemo(() => {
    if (!isDriverMode || !user?.id) return null;
    return processedAmbulances.find((ambulance) => (
      [ambulance?.profile_id, ambulance?.driver_id].includes(user.id)
    )) || null;
  }, [isDriverMode, processedAmbulances, user?.id]);
  const driverActiveEmergency = useMemo(() => {
    if (!isDriverMode || !user?.id) return null;
    const scoped = activeAmbulanceRequests.filter((request) => request?.responder_id === user.id);
    if (!scoped.length) return null;
    return [...scoped].sort(
      (left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0),
    )[0];
  }, [activeAmbulanceRequests, isDriverMode, user?.id]);
  const driverLocationRecorded = Boolean(
    decodePostGISGeometry(driverActiveEmergency?.responder_location),
  );

  const allMarkers = useMemo(
    () => [...processedEmergencies, ...processedAmbulances, ...processedHospitals],
    [processedAmbulances, processedEmergencies, processedHospitals],
  );
  const focus = useMemo(() => getMapFocus({
    userLocation,
    assignedEmergency: driverActiveEmergency,
    selectedMarker,
    emergencies: filteredRequests,
    hospitals: processedHospitals,
    ambulances: processedAmbulances,
  }), [
    driverActiveEmergency,
    filteredRequests,
    processedAmbulances,
    processedHospitals,
    selectedMarker,
    userLocation,
  ]);
  const focusLocation = focus.coordinates;
  const mapLens = useMemo(() => getMapLensSummary({
    center: focusLocation,
    radiusKm: MAP_VIEW_RADIUS_KM,
    emergencies: filteredRequests,
    hospitals: processedHospitals,
    ambulances: processedAmbulances,
  }), [filteredRequests, focusLocation, processedAmbulances, processedHospitals]);
  const routeEmergency = selectedMarker?.type === 'emergency'
    ? selectedMarker.data
    : driverActiveEmergency;
  const activeRoutes = useMemo(() => buildRoutePreview({
    emergency: routeEmergency,
    ambulances: processedAmbulances,
    hospitals: processedHospitals,
    color: routePrimaryColor,
  }), [processedAmbulances, processedHospitals, routeEmergency, routePrimaryColor]);
  const hasMapPoints = allMarkers.length > 0;

  const handleDriverPingLocation = useCallback(async () => {
    if (!driverActiveEmergency?.id || driverActiveEmergency?.responder_id !== user?.id) {
      toast.warning('No active assignment to publish location for');
      return;
    }

    const toastId = 'map-driver-location';
    setDriverAction('ping');
    toast.loading('Sharing location...', { id: toastId });
    try {
      const position = await requestBrowserLocation();
      const coords = position?.coords || {};
      await updateResponderLocation(
        driverActiveEmergency.id,
        { lat: Number(coords.latitude), lng: Number(coords.longitude) },
        Number.isFinite(coords.heading) ? coords.heading : null,
      );
      toast.success('Location shared', { id: toastId });
      await refresh();
    } catch (actionError) {
      toast.error(actionError?.message || 'Could not share location', { id: toastId });
    } finally {
      setDriverAction(null);
    }
  }, [driverActiveEmergency?.id, driverActiveEmergency?.responder_id, refresh, user?.id]);

  const handleDriverStatusUpdate = useCallback(async (status) => {
    if (!driverActiveEmergency?.id || driverActiveEmergency?.responder_id !== user?.id) {
      toast.warning('No active assignment to update');
      return;
    }

    setDriverAction(status);
    const copy = DRIVER_STATUS_COPY[status] || {
      loading: 'Updating request...',
      success: 'Request updated',
      error: 'Could not update request',
    };
    const toastId = `map-driver-${status}`;
    toast.loading(copy.loading, { id: toastId });
    try {
      const updatedRequest = await driverManagementService.updateTripStatus(
        driverActiveEmergency.id,
        status,
      );
      if (!updatedRequest) {
        toast.error(copy.error, { id: toastId });
        return;
      }
      toast.success(copy.success, { id: toastId });
      await refresh();
    } catch (actionError) {
      toast.error(actionError?.message || copy.error, { id: toastId });
    } finally {
      setDriverAction(null);
    }
  }, [driverActiveEmergency?.id, driverActiveEmergency?.responder_id, refresh, user?.id]);

  const switchToBackupMap = useCallback((toastOptions) => {
    if (isSwitchingMap) return;
    setIsSwitchingMap(true);
    toast.info('Switching to backup map...', toastOptions);
    setTimeout(() => {
      setMapProvider('leaflet');
      setIsSwitchingMap(false);
    }, 2000);
  }, [isSwitchingMap]);

  useEffect(() => {
    const handleAuthFailure = () => {
      if (mapProvider === 'google' && !isSwitchingMap) {
        console.info('[GodModeMap] Switching to backup map provider');
        switchToBackupMap({ duration: 4000 });
      }
    };
    window.addEventListener('google-maps-auth-failure', handleAuthFailure);
    return () => window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
  }, [isSwitchingMap, mapProvider, switchToBackupMap]);

  const handleRouteRecenter = useCallback(async () => {
    let center = userLocation;
    if (!center && locationStatus !== 'locating') {
      const toastId = 'map-location-request';
      toast.loading('Requesting location...', { id: toastId });
      center = await requestLocation();
      if (center) toast.success('Location found', { id: toastId });
      else toast.info('Using the operational area', { id: toastId });
    }
    if (!center && locationStatus === 'locating') toast.info('Location is still loading');
    const nextCenter = center || focusLocation;
    window.dispatchEvent(new CustomEvent('recenter-map', { detail: { center: nextCenter } }));
  }, [focusLocation, locationStatus, requestLocation, userLocation]);

  useEffect(() => {
    window.addEventListener('mapRecenterRequested', handleRouteRecenter);
    return () => window.removeEventListener('mapRecenterRequested', handleRouteRecenter);
  }, [handleRouteRecenter]);

  useEffect(() => {
    if (error) handleApiError(error, 'fetch');
  }, [error]);

  return {
    activeRoutes,
    allMarkers,
    assignedAmbulance,
    driverAction,
    driverActiveEmergency,
    driverLocationRecorded,
    error,
    filteredRequests,
    focus,
    focusLocation,
    getPriorityColor,
    getStatusColor,
    handleDriverPingLocation,
    handleDriverStatusUpdate,
    handleRailNavigate,
    handleRouteRecenter,
    hasMapPoints,
    isDriverMode,
    isMobile,
    isSwitchingMap,
    loading,
    locationStatus,
    mapData,
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
    setFilter,
    setIsSwitchingMap,
    setMapProvider,
    setSelectedMarker,
    showLayers,
    switchToBackupMap,
    theme,
    toggleLayer,
    userLocation,
  };
}
