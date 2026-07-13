import { buildHospitalPayload, updateHospital } from './hospitalsService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

jest.mock('./supabaseHelpers', () => ({
  withAudit: async (_action, _entity, operation) => operation(),
  withRetry: async (operation) => operation(),
}));

const HOSPITAL_ID = '11111111-1111-4111-8111-111111111111';

const mockHospitalRead = (response) => {
  const maybeSingle = jest.fn().mockResolvedValue(response);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ select });
  return { select, eq, maybeSingle };
};

describe('hospital update authority boundary', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('preserves intentional optional text clears in the RPC payload', () => {
    const payload = buildHospitalPayload({
      phone: '   ',
      image: '',
      wait_time: null,
      price_range: '',
      place_id: '',
    });

    expect(payload).toMatchObject({
      phone: '',
      image: '',
      wait_time: '',
      price_range: '',
      place_id: '',
    });
  });

  it.each([
    [{ available_beds: -1 }, 'Available beds'],
    [{ total_beds: 2.5 }, 'Total beds'],
    [{ total_beds: 4, available_beds: 5 }, 'Available beds cannot exceed total beds'],
    [{ available_beds: 2, icu_beds_available: 3 }, 'ICU beds cannot exceed available beds'],
    [{ status: 'available', available_beds: 0 }, 'must report at least one'],
    [{ status: 'full', available_beds: 1 }, 'cannot report available beds'],
    [{ status: 'mystery' }, 'not recognized'],
  ])('rejects capacity or status input that the database would rewrite: %j', (input, message) => {
    expect(() => buildHospitalPayload(input)).toThrow(message);
  });

  it('rejects an RPC success claim when the updated row no longer exists', async () => {
    supabase.rpc.mockResolvedValue({ data: { success: true, id: HOSPITAL_ID }, error: null });
    mockHospitalRead({ data: null, error: null });

    await expect(updateHospital(HOSPITAL_ID, {
      name: 'Audit Facility',
      address: 'Audit Address',
      status: 'busy',
      total_beds: 4,
      available_beds: 2,
      icu_beds_available: 1,
    })).rejects.toThrow('Facility no longer exists');
  });

  it('returns the settled row only after the receiver and readback agree', async () => {
    const settled = { id: HOSPITAL_ID, name: 'Audit Facility', status: 'busy' };
    supabase.rpc.mockResolvedValue({ data: { success: true, id: HOSPITAL_ID }, error: null });
    mockHospitalRead({ data: settled, error: null });

    await expect(updateHospital(HOSPITAL_ID, {
      name: 'Audit Facility',
      address: 'Audit Address',
      status: 'busy',
      total_beds: 4,
      available_beds: 2,
      icu_beds_available: 1,
    })).resolves.toEqual(settled);
  });
});
