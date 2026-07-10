import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getHospitals } from '../../services/hospitalsService';
import { getAmbulance } from '../../services/ambulancesService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAmbulancesQuery } from '../../hooks/useAmbulancesQuery';
import { usePagination } from '../../hooks/usePagination';
import { Button } from '../ui/button';
// Console design system: the workspace grammar lives in shared components --
// this page COMPOSES the canon (WorkspaceStage/SignalPanel/KpiStrip/
// ActivitySheet/DetailRailShell/primitives) instead of the bespoke local
// AmbulanceSignalPanel/StateStrip/ActivitySheet/DetailRail it used to inline
// (AMBULANCES_REVAMP_CONSTITUTION_2026-07-10, AMB-1..AMB-3, AMB-10).
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, CopyChip, StatusPill, DetailLine, EmptyState, ErrorBanner, LoadErrorState } from '../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { formatDayTime } from '../../utils/dayTime';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import {
  Activity,
  AlertCircle,
  Ambulance,
  Clock,
  Edit,
  Eye,
  Filter,
  MapPin,
  Plus,
  Route,
  Truck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { MobileAmbulances } from '../mobile/MobileAmbulances';

// Stats are computed status-agnostic (the status chip narrows the LIST, not the
// KPI counts) so the chip totals stay stable while a chip is active.
const getAmbulanceStatsFilters = (filters = {}) => {
  const { status, ...rest } = filters;
  return rest;
};

const ACTIVE_FLEET_STATUSES = new Set(['dispatched', 'on_trip', 'en_route', 'on_scene']);

const normalizeAmbulanceCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getFleetStatus = (ambulance) => String(ambulance?.status || 'available').toLowerCase();

// Status vocabulary + literal tones, reused verbatim from the already-canon
// MobileAmbulances so both surfaces speak one language (constitution perk 1).
const getFleetStatusLabel = (status) => {
  if (status === 'available') return 'Ready';
  if (status === 'en_route' || status === 'on_route') return 'En route';
  if (status === 'dispatched') return 'Dispatched';
  if (status === 'on_trip') return 'On trip';
  if (status === 'on_scene') return 'On scene';
  if (status === 'returning') return 'Returning';
  if (status === 'maintenance') return 'Maintenance';
  if (status === 'offline') return 'Offline';
  if (status === 'pending_approval') return 'Pending';
  return status ? status.replace(/_/g, ' ') : 'Unknown';
};

// Literal palette only (the theme's --primary/--success/--warning/--info all
// render RED): Ready emerald, En route amber, Active cyan, Service amber, rest
// muted. This replaces the old red-trap status badge map (AMB-10).
const ambulanceStatusPillClass = (status) => {
  if (status === 'available') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  if (status === 'en_route' || status === 'on_route') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (ACTIVE_FLEET_STATUSES.has(status)) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  if (status === 'maintenance' || status === 'offline') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'bg-muted/40 text-muted-foreground';
};

const ambulanceStatusPillIcon = (status) => {
  if (status === 'available') return MapPin;
  if (status === 'maintenance' || status === 'offline') return Wrench;
  if (ACTIVE_FLEET_STATUSES.has(status)) return Activity;
  return Ambulance;
};

const getAmbulanceStation = (ambulance) => ambulance?.station_name || ambulance?.hospital || 'No station';
const getAmbulanceVehicle = (ambulance) => ambulance?.vehicle_label || ambulance?.vehicle_number || ambulance?.license_plate || 'No vehicle';

const getFleetStateCount = ({ id, stats, ambulances }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  if (id === 'all') return normalizeAmbulanceCount(stats?.total, rows.length);
  if (id === 'available') return normalizeAmbulanceCount(stats?.available, rows.filter(unit => getFleetStatus(unit) === 'available').length);
  if (id === 'on_route') return normalizeAmbulanceCount(stats?.onRoute, rows.filter(unit => ['en_route', 'on_route'].includes(getFleetStatus(unit))).length);
  if (id === 'busy') return normalizeAmbulanceCount(stats?.busy, rows.filter(unit => ACTIVE_FLEET_STATUSES.has(getFleetStatus(unit))).length);
  if (id === 'maintenance') return normalizeAmbulanceCount(stats?.maintenance, rows.filter(unit => getFleetStatus(unit) === 'maintenance').length);
  return 0;
};

// Signal eyebrow tone -> chip class (SignalPanel applies toneClassMap[signal.tone]).
const ambulanceToneClass = {
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  active: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  attention: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  muted: 'bg-muted/40 text-muted-foreground',
  danger: 'bg-destructive/12 text-destructive',
};

// KpiStrip options (max-3 smart context): Fleet/Ready/En route/Active/Service.
// Literal palette + neutral shadow-e2 (the old bg-primary Fleet chip + colored
// glow shadows were AMB-2/AMB-10). Pinned + importance below reduce 5 -> 3.
const ambulanceStateOptions = [
  { id: 'all', label: 'Fleet', icon: Ambulance, colorClass: 'text-sky-600 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-800 shadow-e2 dark:text-sky-100' },
  { id: 'available', label: 'Ready', icon: MapPin, colorClass: 'text-emerald-600 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-e2 dark:text-emerald-100' },
  { id: 'on_route', label: 'En route', icon: Route, colorClass: 'text-amber-600 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100' },
  { id: 'busy', label: 'Active', icon: Activity, colorClass: 'text-cyan-600 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-e2 dark:text-cyan-100' },
  { id: 'maintenance', label: 'Service', icon: Wrench, colorClass: 'text-amber-600 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100' },
];

// Ready + En route pin while they carry signal (the operational-availability
// states an operator wants first); the rest fill by count then importance.
const AMBULANCE_KPI_IMPORTANCE = { all: 0, available: 1, on_route: 2, busy: 3, maintenance: 4 };
const PINNED_AMBULANCE_STATE_IDS = ['available', 'on_route'];

// F7 / honest-failed-hero: a failed load with nothing cached must not render a
// reassuring zero-derived hero above the list error state (donor: getRequestSignal).
const getAmbulanceSignal = ({ stats, ambulances, kpiFilter, loadError }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  const total = getFleetStateCount({ id: 'all', stats, ambulances: rows });
  const ready = getFleetStateCount({ id: 'available', stats, ambulances: rows });
  const active = getFleetStateCount({ id: 'busy', stats, ambulances: rows });
  const service = getFleetStateCount({ id: 'maintenance', stats, ambulances: rows });

  if (loadError && total === 0 && rows.length === 0) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Fleet did not load',
      subhead: 'Retry to load the fleet list.',
    };
  }

  if (kpiFilter === 'maintenance') {
    return { icon: Wrench, tone: 'attention', label: 'Service', headline: service > 0 ? `${service} unit${service === 1 ? '' : 's'} need service attention` : 'No units in service review', subhead: 'Review units out of service before assigning them to new requests.' };
  }
  if (kpiFilter === 'on_route' || kpiFilter === 'busy') {
    return { icon: Activity, tone: 'active', label: 'In motion', headline: active > 0 ? `${active} unit${active === 1 ? '' : 's'} active now` : 'No active units', subhead: 'Active units stay visible as read-only fleet evidence until dispatch actions are proved.' };
  }
  if (kpiFilter === 'available') {
    return { icon: MapPin, tone: 'ready', label: 'Ready', headline: ready > 0 ? `${ready} unit${ready === 1 ? '' : 's'} ready` : 'No ready units', subhead: 'Ready units are available for review from the route-owned fleet list.' };
  }
  if (total === 0) {
    return { icon: Ambulance, tone: 'muted', label: 'Fleet', headline: 'No fleet rows found', subhead: 'Change filters or add a unit.' };
  }
  return {
    icon: Ambulance,
    tone: ready > 0 ? 'ready' : 'attention',
    label: 'Fleet',
    headline: `${total} unit${total === 1 ? '' : 's'} in the fleet`,
    subhead: `${ready} ready, ${active} active, ${service} in service review.`,
  };
};

const hasActiveAmbulanceFilters = (filters = {}) => Boolean(
  filters.search ||
  (filters.status && filters.status.length > 0) ||
  (filters.type && filters.type.length > 0) ||
  filters.hospital ||
  filters.created_at
);

export const AmbulancesPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [hospitals, setHospitals] = useState([]);
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const actionFeedbackTimeoutRef = useRef(null);

  const pagination = usePagination(20);
  const { currentPage, itemsPerPage, paginationRange, setTotalCount, resetPagination } = pagination;
  const canManageFleet = isAdmin() || isOrgAdmin();

  // Wayfinding dock (first-click-wins nav + pressed feedback), like the donors.
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    return 'viewer';
  }, [isAdmin, isOrgAdmin]);
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  const queryFilter = useMemo(() => ({
    filters,
    statsFilters: getAmbulanceStatsFilters(filters),
    kpiFilter,
    sortConfig,
    limit: isMobile ? currentPage * itemsPerPage : itemsPerPage,
    offset: isMobile ? 0 : paginationRange.start,
  }), [filters, kpiFilter, sortConfig, isMobile, currentPage, itemsPerPage, paginationRange.start]);

  const {
    ambulances,
    count: ambulanceCount,
    stats: ambulancePageStats,
    loading,
    isFetching,
    error: ambulanceQueryError,
    refetch,
  } = useAmbulancesQuery(queryFilter);

  const fetchAmbulances = refetch;
  // Components render this as a message string; naming it `loadError` also
  // satisfies the honest-failed-hero mechanism-registry signature.
  const loadError = ambulanceQueryError ? (ambulanceQueryError.message || 'Fleet could not load.') : null;
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('ambulances', ambulances);
  const focusedAmbulance = focusedRecord;
  // Keyboard focus adapter: useListKeyboardNav drives focus BY ID while the
  // shared useFocusedRecord setter TOGGLES a repeated id (row-click semantics).
  // Guard the same-id re-send at the list edge so the rail never clears
  // mid-navigation; Escape (null) still clears explicitly.
  const setKeyboardFocusedId = useCallback((id) => {
    if (id == null) { setFocused(null); return; }
    if (focusedAmbulance?.id !== id) setFocused(id);
  }, [focusedAmbulance, setFocused]);

  const markActionFeedback = useCallback((key) => {
    setActiveActionFeedback(key);
    if (actionFeedbackTimeoutRef.current) window.clearTimeout(actionFeedbackTimeoutRef.current);
    actionFeedbackTimeoutRef.current = window.setTimeout(() => setActiveActionFeedback(null), 900);
  }, []);

  useEffect(() => () => {
    if (actionFeedbackTimeoutRef.current) window.clearTimeout(actionFeedbackTimeoutRef.current);
  }, []);

  // Station filter dropdown (Admin only).
  useEffect(() => {
    if (isAdmin()) {
      getHospitals({ quiet: true, limit: 500 }).then((result) => {
        setHospitals(Array.isArray(result) ? result : result?.data || []);
      }).catch((error) => console.error('Error fetching ambulance station filters:', error));
    }
  }, [isAdmin]);

  useEffect(() => { setTotalCount(ambulanceCount || 0); }, [ambulanceCount, setTotalCount]);
  useEffect(() => { resetPagination(); }, [filters, kpiFilter, sortConfig.key, sortConfig.direction, resetPagination]);

  const displayStats = ambulancePageStats;
  const hasFilter = hasActiveAmbulanceFilters(filters);
  const failedEmpty = Boolean(loadError) && (ambulances?.length || 0) === 0;

  // Route-context bridge for the right ContextPanel (AmbulancesPanel).
  const ambulanceRouteContext = useMemo(() => {
    const sourceRows = Array.isArray(ambulances) ? ambulances : [];
    const contextStatus = loadError ? 'failed' : loading ? 'loading' : sourceRows.length === 0 ? 'empty' : 'ready';
    return {
      status: contextStatus,
      loading,
      error: loadError,
      canEdit: canManageFleet,
      focusedAmbulance,
      stats: {
        total: getFleetStateCount({ id: 'all', stats: displayStats, ambulances: sourceRows }),
        available: getFleetStateCount({ id: 'available', stats: displayStats, ambulances: sourceRows }),
        onRoute: getFleetStateCount({ id: 'on_route', stats: displayStats, ambulances: sourceRows }),
        active: getFleetStateCount({ id: 'busy', stats: displayStats, ambulances: sourceRows }),
        maintenance: getFleetStateCount({ id: 'maintenance', stats: displayStats, ambulances: sourceRows }),
        visible: sourceRows.length,
        totalCount: pagination.totalCount,
      },
      recent: sourceRows.slice(0, 5).map((unit) => ({
        id: unit.id,
        call_sign: unit.call_sign,
        vehicle_number: unit.vehicle_number,
        license_plate: unit.license_plate,
        status: getFleetStatus(unit),
        statusLabel: getFleetStatusLabel(getFleetStatus(unit)),
        station: getAmbulanceStation(unit),
      })),
    };
  }, [ambulances, loadError, displayStats, loading, pagination.totalCount, canManageFleet, focusedAmbulance]);

  const publishAmbulancesRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('ambulancesRouteContextUpdated', { detail: ambulanceRouteContext }));
  }, [ambulanceRouteContext]);

  useEffect(() => { publishAmbulancesRouteContext(); }, [publishAmbulancesRouteContext]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
    return () => window.removeEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
  }, [publishAmbulancesRouteContext]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key && prev.direction === 'desc') return { key: '', direction: 'asc' };
      return { key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const handleKpiFilterChange = useCallback((id) => { setKpiFilter(id); }, []);
  const handleApplyFilters = useCallback((nextFilters) => { setFilters(nextFilters); }, []);
  const handleClearFilters = useCallback(() => { setFilters({}); setKpiFilter('all'); }, []);
  const handleOpenFilters = useCallback(() => { markActionFeedback('filters'); setFilterSheetOpen(true); }, [markActionFeedback]);
  const handleOpenAnalytics = useCallback(() => { markActionFeedback('analytics'); setAnalyticsModalOpen(true); }, [markActionFeedback]);

  // CREATE + EDIT are LIVE (constitution write register): ambulances is
  // write-capable -- `Org Admins manage ambulances` = ALL (live-verified) -- so
  // create/edit are legitimate for admin/org_admin, NOT fail-closed like the
  // hospitals create gate. Delete/dispatch/status/location/upload stay gated.
  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    setSelectedAmbulance(null);
    setModalMode('create');
  }, [markActionFeedback]);

  const handleView = useCallback((ambulance) => {
    markActionFeedback(`view-${ambulance.id}`);
    if (ambulance?.id) setFocused(ambulance.id);
    setSelectedAmbulance(ambulance);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleEdit = useCallback((ambulance) => {
    markActionFeedback(`edit-${ambulance.id}`);
    if (ambulance?.id) setFocused(ambulance.id);
    setSelectedAmbulance(ambulance);
    setModalMode('edit');
  }, [markActionFeedback, setFocused]);

  // deep-link: ?add=true opens create; ?id=<unit> focuses that unit and opens
  // its read-only record (UUID or display_id, donor idiom: HospitalsPage).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') { handleCreate(); return undefined; }
    const unitId = params.get('id');
    if (!unitId) return undefined;
    let active = true;
    getAmbulance(unitId)
      .then((unit) => {
        if (!active || !unit) return;
        setFocused(unit.id);
        setSelectedAmbulance(unit);
        setModalMode('view');
      })
      .catch((error) => console.error('Error loading ambulance deep link:', error));
    return () => { active = false; };
  }, [handleCreate, location.search, setFocused]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    window.addEventListener('openAmbulanceModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => {
      window.removeEventListener('openAmbulanceModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  // Modal writes flow through useAmbulancesMutations, whose onSettled invalidates
  // ['ambulances'] and refetches this page's live query. Closing must NOT refetch.
  const handleModalClose = useCallback(() => { setModalMode(null); setSelectedAmbulance(null); }, []);

  const filterSchema = useMemo(() => [
    { key: 'search', type: 'text', label: 'Search', placeholder: 'Search call sign, plate, vehicle...' },
    {
      key: 'status', type: 'multiselect', label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'en_route', label: 'En Route' },
        { value: 'busy', label: 'Busy' },
        { value: 'maintenance', label: 'Maintenance' },
      ],
    },
    {
      key: 'type', type: 'multiselect', label: 'Type',
      options: [
        { value: 'Standard', label: 'Standard' },
        { value: 'Advanced', label: 'Advanced' },
        { value: 'ICU', label: 'ICU' },
        { value: 'Transport', label: 'Transport' },
      ],
    },
    {
      key: 'hospital', type: 'select', label: 'Station/Hospital',
      options: hospitals.map(h => ({ value: h.id, label: h.name })),
      hidden: !isAdmin(),
    },
    {
      key: 'created_at', type: 'date', label: 'Commission Date', placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' },
      ],
    },
  ], [hospitals, isAdmin]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      data-state={filterSheetOpen ? 'open' : 'idle'}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter ambulances"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasActiveAmbulanceFilters(filters) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, filters, handleOpenFilters]);

  const headerActions = useMemo(() => {
    // Add unit is a LIVE create (write-capable table) -- render it in the donor's
    // fg-on-bg pill recipe, gated to admin/org_admin (canManageFleet).
    if (canManageFleet) {
      return (
        <Button
          onClick={handleCreate}
          data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
          className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95 ${activeActionFeedback === 'create' ? 'scale-95' : ''}`}
          aria-busy={activeActionFeedback === 'create'}
          aria-label="Add unit"
        >
          <Plus className="mr-2 h-4 w-4" />
          {activeActionFeedback === 'create' ? 'Opening...' : 'Add unit'}
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, canManageFleet, handleCreate]);

  usePageHeader("Ambulances", headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Ambulances" description="Manage ambulance units, status, and tracking." />
        <MobileAmbulances
          ambulances={ambulances}
          loading={loading}
          statistics={displayStats}
          filters={filters}
          setFilters={handleApplyFilters}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchAmbulances}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          onOpenFilters={handleOpenFilters}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          errorMessage={loadError}
          onRetry={fetchAmbulances}
          selectionEnabled={false}
        />

        {modalMode && (
          <AmbulanceModal isOpen={!!modalMode} onClose={handleModalClose} ambulance={selectedAmbulance} mode={modalMode} listFilter={queryFilter} />
        )}
        <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={handleApplyFilters} initialValues={filters} viewToggle={null} isMobile={true} />
        <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={displayStats} type="ambulance" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Ambulances" description="Manage ambulance units, status, and tracking." />

      <AmbulancesDesktopWorkspace
        ambulances={ambulances}
        loading={loading}
        isFetching={isFetching}
        stats={displayStats}
        filters={filters}
        setFilters={handleApplyFilters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        focusedAmbulance={focusedAmbulance}
        setFocused={setFocused}
        isFocused={isFocused}
        setKeyboardFocusedId={setKeyboardFocusedId}
        canManageFleet={canManageFleet}
        onView={handleView}
        onEdit={handleEdit}
        onClearFilters={handleClearFilters}
        pagination={pagination}
        openFilters={handleOpenFilters}
        filterSheetOpen={filterSheetOpen}
        hasFilter={hasFilter}
        loadError={loadError}
        failedEmpty={failedEmpty}
        onRetry={fetchAmbulances}
        onRefresh={fetchAmbulances}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
        sortConfig={sortConfig}
        onSort={handleSort}
        activeActionFeedback={activeActionFeedback}
      />

      {modalMode && (
        <AmbulanceModal isOpen={!!modalMode} onClose={handleModalClose} ambulance={selectedAmbulance} mode={modalMode} listFilter={queryFilter} />
      )}
      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={handleApplyFilters} initialValues={filters} viewToggle={null} isMobile={false} />
      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analytics={displayStats} type="ambulance" />
    </div>
  );
};

// Fleet columns (one canonical render; ViewToggle/grid/list/table retired,
// AMB-3): Unit (call_sign + type eyebrow) | Status | Station | Vehicle | Updated
// (the sortable Time-equivalent, updated_at) | Action.
const AMBULANCE_GRID_COLS = 'grid-cols-[minmax(160px,1.4fr)_minmax(96px,auto)_minmax(120px,1fr)_minmax(110px,auto)_minmax(96px,auto)_72px]';

const AMBULANCE_EMPTY_HEADINGS = {
  available: 'No ready units',
  on_route: 'No en-route units',
  busy: 'No active units',
  maintenance: 'No units in service review',
};

const AmbulancesDesktopWorkspace = ({
  ambulances,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedAmbulance,
  setFocused,
  isFocused,
  setKeyboardFocusedId,
  canManageFleet,
  onView,
  onEdit,
  onClearFilters,
  pagination,
  openFilters,
  filterSheetOpen,
  hasFilter,
  loadError,
  failedEmpty,
  onRetry,
  onRefresh,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  sortConfig,
  onSort,
  activeActionFeedback,
}) => {
  const signal = getAmbulanceSignal({ stats, ambulances, kpiFilter, loadError });
  const listScrollRef = useRef(null);
  useScrollResetOnPage(listScrollRef, pagination.currentPage);

  const handleListKeyDown = useListKeyboardNav({
    items: ambulances,
    focusedItem: focusedAmbulance,
    setFocusedId: setKeyboardFocusedId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-ambulance-row',
  });

  const readyCount = getFleetStateCount({ id: 'available', stats, ambulances });
  const activeCount = getFleetStateCount({ id: 'busy', stats, ambulances });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/ambulances"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <AmbulanceDetailRail
          ambulance={focusedAmbulance}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={canManageFleet}
          onView={onView}
          onEdit={onEdit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={ambulanceToneClass}>
        {/* Ready / Active page-scope pills stay under the hero; aria-live keeps
            the counts announced now the DS SignalPanel owns the hero markup. */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
          {loading ? (
            <>
              <Shimmer className="h-8 w-28 rounded-pill" />
              <Shimmer className="h-8 w-28 rounded-pill" />
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
                Ready
                <strong className="text-foreground">{readyCount}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
                Active
                <strong className="text-foreground">{activeCount}</strong>
              </span>
            </>
          )}
        </div>

        <KpiStrip
          options={ambulanceStateOptions}
          getCount={(id) => getFleetStateCount({ id, stats, ambulances })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_AMBULANCE_STATE_IDS}
          importance={AMBULANCE_KPI_IMPORTANCE}
          dataAttr="data-ambulance-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="ambulances"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchPlaceholder="Search call sign, plate, vehicle..."
            searchTestId="ambulances-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="ambulances"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner title="Ambulances could not load" message={loadError} onRetry={onRetry} testId="ambulances-error-state" />
        ) : null}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Ambulances list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Ambulances did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <AmbulanceListHeader sortConfig={sortConfig} onSort={onSort} />

              {ambulances.length === 0 && !loadError && (
                <EmptyState
                  icon={Ambulance}
                  heading={hasFilter ? 'No matching units' : (AMBULANCE_EMPTY_HEADINGS[kpiFilter] || 'No units found')}
                  body={hasFilter ? 'Try a different search or clear the current filters.' : 'Try a different filter or add a unit.'}
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

              {/* selection excluded by decision: single + bulk delete were dropped
                  at the visual-start repair (f586f1a0) and no console bulk-write
                  receiver exists for the fleet; the delete service fn stays
                  inventory only. Do NOT wire live selection
                  (AMBULANCES_REVAMP_CONSTITUTION_2026-07-10 section 3). */}
              {ambulances.map((ambulance) => (
                <AmbulanceRow
                  key={ambulance.id}
                  ambulance={ambulance}
                  selected={isFocused(ambulance.id)}
                  onFocus={() => setFocused(ambulance.id)}
                  onView={onView}
                  onEdit={onEdit}
                  canManageFleet={canManageFleet}
                  activeActionFeedback={activeActionFeedback}
                />
              ))}
            </>
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

// arrival-toast excluded by decision: a new-unit INSERT is not an
// operator-attention event like a new emergency; subscribeToAllAmbulances exists
// if this is ever reversed (AMBULANCES_REVAMP_CONSTITUTION_2026-07-10 section 3).

const AmbulanceAvatar = ({ size = 'h-9 w-9', iconSize = 'h-4 w-4' }) => (
  <span className={`flex ${size} shrink-0 items-center justify-center rounded-pill bg-cyan-500/10 text-cyan-700 dark:text-cyan-200`}>
    <Ambulance className={iconSize} aria-hidden="true" />
  </span>
);

const AmbulanceListHeader = ({ sortConfig, onSort }) => (
  <div className={`grid ${AMBULANCE_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {/* Unit / Status / Station / Vehicle are plain labels (donor canon: only a
        Time column sorts -- alphabetical sorts are not operational). Updated is
        the sortable time-equivalent. Status filtering = KPI chips + FilterSheet. */}
    <span>Unit</span>
    <span>Status</span>
    <span>Station</span>
    <span>Vehicle</span>
    <SortableColumnHeader label="Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const AmbulanceRow = ({ ambulance, selected, onFocus, onView, onEdit, canManageFleet, activeActionFeedback }) => {
  const status = getFleetStatus(ambulance);
  const StatusIcon = ambulanceStatusPillIcon(status);
  const callSign = ambulance.call_sign || 'Unknown unit';
  const station = getAmbulanceStation(ambulance);
  const vehicle = getAmbulanceVehicle(ambulance);
  const viewOpening = activeActionFeedback === `view-${ambulance.id}`;
  const editOpening = activeActionFeedback === `edit-${ambulance.id}`;

  return (
    <ListRowShell
      id={ambulance.id}
      dataAttrName="data-ambulance-row"
      gridCols={AMBULANCE_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(ambulance)}
    >
      <span className="flex min-w-0 items-center gap-3">
        <AmbulanceAvatar />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground" title={callSign}>{callSign}</span>
          <span className="block truncate text-xs text-muted-foreground">{ambulance.type || 'Standard'}</span>
        </span>
      </span>

      <span>
        <StatusPill compact icon={StatusIcon} label={getFleetStatusLabel(status)} className={ambulanceStatusPillClass(status)} />
      </span>

      <span className="truncate text-sm text-muted-foreground" title={station}>{station}</span>

      <span className="truncate text-sm tabular-nums text-foreground/85" title={vehicle}>{vehicle}</span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {ambulance.updated_at ? formatDayTime(ambulance.updated_at) : 'Unknown'}
      </span>

      <span className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => { event.stopPropagation(); onView(ambulance); }}
          className={`h-8 w-8 rounded-button p-0 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${viewOpening ? 'scale-95 bg-foreground/10 text-foreground' : ''}`}
          aria-label={`View details for ${callSign}`}
          aria-busy={viewOpening}
          data-state={viewOpening ? 'opening' : 'idle'}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManageFleet && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => { event.stopPropagation(); onEdit(ambulance); }}
            className={`h-8 w-8 rounded-button p-0 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'scale-95 bg-foreground/10 text-foreground' : ''}`}
            aria-label={`Edit ${callSign}`}
            aria-busy={editOpening}
            data-state={editOpening ? 'opening' : 'idle'}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </span>
    </ListRowShell>
  );
};

const AmbulanceDetailRail = ({ ambulance, loading, hasFilter, canEdit, onView, onEdit, activeActionFeedback }) => {
  if (loading) {
    return (
      <DetailRailShell>
        <div className="mb-4 h-5 w-28 rounded-pill bg-muted/40" />
        <Shimmer className="h-28 rounded-card" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
        </div>
      </DetailRailShell>
    );
  }

  if (!ambulance) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Ambulance className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No unit selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Units that match your filters will appear here.' : 'Fleet units will appear here when the list has results.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const status = getFleetStatus(ambulance);
  const StatusIcon = ambulanceStatusPillIcon(status);
  const station = getAmbulanceStation(ambulance);
  const vehicle = getAmbulanceVehicle(ambulance);
  const displayId = ambulance.display_id || null;
  const callSign = ambulance.call_sign || 'Unknown unit';
  const crewCount = Array.isArray(ambulance.crew) ? ambulance.crew.filter(Boolean).length : 0;
  const viewOpening = activeActionFeedback === `view-${ambulance.id}`;
  const editOpening = activeActionFeedback === `edit-${ambulance.id}`;

  return (
    <DetailRailShell>
      <div data-testid="ambulances-detail-rail">
        <RailInsetHero>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Unit details</h2>
              {displayId && (
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                  <CopyChip value={displayId} label="Copy unit ID" />
                </div>
              )}
              <div className="mt-4">
                <StatusPill icon={StatusIcon} label={getFleetStatusLabel(status)} className={ambulanceStatusPillClass(status)} />
              </div>
            </div>
            <span className="shrink-0 rounded-pill bg-muted/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Fleet
            </span>
          </div>

          <div className="flex items-center gap-4">
            <AmbulanceAvatar size="h-14 w-14" iconSize="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight" title={callSign}>{callSign}</p>
              <p className="mt-0.5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{station}</span>
              </p>
            </div>
          </div>
        </RailInsetHero>

        <div className="space-y-3">
          <DetailLine icon={Truck} label="Vehicle" value={vehicle} />
          <DetailLine icon={Clock} label="ETA" value={ambulance.eta || 'Not set'} />
          <DetailLine icon={Wrench} label="Type" value={ambulance.type || 'Standard'} />
          <DetailLine icon={Ambulance} label="Plate" value={ambulance.vehicle_number || ambulance.license_plate || 'Not set'} />
          <DetailLine icon={Activity} label="Crew" value={crewCount > 0 ? `${crewCount} listed` : 'Not listed'} />
          <DetailLine icon={Clock} label="Updated" value={ambulance.updated_at ? new Date(ambulance.updated_at).toLocaleString() : 'Unknown'} />
        </div>

        {/* Live-location boundary (constitution perk 8): trip status + location are
            dispatch/driver-owned operational insight, read-only here. */}
        <div className="mt-5 rounded-inner bg-cyan-500/10 p-4 text-cyan-800 dark:text-cyan-200">
          <p className="text-sm font-semibold">Dispatch changes stay in Requests</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            This panel is read-only fleet evidence. Trip status and location commands need a linked request owner.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(ambulance)}
            className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
            aria-busy={viewOpening}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening...' : 'Details'}
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(ambulance)}
              className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'scale-95 bg-foreground/10' : ''}`}
              aria-busy={editOpening}
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
