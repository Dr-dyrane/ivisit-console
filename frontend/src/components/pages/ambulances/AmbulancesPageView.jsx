import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { BulkActionBar } from '../../common/BulkActionBar';
import { FilterSheet } from '../../common/FilterSheet';
import { SEOHead } from '../../common/SEOHead';
import { AmbulanceModal } from '../../modals/AmbulanceModal';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { MobileAmbulances } from '../../mobile/MobileAmbulances';
import { TabletAmbulances } from '../../tablet/TabletAmbulances';
import { useNavigation } from '../../../contexts/NavigationContext';
import { AmbulanceDetailRail } from './AmbulanceDetailRail';
import { AmbulancesDesktopWorkspace } from './AmbulancesDesktopWorkspace';

export const AmbulancesPageView = ({ controller }) => {
  const { isPhone, isTablet } = useNavigation();
  const {
    isMobile,
    role,
    data,
    state,
    setters,
    actions,
    selection,
    pagination,
    queryFilter,
    filterSchema,
    wayfinding,
  } = controller;

  return (
    <div className={isPhone || isTablet ? 'min-h-screen' : 'min-h-screen text-foreground'}>
      <SEOHead title="Ambulances" description="Manage ambulance units, status, and tracking." />

      {isPhone ? (
        <MobileAmbulances
          ambulances={data.ambulances}
          loading={data.loading}
          isFetching={data.isFetching}
          statistics={data.ambulancePageStats}
          filters={state.filters}
          setFilters={actions.handleApplyFilters}
          kpiFilter={state.kpiFilter}
          setKpiFilter={actions.handleKpiFilterChange}
          onView={actions.handleView}
          onEdit={actions.handleEdit}
          onRefresh={data.fetchAmbulances}
          onViewAnalytics={actions.handleOpenAnalytics}
          isAdmin={role.admin}
          isOrgAdmin={role.orgAdmin}
          onOpenFilters={actions.handleOpenFilters}
          filterSheetOpen={state.filterSheetOpen}
          analyticsOpen={state.analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          errorMessage={data.loadError}
          onRetry={data.fetchAmbulances}
          selectionEnabled={role.canManageFleet}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
        />
      ) : isTablet ? (
        <TabletAmbulances
          ambulances={data.ambulances}
          loading={data.loading}
          isFetching={data.isFetching}
          statistics={data.ambulancePageStats}
          filters={state.filters}
          setFilters={actions.handleApplyFilters}
          kpiFilter={state.kpiFilter}
          setKpiFilter={actions.handleKpiFilterChange}
          focusedAmbulance={state.focusedAmbulance}
          onFocus={actions.setFocused}
          onView={actions.handleView}
          onRefresh={data.fetchAmbulances}
          onRetry={data.fetchAmbulances}
          errorMessage={data.loadError}
          onOpenFilters={actions.handleOpenFilters}
          onViewAnalytics={actions.handleOpenAnalytics}
          selectionEnabled={role.canManageFleet}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          detail={(
            <AmbulanceDetailRail
              ambulance={state.focusedAmbulance}
              loading={data.loading}
              hasFilter={state.hasFilter}
              canEdit={role.canManageFleet}
              onView={actions.handleView}
              onEdit={actions.handleEdit}
              activeActionFeedback={state.activeActionFeedback}
              embedded
            />
          )}
        />
      ) : (
        <AmbulancesDesktopWorkspace
          ambulances={data.ambulances}
          loading={data.loading}
          isFetching={data.isFetching}
          stats={data.ambulancePageStats}
          filters={state.filters}
          setFilters={actions.handleApplyFilters}
          kpiFilter={state.kpiFilter}
          setKpiFilter={actions.handleKpiFilterChange}
          focusedAmbulance={state.focusedAmbulance}
          setFocused={actions.setFocused}
          isFocused={actions.isFocused}
          setKeyboardFocusedId={actions.setKeyboardFocusedId}
          canManageFleet={role.canManageFleet}
          onView={actions.handleView}
          onEdit={actions.handleEdit}
          onClearFilters={actions.handleClearFilters}
          pagination={pagination}
          openFilters={actions.handleOpenFilters}
          filterSheetOpen={state.filterSheetOpen}
          hasFilter={state.hasFilter}
          loadError={data.loadError}
          failedEmpty={data.failedEmpty}
          onRetry={data.fetchAmbulances}
          onRefresh={data.fetchAmbulances}
          moduleRailItems={wayfinding.visibleModuleRail}
          routingPath={wayfinding.routingPath}
          onRailNavigate={wayfinding.handleRailNavigate}
          sortConfig={state.sortConfig}
          onSort={actions.handleSort}
          activeActionFeedback={state.activeActionFeedback}
          selectable={role.canManageFleet}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.handleToggleSelect}
          onSelectClick={selection.handleSelectClick}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
        />
      )}

      {!isPhone && role.canManageFleet && (
        <BulkActionBar
          selectedCount={selection.selectedIds.length}
          onClear={selection.clearSelection}
        >
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive disabled:opacity-40"
            title="Bulk fleet deletion is locked until it is explicitly authorized"
            aria-label="Bulk fleet deletion is locked until it is explicitly authorized"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      {state.modalMode && (
        <AmbulanceModal
          isOpen={!!state.modalMode}
          onClose={actions.handleModalClose}
          ambulance={state.selectedAmbulance}
          mode={state.modalMode}
          listFilter={queryFilter}
        />
      )}

      <FilterSheet
        isOpen={state.filterSheetOpen}
        onOpenChange={setters.setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={actions.handleApplyFilters}
        initialValues={state.filters}
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={state.analyticsModalOpen}
        onClose={() => setters.setAnalyticsModalOpen(false)}
        analytics={data.ambulancePageStats}
        type="ambulance"
      />
    </div>
  );
};
