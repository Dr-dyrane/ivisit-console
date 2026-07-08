import fs from 'fs';
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
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
  const pageDataSource = () => fs.readFileSync('src/config/pageDataAccess.js', 'utf8');
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
    const pageData = pageDataSource();
    const contextPanel = contextPanelSource();
    const fab = fabSource();
    const bottomBar = bottomBarSource();
    const gate = gateSource();

    expect(gate).toContain('### Page 10 Admission - Support');
    expect(gate).toContain('Support at `/support-tickets` is admitted under the Today/Requests canon for this page only.');
    expect(gate).toContain('`supportTicketsService.js` now exposes `getSupportTicketsPage()` as the route projection owner');
    expect(gate).toContain('Single delete, bulk delete, assignment, and status mutation remain service inventory only.');
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
    expect(queryHookSource()).toContain('getSupportTicketsPage(filter)');
    expect(queryHookSource()).toContain("queryKey: ['support', filter]");
    expect(mutationsHookSource()).toContain('applyOptimisticUpsert');
    expect(page).toContain('const location = useLocation();');
    expect(page).toContain('const navigate = useNavigate();');
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain('<SupportSignalPanel');
    expect(page).toContain('<SupportActivitySheet');
    expect(page).toContain('<SupportDetailRail');
    expect(page).toContain('<PaginationControls');
    expect(page).toContain("params.get('add') === 'true'");
    expect(page).toContain("params.get('new') === 'true'");
    expect(page).toContain("params.delete('from')");
    expect(page).toContain("navigate({");
    expect(page).toContain('}, { replace: true });');
    expect(page).toContain('const supportPanelContext = useMemo(() => ({');
    expect(page).toContain('supportTicketsRouteContextUpdated');
    expect(page).toContain('requestSupportTicketsRouteContext');
    expect(page).not.toContain('if (isAdmin) {');
    expect(page).not.toContain('<BulkActionBar');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).not.toContain('deleteSupportTicket');
    expect(page).not.toContain('assignTicket');
    expect(page).not.toContain('updateTicketStatus');
    expect(page).not.toContain('selectedIds');

    expect(service).toContain('export async function getSupportTicketsPage(filter = {})');
    expect(service).toContain('function applySupportTicketScope(query, user)');
    expect(service).toContain('async function getSupportTicketExactCount');
    expect(service).toContain('export async function getSupportTicketsPageStats');
    expect(service).toContain('throw error;');

    expect(pageData).toContain("pathname === '/support-tickets'");
    expect(routeOwnsStartupDomains('/support-tickets')).toBe(true);
    expect(getPageDataStartupDomainsForRole('provider', '/support-tickets')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('org_admin', '/support-tickets')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/support-tickets')).toEqual([]);

    expect(contextPanel).toContain('const [supportTicketsRouteContext, setSupportTicketsRouteContext] = React.useState(null);');
    expect(contextPanel).toContain('supportTicketsRouteContextUpdated');
    expect(contextPanel).toContain('requestSupportTicketsRouteContext');
    expect(contextPanel).toContain('<SupportTicketsPanel supportContext={supportTicketsRouteContext} />');
    expect(contextPanel).not.toContain('<SupportTicketsPanel\n        supportTicketsData={supportTicketsData}');

    expect(fab).toContain("location.pathname.startsWith('/support-tickets')");
    expect(bottomBar).toContain("pathname.startsWith('/support-tickets')");
    expect(bottomBar).toContain("label: 'New ticket'");
    expect(bottomBar).toContain("window.dispatchEvent(new CustomEvent('openSupportTicketModal'))");
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

    expect(page).not.toContain('handleDelete');
    expect(page).not.toContain('handleAssign');
    expect(page).not.toContain('handleBulkDelete');
    expect(modal).toContain('ModalShell');
    expect(modal).not.toContain('className="fixed inset-0');
    expect(modal).not.toContain('name="status"');
    expect(modal).not.toContain('assigned_to');
  });

  it('keeps mobile Support recomposed without fake live metrics or destructive controls', () => {
    const mobile = mobileSource();

    expect(mobile).toContain('PullToRefresh');
    expect(mobile).toContain('useLoadMoreControl');
    expect(mobile).toContain('MobileKPIStrip');
    expect(mobile).toContain('MobileMetricRow');
    expect(mobile).toContain('onOpenFilters');
    expect(mobile).toContain('onViewAnalytics');
    expect(mobile).toContain('Details');
    expect(mobile).toContain('Edit');
    // Tap opens the canonical detail bottom sheet (MobileDetailSheet), not an inline
    // dropdown accordion — mirrors the proven MobileVisits pattern.
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('onClick={() => setActiveTicket');
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('isExpanded');
    expect(mobile).not.toContain('onExpand');
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).not.toContain('LIVE');
    expect(mobile).not.toContain('selectedIds');
    expect(mobile).not.toContain('onDelete');
    expect(mobile).not.toContain('onAssign');
    expect(mobile).not.toContain('Trash2');
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
