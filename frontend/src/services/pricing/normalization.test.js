import {
  getFamiliesForPage,
  normalizePricingFamily,
  normalizePricingRow,
  normalizeSearch,
  sortPricingRows,
} from './normalization';

describe('pricing projection normalization', () => {
  it('keeps service and room family aliases distinct', () => {
    expect(normalizePricingFamily('service')).toBe('services');
    expect(normalizePricingFamily('services')).toBe('services');
    expect(normalizePricingFamily('room')).toBe('rooms');
    expect(normalizePricingFamily('rooms')).toBe('rooms');
    expect(normalizePricingFamily('unknown')).toBe('all');
    expect(getFamiliesForPage('services')).toEqual(['service']);
    expect(getFamiliesForPage('rooms')).toEqual(['room']);
    expect(getFamiliesForPage()).toEqual(['service', 'room']);
  });

  it('preserves service amount, USD, facility UUID, and unit semantics', () => {
    const hospitalMap = new Map([[
      'hospital-uuid',
      { id: 'hospital-uuid', organization_id: 'organization-uuid', name: 'Central Hospital' },
    ]]);
    const row = normalizePricingRow({
      id: 'service-rule',
      hospital_id: 'hospital-uuid',
      organization_id: 'stale-organization',
      service_name: 'Consultation',
      service_type: 'consultation',
      base_price: '125.50',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: null,
    }, 'service', hospitalMap);

    expect(row).toMatchObject({
      _pricingType: 'service',
      family: 'service',
      hospitalId: 'hospital-uuid',
      hospital_id: 'hospital-uuid',
      organizationId: 'organization-uuid',
      organization_id: 'organization-uuid',
      facilityName: 'Central Hospital',
      sourceLabel: 'facility price',
      source_label: 'facility price',
      name: 'Consultation',
      type: 'consultation',
      amount: 125.5,
      currency: 'USD',
      active: null,
      updatedAt: '2026-01-02T00:00:00.000Z',
      unit: 'Unit',
    });
  });

  it('preserves room amount parsing and platform fallback semantics', () => {
    const row = normalizePricingRow({
      id: 'room-rule',
      hospital_id: null,
      room_name: 'General ward',
      room_type: 'general',
      price_per_night: 'not-a-number',
      updated_at: '2026-01-03T00:00:00.000Z',
    }, 'room', new Map());

    expect(row).toMatchObject({
      family: 'room',
      hospitalId: null,
      organizationId: null,
      facilityName: null,
      sourceLabel: 'platform fallback',
      name: 'General ward',
      type: 'general',
      amount: 0,
      currency: 'USD',
      updatedAt: '2026-01-03T00:00:00.000Z',
      unit: 'Night',
    });
  });

  it('keeps search cleanup and deterministic updated/id sorting unchanged', () => {
    expect(normalizeSearch('  Critical!!!   Care  ')).toBe('critical care');

    const rows = [
      { id: 'b', updated_at: null },
      { id: 'c', updated_at: '2026-01-02T00:00:00.000Z' },
      { id: 'a', updated_at: '2026-01-01T00:00:00.000Z' },
    ];
    expect([...rows].sort((a, b) => sortPricingRows(a, b, 'desc')).map((row) => row.id))
      .toEqual(['c', 'a', 'b']);
    expect([...rows].sort((a, b) => sortPricingRows(a, b, 'asc')).map((row) => row.id))
      .toEqual(['a', 'c', 'b']);
  });
});
