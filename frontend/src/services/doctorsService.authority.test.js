import {
  assertDoctorWritableFields,
  assertDoctorWriteScope,
  createDoctor,
  deleteDoctor,
  filterDoctorFacilityOptions,
  updateDoctor,
} from './doctorsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: (query) => query,
}));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const FACILITY_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_FACILITY_ID = '44444444-4444-4444-8444-444444444444';

const orgAdmin = {
  role: 'org_admin',
  organization_id: ORG_ID,
  hospital_ids: [FACILITY_ID],
};

describe('doctor facility write scope authority', () => {
  const facilities = [
    { id: FACILITY_ID, name: 'In scope' },
    { id: OTHER_FACILITY_ID, name: 'Out of scope' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters organization-admin options to canonical facility ids', () => {
    expect(filterDoctorFacilityOptions(facilities, orgAdmin)).toEqual([facilities[0]]);
  });

  it('retains the global facility list for platform admins', () => {
    expect(filterDoctorFacilityOptions(facilities, { role: 'admin' })).toEqual(facilities);
  });

  it('rejects provider and viewer writes before a table request is built', () => {
    expect(() => assertDoctorWriteScope({}, { role: 'provider' })).toThrow(
      'This role cannot change staff directory records.'
    );
    expect(() => assertDoctorWriteScope({}, { role: 'viewer' })).toThrow();
  });

  it.each(['profile_id', 'status', 'is_available', 'rating', 'reviews_count'])(
    'rejects the workflow-owned %s field',
    (field) => {
      expect(() => assertDoctorWritableFields({ [field]: 'forged' })).toThrow();
      try {
        assertDoctorWritableFields({ [field]: 'forged' });
      } catch (error) {
        expect(error.code).toBe('DOCTOR_FIELD_AUTHORITY_DENIED');
        expect(error.fields).toContain(field);
      }
    }
  );

  it('accepts an in-scope facility and an unrelated edit with no facility field', () => {
    const scopedPayload = { hospital_id: FACILITY_ID };
    const unrelatedPayload = { specialization: 'Emergency' };

    expect(assertDoctorWriteScope(scopedPayload, orgAdmin)).toBe(scopedPayload);
    expect(assertDoctorWriteScope(unrelatedPayload, orgAdmin)).toBe(unrelatedPayload);
  });

  it.each([
    ['external facility', { hospital_id: OTHER_FACILITY_ID }, {}],
    ['cleared facility', { hospital_id: null }, {}],
    ['missing create facility', {}, { requireFacility: true }],
  ])('rejects an organization-admin %s payload', (_case, payload, options) => {
    expect(() => assertDoctorWriteScope(payload, orgAdmin, options)).toThrow();
    try {
      assertDoctorWriteScope(payload, orgAdmin, options);
    } catch (error) {
      expect(error.code).toBe('DOCTOR_SCOPE_DENIED');
    }
  });

  it.each([
    ['create', () => createDoctor({ hospital_id: OTHER_FACILITY_ID, name: 'Ada' })],
    ['update', () => updateDoctor('doctor-1', { hospital_id: OTHER_FACILITY_ID })],
  ])('rejects an external facility during %s before Supabase is called', async (_operation, command) => {
    getCurrentUser.mockResolvedValue(orgAdmin);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(command()).rejects.toMatchObject({ code: 'DOCTOR_SCOPE_DENIED' });
      expect(supabase.from).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps direct doctor deletion fail-closed without contacting Supabase', async () => {
    await expect(deleteDoctor('doctor-1')).rejects.toMatchObject({
      code: 'DOCTOR_RETIREMENT_UNAVAILABLE',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
