import fs from 'fs';
import { buildStaffPayload, normalizeForm } from './DoctorModal';

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

const formData = {
  name: 'Ada Doctor',
  specialization: 'Emergency',
  phone: '+2348000000000',
  email: 'ada@example.com',
  hospital_id: '33333333-3333-4333-8333-333333333333',
  status: 'invited',
  experience: '8',
  license_number: 'LIC-8',
  about: 'Linked provider',
  consultation_fee: '100',
};

describe('DoctorModal lifecycle and profile authority', () => {
  it.each(['invited', 'future_lifecycle'])('preserves the %s lifecycle value when normalizing', (status) => {
    expect(normalizeForm({ status }).status).toBe(status);
  });

  it('omits lifecycle fields from ordinary edits', () => {
    const payload = buildStaffPayload(formData, { isCreate: false, isProfileLinked: false });

    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('is_available');
  });

  it('creates the only locally aligned lifecycle pair supported by database defaults', () => {
    const payload = buildStaffPayload(formData, { isCreate: true, isProfileLinked: false });

    expect(payload.status).toBe('available');
    expect(payload).not.toHaveProperty('is_available');
  });

  it('omits profile-owned identity fields for linked-row edits', () => {
    const payload = buildStaffPayload(formData, { isCreate: false, isProfileLinked: true });

    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('phone');
    expect(payload.specialization).toBe('Emergency');
  });

  it('keeps linked identity and lifecycle controls read-only in the mounted modal', () => {
    const source = fs.readFileSync('src/components/modals/DoctorModal.jsx', 'utf8');

    expect(source).toContain('const isProfileLinked = Boolean(doctor?.profile_id);');
    expect(source).toContain('Synced from the linked account');
    expect(source).toContain('Managed by the authorized availability workflow');
    expect(source).not.toContain("updateField('status'");
  });

  it('keeps facility choices and payloads behind canonical actor scope', () => {
    const source = fs.readFileSync('src/components/modals/DoctorModal.jsx', 'utf8');

    expect(source).toContain('filterDoctorFacilityOptions(visibleFacilities, actorScope)');
    expect(source).toContain('assertDoctorWriteScope(payload, actorScope');
    expect(source).toContain('facilityOutOfScope');
    expect(source).toContain('Select an authorized facility before saving.');
    expect(source).toContain('isAdminRole && formData.hospital_id');
  });
});
