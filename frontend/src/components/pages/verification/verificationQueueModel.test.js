import {
  createVerificationFilterSchema,
  createVerificationPanelContext,
  executeVerificationBulkAction,
  getApprovalProjection,
  getVerificationRouteScope,
  isTransientVerificationRefreshError,
  normalizeActiveStats,
  sortVerificationItems,
  toVerificationServiceStatus,
} from './verificationQueueModel';

describe('verification queue model', () => {
  it('preserves both deep-link axes independently', () => {
    expect(getVerificationRouteScope('?queue=organizations&type=driver')).toEqual({
      queueType: 'organizations',
      providerTypeFilter: 'driver',
    });
    expect(getVerificationRouteScope('?queue=unknown')).toEqual({
      queueType: 'providers',
      providerTypeFilter: null,
    });
  });

  it('normalizes facility verified counts without changing provider stats', () => {
    const providerStats = { pending: 2, approved: 3, rejected: 0, total: 5 };
    const facilityStats = { pending: 7, verified: 11, rejected: 2, total: 20 };

    expect(normalizeActiveStats('providers', providerStats, facilityStats)).toEqual(providerStats);
    expect(normalizeActiveStats('organizations', providerStats, facilityStats)).toEqual({
      pending: 7,
      approved: 11,
      rejected: 2,
      total: 20,
    });
    expect(toVerificationServiceStatus('organizations', 'approved')).toBe('verified');
    expect(toVerificationServiceStatus('providers', 'approved')).toBe('approved');
  });

  it('sorts the visible page by applied time without mutating service rows', () => {
    const rows = [
      { id: 'older', created_at: '2026-01-01T00:00:00Z' },
      { id: 'newer', created_at: '2026-02-01T00:00:00Z' },
    ];

    expect(sortVerificationItems(rows, 'desc').map((row) => row.id)).toEqual(['newer', 'older']);
    expect(sortVerificationItems(rows, 'asc').map((row) => row.id)).toEqual(['older', 'newer']);
    expect(rows.map((row) => row.id)).toEqual(['older', 'newer']);
  });

  it('keeps rejected filtering exclusive to the tri-state facility lane', () => {
    const providerStatuses = createVerificationFilterSchema('providers')[1].options.map(({ value }) => value);
    const facilityStatuses = createVerificationFilterSchema('organizations')[1].options.map(({ value }) => value);

    expect(providerStatuses).toEqual(['all', 'pending', 'approved']);
    expect(facilityStatuses).toEqual(['all', 'pending', 'approved', 'rejected']);
  });

  it('normalizes each queue into the shared row projection without crossing identities', () => {
    expect(getApprovalProjection({
      id: 'provider-1',
      username: 'Ayo',
      email: 'ayo@example.com',
      provider_type: 'doctor',
      bvn_verified: false,
    }, 'providers')).toMatchObject({
      isProvider: true,
      primary: 'Ayo',
      secondary: 'ayo@example.com',
      meta: 'doctor',
      statusKey: 'pending',
    });
    expect(getApprovalProjection({
      id: 'hospital-1',
      name: 'City Hospital',
      address: 'Main Road',
      verification_status: 'verified',
    }, 'organizations')).toMatchObject({
      isProvider: false,
      primary: 'City Hospital',
      secondary: 'Main Road',
      statusKey: 'approved',
    });
  });

  it('routes provider bulk commands approve-only and never calls the facility receiver', async () => {
    const verifyProviderCommand = jest.fn().mockResolvedValue(true);
    const verifyOrganizationCommand = jest.fn().mockResolvedValue(true);

    await executeVerificationBulkAction({
      ids: ['provider-1', 'provider-2'],
      queueType: 'providers',
      approved: false,
      verifyProviderCommand,
      verifyOrganizationCommand,
    });

    expect(verifyProviderCommand.mock.calls).toEqual([
      ['provider-1', true],
      ['provider-2', true],
    ]);
    expect(verifyOrganizationCommand).not.toHaveBeenCalled();
  });

  it('routes facility bulk decisions to the facility receiver and reports partial failure', async () => {
    const verifyProviderCommand = jest.fn();
    const verifyOrganizationCommand = jest.fn(async (id) => {
      if (id === 'hospital-2') throw new Error('denied');
      return true;
    });

    await expect(executeVerificationBulkAction({
      ids: ['hospital-1', 'hospital-2'],
      queueType: 'organizations',
      approved: false,
      verifyProviderCommand,
      verifyOrganizationCommand,
    })).resolves.toEqual({
      failed: 1,
      total: 2,
      isProviders: false,
      noun: 'facility',
      plural: 'facilities',
    });
    expect(verifyOrganizationCommand.mock.calls).toEqual([
      ['hospital-1', false],
      ['hospital-2', false],
    ]);
    expect(verifyProviderCommand).not.toHaveBeenCalled();
  });

  it('publishes only the active lane window and focused evidence to the context panel', () => {
    const providers = [{ id: 'provider-1' }];
    const organizations = Array.from({ length: 6 }, (_, index) => ({ id: `hospital-${index}` }));
    const selected = organizations[3];

    expect(createVerificationPanelContext({
      queueType: 'organizations',
      providers,
      organizations,
      activeStats: { total: 6 },
      focusedItem: selected,
      canApprove: true,
      loading: false,
    })).toEqual({
      queueType: 'organizations',
      stats: { total: 6 },
      count: 6,
      recent: organizations.slice(0, 4),
      selected,
      canApprove: true,
      loading: false,
    });
  });

  it('keeps transient refresh failures fail-soft while retaining hard failures', () => {
    expect(isTransientVerificationRefreshError(new Error('Failed to fetch'))).toBe(true);
    expect(isTransientVerificationRefreshError(new Error('permission denied'))).toBe(false);
  });
});
