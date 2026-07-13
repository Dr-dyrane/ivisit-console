import React, { useRef } from 'react';
import { Activity, Ambulance, MapPin } from 'lucide-react';
import { Button } from '../../ui/button';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import { ActivitySheet, SheetToolbar } from '../../console/ActivitySheet';
import {
  EmptyState,
  ErrorBanner,
  LoadErrorState,
  Shimmer,
  SkeletonRows,
} from '../../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { getAmbulanceSignal, getFleetStateCount } from './ambulancePageModel';
import {
  AMBULANCE_EMPTY_HEADINGS,
  AMBULANCE_KPI_IMPORTANCE,
  PINNED_AMBULANCE_STATE_IDS,
  ambulanceStateOptions,
  ambulanceToneClass,
  resolveAmbulanceSignal,
} from './ambulancePresentation';
import { AmbulanceDetailRail } from './AmbulanceDetailRail';
import { AmbulanceListHeader, AmbulanceRow } from './AmbulanceList';

export const AmbulancesDesktopWorkspace = ({
  ambulances,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedAmbulance,
  setFocused,
  isFocused,
  setKeyboardFocusedId,
  canManageFleet,
  onView,
  onEdit,
  onClearFilters,
  pagination,
  openFilters,
  filterSheetOpen,
  hasFilter,
  loadError,
  failedEmpty,
  onRetry,
  onRefresh,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  sortConfig,
  onSort,
  activeActionFeedback,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}) => {
  const signal = resolveAmbulanceSignal(getAmbulanceSignal({
    stats,
    ambulances,
    kpiFilter,
    loadError,
  }));
  const listScrollRef = useRef(null);
  useScrollResetOnPage(listScrollRef, pagination.currentPage);

  const handleListKeyDown = useListKeyboardNav({
    items: ambulances,
    focusedItem: focusedAmbulance,
    setFocusedId: setKeyboardFocusedId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-ambulance-row',
  });

  const readyCount = getFleetStateCount({ id: 'available', stats, ambulances });
  const activeCount = getFleetStateCount({ id: 'busy', stats, ambulances });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/ambulances"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <AmbulanceDetailRail
          ambulance={focusedAmbulance}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={canManageFleet}
          onView={onView}
          onEdit={onEdit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={ambulanceToneClass}>
        <div
          className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground"
          aria-live="polite"
        >
          {loading ? (
            <>
              <Shimmer className="h-8 w-28 rounded-pill" />
              <Shimmer className="h-8 w-28 rounded-pill" />
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
                Ready
                <strong className="text-foreground">{readyCount}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
                Active
                <strong className="text-foreground">{activeCount}</strong>
              </span>
            </>
          )}
        </div>

        <KpiStrip
          options={ambulanceStateOptions}
          getCount={(id) => getFleetStateCount({ id, stats, ambulances })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_AMBULANCE_STATE_IDS}
          importance={AMBULANCE_KPI_IMPORTANCE}
          dataAttr="data-ambulance-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="ambulances"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters((current) => ({ ...current, search: value }))}
            searchPlaceholder="Search call sign, plate, vehicle..."
            searchTestId="ambulances-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="ambulances"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner
            title="Ambulances could not load"
            message={loadError}
            onRetry={onRetry}
            testId="ambulances-error-state"
          />
        ) : null}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          role="list"
          aria-label="Ambulances list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Ambulances did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <AmbulanceListHeader
                sortConfig={sortConfig}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={onSelectAll}
              />

              {ambulances.length === 0 && !loadError && (
                <EmptyState
                  icon={Ambulance}
                  heading={hasFilter
                    ? 'No matching units'
                    : (AMBULANCE_EMPTY_HEADINGS[kpiFilter] || 'No units found')}
                  body={hasFilter
                    ? 'Try a different search or clear the current filters.'
                    : 'Try a different filter or add a unit.'}
                >
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      onClick={onClearFilters}
                      className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                    >
                      Clear filters
                    </Button>
                  )}
                </EmptyState>
              )}

              {ambulances.map((ambulance) => (
                <AmbulanceRow
                  key={ambulance.id}
                  ambulance={ambulance}
                  selected={isFocused(ambulance.id)}
                  onFocus={() => setFocused(ambulance.id)}
                  onView={onView}
                  onEdit={onEdit}
                  canManageFleet={canManageFleet}
                  activeActionFeedback={activeActionFeedback}
                  selectable={selectable}
                  checked={selectedIds.includes(ambulance.id)}
                  onToggleSelect={onToggleSelect}
                  onSelectClick={onSelectClick}
                />
              ))}
            </>
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};
