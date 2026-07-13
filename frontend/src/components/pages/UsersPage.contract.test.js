import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Users Page 14 identity contract', () => {
  it('keeps the admitted registry role-gated and hardgate-covered', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('RESOLUTION - Page 14 Users ADMITTED to canon (2026-07-10).');
    expect(gate).toContain('Users invitation receiver admission on 2026-07-12');
    expect(app).toContain('<Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />');
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
    const page = read('src/components/pages/UsersPage.jsx');
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
    const page = read('src/components/pages/UsersPage.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const bottomBar = read('src/components/navigation/DynamicBottomBar.jsx');

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
    const profiles = read('src/services/profilesService.js');

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
    const page = read('src/components/pages/UsersPage.jsx');
    const mobile = read('src/components/mobile/MobileUsers.jsx');
    const hook = read('src/hooks/useProfilesQuery.js');
    const profiles = read('src/services/profilesService.js');

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

  it('keeps data acquisition route-owned and deletion unavailable on both layouts', () => {
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const page = read('src/components/pages/UsersPage.jsx');
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
