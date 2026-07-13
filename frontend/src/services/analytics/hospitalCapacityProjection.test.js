import { supabase } from '../../lib/supabase';
import { applyAuthFilter } from '../authService';
import {
  HOSPITAL_CAPACITY_COLUMNS,
  applyAnalyticsHospitalScope,
  getAnalyticsHospitalCapacitySource,
} from './hospitalCapacityProjection';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../authService', () => ({
  applyAuthFilter: jest.fn((query) => query),
}));

const createHospitalBuilder = ({ rows, initialCount, finalCount, finalError = null }) => {
  let options;
  const builder = {
    select: jest.fn((_columns, nextOptions) => {
      options = nextOptions;
      return builder;
    }),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(
      options?.head
        ? { data: null, count: finalCount, error: finalError }
        : { data: rows, count: initialCount, error: null },
    ).then(resolve, reject),
  };
  return builder;
};

describe('analytics hospital capacity source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('keeps provenance fields beside the two reported capacity scalars', () => {
    expect(HOSPITAL_CAPACITY_COLUMNS).toBe(
      'id, provider_type, provider_source, place_id, total_beds, available_beds, icu_beds_available',
    );
  });

  it('marks duplicate hospital rows incomplete even when counts match', async () => {
    const rows = [
      { id: 'hospital-1', provider_source: 'verified_provider', total_beds: 50, available_beds: 13 },
      { id: 'hospital-1', provider_source: 'verified_provider', total_beds: 50, available_beds: 13 },
    ];
    supabase.from.mockImplementation(() => createHospitalBuilder({
      rows,
      initialCount: 2,
      finalCount: 2,
    }));

    await expect(getAnalyticsHospitalCapacitySource({ role: 'admin' })).resolves.toEqual({
      data: rows,
      count: 2,
      error: null,
      complete: false,
      pageSize: 1000,
    });
  });

  it('marks a count change incomplete and reports the rechecked count', async () => {
    const rows = [{
      id: 'hospital-1',
      provider_type: 'hospital',
      provider_source: 'verified_provider',
      place_id: null,
      total_beds: 50,
      available_beds: 13,
    }];
    supabase.from.mockImplementation(() => createHospitalBuilder({
      rows,
      initialCount: 1,
      finalCount: 2,
    }));

    await expect(getAnalyticsHospitalCapacitySource({ role: 'admin' })).resolves.toEqual({
      data: rows,
      count: 2,
      error: null,
      complete: false,
      pageSize: 1000,
    });
  });

  it('uses provider organization scope only when hospital ids are absent', () => {
    const query = {
      eq: jest.fn(() => query),
      in: jest.fn(() => query),
    };

    applyAnalyticsHospitalScope(query, {
      role: 'provider',
      hospital_ids: [],
      organization_id: 'organization-1',
    });

    expect(query.eq).toHaveBeenCalledWith('organization_id', 'organization-1');
    expect(applyAuthFilter).not.toHaveBeenCalled();
  });
});
