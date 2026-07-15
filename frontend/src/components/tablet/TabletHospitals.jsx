import React, { useMemo } from 'react';
import { Hospital } from 'lucide-react';
import {
  getHospitalStateCount,
  hasActiveHospitalFilters,
} from '../pages/hospitals/hospitalPageModel';
import {
  hospitalStateOptions,
  hospitalStatusLabel,
  hospitalStatusPillClass,
} from '../pages/hospitals/hospitalPresentation';
import { TabletCollectionPage } from './TabletCollectionPage';

export const TabletHospitals = ({
  hospitals = [], loading, isFetching, statistics, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedHospital, onFocus, onView,
  onRefresh, onRetry, errorMessage, onOpenFilters, onViewAnalytics,
  selectionEnabled, selectedIds, onSelect, onSelectAll, allSelected, someSelected,
  hasMore, onLoadMore, detail,
}) => {
  const kpis = useMemo(() => hospitalStateOptions.slice(0, 3).map((option) => ({
    ...option,
    value: getHospitalStateCount({ id: option.id, stats: statistics, hospitals }),
  })), [hospitals, statistics]);
  const records = useMemo(() => hospitals.map((hospital) => {
    const statusKey = String(hospital.status || 'available').toLowerCase();
    const beds = Number(hospital.available_beds);
    return {
      id: hospital.id,
      source: hospital,
      title: hospital.name || 'Unnamed hospital',
      subtitle: hospital.address || hospital.city || 'No address provided',
      meta: Number.isFinite(beds) ? `${beds} visible beds` : hospital.phone || hospital.display_id,
      statusLabel: hospitalStatusLabel[statusKey] || statusKey.replace(/_/g, ' '),
      statusClass: hospitalStatusPillClass[statusKey],
      icon: Hospital,
      iconClass: statusKey === 'available'
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
        : 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    };
  }), [hospitals]);

  return (
    <TabletCollectionPage
      detail={detail} records={records} kpis={kpis} activeKpi={kpiFilter}
      onKpiChange={setKpiFilter} loading={loading} isFetching={isFetching}
      error={errorMessage} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search facility, address, ID..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveHospitalFilters(filters)} onOpenAnalytics={onViewAnalytics}
      focusedId={focusedHospital?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectionEnabled} selectedIds={selectedIds} onToggleSelect={onSelect}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No hospitals found" emptyBody="Facilities in this scope will appear here."
      countLabel={`${statistics?.total ?? hospitals.length} hospitals`}
      footer={hasMore ? <button type="button" onClick={onLoadMore} className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold">Load more</button> : null}
    />
  );
};

export default TabletHospitals;
