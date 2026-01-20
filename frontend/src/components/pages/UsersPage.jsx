import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { getProfiles, getUserStatistics, searchUsers } from '../../services/profilesService';
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
import { UserAnalyticsModal } from '../modals/UserAnalyticsModal';

export const UsersPage = () => {
  const { isAdmin } = useAuth();
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
      filtered = filtered.filter(u => u.role === 'admin');
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
    
    return filtered;
  }, [users, filters]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // For admins, include auth data
      const filterOptions = {
        includeAuthData: isAdmin(),
        limit: isAdmin() ? 1000 : pagination.itemsPerPage, // Get all for admins to calculate count
        offset: isAdmin() ? 0 : pagination.paginationRange.start,
        // Only pass service-compatible filters
        role: filters.role,
        provider_type: filters.provider_type,
        verified: filters.bvn_verified === 'verified' ? true : filters.bvn_verified === 'unverified' ? false : undefined,
      };
      
      // Use the enhanced service
      const data = await getProfiles(filterOptions);

      if (isAdmin()) {
        // Calculate total count and apply pagination for admins
        const totalCount = data.length;
        pagination.setTotalCount(totalCount);
        
        // Apply pagination manually
        const paginatedData = data.slice(
          pagination.paginationRange.start,
          pagination.paginationRange.start + pagination.itemsPerPage
        );
        setUsers(paginatedData);
        
        // Fetch statistics for admins
        const stats = await getUserStatistics();
        setStatistics(stats);
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

  const handleCreate = useCallback(() => {
    setSelectedUser(null);
    setModalMode('create');
  }, []);

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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      await createNotification(
        NotificationTypes.USER,
        NotificationActions.DELETED,
        user.id,
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

  const handleModalClose = useCallback(() => {
    setSelectedUser(null);
    setModalMode(null);
  }, []);
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedUser(null);
      setModalMode('create');
    };

    window.addEventListener('openUserModal', handleOpenModal);
    return () => {
      window.removeEventListener('openUserModal', handleOpenModal);
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
      options: [
        { value: 'Doctor', label: 'Doctor' },
        { value: 'Nurse', label: 'Nurse' },
        { value: 'Specialist', label: 'Specialist' },
        { value: 'Pharmacist', label: 'Pharmacist' }
      ]
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
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.role && filters.role.length > 0) || (filters.bvn_verified && filters.bvn_verified.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add User)
  const headerActions = React.useMemo(() => (
    isAdmin() && (
      <Button
        onClick={handleCreate}
        className="bg-muted/20 hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase text-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">ADD USER</span>
        <span className="md:hidden">ADD</span>
      </Button>
    )
  ), [isAdmin, handleCreate]);

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
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
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
    ) : null
  );

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      {/* KPI Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {/* Total Users Card */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card 
            className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
              filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
          >
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <Users className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Users</p>
                {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <h3 className="text-3xl font-black tracking-tighter">{users.length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-black text-xs">
                  {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Verified Users Card */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card 
            className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
              filters.kpiFilter === 'verified' ? 'ring-2 ring-success shadow-lg' : ''
            }`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'verified' }))}
          >
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'verified' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <UserCheck className={`h-5 w-5 ${filters.kpiFilter === 'verified' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Verified</p>
                {filters.kpiFilter === 'verified' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
              </div>
              <h3 className="text-3xl font-black tracking-tighter">{users.filter(u => u.bvn_verified).length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-round bg-success/20 text-success border-0 font-black text-xs">
                  VERIFIED
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Admin Users Card */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card 
            className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
              filters.kpiFilter === 'admin' ? 'ring-2 ring-warning shadow-lg' : ''
            }`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'admin' }))}
          >
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'admin' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <Shield className={`h-5 w-5 ${filters.kpiFilter === 'admin' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Admins</p>
                {filters.kpiFilter === 'admin' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
              </div>
              <h3 className="text-3xl font-black tracking-tighter">{users.filter(u => u.role === 'admin').length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-ticket bg-warning/20 text-warning border-0 font-black text-xs">
                  ADMIN ACCESS
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Providers Card */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card 
            className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
              filters.kpiFilter === 'provider' ? 'ring-2 ring-info shadow-lg' : ''
            }`}
            onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'provider' }))}
          >
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'provider' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <Users className={`h-5 w-5 ${filters.kpiFilter === 'provider' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Providers</p>
                {filters.kpiFilter === 'provider' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
              </div>
              <h3 className="text-3xl font-black tracking-tighter">{users.filter(u => u.role === 'provider').length}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-round bg-info/20 text-info border-0 font-black text-xs">
                  HEALTHCARE
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Analytics Card */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card 
            className="h-full min-h-[140px] geo-ticket bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
            onClick={handleViewAnalytics}
          >
            <div className="absolute top-0 right-0 p-4 z-20">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200" />
                <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Analytics</p>
              </div>
              <h3 className="text-3xl font-black tracking-tighter">View All</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-black text-xs">
                  DEEP DIVE
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      {/* Admin Statistics Section */}
      {isAdmin() && showStatistics && statistics && (
        <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 mb-6">
          <h3 className="font-black text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            User Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-primary">{statistics.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-success">{statistics.emailVerifiedUsers}</div>
              <div className="text-sm text-muted-foreground">Email Verified</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-info">{statistics.recentSignups}</div>
              <div className="text-sm text-muted-foreground">Recent (30d)</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-warning">{statistics.totalProfiles}</div>
              <div className="text-sm text-muted-foreground">Profiles</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Role Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statistics.roleDistribution).map(([role, count]) => (
                <Badge key={role} className={`bg-primary/20 text-primary border-0 font-black editorial-subtitle px-3 py-1`}>
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
            <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-12 border-0 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-black text-xl mb-2">
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
                <Button onClick={handleCreate} className="bg-muted/20 hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase text-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  ADD USER
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
                    {filteredUsers.map((user, index) => (
                      <motion.div
                        layout
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="col-span-1"
                      >
                        <Card className="h-full geo-ticket bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">
                          {/* Top Right Icon */}
                          <div className="absolute top-0 right-0 p-5 z-20">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                              <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                {user.role === 'admin' ? <Shield className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Badge className={`geo-badge bg-primary/20 text-primary border-0 font-black editorial-subtitle px-3 py-1`}>
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
                                <span className="text-2xl font-black text-muted-foreground">
                                  {(user.username || user.profile_username || 'Unknown User')?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-black text-xl tracking-tight truncate w-40">
                                {user.username || user.profile_username || 'Unknown User'}
                              </h3>
                              {user.provider_type && (
                                <p className="text-sm font-semibold text-primary">{user.provider_type}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6 relative z-10">
                            <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                              <Mail className="h-4 w-4 text-info" />
                              <span className="truncate font-medium">{user.email || 'No email'}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                                <Phone className="h-4 w-4 text-success" />
                                <span className="font-medium">{user.phone}</span>
                              </div>
                            )}
                            {user.last_sign_in_at && (
                              <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                                <UserCheck className="h-4 w-4 text-primary" />
                                <span className="font-medium">
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
                              className="flex-1 h-8 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-black tracking-widest uppercase text-foreground"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              VIEW
                            </Button>
                            {isAdmin() && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(user)}
                                  className="flex-1 h-8 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-black tracking-widest uppercase text-foreground"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  EDIT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(user)}
                                  className="flex-1 h-8 bg-destructive/20 hover:bg-destructive/30 border border-destructive/20 text-[10px] font-black tracking-widest uppercase text-destructive"
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
                  users={filteredUsers}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isAdmin={isAdmin()}
                />
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <UserTableView 
                  users={filteredUsers}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
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

      {
        modalMode && (
          <UserModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            user={selectedUser}
            mode={modalMode}
          />
        )
      }

      <UserAnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        data={statistics}
        users={users}
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
