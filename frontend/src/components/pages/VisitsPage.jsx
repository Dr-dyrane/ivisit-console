import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getDoctorByProfileId } from '../../services/doctorsService';
import { createVisit, updateVisit, getVisit, deleteVisit } from '../../services/visitsService';
import { getHospitals } from '../../services/hospitalsService';
import { getProfiles } from '../../services/profilesService';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Calendar, Plus, Edit, Trash2, Eye, User, Hospital, Clock, CheckCircle, ChevronRight, MapPin, Filter, AlertCircle, PlayCircle } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { VisitModal } from '../modals/VisitModal';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { withTimeout, formatDate } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { usePageData } from '../../contexts/PageDataContext';
import { FilterSheet } from '../common/FilterSheet';
import { VisitListView } from '../views/VisitListView';
import { VisitTableView } from '../views/VisitTableView';
import { SEOHead } from '../common/SEOHead';
import { BulkActionBar } from '../common/BulkActionBar';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileVisits } from '../mobile/MobileVisits';

export const VisitsPage = () => {
  const { user, isAdmin, isOrgAdmin, isProvider, orgId } = useAuth();
  const { isMobile } = useNavigation();
  const { visitsData, refreshAllData } = usePageData();
  const location = useLocation();

  // Handle URL parameter to open specific visit modal
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const viewVisitId = urlParams.get('view');

    if (viewVisitId) {
      // Fetch the specific visit and open modal
      const fetchAndOpenVisit = async () => {
        try {
          const visitData = await getVisit(viewVisitId);
          if (visitData) {
            setSelectedVisit(visitData);
            setModalMode('view');
          }
        } catch (error) {
          console.error('Error fetching visit:', error);
          // Show error notification
          toast.error('Failed to load clinical record');
        }
      };

      fetchAndOpenVisit();
    }
  }, [location.search]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Delete'
  });

  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    request: null
  });

  const { viewMode, setViewMode } = useViewMode('visits-page', 'grid');
  const pagination = usePagination(20);

  const mapVisitSortKey = useCallback((key) => {
    if (key === 'visit_type') return 'type';
    if (key === 'room_number') return 'hospital_name';
    if (key === 'doctor' || key === 'doctor_id') return 'doctor_name';
    return key;
  }, []);

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user for RBAC filtering
      const currentUser = await getCurrentUser();

      let query = supabase.from('visits').select('*', { count: 'exact', head: true });

      // Apply RBAC filter using centralized service
      query = applyAuthFilter(query, currentUser, {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'doctor_name',
        resourceType: 'visit'
      });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.visit_type && filters.visit_type.length > 0) {
        query = query.in('type', filters.visit_type);
      }
      if (filters.date) {
        if (filters.date.start) query = query.gte('date', filters.date.start);
        if (filters.date.end) query = query.lte('date', filters.date.end);
      }
      if (filters.search) {
        // TODO: Enable search when backend supports joined filtering
        // query = query.or(`patient_name.ilike.%${filters.search}%`);
      }

      // Apply KPI Filter to count query
      if (kpiFilter === 'scheduled') query = query.eq('status', 'scheduled');
      if (kpiFilter === 'in_progress') query = query.eq('status', 'in_progress');
      if (kpiFilter === 'completed') query = query.eq('status', 'completed');
      if (kpiFilter === 'cancelled') query = query.eq('status', 'cancelled');

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('visits')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order(mapVisitSortKey(sortConfig.key || 'date'), { ascending: sortConfig.direction === 'asc' });

      // Apply RBAC filter to data query using centralized service
      dataQuery = applyAuthFilter(dataQuery, currentUser, {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'doctor_name',
        resourceType: 'visit'
      });

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }
      if (filters.visit_type && filters.visit_type.length > 0) {
        dataQuery = dataQuery.in('type', filters.visit_type);
      }
      if (filters.date) {
        if (filters.date.start) dataQuery = dataQuery.gte('date', filters.date.start);
        if (filters.date.end) dataQuery = dataQuery.lte('date', filters.date.end);
      }
      if (filters.search) {
        // TODO: Implement search across joined tables (patient name) or verify patient_name column exists
        // dataQuery = dataQuery.or(`patient_name.ilike.%${filters.search}%`);
      }

      // Apply KPI Filter to data query
      if (kpiFilter === 'scheduled') dataQuery = dataQuery.eq('status', 'scheduled');
      if (kpiFilter === 'in_progress') dataQuery = dataQuery.eq('status', 'in_progress');
      if (kpiFilter === 'completed') dataQuery = dataQuery.eq('status', 'completed');
      if (kpiFilter === 'cancelled') dataQuery = dataQuery.eq('status', 'cancelled');

      let { data: visitsData, error } = await withTimeout(dataQuery, 8000, 'Failed to load visits - timeout');

      if (error) throw error;

      if (visitsData && visitsData.length > 0) {
        const userIds = [...new Set(visitsData.map(v => v.user_id).filter(Boolean))];
        const requestIds = [...new Set(visitsData.map(v => v.request_id).filter(Boolean))];
        const visitDoctorIds = [...new Set(visitsData.map(v => v.doctor_id).filter(Boolean))];
        const directHospitalIds = [...new Set(visitsData.map(v => v.hospital_id).filter(Boolean))];

        const [{ data: profiles }, { data: emergencyRows }] = await Promise.all([
          userIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, username, email')
                .in('id', userIds)
            : Promise.resolve({ data: [] }),
          requestIds.length > 0
            ? supabase
                .from('emergency_requests')
                .select('id, hospital_id, hospital_name, status, service_type, assigned_doctor_id')
                .in('id', requestIds)
            : Promise.resolve({ data: [] })
        ]);

        const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const emergencyByRequest = (emergencyRows || []).reduce((acc, row) => ({ ...acc, [row.id]: row }), {});

        const emergencyDoctorIds = [
          ...new Set((emergencyRows || []).map(r => r.assigned_doctor_id).filter(Boolean))
        ];
        const doctorIds = [...new Set([...visitDoctorIds, ...emergencyDoctorIds])];

        let doctorsMap = {};
        if (doctorIds.length > 0) {
          const { data: doctors } = await supabase
            .from('doctors')
            .select('id, name')
            .in('id', doctorIds);
          doctorsMap = (doctors || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
        }

        const hospitalIds = [
          ...new Set([
            ...directHospitalIds,
            ...(emergencyRows || []).map(r => r.hospital_id).filter(Boolean)
          ])
        ];
        let hospitalsMap = {};
        if (hospitalIds.length > 0) {
          const { data: hospitalRows } = await supabase
            .from('hospitals')
            .select('id, name, address')
            .in('id', hospitalIds);
          hospitalsMap = (hospitalRows || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {});
        }

        const emergencyToVisitStatus = {
          pending_approval: 'scheduled',
          payment_declined: 'cancelled',
          in_progress: 'in_progress',
          accepted: 'in_progress',
          arrived: 'in_progress',
          completed: 'completed',
          cancelled: 'cancelled'
        };

        visitsData = visitsData.map((visit) => {
          const emergency = visit.request_id ? emergencyByRequest[visit.request_id] : null;
          const linkedHospitalId = visit.hospital_id || emergency?.hospital_id || null;
          const linkedHospitalName =
            visit.hospital_name ||
            emergency?.hospital_name ||
            hospitalsMap[linkedHospitalId]?.name ||
            null;
          const emergencyDerivedStatus = emergency?.status
            ? emergencyToVisitStatus[emergency.status] || null
            : null;
          const originalStatus = String(visit.status || '').toLowerCase();
          const normalizedStatus =
            !originalStatus || ['upcoming', 'scheduled'].includes(originalStatus)
              ? emergencyDerivedStatus || visit.status || 'scheduled'
              : visit.status;
          const emergencyDoctorName = emergency?.assigned_doctor_id
            ? doctorsMap[emergency.assigned_doctor_id]?.name || null
            : null;
          const doctorName = visit.doctor_name || emergencyDoctorName || null;
          const visitType = visit.visit_type || visit.type || emergency?.service_type || null;

          return {
            ...visit,
            hospital_id: linkedHospitalId,
            hospital_name: linkedHospitalName,
            status: normalizedStatus,
            type: visitType,
            visit_type: visitType,
            doctor_name: doctorName,
            patient: profilesMap[visit.user_id] || null,
            doctor: doctorsMap[visit.doctor_id] || visit.doctor || doctorName || null
          };
        });
      }

      setVisits(visitsData || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, kpiFilter, sortConfig, mapVisitSortKey]);

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

  // Fetch Dropdown Data
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [patientsData, hospitalsData] = await Promise.all([
          getProfiles({ role: 'patient' }),
          getHospitals()
        ]);
        setPatients(patientsData || []);
        setHospitals(hospitalsData || []);
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };
    if (modalMode === 'create' || modalMode === 'edit') {
      fetchDropdowns();
    }
  }, [modalMode]);

  const handleCreate = useCallback(() => {
    setSelectedVisit(null);
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
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    const handleOpenEmergency = (e) => {
      setEmergencyModal({
        isOpen: true,
        request: e.detail.request || e.detail
      });
    };

    window.addEventListener('openVisitModal', handleOpenModal);
    window.addEventListener('openEmergencyDetails', handleOpenEmergency);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openVisitAnalytics', handleOpenAnalytics);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openVisitModal', handleOpenModal);
      window.removeEventListener('openEmergencyDetails', handleOpenEmergency);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openVisitAnalytics', handleOpenAnalytics);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
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

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(visits.map(v => v.id));
    } else {
      setSelectedIds([]);
    }
  }, [visits]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleBulkDelete = useCallback(() => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Visits',
      description: `Are you sure you want to delete ${selectedIds.length} visits?`,
      confirmLabel: 'Delete All',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await Promise.all(selectedIds.map((id) => deleteVisit(id)));
          toast.success(`${selectedIds.length} visits deleted`);
          setSelectedIds([]);
          fetchVisits();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          handleApiError(e, 'delete');
        }
      }
    });
  }, [selectedIds, fetchVisits]);

  const handleDelete = useCallback((visit) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Visit',
      description: `Are you sure you want to delete visit #${visit.id?.slice(0, 8)}?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteVisit(visit.id);

          await createNotification(
            NotificationTypes.VISIT,
            NotificationActions.CANCELLED,
            visit.id,
            { message: `Visit has been cancelled` }
          );

          toast.success('Visit deleted');
          fetchVisits();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          handleApiError(e, 'delete');
        }
      }
    });
  }, [fetchVisits]);

  const handleSaveVisit = useCallback(async (formData) => {
    try {
      if (modalMode === 'create') {
        await createVisit({
          ...formData,
          user_id: formData.user_id || user.id, // Fallback if not selected
        });
        toast.success('Visit scheduled successfully');
      } else if (modalMode === 'edit' && selectedVisit) {
        await updateVisit(selectedVisit.id, formData);
        toast.success('Visit updated successfully');
      }
      fetchVisits();
      setModalMode(null);
    } catch (error) {
      console.error('Save error:', error);
      handleApiError(error, 'create');
      throw error; // Re-throw for modal to handle loading state
    }
  }, [modalMode, selectedVisit, fetchVisits, user.id]);

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
      key: 'search',
      type: 'text',
      label: 'Search Visits',
      placeholder: 'Search by patient name...'
    },
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
    },
    {
      key: 'visit_type',
      type: 'multiselect',
      label: 'Visit Type',
      options: [
        { value: 'Regular Checkup', label: 'Regular Checkup' },
        { value: 'Consultation', label: 'Consultation' },
        { value: 'Follow-up', label: 'Follow-up' },
        { value: 'Emergency', label: 'Emergency' },
        { value: 'Telehealth', label: 'Telehealth' },
        { value: 'Bed Booking', label: 'Bed Booking' },
        { value: 'Ambulance Ride', label: 'Ambulance Ride' }
      ]
    },
    {
      key: 'date',
      type: 'date',
      label: 'Date Range',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Next 7 Days', value: '7days' },
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
      aria-label="Filter visits"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.visit_type && filters.visit_type.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => {
    // Only Admins, Org Admins, and Providers can create new visits
    if (isAdmin() || isOrgAdmin() || isProvider()) {
      return (
        <Button
          onClick={handleCreate}
          className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
        >
          <Plus className="h-4 w-4 mr-2" />
          SCHEDULE VISIT
        </Button>
      );
    }
    return null;
  }, [isAdmin, isOrgAdmin, isProvider, handleCreate]);

  usePageHeader(
    "Patient Visits",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5  uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Visits</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && visits.length > 0);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Visits" description="Clinical Encounters Mission Control" />
        <MobileVisits
          visits={visits}
          loading={loading}
          statistics={visitsData?.stats}  // ← Changed from 'stats' to 'statistics'
          filters={filters}                // ← ADD
          setFilters={setFilters}          // ← ADD  
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchVisits}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          onOpenFilters={() => setFilterSheetOpen(true)}  // ← ADD
          hasMore={pagination.hasNextPage}  // ← ADD
          onLoadMore={pagination.nextPage}  // ← ADD
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />

        {/* Modals & Sheets */}
        {modalMode && (
          <VisitModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            visit={selectedVisit}
            mode={modalMode}
            onSave={handleSaveVisit}
            users={patients}
            hospitals={hospitals}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile={true}
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
        {/* Global Overlays */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
        >
          {(isAdmin() || isOrgAdmin() || isProvider()) && (
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
        </BulkActionBar>

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={visitsData?.stats}
          type="visit"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Patient Visits" description="Schedule and manage patient visits across the network." />
      <div className="pt-2" />

      {/* Bento Overview Cards - Show in all view modes */}
      {!loading && visitsData?.stats && (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Total Visits Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
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
                aria-label="Show all visits"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-primary" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Calendar className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Visits</p>
                    {kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{visitsData.stats.total || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                      {kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Scheduled Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'scheduled' ? 'ring-2 ring-info shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('scheduled')}
                role="button"
                tabIndex={0}
                aria-label="Filter by scheduled visits"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-info" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'scheduled' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Clock className={`h-5 w-5 ${kpiFilter === 'scheduled' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Scheduled</p>
                    {kpiFilter === 'scheduled' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{visitsData.stats.scheduled || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-info/20 text-info border-0 font-bold text-xs">
                      UPCOMING
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* In Progress Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className={`h-full min-h-[140px] squircle-3xl glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'in_progress' ? 'ring-2 ring-warning shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('in_progress')}
                role="button"
                tabIndex={0}
                aria-label="Filter by in-progress visits"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-warning" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'in_progress' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <PlayCircle className={`h-5 w-5 ${kpiFilter === 'in_progress' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">In Progress</p>
                    {kpiFilter === 'in_progress' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{visitsData.stats.inProgress || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-bold text-xs">
                      ACTIVE
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Completed Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'completed' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('completed')}
                role="button"
                tabIndex={0}
                aria-label="Filter by completed visits"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-success" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'completed' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <CheckCircle className={`h-5 w-5 ${kpiFilter === 'completed' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
                    {kpiFilter === 'completed' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{visitsData.stats.completed || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-ticket bg-success/20 text-success border-0 font-bold text-xs">
                      DONE
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Cancelled Card */}
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-wave glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'cancelled' ? 'ring-2 ring-destructive shadow-lg' : ''
                  }`}
                onClick={() => setKpiFilter('cancelled')}
                role="button"
                tabIndex={0}
                aria-label="Filter by cancelled visits"
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-destructive" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${kpiFilter === 'cancelled' ? 'bg-destructive/30' : 'bg-destructive/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <AlertCircle className={`h-5 w-5 ${kpiFilter === 'cancelled' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cancelled</p>
                    {kpiFilter === 'cancelled' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{visitsData.stats.cancelled || 0}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-wave bg-destructive/20 text-destructive border-0 font-bold text-xs">
                      VOID
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
            visits.length === 0 ? (
              <Card className="squircle-lg glass-card-premium p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-bold text-xl mb-2">No Visits Yet</h3>
                <p className="text-muted-foreground mb-6">Get started by scheduling the first visit</p>
                <Button onClick={handleCreate} className="glass-card-premium" data-testid="add-first-visit-btn" aria-label="Schedule your first visit">
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
                      <Card className="h-full squircle-xl glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col" data-testid={`visit-card-${visit.id}`}>
                        {/* Apple hover glow effect */}
                        <div className="hover-glow hover-glow-primary" />

                        {/* Top Right Icon */}
                        <div className="absolute top-0 right-0 p-5 z-20">
                          <div className="relative">
                            <div className="absolute inset-0 bg-info/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 squircle-sm surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                              <Calendar className="h-5 w-5 text-info" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 relative z-10 flex-wrap mr-12">
                          <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                            {visit.status || 'scheduled'}
                          </Badge>
                          {visit.visit_type && (
                            <Badge className="squircle-sm bg-primary/10 text-primary border-0 px-2 py-1 font-semibold">
                              {visit.visit_type}
                            </Badge>
                          )}
                          {visit.cost && (
                            <Badge variant="outline" className="squircle-sm border-white/10 font-mono text-xs bg-emerald-500/10 text-emerald-500 border-0">
                              {visit.cost}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-bold text-lg mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10 pr-12">
                          {visit.visit_type || `Visit #${visit.id?.slice(-6) || 'N/A'}`}
                        </h3>

                        <div className="flex flex-col gap-1 mb-6 relative z-10">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-info" />
                            <span className="font-normal">{formatDate(visit.date || visit.created_at)}</span>
                          </div>
                          {visit.room_number && (
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/70 ml-6">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                              <span>Room {visit.room_number}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10 text-xs">
                          {/* Patient */}
                          <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-primary" />
                              <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Patient</p>
                            </div>
                            <p className="font-semibold truncate">{visit.patient?.username || visit.user_id ? 'Linked' : 'Unknown'}</p>
                          </div>

                          {/* Doctor */}
                          <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-purple-500" />
                              <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Doctor</p>
                            </div>
                            <p className="font-semibold truncate">
                              {visit.doctor?.name || visit.doctor || (visit.doctor_id ? 'Linked' : 'Unassigned')}
                            </p>
                          </div>

                          {/* Hospital (Full Width) */}
                          <div className="col-span-2 p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <Hospital className="h-4 w-4 text-success" />
                              <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Facility</p>
                            </div>
                            <p className="font-semibold truncate">
                              {visit.hospital?.name || visit.hospital || (visit.hospital_id ? 'Linked Facility' : 'None')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            #{visit.id?.slice(0, 8)}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(visit)}
                              className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* RBAC: Only Admins and Org Admins can edit/delete visits */}
                            {(isAdmin() || isOrgAdmin()) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(visit)}
                                  className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(visit)}
                                  className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete"
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
              selectedIds={selectedIds}
              onSelect={handleSelect}
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
          <VisitModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            visit={selectedVisit}
            mode={modalMode}
            onSave={handleSaveVisit}
            users={patients}
            hospitals={hospitals}
          />
        )
      }

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        description={confirmationModal.description}
        onConfirm={confirmationModal.onConfirm}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
      >
        {(isAdmin() || isOrgAdmin() || isProvider()) && (
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
      </BulkActionBar>

      <EmergencyDetailsModal
        isOpen={emergencyModal.isOpen}
        onClose={() => setEmergencyModal(prev => ({ ...prev, isOpen: false }))}
        request={emergencyModal.request}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={visitsData?.stats}
        type="visit"
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
