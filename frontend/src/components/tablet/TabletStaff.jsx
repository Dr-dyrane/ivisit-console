import React, { useMemo } from 'react';
import { Stethoscope } from 'lucide-react';
import {
  PINNED_STAFF_KPI_IDS,
  STAFF_KPI_IMPORTANCE,
  STAFF_KPI_OPTIONS,
  getStaffKpiCount,
  getStaffProjection,
  hasActiveStaffFilters,
} from '../pages/doctors/staffPageModel';
import { TabletCollectionPage, TABLET_FOCUS_RING } from './TabletCollectionPage';

export const TabletStaff = ({
  staff = [], loading, isFetching, stats, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedStaff, onFocus, onView,
  onRefresh, onRetry, loadError, onOpenFilters, filterSheetOpen = false, onViewAnalytics,
  selectable, selectedIds, onToggleSelect, onSelectClick, onSelectAll, allSelected, someSelected,
  pagination, detail,
}) => {
  const kpis = useMemo(() => STAFF_KPI_OPTIONS.map((option) => ({
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
      onKpiChange={setKpiFilter}
      kpiPinnedIds={PINNED_STAFF_KPI_IDS} kpiImportance={STAFF_KPI_IMPORTANCE}
      loading={loading} isFetching={isFetching}
      error={loadError} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search staff..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveStaffFilters(filters)} filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedStaff?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectable} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No staff found" emptyBody="Staff in this scope will appear here."
      countLabel={`${stats?.total ?? staff.length} staff`}
      footer={pagination?.hasNextPage ? (
        // This feed genuinely accumulates on tablet (staffPageModel widens the
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

export default TabletStaff;
