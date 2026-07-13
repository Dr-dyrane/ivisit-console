import React from 'react';
import { Hospital, Trash2 } from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadingMore,
  MobileListLoadMore,
} from './MobileListStates';
import { MobileHospitalsAtlasLayer } from './hospitals/MobileHospitalsAtlasLayer';
import { MobileHospitalRow } from './hospitals/MobileHospitalRow';
import { MobileHospitalDetailSheet } from './hospitals/MobileHospitalDetailSheet';
import { useMobileHospitalsController } from './hospitals/useMobileHospitalsController';

export const MobileHospitals = ({
  hospitals,
  loading,
  statistics,
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  onRefresh,
  onViewAnalytics,
  isAdmin,
  isOrgAdmin,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore,
  onLoadMore,
  isFetching = false,
  errorMessage = null,
  onRetry,
  canDelete = false,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const controller = useMobileHospitalsController({
    hospitals,
    loading,
    statistics,
    filters,
    setFilters,
    hasMore,
    onLoadMore,
    isFetching,
    isAdmin,
    isOrgAdmin,
    selectionEnabled,
    selectedIds,
  });

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileHospitalsAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Hospitals"
            noun="hospital"
            count={controller.scopeCount}
            showSkeleton={controller.showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && controller.displayHospitals.length === 0}
          />

          <MobileKPIStrip
            loading={controller.showTopSectionLoading}
            kpis={controller.kpis}
            activeKpi={controller.activeStatusFilter}
            onKpiClick={controller.handleStatusFilter}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search hospitals..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((previous) => ({ ...previous, search: value }))}
              entityLabel="hospitals"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={controller.hasFilter}
              onOpenStats={controller.canManage ? onViewAnalytics : null}
              statsOpen={analyticsOpen}
              statsLabel="Open analytics"
            />

            <UpdatingPillRow
              show={(controller.refetching || controller.isBuffering) && !controller.showTopSectionLoading}
            />

            <div className="mt-3 space-y-2">
              {selectionEnabled && (
                <MobileSelectionBar
                  count={controller.selectedIdSet.size}
                  onSelectAll={() => onSelectAll?.(true)}
                  onClear={() => onSelectAll?.(false)}
                >
                  <button
                    type="button"
                    disabled
                    aria-label="Facility deletion is locked until authorized"
                    title="Facility deletion is locked until authorized"
                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </MobileSelectionBar>
              )}

              {errorMessage && controller.displayHospitals.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-hospitals-degraded-state"
                >
                  <p className="text-sm font-semibold">Hospitals did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">Showing the last loaded facility rows.</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              {controller.showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {controller.hospitalGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((hospital, index) => (
                        <React.Fragment key={hospital.id}>
                          <MobileHospitalRow
                            hospital={hospital}
                            onOpen={controller.setActiveHospital}
                            selectionEnabled={selectionEnabled}
                            selected={controller.selectedIdSet.has(hospital.id)}
                            selectionMode={controller.selectionMode}
                            onSelect={onSelect}
                          />
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div
                ref={controller.observerTarget}
                className="min-h-[64px] flex flex-col items-center justify-center gap-2"
              >
                {controller.refetching && !controller.showTopSectionLoading && hasMore && controller.displayHospitals.length > 0 && (
                  <MobileListLoadingMore />
                )}
                {!loading && !controller.refetching && hasMore && (
                  <MobileListLoadMore armed={controller.armed} onRequest={controller.requestLoad} labelTone="plain" />
                )}
                {!loading && !hasMore && controller.displayHospitals.length > 0 && (
                  <MobileListEnd label="End of hospital list" />
                )}
              </div>

              {controller.displayHospitals.length === 0 && !loading && !controller.showTopSectionLoading && (
                <MobileListEmpty
                  icon={Hospital}
                  label={errorMessage ? 'Hospitals did not load' : 'No hospitals found'}
                  reason={filters?.search ? 'search' : controller.hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the network as empty.'
                    : filters?.search
                      ? `No hospitals match "${filters.search}".`
                      : controller.hasFilter
                        ? 'Try resetting filters to see the full network.'
                        : 'Facilities will appear here once registered.'}
                  onRecover={!errorMessage && (filters?.search || controller.hasFilter)
                    ? () => setFilters(() => ({}))
                    : undefined}
                  recoverLabel={!errorMessage && filters?.search
                    ? 'Clear Search'
                    : !errorMessage && controller.hasFilter
                      ? 'Reset Filters'
                      : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileHospitalDetailSheet
          activeHospital={controller.activeHospital}
          setActiveHospital={controller.setActiveHospital}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onSchedule={onSchedule}
          canDelete={canDelete}
          canManage={controller.canManage}
          triggerFromEvent={controller.triggerFromEvent}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
