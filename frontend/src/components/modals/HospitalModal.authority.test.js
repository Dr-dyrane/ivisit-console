import fs from 'fs';
import { buildHospitalSavePayload } from './HospitalModal';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: () => true }),
}));

describe('HospitalModal verification authority', () => {
  const formData = {
    id: 'hospital-1',
    name: 'Test Hospital',
    verified: true,
    verification_status: 'approved',
  };

  it('preserves verification fields for platform admins', () => {
    expect(buildHospitalSavePayload(formData, true)).toEqual(formData);
  });

  it('strips verification fields for organization admins', () => {
    expect(buildHospitalSavePayload(formData, false)).toEqual({
      id: 'hospital-1',
      name: 'Test Hospital',
    });
  });

  it('keeps non-admin verification read-only in the mounted modal', () => {
    const source = fs.readFileSync('src/components/modals/HospitalModal.jsx', 'utf8');

    expect(source).toContain('const canManageVerification = Boolean(isAdmin?.());');
    expect(source).toContain('buildHospitalSavePayload(formData, canManageVerification)');
    expect(source).toContain('isView || !canManageVerification');
    expect(source).toContain('Verification is managed by platform administrators');
  });
});
