import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
import { getProfiles, getUserStatistics, searchUsers, createProfile, updateProfile } from '../../services/profilesService';
import { getOrganizations } from '../../services/organizationsService';
import { getDoctorByProfileId, createDoctor } from '../../services/doctorsService';
import { createAmbulance } from '../../services/ambulancesService';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Users, Plus, Edit, Trash2, Eye, Shield, UserCheck, ChevronRight, Phone, Mail, Filter, BarChart3, Info, X } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { UserModal } from '../modals/UserModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { UserListView } from '../views/UserListView';
import { UserTableView } from '../views/UserTableView';
import { SEOHead } from '../common/SEOHead';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';

import { InviteUserModal } from '../modals/InviteUserModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileUsers } from '../mobile/MobileUsers';
import { CheckSquare, Archive } from 'lucide-react'; // Additional icons

const USER_DELETE_UNAVAILABLE_MESSAGE = 'Delete is unavailable until identity authority is verified.';
const USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE = 'Invites are not ready until identity authority is verified.';

const USERS_STATE_OPTIONS = [
  { id: 'all', label: 'Users', icon: Users, tone: 'sky',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-sky-600 dark:text-sky-200' },
  { id: 'verified', label: 'Verified', icon: UserCheck, tone: 'emerald',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-emerald-600 dark:text-emerald-200' },
  { id: 'admin', label: 'Admins', icon: Shield, tone: 'violet',
    activeClass: 'bg-violet-500/10 text-violet-800 shadow-[0_18px_54px_rgba(139,92,246,0.16)] dark:text-violet-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-violet-600 dark:text-violet-200' },
  { id: 'provider', label: 'Providers', icon: Eye, tone: 'amber',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-amber-600 dark:text-amber-200' },
];

const usersToneClass = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  muted: 'bg-muted/30 text-muted-foreground',
};

const normalizeUsersCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getUsersStateCount = ({ id, stats, users }) => {
  const rows = Array.isArray(users) ? users : [];
  const dist = stats?.roleDistribution || {};
  switch (id) {
    case 'verified':
      return normalizeUsersCount(stats?.bvnVerifiedUsers, rows.filter((u) => u.bvn_verified).length);
    case 'admin':
      return normalizeUsersCount((dist.admin || 0) + (dist.org_admin || 0), rows.filter((u) => ['admin', 'org_admin'].includes(u.role)).length);
    case 'provider':
      return normalizeUsersCount(dist.provider, rows.filter((u) => u.role === 'provider').length);
    default:
      return normalizeUsersCount(stats?.totalUsers, rows.length);
  }
};

const getUsersSignal = ({ stats, users, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = USERS_STATE_OPTIONS.find((item) => item.id === activeId) || USERS_STATE_OPTIONS[0];
  const count = getUsersStateCount({ id: option.id, stats, users });
  const nounMap = { all: 'user record', verified: 'verified user', admin: 'admin & manager', provider: 'provider' };
  const emptyMap = { all: 'users', verified: 'verified users', admin: 'admins & managers', provider: 'providers' };
  return {
    icon: option.icon,
    tone: option.tone,
    label: option.label,
    headline: count > 0 ? `${count} ${nounMap[option.id] || 'user'}${count === 1 ? '' : 's'}` : `No ${emptyMap[option.id] || 'users'}`,
    subhead: count > 0
      ? 'Review identity, role, and verification records. User commands stay disabled until identity authority is verified.'
      : 'User records for this scope will appear here.',
  };
};

const UsersStateStrip = ({ stats, users, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
    {USERS_STATE_OPTIONS.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getUsersStateCount({ id: item.id, stats, users });
      return (
        <motion.button key={item.id} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active} aria-label={`Show ${item.label.toLowerCase()}`} data-state={active ? 'selected' : 'idle'}>
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const UsersSignalPanel = ({ stats, users, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? { icon: Users, tone: 'muted', label: 'Loading', headline: 'Loading users', subhead: 'One moment while the identity list comes in.' }
    : getUsersSignal({ stats, users, kpiFilter });
  const SignalIcon = signal.icon;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}
      className="flex min-h-[240px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[288px]" aria-live="polite">
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${usersToneClass[signal.tone] || usersToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">{signal.headline}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{signal.subhead}</p>
        </div>
        <UsersStateStrip stats={stats} users={users} loading={loading} kpiFilter={kpiFilter} setKpiFilter={setKpiFilter} />
      </div>
    </motion.section>
  );
};

const getUserInitials = (name = 'User') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
};

const UserDetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/20 p-2.5">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value || 'Not set'}</div>
    </div>
  </div>
);

const UserRailButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

const UsersDetailRail = ({ user, onView }) => {
  if (!user) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Users className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No user selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Users that match your filters will appear here.
          </p>
        </div>
      </aside>
    );
  }

  const displayName = user.full_name || user.name || user.username || user.profile_username || 'Unnamed user';
  const isVerified = Boolean(user.bvn_verified);
  const verifiedValue = isVerified ? 'Verified' : 'Unverified';
  const joinedValue = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

  return (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">User details</h2>
          <div className="mt-4 inline-flex items-center gap-2 rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            {user.role || 'unknown'}
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

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-muted/30 text-lg font-semibold text-foreground">
          {getUserInitials(displayName)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{displayName}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {user.email || 'No email on file'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <UserDetailLine icon={Users} label="Name" value={user.full_name || user.name} />
        <UserDetailLine icon={Mail} label="Email" value={user.email} />
        <UserDetailLine icon={Shield} label="Role" value={user.role} />
        <UserDetailLine icon={Phone} label="Organization" value={user.organization_name || 'N/A'} />
        <UserDetailLine icon={UserCheck} label="Verified" value={verifiedValue} />
        <UserDetailLine icon={Eye} label="Joined" value={joinedValue} />
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

        <div className="grid grid-cols-1 gap-3">
          <UserRailButton icon={Info} label="Open record" onClick={() => onView(user)} />
        </div>

        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          <Shield className="h-4 w-4 shrink-0" />
          User commands are disabled until identity authority is verified.
        </div>
      </div>
    </aside>
  );
};

export const UsersPage = () => {
  const { isAdmin, isOrgAdmin, orgId, profile, can } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [organizationsMap, setOrganizationsMap] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [showStatistics, setShowStatistics] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [usersCommandNotice, setUsersCommandNotice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    isLoading: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'default'
  });

  // Handle URL parameters for filtering
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const roleParam = searchParams.get('role');

    if (roleParam === 'provider') {
      setFilters({ role: 'provider' });
    }
  }, [location.search]);

  const { viewMode, setViewMode } = useViewMode('users-page', 'table');
  const pagination = usePagination(20);

  // Filter users based on KPI filter and other filters
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Apply KPI filter
    if (filters.kpiFilter === 'verified') {
      filtered = filtered.filter(u => u.bvn_verified);
    } else if (filters.kpiFilter === 'admin') {
      filtered = filtered.filter(u => ['admin', 'org_admin'].includes(u.role));
    } else if (filters.kpiFilter === 'provider') {
      filtered = filtered.filter(u => u.role === 'provider');
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.username || u.profile_username || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm) ||
        (u.phone || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply role filter
    if (filters.role && filters.role.length > 0) {
      filtered = filtered.filter(u => filters.role.includes(u.role));
    }

    // Apply verification filter
    if (filters.bvn_verified === 'verified') {
      filtered = filtered.filter(u => u.bvn_verified);
    } else if (filters.bvn_verified === 'unverified') {
      filtered = filtered.filter(u => !u.bvn_verified);
    }

    // Apply provider type filter
    if (filters.provider_type && filters.provider_type.length > 0) {
      filtered = filtered.filter(u => filters.provider_type.includes(u.provider_type));
    }

    // Apply Date Range filter
    if (filters.created_at) {
      const { start, end } = filters.created_at;
      if (start) {
        filtered = filtered.filter(u => new Date(u.created_at) >= new Date(start));
      }
      if (end) {
        // Add 1 day to include end date fully or set time to end of day
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(u => new Date(u.created_at) <= endDate);
      }
    }

    return filtered;
  }, [users, filters]);

  // Apply Client-Side Sorting
  const processedUsers = useMemo(() => {
    let result = [...filteredUsers];
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredUsers, sortConfig]);

  // Shared focused-record store: rail shows the most-urgent user at rest and
  // toggles consistently on row focus (replaces the old private focusedUserId +
  // list[0] fallback + first-item re-pin effect).
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('users', processedUsers);
  const focusedUser = focusedRecord;

  const usersRouteContext = useMemo(() => {
    const recentUsers = [...users]
      .filter(user => user.last_sign_in_at)
      .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
      .slice(0, 5);

    return {
      users: processedUsers.slice(0, 25),
      recentUsers,
      statistics,
      loading,
    };
  }, [loading, processedUsers, statistics, users]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishUsersRouteContext = () => {
      window.dispatchEvent(new CustomEvent('usersRouteContextUpdated', {
        detail: usersRouteContext,
      }));
    };

    publishUsersRouteContext();
    window.addEventListener('requestUsersRouteContext', publishUsersRouteContext);

    return () => {
      window.removeEventListener('requestUsersRouteContext', publishUsersRouteContext);
    };
  }, [usersRouteContext]);

  // Reset pagination when filters change
  useEffect(() => {
    pagination.resetPagination();
  }, [filters, pagination.resetPagination]);

  // Fetch organizations map once on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await getOrganizations();
        const map = {};
        orgs.forEach(o => map[o.id] = o.name);
        setOrganizationsMap(map);
      } catch (error) {
        console.error('Error fetching orgs for mapping:', error);
      }
    };
    fetchOrgs();
  }, []);

  const fetchUsers = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);

      const isPrivileged = isAdmin() || isOrgAdmin();
      // For privileged users, we load 1000 items once and handle slicing locally
      const limit = isPrivileged ? 1000 : pagination.itemsPerPage;
      const offset = isPrivileged ? 0 : pagination.paginationRange.start;

      const filterOptions = {
        includeAuthData: isPrivileged,
        limit,
        offset,
        role: filters.role,
        provider_type: filters.provider_type,
        verified: filters.bvn_verified === 'verified' ? true : filters.bvn_verified === 'unverified' ? false : undefined,
      };

      let data = await getProfiles(filterOptions);

      // Frontend Mapping Logic: Ensure organization names are set from our local map
      data = data.map(u => ({
        ...u,
        organization_name: u.organization_id ? (organizationsMap[u.organization_id] || 'Independent') : 'Independent'
      }));

      if (isPrivileged) {
        const totalCount = data.length;
        pagination.setTotalCount(totalCount);

        // Infinite Scroll Logic for local slice:
        // Accumulate items from page 1 up to current page
        const visibleCount = pagination.itemsPerPage * pagination.currentPage;
        const paginatedData = data.slice(0, visibleCount);

        setUsers(paginatedData);

        // Fetch statistics for admins, or derive for Org Admins
        if (isAdmin()) {
          // Fetch robust validation stats separately to ensure accuracy
          const [stats, verifiedRes] = await Promise.all([
            getUserStatistics(),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('bvn_verified', true)
          ]);

          // Ensure 'patient' count covers any users without explicit roles (default users)
          if (stats && stats.roleDistribution) {
            const dist = stats.roleDistribution;
            const knownRolesCount = (dist.admin || 0) + (dist.provider || 0) + (dist.sponsor || 0) + (dist.viewer || 0) + (dist.org_admin || 0);
            const impliedPatients = stats.totalUsers - knownRolesCount;

            // If implicit count > explicit count, update it (assumes diff is generic users)
            if (impliedPatients > (dist.patient || 0)) {
              dist.patient = impliedPatients;
            }
          }

          setStatistics({
            ...stats,
            bvnVerifiedUsers: verifiedRes.count || 0
          });
        } else {
          // Derive statistics client-side for Org Admins (since they have the full list loaded)
          const totalUsers = data.length;
          const bvnVerifiedUsers = data.filter(u => u.bvn_verified).length;

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentSignups = data.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

          const stats = {
            totalUsers,
            totalProfiles: totalUsers,
            recentSignups,
            emailVerifiedUsers: null, // Cannot derive from client-side data - requires auth.users query
            bvnVerifiedUsers,
            roleDistribution: {
              admin: data.filter(u => u.role === 'admin').length,
              provider: data.filter(u => u.role === 'provider').length,
              patient: data.filter(u => u.role === 'patient' || !u.role).length,
              org_admin: data.filter(u => u.role === 'org_admin').length,
              sponsor: data.filter(u => u.role === 'sponsor').length,
              viewer: data.filter(u => u.role === 'viewer').length,
            }
          };
          setStatistics(stats);
        }
      } else {
        // Non-admin users: Accumulate if loading more, replace if fresh fetch (page 1)
        pagination.setTotalCount(data.length);
        setUsers(prev => (pagination.currentPage === 1 ? data : [...prev, ...data]));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin, isOrgAdmin, pagination.currentPage, pagination.itemsPerPage, pagination.paginationRange.start, pagination.setTotalCount, organizationsMap]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, pagination.currentPage]);

  const handleSaveUser = useCallback(async (formData) => {
    try {
      let savedProfile;
      if (modalMode === 'edit' && selectedUser?.id) {
        savedProfile = await updateProfile(selectedUser.id, formData);

        fetchUsers();
      } else if (modalMode === 'create') {
        if (!formData.id) {
          throw new Error("Cannot create user manually without 'Invite' flow. Please use 'Invite User' to create new users with secure access.");
        }
        await createProfile(formData);
        fetchUsers();
      }
    } catch (error) {
      console.error("Save User Error:", error);
      throw error;
    }
  }, [modalMode, selectedUser, fetchUsers]);

  const handleIdentityActionUnavailable = useCallback(() => {
    setUsersCommandNotice(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);
    toast.info(USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleInvite = useCallback(() => {
    handleIdentityActionUnavailable();
  }, [handleIdentityActionUnavailable]);

  const handleCreate = useCallback(() => {
    handleIdentityActionUnavailable();
  }, [handleIdentityActionUnavailable]);

  const handleOpenAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  // Open "Add" modal on page load if requested via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      handleCreate();
    }
  }, [handleCreate, location.search]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    const handleOpenInviteModal = () => handleInvite();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenUserAnalytics = () => handleOpenAnalytics();

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
  }, [handleCreate, handleInvite, handleOpenAnalytics]);

  const handleView = useCallback((user) => {
    setFocused(user?.id || null);
    setSelectedUser(user);
    setModalMode('view');
  }, [setFocused]);

  const handleEdit = useCallback((user) => {
    setSelectedUser(user);
    setModalMode('edit');
  }, []);

  const handleDeleteUnavailable = useCallback(() => {
    setUsersCommandNotice(USER_DELETE_UNAVAILABLE_MESSAGE);
    toast.info(USER_DELETE_UNAVAILABLE_MESSAGE);
    return false;
  }, []);


  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  // Selection Handlers
  const handleSelect = useCallback((id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(uid => uid !== id));
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(processedUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  }, [processedUsers]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key && prev.direction === 'desc') {
        return { key: '', direction: 'asc' }; // Reset
      }
      return {
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      };
    });
  }, []);

  const confirmDelete = useCallback((user) => {
    handleDeleteUnavailable(user);
  }, [handleDeleteUnavailable]);

  const handleBulkDelete = useCallback(() => {
    handleDeleteUnavailable();
  }, [handleDeleteUnavailable]);

  const handleModalClose = useCallback(() => {
    setSelectedUser(null);
    setModalMode(null);
  }, []);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search users...',
    },
    {
      key: 'role',
      type: 'multiselect',
      label: 'Role',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'provider', label: 'Provider' },
        { value: 'patient', label: 'Patient' },
      ]
    },
    {
      key: 'bvn_verified',
      type: 'select',
      label: 'Verification',
      options: [
        { value: 'all', label: 'All' },
        { value: 'verified', label: 'Verified Only' },
        { value: 'unverified', label: 'Unverified Only' }
      ]
    },
    {
      key: 'provider_type',
      type: 'multiselect',
      label: 'Provider Type',
      dependsOn: { key: 'role', value: 'provider' },
      options: [
        { value: 'Doctor', label: 'Doctor' },
        { value: 'Nurse', label: 'Nurse' },
        { value: 'Specialist', label: 'Specialist' },
        { value: 'Pharmacist', label: 'Pharmacist' }
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Joined Date',
      placeholder: 'Select dates'
    }
  ], []);

  // View toggle component
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  // Filter button component
  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-muted hover:text-muted-foreground relative"
      aria-label="Filter users"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.role && filters.role.length > 0) || (filters.bvn_verified && filters.bvn_verified.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-muted" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add User)
  const headerActions = React.useMemo(() => (
    (isAdmin() || isOrgAdmin()) && (
      <Button
        onClick={handleInvite}
        className="bg-card/70 h-9 px-4 text-[10px] font-bold text-foreground"
        aria-label="Add user unavailable"
        aria-describedby={usersCommandNotice ? 'users-action-feedback' : undefined}
        data-state="unavailable"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">ADD USER</span>
        <span className="md:hidden">ADD</span>
      </Button>
    )
  ), [isAdmin, isOrgAdmin, handleInvite, usersCommandNotice]);

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30 text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {users.length} Users</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, users.length]);

  usePageFooter(footerContent, 'pagination', !loading && users.length > 0);

  usePageShell({ bleed: true, hideFab: true });

  usePageHeader(
    'User Management',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent,
    isAdmin() ? (
      <Button
        onClick={() => setShowStatistics(!showStatistics)}
        variant="ghost"
        size="icon"
        className={`squircle h-9 w-9 ${showStatistics ? 'bg-muted text-muted-foreground' : 'hover:bg-muted hover:text-muted-foreground'}`}
        aria-label="Toggle statistics"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
    ) : null
  );

  // Bulk Action Bar Component
  const BulkActionBar = useMemo(() => (
    <LayoutGroup>
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ x: 50, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 50, opacity: 0, scale: 0.9 }}
          className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 shadow-none rounded-pill"
        >
          <div className="bg-foreground text-background text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-pill flex items-center justify-center shadow-sm mb-1">
            {selectedIds.length}
          </div>

          {isAdmin() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              className="h-10 w-10 rounded-icon bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              title="Delete unavailable"
              aria-label="Delete unavailable"
              data-state="unavailable"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}

          <div className="w-8 h-2 my-0.5" aria-hidden="true" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedIds([])}
            className="h-8 w-8 rounded-icon hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title="Clear Selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </LayoutGroup>
  ), [selectedIds, isAdmin, handleBulkDelete]);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Users" description="User Management Mission Control" />
        {usersCommandNotice && (
          <div
            id="users-action-feedback"
            role="status"
            aria-live="polite"
            className="mx-4 mb-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
          >
            {usersCommandNotice}
          </div>
        )}
        <MobileUsers
          users={processedUsers}
          loading={loading}
          statistics={statistics}
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
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />

        {/* Modals & Sheets */}
        <UserModal
          isOpen={modalMode === 'create' || modalMode === 'edit' || modalMode === 'view'}
          onClose={handleModalClose}
          user={selectedUser}
          mode={modalMode}
          onSave={handleSaveUser}
        />

        <InviteUserModal
          isOpen={modalMode === 'invite'}
          onClose={handleModalClose}
          onInvited={fetchUsers}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          isMobile={isMobile}
        />

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

        {/* Global Overlays */}
        {BulkActionBar}

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={statistics}
          type="user"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="User Management" description="Manage user profiles, roles, and verifications." />
      {usersCommandNotice && (
        <div
          id="users-action-feedback"
          role="status"
          aria-live="polite"
          className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          {usersCommandNotice}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
        <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
          <UsersSignalPanel
            stats={statistics}
            users={processedUsers}
            loading={loading}
            kpiFilter={filters.kpiFilter}
            setKpiFilter={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />
          <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        {/* Admin Statistics Section */}
        {isAdmin() && showStatistics && statistics && (
        <div className="rounded-card bg-background/35 p-6 mb-6">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
            User Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-muted-foreground">{statistics.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{statistics.emailVerifiedUsers}</div>
              <div className="text-sm text-muted-foreground">Email Verified</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-muted-foreground">{statistics.recentSignups}</div>
              <div className="text-sm text-muted-foreground">Recent (30d)</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-amber-700 dark:text-amber-200">{statistics.totalProfiles}</div>
              <div className="text-sm text-muted-foreground">Profiles</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Role Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statistics.roleDistribution).map(([role, count]) => (
                <span key={role} className="inline-flex items-center rounded-pill bg-muted text-muted-foreground px-3 py-1 text-xs font-medium">
                  {role}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User List Content */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {users.length === 0 ? (
            <div className="rounded-card bg-card/70 p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-bold text-xl mb-2">
                {filters.search ? 'No Users Found' :
                  filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ? 'No Users Yet' :
                    'No Matching Users'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {filters.search ? `No users found matching "${filters.search}". Try adjusting your search terms.` :
                  filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ?
                    'Create your first user to get started with managing your system.' :
                    'Try adjusting your filters or search criteria to find the users you\'re looking for.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {filters.search && (
                  <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="rounded-button">
                    <X className="h-4 w-4 mr-2" />
                    Clear Search
                  </Button>
                )}
                {(filters.kpiFilter !== 'all' || Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => filters[k])) && (
                  <Button onClick={() => setFilters({ kpiFilter: 'all', role: '', bvn_verified: '', provider_type: '', search: '' })} variant="outline" className="rounded-button">
                    <Filter className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                )}
                <Button
                  onClick={handleInvite}
                  className="bg-card/70 h-9 px-4 text-[10px] font-bold text-foreground"
                  aria-label="Add user unavailable"
                  aria-describedby={usersCommandNotice ? 'users-action-feedback' : undefined}
                  data-state="unavailable"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ADD USER
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <LayoutGroup>
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
                  >
                    {processedUsers.map((user, index) => (
                      <motion.div
                        layout
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="col-span-1"
                      >
                        <div
                          onClick={() => setFocused(user.id)}
                          data-state={isFocused(user.id) ? 'selected' : 'idle'}
                          className={`h-full rounded-card p-6 group relative overflow-hidden flex flex-col cursor-pointer transition-shadow ${isFocused(user.id) ? 'bg-card shadow-[0_18px_54px_rgb(0_0_0/0.14)]' : 'bg-card/70'}`}
                        >
                          {/* Apple hover glow effect */}
                          {/* Top Right Icon */}
                          <div className="absolute top-0 right-0 p-5 z-20">
                            <div className="relative">
                              <div className="absolute inset-0 bg-muted rounded-pill scale-150" />
                              <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                {user.role === 'admin' ? <Shield className="h-5 w-5 text-muted-foreground" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4 relative z-10">
                            <span className="inline-flex items-center rounded-pill bg-muted text-muted-foreground px-3 py-1 text-xs font-medium">
                              {user.role || 'patient'}
                            </span>
                            {user.bvn_verified && (
                              <span className="inline-flex items-center rounded-pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 px-2 py-1 text-xs font-medium">
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-16 h-16 rounded-icon bg-muted/20 flex items-center justify-center overflow-hidden shadow-inner">
                              {(user.image_uri || user.avatar_url) ? (
                                <img
                                  src={user.image_uri || user.avatar_url}
                                  alt={user.username || user.profile_username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.profile_username}`;
                                  }}
                                />
                              ) : (
                                <span className="text-2xl font-bold text-muted-foreground">
                                  {(user.username || user.profile_username || 'Unknown User')?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-xl tracking-tight truncate w-40">
                                {user.full_name || user.username || user.profile_username || 'Unknown User'}
                              </h3>
                              {user.provider_type && (
                                <p className="text-sm font-medium text-muted-foreground">{user.provider_type}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6 relative z-10">
                            <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate font-normal">{user.email || 'No email'}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                                <Phone className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
                                <span className="font-normal">{user.phone}</span>
                              </div>
                            )}
                            {user.last_sign_in_at && (
                              <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                <span className="font-normal">
                                  Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(user)}
                              className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold text-foreground"
                              aria-label={`View details for ${user.username || user.profile_username || 'user'}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              VIEW
                            </Button>
                            {(isAdmin() || isOrgAdmin()) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(user)}
                                  className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold text-foreground"
                                  aria-label={`Edit ${user.username || user.profile_username || 'user'}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  EDIT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmDelete(user)}
                                  className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold text-muted-foreground"
                                  aria-label={`Delete unavailable for ${user.username || user.profile_username || 'user'}`}
                                  aria-describedby={usersCommandNotice ? 'users-action-feedback' : undefined}
                                  data-state="unavailable"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  NOT READY
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </LayoutGroup>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <UserListView
                  users={processedUsers}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={confirmDelete}
                  onFocus={setFocused}
                  isAdmin={isAdmin()}
                />
              )}


              {/* Table View */}
              {viewMode === 'table' && (
                <UserTableView
                  users={processedUsers}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={confirmDelete}
                  onFocus={setFocused}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  isAdmin={isAdmin()}
                />
              )}
            </>
          )}
        </>
      )}

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          loading={loading}
        />
          </div>
        </section>

        <UsersDetailRail user={focusedUser} onView={handleView} />
      </div>

      {/* Modals & Overlays */}
      {BulkActionBar}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
        isLoading={confirmationModal.isLoading}
      />

      {
        modalMode === 'invite' && (
          <InviteUserModal
            isOpen={true}
            onClose={handleModalClose}
            onInviteSuccess={() => {
              handleModalClose();
              fetchUsers();
            }}
          />
        )
      }

      {
        (modalMode === 'create' || modalMode === 'edit' || modalMode === 'view') && (
          <UserModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            user={selectedUser}
            mode={modalMode}
            onSave={handleSaveUser}
          />
        )
      }

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={statistics}
        type="user"
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />
    </div >
  );
};
