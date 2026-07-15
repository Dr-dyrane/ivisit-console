import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filter, Plus, Trash2 } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { SEOHead } from '../common/SEOHead';
import { BulkActionBar } from '../common/BulkActionBar';
import { MobileSupportTickets } from '../mobile/MobileSupportTickets';
import { TabletSupport, TabletSupportBulkActions } from '../tablet/TabletSupport';
import { Button } from '../ui/button';
import { SupportDetailRail } from './support/SupportDetailRail';
import { SupportDesktopWorkspace } from './support/SupportDesktopWorkspace';
import { SupportPageModals } from './support/SupportPageModals';
import { SUPPORT_FILTER_SCHEMA } from './support/supportTicketsModel';
import { useSupportTicketsPageController } from './support/useSupportTicketsPageController';

export const SupportTicketsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPhone, isTablet } = useNavigation();
  const controller = useSupportTicketsPageController({
    locationPathname: location.pathname,
    locationSearch: location.search,
    navigate,
  });
  const {
    activeActionFeedback,
    allSelected,
    analytics,
    analyticsModalOpen,
    assignPending,
    canAssign,
    canCreate,
    canEditTicket,
    canManageSupport,
    clearSelection,
    closeConfirmation,
    confirmedDeletedTicketIds,
    confirmationModal,
    createConvergenceNotice,
    deletePending,
    fetchSupportTickets,
    filterSheetOpen,
    filters,
    focusedTicket,
    handleApplyFilters,
    handleAssign,
    handleBulkDelete,
    handleClearFilters,
    handleCreate,
    handleDelete,
    handleEdit,
    handleKpiFilterChange,
    handleMobileFiltersChange,
    handleOpenAnalytics,
    handleOpenFilters,
    handleRailNavigate,
    handleSave,
    handleSelectAll,
    handleSelectClick,
    handleSort,
    handleToggleSelect,
    handleView,
    hasFilter,
    isFetching,
    isMobile,
    isProviderOnly,
    kpiFilter,
    loadError,
    loading,
    modalMode,
    pagination,
    routingPath,
    selectable,
    selectedIds,
    selectedTicket,
    setAnalyticsModalOpen,
    setFilterSheetOpen,
    setFocused,
    setKpiFilter,
    setModalMode,
    setSearchFilter,
    someSelected,
    sortConfig,
    supportError,
    supportStats,
    ticketRows,
    visibleModuleRail,
  } = controller;

  const headerActions = useMemo(() => (
    canCreate ? (
      <Button
        type="button"
        onClick={handleCreate}
        data-state={activeActionFeedback === 'create' ? 'opening' : 'idle'}
        aria-busy={activeActionFeedback === 'create'}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
      >
        <Plus className="mr-2 h-4 w-4" />
        New ticket
      </Button>
    ) : null
  ), [activeActionFeedback, canCreate, handleCreate]);

  const filterButtonComponent = useMemo(() => {
    const hasFilters = hasFilter;

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpenFilters}
        className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
        aria-label="Filter support"
        aria-haspopup="dialog"
        aria-expanded={filterSheetOpen}
      >
        <Filter className="h-4 w-4" />
        {hasFilters && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
      </Button>
    );
  }, [filterSheetOpen, handleOpenFilters, hasFilter]);

  usePageHeader(
    isProviderOnly ? 'My support' : 'Support',
    headerActions,
    null,
    filterButtonComponent
  );
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const modals = (
    <SupportPageModals
      modalMode={modalMode}
      selectedTicket={selectedTicket}
      setModalMode={setModalMode}
      onSave={handleSave}
      filterSheetOpen={filterSheetOpen}
      setFilterSheetOpen={setFilterSheetOpen}
      filterSchema={SUPPORT_FILTER_SCHEMA}
      filters={{ ...filters, kpiFilter }}
      onApplyFilters={(next) => {
        setKpiFilter(next?.kpiFilter || 'all');
        handleApplyFilters(next);
      }}
      analyticsModalOpen={analyticsModalOpen}
      setAnalyticsModalOpen={setAnalyticsModalOpen}
      analytics={analytics}
      confirmationModal={confirmationModal}
      onCloseConfirmation={closeConfirmation}
      deletePending={deletePending}
      isMobile={isMobile}
    />
  );

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Support" description="Track support requests and issue follow-up." />
        <MobileSupportTickets
          tickets={ticketRows}
          stats={supportStats}
          filters={{ ...filters, kpiFilter }}
          setFilters={handleMobileFiltersChange}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssign={handleAssign}
          canAssign={canAssign}
          canEditTicket={canEditTicket}
          onRefresh={fetchSupportTickets}
          canManage={canManageSupport}
          loading={loading}
          isFetching={isFetching}
          errorMessage={supportError}
          convergenceMessage={createConvergenceNotice?.message || null}
          onRetry={fetchSupportTickets}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={canManageSupport ? handleOpenAnalytics : null}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          currentPage={pagination.currentPage}
          confirmedDeletedTicketIds={confirmedDeletedTicketIds}
        />
        {modals}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div>
        <SEOHead title="Support" description="Track support requests and issue follow-up." />
        <TabletSupport
          tickets={ticketRows}
          stats={supportStats}
          loading={loading}
          isFetching={isFetching}
          errorMessage={supportError}
          convergenceMessage={createConvergenceNotice?.message || null}
          filters={filters}
          kpiFilter={kpiFilter}
          setKpiFilter={handleKpiFilterChange}
          focusedTicket={focusedTicket}
          onFocus={setFocused}
          onView={handleView}
          onRefresh={fetchSupportTickets}
          onRetry={fetchSupportTickets}
          onSearchCommit={setSearchFilter}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={canManageSupport ? handleOpenAnalytics : null}
          filterSheetOpen={filterSheetOpen}
          selectable={selectable}
          selectedIds={selectedIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          pagination={pagination}
          detail={(
            <SupportDetailRail
              ticket={focusedTicket}
              loading={loading}
              hasFilter={hasFilter}
              canEdit={focusedTicket ? canEditTicket(focusedTicket) : false}
              canManage={canManageSupport}
              canAssign={canAssign}
              canCreate={canCreate}
              assignPending={assignPending}
              deletePending={deletePending}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssign={handleAssign}
              onCreate={handleCreate}
              embedded
            />
          )}
        />

        <TabletSupportBulkActions
          selectable={selectable}
          selectedIds={selectedIds}
          onClear={clearSelection}
          canManage={canManageSupport}
          onDelete={handleBulkDelete}
          deletePending={deletePending}
        />

        {modals}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Support" description="Track support requests and issue follow-up." />
      <SupportDesktopWorkspace
        items={ticketRows}
        stats={supportStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        convergenceMessage={createConvergenceNotice?.message || null}
        isProviderOnly={isProviderOnly}
        canCreate={canCreate}
        canManage={canManageSupport}
        canAssign={canAssign}
        canEditTicket={canEditTicket}
        assignPending={assignPending}
        deletePending={deletePending}
        focusedTicket={focusedTicket}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={handleOpenFilters}
        onRetry={fetchSupportTickets}
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAssign={handleAssign}
        onCreate={handleCreate}
        activeActionFeedback={activeActionFeedback}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {canManageSupport && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || deletePending}
              aria-busy={deletePending}
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-[0.96] disabled:opacity-40"
              title="Delete selected"
              aria-label={`Delete ${selectedIds.length} selected ticket${selectedIds.length === 1 ? '' : 's'}`}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </BulkActionBar>
      )}

      {modals}
    </div>
  );
};
