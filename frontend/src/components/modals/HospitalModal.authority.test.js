import { buildHospitalSavePayload } from './HospitalModal';
import { readSourceEstate } from '../../test/sourceEstates';

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
    available_beds: 4,
    total_beds: 12,
    ambulances_count: 2,
    emergency_wait_time_minutes: 15,
    status: 'available',
    image: 'https://legacy.example/facility.jpg',
  };

  it('preserves verification fields for platform admins but strips live operational fields', () => {
    expect(buildHospitalSavePayload(formData, true)).toEqual({
      id: 'hospital-1',
      name: 'Test Hospital',
      verified: true,
      verification_status: 'approved',
    });
  });

  it('strips verification fields for organization admins', () => {
    expect(buildHospitalSavePayload(formData, false)).toEqual({
      id: 'hospital-1',
      name: 'Test Hospital',
    });
  });

  it('keeps non-admin verification read-only in the mounted modal', () => {
    const source = readSourceEstate({
      files: ['src/components/modals/HospitalModal.jsx'],
      directories: ['src/components/modals/hospital'],
    });

    expect(source).toContain('const canManageVerification = Boolean(isAdmin?.());');
    expect(source).toContain('buildHospitalSavePayload(formData, canManageVerification)');
    expect(source).toContain('isView || !canManageVerification');
    expect(source).toContain('Verification is managed by platform administrators');
  });
});
