import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
const page = read('InsuranceManagementPage.jsx');
const desktop = read('insurance/InsuranceDesktopWorkspace.jsx');
const mobile = read('../mobile/MobileInsurance.jsx');
const service = read('../../services/insuranceService.js');
const panel = read('../context/InsurancePanel.jsx');
const authority = read('../../../docs/implementation/console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md');

describe('Insurance revamp preservation and authority contract', () => {
  it('keeps policy commands fail-closed until a receiver and role authority are proved', () => {
    expect(authority).toContain('There is no admin policy create/edit/delete/verify RPC.');
    expect(page).toContain("showPolicyCommandUnavailable('Add policy')");
    expect(page).not.toMatch(/createInsurancePolicy|updateInsurancePolicy|deleteInsurancePolicy|verifyInsurancePolicy/);
    expect(desktop).toContain('selection excluded by decision');
  });

  it('preserves service-owned filtering, sort, exact counts, pagination, and failure envelopes', () => {
    expect(page).toContain('getInsurancePage({');
    expect(page).toContain('sortKey: sortConfig.key');
    expect(page).toContain('pagination.setTotalCount(page.count || 0)');
    expect(page).toContain('setInsurancePage(prevPage => ({');
    expect(service).toContain('exactCounts: true');
    expect(service).toContain('failed: true');
    expect(service).toContain('admin_policy_projection');
  });

  it('preserves separate billing evidence and both realtime cleanup owners', () => {
    expect(page).toContain('getInsuranceBillingOutcomes({');
    expect(page).toContain('subscribeToInsurancePolicies');
    expect(page).toContain('subscribeToInsuranceBillingOutcomes');
    expect(page).toContain('unsubscribe();');
    expect(page).toContain('unsubscribeBilling();');
    expect(page).toContain('billing: insuranceBillingContext');
  });

  it('composes the canonical desktop workspace without legacy density views', () => {
    expect(page).toContain('<InsuranceDesktopWorkspace');
    expect(desktop).toContain('<WorkspaceStage');
    expect(desktop).toContain('<SignalPanel');
    expect(desktop).toContain('<KpiStrip');
    expect(desktop).toContain('<ActivitySheet');
    expect(desktop).toContain('<SheetToolbar');
    expect(desktop).toContain('<ListRowShell');
    expect(desktop).toContain('<DetailRailShell');
    expect(page).not.toMatch(/useViewMode|ViewToggle|InsuranceListView|InsuranceTableView/);
  });

  it('keeps exactly one meaningful sortable time column and filter state', () => {
    expect(desktop.match(/<SortableColumnHeader/g)).toHaveLength(1);
    expect(desktop).toContain('sortKey="created_at"');
    expect(page).toContain("created_at: { start: '', end: '' }");
    expect(page).toContain('pagination.resetPagination()');
    expect(desktop).toContain('filterSheetOpen={filterSheetOpen}');
    expect(desktop).toContain('filtersActive={hasFilter}');
  });

  it('does not advertise selection without policy mutation authority', () => {
    expect(page).not.toContain('useRowSelection(insurancePolicies)');
    expect(desktop).not.toContain('<Checkbox');
    expect(desktop).not.toContain('Changes unavailable');
    expect(desktop).toContain('selection excluded by decision');
  });

  it('publishes whole route context and keeps focused-record detail behavior', () => {
    expect(page).toContain("useFocusedRecord('insurance', paginatedPolicies)");
    expect(page).toContain("new CustomEvent('insuranceRouteContextUpdated'");
    expect(page).toContain('detail: insurancePanelContext');
    expect(page).toContain('recentPolicies: paginatedPolicies.slice(0, 3)');
    expect(panel).toContain('insuranceContext');
  });

  it('uses the canonical mobile LIST with honest state and no policy mutation controls', () => {
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('<SkeletonGroupList groups={2} rowsPerGroup={[3, 2]}');
    expect(mobile).toContain('label="Policies did not load"');
    expect(mobile).toContain("const kpiEmptyCause = activeKpi !== 'all'");
    expect(mobile).toContain('mobile-insurance-degraded-state');
    expect(mobile).not.toMatch(/onDelete|onEdit|onVerify|MobileFeaturedMetric|MobileSecondaryMetricRail/);
  });

  it('keeps analytics explicitly scoped to visible rows', () => {
    expect(page).toContain("distributionScope: 'visible_page'");
    expect(page).toContain("distributionLabel: 'Visible page only'");
    expect(page).toContain('visibleAnalyticsPolicies');
  });

  it('keeps desktop search copy aligned with the proved service search contract', () => {
    expect(desktop).toContain('Search policy, provider, or plan...');
    expect(desktop).not.toContain('Search holder, policy, or provider...');
  });
});
