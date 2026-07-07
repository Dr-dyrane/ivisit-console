import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
import { getProfiles, getUserStatistics, searchUsers, createProfile, updateProfile } from '../../services/profilesService';
import { getOrganizations } from '../../services/organizationsService';
import { getDoctorByProfileId, createDoctor } from '../../services/doctorsService';
import { createAmbulance } from '../../services/ambulancesService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Users, Plus, Edit, Trash2, Eye, Shield, UserCheck, ChevronRight, Phone, Mail, Filter, BarChart3, X } from 'lucide-react';
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

import { InviteUserModal } from '../modals/InviteUserModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileUsers } from '../mobile/MobileUsers';
import { CheckSquare, Archive } from 'lucide-react'; // Additional icons

const USER_DELETE_UNAVAILABLE_MESSAGE = 'Delete is unavailable until identity authority is verified.';
const USER_IDENTITY_ACTION_UNAVAILABLE_MESSAGE = 'Invites are not ready until identity authority is verified.';

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
    setSelectedUser(user);
    setModalMode('view');
  }, []);

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
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter users"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.role && filters.role.length > 0) || (filters.bvn_verified && filters.bvn_verified.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add User)
  const headerActions = React.useMemo(() => (
    (isAdmin() || isOrgAdmin()) && (
      <Button
        onClick={handleInvite}
        className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
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
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/5 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {users.length} Users</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, users.length]);

  usePageFooter(footerContent, 'pagination', !loading && users.length > 0);

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
        className={`squircle h-9 w-9 ${showStatistics ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'}`}
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
          className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 backdrop-blur-sm shadow-none rounded-pill"
        >
          <div className="bg-primary text-primary-foreground text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-pill flex items-center justify-center shadow-sm mb-1">
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
      {/* KPI Filter Cards */}
      {/* KPI Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {/* Total Users Card - Visible to Everyone */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className={`h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'bg-primary/10 shadow-lg' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-primary" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <Users className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Users</p>
              <h3 className="text-3xl font-bold tracking-tighter">{statistics?.totalUsers || pagination.totalCount || processedUsers.length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="rounded-pill bg-primary/20 text-primary font-bold text-xs">
                  {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verified Users Card - Visible to Everyone */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div
            className={`h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'verified' ? 'bg-success/10 shadow-lg' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'verified' }))}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-success" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'verified' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <UserCheck className={`h-5 w-5 ${filters.kpiFilter === 'verified' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Verified</p>
              {/* Prioritize statistics.bvnVerifiedUsers (Server Truth) */}
              <h3 className="text-3xl font-bold tracking-tighter">
                {statistics?.bvnVerifiedUsers !== undefined ? statistics.bvnVerifiedUsers : processedUsers.filter(u => u.bvn_verified).length}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="rounded-pill bg-success/20 text-success font-bold text-xs">VERIFIED</Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Role Based Card 1: Admins (Platform) or Providers (Org) */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {isAdmin() ? (
            /* Admin View: Admins & Org Admins */
            <div
              className={`h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'admin' ? 'bg-warning/10 shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'admin' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-warning" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'admin' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Shield className={`h-5 w-5 ${filters.kpiFilter === 'admin' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admins & Managers</p>
                <h3 className="text-3xl font-bold tracking-tighter">
                  {(statistics?.roleDistribution?.admin || 0) + (statistics?.roleDistribution?.org_admin || 0) || processedUsers.filter(u => ['admin', 'org_admin'].includes(u.role)).length}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="rounded-pill bg-warning/20 text-warning font-bold text-xs">MANAGEMENT</Badge>
                </div>
              </div>
            </div>
          ) : (
            /* Org Admin View: Providers */
            <div
              className={`h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'provider' ? 'bg-info/10 shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'provider' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'provider' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Users className={`h-5 w-5 ${filters.kpiFilter === 'provider' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Providers</p>
                <h3 className="text-3xl font-bold tracking-tighter">
                  {statistics?.roleDistribution?.provider || processedUsers.filter(u => u.role === 'provider').length}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="rounded-pill bg-info/20 text-info font-bold text-xs">MEDICAL STAFF</Badge>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Role Based Card 2: Providers (Platform) or Patients (Org) */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {isAdmin() ? (
            /* Admin View: Providers */
            <div
              className={`h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'provider' ? 'bg-info/10 shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'provider' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'provider' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Users className={`h-5 w-5 ${filters.kpiFilter === 'provider' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Providers</p>
                <h3 className="text-3xl font-bold tracking-tighter">{statistics?.roleDistribution?.provider || processedUsers.filter(u => u.role === 'provider').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="rounded-pill bg-info/20 text-info font-bold text-xs">HEALTHCARE</Badge>
                </div>
              </div>
            </div>
          ) : (
            /* Org Admin View: Patients */
            <div
              className="h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'patient' }))} // Note: need to handle patient filter
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-secondary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-secondary/10 blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200" />
                  <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Users className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Patients</p>
                <h3 className="text-3xl font-bold tracking-tighter">
                  {statistics?.roleDistribution?.patient || processedUsers.filter(u => u.role === 'patient').length}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="rounded-pill bg-secondary/20 text-secondary font-bold text-xs">CONSUMERS</Badge>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Analytics Card - Visible to Everyone */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div
            className="h-full min-h-[140px] rounded-card glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
            onClick={handleViewAnalytics}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-primary" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-pill scale-150 transition-all duration-200 group-hover:scale-200" />
                <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Analytics</p>
              <h3 className="text-3xl font-bold tracking-tighter">View All</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="rounded-pill bg-primary/20 text-primary font-bold text-xs">DEEP DIVE</Badge>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Admin Statistics Section */}
      {isAdmin() && showStatistics && statistics && (
        <div className="rounded-card bg-background/35 backdrop-blur-xs shadow-premium p-6 mb-6">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            User Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-primary">{statistics.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-success">{statistics.emailVerifiedUsers}</div>
              <div className="text-sm text-muted-foreground">Email Verified</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-info">{statistics.recentSignups}</div>
              <div className="text-sm text-muted-foreground">Recent (30d)</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-inner">
              <div className="text-2xl font-semibold text-warning">{statistics.totalProfiles}</div>
              <div className="text-sm text-muted-foreground">Profiles</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Role Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statistics.roleDistribution).map(([role, count]) => (
                <Badge key={role} className="rounded-pill bg-primary/20 text-primary font-bold editorial-subtitle px-3 py-1">
                  {role}: {count}
                </Badge>
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
            <div className="rounded-card glass-card-premium p-12 text-center">
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
                  className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
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
                        <div className="h-full rounded-card glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                          {/* Apple hover glow effect */}
                          <div className="hover-glow hover-glow-primary" />
                          {/* Top Right Icon */}
                          <div className="absolute top-0 right-0 p-5 z-20">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-pill scale-150" />
                              <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                {user.role === 'admin' ? <Shield className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Badge className="rounded-pill bg-primary/20 text-primary font-bold editorial-subtitle px-3 py-1">
                              {user.role || 'patient'}
                            </Badge>
                            {user.bvn_verified && (
                              <Badge className="rounded-pill bg-success/20 text-success px-2 py-1">
                                Verified
                              </Badge>
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
                                <p className="text-sm font-medium text-primary">{user.provider_type}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6 relative z-10">
                            <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                              <Mail className="h-4 w-4 text-info" />
                              <span className="truncate font-normal">{user.email || 'No email'}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                                <Phone className="h-4 w-4 text-success" />
                                <span className="font-normal">{user.phone}</span>
                              </div>
                            )}
                            {user.last_sign_in_at && (
                              <div className="flex items-center gap-3 text-sm p-2 rounded-inner bg-muted/30">
                                <UserCheck className="h-4 w-4 text-primary" />
                                <span className="font-normal">
                                  Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-auto flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(user)}
                              className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold tracking-widest uppercase text-foreground"
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
                                  className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold tracking-widest uppercase text-foreground"
                                  aria-label={`Edit ${user.username || user.profile_username || 'user'}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  EDIT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmDelete(user)}
                                  className="flex-1 h-8 rounded-button bg-muted/20 hover:bg-muted/30 text-[10px] font-bold tracking-widest uppercase text-muted-foreground"
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
