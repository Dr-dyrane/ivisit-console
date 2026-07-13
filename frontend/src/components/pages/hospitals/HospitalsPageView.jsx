import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { BulkActionBar } from '../../common/BulkActionBar';
import { FilterSheet } from '../../common/FilterSheet';
import { SEOHead } from '../../common/SEOHead';
import { HospitalModal } from '../../modals/HospitalModal';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { MobileHospitals } from '../../mobile/MobileHospitals';
import { HospitalsDesktopWorkspace } from './HospitalsDesktopWorkspace';

export const HospitalsPageView = ({ controller }) => {
  const {
    isMobile,
    role,
    data,
    state,
    setters,
    actions,
    selection,
    pagination,
    filterSchema,
    wayfinding,
  } = controller;

  return (
    <div className={isMobile ? 'min-h-screen' : 'min-h-screen text-foreground'}>
      <SEOHead title="Hospitals" description="Manage network hospitals, bed capacity, and facility status." />

      {isMobile ? (
        <MobileHospitals
          hospitals={data.hospitals}
          loading={data.loading}
          statistics={data.hospitalPageStats}
          filters={state.filters}
          setFilters={actions.handleApplyFilters}
          onView={actions.handleView}
          onEdit={actions.handleEdit}
          errorMessage={data.hospitalPageError}
          onRetry={data.fetchHospitals}
          onRefresh={data.fetchHospitals}
          onViewAnalytics={actions.handleOpenAnalytics}
          isAdmin={role.admin}
          isOrgAdmin={role.orgAdmin}
          onOpenFilters={actions.handleOpenFilters}
          filterSheetOpen={state.filterSheetOpen}
          analyticsOpen={state.analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          isFetching={data.isFetching}
          canDelete={false}
          selectionEnabled={role.admin}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
        />
      ) : (
        <HospitalsDesktopWorkspace
          hospitals={data.hospitals}
          loading={data.loading}
          isFetching={data.isFetching}
          stats={data.hospitalPageStats}
          filters={state.filters}
          setFilters={actions.handleApplyFilters}
          kpiFilter={state.kpiFilter}
          setKpiFilter={actions.handleKpiFilterChange}
          focusedHospital={state.focusedHospital}
          setFocused={actions.setFocused}
          isFocused={actions.isFocused}
          setKeyboardFocusedId={actions.setKeyboardFocusedId}
          canEditFocused={state.focusedHospital ? role.canEditHospital(state.focusedHospital) : false}
          onView={actions.handleView}
          onEdit={actions.handleEdit}
          onClearFilters={actions.handleClearFilters}
          pagination={pagination}
          openFilters={actions.handleOpenFilters}
          filterSheetOpen={state.filterSheetOpen}
          loadError={data.hospitalPageError}
          onRetry={data.fetchHospitals}
          onRefresh={data.fetchHospitals}
          moduleRailItems={wayfinding.visibleModuleRail}
          routingPath={wayfinding.routingPath}
          onRailNavigate={wayfinding.handleRailNavigate}
          sortConfig={state.sortConfig}
          onSort={actions.handleSort}
          activeActionFeedback={state.activeActionFeedback}
          selectable={role.admin}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.handleToggleSelect}
          onSelectClick={selection.handleSelectClick}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
        />
      )}

      {!isMobile && role.admin && (
        <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive disabled:opacity-40"
            title="Facility deletion is locked until backend authority is proved"
            aria-label="Facility deletion is locked until backend authority is proved"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      {state.modalMode && (
        <HospitalModal
          isOpen={!!state.modalMode}
          onClose={actions.handleModalClose}
          hospital={state.selectedHospital}
          mode={state.modalMode}
          onSave={actions.handleSave}
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
        analytics={data.hospitalPageStats}
        type="hospital"
      />
    </div>
  );
};
