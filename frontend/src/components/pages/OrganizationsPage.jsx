import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useOrganizationsQuery } from '../../hooks/useOrganizationsQuery';
// Console design system: Organizations COMPOSES the shared workspace grammar (donor:
// Requests; closest analog: Users) instead of the bespoke signal/state-strip/grid-card/rail
// look-alikes it used to inline. WorkspaceStage -> SignalPanel/KpiStrip -> one ActivitySheet
// + ListRowShell (one Time header on created_at) -> DetailRailShell rail.
//
// AUTHORITY (no parallel truth): this registry is READ-ONLY / fail-closed. There is no proved
// organization command receiver, so create/edit/delete/bulk/save ALL route to
// handleOrganizationCommandUnavailable (notice + toast + data-state="unavailable"). The service
// still ships legacy writers for compatibility, but the page never imports them. The paired
// OrganizationModal exposes a reachable read-only View; create stays a gated notice. No verify
// affordance exists
// (organizations has no verification_status; facility verification is VerificationQueue).
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, CopyChip, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import { SEOHead } from '../common/SEOHead';
import { FilterSheet } from '../common/FilterSheet';
import { BulkActionBar } from '../common/BulkActionBar';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { OrganizationModal } from '../modals/OrganizationModal';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Globe,
  Info,
  MapPin,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileOrganizations } from '../mobile/MobileOrganizations';

const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE = 'Organization changes are not ready until organization authority is verified.';

// KPI/state strip axis = payout-readiness, live-DB verified. Registry(total, default) /
// Funded(wallet balance>0, pinned) / Payout gap(zero-balance OR no-wallet, pinned). is_active
// is DROPPED as a chip (~100%-true, no signal -- surfaced only as a fail-closed rail line);
// stripe_account_id is NOT keyed (0/86, uniformly "not ready"). ~80/86 rows are demo/test
// shells, so Registry over-reports the real operator base -- honest to the table. Literal
// palette + NEUTRAL shadows only; the shared KpiStrip owns width/tile/smart-context.
const ORG_KPI_OPTIONS = [
  { id: 'all', label: 'Registry', icon: Building2, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'funded', label: 'Funded', icon: Wallet, countKey: 'funded', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'payout_gap', label: 'Payout gap', icon: AlertCircle, countKey: 'payoutGap', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
];
const ORG_KPI_IMPORTANCE = { all: 0, funded: 1, payout_gap: 2 };
const PINNED_ORG_KPI_IDS = ['funded', 'payout_gap'];

// SignalPanel eyebrow tones -- literal palette, NEUTRAL e2 shadows (no colored glow).
const orgToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

// Name | Status | Wallet | Added | Action  (select prefixes a 28px column).
const ORG_GRID_COLS = 'grid-cols-[minmax(200px,1.9fr)_minmax(96px,auto)_minmax(120px,auto)_minmax(112px,auto)_96px]';
const ORG_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(200px,1.9fr)_minmax(96px,auto)_minmax(120px,auto)_minmax(112px,auto)_96px]';

const getStatusMeta = (isActive) => (isActive
  ? { label: 'Active', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' }
  : { label: 'Inactive', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' });

const normalizeCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const hasActiveOrgFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search || (kpiFilter && kpiFilter !== 'all')
);

// KPI count: the server stat bucket for the id, with a page-window fallback so the strip is
// never blank before stats settle. funded/payout_gap key on the joined wallet_balance.
const getOrgStateCount = ({ id, stats, organizations }) => {
  const rows = Array.isArray(organizations) ? organizations : [];
  const option = ORG_KPI_OPTIONS.find((item) => item.id === id) || ORG_KPI_OPTIONS[0];
  const fallback = id === 'all'
    ? rows.length
    : id === 'funded'
      ? rows.filter((org) => Number(org.wallet_balance) > 0).length
      : rows.filter((org) => !(Number(org.wallet_balance) > 0)).length;
  return normalizeCount(stats?.[option.countKey], fallback);
};

// Signal adapter -> {icon,tone,label,headline,subhead}. Renders gracefully at zero and
// surfaces an honest failed-hero on a cold load failure.
const getOrgSignal = ({ stats, organizations, kpiFilter, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return { icon: AlertCircle, tone: 'danger', label: 'Load failed', headline: 'Organizations did not load', subhead: 'Retry to load the organization registry.' };
  }

  const option = ORG_KPI_OPTIONS.find((item) => item.id === kpiFilter) || ORG_KPI_OPTIONS[0];
  const count = getOrgStateCount({ id: option.id, stats, organizations });

  if (option.id === 'funded') {
    return {
      icon: Wallet,
      tone: 'clear',
      label: 'Funded',
      headline: count > 0 ? `${count} funded ${count === 1 ? 'organization' : 'organizations'}` : 'No funded organizations',
      subhead: count > 0 ? 'Funded organizations carry a positive wallet balance. Commands stay read-only until authority is verified.' : 'Organizations gain a positive wallet balance once funded.',
    };
  }

  if (option.id === 'payout_gap') {
    return {
      icon: AlertCircle,
      tone: 'warning',
      label: 'Payout gap',
      headline: count > 0 ? `${count} in payout gap` : 'No payout gap',
      subhead: count > 0 ? 'Payout gap counts zero-balance or wallet-less organizations. Review readiness; do not change it here.' : 'Every organization currently carries a funded wallet.',
    };
  }

  return {
    icon: Building2,
    tone: 'primary',
    label: 'Registry',
    headline: count > 0 ? `${count} ${count === 1 ? 'organization' : 'organizations'}` : 'No organizations found',
    subhead: count > 0 ? 'Review registry identity, wallet float, and payout readiness. Organization commands stay disabled until organization authority is verified.' : 'Organization records for this scope will appear here.',
  };
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatWallet = (value) => {
  if (value == null || value === '') return 'Not available';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return `$${numeric.toLocaleString()}`;
};

export const OrganizationsPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: '' });
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [organizationCommandNotice, setOrganizationCommandNotice] = useState(null);

  const pagination = usePagination(20);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const isMountedRef = useRef(false);
  const actionFeedbackTimerRef = useRef(null);
  const deepLinkHandledRef = useRef(null);

  const roleKind = isAdmin() ? 'admin' : 'viewer';
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  // --- Read path: React Query (server-projection envelope; mirrors SupportTicketsPage) ---
  // getOrganizationsPage flows through useOrganizationsQuery so the ['organizations', filter]
  // cache is the single store: this page reads it and the organizations realtime channel
  // invalidates it. There is NO mutations hook (read-only registry, no authorized write).
  // The KPI axis (Registry/Funded/Payout gap) is a real server-scope choice. Every chip changes
  // the hero, exact count, row projection, empty/recovery state, and route context together.
  const queryFilter = useMemo(() => ({
    search: filters.search,
    kpiFilter,
    limit: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [filters.search, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start, sortConfig.key, sortConfig.direction]);

  const {
    organizations,
    count,
    stats: orgStats,
    loading,
    isFetching,
    isPlaceholderData,
    error: queryError,
    refetch,
  } = useOrganizationsQuery(queryFilter);

  // RQ error object -> degraded-state copy. loadError is the honest-failed-hero source.
  const organizationError = queryError ? 'Organizations could not load. Try again.' : null;
  const loadError = organizationError;
  const fetchOrganizations = refetch;

  const orgRows = useMemo(() => (Array.isArray(organizations) ? organizations : []), [organizations]);

  // Auto-select the focused record via the console-wide shared store (never empty when data).
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('organizations', orgRows);
  const focusedOrg = focusedRecord;

  // Selection via the shared hook (shift-range + prune-to-visible). Selection + the
  // BulkActionBar are admin-gated; the bulk delete is FAIL-CLOSED (no parallel truth).
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(orgRows);
  const selectable = isAdmin();

  const hasFilter = hasActiveOrgFilters(filters, kpiFilter);

  // arrival-toast excluded by decision: read-only registry, no bulk write target -- the
  // organizations realtime channel CONVERGES via cache invalidation (no manual refetch), so
  // there is no INSERT refetch to throttle a toast against; the list simply refreshes in place.

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
    pagination.setTotalCount(count || 0);
  }, [count, pagination.setTotalCount]);

  // A filter/sort change swaps the visible rows -- clear the selection so a bulk action can
  // never fire on rows the operator can no longer see (prune-to-visible also backstops this).
  useEffect(() => {
    clearSelection();
  }, [filters, kpiFilter, sortConfig, clearSelection]);

  // Real-time updates: an organizations row change invalidates the ['organizations'] cache
  // (the single store) instead of a manual refetch. NO insert toast (arrival-toast excluded).
  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('organizations_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => {
        if (active && isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['organizations'] });
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markActionFeedback = useCallback((actionId) => {
    if (!actionId) return;
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
    setActiveActionFeedback(actionId);
    actionFeedbackTimerRef.current = window.setTimeout(() => {
      setActiveActionFeedback((current) => (current === actionId ? null : current));
    }, 900);
  }, []);

  // ALL write intents fail closed (no parallel truth): create/edit/delete/bulk/save surface
  // the unavailable notice + toast + aria-live feedback. Legacy service writers are not imported.
  const handleOrganizationCommandUnavailable = useCallback(() => {
    setOrganizationCommandNotice(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
    toast.info(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    pagination.resetPagination();
    setFilters((current) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(current)
        : (nextFiltersOrUpdater || {})
    ));
  }, [pagination.resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    pagination.resetPagination();
    setKpiFilter(nextFilter);
  }, [pagination.resetPagination]);

  const mobileFilters = useMemo(() => ({ ...filters, kpiFilter }), [filters, kpiFilter]);
  const handleMobileFiltersChange = useCallback((nextFiltersOrUpdater) => {
    const current = { ...filters, kpiFilter };
    const next = typeof nextFiltersOrUpdater === 'function'
      ? nextFiltersOrUpdater(current)
      : (nextFiltersOrUpdater || {});
    const nextSearch = next.search || '';
    const nextKpiFilter = next.kpiFilter || 'all';

    if (nextSearch === filters.search && nextKpiFilter === kpiFilter) return;
    pagination.resetPagination();
    setFilters({ search: nextSearch });
    setKpiFilter(nextKpiFilter);
  }, [filters, kpiFilter, pagination.resetPagination]);

  const handleSort = useCallback((key) => {
    pagination.resetPagination();
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, [pagination.resetPagination]);

  const setSearchFilter = useCallback((search) => {
    handleApplyFilters((current) => ({ ...current, search }));
  }, [handleApplyFilters]);

  // Read-only View: focus the record and open the read-only OrganizationModal in view mode.
  const handleView = useCallback((org) => {
    markActionFeedback(`view-${org?.id || 'unknown'}`);
    if (org?.id && !isFocused(org.id)) setFocused(org.id);
    setSelectedOrg(org);
    setModalMode('view');
  }, [markActionFeedback, setFocused, isFocused]);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedOrg(null);
  }, []);

  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    return handleOrganizationCommandUnavailable();
  }, [handleOrganizationCommandUnavailable, markActionFeedback]);

  const handleBulkDelete = useCallback(() => (
    handleOrganizationCommandUnavailable()
  ), [handleOrganizationCommandUnavailable]);

  // Modal submit stays fail-closed: preventDefault then surface the unavailable notice.
  const handleSave = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    return handleOrganizationCommandUnavailable();
  }, [handleOrganizationCommandUnavailable]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({ search: '' });
  }, [handleApplyFilters, handleKpiFilterChange]);

  // Deep link (?add=true) opens the (fail-closed) create path so the gate is honest.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsCreate = params.get('add') === 'true' || params.get('new') === 'true';
    const deepLinkKey = `${location.pathname}${location.search}`;
    if (!wantsCreate || deepLinkHandledRef.current === deepLinkKey) return;

    deepLinkHandledRef.current = deepLinkKey;
    handleCreate();
    params.delete('add');
    params.delete('new');
    params.delete('from');
    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  }, [handleCreate, location.pathname, location.search, navigate]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    window.addEventListener('openOrganizationModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => {
      window.removeEventListener('openOrganizationModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  // Whole-object route context (Support/Users shape) consumed verbatim by OrganizationsPanel.
  const organizationsPanelContext = useMemo(() => ({
    stats: orgStats || {},
    recent: orgRows.slice(0, 4),
    focused: focusedOrg,
    count: pagination.totalCount || orgRows.length,
    loading,
    errorMessage: organizationError,
    currentState: kpiFilter,
    canManage: false,
  }), [orgStats, orgRows, focusedOrg, pagination.totalCount, loading, organizationError, kpiFilter]);

  const publishOrganizationsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('organizationsRouteContextUpdated', {
      detail: organizationsPanelContext,
    }));
  }, [organizationsPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishOrganizationsRouteContext();
    window.addEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);
    return () => {
      window.removeEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);
    };
  }, [publishOrganizationsRouteContext]);

  const headerActions = useMemo(() => (
    isAdmin() ? (
      <Button
        type="button"
        onClick={handleCreate}
        data-state="unavailable"
        aria-label="Add organization unavailable"
        aria-describedby={organizationCommandNotice ? 'organizations-action-feedback' : undefined}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add organization
      </Button>
    ) : null
  ), [isAdmin, handleCreate, organizationCommandNotice]);

  const filterButtonComponent = useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter organizations"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [handleOpenFilters, filterSheetOpen, hasFilter]);

  usePageHeader('Organizations', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search registry by name, email or Stripe ID',
    },
  ], []);

  const analytics = useMemo(() => ({
    total: orgStats?.total || 0,
    funded: orgStats?.funded || 0,
    payoutGap: orgStats?.payoutGap || 0,
    byCategory: {
      funded: orgStats?.funded || 0,
      payoutGap: orgStats?.payoutGap || 0,
    },
  }), [orgStats]);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Organizations" description="Review the organization registry and payout readiness." />

        {organizationCommandNotice && (
          <p
            id="organizations-action-feedback"
            className="mx-4 mb-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {organizationCommandNotice}
          </p>
        )}

        <MobileOrganizations
          organizations={orgRows}
          statistics={orgStats}
          filters={mobileFilters}
          setFilters={handleMobileFiltersChange}
          onView={handleView}
          onRefresh={fetchOrganizations}
          loading={loading}
          isFetching={isFetching}
          isPlaceholderData={isPlaceholderData}
          errorMessage={organizationError}
          onRetry={fetchOrganizations}
          onOpenFilters={handleOpenFilters}
          filterSheetOpen={filterSheetOpen}
          onViewAnalytics={handleOpenAnalytics}
          analyticsOpen={analyticsModalOpen}
          selectionEnabled={selectable}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          page={pagination.currentPage}
        />

        {modalMode && (
          <OrganizationModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            organization={selectedOrg}
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
          isMobile
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="generic"
          analytics={analytics}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Organizations" description="Review the organization registry and payout readiness." />

      {organizationCommandNotice && (
        <p
          id="organizations-action-feedback"
          className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {organizationCommandNotice}
        </p>
      )}

      <OrganizationsDesktopWorkspace
        items={orgRows}
        stats={orgStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        canManage={isAdmin()}
        focusedOrg={focusedOrg}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={handleOpenFilters}
        onRetry={fetchOrganizations}
        onClearFilters={handleClearFilters}
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
        onCreate={handleCreate}
        activeActionFeedback={activeActionFeedback}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-[0.96] disabled:opacity-40"
            title="Delete selected"
            aria-label="Delete organizations unavailable"
            aria-describedby={organizationCommandNotice ? 'organizations-action-feedback' : undefined}
            data-state="unavailable"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      {modalMode && (
        <OrganizationModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          organization={selectedOrg}
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
        isMobile={false}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="generic"
        analytics={analytics}
      />
    </div>
  );
};

const OrganizationsDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  canManage,
  focusedOrg,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
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
  onCreate,
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getOrgSignal({ stats, organizations: items, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedOrg,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-organization-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/organizations"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <OrganizationDetailRail
          organization={focusedOrg}
          loading={loading}
          hasFilter={hasFilter}
          onView={onView}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={orgToneClass}>
        <KpiStrip
          options={ORG_KPI_OPTIONS}
          getCount={(id) => getOrgStateCount({ id, stats, organizations: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_ORG_KPI_IDS}
          importance={ORG_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-organization-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="organizations"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search registry by name, email, or Stripe ID..."
            searchTestId="organizations-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="organizations"
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
          aria-label="Organizations list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          data-testid="organizations-list"
        >
          <OrganizationsListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Organizations did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Building2}
              heading={hasFilter ? 'No matching organizations' : 'No organizations'}
              body={hasFilter ? 'Change filters or search again.' : 'Organization records for this scope will appear here.'}
            >
              {hasFilter ? (
                <Button
                  variant="ghost"
                  onClick={onClearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all organizations
                </Button>
              ) : (canManage && (
                <Button
                  onClick={onCreate}
                  data-state="unavailable"
                  aria-label="Add organization unavailable"
                  className="rounded-pill bg-foreground px-5 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add organization
                </Button>
              ))}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((org) => (
            <OrganizationRow
              key={org.id}
              organization={org}
              selected={focusedOrg?.id === org.id}
              selectable={selectable}
              checked={selectedIds.includes(org.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
              onFocus={() => setFocused(org.id)}
              onView={onView}
              activeActionFeedback={activeActionFeedback}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const OrganizationsListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? ORG_GRID_COLS_SELECT : ORG_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all organizations'}
        className="h-4 w-4"
      />
    )}
    {/* Name / Status / Wallet are plain labels -- only Added (created_at) is a meaningful
        sort; identity/wallet fields belong in the FilterSheet (TIME-only sort). */}
    <span>Name</span>
    <span>Status</span>
    <span>Wallet</span>
    <SortableColumnHeader label="Added" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const OrganizationRow = ({
  organization,
  selected,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
  onFocus,
  onView,
  activeActionFeedback,
}) => {
  const statusMeta = getStatusMeta(!!organization.is_active);
  const name = organization.name || 'Unnamed organization';

  return (
    <ListRowShell
      id={organization.id}
      dataAttrName="data-organization-row"
      gridCols={selectable ? ORG_GRID_COLS_SELECT : ORG_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(organization)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(organization.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${name}` : `Select ${name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusMeta.tone}`}>
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={name}>{name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={organization.contact_email || undefined}>{organization.contact_email || 'No contact email'}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={statusMeta.label} className={statusMeta.tone} compact />
      </div>

      <div className="text-sm font-medium text-muted-foreground">{formatWallet(organization.wallet_balance)}</div>

      <div className="text-sm font-medium text-muted-foreground">{formatDate(organization.created_at)}</div>

      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(organization); }}
          data-state={activeActionFeedback === `view-${organization.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </ListRowShell>
  );
};

const OrganizationDetailRail = ({ organization, loading, hasFilter, onView, activeActionFeedback }) => {
  if (loading && !organization) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!organization) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Building2 className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No organization selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Organizations that match your filters will appear here.' : 'Select an organization to see its details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const isActive = !!organization.is_active;
  const statusMeta = getStatusMeta(isActive);
  const typeValue = organization.type || organization.org_type || 'Not set';
  const walletValue = formatWallet(organization.wallet_balance);
  const locationValue = organization.city || organization.address || 'Not set';
  const displayId = organization.display_id || (organization.id ? `Org ${String(organization.id).slice(0, 8)}` : null);
  const viewOpening = activeActionFeedback === `view-${organization.id}`;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Organization details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy organization ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Activity className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(organization)}
            aria-label="Open full organization details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={organization.name || 'Unnamed organization'}>{organization.name || 'Unnamed organization'}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{organization.contact_email || 'No contact email'}</p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Building2} label="Name" value={organization.name} />
        <DetailLine icon={Globe} label="Type" value={typeValue} />
        <DetailLine icon={Activity} label="Status" value={statusMeta.label} />
        <DetailLine icon={Wallet} label="Wallet" value={walletValue} />
        <DetailLine icon={MapPin} label="Location" value={locationValue} />
        <DetailLine icon={Clock} label="Created" value={formatDate(organization.created_at)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(organization)}
          data-state={viewOpening ? 'opening' : 'idle'}
          aria-busy={viewOpening}
        >
          <Eye className="mr-2 h-5 w-5" />
          {viewOpening ? 'Opening' : 'View details'}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {/* Organization commands stay backend-owned (fail-closed by design): the console never
            creates, edits, or deletes an organization the app cannot reconcile. */}
        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          Organization commands are read-only until admin authority is verified.
        </div>
      </div>
    </DetailRailShell>
  );
};
