import { getUsersPage, updateProfile } from './profilesService';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockAuthGetUser = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockApplyAuthFilter = jest.fn();
const mockWithRetry = jest.fn();
const mockWithAudit = jest.fn();
const mockGetDisplayIds = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
    auth: {
      getUser: (...args) => mockAuthGetUser(...args),
    },
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  applyAuthFilter: (...args) => mockApplyAuthFilter(...args),
}));

jest.mock('../lib/utils', () => ({
  isValidUUID: jest.fn(() => true),
}));

jest.mock('./supabaseHelpers', () => ({
  withRetry: (...args) => mockWithRetry(...args),
  withAudit: (...args) => mockWithAudit(...args),
}));

jest.mock('./displayIdService', () => ({
  getDisplayIds: (...args) => mockGetDisplayIds(...args),
}));

const makeQuery = (result) => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    or: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  for (const method of ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range']) {
    query[method].mockReturnValue(query);
  }
  return query;
};

describe('profilesService identity integrity', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApplyAuthFilter.mockImplementation((query) => query);
    mockWithRetry.mockImplementation((operation) => operation());
    mockWithAudit.mockImplementation((_action, _entity, operation) => operation());
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockGetCurrentUser.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      organization_id: null,
    });
    mockGetDisplayIds.mockResolvedValue(new Map([['user-1', 'USR-1']]));
  });

  it('preserves explicit optional-field clears for the admin RPC receiver', async () => {
    await updateProfile('user-1', {
      username: '   ',
      phone: '',
      address: ' ',
      gender: '',
      date_of_birth: '',
    });

    expect(mockRpc).toHaveBeenCalledWith('update_profile_by_admin', {
      target_user_id: 'user-1',
      profile_data: expect.objectContaining({
        username: '',
        phone: '',
        address: '',
        gender: '',
        date_of_birth: '',
      }),
    });
  });

  it('clears provider subtype whenever the profile leaves the provider role', async () => {
    await updateProfile('user-1', { role: 'viewer' });

    expect(mockRpc).toHaveBeenCalledWith('update_profile_by_admin', {
      target_user_id: 'user-1',
      profile_data: expect.objectContaining({
        role: 'viewer',
        provider_type: '',
      }),
    });
  });

  it('keeps loaded users but marks exact KPI counts unavailable when a count fails', async () => {
    const listQuery = makeQuery({
      data: [{ id: 'user-1', role: 'provider', full_name: 'A User' }],
      count: 1,
      error: null,
    });
    const countQueries = [
      makeQuery({ count: 1, error: null }),
      makeQuery({ count: null, error: new Error('count failed') }),
      makeQuery({ count: 0, error: null }),
      makeQuery({ count: 0, error: null }),
      makeQuery({ count: 1, error: null }),
    ];
    const queries = [listQuery, ...countQueries];
    mockFrom.mockImplementation(() => queries.shift());

    const result = await getUsersPage({ limit: 20, offset: 0, quiet: true });

    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
    expect(result.stats).toBeNull();
    expect(result.statsError).toEqual({
      kind: 'count_unavailable',
      message: 'User totals are unavailable. Retry to refresh them.',
    });
  });

  it('rejects a missing list count instead of translating it to zero', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], count: null, error: null }));

    await expect(getUsersPage({ limit: 20, offset: 0, quiet: true }))
      .rejects.toThrow('Exact users page count is unavailable');
  });
});
