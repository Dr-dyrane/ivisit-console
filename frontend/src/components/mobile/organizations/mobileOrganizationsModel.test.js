import {
  buildMobileOrganizationKpis,
  formatMobileOrganizationWallet,
  formatMobileOrganizationWalletForRow,
  getMobileOrganizationPill,
  getMobileOrganizationScopeCount,
  hasActiveMobileOrganizationFilters,
  isFundedOrganization,
} from './mobileOrganizationsModel';

describe('mobile organizations model characterization', () => {
  const rows = [
    { id: 'org-1', wallet_balance: 20, is_active: true },
    { id: 'org-2', wallet_balance: 0, is_active: false },
  ];

  it('uses server totals for KPI scope while retaining row-window fallback', () => {
    const statistics = { total: 86, funded: 6, payoutGap: 80 };
    expect(buildMobileOrganizationKpis(statistics, rows).map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'all', value: 86 },
      { id: 'funded', value: 6 },
      { id: 'payout_gap', value: 80 },
    ]);
    expect(getMobileOrganizationScopeCount({
      activeKpi: 'funded',
      statistics,
      sourceOrganizations: rows,
    })).toBe(6);
    expect(getMobileOrganizationScopeCount({
      activeKpi: 'all',
      statistics: null,
      sourceOrganizations: rows,
    })).toBe(2);
  });

  it('keeps payout readiness separate from active status', () => {
    expect(isFundedOrganization(rows[0])).toBe(true);
    expect(isFundedOrganization(rows[1])).toBe(false);
    expect(getMobileOrganizationPill(rows[0])).toMatchObject({ label: 'Active', dataStatus: 'active' });
    expect(getMobileOrganizationPill(rows[1])).toMatchObject({ label: 'Inactive', dataStatus: 'inactive' });
  });

  it('keeps demo coverage visible without presenting synthetic finance', () => {
    const demoOrganization = {
      name: 'iVisit Coverage Network RUN123',
      contact_email: 'demo+coverage-run123@ivisit-demo.local',
      wallet_balance: 25000,
      is_active: true,
    };

    expect(isFundedOrganization(demoOrganization)).toBe(false);
    expect(formatMobileOrganizationWalletForRow(demoOrganization)).toBe('Simulated');
    expect(getMobileOrganizationPill(demoOrganization)).toMatchObject({
      label: 'Demo',
      dataStatus: 'demo',
    });
  });

  it('preserves mobile wallet formatting and filter semantics', () => {
    expect(formatMobileOrganizationWallet(null)).toBe('$0');
    expect(formatMobileOrganizationWallet('bad')).toBe('Not available');
    expect(hasActiveMobileOrganizationFilters({ search: '', kpiFilter: 'all' })).toBe(false);
    expect(hasActiveMobileOrganizationFilters({ search: '', kpiFilter: 'payout_gap' })).toBe(true);
  });
});
