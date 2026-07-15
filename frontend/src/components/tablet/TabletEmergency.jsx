import React, { useMemo } from 'react';
import { AlertCircle, UserRound } from 'lucide-react';
import {
  REQUEST_KPI_IMPORTANCE,
  REQUEST_KPI_OPTIONS,
  REQUEST_PINNED_KPI_IDS,
  REQUEST_SERVICE_ICON_MAP,
  formatRequestTime,
  getRequestAvatarClass,
  getRequestKpiCount,
  getRequestProjection,
  getRequestStatusMeta,
  hasActiveRequestFilters,
} from '../pages/requests/requestPageModel';
import { buildEmergencyLifecyclePresentation } from '../pages/requests/emergencyLifecyclePresentation';
import { TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletEmergency = ({
  emergencies = [],
  loading = false,
  isFetching = false,
  statistics,
  filters = {},
  setFilters,
  onView,
  onRefresh,
  onViewAnalytics,
  onOpenFilters,
  filterSheetOpen = false,
  pagination,
  loadError,
  onRetry,
  kpiFilter = 'all',
  setKpiFilter,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectClick,
  onSelectAll,
  onFocusRequest,
  focusedRequest,
  includeMine = false,
  detail,
}) => {
  const kpis = useMemo(() => REQUEST_KPI_OPTIONS
    .filter((option) => includeMine || option.id !== 'mine')
    .map((option) => ({
      ...option,
      value: getRequestKpiCount({ id: option.id, stats: statistics, requests: emergencies }),
    })), [emergencies, includeMine, statistics]);

  const records = useMemo(() => emergencies.map((request) => {
    const projection = getRequestProjection(request);
    const lifecycle = buildEmergencyLifecyclePresentation(request);
    const status = getRequestStatusMeta(request, lifecycle);
    const Icon = REQUEST_SERVICE_ICON_MAP[projection.serviceDisplay.type] || AlertCircle;
    return {
      id: request.id,
      source: request,
      title: projection.patientDisplay.name || 'Unknown patient',
      subtitle: `${projection.serviceDisplay.label} - ${projection.facilityDisplay.name}`,
      meta: projection.identity.displayId || projection.locationDisplay.label,
      trailing: formatRequestTime(projection.identity.createdAt),
      statusLabel: status.label,
      statusClass: status.className,
      icon: projection.patientDisplay.name ? Icon : UserRound,
      iconClass: getRequestAvatarClass(request),
      initials: projection.patientDisplay.initials,
    };
  }), [emergencies]);

  // Honest windowed pagination: the fetch is a Supabase range window, so the
  // footer says "Page X of Y" instead of a row-replacing grow control.
  const footer = pagination?.totalPages > 1
    ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
    : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={REQUEST_PINNED_KPI_IDS}
      kpiImportance={REQUEST_KPI_IMPORTANCE}
      loading={loading}
      isFetching={isFetching}
      error={loadError}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.((current) => ({ ...current, search: value }))}
      searchPlaceholder="Search request, patient, facility..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasActiveRequestFilters(filters)}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedRequest?.id}
      onFocus={onFocusRequest}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      scrollResetKey={pagination?.currentPage}
      emptyTitle={kpiFilter === 'pending' ? 'Nothing needs attention' : 'No requests found'}
      emptyBody="New requests in this scope will appear here."
      countLabel={`${statistics?.total ?? emergencies.length} requests`}
      footer={footer}
    />
  );
};

export default TabletEmergency;
