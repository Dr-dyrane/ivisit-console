import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('GodModeMap module ownership', () => {
  const facade = read('src/components/pages/GodModeMap.jsx');
  const controller = read('src/components/map/god-mode/useGodModeMapController.js');
  const desktop = read('src/components/map/god-mode/GodModeMapDesktop.jsx');
  const driverCard = read('src/components/map/god-mode/DriverAssignmentCard.jsx');
  const driverModel = read('src/components/map/god-mode/driverAssignmentModel.js');
  const driverTracking = read('src/components/map/god-mode/useDriverLocationTracking.js');
  const presentation = read('src/components/map/god-mode/mapPresentation.js');
  const googleRenderer = read('src/components/map/MapRenderers/GoogleMapsRenderer.jsx');
  const googleMarkerLayers = read('src/components/map/MapRenderers/google-maps/GoogleMapMarkerLayers.jsx');
  const googleOverlayMarker = read('src/components/map/MapRenderers/google-maps/GoogleMapsOverlayMarker.jsx');
  const googlePresentation = read('src/components/map/MapRenderers/google-maps/presentation.js');
  const mobileMap = read('src/components/mobile/MobileMap.jsx');
  const mobileMapCanvas = read('src/components/mobile/mobile-map/MobileMapCanvas.jsx');
  const mobileMapChrome = read('src/components/mobile/mobile-map/MobileMapChrome.jsx');
  const mobileMapDetails = read('src/components/mobile/mobile-map/MobileMapDetailSheet.jsx');
  const mobileDriverAssignment = read('src/components/mobile/mobile-map/MobileDriverAssignmentSheet.jsx');
  const mobileMapController = read('src/components/mobile/mobile-map/useMobileMapController.js');
  const mobileMapPresentation = read('src/components/mobile/mobile-map/mobileMapPresentation.js');

  it('keeps the route facade and map modules within focused size limits', () => {
    expect(facade.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(controller.split(/\r?\n/).length).toBeLessThanOrEqual(400);
    expect(desktop.split(/\r?\n/).length).toBeLessThanOrEqual(260);
    expect(driverCard.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(driverModel.split(/\r?\n/).length).toBeLessThanOrEqual(120);
    expect(driverTracking.split(/\r?\n/).length).toBeLessThanOrEqual(320);
    expect(presentation.split(/\r?\n/).length).toBeLessThanOrEqual(100);
    expect(googleRenderer.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(googleMarkerLayers.split(/\r?\n/).length).toBeLessThanOrEqual(240);
    expect(googleOverlayMarker.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(googlePresentation.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(mobileMap.split(/\r?\n/).length).toBeLessThanOrEqual(120);
    expect(mobileMapCanvas.split(/\r?\n/).length).toBeLessThanOrEqual(160);
    expect(mobileMapChrome.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(mobileMapDetails.split(/\r?\n/).length).toBeLessThanOrEqual(240);
    expect(mobileDriverAssignment.split(/\r?\n/).length).toBeLessThanOrEqual(320);
    expect(mobileMapController.split(/\r?\n/).length).toBeLessThanOrEqual(160);
    expect(mobileMapPresentation.split(/\r?\n/).length).toBeLessThanOrEqual(80);
  });

  it('keeps shell composition thin while controller and desktop ownership stay separate', () => {
    expect(facade).toContain("from '../map/god-mode/useGodModeMapController'");
    expect(facade).toContain("from '../map/god-mode/GodModeMapDesktop'");
    expect(facade).toContain('<MobileMap');
    expect(facade).toContain('<GodModeMapDesktop');
    expect(controller).toContain('useMapContext()');
    expect(controller).toContain('useDriverLocationTracking({');
    expect(controller).not.toContain('updateResponderLocation(');
    expect(driverTracking).toContain('driverManagementService.reportTelemetry({');
    expect(driverTracking).not.toContain('updateResponderLocation(');
    expect(driverTracking).toContain('navigator.geolocation.watchPosition');
    expect(controller).toContain('driverManagementService.acceptOffer');
    expect(controller).toContain('driverManagementService.completeAssignment');
    expect(desktop).toContain('<GoogleMapsRenderer');
    expect(desktop).toContain('<LeafletMapRenderer');
    expect(desktop).toContain('<DriverAssignmentCard');
    expect(desktop).not.toContain('updateResponderLocation(');
    expect(desktop).not.toContain('driverManagementService');
  });

  it('keeps Google map composition, marker lifecycle, and presentation ownership separate', () => {
    expect(googleRenderer).toContain("from './google-maps/GoogleMapMarkerLayers'");
    expect(googleRenderer).toContain("from './google-maps/presentation'");
    expect(googleRenderer).not.toContain('document.createElement');
    expect(googleMarkerLayers).toContain('<AdvancedMarker');
    expect(googleMarkerLayers).toContain('<GoogleMapsOverlayMarker');
    expect(googleOverlayMarker).toContain('class DomOverlay extends window.google.maps.OverlayView');
    expect(googlePresentation).toContain('export const getRouteStrokeOptions');
    expect(googlePresentation).toContain('export const markerLabel');
  });

  it('keeps mobile map canvas, chrome, commands, and details separately owned', () => {
    expect(mobileMap).toContain("from './mobile-map/MobileMapCanvas'");
    expect(mobileMap).toContain("from './mobile-map/MobileMapChrome'");
    expect(mobileMap).toContain("from './mobile-map/MobileMapDetailSheet'");
    expect(mobileMap).toContain("from './mobile-map/MobileDriverAssignmentSheet'");
    expect(mobileMap).toContain("from './mobile-map/useMobileMapController'");
    expect(mobileMapCanvas).toContain('<GoogleMapsRenderer');
    expect(mobileMapCanvas).toContain('<LeafletMapRenderer');
    expect(mobileMapCanvas).toContain("style={{ bottom: usesCompactNavigation ? 'var(--total-bottom-clearance)' : '0px' }}");
    expect(mobileMapChrome).toContain('<MapViewportSummary');
    expect(mobileMapDetails).toContain('emergencyActionState?.canDispatch');
    expect(mobileMapController).toContain('dispatchEmergency(');
    expect(mobileMapController).toContain('completeEmergency(');
    expect(mobileMapPresentation).toContain('export const getMobileMapKpis');
  });

  it('keeps the existing route import stable', () => {
    expect(facade).toContain('export const GodModeMap');
    expect(facade).not.toContain('export default');
  });
});
