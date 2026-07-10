import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useHospitalsQuery } from '../../hooks/useHospitalsQuery';
import { useHospitalsMutations, applyOptimisticUpsert } from '../../hooks/useHospitalsMutations';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { updateHospital, getHospital } from '../../services/hospitalsService';
import { Button } from '../ui/button';
// Console design system: the workspace grammar lives in shared components --
// pages compose the canon instead of re-remembering it.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, CopyChip, StatusPill, DetailLine, StageStrip, EmptyState, ErrorBanner, LoadErrorState } from '../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { formatDayTime } from '../../utils/dayTime';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import {
  Activity,
  AlertCircle,
  Ambulance,
  BadgeCheck,
  Bed,
  Building2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileCheck,
  Filter,
  Hospital,
  MapPin,
  Phone,
  Star,
  Tag,
  Timer,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { BulkActionBar } from '../common/BulkActionBar';
import { useRowSelection } from '../../hooks/useRowSelection';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { HospitalModal } from '../modals/HospitalModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { MobileHospitals } from '../mobile/MobileHospitals';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';

const getHospitalStatsFilters = (filters = {}) => {
  const { status, ...statsFilters } = filters || {};
  return statsFilters;
};

const normalizeHospitalCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const hospitalStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: Hospital,
    countKey: 'total',
    tone: 'primary',
    colorClass: 'text-sky-600 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-e2 dark:text-sky-100',
  },
  {
    id: 'available',
    label: 'Available',
    icon: MapPin,
    countKey: 'available',
    tone: 'clear',
    colorClass: 'text-emerald-600 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-e2 dark:text-emerald-100',
  },
  {
    id: 'full',
    label: 'Full',
    icon: Bed,
    countKey: 'full',
    tone: 'warning',
    colorClass: 'text-amber-600 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100',
  },
  {
    id: 'busy',
    label: 'Busy',
    icon: Ambulance,
    countKey: 'busy',
    tone: 'info',
    colorClass: 'text-cyan-600 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-e2 dark:text-cyan-100',
  },
];

// Smart-context inputs (S1.2, enforced by the shared KpiStrip): 'full' and 'busy'
// pin while they carry signal because they are the operational-pressure states an
// operator must see before promising capacity or routing more demand; 'available'
// and 'all' fill data-driven by count then importance.
const HOSPITAL_KPI_IMPORTANCE = { all: 0, available: 1, full: 2, busy: 3 };
const PINNED_HOSPITAL_STATE_IDS = ['full', 'busy'];

const hospitalToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-e2',
  danger: 'bg-destructive/14 text-destructive shadow-e2',
};

// Canonical status vocabulary (literal palette -- the theme's info/success/warning
// tokens all render red): available emerald, full amber, busy cyan. This replaces
// the old status-badge red trap (bg-success/bg-warning theme tokens).
const hospitalStatusPillClass = {
  available: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  full: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  busy: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
};

const hospitalStatusLabel = {
  available: 'Available',
  full: 'Full',
  busy: 'Busy',
};

const hospitalStatusIcon = {
  available: MapPin,
  full: Bed,
  busy: Ambulance,
};

// Verification lifecycle for the rail StageStrip (hospitals.verification_status
// source values, orgVerificationService: 'pending' -> 'verified', with 'rejected'
// as the terminal refusal): pending fills amber, verified fills emerald; a
// rejected facility renders the strip all-muted -- rejection is a verdict, not
// progress toward verification.
const HOSPITAL_VERIFICATION_ORDER = ['pending', 'verified'];
const HOSPITAL_VERIFICATION_FILL = {
  pending: 'bg-amber-500',
  verified: 'bg-emerald-500',
};

const getHospitalStateCount = ({ id, stats, hospitals }) => {
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const option = hospitalStateOptions.find((item) => item.id === id) || hospitalStateOptions[0];
  const fallback = id === 'all'
    ? sourceHospitals.length
    : sourceHospitals.filter((hospital) => hospital.status === id).length;

  return normalizeHospitalCount(stats?.[option.countKey], fallback);
};

const getHospitalSignal = ({ stats, hospitals, kpiFilter, loadError }) => {
  const activeId = kpiFilter || 'all';
  const option = hospitalStateOptions.find((item) => item.id === activeId) || hospitalStateOptions[0];
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const count = getHospitalStateCount({ id: option.id, stats, hospitals: sourceHospitals });

  // F7 (HOSPITALS_REVAMP_CONSTITUTION_2026-07-09): a failed load with nothing
  // cached must not render a reassuring zero-derived "all clear" hero above the
  // list error state; surface the failure honestly (donor: getRequestSignal /
  // getVisitSignal failed-load branch).
  if (loadError && count === 0 && sourceHospitals.length === 0) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Hospitals did not load',
      subhead: 'Retry to load the facility list.',
    };
  }

  if (option.id === 'available') {
    return {
      icon: MapPin,
      tone: 'clear',
      label: 'Available',
      headline: count > 0 ? `${count} available hospital${count === 1 ? '' : 's'}` : 'No available hospitals',
      subhead: count > 0 ? 'Open a facility before changing capacity or care routing.' : 'Available facilities will appear here.',
    };
  }

  if (option.id === 'full') {
    return {
      icon: Bed,
      tone: 'warning',
      label: 'Full',
      headline: count > 0 ? `${count} full hospital${count === 1 ? '' : 's'}` : 'No full hospitals',
      subhead: count > 0 ? 'Review full sites before promising new capacity.' : 'Full facilities will appear here.',
    };
  }

  if (option.id === 'busy') {
    return {
      icon: Ambulance,
      tone: 'info',
      label: 'Busy',
      headline: count > 0 ? `${count} busy hospital${count === 1 ? '' : 's'}` : 'No busy hospitals',
      subhead: count > 0 ? 'Check the facility record before routing more demand.' : 'Busy facilities will appear here.',
    };
  }

  return {
    icon: Hospital,
    tone: 'primary',
    label: 'Hospitals',
    headline: count > 0 ? `${count} hospital record${count === 1 ? '' : 's'}` : 'No hospitals found',
    subhead: count > 0 ? 'Review facility status, visible capacity, and verified records before acting.' : 'Try a different filter or refresh the facility list.',
  };
};

const HOSPITAL_EMPTY_HEADINGS = {
  available: 'No available hospitals',
  full: 'No full hospitals',
  busy: 'No busy hospitals',
};

const hasActiveHospitalFilters = (filters = {}) => Boolean(
  filters.search ||
  (filters.status && filters.status.length > 0) ||
  filters.created_at?.start ||
  filters.created_at?.end
);

// Honest ER-wait projection (carried from the retired density views): a missing
// emergency_wait_time_minutes renders 'Unknown', never a fabricated number.
const formatHospitalWait = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === '') {
    return 'Unknown';
  }

  const numericMinutes = Number(minutes);
  return Number.isFinite(numericMinutes) ? `${numericMinutes}m` : 'Unknown';
};

export const HospitalsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver, orgId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useNavigation();
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const pagination = usePagination(20);
  const canEditHospitals = isAdmin() || isOrgAdmin();

  // F5 (HOSPITALS_REVAMP_CONSTITUTION_2026-07-09 section 4): the Edit AFFORDANCE
  // is client-scoped -- an org_admin only sees and opens Edit for facilities in
  // their own organization (hospital.organization_id === orgId); admin stays
  // unrestricted. Reframe over grant: the update_hospital_by_admin RPC keeps
  // enforcing authority server-side; this only stops the page offering a write
  // the backend would refuse. Known nuance (recorded; backend item): a hospital
  // linked only via org_admin_id with a null organization_id stays read-only here.
  const canEditHospital = useCallback((hospital) => {
    if (isAdmin()) return true;
    if (!isOrgAdmin()) return false;
    return Boolean(hospital?.organization_id) && hospital.organization_id === orgId;
  }, [isAdmin, isOrgAdmin, orgId]);

  // Wayfinding dock slate mirrors TodayHome's useRoleKind responder fork (donor:
  // Visits/Requests). /hospitals is not a rail slot; the dock's current-page pill
  // carries the location, same as /visits.
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

  // --- Read path: React Query (S3 reference migration; mirrors DoctorsPage) ------
  // The route-owned page projection (getHospitalsPageData) now flows through
  // useHospitalsQuery, so the ['hospitals', queryFilter] cache is the single store:
  // this page reads it, the modal write settles it, and realtime invalidates it.
  // The KPI status pill and sheet filters compose into one server filter; stats are
  // requested on the status-agnostic set (getHospitalStatsFilters) so the KPI counts
  // stay stable while the list narrows. sortKey/sortDirection ride the same filter
  // (F1) so the Time header sorts through the service allowlist, never client-side.
  // Dead-filter fix (2026-07-09): the sheet's "Registered On" range (`created_at:
  // {start,end}`) never reached the service. It now maps to date_from/date_to ISO
  // bounds (Requests donor pattern) for BOTH the list and the stats set, so KPI
  // counts stay date-scoped (but status-agnostic) alongside the visible window.
  const serviceFilters = useMemo(() => {
    const { created_at: createdRange, ...rest } = filters || {};
    return {
      ...rest,
      ...(createdRange?.start ? { date_from: `${createdRange.start}T00:00:00.000Z` } : {}),
      ...(createdRange?.end ? { date_to: `${createdRange.end}T23:59:59.999Z` } : {}),
    };
  }, [filters]);

  const queryFilter = useMemo(() => ({
    filters: {
      ...serviceFilters,
      ...(kpiFilter !== 'all' ? { status: kpiFilter } : {}),
    },
    statsFilters: getHospitalStatsFilters(serviceFilters),
    limit: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [serviceFilters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start, sortConfig.key, sortConfig.direction]);

  const {
    hospitals,
    count,
    stats: hospitalPageStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useHospitalsQuery(queryFilter);

  // RQ error object -> the page's existing degraded-state copy (kept verbatim).
  const hospitalPageError = queryError ? 'Hospitals could not load. Try again.' : null;

  // fetchHospitals is now the RQ refetch (pull-to-refresh on mobile, Retry on desktop).
  const fetchHospitals = refetch;

  // Shared focused-record store: rail shows the most-urgent hospital at rest and
  // toggles consistently on row focus. Replaces the old private focusedHospitalId
  // state + `list.find(id) || list[0]` memo + first-item re-pin effect.
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('hospitals', hospitals);
  const focusedHospital = focusedRecord;

  // Keyboard focus adapter: useListKeyboardNav drives focus BY ID, while the
  // shared useFocusedRecord setter TOGGLES a repeated id (row-click semantics).
  // Arrow travel clamped at the list edge re-sends the same id -- guard it so the
  // rail never clears mid-navigation; Escape (null) still clears explicitly.
  const setKeyboardFocusedId = useCallback((id) => {
    if (id == null) {
      setFocused(null);
      return;
    }
    if (focusedHospital?.id !== id) {
      setFocused(id);
    }
  }, [focusedHospital, setFocused]);

  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (actionFeedbackTimerRef.current) {
        window.clearTimeout(actionFeedbackTimerRef.current);
      }
    };
  }, []);

  // Keep the shared pagination store's total in sync with the RQ count.
  useEffect(() => {
    pagination.setTotalCount(count);
  }, [count, pagination.setTotalCount]);

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

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    pagination.resetPagination();
    setFilters(currentFilters => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [pagination.resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    pagination.resetPagination();
    setKpiFilter(nextFilter);
  }, [pagination.resetPagination]);

  // Real-time updates: a hospitals row change now invalidates the ['hospitals']
  // cache (the single store) instead of a manual refetch. Any mounted
  // useHospitalsQuery observer converges on the next fetch. Additive to
  // PageDataContext's own hospitals subscription (PageDataContext.jsx ~:901) --
  // both converge on the same ['hospitals'] invalidation, so a doubled event
  // costs one deduped refetch, never a divergent store.
  // INSERTs also surface an arrival toast (donor anatomy,
  // EmergencyRequestsPage): facilities arrive from app-side sync, exactly when
  // an operator wants to know. Throttled to one per 10s so a sync burst cannot
  // stack toasts. No second-table listener -- hospitals has no payments
  // analogue (sanctioned delta, HOSPITALS_SHELL_PARITY_AUDIT section 3).
  const lastInsertToastAtRef = useRef(0);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel('hospitals_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        if (active && isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['hospitals'] });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hospitals' }, (payload) => {
        if (!active || !isMountedRef.current || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        toast('New facility added', payload?.new?.name ? { description: payload.new.name } : undefined);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Deep link: ?id=<hospital> opens that facility's record. It loads the single row
  // directly (getHospital) and auto-opens the read-only modal; the list itself stays
  // on the RQ projection above, so there is no second list store.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hospitalId = params.get('id');
    if (!hospitalId) return undefined;

    let active = true;
    getHospital(hospitalId)
      .then((specificHospital) => {
        if (!active || !isMountedRef.current || !specificHospital) return;
        setFocused(specificHospital.id);
        setSelectedHospital(specificHospital);
        setModalMode('view');
      })
      .catch((error) => {
        handleApiError(error, 'fetch');
      });

    return () => {
      active = false;
    };
  }, [location.search, setFocused]);

  // The navbar's working action (user arbitration #2, 2026-07-09): the domain's
  // real adjacent write surface is the facility approval queue -- same decoded
  // action as the FAB/bottom bar (/verification?queue=organizations).
  const handleFacilityApprovals = useCallback(() => {
    markActionFeedback('facility-approvals');
    navigate('/verification?queue=organizations');
  }, [markActionFeedback, navigate]);

  const handleCreateUnavailable = useCallback(() => {
    markActionFeedback('create-unavailable');
    toast.info('Add facility is unavailable');
  }, [markActionFeedback]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  // Row selection (estate law, donor: Requests/Visits): the mechanism renders
  // admin-only -- checkbox column, select-all with indeterminate, shift-range.
  // Bulk WRITES stay fail-closed per the decision register (no DELETE
  // receiver): the bar's action is disabled with the reason, never a dead
  // click and never a parallel write.
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(hospitals);

  const hospitalPanelContext = React.useMemo(() => ({
    stats: hospitalPageStats || {},
    recent: hospitals.slice(0, 4),
    focusedHospital,
    count: pagination.totalCount || hospitals.length,
    loading,
    errorMessage: hospitalPageError,
    currentState: kpiFilter,
    canAdd: false,
    canEdit: canEditHospitals,
  }), [
    canEditHospitals,
    focusedHospital,
    hospitalPageError,
    hospitalPageStats,
    hospitals,
    kpiFilter,
    loading,
    pagination.totalCount,
  ]);

  const publishHospitalsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('hospitalsRouteContextUpdated', {
      detail: hospitalPanelContext,
    }));
  }, [hospitalPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishHospitalsRouteContext();
    window.addEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);

    return () => {
      window.removeEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);
    };
  }, [publishHospitalsRouteContext]);

  // Open "Add" modal on page load if requested via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle add=true parameter
    if (params.get('add') === 'true') {
      handleCreateUnavailable();
    }
    // Note: the id parameter is handled by the dedicated ?id deep-link effect above.
  }, [handleCreateUnavailable, location.search]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => handleCreateUnavailable();

    window.addEventListener('openHospitalModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openHospitalModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateUnavailable, handleOpenAnalytics, handleOpenFilters]);

  const handleView = useCallback((hospital) => {
    markActionFeedback(`view-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleEdit = useCallback((hospital) => {
    // F5: the modal trigger carries the same scope as the affordance -- an
    // out-of-scope facility gets an honest notice, never an edit form the RPC
    // would refuse.
    if (!canEditHospital(hospital)) {
      toast.info('Edit is limited to facilities in your organization');
      return;
    }
    markActionFeedback(`edit-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('edit');
  }, [canEditHospital, markActionFeedback, setFocused]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({});
  }, [handleApplyFilters, handleKpiFilterChange]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // --- Write path: React Query optimistic mutation (mirrors DoctorModal S3-3) -----
  // The facility edit still calls updateHospital(selectedHospital.id, formData) - the
  // update_hospital_by_admin RPC is never bypassed - but it is now the mutationFn of
  // useHospitalsMutations, which snapshots the ['hospitals', queryFilter] cache,
  // applies an optimistic upsert, rolls back on error, and invalidates on settle.
  // That onSettled invalidation is the single post-write refresh (handleModalClose no
  // longer refetches). formData carries the row id, so the upsert merges the cached row.
  const updateHospitalMutation = useHospitalsMutations({
    mutationFn: (formData) => updateHospital(selectedHospital.id, formData),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });

  const handleSave = useCallback(async (formData) => {
    try {
      if (modalMode !== 'edit' || !selectedHospital?.id) {
        throw new Error('Facility edit requires a selected facility');
      }

      const updatedHospital = await updateHospitalMutation.mutateAsync(formData);
      const updatedHospitalName = formData.name || selectedHospital.name || 'Facility';

      // Update committed. The notification is best-effort: a notification
      // failure must NOT report a committed save as failed (the donor's
      // false-negative lesson, EmergencyRequestsPage ~:828).
      try {
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.UPDATED,
          updatedHospital?.id || selectedHospital.id,
          { message: `${updatedHospitalName} has been updated` }
        );
      } catch (notifyError) {
        console.warn('Save succeeded but notification failed:', notifyError);
      }
      // Single toast owner is the page (VisitModal V-16 rule): the modal
      // toasts nothing, closes on success, stays open on failure.
      toast.success('Facility updated');

      return true;
    } catch (error) {
      console.error('Error saving hospital:', error);
      handleApiError(error, 'update');
      throw error;
    }
  }, [modalMode, selectedHospital, updateHospitalMutation]);

  // Modal writes flow through useHospitalsMutations, whose onSettled invalidates
  // ['hospitals'] and refetches this page's live useHospitalsQuery. Closing the modal
  // must therefore NOT trigger its own refetch - doing so would double-fetch.
  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedHospital(null);
  }, []);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      // Placeholder names exactly what the service .or() can match (F9).
      placeholder: 'Search by name, address, ID, or phone...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        // Busy has always been a KPI-strip state; the sheet just never offered it.
        { value: 'busy', label: 'Busy' },
        { value: 'full', label: 'Full' },
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Registered On',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      data-state={filterSheetOpen ? 'open' : 'idle'}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter hospitals"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasActiveHospitalFilters(filters) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, filters, handleOpenFilters]);

  const headerActions = React.useMemo(() => {
    // Navbar carries the WORKING action, not the gated create (user arbitration
    // #2, 2026-07-09): the Add pill leaves the top bar -- create is DB-enforced
    // fail-closed (DATA_SYNC 12c), so a permanently-policied pill is not a
    // working command. In its place, the domain's real adjacent write surface:
    // the facility approval queue (same decoded action as the FAB/bottom bar).
    // The honest create gate stays reachable via the ?add=true deep link.
    if (canEditHospitals) {
      return (
        <Button
          onClick={handleFacilityApprovals}
          title="Review pending facility approvals"
          aria-busy={activeActionFeedback === 'facility-approvals'}
          data-state={activeActionFeedback === 'facility-approvals' ? 'opening' : 'idle'}
          className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95 ${activeActionFeedback === 'facility-approvals' ? 'scale-95' : ''}`}
          aria-label="Facility approvals"
        >
          <FileCheck className="mr-2 h-4 w-4" />
          Facility approvals
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, canEditHospitals, handleFacilityApprovals]);

  usePageHeader(
    "Hospitals",
    headerActions,
    null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Hospitals" description="Manage network hospitals, bed capacity, and facility status." />

        <MobileHospitals
          hospitals={hospitals}
          loading={loading}
          statistics={hospitalPageStats}
          filters={filters}
          setFilters={handleApplyFilters}
          onView={handleView}
          onEdit={handleEdit}
          errorMessage={hospitalPageError}
          onRetry={fetchHospitals}
          onRefresh={fetchHospitals}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          onOpenFilters={handleOpenFilters}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          isFetching={isFetching}
          canDelete={false}
          selectionEnabled={false}
        />

        {modalMode && (
          <HospitalModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            hospital={selectedHospital}
            mode={modalMode}
            onSave={handleSave}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={handleApplyFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile={true}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={hospitalPageStats}
          type="hospital"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Hospitals" description="Manage network hospitals, bed capacity, and facility status." />

      <HospitalsDesktopWorkspace
        hospitals={hospitals}
        loading={loading}
        isFetching={isFetching}
        stats={hospitalPageStats}
        filters={filters}
        setFilters={handleApplyFilters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        focusedHospital={focusedHospital}
        setFocused={setFocused}
        isFocused={isFocused}
        setKeyboardFocusedId={setKeyboardFocusedId}
        canEditFocused={focusedHospital ? canEditHospital(focusedHospital) : false}
        onView={handleView}
        onEdit={handleEdit}
        onClearFilters={handleClearFilters}
        pagination={pagination}
        openFilters={handleOpenFilters}
        filterSheetOpen={filterSheetOpen}
        loadError={hospitalPageError}
        onRetry={fetchHospitals}
        onRefresh={fetchHospitals}
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
            title="Facility deletion is locked until backend authority is proved"
            aria-label="Facility deletion is locked until backend authority is proved"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      {modalMode && (
        <HospitalModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          hospital={selectedHospital}
          mode={modalMode}
          onSave={handleSave}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={hospitalPageStats}
        type="hospital"
      />
    </div>
  );
};

const HospitalsDesktopWorkspace = ({
  hospitals,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedHospital,
  setFocused,
  isFocused,
  setKeyboardFocusedId,
  canEditFocused,
  onView,
  onEdit,
  onClearFilters,
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
  const signal = getHospitalSignal({ stats, hospitals, kpiFilter, loadError });
  const hasFilter = hasActiveHospitalFilters(filters);
  const failedEmpty = Boolean(loadError) && hospitals.length === 0;
  const listScrollRef = useRef(null);

  // Page-scope capacity pills (perk 4): honest service-derived sums for the
  // visible rows only, with the same page-list fallback the service documents.
  const visibleBeds = normalizeHospitalCount(
    stats?.visibleBeds,
    hospitals.reduce((sum, hospital) => sum + (Number(hospital.available_beds) || 0), 0)
  );
  const visibleFleet = normalizeHospitalCount(
    stats?.visibleAmbulances,
    hospitals.reduce((sum, hospital) => sum + (Number(hospital.ambulances_count) || 0), 0)
  );

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: hospitals,
    focusedItem: focusedHospital,
    setFocusedId: setKeyboardFocusedId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-hospital-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/hospitals"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <HospitalDetailRail
          hospital={focusedHospital}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={canEditFocused}
          onView={onView}
          onEdit={onEdit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={hospitalToneClass}>
        {/* Visible beds / Visible fleet page-scope pills (perk 4) stay under the
            hero; aria-live keeps the counts announced (perk 12) now that the DS
            SignalPanel owns the hero markup itself. */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
          {loading ? (
            <>
              <Shimmer className="h-8 w-36 rounded-pill" />
              <Shimmer className="h-8 w-36 rounded-pill" />
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Bed className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                Visible beds
                <strong className="text-foreground">{visibleBeds}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Ambulance className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
                Visible fleet
                <strong className="text-foreground">{visibleFleet}</strong>
              </span>
            </>
          )}
        </div>

        <KpiStrip
          options={hospitalStateOptions}
          getCount={(id) => getHospitalStateCount({ id, stats, hospitals })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_HOSPITAL_STATE_IDS}
          importance={HOSPITAL_KPI_IMPORTANCE}
          dataAttr="data-hospital-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="hospitals"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchPlaceholder="Search by name, address, ID, or phone..."
            searchTestId="hospitals-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="hospitals"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner
            title="Hospitals could not load"
            message={loadError}
            onRetry={onRetry}
            testId="hospitals-error-state"
          />
        ) : null}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Hospitals list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Hospitals did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <HospitalListHeader
                sortConfig={sortConfig}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={onSelectAll}
              />

              {hospitals.length === 0 && !loadError && (
                <EmptyState
                  icon={Hospital}
                  heading={hasFilter ? 'No matching hospitals' : (HOSPITAL_EMPTY_HEADINGS[kpiFilter] || 'No hospitals found')}
                  body={hasFilter ? 'Try a different search or clear the current filters.' : 'Try a different filter or refresh the facility list.'}
                >
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      onClick={onClearFilters}
                      className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                    >
                      Clear filters
                    </Button>
                  )}
                </EmptyState>
              )}

              {hospitals.map((hospital) => (
                <HospitalRow
                  key={hospital.id}
                  hospital={hospital}
                  selected={isFocused(hospital.id)}
                  onFocus={() => setFocused(hospital.id)}
                  onView={onView}
                  selectable={selectable}
                  checked={selectedIds.includes(hospital.id)}
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

// Facility | Status | Beds | Wait | Time | Action -- one canonical render
// (Requests table idiom). Column choice from the live row data: name + address
// carry identity, status is the operational state, available_beds and the ER
// wait are the two live capacity signals a facility actually maintains, and
// Time is the sortable created_at. ICU/Fleet/Rating stay rail-only detail --
// Cost-cut spirit: only live columns earn a slot.
const HOSPITAL_GRID_COLS = 'grid-cols-[minmax(160px,1.4fr)_minmax(96px,auto)_minmax(56px,auto)_minmax(72px,auto)_minmax(96px,auto)_72px]';
const HOSPITAL_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(160px,1.4fr)_minmax(96px,auto)_minmax(56px,auto)_minmax(72px,auto)_minmax(96px,auto)_72px]';

const HospitalListHeader = ({ sortConfig, onSort, selectable = false, allSelected = false, someSelected = false, onSelectAll }) => (
  <div className={`grid ${selectable ? HOSPITAL_GRID_COLS_SELECT : HOSPITAL_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all facilities'}
        className="h-4 w-4"
      />
    )}
    {/* Facility / Status / Beds / Wait are plain labels (donor: Requests) -- the
        old nine sortable headers were dead ends (F1: none wired; the service
        hard-coded created_at), and only Time is a meaningful operational sort.
        Status filtering belongs to the state chips and the FilterSheet, never
        column headers (user arbitration: per-column filters removed). */}
    <span>Facility</span>
    <span>Status</span>
    <span>Beds</span>
    <span>Wait</span>
    <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

// Entity marker with the facility IMAGE (perk 3): a circle thumb showing the
// hospital photo over a glyph that stays honest when the image is missing or
// fails to load (donor idiom: the Requests avatar image overlay). Page-local
// because the DS TonedAvatar has no image-overlay slot yet (known kit gap).
const HospitalAvatar = ({ hospital, size = 'h-9 w-9', iconSize = 'h-4 w-4' }) => (
  <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-pill bg-sky-500/10 text-sky-700 dark:text-sky-200`}>
    <Hospital className={iconSize} aria-hidden="true" />
    {hospital?.image && (
      <img
        src={hospital.image}
        alt=""
        className="absolute inset-0 h-full w-full rounded-pill object-cover"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    )}
  </span>
);

const HospitalRow = ({ hospital, selected, onFocus, onView, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const statusKey = String(hospital?.status || 'available').toLowerCase();
  const statusLabel = hospitalStatusLabel[statusKey] || statusKey.replace(/_/g, ' ');
  const facilityName = hospital.name || 'Unnamed hospital';

  return (
    <ListRowShell
      id={hospital.id}
      dataAttrName="data-hospital-row"
      gridCols={selectable ? HOSPITAL_GRID_COLS_SELECT : HOSPITAL_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(hospital)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(hospital.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${facilityName}` : `Select ${facilityName}`}
          className="h-4 w-4"
        />
      )}
      <span className="flex min-w-0 items-center gap-3">
        <HospitalAvatar hospital={hospital} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground" title={facilityName}>{facilityName}</span>
            {hospital.verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-300" aria-label="Verified facility" />
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{hospital.address || 'No address provided'}</span>
        </span>
      </span>

      <span>
        <StatusPill
          compact
          label={statusLabel}
          className={hospitalStatusPillClass[statusKey] || 'bg-muted/40 text-muted-foreground'}
        />
      </span>

      <span className="text-sm tabular-nums text-foreground/85">
        {normalizeHospitalCount(hospital.available_beds, 0)}
      </span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatHospitalWait(hospital.emergency_wait_time_minutes)}
      </span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatDayTime(hospital.created_at)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(hospital);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
        aria-label={`View details for ${facilityName}`}
      >
        Details
      </Button>
    </ListRowShell>
  );
};

const HospitalDetailRail = ({ hospital, loading, hasFilter = false, canEdit, onView, onEdit, activeActionFeedback }) => {
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

  if (!hospital) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Hospital className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No facility selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Facilities that match your filters will appear here.'
              : 'Facilities will appear here when the list has results.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const statusKey = String(hospital.status || 'available').toLowerCase();
  const StatusIcon = hospitalStatusIcon[statusKey] || Hospital;
  const verificationKey = String(hospital.verification_status || (hospital.verified ? 'verified' : 'pending')).toLowerCase();
  const railRejected = verificationKey === 'rejected' || verificationKey === 'suspended';
  const railStageIndex = Math.max(0, HOSPITAL_VERIFICATION_ORDER.indexOf(verificationKey));
  const railStageFill = HOSPITAL_VERIFICATION_FILL[verificationKey] || 'bg-foreground/60';
  const displayId = hospital.display_id || null;
  const facilityName = hospital.name || 'Unnamed hospital';
  const beds = normalizeHospitalCount(hospital.available_beds, 0);
  const fleet = normalizeHospitalCount(hospital.ambulances_count, 0);
  const rating = Number.isFinite(Number(hospital.rating)) ? Number(hospital.rating).toFixed(1) : 'Not rated';
  // Operational insights (read-only by doctrine, DATA_SYNC section 12): these
  // derive from live operations -- surfaced for reading, never editable here.
  // Vocabulary mirrors MobileHospitals so both surfaces speak one language.
  const totalBeds = Number(hospital.total_beds);
  const icuBeds = Number(hospital.icu_beds_available);
  const bedsValue = Number.isFinite(totalBeds) && totalBeds > 0
    ? `${beds} of ${totalBeds} available${Number.isFinite(icuBeds) ? ` · ICU ${icuBeds}` : ''}`
    : `${beds}${Number.isFinite(icuBeds) ? ` · ICU ${icuBeds}` : ''}`;
  const waitMinutes = Number(hospital.emergency_wait_time_minutes);
  const erWaitValue = Number.isFinite(waitMinutes) && waitMinutes > 0
    ? `≈ ${waitMinutes} min`
    : (hospital.wait_time || 'Not tracked');
  const eligibility = [
    hospital.emergency_eligible && 'Emergency',
    hospital.dispatch_eligible && 'Dispatch',
    hospital.booking_eligible && 'Booking',
  ].filter(Boolean).join(' · ');
  const latitude = Number(hospital.latitude);
  const longitude = Number(hospital.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const viewOpening = activeActionFeedback === `view-${hospital.id}`;
  const editOpening = activeActionFeedback === `edit-${hospital.id}`;

  return (
    <DetailRailShell>
      <div data-testid="hospitals-detail-rail">
        <RailInsetHero>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Hospital details</h2>
              {displayId && (
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                  <CopyChip value={displayId} label="Copy record ID" />
                </div>
              )}
              <div className="mt-4">
                <StatusPill
                  icon={StatusIcon}
                  label={hospitalStatusLabel[statusKey] || statusKey.replace(/_/g, ' ')}
                  className={hospitalStatusPillClass[statusKey] || 'bg-muted/40 text-muted-foreground'}
                />
              </div>
              <StageStrip
                order={HOSPITAL_VERIFICATION_ORDER}
                fillClass={railStageFill}
                activeIndex={railStageIndex}
                muted={railRejected}
              />
            </div>
            {hospital.verified && (
              <span className="shrink-0 rounded-pill bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <HospitalAvatar hospital={hospital} size="h-14 w-14" iconSize="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight" title={facilityName}>{facilityName}</p>
              <p className="mt-0.5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{hospital.address || 'No address provided'}</span>
              </p>
            </div>
          </div>
        </RailInsetHero>

        <div className="space-y-3">
          <DetailLine icon={Bed} label="Beds" value={bedsValue} />
          <DetailLine icon={Timer} label="ER wait" value={erWaitValue} />
          <DetailLine icon={BadgeCheck} label="Eligibility" value={eligibility || 'None'} />
          <DetailLine icon={Ambulance} label="Fleet" value={String(fleet)} />
          <DetailLine icon={Star} label="Rating" value={rating} />
          <DetailLine icon={Activity} label="Care" value={hospital.emergency_level || 'Not set'} />
          <DetailLine
            icon={Phone}
            label="Phone"
            value={hospital.phone ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="truncate">{hospital.phone}</span>
                <CopyChip value={hospital.phone} label="Copy phone number" />
              </span>
            ) : 'No phone'}
          />
          <DetailLine icon={Building2} label="Tier" value={hospital.type || 'Not set'} />
          <DetailLine icon={Tag} label="Price" value={hospital.price_range || 'Not set'} />
          <DetailLine icon={Clock} label="Updated" value={hospital.last_availability_update ? new Date(hospital.last_availability_update).toLocaleString() : 'Unknown'} />
          {/* Adoption opportunity 13: raw latitude/longitude become a working map
              link instead of dead columns. */}
          <DetailLine
            icon={MapPin}
            label="Location"
            value={hasCoordinates ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-sky-700 transition-colors hover:text-sky-600 dark:text-sky-300"
              >
                Open in Google Maps
              </a>
            ) : 'Not set'}
          />
        </div>

        <div className="mt-5 rounded-inner bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
          <p className="text-sm font-semibold">Capacity changes need review</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Use Requests for reservation changes. This panel is read-only evidence until an approved action opens.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(hospital)}
            className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
            aria-busy={viewOpening}
            data-state={viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening...' : 'Details'}
            <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(hospital)}
              className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'bg-foreground/10 scale-95' : ''}`}
              aria-busy={editOpening}
              data-state={editOpening ? 'opening' : 'idle'}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editOpening ? 'Opening...' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
    </DetailRailShell>
  );
};
