import fs from 'fs';
import { execFileSync } from 'child_process';
import { getAccessibleNav } from '../../config/navigation';
import { getMobileNavigationItems } from '../../config/mobileNavigation';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('VisitsPage admission contract', () => {
  const appSource = () => fs.readFileSync('src/App.js', 'utf8');
  const pageSource = () => fs.readFileSync('src/components/pages/VisitsPage.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileVisits.jsx', 'utf8');
  const panelSource = () => fs.readFileSync('src/components/context/VisitsPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const listSource = () => fs.readFileSync('src/components/views/VisitListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/VisitTableView.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/VisitModal.jsx', 'utf8');
  const modalShellSource = () => fs.readFileSync('src/components/ui/ModalShell.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/visitsService.js', 'utf8');
  const pageDataSource = () => fs.readFileSync('src/contexts/PageDataContext.jsx', 'utf8');
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
  const PRESERVATION_BASELINE = 'f31f29f';
  const headSource = (path) => execFileSync('git', ['show', `${PRESERVATION_BASELINE}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  it('keeps Visits provider-accessible while excluding sponsor routes', () => {
    expect(getRouteProtection('/visits')).toEqual({
      minRole: 'provider',
      resource: 'visits',
      title: 'Visits',
      excludedRoles: ['sponsor'],
    });

    expect(getProtectedRoutesForRole('provider')).toContain('/visits');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/visits');
    expect(getProtectedRoutesForRole('admin')).toContain('/visits');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/visits');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/visits');

    expect(getAccessibleNav({ role: 'provider' }).ops.items.find((item) => item.path === '/visits')?.label)
      .toBe('Visits');
    expect(getAccessibleNav({ role: 'sponsor' }).ops)
      .toBeNull();
    expect(getMobileNavigationItems('provider').map((item) => item.path)).toEqual(['/', '/emergencies', '/visits', '/settings']);
  });

  it('keeps Visits route-owned so PageData does not duplicate the page on /visits', () => {
    const page = pageSource();
    const contextPanel = contextPanelSource();

    expect(routeOwnsStartupDomains('/visits')).toBe(true);
    expect(getPageDataStartupDomainsForRole('provider', '/visits')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/visits')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/visits')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('provider')).toEqual(['emergency', 'visits']);

    const pageData = pageDataSource();
    expect(pageData).toContain('const fetchVisitsData = useCallback(async () => {');
    expect(pageData).toContain('const page = await getVisitsPageData({');
    expect(pageData).toContain('stats: page?.stats || null');
    expect(pageData).toContain("if (!user || useMockData || !startupDomains.includes('visits')) return;");

    expect(page).toContain('const visitPanelContext = React.useMemo(() => ({');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('visitsRouteContextUpdated', {");
    expect(page).toContain("window.addEventListener('requestVisitsRouteContext', publishVisitsRouteContext);");
    expect(contextPanel).toContain('const [visitsRouteContext, setVisitsRouteContext] = React.useState(null);');
    expect(contextPanel).toContain("window.addEventListener('visitsRouteContextUpdated', handleVisitsRouteContext);");
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestVisitsRouteContext'));");
    expect(contextPanel).toContain('<VisitsPanel visitContext={visitsRouteContext} />');
    expect(contextPanel).not.toContain('<VisitsPanel visitsData={visitsData} />');
  });

  it('keeps the route action local instead of mounting global FAB hooks on Visits', () => {
    const bottomBar = bottomBarSource();
    const fab = fabSource();

    expect(fab).toContain("location.pathname.startsWith('/visits')");
    expect(bottomBar).toContain("location.pathname.startsWith('/visits')");
    expect(bottomBar).toContain("pathname.startsWith('/visits') && ['provider', 'org_admin', 'admin'].includes(userRole)");
    expect(bottomBar).toContain("label: 'New visit'");
    expect(bottomBar).toContain("window.dispatchEvent(new CustomEvent('openVisitModal'))");
    expect(pageSource()).toContain("window.addEventListener('openVisitModal', handleOpenModal)");
  });

  it('records old Visits behavior that must be preserved or explicitly converted', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const list = listSource();
    const table = tableSource();
    const modal = modalSource();
    const service = serviceSource();

    expect(appSource()).toContain('<Route path="/visits" element={<ProtectedRoute minRole="provider"><VisitsPage /></ProtectedRoute>} />');
    // Explicitly converted 2026-07-09 (Requests gold standard): ONE canonical render.
    // ViewToggle and the grid/list/table density variants are retired from the active
    // route; the legacy view files stay unimported (chrome-lint targets only).
    expect(page).not.toContain('useViewMode');
    expect(page).not.toContain('<ViewToggle');
    expect(page).not.toContain('<VisitListView');
    expect(page).not.toContain('<VisitTableView');
    expect(page).toContain('const VISIT_GRID_COLS');
    expect(page).toContain('<VisitRow');
    expect(page).toContain('<VisitListHeader');
    expect(page).toContain('<FilterSheet');
    expect(page).toContain('<AnalyticsModal');
    expect(page).toContain('<EmergencyDetailsModal');
    expect(page).toContain("const viewVisitId = urlParams.get('view') || urlParams.get('id')");
    expect(page).toContain(".channel('visits')");
    expect(page).toContain('setTotalCount(pageData.count || 0)');
    expect(page).toContain('createVisit({');
    expect(page).toContain('updateVisit(selectedVisit.id, formData)');
    expect(page).toContain('canDelete={false}');
    expect(page).toContain('selectionEnabled={isAdmin()}');
    expect(page).not.toContain('selectedIds.map((id) => deleteVisit(id))');
    expect(page).not.toContain('deleteVisit(visit.id)');
    // Row selection ADOPTED (donor: Requests, user 2026-07-09): admin-only
    // checkboxes + select-all with shift-range via the shared useRowSelection.
    // Bulk OUTCOMES stay fail-closed: the bar's only action is disabled with the
    // locked reason -- no write path exists on this page.
    expect(page).toContain("from '../../hooks/useRowSelection'");
    expect(page).toContain('selectable={isAdmin()}');
    expect(page).toContain('<BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>');
    expect(page).toContain('Bulk visit outcomes are locked until backend authority is proved');
    expect(page).not.toContain('<ConfirmationModal');

    expect(mobile).toContain('<PullToRefresh onRefresh={onRefresh}>');
    expect(mobile).toContain('new IntersectionObserver(');
    expect(mobile).toContain('<MobileVisitsAtlasLayer />');
    expect(mobile).toContain('data-testid="mobile-visits-activity-sheet"');
    expect(mobile).toContain('onViewAnalytics');
    expect(mobile).toContain('onOpenFilters');
    expect(mobile).toContain('onLoadMore');
    expect(mobile).toContain("id: 'in_progress'");
    expect(mobile).toContain("activeKpi || 'all'");
    expect(mobile).toContain('onKpiClick={onKpiChange}');
    expect(mobile).toContain('selectionEnabled = false');
    expect(mobile).toContain('canDelete = false');
    expect(list).toContain('onView(visit)');
    expect(list).toContain('onEdit(visit)');
    expect(list).toContain('canDelete = false');
    expect(list).toContain('selectionEnabled = false');
    expect(table).toContain('onSelectAll');
    expect(table).toContain('onSort');
    expect(table).toContain('canDelete = false');
    expect(table).toContain('selectionEnabled = false');
    expect(modal).toContain('mode === \'view\'');
    expect(modal).toContain('mode === \'edit\'');
    expect(modal).toContain("import { ModalShell } from '../ui/ModalShell'");
    expect(modal).toContain('<ModalShell');
    expect(modal).not.toContain('fixed inset-0');
    expect(modal).not.toContain('role="dialog"');
    expect(modal).not.toContain('aria-modal="true"');
    expect(service).toContain('export async function getVisits(filter = {})');
    expect(service).toContain('export async function createVisit(input)');
    expect(service).toContain('export async function updateVisit(visitId, input)');
    expect(service).toContain('export async function deleteVisit(visitId)');
  });

  it('anchors the Visits preservation ledger to old Git-backed behavior', () => {
    const oldPage = headSource('frontend/src/components/pages/VisitsPage.jsx');
    const oldMobile = headSource('frontend/src/components/mobile/MobileVisits.jsx');
    const gate = gateSource();

    expect(oldPage).toContain('usePageData');
    expect(oldPage).toContain('visitsData');
    expect(oldPage).toContain('refreshAllData');
    expect(oldPage).toContain('deleteVisit');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('handleBulkDelete');
    expect(oldPage).toContain('handleDelete');
    expect(oldPage).toContain("viewMode === 'grid'");
    expect(oldPage).toContain("viewMode === 'list'");
    expect(oldPage).toContain("viewMode === 'table'");
    expect(oldPage).toContain('<VisitListView');
    expect(oldPage).toContain('<VisitTableView');
    expect(oldPage).toContain('<FilterSheet');
    expect(oldPage).toContain('<AnalyticsModal');
    expect(oldPage).toContain('<EmergencyDetailsModal');
    expect(oldPage).toContain('<PaginationControls');

    expect(oldMobile).toContain('growthData');
    expect(oldMobile).toContain('filteredVisits');
    expect(oldMobile).toContain('chartData');
    expect(oldMobile).toContain('Active Queue');
    expect(oldMobile).toContain('Visit Velocity');
    expect(oldMobile).toContain("'LIVE'");

    expect(gate).toContain('HEAD snapshot evidence for this ledger');
    expect(gate).toContain('| PageDataContext `visitsData`, `refreshAllData`, old page-level stats consumption, and old right-panel `visitsData` consumption.');
    expect(gate).toContain('| Confirmation modal for single delete and bulk delete.');
    expect(gate).toContain('| Mobile fake trend charts, dashboard stack, and local-only mobile filtering.');
  });

  it('declares the Visits conversion contract before visual implementation starts', () => {
    const gate = gateSource();
    const hardgate = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

    expect(gate).toContain('Visits canonical conversion contract:');
    expect(gate).toContain('convert Visits from normal content into a full-bleed stage using the shared app shell');
    expect(gate).toContain('hidden global FAB');
    expect(gate).toContain('no private sidebar, header, footer, notification, or modal chrome');
    expect(gate).toContain('keep `visitStatus.js` plus `getVisitsPageData()` as the single Visits source room');
    expect(gate).toContain('`PageDataContext` must stay quiet on `/visits`');
    expect(gate).toContain('one signal field for the current visit work');
    expect(gate).toContain('The first visible command is `New visit` for allowed roles only');
    expect(gate).toContain('keep `all`, `scheduled`, `in_progress`, `completed`, and `cancelled` as route-query state choices');
    expect(gate).toContain('Status filters and KPI filters run after the status source room resolves raw visit status plus linked emergency lifecycle');
    expect(gate).toContain('convert old grid/list/table scanning into one handled sheet');
    expect(gate).toContain('one focused detail rail or sheet for the selected visit');
    expect(gate).toContain('Terminal status changes, delete, bulk delete, and clinical/lifecycle outcomes remain unavailable');
    expect(gate).toContain('Mobile should render signal, state choices, compact search/filter, handled visit sheet, row reveal, load more, and route-owned `New visit`');
    expect(gate).toContain('it must not restore hamburger navigation, fake trend charts, `LIVE` badges, local-only search/KPI truth, or destructive selection');
    expect(gate).toContain('`VisitsPage.jsx`, `MobileVisits.jsx`, `VisitListView.jsx`, `VisitTableView.jsx`, and `VisitModal.jsx` are now in the active UI hardgate because visual implementation has started');

    expect(hardgate).toContain("'src/components/pages/VisitsPage.jsx'");
    expect(hardgate).toContain("'src/components/mobile/MobileVisits.jsx'");
    expect(hardgate).toContain("'src/components/context/VisitsPanel.jsx'");
    expect(hardgate).toContain("'src/components/views/VisitListView.jsx'");
    expect(hardgate).toContain("'src/components/views/VisitTableView.jsx'");
    expect(hardgate).toContain("'src/components/modals/VisitModal.jsx'");
  });

  it('starts Visits visual implementation with the shared shell but without admission', () => {
    const page = pageSource();
    const gate = gateSource();

    expect(page).toContain("import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext'");
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    // One canonical render (converted 2026-07-09): sortable header + rows from the
    // console design system, no view modes. aria-sort/columnheader semantics are
    // locked in ConsoleDesignSystem.contract.test.js.
    expect(page).toContain("from '../console/ActivitySheet'");
    // Donor sort truth (Requests): TIME is the only sortable column; the other
    // headers are plain labels -- alphabetical sorts are not operational, and
    // status/type filtering belongs to the state chips + FilterSheet (user
    // arbitration: per-column filters removed).
    expect(page).toContain('<SortableColumnHeader label="Time" sortKey="date" sortConfig={sortConfig} onSort={onSort} />');
    expect(page).toContain('<span>Patient</span>');
    expect(page).toContain('<span>Status</span>');
    expect(page).toContain('<span>Type</span>');
    expect(page).toContain('<span>Facility</span>');
    expect(page).not.toContain('sortKey="user_id"');
    expect(page).not.toContain('sortKey="status"');
    expect(page).not.toContain('sortKey="type"');
    expect(page).not.toContain('sortKey="hospital_id"');
    expect(page).not.toContain('viewMode');

    expect(gate).toContain('Visual implementation start proof, 2026-06-29');
    expect(gate).toContain('This starts the visual implementation but does not admit Visits.');
  });

  it('adds a focused Visits detail rail with a single canonical list', () => {
    const page = pageSource();
    const gate = gateSource();

    expect(page).toContain('const [focusedVisitId, setFocusedVisitId] = useState(null)');
    expect(page).toContain('const focusedVisit = React.useMemo(() => (');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain('<VisitsDetailRail');
    expect(page).toContain('visit={focusedVisit}');
    expect(page).toContain('const VisitsDetailRail = ({ visit, loading, canEdit, onView, onEdit, activeActionFeedback }) => {');
    // Rail anatomy composes the console DS: shell + inset hero + film rows + copy
    // affordance + lifecycle stage strip (specs locked in the DS contract).
    expect(page).toContain('<DetailRailShell>');
    expect(page).toContain('<RailInsetHero>');
    expect(page).toContain('<DetailLine');
    expect(page).toContain('<CopyChip value={displayId} label="Copy record ID" />');
    expect(page).toContain('<StageStrip');
    expect(page).toContain('onFocus={() => setFocusedVisitId(visit.id)}');
    expect(page).toContain('<ListRowShell');
    expect(page).toContain('event.stopPropagation();');
    expect(page).toContain('Outcome and delete actions are locked for now.');

    expect(gate).toContain('Focused detail rail proof, 2026-06-29');
    expect(gate).toContain('The old grid, list, and table modes remain preserved during this pass.');
  });

  it('converts the Visits opener into a signal and service-backed state choices', () => {
    const page = pageSource();
    const gate = gateSource();

    expect(page).toContain('const visitStateOptions = [');
    expect(page).toContain("id: 'all'");
    expect(page).toContain("id: 'scheduled'");
    expect(page).toContain("id: 'in_progress'");
    expect(page).toContain("id: 'completed'");
    expect(page).toContain("id: 'cancelled'");
    // Signal + KPI strip come from the console design system (S1.2 max-3 smart
    // context, toggle-to-All, widths and tile spec locked in the DS contract).
    // The page owns only the DOMAIN: signal copy, state options, pins, importance.
    expect(page).toContain('const getVisitSignal = ({ stats, visits, kpiFilter, loadError }) => {');
    expect(page).toContain("from '../console/SignalPanel'");
    expect(page).toContain("from '../console/KpiStrip'");
    expect(page).toContain('<SignalPanel signal={signal} loading={loading} toneClassMap={visitToneClass}>');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain("const PINNED_VISIT_STATE_IDS = ['scheduled', 'in_progress'];");
    expect(page).toContain('pinnedIds={PINNED_VISIT_STATE_IDS}');
    expect(page).toContain('importance={VISIT_KPI_IMPORTANCE}');
    expect(page).toContain('Pick one record, then view details or edit scheduling.');
    expect(page).not.toContain('Bento Overview Cards');
    expect(page).not.toContain('Total Visits Card');
    expect(page).not.toContain('FILTERED');
    expect(page).not.toContain('UPCOMING');
    expect(page).not.toContain('VOID');

    expect(gate).toContain('Signal and state-choice opener proof, 2026-06-29');
    expect(gate).toContain('The old five-card metric opener is converted into one signal field plus compact state choices.');
  });

  it('wraps Visits scan modes in one handled activity sheet', () => {
    const page = pageSource();
    const gate = gateSource();

    // The sheet, toolbar, count-row triplet, Updating pill, debounced search, and
    // pagination all come from the console design system (locked in
    // ConsoleDesignSystem.contract.test.js). The page owns the DOMAIN wiring below.
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('itemNoun="visits"');
    expect(page).toContain('<SheetToolbar');
    expect(page).toContain('searchTestId="visits-sheet-search"');
    // Search placeholder names exactly what the service .or() can match.
    expect(page).toContain('searchPlaceholder="Search by ID, type, facility, practitioner, or room..."');
    expect(page).toContain("onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}");
    // Donor-parity failure states: failed-empty owns the scroller with an honest
    // destructive card; a partial failure keeps rows and shows the inline banner.
    expect(page).toContain('const failedEmpty = Boolean(loadError) && visits.length === 0;');
    expect(page).toContain('<LoadErrorState title="Visits did not load" message={loadError} onRetry={onRetry} />');
    expect(page).toContain('errorBanner={loadError && !failedEmpty ? (');
    expect(page).toContain('pagination={pagination}');

    expect(gate).toContain('Handled activity sheet proof, 2026-06-29');
    expect(gate).toContain('The old grid, list, and table scan modes now live inside one route-owned activity sheet with inline search');
  });

  it('keeps failed Visits reads visible inside the canonical sheet with retry', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const gate = gateSource();

    expect(page).toContain('const [visitPageError, setVisitPageError] = useState(null)');
    expect(page).toContain('setVisitPageError(null)');
    expect(page).toContain("setVisitPageError('Visits could not load. Try again.')");
    expect(page).toContain('loadError={visitPageError}');
    expect(page).toContain('onRetry={fetchVisits}');
    expect(page).toContain('<ErrorBanner');
    expect(page).toContain('title="Visits could not load"');
    expect(page).toContain('testId="visits-error-state"');

    expect(mobile).toContain('errorMessage,');
    expect(mobile).toContain('onRetry,');
    expect(mobile).toContain('<MobileVisitErrorBanner message={errorMessage} onRetry={onRetry || onRefresh} />');
    expect(mobile).toContain('const MobileVisitErrorBanner = ({ message, onRetry }) => (');
    expect(mobile).toContain('data-testid="mobile-visits-error-state"');
    expect(mobile).toContain('Visits could not load');
    expect(mobile).toContain('Retry');

    expect(gate).toContain('Visible degraded-state proof, 2026-06-30');
    expect(gate).toContain('failed Visits reads stay visible inside the activity sheet');
  });

  it('adds immediate interaction feedback for route actions and reveal states', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const gate = gateSource();

    expect(page).toContain('const actionFeedbackTimerRef = useRef(null)');
    expect(page).toContain('const [activeActionFeedback, setActiveActionFeedback] = useState(null)');
    expect(page).toContain('const markActionFeedback = useCallback((actionId) => {');
    expect(page).toContain("markActionFeedback('create')");
    expect(page).toContain("markActionFeedback('filters')");
    expect(page).toContain("markActionFeedback('analytics')");
    expect(page).toContain("markActionFeedback('emergency-context')");
    expect(page).toContain("markActionFeedback(`view-${visit?.id || 'unknown'}`)");
    expect(page).toContain("markActionFeedback(`edit-${visit?.id || 'unknown'}`)");
    // Donor parity: the primary command is the dark header pill (Requests idiom)
    // next to the header filter trigger; the sheet toolbar carries search/refresh/
    // Filters only. Opening/selected feedback states render inside DS components.
    expect(page).toContain('New visit');
    expect(page).toContain('aria-label="Schedule new visit"');
    expect(page).toContain('aria-label="Filter visits"');
    // The toolbar Filters trigger is context-aware (donor getFilterTriggerState:
    // open/filtered/idle) -- locked in the DS contract; the page wires filtersActive.
    expect(page).toContain('filtersActive={hasFilter}');
    expect(page).toContain("{viewOpening ? 'Opening...' : 'Details'}");
    expect(page).toContain("{editOpening ? 'Opening...' : 'Edit'}");
    expect(page).toContain('aria-busy={viewOpening}');

    // The search row + triggers come from the mobile canon kit (SearchRow): press
    // ladder, debounce, and the context-aware filter state are locked in
    // MobileCanonKit.contract.test.js; the page wires the filtered signal.
    expect(mobile).toContain("from './canon/SearchRow'");
    expect(mobile).toContain('hasFilter={hasFilter}');
    // Row tap opens the detail bottom sheet (approved design + desktop rail behaviour),
    // replacing the old inline dropdown expand.
    expect(mobile).toContain('onOpen={() => onOpen(visit)}');
    expect(mobile).toContain("from './canon/GroupedList'");

    expect(gate).toContain('Interaction feedback proof, 2026-06-30');
    expect(gate).toContain('Visits route actions now expose immediate opening, selected, and reveal states');
  });

  it('keeps the Visits right panel route-owned and hardgate-clean', () => {
    const page = pageSource();
    const panel = panelSource();
    const contextPanel = contextPanelSource();
    const gate = gateSource();

    expect(page).toContain('const canCreateVisits = isAdmin() || isOrgAdmin() || isProvider()');
    expect(page).toContain('canCreate: canCreateVisits');
    expect(page).toContain('canEdit: canEditVisits');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('visitsRouteContextUpdated', {");
    expect(page).toContain("window.addEventListener('requestVisitsRouteContext', publishVisitsRouteContext);");

    expect(contextPanel).toContain('<VisitsPanel visitContext={visitsRouteContext} />');
    expect(contextPanel).not.toContain('visitsData,');

    expect(panel).toContain('export const VisitsPanel = ({ visitContext }) =>');
    expect(panel).toContain("const [panelNotice, setPanelNotice] = React.useState('Visit actions ready.');");
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openVisitModal'))");
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openAnalyticsModal'))");
    expect(panel).toContain('Visits overview');
    expect(panel).toContain('Current route scope');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain('Current list');
    expect(panel).toContain('No visits in the current view.');
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('title="New visit"');
    expect(panel).toContain('title="View visit statistics"');

    expect(panel).not.toContain('visitsData');
    expect(panel).not.toContain('Daily Pulse');
    expect(panel).not.toContain("Today's Visits");
    expect(panel).not.toContain('Live Queue');
    expect(panel).not.toContain('Ambulatory Care');
    expect(panel).not.toContain('Active Session');
    expect(panel).not.toContain('Queue clear');
    expect(panel).not.toContain('border');
    expect(panel).not.toContain('ring');
    expect(panel).not.toContain('outline');
    expect(panel).not.toContain('divide');

    expect(gate).toContain('Visits right-panel route-context proof, 2026-07-06');
    expect(gate).toContain('`VisitsPanel.jsx` now consumes `visitContext`, not `PageDataContext` `visitsData`');
  });

  it('keeps Visits modals and secondary reveals on canonical chrome', () => {
    const page = pageSource();
    const modal = modalSource();
    const modalShell = modalShellSource();
    const gate = gateSource();

    expect(page).toContain('<VisitModal');
    expect(page).toContain('<FilterSheet');
    expect(page).toContain('isMobile={isMobile}');
    expect(page).toContain('<AnalyticsModal');
    expect(page).toContain('<EmergencyDetailsModal');

    expect(modal).toContain('<ModalShell');
    expect(modal).toContain('managed');
    expect(modal).toContain('const patientLabel = (');
    expect(modal).toContain('const facilityLabel = (');
    expect(modal).toContain('const ReadOnlyField = ({ value, subtext, icon, multiline = false }) => {');
    expect(modal).toContain("value={formData.notes || 'No clinical notes'}");
    expect(modal).toContain('View Full Incident Log');

    expect(modalShell).toContain('role="dialog"');
    expect(modalShell).toContain('aria-modal="true"');
    expect(modalShell).toContain('data-modal-chrome="true"], #dynamic-bottom-bar');

    expect(gate).toContain('Modal and secondary reveal proof, 2026-06-30');
    expect(gate).toContain('view-mode `VisitModal` renders read-only evidence fields');
  });

  it('keeps delete and bulk delete excluded from the active Visits UI until authority is proved', () => {
    const page = pageSource();
    const list = listSource();
    const table = tableSource();
    const mobile = mobileSource();

    expect(page).not.toContain('deleteVisit');
    expect(page).not.toContain('handleBulkDelete');
    expect(page).not.toContain('handleDelete');
    // Selection UI is adopted (Requests parity) but carries NO write path: the
    // bulk bar's single action is disabled with the locked reason.
    expect(page).toContain('Bulk visit outcomes are locked until backend authority is proved');
    expect(page).toContain('canDelete={false}');
    expect(page).toContain('selectionEnabled={isAdmin()}');

    expect(list).toContain('canDelete = false');
    expect(list).toContain('selectionEnabled = false');
    expect(list).toContain('{canDelete && (');
    expect(table).toContain('canDelete = false');
    expect(table).toContain('selectionEnabled = false');
    expect(table).toContain('{canDelete && (');
    expect(mobile).toContain('canDelete = false');
    expect(mobile).toContain('selectionEnabled = false');
    expect(mobile).toContain('{canDelete && (');
    // Selection ON (isAdmin) but fail-closed: the mobile bulk bar's only control is a
    // DISABLED delete with the locked reason — mechanism restored, write stays locked.
    expect(mobile).toContain('MobileSelectionBar');
    expect(mobile).toContain('Bulk visit outcomes are locked until authorized');
  });

  it('guards Visits realtime refreshes and async list results after route cleanup', () => {
    const page = pageSource();

    expect(page).toContain('const isMountedRef = useRef(false)');
    expect(page).toContain('const fetchRequestRef = useRef(0)');
    expect(page).toContain('isMountedRef.current = false');
    expect(page).toContain('fetchRequestRef.current += 1');
    expect(page).toContain('if (!isMountedRef.current || fetchRequestRef.current !== requestId)');
    expect(page).toContain('let active = true');
    expect(page).toContain('if (active && isMountedRef.current)');
    expect(page).toContain('active = false');
    expect(page).toContain('supabase.removeChannel(channel)');
  });

  it('limits generic visit create and update writes to scheduling metadata', () => {
    const modal = modalSource();
    const service = serviceSource();

    expect(service).toContain('const VISIT_PAGE_WRITE_COLUMNS = new Set');
    expect(service).toContain("'user_id'");
    expect(service).toContain("'hospital_id'");
    expect(service).toContain("'date'");
    expect(service).toContain("'type'");
    expect(service).toContain("'status'");
    expect(service).toContain("'notes'");
    expect(service).toContain("'cost'");
    expect(service).toContain("'preparation'");
    expect(service).toContain("'room_number'");
    expect(service).toContain("'estimated_duration'");
    expect(service).toContain("'insurance_covered'");
    expect(service).toContain('const VISIT_PAGE_STATUS_VALUES = new Set');
    expect(service).toContain("'scheduled'");
    expect(service).toContain("'upcoming'");
    expect(service).toContain("'in_progress'");
    expect(service).toContain("if (!VISIT_PAGE_WRITE_COLUMNS.has(targetKey)) continue");
    expect(service).toContain("if (targetKey === 'status' && !VISIT_PAGE_STATUS_VALUES.has(value)) continue");
    expect(service).not.toContain("if (!payload.doctor_name");

    expect(modal).toContain("const terminalStatusValues = new Set(['completed', 'cancelled', 'no-show'])");
    expect(modal).toContain('const isTerminalStatus = terminalStatusValues.has');
    expect(modal).toContain('disabled={isTerminalStatus}');
    expect(modal).toContain('const ReadOnlyField = ({ value, subtext, icon, multiline = false }) => {');
    expect(modal).toContain('<SelectItem value="completed" disabled>');
    expect(modal).toContain('<SelectItem value="cancelled" disabled>');
    expect(modal).toContain('<SelectItem value="no-show" disabled>');
    expect(modal).toContain('Status changes here stay in scheduling.');
  });

  it('moves route list, count, stats, and enrichment reads behind visitsService before visual admission', () => {
    const page = pageSource();
    const service = serviceSource();

    expect(page).toContain('getVisitsPageData({');
    expect(page).toContain('setVisitPageStats(pageData.stats || null)');
    expect(page).not.toContain("supabase.from('visits').select('*', { count: 'exact', head: true })");
    expect(page).not.toContain(".from('profiles')");
    expect(page).not.toContain(".from('emergency_requests')");
    expect(page).not.toContain(".from('doctors')");
    expect(page).not.toContain(".from('hospitals')");
    expect(page).not.toContain('getCurrentUser');
    expect(page).not.toContain('applyAuthFilter');

    expect(service).toContain('export async function getVisitsPageData');
    expect(service).toContain('getVisitResolutionRows({ filters, user })');
    expect(service).toContain('resolveVisitStatus({');
    expect(service).toContain('source_status: visit.status || null');
    expect(service).toContain('emergency_status: emergency?.status || null');
    expect(service).toContain('const statsRows = applyResolvedVisitFilters(resolvedRows, filters, \'all\');');
    expect(service).toContain('const filteredRows = applyResolvedVisitFilters(resolvedRows, filters, kpiFilter);');
    expect(service).toContain('count: filteredRows.length');
    expect(service).toContain('const stats = getVisitPageStatsFromRows(statsRows);');
    expect(service).not.toContain("if (kpiFilter === 'in_progress') nextQuery = nextQuery.eq('status', 'in_progress');");
    expect(service).toContain("from('profiles')");
    expect(service).toContain("from('emergency_requests')");
    expect(service).toContain("from('doctors')");
    expect(service).toContain("from('hospitals')");
  });

  it('keeps Visits search and KPI filtering service-owned instead of mobile-local', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const service = serviceSource();

    // The mobile chip row receives the RESOLVED state (S1.2 smart default): explicit
    // taps override, otherwise the default resolves to a chip with live signal.
    expect(page).toContain('activeKpi={selectedKpiFilter}');
    expect(page).toContain('onKpiChange={setKpiFilter}');
    expect(page).toContain("placeholder: 'Search by ID, type, facility, practitioner, or room...'");

    expect(mobile).not.toContain("const search = String(filters?.search");
    expect(mobile).not.toContain("const kpi = String(filters?.kpiFilter");
    expect(mobile).not.toContain('patientName.includes(search)');
    expect(mobile).not.toContain("if (kpi !== 'all')");
    expect(mobile).toContain('useStableList(visitRows, loading)');
    expect(mobile).toContain("id: 'in_progress'");
    expect(mobile).toContain('onKpiClick={onKpiChange}');

    expect(service).toContain('const sanitizeVisitSearchTerm');
    expect(service).toContain('const search = sanitizeVisitSearchTerm(filters.search)');
    expect(service).toContain('nextQuery = nextQuery.or([');
    expect(service).toContain('const kpiState = getVisitStateFromKpi(kpiFilter);');
    expect(service).toContain('visitMatchesResolvedState(visit, kpiState)');
    expect(service).toContain('display_id.ilike');
    expect(service).toContain('hospital_name.ilike');
    expect(service).toContain('doctor_name.ilike');
    expect(service).toContain('room_number.ilike');
  });

  it('converts mobile Visits into the Requests-style signal and handled sheet', () => {
    const mobile = mobileSource();
    const gate = gateSource();

    expect(mobile).toContain('const MobileVisitsAtlasLayer = () => (');
    expect(mobile).toContain('const mobileVisitStates = [');
    expect(mobile).toContain("id: 'all'");
    expect(mobile).toContain("id: 'scheduled'");
    expect(mobile).toContain("id: 'in_progress'");
    expect(mobile).toContain("id: 'completed'");
    expect(mobile).toContain("id: 'cancelled'");
    expect(mobile).toContain('data-testid="mobile-visits-activity-sheet"');
    // Search row testid + trigger labels are wired through the canon kit props.
    expect(mobile).toContain('searchTestId="mobile-visits-sheet-search"');
    expect(mobile).toContain('entityLabel="visits"');
    expect(mobile).toContain('statsLabel="Open visit statistics"');
    expect(mobile).toContain('const MobileVisitRow = ({');
    expect(mobile).toContain('<MobileDetailSheet');
    // labelTone="plain" per Mobile DS v1.2 no-all-caps (donor parity with MobileEmergency).
    expect(mobile).toContain('<MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />');
    expect(mobile).toContain('<MobileListEnd label="End of visits" />');
    expect(mobile).toContain('Details');
    expect(mobile).toContain('Edit');

    expect(mobile).toContain('MobileKPIStrip');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('MobileSectionHeader');
    expect(mobile).not.toContain("Today's Appointments");
    expect(mobile).not.toContain('Visit Summary');
    expect(mobile).not.toContain('Visit Directory');

    expect(gate).toContain('Mobile handled-sheet proof, 2026-06-29');
    expect(gate).toContain('Mobile Visits now follows the Requests mobile rhythm');
  });

  it('records responsive and deep-link proof before admitting Visits', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const gate = gateSource();
    const hospitalsService = fs.readFileSync('src/services/hospitalsService.js', 'utf8');

    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain("const viewVisitId = urlParams.get('view') || urlParams.get('id')");
    expect(page).toContain('const visitData = await getVisit(viewVisitId)');
    expect(page).toContain("import { getHospitalOptions } from '../../services/hospitalsService';");
    expect(page).toContain('getHospitalOptions()');
    expect(page).not.toContain('getHospitals()');
    expect(hospitalsService).toContain('export async function getHospitalOptions()');
    expect(hospitalsService).toContain(".select('id, name')");
    // Converted 2026-07-09: the responsive scan surface is the single canonical row
    // list inside the activity sheet (grid cards retired with the density variants).
    // Donor-parity stage (Requests gold standard): atlas backdrop + shared wayfinding
    // dock + fixed-width detail rail.
    expect(page).toContain("const VISIT_GRID_COLS = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(96px,0.7fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]'");
    // Stage, atlas, dock and rail widths come from the console design system
    // (WorkspaceStage/DetailRailShell -- specs locked in the DS contract).
    expect(page).toContain("from '../console/WorkspaceStage'");
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('activePath="/visits"');
    expect(page).toContain('moduleRailItems={moduleRailItems}');
    expect(page).toContain('<DetailRailShell>');
    expect(page).toContain('itemNoun="visits"');
    expect(mobile).toContain('data-testid="mobile-visits-activity-sheet"');
    expect(mobile).toContain('entityLabel="visits"');
    expect(gate).toContain('Responsive and deep-link admission proof, 2026-07-02');
    expect(gate).toContain('wide desktop, tablet, 390px mobile, and `?view=` deep-link');
    expect(gate).toContain('Visit status source-room repair, 2026-07-07');
    expect(gate).toContain('after linked emergency resolution the same rows become `completed 39`, `cancelled 20`, `scheduled 0`, and `active 0`');
  });

  it('admits Visits only as a guarded Page 7 with destructive actions still excluded', () => {
    const page = pageSource();
    const gate = gateSource();

    expect(gate).toContain('| Visits | `/visits` | Admitted for guarded continuation after the 2026-07-02 responsive and deep-link proof.');
    expect(gate).toContain('Decision: Visits is admitted for guarded continuation under the Today/Requests canon');
    expect(gate).toContain('it does not make Visits a new global layout source');
    expect(gate).toContain('it does not admit destructive delete, bulk delete, terminal lifecycle outcomes, or clinical/history mutation authority');
    expect(gate).toContain('Remaining guarded constraints after Page 7 admission:');
    expect(gate).toContain('Prove a delete receiver/RLS/app consequence before reintroducing single delete or bulk delete');
    expect(page).not.toContain('deleteVisit');
    expect(page).not.toContain('<ConfirmationModal');
    // The selection mechanism exists (Requests parity) but every bulk OUTCOME
    // remains fail-closed until receiver/RLS/app-consequence proof.
    expect(page).toContain('disabled');
    expect(page).toContain('Bulk visit outcomes are locked until backend authority is proved');
  });

  it('keeps mobile Visits free of fake trend charts and stale live copy', () => {
    const mobile = mobileSource();

    expect(mobile).not.toContain('growthData');
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain('filteredVisits');
    expect(mobile).not.toContain("'LIVE'");
    expect(mobile).not.toContain('Visit Velocity');
    expect(mobile).not.toContain('Active Queue');
    expect(mobile).not.toContain('calcDeltaPercent');
    expect(mobile).not.toContain('formatSignedPercent');
    expect(mobile).not.toContain('formatSignedPercent(completionRate - 50)');
    expect(mobile).toContain('const totalCount = countNumber(statistics?.total, visitRows.length)');
  });

  it('keeps Visits surfaces free of decorative borders, hairlines, and glass', () => {
    const files = { page: pageSource(), mobile: mobileSource(), list: listSource(), table: tableSource(), modal: modalSource() };
    for (const [name, src] of Object.entries(files)) {
      expect({ name, glass: src.includes('glass-card-premium') }).toEqual({ name, glass: false });
      // Mobile is exempt from the blur ban for exactly ONE sanctioned use: the canon
      // frosted recency panel (Mobile DS v1.2 LIST grammar, donor = MobileEmergency).
      // The desktop page composes the console design system, whose frosted sheet/
      // rail/tile surfaces live (and are positively pinned) in the DS files -- so the
      // PAGE itself carries no blur of its own.
      if (name !== 'mobile') {
        expect({ name, blur: src.includes('backdrop-blur') }).toEqual({ name, blur: false });
      }
      expect({ name, inset: src.includes('shadow-[inset') }).toEqual({ name, inset: false });
      expect({ name, separator: src.includes('DropdownMenuSeparator') }).toEqual({ name, separator: false });
    }
    // The sanctioned frosted recency panel now lives in the mobile canon kit
    // (GROUP_PANEL_FROSTED, frosted-as-a-prop); the page composes it.
    expect(fs.readFileSync('src/components/mobile/canon/GroupedList.jsx', 'utf8')).toContain('rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5');
    expect(mobileSource()).toContain("from './canon/Loading'");
    // Donor-parity frosted surfaces live in the console DS, not the page.
    expect(fs.readFileSync('src/components/console/ActivitySheet.jsx', 'utf8')).toContain('rounded-t-sheet bg-card/68 p-3 shadow-e3 backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet');
    expect(fs.readFileSync('src/components/console/WorkspaceStage.jsx', 'utf8')).toContain('shadow-e3 backdrop-blur-2xl');
    expect(listSource()).not.toContain('bg-white/');
    expect(tableSource()).not.toContain('bg-white/');
  });
});
