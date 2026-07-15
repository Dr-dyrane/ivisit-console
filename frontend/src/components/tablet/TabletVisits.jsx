import React, { useMemo } from 'react';
import { CalendarClock, Stethoscope } from 'lucide-react';
import {
  getVisitAvatarClass,
  getVisitStateCount,
  hasActiveVisitFilters,
  visitStateOptions,
  visitStatusPillClass,
} from '../pages/visits/visitPageModel';
import { visitRowProjection } from '../../utils/visitRowProjection';
import { TabletCollectionPage } from './TabletCollectionPage';

const chooseTabletVisitKpis = (activeId) => {
  const preferred = ['all', 'scheduled', 'in_progress'];
  if (activeId && !preferred.includes(activeId)) preferred[2] = activeId;
  return preferred.map((id) => visitStateOptions.find((option) => option.id === id)).filter(Boolean);
};

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
  hasMore = false,
  onLoadMore,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  allSelected,
  someSelected,
  focusedVisit,
  onFocusVisit,
  detail,
}) => {
  const kpis = useMemo(() => chooseTabletVisitKpis(activeKpi).map((option) => ({
    ...option,
    value: getVisitStateCount({ id: option.id, stats: statistics, visits }),
  })), [activeKpi, statistics, visits]);

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

  const footer = hasMore ? (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading || isFetching}
      className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
    >
      Load more
    </button>
  ) : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={activeKpi}
      onKpiChange={onKpiChange}
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
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedVisit?.id}
      onFocus={onFocusVisit}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectAll={onSelectAll}
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
