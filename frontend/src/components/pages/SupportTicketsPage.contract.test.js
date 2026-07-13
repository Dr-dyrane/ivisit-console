import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { execFileSync } from 'child_process';
import { getAccessibleNav } from '../../config/navigation';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

describe('SupportTicketsPage canonical source contract', () => {
  const pageSource = () => fs.readFileSync('src/components/pages/SupportTicketsPage.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileSupportTickets.jsx', 'utf8');
  const panelSource = () => fs.readFileSync('src/components/context/SupportTicketsPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/SupportTicketModal.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/supportTicketsService.js', 'utf8');
  // S3 React Query migration (mirrors DoctorsPage/HospitalsPage): the page reads via
  // useSupportTicketsQuery and writes via useSupportTicketsMutations. These readers let
  // the conversion assertions point at the relocated data layer.
  const queryHookSource = () => fs.readFileSync('src/hooks/useSupportTicketsQuery.js', 'utf8');
  const mutationsHookSource = () => fs.readFileSync('src/hooks/useSupportTicketsMutations.js', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const bottomBarSource = () => [
    fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
    fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
  ].join('\n');
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
  const PRESERVATION_BASELINE = 'f31f29f';
  const headSource = (path) => execFileSync('git', ['show', `${PRESERVATION_BASELINE}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  it('keeps Support provider-accessible while excluding sponsor routes', () => {
    expect(getRouteProtection('/support-tickets')).toEqual({
      minRole: 'provider',
      resource: 'support',
      title: 'Support',
      excludedRoles: ['sponsor'],
    });

    expect(getProtectedRoutesForRole('provider')).toContain('/support-tickets');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/support-tickets');
    expect(getProtectedRoutesForRole('admin')).toContain('/support-tickets');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/support-tickets');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/support-tickets');

    expect(getAccessibleNav({ role: 'provider' }).mgmt.items.find((item) => item.path === '/support-tickets')?.label)
      .toBe('Support');
    expect(getAccessibleNav({ role: 'sponsor' }).mgmt)
      .toBeNull();
  });

  it('anchors the Support ledger to old Git-backed behavior', () => {
    const oldPage = headSource('frontend/src/components/pages/SupportTicketsPage.jsx');
    const oldService = headSource('frontend/src/services/supportTicketsService.js');
    const gate = gateSource();

    expect(oldPage).toContain('useSupportTickets');
    expect(oldPage).toContain('usePageFooter');
    expect(oldPage).toContain("useViewMode('support-tickets-page', 'grid')");
    expect(oldPage).toContain('<ViewToggle value={viewMode} onChange={setViewMode} />');
    expect(oldPage).toContain("viewMode === 'grid'");
    expect(oldPage).toContain("viewMode === 'list'");
    expect(oldPage).toContain("viewMode === 'table'");
    expect(oldPage).toContain('<FilterSheet');
    expect(oldPage).toContain('<AnalyticsModal');
    expect(oldPage).toContain('<SupportTicketModal');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('<SupportTicketListView');
    expect(oldPage).toContain('<SupportTicketTableView');
    expect(oldPage).toContain('<MobileSupportTickets');
    expect(oldPage).toContain('<PaginationControls');
    expect(oldPage).toContain('handleDelete');
    expect(oldPage).toContain('handleAssign');
    expect(oldPage).toContain('selectedIds');
    expect(oldPage).toContain('openSupportTicketModal');

    expect(oldService).toContain("const TABLE_NAME = 'support_tickets'");
    expect(oldService).toContain('export async function getSupportTickets(filter = {})');
    expect(oldService).toContain('export async function createSupportTicket(input)');
    expect(oldService).toContain('export async function updateSupportTicket(ticketId, input)');
    expect(oldService).toContain('export async function deleteSupportTicket(ticketId)');
    expect(oldService).toContain('export async function updateTicketStatus(ticketId, status)');
    expect(oldService).toContain('export async function assignTicket(ticketId, assignedTo)');
    expect(oldService).toContain('export function subscribeToSupportTickets(callback)');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/SupportTicketsPage.jsx`');
    expect(gate).toContain('Support preservation ledger');
  });

  it('locks Support to the shared shell and route-owned data model', () => {
    const page = pageSource();
    const service = serviceSource();
    const contextPanel = contextPanelSource();
    const fab = fabSource();
    const bottomBar = bottomBarSource();
    const gate = gateSource();

    expect(gate).toContain('### Page 10 Admission - Support');
    expect(gate).toContain('Support at `/support-tickets` is admitted under the Today/Requests canon for this page only.');
    expect(gate).toContain('`supportTicketsService.js` now exposes `getSupportTicketsPage()` as the route projection owner');
    expect(gate).toContain('Single delete, bulk delete, and provider self-assign are restored on the active Support surface');
    expect(gate).toContain('Status transition remains service inventory only.');
    expect(gate).toContain('Support right-panel route-context proof, 2026-07-06:');
    expect(gate).toContain('`SupportTicketsPage.jsx` publishes a page-owned `supportPanelContext`');
    expect(gate).toContain('`ContextPanel.jsx` requests that context through `requestSupportTicketsRouteContext`');
    expect(gate).toContain('`SupportTicketsPanel.jsx` now consumes `supportContext`, not direct Supabase or `PageDataContext`');
    expect(gate).toContain('`cmd /c npm run check:ui-hardgate` for 74 files');

    // S3 React Query migration (mirrors DoctorsPage/HospitalsPage): the route
    // projection now flows through useSupportTicketsQuery; create/update write via
    // useSupportTicketsMutations; realtime invalidates the ['support'] cache. The
    // imperative fetch-dedup loop (fetchRequestRef/requestId) and the
    // list/stats/loading/error useState setters are gone, but every governance guard
    // below is preserved.
    expect(page).toContain('useSupportTicketsQuery(queryFilter)');
    expect(page).toContain('statsFilter: getStatsFilters(routeFilters)');
    expect(page).toContain('stats: supportStats');
    expect(page).toContain('createTicketMutation.mutateAsync(args[0])');
    expect(page).toContain('updateTicketMutation.mutateAsync({ id: args[0], ...args[1] })');
    expect(page).toContain(".channel('support_tickets_page_changes')");
    expect(page).toContain("queryClient.invalidateQueries({ queryKey: ['support'] })");
    expect(page).toContain('supabase.removeChannel(channel)');
    expect(page).toContain('const supportError = queryError');
    expect(page).toContain('pagination.setTotalCount(count || 0)');
    expect(page).not.toContain('fetchRequestRef');
    expect(page).not.toContain('setTickets(');
    expect(page).not.toContain('setSupportStats(');
    expect(page).not.toContain('setSupportError(');
    expect(page).not.toContain('getSupportTicketsPage({');
    expect(queryHookSource()).toContain('getSupportTicketsPage({ ...filter, abortSignal: signal })');
    expect(queryHookSource()).toContain("queryKey: ['support', filter]");
    expect(queryHookSource()).toContain("queryClient.invalidateQueries({ queryKey: ['support'] }, options)");
    expect(mutationsHookSource()).toContain('applyOptimisticUpsert');
    expect(page).toContain('const location = useLocation();');
    expect(page).toContain('const navigate = useNavigate();');
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    // DS composition (mirrors DoctorsPage/UsersPage): Support now COMPOSES the shared
    // console workspace grammar instead of the bespoke SupportSignalPanel/SupportActivitySheet/
    // SupportDetailRail look-alikes. WorkspaceStage -> SignalPanel/KpiStrip -> one ActivitySheet
    // with exactly one SortableColumnHeader (TIME-only sort) -> DetailRailShell/RailInsetHero rail.
    // PaginationControls now lives INSIDE the ActivitySheet DS component, not the page.
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<SortableColumnHeader');
    expect(page).toContain('<DetailRailShell');
    expect(page).toContain('<RailInsetHero');
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('useRowSelection');
    expect(page).toContain("params.get('add') === 'true'");
    expect(page).toContain("params.get('new') === 'true'");
    expect(page).toContain("params.delete('from')");
    expect(page).toContain("navigate({");
    expect(page).toContain('}, { replace: true });');
    expect(page).toContain('const supportPanelContext = useMemo(() => ({');
    expect(page).toContain('supportTicketsRouteContextUpdated');
    expect(page).toContain('requestSupportTicketsRouteContext');
    expect(page).not.toContain('if (isAdmin) {');
    // Restored capabilities (single delete, bulk delete, provider self-assign):
    // the page imports the destructive/assign service calls, renders the confirm +
    // bulk-action surfaces, and tracks row selection. The status-transition
    // mutation stays service-inventory only and is still absent here.
    expect(page).toContain('<BulkActionBar');
    expect(page).toContain('<ConfirmationModal');
    expect(page).toContain('deleteSupportTicket');
    expect(page).toContain('assignTicket');
    expect(page).not.toContain('updateTicketStatus');
    expect(page).toContain('selectedIds');

    expect(service).toContain('export async function getSupportTicketsPage(filter = {})');
    expect(service).toContain('function applySupportTicketScope(query, user)');
    expect(service).toContain('async function getSupportTicketExactCount');
    expect(service).toContain('export async function getSupportTicketsPageStats');
    expect(service).toContain('throw error;');

    expect(routeOwnsStartupDomains('/support-tickets')).toBe(true);
    expect(getPageDataStartupDomainsForRole('provider', '/support-tickets')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/support-tickets')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/support-tickets')).toEqual([]);

    expect(contextPanel).toContain('const [supportTicketsRouteContext, setSupportTicketsRouteContext] = React.useState(null);');
    expect(contextPanel).toContain('supportTicketsRouteContextUpdated');
    expect(contextPanel).toContain('requestSupportTicketsRouteContext');
    expect(contextPanel).toContain('<SupportTicketsPanel supportContext={supportTicketsRouteContext} />');
    expect(contextPanel).not.toContain('<SupportTicketsPanel\n        supportTicketsData={supportTicketsData}');

    expect(routeOwnsShellAction('/support-tickets')).toBe(true);
    expect(bottomBar).toContain("pathname.startsWith('/support-tickets')");
    expect(bottomBar).toContain("label: 'New ticket'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openSupportTicketModal')");
  });

  it('blocks unsafe Support actions from the active UI while keeping service inventory explicit', () => {
    const page = pageSource();
    const modal = modalSource();
    const service = serviceSource();
    const createFields = service.slice(
      service.indexOf('const SUPPORT_TICKET_CREATE_FIELDS'),
      service.indexOf('const SUPPORT_TICKET_UPDATE_FIELDS')
    );
    const updateFields = service.slice(
      service.indexOf('const SUPPORT_TICKET_UPDATE_FIELDS'),
      service.indexOf('const SUPPORT_TICKET_SORT_FIELDS')
    );

    expect(service).toContain('export async function deleteSupportTicket(ticketId)');
    expect(service).toContain(".select('id')");
    expect(service).toContain('.maybeSingle()');
    expect(service).toContain('if (!data?.id)');
    expect(service).toContain('return deletedTicket;');
    expect(service).toContain('export async function updateTicketStatus(ticketId, status)');
    expect(service).toContain('export async function assignTicket(ticketId, assignedTo)');

    expect(createFields).toContain("'subject'");
    expect(createFields).toContain("'message'");
    expect(createFields).toContain("'category'");
    expect(createFields).toContain("'priority'");
    expect(createFields).not.toContain("'user_id'");
    expect(createFields).not.toContain("'organization_id'");
    expect(createFields).not.toContain("'status'");
    expect(createFields).not.toContain("'assigned_to'");

    expect(updateFields).toContain("'subject'");
    expect(updateFields).toContain("'message'");
    expect(updateFields).toContain("'category'");
    expect(updateFields).toContain("'priority'");
    expect(updateFields).not.toContain("'user_id'");
    expect(updateFields).not.toContain("'organization_id'");
    expect(updateFields).not.toContain("'status'");
    expect(updateFields).not.toContain("'assigned_to'");

    // Restored: single delete, bulk delete, and provider self-assign handlers are
    // wired on the active surface. The service-inventory guardrails below (create/
    // update field allowlists excluding status/assigned_to, modal shape) still hold.
    expect(page).toContain('handleDelete');
    expect(page).toContain('handleAssign');
    expect(page).toContain('handleBulkDelete');
    expect(modal).toContain('ModalShell');
    expect(modal).not.toContain('className="fixed inset-0');
    expect(modal).not.toContain('name="status"');
    expect(modal).not.toContain('assigned_to');
  });

  it('guards destructive and assignment commands while one layer owns save errors', () => {
    const page = pageSource();
    const modal = modalSource();
    const saveHandler = page.slice(
      page.indexOf('const handleSave = useCallback'),
      page.indexOf('const closeConfirmation = useCallback')
    );

    expect(page).toContain('const deletePendingRef = useRef(false);');
    expect(page).toContain('const assignPendingRef = useRef(false);');
    expect(page).toContain('if (deletePendingRef.current) return;');
    expect(page).toContain('if (assignPendingRef.current) return;');
    expect(page).toContain('isLoading={deletePending}');
    expect(page).toContain('disabled={assignPending}');
    expect(page).toContain('disabled={deletePending}');
    expect(saveHandler).not.toContain('handleApiError');
    expect(modal).toContain("handleApiError(error, isCreate ? 'create' : 'update')");
  });

  it('tombstones only receiver-confirmed deletes across every mobile page and Support cache', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const singleDelete = page.slice(
      page.indexOf('// Single delete:'),
      page.indexOf('// Bulk delete')
    );
    const bulkDelete = page.slice(
      page.indexOf('// Bulk delete'),
      page.indexOf('// Provider self-assign')
    );

    expect(page).toContain('const [confirmedDeletedTicketIds, setConfirmedDeletedTicketIds] = useState([]);');
    expect(page).toContain('recordConfirmedTicketDeletion');
    expect(page).toContain("{ queryKey: ['support'] }");
    expect(page).toContain('pruneSupportTicketIdsFromCache(cache, confirmedDeletedTicketIds)');
    expect(page).toContain('currentPage={pagination.currentPage}');
    expect(page).toContain('confirmedDeletedTicketIds={confirmedDeletedTicketIds}');
    expect(singleDelete.indexOf('recordConfirmedTicketDeletion')).toBeGreaterThan(singleDelete.indexOf('mutateAsync(ticket.id)'));
    expect(bulkDelete.indexOf('recordConfirmedTicketDeletion')).toBeGreaterThan(bulkDelete.indexOf('mutateAsync(id)'));

    expect(mobile).toContain('createMobileSupportAccumulator');
    expect(mobile).toContain('reconcileMobileSupportAccumulator');
    expect(mobile).toContain('lastSourceByPage: new Map()');
    expect(mobile).toContain('deletedIds: new Set()');
    expect(mobile).toContain('store.pages.set(normalizedPage');
    expect(mobile).toContain('store.deletedIds.has(id)');
    expect(mobile).toContain('confirmedDeletedTicketIds = EMPTY_TICKET_IDS');
  });

  it('labels Support analytics as a visible-page projection without fake high or timing values', () => {
    const page = pageSource();
    const analyticsModal = fs.readFileSync('src/components/modals/AnalyticsModal.jsx', 'utf8');

    expect(page).toContain('buildAnalytics(supportStats, ticketRows)');
    expect(page).toContain("averageResolutionScope: 'visible_page'");
    expect(page).toContain("distributionScope: 'visible_page'");
    expect(page).toContain('byPriority[priority] = (byPriority[priority] || 0) + 1;');
    expect(page).not.toContain('high: safeStats.urgent');
    expect(page).not.toContain('averageResolutionTime: 0');
    expect(analyticsModal).toContain("type === 'support'");
    expect(analyticsModal).toContain("'Avg on page'");
    expect(analyticsModal).toContain("'High on page'");
  });

  it('recomposes mobile Support to the canon LIST while preserving f31f29f affordances', () => {
    const mobile = mobileSource();
    const oldMobile = headSource('frontend/src/components/mobile/MobileSupportTickets.jsx');

    // Preservation baseline (f31f29f): the affordances that MUST survive the rebuild are
    // proven to have existed on the old mobile surface. The rebuild keeps every working
    // affordance and drops only the by-design regressions (fake live metrics, bulk select).
    expect(oldMobile).toContain('PullToRefresh');
    expect(oldMobile).toContain('useLoadMoreControl');
    expect(oldMobile).toContain('MobileKPIStrip');
    expect(oldMobile).toContain('onOpenFilters');
    expect(oldMobile).toContain('onViewAnalytics');
    expect(oldMobile).toContain('onAssign');
    expect(oldMobile).toContain('onDelete');
    expect(oldMobile).toContain('Trash2');
    // Baseline carried the by-design regressions this rebuild removes: fake live metrics
    // (billboard + glance rail + 'LIVE' deltas) and mobile bulk selection.
    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('MobileSecondaryMetricRail');
    expect(oldMobile).toContain('LIVE');
    expect(oldMobile).toContain('selectedIds');

    // Canon LIST composition (mirrors MobileUsers exactly): heading + KPI strip + canon
    // SearchRow + grouped panel + group-shaped skeleton + warm-up + Updating pill on the
    // REAL refetch signal (isFetching) + page-keyed load-more accumulator, all mount-motion-free.
    expect(mobile).toContain('MobileHeading');
    expect(mobile).toContain('SearchRow');
    expect(mobile).toContain('GroupPanel');
    expect(mobile).toContain('SkeletonGroupPanel');
    expect(mobile).toContain('useSkeletonWarmup');
    expect(mobile).toContain('UpdatingPill');
    expect(mobile).toContain('MobileListRow');
    expect(mobile).toContain('resolveAdaptiveGroups');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).toContain('isFetching');
    expect(mobile).toContain('accumulatorRef');

    // Preserved working affordances: search/filter/analytics triggers, pull-to-refresh,
    // load-more, and the KPI status axis.
    expect(mobile).toContain('PullToRefresh');
    expect(mobile).toContain('useLoadMoreControl');
    expect(mobile).toContain('MobileKPIStrip');
    expect(mobile).toContain('onOpenFilters');
    expect(mobile).toContain('onViewAnalytics');
    expect(mobile).toContain('Details');
    expect(mobile).toContain('Edit');
    // Tap opens the canonical detail bottom sheet (MobileDetailSheet) via the canon row's
    // onOpen, not an inline dropdown accordion -- mirrors the proven MobileUsers pattern.
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('onOpen={setActiveTicket}');
    expect(mobile).toContain('setActiveTicket(null)');
    // Working commands preserved: provider self-assign + gated single delete on the sheet.
    expect(mobile).toContain('onDelete');
    expect(mobile).toContain('onAssign');
    expect(mobile).toContain('Trash2');

    // By-design drops: no inline accordion, no fake live metrics, no dashboard furniture,
    // no mobile bulk selection, and off the floating MobileMetricRow cards.
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('isExpanded');
    expect(mobile).not.toContain('onExpand');
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).not.toContain('LIVE');
    expect(mobile).not.toContain('selectedIds');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('MobileMetricRow');
  });

  it('keeps the Support right panel route-owned and hardgate-clean', () => {
    const panel = panelSource();
    const contextPanel = contextPanelSource();

    expect(panel).toContain('export const SupportTicketsPanel = ({ supportContext }) =>');
    expect(panel).toContain('Support overview');
    expect(panel).toContain('Current route scope');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain('Current list');
    expect(panel).toContain('openSupportTicketModal');
    expect(panel).toContain('openFilters');
    expect(panel).toContain('openAnalyticsModal');
    expect(panel).toContain('Support statistics are unavailable for this role.');
    expect(panel).not.toContain("from('support_tickets')");
    expect(panel).not.toContain('supportTicketsData');
    expect(panel).not.toContain('Card');
    expect(panel).not.toContain('Badge');
    expect(panel).not.toContain('Using Mock Data');
    expect(panel).not.toContain('Quick Actions');
    expect(panel).not.toContain('Recent Tickets');
    expect(panel).not.toContain('Export');
    expect(panel).not.toContain('Preview');
    expect(panel).not.toContain('Search support');
    expect(contextPanel).not.toContain('supportTicketsData,');

    execFileSync('node', [
      'scripts/check-ui-surface-hardgate.js',
      'src/components/context/SupportTicketsPanel.jsx',
    ], { encoding: 'utf8' });
  });

  it('keeps Support inside the default active hardgate set', () => {
    const hardgate = hardgateSource();
    const gate = gateSource();

    expect(hardgate).toContain('src/components/pages/SupportTicketsPage.jsx');
    expect(hardgate).toContain('src/components/mobile/MobileSupportTickets.jsx');
    expect(hardgate).toContain('src/components/context/SupportTicketsPanel.jsx');
    expect(hardgate).toContain('src/components/modals/SupportTicketModal.jsx');
    expect(gate).toContain('Rendered Browser/IAB proof reused one local dev server on `http://localhost:3000`.');
    expect(gate).toContain('support-page10-desktop-1280x900-2026-07-03.png');
    expect(gate).toContain('support-page10-mobile-390x844-2026-07-03.png');
  });
});
