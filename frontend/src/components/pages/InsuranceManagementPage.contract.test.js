import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
const page = read('InsuranceManagementPage.jsx');
const desktop = read('insurance/InsuranceDesktopWorkspace.jsx');
const mobile = read('../mobile/MobileInsurance.jsx');
const modal = read('../modals/InsuranceModal.jsx');
const analyticsModal = read('../modals/AnalyticsModal.jsx');
const service = read('../../services/insuranceService.js');
const panel = read('../context/InsurancePanel.jsx');
const bottomBar = [
  read('../navigation/DynamicBottomBar.jsx'),
  read('../../config/mobileRouteActions.js'),
].join('\n');
const mobileMenu = read('../navigation/MobileNavMenu.jsx');
const authority = read('../../../docs/implementation/console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md');

describe('Insurance revamp preservation and authority contract', () => {
  it('keeps policy commands fail-closed until a receiver and role authority are proved', () => {
    expect(authority).toContain('There is no admin policy create/edit/delete/verify RPC.');
    expect(page).not.toContain('showPolicyCommandUnavailable');
    expect(page).not.toContain('openInsuranceModal');
    expect(page).not.toMatch(/createInsurancePolicy|updateInsurancePolicy|deleteInsurancePolicy|verifyInsurancePolicy/);
    expect(page).toContain('Policy changes are unavailable');
    expect(mobile).toContain('Policy changes are unavailable');
    expect(page).not.toMatch(/onBulk|handleBulk|bulkUpdate|bulkDelete/);
    expect(panel).toContain('aria-disabled={unavailable}');
    expect(panel).toContain("data-state={unavailable ? 'unavailable' : 'available'}");
    expect(panel).toContain('Adding policies is not available yet.');
    expect(panel).toContain('Downloadable insurance reports are not available yet.');
    expect(panel).toContain('role="status"');
    expect(panel).not.toContain('toast.info');
  });

  it('preserves service-owned filtering, sort, exact counts, pagination, and failure envelopes', () => {
    expect(page).toContain('getInsurancePage({');
    expect(page).toContain('sortKey: sortConfig.key');
    expect(page).toContain('pagination.setTotalCount(page.count || 0)');
    expect(page).toContain('setInsurancePage(prevPage => ({');
    expect(service).toContain('exactCounts: true');
    expect(service).toContain('failed: true');
    expect(service).toContain('admin_policy_projection');
    expect(service).toContain('const planType = sanitizeSearchTerm(typeValues[0]);');
    expect(service).toContain("if (planType) query = query.ilike('plan_type', planType);");
    expect(service).toContain("const statsFilter = filter.statsFilter || { ...filter, kpiFilter: 'all' };");
    expect(service).toContain('expiresAfter: now.toISOString()');
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
    expect(page).toContain('denied={insurancePage.denied}');
    expect(desktop).toContain('Insurance access unavailable');
    expect(desktop).toContain('!denied && failedEmpty && <LoadErrorState');
    expect(page).not.toMatch(/useViewMode|ViewToggle|InsuranceListView|InsuranceTableView/);
    expect(page).toContain("usePageHeader('Insurance', headerActions, null, filterButtonComponent);");
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).not.toContain('usePageFooter(footerContent');
    expect(page).toContain('aria-label="Policy stats"');
    expect(page).toContain("data-state={analyticsModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('aria-label="Filter insurance policies"');
  });

  it('derives the complete module rail from the donor role string contract', () => {
    expect(page).toContain("if (isAdmin()) return 'admin';");
    expect(page).toContain("if (isOrgAdmin()) return 'org_admin';");
    expect(page).toContain("if (isProvider()) return isDriver() ? 'driver' : 'provider';");
    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).not.toContain('getConsoleModuleRailItems({');
  });

  it('keeps one shared max-three KPI strip and one activity sheet', () => {
    expect(desktop.match(/<KpiStrip/g)).toHaveLength(1);
    expect(desktop).toContain("pinnedIds={['pending', 'unverified']}");
    expect(desktop).toContain('importance={IMPORTANCE}');
    expect(desktop).not.toMatch(/<KpiStrip[^>]*\bmax=/);
    expect(desktop.match(/<ActivitySheet/g)).toHaveLength(1);
  });

  it('keeps exactly one meaningful sortable time column and filter state', () => {
    expect(desktop.match(/<SortableColumnHeader/g)).toHaveLength(1);
    expect(desktop).toContain('sortKey="created_at"');
    expect(page).toContain("created_at: { start: '', end: '' }");
    expect(page).toContain('pagination.resetPagination()');
    expect(desktop).toContain('filterSheetOpen={filterSheetOpen}');
    expect(desktop).toContain('filtersActive={hasFilter}');
  });

  it('provides admin-only visible-row selection while bulk policy writes stay fail-closed', () => {
    expect(page).toContain("import { useRowSelection } from '../../hooks/useRowSelection';");
    expect(page).toContain('const canSelectPolicies = isAdmin() && !insurancePage.denied;');
    expect(page).toContain('const visiblePolicyRows = isMobile ? mobileVisiblePolicies : paginatedPolicies;');
    expect(page).toContain('useRowSelection(visiblePolicyRows)');
    expect(page).toContain('selectable={canSelectPolicies}');
    expect(page).toContain('onToggleSelect={handleToggleSelect}');
    expect(page).toContain('onSelectClick={handleSelectClick}');
    expect(page).toContain('onSelectAll={handleSelectAll}');
    expect(page).toContain('<BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>');
    expect(page).toContain('title="Policy changes are unavailable"');
    expect(desktop).toContain('<Checkbox');
    expect(desktop).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(desktop).toContain('onCheckedChange={(value) => onToggleSelect?.(policy.id, value)}');
    expect(desktop).toContain('onSelectClick?.(event);');
    expect(page).not.toMatch(/createInsurancePolicy|updateInsurancePolicy|deleteInsurancePolicy|verifyInsurancePolicy/);
  });

  it('publishes whole route context and keeps focused-record detail behavior', () => {
    expect(page).toContain("useFocusedRecord('insurance', paginatedPolicies)");
    expect(page).toContain("new CustomEvent('insuranceRouteContextUpdated'");
    expect(page).toContain('detail: insurancePanelContext');
    expect(page).toContain('recentPolicies: paginatedPolicies.slice(0, 3)');
    expect(panel).toContain('insuranceContext');
    expect(page).toContain("window.addEventListener('openInsuranceFilters', handleOpenFilters)");
    expect(page).toContain("window.addEventListener('openInsuranceAnalytics', handleOpenAnalytics)");
    expect(panel).toContain("new CustomEvent('openInsuranceFilters')");
    expect(panel).toContain("new CustomEvent('openInsuranceAnalytics')");
    expect(panel).not.toContain("new CustomEvent('openFilters')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");
  });

  it('uses the canonical mobile LIST with honest state and no policy mutation controls', () => {
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('const selectionMode = selectionActive && selectedIdSet.size > 0;');
    expect(mobile).toContain('selectable={selectionActive}');
    expect(mobile).toContain('selected={selectedIdSet.has(policy.id)}');
    expect(mobile).toContain('onLongPress={(item) => onSelect?.(item.id, true)}');
    expect(mobile).toContain('onSelectAll={() => onSelectAll?.(true)}');
    expect(mobile).toContain('onClear={() => onSelectAll?.(false)}');
    expect(mobile).toContain('disabled');
    expect(page).toContain('selectionEnabled={canSelectPolicies}');
    expect(page).toContain('selectedIds={selectedIds}');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('<SkeletonGroupList groups={2} rowsPerGroup={[3, 2]}');
    expect(mobile).toContain('label="Policies did not load"');
    expect(mobile).toContain("const kpiEmptyCause = activeKpi !== 'all'");
    expect(mobile).toContain('mobile-insurance-degraded-state');
    expect(page).toContain('denied={insurancePage.denied}');
    expect(mobile).toContain('label="Insurance access unavailable"');
    expect(mobile).toContain('!denied && error && displayPolicies.length > 0');
    expect(page).toContain('count={insurancePage.count}');
    expect(mobile).toContain('const scopeCount = metricValue(count, policies.length);');
    expect(page).toContain('isLoadingMore={mobileLoadingMore}');
    expect(mobile).toContain('loading: loading || refetching || isLoadingMore');
    expect(mobile).toContain('Search policy, provider, or plan...');
    expect(mobile).toContain("? () => setFilters(prev => ({ ...prev, search: '' }))");
    expect(mobile).toContain("? () => setFilters(prev => ({ ...prev, status: [], type: '', verified: '', created_at: { start: '', end: '' } }))");
    expect(mobile).toContain("? () => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))");
    expect(mobile).not.toMatch(/onDelete|onEdit|onVerify|MobileFeaturedMetric|MobileSecondaryMetricRail/);
  });

  it('keeps a route-owned Policy Stats FAB without exposing policy mutation commands', () => {
    expect(bottomBar).toContain("pathname.startsWith('/insurance')");
    expect(bottomBar).toContain("canReach('/insurance')");
    expect(bottomBar).toContain("label: 'Policy stats'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openInsuranceAnalytics')");
    expect(page).toContain("window.addEventListener('openInsuranceAnalytics', handleOpenAnalytics)");
    expect(mobileMenu).toContain("'openInsuranceAnalytics'");
    expect(mobile).toContain('ROUTE-OWNED dock FAB: Policy Stats');
    expect(bottomBar).not.toContain("label: 'Add policy'");
    expect(page).toContain('onClick={handleViewAnalytics}');
    expect(page).toContain('Policy stats');
  });

  it('uses canonical free-form plan filtering and includes the inactive lifecycle state', () => {
    expect(page).toContain("type: ''");
    expect(page).toContain("{ value: 'inactive', label: 'Inactive' }");
    expect(page).toContain("key: 'type'");
    expect(page).toContain("type: 'text'");
    expect(page).toContain("label: 'Plan type'");
    expect(page).toContain("placeholder: 'Basic, Gold, PPO...'");
    expect(page).not.toMatch(/value: 'Health'|value: 'Life'|value: 'Vehicle'|value: 'Property'/);
    expect(mobile).toContain("type: '', verified: ''");
  });

  it('keeps unknown policy status neutral and single-sources policy lifecycle tones', () => {
    expect(service).toContain("String(value || '').trim().toLowerCase() || 'unknown'");
    expect(service).toContain('status: normalizeInsurancePolicyStatus(record.status)');
    expect(mobile).toContain("const normalizedStatus = (value) => String(value || '').trim().toLowerCase() || 'unknown';");
    expect(mobile).toContain("default: return 'bg-muted/40 text-muted-foreground';");
    expect(mobile).not.toContain("p.status || 'pending'");
    expect(desktop).toContain("resolveVital('insurance', normalizedStatus(status))");
    expect(panel).toContain("resolveVital('insurance', normalizedStatus(status))");
    expect(modal).toContain("resolveVital('insurance', policy?.status || 'unknown')");
    expect(desktop).not.toContain('const statusTone');
    expect(modal).not.toContain('const getStatusClass');
  });

  it('renders policy and billing context loading, failure, and loaded states independently', () => {
    expect(panel).toContain('const billingLoading = Boolean(billing.loading);');
    expect(panel).toContain('const billingError = billing.errorMessage');
    expect(panel).toContain("? 'Unavailable'");
    expect(panel).toContain('Billing outcomes did not refresh. Showing the previous results.');
    expect(panel).toContain('!billingLoading && !billingError && billingRows.length === 0');
    expect(panel).toContain('Recent policies');
    expect(panel).not.toContain('Loaded policies');
  });

  it('renders first-load, stale, hard-error, and empty desktop states with plain copy', () => {
    expect(desktop).toContain('Array.from({ length: 7 }');
    expect(desktop).toContain('<LoadErrorState title="Insurance did not load"');
    expect(desktop).toContain('Insurance did not refresh. Showing the previous results.');
    expect(desktop).toContain("heading={hasFilter ? 'No matching policies' : 'No policies'}");
    expect(panel).toContain('insuranceContext?.loading ?? !insuranceContext');
    expect(panel).toContain('role="alert"');
    expect(desktop).not.toContain('Retry to load the policy projection.');
    expect(desktop).not.toContain('Changes remain read-only until authority is proved.');
    expect(panel).not.toContain('Policy scope');
    expect(panel).not.toContain('receivers and consequences');
    expect(panel).not.toContain('No loaded policies.');
  });

  it('renders canonical coverage percentage without relabelling it as currency', () => {
    expect(service).toContain('coverage_amount: details.coverage_amount ?? record.coverage_amount ?? null');
    expect(service).toContain('coverage_percentage:');
    expect(mobile).toContain("label: 'Coverage rate'");
    expect(mobile).toContain('policy?.coverage_percentage');
    expect(modal).toContain('label="Coverage percentage"');
    expect(modal).not.toContain('label="Coverage amount"');
    expect(desktop).toContain('label="Coverage rate"');
    expect(desktop).toContain('policy.coverage_percentage');
  });

  it('distinguishes a recorded zero billing amount from a missing amount', () => {
    expect(modal).toContain("if (value === null || value === undefined || String(value).trim() === '') return 'Not set';");
    expect(modal).toContain('return Number.isFinite(number) ? `$${number.toLocaleString()}` : \'Not set\';');
    expect(modal).not.toContain('return number > 0');
  });

  it('keeps analytics explicitly scoped to visible rows', () => {
    expect(page).toContain("distributionScope: 'visible_page'");
    expect(page).toContain("distributionLabel: 'Visible page only'");
    expect(page).toContain('visibleAnalyticsPolicies');
    expect(page).toContain('pending: insuranceStats.pending');
    expect(analyticsModal).toContain("insurance: 'Pending'");
    expect(analyticsModal).toContain("color: getCount(analytics.expired) > 0 ? 'hsl(38 92% 50%)'");
  });

  it('keeps desktop search copy aligned with the proved service search contract', () => {
    expect(desktop).toContain('Search policy, provider, or plan...');
    expect(desktop).not.toContain('Search holder, policy, or provider...');
  });
});
