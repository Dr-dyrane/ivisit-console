import {
  buildInsurancePanelContext,
  buildVisibleInsuranceAnalytics,
  EMPTY_INSURANCE_FILTERS,
  formatInsuranceCoverage,
  formatInsurancePlanType,
  hasActiveInsuranceFilters,
  INSURANCE_FILTER_SCHEMA,
  normalizeInsuranceStatus,
  resolveInsuranceRoleKind,
} from './insurancePageModel';

describe('insurancePageModel', () => {
  it('keeps KPI scope separate from committed search and filter-sheet facets', () => {
    expect(hasActiveInsuranceFilters(EMPTY_INSURANCE_FILTERS)).toBe(false);
    expect(hasActiveInsuranceFilters({ ...EMPTY_INSURANCE_FILTERS, kpiFilter: 'pending' })).toBe(false);
    expect(hasActiveInsuranceFilters({ ...EMPTY_INSURANCE_FILTERS, search: 'Acme' })).toBe(true);
    expect(hasActiveInsuranceFilters({ ...EMPTY_INSURANCE_FILTERS, status: ['active'] })).toBe(true);
    expect(hasActiveInsuranceFilters({
      ...EMPTY_INSURANCE_FILTERS,
      created_at: { start: '2026-07-01', end: '' },
    })).toBe(true);
  });

  it('keeps the canonical free-form plan filter and inactive lifecycle option', () => {
    const status = INSURANCE_FILTER_SCHEMA.find((field) => field.key === 'status');
    const plan = INSURANCE_FILTER_SCHEMA.find((field) => field.key === 'type');

    expect(status.options).toContainEqual({ value: 'inactive', label: 'Inactive' });
    expect(plan).toMatchObject({
      type: 'text',
      label: 'Plan type',
      placeholder: 'Basic, Gold, PPO...',
    });
    expect(plan.options).toBeUndefined();
  });

  it('normalizes display-only policy evidence without manufacturing status or coverage', () => {
    expect(normalizeInsuranceStatus(null)).toBe('unknown');
    expect(formatInsurancePlanType({ plan_type: 'gold_plus' })).toBe('Gold plus');
    expect(formatInsuranceCoverage({ coverage_percentage: 0 })).toBe('0%');
    expect(formatInsuranceCoverage({ coverage_percentage: null })).toBeNull();
  });

  it('preserves role precedence for the admin-only route chrome', () => {
    expect(resolveInsuranceRoleKind({ admin: true, orgAdmin: true, provider: true, driver: true }))
      .toBe('admin');
    expect(resolveInsuranceRoleKind({ admin: false, orgAdmin: true, provider: true, driver: false }))
      .toBe('org_admin');
    expect(resolveInsuranceRoleKind({ admin: false, orgAdmin: false, provider: true, driver: true }))
      .toBe('driver');
    expect(resolveInsuranceRoleKind({ admin: false, orgAdmin: false, provider: false, driver: false }))
      .toBe('viewer');
  });

  it('labels distributions as visible-page evidence while retaining exact route totals', () => {
    const analytics = buildVisibleInsuranceAnalytics({
      rows: [
        { provider_name: 'Acme', plan_type: 'Gold' },
        { provider_name: 'Acme', coverage_type: 'Basic' },
        {},
      ],
      stats: {
        total: 40,
        active: 18,
        pending: 4,
        verified: 16,
        expired: 2,
        expiringSoon: 3,
      },
    });

    expect(analytics).toMatchObject({
      total: 40,
      active: 18,
      pending: 4,
      visibleCount: 3,
      distributionScope: 'visible_page',
      distributionLabel: 'Visible page only',
      byProvider: { Acme: 2, 'Unknown provider': 1 },
      byCategory: { Gold: 1, Basic: 1, 'Unknown type': 1 },
    });
  });

  it('publishes policy and billing evidence without granting management authority', () => {
    const context = buildInsurancePanelContext({
      policies: [{ id: 'policy-1' }, { id: 'policy-2' }],
      focusedPolicy: { id: 'policy-2' },
      stats: { total: 7, scope: 'admin_policy_projection' },
      page: { count: 7, denied: false, failed: false, reason: null },
      pagination: { totalCount: 7, currentPage: 1, totalPages: 1 },
      filters: EMPTY_INSURANCE_FILTERS,
      hasFilters: false,
      sortConfig: { key: 'created_at', direction: 'desc' },
      loading: false,
      billing: { count: 2, scope: 'admin_billing_outcome_projection' },
      errorMessage: null,
    });

    expect(context.count).toBe(7);
    expect(context.recentPolicies).toHaveLength(2);
    expect(context.billing.count).toBe(2);
    expect(context.canManagePolicies).toBe(false);
  });
});
