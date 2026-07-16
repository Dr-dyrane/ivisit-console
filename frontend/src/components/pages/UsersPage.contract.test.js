import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
const profilesServiceSource = () => [
  read('src/services/profilesService.js'),
  read('src/services/profiles/normalization.js'),
  read('src/services/profiles/profileMutations.js'),
  read('src/services/profiles/usersPageRead.js'),
].join('\n');

describe('Users Page 14 identity contract', () => {
  const pageSource = () => [
    read('src/components/pages/UsersPage.jsx'),
    read('src/components/pages/users/usersPageModel.js'),
    read('src/components/pages/users/UsersDesktopWorkspace.jsx'),
    read('src/components/pages/users/UsersDetailRail.jsx'),
    read('src/components/pages/users/UsersPageOverlays.jsx'),
  ].join('\n');

  it('keeps PAGE-08 identity orchestration modular', () => {
    const entry = read('src/components/pages/UsersPage.jsx');
    const model = read('src/components/pages/users/usersPageModel.js');
    const workspace = read('src/components/pages/users/UsersDesktopWorkspace.jsx');
    const detailRail = read('src/components/pages/users/UsersDetailRail.jsx');

    expect(entry.split(/\r?\n/).length).toBeLessThanOrEqual(450);
    expect(workspace.split(/\r?\n/).length).toBeLessThanOrEqual(400);
    expect(entry).toContain("import { UsersDesktopWorkspace } from './users/UsersDesktopWorkspace';");
    expect(entry).toContain("import { UsersBulkActionBar, UsersPageDialogs } from './users/UsersPageOverlays';");
    expect(workspace).toContain("import { UsersDetailRail } from './UsersDetailRail';");
    expect(model).not.toContain("from 'react'");
    expect(model).not.toContain('useProfilesQuery');
    expect(detailRail).not.toContain('useProfilesQuery');
  });

  it('keeps the admitted registry role-gated and hardgate-covered', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = [
      read('src/app/AppRoutes.jsx'),
      read('src/app/appRouteMetadata.js'),
    ].join('\n');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('RESOLUTION - Page 14 Users ADMITTED to canon (2026-07-10).');
    expect(gate).toContain('Users invitation receiver admission on 2026-07-12');
    expect(app).toContain("users: lazyNamedPage(() => import('../components/pages/UsersPage'), 'UsersPage')");
    expect(app).toContain("{ id: 'users', path: '/users', minRole: 'org_admin' }");
    expect(routes).toContain("'/users': {");
    expect(routes).toContain("minRole: 'org_admin'");
    expect(navigation).toContain("{ id: 'users', path: '/users', icon: Users, label: 'Users', resource: 'users', minRole: 'org_admin' }");
    for (const file of [
      'src/components/pages/UsersPage.jsx',
      'src/components/modals/InviteUserModal.jsx',
      'src/components/modals/UserModal.jsx',
    ]) {
      expect(hardgate).toContain(file);
    }
  });

  it('keeps the server-projected workspace, context panel, and selection grammar', () => {
    const page = pageSource();
    const mobile = read('src/components/mobile/MobileUsers.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');

    for (const token of ['<WorkspaceStage', '<SignalPanel', '<KpiStrip', '<ActivitySheet']) {
      expect(page).toContain(token);
    }
    expect(page).toContain('useProfilesQuery(');
    expect(page).toContain('useRowSelection(userRows)');
    expect(page).toContain("useFocusedRecord('users', userRows)");
    expect(page).toContain("const PINNED_USERS_KPI_IDS = ['provider', 'org_admin'];");
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('<SortableColumnHeader');
    expect(page).toContain('aria-label={allSelected ? \'Clear selection\' : \'Select all users\'}');
    expect(page).toContain('<BulkActionBar selectedCount={selectedIds.length}');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('usersRouteContextUpdated'");
    expect(contextPanel).toContain('<UsersPanel usersContext={usersRouteContext} />');

    expect(mobile).toContain('<PullToRefresh');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('const selectionActive = selectionEnabled && canManage && Boolean(onSelect);');
    expect(mobile).toContain('onLongPress={(it) => onSelect?.(it.id, true)}');
    expect(mobile).toContain('<MobileSelectionBar');
  });

  it('routes every create-labelled entry point to the proved invitation command', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = pageSource();
    const contextAction = read('src/hooks/useContextAction.js');
    const bottomBar = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');

    expect(gate).toContain('Invitation command: admitted for platform and organization administrators within receiver scope.');
    expect(page).toContain("setModalMode('invite');");
    expect(page).toContain('const handleCreate = handleInvite;');
    expect(page).toContain("if (params.get('add') === 'true') handleCreate();");
    expect(page).toContain("window.addEventListener('openUserModal', handleOpenModal)");
    expect(page).toContain("window.addEventListener('openInviteUserModal', handleOpenInviteModal)");
    expect(page).toContain('aria-label="Invite user"');
    expect(page).toContain('<InviteUserModal isOpen={modalMode === \'invite\'}');
    expect(page).not.toContain('createProfile(');
    expect(page).not.toContain("supabase.rpc('delete_user_by_admin'");
    expect(page).not.toContain('console.error(');
    expect(page).toContain('data-state="unavailable"');

    expect(contextAction).toContain('UserPlus');
    expect(contextAction).toContain("label: 'Invite user'");
    expect(bottomBar).toContain('UserPlus');
    expect(bottomBar).toContain("label: 'Invite user'");
    expect(routeOwnsShellAction('/users')).toBe(true);
  });

  it('submits organization identity and verifies all invitation consequences', () => {
    const invite = read('src/components/modals/InviteUserModal.jsx');
    const userModal = read('src/components/modals/UserModal.jsx');
    const profiles = profilesServiceSource();

    expect(invite).toContain("getOrganizationOptions({ limit: 200 })");
    expect(invite).not.toContain('getHospitals');
    expect(invite).toContain("supabase.functions.invoke('invite-user'");
    expect(invite).toContain('email: email.trim().toLowerCase()');
    expect(invite).toContain("provider_type: role === 'provider' ? providerType : null");
    expect(invite).toContain('organization_id: resolvedOrganizationId');
    expect(invite).not.toContain('metadata.organization_id');
    for (const consequence of ['emailQueued', 'roleGranted', 'organizationLinked']) {
      expect(invite).toContain(`data?.delivery?.${consequence} !== true`);
    }
    expect(invite).toContain("toast.success('Invitation sent')");
    expect(invite).toContain("title=\"Invite user\"");
    expect(invite).toContain('aria-busy={loading}');

    expect(userModal).toContain("getOrganizationOptions({ limit: 200 })");
    expect(userModal).not.toContain('getHospitals');
    expect(userModal).toContain('disabled={isView || isEdit}');
    expect(userModal).toContain('else delete payload.email;');
    expect(userModal).toContain("else payload.provider_type = '';");
    expect(userModal).toContain('if (!isAdmin()) delete payload.bvn_verified;');
    expect(profiles).toContain("const requestedEmail = String(input.email || '').trim().toLowerCase();");
    expect(profiles).toContain("throw new Error('Email changes use account security.');");
    expect(profiles).toContain("value === null && ADMIN_RPC_EMPTY_CLEAR_FIELDS.has(field) ? '' : value");
    expect(profiles).toContain("if (payload.role && payload.role !== 'provider') {");
    expect(profiles).toContain('profile_data: toAdminProfilePayload(payload)');
    expect(profiles).toContain("supabase.rpc('update_profile_by_admin'");
  });

  it('renders exact-count failures as unavailable instead of zero', () => {
    const page = pageSource();
    const mobile = read('src/components/mobile/MobileUsers.jsx');
    const hook = read('src/hooks/useProfilesQuery.js');
    const profiles = profilesServiceSource();

    expect(profiles).toContain("kind: 'count_unavailable'");
    expect(profiles).toContain("message: 'User totals are unavailable. Retry to refresh them.'");
    expect(profiles).not.toContain('return Number.isFinite(count) ? count : 0;');
    expect(hook).toContain('statsError: query.data?.statsError ?? null');
    expect(hook).toContain('stats: query.data?.stats ?? null');
    expect(page).toContain('data-testid="users-statistics-degraded-state"');
    expect(page).toContain('statisticsError={statisticsError}');
    expect(mobile).toContain('data-testid="mobile-users-statistics-degraded-state"');
    expect(mobile).toContain('const statisticsUnavailable = Boolean(statisticsError || errorMessage);');
  });

  it('feeds the analytics modal the exact-count keys it renders, not the raw KPI shape', () => {
    const overlays = read('src/components/pages/users/UsersPageOverlays.jsx');
    const model = read('src/components/pages/users/usersPageModel.js');
    const modalModel = read('src/components/modals/analytics/analyticsModalModel.js');

    // Both sides of the key contract: the shared modal reads these keys for
    // type="user", and the call site maps the exact usersPageRead counts to them.
    expect(modalModel).toContain('getCount(analytics.totalUsers)');
    expect(modalModel).toContain('getCount(analytics.verifiedUsers)');
    expect(overlays).toContain('analytics={toUsersAnalyticsShape(statistics)}');
    expect(overlays).not.toContain('analytics={statistics');
    expect(model).toContain('totalUsers: normalized.total');
    expect(model).toContain('totalProfiles: normalized.total');
    expect(model).toContain('verifiedUsers: normalized.verified');
    expect(model).toContain('org_admin: normalized.org_admin');
    // No source measures signup recency in the page read; never fabricate it.
    expect(model).not.toContain('recentSignups');
  });

  it('surfaces sign-in recency through the existing admin-gated read, honest-absent otherwise', () => {
    const readSource = read('src/services/profiles/usersPageRead.js');
    const detailRail = read('src/components/pages/users/UsersDetailRail.jsx');
    const page = read('src/components/pages/UsersPage.jsx');
    const panel = read('src/components/context/UsersPanel.jsx');

    // ADOPT-29 wiring: the page read enriches rows from the EXISTING
    // get_all_auth_users RPC (no new RPC), mirroring its role gate, and any
    // failure leaves rows without the field instead of fabricating one.
    expect(readSource).toContain("const AUTH_ENRICHED_ROLES = new Set(['admin', 'org_admin', 'dispatcher']);");
    expect(readSource).toContain("supabase.rpc('get_all_auth_users', {");
    expect(readSource).toContain('if (error || !Array.isArray(data)) return rows;');
    expect(readSource).toContain("signIns.has(row.id) ? { ...row, last_sign_in_at: signIns.get(row.id) } : row");
    expect(readSource).toContain('enriched = await attachLastSignIn(enriched, user);');

    // The rail renders the projected relative time only when it resolved.
    expect(detailRail).toContain('{projection.lastSignIn && (');
    expect(detailRail).toContain('<DetailLine icon={LogIn} label="Last sign-in" value={projection.lastSignIn} />');

    // The context panel dead-end is closed: the published route context feeds
    // the existing last_sign_in_at renderer from the same enriched rows.
    expect(page).toContain('recent: userRows.slice(0, 5)');
    expect(panel).toContain('const signIn = formatSignIn(user?.last_sign_in_at);');
  });

  it('surfaces the onboarding_status vocabulary as pill and read filter without coercion', () => {
    const model = read('src/components/pages/users/usersPageModel.js');
    const detailRail = read('src/components/pages/users/UsersDetailRail.jsx');
    const page = read('src/components/pages/UsersPage.jsx');
    const readSource = read('src/services/profiles/usersPageRead.js');

    // ADOPT-44: DB CHECK vocabulary only; unknown keys humanize, null absents.
    for (const status of ['pending', 'complete', 'skipped']) {
      expect(model).toContain(`{ value: '${status}', label: '${status[0].toUpperCase()}${status.slice(1)}' }`);
    }
    expect(model).toContain("key: 'onboarding_status',");
    expect(model).toContain('label: `Onboarding ${key.replace(/_/g, \' \')}`');
    expect(model).toContain("onboardingMeta: getOnboardingStatusMeta(user?.onboarding_status)");
    expect(model).toContain("|| (filters.onboarding_status && filters.onboarding_status !== 'all')");

    // Pill binding reaches the rail render and stays absent on null.
    expect(detailRail).toContain('{projection.onboardingMeta && (');
    expect(detailRail).toContain('label={projection.onboardingMeta.label}');
    expect(detailRail).toContain('className={projection.onboardingMeta.tone}');

    // The sheet filter reaches the server read, read-only.
    expect(page).toContain('onboarding_status: filters.onboarding_status,');
    expect(readSource).toContain("if (filter.onboarding_status && filter.onboarding_status !== 'all') {");
    expect(readSource).toContain("query.eq('onboarding_status', filter.onboarding_status);");
  });

  it('keeps data acquisition route-owned and deletion unavailable on both layouts', () => {
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const page = pageSource();
    const mobile = read('src/components/mobile/MobileUsers.jsx');

    expect(routeOwnsStartupDomains('/users')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/users')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/users')).toEqual([]);
    expect(pageDataAccess).toContain("const isTodayPath = (pathname = '') => pathname === '' || pathname === '/';");
    expect(pageDataAccess).toContain('return !isTodayPath(pathname);');
    expect(page).toContain('const handleBulkDelete = useCallback(() => handleDeleteUnavailable()');
    expect(page).toContain('Delete is unavailable until identity authority is verified.');
    expect(page).toContain('canDelete={false}');
    expect(mobile).toContain('disabled');
    expect(mobile).toContain('User deletion is locked until identity authority is verified');
    expect(mobile).toContain('canDelete && isAdmin');
  });
});
