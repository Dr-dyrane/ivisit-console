import fs from 'fs';

import DoctorModalDefault, {
  buildStaffPayload,
  DoctorModal,
  normalizeForm,
} from './DoctorModal';
import {
  buildStaffPayload as buildStaffPayloadFromModel,
  getFacilityName,
  getInitials,
  getStaffStatusMeta,
  normalizeForm as normalizeFormFromModel,
} from './doctor/doctorModalModel';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: () => true,
    isOrgAdmin: () => false,
    profile: { role: 'admin', hospital_ids: [] },
  }),
}));

const facadePath = 'src/components/modals/DoctorModal.jsx';
const modulePaths = fs.readdirSync('src/components/modals/doctor')
  .filter((file) => /\.(js|jsx)$/.test(file) && !file.includes('.test.'))
  .sort()
  .map((file) => `src/components/modals/doctor/${file}`);

describe('DoctorModal module boundary', () => {
  it('keeps the compatibility facade thin and preserves export identity', () => {
    const facade = fs.readFileSync(facadePath, 'utf8');

    expect(facade.split(/\r?\n/).length).toBeLessThan(500);
    expect(facade).toContain("from './doctor/DoctorModalView'");
    expect(facade).toContain("from './doctor/useDoctorModalController'");
    expect(facade).toContain("from './doctor/doctorModalModel'");
    expect(DoctorModalDefault).toBe(DoctorModal);
    expect(buildStaffPayload).toBe(buildStaffPayloadFromModel);
    expect(normalizeForm).toBe(normalizeFormFromModel);
  });

  it('keeps every production module below the active pack threshold', () => {
    for (const path of [facadePath, ...modulePaths]) {
      const source = fs.readFileSync(path, 'utf8');
      expect({ path, lines: source.split(/\r?\n/).length }).toEqual({
        path,
        lines: expect.any(Number),
      });
      expect(source.split(/\r?\n/).length).toBeLessThan(500);
    }
  });

  it('preserves status, identity, and facility display projections', () => {
    const view = fs.readFileSync('src/components/modals/doctor/DoctorModalView.jsx', 'utf8');

    expect(view).toContain('<Label htmlFor={htmlFor}');
    expect(view).toContain('htmlFor="doctor-specialty"');
    expect(view).toContain('htmlFor="doctor-email"');
    expect(view).toContain('htmlFor="doctor-notes"');
    expect(getStaffStatusMeta('available', false).label).toBe('Unavailable for assignment');
    expect(getStaffStatusMeta('future_lifecycle', true).label).toBe('Future Lifecycle');
    expect(getFacilityName(
      { hospitals: { name: 'Joined facility' } },
      [{ id: 'facility-1', name: 'Scoped facility' }],
      'facility-1'
    )).toBe('Joined facility');
    expect(getFacilityName(null, [], 'facility-1')).toBe('Facility unavailable');
    expect(getInitials('Ada Lovelace Doctor')).toBe('AL');
  });
});
