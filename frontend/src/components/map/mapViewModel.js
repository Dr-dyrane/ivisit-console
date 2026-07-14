import { decodePostGISGeometry } from '../../utils/locationUtils';

export const DEFAULT_MAP_CENTER = Object.freeze({ lat: 6.5244, lng: 3.3792 });
export const MAP_VIEW_RADIUS_KM = 5;

const TERMINAL_REQUEST_STATUSES = new Set(['completed', 'cancelled', 'canceled']);

const asCoordinate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toMapPoint = (value) => {
  if (!value) return null;
  const lat = asCoordinate(value.lat ?? value.latitude);
  const lng = asCoordinate(value.lng ?? value.longitude);
  if (lat === null || lng === null) return null;
  return { lat, lng };
};

export const resolveMapEntityLocation = (item) => {
  if (!item) return null;

  for (const field of ['patient_location', 'pickup_location', 'responder_location', 'location']) {
    const decoded = decodePostGISGeometry(item[field]);
    const point = toMapPoint(decoded);
    if (point) return { ...item, ...point, isSimulated: false };
  }

  const point = toMapPoint(item);
  return point ? { ...item, ...point, isSimulated: false } : null;
};

export const distanceKm = (origin, destination) => {
  const from = toMapPoint(origin);
  const to = toMapPoint(destination);
  if (!from || !to) return null;

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const fromLatitude = radians(from.lat);
  const toLatitude = radians(to.lat);
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2
  );

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const isWithinMapRadius = (point, center, radiusKm = MAP_VIEW_RADIUS_KM) => {
  const distance = distanceKm(center, point);
  return distance !== null && distance <= radiusKm;
};

export const filterMapEntitiesByRadius = (
  items = [],
  center,
  radiusKm = MAP_VIEW_RADIUS_KM,
) => items.filter((item) => isWithinMapRadius(item, center, radiusKm));

const firstPoint = (items = []) => items.find((item) => toMapPoint(item)) || null;

export const getMapFocus = ({
  userLocation,
  assignedEmergency,
  selectedMarker,
  emergencies = [],
  hospitals = [],
  ambulances = [],
} = {}) => {
  const candidates = [
    { source: 'user', value: userLocation },
    { source: 'assignment', value: assignedEmergency },
    { source: 'selection', value: selectedMarker?.data },
    { source: 'request', value: firstPoint(emergencies) },
    { source: 'hospital', value: firstPoint(hospitals) },
    { source: 'ambulance', value: firstPoint(ambulances) },
  ];

  for (const candidate of candidates) {
    const coordinates = toMapPoint(candidate.value);
    if (coordinates) return { coordinates, source: candidate.source };
  }

  return { coordinates: DEFAULT_MAP_CENTER, source: 'default' };
};

export const getMapLensSummary = ({
  center,
  radiusKm = MAP_VIEW_RADIUS_KM,
  emergencies = [],
  hospitals = [],
  ambulances = [],
} = {}) => {
  return {
    radiusKm,
    requests: filterMapEntitiesByRadius(emergencies, center, radiusKm).length,
    hospitals: filterMapEntitiesByRadius(hospitals, center, radiusKm).length,
    ambulances: filterMapEntitiesByRadius(ambulances, center, radiusKm).length,
  };
};

export const getRadiusBounds = (center, radiusKm = MAP_VIEW_RADIUS_KM) => {
  const point = toMapPoint(center) || DEFAULT_MAP_CENTER;
  const latitudeDelta = radiusKm / 111.32;
  const longitudeScale = Math.max(Math.cos((point.lat * Math.PI) / 180), 0.1);
  const longitudeDelta = radiusKm / (111.32 * longitudeScale);

  return {
    south: point.lat - latitudeDelta,
    west: point.lng - longitudeDelta,
    north: point.lat + latitudeDelta,
    east: point.lng + longitudeDelta,
  };
};

export const buildRoutePreview = ({
  emergency,
  ambulances = [],
  hospitals = [],
  color,
} = {}) => {
  const status = String(emergency?.status || '').toLowerCase();
  const patient = toMapPoint(emergency);
  if (!emergency?.id || !patient || TERMINAL_REQUEST_STATUSES.has(status)) return [];

  const routes = [];
  const ambulance = ambulances.find((item) => (
    item?.id === emergency?.ambulance_id
    || item?.profile_id === emergency?.responder_id
    || item?.driver_id === emergency?.responder_id
  ));
  const ambulancePoint = toMapPoint(ambulance);
  if (ambulancePoint) {
    routes.push({
      id: `route-amb-${emergency.id}`,
      positions: [[ambulancePoint.lat, ambulancePoint.lng], [patient.lat, patient.lng]],
      color,
      dashed: true,
      kind: 'pickup',
    });
  }

  const hospital = hospitals.find((item) => item?.id === emergency?.hospital_id);
  const hospitalPoint = toMapPoint(hospital)
    || toMapPoint(decodePostGISGeometry(emergency?.destination_location));
  if (hospitalPoint) {
    routes.push({
      id: `route-hosp-${emergency.id}`,
      positions: [[patient.lat, patient.lng], [hospitalPoint.lat, hospitalPoint.lng]],
      color,
      dashed: false,
      kind: 'destination',
    });
  }

  return routes;
};
