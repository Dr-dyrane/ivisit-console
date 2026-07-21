import {
  buildMobileFleetFilterSignature,
  getMobileAmbulanceAvailabilityLabel,
  getMobileAmbulanceDetailModel,
  getMobileAmbulanceRowModel,
  getMobileFleetScopeCount,
  getMobileFleetTotals,
  hasMobileFleetFilters,
} from './mobileAmbulancesModel';

describe('mobile ambulances model characterization', () => {
  const rows = [
    { id: 'a1', call_sign: 'Alpha 1', status: 'available', vehicle_number: 'V-1' },
    { id: 'a2', call_sign: 'Alpha 2', status: 'en_route', license_plate: 'L-2', eta: '8 min' },
    { id: 'a3', call_sign: 'Alpha 3', status: 'on_trip' },
    { id: 'a4', call_sign: 'Alpha 4', status: 'maintenance' },
  ];

  it('uses route-owned exact totals and valid active status fallbacks', () => {
    expect(getMobileFleetTotals({ total: 20, available: 8 }, rows)).toEqual({
      all: 20,
      available: 8,
      onRoute: 1,
      busy: 2,
      maintenance: 1,
    });
  });

  it('keeps the active KPI heading count scoped to the selected chip', () => {
    const totals = { all: 20, available: 8, onRoute: 3, busy: 4 };
    expect(getMobileFleetScopeCount(totals, 'on_route')).toBe(3);
    expect(getMobileFleetScopeCount(totals, 'busy')).toBe(4);
    expect(getMobileFleetScopeCount(totals, 'unknown')).toBe(20);
  });

  it('preserves the committed filter axis and scope signature', () => {
    const filters = { search: 'alpha', station: 'hospital-1', created_at: { start: '2026-07-01' } };
    expect(hasMobileFleetFilters(filters)).toBe(true);
    expect(JSON.parse(buildMobileFleetFilterSignature(filters, 'available'))).toEqual({
      search: 'alpha',
      type: null,
      station: 'hospital-1',
      date: { start: '2026-07-01' },
      kpi: 'available',
    });
  });

  it('keeps active-run ETA and vehicle evidence in the directory row', () => {
    expect(getMobileAmbulanceRowModel(rows[1])).toMatchObject({
      status: 'en_route',
      title: 'Alpha 2',
      meta: 'Standard \u00b7 L-2',
      time: '8 min',
      availabilityLabel: 'En route',
    });
  });

  it('keeps display identity separate from mutation identity in the detail model', () => {
    const model = getMobileAmbulanceDetailModel({
      ...rows[1],
      display_id: 'AMB-000002',
      station_name: 'Central Hospital',
    });

    expect(model).toMatchObject({
      unitId: 'AMB-000002',
      station: 'Central Hospital',
      vehicleLabel: 'L-2',
      activeRun: true,
    });
    expect(getMobileAmbulanceAvailabilityLabel('maintenance')).toBe('Maintenance');
  });

  it('normalizes mobile type, ETA, and active-call labels without technical leakage', () => {
    const model = getMobileAmbulanceDetailModel({
      ...rows[2],
      type: 'patient_transport',
      eta: '2026-07-19T03:58:00.000Z',
      current_call: '5d1d10d8-52f2-4e45-a108-b59ac70d2123',
      active_call_display_id: 'REQ-123456',
      active_call_status: 'accepted',
    });

    expect(model.typeLabel).toBe('Patient transport');
    expect(model.etaLabel).not.toContain('T03:58');
    expect(model.currentCallLabel).toBe('REQ-123456 \u00b7 Accepted');
  });
});
