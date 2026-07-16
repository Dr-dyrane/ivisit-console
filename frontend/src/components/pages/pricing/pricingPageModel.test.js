import {
  buildPricingAnalytics,
  buildPricingPageQuery,
  buildPricingRouteContext,
  formatPricingAmount,
  formatPricingAmountWithUnit,
  formatPricingRelativeDate,
  formatResolvedPricePreview,
  getPricingDescription,
  getPricingKpiCount,
  getPricingRoleKind,
  getPricingRowMetaLine,
  getPricingRuleType,
  getPricingUnitSuffix,
  getPricingWorkspaceState,
  isGlobalPricingRule,
  normalizePricingProjection,
} from './pricingPageModel';

describe('pricingPageModel', () => {
  it('normalizes projection shape without inventing rows or aggregate truth', () => {
    const projection = normalizePricingProjection({
      rows: null,
      totalCount: '14',
      summary: { facilityPriceCount: 9 },
      readState: { basis: 'exact_server_counts' },
      scope: { mode: 'organization_summary' },
    });

    expect(projection.rows).toEqual([]);
    expect(projection.totalCount).toBe(14);
    expect(projection.summary).toMatchObject({
      globalFallbackCount: 0,
      facilityPriceCount: 9,
      basis: 'current_filter',
    });
    expect(projection.readState.basis).toBe('exact_server_counts');
    expect(projection.scope).toEqual({ mode: 'organization_summary' });
  });

  it('preserves desktop paging and the cumulative mobile server window', () => {
    const shared = {
      activeTab: 'rooms',
      organizationId: 'org-1',
      searchTerm: 'ward',
      kpiFilter: 'override',
      sortDirection: 'asc',
      currentPage: 3,
      itemsPerPage: 12,
    };

    expect(buildPricingPageQuery({ ...shared, isMobile: false })).toEqual({
      family: 'rooms',
      organizationId: 'org-1',
      search: 'ward',
      scope: 'override',
      sortDirection: 'asc',
      page: 3,
      pageSize: 12,
    });
    expect(buildPricingPageQuery({ ...shared, isMobile: true })).toMatchObject({
      organizationId: 'org-1',
      page: 1,
      pageSize: 36,
    });
  });

  it('keeps role rails and selection scope independent from pricing mutation authority', () => {
    expect(getPricingRoleKind({ admin: true })).toBe('admin');
    expect(getPricingRoleKind({ orgAdmin: true })).toBe('org_admin');
    expect(getPricingRoleKind({ provider: true, driver: true })).toBe('driver');
    expect(getPricingRoleKind({ provider: true, driver: false })).toBe('provider');
    expect(getPricingRoleKind({})).toBe('viewer');
  });

  it('builds analytics and route context only from the supplied projection', () => {
    const summary = {
      globalFallbackCount: 4,
      facilityPriceCount: 6,
      recentCount: 2,
    };
    expect(buildPricingAnalytics({ summary, totalCount: 10 })).toEqual({
      total: 10,
      active: 10,
      recent: 2,
      byCategory: { global: 4, override: 6 },
    });

    const rows = [1, 2, 3, 4, 5].map((id) => ({ id }));
    const context = buildPricingRouteContext({
      pricing: rows,
      focusedPrice: rows[1],
      summary,
      totalCount: 10,
      activeTab: 'all',
      kpiFilter: 'all',
      searchTerm: '',
      loading: false,
      loadError: null,
      projection: {
        readState: { basis: 'exact_server_counts' },
        scope: { mode: 'organization_summary' },
      },
    });

    expect(context.recentPricing).toEqual(rows.slice(0, 4));
    expect(context.scope).toEqual({ mode: 'organization_summary' });
    expect(context.canManagePricing).toBe(false);
  });

  it('keeps platform fallback and facility identity explicit in row presentation', () => {
    expect(isGlobalPricingRule({ id: 'global' })).toBe(true);
    expect(isGlobalPricingRule({ id: 'facility', hospitalId: 'hospital-1' })).toBe(false);
    expect(formatPricingAmount({ amount: 12.5, currency: 'USD' })).toBe('$12.50');
    expect(getPricingKpiCount({ totalCount: 20 }, 9, 'all')).toBe(20);
    expect(getPricingKpiCount({ facilityPriceCount: 7 }, 9, 'override')).toBe(7);
  });

  it('surfaces the price-resolution key and description with honest absence', () => {
    // Normalized rows carry service_type/room_type as `type`; raw rows keep
    // the family-specific column names.
    expect(getPricingRuleType({ type: 'consultation' })).toBe('consultation');
    expect(getPricingRuleType({ service_type: 'lab_test' })).toBe('lab_test');
    expect(getPricingRuleType({ room_type: 'icu' })).toBe('icu');
    expect(getPricingRuleType({ type: '   ' })).toBeNull();
    expect(getPricingRuleType({})).toBeNull();

    expect(getPricingRowMetaLine({ amount: 12.5, currency: 'USD', type: 'consultation' }))
      .toBe('$12.50 \u00b7 consultation');
    expect(getPricingRowMetaLine({ amount: 12.5, currency: 'USD' })).toBe('$12.50');

    expect(getPricingDescription({ description: ' Ward day rate. ' })).toBe('Ward day rate.');
    expect(getPricingDescription({ description: '   ' })).toBeNull();
    expect(getPricingDescription({ description: null })).toBeNull();
    expect(getPricingDescription({})).toBeNull();
  });

  it('renders unit suffixes only from room per-night truth (ADOPT-58)', () => {
    expect(getPricingUnitSuffix({ family: 'room' })).toBe('/ night');
    expect(getPricingUnitSuffix({ _pricingType: 'room' })).toBe('/ night');
    expect(getPricingUnitSuffix({ price_per_night: 120 })).toBe('/ night');
    expect(getPricingUnitSuffix({ family: 'service' })).toBeNull();
    expect(getPricingUnitSuffix({ base_price: 50 })).toBeNull();
    expect(getPricingUnitSuffix({})).toBeNull();

    expect(formatPricingAmountWithUnit({ family: 'room', amount: 120, currency: 'USD' }))
      .toBe('$120.00 / night');
    expect(formatPricingAmountWithUnit({ family: 'service', amount: 40, currency: 'USD' }))
      .toBe('$40.00');
    expect(getPricingRowMetaLine({
      family: 'room', amount: 120, currency: 'USD', type: 'general',
    })).toBe('$120.00 / night \u00b7 general');
  });

  it('formats created/updated provenance with the shared relative formatter (ADOPT-59)', () => {
    expect(formatPricingRelativeDate(null)).toBeNull();
    expect(formatPricingRelativeDate(undefined)).toBeNull();
    expect(formatPricingRelativeDate('not-a-date')).toBeNull();
    expect(formatPricingRelativeDate(new Date(Date.now() - (5 * 60000)).toISOString()))
      .toBe('5m ago');
  });

  it('keeps the resolved-price preview honest across states (ADOPT-64)', () => {
    expect(formatResolvedPricePreview(null)).toBeNull();
    expect(formatResolvedPricePreview({ status: 'idle', row: null })).toBeNull();
    expect(formatResolvedPricePreview({ status: 'loading', row: null })).toBeNull();
    expect(formatResolvedPricePreview({ status: 'error', row: null }))
      .toBe('Preview unavailable');
    expect(formatResolvedPricePreview({ status: 'unavailable', row: null }))
      .toBe('No resolution key');
    expect(formatResolvedPricePreview({ status: 'empty', row: null }))
      .toBe('No resolved price');
    expect(formatResolvedPricePreview(
      { status: 'resolved', row: { name: 'General Ward', price: 120.5, currency: 'USD' } },
      { family: 'room' },
    )).toBe('$120.50 / night \u00b7 General Ward');
    expect(formatResolvedPricePreview(
      { status: 'resolved', row: { name: null, price: 40, currency: 'USD' } },
      { family: 'service' },
    )).toBe('$40.00');
  });

  it('keeps failure and empty signals honest', () => {
    const failed = getPricingWorkspaceState({
      summary: {},
      totalCount: 0,
      active: 'all',
      error: 'Pricing rules could not load. Try again.',
      rowCount: 0,
    });
    expect(failed.failedEmpty).toBe(true);
    expect(failed.signal).toMatchObject({
      tone: 'danger',
      headline: 'Pricing did not load',
    });

    const empty = getPricingWorkspaceState({
      summary: {},
      totalCount: 0,
      active: 'all',
      error: null,
      rowCount: 0,
    });
    expect(empty.signal.headline).toBe('No pricing rules');
  });
});
