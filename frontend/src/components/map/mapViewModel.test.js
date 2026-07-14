import {
  DEFAULT_MAP_CENTER,
  MAP_VIEW_RADIUS_KM,
  buildRoutePreview,
  distanceKm,
  filterMapEntitiesByRadius,
  getMapFocus,
  getMapLensSummary,
  getRadiusBounds,
  resolveMapEntityLocation,
} from './mapViewModel';

describe('map view model', () => {
  it('normalizes real coordinates without simulating missing points', () => {
    expect(resolveMapEntityLocation({ id: 'legacy', latitude: '6.5', longitude: '3.4' }))
      .toEqual(expect.objectContaining({ lat: 6.5, lng: 3.4, isSimulated: false }));
    expect(resolveMapEntityLocation({ id: 'geo', patient_location: { coordinates: [3.5, 6.6] } }))
      .toEqual(expect.objectContaining({ lat: 6.6, lng: 3.5, isSimulated: false }));
    expect(resolveMapEntityLocation({ id: 'ambulance', location: { coordinates: [3.45, 6.55] } }))
      .toEqual(expect.objectContaining({ lat: 6.55, lng: 3.45, isSimulated: false }));
    expect(resolveMapEntityLocation({ id: 'missing' })).toBeNull();
  });

  it('uses the real user point first and keeps fallback focus operational', () => {
    const request = { id: 'request', lat: 6.7, lng: 3.6 };
    expect(getMapFocus({ userLocation: { lat: 6.55, lng: 3.45 }, emergencies: [request] }))
      .toEqual({ coordinates: { lat: 6.55, lng: 3.45 }, source: 'user' });
    expect(getMapFocus({ emergencies: [request] }))
      .toEqual({ coordinates: { lat: 6.7, lng: 3.6 }, source: 'request' });
    expect(getMapFocus()).toEqual({ coordinates: DEFAULT_MAP_CENTER, source: 'default' });
  });

  it('measures only authorized loaded points inside the five kilometre lens', () => {
    const center = { lat: 6.5, lng: 3.4 };
    const near = { lat: 6.52, lng: 3.4 };
    const far = { lat: 6.6, lng: 3.4 };
    const summary = getMapLensSummary({
      center,
      emergencies: [near, far],
      hospitals: [near],
      ambulances: [far],
    });

    expect(MAP_VIEW_RADIUS_KM).toBe(5);
    expect(distanceKm(center, near)).toBeLessThan(5);
    expect(distanceKm(center, far)).toBeGreaterThan(5);
    expect(filterMapEntitiesByRadius([near, far], center)).toEqual([near]);
    expect(summary).toEqual({ radiusKm: 5, requests: 1, hospitals: 1, ambulances: 0 });
  });

  it('builds route legs for one active request only', () => {
    const emergency = {
      id: 'request-1',
      status: 'accepted',
      lat: 6.5,
      lng: 3.4,
      ambulance_id: 'ambulance-1',
      hospital_id: 'hospital-1',
    };
    const routes = buildRoutePreview({
      emergency,
      ambulances: [{ id: 'ambulance-1', lat: 6.51, lng: 3.41 }],
      hospitals: [{ id: 'hospital-1', lat: 6.52, lng: 3.42 }],
      color: '#86100E',
    });

    expect(routes).toHaveLength(2);
    expect(routes.map((route) => route.kind)).toEqual(['pickup', 'destination']);
    expect(buildRoutePreview({ emergency: { ...emergency, status: 'completed' } })).toEqual([]);
  });

  it('uses the recorded request destination when the hospital projection is unavailable', () => {
    const routes = buildRoutePreview({
      emergency: {
        id: 'request-2',
        status: 'accepted',
        lat: 6.5,
        lng: 3.4,
        destination_location: { coordinates: [3.42, 6.52] },
      },
      hospitals: [],
      color: '#86100E',
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      kind: 'destination',
      positions: [[6.5, 3.4], [6.52, 3.42]],
    });
  });

  it('returns a stable radius box for both map providers', () => {
    const bounds = getRadiusBounds({ lat: 6.5, lng: 3.4 }, 5);
    expect(bounds.south).toBeLessThan(6.5);
    expect(bounds.north).toBeGreaterThan(6.5);
    expect(bounds.west).toBeLessThan(3.4);
    expect(bounds.east).toBeGreaterThan(3.4);
  });
});
