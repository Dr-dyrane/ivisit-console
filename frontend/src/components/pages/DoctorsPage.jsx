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

export const DoctorsPage = () => {
  const { isAdmin, isProvider } = useAuth();
  const { isMobile } = useNavigation();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const { viewMode, setViewMode } = useViewMode('doctors-page', 'grid');
  const pagination = usePagination(20);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('doctors').select('*', { count: 'exact', head: true });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.specialization && filters.specialization.length > 0) {
        query = query.in('specialization', filters.specialization);
      }

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('doctors')
        .select(`
          *,
          hospital:hospitals(name)
        `)
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }
      if (filters.specialization && filters.specialization.length > 0) {
        dataQuery = dataQuery.in('specialization', filters.specialization);
      }

      const { data, error } = await withTimeout(dataQuery, 8000, 'Failed to load doctors - timeout');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error(error.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

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

    window.addEventListener('openDoctorModal', handleOpenModal);

    return () => {
      window.removeEventListener('openDoctorModal', handleOpenModal);
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
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctor.id);

      if (error) throw error;

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
        { value: 'busy', label: 'Busy' },
        { value: 'off_duty', label: 'Off Duty' },
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
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleCreate}
      className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
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
      <div className="pt-2" />

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
                <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-doctor-btn">
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(doctor)}
                              className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              data-testid={`edit - doctor - ${doctor.id} `}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doctor)}
                              className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              data-testid={`delete -doctor - ${doctor.id} `}
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

      {modalMode && (
        <DoctorModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          doctor={selectedDoctor}
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
