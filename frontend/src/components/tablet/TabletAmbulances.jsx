import React, { useMemo } from 'react';
import { Ambulance } from 'lucide-react';
import {
  getAmbulanceStatusLabel,
  getAmbulanceStatusToneClass,
  getFleetStatus,
} from '../../constants/ambulanceStatus';
import {
  getAmbulanceStation,
  getAmbulanceVehicle,
  getFleetStateCount,
  hasActiveAmbulanceFilters,
} from '../pages/ambulances/ambulancePageModel';
import {
  AMBULANCE_KPI_IMPORTANCE,
  PINNED_AMBULANCE_STATE_IDS,
  ambulanceStateOptions,
} from '../pages/ambulances/ambulancePresentation';
import { TabletCollectionPage, TABLET_FOCUS_RING } from './TabletCollectionPage';

export const TabletAmbulances = ({
  ambulances = [], loading, isFetching, statistics, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedAmbulance, onFocus, onView,
  onRefresh, onRetry, errorMessage, onOpenFilters, filterSheetOpen = false, onViewAnalytics,
  selectionEnabled, selectedIds, onSelect, onSelectClick, onSelectAll, allSelected, someSelected,
  pagination, detail,
}) => {
  const kpis = useMemo(() => ambulanceStateOptions.map((option) => ({
    ...option,
    value: getFleetStateCount({ id: option.id, stats: statistics, ambulances }),
  })), [ambulances, statistics]);
  const records = useMemo(() => ambulances.map((unit) => {
    const status = getFleetStatus(unit);
    return {
      id: unit.id,
      source: unit,
      title: unit.call_sign || unit.name || getAmbulanceVehicle(unit),
      subtitle: `${getAmbulanceVehicle(unit)} - ${getAmbulanceStation(unit)}`,
      meta: unit.crew?.name || unit.driver_name || unit.display_id,
      statusLabel: getAmbulanceStatusLabel(status),
      statusClass: getAmbulanceStatusToneClass(status),
      icon: Ambulance,
      iconClass: status === 'available'
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
        : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    };
  }), [ambulances]);

  return (
    <TabletCollectionPage
      detail={detail} records={records} kpis={kpis} activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={PINNED_AMBULANCE_STATE_IDS} kpiImportance={AMBULANCE_KPI_IMPORTANCE}
      loading={loading} isFetching={isFetching}
      error={errorMessage} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search call sign, plate, vehicle..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveAmbulanceFilters(filters)} filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedAmbulance?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectionEnabled} selectedIds={selectedIds} onToggleSelect={onSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No ambulances found" emptyBody="Fleet units in this scope will appear here."
      countLabel={`${statistics?.total ?? ambulances.length} ambulances`}
      footer={pagination?.hasNextPage ? (
        // This feed genuinely accumulates on tablet (ambulancePageModel widens the
        // fetch to limit = currentPage * itemsPerPage at offset 0), so "Load more"
        // is honest -- Prev/Next "Page X of Y" over a grow-window would lie.
        <button
          type="button"
          onClick={pagination.nextPage}
          disabled={loading || isFetching}
          className={`h-11 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50 ${TABLET_FOCUS_RING}`}
        >
          {isFetching ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    />
  );
};

export default TabletAmbulances;
