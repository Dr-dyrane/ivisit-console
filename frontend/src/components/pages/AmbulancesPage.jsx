import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
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

export const AmbulancesPage = () => {
  const { isAdmin, isProvider } = useAuth();
  const { isMobile } = useNavigation();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const { viewMode, setViewMode } = useViewMode('ambulances-page', 'grid');
  const pagination = usePagination(20);

  const fetchAmbulances = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('ambulances').select('*', { count: 'exact', head: true });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('ambulances')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }

      const { data, error } = await withTimeout(dataQuery, 8000, 'Failed to load ambulances - timeout');

      if (error) throw error;
      setAmbulances(data || []);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      toast.error(error.message || 'Failed to load ambulances');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchAmbulances();
  }, [fetchAmbulances, pagination.currentPage]);

  const handleCreate = useCallback(() => {
    setSelectedAmbulance(null);
    setModalMode('create');
  }, []);

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
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleCreate}
      className="glass squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase"
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
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Ambulances</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && ambulances.length > 0);

  const renderGridView = () => (
    <LayoutGroup>
      <motion.div
        layout
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
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
            <Card className="h-full squircle-xl glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">

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
                <Badge className={`squircle-sm ${getStatusBadge(ambulance.status)} border-0 font-black editorial-subtitle px-3 py-1`}>
                  {ambulance.status}
                </Badge>
              </div>

              <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                {ambulance.call_sign || 'Unknown Unit'}
              </h3>
              <p className="text-sm font-semibold text-muted-foreground mb-4 relative z-10">
                {ambulance.type || 'Standard'} • {ambulance.vehicle_number || 'No Plate'}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-info" />
                    <p className="text-xs text-muted-foreground font-semibold">ETA</p>
                  </div>
                  <p className="font-black text-xl">{ambulance.eta || 'N/A'}</p>
                </div>
                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <p className="text-xs text-muted-foreground font-semibold">Rating</p>
                  </div>
                  <p className="font-black text-xl">{ambulance.rating}</p>
                </div>
              </div>

              {ambulance.crew && ambulance.crew.length > 0 && (
                <div className="mb-4 p-3 squircle bg-primary/5 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-3 w-3 text-primary" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Crew</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ambulance.crew.map((member, idx) => (
                      <Badge key={idx} className="squircle-sm bg-background/80 text-foreground border-0 font-medium">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                <div className="text-xs font-bold text-muted-foreground">
                  STATION: {ambulance.hospital || 'HQ'}
                </div>

                <div className={`flex gap-2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ambulance)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
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
    <div className="min-h-screen bg-background px-0 md:px-12 py-6 md:py-8">
      <div className="pt-2" />

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
