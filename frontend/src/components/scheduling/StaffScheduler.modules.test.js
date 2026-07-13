import fs from 'fs';
import path from 'path';
import StaffScheduler from './StaffScheduler';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

const collectProductionFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectProductionFiles(entryPath);
    if (!/\.(?:js|jsx)$/.test(entry.name) || entry.name.includes('.test.')) return [];
    return [entryPath];
  });

describe('StaffScheduler module boundary', () => {
  const facade = 'src/components/scheduling/StaffScheduler.jsx';
  const modulesDirectory = 'src/components/scheduling/staff-scheduler';
  const productionModules = collectProductionFiles(modulesDirectory);
  const estate = [facade, ...productionModules].map(read).join('\n');

  it('keeps the default entry point stable and focused', () => {
    const source = read(facade);

    expect(typeof StaffScheduler).toBe('function');
    expect(source).toContain('const StaffScheduler = () =>');
    expect(source).toContain('useStaffSchedulerController()');
    expect(source).toContain('<StaffSchedulerView controller={controller} />');
    expect(source).toContain('export default StaffScheduler;');
    expect(lineCount(facade)).toBeLessThanOrEqual(30);
  });

  it('keeps every hand-maintained production owner below the modularization ceiling', () => {
    expect(productionModules.length).toBeGreaterThanOrEqual(7);
    productionModules.forEach((filePath) => {
      expect(lineCount(filePath)).toBeLessThan(300);
    });
  });

  it('keeps the dormant scheduler local-only and receiver-free', () => {
    expect(estate).not.toMatch(/supabase|staffSchedulingService|doctor_schedules/);
    expect(estate).toContain('createInitialStaffList');
    expect(estate).toContain('createInitialShifts');
    expect(estate).toContain('setShifts([...shifts, shift])');

    const mountedReferences = collectProductionFiles('src')
      .filter((filePath) => !filePath.replaceAll('\\', '/').includes('/components/scheduling/'))
      .filter((filePath) => read(filePath).includes('StaffScheduler'));

    expect(mountedReferences).toEqual([]);
  });

  it('preserves the existing controls, layout, motion, and close paths', () => {
    const modal = read(path.join(modulesDirectory, 'AddShiftModal.jsx'));

    expect(estate).toContain('Staff Scheduling');
    expect(estate).toContain('Manage staff shifts and schedules');
    expect(estate).toContain('Search staff...');
    expect(estate).toContain('grid grid-cols-1 lg:grid-cols-4 gap-6');
    expect(estate).toContain('grid grid-cols-7 gap-2');
    expect(estate).toContain('rounded-modal bg-card/95');
    expect(estate).toContain('initial={{ opacity: 0, y: 10 }}');
    expect(modal.match(/setShowAddModal\(false\)/g)).toHaveLength(3);
    expect(modal).toContain('event.stopPropagation()');
    expect(modal).toContain('onClick={controller.handleAddShift}');
  });
});
