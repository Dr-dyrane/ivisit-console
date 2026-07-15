import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { SortableColumnHeader } from '../console/ActivitySheet';
import { Button } from '../ui/button';
import { VerificationModal } from '../modals/VerificationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { PaginationControls } from '../ui/PaginationControls';
import { SEOHead } from '../common/SEOHead';
import { MobileVerification } from '../mobile/MobileVerification';
import { TabletApprovals } from '../tablet/TabletApprovals';
import { ApprovalDetailRail } from './verification/ApprovalDetailRail';
import { ApprovalsDesktopWorkspace } from './verification/ApprovalsDesktopWorkspace';
import { useVerificationQueueController } from './verification/useVerificationQueueController';
import {
  createVerificationFilterSchema,
  createVerificationPanelContext,
  getVerificationEmptyState,
  getVerificationRouteScope,
  hasVerificationFilter,
} from './verification/verificationQueueModel';

/**
 * Approvals route integration.
 *
 * The controller owns the two scoped queues and their distinct write receivers.
 * This facade keeps shell, focus, selection, keyboard, modal, and responsive
 * composition explicit so the route contract stays inspectable.
 */
export const VerificationQueue = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile, isPhone, isTablet } = useNavigation();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  const canApprove = isAdmin();
  const canReview = canApprove || isOrgAdmin();
  const routeScope = getVerificationRouteScope(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const closeProviderModal = useCallback(() => setSelectedProvider(null), []);

  const controller = useVerificationQueueController({
    canReview,
    canApprove,
    initialQueueType: routeScope.queueType,
    providerTypeFilter: routeScope.providerTypeFilter,
    onProviderVerified: closeProviderModal,
  });
  const {
    providers,
    organizations,
    stats,
    orgStats,
    activeStats,
    sortedItems,
    loading,
    isFetching,
    loadError,
    actionLoading,
    filters,
    setFilters,
    sortConfig,
    queueType,
    setQueueType,
    pagination,
    refetchActive,
    handleApplyFilters,
    setStatusFilter,
    setSearchFilter,
    handleSort,
    handleVerify,
    handleVerifyOrg,
    handleBulkAction: executeBulkAction,
  } = controller;

  const roleKind = canApprove ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const { focusedRecord: focusedItem, setFocused } = useFocusedRecord('verification', sortedItems);
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(sortedItems);
  const selectable = canApprove;

  const listScrollRef = useRef(null);
  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: sortedItems,
    focusedItem,
    setFocusedId: setFocused,
    onOpen: setSelectedProvider,
    scrollRef: listScrollRef,
    rowAttr: 'data-approval-row',
  });

  useEffect(() => {
    pagination.resetPagination();
    clearSelection();
    setFocused(null);
  }, [queueType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearSelection();
  }, [pagination.currentPage, clearSelection]);

  const handleBulkAction = useCallback((approved) => (
    executeBulkAction([...selectedIds], approved, clearSelection)
  ), [clearSelection, executeBulkAction, selectedIds]);

  const hasFilter = hasVerificationFilter(filters);
  const emptyStateMode = hasFilter ? 'filtered' : 'unfiltered';
  const emptyState = useMemo(() => getVerificationEmptyState({
    queueType,
    canApprove,
    hasFilter: emptyStateMode === 'filtered',
  }), [queueType, canApprove, emptyStateMode]);
  const filterSchema = useMemo(() => createVerificationFilterSchema(queueType), [queueType]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter approvals"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasFilter]);

  usePageHeader('Approvals', null, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const verificationPanelContext = useMemo(() => createVerificationPanelContext({
    queueType,
    providers,
    organizations,
    activeStats,
    focusedItem,
    canApprove,
    loading,
  }), [queueType, providers, organizations, activeStats, focusedItem, canApprove, loading]);

  const publishVerificationRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('verificationRouteContextUpdated', {
      detail: verificationPanelContext,
    }));
  }, [verificationPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishVerificationRouteContext();
    window.addEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
    return () => window.removeEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
  }, [publishVerificationRouteContext]);

  useEffect(() => {
    const openFilters = () => setFilterSheetOpen(true);
    const openAnalytics = () => setAnalyticsModalOpen(true);
    window.addEventListener('openFilters', openFilters);
    window.addEventListener('openAnalyticsModal', openAnalytics);
    return () => {
      window.removeEventListener('openFilters', openFilters);
      window.removeEventListener('openAnalyticsModal', openAnalytics);
    };
  }, []);

  const timeHeader = (
    <SortableColumnHeader
      label="Applied"
      sortKey="created_at"
      sortConfig={sortConfig}
      onSort={handleSort}
    />
  );

  const setMobileFilters = useCallback((updater) => {
    setFilters((current) => (typeof updater === 'function' ? updater(current) : updater));
    pagination.resetPagination();
  }, [pagination, setFilters]);

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />
        <MobileVerification
          queueType={queueType}
          setQueueType={setQueueType}
          providers={providers}
          organizations={organizations}
          loading={loading}
          stats={stats}
          orgStats={orgStats}
          filters={filters}
          setFilters={setMobileFilters}
          onViewProvider={setSelectedProvider}
          onVerifyProvider={canApprove ? handleVerify : null}
          onVerifyOrganization={canApprove ? handleVerifyOrg : null}
          canApprove={canApprove}
          onRefresh={refetchActive}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isFetching={isFetching}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          selectedIds={selectedIds}
          onSelect={canApprove ? handleToggleSelect : null}
          onSelectAll={canApprove ? handleSelectAll : null}
        />

        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          loading={loading}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          initialValues={filters}
          onApply={handleApplyFilters}
          filterSchema={filterSchema}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={queueType === 'providers' ? stats : orgStats}
          type="verification"
        />

        <VerificationModal
          isOpen={Boolean(selectedProvider)}
          provider={selectedProvider}
          mode="view"
          onClose={() => setSelectedProvider(null)}
          onVerify={canApprove ? handleVerify : null}
        />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="min-h-screen text-foreground">
        <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />
        <TabletApprovals
          queueType={queueType}
          setQueueType={setQueueType}
          items={sortedItems}
          activeStats={activeStats}
          loading={loading}
          isFetching={isFetching}
          errorMessage={loadError}
          filters={filters}
          setStatusFilter={setStatusFilter}
          focusedItem={focusedItem}
          onFocus={setFocused}
          onOpenRecord={setSelectedProvider}
          onRefresh={refetchActive}
          onRetry={refetchActive}
          onSearchCommit={setSearchFilter}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          filterSheetOpen={filterSheetOpen}
          selectable={selectable}
          selectedIds={selectedIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleSelect={handleToggleSelect}
          onSelectClick={handleSelectClick}
          onSelectAll={handleSelectAll}
          pagination={pagination}
          emptyState={emptyState}
          detail={(
            <ApprovalDetailRail
              item={focusedItem}
              queueType={queueType}
              canApprove={canApprove}
              actionLoading={actionLoading}
              loading={loading}
              hasFilter={hasFilter}
              onOpen={setSelectedProvider}
              onApprove={(item) => (queueType === 'providers'
                ? handleVerify(item.id, true)
                : handleVerifyOrg(item.id, true))}
              onReject={queueType === 'organizations'
                ? (item) => handleVerifyOrg(item.id, false)
                : undefined}
              embedded
            />
          )}
        />

        {selectable && (
          <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            {queueType === 'organizations' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleBulkAction(false)}
                disabled={actionLoading || selectedIds.length === 0}
                className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
                title="Reject Selected"
                aria-label={`Reject ${selectedIds.length} selected`}
              >
                <Ban className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleBulkAction(true)}
              disabled={actionLoading || selectedIds.length === 0}
              className="h-10 w-10 rounded-pill bg-emerald-500/15 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.96] disabled:opacity-40 dark:text-emerald-300"
              title="Approve Selected"
              aria-label={`Approve ${selectedIds.length} selected`}
            >
              <CheckCircle className="h-5 w-5" />
            </Button>
          </BulkActionBar>
        )}

        <VerificationModal
          isOpen={Boolean(selectedProvider)}
          provider={selectedProvider}
          mode="view"
          onClose={() => setSelectedProvider(null)}
          onVerify={canApprove ? handleVerify : null}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          initialValues={filters}
          onApply={handleApplyFilters}
          filterSchema={filterSchema}
          isMobile={isMobile}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={queueType === 'providers' ? stats : orgStats}
          type="verification"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />
      <ApprovalsDesktopWorkspace
        queueType={queueType}
        setQueueType={setQueueType}
        items={sortedItems}
        activeStats={activeStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        canReview={canReview}
        canApprove={canApprove}
        actionLoading={actionLoading}
        focusedItem={focusedItem}
        setFocusedId={setFocused}
        filters={filters}
        setStatusFilter={setStatusFilter}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        emptyState={emptyState}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        onRetry={refetchActive}
        pagination={pagination}
        selectable={selectable}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        onOpenRecord={setSelectedProvider}
        onApprove={(item) => (queueType === 'providers'
          ? handleVerify(item.id, true)
          : handleVerifyOrg(item.id, true))}
        onReject={queueType === 'organizations'
          ? (item) => handleVerifyOrg(item.id, false)
          : undefined}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
        listScrollRef={listScrollRef}
        onListKeyDown={handleListKeyDown}
        timeHeader={timeHeader}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {queueType === 'organizations' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleBulkAction(false)}
              disabled={actionLoading || selectedIds.length === 0}
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
              title="Reject Selected"
              aria-label={`Reject ${selectedIds.length} selected`}
            >
              <Ban className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleBulkAction(true)}
            disabled={actionLoading || selectedIds.length === 0}
            className="h-10 w-10 rounded-pill bg-emerald-500/15 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.96] disabled:opacity-40 dark:text-emerald-300"
            title="Approve Selected"
            aria-label={`Approve ${selectedIds.length} selected`}
          >
            <CheckCircle className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <VerificationModal
        isOpen={Boolean(selectedProvider)}
        provider={selectedProvider}
        mode="view"
        onClose={() => setSelectedProvider(null)}
        onVerify={canApprove ? handleVerify : null}
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        initialValues={filters}
        onApply={handleApplyFilters}
        filterSchema={filterSchema}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={queueType === 'providers' ? stats : orgStats}
        type="verification"
      />
    </div>
  );
};
