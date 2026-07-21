import {
  buildAmbulanceFilterSchema,
  buildAmbulanceQueryFilter,
  buildAmbulanceRouteContext,
  cycleAmbulanceSort,
  getAmbulanceActiveCallModel,
  getAmbulanceDriverModel,
  getAmbulanceRailModel,
  getAmbulanceRoleKind,
  getAmbulanceSignal,
  getFleetStateCount,
  hasActiveAmbulanceFilters,
} from './ambulancePageModel';
import { formatDayTime } from '../../../utils/dayTime';

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

  it('offers the full DB status domain in the read-only filter grammar (ADOPT-38)', () => {
    const schema = buildAmbulanceFilterSchema({ hospitals: [], admin: false });
    const statusOptions = schema.find((field) => field.key === 'status').options;

    expect(statusOptions).toEqual([
      { value: 'available', label: 'Available' },
      { value: 'en_route', label: 'En Route' },
      { value: 'busy', label: 'Busy' },
      { value: 'returning', label: 'Returning' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'offline', label: 'Offline' },
      { value: 'pending_approval', label: 'Pending approval' },
    ]);
  });

  it('counts approval-core and off-rotation states with exact stats and row fallback (ADOPT-38)', () => {
    const fleet = [
      { id: 'u1', status: 'pending_approval' },
      { id: 'u2', status: 'offline' },
      { id: 'u3', status: 'returning' },
      { id: 'u4', status: 'available' },
    ];

    expect(getFleetStateCount({ id: 'pending_approval', stats: { pendingApproval: 3 }, ambulances: [] })).toBe(3);
    expect(getFleetStateCount({ id: 'returning', stats: { returning: 2 }, ambulances: [] })).toBe(2);
    expect(getFleetStateCount({ id: 'offline', stats: { offline: 5 }, ambulances: [] })).toBe(5);
    expect(getFleetStateCount({ id: 'pending_approval', stats: null, ambulances: fleet })).toBe(1);
    expect(getFleetStateCount({ id: 'returning', stats: null, ambulances: fleet })).toBe(1);
    expect(getFleetStateCount({ id: 'offline', stats: null, ambulances: fleet })).toBe(1);
    // An exact zero renders honestly as 0, never a fabricated presence.
    expect(getFleetStateCount({ id: 'pending_approval', stats: { pendingApproval: 0 }, ambulances: [] })).toBe(0);
  });

  it('speaks an honest zero when the approval-core filter matches nothing (ADOPT-38)', () => {
    expect(getAmbulanceSignal({
      stats: { total: 9, pendingApproval: 0 },
      ambulances: [],
      kpiFilter: 'pending_approval',
      loadError: null,
    })).toMatchObject({
      iconKey: 'pending',
      tone: 'attention',
      headline: 'No units awaiting approval',
    });

    expect(getAmbulanceSignal({
      stats: { pendingApproval: 2 },
      ambulances: [],
      kpiFilter: 'pending_approval',
      loadError: null,
    }).headline).toBe('2 units awaiting approval');

    expect(getAmbulanceSignal({
      stats: { offline: 1 },
      ambulances: [],
      kpiFilter: 'offline',
      loadError: null,
    })).toMatchObject({ iconKey: 'offline', headline: '1 unit offline' });

    expect(getAmbulanceSignal({
      stats: { returning: 0 },
      ambulances: [],
      kpiFilter: 'returning',
      loadError: null,
    })).toMatchObject({ iconKey: 'returning', headline: 'No returning units' });
  });

  it('surfaces the commissioned date via the shared day formatter with an honest null (ADOPT-39)', () => {
    const commissioned = '2024-03-05T12:00:00Z';
    const withDate = getAmbulanceRailModel({ ...rows[0], created_at: commissioned }, null);

    expect(withDate.commissionedLabel).toBe(formatDayTime(commissioned));
    expect(withDate.commissionedLabel).toContain('2024');

    expect(getAmbulanceRailModel({ ...rows[0], created_at: null }, null).commissionedLabel).toBe('Unknown');
  });

  it('projects driver identity without leaking unresolved person UUIDs (ADOPT-22)', () => {
    const DRIVER_ID = '44444444-4444-4444-8444-444444444444';

    // No profile_id: truthfully Unassigned, no copy target, no phone.
    expect(getAmbulanceDriverModel({ profile_id: null })).toEqual({
      assigned: false,
      label: 'Unassigned',
      copyValue: null,
      phone: null,
    });

    // Resolved: real name and phone, no UUID chip.
    expect(getAmbulanceDriverModel({
      profile_id: DRIVER_ID,
      driver_name: 'Ada Obi',
      driver_phone: '+2348012345678',
    })).toEqual({
      assigned: true,
      label: 'Ada Obi',
      copyValue: null,
      phone: '+2348012345678',
    });

    // Unresolved (for example an RLS-blocked read): keep the assigned state
    // honest without exposing an internal person identifier.
    expect(getAmbulanceDriverModel({ profile_id: DRIVER_ID, driver_name: null })).toEqual({
      assigned: true,
      label: 'Driver details unavailable',
      copyValue: null,
      phone: null,
    });

    // The rail model carries the same projection.
    expect(getAmbulanceRailModel({ ...rows[0], profile_id: null }, null).driver.label).toBe('Unassigned');
  });

  it('projects active-call context only when current_call exists (ADOPT-23)', () => {
    const CALL_ID = '55555555-5555-4555-8555-555555555555';

    // Idle unit: the linkage is ABSENT, never fabricated.
    expect(getAmbulanceActiveCallModel({ current_call: null })).toBeNull();
    expect(getAmbulanceRailModel(rows[0], null).activeCall).toBeNull();

    // Resolved: emergency display id + humanized status, display id copyable.
    expect(getAmbulanceActiveCallModel({
      current_call: CALL_ID,
      active_call_display_id: 'EMG-000123',
      active_call_status: 'in_progress',
    })).toEqual({
      reference: 'EMG-000123',
      statusLabel: 'In Progress',
      copyValue: 'EMG-000123',
    });

    // Unresolved: truncated request UUID with the raw id as copy target and
    // no invented status.
    expect(getAmbulanceActiveCallModel({ current_call: CALL_ID })).toEqual({
      reference: '55555555',
      statusLabel: null,
      copyValue: CALL_ID,
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
