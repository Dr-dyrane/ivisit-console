import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getHospitals } from '../../services/hospitalsService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAmbulancesQuery } from '../../hooks/useAmbulancesQuery';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Ambulance, Plus, Edit, Eye, MapPin, Activity, Filter, Search, AlertCircle, RefreshCw, Wrench } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { AmbulanceListView } from '../views/AmbulanceListView';
import { AmbulanceTableView } from '../views/AmbulanceTableView';
import { SEOHead } from '../common/SEOHead';
import { MobileAmbulances } from '../mobile/MobileAmbulances';

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

const getAmbulanceStation = (ambulance) => ambulance?.station_name || ambulance?.hospital || 'No station';

const getFleetStateCount = ({ id, stats, ambulances }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  if (id === 'all') return normalizeAmbulanceCount(stats?.total, rows.length);
  if (id === 'available') return normalizeAmbulanceCount(stats?.available, rows.filter(unit => getFleetStatus(unit) === 'available').length);
  if (id === 'on_route') return normalizeAmbulanceCount(stats?.onRoute, rows.filter(unit => ['en_route', 'on_route'].includes(getFleetStatus(unit))).length);
  if (id === 'busy') return normalizeAmbulanceCount(stats?.busy, rows.filter(unit => ACTIVE_FLEET_STATUSES.has(getFleetStatus(unit))).length);
  if (id === 'maintenance') return normalizeAmbulanceCount(stats?.maintenance, rows.filter(unit => getFleetStatus(unit) === 'maintenance').length);
  return 0;
};

const ambulanceToneClass = {
  ready: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200',
  active: 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200',
  attention: 'bg-amber-500/12 text-amber-700 dark:text-amber-200',
  muted: 'bg-muted/45 text-muted-foreground',
};

const ambulanceStateOptions = [
  {
    id: 'all',
    label: 'Fleet',
    icon: Ambulance,
    activeClass: 'bg-primary/12 text-primary shadow-[0_22px_52px_hsl(var(--primary)/0.16)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-muted/42',
    iconClass: 'text-primary',
  },
  {
    id: 'available',
    label: 'Ready',
    icon: MapPin,
    activeClass: 'bg-emerald-500/12 text-emerald-700 shadow-[0_22px_52px_rgba(16,185,129,0.14)] dark:text-emerald-200',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-emerald-500/10',
    iconClass: 'text-emerald-600 dark:text-emerald-200',
  },
  {
    id: 'on_route',
    label: 'En route',
    icon: Activity,
    activeClass: 'bg-amber-500/12 text-amber-700 shadow-[0_22px_52px_rgba(245,158,11,0.14)] dark:text-amber-200',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-amber-500/10',
    iconClass: 'text-amber-600 dark:text-amber-200',
  },
  {
    id: 'busy',
    label: 'Active',
    icon: Ambulance,
    activeClass: 'bg-cyan-500/12 text-cyan-700 shadow-[0_22px_52px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-cyan-500/10',
    iconClass: 'text-cyan-600 dark:text-cyan-200',
  },
  {
    id: 'maintenance',
    label: 'Service',
    icon: Wrench,
    activeClass: 'bg-muted/55 text-foreground shadow-[0_22px_52px_rgba(0,0,0,0.10)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-muted/42',
    iconClass: 'text-muted-foreground',
  },
];

const getAmbulanceSignal = ({ stats, ambulances, kpiFilter }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  const total = getFleetStateCount({ id: 'all', stats, ambulances: rows });
  const ready = getFleetStateCount({ id: 'available', stats, ambulances: rows });
  const active = getFleetStateCount({ id: 'busy', stats, ambulances: rows });
  const service = getFleetStateCount({ id: 'maintenance', stats, ambulances: rows });

  if (kpiFilter === 'maintenance') {
    return {
      icon: Wrench,
      tone: 'attention',
      label: 'Service',
      headline: `${service} units need service attention`,
      subhead: 'Review units out of service before assigning them to new requests.',
    };
  }

  if (kpiFilter === 'on_route' || kpiFilter === 'busy') {
    return {
      icon: Activity,
      tone: 'active',
      label: 'In motion',
      headline: `${active} units are active now`,
      subhead: 'Active units stay visible as read-only fleet evidence until dispatch actions are proved.',
    };
  }

  if (kpiFilter === 'available') {
    return {
      icon: MapPin,
      tone: 'ready',
      label: 'Ready',
      headline: `${ready} units are ready`,
      subhead: 'Ready units are available for review from the route-owned fleet list.',
    };
  }

  if (total === 0) {
    return {
      icon: Ambulance,
      tone: 'muted',
      label: 'Fleet',
      headline: 'No fleet rows found',
      subhead: 'Change filters or add a unit after fleet create authority is reviewed.',
    };
  }

  return {
    icon: Ambulance,
    tone: ready > 0 ? 'ready' : 'attention',
    label: 'Fleet',
    headline: `${total} units in the fleet`,
    subhead: `${ready} ready, ${active} active, ${service} in service review.`,
  };
};

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

  const { viewMode, setViewMode } = useViewMode('ambulances-page', 'grid');
  const pagination = usePagination(20);
  const { currentPage, itemsPerPage, paginationRange, setTotalCount, resetPagination } = pagination;
  const canManageFleet = isAdmin() || isOrgAdmin();

  // Read path: the fleet list now flows through React Query (useAmbulancesQuery),
  // which wraps the same getAmbulancesPageData projection the page used to fetch by
  // hand. queryFilter is the exact params object passed to the service; React Query
  // caches under ['ambulances', queryFilter] (deep-hashed key), de-dupes requests,
  // and keeps the previous page visible while a new one loads (placeholderData).
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
    error: ambulanceQueryError,
    refetch,
  } = useAmbulancesQuery(queryFilter);

  // Mobile pull-to-refresh and the error-banner retry reuse the query's refetch.
  const fetchAmbulances = refetch;
  // Components render this as a message string, so normalize the RQ Error object.
  const ambulancePageError = ambulanceQueryError
    ? (ambulanceQueryError.message || 'Fleet could not load.')
    : null;
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('ambulances', ambulances);
  const focusedAmbulance = focusedRecord;
  const handleFocus = useCallback((ambulance) => setFocused(ambulance?.id || null), [setFocused]);

  const markActionFeedback = useCallback((key) => {
    setActiveActionFeedback(key);
    if (actionFeedbackTimeoutRef.current) {
      window.clearTimeout(actionFeedbackTimeoutRef.current);
    }
    actionFeedbackTimeoutRef.current = window.setTimeout(() => {
      setActiveActionFeedback(null);
    }, 900);
  }, []);

  useEffect(() => () => {
    if (actionFeedbackTimeoutRef.current) {
      window.clearTimeout(actionFeedbackTimeoutRef.current);
    }
  }, []);

  // Fetch hospitals for filter dropdown (Admin only)
  useEffect(() => {
    if (isAdmin()) {
      getHospitals({ quiet: true, limit: 500 }).then((result) => {
        const rows = Array.isArray(result) ? result : result?.data || [];
        setHospitals(rows);
      }).catch((error) => {
        console.error('Error fetching ambulance station filters:', error);
      });
    }
  }, [isAdmin]);

  // Feed the exact server count into the shared pagination controller. The old
  // hand-fetch called setTotalCount inline; with React Query the count arrives via
  // the cached query result, so mirror it into pagination whenever it changes.
  useEffect(() => {
    setTotalCount(ambulanceCount || 0);
  }, [ambulanceCount, setTotalCount]);

  useEffect(() => {
    resetPagination();
  }, [filters, kpiFilter, sortConfig.key, sortConfig.direction, resetPagination]);

  const displayStats = ambulancePageStats;

  const ambulanceRouteContext = useMemo(() => {
    const sourceRows = Array.isArray(ambulances) ? ambulances : [];
    const contextStatus = ambulancePageError
      ? 'failed'
      : loading
        ? 'loading'
        : sourceRows.length === 0
          ? 'empty'
          : 'ready';

    return {
      status: contextStatus,
      loading,
      error: ambulancePageError,
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
  }, [ambulances, ambulancePageError, displayStats, loading, pagination.totalCount]);

  const publishAmbulancesRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('ambulancesRouteContextUpdated', {
      detail: ambulanceRouteContext,
    }));
  }, [ambulanceRouteContext]);

  useEffect(() => {
    publishAmbulancesRouteContext();
  }, [publishAmbulancesRouteContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.addEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
    return () => {
      window.removeEventListener('requestAmbulancesRouteContext', publishAmbulancesRouteContext);
    };
  }, [publishAmbulancesRouteContext]);

  // Processed Data (Sorting & Pagination)
  const processedAmbulances = useMemo(() => {
    return ambulances;
  }, [ambulances]);

  const paginatedAmbulances = useMemo(() => {
    return processedAmbulances;
  }, [processedAmbulances]);

  const mobileVisibleAmbulances = useMemo(() => {
    return processedAmbulances;
  }, [processedAmbulances]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key && prev.direction === 'desc') {
        return { key: '', direction: 'asc' }; // Reset
      }
      return {
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      };
    });
  }, []);

  const handleKpiFilterChange = useCallback((id) => {
    setKpiFilter(id);
  }, []);

  const handleApplyFilters = useCallback((nextFilters) => {
    setFilters(nextFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setKpiFilter('all');
  }, []);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    setSelectedAmbulance(null);
    setModalMode('create');
  }, [markActionFeedback]);

  // Open "Add" modal on page load if requested via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      handleCreate();
    }
  }, [handleCreate, location.search]);

  // Handle custom events from context panel
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

  const handleView = useCallback((ambulance) => {
    markActionFeedback(`view-${ambulance.id}`);
    setSelectedAmbulance(ambulance);
    setModalMode('view');
  }, [markActionFeedback]);

  const handleEdit = useCallback((ambulance) => {
    markActionFeedback(`edit-${ambulance.id}`);
    setSelectedAmbulance(ambulance);
    setModalMode('edit');
  }, [markActionFeedback]);

  // Modal writes now flow through useAmbulancesMutations, whose onSettled invalidates
  // ['ambulances'] and refetches this page's live useAmbulancesQuery. Closing the
  // modal must therefore NOT trigger its own refetch here - doing so would
  // double-fetch. (fetchAmbulances/refetch is still used for the error-banner retry
  // and mobile pull-to-refresh.)
  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedAmbulance(null);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
      dispatched: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200',
      en_route: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
      on_route: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
      on_trip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200',
      on_scene: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200',
      returning: 'bg-muted/45 text-muted-foreground',
      busy: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200',
      maintenance: 'bg-muted text-muted-foreground',
      offline: 'bg-muted text-muted-foreground',
      pending_approval: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
    };
    return badges[status] || badges.available;
  };

  const filterSchema = React.useMemo(() => [

    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search call sign, plate...',
    },
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
    },
    {
      key: 'type',
      type: 'multiselect',
      label: 'Type',
      options: [
        { value: 'Standard', label: 'Standard' },
        { value: 'Advanced', label: 'Advanced' },
        { value: 'ICU', label: 'ICU' },
        { value: 'Transport', label: 'Transport' }
      ]
    },
    {
      key: 'hospital',
      type: 'select',
      label: 'Station/Hospital',
      options: hospitals.map(h => ({ value: h.id, label: h.name })),
      hidden: !isAdmin()
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Commission Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], [hospitals, isAdmin]);

  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      className={`rounded-button h-9 w-9 hover:bg-primary/10 hover:text-primary relative transition-all ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
      aria-label="Filter ambulances"
      aria-busy={activeActionFeedback === 'filters'}
      data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.type && filters.type.length > 0) || filters.hospital) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-primary" />
      )}
    </Button>
  ), [activeActionFeedback, filters, handleOpenFilters]);

  const headerActions = React.useMemo(() => {
    // Only Admins and Org Admins can create new ambulances
    if (isAdmin() || isOrgAdmin()) {
      return (
        <Button
          onClick={handleCreate}
          className={`rounded-button bg-card/68 backdrop-blur-2xl shadow-sm h-9 px-4 text-[12px] font-semibold transition-all ${activeActionFeedback === 'create' ? 'bg-primary/10 text-primary scale-95' : ''}`}
          aria-busy={activeActionFeedback === 'create'}
          data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
        >
          <Plus className="h-4 w-4 mr-2" />
          {activeActionFeedback === 'create' ? 'Opening...' : 'Add unit'}
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, isAdmin, isOrgAdmin, handleCreate]);

  usePageHeader(
    "Ambulances",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Ambulances" description="Manage ambulance units, status, and tracking." />

        <MobileAmbulances
          ambulances={mobileVisibleAmbulances}
          loading={loading}
          statistics={displayStats}
          filters={filters}
          setFilters={setFilters}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchAmbulances}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          onOpenFilters={handleOpenFilters}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          errorMessage={ambulancePageError}
          onRetry={fetchAmbulances}
          selectionEnabled={false}
        />

        {modalMode && (
          <AmbulanceModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            ambulance={selectedAmbulance}
            mode={modalMode}
            listFilter={queryFilter}
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
          analytics={displayStats}
          type="ambulance"
        />
      </div>
    );
  }

  const renderGridView = () => (
    <LayoutGroup>
      <motion.div
        layout
        className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
      >
        {paginatedAmbulances.map((ambulance, index) => {
          const focused = isFocused(ambulance.id);
          const status = getFleetStatus(ambulance);
          const station = getAmbulanceStation(ambulance);
          const vehicle = ambulance.vehicle_label || ambulance.vehicle_number || ambulance.license_plate || 'No vehicle';
          const viewOpening = activeActionFeedback === `view-${ambulance.id}`;
          const editOpening = activeActionFeedback === `edit-${ambulance.id}`;

          return (
            <motion.div
              layout
              key={ambulance.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="col-span-1"
            >
              <div
                className={`group relative flex h-full min-h-[300px] cursor-pointer flex-col overflow-hidden rounded-card p-5 transition-[background,box-shadow,transform] duration-200 ${focused ? 'bg-foreground/[0.07] shadow-[0_24px_70px_rgba(0,0,0,0.14)] dark:bg-white/[0.075]' : 'bg-muted/22 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgba(0,0,0,0.10)]'}`}
                role="button"
                tabIndex={0}
                aria-pressed={focused}
                data-state={focused ? 'focused' : 'idle'}
                onClick={() => setFocused(ambulance.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setFocused(ambulance.id);
                  }
                }}
              >
                <div className="absolute right-0 top-0 p-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-pill scale-150" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-icon bg-background/55 shadow-sm transition-transform duration-300 group-hover:scale-110">
                      <Ambulance className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-2 pr-12">
                  <Badge className={`rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getStatusBadge(status)}`}>
                    {getFleetStatusLabel(status)}
                  </Badge>
                  <Badge className="rounded-pill bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {ambulance.type || 'Standard'}
                  </Badge>
                </div>

                <div className="relative z-10 mt-5 min-w-0">
                  <h3 className="truncate text-2xl font-semibold leading-tight tracking-normal text-foreground group-hover:text-primary">
                    {ambulance.call_sign || 'Unknown unit'}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 truncate text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-200" />
                    <span className="truncate">{station}</span>
                  </p>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-inner bg-background/35 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Vehicle</p>
                    <p className="mt-1 truncate text-lg font-semibold text-foreground">{vehicle}</p>
                  </div>
                  <div className="rounded-inner bg-background/35 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">ETA</p>
                    <p className="mt-1 truncate text-lg font-semibold text-foreground">{ambulance.eta || 'Unknown'}</p>
                  </div>
                </div>

                <div className="relative z-10 mt-auto flex items-center justify-between rounded-inner bg-background/35 px-3 py-2">
                  <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {ambulance.vehicle_number || ambulance.license_plate || 'No plate'}
                  </span>

                  <div className="flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleView(ambulance);
                      }}
                      className={`rounded-button h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${viewOpening ? 'bg-primary/10 text-primary scale-95' : ''}`}
                      aria-label={`View details for ${ambulance.call_sign || 'unit'}`}
                      aria-busy={viewOpening}
                      data-state={viewOpening ? 'opening' : 'idle'}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManageFleet && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(ambulance);
                        }}
                        className={`rounded-button h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${editOpening ? 'bg-primary/10 text-primary scale-95' : ''}`}
                        aria-label={`Edit ${ambulance.call_sign || 'unit'}`}
                        aria-busy={editOpening}
                        data-state={editOpening ? 'opening' : 'idle'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Ambulances" description="Manage ambulance units, status, and tracking." />
      <div className="pt-2" />

      <div className="grid min-h-[calc(100dvh-7rem)] grid-cols-1 gap-5 px-4 pb-8 pt-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <section className="min-w-0">
          <AmbulanceSignalPanel
            stats={displayStats}
            ambulances={ambulances}
            loading={loading}
            kpiFilter={kpiFilter}
            setKpiFilter={handleKpiFilterChange}
          />

          <AmbulanceActivitySheet
            filters={filters}
            setFilters={handleApplyFilters}
            openFilters={handleOpenFilters}
            loading={loading}
            pagination={pagination}
            errorMessage={ambulancePageError}
            onRetry={fetchAmbulances}
            activeActionFeedback={activeActionFeedback}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : paginatedAmbulances.length === 0 ? (
              <AmbulanceEmptyState onClearFilters={handleClearFilters} />
            ) : (
              <>
                {viewMode === 'grid' && renderGridView()}
                {viewMode === 'list' && (
                  <AmbulanceListView
                    ambulances={paginatedAmbulances}
                    onView={handleView}
                    onEdit={handleEdit}
                    onFocus={handleFocus}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canDelete={false}
                  />
                )}
                {viewMode === 'table' && (
                  <AmbulanceTableView
                    ambulances={paginatedAmbulances}
                    onView={handleView}
                    onEdit={handleEdit}
                    onFocus={handleFocus}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canDelete={false}
                    selectionEnabled={false}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                )}
              </>
            )}
          </AmbulanceActivitySheet>
        </section>

        <AmbulanceDetailRail
          ambulance={focusedAmbulance}
          loading={loading}
          canEdit={canManageFleet}
          onView={handleView}
          onEdit={handleEdit}
          activeActionFeedback={activeActionFeedback}
        />
      </div>

      {modalMode && (
        <AmbulanceModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          ambulance={selectedAmbulance}
          mode={modalMode}
          listFilter={queryFilter}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={displayStats}
        type="ambulance"
      />
    </div>
  );
};

const AmbulanceSignalPanel = ({ stats, ambulances, loading, kpiFilter, setKpiFilter }) => {
  const sourceAmbulances = Array.isArray(ambulances) ? ambulances : [];
  const signal = loading
    ? {
      icon: Ambulance,
      tone: 'muted',
      label: 'Loading',
      headline: 'Loading fleet',
      subhead: 'One moment while the fleet list comes in.',
    }
    : getAmbulanceSignal({ stats, ambulances: sourceAmbulances, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[248px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[310px]"
      aria-live="polite"
    >
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${ambulanceToneClass[signal.tone] || ambulanceToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">
            {signal.headline}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {signal.subhead}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
            Ready
            <strong className="text-foreground">{loading ? '...' : getFleetStateCount({ id: 'available', stats, ambulances: sourceAmbulances })}</strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
            <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
            Active
            <strong className="text-foreground">{loading ? '...' : getFleetStateCount({ id: 'busy', stats, ambulances: sourceAmbulances })}</strong>
          </span>
        </div>

        <AmbulanceStateStrip
          stats={stats}
          ambulances={sourceAmbulances}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const AmbulanceStateStrip = ({ stats, ambulances, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-5">
    {ambulanceStateOptions.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getFleetStateCount({ id: item.id, stats, ambulances });

      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`Show ${item.label.toLowerCase()} units`}
          data-state={active ? 'selected' : 'idle'}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const AmbulanceActivitySheet = ({ filters, setFilters, openFilters, loading, pagination, errorMessage, onRetry, activeActionFeedback, children }) => (
  <section
    className="mt-2 flex min-h-[520px] flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet"
    data-testid="ambulances-activity-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    <AmbulanceSheetToolbar
      filters={filters}
      setFilters={setFilters}
      openFilters={openFilters}
      activeActionFeedback={activeActionFeedback}
    />

    <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? 'Loading fleet' : `${pagination.totalCount} units`}</span>
      <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
    </div>

    {errorMessage && (
      <AmbulanceErrorBanner message={errorMessage} onRetry={onRetry} />
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

const AmbulanceDetailRail = ({ ambulance, loading, canEdit, onView, onEdit, activeActionFeedback }) => {
  if (loading) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col rounded-sheet bg-card/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="h-5 w-28 rounded-pill bg-muted/40" />
          <div className="mt-6 h-24 rounded-card bg-muted/28" />
          <div className="mt-4 space-y-3">
            <div className="h-14 rounded-button bg-muted/24" />
            <div className="h-14 rounded-button bg-muted/24" />
            <div className="h-14 rounded-button bg-muted/24" />
          </div>
        </div>
      </aside>
    );
  }

  if (!ambulance) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col justify-center rounded-sheet bg-card/70 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <Ambulance className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No unit selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Fleet units will appear here when the list has results.</p>
        </div>
      </aside>
    );
  }

  const status = getFleetStatus(ambulance);
  const station = getAmbulanceStation(ambulance);
  const vehicle = ambulance.vehicle_label || ambulance.vehicle_number || ambulance.license_plate || 'No vehicle';
  const viewOpening = activeActionFeedback === `view-${ambulance.id}`;
  const editOpening = activeActionFeedback === `edit-${ambulance.id}`;

  return (
    <aside className="hidden min-h-0 lg:flex lg:flex-col" data-testid="ambulances-detail-rail">
      <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-sheet bg-card/72 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <Badge className={`${getStatusBadgeForRail(status)} rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]`}>
            {getFleetStatusLabel(status)}
          </Badge>
          <span className="rounded-pill bg-muted/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Fleet
          </span>
        </div>

        <div className="mt-5 min-w-0">
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-foreground">
            {ambulance.call_sign || 'Unknown unit'}
          </h2>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-200" />
            <span>{station}</span>
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <RailMetric icon={Ambulance} label="Vehicle" value={vehicle} tone="cyan" />
          <RailMetric icon={Activity} label="ETA" value={ambulance.eta || 'Unknown'} tone="amber" />
          <RailMetric icon={Wrench} label="Type" value={ambulance.type || 'Standard'} tone="sky" />
          <RailMetric icon={MapPin} label="Status" value={getFleetStatusLabel(status)} tone="emerald" />
        </div>

        <div className="mt-5 space-y-3 rounded-card bg-muted/20 p-4">
          <RailFact label="Plate" value={ambulance.vehicle_number || ambulance.license_plate || 'Not set'} />
          <RailFact label="Station" value={station} />
          <RailFact label="Crew" value={Array.isArray(ambulance.crew) && ambulance.crew.length > 0 ? `${ambulance.crew.length} listed` : 'Not listed'} />
          <RailFact label="Updated" value={ambulance.updated_at ? new Date(ambulance.updated_at).toLocaleString() : 'Unknown'} />
        </div>

        <div className="mt-5 rounded-card bg-cyan-500/10 p-4 text-cyan-800 dark:text-cyan-200">
          <p className="text-sm font-semibold">Dispatch changes stay in Requests</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            This panel shows fleet evidence. Trip status and location commands need a linked request owner.
          </p>
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onView(ambulance)}
            className={`h-11 flex-1 rounded-inner bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95 ${viewOpening ? 'bg-primary/10 text-primary scale-95' : ''}`}
            aria-busy={viewOpening}
            data-state={viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening' : 'Details'}
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onEdit(ambulance)}
              className={`h-11 flex-1 rounded-inner bg-primary/10 px-4 text-sm font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95 ${editOpening ? 'scale-95' : ''}`}
              aria-busy={editOpening}
              data-state={editOpening ? 'opening' : 'idle'}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editOpening ? 'Opening' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

const railToneClasses = {
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
};

const getStatusBadgeForRail = (status) => {
  if (status === 'available') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  if (status === 'en_route' || status === 'on_route' || ACTIVE_FLEET_STATUSES.has(status)) return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200';
  if (status === 'maintenance' || status === 'offline') return 'bg-amber-500/12 text-amber-700 dark:text-amber-200';
  return 'bg-muted/45 text-muted-foreground';
};

const RailMetric = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-inner bg-muted/24 p-3">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-button ${railToneClasses[tone] || railToneClasses.sky}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
  </div>
);

const RailFact = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
    <span className="min-w-0 text-right font-medium text-foreground">{value}</span>
  </div>
);

const AmbulanceSheetToolbar = ({ filters, setFilters, openFilters, activeActionFeedback }) => {
  const hasFilter = Boolean(
    filters.search ||
    (filters.status && filters.status.length > 0) ||
    (filters.type && filters.type.length > 0) ||
    filters.hospital ||
    filters.created_at
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={filters.search || ''}
          onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
          placeholder="Search fleet..."
          className="h-12 w-full rounded-inner bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
          data-testid="ambulances-sheet-search"
        />
      </div>
      <Button
        variant="ghost"
        onClick={openFilters}
        className={`h-12 rounded-inner bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95 ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
        aria-busy={activeActionFeedback === 'filters'}
        data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
      >
        <Filter className="mr-2 h-4 w-4" />
        {activeActionFeedback === 'filters' ? 'Opening' : 'Filters'}
        {hasFilter && <span className="ml-2 h-2 w-2 rounded-pill bg-primary" />}
      </Button>
    </div>
  );
};

const AmbulanceErrorBanner = ({ message, onRetry }) => (
  <div
    className="mt-3 flex flex-col gap-3 rounded-inner bg-amber-500/10 p-4 text-amber-800 shadow-[0_16px_38px_rgba(245,158,11,0.10)] dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
    data-testid="ambulances-error-state"
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Fleet could not load</p>
        <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
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

const AmbulanceEmptyState = ({ onClearFilters }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card bg-muted/18 p-8 text-center">
    <Ambulance className="mb-4 h-12 w-12 text-muted-foreground/60" />
    <h2 className="text-lg font-semibold">No units found</h2>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
      Try a different search or clear the current filters.
    </p>
    <Button
      type="button"
      variant="ghost"
      onClick={onClearFilters}
      className="mt-5 h-11 rounded-inner bg-background/55 px-5 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      Clear filters
    </Button>
  </div>
);
