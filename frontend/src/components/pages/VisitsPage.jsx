import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createVisit, updateVisit, getVisit, getVisitsPageData } from '../../services/visitsService';
import { getHospitals } from '../../services/hospitalsService';
import { getProfiles } from '../../services/profilesService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Calendar, Plus, Edit, Eye, User, Hospital, Clock, CheckCircle, ChevronRight, MapPin, Filter, AlertCircle, PlayCircle, Stethoscope, Search, RefreshCw } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { VisitModal } from '../modals/VisitModal';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { formatDate } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { VisitListView } from '../views/VisitListView';
import { VisitTableView } from '../views/VisitTableView';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileVisits } from '../mobile/MobileVisits';
import { formatVisitType, getVisitPatientLabel, getVisitFacilityLabel } from '../../utils/visitRowProjection';

const normalizeVisitCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const visitStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: Calendar,
    countKey: 'total',
    tone: 'primary',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-sky-700 dark:text-sky-200',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: Clock,
    countKey: 'scheduled',
    tone: 'info',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_18px_54px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
  },
  {
    id: 'in_progress',
    label: 'Active',
    icon: PlayCircle,
    countKey: 'inProgress',
    tone: 'warning',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_18px_54px_rgba(245,158,11,0.14)] dark:text-amber-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-amber-700 dark:text-amber-200',
  },
  {
    id: 'completed',
    label: 'Done',
    icon: CheckCircle,
    countKey: 'completed',
    tone: 'clear',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.14)] dark:text-emerald-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertCircle,
    countKey: 'cancelled',
    tone: 'muted',
    activeClass: 'bg-muted/36 text-foreground shadow-[0_18px_54px_rgb(0_0_0/0.10)]',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-muted-foreground',
  },
];

const visitToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-[0_16px_42px_rgb(0_0_0/0.08)]',
};

const getVisitStateCount = ({ id, stats, visits }) => {
  const option = visitStateOptions.find((item) => item.id === id) || visitStateOptions[0];
  const fallback = id === 'all'
    ? visits.length
    : visits.filter((visit) => visit.status === id).length;

  return normalizeVisitCount(stats?.[option.countKey], fallback);
};

const getVisitSignal = ({ stats, visits, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = visitStateOptions.find((item) => item.id === activeId) || visitStateOptions[0];
  const count = getVisitStateCount({ id: option.id, stats, visits });

  if (option.id === 'scheduled') {
    return {
      icon: Clock,
      tone: 'info',
      label: 'Scheduled',
      headline: count > 0 ? `${count} scheduled visit${count === 1 ? '' : 's'}` : 'No scheduled visits',
      subhead: count > 0 ? 'Open the next visit before changing the schedule.' : 'New scheduled visits will appear here.',
    };
  }

  if (option.id === 'in_progress') {
    return {
      icon: PlayCircle,
      tone: 'warning',
      label: 'Active',
      headline: count > 0 ? `${count} active visit${count === 1 ? '' : 's'}` : 'No active visits',
      subhead: count > 0 ? 'Check the focused record before acting.' : 'Active visits will appear here.',
    };
  }

  if (option.id === 'completed') {
    return {
      icon: CheckCircle,
      tone: 'clear',
      label: 'Done',
      headline: count > 0 ? `${count} completed visit${count === 1 ? '' : 's'}` : 'No completed visits',
      subhead: count > 0 ? 'Use completed visits as read-only care history.' : 'Completed visits will appear here.',
    };
  }

  if (option.id === 'cancelled') {
    return {
      icon: AlertCircle,
      tone: 'muted',
      label: 'Cancelled',
      headline: count > 0 ? `${count} cancelled visit${count === 1 ? '' : 's'}` : 'No cancelled visits',
      subhead: count > 0 ? 'Review these records without changing outcomes.' : 'Cancelled visits will appear here.',
    };
  }

  return {
    icon: Calendar,
    tone: 'primary',
    label: 'Visits',
    headline: count > 0 ? `${count} visit record${count === 1 ? '' : 's'}` : 'No visit records',
    subhead: count > 0 ? 'Pick one record, then view details or edit scheduling.' : 'Schedule the first visit when care is ready.',
  };
};

export const VisitsPage = () => {
  const { user, isAdmin, isOrgAdmin, isProvider } = useAuth();
  const { isMobile } = useNavigation();
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
  const [patients, setPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [visitPageStats, setVisitPageStats] = useState(null);
  const [visitPageError, setVisitPageError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'desc' });
  const [focusedVisitId, setFocusedVisitId] = useState(null);

  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    request: null
  });

  const { viewMode, setViewMode } = useViewMode('visits-page', 'grid');
  const pagination = usePagination(20);
  const { paginationRange, setTotalCount } = pagination;
  const canEditVisits = isAdmin() || isOrgAdmin();
  const canCreateVisits = isAdmin() || isOrgAdmin() || isProvider();
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const actionFeedbackTimerRef = useRef(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const focusedVisit = React.useMemo(() => (
    visits.find((visit) => visit.id === focusedVisitId) || visits[0] || null
  ), [visits, focusedVisitId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
      if (actionFeedbackTimerRef.current) {
        window.clearTimeout(actionFeedbackTimerRef.current);
      }
    };
  }, []);

  const markActionFeedback = useCallback((actionId) => {
    if (!actionId) return;
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
    setActiveActionFeedback(actionId);
    actionFeedbackTimerRef.current = window.setTimeout(() => {
      setActiveActionFeedback(current => current === actionId ? null : current);
    }, 900);
  }, []);

  const fetchVisits = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setVisitPageError(null);
      }

      const pageData = await getVisitsPageData({
        filters,
        kpiFilter,
        range: paginationRange,
        sortConfig,
        quiet: true,
      });

      if (!isMountedRef.current || fetchRequestRef.current !== requestId) {
        return;
      }

      setTotalCount(pageData.count || 0);
      setVisitPageStats(pageData.stats || null);
      setVisits(pageData.visits || []);
      setVisitPageError(null);
    } catch (error) {
      if (!isMountedRef.current || fetchRequestRef.current !== requestId) {
        return;
      }

      console.error('Error fetching visits:', error);
      setVisitPageError('Visits could not load. Try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (isMountedRef.current && fetchRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [filters, kpiFilter, paginationRange, setTotalCount, sortConfig]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits, pagination.currentPage]);

  useEffect(() => {
    if (!visits.length) {
      if (focusedVisitId !== null) setFocusedVisitId(null);
      return;
    }

    if (!visits.some((visit) => visit.id === focusedVisitId)) {
      setFocusedVisitId(visits[0].id);
    }
  }, [visits, focusedVisitId]);

  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          if (active && isMountedRef.current) {
            fetchVisits();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
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
    markActionFeedback('create');
    setSelectedVisit(null);
    setModalMode('create');
  }, [markActionFeedback]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const visitPanelContext = React.useMemo(() => ({
    stats: visitPageStats || {},
    recent: visits.slice(0, 4),
    focusedVisit,
    count: pagination.totalCount || visits.length,
    loading,
    errorMessage: visitPageError,
    currentState: kpiFilter,
    canCreate: canCreateVisits,
    canEdit: canEditVisits,
  }), [
    canCreateVisits,
    canEditVisits,
    focusedVisit,
    kpiFilter,
    loading,
    pagination.totalCount,
    visitPageError,
    visitPageStats,
    visits,
  ]);

  const publishVisitsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('visitsRouteContextUpdated', {
      detail: visitPanelContext,
    }));
  }, [visitPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishVisitsRouteContext();
    window.addEventListener('requestVisitsRouteContext', publishVisitsRouteContext);

    return () => {
      window.removeEventListener('requestVisitsRouteContext', publishVisitsRouteContext);
    };
  }, [publishVisitsRouteContext]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => {
      handleCreate();
    };

    const handleOpenEmergency = (e) => {
      markActionFeedback('emergency-context');
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
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters, markActionFeedback]);

  const handleView = useCallback((visit) => {
    markActionFeedback(`view-${visit?.id || 'unknown'}`);
    setFocusedVisitId(visit?.id || null);
    setSelectedVisit(visit);
    setModalMode('view');
  }, [markActionFeedback]);

  const handleEdit = useCallback((visit) => {
    markActionFeedback(`edit-${visit?.id || 'unknown'}`);
    setFocusedVisitId(visit?.id || null);
    setSelectedVisit(visit);
    setModalMode('edit');
  }, [markActionFeedback]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

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
      placeholder: 'Search visits...'
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
      onClick={handleOpenFilters}
      className={`squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative transition-all ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
      aria-label="Filter visits"
      aria-busy={activeActionFeedback === 'filters'}
      data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.visit_type && filters.visit_type.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [activeActionFeedback, filters, handleOpenFilters]);

  const headerActions = React.useMemo(() => {
    // Only Admins, Org Admins, and Providers can create new visits
    if (canCreateVisits) {
      return (
        <Button
          onClick={handleCreate}
          className={`bg-card/70 h-9 px-4 text-[10px] font-bold tracking-widest uppercase transition-all ${activeActionFeedback === 'create' ? 'scale-95 bg-primary/10 text-primary' : ''}`}
          aria-busy={activeActionFeedback === 'create'}
          data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
        >
          <Plus className="h-4 w-4 mr-2" />
          {activeActionFeedback === 'create' ? 'Opening...' : 'New visit'}
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, canCreateVisits, handleCreate]);

  usePageHeader(
    "Visits",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Visits" description="Schedule and manage visits." />
        <MobileVisits
          visits={visits}
          loading={loading}
          statistics={visitPageStats}
          filters={filters}
          setFilters={setFilters}
          activeKpi={kpiFilter}
          onKpiChange={setKpiFilter}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchVisits}
          errorMessage={visitPageError}
          onRetry={fetchVisits}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          canEdit={canEditVisits}
          canDelete={false}
          selectionEnabled={false}
          onOpenFilters={handleOpenFilters}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
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

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={visitPageStats}
          type="visit"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Visits" description="Schedule and manage visits." />
      <div className="pt-2" />

      <div className="grid min-h-[calc(100dvh-7rem)] grid-cols-1 gap-5 px-4 pb-8 pt-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <section className="min-w-0">
          <VisitSignalPanel
            stats={visitPageStats}
            visits={visits}
            loading={loading}
            kpiFilter={kpiFilter}
            setKpiFilter={setKpiFilter}
          />

          <VisitActivitySheet
            filters={filters}
            setFilters={setFilters}
            openFilters={handleOpenFilters}
            loading={loading}
            pagination={pagination}
            errorMessage={visitPageError}
            onRetry={fetchVisits}
            activeActionFeedback={activeActionFeedback}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <>
                {viewMode === 'grid' && (
                  visits.length === 0 ? (
                    <Card className="squircle-lg bg-card/70 p-12 text-center">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-bold text-xl mb-2">No visits yet</h3>
                      <p className="text-muted-foreground mb-6">Schedule the first visit.</p>
                      <Button onClick={handleCreate} className="bg-card/70" data-testid="add-first-visit-btn" aria-label="Schedule your first visit">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule first visit
                      </Button>
                    </Card>
                  ) : (
                    <LayoutGroup>
                      <motion.div
                        layout
                        className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
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
                            <Card
                              className={`h-full squircle-xl bg-card/70 p-6 hover-lift group relative overflow-hidden flex flex-col cursor-pointer transition-[transform,box-shadow,background] duration-200 ${focusedVisit?.id === visit.id ? 'bg-primary/6 shadow-[0_24px_80px_hsl(var(--primary)/0.14)]' : ''}`}
                              data-testid={`visit-card-${visit.id}`}
                              role="button"
                              tabIndex={0}
                              aria-pressed={focusedVisit?.id === visit.id}
                              onClick={() => setFocusedVisitId(visit.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setFocusedVisitId(visit.id);
                                }
                              }}
                            >
                              <div className="hover-glow hover-glow-primary" />

                              <div className="absolute top-0 right-0 p-5 z-20">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-info/10 blur-xl rounded-full scale-150" />
                                  <div className="w-10 h-10 squircle-sm surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                    <Calendar className="h-5 w-5 text-info" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-4 relative z-10 flex-wrap mr-12">
                                <Badge className={`squircle-sm ${getStatusBadge(visit.status)} font-bold editorial-subtitle px-3 py-1`}>
                                  {visit.status || 'scheduled'}
                                </Badge>
                                {visit.visit_type && (
                                  <Badge className="squircle-sm bg-primary/10 text-primary px-2 py-1 font-semibold">
                                    {visit.visit_type}
                                  </Badge>
                                )}
                                {visit.cost && (
                                  <Badge className="squircle-sm font-mono text-xs bg-emerald-500/10 text-emerald-500">
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
                                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-primary" />
                                    <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Patient</p>
                                  </div>
                                  <p className="font-semibold truncate">{visit.patient?.username || visit.user_id ? 'Linked' : 'Unknown'}</p>
                                </div>

                                <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-purple-500" />
                                    <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Doctor</p>
                                  </div>
                                  <p className="font-semibold truncate">
                                    {visit.doctor?.name || visit.doctor || (visit.doctor_name ? 'Linked' : 'Unassigned')}
                                  </p>
                                </div>

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

                              <div className="flex items-center justify-between mt-auto pt-4 relative z-10 px-2 ">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  #{visit.id?.slice(0, 8)}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      markActionFeedback(`view-${visit.id}`);
                                      handleView(visit);
                                    }}
                                    className={`squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${activeActionFeedback === `view-${visit.id}` ? 'bg-primary/10 text-primary scale-95' : ''}`}
                                    title="View Details"
                                    aria-busy={activeActionFeedback === `view-${visit.id}`}
                                    data-state={activeActionFeedback === `view-${visit.id}` ? 'opening' : 'idle'}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canEditVisits && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        markActionFeedback(`edit-${visit.id}`);
                                        handleEdit(visit);
                                      }}
                                      className={`squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${activeActionFeedback === `edit-${visit.id}` ? 'bg-primary/10 text-primary scale-95' : ''}`}
                                      title="Edit"
                                      aria-busy={activeActionFeedback === `edit-${visit.id}`}
                                      data-state={activeActionFeedback === `edit-${visit.id}` ? 'opening' : 'idle'}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
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
                    onFocus={(v) => setFocusedVisitId(v?.id || null)}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canEdit={canEditVisits}
                    canDelete={false}
                    selectionEnabled={false}
                  />
                )}
                {viewMode === 'table' && (
                  <VisitTableView
                    visits={visits}
                    onView={handleView}
                    onEdit={handleEdit}
                    onFocus={(v) => setFocusedVisitId(v?.id || null)}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canEdit={canEditVisits}
                    canDelete={false}
                    selectionEnabled={false}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                )}
              </>
            )}
          </VisitActivitySheet>
        </section>

        <VisitsDetailRail
          visit={focusedVisit}
          loading={loading}
          canEdit={canEditVisits}
          onView={handleView}
          onEdit={handleEdit}
          activeActionFeedback={activeActionFeedback}
        />
      </div>

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

      <EmergencyDetailsModal
        isOpen={emergencyModal.isOpen}
        onClose={() => setEmergencyModal(prev => ({ ...prev, isOpen: false }))}
        request={emergencyModal.request}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={visitPageStats}
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

const VisitSignalPanel = ({ stats, visits, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? {
      icon: Calendar,
      tone: 'muted',
      label: 'Loading',
      headline: 'Loading visits',
      subhead: 'One moment while the latest records come in.',
    }
    : getVisitSignal({ stats, visits, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[248px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[310px]"
    >
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${visitToneClass[signal.tone] || visitToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            {signal.headline}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {signal.subhead}
          </p>
        </div>

        <VisitStateStrip
          stats={stats}
          visits={visits}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const VisitStateStrip = ({ stats, visits, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5">
    {visitStateOptions.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getVisitStateCount({ id: item.id, stats, visits });

      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-[24px] px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`Show ${item.label.toLowerCase()} visits`}
          data-state={active ? 'selected' : 'idle'}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-background/45 transition-transform group-hover:scale-105 ${active ? item.colorClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const VisitActivitySheet = ({ filters, setFilters, openFilters, loading, pagination, errorMessage, onRetry, activeActionFeedback, children }) => (
  <section
    className="mt-2 flex min-h-[520px] flex-col rounded-t-[44px] bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] dark:bg-card/50 md:rounded-[44px]"
    data-testid="visits-activity-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-full bg-foreground/20" />
    <VisitSheetToolbar
      filters={filters}
      setFilters={setFilters}
      openFilters={openFilters}
      activeActionFeedback={activeActionFeedback}
    />

    <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? 'Loading visits' : `${pagination.totalCount} visits`}</span>
      <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
    </div>

    {errorMessage && (
      <VisitErrorBanner message={errorMessage} onRetry={onRetry} />
    )}

    <div className="mt-3 min-h-[360px] flex-1 overflow-y-auto rounded-[30px] bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
      {children}
    </div>

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
  </section>
);

const VisitErrorBanner = ({ message, onRetry }) => (
  <div
    className="mt-3 flex flex-col gap-3 rounded-[24px] bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
    data-testid="visits-error-state"
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Visits could not load</p>
        <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-10 shrink-0 rounded-[20px] bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

const VisitSheetToolbar = ({ filters, setFilters, openFilters, activeActionFeedback }) => {
  const hasFilter = Boolean(
    filters.search ||
    (filters.status && filters.status.length > 0) ||
    (filters.visit_type && filters.visit_type.length > 0) ||
    filters.date
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={filters.search || ''}
          onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
          placeholder="Search visits..."
          className="h-12 w-full rounded-[24px] bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
          data-testid="visits-sheet-search"
        />
      </div>
      <Button
        variant="ghost"
        onClick={openFilters}
        className={`h-12 rounded-[24px] bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95 ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
        aria-busy={activeActionFeedback === 'filters'}
        data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
      >
        <Filter className="mr-2 h-4 w-4" />
        {activeActionFeedback === 'filters' ? 'Opening' : 'Filters'}
        {hasFilter && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
      </Button>
    </div>
  );
};

// formatVisitType / getVisitPatientLabel / getVisitFacilityLabel now come from the
// shared visitRowProjection so record identity (full_name-first patient, facility-first
// label) is decided in one place. Only the rail-specific doctor label stays local.
const getVisitDoctorLabel = (visit) => (
  visit?.doctor?.name ||
  visit?.doctor ||
  visit?.doctor_name ||
  'Unassigned'
);

const VisitsDetailRail = ({ visit, loading, canEdit, onView, onEdit, activeActionFeedback }) => {
  if (loading) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col rounded-[40px] bg-card/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] ">
          <div className="h-5 w-28 rounded-full bg-muted/40" />
          <div className="mt-6 h-24 rounded-[28px] bg-muted/28" />
          <div className="mt-4 space-y-3">
            <div className="h-14 rounded-2xl bg-muted/24" />
            <div className="h-14 rounded-2xl bg-muted/24" />
            <div className="h-14 rounded-2xl bg-muted/24" />
          </div>
        </div>
      </aside>
    );
  }

  if (!visit) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col justify-center rounded-[40px] bg-card/70 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.16)] ">
          <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No visit selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visits will appear here when the list has results.</p>
        </div>
      </aside>
    );
  }

  const status = String(visit.status || 'scheduled').replace(/_/g, ' ');
  const roomLabel = visit.room_number ? `Room ${visit.room_number}` : 'No room';
  const dateLabel = formatDate(visit.date || visit.created_at);
  const viewOpening = activeActionFeedback === `view-${visit.id}`;
  const editOpening = activeActionFeedback === `edit-${visit.id}`;

  return (
    <aside className="hidden min-h-0 lg:flex lg:flex-col">
      <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-[40px] bg-card/72 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] ">
        <div className="flex items-center justify-between gap-3">
          <Badge className={`${visit.status === 'completed' ? 'bg-success/16 text-success' : visit.status === 'cancelled' ? 'bg-destructive/14 text-destructive' : visit.status === 'in_progress' ? 'bg-warning/16 text-warning' : 'bg-info/16 text-info'} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]`}>
            {status}
          </Badge>
          <span className="rounded-full bg-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Focus
          </span>
        </div>

        <div className="mt-6 rounded-[32px] bg-background/42 p-5 ">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[0_18px_50px_hsl(var(--primary)/0.14)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current visit</p>
              <h2 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-tight">
                {formatVisitType(visit)}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {dateLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          <VisitFocusRow icon={User} label="Patient" value={getVisitPatientLabel(visit)} />
          <VisitFocusRow icon={Stethoscope} label="Practitioner" value={getVisitDoctorLabel(visit)} />
          <VisitFocusRow icon={Hospital} label="Facility" value={getVisitFacilityLabel(visit)} />
          <VisitFocusRow icon={MapPin} label="Location" value={roomLabel} />

          <div className="rounded-[28px] bg-muted/22 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Record</p>
            <p className="mt-2 break-all font-mono text-xs text-foreground/70">#{visit.id}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(visit)}
            className={`h-12 w-full rounded-2xl bg-foreground text-sm font-semibold text-background shadow-[0_18px_46px_rgba(0,0,0,0.18)] transition-all hover:scale-[1.01] hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
            aria-busy={viewOpening}
            data-state={viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening...' : 'View'}
            <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(visit)}
              className={`h-12 w-full rounded-2xl bg-muted/26 text-sm font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95 ${editOpening ? 'bg-primary/10 text-primary scale-95' : ''}`}
              aria-busy={editOpening}
              data-state={editOpening ? 'opening' : 'idle'}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editOpening ? 'Opening...' : 'Edit'}
            </Button>
          )}
          <p className="px-2 pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
            Outcome and delete actions are locked for now.
          </p>
        </div>
      </div>
    </aside>
  );
};

const VisitFocusRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[24px] bg-muted/24 p-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  </div>
);
