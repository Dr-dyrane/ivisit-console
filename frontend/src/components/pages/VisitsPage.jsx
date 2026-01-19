import React, { useState, useEffect, useCallback } from 'react';
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
import { Calendar, Plus, Edit, Trash2, Eye, User, Hospital, Clock, CheckCircle, ChevronRight, MapPin, Filter } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { VisitModal } from '../modals/VisitModal';
import { withTimeout, formatDate } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { VisitListView } from '../views/VisitListView';
import { VisitTableView } from '../views/VisitTableView';

export const VisitsPage = () => {
  const { isAdmin, isProvider } = useAuth();
  const { isMobile } = useNavigation();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const { viewMode, setViewMode } = useViewMode('visits-page', 'grid');
  const pagination = usePagination(20);

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('visits').select('*', { count: 'exact', head: true });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('visits')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }

      const { data, error } = await withTimeout(dataQuery, 8000, 'Failed to load visits - timeout');

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error(error.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits, pagination.currentPage]);

  useEffect(() => {
    const channel = supabase
      .channel('visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => fetchVisits()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchVisits]);

  const handleCreate = useCallback(() => {
    setSelectedVisit(null);
    setModalMode('create');
  }, []);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => {
      handleCreate();
    };

    window.addEventListener('openVisitModal', handleOpenModal);

    return () => {
      window.removeEventListener('openVisitModal', handleOpenModal);
    };
  }, [handleCreate]);

  const handleView = useCallback((visit) => {
    setSelectedVisit(visit);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((visit) => {
    setSelectedVisit(visit);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (visit) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visit.id);

      if (error) throw error;

      await createNotification(
        NotificationTypes.VISIT,
        NotificationActions.CANCELLED,
        visit.id,
        { message: `Visit has been cancelled` }
      );
      toast.success('Visit deleted successfully');
      fetchVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast.error('Failed to delete visit');
    }
  }, [fetchVisits]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedVisit(null);
    if (shouldRefresh) {
      fetchVisits();
    }
  }, [fetchVisits]);

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-info/20 text-info',
      in_progress: 'bg-warning/20 text-warning',
      completed: 'bg-success/20 text-success',
      cancelled: 'bg-destructive/20 text-destructive',
    };
    return badges[status] || badges.scheduled;
  };

  const filterSchema = React.useMemo(() => [
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
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
      className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase"
    >
      <Plus className="h-4 w-4 mr-2" />
      SCHEDULE VISIT
    </Button>
  ), [handleCreate]);

  usePageHeader(
    "Patient Visits",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Visits</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && visits.length > 0);

  return (
    <div className="min-h-screen py-6 md:py-8">
      <div className="pt-2" />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {viewMode === 'grid' && (
            visits.length === 0 ? (
              <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-12 border-0 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-black text-xl mb-2">No Visits Yet</h3>
                <p className="text-muted-foreground mb-6">Get started by scheduling the first visit</p>
                <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-visit-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule First Visit
                </Button>
              </Card>
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
                  data-testid="visits-list"
                >
                  {visits.map((visit, index) => (
              <motion.div
                layout
                key={visit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="col-span-1"
              >
                <Card className="h-full squircle-xl bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col" data-testid={`visit-card-${visit.id}`}>

                  {/* Top Right Icon */}
                  <div className="absolute top-0 right-0 p-5 z-20">
                    <div className="relative">
                      <div className="absolute inset-0 bg-info/10 blur-xl rounded-full scale-150" />
                      <div className="w-10 h-10 squircle-sm bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="h-5 w-5 text-info" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-black editorial-subtitle px-3 py-1`}>
                      {visit.status || 'scheduled'}
                    </Badge>
                    {visit.visit_type && (
                      <Badge className="squircle-sm bg-primary/10 text-primary border-0 px-2 py-1 font-bold">
                        {visit.visit_type}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                    Visit #{visit.id?.slice(-6) || 'N/A'}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 relative z-10">
                    <Clock className="h-4 w-4 text-info" />
                    <span className="font-medium">{formatDate(visit.scheduled_at || visit.created_at)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground font-semibold">Patient</p>
                      </div>
                      <p className="font-bold truncate">{visit.user_id ? 'Linked' : 'Unknown'}</p>
                    </div>
                    <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Hospital className="h-4 w-4 text-success" />
                        <p className="text-xs text-muted-foreground font-semibold">Hospital</p>
                      </div>
                      <p className="font-bold truncate">{visit.hospital_id ? 'Linked' : 'None'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      ACTIONS
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(visit)}
                        className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        data-testid={`view-visit-${visit.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(visit)}
                        className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        data-testid={`edit-visit-${visit.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(visit)}
                        className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        data-testid={`delete-visit-${visit.id}`}
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
            <VisitListView
              visits={visits}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}
          {viewMode === 'table' && (
            <VisitTableView
              visits={visits}
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
        <VisitModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          visit={selectedVisit}
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
