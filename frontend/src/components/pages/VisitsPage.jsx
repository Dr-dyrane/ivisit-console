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
// Console design system: the workspace grammar lives in shared components --
// pages compose the canon instead of re-remembering it.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, CopyChip, StatusPill, TonedAvatar, DetailLine, StageStrip, EmptyState, ErrorBanner, LoadErrorState } from '../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { useRowSelection } from '../../hooks/useRowSelection';
import { formatDayTime } from '../../utils/dayTime';
import { Checkbox } from '../ui/checkbox';
import { BulkActionBar } from '../common/BulkActionBar';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  Filter,
  Hospital,
  Info,
  LayoutGrid,
  MapPin,
  PlayCircle,
  Plus,
  Stethoscope,
  Trash2,
} from 'lucide-react';
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

const visitStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    countKey: 'total',
    tone: 'primary',
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: Clock,
    countKey: 'scheduled',
    tone: 'info',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  },
  {
    id: 'in_progress',
    label: 'Active',
    icon: PlayCircle,
    countKey: 'inProgress',
    tone: 'warning',
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    id: 'completed',
    label: 'Done',
    icon: CheckCircle,
    countKey: 'completed',
    tone: 'clear',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertCircle,
    countKey: 'cancelled',
    tone: 'muted',
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/36 text-foreground shadow-e2',
  },
];

// Smart-context inputs (S1.2, enforced by the shared KpiStrip): actionable states
// pin only while they carry signal; slots fill data-driven by count then importance.
const VISIT_KPI_IMPORTANCE = { all: 0, scheduled: 1, in_progress: 2, completed: 3, cancelled: 4 };
const PINNED_VISIT_STATE_IDS = ['scheduled', 'in_progress'];

const getVisitStateCount = ({ id, stats, visits }) => {
  const option = visitStateOptions.find((item) => item.id === id) || visitStateOptions[0];
  const fallback = id === 'all'
    ? visits.length
    : visits.filter((visit) => visit.status === id).length;

  return normalizeVisitCount(stats?.[option.countKey], fallback);
};

// Default resolves to a chip that carries signal; falls back to All, never a
// zero-count actionable chip.
const getDefaultVisitKpi = (stats) => {
  if (normalizeVisitCount(stats?.scheduled, 0) > 0) return 'scheduled';
  if (normalizeVisitCount(stats?.inProgress, 0) > 0) return 'in_progress';
  return 'all';
};

const visitToneClass = {
  primary: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-e2',
  danger: 'bg-destructive/14 text-destructive shadow-e2',
};

// Canonical status vocabulary (literal palette -- the theme's info/success/warning
// tokens all render red): scheduled cyan, active amber, done emerald, cancelled muted.
const visitStatusPillClass = {
  scheduled: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  in_progress: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  completed: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  cancelled: 'bg-muted/40 text-muted-foreground',
};

const visitStatusLabel = {
  scheduled: 'Scheduled',
  in_progress: 'Active',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const visitStatusIcon = {
  scheduled: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle,
  cancelled: AlertCircle,
};

// Status-toned avatar wells (donor: getRequestAvatarClass).
const getVisitAvatarClass = (visit) => {
  const status = visit?.status || 'scheduled';
  if (status === 'completed') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  if (status === 'in_progress') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (status === 'cancelled') return 'bg-muted/40 text-muted-foreground';
  if (status === 'scheduled') return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  return 'bg-muted/34 text-muted-foreground';
};

// Lifecycle progression for the rail: [Scheduled, Active, Done]; cancelled all-muted.
const VISIT_STAGE_ORDER = ['scheduled', 'in_progress', 'completed'];
const VISIT_STAGE_FILL = {
  scheduled: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

const getVisitSignal = ({ stats, visits, kpiFilter, loadError }) => {
  const activeId = kpiFilter || 'all';
  const option = visitStateOptions.find((item) => item.id === activeId) || visitStateOptions[0];
  const count = getVisitStateCount({ id: option.id, stats, visits });

  // A failed load with nothing cached must not render a reassuring zero-derived
  // "all clear" hero above the list error state; surface the failure honestly.
  if (loadError && count === 0 && visits.length === 0) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Visits did not load',
      subhead: 'Retry to load the schedule.',
    };
  }

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
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  // Row selection (donor: Requests): admin-only checkboxes + select-all with
  // shift-range. Bulk OUTCOMES stay fail-closed (terminal writes locked until
  // receiver/RLS/app-consequence proof) -- the bar's action is disabled with the
  // reason, never a dead click and never a parallel write.
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(visits);

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
  const lastInsertToastAtRef = useRef(0);
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

  // Wayfinding dock slate mirrors TodayHome's useRoleKind responder fork.
  const roleKind = React.useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isOrgAdmin, isProvider, isDriver]);
  const visibleModuleRail = React.useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        (payload) => {
          // Arrival announcement (donor: Requests INSERT toast, 10s throttle).
          if (!active || !isMountedRef.current || payload?.eventType !== 'INSERT') return;
          const now = Date.now();
          if (now - lastInsertToastAtRef.current < 10000) return;
          lastInsertToastAtRef.current = now;
          const typeLabel = payload?.new?.type || null;
          toast('New visit scheduled', typeLabel ? { description: typeLabel } : undefined);
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

  // Header actions mirror the donor (Requests): the primary command is the dark
  // fg-on-bg pill in the top header, next to the header filter trigger. NOTE: the
  // donor's filter dot carries a colored glow -- banned by the neutral-shadow law;
  // the dot renders glow-free here (Requests cleans its own on DS adoption).
  const headerActions = React.useMemo(() => {
    if (!canCreateVisits) return null;
    return (
      <Button
        onClick={handleCreate}
        data-state={modalMode === 'create' ? 'open' : 'idle'}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
        aria-label="Schedule new visit"
        aria-haspopup="dialog"
        aria-expanded={modalMode === 'create'}
      >
        <Calendar className="mr-2 h-4 w-4" />
        New visit
      </Button>
    );
  }, [canCreateVisits, handleCreate, modalMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      data-state={filterSheetOpen ? 'open' : 'idle'}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter visits"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasActiveVisitFilters(filters) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, filters, handleOpenFilters]);

  usePageHeader(
    'Visits',
    headerActions,
    null,
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

      <VisitsDesktopWorkspace
        visits={visits}
        loading={loading}
        isFetching={isFetching}
        stats={visitPageStats}
        filters={filters}
        setFilters={setFilters}
        kpiFilter={selectedKpiFilter}
        setKpiFilter={setKpiFilter}
        focusedVisit={focusedVisit}
        setFocusedVisitId={setFocusedVisitId}
        canEdit={canEditVisits}
        canCreate={canCreateVisits}
        onView={handleView}
        onEdit={handleEdit}
        onCreate={handleCreate}
        pagination={pagination}
        openFilters={handleOpenFilters}
        filterSheetOpen={filterSheetOpen}
        loadError={visitPageError}
        onRetry={fetchVisits}
        onRefresh={fetchVisits}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
        sortConfig={sortConfig}
        onSort={handleSort}
        activeActionFeedback={activeActionFeedback}
        selectable={isAdmin()}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        allSelected={allSelected}
        someSelected={someSelected}
      />

      {isAdmin() && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive disabled:opacity-40"
            title="Bulk visit outcomes are locked until backend authority is proved"
            aria-label="Bulk visit outcomes are locked until backend authority is proved"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

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

const VisitsDesktopWorkspace = ({
  visits,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedVisit,
  setFocusedVisitId,
  canEdit,
  canCreate,
  onView,
  onEdit,
  onCreate,
  pagination,
  openFilters,
  filterSheetOpen,
  loadError,
  onRetry,
  onRefresh,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  sortConfig,
  onSort,
  activeActionFeedback,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}) => {
  const signal = getVisitSignal({ stats, visits, kpiFilter, loadError });
  const hasFilter = hasActiveVisitFilters(filters);
  const failedEmpty = Boolean(loadError) && visits.length === 0;
  const listScrollRef = useRef(null);

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: visits,
    focusedItem: focusedVisit,
    setFocusedId: setFocusedVisitId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-visit-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/visits"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <VisitsDetailRail
          visit={focusedVisit}
          loading={loading}
          canEdit={canEdit}
          onView={onView}
          onEdit={onEdit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={visitToneClass}>
        <KpiStrip
          options={visitStateOptions}
          getCount={(id) => getVisitStateCount({ id, stats, visits })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_VISIT_STATE_IDS}
          importance={VISIT_KPI_IMPORTANCE}
          dataAttr="data-visit-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="visits"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchPlaceholder="Search by ID, type, facility, practitioner, or room..."
            searchTestId="visits-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="visits"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner
            title="Visits could not load"
            message={loadError}
            onRetry={onRetry}
            testId="visits-error-state"
          />
        ) : null}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Visits list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Visits did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <VisitListHeader
                sortConfig={sortConfig}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={onSelectAll}
              />

              {visits.length === 0 && !loadError && (
                <EmptyState
                  icon={Calendar}
                  heading={hasFilter ? 'No matching visits' : (VISIT_EMPTY_HEADINGS[kpiFilter] || 'No visits yet')}
                  body={hasFilter ? 'Change filters or search again.' : 'Schedule the first visit when care is ready.'}
                >
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      onClick={() => setFilters({})}
                      className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                    >
                      Show all visits
                    </Button>
                  )}
                  {canCreate && !hasFilter && (
                    <Button
                      onClick={onCreate}
                      data-testid="add-first-visit-btn"
                      aria-label="Schedule your first visit"
                      className="h-10 rounded-button bg-foreground px-4 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule first visit
                    </Button>
                  )}
                </EmptyState>
              )}

              {visits.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  selected={focusedVisit?.id === visit.id}
                  onFocus={() => setFocusedVisitId(visit.id)}
                  onView={onView}
                  selectable={selectable}
                  checked={selectedIds.includes(visit.id)}
                  onToggleSelect={onToggleSelect}
                  onSelectClick={onSelectClick}
                />
              ))}
            </>
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

// Patient | Status | Type | Facility | Time | Action -- one canonical render
// (Requests table idiom). Cost cut per arbitration: live data never carries it.
const VISIT_GRID_COLS = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(96px,0.7fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';
const VISIT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(140px,1.25fr)_minmax(96px,auto)_minmax(96px,0.7fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';

const VisitListHeader = ({ sortConfig, onSort, selectable = false, allSelected = false, someSelected = false, onSelectAll }) => (
  <div className={`grid ${selectable ? VISIT_GRID_COLS_SELECT : VISIT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all visits'}
        className="h-4 w-4"
      />
    )}
    {/* Patient / Status / Type / Facility are plain labels (donor: Requests) --
        sorting them alphabetically isn't practical operationally; only Time is a
        meaningful sort. Status/type filtering belongs to the state chips and the
        FilterSheet, never column headers (user arbitration: per-column filters
        removed, Apple standards). */}
    <span>Patient</span>
    <span>Status</span>
    <span>Type</span>
    <span>Facility</span>
    <SortableColumnHeader label="Time" sortKey="date" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const VisitRow = ({ visit, selected, onFocus, onView, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const patientName = getVisitPatientLabel(visit);
  const patientEmail = visit?.patient?.email || null;
  const facilityName = visit?.hospital_name || (visit?.hospital_id ? getVisitFacilityLabel(visit) : 'Unknown facility');
  const statusKey = visit?.status || 'scheduled';

  return (
    <ListRowShell
      id={visit.id}
      dataAttrName="data-visit-row"
      gridCols={selectable ? VISIT_GRID_COLS_SELECT : VISIT_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(visit)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(visit.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect visit for ${patientName}` : `Select visit for ${patientName}`}
          className="h-4 w-4"
        />
      )}
      <span className="flex min-w-0 items-center gap-3">
        <TonedAvatar name={patientName} className={getVisitAvatarClass(visit)} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{patientName}</span>
          {patientEmail && (
            <span className="block truncate text-xs text-muted-foreground">{patientEmail}</span>
          )}
        </span>
      </span>

      <span>
        <StatusPill
          compact
          label={visitStatusLabel[statusKey] || statusKey}
          className={visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}
        />
      </span>

      <span className="truncate text-sm text-foreground/85">{formatVisitType(visit)}</span>

      <span className="truncate text-sm text-muted-foreground">{facilityName}</span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatDayTime(visit.date || visit.created_at)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(visit);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
        aria-label={`View visit for ${patientName}`}
      >
        Details
      </Button>
    </ListRowShell>
  );
};

const getVisitDoctorLabel = (visit) => (
  visit?.doctor?.name ||
  visit?.doctor ||
  visit?.doctor_name ||
  'Unassigned'
);

const VisitsDetailRail = ({ visit, loading, canEdit, onView, onEdit, activeActionFeedback }) => {
  if (loading) {
    return (
      <DetailRailShell>
        <Shimmer className="h-5 w-28 rounded-pill" />
        <Shimmer className="mt-6 h-24 rounded-card" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
        </div>
      </DetailRailShell>
    );
  }

  if (!visit) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Info className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No visit selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visits will appear here when the list has results.</p>
        </div>
      </DetailRailShell>
    );
  }

  const statusKey = visit.status || 'scheduled';
  const StatusIcon = visitStatusIcon[statusKey] || Clock;
  const railCancelled = statusKey === 'cancelled';
  const railStageIndex = Math.max(0, VISIT_STAGE_ORDER.indexOf(statusKey));
  const railStageFill = VISIT_STAGE_FILL[statusKey] || 'bg-foreground/60';
  const displayId = visit.display_id || null;
  const patientName = getVisitPatientLabel(visit);
  const patientEmail = visit?.patient?.email || null;
  const roomLabel = visit.room_number ? `Room ${visit.room_number}` : 'No room';
  const dateLabel = formatDayTime(visit.date || visit.created_at);
  const viewOpening = activeActionFeedback === `view-${visit.id}`;
  const editOpening = activeActionFeedback === `edit-${visit.id}`;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Visit details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy record ID" />
              </div>
            )}
            <div className="mt-4">
              <StatusPill
                icon={StatusIcon}
                label={visitStatusLabel[statusKey] || statusKey}
                className={visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}
              />
            </div>
            <StageStrip
              order={VISIT_STAGE_ORDER}
              fillClass={railStageFill}
              activeIndex={railStageIndex}
              muted={railCancelled}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(visit)}
            aria-label="Open full visit details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <TonedAvatar name={patientName} className={getVisitAvatarClass(visit)} size="h-14 w-14" textSize="text-lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{patientName}</p>
            <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              {dateLabel}
            </p>
            {patientEmail && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{patientEmail}</p>
            )}
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-3">
        <DetailLine icon={Calendar} label="Type" value={formatVisitType(visit)} />
        <DetailLine icon={Stethoscope} label="Practitioner" value={getVisitDoctorLabel(visit)} />
        <DetailLine icon={Hospital} label="Facility" value={getVisitFacilityLabel(visit)} />
        <DetailLine icon={MapPin} label="Location" value={roomLabel} />
        <DetailLine icon={Clock} label="Scheduled" value={dateLabel} />
      </div>

      <div className="mt-5 space-y-2">
        <Button
          onClick={() => onView(visit)}
          className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
          aria-busy={viewOpening}
          data-state={viewOpening ? 'opening' : 'idle'}
        >
          <Info className="mr-2 h-4 w-4" />
          {viewOpening ? 'Opening...' : 'Details'}
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
    </DetailRailShell>
  );
};
