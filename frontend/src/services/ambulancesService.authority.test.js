import {
  assertAmbulanceWriteScope,
  createAmbulance,
  filterAmbulanceStationOptions,
} from './ambulancesService';
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
const OTHER_ORG_ID = '22222222-2222-4222-8222-222222222222';
const FACILITY_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_FACILITY_ID = '44444444-4444-4444-8444-444444444444';

describe('ambulance write scope authority', () => {
  const stations = [
    { id: FACILITY_ID, name: 'In scope' },
    { id: OTHER_FACILITY_ID, name: 'Out of scope' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters organization-admin station choices to canonical facility ids', () => {
    const actor = {
      role: 'org_admin',
      organization_id: ORG_ID,
      hospital_ids: [FACILITY_ID],
    };

    expect(filterAmbulanceStationOptions(stations, actor)).toEqual([stations[0]]);
  });

  it('allows platform admins to retain the global station list', () => {
    expect(filterAmbulanceStationOptions(stations, { role: 'admin' })).toEqual(stations);
  });

  it('accepts an organization-admin payload only inside both scope edges', () => {
    const payload = { organization_id: ORG_ID, hospital_id: FACILITY_ID };
    const actor = {
      role: 'org_admin',
      organization_id: ORG_ID,
      organization_scope: { facilityIds: [FACILITY_ID] },
    };

    expect(assertAmbulanceWriteScope(payload, actor)).toBe(payload);
  });

  it.each([
    ['organization', { organization_id: OTHER_ORG_ID, hospital_id: FACILITY_ID }],
    ['station', { organization_id: ORG_ID, hospital_id: OTHER_FACILITY_ID }],
  ])('rejects a forged cross-scope %s payload', (_edge, payload) => {
    const actor = {
      role: 'org_admin',
      organization_id: ORG_ID,
      hospital_ids: [FACILITY_ID],
    };

    expect(() => assertAmbulanceWriteScope(payload, actor)).toThrow();
    try {
      assertAmbulanceWriteScope(payload, actor);
    } catch (error) {
      expect(error.code).toBe('AMBULANCE_SCOPE_DENIED');
    }
  });

  it('rejects a forged station at the service boundary before Supabase is called', async () => {
    getCurrentUser.mockResolvedValue({
      role: 'org_admin',
      organization_id: ORG_ID,
      hospital_ids: [FACILITY_ID],
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(createAmbulance({
        organization_id: ORG_ID,
        hospital_id: OTHER_FACILITY_ID,
        call_sign: 'UNIT-9',
        type: 'BLS',
      })).rejects.toMatchObject({ code: 'AMBULANCE_SCOPE_DENIED' });
      expect(supabase.from).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
