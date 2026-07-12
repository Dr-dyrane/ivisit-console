import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { execFileSync } from 'child_process';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Users Page 14 admitted-to-canon contract', () => {
  it('admits Users to canon (blocker map closed) while preserving the intake-audit trail', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    // The 2026-07-05 intake audit is RETAINED as historical evidence...
    expect(gate).toContain('### Page 14 Intake Audit - Users');
    expect(gate).toContain('Users at `/users` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('Promotion rule: the first Users visual pass must close this blocker map before adding Page 14 to the default hardgate.');
    // ...and the CLOSURE resolution supersedes it: Users is admitted to canon.
    expect(gate).toContain('RESOLUTION - Page 14 Users ADMITTED to canon (2026-07-10).');
    expect(gate).toContain('CLOSED this blocker map');
    expect(gate).toContain('Invite/create/delete remain INTENTIONALLY fail-closed');

    expect(app).toContain('<Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/users': {");
    expect(routes).toContain("minRole: 'org_admin'");
    expect(routes).toContain("resource: 'users'");
    expect(navigation).toContain("{ id: 'users', path: '/users', icon: Users, label: 'Users', resource: 'users', minRole: 'org_admin' }");

    // Page 14 Users page is admitted to the default hardgate via the codex signal-panel revamp;
    // its non-page intake surfaces stay out until they are revamped too.
    expect(hardgate).toContain('src/components/pages/UsersPage.jsx');
    [
      'src/components/mobile/MobileUsers.jsx',
      'src/components/context/UsersPanel.jsx',
      'src/components/views/UserListView.jsx',
      'src/components/views/UserTableView.jsx',
      'src/components/modals/InviteUserModal.jsx',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('preserves the old Users behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/UsersPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobileUsers.jsx');
    const oldUserModal = gitShowHead('frontend/src/components/modals/UserModal.jsx');
    const oldInviteModal = gitShowHead('frontend/src/components/modals/InviteUserModal.jsx');
    const oldListView = gitShowHead('frontend/src/components/views/UserListView.jsx');
    const oldTableView = gitShowHead('frontend/src/components/views/UserTableView.jsx');
    const oldService = gitShowHead('frontend/src/services/profilesService.js');

    const page = read('src/components/pages/UsersPage.jsx');
    const mobile = read('src/components/mobile/MobileUsers.jsx');
    const userModal = read('src/components/modals/UserModal.jsx');
    const inviteModal = read('src/components/modals/InviteUserModal.jsx');
    const listView = read('src/components/views/UserListView.jsx');
    const tableView = read('src/components/views/UserTableView.jsx');
    const service = read('src/services/profilesService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/UsersPage.jsx`');
    expect(gate).toContain("`useViewMode('users-page', 'table')`, `usePagination(20)`, route filters, local search/filter/sort");
    expect(gate).toContain('privileged `1000`-row load and local slicing');
    expect(gate).toContain('direct `delete_user_by_admin` RPC calls');
    expect(gate).toContain('mobile pull-to-refresh, infinite load, row reveal, mobile selection, mobile delete, generated mobile trend data, `LIVE` fallback');

    // BASELINE (f31f29f) evidence: the pre-revamp page carried the 3-view density shell +
    // the 1000-row client load. Retained as the record of what preceded admission.
    expect(oldPage).toContain("useViewMode('users-page', 'table')");
    expect(oldPage).toContain('const limit = isPrivileged ? 1000 : pagination.itemsPerPage;');
    expect(oldPage).toContain('let data = await getProfiles(filterOptions);');
    expect(oldPage).toContain('<UserListView');
    expect(oldPage).toContain('<UserTableView');

    // ADMITTED page: composes the console DS over the server-projection useProfilesQuery
    // (Phase A). The density shell + the 1000-row client-side load are GONE.
    expect(page).toContain("from '../console/WorkspaceStage'");
    expect(page).toContain("import { SignalPanel } from '../console/SignalPanel';");
    expect(page).toContain("import { KpiStrip } from '../console/KpiStrip';");
    expect(page).toContain("from '../console/ActivitySheet'");
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('useProfilesQuery(');
    expect(page).toContain('useRowSelection(userRows)');
    expect(page).toContain("useFocusedRecord('users', userRows)");
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('isFetching={isFetching}');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true });');
    expect((page.match(/<SortableColumnHeader/g) || []).length).toBe(1);
    expect(page).not.toContain("useViewMode('users-page', 'table')");
    expect(page).not.toContain('const limit = isPrivileged ? 1000');
    expect(page).not.toContain('let data = await getProfiles(filterOptions);');
    expect(page).not.toContain('<UserListView');
    expect(page).not.toContain('<UserTableView');
    expect(page).not.toContain('initial={{');
    // Still-present receivers + the write register (edit works; create/invite/delete gated).
    expect(page).toContain('await updateProfile(selectedUser.id, formData)');
    expect(page).toContain('await createProfile(formData)');
    expect(page).toContain('const handleBulkDelete = useCallback(() =>');
    expect(page).toContain("window.addEventListener('openUserModal', handleOpenModal)");
    expect(page).toContain("window.addEventListener('openInviteUserModal', handleOpenInviteModal)");
    expect(page).toContain("window.addEventListener('openUserAnalytics'");
    for (const el of ['<MobileUsers', '<UserModal', '<InviteUserModal', '<ConfirmationModal', '<AnalyticsModal', '<FilterSheet']) {
      expect(page).toContain(el);
    }
    expect(oldPage).toContain("supabase.rpc('delete_user_by_admin', { target_user_id: targetId })");
    expect(oldPage).toContain("toast.success('User deleted successfully')");
    expect(page).not.toContain("supabase.rpc('delete_user_by_admin'");
    expect(page).not.toContain("toast.success('User deleted successfully')");
    expect(page).toContain("const USER_DELETE_UNAVAILABLE_MESSAGE = 'Delete is unavailable until identity authority is verified.';");
    expect(page).toContain('const [usersCommandNotice, setUsersCommandNotice] = useState(null);');
    expect(page).toContain("const USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE = 'Invites are not ready until identity authority is verified.';");
    expect(page).toContain('const handleIdentityActionUnavailable = useCallback(() => {');
    expect(page).toContain('setUsersCommandNotice(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('const handleDeleteUnavailable = useCallback(() => {');
    expect(page).toContain('setUsersCommandNotice(USER_DELETE_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(USER_DELETE_UNAVAILABLE_MESSAGE);');
    // Lock that CREATE and INVITE (not just delete) route to the fail-closed handler -- a
    // regression wiring a real create/invite would otherwise green (2026-07-10 review).
    expect(page).toContain('const handleInvite = useCallback(() => handleIdentityActionUnavailable()');
    expect(page).toContain('const handleCreate = useCallback(() => handleIdentityActionUnavailable()');
    expect(page).toContain('const handleViewAnalytics = useCallback(() => setAnalyticsModalOpen(true)');
    expect(page).toContain('const confirmDelete = useCallback(() => handleDeleteUnavailable()');
    expect(page).toContain('const handleBulkDelete = useCallback(() => handleDeleteUnavailable()');
    expect(page).toContain('id="users-action-feedback"');
    expect(page).toContain('role="status"');
    expect(page).toContain('data-state="unavailable"');
    expect((page.match(/window\.addEventListener\('openUserModal'/g) || []).length).toBe(1);

    // oldMobile (f31f29f baseline) is the billboard; the CURRENT mobile is the canon LIST
    // rebuild (2026-07-10 — Users mobile admitted after Phase A proved the server-stats
    // projection, closing the mobile-metric blocker). Shared invariants on both; the
    // billboard primitives are baseline-only, the canon anatomy is current-only.
    for (const source of [oldMobile, mobile]) {
      expect(source).toContain('selectedIds = []');
      expect(source).toContain('onDelete(user)');
      expect(source).toContain('<PullToRefresh');
      expect(source).toContain('<MobileKPIStrip');
    }
    // Retired billboard/rail primitives (baseline-only).
    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('<MobileMetricRow');
    expect(oldMobile).toContain('const growthData = useMemo(() => [');
    expect(oldMobile).toContain("trend: formatSignedPercent(verificationRate - 50) || 'LIVE'");
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('<MobileMetricRow');
    expect(mobile).not.toContain('const growthData = useMemo(() => [');
    expect(mobile).not.toContain("'LIVE'");
    // Phase A gives MEASURED server stats — the loaded-row visible/source-pending hedge is gone.
    expect(mobile).not.toContain('hasMeasuredStatistics');
    expect(mobile).not.toContain('User Summary');
    expect(mobile).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    // Canon LIST anatomy: grouped panel + tap->sheet; blur-free Users surfaces (frosted={false}).
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<SkeletonGroupPanel');
    expect(mobile).toContain('frosted={false}');
    expect(mobile).not.toContain('backdrop-blur');
    // Tap opens the canonical detail bottom sheet; the delete gate stays fail-closed.
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('setActiveUser');
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).toContain('canDelete = false');
    expect(mobile).toContain('canDelete && isAdmin');
    expect(page).toContain('canDelete={false}');

    for (const source of [oldUserModal, userModal]) {
      expect(source).toContain('<ModalShell');
      expect(source).toContain("const data = await getHospitals({ limit: 100 });");
      expect(source).toContain('SelectItem value="org_admin"');
      expect(source).toContain('SelectItem value="admin"');
      expect(source).toContain('checked={formData.bvn_verified}');
      expect(source).toContain("toast.success(isCreate ? 'User created successfully' : 'User updated successfully')");
    }

    for (const source of [oldInviteModal, inviteModal]) {
      expect(source).toContain("const data = await getHospitals({ limit: 100 });");
      expect(source).toContain("supabase.functions.invoke('invite-user'");
      expect(source).toContain('body: { email, role, metadata }');
      expect(source).toContain('metadata.organization_id = organizationId');
      expect(source).toContain('toast.success(`Invitation sent to ${email}`)');
    }
    expect(oldInviteModal).toContain('role="dialog"');
    expect(inviteModal).toContain('<ModalShell');
    expect(inviteModal).toContain('size="md"');
    expect(inviteModal).toContain('title="Invite User"');
    expect(inviteModal).toContain('subtitle="Send a secure access link"');
    expect(inviteModal).toContain('rounded-button');
    expect(inviteModal).toContain('rounded-inner');
    expect(inviteModal).not.toMatch(/rounded-(?:3xl|2xl|xl|full|\[[^\]]+\])/);
    expect(inviteModal).not.toMatch(/\bborder(?:-0|-b|-white| )/);
    expect(inviteModal).not.toContain('focus:ring');
    expect(inviteModal).not.toContain('focus-visible:ring');
    expect(inviteModal).not.toContain('AnimatePresence');
    expect(inviteModal).not.toContain("from '../ui/card'");

    for (const source of [oldListView, listView]) {
      expect(source).toContain('export const UserListView');
      expect(source).toContain('opacity-0 group-hover:opacity-100');
      expect(source).toContain('{user.email ||');
      expect(source).toContain('{user.organization_name ||');
      expect(source).toContain('{user.provider_type ||');
    }

    for (const source of [oldTableView, tableView]) {
      expect(source).toContain('export const UserTableView');
      expect(source).toContain('<Checkbox');
      expect(source).toContain('selectedIds = []');
      expect(source).toContain('onDelete(user)');
      expect(source).toContain('Delete');
    }

    for (const source of [oldService, service]) {
      expect(source).toContain("supabase.rpc('get_all_auth_users'");
      expect(source).toContain('export async function getUserStatistics');
      expect(source).toContain('export async function getProfiles');
      expect(source).toContain('export async function createProfile');
      expect(source).toContain('export async function updateProfile');
      expect(source).toContain("supabase.rpc('update_profile_by_admin'");
      expect(source).toContain('export async function verifyProfileBVN');
      expect(source).toContain('export async function uploadProfileAvatar');
    }
  });

  it('blocks Users canon reuse until identity source, invite, destructive, PageData, and mobile metric slots close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const pass4 = read('docs/implementation/console-service-alignment/passes/PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md');
    const stage5 = read('docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md');
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const usersPageSource = read('src/components/pages/UsersPage.jsx');
    const usersPanel = read('src/components/context/UsersPanel.jsx');
    const userListView = read('src/components/views/UserListView.jsx');
    const userTableView = read('src/components/views/UserTableView.jsx');
    const inviteModal = read('src/components/modals/InviteUserModal.jsx');

    expect(gate).toContain('Users Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('Data ownership: not admitted. The route mixes profile service reads, Auth-enriched RPC reads, direct `profiles` count reads, local filtering/sorting/slicing, organization mapping, and route-published context summaries.');
    expect(gate).toContain('PageData startup and shell recent-profile fetches are quieted on `/users`');
    expect(gate).toContain('Invite and creation: blocked and fail-closed in active entry points.');
    expect(gate).toContain('Invite/create safety cleanup on 2026-07-06 makes header, `?add=true`, context-panel create/invite events, and the old generic `/users` context action fail closed through `Invites are not ready until identity authority is verified.`');
    expect(gate).toContain('First destructive-action safety cleanup on 2026-07-06 removed active single and bulk `delete_user_by_admin` RPC calls from `UsersPage.jsx`.');
    expect(gate).toContain('Delete attempts now show `Delete is unavailable until identity authority is verified.`');
    expect(gate).toContain('the grid delete button says `NOT READY`');
    expect(gate).toContain('Rendered intake proof on 2026-07-06 reused the existing `localhost:3000` server');
    expect(gate).toContain('the visible route action exposed one `Add user` button');
    expect(gate).toContain('clicking it set `#users-action-feedback` to `Invites are not ready until identity authority is verified.`');
    expect(gate).toContain('The URL path `/users?add=true&proof=users-intake-url-add-safety-2026-07-06` settled to the same feedback with zero dialogs after route effects completed.');
    expect(gate).toContain('UsersPanel squircle cleanup on 2026-07-06 converted the route-fed right-panel chrome to semantic radius tokens');
    expect(gate).toContain('`UsersPanel.jsx` now passes focused strict radius, but remains a shell context surface, not user-registry authority.');
    expect(gate).toContain('Users desktop renderer squircle cleanup on 2026-07-06 converted `UserListView.jsx` and `UserTableView.jsx` from inherited card/table border chrome');
    expect(gate).toContain('It preserved view/edit/schedule/delete callbacks, table sorting, selection, dropdown actions, and empty state');
    expect(gate).toContain('These files now pass focused strict radius, but remain preserved density renderers, not an admitted handled sheet.');
    expect(gate).toContain('Invite modal shell cleanup on 2026-07-06 converted dormant `InviteUserModal.jsx` to shared `ModalShell` chrome and semantic radius tokens');
    expect(gate).toContain('It now passes focused strict radius, but shared chrome does not prove invite command authority or re-enable any active invite/create entry point.');
    expect(gate).toContain('UsersPage shell squircle cleanup on 2026-07-06 converted the active page shell, KPI cards, empty state, bulk rail, grid cards, grid row metadata, and grid actions to canonical radius tokens');
    expect(gate).toContain('It removed shared `Card` wrappers, generic border/ring/hairline chrome, and legacy `geo-*` shape utilities from `UsersPage.jsx`');
    expect(gate).toContain('Focused strict radius/hardgate audit on 2026-07-06 now passes for `UsersPage.jsx`, `MobileUsers.jsx`, `UsersPanel.jsx`, `UserListView.jsx`, `UserTableView.jsx`, and `InviteUserModal.jsx`');
    expect(gate).toContain('This confirms Users source chrome can speak the new squircle system, but Users remains outside default hardgate admission until identity projection, invite receiver, destructive command, complete counts, and rendered desktop/tablet/mobile proof are closed.');
    expect(gate).toContain('Destructive commands: blocked and fail-closed in active UI.');
    expect(gate).toContain('PageData/shell ownership cleanup on 2026-07-06: `/users` is now route-owned in `pageDataAccess.js`');
    expect(gate).toContain('`ContextPanel.jsx` renders `UsersPanel` from the route context and passes `fetchRecentActivity={false}`');
    expect(gate).toContain('Generic desktop FAB cleanup on 2026-07-06 treats `/users` as route-owned in `ContextAwareFAB.jsx`, so the global `UserModal` path cannot bypass the intake gate.');
    expect(gate).toContain('| Data quieting | PageData startup and the right-panel recent-profile fetch are quieted on `/users`; generic FAB `UserModal` bypass is hidden; page-level reads, route context summary, direct BVN count, and dormant invite Edge code still coexist, while direct delete RPC and active invite/create modal entry are legacy inactive. | Partially proved.');
    expect(gate).toContain('active delete also fails closed instead of calling the admin delete RPC.');
    expect(gate).toContain('Active header, URL, context-panel, and old global context action triggers now show unavailable feedback instead of opening invite/create modals.');
    expect(gate).toContain('unavailable delete feedback');
    expect(gate).toContain('First mobile truth/action cleanup on 2026-07-06 removed generated mobile trend data, `LIVE` fallback, and the visible mobile delete button from active `MobileUsers.jsx`.');
    expect(gate).toContain('Mobile still needs a proved identity projection before visible-row counts can become global truth.');
    expect(gate).toContain('Mobile must keep loaded-row metrics labelled as visible/source-pending and keep destructive mobile actions hidden until projection/receiver proof exists.');
    expect(gate).toContain('`UsersPage.jsx`, `MobileUsers.jsx`, `UsersPanel.jsx`, `UserListView.jsx`, `UserTableView.jsx`, and `InviteUserModal.jsx` have focused strict-radius proof');
    expect(gate).toContain('Desktop table/list/grid exist; old density is preserved as inventory, and `UsersPage.jsx`, `UserListView.jsx`, and `UserTableView.jsx` now pass focused strict radius as local page/renderers.');
    expect(gate).toContain('dormant `InviteUserModal` now uses `ModalShell`, but invite still has direct Edge invocation and unproved delivery semantics.');
    expect(gate).toContain('shared `ModalShell` chrome does not imply command authority.');

    expect(pass4).toContain('InviteUserModal` labels its selector `Organization Assignment` but loads the options from `getHospitals({ limit: 100 })`');
    expect(pass4).toContain('MobileUsers.jsx:107-157,194-219` falls back from missing statistics to the supplied user rows for totals, verified and active counts, then labels derived verification trend values `LIVE`.');
    expect(pass4).toContain('Invite loads hospitals as organizations');
    expect(pass4).toContain('Invite sends facility id as organization id');
    expect(pass4).toContain('Invite success copy');
    expect(pass4).toContain('User management local filtering');
    expect(pass4).toContain('User stats fallback');
    expect(pass4).toContain('Mobile user metrics fallback');
    expect(stage5).toContain('Direct verified-profile KPI read and direct privileged `delete_user_by_admin` RPC for single/bulk deletion.');
    expect(stage5).toContain('Receiver slug/deployment and authorization are unproved; visible "invitation sent" is false from inspected source.');

    expect(routeOwnsStartupDomains('/users')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/users')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/users')).toEqual([]);
    expect(pageDataAccess).toContain("pathname === '/users'");
    expect(contextPanel).toContain("window.addEventListener('usersRouteContextUpdated', handleUsersRouteContext)");
    expect(contextPanel).toContain('<UsersPanel usersContext={usersRouteContext} />');
    expect(usersPanel).toContain('export const UsersPanel = ({ usersContext }) =>');
    expect(usersPanel).toContain('const context = usersContext || {};');
    expect(contextPanel).not.toContain('users={userData?.users || []}');
    expect(usersPanel).toContain("window.dispatchEvent(new CustomEvent('openInviteUserModal'))");
    expect(contextAction).toContain("label: 'Add user'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openUserModal'))");
    expect(routeOwnsShellAction('/users')).toBe(true);

    expect(usersPageSource).toContain('rounded-card');
    expect(usersPageSource).toContain('rounded-inner');
    expect(usersPageSource).toContain('rounded-button');
    expect(usersPageSource).toContain('rounded-pill');
    // Page 14 uses the canonical squircle vocabulary (matches the gold-standard EmergencyRequestsPage);
    // non-canonical radius and surface borders are banned.
    expect(usersPageSource).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(usersPageSource).not.toMatch(/\bborder(?:-0|-b|-white| )/);
    expect(usersPageSource).not.toContain('ring-2');
    expect(usersPageSource).not.toContain('h-[1px]');
    expect(usersPageSource).not.toMatch(/\bgeo-/);
    // Fail-closed identity boundary is preserved after admission (a decision, not a blocker).
    expect(usersPageSource).toContain('data-state="unavailable"');

    expect(usersPanel).toContain('rounded-card');
    expect(usersPanel).toContain('rounded-inner');
    expect(usersPanel).toContain('rounded-icon');
    expect(usersPanel).toContain('rounded-button');
    expect(usersPanel).toContain('rounded-pill');
    expect(usersPanel).not.toMatch(/rounded-(?:3xl|2xl|xl|full|\[[^\]]+\])/);
    expect(usersPanel).not.toContain('border-0');

    for (const renderer of [userListView, userTableView]) {
      expect(renderer).toContain('rounded-card');
      expect(renderer).toContain('rounded-pill');
      expect(renderer).toContain('rounded-icon');
      expect(renderer).not.toMatch(/rounded-(?:3xl|2xl|xl|full|\[[^\]]+\])/);
      expect(renderer).not.toMatch(/\bborder(?:-0|-b|-white| )/);
      expect(renderer).not.toContain('purple');
      expect(renderer).not.toContain('\u00e2');
      expect(renderer).not.toContain("from '../ui/card'");
    }
    expect(userListView).toContain("onClick={() => onView(user)}");
    expect(userListView).toContain("onClick={() => onEdit(user)}");
    expect(userListView).toContain("onClick={() => onSchedule(user)}");
    expect(userListView).toContain("onClick={() => onDelete(user)}");
    expect(userListView).toContain("{user.email || 'No email'} / {user.organization_name || 'N/A'} / {user.provider_type || 'N/A'}");
    expect(userTableView).toContain('rounded-inner');
    expect(userTableView).toContain('checked={isAllSelected || (isIndeterminate && "indeterminate")}');
    expect(userTableView).toContain('onClick={() => onSort && onSort(columnKey)}');
    expect(userTableView).toContain('onCheckedChange={(checked) => handleSelectOne(user.id, checked)}');
    expect(userTableView).toContain('onClick={() => onDelete(user)}');
    expect(userTableView).toContain('No users found.');

    expect(inviteModal).toContain('<ModalShell');
    expect(inviteModal).toContain("supabase.functions.invoke('invite-user'");
    expect(inviteModal).toContain('body: { email, role, metadata }');
    expect(inviteModal).toContain('metadata.organization_id = organizationId');
    expect(inviteModal).toContain("const data = await getHospitals({ limit: 100 });");
    expect(inviteModal).toContain('rounded-button');
    expect(inviteModal).toContain('rounded-inner');
    expect(inviteModal).not.toMatch(/rounded-(?:3xl|2xl|xl|full|\[[^\]]+\])/);
    expect(inviteModal).not.toMatch(/\bborder(?:-0|-b|-white| )/);
    expect(inviteModal).not.toContain('focus:ring');
    expect(inviteModal).not.toContain('focus-visible:ring');
  });

  it('keeps Users surfaces canon chrome-clean (no glass/glow/blur/decorative shadow; canonical radius)', () => {
    const files = {
      page: read('src/components/pages/UsersPage.jsx'),
      mobile: read('src/components/mobile/MobileUsers.jsx'),
      panel: read('src/components/context/UsersPanel.jsx'),
      list: read('src/components/views/UserListView.jsx'),
      table: read('src/components/views/UserTableView.jsx'),
      modal: read('src/components/modals/UserModal.jsx'),
      invite: read('src/components/modals/InviteUserModal.jsx'),
    };
    const banned = ['glass-card', 'hover-glow', 'hover-lift', 'blur-xl', 'shadow-2xl', 'shadow-premium', 'border-0'];
    // rounded-2xl/xl and backdrop-blur stay banned on the not-yet-admitted intake surfaces; the
    // admitted page uses codex's signal-panel vocabulary (rounded-full/[Npx]/2xl) which the default hardgate allows.
    const bannedIntakeRadius = ['rounded-2xl', 'rounded-xl', 'backdrop-blur'];
    for (const [name, src] of Object.entries(files)) {
      for (const tok of banned) {
        expect({ name, tok, found: src.includes(tok) }).toEqual({ name, tok, found: false });
      }
      if (name !== 'page') {
        for (const tok of bannedIntakeRadius) {
          expect({ name, tok, found: src.includes(tok) }).toEqual({ name, tok, found: false });
        }
      }
    }
  });
});
