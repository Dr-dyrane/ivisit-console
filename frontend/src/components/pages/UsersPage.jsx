import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
import { getProfiles, getUserStatistics, searchUsers, createProfile, updateProfile } from '../../services/profilesService';
import { getDoctorByProfileId, createDoctor } from '../../services/doctorsService';
import { createAmbulance } from '../../services/ambulancesService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Users, Plus, Edit, Trash2, Eye, Shield, UserCheck, ChevronRight, Phone, Mail, Filter, BarChart3, X } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { UserModal } from '../modals/UserModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { UserListView } from '../views/UserListView';
import { UserTableView } from '../views/UserTableView';
import { SEOHead } from '../common/SEOHead';

import { InviteUserModal } from '../modals/InviteUserModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { ReportsModal } from '../modals/ReportsModal';
import { CheckSquare, Archive } from 'lucide-react'; // Additional icons

export const UsersPage = () => {
  const { isAdmin, isOrgAdmin, orgId, profile, can } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [showStatistics, setShowStatistics] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
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

  const { viewMode, setViewMode } = useViewMode('users-page', 'grid');
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

  // Reset pagination when filters change
  useEffect(() => {
    pagination.resetPagination();
  }, [filters, pagination.resetPagination]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // For admins and org admins, we fetch all users (up to limit) to calculate accurate client-side stats/counts if server stats are limited
      const isPrivileged = isAdmin() || isOrgAdmin();
      const limit = isPrivileged ? 1000 : pagination.itemsPerPage;
      const offset = isPrivileged ? 0 : pagination.paginationRange.start;

      const filterOptions = {
        includeAuthData: isAdmin(), // Only platform admins get full access to auth data (emails/phones of all users)
        limit,
        offset,
        // Only pass service-compatible filters
        role: filters.role,
        provider_type: filters.provider_type,
        verified: filters.bvn_verified === 'verified' ? true : filters.bvn_verified === 'unverified' ? false : undefined,
      };

      // Use the enhanced service
      const data = await getProfiles(filterOptions);

      if (isPrivileged) {
        // Calculate total count and apply pagination for admins/org admins locally
        const totalCount = data.length;
        pagination.setTotalCount(totalCount);

        // Apply pagination manually
        const startIndex = pagination.itemsPerPage * (pagination.currentPage - 1);
        const paginatedData = data.slice(startIndex, startIndex + pagination.itemsPerPage);

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
            emailVerifiedUsers: totalUsers, // Fallback as auth data isn't fully available
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
        // Non-admin users get their own profile
        pagination.setTotalCount(data.length);
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, pagination.currentPage]);

  const handleSaveUser = useCallback(async (formData) => {
    try {
      let savedProfile;
      if (modalMode === 'edit' && selectedUser?.id) {
        savedProfile = await updateProfile(selectedUser.id, formData);

        // Auto-link logic for providers
        if (formData.role === 'provider' && formData.provider_type) {
          if (formData.provider_type === 'doctor') {
            const existingDoctor = await getDoctorByProfileId(selectedUser.id);
            if (!existingDoctor) {
              await createDoctor({
                profile_id: selectedUser.id,
                name: formData.full_name || formData.username,
                email: formData.email,
                phone: formData.phone,
                hospital_id: formData.organization_id,
                status: 'available'
              });
              toast.info('Professional doctor record created automatically');
            }
          } else if (formData.provider_type === 'ambulance') {
            // Check if ambulance exists (assuming profile_id maps 1:1 for now)
            const { data: existingAmbulance } = await supabase.from('ambulances').select('id').eq('profile_id', selectedUser.id).single();
            if (!existingAmbulance) {
              await createAmbulance({
                profile_id: selectedUser.id,
                call_sign: formData.username,
                hospital_id: formData.organization_id,
                status: 'available',
                type: 'Basic'
              });
              toast.info('Ambulance record created automatically');
            }
          }
        }

        fetchUsers();
      } else if (modalMode === 'create') {
        // Manual creation logic (truncated for brevity in diff)
        if (!formData.id) {
          throw new Error("Cannot create user manually without 'Invite' flow. Please use 'Invite User' to create new users with secure access.");
        }
        savedProfile = await createProfile(formData);

        // Auto-link logic for create mode
        if (formData.role === 'provider' && formData.provider_type) {
          if (formData.provider_type === 'doctor') {
            await createDoctor({
              profile_id: savedProfile.id,
              name: formData.full_name || formData.username,
              email: formData.email,
              phone: formData.phone,
              hospital_id: formData.organization_id,
              status: 'available'
            });
            toast.info('Professional doctor record created automatically');
          } else if (formData.provider_type === 'ambulance') {
            await createAmbulance({
              profile_id: savedProfile.id,
              call_sign: formData.username,
              hospital_id: formData.organization_id,
              status: 'available',
              type: 'Basic'
            });
            toast.info('Ambulance record created automatically');
          }
        }

        fetchUsers();
      }
    } catch (error) {
      console.error("Save User Error:", error);
      throw error;
    }
  }, [modalMode, selectedUser, fetchUsers]);

  const handleInvite = useCallback(() => {
    setSelectedUser(null);
    setModalMode('invite');
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedUser(null);
    setModalMode('create');
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

    window.addEventListener('openUserModal', handleOpenModal);
    window.addEventListener('openInviteUserModal', handleOpenInviteModal);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      window.removeEventListener('openUserModal', handleOpenModal);
      window.removeEventListener('openInviteUserModal', handleOpenInviteModal);
      window.removeEventListener('openFilters', handleOpenFilters);
    };
  }, [handleCreate, handleInvite]);

  const handleView = useCallback((user) => {
    setSelectedUser(user);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((user) => {
    setSelectedUser(user);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (user) => {
    try {
      const targetId = user.id || user.user_id; // Check for alternate keys
      if (!targetId) {
        throw new Error("Could not determine user ID for deletion");
      }

      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: targetId });

      if (error) throw error;

      await createNotification(
        NotificationTypes.USER,
        NotificationActions.DELETED,
        targetId,
        { message: `User ${user.username} has been removed from the system` }
      );
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  }, [fetchUsers]);

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

  // Delete handlers with Confirmation
  const confirmDelete = useCallback((user) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete User',
      description: `Are you sure you want to delete ${user.full_name || user.username}? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(user)
    });
  }, [handleDelete]);

  const handleBulkDelete = useCallback(() => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Users',
      description: `Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        // Logic to delete multiple
        try {
          // In a real app, use a bulk delete API. Here we assume one by one or loop.
          // Supabase 'in' query is better.
          const { error } = await supabase.from('profiles').delete().in('id', selectedIds);
          if (error) throw error;
          toast.success(`${selectedIds.length} users deleted successfully`);
          setSelectedIds([]);
          fetchUsers();
        } catch (err) {
          console.error("Bulk delete failed", err);
          toast.error("Failed to delete selected users");
        }
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedIds, fetchUsers]);

  const handleModalClose = useCallback(() => {
    setSelectedUser(null);
    setModalMode(null);
  }, []);
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedUser(null);
      setModalMode('create');
    };

    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    window.addEventListener('openUserModal', handleOpenModal);
    window.addEventListener('openUserAnalytics', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openUserModal', handleOpenModal);
      window.removeEventListener('openUserAnalytics', handleOpenAnalytics);
    };
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
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add User)
  const headerActions = React.useMemo(() => (
    (isAdmin() || isOrgAdmin()) && (
      <Button
        onClick={handleInvite}
        className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
        aria-label="Invite new user"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">INVITE USER</span>
        <span className="md:hidden">INVITE</span>
      </Button>
    )
  ), [isAdmin, isOrgAdmin, handleInvite]);

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {users.length} Users</span>
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
          className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 backdrop-blur-sm border-0 shadow-none rounded-full"
        >
          <div className="bg-primary text-primary-foreground text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-full flex items-center justify-center shadow-sm mb-1">
            {selectedIds.length}
          </div>

          {isAdmin() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              className="h-10 w-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
              title="Delete Selected"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}

          <div className="w-8 h-[1px] bg-white/10 my-0.5" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedIds([])}
            className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title="Clear Selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </LayoutGroup>
  ), [selectedIds, isAdmin, handleBulkDelete]);

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="User Management" description="Manage user profiles, roles, and verifications." />
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
          <Card
            className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-primary" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <Users className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Users</p>
              <h3 className="text-3xl font-bold tracking-tighter">{statistics?.totalUsers || pagination.totalCount || processedUsers.length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                  {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Verified Users Card - Visible to Everyone */}
        <motion.div
          layout
          className="col-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card
            className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'verified' ? 'ring-2 ring-success shadow-lg' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'verified' }))}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-success" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'verified' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
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
                <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">VERIFIED</Badge>
              </div>
            </div>
          </Card>
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
            <Card
              className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'admin' ? 'ring-2 ring-warning shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'admin' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-warning" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'admin' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
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
                  <Badge className="geo-ticket bg-warning/20 text-warning border-0 font-bold text-xs">MANAGEMENT</Badge>
                </div>
              </div>
            </Card>
          ) : (
            /* Org Admin View: Providers */
            <Card
              className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'provider' ? 'ring-2 ring-info shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'provider' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'provider' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
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
                  <Badge className="geo-round bg-info/20 text-info border-0 font-bold text-xs">MEDICAL STAFF</Badge>
                </div>
              </div>
            </Card>
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
            <Card
              className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'provider' ? 'ring-2 ring-info shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'provider' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'provider' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Users className={`h-5 w-5 ${filters.kpiFilter === 'provider' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Providers</p>
                <h3 className="text-3xl font-bold tracking-tighter">{statistics?.roleDistribution?.provider || processedUsers.filter(u => u.role === 'provider').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-info/20 text-info border-0 font-bold text-xs">HEALTHCARE</Badge>
                </div>
              </div>
            </Card>
          ) : (
            /* Org Admin View: Patients */
            <Card
              className="h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'patient' }))} // Note: need to handle patient filter
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-secondary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-secondary/10 blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200" />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
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
                  <Badge className="geo-round bg-secondary/20 text-secondary border-0 font-bold text-xs">CONSUMERS</Badge>
                </div>
              </div>
            </Card>
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
          <Card
            className="h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
            onClick={handleViewAnalytics}
          >
            {/* Apple hover glow effect */}
            <div className="hover-glow hover-glow-primary" />
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200" />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Analytics</p>
              <h3 className="text-3xl font-bold tracking-tighter">View All</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">DEEP DIVE</Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      {/* Admin Statistics Section */}
      {isAdmin() && showStatistics && statistics && (
        <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 mb-6">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            User Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-semibold text-primary">{statistics.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-semibold text-success">{statistics.emailVerifiedUsers}</div>
              <div className="text-sm text-muted-foreground">Email Verified</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-semibold text-info">{statistics.recentSignups}</div>
              <div className="text-sm text-muted-foreground">Recent (30d)</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-semibold text-warning">{statistics.totalProfiles}</div>
              <div className="text-sm text-muted-foreground">Profiles</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Role Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statistics.roleDistribution).map(([role, count]) => (
                <Badge key={role} className={`bg-primary/20 text-primary border-0 font-bold editorial-subtitle px-3 py-1`}>
                  {role}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* User List Content */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {users.length === 0 ? (
            <Card className="squircle-lg glass-card-premium p-12 text-center">
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
                  <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle">
                    <X className="h-4 w-4 mr-2" />
                    Clear Search
                  </Button>
                )}
                {(filters.kpiFilter !== 'all' || Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => filters[k])) && (
                  <Button onClick={() => setFilters({ kpiFilter: 'all', role: '', bvn_verified: '', provider_type: '', search: '' })} variant="outline" className="squircle">
                    <Filter className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                )}
                <Button onClick={handleInvite} className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase">
                  <Plus className="h-4 w-4 mr-2" />
                  INVITE USER
                </Button>
              </div>
            </Card>
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
                        <Card className="h-full geo-ticket glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                          {/* Apple hover glow effect */}
                          <div className="hover-glow hover-glow-primary" />
                          {/* Top Right Icon */}
                          <div className="absolute top-0 right-0 p-5 z-20">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                              <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                {user.role === 'admin' ? <Shield className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Badge className={`geo-badge bg-primary/20 text-primary border-0 font-bold editorial-subtitle px-3 py-1`}>
                              {user.role || 'patient'}
                            </Badge>
                            {user.bvn_verified && (
                              <Badge className="geo-badge bg-success/20 text-success border-0 px-2 py-1">
                                Verified
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-16 h-16 geo-hexagon bg-muted/20 flex items-center justify-center overflow-hidden shadow-inner">
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
                            <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                              <Mail className="h-4 w-4 text-info" />
                              <span className="truncate font-normal">{user.email || 'No email'}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                                <Phone className="h-4 w-4 text-success" />
                                <span className="font-normal">{user.phone}</span>
                              </div>
                            )}
                            {user.last_sign_in_at && (
                              <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
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
                              className="flex-1 h-8 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-bold tracking-widest uppercase text-foreground"
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
                                  className="flex-1 h-8 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-bold tracking-widest uppercase text-foreground"
                                  aria-label={`Edit ${user.username || user.profile_username || 'user'}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  EDIT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmDelete(user)}
                                  className="flex-1 h-8 bg-destructive/20 hover:bg-destructive/30 border border-destructive/20 text-[10px] font-bold tracking-widest uppercase text-destructive"
                                  aria-label={`Delete ${user.username || user.profile_username || 'user'}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  DELETE
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
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
        onConfirm={() => {
          confirmationModal.onConfirm();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
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

      <ReportsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analyticsData={statistics}
        initialType="user"
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
