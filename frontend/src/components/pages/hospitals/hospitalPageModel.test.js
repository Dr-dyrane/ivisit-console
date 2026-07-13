import {
  buildHospitalQueryFilter,
  canActorEditHospital,
  buildHospitalPanelContext,
  formatHospitalWait,
  getHospitalRailModel,
  getHospitalSignal,
  getHospitalStateCount,
  hasActiveHospitalFilters,
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

  it('keeps missing wait and filter state honest', () => {
    expect(formatHospitalWait(null)).toBe('Unknown');
    expect(formatHospitalWait('bad')).toBe('Unknown');
    expect(formatHospitalWait(12)).toBe('12m');
    expect(hasActiveHospitalFilters({})).toBe(false);
    expect(hasActiveHospitalFilters({ created_at: { start: '2026-07-01' } })).toBe(true);
  });
});
