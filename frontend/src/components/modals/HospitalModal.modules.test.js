import fs from 'fs';
import path from 'path';

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('HospitalModal module boundary', () => {
  const facade = 'src/components/modals/HospitalModal.jsx';
  const modulesDirectory = 'src/components/modals/hospital';

  it('keeps the compatibility entry point and verification payload export stable', () => {
    const source = read(facade);

    expect(source).toContain('export const HospitalModal =');
    expect(source).toContain("export { buildHospitalSavePayload } from './hospital/hospitalModalModel';");
    expect(source).toContain('<HospitalCapacitySection');
    expect(source).toContain('<HospitalSystemSection');
  });

  it('keeps the facade and each production owner within the modal ceiling', () => {
    const moduleFiles = fs.readdirSync(modulesDirectory)
      .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(lineCount(facade)).toBeLessThanOrEqual(300);
    expect(moduleFiles.length).toBeGreaterThanOrEqual(5);
    moduleFiles.forEach((filePath) => {
      expect(lineCount(filePath)).toBeLessThanOrEqual(300);
    });
  });

  it('keeps reservation reads in the bed-data owner instead of the modal facade', () => {
    const facadeSource = read(facade);
    const bedDataSource = read(path.join(modulesDirectory, 'useHospitalBedData.js'));

    expect(facadeSource).not.toContain('bedManagementService.');
    expect(bedDataSource).toContain('bedManagementService.getActiveReservations(hospitalId)');
    expect(bedDataSource).toContain('bedManagementService.subscribeToReservations(hospitalId, loadBedData)');
  });
});
