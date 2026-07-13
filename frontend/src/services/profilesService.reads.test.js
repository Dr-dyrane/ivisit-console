import { getEmergencyPatientOptions, getProfile } from './profilesService';

const mockFrom = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockIsValidUUID = jest.fn();
const mockWithRetry = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('../lib/utils', () => ({
  isValidUUID: (...args) => mockIsValidUUID(...args),
}));

jest.mock('./supabaseHelpers', () => ({
  withRetry: (...args) => mockWithRetry(...args),
  withAudit: jest.fn((_action, _entity, operation) => operation()),
}));

const makeQuery = (result) => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method].mockReturnValue(query);
  }
  return query;
};

describe('profilesService read identity boundaries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockWithRetry.mockImplementation((operation) => operation());
    mockGetCurrentUser.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      organization_id: null,
    });
  });

  it('uses the UUID profile key for canonical identity reads', async () => {
    const query = makeQuery({ data: { id: 'profile-uuid' }, error: null });
    mockFrom.mockReturnValue(query);
    mockIsValidUUID.mockReturnValue(true);

    await expect(getProfile('profile-uuid')).resolves.toEqual({ id: 'profile-uuid' });

    expect(query.eq).toHaveBeenCalledWith('id', 'profile-uuid');
    expect(query.eq).not.toHaveBeenCalledWith('display_id', expect.anything());
  });

  it('keeps display IDs as read-only lookup labels instead of rejecting them', async () => {
    const query = makeQuery({ data: { id: 'profile-uuid', display_id: 'USR-1' }, error: null });
    mockFrom.mockReturnValue(query);
    mockIsValidUUID.mockReturnValue(false);

    await expect(getProfile('USR-1')).resolves.toEqual({
      id: 'profile-uuid',
      display_id: 'USR-1',
    });

    expect(query.eq).toHaveBeenCalledWith('display_id', 'USR-1');
    expect(query.eq).not.toHaveBeenCalledWith('id', expect.anything());
  });

  it('bounds emergency patient options to an organization admin own scope', async () => {
    const query = makeQuery({
      data: [{ id: 'patient-1', username: 'patient-one' }],
      count: 2,
      error: null,
    });
    mockFrom.mockReturnValue(query);
    mockGetCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: 'org-1',
    });

    await expect(getEmergencyPatientOptions()).resolves.toEqual({
      data: [{ id: 'patient-1', username: 'patient-one' }],
      count: 2,
      isPartial: true,
      limit: 100,
    });

    expect(query.select).toHaveBeenCalledWith(
      'id, username, full_name, phone, avatar_url',
      { count: 'exact' }
    );
    expect(query.eq).toHaveBeenCalledWith('role', 'patient');
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it('fails before querying when emergency patient identity is outside actor authority', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'viewer-1', role: 'viewer' });

    await expect(getEmergencyPatientOptions()).rejects.toThrow(
      'Patient lookup is unavailable for this account.'
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
