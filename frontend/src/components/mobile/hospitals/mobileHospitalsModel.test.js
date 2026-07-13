import {
  accumulateHospitalRows,
  createHospitalAccumulator,
  facilityTypeLabel,
  getActiveHospitalStatusFilter,
  getHospitalScopeCount,
  getMobileHospitalDetailModel,
  getMobileHospitalRowModel,
  getMobileHospitalTotals,
  hasMobileHospitalFilters,
  mapsHref,
} from './mobileHospitalsModel';

describe('mobile hospitals model characterization', () => {
  it('prefers coordinates for maps and keeps address as an encoded fallback', () => {
    expect(mapsHref({ latitude: 6.5, longitude: 3.4, address: 'Ignored' }))
      .toBe('https://maps.google.com/?q=6.5,3.4');
    expect(mapsHref({ latitude: 0, longitude: 0, address: '12 Main Road' }))
      .toBe('https://maps.google.com/?q=12%20Main%20Road');
    expect(facilityTypeLabel({ provider_type: 'specialty_clinic' })).toBe('Specialty clinic');
  });

  it('uses scoped statistics when available and visible rows as an honest fallback', () => {
    const rows = [
      { id: 'h1', status: 'available' },
      { id: 'h2', status: 'busy' },
      { id: 'h3', status: 'full' },
    ];

    expect(getMobileHospitalTotals({ total: 10, available: 7, busy: 2, full: 1 }, rows))
      .toEqual({ total: 10, available: 7, busy: 2, full: 1 });
    expect(getMobileHospitalTotals(null, rows))
      .toEqual({ total: 3, available: 1, busy: 1, full: 1 });
  });

  it('accumulates bounded pages and resets after a real response for a new scope', () => {
    const store = createHospitalAccumulator();
    const empty = [];
    const firstPage = [{ id: 'h1', name: 'One' }, { id: 'h2', name: 'Two' }];
    const secondPage = [{ id: 'h3', name: 'Three' }];

    expect(accumulateHospitalRows(store, empty, 'all')).toEqual([]);
    expect(accumulateHospitalRows(store, firstPage, 'all')).toEqual(firstPage);
    expect(accumulateHospitalRows(store, secondPage, 'all')).toEqual([...firstPage, ...secondPage]);

    expect(accumulateHospitalRows(store, secondPage, 'search')).toEqual(secondPage);
    expect(accumulateHospitalRows(store, [], 'search')).toEqual([]);
  });

  it('keeps active KPI scope aligned with heading counts', () => {
    const totals = { total: 12, available: 7, busy: 3, full: 2 };

    expect(getActiveHospitalStatusFilter({ status: ['busy'] })).toBe('busy');
    expect(getActiveHospitalStatusFilter({ status: ['busy', 'full'] })).toBe('all');
    expect(getHospitalScopeCount(totals, 'busy')).toBe(3);
    expect(getHospitalScopeCount(totals, 'all')).toBe(12);
  });

  it('projects list rows from capacity and freshness without fabricated values', () => {
    const row = getMobileHospitalRowModel({
      id: 'h1',
      name: 'Central',
      status: 'available',
      available_beds: 4,
      total_beds: 10,
      address: '12 Main Road',
      verified: true,
      updated_at: new Date().toISOString(),
    });

    expect(row).toMatchObject({
      status: 'available',
      title: 'Central',
      meta: '4 of 10 beds \u00b7 12 Main Road',
      markerChip: 'Verified',
    });
    expect(row.freshness).toEqual(expect.any(String));
  });

  it('keeps detail display identity separate from UUID mutation identity', () => {
    const detail = getMobileHospitalDetailModel({
      id: '8a9b7c6d-1234-5678',
      display_id: 'ORG-ABC123',
      status: 'busy',
      available_beds: 2,
      total_beds: 8,
      icu_beds_available: 1,
      emergency_wait_time_minutes: 24,
      ambulances_count: 3,
      emergency_eligible: true,
      booking_eligible: true,
      specialties: ['Cardiology'],
    });

    expect(detail).toMatchObject({
      facilityId: 'ORG-ABC123',
      status: 'busy',
      beds: 2,
      totalBeds: 8,
      icuBeds: 1,
      waitValue: '\u2248 24 min',
      eligibility: 'Emergency \u00b7 Booking',
      specialties: ['Cardiology'],
    });
    expect(hasMobileHospitalFilters({ search: 'central' })).toBe(true);
    expect(hasMobileHospitalFilters({})).toBe(false);
  });
});
