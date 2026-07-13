import React from 'react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { GroupedList } from './canon/GroupedList';
import { UpdatingPillRow, useSkeletonWarmup } from './canon/Loading';
import { MobileHeading } from './canon/MobileHero';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { MobileEmergencyList, MobileRequestRow } from './requests/MobileEmergencyList';
import { MobileEmergencyDetailSheet } from './requests/MobileEmergencyDetailSheet';
import { useMobileEmergencyController } from './requests/useMobileEmergencyController';

// Compatibility facade for existing imports. Requests-only state and presentation
// live under ./requests so this entry retains the public component contract.
// grammar:search=inline-request-search-row-in-MobileEmergencyList
// grammar:skeleton=request-group-shaped-skeleton-in-MobileEmergencyList
// grammar:loadmore-append=useMobileEmergencyController-accumulatorRef
export const MobileEmergency = ({
  emergencies,
  loading,
  isFetching = false,
  statistics,
  filters,
  setFilters,
  onView,
  onDispatch,
  onComplete,
  onProcessCash,
  onRetryPayment,
  onRefresh,
  onViewAnalytics,
  isAdmin,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore,
  onLoadMore,
  currentPage = 1,
  loadError,
  onRetry,
  kpiFilter,
  setKpiFilter,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onBulkCancel,
  cancellableCount = 0,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileEmergencyController({
    emergencies,
    loading,
    statistics,
    filters,
    setFilters,
    filterSheetOpen,
    analyticsOpen,
    hasMore,
    onLoadMore,
    currentPage,
    kpiFilter,
    selectionEnabled,
    selectedIds,
    warmingUp,
  });

  const {
    displayItems,
    selectedIdSet,
    selectionMode,
    setActiveRequest,
    showSkeleton,
    totalRequests,
  } = controller;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileEmergencyList
          controller={controller}
          loading={loading}
          isFetching={isFetching}
          filters={filters}
          setFilters={setFilters}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          isAdmin={isAdmin}
          onOpenFilters={onOpenFilters}
          onViewAnalytics={onViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsOpen}
          selectionEnabled={selectionEnabled}
          onSelectAll={onSelectAll}
          onBulkCancel={onBulkCancel}
          cancellableCount={cancellableCount}
          loadError={loadError}
          onRetry={onRetry}
          hasMore={hasMore}
          heading={(
            <MobileHeading
              title="Requests"
              noun="request"
              count={totalRequests}
              showSkeleton={showSkeleton}
              failedEmpty={Boolean(loadError) && displayItems.length === 0}
            />
          )}
          updatingPill={<UpdatingPillRow show={isFetching && !showSkeleton} />}
          groupedList={(
            <GroupedList
              items={displayItems}
              getDate={(request) => request.created_at}
              getStatus={(request) => canonicalizeEmergencyStatus(request.status, null)}
              renderRow={(request) => (
                <MobileRequestRow
                  request={request}
                  onOpen={setActiveRequest}
                  selectable={selectionEnabled}
                  selected={selectedIdSet.has(request.id)}
                  selectionMode={selectionMode}
                  onToggleSelect={(item) => onSelect?.(item.id, !selectedIdSet.has(item.id))}
                  onLongPress={(item) => onSelect?.(item.id, true)}
                />
              )}
            />
          )}
        />
        <MobileEmergencyDetailSheet
          controller={controller}
          isAdmin={isAdmin}
          onView={onView}
          onDispatch={onDispatch}
          onComplete={onComplete}
          onProcessCash={onProcessCash}
          onRetryPayment={onRetryPayment}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
