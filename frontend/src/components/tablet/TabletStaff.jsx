import React, { useMemo } from 'react';
import { Stethoscope } from 'lucide-react';
import {
  STAFF_KPI_OPTIONS,
  getStaffKpiCount,
  getStaffProjection,
  hasActiveStaffFilters,
} from '../pages/doctors/staffPageModel';
import { TabletCollectionPage } from './TabletCollectionPage';

export const TabletStaff = ({
  staff = [], loading, isFetching, stats, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedStaff, onFocus, onView,
  onRefresh, onRetry, loadError, onOpenFilters, onViewAnalytics,
  selectable, selectedIds, onToggleSelect, onSelectAll, allSelected, someSelected,
  hasMore, onLoadMore, detail,
}) => {
  const kpis = useMemo(() => STAFF_KPI_OPTIONS.slice(0, 3).map((option) => ({
    ...option,
    value: getStaffKpiCount(option.id, stats),
  })), [stats]);
  const records = useMemo(() => staff.map((person) => {
    const projection = getStaffProjection(person);
    return {
      id: person.id,
      source: person,
      title: projection.name,
      subtitle: `${projection.specialization} - ${projection.facility}`,
      meta: projection.contact,
      statusLabel: projection.statusMeta.label,
      statusClass: projection.statusMeta.tone,
      icon: Stethoscope,
      iconClass: projection.statusMeta.tone,
    };
  }), [staff]);

  return (
    <TabletCollectionPage
      detail={detail} records={records} kpis={kpis} activeKpi={kpiFilter}
      onKpiChange={setKpiFilter} loading={loading} isFetching={isFetching}
      error={loadError} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search staff..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveStaffFilters(filters)} onOpenAnalytics={onViewAnalytics}
      focusedId={focusedStaff?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectable} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No staff found" emptyBody="Staff in this scope will appear here."
      countLabel={`${stats?.total ?? staff.length} staff`}
      footer={hasMore ? <button type="button" onClick={onLoadMore} className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold">Load more</button> : null}
    />
  );
};

export default TabletStaff;
