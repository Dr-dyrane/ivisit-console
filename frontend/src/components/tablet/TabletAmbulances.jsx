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
import { ambulanceStateOptions } from '../pages/ambulances/ambulancePresentation';
import { TabletCollectionPage } from './TabletCollectionPage';

export const TabletAmbulances = ({
  ambulances = [], loading, isFetching, statistics, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedAmbulance, onFocus, onView,
  onRefresh, onRetry, errorMessage, onOpenFilters, onViewAnalytics,
  selectionEnabled, selectedIds, onSelect, onSelectAll, allSelected, someSelected,
  hasMore, onLoadMore, detail,
}) => {
  const kpis = useMemo(() => ambulanceStateOptions.slice(0, 3).map((option) => ({
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
      onKpiChange={setKpiFilter} loading={loading} isFetching={isFetching}
      error={errorMessage} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search call sign, plate, vehicle..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveAmbulanceFilters(filters)} onOpenAnalytics={onViewAnalytics}
      focusedId={focusedAmbulance?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectionEnabled} selectedIds={selectedIds} onToggleSelect={onSelect}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No ambulances found" emptyBody="Fleet units in this scope will appear here."
      countLabel={`${statistics?.total ?? ambulances.length} ambulances`}
      footer={hasMore ? <button type="button" onClick={onLoadMore} className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold">Load more</button> : null}
    />
  );
};

export default TabletAmbulances;
