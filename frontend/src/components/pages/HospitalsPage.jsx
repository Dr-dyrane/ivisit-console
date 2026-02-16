import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { createHospital, updateHospital, getHospitals, getHospital } from '../../services/hospitalsService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Hospital, MapPin, Star, Bed, Ambulance, Plus, Edit, Trash2, Eye, ChevronRight, Filter, BarChart3, Globe, Calendar } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { HospitalModal } from '../modals/HospitalModal';
import { ReportsModal } from '../modals/ReportsModal';
import StaffSchedulingModal from '../modals/StaffSchedulingModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { HospitalListView } from '../views/HospitalListView';
import { HospitalTableView } from '../views/HospitalTableView';
import { SEOHead } from '../common/SEOHead';
import { ConfirmationModal } from '../modals/ConfirmationModal';

import { usePageData } from '../../contexts/PageDataContext';

export const HospitalsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isOrgAdmin, isProvider, orgId, profile, can } = useAuth();
  const location = useLocation();
  const { isMobile } = useNavigation();
  const { hospitalsData, refreshAllData } = usePageData();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Delete'
  });

  const { viewMode, setViewMode } = useViewMode('hospitals-page', 'grid');
  const pagination = usePagination(20);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);

      // Check if we have a specific hospital ID in URL
      const params = new URLSearchParams(location.search);
      const hospitalId = params.get('id');

      if (hospitalId) {
        // Use existing getHospital function
        const specificHospital = await getHospital(hospitalId);

        setHospitals(specificHospital ? [specificHospital] : []);
        pagination.setTotalCount(specificHospital ? 1 : 0);

        // Auto-open the modal for this hospital
        if (specificHospital) {
          setSelectedHospital(specificHospital);
          setModalMode('view');
        }
        return;
      }

      // Otherwise, fetch all hospitals using the existing service
      const data = await getHospitals({
        limit: pagination.pageSize,
        offset: pagination.paginationRange.start
      });

      // Get total count for pagination
      const totalCount = await getHospitals();
      pagination.setTotalCount(totalCount.length);

      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [pagination, location.search]);

  useEffect(() => {
    fetchHospitals();

    // Real-time updates
    const channel = supabase
      .channel('hospitals_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        fetchHospitals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHospitals, pagination.currentPage, location.search]);

  const handleCreate = useCallback(() => {
    setSelectedHospital(null);
    setModalMode('create');
  }, []);

  // Open "Add" modal on page load if requested via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle add=true parameter
    if (params.get('add') === 'true') {
      handleCreate();
    }
    // Note: id parameter is now handled in fetchHospitals function
  }, [handleCreate, location.search]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);

    window.addEventListener('openHospitalModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openReportsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openHospitalModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openReportsModal', handleOpenAnalytics);
    };
  }, [handleCreate]);

  const handleView = useCallback((hospital) => {
    setSelectedHospital(hospital);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((hospital) => {
    setSelectedHospital(hospital);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback((hospital) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Hospital',
      description: `Are you sure you want to delete ${hospital.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          // FIX: Direct supabase.from('hospitals').delete() fails silently (200, 0 rows)
          // because the FOR ALL RLS policy using get_current_user_role() doesn't match
          // rows for DELETE operations even when the caller IS admin.
          // SECURITY DEFINER RPC bypasses RLS entirely. See migration 20260216070700.
          const { error } = await supabase.rpc('delete_hospital_by_admin', {
            target_hospital_id: hospital.id
          });

          if (error) throw error;

          await createNotification(
            NotificationTypes.HOSPITAL,
            NotificationActions.DELETED,
            hospital.id,
            { message: `${hospital.name} has been removed from the network` }
          );
          toast.success('Hospital deleted successfully');
          fetchHospitals();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting hospital:', error);
          handleApiError(error, 'delete');
        }
      }
    });
  }, [fetchHospitals]);

  const handleSave = useCallback(async (formData) => {
    try {
      if (modalMode === 'create') {
        const newHospital = await createHospital(formData);
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.CREATED,
          newHospital.id,
          { message: `${newHospital.name} has been added to the network` }
        );
        toast.success('Hospital created successfully');
      } else if (modalMode === 'edit') {
        const updatedHospital = await updateHospital(selectedHospital.id, formData);
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.UPDATED,
          updatedHospital.id,
          { message: `${updatedHospital.name} has been updated` }
        );
        toast.success('Hospital updated successfully');
      }
      return true;
    } catch (error) {
      console.error('Error saving hospital:', error);
      handleApiError(error, 'update');
      throw error;
    }
  }, [modalMode, selectedHospital]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedHospital(null);
    if (shouldRefresh) {
      fetchHospitals();
    }
  }, [fetchHospitals]);

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success',
      full: 'bg-warning/20 text-warning',
    };
    return badges[status] || badges.available;
  };

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? hospitals.map(h => h.id) : []);
  }, [hospitals]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleBulkDelete = useCallback(() => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Hospitals',
      description: `Are you sure you want to delete ${selectedIds.length} hospitals? This action cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('hospitals').delete().in('id', selectedIds);
          if (error) throw error;
          toast.success(`${selectedIds.length} hospitals deleted`);
          setSelectedIds([]);
          fetchHospitals();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleApiError(error, 'delete');
        }
      }
    });
  }, [selectedIds, fetchHospitals]);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search hospitals...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'full', label: 'Full' },
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Registered On',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
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
      aria-label="Filter hospitals"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => {
    // Only Admins and Org Admins can create new hospitals
    if (isAdmin() || isOrgAdmin()) {
      return (
        <Button
          onClick={handleCreate}
          className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD HOSPITAL
        </Button>
      );
    }
    return null;
  }, [isAdmin, isOrgAdmin, handleCreate]);

  usePageHeader(
    "Medical Facilities",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Hospitals</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && hospitals.length > 0);

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Medical Facilities" description="Manage network hospitals, bed capacity, and facility status." />
      <div className="pt-2" />
      {/* Bento Overview Cards - Enhanced with Filtering */}
      {!loading && hospitalsData?.stats && (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Total Hospitals Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('all')}
                role="button"
                tabIndex={0}
                aria-label="Show all hospitals"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-primary" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Hospital className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Network Size</p>
                    {kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.total || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                      {kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Available Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'available' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('available')}
                role="button"
                tabIndex={0}
                aria-label="Filter by available hospitals"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-success" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'available' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <MapPin className={`h-5 w-5 ${kpiFilter === 'available' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
                    {kpiFilter === 'available' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.available || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                      READY
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Total Beds Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className="h-full min-h-[140px] squircle-3xl glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
              >
                <div className="hover-glow hover-glow-info" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-info/10 blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200" />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Bed className="h-5 w-5 text-info" />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Beds</p>
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.totalBeds || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-info/20 text-info border-0 font-bold text-xs uppercase">
                      Network capacity
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Total Ambulances Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className="h-full min-h-[140px] geo-wave glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200"
              >
                <div className="hover-glow hover-glow-success" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-success/10 blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200" />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Ambulance className="h-5 w-5 text-success" />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ambulance Fleet</p>
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.totalAmbulances || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-wave bg-success/20 text-success border-0 font-bold text-xs uppercase">
                      Active vehicles
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
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
              >
                {hospitals.map((hospital, index) => (
                  <motion.div
                    layout
                    key={hospital.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card className="h-full geo-block glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                      {/* Apple hover glow effect */}
                      <div className="hover-glow hover-glow-primary" />

                      {/* Hospital Image */}
                      {hospital.image || hospital.google_photos?.[0] ? (
                        <div className="relative h-48 w-full mb-4 rounded-xl overflow-hidden bg-black/20">
                          <img
                            src={hospital.image || hospital.google_photos?.[0]}
                            alt={hospital.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          {/* Fallback placeholder */}
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 hidden">
                            <Hospital className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 w-full mb-4 rounded-xl bg-muted/20 flex items-center justify-center">
                          <Hospital className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Top Right Icon */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                          <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Hospital className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-badge ${hospital.status === 'available'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                          } border-0 font-bold editorial-subtitle px-3 py-1`}>
                          {hospital.status}
                        </Badge>
                        {hospital.verified && (
                          <Badge className="geo-badge bg-info/20 text-info border-0 px-2 py-1">
                            ✓
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-2xl mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                        {hospital.name || 'Unnamed Hospital'}
                      </h3>

                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-6 min-h-[2.5rem] relative z-10">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <p className="truncate-2 leading-snug">{hospital.address || 'No address provided'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                        <div className="p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Bed className="h-4 w-4 text-info" />
                            <p className="text-xs text-muted-foreground font-medium">Beds</p>
                          </div>
                          <p className="font-bold text-xl">{hospital.available_beds}</p>
                        </div>
                        <div className="p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Ambulance className="h-4 w-4 text-success" />
                            <p className="text-xs text-muted-foreground font-medium">Fleet</p>
                          </div>
                          <p className="font-bold text-xl">{hospital.ambulances_count}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-semibold text-sm">{hospital.rating}</span>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(hospital)}
                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            aria-label={`View details for ${hospital.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* RBAC: Only Admins and Org Admins can edit/delete hospitals */}
                          {(isAdmin() || isOrgAdmin()) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(hospital)}
                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                aria-label={`Edit ${hospital.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedHospital(hospital);
                                  setSchedulingModalOpen(true);
                                }}
                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                aria-label={`Manage schedule for ${hospital.name}`}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(hospital)}
                                className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${hospital.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          )}
          {viewMode === 'list' && (
            <HospitalListView
              hospitals={hospitals}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSchedule={(hospital) => {
                setSelectedHospital(hospital);
                setSchedulingModalOpen(true);
              }}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          )}
          {viewMode === 'table' && (
            <HospitalTableView
              hospitals={hospitals}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSchedule={(hospital) => {
                setSelectedHospital(hospital);
                setSchedulingModalOpen(true);
              }}
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

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmationModal.title}
        description={confirmationModal.description}
        onConfirm={confirmationModal.onConfirm}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

      {modalMode && (
        <HospitalModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          hospital={selectedHospital}
          mode={modalMode}
          onSave={handleSave}
        />
      )}

      <AnimatePresence>
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

            {(isAdmin() || isProvider()) && (
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <ReportsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analyticsData={hospitalsData?.stats}
        initialType="hospital"
      />

      <StaffSchedulingModal
        isOpen={schedulingModalOpen}
        onClose={() => setSchedulingModalOpen(false)}
        hospitalId={selectedHospital?.id}
        existingStaff={[]} // Pass existing staff if needed
      />
    </div>
  );
};
