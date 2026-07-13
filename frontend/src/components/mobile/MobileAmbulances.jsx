import React from 'react';
import { Ambulance, Trash2 } from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEnd,
  MobileListEmpty,
  MobileListLoadMore,
  MobileListLoadingMore,
} from './MobileListStates';
import { MobileAmbulancesAtlasLayer } from './ambulances/MobileAmbulancesAtlasLayer';
import { MobileAmbulanceDetailSheet } from './ambulances/MobileAmbulanceDetailSheet';
import { MobileAmbulanceRow } from './ambulances/MobileAmbulanceRow';
import { useMobileAmbulancesController } from './ambulances/useMobileAmbulancesController';

export const MobileAmbulances = ({
  ambulances,
  loading,
  statistics,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  onView,
  onEdit,
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
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileAmbulancesController({
    ambulances,
    loading,
    statistics,
    filters,
    kpiFilter,
    hasMore,
    onLoadMore,
    isFetching,
    isAdmin,
    isOrgAdmin,
    selectionEnabled,
    selectedIds,
    warmingUp,
  });

  const {
    observerTarget,
    activeAmbulance,
    setActiveAmbulance,
    canManage,
    selectedIdSet,
    selectionMode,
    refetching,
    ambulanceKPIs,
    displayAmbulances,
    isBuffering,
    showTopSectionLoading,
    scopeCount,
    hasFilter,
    fleetGroups,
    armed,
    requestLoad,
  } = controller;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileAmbulancesAtlasLayer />

        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Ambulances"
            noun="unit"
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && displayAmbulances.length === 0}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={ambulanceKPIs}
            activeKpi={kpiFilter || 'all'}
            onKpiClick={(id) => setKpiFilter?.(id)}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search ambulances..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((current) => ({ ...current, search: value }))}
              entityLabel="fleet"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={canManage ? onViewAnalytics : null}
              statsOpen={analyticsOpen}
              statsLabel="Open fleet statistics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              {selectionEnabled && (
                <MobileSelectionBar
                  count={selectedIdSet.size}
                  onSelectAll={() => onSelectAll?.(true)}
                  onClear={() => onSelectAll?.(false)}
                >
                  <button
                    type="button"
                    disabled
                    aria-label="Bulk fleet deletion is locked until authorized"
                    title="Bulk fleet deletion is locked until authorized"
                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </MobileSelectionBar>
              )}

              {errorMessage && displayAmbulances.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-ambulances-degraded-state"
                >
                  <p className="text-sm font-semibold">Fleet did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">
                    Showing the last loaded fleet rows.
                  </p>
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

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {fleetGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((ambulance, index) => (
                        <React.Fragment key={ambulance.id}>
                          <MobileAmbulanceRow
                            ambulance={ambulance}
                            onOpen={setActiveAmbulance}
                            selectionEnabled={selectionEnabled}
                            selectedIdSet={selectedIdSet}
                            selectionMode={selectionMode}
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
                ref={observerTarget}
                className="min-h-[64px] flex flex-col items-center justify-center gap-2"
              >
                {refetching
                  && !showTopSectionLoading
                  && hasMore
                  && displayAmbulances.length > 0
                  && <MobileListLoadingMore />}
                {!loading && !refetching && hasMore && (
                  <MobileListLoadMore
                    armed={armed}
                    onRequest={requestLoad}
                    labelTone="plain"
                  />
                )}
                {!loading && !hasMore && displayAmbulances.length > 0 && (
                  <MobileListEnd label="End of fleet list" />
                )}
              </div>

              {displayAmbulances.length === 0 && !loading && !showTopSectionLoading && (
                <MobileListEmpty
                  icon={Ambulance}
                  label={errorMessage ? 'Fleet did not load' : 'No ambulances found'}
                  reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the fleet as empty.'
                    : filters?.search
                      ? `No units match "${filters.search}".`
                      : hasFilter
                        ? 'Try resetting filters to see the full fleet.'
                        : 'Units will appear here once registered.'}
                  onRecover={!errorMessage && (filters?.search || hasFilter)
                    ? () => setFilters(() => ({}))
                    : undefined}
                  recoverLabel={!errorMessage && filters?.search
                    ? 'Clear Search'
                    : !errorMessage && hasFilter
                      ? 'Reset Filters'
                      : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileAmbulanceDetailSheet
          ambulance={activeAmbulance}
          canManage={canManage}
          onClose={() => setActiveAmbulance(null)}
          onView={onView}
          onEdit={onEdit}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};

// grammar:loadmore-append=useMobileAmbulancesController owns the id-keyed accumulatorRef.
