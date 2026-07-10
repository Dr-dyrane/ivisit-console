import fs from 'fs';
import { execFileSync } from 'child_process';
import { getAccessibleNav } from '../../config/navigation';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('HospitalsPage admission audit contract', () => {
  const pageSource = () => fs.readFileSync('src/components/pages/HospitalsPage.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileHospitals.jsx', 'utf8');
  const panelSource = () => fs.readFileSync('src/components/context/HospitalsPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const listSource = () => fs.readFileSync('src/components/views/HospitalListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/HospitalTableView.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/HospitalModal.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/hospitalsService.js', 'utf8');
  const viewModeSource = () => fs.readFileSync('src/hooks/useViewMode.js', 'utf8');
  // S3 React Query migration (mirrors DoctorsPage): the page reads via
  // useHospitalsQuery and writes via useHospitalsMutations. These readers let the
  // conversion assertions point at the relocated data layer.
  const queryHookSource = () => fs.readFileSync('src/hooks/useHospitalsQuery.js', 'utf8');
  const mutationsHookSource = () => fs.readFileSync('src/hooks/useHospitalsMutations.js', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const contextActionSource = () => fs.readFileSync('src/hooks/useContextAction.js', 'utf8');
  const coreRpcSource = () => fs.readFileSync('supabase/migrations/20260219010000_core_rpcs.sql', 'utf8');
  const securitySource = () => fs.readFileSync('supabase/migrations/20260219000700_security.sql', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
  const PRESERVATION_BASELINE = 'f31f29f';
  const headSource = (path) => execFileSync('git', ['show', `${PRESERVATION_BASELINE}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  it('keeps Hospitals org-admin scoped in route and navigation contracts', () => {
    expect(getRouteProtection('/hospitals')).toEqual({
      minRole: 'org_admin',
      resource: 'hospitals',
      title: 'Hospitals',
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/hospitals');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/hospitals');
    expect(getProtectedRoutesForRole('provider')).not.toContain('/hospitals');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/hospitals');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/hospitals');

    expect(getAccessibleNav({ role: 'org_admin' }).ops.items.find((item) => item.path === '/hospitals')?.label)
      .toBe('Hospitals');
    expect(getAccessibleNav({ role: 'admin' }).ops.items.find((item) => item.path === '/hospitals')?.label)
      .toBe('Hospitals');
    expect(getAccessibleNav({ role: 'provider' }).ops.items.map((item) => item.path))
      .not.toContain('/hospitals');
  });

  it('anchors the Hospitals ledger to old Git-backed behavior', () => {
    const oldPage = headSource('frontend/src/components/pages/HospitalsPage.jsx');
    const oldMobile = headSource('frontend/src/components/mobile/MobileHospitals.jsx');
    const gate = gateSource();

    expect(oldPage).toContain('usePageData');
    expect(oldPage).toContain('hospitalsData');
    expect(oldPage).toContain('refreshAllData');
    expect(oldPage).toContain('getHospitals');
    expect(oldPage).toContain('getHospital');
    expect(oldPage).toContain('createHospital');
    expect(oldPage).toContain('updateHospital');
    expect(oldPage).toContain('deleteHospital');
    expect(oldPage).toContain(".channel('hospitals_page_changes')");
    expect(oldPage).toContain("params.get('id')");
    expect(oldPage).toContain("params.get('add')");
    expect(oldPage).toContain('openHospitalModal');
    expect(oldPage).toContain('openFilters');
    expect(oldPage).toContain('openAnalyticsModal');
    expect(oldPage).toContain('handleDelete');
    expect(oldPage).toContain('handleBulkDelete');
    expect(oldPage).toContain('selectedIds.map((id) => deleteHospital(id))');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('<StaffSchedulingModal');
    expect(oldPage).toContain('<FilterSheet');
    expect(oldPage).toContain('<AnalyticsModal');
    expect(oldPage).toContain('<PaginationControls');
    expect(oldPage).toContain("viewMode === 'grid'");
    expect(oldPage).toContain("viewMode === 'list'");
    expect(oldPage).toContain("viewMode === 'table'");
    expect(oldPage).toContain('<HospitalListView');
    expect(oldPage).toContain('<HospitalTableView');

    expect(oldMobile).toContain('<PullToRefresh onRefresh={onRefresh}>');
    expect(oldMobile).toContain('new IntersectionObserver(');
    expect(oldMobile).toContain('MobileKPIStrip');
    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('MobileSecondaryMetricRail');
    expect(oldMobile).toContain('growthData');
    expect(oldMobile).toContain('chartData');
    expect(oldMobile).toContain("'LIVE'");
    expect(oldMobile).toContain('filteredHospitals');
    expect(oldMobile).toContain('onDelete');
    expect(oldMobile).toContain('onSchedule');
    expect(oldMobile).toContain('onLoadMore');

    expect(gate).toContain('## Page 8 Ledger: Hospitals');
    expect(gate).toContain('HEAD snapshot evidence for this ledger');
    expect(gate).toContain('| PageDataContext `hospitalsData`, `refreshAllData`, stats cards, and old right-panel `hospitalsData` consumption.');
    expect(gate).toContain('| Single delete and bulk delete.');
    expect(gate).toContain('| Mobile pull-to-refresh, infinite load, search, filter, analytics, row reveal, edit, scheduling, selection, delete, fake trend charts, and local-only KPI/search filtering.');
  });

  it('records the Hospitals canonical shell and guarded admission state', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const fab = fabSource();
    const contextAction = contextActionSource();
    const contextPanel = contextPanelSource();
    const gate = gateSource();
    const hardgate = hardgateSource();

    expect(routeOwnsStartupDomains('/hospitals')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/hospitals')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/hospitals')).toEqual([]);

    // S3 migration: the route projection now flows through useHospitalsQuery; the
    // page destructures its stats as hospitalPageStats and writes via the mutation.
    expect(page).toContain('useHospitalsQuery(queryFilter)');
    // Dead-filter fix (2026-07-09): the sheet's "Registered On" range now maps to
    // date_from/date_to before the service; stats consume the same date-mapped set
    // (still status-agnostic) so KPI counts match the visible window.
    expect(page).toContain('statsFilters: getHospitalStatsFilters(serviceFilters)');
    expect(page).toContain("...(createdRange?.start ? { date_from: `${createdRange.start}T00:00:00.000Z` } : {})");
    expect(serviceSource()).toContain("query = query.gte('created_at', filter.date_from)");
    expect(page).toContain('stats: hospitalPageStats');
    expect(page).toContain('updateHospitalMutation.mutateAsync(formData)');
    expect(page).toContain('statistics={hospitalPageStats}');
    expect(page).toContain('analytics={hospitalPageStats}');
    expect(page).toContain('const hospitalPanelContext = React.useMemo(() => ({');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('hospitalsRouteContextUpdated', {");
    expect(page).toContain("window.addEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);");
    expect(contextPanel).toContain('const [hospitalsRouteContext, setHospitalsRouteContext] = React.useState(null);');
    expect(contextPanel).toContain("window.addEventListener('hospitalsRouteContextUpdated', handleHospitalsRouteContext);");
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestHospitalsRouteContext'));");
    expect(contextPanel).toContain('<HospitalsPanel hospitalContext={hospitalsRouteContext} />');
    expect(contextPanel).not.toContain('<HospitalsPanel hospitalsData={hospitalsData} />');
    expect(page).toContain('usePageHeader(');
    expect(page).toContain('"Hospitals"');
    expect(page).toContain('<SEOHead title="Hospitals"');
    expect(page).not.toContain('Medical Facilities');
    expect(page).not.toContain('usePageData');
    expect(page).not.toContain('hospitalsData?.stats');
    expect(page).not.toContain('pagination.pageSize');
    expect(page).not.toContain('deleteHospital');
    expect(page).not.toContain('handleDelete');
    expect(page).not.toContain('handleBulkDelete');
    expect(page).not.toContain('selectedIds.map((id) => deleteHospital(id))');
    expect(page).not.toContain('<BulkActionBar');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).not.toContain('onDelete={handleDelete}');
    expect(page).toContain('canDelete={false}');
    expect(page).toContain('selectionEnabled={false}');
    // Realtime cleanup pins survive the migration: the page keeps its own
    // hospitals_page_changes channel + mount guard + removeChannel teardown, but the
    // change handler now feeds the ['hospitals'] cache instead of a manual refetch,
    // and the imperative fetch-dedup loop (fetchRequestRef/requestId) is gone.
    expect(page).toContain(".channel('hospitals_page_changes')");
    expect(page).toContain('const isMountedRef = useRef(false)');
    expect(page).toContain("queryClient.invalidateQueries({ queryKey: ['hospitals'] })");
    expect(page).toContain('isMountedRef.current = false');
    expect(page).toContain('const fetchHospitals = refetch');
    expect(page).toContain('pagination.setTotalCount(count)');
    expect(page).not.toContain('fetchRequestRef');
    expect(page).not.toContain('setHospitalPageStats');
    expect(page).toContain('let active = true');
    expect(page).toContain('if (active && isMountedRef.current)');
    expect(page).toContain('supabase.removeChannel(channel)');
    expect(page).not.toContain('<StaffSchedulingModal');
    expect(page).not.toContain('createHospital');
    expect(page).toContain('handleCreateUnavailable');
    expect(page).toContain("toast.info('Add facility is unavailable')");
    expect(page).toContain('Add facility');
    expect(page).toContain("data-state={activeActionFeedback === 'create-unavailable' ? 'opening' : 'unavailable'}");
    expect(page).not.toContain('aria-disabled="true"');
    expect(page).not.toContain('ADD HOSPITAL');
    expect(page).toContain("handleOpenModal = () => handleCreateUnavailable()");
    expect(page).toContain("params.get('add') === 'true'");
    expect(page).toContain("modalMode !== 'edit'");
    expect(page).toContain('updatedHospital?.id || selectedHospital.id');
    expect(page).not.toContain('updatedHospital.name');
    // Toast single-owner rule (VisitModal V-16, adopted 2026-07-09): the page
    // owns the terse success toast and exactly one handleApiError; the
    // notification is best-effort so its failure never reports a committed
    // save as failed.
    expect(page).toContain("toast.success('Facility updated')");
    expect(page).toContain('Save succeeded but notification failed');
    // Donor realtime anatomy: throttled INSERT arrival toast (one per 10s).
    expect(page).toContain("toast('New facility added'");
    expect(page).toContain('lastInsertToastAtRef.current < 10000');
    expect(page).not.toContain('onSchedule={');
    expect(fab).toContain("location.pathname.startsWith('/hospitals')");
    // Dead-affordance hygiene (SHELL_PARITY_AUDIT 1.5, 2026-07-09): the FAB is
    // hidden on /hospitals and no other route keys the hospitals action, so the
    // registry entry was unreachable everywhere -- deleted, not preserved.
    expect(contextAction).not.toContain("'/hospitals'");
    expect(contextAction).not.toContain("label: 'Add facility'");
    expect(contextAction).not.toContain("label: 'Add Hospital'");
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).not.toContain("usePageFooter(footerContent, 'pagination'");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain('min-h-screen text-foreground');
    // Borderless canon, DS composition (converted 2026-07-09, Requests gold
    // standard): the frosted sheet/rail glass now lives in the console DS
    // components -- the page itself carries no blur of its own (Visits parity).
    expect(page).not.toContain('backdrop-blur');
    expect(fs.readFileSync('src/components/console/ActivitySheet.jsx', 'utf8')).toContain('rounded-t-sheet bg-card/68 p-3 shadow-e3 backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet');
    expect(page).not.toContain('glass-card');
    expect(page).toContain('const getHospitalSignal =');
    // Converted 2026-07-09: the page-local HospitalSignalPanel/HospitalStateStrip
    // became the shared SignalPanel + KpiStrip (S1.2 max-3 smart context,
    // toggle-to-All, tile spec, aria-pressed and selected/idle data-state all
    // locked in ConsoleDesignSystem.contract.test.js). The page owns only the
    // DOMAIN: signal copy incl. the honest failed-load hero (F7), state options,
    // pinned operational-pressure states, and the wayfinding stage.
    expect(page).toContain("from '../console/SignalPanel'");
    expect(page).toContain("from '../console/KpiStrip'");
    expect(page).toContain("from '../console/WorkspaceStage'");
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('activePath="/hospitals"');
    expect(page).toContain('moduleRailItems={visibleModuleRail}');
    expect(page).toContain('<SignalPanel signal={signal} loading={loading} toneClassMap={hospitalToneClass}>');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('options={hospitalStateOptions}');
    expect(page).toContain("const PINNED_HOSPITAL_STATE_IDS = ['full', 'busy'];");
    expect(page).toContain('pinnedIds={PINNED_HOSPITAL_STATE_IDS}');
    expect(page).toContain('importance={HOSPITAL_KPI_IMPORTANCE}');
    expect(page).toContain('dataAttr="data-hospital-state"');
    expect(page).toContain("headline: 'Hospitals did not load'");
    expect(page).toContain('stats={hospitalPageStats}');
    expect(page).toContain("id: 'busy'");
    expect(page).toContain('Visible beds');
    expect(page).toContain('Visible fleet');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toContain('Network Size');
    expect(page).not.toContain('At Capacity');
    expect(page).not.toContain('Low Capacity');
    expect(page).not.toContain('FILTERED');
    expect(page).not.toContain('VIEW ALL');
    expect(page).not.toContain('Busy / strained');
    // Converted 2026-07-09: the page-local sheet/toolbar/banner/empty-state
    // components became the shared ActivitySheet + SheetToolbar (300ms debounced
    // search F9, refresh, context-aware filter trigger, count-row triplet,
    // Updating pill F8, pagination) + ErrorBanner (destructive, rows present) +
    // LoadErrorState (failed-empty owns the scroller) + filter-aware EmptyState.
    expect(page).toContain("from '../console/ActivitySheet'");
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('itemNoun="hospitals"');
    expect(page).toContain('<SheetToolbar');
    expect(page).toContain('isFetching={isFetching}');
    expect(page).toContain('refreshing={isFetching}');
    expect(page).toContain('<ErrorBanner');
    expect(page).toContain('title="Hospitals could not load"');
    expect(page).toContain('const failedEmpty = Boolean(loadError) && hospitals.length === 0;');
    expect(page).toContain('<LoadErrorState title="Hospitals did not load" message={loadError} onRetry={onRetry} />');
    expect(page).toContain('<EmptyState');
    expect(page).toContain('const HOSPITAL_EMPTY_HEADINGS = {');
    // Degraded-state copy is preserved, now derived from the RQ error instead of a
    // dedicated error useState + setter.
    expect(page).toContain('const hospitalPageError = queryError');
    expect(page).not.toContain('setHospitalPageError');
    expect(page).toContain("'Hospitals could not load. Try again.'");
    // Testids survive the conversion through DS props: the sheet testid renders
    // from itemNoun ("hospitals-activity-sheet"), the search/error testids ride
    // searchTestId/testId, and PaginationControls renders inside the shared
    // ActivitySheet from the same route-owned pagination store.
    expect(page).toContain('searchTestId="hospitals-sheet-search"');
    expect(page).toContain('testId="hospitals-error-state"');
    expect(page).toContain('pagination={pagination}');
    expect(page).toContain('onRetry={onRetry}');
    expect(page).toContain("onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}");
    expect(page).toContain('pagination.resetPagination()');
    // Shared focused-record store (useFocusedRecord) replaces the old private
    // focusedHospitalId state + list.find(id)||list[0] memo: rail shows the
    // most-urgent hospital at rest and toggles consistently on row focus.
    expect(page).toContain("useFocusedRecord('hospitals', hospitals)");
    expect(page).toContain('const focusedHospital = focusedRecord');
    expect(page).not.toContain('setFocusedHospitalId');
    expect(page).toContain('<HospitalDetailRail');
    expect(page).toContain('const HospitalDetailRail =');
    expect(page).toContain('data-testid="hospitals-detail-rail"');
    // Converted 2026-07-09: rows are the shared ListRowShell (selected/idle
    // aria-pressed + data-state semantics locked in the DS contract); the rail
    // composes DetailRailShell/RailInsetHero/DetailLine/CopyChip/StageStrip.
    // RailMetric/RailFact became DetailLine film rows (perk 6); the verification
    // lifecycle renders as the StageStrip (perk 5 upgrade, pending -> verified,
    // rejected all-muted); latitude/longitude become a working maps link.
    expect(page).toContain('<ListRowShell');
    expect(page).toContain('selected={isFocused(hospital.id)}');
    expect(page).toContain('setFocused(hospital.id)');
    expect(page).toContain('<DetailRailShell>');
    expect(page).toContain('<RailInsetHero>');
    expect(page).toContain('<DetailLine');
    expect(page).toContain('<CopyChip value={displayId} label="Copy record ID" />');
    expect(page).toContain('<StageStrip');
    expect(page).toContain("const HOSPITAL_VERIFICATION_ORDER = ['pending', 'verified'];");
    expect(page).toContain('Hospital details');
    expect(page).toContain('Open in Google Maps');
    // Perk 3: the entity slot carries the facility IMAGE thumbnail with an
    // onError glyph fallback (page-local HospitalAvatar; the DS TonedAvatar has
    // no image-overlay slot yet -- known kit gap).
    expect(page).toContain('const HospitalAvatar = ({ hospital');
    expect(page).toContain("onError={(event) => { event.currentTarget.style.display = 'none'; }}");
    // F5 (constitution section 4): org_admin edit affordance is scoped to the
    // operator's own organization (admin unrestricted); the rail affordance and
    // the modal trigger share one gate; the RPC still enforces server-side.
    expect(page).toContain('const canEditHospital = useCallback((hospital) => {');
    expect(page).toContain('hospital.organization_id === orgId');
    expect(page).toContain("toast.info('Edit is limited to facilities in your organization')");
    expect(page).toContain('canEditFocused={focusedHospital ? canEditHospital(focusedHospital) : false}');
    expect(page).toContain('Use Requests for reservation changes.');
    expect(page).not.toContain("import { Card } from '../ui/card'");
    expect(page).not.toContain('<Card');
    expect(page).not.toContain('</Card>');
    expect(page).not.toContain('border-t border-muted/20');
    // Converted 2026-07-09: the min-h-[520px] grid cards retired with the density
    // variants -- ONE canonical ListRowShell render (row chrome, replace-in-place
    // motion, and keyboard/context-menu semantics locked in the DS contract).
    // Sort truth (F1): Time -> created_at is the ONLY sortable header, plumbed
    // sortConfig -> queryFilter.sortKey/sortDirection -> service allowlist.
    expect(page).toContain('const HOSPITAL_GRID_COLS');
    expect(page).toContain('<SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />');
    expect(page).toContain("rowAttr: 'data-hospital-row'");
    expect(page).toContain('useScrollResetOnPage(listScrollRef, pagination.currentPage)');
    expect(page).not.toContain('min-h-[520px]');
    // Red-trap + banned-entrance cleanup: getStatusBadge (theme success/warning
    // tokens render red) and the framer entrance/stagger died with the grid; the
    // page composes DS motion (layout="position" replace-in-place) instead.
    expect(page).not.toContain('getStatusBadge');
    expect(page).not.toContain('framer-motion');
    expect(page).not.toContain('initial={{');
    expect(page).not.toContain('rgba(');
    expect(page).not.toContain('geo-round');
    expect(page).not.toContain('geo-badge');
    expect(page).not.toContain('geo-sharp');
    expect(page).not.toContain('hover-glow');

    expect(mobile).toContain('MobileKPIStrip');
    expect(mobile).toContain('MobileSecondaryMetricRail');
    expect(mobile).toContain('Facility Signals');
    expect(mobile).toContain('statistics?.visibleBeds');
    expect(mobile).toContain('statistics?.visibleAmbulances');
    expect(mobile).toContain("title: 'Visible Beds'");
    expect(mobile).toContain("title: 'Visible Fleet'");
    expect(mobile).toContain('Current status');
    expect(mobile).toContain('activeStatusFilter');
    expect(mobile).toContain('handleStatusFilter');
    expect(mobile).toContain('nextFilters.status = id');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('growthData');
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain("'LIVE'");
    expect(mobile).not.toContain('filteredHospitals');
    expect(mobile).not.toContain('formatSignedPercent');
    expect(mobile).not.toContain('calcDeltaPercent');
    expect(mobile).not.toContain('toDeltaBadge');
    expect(mobile).toContain('canDelete = false');
    expect(mobile).toContain('selectionEnabled = false');
    expect(mobile).toContain('canDelete && onDelete');
    expect(mobile).toContain('onSchedule && (');
    expect(mobile).not.toContain('border-0');
    expect(mobile).not.toContain('focus:ring-1');
    expect(mobile).not.toContain('focus:ring-primary/20');
    expect(mobile).not.toContain('outline-none');
    expect(mobile).not.toContain('ease-[cubic-bezier');

    expect(hardgate).toContain("'src/components/pages/HospitalsPage.jsx'");
    expect(hardgate).toContain("'src/components/common/FilterSheet.jsx'");
    expect(hardgate).toContain("'src/components/mobile/MobileHospitals.jsx'");
    expect(hardgate).toContain("'src/components/mobile/MobileMetricList.jsx'");
    expect(hardgate).toContain("'src/components/context/HospitalsPanel.jsx'");
    expect(hardgate).toContain("'src/components/views/HospitalListView.jsx'");
    expect(hardgate).toContain("'src/components/views/HospitalTableView.jsx'");
    expect(hardgate).toContain("'src/components/modals/HospitalModal.jsx'");
    expect(hardgate).toContain("'src/components/modals/AnalyticsModal.jsx'");

    expect(gate).toContain('Decision: Hospitals is admitted for guarded continuation under the Today/Requests canon');
    expect(gate).toContain('Route data ownership repair');
    expect(gate).toContain('Destructive-action exclusion repair');
    expect(gate).toContain('Realtime cleanup repair');
    expect(gate).toContain('Mobile truth repair');
    expect(gate).toContain('Action authority repair');
    expect(gate).toContain('First-glance signal repair, 2026-07-02');
    expect(gate).toContain('Handled facility sheet repair, 2026-07-02');
    expect(gate).toContain('Visible degraded-state repair, 2026-07-02');
    expect(gate).toContain('Focused detail rail repair, 2026-07-02');
    expect(gate).toContain('Deep-link modal crash repair, 2026-07-02');
    expect(gate).toContain('Desktop grid chrome repair, 2026-07-02');
    expect(gate).toContain('Desktop grid chrome proof, 2026-07-02');
    expect(gate).toContain('Mobile hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('Mobile hardgate cleanup proof, 2026-07-02');
    expect(gate).toContain('Hospital modal hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('Hospital modal hardgate cleanup proof, 2026-07-02');
    expect(gate).toContain('Hospitals shell and default hardgate promotion proof, 2026-07-02');
    expect(gate).toContain('Shared filter and analytics reveal hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('MobileMetricList.jsx');
    expect(gate).toContain('Keep shared MobileMetricList hardgate-clean');
  });

  it('keeps unproved create, scheduling, storage upload, and bed commands unavailable', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const modal = modalSource();
    const coreRpc = coreRpcSource();
    const security = securitySource();
    const gate = gateSource();

    expect(coreRpc).toContain('CREATE OR REPLACE FUNCTION public.update_hospital_by_admin');
    expect(coreRpc).toContain('Unauthorized: You do not manage this hospital');
    expect(security).toContain('CREATE POLICY "Public read for verified hospitals"');
    expect(security).not.toMatch(/ON public\.hospitals FOR INSERT/);

    expect(page).not.toContain('createHospital');
    expect(page).toContain('handleCreateUnavailable');
    expect(page).toContain("toast.info('Add facility is unavailable')");
    expect(page).not.toContain('<StaffSchedulingModal');
    expect(page).not.toContain('setSchedulingModalOpen');
    expect(page).not.toContain('onSchedule={');
    expect(mobile).toContain('onSchedule && (');

    expect(modal).not.toContain('uploadImage');
    expect(modal).not.toContain('hospitalImportService');
    expect(modal).not.toContain('cancelReservation');
    expect(modal).not.toContain('cancelBedReservation');
    expect(modal).not.toContain('updateReservationStatus');
    expect(modal).not.toContain('dischargePatient');
    expect(modal).toContain('Manage in Requests');

    expect(gate).toContain('Action authority repair, 2026-07-02');
    expect(gate).toContain('Create remains unavailable');
    expect(gate).toContain('Staff scheduling is excluded');
    expect(gate).toContain('Bed reservation lifecycle actions are read-only');
  });

  it('keeps the Hospitals right panel route-owned and hardgate-clean', () => {
    const page = pageSource();
    const panel = panelSource();
    const contextPanel = contextPanelSource();
    const gate = gateSource();

    expect(page).toContain('const hospitalPanelContext = React.useMemo(() => ({');
    expect(page).toContain('canAdd: false');
    expect(page).toContain('canEdit: canEditHospitals');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('hospitalsRouteContextUpdated', {");
    expect(page).toContain("window.addEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);");

    expect(contextPanel).toContain('<HospitalsPanel hospitalContext={hospitalsRouteContext} />');
    expect(contextPanel).not.toContain('hospitalsData,');

    expect(panel).toContain('export const HospitalsPanel = ({ hospitalContext }) =>');
    expect(panel).toContain("const [panelNotice, setPanelNotice] = React.useState('Facility actions ready.');");
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openHospitalModal'))");
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openAnalyticsModal'))");
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openFilters'))");
    expect(panel).toContain('Facilities overview');
    expect(panel).toContain('Current route scope');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain('Current list');
    expect(panel).toContain('Add facility is unavailable.');
    expect(panel).toContain('No facilities in the current view.');
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    // Deny-by-default gating (SHELL_PARITY_AUDIT section 3, 2026-07-09): the
    // panel honors the canAdd/focusedHospital flags the page publishes -- real
    // disabled + honest titles, no cosmetically-disabled-but-live buttons.
    expect(panel).toContain("const canAdd = context.canAdd === true;");
    expect(panel).toContain('disabled={!canAdd}');
    expect(panel).toContain("title={canAdd ? 'Add facility' : 'Add facility is unavailable'}");
    expect(panel).toContain('title="View facility statistics"');
    expect(panel).toContain('title="Filter facilities"');
    expect(panel).toContain('disabled={!contactPhone}');
    expect(panel).toContain("window.location.href = `tel:${contactPhone}`");
    expect(panel).toContain('const contactPhone = context.focusedHospital?.phone || null;');
    expect(panel).toContain('const errorMessage = context.errorMessage;');
    expect(panel).not.toContain('rgb(6_182_212');

    expect(panel).not.toContain('hospitalsData');
    expect(panel).not.toContain('Network Status');
    expect(panel).not.toContain('Quick Actions');
    expect(panel).not.toContain('Recent Hospitals');
    expect(panel).not.toContain('Add New Hospital');
    expect(panel).not.toContain('No recent hospitals found');
    expect(panel).not.toContain('No Address');
    expect(panel).not.toContain('border');
    expect(panel).not.toContain('ring-');
    expect(panel).not.toContain('outline');
    expect(panel).not.toContain('divide');

    expect(gate).toContain('Hospitals right-panel route-context proof, 2026-07-06');
    expect(gate).toContain('`HospitalsPanel.jsx` now consumes `hospitalContext`, not `PageDataContext` `hospitalsData`');
  });

  it('keeps current service and surface inventory explicit before conversion', () => {
    const page = pageSource();
    const list = listSource();
    const table = tableSource();
    const modal = modalSource();
    const service = serviceSource();
    const viewMode = viewModeSource();

    // The route projection call relocated into the query hook; the page keeps the
    // ?id deep-link read (getHospital) and the guarded edit write (updateHospital),
    // and create stays absent.
    expect(queryHookSource()).toContain('getHospitalsPageData(filter)');
    expect(queryHookSource()).toContain("queryKey: ['hospitals', filter]");
    expect(mutationsHookSource()).toContain('applyOptimisticUpsert');
    expect(page).toContain('getHospital(hospitalId)');
    expect(page).not.toContain('createHospital(formData)');
    expect(page).toContain('updateHospital(selectedHospital.id, formData)');
    expect(page).toContain('<HospitalModal');
    // Explicitly converted 2026-07-09 (Requests gold standard, desktop data-render
    // canon): ONE canonical render. ViewToggle and the grid/list/table density
    // variants are retired from the active route; the legacy view files stay on
    // disk unimported (chrome-lint targets only), exactly like Requests/Visits.
    expect(page).not.toContain('<HospitalListView');
    expect(page).not.toContain('<HospitalTableView');
    expect(page).not.toContain('useViewMode');
    expect(page).not.toContain('<ViewToggle');
    expect(page).not.toContain('TableSkeleton');

    expect(list).toContain('onView');
    expect(list).toContain('onEdit');
    expect(list).toContain('canDelete = false');
    expect(list).toContain('onDelete');
    expect(list).toContain('canDelete && onDelete');
    expect(list).toContain('onSchedule');
    expect(list).toContain('const formatWaitTime =');
    expect(list).toContain("return 'Unknown';");
    expect(list).not.toContain("`${hospital.emergency_wait_time_minutes}m`");
    expect(list).not.toContain("import { Card } from '../ui/card'");
    expect(list).not.toContain('<Card');
    expect(list).not.toContain('</Card>');
    expect(list).not.toContain('border-0');
    expect(list).not.toContain('border-r');
    expect(list).not.toContain('border-white/10');
    expect(list).not.toContain('border-green-500/30');
    expect(list).not.toContain('border-yellow-500/30');
    expect(list).not.toContain('border-blue-500/30');
    expect(list).not.toContain('border-red-500/30');
    expect(list).toContain("rounded-card bg-background/35 p-4");
    expect(list).toContain('rounded-icon overflow-hidden bg-black/20');

    expect(table).toContain('onView');
    expect(table).toContain('onEdit');
    expect(table).toContain('canDelete = false');
    expect(table).toContain('selectionEnabled = false');
    expect(table).toContain('onDelete');
    expect(table).toContain('canDeleteRow');
    expect(table).toContain('onSchedule');
    expect(table).toContain('const formatWaitTime =');
    expect(table).toContain("return 'Unknown';");
    expect(table).not.toContain("import { Card } from '../ui/card'");
    expect(table).not.toContain('TableHeader');
    expect(table).not.toContain('TableRow');
    expect(table).not.toContain('TableBody');
    expect(table).not.toContain('<Card');
    expect(table).not.toContain('</Card>');
    expect(table).not.toContain('border-0');
    expect(table).not.toContain('border-b');
    expect(table).not.toContain('border-white/10');
    expect(table).not.toContain('border-green-500/30');
    expect(table).not.toContain('border-red-500/30');
    expect(table).not.toContain('border-blue-500/30');
    expect(table).not.toContain('border-gray-500/30');
    // Borderless canon: the raw <table> was rebuilt as a CSS-grid mirroring VisitTableView.
    expect(table).toContain('rounded-card bg-background/35 p-3 backdrop-blur-xs');
    expect(table).toContain('rounded-icon overflow-hidden bg-black/20');
    expect(table).toContain('rounded-pill hover:bg-white/10');
    expect(table).toContain('grid ${gridClass} cursor-pointer items-center gap-2 rounded-inner');
    expect(table).not.toContain('shadow-premium');
    expect(table).not.toContain('uppercase tracking-wider');
    expect(table).not.toContain('hover:bg-white/5');
    expect(table).not.toContain('<table');
    expect(table).not.toContain('<thead');
    expect(table).not.toContain('<tbody');

    expect(modal).toContain('mode === \'view\'');
    // isEdit was declared-and-never-used (SHELL_PARITY_AUDIT 2.11) -- the modal
    // needs only isView/isCreate; edit is the fall-through.
    expect(modal).not.toContain('mode === \'edit\'');
    expect(modal).toContain('mode === \'create\'');
    // Toast single-owner rule (VisitModal V-16): the page toasts success and
    // error; the modal only closes on success and stays open on failure.
    expect(modal).not.toContain('toast.success(isCreate');
    expect(modal).not.toContain("handleApiError(error, isCreate");
    expect(modal).toContain('Single toast owner is the page');
    // Sticky footer via ModalShell footer prop + cross-boundary submit.
    expect(modal).toContain("const formId = 'hospital-modal-form';");
    expect(modal).toContain('form={formId}');
    expect(modal).toContain('Manage in Requests');
    expect(modal).toContain("import { AnimatePresence, motion } from 'framer-motion';");
    expect(modal).toContain('const modalFieldClassName =');
    expect(modal).toContain('const modalSelectContentClassName =');
    expect(modal).not.toContain('border-0');
    expect(modal).not.toContain('border-white/10');
    expect(modal).not.toContain('border-b');
    expect(modal).not.toContain('focus-visible:ring-1');
    expect(modal).not.toContain('focus-visible:ring-primary/50');

    expect(service).toContain('export async function getHospitals(filter = {})');
    expect(service).toContain('export async function getHospitalsPageData(options = {})');
    expect(service).toContain('export function getHospitalVisibleStats(rows = [])');
    expect(service).toContain('async function getHospitalExactCount(filters = {}, quiet = false)');
    expect(service).toContain('export async function getHospitalPageStats(filters = {}, quiet = false)');
    expect(service).toContain('applyHospitalFilters(query, filter)');
    expect(service).toContain("supabase.from(TABLE_NAME).select('*')");
    expect(service).toContain("supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true })");
    expect(service).toContain("supabase.from(TABLE_NAME).select('*', { count: 'exact' })");
    expect(service).toContain('Number.isFinite(count) ? count : result.length');
    expect(service).not.toContain('getHospitals({ quiet })');
    // Narrow service additions (constitution section 5, this pass): allowlisted
    // sort plumbing (F1), display_id/phone in the search .or() (F9), and the
    // direct display_id column read (F12 -- the displayIdService double-read
    // could clobber genuine ids with null on a lookup miss).
    expect(service).toContain("const HOSPITAL_SORT_FIELDS = new Set(['created_at'])");
    expect(service).toContain("query = query.order(sortKey, { ascending: filter?.sortDirection === 'asc' })");
    expect(service).toContain('display_id.ilike');
    expect(service).toContain('phone.ilike');
    expect(service).not.toContain('displayIdService');
    expect(service).toContain('export async function getHospital(hospitalId)');
    expect(service).toContain('export async function createHospital(input)');
    expect(service).toContain('export async function updateHospital(hospitalId, input)');
    expect(service).toContain("supabase.rpc('update_hospital_by_admin'");
    expect(service).toContain('export async function deleteHospital(hospitalId)');
    expect(service).toContain("supabase.rpc('delete_hospital_by_admin'");

    expect(viewMode).toContain("const allowedViewModes = new Set(['grid', 'list', 'table'])");
    expect(viewMode).toContain('if (!allowedViewModes.has(newMode))');
  });

  it('names the required Hospitals repair before admission can start', () => {
    const gate = gateSource();

    expect(gate).toContain('Route data ownership repair, 2026-07-02');
    expect(gate).toContain('Destructive-action exclusion repair, 2026-07-02');
    expect(gate).toContain('Realtime cleanup repair, 2026-07-02');
    expect(gate).toContain('Mobile truth repair, 2026-07-02');
    expect(gate).toContain('Action authority repair, 2026-07-02');
    expect(gate).toContain('First-glance signal repair, 2026-07-02');
    expect(gate).toContain('Handled facility sheet repair, 2026-07-02');
    expect(gate).toContain('Visible degraded-state repair, 2026-07-02');
    expect(gate).toContain('Focused detail rail repair, 2026-07-02');
    expect(gate).toContain('Deep-link modal crash repair, 2026-07-02');
    expect(gate).toContain('Desktop grid chrome repair, 2026-07-02');
    expect(gate).toContain('Desktop grid chrome proof, 2026-07-02');
    expect(gate).toContain('List view hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('List view hardgate cleanup proof, 2026-07-02');
    expect(gate).toContain('Table view hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('Table view hardgate cleanup proof, 2026-07-02');
    expect(gate).toContain('Hospital modal hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('Hospital modal hardgate cleanup proof, 2026-07-02');
    expect(gate).toContain('Hospitals shell and default hardgate promotion proof, 2026-07-02');
    expect(gate).toContain('Shared filter and analytics reveal hardgate cleanup repair, 2026-07-02');
    expect(gate).toContain('Classify every create/update/delete/schedule action');
    expect(gate).toContain('Keep single delete, bulk delete, and destructive mobile selection excluded');
    expect(gate).toContain('Keep create unavailable until an insert/RPC receiver and RLS expectation are proved');
    expect(gate).toContain('Keep staff scheduling unavailable until doctor/ambulance status receivers and app consequences are proved');
    expect(gate).toContain('Keep reservation lifecycle actions in Requests');
    expect(gate).toContain('Keep mobile stats/current-state only until a real historical trend source is named');
    expect(gate).toContain('Keep the converted first glance on the Requests canon');
    expect(gate).toContain('Keep the handled facility sheet as the owner of desktop search, pagination, loading, empty, and failed-read states');
    expect(gate).toContain('Keep the focused detail rail as read-only evidence');
    expect(gate).toContain('Keep `HospitalModal` motion imports locked');
    expect(gate).toContain('Keep the active desktop Hospitals page source hardgate-clean');
    expect(gate).toContain('Keep the active mobile Hospitals source hardgate-clean');
    expect(gate).toContain('Keep the active Hospitals list density source hardgate-clean');
    expect(gate).toContain('Keep the active Hospitals table density source hardgate-clean');
    expect(gate).toContain('Keep the active Hospitals modal source hardgate-clean');
    expect(gate).toContain('Keep Hospitals in the default UI hardgate');
    expect(gate).toContain('Keep shared FilterSheet and AnalyticsModal hardgate-clean');
    expect(gate).toContain('Preserve old grid/list/table behavior only as density variants inside the handled sheet');
    expect(gate).toContain('Preserve `?id` with browser proof');
    expect(gate).toContain('Keep `?add=true` as unavailable feedback until create proof exists');
  });
});
