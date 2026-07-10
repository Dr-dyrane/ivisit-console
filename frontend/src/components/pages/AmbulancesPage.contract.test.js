import fs from 'fs';
import { execFileSync } from 'child_process';
import { getAccessibleNav } from '../../config/navigation';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('AmbulancesPage visual-start repair contract', () => {
  const pageSource = () => fs.readFileSync('src/components/pages/AmbulancesPage.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileAmbulances.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/AmbulanceModal.jsx', 'utf8');
  const listSource = () => fs.readFileSync('src/components/views/AmbulanceListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/AmbulanceTableView.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/ambulancesService.js', 'utf8');
  const queryHookSource = () => fs.readFileSync('src/hooks/useAmbulancesQuery.js', 'utf8');
  const panelSource = () => fs.readFileSync('src/components/context/AmbulancesPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const contextActionSource = () => fs.readFileSync('src/hooks/useContextAction.js', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const mobileKpiStripSource = () => fs.readFileSync('src/components/mobile/MobileKPIStrip.jsx', 'utf8');
  const mobileMetricListSource = () => fs.readFileSync('src/components/mobile/MobileMetricList.jsx', 'utf8');
  const mobileListStatesSource = () => fs.readFileSync('src/components/mobile/MobileListStates.jsx', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  const providerOperationsChart = () => fs.readFileSync(
    'docs/implementation/console-service-alignment/contracts/PROVIDER_OPERATIONS_CONTRACT_CHART_2026-05-24.md',
    'utf8'
  );
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
  const PRESERVATION_BASELINE = 'f31f29f';
  const headSource = (path) => execFileSync('git', ['show', `${PRESERVATION_BASELINE}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  it('keeps Ambulances org-admin scoped in route and navigation contracts', () => {
    expect(getRouteProtection('/ambulances')).toEqual({
      minRole: 'org_admin',
      resource: 'ambulances',
      title: 'Ambulances',
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/ambulances');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/ambulances');
    expect(getProtectedRoutesForRole('provider')).not.toContain('/ambulances');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/ambulances');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/ambulances');

    expect(getAccessibleNav({ role: 'org_admin' }).ops.items.find((item) => item.path === '/ambulances')?.label)
      .toBe('Ambulances');
  });

  it('anchors the Ambulances intake ledger to old Git-backed behavior', () => {
    const oldPage = headSource('frontend/src/components/pages/AmbulancesPage.jsx');
    const oldMobile = headSource('frontend/src/components/mobile/MobileAmbulances.jsx');
    const oldModal = headSource('frontend/src/components/modals/AmbulanceModal.jsx');
    const oldService = headSource('frontend/src/services/ambulancesService.js');
    const gate = gateSource();

    expect(oldPage).toContain('usePageData');
    expect(oldPage).toContain('ambulancesData');
    expect(oldPage).toContain('refreshAllData');
    expect(oldPage).toContain("supabase.from('ambulances')");
    expect(oldPage).toContain('applyAuthFilter');
    expect(oldPage).toContain('dataQuery = dataQuery.limit(1000)');
    expect(oldPage).toContain("useViewMode('ambulances-page', 'grid')");
    expect(oldPage).toContain('<ViewToggle value={viewMode} onChange={setViewMode} />');
    expect(oldPage).toContain("viewMode === 'grid'");
    expect(oldPage).toContain("viewMode === 'list'");
    expect(oldPage).toContain("viewMode === 'table'");
    expect(oldPage).toContain('<AmbulanceListView');
    expect(oldPage).toContain('<AmbulanceTableView');
    expect(oldPage).toContain('<FilterSheet');
    expect(oldPage).toContain('<AnalyticsModal');
    expect(oldPage).toContain('<AmbulanceModal');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('handleBulkDelete');
    expect(oldPage).toContain('handleDelete');
    expect(oldPage).toContain('selectedIds.map((id) => deleteAmbulance(id))');
    expect(oldPage).toContain('<PaginationControls');
    expect(oldPage).toContain("params.get('add') === 'true'");
    expect(oldPage).toContain('openAmbulanceModal');
    expect(oldPage).toContain('openAnalyticsModal');

    expect(oldMobile).toContain('<PullToRefresh onRefresh={onRefresh}>');
    expect(oldMobile).toContain('new IntersectionObserver(');
    expect(oldMobile).toContain('MobileKPIStrip');
    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('MobileSecondaryMetricRail');
    expect(oldMobile).toContain('growthData');
    expect(oldMobile).toContain('filteredAmbulances');
    expect(oldMobile).toContain("trend: 'LIVE'");
    expect(oldMobile).toContain('onDelete');
    expect(oldMobile).toContain('onLoadMore');

    expect(oldModal).toContain("uploadImage(file, 'ambulances')");
    expect(oldModal).toContain('getProfilesByRole');
    expect(oldModal).toContain('driverManagementService.getActiveAssignments(ambulance.hospital_id)');
    expect(oldModal).toContain('driverManagementService.updateTripStatus');
    expect(oldModal).toContain('driverManagementService.completeTrip');
    expect(oldModal).toContain('driverManagementService.cancelTrip');
    expect(oldModal).toContain('rating: 4.5');
    expect(oldModal).toContain('hospital_id: orgId');
    expect(oldModal).toContain('role="dialog"');
    expect(oldModal).toContain('fixed inset-0');

    expect(oldService).toContain('export async function createAmbulance(input)');
    expect(oldService).toContain('export async function updateAmbulance(ambulanceId, input)');
    expect(oldService).toContain('export async function deleteAmbulance(ambulanceId)');
    expect(oldService).toContain('export async function updateAmbulanceLocation(ambulanceId, location)');
    expect(oldService).toContain('export async function updateAmbulanceStatus(ambulanceId, status)');
    expect(oldService).toContain('export function subscribeToAllAmbulances(callback)');

    expect(gate).toContain('## Page 9 Intake Audit: Ambulances');
    expect(gate).toContain('Decision: Ambulances is admitted for guarded continuation under the Today/Requests canon');
    expect(gate).toContain('HEAD snapshot evidence for this ledger');
    expect(gate).toContain('| Exact count plus capped `limit(1000)` client pagination.');
    expect(gate).toContain('| Single delete and bulk delete.');
    expect(gate).toContain('| Mobile fake trend/chart data, `LIVE` claims, local-only filtering, row-derived rating, busy, and status totals.');
    expect(gate).not.toContain('It is not yet a typed route summary.');
    expect(gate).not.toContain('Context panel summary remains inventory until typed route feedback is designed.');
  });

  it('records fleet route-data and visual-start repair while full admission remains blocked', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const modal = modalSource();
    const list = listSource();
    const table = tableSource();
    const service = serviceSource();
    const panel = panelSource();
    const contextPanel = contextPanelSource();
    const contextAction = contextActionSource();
    const fab = fabSource();
    const mobileKpiStrip = mobileKpiStripSource();
    const mobileMetricList = mobileMetricListSource();
    const mobileListStates = mobileListStatesSource();
    const gate = gateSource();
    const chart = providerOperationsChart();

    expect(routeOwnsStartupDomains('/ambulances')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/ambulances')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/ambulances')).toEqual([]);
    // Read path migrated onto React Query (S3 doctors template): the page reads the
    // fleet list from useAmbulancesQuery, and the getAmbulancesPageData projection
    // now lives inside that hook instead of a hand-rolled page fetch. The service
    // read fn is reused (not bypassed) - it is still the single route-data owner.
    expect(page).toContain('useAmbulancesQuery');
    expect(page).toContain('stats: ambulancePageStats');
    expect(page).not.toContain('setAmbulancePageStats');
    expect(queryHookSource()).toContain('getAmbulancesPageData(filter)');
    expect(queryHookSource()).toContain("queryKey: ['ambulances', filter]");
    expect(page).toContain('"Ambulances"');
    expect(page).not.toContain('Fleet Management');
    expect(page).not.toContain('usePageData');
    expect(page).not.toContain("supabase.from('ambulances')");
    expect(page).not.toContain("dataQuery = dataQuery.limit(1000);");
    expect(page).not.toContain('pagination.setTotalCount(data ? data.length : 0);');
    expect(page).not.toContain(".eq('hospital_id', orgId)");
    expect(page).toContain("kpiFilter === 'on_route'");
    expect(page).toContain('usePageFooter(null, \'status\', false);');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true });');
    // Console DS composition (harness test, 2026-07-10): the bespoke local
    // Ambulance* stage components were replaced by the shared console DS
    // (constitution AMB-1..AMB-3). WorkspaceStage/SignalPanel/KpiStrip/
    // ActivitySheet/DetailRailShell now own the architecture; the page provides
    // only its fleet domain (vocabulary, columns, guards, data wiring).
    expect(page).toContain("from '../console/WorkspaceStage'");
    expect(page).toContain("from '../console/SignalPanel'");
    expect(page).toContain("from '../console/KpiStrip'");
    expect(page).toContain("from '../console/ActivitySheet'");
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel signal={signal} loading={loading} toneClassMap={ambulanceToneClass}>');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<DetailRailShell>');
    expect(page).not.toContain('const AmbulanceSignalPanel');
    expect(page).not.toContain('const AmbulanceStateStrip');
    expect(page).not.toContain('const AmbulanceActivitySheet');
    // Mechanism registry (the completeness gate): the list-workspace mechanisms
    // are wired, with selection + arrival-toast recorded-excluded (fleet has no
    // console bulk-write receiver; a new-unit INSERT is not an attention event).
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('const loadError =');
    expect(page).toContain('arrival-toast excluded by decision:');
    expect(page).toContain("params.get('id')");
    expect(page).toContain('SortableColumnHeader');
    expect(page).toContain('<ListRowShell');
    // Selection mechanism ADDED (user: "add the multiple select options"): the
    // admin-only checkbox column + select-all/indeterminate + shift-range render;
    // the bulk WRITE stays fail-closed (BulkActionBar delete disabled with
    // reason). Flipped from the earlier `selection excluded by decision` marker.
    expect(page).toContain('useRowSelection(ambulances)');
    expect(page).toContain('selectable={canManageFleet}');
    expect(page).toContain('AMBULANCE_GRID_COLS_SELECT');
    expect(page).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(page).toContain('<BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>');
    expect(page).toContain('title="Bulk fleet deletion is locked until it is explicitly authorized"');
    expect(page).not.toContain('selection excluded by decision:');
    expect(page).toContain("new CustomEvent('ambulancesRouteContextUpdated'");
    expect(page).toContain("requestAmbulancesRouteContext");
    expect(page).toContain('itemNoun="ambulances"');
    expect(page).toContain('data-testid="ambulances-detail-rail"');
    expect(page).toContain('searchTestId="ambulances-sheet-search"');
    expect(page).toContain('testId="ambulances-error-state"');
    expect(page).not.toContain("|| 'HQ'");
    expect(page).not.toContain('Fleet Size');
    expect(page).not.toContain('FILTERED');
    expect(page).not.toContain('VIEW ALL');
    expect(page).not.toContain('ENGAGED');
    expect(page).not.toContain('handleBulkDelete');
    expect(page).not.toContain('selectedIds.map((id) => deleteAmbulance(id))');
    expect(page).not.toContain('deleteAmbulance');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).not.toContain('onDelete={confirmDelete}');
    // canDelete={false} lived on the retired List/Table density views; the one
    // canonical render carries no delete affordance and selection is
    // recorded-excluded (pinned above). The mobile branch keeps selectionEnabled.
    expect(page).toContain('selectionEnabled={false}');

    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('growthData');
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain('filteredAmbulances');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).not.toContain('avgRating');
    expect(mobile).not.toContain('onDelete');
    expect(mobile).not.toContain('Trash2');
    expect(mobile).toContain('sourceAmbulances');
    expect(mobile).toContain('selectionEnabled = false');
    expect(mobile).toContain('labelTone="plain"');
    // Directory grammar (LIST §5, harness-driven rebuild 2026-07-10): station-grouped
    // panels replace the old "Fleet signals" metric rail + "Fleet directory" section
    // header. The grammar linter emitted this exact to-do; these pins lock the result.
    expect(mobile).toContain('MobileHeading');
    expect(mobile).toContain('MobileAmbulancesAtlasLayer');
    expect(mobile).toContain('SkeletonGroupPanel');
    expect(mobile).toContain('const scopeCount = totals');
    expect(mobile).toContain('accumulatorRef');
    expect(mobile).toContain('hasMobileFleetFilters');
    // Adaptive, data-driven grouping (2026-07-10): station is degenerate on real fleets
    // (147 groups / 85% singletons measured), so resolveAdaptiveGroups scores it and
    // falls to update-recency; the station factor keeps its 'Unassigned' orphan bucket.
    expect(mobile).toContain('resolveAdaptiveGroups');
    expect(mobile).toContain("orphanLabel: 'Unassigned'");
    expect(mobile).toContain("type: 'coarse-recency'");
    expect(mobile).toContain('formatRelativeTime(ambulance.updated_at)');
    // Dock/FAB grammar (user arbitration 2026-07-10): /ambulances is in routeOwnsAction,
    // so it MUST carry a route-owned FAB or the dock collapses to a lone pill. The FAB
    // does real adjacent work — driver approvals — parallel to the Hospitals FAB.
    const bottomBar = fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
    // RBAC (2026-07-10 audit): the to:-FAB gate is DERIVED from the destination route
    // (canReachRoute), not a hand-kept role list, so it can't drift from /verification's
    // minRole. Data-sync scope: ?type=driver filters the providers queue to drivers so
    // "Driver approvals" is honest to the fleet.
    expect(bottomBar).toContain("pathname.startsWith('/ambulances') && canReachRoute(userRole, '/verification')");
    expect(bottomBar).toContain("label: 'Driver approvals'");
    expect(bottomBar).toContain("to: '/verification?queue=providers&type=driver'");
    expect(bottomBar).toContain('const canReachRoute =');
    // The /doctors FAB RBAC gap is closed (was ungated).
    expect(bottomBar).toContain("pathname.startsWith('/doctors') && ['org_admin', 'admin'].includes(userRole)");
    expect(mobile).not.toContain('Fleet signals');
    expect(mobile).toContain("label: 'En route'");
    expect(mobile).toContain("return 'Ready';");
    expect(mobile).toContain("return 'En route';");
    // Canon kit (Wave-2 rebuild, 2026-07-09): the trigger aria-labels are now baked
    // by SearchRow from its props — entityLabel="fleet" renders "Filter fleet";
    // statsLabel carries "Open fleet statistics" verbatim. Same labels, new recipe.
    expect(mobile).toContain('entityLabel="fleet"');
    expect(mobile).toContain('statsLabel="Open fleet statistics"');
    expect(mobile).toContain('<MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />');
    expect(mobile).not.toContain('Fleet Signals');
    expect(mobile).not.toContain('Fleet Directory');
    expect(mobile).not.toContain("return 'READY';");
    expect(mobile).not.toContain("return 'EN ROUTE';");
    expect(mobile).not.toContain('Assigned now');
    expect(mobile).not.toContain('Current status');
    expect(mobile).not.toContain('Out of service');
    // Metric rail removed (LIST grammar): a list page carries no glance-tile rail;
    // the beds/fleet-style aggregates ride AnalyticsModal via the page stats.
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('subtitle: null');
    expect(mobile).toContain("setKpiFilter?.(id)");
    // Chips are uniformly plain (one-voice): the recycled strip carries no per-page
    // label toning. Guard that the vestigial labelTone prop stays removed.
    expect(mobileKpiStrip).not.toContain('labelTone');
    expect(mobileKpiStrip).toContain("data-state={isActive ? 'selected' : 'idle'}");
    expect(mobileMetricList).toContain("labelTone = 'caps'");
    expect(mobileMetricList).toContain("labelTone === 'plain'");
    expect(mobileListStates).toContain("labelTone = 'caps'");
    expect(mobileListStates).toContain("const copy = armed ? 'Scroll to load' : 'Load more';");

    expect(list).toContain('canDelete = false');
    expect(list).toContain('canDelete && onDelete');
    expect(list).not.toContain("|| 'HQ'");
    expect(table).toContain('canDelete = false');
    expect(table).toContain('selectionEnabled = false');
    expect(table).toContain('canDelete && onDelete');
    expect(table).toContain('selectionEnabled && (');
    expect(table).not.toContain("|| 'HQ'");
    expect(table).not.toContain('label="Rating"');
    expect(table).not.toContain('ambulance.rating');

    expect(modal).toContain('ModalShell');
    expect(modal).toContain('getHospitals({ quiet: true, limit: 500 })');
    expect(modal).toContain('buildAmbulancePayload');
    expect(modal).toContain('organization_id = orgId');
    expect(modal).toContain('Trip status changes stay in Requests.');
    expect(modal).toContain('Driver assignment needs provider and station proof.');
    expect(modal).toContain('Media upload needs storage policy proof.');
    expect(modal).toContain('Arrival, completion, and cancellation stay in Requests or Map.');
    expect(modal).not.toContain("uploadImage(file, 'ambulances')");
    expect(modal).not.toContain('getProfilesByRole');
    expect(modal).not.toContain('driverManagementService');
    expect(modal).not.toContain('assignDriverToAmbulance');
    expect(modal).not.toContain('getDrivers');
    expect(modal).not.toContain('rating: 4.5');
    expect(modal).not.toContain('hospital_id: orgId');
    expect(modal).not.toContain('fixed inset-0');
    expect(modal).not.toContain('role="dialog"');
    expect(modal).not.toContain('aria-modal="true"');
    // Modal canon + data-truth fixes (harness test, 2026-07-10):
    // - sticky footer via ModalShell footer= + cross-boundary submit (form id).
    expect(modal).toContain("const formId = 'ambulance-modal-form';");
    expect(modal).toContain('form={formId}');
    // - display_id + CopyChip (perk 10; a reference, never a write key).
    expect(modal).toContain("import { CopyChip } from '../console/primitives';");
    expect(modal).toContain('ambulance?.display_id ?');
    // - AMB-4: crew persists as a Json ARRAY (rail reads .length), not a string.
    expect(modal).toContain('crew: crewToArray(formData.crew)');
    expect(modal).not.toContain('crew: formData.crew?.trim()');
    // - AMB-6: current_call is a dispatch linkage -- read-only + OMITTED from the
    //   write payload (hand-typing it would author parallel dispatch truth).
    expect(modal).not.toContain("current_call: formData.current_call?.trim()");
    expect(modal).not.toContain('name="current_call"');
    // Interaction-completeness polish (2026-07-10): the estate gate enforces the
    // floor across list pages; these lock the page-SPECIFIC touches its floor
    // can't resolve -- every row action button presses + carries opening
    // feedback, and the modal submit shows a pending spinner. (The row-button
    // press was a real gap the floor missed -- see the estate gate comment.)
    expect(page).toContain('active:scale-95 ${viewOpening');
    expect(page).toContain('active:scale-95 ${editOpening');
    expect(page).toContain('aria-busy={viewOpening}');
    expect(page).toContain('aria-busy={editOpening}');
    expect(modal).toContain('<Loader2 className="mr-2 h-4 w-4 animate-spin" />');

    expect(service).toContain('export async function assignDriverToAmbulance(ambulanceId, driverId)');
    expect(service).toContain('export async function updateAmbulanceLocation(ambulanceId, location)');
    expect(service).toContain('export async function updateAmbulanceStatus(ambulanceId, status)');
    expect(service).toContain('export async function getAmbulancesPageData');
    expect(service).toContain("orgIdField: 'organization_id'");
    expect(service).toContain("if (status === 'on_route') return ['en_route'];");
    expect(service).toContain("if (status === 'busy') return ACTIVE_AMBULANCE_STATUSES;");
    expect(service).toContain('select(\'*\', { count: \'exact\', head: true })');
    expect(service).toContain('range(safeOffset, safeOffset + safeLimit - 1)');
    expect(service).toContain('hospitalNameById');
    // useAmbulances.js deleted 2026-07-08 (orphaned — 0 importers; page consumes
    // getAmbulancesPageData directly). Removal proof, not source assertion.
    expect(fs.existsSync('src/hooks/useAmbulances.js')).toBe(false);
    expect(panel).toContain('ambulanceContext');
    expect(panel).toContain('Fleet context');
    expect(panel).toContain('From this page');
    expect(panel).toContain('Details not ready');
    expect(panel).toContain("dispatchPanelEvent('openAmbulanceModal')");
    expect(panel).not.toContain('Live Fleet');
    expect(panel).not.toContain('Ready Units');
    expect(panel).not.toContain('ambulancesData');
    // SINGLE-SOURCE color coding (user: "color coding ... something we didn't get
    // to harden"): the fleet status tone/label vocabulary lives in ONE module
    // that the page AND the context panel consume, so they cannot drift (the
    // panel used to color en_route cyan while the page/mobile use amber). Lock
    // that the panel imports the shared source and defines NO local status map.
    expect(panel).toContain("from '../../constants/ambulanceStatus'");
    expect(panel).toContain('getAmbulanceStatusToneClass(status)');
    expect(panel).not.toContain('const toneByStatus');
    expect(page).toContain("from '../../constants/ambulanceStatus'");
    expect(page).not.toContain('const ambulanceStatusPillClass =');
    expect(contextPanel).toContain('ambulancesRouteContext');
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestAmbulancesRouteContext'))");
    expect(contextPanel).toContain('<AmbulancesPanel ambulanceContext={ambulancesRouteContext} />');
    expect(contextPanel).not.toContain('<AmbulancesPanel ambulancesData={ambulancesData} />');
    expect(contextPanel).not.toContain('ambulancesData,');
    expect(contextAction).toContain("label: 'Add unit'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openAmbulanceModal'))");
    expect(contextAction).not.toContain("label: 'Add Ambulance'");
    expect(contextAction).not.toContain("openModal('ambulance')");
    expect(fab).toContain("location.pathname.startsWith('/ambulances')");

    expect(chart).toContain('| Fleet KPI/filter status `on_route` |');
    expect(chart).toContain('| Org-admin scoped stats |');
    expect(chart).toContain('| Station label |');
    expect(chart).toContain('| Busy KPI |');
    expect(chart).toContain('| Generic fleet location update |');

    expect(gate).toContain('Route data owner repair, 2026-07-02');
    expect(gate).toContain('Mobile truth and destructive action repair, 2026-07-02');
    expect(gate).toContain('Visual shell and first-glance repair, 2026-07-02');
    expect(gate).toContain('Modal scope and chrome repair, 2026-07-03');
    expect(gate).toContain('Context-panel truth repair, 2026-07-03');
    expect(gate).toContain('Mobile polish and rendered proof, 2026-07-03');
    expect(gate).toContain('Admission proof completed on 2026-07-03');
    expect(gate).toContain('Context panel summary is now typed route feedback from the page-owned projection.');
    expect(gate).toContain('the modal, tablet, context-panel, and interaction gates are closed by the 2026-07-03 proof sections below.');
    expect(gate).toContain('`getAmbulancesPageData()` now owns the route list, exact count, stats, filters, pagination, status alias mapping, sorting, and station enrichment.');
    expect(gate).toContain('`/ambulances` now has a zero-domain startup override');
    expect(gate).toContain('`MobileAmbulances.jsx` no longer renders synthetic featured metric charts, `LIVE` trend copy, local-only filtered rows, row-derived rating, or mobile delete/selection actions.');
    expect(gate).toContain('`AmbulancesPage.jsx` no longer imports `deleteAmbulance`, renders `BulkActionBar`, opens `ConfirmationModal` for delete, or passes active delete/selection props to mobile, list, or table density views.');
    expect(gate).toContain('The active Ambulances page, mobile, list, and table surfaces are in the default UI hardgate.');
  });

  it('puts active Ambulances visual-start and modal surfaces in the hardgate', () => {
    const hardgate = hardgateSource();
    const gate = gateSource();

    expect(hardgate).toContain("'src/components/pages/AmbulancesPage.jsx'");
    expect(hardgate).toContain("'src/components/mobile/MobileAmbulances.jsx'");
    expect(hardgate).toContain("'src/components/views/AmbulanceListView.jsx'");
    expect(hardgate).toContain("'src/components/views/AmbulanceTableView.jsx'");
    expect(hardgate).toContain("'src/components/modals/AmbulanceModal.jsx'");
    expect(hardgate).toContain("'src/components/context/AmbulancesPanel.jsx'");

    expect(gate).toContain('Keep `AmbulanceModal.jsx` in the default UI hardgate with the active Ambulances surfaces.');
    expect(gate).toContain('Keep `AmbulancesPanel.jsx` in the default UI hardgate with the active Ambulances surfaces.');
  });
});
