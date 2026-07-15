import React, { useMemo } from 'react';
import { CalendarClock, Stethoscope } from 'lucide-react';
import {
  PINNED_VISIT_STATE_IDS,
  VISIT_KPI_IMPORTANCE,
  getVisitAvatarClass,
  getVisitStateCount,
  hasActiveVisitFilters,
  visitStateOptions,
  visitStatusPillClass,
} from '../pages/visits/visitPageModel';
import { visitRowProjection } from '../../utils/visitRowProjection';
import { TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletVisits = ({
  visits = [],
  loading = false,
  isFetching = false,
  count,
  statistics,
  filters = {},
  setFilters,
  activeKpi = 'all',
  onKpiChange,
  onView,
  onRefresh,
  errorMessage,
  onRetry,
  onViewAnalytics,
  onOpenFilters,
  filterSheetOpen = false,
  pagination,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectClick,
  onSelectAll,
  allSelected,
  someSelected,
  focusedVisit,
  onFocusVisit,
  detail,
}) => {
  const kpis = useMemo(() => visitStateOptions.map((option) => ({
    ...option,
    value: getVisitStateCount({ id: option.id, stats: statistics, visits }),
  })), [statistics, visits]);

  const records = useMemo(() => visits.map((visit) => {
    const row = visitRowProjection(visit);
    return {
      id: visit.id,
      source: visit,
      title: row.patientName,
      subtitle: `${row.serviceType} - ${row.primary}`,
      meta: row.meta,
      trailing: visit.sourceKind === 'scheduled_visit' ? visit.careModeLabel : undefined,
      statusLabel: row.statusLabel,
      statusClass: visitStatusPillClass[row.statusKey],
      icon: visit.sourceKind === 'scheduled_visit' ? CalendarClock : Stethoscope,
      iconClass: getVisitAvatarClass(visit),
    };
  }), [visits]);

  // Honest windowed pagination (fetch = Supabase range window; see TabletEmergency).
  const footer = pagination?.totalPages > 1
    ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
    : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={activeKpi}
      onKpiChange={onKpiChange}
      kpiPinnedIds={PINNED_VISIT_STATE_IDS}
      kpiImportance={VISIT_KPI_IMPORTANCE}
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.((current) => ({ ...current, search: value }))}
      searchPlaceholder="Search patient, facility, clinician..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasActiveVisitFilters(filters)}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedVisit?.id}
      onFocus={onFocusVisit}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      scrollResetKey={pagination?.currentPage}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={activeKpi === 'scheduled' ? 'No scheduled visits' : 'No visits found'}
      emptyBody="Visits in this scope will appear here."
      countLabel={`${count ?? visits.length} visits`}
      footer={footer}
    />
  );
};

export default TabletVisits;
