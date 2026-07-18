import {
  buildHospitalQueryFilter,
  canActorEditHospital,
  buildHospitalPanelContext,
  formatHospitalWait,
  getHospitalProvenance,
  getHospitalRailModel,
  getHospitalRowMarker,
  getHospitalSignal,
  getHospitalStateCount,
  hasActiveHospitalFilters,
  isDemoHospitalRow,
} from './hospitalPageModel';

describe('hospital page model characterization', () => {
  it('builds one bounded, sorted list query and keeps KPI stats status-agnostic', () => {
    const query = buildHospitalQueryFilter({
      filters: {
        search: 'central',
        status: ['available', 'busy'],
        created_at: { start: '2026-07-01', end: '2026-07-13' },
      },
      kpiFilter: 'full',
      itemsPerPage: 20,
      offset: 40,
      sortConfig: { key: 'created_at', direction: 'asc' },
    });

    expect(query).toEqual({
      filters: {
        search: 'central',
        status: 'full',
        date_from: '2026-07-01T00:00:00.000Z',
        date_to: '2026-07-13T23:59:59.999Z',
      },
      statsFilters: {
        search: 'central',
        date_from: '2026-07-01T00:00:00.000Z',
        date_to: '2026-07-13T23:59:59.999Z',
      },
      limit: 20,
      offset: 40,
      sortKey: 'created_at',
      sortDirection: 'asc',
      quiet: true,
    });
  });

  it('uses exact aggregate counts when present and current rows only as fallback', () => {
    const rows = [{ id: 'h1', status: 'available' }, { id: 'h2', status: 'full' }];

    expect(getHospitalStateCount({ id: 'available', stats: { available: 7 }, hospitals: rows })).toBe(7);
    expect(getHospitalStateCount({ id: 'full', stats: null, hospitals: rows })).toBe(1);
    expect(getHospitalStateCount({ id: 'all', stats: null, hospitals: rows })).toBe(2);
  });

  it('keys the verified KPI chip to the boolean verified filter, never a status (ADOPT-35)', () => {
    const query = buildHospitalQueryFilter({
      filters: { search: 'central' },
      kpiFilter: 'verified',
      itemsPerPage: 20,
      offset: 0,
      sortConfig: { key: 'created_at', direction: 'desc' },
    });

    expect(query.filters).toEqual({ search: 'central', verified: true });
    expect(query.statsFilters).toEqual({ search: 'central' });
  });

  it('counts the verified state from the exact aggregate, with row truth as fallback (ADOPT-35)', () => {
    const rows = [
      { id: 'h1', status: 'available', verified: true },
      { id: 'h2', status: 'full', verified: false },
      { id: 'h3', status: 'busy' },
    ];

    expect(getHospitalStateCount({ id: 'verified', stats: { verified: 9 }, hospitals: rows })).toBe(9);
    expect(getHospitalStateCount({ id: 'verified', stats: null, hospitals: rows })).toBe(1);
  });

  it('projects the verified hero signal with honest zero copy (ADOPT-35)', () => {
    expect(getHospitalSignal({
      stats: { verified: 3 },
      hospitals: [],
      kpiFilter: 'verified',
      loadError: null,
    })).toMatchObject({
      iconKey: 'verified',
      tone: 'primary',
      label: 'Verified',
      headline: '3 verified hospitals',
    });

    expect(getHospitalSignal({
      stats: { verified: 0 },
      hospitals: [],
      kpiFilter: 'verified',
      loadError: null,
    })).toMatchObject({ headline: 'No verified hospitals' });
  });

  it('does not turn a failed empty read into a reassuring zero signal', () => {
    expect(getHospitalSignal({
      stats: null,
      hospitals: [],
      kpiFilter: 'all',
      loadError: 'Hospitals could not load. Try again.',
    })).toEqual({
      iconKey: 'error',
      tone: 'danger',
      label: 'Load failed',
      headline: 'Hospitals did not load',
      subhead: 'Retry to load the facility list.',
    });
  });

  it('keeps the active KPI vocabulary and count in the hero projection', () => {
    expect(getHospitalSignal({
      stats: { busy: 2 },
      hospitals: [],
      kpiFilter: 'busy',
      loadError: null,
    })).toMatchObject({
      iconKey: 'busy',
      tone: 'info',
      label: 'Busy',
      headline: '2 busy hospitals',
    });
  });

  it('keeps facility identity separate while scoping org-admin edit affordances', () => {
    const ownFacility = { id: 'hospital-1', organization_id: 'org-1' };
    const foreignFacility = { id: 'hospital-2', organization_id: 'org-2' };

    expect(canActorEditHospital({ admin: true, orgAdmin: false, orgId: null }, foreignFacility)).toBe(true);
    expect(canActorEditHospital({ admin: false, orgAdmin: true, orgId: 'org-1' }, ownFacility)).toBe(true);
    expect(canActorEditHospital({ admin: false, orgAdmin: true, orgId: 'org-1' }, foreignFacility)).toBe(false);
    expect(canActorEditHospital({ admin: false, orgAdmin: true, orgId: 'hospital-1' }, ownFacility)).toBe(false);
  });

  it('publishes the exact route-scoped panel projection without inventing add authority', () => {
    const hospitals = [
      { id: 'h1', organization_id: 'org-1' },
      { id: 'h2', organization_id: 'org-1' },
      { id: 'h3', organization_id: 'org-2' },
      { id: 'h4', organization_id: 'org-2' },
      { id: 'h5', organization_id: 'org-3' },
    ];
    const context = buildHospitalPanelContext({
      stats: { total: 21 },
      hospitals,
      focusedHospital: hospitals[1],
      totalCount: 21,
      loading: false,
      errorMessage: null,
      currentState: 'available',
      canEdit: true,
    });

    expect(context).toMatchObject({
      count: 21,
      focusedHospital: hospitals[1],
      currentState: 'available',
      canAdd: false,
      canEdit: true,
    });
    expect(context.recent).toEqual(hospitals.slice(0, 4));
  });

  it('normalizes rail evidence without changing mutation identity', () => {
    const hospital = {
      id: 'hospital-uuid',
      display_id: 'ORG-123456',
      name: 'Central Hospital',
      status: 'available',
      verification_status: 'verified',
      available_beds: '4',
      total_beds: '10',
      icu_beds_available: '2',
      emergency_wait_time_minutes: '15',
      ambulances_count: '3',
      rating: '4.2',
      emergency_eligible: true,
      dispatch_eligible: true,
      booking_eligible: false,
      latitude: '6.5',
      longitude: '3.4',
    };

    expect(getHospitalRailModel(hospital, 'view-hospital-uuid')).toMatchObject({
      displayId: 'ORG-123456',
      facilityName: 'Central Hospital',
      bedsValue: '4 of 10 available \u00b7 ICU 2',
      erWaitValue: '\u2248 15 min',
      eligibility: 'Emergency \u00b7 Dispatch',
      fleet: '3',
      rating: '4.2',
      hasCoordinates: true,
      viewOpening: true,
      editOpening: false,
    });
  });

  it('classifies provenance from the database-derived demo and import encodings', () => {
    expect(isDemoHospitalRow({ provider_source: 'demo_bootstrap' })).toBe(true);
    expect(isDemoHospitalRow({ place_id: 'demo:hospital-1' })).toBe(true);
    expect(isDemoHospitalRow({ place_id: 'e2e:run-1:facility:1' })).toBe(true);
    expect(isDemoHospitalRow({ features: ['demo_scope:run-1'] })).toBe(true);
    expect(isDemoHospitalRow({ place_id: 'ChIJ123', provider_source: 'google_places' })).toBe(false);
    expect(isDemoHospitalRow({})).toBe(false);

    expect(getHospitalProvenance({ provider_type: 'hospital', provider_source: 'demo_bootstrap' }))
      .toEqual({ demo: true, imported: false, kindKey: 'hospital', sourceKey: 'demo_bootstrap' });
    expect(getHospitalProvenance({ provider_type: 'clinic', place_id: 'demo:hospital-2' }))
      .toEqual({ demo: true, imported: false, kindKey: 'clinic', sourceKey: 'demo_bootstrap' });
    expect(getHospitalProvenance({ provider_type: 'hospital', provider_source: 'google_places', place_id: 'ChIJ123' }))
      .toEqual({ demo: false, imported: true, kindKey: 'hospital', sourceKey: 'google_places' });
    expect(getHospitalProvenance({ provider_type: 'hospital', place_id: 'ChIJ123' }))
      .toEqual({ demo: false, imported: true, kindKey: 'hospital', sourceKey: 'places_import' });
    expect(getHospitalProvenance({ provider_type: 'hospital', provider_source: 'verified_provider' }))
      .toEqual({ demo: false, imported: false, kindKey: 'hospital', sourceKey: 'verified_provider' });
    expect(getHospitalProvenance({}))
      .toEqual({ demo: false, imported: false, kindKey: null, sourceKey: null });
  });

  it('marks list rows only when provenance carries dispatch signal', () => {
    expect(getHospitalRowMarker({ provider_type: 'hospital', provider_source: 'demo_bootstrap' }))
      .toEqual({ key: 'demo' });
    expect(getHospitalRowMarker({ provider_type: 'pharmacy', provider_source: 'verified_provider' }))
      .toEqual({ key: 'kind', kindKey: 'pharmacy' });
    expect(getHospitalRowMarker({ provider_type: 'hospital', provider_source: 'mapbox_places' }))
      .toEqual({ key: 'imported' });
    expect(getHospitalRowMarker({ provider_type: 'hospital', provider_source: 'verified_provider' })).toBeNull();
    expect(getHospitalRowMarker({ provider_type: 'hospital', provider_source: 'manual_seed' })).toBeNull();
    expect(getHospitalRowMarker({ provider_type: 'hospital' })).toBeNull();
  });

  it('carries kind and source keys into the rail without fabricating unknowns', () => {
    expect(getHospitalRailModel({
      id: 'h-demo',
      provider_type: 'urgent_care',
      provider_source: 'demo_bootstrap',
    }, null)).toMatchObject({ demo: true, kindKey: 'urgent_care', sourceKey: 'demo_bootstrap' });

    expect(getHospitalRailModel({ id: 'h-bare' }, null))
      .toMatchObject({ demo: false, kindKey: null, sourceKey: null });
  });

  it('carries the resolved owning organization with honest nulls for absent or unresolved orgs (ADOPT-60)', () => {
    expect(getHospitalRailModel({
      id: 'h-owned',
      organization_id: 'org-1',
      organization_name: 'Mercy Health Network',
    }, null)).toMatchObject({
      organizationId: 'org-1',
      organizationName: 'Mercy Health Network',
    });

    // RLS-blocked or failed resolution: the id stays, the name stays null.
    expect(getHospitalRailModel({
      id: 'h-unresolved',
      organization_id: 'org-2',
      organization_name: null,
    }, null)).toMatchObject({
      organizationId: 'org-2',
      organizationName: null,
    });

    // Whitespace-only names never fabricate a label.
    expect(getHospitalRailModel({
      id: 'h-blank',
      organization_id: 'org-3',
      organization_name: '   ',
    }, null)).toMatchObject({
      organizationId: 'org-3',
      organizationName: null,
    });

    // No owning organization: both stay null so the rail renders no line.
    expect(getHospitalRailModel({ id: 'h-orphan' }, null)).toMatchObject({
      organizationId: null,
      organizationName: null,
    });
  });

  it('surfaces availability freshness and record recency through the shared relative formatter (ADOPT-36)', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();

    expect(getHospitalRailModel({
      id: 'h-times',
      last_availability_update: fiveMinutesAgo,
      updated_at: twoHoursAgo,
    }, null)).toMatchObject({
      availabilityUpdatedValue: '5m ago',
      recordUpdatedValue: '2h ago',
    });

    expect(getHospitalRailModel({ id: 'h-untimed' }, null)).toMatchObject({
      availabilityUpdatedValue: 'Unknown',
      recordUpdatedValue: 'Unknown',
    });
  });

  it('keeps missing wait and filter state honest', () => {
    expect(formatHospitalWait(null)).toBe('Unknown');
    expect(formatHospitalWait('bad')).toBe('Unknown');
    expect(formatHospitalWait(12)).toBe('12m');
    expect(hasActiveHospitalFilters({})).toBe(false);
    expect(hasActiveHospitalFilters({ created_at: { start: '2026-07-01' } })).toBe(true);
  });
});
