import { buildAmbulancePayload } from './AmbulanceModal';
import { readSourceEstate } from '../../test/sourceEstates';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: () => true,
    isOrgAdmin: () => false,
    orgId: null,
    profile: { role: 'admin' },
  }),
}));

const formData = {
  call_sign: ' UNIT-7 ',
  type: 'BLS',
  status: 'available',
  vehicle_number: ' VAN-7 ',
  license_plate: ' PLATE-7 ',
  hospital_id: '33333333-3333-4333-8333-333333333333',
  eta: '2026-07-19T03:58',
  crew: 'Ada, Bola',
  base_price: '120',
  organization_id: '11111111-1111-4111-8111-111111111111',
};

describe('AmbulanceModal write authority', () => {
  it('omits stale status from ordinary metadata edits', () => {
    const payload = buildAmbulancePayload(
      { ...formData, status: 'available' },
      { isCreate: false, isOrgAdmin: true, orgId: formData.organization_id },
    );

    expect(payload).not.toHaveProperty('status');
  });

  it('establishes status only when creating a unit', () => {
    const payload = buildAmbulancePayload(
      { ...formData, status: 'maintenance' },
      { isCreate: true, isOrgAdmin: true, orgId: formData.organization_id },
    );

    expect(payload.status).toBe('maintenance');
  });

  it('keeps organization scope enforcement mounted around station selection and save', () => {
    const source = readSourceEstate({
      files: ['src/components/modals/AmbulanceModal.jsx'],
      directories: ['src/components/modals/ambulance'],
    });

    expect(source).toContain('filterAmbulanceStationOptions');
    expect(source).toContain('assertAmbulanceWriteScope(payload, actorScope)');
    expect(source).toContain('stationOutOfScope');
    expect(source).toContain('isAdminRole && formData.hospital_id');
  });
});
