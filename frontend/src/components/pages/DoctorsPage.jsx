import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useDoctorsQuery } from '../../hooks/useDoctorsQuery';
import { useDoctorsMutations, applyOptimisticRemove } from '../../hooks/useDoctorsMutations';
import { deleteDoctor } from '../../services/doctorsService';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
// Console design system: Staff COMPOSES the shared workspace grammar (donor: Requests;
// closest analog: Hospitals) instead of the bespoke signal/state-strip/rail look-alikes
// it used to inline. WorkspaceStage -> SignalPanel/KpiStrip -> one ActivitySheet +
// ListRowShell (one Time header) -> DetailRailShell rail.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, CopyChip, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { DoctorModal } from '../modals/DoctorModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { MobileDoctors } from '../mobile/MobileDoctors';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Hospital,
  IdCard,
  Info,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Status vocabulary (availability + onboarding). Literal palette, NEUTRAL shadows only.
// DATA-TRUTH (live-DB check 2026-07-10, 322 doctors): real statuses are `available`
// (321) and `invited` (1); is_on_call is unused (0/322). The console must NOT default an
// unknown status to `available` -- that made the 1 invited (and any app-written
// `active`/`offline`) masquerade as available. Unknown -> shown honestly, neutral tone.
const STAFF_STATUS_META = {
  available: { label: 'Available', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200', icon: CheckCircle2 },
  on_call: { label: 'On call', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200', icon: Phone },
  busy: { label: 'Busy', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200', icon: Clock },
  off_duty: { label: 'Away', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]', icon: UserRound },
  invited: { label: 'Invited', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-200', icon: Mail },
};

const titleCase = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getStaffStatusMeta = (status) => {
  const key = String(status || '').toLowerCase();
  return STAFF_STATUS_META[key] || {
    label: titleCase(status) || 'Unknown',
    tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
    icon: UserRound,
  };
};

const getInitials = (name = 'Staff') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'S'}${parts[1]?.[0] || ''}`.toUpperCase();
};

// KPI/state strip options: the availability filter. Literal palette; the shared KpiStrip
// owns the width/tile/smart-context (max 3, pinned-while-count>0). `invited` is an
// onboarding state, not availability -- it is a status PILL + a FilterSheet option, not a
// KPI chip (the strip is a filter, never a decomposition that must sum to All).
const STAFF_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Users, colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'available', label: 'Available', icon: CheckCircle2, colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'on_call', label: 'On call', icon: Phone, colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'busy', label: 'Busy', icon: Clock, colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'off_duty', label: 'Away', icon: UserRound, colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06]' },
];
const STAFF_KPI_IMPORTANCE = { all: 0, available: 1, on_call: 2, busy: 3, off_duty: 4 };
const PINNED_STAFF_KPI_IDS = ['available', 'on_call'];

const staffToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

// Person | Status | Specialization | Facility | Added | Action
const STAFF_GRID_COLS = 'grid-cols-[minmax(150px,1.5fr)_minmax(110px,auto)_minmax(110px,0.8fr)_minmax(120px,1fr)_minmax(92px,auto)_84px]';
const STAFF_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(150px,1.5fr)_minmax(110px,auto)_minmax(110px,0.8fr)_minmax(120px,1fr)_minmax(92px,auto)_84px]';

const STAFF_EMPTY_HEADINGS = {
  all: 'No staff yet',
  available: 'No available staff',
  on_call: 'No on-call staff',
  busy: 'No busy staff',
  off_duty: 'No away staff',
};

const getStaffKpiCount = (id, stats) => {
  if (id === 'all') return stats.total || 0;
  return stats[id] || 0;
};

const formatJoinedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getStaffProjection = (staff) => ({
  name: staff?.name || 'Unknown staff',
  specialization: staff?.specialization || 'General',
  facility: staff?.hospitals?.name || staff?.organization?.name || 'No facility',
  contact: staff?.phone || staff?.email || 'No contact',
  phone: staff?.phone || '',
  email: staff?.email || '',
  displayId: staff?.display_id || null,
  experience: staff?.experience,
  joined: staff?.created_at,
  statusMeta: getStaffStatusMeta(staff?.status),
});

const getStaffSignal = ({ stats, kpiFilter, loadError, hasAny }) => {
  const activeId = kpiFilter || 'all';
  const option = STAFF_KPI_OPTIONS.find((item) => item.id === activeId) || STAFF_KPI_OPTIONS[0];
  const count = getStaffKpiCount(option.id, stats);

  if (loadError && !hasAny) {
    return { icon: ShieldAlert, tone: 'danger', label: 'Load failed', headline: 'Staff did not load', subhead: 'Retry to load the directory.' };
  }

  if (option.id === 'all') {
    return {
      icon: Users,
      tone: 'muted',
      label: 'Staff',
      headline: count > 0 ? `${count} staff member${count === 1 ? '' : 's'}` : 'No staff yet',
      subhead: count > 0 ? 'Review the directory and keep facility assignments current.' : 'Staff you add will appear here.',
    };
  }

  const toneById = { available: 'clear', on_call: 'info', busy: 'warning', off_duty: 'muted' };
  const noun = option.label.toLowerCase();
  return {
    icon: option.icon,
    tone: toneById[option.id] || 'muted',
    label: option.label,
    headline: count > 0 ? `${count} ${noun} staff member${count === 1 ? '' : 's'}` : `No ${noun} staff`,
    subhead: count > 0 ? 'Confirm availability before assigning care.' : `${option.label} staff will appear here.`,
  };
};

const getStatusList = (value) => {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const resolveStaffStatusFilter = (filters = {}) => {
  const sheetStatuses = getStatusList(filters.status);
  const kpiStatus = filters.kpiFilter && filters.kpiFilter !== 'all' ? filters.kpiFilter : null;

  if (!kpiStatus) {
    return { status: sheetStatuses, forceEmpty: false, statsStatus: sheetStatuses };
  }
  if (sheetStatuses.length === 0 || sheetStatuses.includes(kpiStatus)) {
    return { status: kpiStatus, forceEmpty: false, statsStatus: sheetStatuses };
  }
  return { status: kpiStatus, forceEmpty: true, statsStatus: sheetStatuses };
};

const hasDateFilter = (value) => Boolean(value && typeof value === 'object' && (value.start || value.end));

const hasActiveStaffFilters = (filters = {}) => Boolean(
  filters.search ||
  (Array.isArray(filters.status) && filters.status.length > 0) ||
  (Array.isArray(filters.specialization) && filters.specialization.length > 0) ||
  hasDateFilter(filters.created_at)
);

export const DoctorsPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    variant: 'default',
    confirmLabel: 'Confirm',
    onConfirm: () => { },
  });

  const pagination = usePagination(20);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const canManageStaff = isAdmin() || isOrgAdmin();

  const roleKind = isAdmin() ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  const queryFilter = useMemo(() => {
    const statusFilter = resolveStaffStatusFilter(filters);
    const nextFilter = {
      limit: isMobile ? pagination.currentPage * pagination.itemsPerPage : pagination.itemsPerPage,
      offset: isMobile ? 0 : pagination.paginationRange.start,
      quiet: true,
      status: statusFilter.status,
      forceEmpty: statusFilter.forceEmpty,
      statsStatus: statusFilter.statsStatus,
      sortKey: sortConfig.key,
      sortDirection: sortConfig.direction,
    };
    if (filters.search) nextFilter.search = filters.search;
    if (filters.specialization) nextFilter.specialization = filters.specialization;
    if (hasDateFilter(filters.created_at)) nextFilter.created_at = filters.created_at;
    return nextFilter;
  }, [
    filters.kpiFilter,
    filters.search,
    filters.specialization,
    filters.status,
    filters.created_at,
    isMobile,
    pagination.currentPage,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const { doctors, count, stats: staffStats, loading, isFetching, error: queryError, refetch } = useDoctorsQuery(queryFilter);
  // RQ error -> honest generic copy; the raw error goes to the console only.
  const loadError = queryError ? 'Staff could not load. Check your connection and try again.' : null;
  useEffect(() => {
    if (queryError) console.error('[staff] load failed:', queryError);
  }, [queryError]);

  const derivedStats = useMemo(() => {
    const stats = staffStats || {};
    return {
      total: Number(stats.total) || count,
      available: Number(stats.available) || 0,
      on_call: Number(stats.on_call) || 0,
      busy: Number(stats.busy) || 0,
      off_duty: Number(stats.off_duty) || 0,
    };
  }, [staffStats, count]);

  const staffRows = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);

  // Auto-select the focused record via the console-wide shared store (already correct).
  const { focusedRecord: focusedStaff, setFocused, isFocused } = useFocusedRecord('doctors', staffRows);

  // Selection via the shared hook (gains shift-range + prune-to-visible). This is the
  // canonical mechanism; Staff KEEPS its WORKING bulk delete (deleteDoctor is a proven
  // receiver -- a real domain difference from Hospitals' fail-closed bar).
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(staffRows);
  const selectable = canManageStaff;

  const hasFilter = hasActiveStaffFilters(filters);
  const activeStaffFilter = filters.kpiFilter || 'all';

  useEffect(() => {
    pagination.setTotalCount(count);
  }, [count, pagination.setTotalCount]);

  useEffect(() => {
    pagination.resetPagination();
    clearSelection();
  }, [filters, sortConfig, pagination.resetPagination, clearSelection]);

  const fetchDoctors = refetch;

  // Realtime: a doctors change invalidates the ['doctors'] cache (donor idiom). A brand-
  // new staff row also announces itself, throttled to at most one toast per 10s so an
  // insert burst cannot stack over the operator. (PageDataContext's channel does NOT fire
  // on the route-owned /doctors route, so this page carries its own.)
  const lastInsertToastAtRef = useRef(0);
  const deleteDoctorMutation = useDoctorsMutations({
    mutationFn: (id) => deleteDoctor(id),
    applyOptimistic: applyOptimisticRemove,
    filter: queryFilter,
  });

  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('doctors_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
        if (active) fetchDoctors();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doctors' }, (payload) => {
        if (!active || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        toast('New staff added', payload?.new?.name ? { description: payload.new.name } : undefined);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchDoctors]);

  // Deep-link: /doctors?id=<uuid> focuses that staff row in the rail when it is on the
  // current page (QuickSearch/notification target). A cross-page getDoctor(id) fetch is
  // the queued enhancement; today it focuses in-page via location.search.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && staffRows.some((d) => d.id === id)) setFocused(id);
  }, [staffRows, setFocused]);

  const handleDelete = useCallback(async (doctor) => {
    if (!canManageStaff || !doctor?.id) return;
    try {
      await deleteDoctorMutation.mutateAsync(doctor.id);
      toast.success('Staff member deleted.');
    } catch (error) {
      toast.error('Failed to delete staff member.');
    } finally {
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    }
  }, [canManageStaff, deleteDoctorMutation]);

  const confirmDelete = useCallback((doctor) => {
    if (!canManageStaff) return;
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Doctor',
      description: `Delete ${doctor?.name || 'this staff member'}? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(doctor),
    });
  }, [canManageStaff, handleDelete]);

  const handleBulkDelete = useCallback(() => {
    if (!canManageStaff || selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setConfirmationModal({
      isOpen: true,
      title: 'Delete selected staff',
      description: `Delete ${ids.length} staff member${ids.length === 1 ? '' : 's'}? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await Promise.all(ids.map(id => deleteDoctorMutation.mutateAsync(id)));
          toast.success(`${ids.length} staff member${ids.length === 1 ? '' : 's'} deleted.`);
          clearSelection();
        } catch (error) {
          toast.error('Failed to delete selected staff.');
        } finally {
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, [canManageStaff, selectedIds, deleteDoctorMutation, clearSelection]);

  const handleCreate = useCallback(() => {
    if (!canManageStaff) return;
    setSelectedDoctor(null);
    setModalMode('create');
  }, [canManageStaff]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
    window.addEventListener('openDoctorModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => {
      window.removeEventListener('openDoctorModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate]);

  const handleView = useCallback((doctor) => {
    const id = doctor?.id || null;
    if (id && !isFocused(id)) setFocused(id);
    setSelectedDoctor(doctor);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleEdit = useCallback((doctor) => {
    if (!canManageStaff) return;
    setSelectedDoctor(doctor);
    setModalMode('edit');
  }, [canManageStaff]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedDoctor(null);
  }, []);

  const setKpiFilter = useCallback((id) => {
    setFilters((prev) => ({ ...prev, kpiFilter: id || 'all' }));
  }, []);

  const setSearchFilter = useCallback((search) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search staff...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'busy', label: 'Busy' },
        { value: 'off_duty', label: 'Away' },
        { value: 'on_call', label: 'On call' },
        // Onboarding state (live-DB: real rows exist) -- filterable, but not an
        // availability KPI chip.
        { value: 'invited', label: 'Invited' },
      ],
    },
    {
      key: 'specialization',
      type: 'multiselect',
      label: 'Specialization',
      options: [
        { value: 'cardiology', label: 'Cardiology' },
        { value: 'neurology', label: 'Neurology' },
        { value: 'pediatrics', label: 'Pediatrics' },
        { value: 'general', label: 'General' },
        { value: 'orthopedics', label: 'Orthopedics' },
        { value: 'dermatology', label: 'Dermatology' },
      ],
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Added',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 days', value: '7days' },
        { label: 'Last 30 days', value: '30days' },
        { label: 'This month', value: 'month' },
      ],
    },
  ], []);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter staff"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Users className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasFilter]);

  const headerActions = useMemo(() => {
    if (!canManageStaff) return null;
    return (
      <Button
        onClick={handleCreate}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
        aria-label="Add staff"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add staff
      </Button>
    );
  }, [canManageStaff, handleCreate]);

  usePageHeader('Staff', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  // Route-owned right panel -- publish live context so ContextPanel/DoctorsPanel render
  // this page's real data (canon shared by Requests/Visits), not stale PageData.
  const staffPanelContext = useMemo(() => ({
    stats: derivedStats,
    recent: staffRows.slice(0, 4),
    focusedStaff,
    loading,
    count,
    canManage: canManageStaff,
  }), [canManageStaff, count, derivedStats, focusedStaff, loading, staffRows]);

  const publishStaffRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('doctorsRouteContextUpdated', { detail: staffPanelContext }));
  }, [staffPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishStaffRouteContext();
    window.addEventListener('requestDoctorsRouteContext', publishStaffRouteContext);
    return () => window.removeEventListener('requestDoctorsRouteContext', publishStaffRouteContext);
  }, [publishStaffRouteContext]);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Staff" description="Review and update staff directory records." />

        <MobileDoctors
          doctors={staffRows}
          loading={loading}
          statistics={derivedStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onRefresh={fetchDoctors}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          canManage={canManageStaff}
          canDelete={canManageStaff}
          selectionEnabled={canManageStaff}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onOpenFilters={() => setFilterSheetOpen(true)}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        {modalMode && (
          <DoctorModal isOpen={!!modalMode} onClose={handleModalClose} doctor={selectedDoctor} mode={modalMode} listFilter={queryFilter} />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={derivedStats} type="doctor" />

        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          description={confirmationModal.description}
          variant={confirmationModal.variant}
          confirmLabel={confirmationModal.confirmLabel}
        />

        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {canManageStaff && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96]"
              title="Delete selected"
              aria-label="Delete selected staff"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </BulkActionBar>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Staff" description="Review and update staff directory records." />

      <StaffDesktopWorkspace
        items={staffRows}
        stats={derivedStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        canManage={canManageStaff}
        focusedStaff={focusedStaff}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={activeStaffFilter}
        setKpiFilter={setKpiFilter}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        onRetry={fetchDoctors}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        selectable={selectable}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={confirmDelete}
        onCreate={handleCreate}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
            title="Delete selected"
            aria-label="Delete selected staff"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      {modalMode && (
        <DoctorModal isOpen={!!modalMode} onClose={handleModalClose} doctor={selectedDoctor} mode={modalMode} listFilter={queryFilter} />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={derivedStats} type="doctor" />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />
    </div>
  );
};

const StaffDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  canManage,
  focusedStaff,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onCreate,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getStaffSignal({ stats, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedStaff,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-staff-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/doctors"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <StaffDetailRail
          staff={focusedStaff}
          loading={loading}
          hasFilter={hasFilter}
          canManage={canManage}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={staffToneClass}>
        <KpiStrip
          options={STAFF_KPI_OPTIONS}
          getCount={(id) => getStaffKpiCount(id, stats)}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_STAFF_KPI_IDS}
          importance={STAFF_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-staff-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="staff"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search staff by name, facility, or specialization..."
            searchTestId="staff-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="staff"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Staff list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <StaffListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Staff did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Stethoscope}
              heading={hasFilter ? 'No matching staff' : (STAFF_EMPTY_HEADINGS[kpiFilter] || 'No staff yet')}
              body={hasFilter ? 'Change filters or search again.' : 'Staff you add will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setKpiFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all staff
                </Button>
              )}
              {!hasFilter && canManage && (
                <Button
                  onClick={onCreate}
                  className="rounded-pill bg-foreground px-5 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                  data-testid="add-first-doctor-btn"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add staff
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((doctor) => (
            <StaffRow
              key={doctor.id}
              doctor={doctor}
              selected={focusedStaff?.id === doctor.id}
              onFocus={() => setFocused(doctor.id)}
              onView={onView}
              onEdit={onEdit}
              canManage={canManage}
              selectable={selectable}
              checked={selectedIds.includes(doctor.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const StaffListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? STAFF_GRID_COLS_SELECT : STAFF_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all staff'}
        className="h-4 w-4"
      />
    )}
    {/* Name / Status / Specialization / Facility are plain labels -- only Added (created_at)
        is a meaningful sort; the rest belong in the FilterSheet. */}
    <span>Name</span>
    <span>Status</span>
    <span>Specialization</span>
    <span>Facility</span>
    <SortableColumnHeader label="Added" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const StaffRow = ({ doctor, selected, onFocus, onView, onEdit, canManage, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const projection = getStaffProjection(doctor);
  const StatusIcon = projection.statusMeta.icon;

  return (
    <ListRowShell
      id={doctor.id}
      dataAttrName="data-staff-row"
      gridCols={selectable ? STAFF_GRID_COLS_SELECT : STAFF_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(doctor)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(doctor.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.name}` : `Select ${projection.name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sm font-semibold text-sky-700 dark:text-sky-200">
          {getInitials(projection.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.name}>{projection.name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={projection.email || projection.phone}>{projection.email || projection.phone || 'No contact'}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={projection.statusMeta.label} icon={StatusIcon} className={projection.statusMeta.tone} compact />
      </div>

      <div className="min-w-0 truncate text-sm font-medium capitalize" title={projection.specialization}>{projection.specialization}</div>

      <div className="min-w-0 truncate text-sm text-muted-foreground" title={projection.facility}>{projection.facility}</div>

      <div className="text-sm font-medium text-muted-foreground">{formatJoinedDate(projection.joined)}</div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(doctor); }}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${projection.name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(doctor); }}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Edit ${projection.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ListRowShell>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

const StaffDetailRail = ({ staff, loading, hasFilter, canManage, onView, onEdit, onDelete }) => {
  if (loading) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-5 w-2/3 rounded-inner" />
            <Shimmer className="h-4 w-1/2 rounded-inner" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!staff) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <UserRound className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No staff member selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Staff that match your filters will appear here.' : 'Select a staff member to see their details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const projection = getStaffProjection(staff);
  const StatusIcon = projection.statusMeta.icon;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Staff details</h2>
            {projection.displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={projection.displayId}>{projection.displayId}</p>
                <CopyChip value={projection.displayId} label="Copy staff ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${projection.statusMeta.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {projection.statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(staff)}
            aria-label="Open full staff details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-lg font-semibold text-sky-700 dark:text-sky-200">
            {getInitials(projection.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.name}>{projection.name}</h3>
            <p className="mt-1 truncate text-sm capitalize text-muted-foreground" title={projection.specialization}>{projection.specialization}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Stethoscope} label="Specialization" value={projection.specialization} />
        <DetailLine icon={Hospital} label="Facility" value={projection.facility} />
        <DetailLine icon={staff.phone ? Phone : Mail} label="Contact" value={projection.contact} />
        {projection.experience != null && (
          <DetailLine icon={IdCard} label="Experience" value={`${projection.experience} year${projection.experience === 1 ? '' : 's'}`} />
        )}
        <DetailLine icon={Clock} label="Joined" value={formatJoinedDate(projection.joined)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(staff)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {canManage && (
          <div className="grid grid-cols-2 gap-3">
            <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(staff)} />
            <RailActionButton icon={Info} label="Open record" onClick={() => onView(staff)} />
          </div>
        )}

        {canManage && (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]"
            onClick={() => onDelete(staff)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete staff
          </Button>
        )}

        {!canManage && (
          <div
            role="note"
            className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <UserRound className="h-4 w-4 shrink-0" />
            Staff changes are read-only until manage authority is verified.
          </div>
        )}
      </div>
    </DetailRailShell>
  );
};
