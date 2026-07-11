import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfilesQuery } from '../../hooks/useProfilesQuery';
import { createProfile, updateProfile } from '../../services/profilesService';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
// Console design system: Users COMPOSES the shared workspace grammar (donor: Requests;
// closest analog: Doctors/Staff) instead of the bespoke signal/state-strip/rail look-alikes
// + the 3-view density shell it used to inline. It reads the server-projection
// useProfilesQuery (Phase A) instead of the old 1000-row client-side load.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, CopyChip, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { UserModal } from '../modals/UserModal';
import { InviteUserModal } from '../modals/InviteUserModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { BulkActionBar } from '../common/BulkActionBar';
import { SEOHead } from '../common/SEOHead';
import { MobileUsers } from '../mobile/MobileUsers';
import { toast } from 'sonner';
import {
  Building2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Filter,
  IdCard,
  Info,
  Mail,
  Phone,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Ambulance,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';

const USER_DELETE_UNAVAILABLE_MESSAGE = 'Delete is unavailable until identity authority is verified.';
const USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE = 'Invites are not ready until identity authority is verified.';

// Role vocabulary -> pill tone + label. Literal palette, NEUTRAL shadows only.
const ROLE_META = {
  admin: { label: 'Admin', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-200' },
  org_admin: { label: 'Org admin', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200' },
  provider: { label: 'Provider', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  patient: { label: 'Patient', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
  sponsor: { label: 'Sponsor', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  viewer: { label: 'Viewer', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
  dispatcher: { label: 'Dispatcher', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
};

const titleCase = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getRoleMeta = (role) => {
  const key = String(role || '').toLowerCase();
  return ROLE_META[key] || { label: titleCase(role) || 'Unknown', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' };
};

// provider_type persona icon (doctor vs driver) -- the split that legitimately lives on
// Users (live-DB 2026-07-10: providers are ~50/50 doctor/driver), unlike Staff (all doctors).
// A driver/paramedic reads as a RESPONDER (ambulance), a doctor as a CLINICIAN (stethoscope)
// -- the SAME persona vocabulary as MobileUsers / MobileVerification (canon, single-source).
// 'paramedic' previously fell through to the generic person mark.
const getProviderTypeIcon = (providerType) => {
  const type = String(providerType || '').toLowerCase();
  if (type.includes('driver') || type.includes('ambulance') || type.includes('paramedic')) return Ambulance;
  if (type.includes('doctor') || type.includes('physician') || type.includes('nurse') || type.includes('specialist')) return Stethoscope;
  return UserRound;
};

const getUserInitials = (name = 'User') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'U'}${parts[1]?.[0] || ''}`.toUpperCase();
};

// KPI/state strip: a ROLE PARTITION (the clean population split the smart-context strip is
// built for). bvn_verified is a cross-cutting TRUST OVERLAY (signal subhead + row marker +
// FilterSheet), NOT a chip; provider_type is a within-providers drill-down (row + rail +
// FilterSheet). Neutral literal palette; the shared KpiStrip owns width/tile/smart-context.
const USERS_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Users, colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'provider', label: 'Providers', icon: Stethoscope, colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'org_admin', label: 'Org admins', icon: Shield, colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'patient', label: 'Patients', icon: UserRound, colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06]' },
];
const USERS_KPI_IMPORTANCE = { all: 0, provider: 1, org_admin: 2, patient: 3 };
const PINNED_USERS_KPI_IDS = ['provider', 'org_admin'];

const usersToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

// Person | Role | Verified | Organization | Joined | Action
const USERS_GRID_COLS = 'grid-cols-[minmax(160px,1.6fr)_minmax(96px,auto)_minmax(88px,auto)_minmax(120px,1fr)_minmax(92px,auto)_84px]';
const USERS_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(160px,1.6fr)_minmax(96px,auto)_minmax(88px,auto)_minmax(120px,1fr)_minmax(92px,auto)_84px]';

const USERS_EMPTY_HEADINGS = {
  all: 'No users yet',
  provider: 'No providers',
  org_admin: 'No org admins',
  patient: 'No patients',
};

const getUsersKpiCount = (id, stats) => {
  if (id === 'all') return stats.total || 0;
  return stats[id] || 0;
};

const formatJoinedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getUsersProjection = (user, organizationsMap = {}) => {
  const displayName = user?.full_name || user?.name || user?.username || 'Unnamed user';
  return {
    name: displayName,
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'unknown',
    roleMeta: getRoleMeta(user?.role),
    providerType: user?.provider_type || '',
    verified: Boolean(user?.bvn_verified),
    organization: user?.organization_name || (user?.organization_id ? (organizationsMap[user.organization_id] || 'Independent') : 'Independent'),
    displayId: user?.display_id || null,
    joined: user?.created_at,
  };
};

// KPI role narrowing composes with the FilterSheet role filter (Doctors' resolveStatusFilter
// idiom): a KPI role wins unless the sheet explicitly excludes it (then the list is empty).
const resolveUsersRoleFilter = (filters = {}) => {
  const sheetRoles = Array.isArray(filters.role) ? filters.role.filter(Boolean) : (filters.role ? [filters.role] : []);
  const kpiRole = filters.kpiFilter && filters.kpiFilter !== 'all' ? filters.kpiFilter : null;
  if (!kpiRole) return { role: sheetRoles, forceEmpty: false };
  if (sheetRoles.length === 0 || sheetRoles.includes(kpiRole)) return { role: kpiRole, forceEmpty: false };
  return { role: kpiRole, forceEmpty: true };
};

const hasActiveUserFilters = (filters = {}) => Boolean(
  filters.search ||
  (Array.isArray(filters.role) && filters.role.length > 0) ||
  (Array.isArray(filters.provider_type) && filters.provider_type.length > 0) ||
  (filters.bvn_verified && filters.bvn_verified !== 'all') ||
  (filters.created_at && (filters.created_at.start || filters.created_at.end))
);

const getUsersSignal = ({ stats, kpiFilter, loadError, hasAny }) => {
  const activeId = kpiFilter || 'all';
  const option = USERS_KPI_OPTIONS.find((item) => item.id === activeId) || USERS_KPI_OPTIONS[0];
  const count = getUsersKpiCount(option.id, stats);
  const verified = stats.verified || 0;

  if (loadError && !hasAny) {
    return { icon: ShieldAlert, tone: 'danger', label: 'Load failed', headline: 'Users did not load', subhead: 'Retry to load the directory.' };
  }

  if (option.id === 'all') {
    return {
      icon: Users,
      tone: 'muted',
      label: 'Users',
      headline: count > 0 ? `${count} user${count === 1 ? '' : 's'}` : 'No users yet',
      // bvn_verified as a TRUST overlay in the subhead (not a KPI chip).
      subhead: count > 0
        ? `${verified} verified. User commands stay disabled until identity authority is verified.`
        : 'User records for this scope will appear here.',
    };
  }

  const toneById = { provider: 'warning', org_admin: 'info', patient: 'muted' };
  const noun = option.label.toLowerCase().replace(/s$/, '');
  return {
    icon: option.icon,
    tone: toneById[option.id] || 'muted',
    label: option.label,
    headline: count > 0 ? `${count} ${count === 1 ? noun : option.label.toLowerCase()}` : `No ${option.label.toLowerCase()}`,
    subhead: count > 0 ? 'Review identity, role, and verification records.' : `${option.label} for this scope will appear here.`,
  };
};

export const UsersPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [usersCommandNotice, setUsersCommandNotice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    isLoading: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'default',
  });

  const pagination = usePagination(20);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const canManage = isAdmin() || isOrgAdmin();

  const roleKind = isAdmin() ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  // ?role=provider / ?add=true deep-links (QuickSearch / notification targets).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'provider') {
      setFilters((prev) => ({ ...prev, kpiFilter: 'provider' }));
    }
  }, [location.search]);

  const queryFilter = useMemo(() => {
    const roleFilter = resolveUsersRoleFilter(filters);
    const verified = filters.bvn_verified === 'verified' ? true : filters.bvn_verified === 'unverified' ? false : undefined;
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
    filters.kpiFilter,
    filters.role,
    filters.provider_type,
    filters.bvn_verified,
    filters.search,
    filters.created_at,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const { users, count, stats, loading, isFetching, error: queryError, refetch } = useProfilesQuery(queryFilter);
  const loadError = queryError ? 'Users could not load. Check your connection and try again.' : null;
  useEffect(() => {
    if (queryError) console.error('[users] load failed:', queryError);
  }, [queryError]);

  const userRows = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const derivedStats = useMemo(() => ({
    total: Number(stats?.total) || count,
    provider: Number(stats?.provider) || 0,
    org_admin: Number(stats?.org_admin) || 0,
    patient: Number(stats?.patient) || 0,
    verified: Number(stats?.verified) || 0,
  }), [stats, count]);

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
    pagination.setTotalCount(count);
  }, [count, pagination.setTotalCount]);

  useEffect(() => {
    pagination.resetPagination();
    clearSelection();
  }, [filters, sortConfig, pagination.resetPagination, clearSelection]);

  // Realtime: a profiles change invalidates the list; a new signup announces itself,
  // throttled to one toast / 10s so an insert burst can't stack over the operator.
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
        toast('New user joined', payload?.new?.full_name ? { description: payload.new.full_name } : undefined);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  // --- Write register. EDIT is a real write (updateProfile). CREATE / INVITE / DELETE are
  // INTENTIONALLY fail-closed ("no parallel truth" -- the console must not mint auth
  // identities or hard-delete profiles the app cannot reconcile). Do NOT "fix" these gates.
  const handleSaveUser = useCallback(async (formData) => {
    try {
      if (modalMode === 'edit' && selectedUser?.id) {
        await updateProfile(selectedUser.id, formData);
        fetchUsers();
      } else if (modalMode === 'create') {
        if (!formData.id) {
          throw new Error("Cannot create user manually without 'Invite' flow. Please use 'Invite User' to create new users with secure access.");
        }
        await createProfile(formData);
        fetchUsers();
      }
    } catch (error) {
      console.error('Save User Error:', error);
      throw error;
    }
  }, [modalMode, selectedUser, fetchUsers]);

  const handleIdentityActionUnavailable = useCallback(() => {
    setUsersCommandNotice(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);
    toast.info(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleDeleteUnavailable = useCallback(() => {
    setUsersCommandNotice(USER_DELETE_UNAVAILABLE_MESSAGE);
    toast.info(USER_DELETE_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleInvite = useCallback(() => handleIdentityActionUnavailable(), [handleIdentityActionUnavailable]);
  const handleCreate = useCallback(() => handleIdentityActionUnavailable(), [handleIdentityActionUnavailable]);
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

  const handleViewAnalytics = useCallback(() => setAnalyticsModalOpen(true), []);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const setKpiFilter = useCallback((id) => {
    setFilters((prev) => ({ ...prev, kpiFilter: id || 'all' }));
  }, []);

  const setSearchFilter = useCallback((search) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  // Open "Add" via URL / context-panel events (fail-closed).
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

  const filterSchema = useMemo(() => [
    { key: 'search', type: 'text', label: 'Search', placeholder: 'Search users...' },
    {
      key: 'role',
      type: 'multiselect',
      label: 'Role',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'org_admin', label: 'Org admin' },
        { value: 'provider', label: 'Provider' },
        { value: 'patient', label: 'Patient' },
        { value: 'sponsor', label: 'Sponsor' },
      ],
    },
    {
      key: 'bvn_verified',
      type: 'select',
      label: 'Verification',
      options: [
        { value: 'all', label: 'All' },
        { value: 'verified', label: 'Verified only' },
        { value: 'unverified', label: 'Unverified only' },
      ],
    },
    {
      key: 'provider_type',
      type: 'multiselect',
      label: 'Provider type',
      dependsOn: { key: 'role', value: 'provider' },
      options: [
        { value: 'doctor', label: 'Doctor' },
        { value: 'driver', label: 'Driver' },
      ],
    },
    { key: 'created_at', type: 'date', label: 'Joined date', placeholder: 'Select dates' },
  ], []);

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

  // Primary header action: "ADD USER" is FAIL-CLOSED (identity authority not proved).
  const headerActions = useMemo(() => (
    canManage ? (
      <Button
        onClick={handleInvite}
        className="h-9 rounded-pill bg-muted/40 px-4 text-[12px] font-semibold text-muted-foreground transition-all active:scale-95"
        aria-label="Add user unavailable"
        aria-describedby={usersCommandNotice ? 'users-action-feedback' : undefined}
        data-state="unavailable"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add user
      </Button>
    ) : null
  ), [canManage, handleInvite, usersCommandNotice]);

  usePageHeader('Users', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  // Route-owned right panel -- publish live context (canon shared by Requests/Staff).
  const usersRouteContext = useMemo(() => ({
    stats: derivedStats,
    recent: userRows.slice(0, 5),
    focusedUser,
    users: userRows.slice(0, 25),
    count,
    loading,
    canManage,
  }), [canManage, count, derivedStats, focusedUser, loading, userRows]);

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

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Users" description="User Management Mission Control" />
        {usersCommandNotice && (
          <div id="users-action-feedback" role="status" aria-live="polite" className="mx-4 mb-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
            {usersCommandNotice}
          </div>
        )}
        <MobileUsers
          users={userRows}
          loading={loading}
          statistics={derivedStats}
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

        <UserModal
          isOpen={modalMode === 'create' || modalMode === 'edit' || modalMode === 'view'}
          onClose={handleModalClose}
          user={selectedUser}
          mode={modalMode}
          onSave={handleSaveUser}
        />
        <InviteUserModal isOpen={modalMode === 'invite'} onClose={handleModalClose} onInvited={fetchUsers} />
        <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} isMobile={isMobile} />
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmationModal.title}
          description={confirmationModal.description}
          onConfirm={confirmationModal.onConfirm}
          variant={confirmationModal.variant}
          confirmLabel={confirmationModal.confirmLabel}
          isLoading={confirmationModal.isLoading}
        />
        <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={derivedStats} type="user" />

        {selectable && (
          <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground active:scale-[0.96]"
              title="Delete unavailable"
              aria-label="Delete unavailable"
              data-state="unavailable"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </BulkActionBar>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Users" description="Manage user profiles, roles, and verifications." />
      {usersCommandNotice && (
        <div id="users-action-feedback" role="status" aria-live="polite" className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          {usersCommandNotice}
        </div>
      )}

      <UsersDesktopWorkspace
        items={userRows}
        stats={derivedStats}
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
        onInvite={handleInvite}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {/* Delete stays FAIL-CLOSED (identity authority not proved) -- the bar renders the
              affordance but the action surfaces the gated notice, never a real bulk delete. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBulkDelete}
            className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground active:scale-[0.96]"
            title="Delete unavailable"
            aria-label="Delete unavailable"
            data-state="unavailable"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <UserModal
        isOpen={modalMode === 'create' || modalMode === 'edit' || modalMode === 'view'}
        onClose={handleModalClose}
        user={selectedUser}
        mode={modalMode}
        onSave={handleSaveUser}
      />
      <InviteUserModal isOpen={modalMode === 'invite'} onClose={handleModalClose} onInvited={fetchUsers} />
      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} viewToggle={null} isMobile={isMobile} />
      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={derivedStats} type="user" />
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmationModal.title}
        description={confirmationModal.description}
        onConfirm={confirmationModal.onConfirm}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
        isLoading={confirmationModal.isLoading}
      />
    </div>
  );
};

const UsersDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  canManage,
  focusedUser,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onView,
  onEdit,
  onInvite,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getUsersSignal({ stats, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedUser,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-user-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/users"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <UsersDetailRail
          user={focusedUser}
          loading={loading}
          hasFilter={hasFilter}
          canManage={canManage}
          onView={onView}
          onEdit={onEdit}
          onInvite={onInvite}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={usersToneClass}>
        <KpiStrip
          options={USERS_KPI_OPTIONS}
          getCount={(id) => getUsersKpiCount(id, stats)}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_USERS_KPI_IDS}
          importance={USERS_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-users-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="users"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search users by name, email, or phone..."
            searchTestId="users-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="users"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Users list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <UsersListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Users did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Users}
              heading={hasFilter ? 'No matching users' : (USERS_EMPTY_HEADINGS[kpiFilter] || 'No users yet')}
              body={hasFilter ? 'Change filters or search again.' : 'User records for this scope will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setKpiFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all users
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              selected={focusedUser?.id === user.id}
              onFocus={() => setFocused(user.id)}
              onView={onView}
              onEdit={onEdit}
              canManage={canManage}
              selectable={selectable}
              checked={selectedIds.includes(user.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const UsersListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? USERS_GRID_COLS_SELECT : USERS_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all users'}
        className="h-4 w-4"
      />
    )}
    {/* Name / Role / Verified / Organization are plain labels -- only Joined (created_at)
        is a meaningful sort; role/verification/type belong in the FilterSheet. */}
    <span>Name</span>
    <span>Role</span>
    <span>Verified</span>
    <span>Organization</span>
    <SortableColumnHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const UserRow = ({ user, selected, onFocus, onView, onEdit, canManage, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const projection = getUsersProjection(user);
  const isProvider = projection.role === 'provider';
  const TypeIcon = getProviderTypeIcon(projection.providerType);

  return (
    <ListRowShell
      id={user.id}
      dataAttrName="data-user-row"
      gridCols={selectable ? USERS_GRID_COLS_SELECT : USERS_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(user)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(user.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.name}` : `Select ${projection.name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-muted/40 text-sm font-semibold text-foreground">
          {getUserInitials(projection.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.name}>{projection.name}</div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate" title={projection.email || projection.phone}>{projection.email || projection.phone || 'No contact'}</span>
            {isProvider && projection.providerType && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] capitalize text-muted-foreground/80">
                <TypeIcon className="h-3 w-3" />
                {projection.providerType}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={projection.roleMeta.label} icon={Shield} className={projection.roleMeta.tone} compact />
      </div>

      <div className="min-w-0">
        {projection.verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-foreground/[0.055] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.06]">
            <Shield className="h-3.5 w-3.5" />
            Unverified
          </span>
        )}
      </div>

      <div className="min-w-0 truncate text-sm text-muted-foreground" title={projection.organization}>{projection.organization}</div>

      <div className="text-sm font-medium text-muted-foreground">{formatJoinedDate(projection.joined)}</div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(user); }}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${projection.name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(user); }}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Edit ${projection.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ListRowShell>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

const UsersDetailRail = ({ user, loading, hasFilter, canManage, onView, onEdit, onInvite }) => {
  if (loading) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-5 w-2/3 rounded-inner" />
            <Shimmer className="h-4 w-1/2 rounded-inner" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!user) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Users className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No user selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Users that match your filters will appear here.' : 'Select a user to see their details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const projection = getUsersProjection(user);
  const isProvider = projection.role === 'provider';
  const TypeIcon = getProviderTypeIcon(projection.providerType);

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">User details</h2>
            {projection.displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={projection.displayId}>{projection.displayId}</p>
                <CopyChip value={projection.displayId} label="Copy user ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${projection.roleMeta.tone}`}>
              <Shield className="h-3.5 w-3.5" />
              {projection.roleMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(user)}
            aria-label="Open full user details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-muted/40 text-lg font-semibold text-foreground">
            {getUserInitials(projection.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.name}>{projection.name}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground" title={projection.email}>{projection.email || 'No email on file'}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Mail} label="Email" value={projection.email} />
        {projection.phone && <DetailLine icon={Phone} label="Phone" value={projection.phone} />}
        <DetailLine icon={Shield} label="Role" value={projection.roleMeta.label} />
        {isProvider && projection.providerType && <DetailLine icon={TypeIcon} label="Provider type" value={projection.providerType} />}
        <DetailLine icon={projection.verified ? ShieldCheck : Shield} label="Verified" value={projection.verified ? 'Verified' : 'Unverified'} />
        <DetailLine icon={Building2} label="Organization" value={projection.organization} />
        <DetailLine icon={Clock} label="Joined" value={formatJoinedDate(projection.joined)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(user)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {canManage && (
          <div className="grid grid-cols-2 gap-3">
            <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(user)} />
            <RailActionButton icon={Info} label="Open record" onClick={() => onView(user)} />
          </div>
        )}

        {/* Delete / invite stay FAIL-CLOSED ("no parallel truth"): the console must not
            hard-delete a profile or mint an auth identity the app cannot reconcile. */}
        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          <Shield className="h-4 w-4 shrink-0" />
          User commands are disabled until identity authority is verified.
        </div>
      </div>
    </DetailRailShell>
  );
};
