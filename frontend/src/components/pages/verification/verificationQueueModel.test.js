import {
  createVerificationFilterSchema,
  createVerificationPanelContext,
  executeVerificationBulkAction,
  formatOnboardingStatus,
  formatPayoutMethod,
  getApprovalProjection,
  getFacilityClaims,
  getFacilityProvenance,
  getFacilityReviewGates,
  getFacilityStatusPresentation,
  getVerificationRouteScope,
  isTransientVerificationRefreshError,
  normalizeActiveStats,
  sortVerificationItems,
  toFacilityClaimList,
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

  it('keeps final facility approval locked until evidence, ownership, and organization are approved', () => {
    const pending = getFacilityReviewGates({
      onboarding_organization: { verification_status: 'pending' },
      facility_claim: { status: 'pending' },
      verification_documents: [{ review_status: 'pending' }],
    });
    expect(pending).toMatchObject({
      canApproveClaim: false,
      canApproveOrganization: false,
      canApproveFacility: false,
    });

    const ready = getFacilityReviewGates({
      onboarding_organization: { verification_status: 'verified' },
      facility_claim: { status: 'approved' },
      verification_documents: [{ review_status: 'accepted' }],
    });
    expect(ready).toMatchObject({
      canApproveClaim: false,
      canApproveOrganization: false,
      canApproveFacility: true,
    });
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

  it('normalizes claim arrays across every serialization the driver can hand back', () => {
    expect(toFacilityClaimList(['Cardiology', ' Trauma ', ''])).toEqual(['Cardiology', 'Trauma']);
    expect(toFacilityClaimList('["emergency","icu"]')).toEqual(['emergency', 'icu']);
    expect(toFacilityClaimList('{"General Care",Surgery}')).toEqual(['General Care', 'Surgery']);
    expect(toFacilityClaimList('Surgery')).toEqual(['Surgery']);
    expect(toFacilityClaimList('[broken json')).toEqual([]);
    expect(toFacilityClaimList(null)).toEqual([]);
    expect(toFacilityClaimList(undefined)).toEqual([]);
    expect(toFacilityClaimList(7)).toEqual([]);
  });

  it('projects facility claims with honest nulls -- absent columns never fabricate values', () => {
    expect(getFacilityClaims({
      specialties: ['Cardiology'],
      service_types: '["emergency"]',
      total_beds: 120,
      available_beds: 30,
      icu_beds_available: 8,
      emergency_eligible: true,
      dispatch_eligible: false,
      booking_eligible: true,
    })).toEqual({
      specialties: ['Cardiology'],
      serviceTypes: ['emergency'],
      beds: '30 of 120 available \u00b7 ICU 8',
      eligibility: 'Emergency \u00b7 Booking',
    });

    // Flags present but ALL false is real data ('None'); null bed columns stay null.
    expect(getFacilityClaims({
      specialties: null,
      service_types: null,
      total_beds: null,
      available_beds: null,
      icu_beds_available: null,
      emergency_eligible: false,
      dispatch_eligible: false,
      booking_eligible: false,
    })).toEqual({
      specialties: [],
      serviceTypes: [],
      beds: null,
      eligibility: 'None',
    });

    // A row without the columns at all stays fully absent -- no invented 'None'.
    expect(getFacilityClaims({})).toEqual({
      specialties: [],
      serviceTypes: [],
      beds: null,
      eligibility: null,
    });
  });

  it('derives provenance from presence only and never fabricates an origin', () => {
    expect(getFacilityProvenance({ provider_source: 'google_places' })).toBe('Imported \u00b7 Places');
    expect(getFacilityProvenance({ provider_source: 'mapbox_places' })).toBe('Imported \u00b7 Places');
    expect(getFacilityProvenance({ provider_source: null, place_id: 'ChIJabc123' })).toBe('Imported \u00b7 Places');
    expect(getFacilityProvenance({ provider_source: 'demo_bootstrap' })).toBe('Demo seed');
    expect(getFacilityProvenance({ provider_source: null, place_id: 'demo:lagos-1' })).toBe('Demo seed');
    expect(getFacilityProvenance({ provider_source: 'manual_seed', place_id: 'e2e:run-1:facility:1' })).toBe('E2E fixture');
    expect(getFacilityProvenance({ features: ['demo_scope:run-1'] })).toBe('E2E fixture');
    expect(getFacilityProvenance({ provider_source: 'manual_seed' })).toBe('Self-registered');
    expect(getFacilityProvenance({ provider_source: 'verified_provider' })).toBe('Self-registered');
    expect(getFacilityProvenance({ provider_source: null, place_id: null })).toBeNull();
    expect(getFacilityProvenance({})).toBeNull();
  });

  it('binds the facility modal pill to RAW verification_status with honest labels (ADOPT-20)', () => {
    expect(getFacilityStatusPresentation('pending')).toMatchObject({ key: 'pending', label: 'Pending review' });
    expect(getFacilityStatusPresentation('verified')).toMatchObject({ key: 'verified', label: 'Verified' });
    expect(getFacilityStatusPresentation('rejected')).toMatchObject({ key: 'rejected', label: 'Rejected' });
    // Case/whitespace normalization of a KNOWN member is not coercion.
    expect(getFacilityStatusPresentation(' VERIFIED ')).toMatchObject({ key: 'verified', label: 'Verified' });
    // Unknown stored values render as humanized RAW text -- never coerced to
    // pending/verified (and never actionable through the known-key vocabulary).
    expect(getFacilityStatusPresentation('under_review')).toMatchObject({ key: 'unknown', label: 'under review' });
    expect(getFacilityStatusPresentation('suspended')).toMatchObject({ key: 'unknown', label: 'suspended' });
    // Null/empty is an honest absence: no pill, never a fabricated 'pending'.
    expect(getFacilityStatusPresentation(null)).toBeNull();
    expect(getFacilityStatusPresentation(undefined)).toBeNull();
    expect(getFacilityStatusPresentation('')).toBeNull();
    expect(getFacilityStatusPresentation('   ')).toBeNull();
    expect(getFacilityStatusPresentation(7)).toBeNull();
  });

  it('humanizes onboarding status without inventing one', () => {
    expect(formatOnboardingStatus('pending_payment')).toBe('pending payment');
    expect(formatOnboardingStatus('completed')).toBe('completed');
    expect(formatOnboardingStatus('')).toBeNull();
    expect(formatOnboardingStatus(null)).toBeNull();
    expect(formatOnboardingStatus(undefined)).toBeNull();
  });

  it('renders payout readiness presence-only: brand + last4, hidden when unpopulated', () => {
    expect(formatPayoutMethod({ payout_method_brand: 'visa', payout_method_last4: '4242' }))
      .toBe('Visa \u00b7\u00b7\u00b7\u00b7 4242');
    expect(formatPayoutMethod({ payout_method_brand: 'Mastercard', payout_method_last4: '0005' }))
      .toBe('Mastercard \u00b7\u00b7\u00b7\u00b7 0005');
    // Partial presence renders only what exists -- nothing is fabricated.
    expect(formatPayoutMethod({ payout_method_brand: 'visa', payout_method_last4: null })).toBe('Visa');
    expect(formatPayoutMethod({ payout_method_brand: null, payout_method_last4: '4242' }))
      .toBe('\u00b7\u00b7\u00b7\u00b7 4242');
    // Production norm today: both columns null -> null, the rail hides the line.
    expect(formatPayoutMethod({ payout_method_brand: null, payout_method_last4: null })).toBeNull();
    expect(formatPayoutMethod({ payout_method_brand: '', payout_method_last4: '   ' })).toBeNull();
    expect(formatPayoutMethod({})).toBeNull();
    expect(formatPayoutMethod(null)).toBeNull();
    expect(formatPayoutMethod(undefined)).toBeNull();
  });

  it('never leaks a raw Stripe identifier through the payout line', () => {
    const row = {
      payout_method_brand: 'visa',
      payout_method_last4: '4242',
      payout_method_id: 'pm_1RawSecret',
      stripe_account_id: 'acct_1RawSecret',
      stripe_customer_id: 'cus_RawSecret',
    };
    const line = formatPayoutMethod(row);
    expect(line).toBe('Visa \u00b7\u00b7\u00b7\u00b7 4242');
    expect(line).not.toContain(row.payout_method_id);
    expect(line).not.toContain(row.stripe_account_id);
    expect(line).not.toContain(row.stripe_customer_id);
    // Raw ids alone can never resurrect the line -- only the display columns count.
    expect(formatPayoutMethod({
      payout_method_id: 'pm_1RawSecret',
      stripe_account_id: 'acct_1RawSecret',
      stripe_customer_id: 'cus_RawSecret',
    })).toBeNull();
  });
});
