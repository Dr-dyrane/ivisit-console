import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getVisit, VISIT_MUTATION_UNAVAILABLE_REASON } from '../../services/visitsService';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useNavigation } from '../../contexts/NavigationContext';
import { Button } from '../ui/button';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { useRowSelection } from '../../hooks/useRowSelection';
import { BulkActionBar } from '../common/BulkActionBar';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import {
  Calendar,
  Filter,
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
import { VisitsDesktopWorkspace } from './visits/VisitsDesktopWorkspace';
import { hasActiveVisitFilters } from './visits/visitPageModel';
import { useVisitsDataSource } from './visits/useVisitsDataSource';
import { useVisitsRouteBridge } from './visits/useVisitsRouteBridge';

export const VisitsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isMobile } = useNavigation();
  const location = useLocation();

  // Handle URL parameter to open specific visit modal
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    // Preserve the historical ?view= contract and accept Quick Search's canonical ?id= link.
    const viewVisitId = urlParams.get('view') || urlParams.get('id');

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
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    request: null,
  });
  const pagination = usePagination(20);
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
    visitPageStats,
    visits,
  } = useVisitsDataSource({ filters, kpiFilter, pagination, sortConfig });

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

  useVisitsRouteBridge({
    canCreate: canCreateVisits,
    canEdit: canEditVisits,
    count: pagination.totalCount || visits.length,
    currentState: selectedKpiFilter,
    errorMessage: visitPageError,
    focusedVisit,
    loading,
    markActionFeedback,
    onCreate: handleCreate,
    onOpenAnalytics: handleOpenAnalytics,
    onOpenFilters: handleOpenFilters,
    recent: visits,
    setEmergencyModal,
    stats: visitPageStats,
  });

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
        <SEOHead title="Visits" description="Review visit records in your current scope." />
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
          selectionEnabled={isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Visits" description="Review visit records in your current scope." />

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
