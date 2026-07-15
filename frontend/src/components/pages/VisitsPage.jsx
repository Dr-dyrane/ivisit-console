import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getScheduledVisitById,
  getVisit,
  VISIT_MUTATION_UNAVAILABLE_REASON,
} from '../../services/visitsService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { Button } from '../ui/button';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { useRowSelection } from '../../hooks/useRowSelection';
import { BulkActionBar } from '../common/BulkActionBar';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { scheduledCareRelease } from '../../config/scheduledCareRelease';
import {
  AlertCircle,
  Calendar,
  Filter,
  LoaderCircle,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '../../contexts/AuthContext';
import { VisitModal } from '../modals/VisitModal';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileVisits } from '../mobile/MobileVisits';
import { TabletVisits } from '../tablet/TabletVisits';
import { VisitsDesktopWorkspace, VisitsDetailRail } from './visits/VisitsDesktopWorkspace';
import { hasActiveVisitFilters } from './visits/visitPageModel';
import { useVisitsDataSource } from './visits/useVisitsDataSource';
import { useVisitsRouteBridge } from './visits/useVisitsRouteBridge';
import { ScheduledVisitActionSheet } from './visits/ScheduledVisitActionSheet';
import { canOpenScheduledVisitActions } from './visits/useScheduledVisitActions';

const isVisitAccessDeniedError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || error?.statusCode);
  const message = String(error?.message || '').toLowerCase();
  return ['42501', 'pgrst301'].includes(code)
    || status === 401
    || status === 403
    || message.includes('permission denied')
    || message.includes('unavailable for this role')
    || message.includes('no clinician identity');
};

const VisitDeepLinkNotice = ({ state, onRetry }) => {
  if (!state || ['idle', 'resolved'].includes(state.status)) return null;

  const loading = state.status === 'loading';
  const denied = state.status === 'denied';
  const Icon = loading ? LoaderCircle : denied ? ShieldAlert : AlertCircle;
  const message = loading
    ? 'Loading linked visit...'
    : denied
      ? 'Scheduled visit access was denied for the current role or care scope.'
      : state.status === 'not_found'
        ? 'This visit was not found in the current care scope.'
        : 'This visit could not load.';

  return (
    <div
      className="mx-4 mt-3 flex min-h-11 items-center gap-3 rounded-button bg-muted/55 px-3 py-2 text-sm text-foreground shadow-e1"
      data-testid="visit-deep-link-status"
      role={loading ? 'status' : 'alert'}
      aria-live="polite"
    >
      <Icon className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin text-muted-foreground' : denied ? 'text-destructive' : 'text-amber-600'}`} />
      <span className="min-w-0 flex-1">{message}</span>
      {!loading && (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry} className="h-8 shrink-0 px-3">
          Retry
        </Button>
      )}
    </div>
  );
};

export const VisitsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver, profile } = useAuth();
  const { isPhone, isTablet, isMobile } = useNavigation();
  const location = useLocation();
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState('all');
  const [kpiFilter, setKpiFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [actionVisit, setActionVisit] = useState(null);
  const [deepLinkState, setDeepLinkState] = useState({ status: 'idle', visitId: null });
  const deepLinkRequestRef = useRef(0);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    request: null,
  });
  const pagination = usePagination(20);
  const { resetPagination } = pagination;
  const canEditVisits = false;
  const canCreateVisits = false;
  const {
    fetchVisits,
    focusedVisit,
    isFetching,
    loading,
    selectedKpiFilter,
    setFocusedVisitId,
    visitPageError,
    visitPageSnapshot,
    visitPageStats,
    visits,
  } = useVisitsDataSource({ filters, kpiFilter, pagination, sortConfig, viewMode });
  const scheduledActionsEnabled = scheduledCareRelease.scheduledVisitReads
    && scheduledCareRelease.scheduledVisitActions;

  const loadDeepLinkedVisit = useCallback(async (visitId, { scheduledOnly = false } = {}) => {
    const requestId = deepLinkRequestRef.current + 1;
    deepLinkRequestRef.current = requestId;
    setDeepLinkState({ status: 'loading', visitId, scheduledOnly });

    if (scheduledOnly && !scheduledCareRelease.scheduledVisitReads) {
      setDeepLinkState({ status: 'error', visitId, scheduledOnly });
      return;
    }

    let scheduledVisit = null;
    if (scheduledCareRelease.scheduledVisitReads) {
      try {
        scheduledVisit = await getScheduledVisitById(visitId);
      } catch (error) {
        if (deepLinkRequestRef.current !== requestId) return;
        setDeepLinkState({
          status: isVisitAccessDeniedError(error) ? 'denied' : 'error',
          visitId,
          scheduledOnly,
        });
        return;
      }
    }

    try {
      if (deepLinkRequestRef.current !== requestId) return;
      if (!scheduledVisit && scheduledOnly) {
        setDeepLinkState({ status: 'not_found', visitId, scheduledOnly });
        return;
      }

      // An unmarked genuine miss may continue to the source-excluding generic
      // projection. Any scheduled read failure returned above cannot reach it.
      let visitData = scheduledVisit;
      if (!visitData) visitData = await getVisit(visitId);
      if (deepLinkRequestRef.current !== requestId) return;
      if (!visitData) {
        setDeepLinkState({ status: 'not_found', visitId, scheduledOnly });
        return;
      }
      setSelectedVisit(visitData);
      setFocusedVisitId(visitData.id || null);
      setModalMode('view');
      setDeepLinkState({ status: 'resolved', visitId, scheduledOnly });
    } catch (error) {
      if (deepLinkRequestRef.current !== requestId) return;
      setDeepLinkState({
        status: isVisitAccessDeniedError(error) ? 'denied' : 'error',
        visitId,
        scheduledOnly,
      });
    }
  }, [setFocusedVisitId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    // Preserve the historical ?view= contract and accept Quick Search's stable ?id= link.
    const viewVisitId = urlParams.get('view') || urlParams.get('id');
    if (!viewVisitId) {
      setDeepLinkState({ status: 'idle', visitId: null });
      return undefined;
    }

    loadDeepLinkedVisit(viewVisitId, { scheduledOnly: urlParams.get('source') === 'scheduled' });
    return () => {
      deepLinkRequestRef.current += 1;
    };
  }, [loadDeepLinkedVisit, location.search]);

  const retryDeepLinkedVisit = useCallback(() => {
    if (deepLinkState.visitId) {
      loadDeepLinkedVisit(deepLinkState.visitId, { scheduledOnly: deepLinkState.scheduledOnly });
    }
  }, [deepLinkState.scheduledOnly, deepLinkState.visitId, loadDeepLinkedVisit]);

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
  const actionFeedbackTimerRef = useRef(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);

  useEffect(() => {
    resetPagination();
    clearSelection();
  }, [clearSelection, filters, kpiFilter, resetPagination, sortConfig, viewMode]);

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

  const changeViewMode = useCallback((nextMode) => {
    if (nextMode === 'scheduled' && !scheduledCareRelease.scheduledVisitReads) return;
    setViewMode(nextMode);
    setKpiFilter('all');
    setFilters({});
    setSortConfig(nextMode === 'scheduled'
      ? { key: 'scheduled_start_at', direction: 'asc' }
      : { key: 'date', direction: 'desc' });
    resetPagination();
    clearSelection();
  }, [clearSelection, resetPagination]);

  useEffect(() => {
    return () => {
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

  const handleCreate = useCallback(() => {
    markActionFeedback('create');
    toast.info('Visit changes unavailable', {
      description: VISIT_MUTATION_UNAVAILABLE_REASON,
    });
  }, [markActionFeedback]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleView = useCallback((visit) => {
    markActionFeedback(`view-${visit?.id || 'unknown'}`);
    setFocusedVisitId(visit?.id || null);
    setSelectedVisit(visit);
    setModalMode('view');
  }, [markActionFeedback, setFocusedVisitId]);

  const handleEdit = useCallback((visit) => {
    markActionFeedback(`edit-${visit?.id || 'unknown'}`);
    setFocusedVisitId(visit?.id || null);
    toast.info('Visit changes unavailable', {
      description: VISIT_MUTATION_UNAVAILABLE_REASON,
    });
  }, [markActionFeedback, setFocusedVisitId]);

  const handleManageScheduledVisit = useCallback((visit) => {
    const permitted = canOpenScheduledVisitActions({
      visit,
      roleKind,
      profileId: profile?.id,
      actionsEnabled: scheduledActionsEnabled,
    });
    if (!permitted) return;
    markActionFeedback(`manage-${visit.id}`);
    setFocusedVisitId(visit.id);
    setActionVisit(visit);
  }, [markActionFeedback, profile?.id, roleKind, scheduledActionsEnabled, setFocusedVisitId]);

  const canManageScheduledVisit = useCallback((visit) => canOpenScheduledVisitActions({
    visit,
    roleKind,
    profileId: profile?.id,
    actionsEnabled: scheduledActionsEnabled,
  }), [profile?.id, roleKind, scheduledActionsEnabled]);

  useVisitsRouteBridge({
    canCreate: canCreateVisits,
    canEdit: canEditVisits,
    canManageFocused: canManageScheduledVisit(focusedVisit),
    count: pagination.totalCount || visits.length,
    currentState: selectedKpiFilter,
    errorMessage: visitPageError,
    focusedVisit,
    loading,
    markActionFeedback,
    onCreate: handleCreate,
    onManageScheduledVisit: handleManageScheduledVisit,
    onOpenAnalytics: handleOpenAnalytics,
    onOpenFilters: handleOpenFilters,
    recent: visits,
    setEmergencyModal,
    stats: visitPageStats,
    viewMode,
  });

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

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
      placeholder: viewMode === 'scheduled'
        ? 'Search by ID, facility, clinician, or type...'
        : 'Search by ID, type, facility, practitioner, or room...'
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
      key: viewMode === 'scheduled' ? 'care_mode' : 'visit_type',
      type: 'multiselect',
      label: 'Visit Type',
      options: viewMode === 'scheduled' ? [
        { value: 'in_person', label: 'In person' },
        { value: 'telemedicine_async', label: 'Async consult' },
      ] : [
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
  ], [viewMode]);

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

  if (isPhone || isTablet) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Visits" description="Review visit records in your current scope." />
        <VisitDeepLinkNotice state={deepLinkState} onRetry={retryDeepLinkedVisit} />
        {isPhone ? (
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
          onManageScheduledVisit={handleManageScheduledVisit}
          canManageScheduledVisit={canManageScheduledVisit}
          scheduledActionsEnabled={scheduledActionsEnabled}
          roleKind={roleKind}
          profileId={profile?.id}
          viewMode={viewMode}
          onViewModeChange={changeViewMode}
          scheduledViewEnabled={scheduledCareRelease.scheduledVisitReads}
          pageSnapshot={visitPageSnapshot}
          onRefresh={fetchVisits}
          errorMessage={visitPageError}
          onRetry={fetchVisits}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          viewerIsDoctor={isProvider() && !isDriver()}
          canEdit={canEditVisits}
          canDelete={false}
          selectionEnabled={isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onOpenFilters={handleOpenFilters}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />
        ) : (
        <TabletVisits
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
          focusedVisit={focusedVisit}
          onFocusVisit={setFocusedVisitId}
          onRefresh={fetchVisits}
          errorMessage={visitPageError}
          onRetry={fetchVisits}
          onViewAnalytics={handleOpenAnalytics}
          onOpenFilters={handleOpenFilters}
          filterSheetOpen={filterSheetOpen}
          pagination={pagination}
          selectionEnabled={isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectClick={handleSelectClick}
          onSelectAll={handleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          detail={(
            <VisitsDetailRail
              visit={focusedVisit}
              loading={loading}
              canEdit={canEditVisits}
              onView={handleView}
              onEdit={handleEdit}
              onManageScheduledVisit={handleManageScheduledVisit}
              canManageScheduledVisit={canManageScheduledVisit}
              activeActionFeedback={activeActionFeedback}
              embedded
            />
          )}
        />
        )}

        {/* Modals & Sheets */}
        {modalMode && (
          <VisitModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            visit={selectedVisit}
            mode={modalMode}
          />
        )}

        <EmergencyDetailsModal
          isOpen={emergencyModal.isOpen}
          onClose={() => setEmergencyModal(prev => ({ ...prev, isOpen: false }))}
          request={emergencyModal.request}
        />

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

        {actionVisit && (
          <ScheduledVisitActionSheet
            isOpen
            onClose={() => setActionVisit(null)}
            visit={actionVisit}
            roleKind={roleKind}
            profileId={profile?.id}
            actionsEnabled={scheduledActionsEnabled}
            onChanged={fetchVisits}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Visits" description="Review visit records in your current scope." />
      <VisitDeepLinkNotice state={deepLinkState} onRetry={retryDeepLinkedVisit} />

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
        onManageScheduledVisit={handleManageScheduledVisit}
        canManageScheduledVisit={canManageScheduledVisit}
        scheduledActionsEnabled={scheduledActionsEnabled}
        roleKind={roleKind}
        profileId={profile?.id}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        scheduledViewEnabled={scheduledCareRelease.scheduledVisitReads}
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
            title="Bulk visit changes are unavailable"
            aria-label="Bulk visit changes are unavailable"
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

      {actionVisit && (
        <ScheduledVisitActionSheet
          isOpen
          onClose={() => setActionVisit(null)}
          visit={actionVisit}
          roleKind={roleKind}
          profileId={profile?.id}
          actionsEnabled={scheduledActionsEnabled}
          onChanged={fetchVisits}
        />
      )}
    </div >
  );
};
