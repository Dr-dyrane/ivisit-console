import {
  buildAmbulanceFilterSchema,
  buildAmbulanceQueryFilter,
  buildAmbulanceRouteContext,
  cycleAmbulanceSort,
  getAmbulanceRailModel,
  getAmbulanceRoleKind,
  getAmbulanceSignal,
  getFleetStateCount,
  hasActiveAmbulanceFilters,
} from './ambulancePageModel';

describe('ambulance page model characterization', () => {
  const rows = [
    {
      id: 'unit-1',
      display_id: 'AMB-000001',
      call_sign: 'Alpha 1',
      status: 'available',
      hospital_id: 'hospital-1',
      organization_id: 'org-1',
      station_name: 'Central Hospital',
      vehicle_number: 'V-1',
    },
    {
      id: 'unit-2',
      call_sign: 'Alpha 2',
      status: 'en_route',
      hospital_id: 'hospital-2',
      organization_id: 'org-1',
      license_plate: 'L-2',
    },
  ];

  it('builds the same bounded desktop query and status-agnostic stats filters', () => {
    expect(buildAmbulanceQueryFilter({
      filters: { search: 'alpha', status: ['available'], hospital: 'hospital-1' },
      kpiFilter: 'busy',
      sortConfig: { key: 'updated_at', direction: 'desc' },
      isMobile: false,
      currentPage: 3,
      itemsPerPage: 20,
      offset: 40,
    })).toEqual({
      filters: { search: 'alpha', status: ['available'], hospital: 'hospital-1' },
      statsFilters: { search: 'alpha', hospital: 'hospital-1' },
      kpiFilter: 'busy',
      sortConfig: { key: 'updated_at', direction: 'desc' },
      limit: 20,
      offset: 40,
    });
  });

  it('keeps mobile accumulation on one growing server-backed window', () => {
    expect(buildAmbulanceQueryFilter({
      filters: {},
      kpiFilter: 'all',
      sortConfig: { key: '', direction: 'asc' },
      isMobile: true,
      currentPage: 3,
      itemsPerPage: 20,
      offset: 40,
    })).toMatchObject({ limit: 60, offset: 0 });
  });

  it('uses exact aggregate counts and preserves en-route and active aliases', () => {
    expect(getFleetStateCount({ id: 'all', stats: { total: 12 }, ambulances: rows })).toBe(12);
    expect(getFleetStateCount({ id: 'on_route', stats: null, ambulances: rows })).toBe(1);
    expect(getFleetStateCount({ id: 'busy', stats: null, ambulances: rows })).toBe(1);
  });

  it('does not turn a failed empty read into reassuring fleet availability', () => {
    expect(getAmbulanceSignal({
      stats: null,
      ambulances: [],
      kpiFilter: 'all',
      loadError: 'Fleet could not load.',
    })).toEqual({
      iconKey: 'error',
      tone: 'danger',
      label: 'Load failed',
      headline: 'Fleet did not load',
      subhead: 'Retry to load the fleet list.',
    });
  });

  it('publishes one route-scoped context without rewriting facility or organization identity', () => {
    const context = buildAmbulanceRouteContext({
      ambulances: rows,
      stats: { total: 17, available: 8, onRoute: 3, busy: 4, maintenance: 2 },
      focusedAmbulance: rows[0],
      totalCount: 17,
      loading: false,
      loadError: null,
      canEdit: true,
    });

    expect(context).toMatchObject({
      status: 'ready',
      canEdit: true,
      focusedAmbulance: rows[0],
      stats: {
        total: 17,
        available: 8,
        onRoute: 3,
        active: 4,
        maintenance: 2,
        visible: 2,
        totalCount: 17,
      },
    });
    expect(context.recent[0]).toMatchObject({
      id: 'unit-1',
      station: 'Central Hospital',
    });
    expect(context.recent[0]).not.toHaveProperty('organization_id');
    expect(context.recent[0]).not.toHaveProperty('hospital_id');
  });

  it('keeps admin station options UUID-native and hides them from non-admin actors', () => {
    const hospitals = [{ id: 'hospital-1', name: 'Central Hospital' }];
    const adminSchema = buildAmbulanceFilterSchema({ hospitals, admin: true });
    const viewerSchema = buildAmbulanceFilterSchema({ hospitals, admin: false });
    const adminStation = adminSchema.find((field) => field.key === 'hospital');
    const viewerStation = viewerSchema.find((field) => field.key === 'hospital');

    expect(adminStation.options).toEqual([{ value: 'hospital-1', label: 'Central Hospital' }]);
    expect(adminStation.hidden).toBe(false);
    expect(viewerStation.hidden).toBe(true);
  });

  it('preserves filter truth, sort cycling, role projection, and read-only rail evidence', () => {
    expect(hasActiveAmbulanceFilters({ search: 'alpha' })).toBe(true);
    expect(hasActiveAmbulanceFilters({})).toBe(false);
    expect(cycleAmbulanceSort({ key: 'updated_at', direction: 'asc' }, 'updated_at'))
      .toEqual({ key: 'updated_at', direction: 'desc' });
    expect(cycleAmbulanceSort({ key: 'updated_at', direction: 'desc' }, 'updated_at'))
      .toEqual({ key: '', direction: 'asc' });
    expect(getAmbulanceRoleKind({ admin: false, orgAdmin: true })).toBe('org_admin');

    expect(getAmbulanceRailModel({
      ...rows[0],
      crew: ['Driver', null, 'Medic'],
      base_price: '25000',
    }, 'view-unit-1')).toMatchObject({
      callSign: 'Alpha 1',
      crewLabel: '2 listed',
      basePriceLabel: '25,000',
      viewOpening: true,
      editOpening: false,
    });
  });

  it('derives telemetry freshness from observed_at with received_at fallback and honest nulls', () => {
    const PLUS_MINUS = String.fromCharCode(0xB1);
    const observed = new Date(Date.now() - 4 * 60000).toISOString();
    const received = new Date(Date.now() - 9 * 60000).toISOString();

    expect(getAmbulanceRailModel({
      ...rows[0],
      location_observed_at: observed,
      location_received_at: received,
      location_accuracy_meters: 12.4,
    }, null).positionLabel).toBe(`4m ago (${PLUS_MINUS}12m)`);

    expect(getAmbulanceRailModel({
      ...rows[0],
      location_observed_at: null,
      location_received_at: received,
      location_accuracy_meters: null,
    }, null).positionLabel).toBe('9m ago');

    // No telemetry at all: never fabricate freshness (accuracy alone does not count).
    expect(getAmbulanceRailModel({
      ...rows[0],
      location_observed_at: null,
      location_received_at: null,
      location_accuracy_meters: 5,
    }, null).positionLabel).toBe('No recent telemetry');
  });
});
