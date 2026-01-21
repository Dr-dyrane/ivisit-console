import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
import { Hospital, MapPin, Star, Bed, Ambulance, Plus, Edit, Trash2, Eye, ChevronRight, Filter } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { HospitalModal } from '../modals/HospitalModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { HospitalListView } from '../views/HospitalListView';
import { HospitalTableView } from '../views/HospitalTableView';
import { SEOHead } from '../common/SEOHead';

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

  const { viewMode, setViewMode } = useViewMode('hospitals-page', 'grid');
  const pagination = usePagination(20);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('hospitals').select('*', { count: 'exact', head: true });

      // RBAC: Platform Admin sees all. Org Admin sees scoped.
      if (isAdmin()) {
        // Platform admin sees everything
      } else if (isOrgAdmin() && orgId) {
        query = query.eq('id', orgId);
      }

      // Apply Search Filter (Client-side filtering for search usually, or server side if full text search enabled)
      // Since supabase standard select doesn't do fuzzy search easily on multiple fields without specific text search config,
      // we might do client side filtering if the dataset is small, OR use 'ilike' for specific fields.
      // For now, let's assume we filter after fetching for complex search, or use ilike on name.
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Apply KPI Filter to count query
      if (kpiFilter === 'available') query = query.eq('status', 'available');
      if (kpiFilter === 'full') query = query.eq('status', 'full');
      if (kpiFilter === 'verified') query = query.eq('verified', true);

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('hospitals')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      // RBAC Scoping for Data
      if (isAdmin()) {
        // No filter
      } else if (isOrgAdmin() && orgId) {
        dataQuery = dataQuery.eq('id', orgId);
      }

      if (filters.search) {
        dataQuery = dataQuery.ilike('name', `%${filters.search}%`);
      }

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }

      // Apply KPI Filter to data query
      if (kpiFilter === 'available') dataQuery = dataQuery.eq('status', 'available');
      if (kpiFilter === 'full') dataQuery = dataQuery.eq('status', 'full');
      if (kpiFilter === 'verified') dataQuery = dataQuery.eq('verified', true);

      const { data, error } = await withTimeout(
        dataQuery,
        8000,
        'Failed to load hospitals - timeout'
      );

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast.error(error.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, kpiFilter]);

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
  }, [fetchHospitals, pagination.currentPage]);

  const handleCreate = useCallback(() => {
    setSelectedHospital(null);
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
    const handleOpenFilters = () => setFilterSheetOpen(true);

    window.addEventListener('openHospitalModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      window.removeEventListener('openHospitalModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
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

  const handleDelete = useCallback(async (hospital) => {
    if (!confirm(`Are you sure you want to delete ${hospital.name}?`)) return;

    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', hospital.id);

      if (error) throw error;

      await createNotification(
        NotificationTypes.HOSPITAL,
        NotificationActions.DELETED,
        hospital.id,
        { message: `${hospital.name} has been removed from the network` }
      );
      toast.success('Hospital deleted successfully');
      fetchHospitals();
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast.error('Failed to delete hospital');
    }
  }, [fetchHospitals]);

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
      aria-label="Filter hospitals"
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

  const headerActions = React.useMemo(() => (isAdmin() || isProvider()) && (
    <Button
      onClick={handleCreate}
      className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
      aria-label="Add new hospital"
    >
      <Plus className="h-4 w-4 mr-2" />
      ADD HOSPITAL
    </Button>
  ), [isAdmin, isProvider, handleCreate]);

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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
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
                className={`h-full min-h-[140px] geo-sharp bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('all')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
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
                className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'available' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('available')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'available' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
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

            {/* Capacity/Full Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className={`h-full min-h-[140px] squircle-3xl bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'full' ? 'ring-2 ring-destructive shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('full')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'full' ? 'bg-destructive/30' : 'bg-destructive/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Bed className={`h-5 w-5 ${kpiFilter === 'full' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">At Capacity</p>
                    {kpiFilter === 'full' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.full || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-destructive/20 text-destructive border-0 font-bold text-xs">
                      NO BEDS
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Verified Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-wave bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'verified' ? 'ring-2 ring-info shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('verified')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'verified' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Star className={`h-5 w-5 ${kpiFilter === 'verified' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Verified</p>
                    {kpiFilter === 'verified' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{hospitalsData.stats.verified || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-wave bg-info/20 text-info border-0 font-bold text-xs">
                      PARTNERS
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
                    <Card className="h-full geo-block bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">

                      {/* Top Right Icon */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                          <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
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
                          {/* RBAC: Only providers/admins can edit/delete */}
                          {(isAdmin() || isProvider()) && (
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
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}
          {viewMode === 'table' && (
            <HospitalTableView
              hospitals={hospitals}
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

      {modalMode && (
        <HospitalModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          hospital={selectedHospital}
          mode={modalMode}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />
    </div>
  );
};
