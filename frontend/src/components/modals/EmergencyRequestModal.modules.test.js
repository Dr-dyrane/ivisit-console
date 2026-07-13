import fs from 'fs';
import path from 'path';
import { readSourceEstate } from '../../test/sourceEstates';
import { EmergencyRequestModal } from './EmergencyRequestModal';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('EmergencyRequestModal module boundary', () => {
  const facade = 'src/components/modals/EmergencyRequestModal.jsx';
  const modulesDirectory = 'src/components/modals/emergency-request';
  const estate = () => readSourceEstate({
    files: [facade],
    directories: [modulesDirectory],
  });

  it('keeps the named compatibility entry point and public props stable', () => {
    const source = read(facade);

    expect(EmergencyRequestModal).toEqual(expect.any(Function));
    expect(source).toContain('export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) =>');
    expect(source).toContain('useEmergencyRequestModalController({');
    expect(source).toContain('<EmergencyRequestModalView');
    expect(source).toContain('isOpen={isOpen}');
    expect(source).toContain('onClose={onClose}');
  });

  it('keeps the facade and every production module below the modal ceiling', () => {
    const moduleFiles = fs.readdirSync(modulesDirectory)
      .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.includes('.test.'))
      .map((name) => path.join(modulesDirectory, name));

    expect(lineCount(facade)).toBeLessThanOrEqual(100);
    expect(moduleFiles.length).toBeGreaterThanOrEqual(7);
    moduleFiles.forEach((filePath) => {
      expect({ filePath, lines: lineCount(filePath) }).toEqual({
        filePath,
        lines: expect.any(Number),
      });
      expect(lineCount(filePath)).toBeLessThanOrEqual(300);
    });
  });

  it('isolates data reads, commands, orchestration, and presentation', () => {
    const facadeSource = read(facade);
    const optionSource = read(path.join(modulesDirectory, 'useEmergencyRequestOptions.js'));
    const commandSource = read(path.join(modulesDirectory, 'requestCommands.js'));
    const viewSource = [
      read(path.join(modulesDirectory, 'EmergencyRequestModalView.jsx')),
      read(path.join(modulesDirectory, 'EmergencyRequestFields.jsx')),
      read(path.join(modulesDirectory, 'RequestStatusBar.jsx')),
    ].join('\n');

    expect(facadeSource).not.toContain('services/');
    expect(facadeSource).not.toContain('useAuth');
    expect(optionSource).toContain('getEmergencyPatientOptions()');
    expect(optionSource).toContain('getEmergencyCreateFacilityOptions()');
    expect(commandSource).toContain('createEmergencyRequest(payload)');
    expect(commandSource).toContain('updateEmergencyRequest(request.id, payload)');
    expect(viewSource).not.toContain('services/');
    expect(viewSource).not.toContain('useAuth');
  });

  it('keeps modal, RBAC, lazy-read, and requester identity contracts in the full estate', () => {
    const source = estate();

    expect(source).toContain("import { ModalShell } from '../../ui/ModalShell';");
    expect(source).toContain('if (!isOpen || isView) return undefined;');
    expect(source).toContain('[isOpen, isView]');
    expect(source).toContain('if (!isOpen || !isCreate || (!isAdmin() && !isOrgAdmin())) return undefined;');
    expect(source).toContain('const facilityRequired = isCreate && isOrgAdmin();');
    expect(source).toContain('const showFacilityControl = isCreate && (isAdmin() || isOrgAdmin());');
    expect(source).toContain('options.users.find((user) => user.id === formData.user_id)');
    expect(source).toContain('|| request?.profiles');
    expect(source).toContain('|| request?.profile');
    expect(source).not.toContain("supabase.from('profiles')");
    expect(source).not.toContain('request.organization_id || request.hospital_id');
  });
});
