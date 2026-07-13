import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { getAccessibleNav } from '../../config/navigation';
import { getMobileNavigationItems } from '../../config/mobileNavigation';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';
import { readAppImplementation } from '../../test/sourceEstates';

describe('GodModeMap Live Map contract', () => {
  const appSource = readAppImplementation;
  const pageSource = () => [
    fs.readFileSync('src/components/pages/GodModeMap.jsx', 'utf8'),
    ...fs.readdirSync('src/components/map/god-mode')
      .filter((name) => /\.(js|jsx)$/.test(name) && !name.endsWith('.test.js'))
      .sort()
      .map((name) => fs.readFileSync(`src/components/map/god-mode/${name}`, 'utf8')),
  ].join('\n');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileMap.jsx', 'utf8');
  const markerSource = () => fs.readFileSync('src/components/map/MarkerDetailPanel.jsx', 'utf8');
  const layerControlsSource = () => fs.readFileSync('src/components/map/MapLayerControls.jsx', 'utf8');
  const fallbackSource = () => fs.readFileSync('src/components/map/MapFallback.jsx', 'utf8');
  const mapContextSource = () => fs.readFileSync('src/contexts/MapContext.jsx', 'utf8');
  const mapPanelSource = () => fs.readFileSync('src/components/context/MapPanel.jsx', 'utf8');
  const layoutContextSource = () => fs.readFileSync('src/contexts/LayoutContext.jsx', 'utf8');
  const bottomBarSource = () => [
    fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
    fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
  ].join('\n');
  const googleRendererSource = () => [
    fs.readFileSync('src/components/map/MapRenderers/GoogleMapsRenderer.jsx', 'utf8'),
    ...fs.readdirSync('src/components/map/MapRenderers/google-maps')
      .filter((name) => /\.(js|jsx)$/.test(name) && !name.endsWith('.test.js'))
      .sort()
      .map((name) => fs.readFileSync(`src/components/map/MapRenderers/google-maps/${name}`, 'utf8')),
  ].join('\n');
  const leafletRendererSource = () => fs.readFileSync('src/components/map/MapRenderers/LeafletMapRenderer.jsx', 'utf8');
  const googleRefinerSource = () => fs.readFileSync('src/components/map/MapRefiner/GoogleMapsRefiner.jsx', 'utf8');
  const leafletRefinerSource = () => fs.readFileSync('src/components/map/MapRefiner/LeafletMapRefiner.jsx', 'utf8');
  const viewModelSource = () => fs.readFileSync('src/components/map/mapViewModel.js', 'utf8');
  const locationHookSource = () => fs.readFileSync('src/components/map/useOperatorLocation.js', 'utf8');
  const loadingSource = () => fs.readFileSync('src/components/map/MapLoadingState.jsx', 'utf8');
  const viewportSummarySource = () => fs.readFileSync('src/components/map/MapViewportSummary.jsx', 'utf8');
  const mapGuideSource = () => fs.readFileSync('docs/ui-ux/MAP_SYSTEM_GUIDE.md', 'utf8');
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
      .toBeLessThan(mapContext.indexOf('supabaseMapService.subscribeToHospitals'));
    expect(mapContext).toContain('const scheduleScopedRefresh = () => {');
    expect(mapContext).toContain('showLoading: false');
    expect(mapContext).not.toContain('subscribeToUsers');
    expect(mapContext).toContain("if (typeof unsub === 'function') unsub();");
    expect(mapContext).toContain('const refreshMapData = React.useCallback(() => {');
    expect(routeOwnsStartupDomains('/map')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/map')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('provider', '/map')).toEqual([]);
  });

  it('uses the shared full-canvas shell instead of a page-owned map card', () => {
    const page = pageSource();
    const mobile = mobileSource();

    expect(page).toContain("usePageHeader('Live Map', headerActions)");
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).not.toContain("import { Card } from");
    expect(page).not.toContain('<Card');
    expect(page).toContain('h-[calc(100dvh-4rem)]');
    expect(mobile).not.toContain('MobileKPIStrip');
    expect(mobile).toContain('absolute inset-0 pt-12');
    expect(layoutContextSource()).toContain('setIsScrolledDown(false)');
    expect(routeOwnsShellAction('/map')).toBe(true);
  });

  it('shows structural map loading on desktop and mobile without a blank canvas', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const loading = loadingSource();

    expect(page).toContain('loading && !hasMapPoints && !isSwitchingMap && <MapLoadingState />');
    expect(mobile).toContain('showInitialLoading && <MapLoadingState mobile />');
    expect(loading).toContain('aria-label="Loading live map"');
    expect(loading).toContain("mobile ? 'left-3 right-3 top-[calc(env(safe-area-inset-top)+3.5rem)]' : 'left-6 top-6 w-[18rem]'");
    expect(loading).toContain('bottom-[calc(env(safe-area-inset-bottom)+5rem)]');
  });

  it('keeps map reads and subscriptions behind the map service boundary', () => {
    const page = pageSource();
    const service = mapServiceSource();
    const viewModel = viewModelSource();

    expect(page).toContain('useMapContext()');
    expect(page).toContain('emergencyRequests.map(resolveMapEntityLocation).filter(Boolean)');
    expect(page).not.toContain('getNearbyHospitals');
    expect(page).not.toContain("from('emergency_requests')");
    expect(page).not.toContain("from('ambulances')");
    expect(page).not.toContain("from('hospitals')");
    expect(viewModel).toContain("import { decodePostGISGeometry } from '../../utils/locationUtils'");

    expect(service).toContain('async fetchInitialMapData(options = {})');
    expect(mapContextSource()).toContain('supabaseMapService.fetchInitialMapData({ quiet: true })');
    expect(service).toContain(".from('emergency_requests')");
    expect(service).toContain(".from('ambulances')");
    expect(service).toContain(".from('hospitals')");
    expect(service).toContain('applyAuthFilter(emergenciesQuery');
    expect(service).toContain('applyAuthFilter(ambulancesQuery');
    expect(service).toContain('subscribeToEmergencies(onChange)');
    expect(service).toContain('subscribeToAmbulances(onChange)');
    expect(service).toContain('subscribeToHospitals(onChange)');
    expect(service).not.toContain("table: 'users'");
    expect(service).not.toContain("rpc('nearby_hospitals'");
    expect(service).not.toContain('getNearbyHospitals');
    expect(service).toContain('const quiet = Boolean(options?.quiet)');
    expect(service).toContain('sourceState');
    expect(service).toContain(".select('*', { count: 'exact' })");
    expect(service).toContain(".select('id', { count: 'exact', head: true })");
    expect(service).toContain('facets: emergencyFacets');
    expect(service).toContain("const MAP_ACTIVE_ROUTE_STATUSES = ['in_progress', 'accepted', 'arrived'];");
    expect(service).toContain('const activeRoutesQuery = applyAuthFilter(');
    expect(service).toContain(".eq('service_type', 'ambulance')");
    expect(service).toContain(".in('status', MAP_ACTIVE_ROUTE_STATUSES)");
    expect(service).toContain('activeRoutes: {');
    expect(service).toContain('exact: !activeRoutesResult.error && Number.isFinite(activeRoutesResult.count)');
    expect(mobileSource()).toContain('requestSource?.facets?.[serviceType]?.total');
    expect(mobileSource()).not.toContain("{ id: 'all', label: 'All', value: requests.length }");
    expect(service).toContain("const MAP_REQUEST_TYPES = ['ambulance', 'bed'];");
    expect(mobileSource()).not.toContain("id: 'booking'");
    expect(`${service}\n${mobileSource()}`).not.toContain('critical_care');
    expect(service).toContain('const MAP_REQUEST_LIMIT = 100');
    expect(service).toContain('const MAP_ENTITY_LIMIT = 1000');
    expect(service).not.toContain('Fallback to basic hospital query');
    expect(mapContextSource()).toContain('Some live map data did not load.');
    expect(mapContextSource()).toContain('mapRouteActive && !hasAttemptedRouteLoad');
  });

  it('treats five kilometres as a scoped view lens, not an authorization expansion', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const viewModel = viewModelSource();
    const summary = viewportSummarySource();
    const googleRenderer = googleRendererSource();
    const leafletRenderer = leafletRendererSource();
    const refiners = `${googleRefinerSource()}\n${leafletRefinerSource()}`;

    expect(viewModel).toContain('export const MAP_VIEW_RADIUS_KM = 5');
    expect(viewModel).toContain("{ source: 'user', value: userLocation }");
    expect(viewModel).toContain("{ source: 'assignment', value: assignedEmergency }");
    expect(viewModel).toContain("{ source: 'selection', value: selectedMarker?.data }");
    expect(viewModel).toContain('getMapLensSummary');
    expect(viewModel).toContain('isWithinMapRadius');
    expect(page).toContain('radiusKm: MAP_VIEW_RADIUS_KM');
    expect(page).toContain('focusLocation={focusLocation}');
    expect(page).toContain('viewRadiusKm={MAP_VIEW_RADIUS_KM}');
    expect(mobile).toContain('<MapViewportSummary');
    expect(summary).toContain('Requests shown');
    expect(summary).toContain('Hospitals shown');
    expect(summary).toContain('Units shown');
    expect(googleRenderer).toContain('radiusKm={viewRadiusKm}');
    expect(leafletRenderer).toContain('radiusKm={viewRadiusKm}');
    expect(refiners).toContain('getRadiusBounds(center, radiusKm)');
    expect(googleRefinerSource()).toContain('getViewportZoom(map, bounds, padding)');
    expect(googleRefinerSource()).toContain('map.setZoom(targetZoom)');
    expect(mapGuideSource()).toContain('The 5 km value is a view lens, not a new data query or authorization rule.');
  });

  it('renders only the selected or assigned request route preview', () => {
    const page = pageSource();
    const viewModel = viewModelSource();
    const fallback = fallbackSource();
    const googleRenderer = googleRendererSource();
    const leafletRenderer = leafletRendererSource();

    expect(page).toContain("const routeEmergency = selectedMarker?.type === 'emergency'");
    expect(page).toContain(': driverActiveEmergency');
    expect(page).toContain('buildRoutePreview({');
    expect(viewModel).toContain("const TERMINAL_REQUEST_STATUSES = new Set(['completed', 'cancelled', 'canceled'])");
    expect(viewModel).toContain("kind: 'pickup'");
    expect(viewModel).toContain('dashed: true');
    expect(viewModel).toContain("kind: 'destination'");
    expect(viewModel).toContain('dashed: false');
    expect(googleRenderer).toContain('getRouteStrokeOptions');
    expect(googleRenderer).toContain("path: 'M 0,-1 0,1'");
    expect(leafletRenderer).toContain('dashArray: route.dashed ? "12, 12" : undefined');
    expect(fallback).toContain('route previews');
    expect(mapGuideSource()).toContain('Draw route context only for the selected active emergency');
  });

  it('keeps current map commands tied to named backend receivers', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const responseService = responseServiceSource();
    const driverService = driverServiceSource();

    expect(`${mobile}\n${marker}`).toContain('dispatchEmergency');
    expect(`${mobile}\n${marker}`).toContain('completeEmergency');
    expect(mobile).toContain('getEmergencyActionState(selectedMarker.data)');
    expect(marker).toContain('getEmergencyActionState(selectedMarker.data)');
    expect(mobile).toContain('emergencyActionState?.canDispatch');
    expect(marker).toContain('emergencyActionState?.canComplete');
    expect(page).toContain('updateResponderLocation(');
    expect(page).toContain('driverManagementService.updateTripStatus');
    expect(page).not.toContain('processedAmbulances[0]');
    expect(page).toContain('(request) => request?.responder_id === user.id');
    expect(page).toContain('driverActiveEmergency?.responder_id !== user?.id');
    expect(page).not.toContain('const ambulanceMatch =');

    expect(responseService).toContain("supabase.rpc('console_dispatch_emergency'");
    expect(responseService).toContain("supabase.rpc('nearby_ambulances'");
    expect(responseService).toContain("supabase.rpc('console_complete_emergency'");
    expect(responseService).toContain("supabase.rpc('console_update_responder_location'");
    expect(responseService).toContain('ambulanceIsWithinActorScope(ambulance, actor)');
    expect(driverService).toContain('async updateTripStatus(requestId, newStatus)');
    expect(responseService).not.toContain('Math.random');
  });

  it('keeps map commands progressive with visible feedback instead of native confirms', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const layerControls = layerControlsSource();
    const activeCommands = `${page}\n${mobile}\n${marker}\n${layerControls}`;

    expect(activeCommands).not.toContain('confirm(');
    expect(page).toContain('DRIVER_STATUS_COPY');
    expect(page).toContain("toast.loading('Sharing location...'");
    expect(page).toContain('const updatedRequest = await driverManagementService.updateTripStatus');
    expect(page).toContain('if (!updatedRequest) {');
    expect(page).toContain('toast.success(copy.success');
    expect(page.indexOf('if (!updatedRequest) {')).toBeLessThan(page.indexOf('toast.success(copy.success'));
    expect(page).toContain("aria-busy={driverAction === 'completed'}");
    expect(page).toContain("toast.loading('Requesting location...'");
    expect(page).toContain("toast.info('Using the operational area'");
    expect(locationHookSource()).toContain("status: 'locating'");
    expect(locationHookSource()).toContain("status: 'available'");
    expect(locationHookSource()).toContain("status: 'unavailable'");
    expect(mobile).toContain('const [mapCommand, setMapCommand] = useState(null)');
    expect(mobile).toContain('Confirm close');
    expect(mobile).toContain('aria-busy={mapCommand === "close"}');
    expect(marker).toContain('const [mapCommand, setMapCommand] = useState(null)');
    expect(marker).toContain('Confirm close');
    expect(marker).toContain('aria-busy={mapCommand === "close"}');
    expect(layerControls).toContain('aria-expanded={isExpanded}');
    expect(layerControls).toContain('aria-pressed={isVisible}');
    expect(page).toContain("window.addEventListener('mapRecenterRequested', handleRouteRecenter)");
    expect(page).toContain('<ConsoleModuleRail');
    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).toContain('Recenter');
    expect(bottomBarSource()).toContain("pathname.startsWith('/map') && canReach('/map')");
    expect(bottomBarSource()).toContain("label: 'Center map'");
    expect(bottomBarSource()).toContain("action: dispatchWindowEvent('mapRecenterRequested')");
    expect(mobile).not.toContain('aria-label="Center map"');
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
    expect(fallback).toContain('focusLocation = null');
    expect(fallback).toContain('viewRadiusKm = MAP_VIEW_RADIUS_KM');
    expect(fallback).toContain('isWithinMapRadius(marker, focusLocation, viewRadiusKm)');
    expect(fallback).toContain("setSelectedMarker?.({ type: marker.type, data: marker.data })");
    expect(fallback).toContain("const MarkerElement = isInteractive ? 'button' : 'div'");
    expect(fallback).toContain("'aria-pressed': isSelected");
    expect(fallback).toContain(": { role: 'img' }");
    expect(fallback).toContain('Select a point');
    expect(fallback).not.toMatch(/Map Preview Mode|simulated view|Simulated markers|Google Maps API requires domain authorization/i);
  });

  it('keeps interactive Google markers named and keyboard reachable', () => {
    const renderer = googleRendererSource();

    expect(renderer).toContain("container.setAttribute('role', 'button')");
    expect(renderer).toContain('container.tabIndex = 0');
    expect(renderer).toContain("container.addEventListener('keydown', handleKeyDown)");
    expect(renderer).toContain("if (!['Enter', ' '].includes(event.key)");
    expect(renderer).toContain("ariaLabel={markerLabel('emergency', request)}");
    expect(renderer).toContain("ariaLabel={markerLabel('hospital', hospital)}");
    expect(renderer).toContain("title={markerLabel('ambulance', ambulance)}");
  });

  it('keeps visible map copy simple while preserving command receivers', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const marker = markerSource();
    const activeCopy = `${page}\n${mobile}\n${marker}`;

    expect(activeCopy).toContain('Current request');
    expect(activeCopy).toContain('Assigned');
    expect(activeCopy).toContain('Not recorded');
    expect(activeCopy).toContain('Send unit');
    expect(activeCopy).toContain('Close request');
    expect(activeCopy).toContain('canManageRequests');
    expect(activeCopy).not.toMatch(/Current signal|Delayed signal|Offline signal/i);
    expect(activeCopy).not.toMatch(/Driver Mission|Ops Telemetry|Telemetry:|Mission Complete|Dispatch Unit|Dispatching|Emergency dispatched|dispatch failed/i);
  });

  it('promotes the repaired Live Map surfaces into the default visual hardgate', () => {
    const hardgate = hardgateSource();

    expect(hardgate).toContain('src/components/pages/GodModeMap.jsx');
    expect(hardgate).toContain('src/components/mobile/MobileMap.jsx');
    expect(hardgate).toContain('src/components/map/MarkerDetailPanel.jsx');
    expect(hardgate).toContain('src/components/map/MapLayerControls.jsx');
    expect(hardgate).toContain('src/components/map/MapFallback.jsx');
    expect(hardgate).toContain('src/components/map/MapLoadingState.jsx');
    expect(hardgate).toContain('src/components/map/MapViewportSummary.jsx');
    expect(hardgate).toContain('src/components/map/MapRefiner/GoogleMapsRefiner.jsx');
    expect(hardgate).toContain('src/components/map/MapRefiner/LeafletMapRefiner.jsx');
    expect(hardgate).toContain('src/components/map/MapRenderers/GoogleMapsRenderer.jsx');
    expect(hardgate).toContain('src/components/map/MapRenderers/LeafletMapRenderer.jsx');
    expect(hardgate).toContain('src/components/context/MapPanel.jsx');
  });

  it('keeps map geometry on semantic squircle roles and token-only elevation', () => {
    const mobile = mobileSource();
    const marker = markerSource();
    const layers = layerControlsSource();
    const fallback = fallbackSource();
    const panel = mapPanelSource();
    const page = pageSource();
    const googleRenderer = googleRendererSource();
    const mountedMapSurfaces = [
      page,
      mobile,
      marker,
      layers,
      fallback,
      panel,
      googleRenderer,
      leafletRendererSource(),
      googleRefinerSource(),
      leafletRefinerSource(),
      loadingSource(),
      viewportSummarySource(),
    ].join('\n');

    expect(mountedMapSurfaces).not.toMatch(/\brounded-(?:full|xl|2xl|3xl|\[[^\]]+\])\b/);
    expect(mountedMapSurfaces).not.toMatch(/\bsquircle(?:-[a-z]+)?\b|\bgeo-round\b/);
    expect(mountedMapSurfaces).not.toContain('shadow-premium');
    expect(mountedMapSurfaces).not.toMatch(/shadow-\[[^\]]+\]/);

    expect(mobile).toContain('rounded-sheet');
    expect(mobile).toContain('items-center justify-center rounded-icon shadow-inner');
    expect(mobile).toContain('space-y-3 rounded-inner bg-muted/20 p-4');
    expect(mobile).toContain('rounded-button px-3 py-2 text-left');
    expect(layers).toContain('rounded-pill bg-card/68 p-1 shadow-e3');
    expect(fallback).toContain('rounded-card bg-background/72');
    expect(fallback).toContain('rounded-pill shadow-e2');
    expect(panel).toContain('gap-2 rounded-button bg-background/45');
    expect(panel).toContain('rounded-card bg-card/60 p-3');
    expect(marker).toContain('rounded-inner bg-background p-4 shadow-e1');
    expect(marker).toContain('<a href={`tel:${selectedMarker.data.phone}`}>');
    expect(page).not.toContain('simulatedSessionId');
    expect(mobile).not.toContain('simulatedSessionId');
    expect(googleRenderer).not.toContain('simulatedSessionId');
    expect(mountedMapSurfaces).not.toMatch(/Session ID|NODE-|PENDING\.\.\./);
  });

  it('uses icon close controls and ASCII marker separators in active map details', () => {
    const mobile = mobileSource();
    const marker = markerSource();

    expect(mobile).toContain("import {");
    expect(mobile).toContain('X');
    expect(mobile).toContain('aria-label="Close details"');
    expect(mobile).toContain("{selectedMarker.type} - {statusLabel(selectedMarker.data.status, 'Status not recorded')}");
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
      loadingSource(),
      viewportSummarySource(),
      googleRefinerSource(),
      leafletRefinerSource(),
      googleRendererSource(),
      leafletRendererSource(),
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
    expect(panel).toContain('Fleet shown');
    expect(panel).toContain('Hospitals shown');
    expect(panel).toContain("requestWindowBounded ? 'Latest 100' : 'Current view'");
    expect(panel).not.toContain('Route-owned');
    expect(panel).not.toContain('Closed requests');
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
