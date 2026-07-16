import { supabase } from '../../lib/supabase';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { getEmergencyRequests, getEmergencyRequestsPageStats } from './listQueries';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../authService', () => ({
  applyAuthFilter: jest.fn((query) => query),
  getCurrentUser: jest.fn(),
}));

jest.mock('../supabaseHelpers', () => ({
  withRetry: async (operation) => operation(),
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const HOSPITAL_ID = '22222222-2222-4222-8222-222222222222';
const DISPATCH_SCOPE = `dispatch_organization_id.eq.${ORGANIZATION_ID}`;

const createQueryBuilder = (result) => {
  const builder = {};
  [
    'eq',
    'gte',
    'in',
    'is',
    'limit',
    'lte',
    'or',
    'order',
    'range',
    'select',
  ].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

describe('emergency list organization scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('combines owned facilities with exact dispatch organization scope', async () => {
    const row = { id: 'request-1', service_type: 'ambulance' };
    const builder = createQueryBuilder({ data: [row], error: null });
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [HOSPITAL_ID],
    });
    supabase.from.mockReturnValue(builder);

    await expect(getEmergencyRequests({ quiet: true })).resolves.toEqual([row]);

    expect(builder.or).toHaveBeenCalledWith(
      `hospital_id.in.(${HOSPITAL_ID}),${DISPATCH_SCOPE}`
    );
    expect(builder.eq).not.toHaveBeenCalledWith('hospital_id', ORGANIZATION_ID);
    expect(applyAuthFilter).not.toHaveBeenCalled();
  });

  it('scopes a standalone dispatcher by dispatch organization even when a destination hospital exists', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    getCurrentUser.mockResolvedValue({
      id: 'dispatcher-1',
      role: 'dispatcher',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [],
    });
    supabase.from.mockReturnValue(builder);

    await expect(getEmergencyRequests({ quiet: true })).resolves.toEqual([]);

    expect(builder.eq).toHaveBeenCalledWith('dispatch_organization_id', ORGANIZATION_ID);
    expect(builder.eq).not.toHaveBeenCalledWith('hospital_id', ORGANIZATION_ID);
    expect(builder.or).not.toHaveBeenCalled();
    expect(applyAuthFilter).not.toHaveBeenCalled();
  });

  it('preserves the existing RLS-backed path when facility resolution is unavailable', async () => {
    const user = {
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: ORGANIZATION_ID,
      hospital_ids: null,
    };
    const builder = createQueryBuilder({ data: [], error: null });
    getCurrentUser.mockResolvedValue(user);
    supabase.from.mockReturnValue(builder);

    await getEmergencyRequests({ quiet: true });

    expect(applyAuthFilter).toHaveBeenCalledWith(builder, user, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id',
      providerIdField: 'responder_id',
      resourceType: 'emergency',
    });
    expect(builder.or).not.toHaveBeenCalled();
    expect(builder.is).not.toHaveBeenCalled();
  });
});

describe('emergency page stats status distribution (ADOPT-31)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('derives byStatus from the same exact counts without extra queries', async () => {
    // Count-query resolution order mirrors the Promise.all list in
    // getEmergencyRequestsPageStats: total, pending, active, bed, ambulance,
    // booking, inProgress, accepted, arrived, completed, cancelled, mine.
    const counts = [12, 2, 5, 3, 4, 1, 2, 1, 1, 6, 1, 0];
    let call = 0;
    supabase.from.mockImplementation(() => {
      const builder = createQueryBuilder({ count: counts[call], error: null });
      call += 1;
      return builder;
    });

    const stats = await getEmergencyRequestsPageStats(
      {},
      { id: 'admin-1', role: 'admin' },
      true
    );

    expect(supabase.from).toHaveBeenCalledTimes(12);
    expect(stats).toMatchObject({
      total: 12,
      pending: 2,
      pending_approval: 2,
      active: 5,
      bed: 3,
      ambulance: 4,
      booking: 1,
      inProgress: 2,
      accepted: 1,
      arrived: 1,
      completed: 6,
      cancelled: 1,
      mine: 0,
    });
    // The AnalyticsModal Status phase dataset: same counts, no fabricated keys.
    expect(stats.byStatus).toEqual({
      pending_approval: 2,
      in_progress: 2,
      accepted: 1,
      arrived: 1,
      completed: 6,
      cancelled: 1,
    });
    // No priority column exists on emergency_requests -- nothing invents one.
    expect(stats.byPriority).toBeUndefined();
  });
});
