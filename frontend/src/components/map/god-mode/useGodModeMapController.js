import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useMapContext } from '../../../contexts/MapContext';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import { driverManagementService } from '../../../services/driverManagementService';
import { handleApiError } from '../../../utils/errorHandler';
import { MAP_STYLES } from '../../../constants/mapStyles';
import {
  MAP_VIEW_RADIUS_KM,
  buildRoutePreview,
  filterMapEntitiesByRadius,
  getMapFocus,
  getMapLensSummary,
  resolveMapEntityLocation,
} from '../mapViewModel';
import { useOperatorLocation } from '../useOperatorLocation';
import {
  DRIVER_STATUS_COPY,
  getPriorityColor,
  getRoutePrimaryColor,
  getStatusColor,
} from './mapPresentation';
import { useDriverLocationTracking } from './useDriverLocationTracking';
import { useDriverDispatchFeed } from './useDriverDispatchFeed';

const isDriverProvider = (profile) => profile?.role === 'provider'
  && ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type);

const getRoleKind = (profile) => {
  if (profile?.role === 'admin') return 'admin';
  if (profile?.role === 'org_admin') return 'org_admin';
  if (profile?.role === 'dispatcher') return 'dispatcher';
  if (profile?.role === 'provider') return isDriverProvider(profile) ? 'driver' : 'provider';
  if (profile?.role === 'sponsor') return 'sponsor';
  return 'viewer';
};

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
  const [notificationPermission, setNotificationPermission] = useState(() => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  ));
  const previousAssignmentIdRef = useRef(null);
  const assignmentStateReadyRef = useRef(false);
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
  const mappedAmbulances = useMemo(
    () => ambulances.map(resolveMapEntityLocation).filter(Boolean),
    [ambulances],
  );
  const mappedHospitals = useMemo(
    () => hospitals.map(resolveMapEntityLocation).filter(Boolean),
    [hospitals],
  );
  const serviceFilteredRequests = useMemo(
    () => (filter === 'all'
      ? processedEmergencies
      : processedEmergencies.filter((request) => request.service_type === filter)),
    [filter, processedEmergencies],
  );

  const isDriverMode = isDriverProvider(profile);
  const driverFeed = useDriverDispatchFeed({
    enabled: isDriverMode,
    responderId: user?.id || null,
  });
  const driverAssignment = driverFeed.currentAssignment;
  const assignedAmbulance = useMemo(() => {
    if (!isDriverMode || !user?.id) return null;
    const assignmentAmbulance = driverAssignment?.ambulance_id
      ? ambulances.find((ambulance) => ambulance?.id === driverAssignment.ambulance_id)
      : null;
    if (assignmentAmbulance) return assignmentAmbulance;
    return ambulances.find((ambulance) => (
      [ambulance?.profile_id, ambulance?.driver_id].includes(user.id)
    )) || null;
  }, [ambulances, driverAssignment?.ambulance_id, isDriverMode, user?.id]);
  const driverMapEmergency = useMemo(
    () => resolveMapEntityLocation(driverAssignment) || driverAssignment,
    [driverAssignment],
  );
  const driverTracking = useDriverLocationTracking({
    assignment: driverAssignment,
    ambulance: assignedAmbulance,
    enabled: Boolean(isDriverMode && assignedAmbulance?.id),
  });
  const driverLocationRecorded = Boolean(driverTracking.telemetryState?.last_known);

  const focus = useMemo(() => getMapFocus({
    userLocation,
    assignedEmergency: driverMapEmergency,
    selectedMarker,
    emergencies: serviceFilteredRequests,
    hospitals: mappedHospitals,
    ambulances: mappedAmbulances,
  }), [
    driverMapEmergency,
    mappedAmbulances,
    mappedHospitals,
    selectedMarker,
    serviceFilteredRequests,
    userLocation,
  ]);
  const focusLocation = focus.coordinates;
  const filteredRequests = useMemo(
    () => filterMapEntitiesByRadius(serviceFilteredRequests, focusLocation),
    [focusLocation, serviceFilteredRequests],
  );
  const processedAmbulances = useMemo(
    () => filterMapEntitiesByRadius(mappedAmbulances, focusLocation),
    [focusLocation, mappedAmbulances],
  );
  const processedHospitals = useMemo(
    () => filterMapEntitiesByRadius(mappedHospitals, focusLocation),
    [focusLocation, mappedHospitals],
  );
  const allMarkers = useMemo(
    () => [...filteredRequests, ...processedAmbulances, ...processedHospitals],
    [filteredRequests, processedAmbulances, processedHospitals],
  );
  const mapLens = useMemo(() => getMapLensSummary({
    center: focusLocation,
    radiusKm: MAP_VIEW_RADIUS_KM,
    emergencies: serviceFilteredRequests,
    hospitals: mappedHospitals,
    ambulances: mappedAmbulances,
  }), [focusLocation, mappedAmbulances, mappedHospitals, serviceFilteredRequests]);
  const routeEmergency = selectedMarker?.type === 'emergency'
    ? selectedMarker.data
    : driverMapEmergency;
  const activeRoutes = useMemo(() => buildRoutePreview({
    emergency: routeEmergency,
    ambulances: mappedAmbulances,
    hospitals: mappedHospitals,
    color: routePrimaryColor,
  }), [mappedAmbulances, mappedHospitals, routeEmergency, routePrimaryColor]);
  const hasMapPoints = allMarkers.length > 0;

  const handleDriverAssignmentAction = useCallback(async (action, reason = null) => {
    if (!driverAssignment?.request_id || !driverAssignment?.assignment_id) {
      toast.warning('No active assignment to update');
      return;
    }

    setDriverAction(action);
    const copy = DRIVER_STATUS_COPY[action] || {
      loading: 'Updating request...',
      success: 'Request updated',
      error: 'Could not update request',
    };
    const toastId = `map-driver-${action}`;
    toast.loading(copy.loading, { id: toastId });
    try {
      if (action === 'accept') {
        await driverManagementService.acceptOffer(driverAssignment.request_id);
        driverTracking.start();
      } else if (action === 'decline') {
        await driverManagementService.declineOffer(driverAssignment.request_id, reason);
        driverTracking.stop({ quiet: true });
      } else if (action === 'arrive') {
        await driverManagementService.arriveAtPatient(driverAssignment.request_id);
      } else if (action === 'complete') {
        await driverManagementService.completeAssignment(driverAssignment.request_id);
        driverTracking.stop({ quiet: true });
      } else {
        throw new Error('Unsupported responder action');
      }
      toast.success(copy.success, { id: toastId });
      await driverFeed.refresh({ silent: true });
      await refresh();
    } catch (actionError) {
      toast.error(actionError?.message || copy.error, { id: toastId });
    } finally {
      setDriverAction(null);
    }
  }, [driverAssignment?.assignment_id, driverAssignment?.request_id, driverFeed, driverTracking, refresh]);

  const handleEnableAssignmentAlerts = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      toast.info('Page alerts are not available in this browser');
      setNotificationPermission('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      toast.success('Page alerts are on while this console is open');
      return;
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      toast.info('Allow browser notifications for alerts while this console is open');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Page alerts are on while this console is open');
    } else {
      toast.info('Page alerts remain off');
    }
  }, []);

  useEffect(() => {
    if (!isDriverMode || driverFeed.loading) return;
    const assignmentId = driverAssignment?.assignment_id || null;
    if (!assignmentStateReadyRef.current) {
      assignmentStateReadyRef.current = true;
      previousAssignmentIdRef.current = assignmentId;
      return;
    }

    if (assignmentId && assignmentId !== previousAssignmentIdRef.current) {
      toast.info('New emergency offer', {
        description: 'Review the pickup and accept or decline the call.',
      });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('New emergency offer', {
          body: `Request #${driverAssignment?.display_id || assignmentId.slice(-6)} needs a response.`,
          tag: `emergency-${assignmentId}`,
        });
      }
    }
    previousAssignmentIdRef.current = assignmentId;
  }, [driverAssignment?.assignment_id, driverAssignment?.display_id, driverFeed.loading, isDriverMode]);

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
    driverAssignment,
    driverFeedError: driverFeed.error,
    driverFeedLoading: driverFeed.loading,
    driverHospitals: hospitals,
    driverLocationRecorded,
    driverTracking,
    error,
    filteredRequests,
    focus,
    focusLocation,
    getPriorityColor,
    getStatusColor,
    handleDriverAssignmentAction,
    handleEnableAssignmentAlerts,
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
    notificationPermission,
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
