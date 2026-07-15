import React from 'react';
import { Trash2 } from 'lucide-react';
import { SEOHead } from '../../common/SEOHead';
import { FilterSheet } from '../../common/FilterSheet';
import { BulkActionBar } from '../../common/BulkActionBar';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { OrganizationModal } from '../../modals/OrganizationModal';
import { Button } from '../../ui/button';
import { MobileOrganizations } from '../../mobile/MobileOrganizations';
import { TabletOrganizations } from '../../tablet/TabletOrganizations';
import { useNavigation } from '../../../contexts/NavigationContext';
import { OrganizationDetailRail } from './OrganizationDetailRail';
import { OrganizationsDesktopWorkspace } from './OrganizationsDesktopWorkspace';

const OrganizationCommandNotice = ({ message, mobile = false }) => {
  if (!message) return null;

  return (
    <p
      id="organizations-action-feedback"
      className={`${mobile ? 'mx-4 mb-3' : 'mb-4'} rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
};

const OrganizationsPageOverlays = ({ controller, mobile }) => {
  const { selectedOrg, modalMode, filterSheetOpen, filters, analyticsModalOpen } = controller.state;
  const { setFilterSheetOpen, setAnalyticsModalOpen } = controller.setters;
  const { handleModalClose, handleSave, handleApplyFilters } = controller.actions;

  return (
    <>
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
        filterSchema={controller.filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        isMobile={mobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="generic"
        analytics={controller.analytics}
      />
    </>
  );
};

export const OrganizationsPageView = ({ controller }) => {
  const { isPhone, isTablet } = useNavigation();
  const { role, data, state, actions, selection, pagination, wayfinding } = controller;
  const { selectable } = role;
  const {
    organizations,
    orgStats,
    loading,
    isFetching,
    isPlaceholderData,
    organizationError,
    loadError,
    fetchOrganizations,
  } = data;
  const {
    filters,
    mobileFilters,
    kpiFilter,
    sortConfig,
    filterSheetOpen,
    analyticsModalOpen,
    activeActionFeedback,
    organizationCommandNotice,
    focusedOrg,
    hasFilter,
  } = state;
  const {
    handleKpiFilterChange,
    handleMobileFiltersChange,
    handleSort,
    setSearchFilter,
    handleView,
    handleOpenFilters,
    handleOpenAnalytics,
    handleClearFilters,
    setFocused,
  } = actions;

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Organizations" description="Review the organization registry and payout readiness." />

        <OrganizationCommandNotice message={organizationCommandNotice} mobile />

        <MobileOrganizations
          organizations={organizations}
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

        <OrganizationsPageOverlays controller={controller} mobile />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Organizations" description="Review the organization registry and payout readiness." />

        <OrganizationCommandNotice message={organizationCommandNotice} mobile />

        <TabletOrganizations
          organizations={organizations}
          loading={loading}
          isFetching={isFetching}
          stats={orgStats}
          filters={filters}
          setFilters={actions.handleApplyFilters}
          kpiFilter={kpiFilter}
          setKpiFilter={handleKpiFilterChange}
          focusedOrganization={focusedOrg}
          onFocus={setFocused}
          onView={handleView}
          onRefresh={fetchOrganizations}
          onRetry={fetchOrganizations}
          loadError={loadError}
          onOpenFilters={handleOpenFilters}
          filterSheetOpen={filterSheetOpen}
          onViewAnalytics={handleOpenAnalytics}
          selectable={selectable}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.handleToggleSelect}
          onSelectClick={selection.handleSelectClick}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          pagination={pagination}
          detail={(
            <OrganizationDetailRail
              organization={focusedOrg}
              loading={loading}
              hasFilter={hasFilter}
              onView={handleView}
              activeActionFeedback={activeActionFeedback}
              embedded
            />
          )}
        />

        {selectable && (
          <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive disabled:opacity-40"
              title="Bulk organization changes are not available"
              aria-label="Bulk organization changes are not available"
              data-state="unavailable"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </BulkActionBar>
        )}

        <OrganizationsPageOverlays controller={controller} mobile />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Organizations" description="Review the organization registry and payout readiness." />

      <OrganizationCommandNotice message={organizationCommandNotice} />

      <OrganizationsDesktopWorkspace
        items={organizations}
        stats={orgStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
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
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        someSelected={selection.someSelected}
        onToggleSelect={selection.handleToggleSelect}
        onSelectClick={selection.handleSelectClick}
        onSelectAll={selection.handleSelectAll}
        onView={handleView}
        activeActionFeedback={activeActionFeedback}
        moduleRailItems={wayfinding.visibleModuleRail}
        routingPath={wayfinding.routingPath}
        onRailNavigate={wayfinding.handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive disabled:opacity-40"
            title="Bulk organization changes are not available"
            aria-label="Bulk organization changes are not available"
            data-state="unavailable"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <OrganizationsPageOverlays controller={controller} mobile={false} />
    </div>
  );
};
