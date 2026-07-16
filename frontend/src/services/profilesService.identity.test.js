import { getProfiles, getUsersPage, updateProfile } from './profilesService';

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

  it('keeps auth-enriched profile reads inside the signed-in organization scope', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: 'org-1',
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'user@example.com',
          profile_role: 'provider',
          profile_username: 'doctor-one',
          profile_organization_id: 'org-1',
          profile_bvn_verified: true,
        },
      ],
      error: null,
    });

    const result = await getProfiles({
      includeAuthData: true,
      organization_id: 'org-outside-scope',
      quiet: true,
    });

    expect(mockRpc).toHaveBeenCalledWith('get_all_auth_users', {
      p_organization_id: 'org-1',
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'user-1',
        role: 'provider',
        username: 'doctor-one',
        organization_id: 'org-1',
        bvn_verified: true,
        display_id: 'USR-1',
      }),
    ]);
  });

  it('rethrows the original privileged-read error without logging in quiet mode', async () => {
    const expectedError = new Error('scope denied');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: expectedError });

    await expect(getProfiles({ includeAuthData: true, quiet: true })).rejects.toBe(expectedError);
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('applies the same actor scope to the paged list and every exact-count bucket', async () => {
    const listQuery = makeQuery({ data: [], count: 0, error: null });
    const countQueries = Array.from({ length: 5 }, () =>
      makeQuery({ count: 0, error: null })
    );
    const queries = [listQuery, ...countQueries];
    mockFrom.mockImplementation(() => queries.shift());

    await getUsersPage({
      limit: 20,
      offset: 40,
      search: 'sam_doe%',
      role: 'provider',
      provider_type: 'doctor',
      verified: true,
      forceEmpty: true,
      quiet: true,
    });

    expect(mockApplyAuthFilter).toHaveBeenCalledTimes(6);
    mockApplyAuthFilter.mock.calls.forEach(([, actor, fields]) => {
      expect(actor).toEqual({ id: 'admin-1', role: 'admin', organization_id: null });
      expect(fields).toEqual({ userIdField: 'id', orgIdField: 'organization_id' });
    });
    expect(listQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(listQuery.eq).toHaveBeenCalledWith(
      'id',
      '00000000-0000-0000-0000-000000000000'
    );
    expect(listQuery.or).toHaveBeenCalledWith(
      'username.ilike.%sam doe%,email.ilike.%sam doe%,phone.ilike.%sam doe%,full_name.ilike.%sam doe%'
    );
    expect(listQuery.range).toHaveBeenCalledWith(40, 59);
    countQueries.forEach((query) => {
      expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    });
  });

  it('merges sign-in recency onto page rows via the existing admin-gated read', async () => {
    const listQuery = makeQuery({
      data: [{ id: 'user-1', role: 'provider', full_name: 'A User' }],
      count: 1,
      error: null,
    });
    const countQueries = Array.from({ length: 5 }, () => makeQuery({ count: 1, error: null }));
    const queries = [listQuery, ...countQueries];
    mockFrom.mockImplementation(() => queries.shift());
    mockRpc.mockResolvedValue({
      data: [{ id: 'user-1', last_sign_in_at: '2026-07-15T10:00:00.000Z' }],
      error: null,
    });

    const result = await getUsersPage({ limit: 20, offset: 0, quiet: true });

    expect(mockRpc).toHaveBeenCalledWith('get_all_auth_users', { p_organization_id: null });
    expect(result.data[0].last_sign_in_at).toBe('2026-07-15T10:00:00.000Z');
  });

  it('keeps page rows sign-in-absent when the privileged read refuses, inside the actor org scope', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: 'org-1',
    });
    const listQuery = makeQuery({
      data: [{ id: 'user-1', role: 'provider', full_name: 'A User' }],
      count: 1,
      error: null,
    });
    const countQueries = Array.from({ length: 5 }, () => makeQuery({ count: 1, error: null }));
    const queries = [listQuery, ...countQueries];
    mockFrom.mockImplementation(() => queries.shift());
    mockRpc.mockResolvedValue({ data: null, error: new Error('Unauthorized: Access denied') });

    const result = await getUsersPage({ limit: 20, offset: 0, quiet: true });

    expect(mockRpc).toHaveBeenCalledWith('get_all_auth_users', { p_organization_id: 'org-1' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].last_sign_in_at).toBeUndefined();
  });

  it('never attempts the privileged sign-in read for non-privileged actors', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'viewer-1',
      role: 'viewer',
      organization_id: null,
    });
    const listQuery = makeQuery({
      data: [{ id: 'user-1', role: 'viewer', full_name: 'A Viewer' }],
      count: 1,
      error: null,
    });
    const countQueries = Array.from({ length: 5 }, () => makeQuery({ count: 1, error: null }));
    const queries = [listQuery, ...countQueries];
    mockFrom.mockImplementation(() => queries.shift());

    const result = await getUsersPage({ limit: 20, offset: 0, quiet: true });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.data[0].last_sign_in_at).toBeUndefined();
  });

  it('keeps safe self-edits on the owner-scoped table receiver', async () => {
    const savedProfile = { id: 'user-1', phone: '555-0100' };
    const query = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: savedProfile, error: null }),
    };
    for (const method of ['update', 'eq', 'select']) query[method].mockReturnValue(query);
    mockFrom.mockReturnValue(query);
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await expect(updateProfile('user-1', { phone: ' 555-0100 ' })).resolves.toEqual(
      savedProfile
    );

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '555-0100', updated_at: expect.any(String) })
    );
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockWithAudit).toHaveBeenCalledWith(
      'profile.update',
      'profile',
      expect.any(Function),
      { entityId: 'user-1', self: true }
    );
  });

  it('rejects a non-admin self role change before either mutation receiver runs', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({
        data: {
          role: 'provider',
          organization_id: 'org-1',
          provider_type: 'doctor',
          bvn_verified: false,
        },
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mockFrom.mockReturnValue(query);
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updateProfile('user-1', { role: 'viewer' })).rejects.toThrow(
      'Access settings require another administrator.'
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockWithAudit).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
