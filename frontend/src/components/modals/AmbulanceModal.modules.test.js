import fs from 'fs';
import path from 'path';

import { AmbulanceModal, buildAmbulancePayload } from './AmbulanceModal';
import {
  buildAmbulancePayload as buildAmbulancePayloadFromModel,
  crewToArray,
  getAmbulanceStationName,
  getAmbulanceStatusTone,
  normalizeAmbulanceForm,
} from './ambulance/ambulanceModalModel';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: () => true,
    isOrgAdmin: () => false,
    orgId: null,
    profile: { role: 'admin', hospital_ids: [] },
  }),
}));

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('AmbulanceModal module boundary', () => {
  const facade = 'src/components/modals/AmbulanceModal.jsx';
  const modulesDirectory = 'src/components/modals/ambulance';
  const productionModules = fs.readdirSync(modulesDirectory)
    .filter((name) => /\.(?:js|jsx)$/.test(name) && !/\.(?:test|spec)\./.test(name))
    .sort()
    .map((name) => path.join(modulesDirectory, name));

  it('keeps the compatibility entry point, props, and payload export stable', () => {
    const source = read(facade);

    expect(AmbulanceModal).toEqual(expect.any(Function));
    expect(buildAmbulancePayload).toBe(buildAmbulancePayloadFromModel);
    expect(source).toContain('export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode, listFilter }) =>');
    expect(source).toContain("from './ambulance/AmbulanceModalView'");
    expect(source).toContain("from './ambulance/useAmbulanceModalController'");
    expect(source).toContain("export { buildAmbulancePayload } from './ambulance/ambulanceModalModel';");
    expect(source).not.toContain('export default');
  });

  it('keeps every hand-maintained production owner below the active ceiling', () => {
    expect(lineCount(facade)).toBeLessThanOrEqual(60);
    expect(productionModules.length).toBeGreaterThanOrEqual(5);

    productionModules.forEach((filePath) => {
      expect({ filePath, lines: lineCount(filePath) }).toEqual({
        filePath,
        lines: expect.any(Number),
      });
      expect(lineCount(filePath)).toBeLessThan(500);
    });
  });

  it('keeps async receivers in the controller and visual ownership in render modules', () => {
    const controller = read(path.join(modulesDirectory, 'useAmbulanceModalController.js'));
    const view = read(path.join(modulesDirectory, 'AmbulanceModalView.jsx'));
    const sections = read(path.join(modulesDirectory, 'AmbulanceModalSections.jsx'));

    expect(controller).toContain("from '../../../services/ambulancesService'");
    expect(controller).toContain("from '../../../services/hospitalsService'");
    expect(controller).toContain("from '../../../services/notificationService'");
    expect(controller).toContain("from '../../../hooks/useAmbulancesMutations'");
    expect(controller).toContain('assertAmbulanceWriteScope(payload, actorScope)');
    expect(view).not.toContain('../../../services/');
    expect(sections).not.toContain('../../../services/');
    expect(view).toContain('<ModalShell');
    expect(view).toContain('<Loader2 className="mr-2 h-4 w-4 animate-spin" />');
    expect(view).toContain('aria-busy={loading}');
    expect(sections).toContain('Trip status changes stay in Requests.');
    expect(sections).toContain('Driver assignment needs provider and station proof.');
  });

  it('preserves form normalization, crew encoding, status tone, and station fallbacks', () => {
    expect(normalizeAmbulanceForm({
      vehicle_label: 'Legacy vehicle',
      eta: 'N/A',
      crew: ['Ada', '', 'Bola'],
    }, null, false, false)).toEqual(expect.objectContaining({
      vehicle_number: 'Legacy vehicle',
      eta: '',
      crew: 'Ada, Bola',
    }));
    expect(crewToArray(' Ada, , Bola ')).toEqual(['Ada', 'Bola']);
    expect(getAmbulanceStatusTone('en_route')).toContain('cyan');
    expect(getAmbulanceStationName(
      { station_name: 'Legacy station' },
      [{ id: 'hospital-1', name: 'Scoped station' }],
      'hospital-1'
    )).toBe('Scoped station');
    expect(getAmbulanceStationName(null, [], 'hospital-2')).toBe('Linked station');
  });
});
