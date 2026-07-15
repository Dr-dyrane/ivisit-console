import React, { useMemo } from 'react';
import { ClipboardCheck, Filter as FilterIcon, Trash2 } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { Button } from '../ui/button';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { MobileEmergency } from '../mobile/MobileEmergency';
import { TabletEmergency } from '../tablet/TabletEmergency';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { RequestsDesktopWorkspace } from './requests/RequestsDesktopWorkspace';
import { RequestDetailRail } from './requests/RequestDetailRail';
import { useEmergencyRequestsController } from './requests/useEmergencyRequestsController';
import { EMPTY_REQUEST_FILTERS } from './requests/requestPageModel';

// Compatibility entry point for AppRoutes.jsx and existing route imports. The Requests
// model, state controller, and desktop/mobile presentations are page-owned modules.
export const EmergencyRequestsPage = () => {
  const controller = useEmergencyRequestsController();
  const {
    isPhone,
    isTablet,
    isMobile,
    includeMine,
    currentUser,
    requests,
    loading,
    isFetching,
    requestStats,
    filters,
    setFilters,
    selectedKpiFilter,
    setKpiFilter,
    focusedRequest,
    setFocusedRequestId,
    pagination,
    loadError,
    fetchRequests,
    filterSheetOpen,
    setFilterSheetOpen,
    filterTriggerState,
    hasFilter,
    analyticsModalOpen,
    setAnalyticsModalOpen,
    sortConfig,
    handleSort,
    visibleModuleRail,
    routingPath,
    handleRailNavigate,
    handleCreateEmergency,
    handleOpenAnalytics,
    handleViewDetails,
    handleDelete,
    handleDispatch,
    handleComplete,
    handleProcessCash,
    handleRetryPaymentUnavailable,
    dispatchPending,
    completePending,
    cancelPending,
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBulkCancel,
    cancellableSelectedCount,
    isDetailsModalOpen,
    activeDetailRequest,
    closeDetailsModal,
    isEmergencyModalOpen,
    selectedRequest,
    handleCloseEmergencyModal,
    confirmationModal,
    closeConfirmationModal,
    completeModal,
    closeCompleteModal,
    executeComplete,
    filterSchema,
  } = controller;

  const canCreate = currentUser.isAdmin() || currentUser.isOrgAdmin();
  const headerActions = useMemo(() => (
    canCreate ? (
      <Button
        onClick={handleCreateEmergency}
        data-state={isEmergencyModalOpen ? 'open' : 'idle'}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
        aria-label="Create new request"
        aria-haspopup="dialog"
        aria-expanded={isEmergencyModalOpen}
      >
        <ClipboardCheck className="mr-2 h-4 w-4" />
        New request
      </Button>
    ) : null
  ), [canCreate, handleCreateEmergency, isEmergencyModalOpen]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      data-state={filterTriggerState}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter requests"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <FilterIcon className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, filterTriggerState, hasFilter, setFilterSheetOpen]);

  usePageHeader('Requests', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Requests" description="Review requests and route care from one place." />

      {isPhone ? (
        <MobileEmergency
          emergencies={requests}
          loading={loading}
          isFetching={isFetching}
          statistics={requestStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleViewDetails}
          onDispatch={handleDispatch}
          onComplete={handleComplete}
          onProcessCash={handleProcessCash}
          onCancel={handleDelete}
          onRetryPayment={handleRetryPaymentUnavailable}
          onRefresh={fetchRequests}
          onViewAnalytics={handleOpenAnalytics}
          canManageRequests={currentUser.canOperateDispatch()}
          canCompleteRequest={currentUser.canCompleteRequest}
          onOpenFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          currentPage={pagination.currentPage}
          loadError={loadError}
          onRetry={fetchRequests}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
          selectionEnabled={currentUser.isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onBulkCancel={handleBulkCancel}
          cancellableCount={cancellableSelectedCount}
        />
      ) : isTablet ? (
        <TabletEmergency
          emergencies={requests}
          loading={loading}
          isFetching={isFetching}
          statistics={requestStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleViewDetails}
          onRefresh={fetchRequests}
          onViewAnalytics={handleOpenAnalytics}
          onOpenFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          pagination={pagination}
          loadError={loadError}
          onRetry={fetchRequests}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
          selectionEnabled={currentUser.isAdmin()}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
          onSelectClick={handleSelectClick}
          onSelectAll={handleSelectAll}
          onFocusRequest={setFocusedRequestId}
          focusedRequest={focusedRequest}
          includeMine={includeMine}
          detail={(
            <RequestDetailRail
              request={focusedRequest}
              currentUser={currentUser}
              loading={loading}
              hasFilter={hasFilter}
              dispatchPending={dispatchPending}
              completePending={completePending}
              onView={handleViewDetails}
              onDelete={handleDelete}
              onDispatch={handleDispatch}
              onComplete={handleComplete}
              onProcessCash={handleProcessCash}
              embedded
            />
          )}
        />
      ) : (
        <RequestsDesktopWorkspace
          requests={requests}
          loading={loading}
          isFetching={isFetching}
          includeMine={includeMine}
          dispatchPending={dispatchPending}
          completePending={completePending}
          stats={requestStats}
          filters={filters}
          setFilters={setFilters}
          kpiFilter={selectedKpiFilter}
          setKpiFilter={setKpiFilter}
          focusedRequest={focusedRequest}
          setFocusedRequestId={setFocusedRequestId}
          currentUser={currentUser}
          onView={handleViewDetails}
          onDelete={handleDelete}
          onDispatch={handleDispatch}
          onComplete={handleComplete}
          onProcessCash={handleProcessCash}
          pagination={pagination}
          openFilters={() => setFilterSheetOpen(true)}
          filterSheetOpen={filterSheetOpen}
          filterTriggerState={filterTriggerState}
          loadError={loadError}
          onRetry={fetchRequests}
          moduleRailItems={visibleModuleRail}
          routingPath={routingPath}
          onRailNavigate={handleRailNavigate}
          selectable={currentUser.isAdmin()}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectClick={handleSelectClick}
          onSelectAll={handleSelectAll}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}

      {!isPhone && currentUser.isAdmin() && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBulkCancel}
            disabled={cancelPending || cancellableSelectedCount === 0}
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
            title={cancellableSelectedCount === 0 ? 'No cancellable requests selected' : `Cancel ${cancellableSelectedCount} cancellable request${cancellableSelectedCount === 1 ? '' : 's'}`}
            aria-label={cancellableSelectedCount === 0 ? 'No cancellable requests selected' : `Cancel ${cancellableSelectedCount} cancellable requests`}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <EmergencyDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        request={activeDetailRequest}
      />

      <EmergencyRequestModal
        isOpen={isEmergencyModalOpen}
        onClose={handleCloseEmergencyModal}
        request={selectedRequest}
        mode="create"
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        resetValues={EMPTY_REQUEST_FILTERS}
        resetLabel="Clear"
        title="Filters"
        description="Filter Requests by search, status, and date range."
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={requestStats}
        type="emergency"
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
        isLoading={cancelPending}
      />

      <ConfirmationModal
        isOpen={completeModal.open}
        onClose={closeCompleteModal}
        onConfirm={() => executeComplete(completeModal.request)}
        title="Mark request complete"
        description="Mark this request complete and free assigned resources?"
        variant="default"
        confirmLabel="Mark complete"
      />
    </div>
  );
};
