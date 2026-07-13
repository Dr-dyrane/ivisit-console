import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('GodModeMap module ownership', () => {
  const facade = read('src/components/pages/GodModeMap.jsx');
  const controller = read('src/components/map/god-mode/useGodModeMapController.js');
  const desktop = read('src/components/map/god-mode/GodModeMapDesktop.jsx');
  const driverCard = read('src/components/map/god-mode/DriverAssignmentCard.jsx');
  const presentation = read('src/components/map/god-mode/mapPresentation.js');
  const googleRenderer = read('src/components/map/MapRenderers/GoogleMapsRenderer.jsx');
  const googleMarkerLayers = read('src/components/map/MapRenderers/google-maps/GoogleMapMarkerLayers.jsx');
  const googleOverlayMarker = read('src/components/map/MapRenderers/google-maps/GoogleMapsOverlayMarker.jsx');
  const googlePresentation = read('src/components/map/MapRenderers/google-maps/presentation.js');

  it('keeps the route facade and map modules within focused size limits', () => {
    expect(facade.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(controller.split(/\r?\n/).length).toBeLessThanOrEqual(400);
    expect(desktop.split(/\r?\n/).length).toBeLessThanOrEqual(260);
    expect(driverCard.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(presentation.split(/\r?\n/).length).toBeLessThanOrEqual(100);
    expect(googleRenderer.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(googleMarkerLayers.split(/\r?\n/).length).toBeLessThanOrEqual(240);
    expect(googleOverlayMarker.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(googlePresentation.split(/\r?\n/).length).toBeLessThanOrEqual(180);
  });

  it('keeps shell composition thin while controller and desktop ownership stay separate', () => {
    expect(facade).toContain("from '../map/god-mode/useGodModeMapController'");
    expect(facade).toContain("from '../map/god-mode/GodModeMapDesktop'");
    expect(facade).toContain('<MobileMap');
    expect(facade).toContain('<GodModeMapDesktop');
    expect(controller).toContain('useMapContext()');
    expect(controller).toContain('updateResponderLocation(');
    expect(controller).toContain('driverManagementService.updateTripStatus');
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

  it('keeps the existing route import stable', () => {
    expect(facade).toContain('export const GodModeMap');
    expect(facade).not.toContain('export default');
  });
});
