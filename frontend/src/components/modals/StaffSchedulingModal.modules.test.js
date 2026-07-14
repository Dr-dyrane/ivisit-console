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
    expect(source).toContain('initialDoctor = null');
    expect(source).toContain('scheduleId = null');
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

  it('keeps query and mutation effects in the controller and visual states in render owners', () => {
    const controller = read(path.join(modulesDirectory, 'useStaffSchedulingModalController.js'));
    const view = read(path.join(modulesDirectory, 'StaffSchedulingModalView.jsx'));
    const overview = read(path.join(modulesDirectory, 'StaffScheduleOverview.jsx'));
    const form = read(path.join(modulesDirectory, 'StaffScheduleForm.jsx'));

    expect(controller).toContain("from '../../../hooks/staff-scheduling/useConsoleDoctorSchedulesQuery'");
    expect(controller).toContain("from '../../../hooks/staff-scheduling/useConsoleDoctorScheduleMutations'");
    expect(controller).toContain('useConsoleDoctorSchedulesQuery({');
    expect(controller).toContain('useScheduleFacilitiesQuery(readsEnabled)');
    expect(controller).toContain('checkScheduleConflicts(');
    expect(controller).toContain('mutations.create.mutateAsync(draft)');
    expect(controller).toContain('mutations.update.mutateAsync({ scheduleId: selectedSchedule.id, schedule: draft })');
    expect(controller).toContain('mutations.remove.mutateAsync(deleteCandidate.id)');
    expect(controller).toContain('mutations.confirmTimezone.mutateAsync({');
    expect(view).not.toContain('staffSchedulingService');
    expect(overview).not.toContain('staffSchedulingService');
    expect(form).not.toContain('staffSchedulingService');
    expect(overview).toContain('No shifts in this window');
    expect(overview).toContain('Confirm entered timezone');
    expect(overview).toContain('Existing timezone value');
    expect(form).toContain('onSubmit={(event) => { event.preventDefault(); submit(); }}');
  });

  it('uses shared modal chrome and leaves hospital-page ownership dormant', () => {
    const controller = read(path.join(modulesDirectory, 'useStaffSchedulingModalController.js'));
    const view = read(path.join(modulesDirectory, 'StaffSchedulingModalView.jsx'));
    const hospitalsPage = read('src/components/pages/HospitalsPage.jsx');

    expect(view).toContain("import { ModalShell } from '../../ui/ModalShell'");
    expect(view).toContain('<ModalShell');
    expect(view).toContain('managed');
    expect(view).not.toContain('fixed inset-0');
    expect(controller).not.toContain("document.getElementById('dynamic-bottom-bar')");
    expect(hospitalsPage).not.toContain('StaffSchedulingModal');
  });

  it('requires explicit timezone entry and reread proof before enabling schedule writes', () => {
    const controller = read(path.join(modulesDirectory, 'useStaffSchedulingModalController.js'));
    const overview = read(path.join(modulesDirectory, 'StaffScheduleOverview.jsx'));

    expect(controller).toContain("const [timezoneInput, setTimezoneInput] = useState('')");
    expect(controller).toContain('isValidIanaTimezone(requestedTimezone)');
    expect(controller).toContain('const refreshed = await facilitiesQuery.refetch()');
    expect(controller).toContain('confirmed.timezone !== requestedTimezone');
    expect(overview).toContain('value={timezoneInput}');
    expect(overview).not.toContain('onClick={() => confirmTimezone(selectedFacility.timezone)}');
  });
});
