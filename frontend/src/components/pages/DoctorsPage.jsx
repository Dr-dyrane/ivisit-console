import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getDoctors, deleteDoctor } from '../../services/doctorsService';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Stethoscope, Plus, Edit, Trash2, Eye, Hospital, Star, Phone, ChevronRight, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorModal } from '../modals/DoctorModal';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { DoctorListView } from '../views/DoctorListView';
import { DoctorTableView } from '../views/DoctorTableView';
import { withTimeout } from '../../lib/utils';
import { SEOHead } from '../common/SEOHead';
import { ConfirmationModal } from '../modals/ConfirmationModal';

import { usePageData } from '../../contexts/PageDataContext';

export const DoctorsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, orgId, profile, can } = useAuth();
  const { isMobile } = useNavigation();
  const { doctorsData, refreshAllData } = usePageData();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'default'
  });

  const { viewMode, setViewMode } = useViewMode('doctors-page', 'grid');
  const pagination = usePagination(20);

  // Filter doctors based on KPI filter and other filters
  const filteredDoctors = useMemo(() => {
    let filtered = [...doctors];

    // Apply KPI filter
    if (filters.kpiFilter && filters.kpiFilter !== 'all') {
      filtered = filtered.filter(d => d.status === filters.kpiFilter);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.name || '').toLowerCase().includes(searchTerm) ||
        (d.first_name ? `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm) : false) ||
        (d.specialization || '').toLowerCase().includes(searchTerm) ||
        (d.phone || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter (from FilterSheet, can intersect with KPI)
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(d => filters.status.includes(d.status));
    }

    // Apply specialization filter
    if (filters.specialization && filters.specialization.length > 0) {
      filtered = filtered.filter(d => filters.specialization.includes(d.specialization));
    }

    // Apply Date Range filter
    if (filters.created_at) {
      const { start, end } = filters.created_at;
      if (start) {
        filtered = filtered.filter(d => new Date(d.created_at) >= new Date(start));
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(d => new Date(d.created_at) <= endDate);
      }
    }

    return filtered;
  }, [doctors, filters]);

  // Apply Client-Side Sorting
  const processedDoctors = useMemo(() => {
    let result = [...filteredDoctors];
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
  }, [filteredDoctors, sortConfig]);

  const paginatedDoctors = useMemo(() => {
    if (isAdmin() || isOrgAdmin()) {
      const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
      return processedDoctors.slice(startIndex, startIndex + pagination.itemsPerPage);
    }
    return processedDoctors;
  }, [processedDoctors, pagination.currentPage, pagination.itemsPerPage, isAdmin, isOrgAdmin]);

  // Reset pagination when filters change
  useEffect(() => {
    pagination.resetPagination();
  }, [filters, pagination.resetPagination]);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);

      // For admins and org admins, fetch all doctors for client-side filtering/sorting
      const isPrivileged = isAdmin() || isOrgAdmin();
      const limit = isPrivileged ? 1000 : pagination.itemsPerPage;
      const offset = isPrivileged ? 0 : pagination.paginationRange.start;

      const filter = { limit, offset };

      // RBAC: Org admins see only their organization's doctors
      if (!isAdmin() && isOrgAdmin() && orgId) {
        filter.hospital_id = orgId;
      }

      // Call Service
      const { data, count } = await withTimeout(getDoctors(filter), 8000, 'Failed to load doctors - timeout');

      if (isPrivileged) {
        // For privileged users, manage pagination client-side
        pagination.setTotalCount(data?.length || 0);
        setDoctors(data || []); // Store all for client-side filtering
      } else {
        pagination.setTotalCount(count || 0);
        setDoctors(data || []);
      }

    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error(error.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOrgAdmin, orgId, pagination.itemsPerPage, pagination.paginationRange.start]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors, pagination.currentPage]);

  const handleCreate = useCallback(() => {
    setSelectedDoctor(null);
    setModalMode('create');
  }, []);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => {
      handleCreate();
    };
    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };

    window.addEventListener('openDoctorModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      window.removeEventListener('openDoctorModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
    };
  }, [handleCreate]);

  const handleView = useCallback((doctor) => {
    setSelectedDoctor(doctor);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((doctor) => {
    setSelectedDoctor(doctor);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (doctor) => {
    try {
      await deleteDoctor(doctor.id);

      await createNotification(
        NotificationTypes.DOCTOR,
        NotificationActions.DELETED,
        doctor.id,
        { message: `Dr. ${doctor.name} has been removed from the system` }
      );
      toast.success('Doctor deleted successfully');
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Failed to delete doctor');
    }
  }, [fetchDoctors]);

  // Confirmation modal for delete
  const confirmDelete = useCallback((doctor) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Doctor',
      description: `Are you sure you want to delete Dr. ${doctor.name}? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(doctor)
    });
  }, [handleDelete]);

  // Selection Handlers
  const handleSelect = useCallback((id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(did => did !== id));
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(paginatedDoctors.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  }, [paginatedDoctors]);

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

  // Bulk delete handler
  const handleBulkDelete = useCallback(() => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Doctors',
      description: `Are you sure you want to delete ${selectedIds.length} doctors? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        try {
          // Delete all selected doctors
          await Promise.all(selectedIds.map(id => deleteDoctor(id)));
          toast.success(`${selectedIds.length} doctors deleted successfully`);
          setSelectedIds([]);
          fetchDoctors();
        } catch (err) {
          console.error("Bulk delete failed", err);
          toast.error("Failed to delete selected doctors");
        }
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedIds, fetchDoctors]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedDoctor(null);
    if (shouldRefresh) {
      fetchDoctors();
    }
  }, [fetchDoctors]);

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success',
      busy: 'bg-warning/20 text-warning',
      off_duty: 'bg-muted text-muted-foreground',
      on_call: 'bg-purple-500/20 text-purple-500',
    };
    return badges[status] || badges.available;
  };

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search doctors...'
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'busy', label: 'Busy' },
        { value: 'off_duty', label: 'Off Duty' },
        { value: 'on_call', label: 'On Call' },
      ]
    },
    {
      key: 'specialization',
      type: 'multiselect',
      label: 'Specialization',
      options: [
        { value: 'cardiology', label: 'Cardiology' },
        { value: 'neurology', label: 'Neurology' },
        { value: 'pediatrics', label: 'Pediatrics' },
        { value: 'general', label: 'General Practitioner' },
        { value: 'orthopedics', label: 'Orthopedics' },
        { value: 'dermatology', label: 'Dermatology' },
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Added Date',
      placeholder: 'Select dates'
    }
  ], []);

  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter doctors"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.specialization && filters.specialization.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleCreate}
      className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
      aria-label="Add new doctor"
    >
      <Plus className="h-4 w-4 mr-2" />
      ADD DOCTOR
    </Button>
  ), [handleCreate]);

  usePageHeader(
    "Medical Staff",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Doctors</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && doctors.length > 0);

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

          {(isAdmin() || isOrgAdmin()) && (
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
  ), [selectedIds, isAdmin, isOrgAdmin, handleBulkDelete]);

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Medical Staff" description="Manage doctors, specialists, and medical personnel." />
      <div className="pt-2" />

      {/* Bento Overview Cards - Show in all view modes */}
      {!loading && doctorsData?.stats && (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Total Doctors Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-sharp bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
                role="button"
                tabIndex={0}
                aria-label="Show all doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Stethoscope className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Staff</p>
                    {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.total || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                      {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Available Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'available' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'available' }))}
                role="button"
                tabIndex={0}
                aria-label="Filter by available doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.kpiFilter === 'available' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Badge className={`h-5 w-5 ${filters.kpiFilter === 'available' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200 p-0 border-0 bg-transparent flex items-center justify-center`}>
                        ✓
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
                    {filters.kpiFilter === 'available' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.available || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                      ONLINE
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* On Call Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className={`h-full min-h-[140px] squircle-3xl bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'on_call' ? 'ring-2 ring-purple-500 shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'on_call' }))}
                role="button"
                tabIndex={0}
                aria-label="Filter by on-call doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.kpiFilter === 'on_call' ? 'bg-purple-500/30' : 'bg-purple-500/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Phone className={`h-5 w-5 ${filters.kpiFilter === 'on_call' ? 'text-purple-500' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">On Call</p>
                    {filters.kpiFilter === 'on_call' && <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.onCall || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-purple-500/20 text-purple-500 border-0 font-bold text-xs">
                      STANDBY
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Busy Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'busy' ? 'ring-2 ring-warning shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'busy' }))}
                role="button"
                tabIndex={0}
                aria-label="Filter by busy doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.kpiFilter === 'busy' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Stethoscope className={`h-5 w-5 ${filters.kpiFilter === 'busy' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Busy</p>
                    {filters.kpiFilter === 'busy' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.busy || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-bold text-xs">
                      WITH PATIENTS
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Off Duty Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-wave bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'off_duty' ? 'ring-2 ring-muted shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'off_duty' }))}
                role="button"
                tabIndex={0}
                aria-label="Filter by off-duty doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.kpiFilter === 'off_duty' ? 'bg-muted/30' : 'bg-muted/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Star className={`h-5 w-5 ${filters.kpiFilter === 'off_duty' ? 'text-muted-foreground' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Off Duty</p>
                    {filters.kpiFilter === 'off_duty' && <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.off_duty || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-wave bg-muted/20 text-muted-foreground border-0 font-bold text-xs">
                      AWAY
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </LayoutGroup>
      )}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {viewMode === 'grid' && (
            doctors.length === 0 ? (
              <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-12 border-0 text-center">
                <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-bold text-xl mb-2">No Doctors Yet</h3>
                <p className="text-muted-foreground mb-6">Get started by adding your first doctor</p>
                <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-doctor-btn" aria-label="Add your first doctor">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Doctor
                </Button>
              </Card>
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
                  data-testid="doctors-grid"
                >
                  {paginatedDoctors.map((doctor, index) => (
                    <motion.div
                      layout
                      key={doctor.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="col-span-1"
                    >
                      <Card className="h-full geo-chamfer bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col" data-testid={`doctor - card - ${doctor.id} `}>

                        {/* Top Right Icon */}
                        <div className="absolute top-0 right-0 p-5 z-20">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                              <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 relative z-10">
                          <Badge className={`geo - badge ${getStatusBadge(doctor.status)} border - 0 font - black editorial - subtitle px - 3 py - 1`}>
                            {doctor.status || 'available'}
                          </Badge>
                        </div>

                        <h3 className="font-bold text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                          {doctor.name || 'Unknown Doctor'}
                        </h3>

                        <p className="text-sm text-primary font-medium mb-6 relative z-10">{doctor.specialization || 'General Practitioner'}</p>

                        <div className="space-y-3 mb-6 relative z-10">
                          {doctor.hospitals?.name && (
                            <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                              <Hospital className="h-4 w-4 text-info" />
                              <span className="truncate font-normal">{doctor.hospitals.name}</span>
                            </div>
                          )}
                          {doctor.phone && (
                            <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                              <Phone className="h-4 w-4 text-success" />
                              <span className="font-normal">{doctor.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                          <div className="p-3 geo-shard bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="h-4 w-4 text-warning fill-warning" />
                              <p className="text-xs text-muted-foreground font-medium">Rating</p>
                            </div>
                            <p className="font-bold text-xl">{doctor.rating || '4.5'}</p>
                          </div>
                          <div className="p-3 geo-shard bg-muted/30 hover:bg-muted/50 transition-colors">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Experience</p>
                            <p className="font-bold text-xl">{doctor.experience || '5'}y</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            ACTIONS
                          </div>

                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(doctor)}
                              className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              data-testid={`view - doctor - ${doctor.id} `}
                              aria-label={`View details for Dr. ${doctor.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(doctor)}
                              className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              data-testid={`edit - doctor - ${doctor.id} `}
                              aria-label={`Edit Dr. ${doctor.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doctor)}
                              className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              data-testid={`delete -doctor - ${doctor.id} `}
                              aria-label={`Delete Dr. ${doctor.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </LayoutGroup>
            )
          )}

          {viewMode === 'list' && (
            <DoctorListView
              doctors={paginatedDoctors}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={confirmDelete}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}

          {viewMode === 'table' && (
            <DoctorTableView
              doctors={paginatedDoctors}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={confirmDelete}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
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
          <DoctorModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            doctor={selectedDoctor}
            mode={modalMode}
          />
        )
      }

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        description={confirmationModal.description}
        onConfirm={confirmationModal.onConfirm}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

      {BulkActionBar}
    </div >
  );
};
