import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('GodModeMap module ownership', () => {
  const facade = read('src/components/pages/GodModeMap.jsx');
  const controller = read('src/components/map/god-mode/useGodModeMapController.js');
  const desktop = read('src/components/map/god-mode/GodModeMapDesktop.jsx');
  const driverCard = read('src/components/map/god-mode/DriverAssignmentCard.jsx');
  const presentation = read('src/components/map/god-mode/mapPresentation.js');

  it('keeps the route facade and map modules within focused size limits', () => {
    expect(facade.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(controller.split(/\r?\n/).length).toBeLessThanOrEqual(400);
    expect(desktop.split(/\r?\n/).length).toBeLessThanOrEqual(260);
    expect(driverCard.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(presentation.split(/\r?\n/).length).toBeLessThanOrEqual(100);
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

  it('keeps the existing route import stable', () => {
    expect(facade).toContain('export const GodModeMap');
    expect(facade).not.toContain('export default');
  });
});
