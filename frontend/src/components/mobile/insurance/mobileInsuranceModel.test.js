import {
  buildMobileInsuranceGroups,
  buildMobileInsuranceHeading,
  buildMobileInsuranceKpis,
  getMobileInsuranceOrbClass,
  getMobileInsurancePill,
  hasActiveMobileInsuranceFilters,
} from './mobileInsuranceModel';

describe('mobileInsuranceModel', () => {
  it('uses exact route stats for the status axis and loaded rows only as the total fallback', () => {
    expect(buildMobileInsuranceKpis({
      total: 20,
      active: 8,
      pending: 5,
      expired: 3,
      unverified: 4,
    }, 2).map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'all', value: 20 },
      { id: 'active', value: 8 },
      { id: 'pending', value: 5 },
      { id: 'expired', value: 3 },
      { id: 'unverified', value: 4 },
    ]);
    expect(buildMobileInsuranceKpis({}, 2)[0].value).toBe(2);
  });

  it('keeps unknown status neutral and ordinary expiration amber', () => {
    expect(getMobileInsurancePill(null)).toMatchObject({
      label: 'Unknown',
      className: 'bg-muted/40 text-muted-foreground',
    });
    expect(getMobileInsuranceOrbClass('expired')).toContain('bg-amber-500/12');
    expect(getMobileInsuranceOrbClass('unexpected')).toBe('bg-muted/40 text-muted-foreground');
  });

  it('tracks only search and filter-sheet facets as the filter trigger signal', () => {
    expect(hasActiveMobileInsuranceFilters({ kpiFilter: 'pending' })).toBe(false);
    expect(hasActiveMobileInsuranceFilters({ search: 'policy' })).toBe(true);
    expect(hasActiveMobileInsuranceFilters({ type: 'PPO' })).toBe(true);
    expect(hasActiveMobileInsuranceFilters({ verified: 'unverified' })).toBe(true);
    expect(hasActiveMobileInsuranceFilters({ created_at: { end: '2026-07-13' } })).toBe(true);
  });

  it('keeps loading, denied, failed, and loaded heading truth distinct', () => {
    expect(buildMobileInsuranceHeading({ loading: true })).toBe('Loading policies...');
    expect(buildMobileInsuranceHeading({ loading: false, denied: true })).toBe('Insurance access unavailable');
    expect(buildMobileInsuranceHeading({
      loading: false,
      denied: false,
      error: true,
      visibleCount: 0,
    })).toBe('Policies did not load');
    expect(buildMobileInsuranceHeading({
      loading: false,
      denied: false,
      error: false,
      visibleCount: 1,
      scopeCount: 1,
    })).toBe('1 policy');
  });

  it('groups every visible policy without changing the server-owned row set', () => {
    const policies = [
      { id: 'pending', status: 'pending', created_at: '2026-07-13T00:00:00Z' },
      { id: 'active', status: 'active', created_at: '2026-07-12T00:00:00Z' },
      { id: 'expired', status: 'expired', created_at: '2026-07-11T00:00:00Z' },
      { id: 'inactive', status: 'inactive', created_at: '2026-07-10T00:00:00Z' },
    ];
    const grouped = buildMobileInsuranceGroups(policies);

    expect(grouped.groups.flatMap((group) => group.items.map((item) => item.id)).sort())
      .toEqual(policies.map((policy) => policy.id).sort());
  });
});
