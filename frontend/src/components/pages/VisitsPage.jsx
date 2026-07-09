import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createVisit, updateVisit, getVisit, getVisitsPageData } from '../../services/visitsService';
import { getHospitals } from '../../services/hospitalsService';
import { getProfiles } from '../../services/profilesService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { Button } from '../ui/button';
import { PaginationControls } from '../ui/PaginationControls';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit,
  Eye,
  Filter,
  Hospital,
  LayoutGrid,
  MapPin,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { VisitModal } from '../modals/VisitModal';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileVisits } from '../mobile/MobileVisits';
import { formatVisitType, getVisitPatientLabel, getVisitFacilityLabel } from '../../utils/visitRowProjection';

const normalizeVisitCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

// Day-aware time (Requests canon): today -> time, yesterday -> "Yesterday, time",
// this year -> "Mon D, time", older -> full date. Local day boundaries, never UTC.
// Swap for the shared request-time util once the mobile lane's extraction lands.
const formatVisitDayTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDelta === 0) return time;
  if (dayDelta === 1) return `Yesterday, ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const visitStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    countKey: 'total',
    tone: 'primary',
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:bg-white/[0.06]',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: Clock,
    countKey: 'scheduled',
    tone: 'info',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-cyan-200',
  },
  {
    id: 'in_progress',
    label: 'Active',
    icon: PlayCircle,
    countKey: 'inProgress',
    tone: 'warning',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-amber-200',
  },
  {
    id: 'completed',
    label: 'Done',
    icon: CheckCircle,
    countKey: 'completed',
    tone: 'clear',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-emerald-200',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertCircle,
    countKey: 'cancelled',
    tone: 'muted',
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/36 text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)]',
  },
];

// KPI canon (MANAGEMENT_PAGE_STANDARDS S1.2): at most 3 chips, smart-context selection.
// Tiles match the Requests/Today glance tile exactly; neutral at rest, colour when selected.
const VISIT_KPI_REST = 'bg-card/65 text-muted-foreground shadow-[0_16px_38px_rgb(0_0_0/0.08)] hover:bg-card/82 dark:bg-white/[0.055] dark:hover:bg-white/[0.085]';
const VISIT_KPI_IMPORTANCE = { all: 0, scheduled: 1, in_progress: 2, completed: 3, cancelled: 4 };
// Actionable states pin ONLY while they carry signal (count > 0); a zero-count chip
// never occupies a slot another option could fill with real data.
const PINNED_VISIT_STATE_IDS = ['scheduled', 'in_progress'];

const getVisitStateCount = ({ id, stats, visits }) => {
  const option = visitStateOptions.find((item) => item.id === id) || visitStateOptions[0];
  const fallback = id === 'all'
    ? visits.length
    : visits.filter((visit) => visit.status === id).length;

  return normalizeVisitCount(stats?.[option.countKey], fallback);
};

const rankVisitStateOptions = ({ stats, visits }) =>
  visitStateOptions
    .map((option) => ({ option, count: getVisitStateCount({ id: option.id, stats, visits }) }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        (VISIT_KPI_IMPORTANCE[a.option.id] ?? 9) - (VISIT_KPI_IMPORTANCE[b.option.id] ?? 9)
    )
    .map((entry) => entry.option);

const selectPrimaryVisitStates = ({ stats, visits, kpiFilter }) => {
  const pinned = PINNED_VISIT_STATE_IDS.filter(
    (id) => getVisitStateCount({ id, stats, visits }) > 0
  );
  const chosen = new Set(pinned);
  if (kpiFilter && !chosen.has(kpiFilter)) {
    chosen.add(kpiFilter);
  }
  for (const option of rankVisitStateOptions({ stats, visits })) {
    if (chosen.size >= 3) break;
    chosen.add(option.id);
  }
  return visitStateOptions.filter((option) => chosen.has(option.id)).slice(0, 3);
};

// Default resolves to a chip that carries signal; falls back to All, never a
// zero-count actionable chip.
const getDefaultVisitKpi = (stats) => {
  if (normalizeVisitCount(stats?.scheduled, 0) > 0) return 'scheduled';
  if (normalizeVisitCount(stats?.inProgress, 0) > 0) return 'in_progress';
  return 'all';
};

const visitToneClass = {
  primary: 'bg-foreground/[0.06] text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:bg-white/[0.06]',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)]',
};

// Canonical status pills (literal palette -- the theme's info/success/warning tokens
// all render red): scheduled cyan, active amber, done emerald, cancelled muted.
const visitStatusPillClass = {
  scheduled: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  cancelled: 'bg-muted/40 text-muted-foreground',
};

const visitStatusLabel = {
  scheduled: 'Scheduled',
  in_progress: 'Active',
  completed: 'Done',
  cancelled: 'Cancelled',
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

const VISIT_EMPTY_HEADINGS = {
  scheduled: 'No scheduled visits',
  in_progress: 'No active visits',
  completed: 'No completed visits',
  cancelled: 'No cancelled visits',
};

export const VisitsPage = () => {
  const { user, isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
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
          toast.error('Failed to load clinical record');
        }
      };

      fetchAndOpenVisit();
    }
  }, [location.search]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState(null);
  const [patients, setPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [visitPageStats, setVisitPageStats] = useState(null);
  const [visitPageError, setVisitPageError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [focusedVisitId, setFocusedVisitId] = useState(null);

  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    request: null
  });

  const pagination = usePagination(20);
  const { paginationRange, setTotalCount } = pagination;
  const canEditVisits = isAdmin() || isOrgAdmin();
  const canCreateVisits = isAdmin() || isOrgAdmin() || isProvider();
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  // KPI default resolves to a chip with live signal (S1.2); explicit taps override it.
  const selectedKpiFilter = React.useMemo(
    () => kpiFilter || getDefaultVisitKpi(visitPageStats),
    [kpiFilter, visitPageStats]
  );
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
        // Replace-in-place loading truth (S1.6): the skeleton only holds the page
        // while it assembles for the first time; every later fetch (realtime, chips,
        // search, retry) is a background refetch surfaced by the Updating pill.
        if (!hasLoadedRef.current) setLoading(true);
        setIsFetching(true);
        setVisitPageError(null);
      }

      const pageData = await getVisitsPageData({
        filters,
        kpiFilter: selectedKpiFilter,
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
        hasLoadedRef.current = true;
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [filters, selectedKpiFilter, paginationRange, setTotalCount, sortConfig]);

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
    currentState: selectedKpiFilter,
    canCreate: canCreateVisits,
    canEdit: canEditVisits,
  }), [
    canCreateVisits,
    canEditVisits,
    focusedVisit,
    selectedKpiFilter,
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
    // A visit's patient must be an explicit choice: the old `|| user.id` fallback
    // silently wrote the OPERATOR as the patient (data-sync audit S11.3).
    if (modalMode === 'create' && !formData.user_id) {
      toast.error('Pick a patient before scheduling.');
      throw new Error('patient_required');
    }

    try {
      if (modalMode === 'create') {
        await createVisit({
          ...formData,
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
  }, [modalMode, selectedVisit, fetchVisits]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedVisit(null);
    if (shouldRefresh) {
      fetchVisits();
    }
  }, [fetchVisits]);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search Visits',
      placeholder: 'Search by ID, type, facility, practitioner, or room...'
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

  usePageHeader("Visits");
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Visits" description="Schedule and manage visits." />
        <MobileVisits
          visits={visits}
          loading={loading}
          isFetching={isFetching}
          count={pagination.totalCount || visits.length}
          statistics={visitPageStats}
          filters={filters}
          setFilters={setFilters}
          activeKpi={selectedKpiFilter}
          onKpiChange={setKpiFilter}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchVisits}
          errorMessage={visitPageError}
          onRetry={fetchVisits}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          viewerIsDoctor={isProvider() && !isDriver()}
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
            kpiFilter={selectedKpiFilter}
            setKpiFilter={setKpiFilter}
          />

          <VisitActivitySheet
            filters={filters}
            setFilters={setFilters}
            openFilters={handleOpenFilters}
            loading={loading}
            isFetching={isFetching}
            pagination={pagination}
            errorMessage={visitPageError}
            onRetry={fetchVisits}
            onRefresh={fetchVisits}
            onCreate={handleCreate}
            canCreate={canCreateVisits}
            activeActionFeedback={activeActionFeedback}
          >
            {loading ? (
              <VisitSkeletonRows />
            ) : (
              <>
                <VisitListHeader sortConfig={sortConfig} onSort={handleSort} />

                {visits.length === 0 && !visitPageError && (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-muted/16 p-10 text-center">
                    <Calendar className="mb-4 h-12 w-12 text-muted-foreground/65" />
                    <h3 className="text-xl font-semibold">
                      {hasActiveVisitFilters(filters)
                        ? 'No matching visits'
                        : (VISIT_EMPTY_HEADINGS[selectedKpiFilter] || 'No visits yet')}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {hasActiveVisitFilters(filters)
                        ? 'Change filters or search again.'
                        : 'Schedule the first visit when care is ready.'}
                    </p>
                    <div className="mt-5 flex items-center gap-2">
                      {hasActiveVisitFilters(filters) && (
                        <Button
                          variant="ghost"
                          onClick={() => setFilters({})}
                          className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                        >
                          Show all visits
                        </Button>
                      )}
                      {canCreateVisits && !hasActiveVisitFilters(filters) && (
                        <Button
                          onClick={handleCreate}
                          data-testid="add-first-visit-btn"
                          aria-label="Schedule your first visit"
                          className="h-10 rounded-button bg-foreground px-4 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Schedule first visit
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {visits.map((visit) => (
                  <VisitRow
                    key={visit.id}
                    visit={visit}
                    selected={focusedVisit?.id === visit.id}
                    onFocus={() => setFocusedVisitId(visit.id)}
                    onView={handleView}
                  />
                ))}
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
        viewToggle={null}
        isMobile={isMobile}
      />
    </div >
  );
};

const hasActiveVisitFilters = (filters = {}) => Boolean(
  filters.search ||
  (filters.status && filters.status.length > 0) ||
  (filters.visit_type && filters.visit_type.length > 0) ||
  filters.date
);

// No entrance animation: the signal panel paints truthfully on first frame
// (motion canon -- a frozen mid-flight entrance left this panel at 39% opacity).
const VisitSignalPanel = ({ stats, visits, loading, kpiFilter, setKpiFilter }) => {
  const signal = getVisitSignal({ stats, visits, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <section className="flex min-h-[248px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[310px]">
      <div className="min-w-0">
        <div className="max-w-2xl">
          {loading ? (
            <>
              <Shimmer className="h-8 w-28 rounded-pill" />
              <Shimmer className="mt-4 h-12 w-80 max-w-full rounded-card" />
              <Shimmer className="mt-3 h-4 w-56 max-w-full rounded-pill" />
            </>
          ) : (
            <>
              <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${visitToneClass[signal.tone] || visitToneClass.muted}`}>
                <SignalIcon className="h-4 w-4" />
                {signal.label}
              </div>
              <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
                {signal.headline}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                {signal.subhead}
              </p>
            </>
          )}
        </div>

        <VisitStateStrip
          stats={stats}
          visits={visits}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </section>
  );
};

const VisitStateStrip = ({ stats, visits, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
    {loading ? (
      [0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-h-[66px] rounded-inner bg-card/65 px-3 py-2.5 shadow-[0_16px_38px_rgb(0_0_0/0.08)] sm:px-4 md:py-3 dark:bg-white/[0.055]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2">
              <Shimmer className="h-3 w-16 rounded-pill" />
              <Shimmer className="h-6 w-9 rounded-inner" />
            </div>
            <Shimmer className="h-7 w-7 rounded-pill" />
          </div>
        </div>
      ))
    ) : (
      selectPrimaryVisitStates({ stats, visits, kpiFilter }).map((item) => {
        const Icon = item.icon;
        const active = (kpiFilter || 'all') === item.id;
        const count = getVisitStateCount({ id: item.id, stats, visits });

        return (
          <motion.button
            key={item.id}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setKpiFilter(active && item.id !== 'all' ? 'all' : item.id)}
            data-visit-state={item.id}
            data-state={active ? 'selected' : 'idle'}
            className={`group min-h-[66px] rounded-inner px-3 py-2.5 text-left transition-[background,box-shadow,transform] duration-200 sm:px-4 md:py-3 ${active ? item.activeClass : VISIT_KPI_REST}`}
            aria-pressed={active}
            aria-label={`Show ${item.label.toLowerCase()} visits`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[10px] font-medium leading-tight sm:text-[11px]">{item.label}</span>
                <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
              </span>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-background/45 transition-transform group-hover:scale-105 ${active ? item.colorClass : ''}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
            </span>
          </motion.button>
        );
      })
    )}
  </div>
);

const VisitActivitySheet = ({ filters, setFilters, openFilters, loading, isFetching, pagination, errorMessage, onRetry, onRefresh, onCreate, canCreate, activeActionFeedback, children }) => (
  <section
    className="mt-2 flex min-h-[520px] flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.10)] dark:bg-card/50 md:rounded-sheet"
    data-testid="visits-activity-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    <VisitSheetToolbar
      filters={filters}
      setFilters={setFilters}
      openFilters={openFilters}
      onRefresh={onRefresh}
      refreshing={isFetching}
      onCreate={onCreate}
      canCreate={canCreate}
      activeActionFeedback={activeActionFeedback}
    />

    <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? 'Loading visits' : `${pagination.totalCount} visits`}</span>
      <span className="flex items-center gap-2">
        {isFetching && !loading && (
          <span role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            Updating
          </span>
        )}
        <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
      </span>
    </div>

    {errorMessage && (
      <VisitErrorBanner message={errorMessage} onRetry={onRetry} />
    )}

    <div className="mt-3 min-h-[360px] flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
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
    className="mt-3 flex flex-col gap-3 rounded-card bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    data-testid="visits-error-state"
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive/75" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Visits could not load</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-10 shrink-0 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

const VisitSheetToolbar = ({ filters, setFilters, openFilters, onRefresh, refreshing = false, onCreate, canCreate = false, activeActionFeedback }) => {
  // Debounced search: the input edits a local draft; the query filter commits 300ms
  // after typing pauses -- one refetch per pause, not one per keystroke over the
  // full visit resolution read.
  const [searchDraft, setSearchDraft] = useState(filters.search || '');

  useEffect(() => {
    setSearchDraft(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    if ((filters.search || '') === searchDraft) return undefined;
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchDraft }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, setFilters]);

  const hasFilter = hasActiveVisitFilters(filters);

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search by ID, type, facility, practitioner, or room..."
          className="h-12 w-full rounded-button bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_2px_hsl(var(--foreground)/0.22)]"
          data-testid="visits-sheet-search"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={refreshing}
        className="h-12 w-12 rounded-button bg-muted/30 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 disabled:opacity-60"
        aria-label={refreshing ? 'Refreshing visits' : 'Refresh visits'}
        title={refreshing ? 'Refreshing...' : 'Refresh'}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        variant="ghost"
        onClick={openFilters}
        className={`h-12 rounded-button bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${activeActionFeedback === 'filters' ? 'bg-foreground/10 text-foreground scale-95' : ''}`}
        aria-busy={activeActionFeedback === 'filters'}
        data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
      >
        <Filter className="mr-2 h-4 w-4" />
        {activeActionFeedback === 'filters' ? 'Opening' : 'Filters'}
        {hasFilter && <span className="ml-2 h-2 w-2 rounded-pill bg-foreground/60" />}
      </Button>
      {canCreate && (
        <Button
          onClick={onCreate}
          className={`h-12 rounded-button bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-95 ${activeActionFeedback === 'create' ? 'scale-95' : ''}`}
          aria-busy={activeActionFeedback === 'create'}
          data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {activeActionFeedback === 'create' ? 'Opening...' : 'New visit'}
        </Button>
      )}
    </div>
  );
};

// Patient | Status | Type | Facility | Time | Action -- one canonical render
// (Requests table idiom). Cost cut per arbitration: live data never carries it.
const VISIT_GRID_COLS = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(96px,0.7fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';

const SortableColumnHeader = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;
  return (
    // aria-sort lives on a columnheader-roled wrapper (accessibility canon).
    <span
      role="columnheader"
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort?.(sortKey)}
        data-state={isSorted ? 'sorted' : 'idle'}
        className={`flex items-center gap-1 transition-colors hover:text-foreground active:scale-[0.96] ${className}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isSorted ? (
          direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </span>
  );
};

const VisitListHeader = ({ sortConfig, onSort }) => (
  <div className={`grid ${VISIT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    <SortableColumnHeader label="Patient" sortKey="user_id" sortConfig={sortConfig} onSort={onSort} />
    <SortableColumnHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={onSort} />
    <SortableColumnHeader label="Type" sortKey="type" sortConfig={sortConfig} onSort={onSort} />
    <SortableColumnHeader label="Facility" sortKey="hospital_id" sortConfig={sortConfig} onSort={onSort} />
    <SortableColumnHeader label="Time" sortKey="date" sortConfig={sortConfig} onSort={onSort} />
    <span className="text-right">Action</span>
  </div>
);

const VisitRow = ({ visit, selected, onFocus, onView }) => {
  const patientName = getVisitPatientLabel(visit);
  const patientEmail = visit?.patient?.email || null;
  const facilityName = visit?.hospital_name || (visit?.hospital_id ? getVisitFacilityLabel(visit) : 'Unknown facility');
  const statusKey = visit?.status || 'scheduled';
  const initial = String(patientName || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <motion.div
      layout="position"
      className={`group mb-2 grid min-h-[72px] ${VISIT_GRID_COLS} items-center gap-2 rounded-card px-4 py-3 transition-[background,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'bg-card/88 shadow-[0_6px_16px_rgb(0_0_0/0.12)] dark:bg-white/[0.08]' : 'bg-card/50 hover:-translate-y-0.5 hover:bg-card/72 hover:shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]'}`}
      data-visit-row={visit.id}
      data-state={selected ? 'selected' : 'idle'}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onView(visit);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      aria-pressed={selected}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-foreground/[0.06] text-sm font-semibold text-foreground dark:bg-white/[0.08]">
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{patientName}</span>
          {patientEmail && (
            <span className="block truncate text-xs text-muted-foreground">{patientEmail}</span>
          )}
        </span>
      </span>

      <span>
        <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold ${visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}`}>
          {visitStatusLabel[statusKey] || statusKey}
        </span>
      </span>

      <span className="truncate text-sm text-foreground/85">{formatVisitType(visit)}</span>

      <span className="truncate text-sm text-muted-foreground">{facilityName}</span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatVisitDayTime(visit.date || visit.created_at)}
      </span>

      <span className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onView(visit);
          }}
          className="h-8 w-8 rounded-pill p-0 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
          title="View details"
          aria-label={`View visit for ${patientName}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </span>
    </motion.div>
  );
};

const Shimmer = ({ className = '' }) => (
  <span className={`block animate-pulse bg-muted/38 dark:bg-white/[0.055] ${className}`} />
);

const VisitSkeletonRows = () => (
  <div className="space-y-2">
    {Array.from({ length: 7 }).map((_, index) => (
      <Shimmer key={index} className="h-[72px] rounded-card" />
    ))}
  </div>
);

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
        <div className="sticky top-24 flex min-h-[520px] flex-col rounded-card bg-card/70 p-5 shadow-[0_12px_32px_rgb(0_0_0/0.10)]">
          <Shimmer className="h-5 w-28 rounded-pill" />
          <Shimmer className="mt-6 h-24 rounded-card" />
          <div className="mt-4 space-y-3">
            <Shimmer className="h-14 rounded-card" />
            <Shimmer className="h-14 rounded-card" />
            <Shimmer className="h-14 rounded-card" />
          </div>
        </div>
      </aside>
    );
  }

  if (!visit) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col justify-center rounded-card bg-card/70 p-6 text-center shadow-[0_12px_32px_rgb(0_0_0/0.10)]">
          <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No visit selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visits will appear here when the list has results.</p>
        </div>
      </aside>
    );
  }

  const statusKey = visit.status || 'scheduled';
  const roomLabel = visit.room_number ? `Room ${visit.room_number}` : 'No room';
  const dateLabel = formatVisitDayTime(visit.date || visit.created_at);
  const viewOpening = activeActionFeedback === `view-${visit.id}`;
  const editOpening = activeActionFeedback === `edit-${visit.id}`;

  return (
    <aside className="hidden min-h-0 lg:flex lg:flex-col">
      <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-card bg-card/70 p-5 shadow-[0_12px_32px_rgb(0_0_0/0.10)]">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}`}>
            {visitStatusLabel[statusKey] || statusKey}
          </span>
          <span className="rounded-pill bg-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Focus
          </span>
        </div>

        {/* Today-sheet surface recipe (S1.4): recessed inset hero + fill-film rows. */}
        <div className="mt-6 rounded-card bg-background/55 p-5 dark:bg-white/[0.05]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-foreground/[0.06] text-foreground dark:bg-white/[0.08]">
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

          <div className="rounded-card bg-foreground/[0.045] p-4 dark:bg-white/[0.055]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Record</p>
            <p className="mt-2 break-all font-mono text-xs text-foreground/70">#{visit.display_id || visit.id}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(visit)}
            className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-[0_6px_16px_rgb(0_0_0/0.12)] transition-all hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
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
              className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'bg-foreground/10 scale-95' : ''}`}
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
  <div className="flex items-center gap-3 rounded-card bg-foreground/[0.045] p-3 dark:bg-white/[0.055]">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  </div>
);
