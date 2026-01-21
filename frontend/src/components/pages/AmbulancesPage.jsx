import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Ambulance, Plus, Edit, Trash2, Eye, MapPin, Star, ChevronRight, Activity, Filter } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { AmbulanceListView } from '../views/AmbulanceListView';
import { AmbulanceTableView } from '../views/AmbulanceTableView';
import { SEOHead } from '../common/SEOHead';

import { usePageData } from '../../contexts/PageDataContext';

export const AmbulancesPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, orgId, profile, can } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const { ambulancesData, refreshAllData } = usePageData();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');

  const { viewMode, setViewMode } = useViewMode('ambulances-page', 'grid');
  const pagination = usePagination(20);

  const fetchAmbulances = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('ambulances').select('*', { count: 'exact', head: true });

      // RBAC: Platform Admin sees all. Org Admin sees scoped.
      if (isAdmin()) {
        // Platform admin sees everything
      } else if (isOrgAdmin() && orgId) {
        query = query.eq('hospital_id', orgId);
      }

      if (filters.search) {
        query = query.or(`call_sign.ilike.%${filters.search}%,vehicle_number.ilike.%${filters.search}%`);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Apply KPI Filter to count query
      if (kpiFilter === 'available') query = query.eq('status', 'available');
      if (kpiFilter === 'on_route') query = query.eq('status', 'on_route');
      if (kpiFilter === 'busy') query = query.eq('status', 'busy');
      if (kpiFilter === 'maintenance') query = query.eq('status', 'maintenance');

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('ambulances')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      // RBAC Scoping for Data
      if (isAdmin()) {
        // No filter
      } else if (isOrgAdmin() && orgId) {
        dataQuery = dataQuery.eq('hospital_id', orgId);
      }

      if (filters.search) {
        dataQuery = dataQuery.or(`call_sign.ilike.%${filters.search}%,vehicle_number.ilike.%${filters.search}%`);
      }

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }

      // Apply KPI Filter to data query
      if (kpiFilter === 'available') dataQuery = dataQuery.eq('status', 'available');
      if (kpiFilter === 'on_route') dataQuery = dataQuery.eq('status', 'on_route');
      if (kpiFilter === 'busy') dataQuery = dataQuery.eq('status', 'busy');
      if (kpiFilter === 'maintenance') dataQuery = dataQuery.eq('status', 'maintenance');

      const { data, error } = await withTimeout(dataQuery, 8000, 'Failed to load ambulances - timeout');

      if (error) throw error;
      setAmbulances(data || []);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      toast.error(error.message || 'Failed to load ambulances');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters, kpiFilter, orgId, isOrgAdmin, isAdmin]);

  useEffect(() => {
    fetchAmbulances();
  }, [fetchAmbulances, pagination.currentPage]);

  const handleCreate = useCallback(() => {
    setSelectedAmbulance(null);
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

    window.addEventListener('openAmbulanceModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      window.removeEventListener('openAmbulanceModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
    };
  }, [handleCreate]);

  const handleView = useCallback((ambulance) => {
    setSelectedAmbulance(ambulance);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((ambulance) => {
    setSelectedAmbulance(ambulance);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (ambulance) => {
    if (!confirm(`Are you sure you want to delete ${ambulance.call_sign}?`)) return;

    try {
      const { error } = await supabase
        .from('ambulances')
        .delete()
        .eq('id', ambulance.id);

      if (error) throw error;

      await createNotification(
        NotificationTypes.AMBULANCE,
        NotificationActions.DELETED,
        ambulance.id,
        { message: `${ambulance.call_sign} has been removed from the fleet` }
      );
      toast.success('Ambulance deleted successfully');
      fetchAmbulances();
    } catch (error) {
      console.error('Error deleting ambulance:', error);
      toast.error('Failed to delete ambulance');
    }
  }, [fetchAmbulances]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedAmbulance(null);
    if (shouldRefresh) {
      fetchAmbulances();
    }
  }, [fetchAmbulances]);

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success',
      en_route: 'bg-warning/20 text-warning',
      busy: 'bg-destructive/20 text-destructive',
      maintenance: 'bg-muted text-muted-foreground',
    };
    return badges[status] || badges.available;
  };

  const filterSchema = React.useMemo(() => [

    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search call sign, plate...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'en_route', label: 'En Route' },
        { value: 'busy', label: 'Busy' },
        { value: 'maintenance', label: 'Maintenance' },
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
      aria-label="Filter ambulances"
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleCreate}
      className="bg-muted/20 hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] text-foreground font-bold tracking-widest uppercase"
      aria-label="Add new ambulance"
    >
      <Plus className="h-4 w-4 mr-2" />
      ADD AMBULANCE
    </Button>
  ), [handleCreate]);

  usePageHeader(
    "Fleet Management",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Ambulances</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && ambulances.length > 0);

  const renderGridView = () => (
    <LayoutGroup>
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
      >
        {ambulances.map((ambulance, index) => (
          <motion.div
            layout
            key={ambulance.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="col-span-1"
          >
            <Card className="h-full squircle-xl bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">

              {/* Top Right Icon */}
              <div className="absolute top-0 right-0 p-5 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-success/10 blur-xl rounded-full scale-150" />
                  <div className="w-10 h-10 squircle-sm bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    <Ambulance className="h-5 w-5 text-success" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 relative z-10">
                <Badge className={`squircle-sm ${getStatusBadge(ambulance.status)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                  {ambulance.status}
                </Badge>
              </div>

              <h3 className="font-bold text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                {ambulance.call_sign || 'Unknown Unit'}
              </h3>
              <p className="text-sm font-medium text-muted-foreground mb-4 relative z-10">
                {ambulance.type || 'Standard'} • {ambulance.vehicle_number || 'No Plate'}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-info" />
                    <p className="text-xs text-muted-foreground font-medium">ETA</p>
                  </div>
                  <p className="font-bold text-xl">{ambulance.eta || 'N/A'}</p>
                </div>
                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <p className="text-xs text-muted-foreground font-medium">Rating</p>
                  </div>
                  <p className="font-bold text-xl">{ambulance.rating}</p>
                </div>
              </div>

              {ambulance.crew && ambulance.crew.length > 0 && (
                <div className="mb-4 p-3 squircle bg-primary/5 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-3 w-3 text-primary" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Crew</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ambulance.crew.map((member, idx) => (
                      <Badge key={idx} className="squircle-sm bg-background/80 text-foreground border-0 font-normal">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  STATION: {ambulance.hospital || 'HQ'}
                </div>

                <div className={`flex gap-2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`View details for ${ambulance.call_sign}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${ambulance.call_sign}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${ambulance.call_sign}`}
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
  );

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Fleet Management" description="Manage ambulance fleet, status, and live tracking." />
      <div className="pt-2" />
      {/* Bento Overview Cards - Enhanced with Filtering */}
      {!loading && ambulancesData?.stats && (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Fleet Size Card */}
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
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Ambulance className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fleet Size</p>
                    {kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{ambulancesData.stats.total || 0}</h3>
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
                  <h3 className="text-3xl font-bold tracking-tighter">{ambulancesData.stats.available || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                      READY
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* En Route Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className={`h-full min-h-[140px] squircle-3xl bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'on_route' ? 'ring-2 ring-warning shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('on_route')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'on_route' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Activity className={`h-5 w-5 ${kpiFilter === 'on_route' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">En Route</p>
                    {kpiFilter === 'on_route' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{ambulancesData.stats.onRoute || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-bold text-xs">
                      ACTIVE
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
              transition={{ duration: 0.4, delay: 0.22 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'busy' ? 'ring-2 ring-destructive shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('busy')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'busy' ? 'bg-destructive/30' : 'bg-destructive/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Ambulance className={`h-5 w-5 ${kpiFilter === 'busy' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Busy</p>
                    {kpiFilter === 'busy' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{ambulancesData.stats.busy || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-ticket bg-destructive/20 text-destructive border-0 font-bold text-xs">
                      ENGAGED
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Maintenance Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-wave bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'maintenance' ? 'ring-2 ring-muted shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('maintenance')}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'maintenance' ? 'bg-muted/30' : 'bg-muted/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                      <Filter className={`h-5 w-5 ${kpiFilter === 'maintenance' ? 'text-muted-foreground' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Maintenance</p>
                    {kpiFilter === 'maintenance' && <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{ambulancesData.stats.maintenance || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-wave bg-muted/20 text-muted-foreground border-0 font-bold text-xs">
                      OFFLINE
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
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'list' && <AmbulanceListView ambulances={ambulances} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} getStatusBadge={getStatusBadge} isMobile={isMobile} />}
          {viewMode === 'table' && <AmbulanceTableView ambulances={ambulances} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} getStatusBadge={getStatusBadge} isMobile={isMobile} />}
        </>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        itemsPerPage={pagination.itemsPerPage}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {modalMode && (
        <AmbulanceModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          ambulance={selectedAmbulance}
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
