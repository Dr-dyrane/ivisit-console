import React, { useState, useEffect, useCallback } from 'react';
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
import { Stethoscope, Plus, Edit, Trash2, Eye, Hospital, Star, Phone, ChevronRight, Filter } from 'lucide-react';
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
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');

  const { viewMode, setViewMode } = useViewMode('doctors-page', 'grid');
  const pagination = usePagination(20);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);

      const filter = {
        limit: pagination.itemsPerPage,
        offset: pagination.paginationRange.start,
        search: filters.search
      };

      // RBAC
      if (!isAdmin() && isOrgAdmin() && orgId) {
        filter.hospital_id = orgId;
      }

      // Merge KPI and Sheet filters for Status
      let statusFilter = filters.status;
      if (kpiFilter !== 'all') {
        if (statusFilter && statusFilter.length > 0) {
          // Intersection
          const intersection = statusFilter.filter(s => s === kpiFilter);
          statusFilter = intersection.length > 0 ? intersection : ['__none__'];
        } else {
          statusFilter = kpiFilter;
        }
      }
      if (statusFilter && (typeof statusFilter === 'string' || statusFilter.length > 0)) {
        filter.status = statusFilter;
      }

      // Specialization
      if (filters.specialization && filters.specialization.length > 0) {
        filter.specialization = filters.specialization;
      }

      // Call Service
      const { data, count } = await withTimeout(getDoctors(filter), 8000, 'Failed to load doctors - timeout');

      pagination.setTotalCount(count || 0);
      setDoctors(data || []);

    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error(error.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOrgAdmin, orgId, filters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start]);

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
    if (!window.confirm(`Are you sure you want to delete Dr.${doctor.name}?`)) return;

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
      label: 'Search Doctors',
      placeholder: 'Search by name...'
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
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary"
      aria-label="Filter doctors"
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

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
                className={`h-full min-h-[140px] geo-sharp bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('all')}
                role="button"
                tabIndex={0}
                aria-label="Show all doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Stethoscope className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Staff</p>
                    {kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{doctorsData.stats.total || 0}</h3>
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
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'available' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('available')}
                role="button"
                tabIndex={0}
                aria-label="Filter by available doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'available' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Badge className={`h-5 w-5 ${kpiFilter === 'available' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200 p-0 border-0 bg-transparent flex items-center justify-center`}>
                        ✓
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
                    {kpiFilter === 'available' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
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
                className={`h-full min-h-[140px] squircle-3xl bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'on_call' ? 'ring-2 ring-purple-500 shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('on_call')}
                role="button"
                tabIndex={0}
                aria-label="Filter by on-call doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'on_call' ? 'bg-purple-500/30' : 'bg-purple-500/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Phone className={`h-5 w-5 ${kpiFilter === 'on_call' ? 'text-purple-500' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">On Call</p>
                    {kpiFilter === 'on_call' && <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />}
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
                className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'busy' ? 'ring-2 ring-warning shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('busy')}
                role="button"
                tabIndex={0}
                aria-label="Filter by busy doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'busy' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Stethoscope className={`h-5 w-5 ${kpiFilter === 'busy' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Busy</p>
                    {kpiFilter === 'busy' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
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
                className={`h-full min-h-[140px] geo-wave bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'off_duty' ? 'ring-2 ring-muted shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('off_duty')}
                role="button"
                tabIndex={0}
                aria-label="Filter by off-duty doctors"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'off_duty' ? 'bg-muted/30' : 'bg-muted/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Star className={`h-5 w-5 ${kpiFilter === 'off_duty' ? 'text-muted-foreground' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Off Duty</p>
                    {kpiFilter === 'off_duty' && <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />}
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
                  {doctors.map((doctor, index) => (
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
              doctors={doctors}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}

          {viewMode === 'table' && (
            <DoctorTableView
              doctors={doctors}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
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
    </div >
  );
};
