import fs from 'fs';
import path from 'path';
import StaffSchedulingModal from './StaffSchedulingModal';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('StaffSchedulingModal module boundary', () => {
  const facade = 'src/components/modals/StaffSchedulingModal.jsx';
  const modulesDirectory = 'src/components/modals/staff-scheduling';
  const productionModules = fs.readdirSync(modulesDirectory)
    .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.includes('.test.'))
    .map((name) => path.join(modulesDirectory, name));

  it('keeps the default entry point and public props stable', () => {
    const source = read(facade);

    expect(typeof StaffSchedulingModal).toBe('function');
    expect(source).toContain('const StaffSchedulingModal = ({ isOpen, onClose, hospitalId, existingStaff = [] }) =>');
    expect(source).toContain("from './staff-scheduling/useStaffSchedulingModalController'");
    expect(source).toContain("from './staff-scheduling/StaffSchedulingModalView'");
    expect(source).toContain('export default StaffSchedulingModal;');
  });

  it('keeps the facade and each extracted production owner focused', () => {
    expect(lineCount(facade)).toBeLessThanOrEqual(60);
    expect(productionModules.length).toBeGreaterThanOrEqual(6);

    productionModules.forEach((filePath) => {
      expect(lineCount(filePath)).toBeLessThanOrEqual(300);
    });
  });

  it('keeps service effects in the controller and visual states in render owners', () => {
    const controller = read(path.join(modulesDirectory, 'useStaffSchedulingModalController.js'));
    const view = read(path.join(modulesDirectory, 'StaffSchedulingModalView.jsx'));
    const overview = read(path.join(modulesDirectory, 'StaffScheduleOverview.jsx'));
    const form = read(path.join(modulesDirectory, 'StaffScheduleForm.jsx'));

    expect(controller).toContain("from '../../../services/staffSchedulingService'");
    expect(controller).toContain('getStaffSchedules({');
    expect(controller).toContain('checkScheduleConflicts(');
    expect(controller).toContain('createStaffSchedule(scheduleData)');
    expect(controller).toContain("updateStaffSchedule(selectedStaff.id, {");
    expect(controller).toContain('deleteStaffSchedule(scheduleId)');
    expect(view).not.toContain('staffSchedulingService');
    expect(overview).not.toContain('staffSchedulingService');
    expect(form).not.toContain('staffSchedulingService');
    expect(overview).toContain('No schedules found');
    expect(form).toContain("activeTab === 'add' ? handleAddSchedule : handleUpdateSchedule");
  });

  it('preserves modal layering, safe areas, and dormant route authority', () => {
    const controller = read(path.join(modulesDirectory, 'useStaffSchedulingModalController.js'));
    const view = read(path.join(modulesDirectory, 'StaffSchedulingModalView.jsx'));
    const hospitalsPage = read('src/components/pages/HospitalsPage.jsx');

    expect(view).toContain('fixed inset-0 z-[120]');
    expect(view).toContain('role="dialog"');
    expect(view).toContain('aria-modal="true"');
    expect(view).toContain('var(--safe-top, 0px)');
    expect(view).toContain('var(--safe-bottom, 0px)');
    expect(controller).toContain("document.getElementById('dynamic-bottom-bar')");
    expect(controller).toContain("bottomBar.style.display = 'none'");
    expect(controller).toContain('bottomBar.style.display = previousDisplay');
    expect(hospitalsPage).not.toContain('StaffSchedulingModal');
  });
});
