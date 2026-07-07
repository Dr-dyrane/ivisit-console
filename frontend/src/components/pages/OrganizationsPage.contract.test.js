import fs from 'fs';
import { execFileSync } from 'child_process';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `HEAD:${path}`], { encoding: 'utf8' });

describe('Organizations Page 15 intake contract', () => {
  it('keeps Organizations in intake only and out of the default visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 15 Intake Audit - Organizations');
    expect(gate).toContain('Organizations at `/organizations` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, organization create/edit/delete enablement, wallet/billing metric promotion, route-owned action promotion, or hardgate promotion is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Organizations visual pass must close this blocker map before adding Page 15 to the default hardgate.');

    expect(app).toContain('<Route path="/organizations" element={<ProtectedRoute minRole="admin"><OrganizationsPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/organizations': {");
    expect(routes).toContain("minRole: 'admin'");
    expect(routes).toContain("resource: 'organizations'");
    expect(navigation).toContain("{ id: 'organizations', path: '/organizations', icon: Building2, label: 'Organizations', resource: 'organizations', minRole: 'admin' }");

    [
      'src/components/pages/OrganizationsPage.jsx',
      'src/components/mobile/MobileOrganizations.jsx',
      'src/components/context/OrganizationsPanel.jsx',
      'src/components/views/OrganizationListView.jsx',
      'src/components/views/OrganizationTableView.jsx',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('preserves the old Organizations behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/OrganizationsPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobileOrganizations.jsx');
    const oldListView = gitShowHead('frontend/src/components/views/OrganizationListView.jsx');
    const oldTableView = gitShowHead('frontend/src/components/views/OrganizationTableView.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/OrganizationsPanel.jsx');
    const oldService = gitShowHead('frontend/src/services/organizationsService.js');

    const page = read('src/components/pages/OrganizationsPage.jsx');
    const mobile = read('src/components/mobile/MobileOrganizations.jsx');
    const listView = read('src/components/views/OrganizationListView.jsx');
    const tableView = read('src/components/views/OrganizationTableView.jsx');
    const panel = read('src/components/context/OrganizationsPanel.jsx');
    const service = read('src/services/organizationsService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/OrganizationsPage.jsx`');
    expect(gate).toContain("`usePageHeader(\"Organization Registry\")`, footer pagination, `useViewMode('organizations', 'table')`, `usePagination(12)`, `getOrganizations()`");
    expect(gate).toContain('`saveOrganization()`, `deleteOrganization()`, fee-change confirmation, private `Dialog` organization modal');
    expect(gate).toContain('desktop KPI cards for `Active Nodes`, `Network Float`, `Regions`/`Global`, and `Avg_Fee`');
    expect(gate).toContain('mobile pull-to-refresh, infinite load, KPI strip, `Network Dynamics`, `LIVE` labels, wallet float');
    expect(gate).toContain('list/table edit/delete controls, and right-panel `Onboard`/Growth/Pulse affordances.');

    for (const source of [oldPage, page]) {
      expect(source).toContain("useViewMode('organizations', 'table')");
      expect(source).toContain('usePagination(12)');
      expect(source).toContain('const data = await getOrganizations();');
      expect(source).toContain("window.addEventListener('openOrganizationModal', handleOpenAdd)");
      expect(source).toContain('usePageHeader("Organization Registry"');
      expect(source).toContain('Board New Org');
      expect(source).toContain('Network Float');
      expect(source).toContain('Avg_Fee');
      expect(source).toContain('Entity Provisioning');
      expect(source).toContain('<MobileOrganizations');
      expect(source).toContain('<OrganizationTableView');
      expect(source).toContain('<OrganizationListView');
      expect(source).toContain('<ConfirmationModal');
      expect(source).toContain('<AnalyticsModal');
      expect(source).toContain('<BulkActionBar');
    }
    expect(oldPage).toContain('await saveOrganization(selectedOrg);');
    expect(oldPage).toContain('await deleteOrganization(org.id);');
    expect(oldPage).toContain('await Promise.all(selectedIds.map((id) => deleteOrganization(id)));');
    expect(page).not.toContain('saveOrganization');
    expect(page).not.toContain('deleteOrganization');
    expect(page).toContain("const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE = 'Organization changes are not ready until organization authority is verified.';");
    expect(page).toContain('const [organizationCommandNotice, setOrganizationCommandNotice] = useState(null);');
    expect(page).toContain('const handleOrganizationCommandUnavailable = useCallback(() => {');
    expect(page).toContain('setOrganizationCommandNotice(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('id="organizations-action-feedback"');
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-label="Add organization unavailable"');
    expect(page).toContain('aria-label="Delete organizations unavailable"');
    expect(page).toContain('data-state="unavailable"');

    for (const source of [oldMobile, mobile]) {
      expect(source).toContain('MobileFeaturedMetric');
      expect(source).toContain('MobileSecondaryMetricRail');
      expect(source).toContain("delta: 'LIVE'");
      expect(source).toContain("label: 'Float'");
      expect(source).toContain('label="Network Dynamics"');
      expect(source).toContain('Wallet Float');
      expect(source).toContain('Active Node');
      expect(source).toContain('onClick={() => onDelete(org)}');
      expect(source).toContain('<PullToRefresh');
      expect(source).toContain('<MobileKPIStrip');
      expect(source).toContain('<MobileMetricRow');
      expect(source).toContain('<MobileListLoadMore');
    }

    for (const source of [oldListView, listView]) {
      expect(source).toContain('export const OrganizationListView');
      expect(source).toContain('Liquid Wallet');
      expect(source).toContain('STRIPE_LIVE');
      expect(source).toContain('WAITING_INTEGRATION');
      expect(source).toContain('onClick={() => onEdit(org)}');
      expect(source).toContain('onClick={() => onDelete(org)}');
    }

    for (const source of [oldTableView, tableView]) {
      expect(source).toContain('export const OrganizationTableView');
      expect(source).toContain('selectedIds = []');
      expect(source).toContain('onCheckedChange={(checked) => onSelectAll(checked)}');
      expect(source).toContain('Wallet Balance');
      expect(source).toContain('Stripe Integrated');
      expect(source).toContain('Public Profile');
      expect(source).toContain('Core Config');
      expect(source).toContain('Termination');
    }

    for (const source of [oldPanel, panel]) {
      expect(source).toContain("new CustomEvent('openOrganizationModal')");
      expect(source).toContain('Network Hub');
      expect(source).toContain('Reserve');
      expect(source).toContain('Growth');
      expect(source).toContain('Pulse');
      expect(source).toContain('Network expansion is active. Monitor node synchronization in settings.');
    }

    for (const source of [oldService, service]) {
      expect(source).toContain("supabase.from(TABLE_NAME).select('*').order('name', { ascending: true })");
      expect(source).toContain("supabase.from('organization_wallets').select('*')");
      expect(source).toContain('wallet_balance: walletsMap[org.id] || 0');
      expect(source).toContain('export async function saveOrganization');
      expect(source).toContain("supabase.from(TABLE_NAME).update(payload).eq('id', org.id)");
      expect(source).toContain('supabase.from(TABLE_NAME).insert([payload])');
      expect(source).toContain('export async function deleteOrganization');
      expect(source).toContain('.delete()');
    }
  });

  it('blocks Organizations canon reuse until org identity, wallet scope, commands, PageData, and mobile metric slots close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const pass4 = read('docs/implementation/console-service-alignment/passes/PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md');
    const stage5 = read('docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md');
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = read('src/components/navigation/DynamicBottomBar.jsx');
    const page = read('src/components/pages/OrganizationsPage.jsx');
    const mobile = read('src/components/mobile/MobileOrganizations.jsx');
    const panel = read('src/components/context/OrganizationsPanel.jsx');
    const listView = read('src/components/views/OrganizationListView.jsx');
    const tableView = read('src/components/views/OrganizationTableView.jsx');

    expect(gate).toContain('Organizations Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('Data ownership: not admitted. The route and mobile surface still consume the broad organization-plus-wallet collection, while PageData startup and the right context panel are quieted on `/organizations`.');
    expect(gate).toContain('Organization/facility boundary: blocked.');
    expect(gate).toContain('Wallet and billing scope: blocked.');
    expect(gate).toContain('First command safety cleanup on 2026-07-06 removed active page imports of `saveOrganization()` and `deleteOrganization()`');
    expect(gate).toContain('header create, empty-state create, mobile create, table/list edit, table/list delete, context-panel `Onboard`, old global `Add organization`, modal submit, and bulk delete now fail closed through `Organization changes are not ready until organization authority is verified.`');
    expect(gate).toContain('The private `Dialog` organization modal remains legacy inactive chrome until a command receiver is proved.');
    expect(gate).toContain('Organizations right-panel, mobile, and desktop renderer squircle cleanup on 2026-07-06 converted `OrganizationsPanel.jsx`, `MobileOrganizations.jsx`, `OrganizationListView.jsx`, and `OrganizationTableView.jsx`');
    expect(gate).toContain('These files now pass focused strict radius, but they remain route-local renderers/panel/mobile chrome, not admitted organization registry authority.');
    expect(gate).toContain('Organizations page shell and private dialog squircle cleanup on 2026-07-06 converted `OrganizationsPage.jsx`');
    expect(gate).toContain('This gives `OrganizationsPage.jsx` focused strict-radius proof, but it does not admit the route or make the private dialog canonical.');
    expect(gate).toContain('the generic desktop/mobile FAB path cannot compete with the page intake gate.');
    expect(gate).toContain('Admin command authority: blocked and fail-closed in active UI.');
    expect(gate).toContain('Active Organizations now converts create/edit/delete/save/bulk attempts to unavailable feedback.');
    expect(gate).toContain('PageData and context panel: partially quieted, not admitted. `/organizations` is route-owned in `pageDataAccess.js`');
    expect(gate).toContain('| Route-owned action | Header `Board New Org`, empty-state `Onboard New Partner`, context-panel `Onboard`, old global `Add organization`, and mobile create now fail closed with unavailable feedback; the generic FAB is hidden on `/organizations`. | Blocked.');
    expect(gate).toContain('| Data quieting | Route-level reads, organization wallet joins, legacy inactive modal chrome, and global event actions coexist. PageData startup organization reads/realtime are quieted on `/organizations`');
    expect(gate).toContain('active direct organization writes/deletes fail closed, generic FAB bypass is hidden');
    expect(gate).toContain('`OrganizationsPage.jsx`, `MobileOrganizations.jsx`, `OrganizationsPanel.jsx`, `OrganizationListView.jsx`, and `OrganizationTableView.jsx` have focused strict-radius proof');
    expect(gate).toContain('`OrganizationsPage.jsx`, `OrganizationListView.jsx`, and `OrganizationTableView.jsx` now pass focused strict radius as local page/renderers');
    expect(gate).toContain('unavailable create/edit/delete/save feedback');
    expect(gate).toContain('Future work must assign the final read/action owners before `/organizations` can be visually admitted.');
    expect(gate).toContain('Mobile recomposition: not admitted. `MobileOrganizations` now passes focused strict radius');
    expect(gate).toContain('Mobile must remove loaded-row global metrics, `LIVE` fallback, wallet/finance claims, and unsafe commands until projection/receiver proof exists.');

    expect(stage5).toContain('Calls `getOrganizations()`, which loads all organizations and all organization wallets');
    expect(stage5).toContain('Unbounded registry plus financial join cannot serve global shell totals');
    expect(stage5).toContain('`handle_new_organization()` on `organizations` insert');
    expect(stage5).toContain('Creates an `organization_wallets` row for canonical organization identity.');
    expect(stage5).toContain('Current onboarding inserts a `hospitals` row and stores that hospital id in `profiles.organization_id`');
    expect(stage5).toContain('`organizationsService.js` is active in `PageDataContext`, `OrganizationsPage`, and `UsersPage`');

    expect(pass4).toContain('OrganizationsPage` exposes direct organization create/edit/delete over service CRUD');
    expect(pass4).toContain('OrganizationsPage` guards visible management in its grid/empty-state composition with `isAdmin()`');
    expect(pass4).toContain('MobileOrganizations` is a mounted route variant that receives the same unbounded/local-paged collection');
    expect(pass4).toContain('`organizations` owns legal/operating organization identity and organization wallet scope.');
    expect(pass4).toContain('`hospitals` owns facility identity and facility verification/dispatch eligibility under an organization.');
    expect(pass4).toContain('`profiles.organization_id` references an organization UUID, never a hospital UUID.');
    expect(pass4).toContain('| `/organizations` desktop registry | Page loads all organizations/wallets, slices locally, shows hard-coded network health and direct CRUD.');
    expect(pass4).toContain('| `/organizations` mobile registry | `MobileOrganizations` renders wallet float, revenue share, active ratios and trend claims from local collection.');
    expect(pass4).toContain('Do not pass edit/delete callbacks unless actor, organization scope and receiver are proved.');
    expect(pass4).toContain('Do not compute network health, wallet float or revenue share from unbounded local collections or hard-coded constants.');

    expect(routeOwnsStartupDomains('/organizations')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/organizations')).toEqual([]);
    expect(pageDataAccess).toContain("pathname === '/organizations'");
    expect(page).toContain('organizationsRouteContextUpdated');
    expect(page).toContain('requestOrganizationsRouteContext');
    expect(page).toContain('rounded-card');
    expect(page).toContain('rounded-inner');
    expect(page).toContain('rounded-icon');
    expect(page).toContain('rounded-button');
    expect(page).toContain('rounded-pill');
    expect(page).toContain('rounded-modal');
    expect(page).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(page).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(page).not.toContain('border-0');
    expect(page).not.toContain('border-l-');
    expect(page).not.toContain('border-t-');
    expect(page).not.toContain('border-dashed');
    expect(page).not.toContain('focus:ring');
    expect(page).not.toContain('outline-none');
    expect(page).not.toMatch(/\bgeo-/);
    expect(page).not.toContain("from '../ui/card'");
    expect(page).toContain('data-state="unavailable"');
    expect(contextPanel).toContain('organizationsRouteContextUpdated');
    expect(contextPanel).toContain('requestOrganizationsRouteContext');
    expect(contextPanel).toContain('organizations={organizationsRouteContext?.organizations || []}');
    expect(contextPanel).toContain('summary={organizationsRouteContext?.summary}');
    expect(contextPanel).not.toContain('organizationsData,');
    expect(panel).toContain('summary = null');
    expect(panel).toContain('aria-label="Growth unavailable"');
    expect(panel).toContain('aria-label="Pulse unavailable"');
    expect(panel).toContain('rounded-card');
    expect(panel).toContain('rounded-inner');
    expect(panel).toContain('rounded-icon');
    expect(panel).toContain('rounded-button');
    expect(panel).toContain('rounded-pill');
    expect(panel).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(panel).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(panel).not.toMatch(/\bborder(?:-0|-b|-white| )/);
    expect(panel).not.toMatch(/\bgeo-/);
    expect(panel).not.toContain("from '../ui/card'");

    expect(mobile).toContain('rounded-inner');
    expect(mobile).toContain('rounded-button');
    expect(mobile).toContain('rounded-pill');
    expect(mobile).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(mobile).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(mobile).not.toMatch(/\bborder(?:-0|-b|-white| )/);
    expect(mobile).not.toContain('focus:ring');
    expect(mobile).not.toContain('outline-none');
    expect(mobile).not.toMatch(/\bgeo-/);
    expect(mobile).toContain("trendText: 'LIVE'");
    expect(mobile).toContain("label=\"Network Dynamics\"");
    expect(mobile).toContain("onClick={() => onDelete(org)}");
    expect(mobile).toContain('canManage');

    for (const renderer of [listView, tableView]) {
      expect(renderer).toContain('rounded-card');
      expect(renderer).toContain('rounded-pill');
      expect(renderer).toContain('rounded-icon');
      expect(renderer).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
      expect(renderer).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
      expect(renderer).not.toMatch(/\bborder(?:-0|-b|-white| )/);
      expect(renderer).not.toMatch(/\bgeo-/);
      expect(renderer).not.toContain("from '../ui/card'");
    }
    expect(listView).toContain('rounded-inner');
    expect(listView).toContain('onClick={() => onEdit(org)}');
    expect(listView).toContain('onClick={() => onDelete(org)}');
    expect(tableView).toContain('checked={selectedIds.length === organizations.length && organizations.length > 0}');
    expect(tableView).toContain('onClick={() => onView(org)}');
    expect(tableView).toContain('onClick={() => onEdit(org)}');
    expect(tableView).toContain('onClick={() => onDelete(org)}');
    expect(contextAction).toContain("label: 'Add organization'");
    expect(contextAction).toContain("new CustomEvent('openOrganizationModal')");
    expect(contextFab).toContain("location.pathname.startsWith('/organizations')");
    expect(bottomBar).toContain("location.pathname.startsWith('/organizations')");
  });
});
