import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { usePagination } from '../../hooks/usePagination';
import { useProfilesQuery } from '../../hooks/useProfilesQuery';
import { useRowSelection } from '../../hooks/useRowSelection';
import { updateProfile } from '../../services/profilesService';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { SEOHead } from '../common/SEOHead';
import { MobileUsers } from '../mobile/MobileUsers';
import { Button } from '../ui/button';
import { UsersDesktopWorkspace } from './users/UsersDesktopWorkspace';
import { UsersBulkActionBar, UsersPageDialogs } from './users/UsersPageOverlays';
import {
  hasActiveUserFilters,
  normalizeUsersStats,
  resolveUsersRoleFilter,
  USER_DELETE_UNAVAILABLE_MESSAGE,
  USERS_FILTER_SCHEMA,
} from './users/usersPageModel';

export const UsersPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    isLoading: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'default',
  });

  const pagination = usePagination(20);
  const {
    resetPagination: resetUsersPagination,
    setTotalCount: setUsersTotalCount,
  } = pagination;
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const canManage = isAdmin() || isOrgAdmin();
  const roleKind = isAdmin() ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'provider') {
      setFilters((previous) => ({ ...previous, kpiFilter: 'provider' }));
    }
  }, [location.search]);

  const queryFilter = useMemo(() => {
    const roleFilter = resolveUsersRoleFilter(filters);
    const verified = filters.bvn_verified === 'verified'
      ? true
      : filters.bvn_verified === 'unverified'
        ? false
        : undefined;
    return {
      limit: pagination.itemsPerPage,
      offset: pagination.paginationRange.start,
      quiet: true,
      role: roleFilter.role,
      forceEmpty: roleFilter.forceEmpty,
      provider_type: filters.provider_type,
      verified,
      search: filters.search || undefined,
      created_at: filters.created_at,
      sortKey: sortConfig.key,
      sortDirection: sortConfig.direction,
    };
  }, [
    filters,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const {
    users,
    count,
    stats,
    statsError,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useProfilesQuery(queryFilter);
  const loadError = queryError ? 'Users could not load. Check your connection and try again.' : null;
  const userRows = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const derivedStats = useMemo(() => normalizeUsersStats(stats), [stats]);
  const statisticsError = statsError?.message || (
    !loading && !queryError && !derivedStats
      ? 'User totals are unavailable. Retry to refresh them.'
      : null
  );

  const { focusedRecord: focusedUser, setFocused, isFocused } = useFocusedRecord('users', userRows);
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(userRows);
  const selectable = canManage;
  const hasFilter = hasActiveUserFilters(filters);
  const activeUsersFilter = filters.kpiFilter || 'all';
  const fetchUsers = refetch;

  useEffect(() => {
    if (Number.isFinite(count)) setUsersTotalCount(count);
  }, [count, setUsersTotalCount]);

  useEffect(() => {
    resetUsersPagination();
    clearSelection();
  }, [filters, sortConfig, resetUsersPagination, clearSelection]);

  const lastInsertToastAtRef = useRef(0);
  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('users_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (active) fetchUsers();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        if (!active || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        toast('New user joined', payload?.new?.full_name
          ? { description: payload.new.full_name }
          : undefined);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const handleSaveUser = useCallback(async (formData) => {
    if (modalMode !== 'edit' || !selectedUser?.id) {
      throw new Error('Direct user creation is unavailable. Use Invite user.');
    }
    await updateProfile(selectedUser.id, formData);
    fetchUsers();
  }, [modalMode, selectedUser, fetchUsers]);

  const handleDeleteUnavailable = useCallback(() => {
    toast.info(USER_DELETE_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleInvite = useCallback(() => {
    if (!canManage) return false;
    setSelectedUser(null);
    setModalMode('invite');
    return true;
  }, [canManage]);
  const handleCreate = handleInvite;
  const confirmDelete = useCallback(() => handleDeleteUnavailable(), [handleDeleteUnavailable]);
  const handleBulkDelete = useCallback(() => handleDeleteUnavailable(), [handleDeleteUnavailable]);

  const handleView = useCallback((user) => {
    if (user?.id && !isFocused(user.id)) setFocused(user.id);
    setSelectedUser(user);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleEdit = useCallback((user) => {
    if (!canManage) return;
    setSelectedUser(user);
    setModalMode('edit');
  }, [canManage]);

  const handleModalClose = useCallback(() => {
    setSelectedUser(null);
    setModalMode(null);
  }, []);

  const handleViewAnalytics = useCallback(() => {
    if (!derivedStats) {
      toast.error(statisticsError || loadError || 'User totals are still loading.');
      return false;
    }
    setAnalyticsModalOpen(true);
    return true;
  }, [derivedStats, loadError, statisticsError]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const setKpiFilter = useCallback((id) => {
    setFilters((previous) => ({ ...previous, kpiFilter: id || 'all' }));
  }, []);

  const setSearchFilter = useCallback((search) => {
    setFilters((previous) => ({ ...previous, search }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') handleCreate();
  }, [handleCreate, location.search]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    const handleOpenInviteModal = () => handleInvite();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenUserAnalytics = () => handleViewAnalytics();
    window.addEventListener('openUserModal', handleOpenModal);
    window.addEventListener('openInviteUserModal', handleOpenInviteModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openUserAnalytics', handleOpenUserAnalytics);
    return () => {
      window.removeEventListener('openUserModal', handleOpenModal);
      window.removeEventListener('openInviteUserModal', handleOpenInviteModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openUserAnalytics', handleOpenUserAnalytics);
    };
  }, [handleCreate, handleInvite, handleViewAnalytics]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter users"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasFilter]);

  const headerActions = useMemo(() => (
    canManage ? (
      <Button
        onClick={handleInvite}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background transition-all active:scale-95"
        aria-label="Invite user"
        data-state="ready"
      >
        <Plus className="mr-2 h-4 w-4" />
        Invite user
      </Button>
    ) : null
  ), [canManage, handleInvite]);

  usePageHeader('Users', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const usersRouteContext = useMemo(() => ({
    stats: derivedStats,
    statsError: statisticsError || loadError,
    recent: userRows.slice(0, 5),
    focusedUser,
    users: userRows.slice(0, 25),
    count: Number.isFinite(count) ? count : null,
    loading: loading || Boolean(statisticsError || loadError),
    canManage,
  }), [canManage, count, derivedStats, focusedUser, loadError, loading, statisticsError, userRows]);

  const publishUsersRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('usersRouteContextUpdated', { detail: usersRouteContext }));
  }, [usersRouteContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishUsersRouteContext();
    window.addEventListener('requestUsersRouteContext', publishUsersRouteContext);
    return () => window.removeEventListener('requestUsersRouteContext', publishUsersRouteContext);
  }, [publishUsersRouteContext]);

  const dialogs = (
    <UsersPageDialogs
      isMobile={isMobile}
      modalMode={modalMode}
      selectedUser={selectedUser}
      onClose={handleModalClose}
      onSave={handleSaveUser}
      onInvited={fetchUsers}
      filterSheetOpen={filterSheetOpen}
      setFilterSheetOpen={setFilterSheetOpen}
      filterSchema={USERS_FILTER_SCHEMA}
      filters={filters}
      setFilters={setFilters}
      analyticsModalOpen={analyticsModalOpen}
      setAnalyticsModalOpen={setAnalyticsModalOpen}
      statistics={derivedStats}
      confirmationModal={confirmationModal}
      setConfirmationModal={setConfirmationModal}
    />
  );

  const bulkActions = selectable ? (
    <UsersBulkActionBar
      selectedIds={selectedIds}
      onClear={clearSelection}
      onDeleteUnavailable={handleBulkDelete}
    />
  ) : null;

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Users" description="User Management Mission Control" />
        <MobileUsers
          users={userRows}
          loading={loading}
          statistics={derivedStats}
          statisticsError={statisticsError}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onRefresh={fetchUsers}
          onViewAnalytics={handleViewAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          canDelete={false}
          onOpenFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          isFetching={isFetching}
          errorMessage={loadError}
          onRetry={fetchUsers}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          selectionEnabled={selectable}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
        {dialogs}
        {bulkActions}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Users" description="Manage user profiles, roles, and verifications." />
      <UsersDesktopWorkspace
        items={userRows}
        stats={derivedStats}
        statisticsError={statisticsError}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        canManage={canManage}
        focusedUser={focusedUser}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={activeUsersFilter}
        setKpiFilter={setKpiFilter}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        onRetry={fetchUsers}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        selectable={selectable}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        onView={handleView}
        onEdit={handleEdit}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />
      {bulkActions}
      {dialogs}
    </div>
  );
};

export { UsersDesktopWorkspace } from './users/UsersDesktopWorkspace';
