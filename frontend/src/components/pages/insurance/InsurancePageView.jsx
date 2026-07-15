import React from 'react';
import { InsuranceModal } from '../../modals/InsuranceModal';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { FilterSheet } from '../../common/FilterSheet';
import { MobileInsurance } from '../../mobile/MobileInsurance';
import { TabletInsurance } from '../../tablet/TabletInsurance';
import { InsuranceDesktopWorkspace } from './InsuranceDesktopWorkspace';
import { InsuranceDetailRail } from './InsuranceDetailRail';
import { hasInsuranceWorkspaceFilter } from './insurancePresentation';
import {
  EMPTY_INSURANCE_FILTERS,
  INSURANCE_FILTER_SCHEMA,
} from './insurancePageModel';

const InsuranceOverlays = ({
  isMobile,
  selectedPolicy,
  modalMode,
  setModalMode,
  analyticsModalOpen,
  setAnalyticsModalOpen,
  analytics,
  filterSheetOpen,
  setFilterSheetOpen,
  filters,
  setFilters,
}) => (
  <>
    <InsuranceModal
      isOpen={!!modalMode}
      onClose={() => setModalMode(null)}
      policy={selectedPolicy}
      mode={modalMode}
    />
    <AnalyticsModal
      open={analyticsModalOpen}
      onClose={() => setAnalyticsModalOpen(false)}
      type="insurance"
      analytics={analytics}
    />
    <FilterSheet
      isOpen={filterSheetOpen}
      onOpenChange={setFilterSheetOpen}
      filterSchema={INSURANCE_FILTER_SCHEMA}
      onApply={setFilters}
      initialValues={filters}
      resetValues={EMPTY_INSURANCE_FILTERS}
      resetLabel="Clear"
      viewToggle={null}
      isMobile={isMobile}
    />
  </>
);

export const InsurancePageView = ({
  isPhone,
  isTablet,
  isMobile,
  seoHead,
  bulkActionBar,
  rows,
  data,
  filters,
  setFilters,
  filterSheetOpen,
  setFilterSheetOpen,
  analyticsModalOpen,
  setAnalyticsModalOpen,
  selectedPolicy,
  modalMode,
  setModalMode,
  analytics,
  pagination,
  sortConfig,
  onSort,
  onView,
  onOpenFilters,
  onViewAnalytics,
  focusedPolicy,
  setFocused,
  selection,
  wayfinding,
}) => {
  const overlays = (
    <InsuranceOverlays
      isMobile={isMobile}
      selectedPolicy={selectedPolicy}
      modalMode={modalMode}
      setModalMode={setModalMode}
      analyticsModalOpen={analyticsModalOpen}
      setAnalyticsModalOpen={setAnalyticsModalOpen}
      analytics={analytics}
      filterSheetOpen={filterSheetOpen}
      setFilterSheetOpen={setFilterSheetOpen}
      filters={filters}
      setFilters={setFilters}
    />
  );

  if (isPhone) {
    return (
      <div className="min-h-screen">
        {seoHead}
        <MobileInsurance
          policies={rows.mobile}
          filters={filters}
          setFilters={setFilters}
          onView={onView}
          onRefresh={data.fetchInsurancePage}
          loading={data.loading && !rows.hasMobileRows}
          isFetching={data.loading && rows.hasMobileRows && !data.mobileLoadingMore}
          denied={data.insurancePage.denied}
          error={data.error}
          onRetry={data.fetchInsurancePage}
          stats={data.insuranceStats}
          count={data.insurancePage.count}
          onOpenFilters={onOpenFilters}
          onViewAnalytics={onViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={data.handleMobileLoadMore}
          isLoadingMore={data.mobileLoadingMore}
          selectionEnabled={selection.canSelectPolicies}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
        />
        {overlays}
      </div>
    );
  }

  if (isTablet) {
    return (
      <>
        {seoHead}
        <TabletInsurance
          policies={rows.mobile}
          stats={data.insuranceStats}
          count={data.insurancePage.count}
          filters={filters}
          setFilters={setFilters}
          loading={data.loading && !rows.hasMobileRows}
          isFetching={data.loading && rows.hasMobileRows && !data.mobileLoadingMore}
          denied={data.insurancePage.denied}
          error={data.error}
          onRetry={data.fetchInsurancePage}
          onRefresh={data.fetchInsurancePage}
          onOpenFilters={onOpenFilters}
          filterSheetOpen={filterSheetOpen}
          onViewAnalytics={onViewAnalytics}
          focusedPolicy={focusedPolicy}
          onFocusPolicy={setFocused}
          onView={onView}
          selectionEnabled={selection.canSelectPolicies}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectClick={selection.handleSelectClick}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          hasMore={pagination.hasNextPage}
          onLoadMore={data.handleMobileLoadMore}
          isLoadingMore={data.mobileLoadingMore}
          detail={(
            <InsuranceDetailRail
              policy={focusedPolicy}
              denied={data.insurancePage.denied}
              loading={data.loading && !rows.hasMobileRows}
              hasFilter={hasInsuranceWorkspaceFilter(filters)}
              onView={onView}
              embedded
            />
          )}
        />
        {bulkActionBar}
        {overlays}
      </>
    );
  }

  return (
    <>
      {seoHead}
      <InsuranceDesktopWorkspace
        rows={rows.desktop}
        stats={data.insuranceStats}
        denied={data.insurancePage.denied}
        loading={data.loading && !rows.hasDesktopRows}
        isFetching={data.loading && rows.hasDesktopRows}
        error={data.error}
        filters={filters}
        setFilters={setFilters}
        filterSheetOpen={filterSheetOpen}
        openFilters={onOpenFilters}
        retry={data.fetchInsurancePage}
        clearFilters={() => setFilters(EMPTY_INSURANCE_FILTERS)}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={onSort}
        focusedPolicy={focusedPolicy}
        setFocused={setFocused}
        onView={onView}
        selectable={selection.canSelectPolicies}
        selectedIds={selection.selectedIds}
        onToggleSelect={selection.handleToggleSelect}
        onSelectClick={selection.handleSelectClick}
        onSelectAll={selection.handleSelectAll}
        allSelected={selection.allSelected}
        someSelected={selection.someSelected}
        moduleRailItems={wayfinding.moduleRailItems}
        routingPath={wayfinding.routingPath}
        onRailNavigate={wayfinding.handleRailNavigate}
      />
      {bulkActionBar}
      {overlays}
    </>
  );
};
