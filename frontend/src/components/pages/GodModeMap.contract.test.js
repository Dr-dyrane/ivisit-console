import fs from 'fs';
import { getAccessibleNav } from '../../config/navigation';
import { getMobileNavigationItems } from '../../config/mobileNavigation';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('GodModeMap Live Map contract', () => {
  const appSource = () => fs.readFileSync('src/App.js', 'utf8');
  const pageSource = () => fs.readFileSync('src/components/pages/GodModeMap.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileMap.jsx', 'utf8');
  const markerSource = () => fs.readFileSync('src/components/map/MarkerDetailPanel.jsx', 'utf8');
  const layerControlsSource = () => fs.readFileSync('src/components/map/MapLayerControls.jsx', 'utf8');
  const fallbackSource = () => fs.readFileSync('src/components/map/MapFallback.jsx', 'utf8');
  const mapContextSource = () => fs.readFileSync('src/contexts/MapContext.jsx', 'utf8');
  const mapPanelSource = () => fs.readFileSync('src/components/context/MapPanel.jsx', 'utf8');
  const layoutContextSource = () => fs.readFileSync('src/contexts/LayoutContext.jsx', 'utf8');
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const googleRendererSource = () => fs.readFileSync('src/components/map/MapRenderers/GoogleMapsRenderer.jsx', 'utf8');
  const mapServiceSource = () => fs.readFileSync('src/services/supabaseMapService.js', 'utf8');
  const responseServiceSource = () => fs.readFileSync('src/services/emergencyResponseService.js', 'utf8');
  const driverServiceSource = () => fs.readFileSync('src/services/driverManagementService.js', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps Live Map provider-accessible while excluding sponsor routes', () => {
    expect(getRouteProtection('/map')).toEqual({
      public: false,
      minRole: 'provider',
      resource: 'map',
      title: 'Live Map',
      excludedRoles: ['sponsor'],
    });

    expect(getProtectedRoutesForRole('provider')).toContain('/map');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/map');
    expect(getProtectedRoutesForRole('admin')).toContain('/map');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/map');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/map');

    expect(getAccessibleNav({ role: 'provider' }).main.find((item) => item.path === '/map')?.label)
      .toBe('Live Map');
    expect(getAccessibleNav({ role: 'sponsor' }).main.find((item) => item.path === '/map'))
      .toBeUndefined();
    expect(getMobileNavigationItems('admin').map((item) => item.path)).toContain('/map');
    expect(getMobileNavigationItems('provider').map((item) => item.path)).not.toContain('/map');
  });

  it('keeps map data route-owned and asleep outside the Live Map route', () => {
    const app = appSource();
    const page = pageSource();
    const mapContext = mapContextSource();

    expect(app).toContain('<MapProvider>');
    expect(app.indexOf('<MapProvider>')).toBeLessThan(app.indexOf('<PageDataProvider>'));
    expect(page).not.toContain('<MapProvider>');

    expect(mapContext).toContain("const isMapPath = (pathname = '') => pathname === '/map' || pathname.startsWith('/map/')");
    expect(mapContext).toContain('const mapRouteActive = isMapPath(location.pathname)');
    expect(mapContext.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContext.indexOf('initializeMapData({ shouldCommit: () => mounted })'));
    expect(mapContext.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContext.indexOf('supabaseMapService.subscribeToEmergencies'));
    expect(mapContext.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContext.indexOf('supabaseMapService.subscribeToAmbulances'));
    expect(mapContext.indexOf('if (!mapRouteActive)'))
      .toBeLessThan(mapContext.indexOf('supabaseMapService.subscribeToUsers'));
    expect((mapContext.match(/if \(!mounted\) return;/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(mapContext).toContain("if (typeof unsub === 'function') unsub();");
    expect(mapContext).toContain('const refreshMapData = React.useCallback(() => {');
    expect(routeOwnsStartupDomains('/map')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/map')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('provider', '/map')).toEqual([]);
  });

  it('uses the shared full-canvas shell instead of a page-owned map card', () => {
    const page = pageSource();
    const mobile = mobileSource();

    expect(page).toContain('usePageHeader("Live Map", headerActions)');
    expect(page).toContain('usePageFooter(null, "status", false)');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).not.toContain("import { Card } from");
    expect(page).not.toContain('<Card');
    expect(page).toContain('h-[calc(100dvh-4rem)]');
    expect(mobile).not.toContain('MobileKPIStrip');
    expect(mobile).toContain('absolute inset-0 pt-12');
    expect(layoutContextSource()).toContain('setIsScrolledDown(false)');
    expect(bottomBarSource()).toContain("location.pathname.startsWith('/map')");
    expect(fabSource()).toContain("location.pathname.startsWith('/map')");
  });

  it('keeps map reads and subscriptions behind the map service boundary', () => {
    const page = pageSource();
    const service = mapServiceSource();

    expect(page).toContain('useMapContext()');
    expect(page).toContain('supabaseMapService.getNearbyHospitals(userLocation, 100, { quiet: true })');
    expect(page).toContain('decodePostGISGeometry');
    expect(page).not.toContain("from('emergency_requests')");
    expect(page).not.toContain("from('ambulances')");
    expect(page).not.toContain("from('hospitals')");

    expect(service).toContain('async fetchInitialMapData(options = {})');
    expect(mapContextSource()).toContain('supabaseMapService.fetchInitialMapData({ quiet: true })');
    expect(service).toContain(".from('emergency_requests')");
    expect(service).toContain(".from('ambulances')");
    expect(service).toContain(".from('hospitals')");
    expect(service).toContain('applyAuthFilter(emergenciesQuery');
    expect(service).toContain('applyAuthFilter(ambulancesQuery');
    expect(service).toContain('subscribeToEmergencies(onChange)');
    expect(service).toContain('subscribeToAmbulances(onChange)');
    expect(service).toContain('subscribeToUsers(onChange)');
    expect(service).toContain("rpc('nearby_hospitals'");
    expect(service).toContain('async getNearbyHospitals(userLocation, radiusKm = 50, options = {})');
    expect(service).toContain('const quiet = Boolean(options?.quiet)');
  });

  it('keeps current map commands tied to named backend receivers', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const responseService = responseServiceSource();
    const driverService = driverServiceSource();

    expect(`${mobile}\n${marker}`).toContain('dispatchEmergency');
    expect(`${mobile}\n${marker}`).toContain('completeEmergency');
    expect(page).toContain('updateResponderLocation(');
    expect(page).toContain('driverManagementService.updateTripStatus');

    expect(responseService).toContain("supabase.rpc('console_dispatch_emergency'");
    expect(responseService).toContain("supabase.rpc('console_complete_emergency'");
    expect(responseService).toContain("supabase.rpc('console_update_responder_location'");
    expect(driverService).toContain('async updateTripStatus(requestId, newStatus)');
  });

  it('keeps map commands progressive with visible feedback instead of native confirms', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const layerControls = layerControlsSource();
    const activeCommands = `${page}\n${mobile}\n${marker}\n${layerControls}`;

    expect(activeCommands).not.toContain('confirm(');
    expect(page).toContain('DRIVER_STATUS_COPY');
    expect(page).toContain('toast.loading("Sharing location..."');
    expect(page).toContain('toast.success(copy.success');
    expect(page).toContain('aria-busy={driverAction === "completed"}');
    expect(page).toContain('toast.info("Location not ready")');
    expect(mobile).toContain('const [mapCommand, setMapCommand] = useState(null)');
    expect(mobile).toContain('Confirm close');
    expect(mobile).toContain('aria-busy={mapCommand === "close"}');
    expect(marker).toContain('const [mapCommand, setMapCommand] = useState(null)');
    expect(marker).toContain('Confirm close');
    expect(marker).toContain('aria-busy={mapCommand === "close"}');
    expect(layerControls).toContain('aria-expanded={isExpanded}');
    expect(layerControls).toContain('aria-pressed={isVisible}');
  });

  it('keeps the fallback renderer route-owned and selectable instead of simulated preview copy', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const fallback = fallbackSource();
    const googleRenderer = googleRendererSource();

    expect(page).toContain('const fallbackMap = (');
    expect(page).toContain('filteredRequests={filteredRequests}');
    expect(page).toContain('setSelectedMarker={setSelectedMarker}');
    expect(page).toContain('fallback={fallbackMap}');
    expect(mobile).toContain('fallbackMap');
    expect(mobile).toContain('fallback={fallbackMap || (');
    expect(googleRenderer).toContain('fallback,');
    expect(googleRenderer).toContain('return fallback || (');

    expect(fallback).toContain('data-map-fallback="route-owned"');
    expect(fallback).toContain('filteredRequests = []');
    expect(fallback).toContain('ambulances = []');
    expect(fallback).toContain('hospitals = []');
    expect(fallback).toContain('activeRoutes = []');
    expect(fallback).toContain("setSelectedMarker?.({ type: marker.type, data: marker.data })");
    expect(fallback).toContain('aria-pressed={isSelected}');
    expect(fallback).toContain('Select a point');
    expect(fallback).not.toMatch(/Map Preview Mode|simulated view|Simulated markers|Google Maps API requires domain authorization/i);
  });

  it('keeps visible map copy simple while preserving command receivers', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const activeCopy = `${page}\n${mobile}\n${marker}`;

    expect(activeCopy).toContain('Current request');
    expect(activeCopy).toContain('Live status');
    expect(activeCopy).toContain('Send unit');
    expect(activeCopy).toContain('Close request');
    expect(activeCopy).toContain('canManageRequests');
    expect(activeCopy).not.toMatch(/Driver Mission|Ops Telemetry|Telemetry:|Mission Complete|Dispatch Unit|Dispatching|Emergency dispatched|dispatch failed/i);
  });

  it('promotes the repaired Live Map surfaces into the default visual hardgate', () => {
    const hardgate = hardgateSource();

    expect(hardgate).toContain('src/components/pages/GodModeMap.jsx');
    expect(hardgate).toContain('src/components/mobile/MobileMap.jsx');
    expect(hardgate).toContain('src/components/map/MarkerDetailPanel.jsx');
    expect(hardgate).toContain('src/components/map/MapLayerControls.jsx');
    expect(hardgate).toContain('src/components/map/MapFallback.jsx');
  });

  it('uses icon close controls and ASCII marker separators in active map details', () => {
    const mobile = mobileSource();
    const marker = markerSource();

    expect(mobile).toContain("import {");
    expect(mobile).toContain('X');
    expect(mobile).toContain('aria-label="Close details"');
    expect(mobile).toContain("{selectedMarker.type} - {selectedMarker.data.status || 'Active'}");
    expect(mobile).not.toContain('\u00d7');
    expect(mobile).not.toContain('\u2022');
    expect(marker).toContain('CheckCheck, X');
    expect(marker).toContain('<X className="h-4 w-4" />');
    expect(marker).not.toContain('\u00d7');
  });

  it('keeps the repaired map surfaces ready for the no-hairline UI hardgate', () => {
    const activeSurface = [
      pageSource(),
      mobileSource(),
      markerSource(),
      layerControlsSource(),
      fallbackSource(),
      mapPanelSource(),
    ].join('\n');

    expect(activeSurface).not.toMatch(/\sborder(?:-[^\s"'`]+)?(?=\s|$)/);
    expect(activeSurface).not.toMatch(/\sring(?:-[^\s"'`]+)?(?=\s|$)/);
    expect(activeSurface).not.toMatch(/\soutline(?:-[^\s"'`]+)?(?=\s|$)/);
    expect(activeSurface).not.toMatch(/\sdivide(?:-[^\s"'`]+)?(?=\s|$)/);
    expect(activeSurface).not.toMatch(/\s(?:h|w)-px(?=\s|$)/);
    expect(activeSurface).not.toMatch(/(?:^|[^0-9])(?:0\.5|1)px\b/);
  });

  it('keeps the desktop context panel route-owned and free of fabricated or unproved actions', () => {
    const panel = mapPanelSource();

    expect(panel).toContain('const { mapData, setFilter, setSelectedMarker, recenterMap, refresh } = useMapContext()');
    expect(panel).toContain("loading = false");
    expect(panel).toContain("error = null");
    expect(panel).toContain('aria-label="Loading live map context"');
    expect(panel).toContain('role="alert"');
    expect(panel).toContain('aria-busy={loading');
    expect(panel).toContain('aria-pressed={activeFilter === filter.key}');
    expect(panel).toContain('Fleet visible');
    expect(panel).toContain('Hospitals visible');
    expect(panel).not.toContain('handleExportMapData');
    expect(panel).not.toContain('Export Data');
    expect(panel).not.toContain('4.2m');
    expect(panel).not.toContain('12 -');
    expect(panel).not.toContain('Real-time Tracking');
    expect(panel).not.toContain('Alert Radius');
    expect(panel).not.toContain('Contact emergency location');
    expect(panel).not.toContain('Call ambulance unit directly');
  });
});
