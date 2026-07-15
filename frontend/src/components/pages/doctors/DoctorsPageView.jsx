import React from 'react';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { DoctorModal } from '../../modals/DoctorModal';
import { BulkActionBar } from '../../common/BulkActionBar';
import { FilterSheet } from '../../common/FilterSheet';
import { SEOHead } from '../../common/SEOHead';
import { MobileDoctors } from '../../mobile/MobileDoctors';
import { TabletStaff } from '../../tablet/TabletStaff';
import { useNavigation } from '../../../contexts/NavigationContext';
import StaffSchedulingModal from '../../modals/StaffSchedulingModal';
import { StaffDesktopWorkspace, StaffDetailRail } from './StaffDesktopWorkspace';

export const DoctorsPageView = ({ controller }) => {
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
    filterSchema,
    queryFilter,
    wayfinding,
  } = controller;

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Staff" description="Review and update staff directory records." />

        <MobileDoctors
          doctors={data.staffRows}
          loading={data.loading}
          statistics={data.derivedStats}
          filters={state.filters}
          setFilters={setters.setFilters}
          onView={actions.handleView}
          onEdit={actions.handleEdit}
          onRefresh={data.fetchDoctors}
          onViewAnalytics={actions.handleOpenAnalytics}
          isAdmin={role.admin}
          isOrgAdmin={role.orgAdmin}
          canManage={role.canManageStaff}
          selectionEnabled={role.canManageStaff}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          onOpenFilters={actions.handleOpenFilters}
          filterSheetOpen={state.filterSheetOpen}
          analyticsOpen={state.analyticsModalOpen}
          isFetching={data.isFetching}
          errorMessage={data.loadError}
          onRetry={data.fetchDoctors}
          onSchedule={actions.handleSchedule}
          scheduleEnabled={role.canManageSchedules}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        {state.modalMode && (
          <DoctorModal
            isOpen={!!state.modalMode}
            onClose={actions.handleModalClose}
            doctor={state.selectedDoctor}
            mode={state.modalMode}
            listFilter={queryFilter}
          />
        )}

        <FilterSheet
          isOpen={state.filterSheetOpen}
          onOpenChange={setters.setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setters.setFilters}
          initialValues={state.filters}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal
          open={state.analyticsModalOpen}
          onClose={() => setters.setAnalyticsModalOpen(false)}
          analytics={data.derivedStats}
          type="doctor"
        />

        <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection} />

        {state.scheduleModalOpen && (
          <StaffSchedulingModal
            isOpen
            onClose={actions.handleScheduleClose}
            hospitalId={state.scheduleInitialDoctor?.hospital_id || null}
            initialDoctor={state.scheduleInitialDoctor}
            scheduleId={state.scheduleId}
          />
        )}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Staff" description="Review and update staff directory records." />

        <TabletStaff
          staff={data.staffRows}
          loading={data.loading}
          isFetching={data.isFetching}
          stats={{ ...data.derivedStats, total: data.count }}
          filters={state.filters}
          setFilters={setters.setFilters}
          kpiFilter={state.activeStaffFilter}
          setKpiFilter={actions.setKpiFilter}
          focusedStaff={state.focusedStaff}
          onFocus={actions.setFocused}
          onView={actions.handleView}
          onRefresh={data.fetchDoctors}
          onRetry={data.fetchDoctors}
          loadError={data.loadError}
          onOpenFilters={actions.handleOpenFilters}
          onViewAnalytics={actions.handleOpenAnalytics}
          selectable={selection.selectable}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          detail={(
            <StaffDetailRail
              staff={state.focusedStaff}
              loading={data.loading}
              hasFilter={state.hasFilter}
              canManage={role.canManageStaff}
              onView={actions.handleView}
              onEdit={actions.handleEdit}
              onSchedule={actions.handleSchedule}
              scheduleEnabled={role.canManageSchedules}
              embedded
            />
          )}
        />

        {state.modalMode && (
          <DoctorModal
            isOpen={!!state.modalMode}
            onClose={actions.handleModalClose}
            doctor={state.selectedDoctor}
            mode={state.modalMode}
            listFilter={queryFilter}
          />
        )}

        <FilterSheet
          isOpen={state.filterSheetOpen}
          onOpenChange={setters.setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setters.setFilters}
          initialValues={state.filters}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal
          open={state.analyticsModalOpen}
          onClose={() => setters.setAnalyticsModalOpen(false)}
          analytics={data.derivedStats}
          type="doctor"
        />

        {selection.selectable && (
          <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection} />
        )}

        {state.scheduleModalOpen && (
          <StaffSchedulingModal
            isOpen
            onClose={actions.handleScheduleClose}
            hospitalId={state.scheduleInitialDoctor?.hospital_id || null}
            initialDoctor={state.scheduleInitialDoctor}
            scheduleId={state.scheduleId}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Staff" description="Review and update staff directory records." />

      <StaffDesktopWorkspace
        items={data.staffRows}
        stats={data.derivedStats}
        loading={data.loading}
        isFetching={data.isFetching}
        loadError={data.loadError}
        canManage={role.canManageStaff}
        focusedStaff={state.focusedStaff}
        setFocused={actions.setFocused}
        filters={state.filters}
        kpiFilter={state.activeStaffFilter}
        setKpiFilter={actions.setKpiFilter}
        setSearchFilter={actions.setSearchFilter}
        hasFilter={state.hasFilter}
        filterSheetOpen={state.filterSheetOpen}
        openFilters={actions.handleOpenFilters}
        onRetry={data.fetchDoctors}
        pagination={pagination}
        sortConfig={state.sortConfig}
        onSort={actions.handleSort}
        selectable={selection.selectable}
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        someSelected={selection.someSelected}
        onToggleSelect={selection.handleToggleSelect}
        onSelectClick={selection.handleSelectClick}
        onSelectAll={selection.handleSelectAll}
        onView={actions.handleView}
        onEdit={actions.handleEdit}
        onSchedule={actions.handleSchedule}
        scheduleEnabled={role.canManageSchedules}
        onCreate={actions.handleCreate}
        moduleRailItems={wayfinding.visibleModuleRail}
        routingPath={wayfinding.routingPath}
        onRailNavigate={wayfinding.handleRailNavigate}
      />

      {selection.selectable && (
        <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection} />
      )}

      {state.modalMode && (
        <DoctorModal
          isOpen={!!state.modalMode}
          onClose={actions.handleModalClose}
          doctor={state.selectedDoctor}
          mode={state.modalMode}
          listFilter={queryFilter}
        />
      )}

      <FilterSheet
        isOpen={state.filterSheetOpen}
        onOpenChange={setters.setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setters.setFilters}
        initialValues={state.filters}
        viewToggle={null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={state.analyticsModalOpen}
        onClose={() => setters.setAnalyticsModalOpen(false)}
        analytics={data.derivedStats}
        type="doctor"
      />

      {state.scheduleModalOpen && (
        <StaffSchedulingModal
          isOpen
          onClose={actions.handleScheduleClose}
          hospitalId={state.scheduleInitialDoctor?.hospital_id || null}
          initialDoctor={state.scheduleInitialDoctor}
          scheduleId={state.scheduleId}
        />
      )}
    </div>
  );
};
