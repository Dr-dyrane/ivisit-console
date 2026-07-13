import {
  formatMobilePricingMoney,
  getMobilePricingCounts,
  getMobilePricingFamily,
  getMobilePricingGroups,
  getMobilePricingMeta,
  getMobilePricingScopeCount,
  hasMobilePricingFilters,
  isMobileGlobalPricingRule,
} from './mobilePricingModel';

describe('mobilePricingModel', () => {
  it('prefers projection counts over loaded-window fallback counts', () => {
    const rows = [
      { id: 'global' },
      { id: 'facility', hospital_id: 'hospital-1' },
    ];
    const counts = getMobilePricingCounts({
      allPricing: rows,
      pricingProjection: {
        totalCount: 40,
        summary: {
          globalFallbackCount: 15,
          facilityPriceCount: 25,
        },
      },
    });

    expect(counts).toEqual({ all: 40, global: 15, override: 25 });
    expect(getMobilePricingScopeCount(counts, 'global')).toBe(15);
    expect(getMobilePricingScopeCount(counts, 'override')).toBe(25);
  });

  it('preserves the mobile platform fallback classifier', () => {
    expect(isMobileGlobalPricingRule({ id: 'global' })).toBe(true);
    expect(isMobileGlobalPricingRule({ organization_id: 'org-1' })).toBe(false);
    expect(isMobileGlobalPricingRule({ hospital_id: 'hospital-1' })).toBe(false);
  });

  it('keeps family, amount, and facility labels stable', () => {
    const room = {
      room_name: 'Private Room',
      price_per_night: 250,
      currency: 'USD',
      hospital_id: 'hospital-1',
      facilityName: 'Central Hospital',
    };

    expect(getMobilePricingFamily(room)).toBe('room');
    expect(formatMobilePricingMoney(room)).toBe('$250.00');
    expect(getMobilePricingMeta(room)).toBe(
      '$250.00 / night / Central Hospital',
    );
  });

  it('uses healthy scope groups and retains facility-first ordering', () => {
    const groups = getMobilePricingGroups([
      { id: 'global-1', updated_at: '2026-07-10' },
      { id: 'global-2', updated_at: '2026-07-11' },
      { id: 'facility-1', hospital_id: 'h-1', updated_at: '2026-07-10' },
      { id: 'facility-2', hospital_id: 'h-2', updated_at: '2026-07-11' },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['facility', 'platform']);
    expect(groups.map((group) => group.label)).toEqual([
      'Facility price',
      'Platform fallback',
    ]);
  });

  it('reports only the active search, family, or scope controls as filters', () => {
    expect(hasMobilePricingFilters({
      searchTerm: '',
      kpiFilter: 'all',
      activeTab: 'all',
    })).toBe(false);
    expect(hasMobilePricingFilters({
      searchTerm: 'ward',
      kpiFilter: 'all',
      activeTab: 'all',
    })).toBe(true);
  });
});
