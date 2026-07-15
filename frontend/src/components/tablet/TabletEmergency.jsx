import React, { useMemo } from 'react';
import { AlertCircle, UserRound } from 'lucide-react';
import {
  REQUEST_KPI_OPTIONS,
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

const chooseTabletKpis = (activeId, includeMine) => {
  const allowed = REQUEST_KPI_OPTIONS.filter((option) => includeMine || option.id !== 'mine');
  const preferred = ['all', 'pending', 'active'];
  if (activeId && !preferred.includes(activeId)) preferred[2] = activeId;
  return preferred
    .map((id) => allowed.find((option) => option.id === id))
    .filter(Boolean);
};

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
  hasMore = false,
  onLoadMore,
  loadError,
  onRetry,
  kpiFilter = 'all',
  setKpiFilter,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onFocusRequest,
  focusedRequest,
  includeMine = false,
  detail,
}) => {
  const kpis = useMemo(() => chooseTabletKpis(kpiFilter, includeMine).map((option) => ({
    ...option,
    value: getRequestKpiCount({ id: option.id, stats: statistics, requests: emergencies }),
  })), [emergencies, includeMine, kpiFilter, statistics]);

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
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
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
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedRequest?.id}
      onFocus={onFocusRequest}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectAll={onSelectAll}
      emptyTitle={kpiFilter === 'pending' ? 'Nothing needs attention' : 'No requests found'}
      emptyBody="New requests in this scope will appear here."
      countLabel={`${statistics?.total ?? emergencies.length} requests`}
      footer={footer}
    />
  );
};

export default TabletEmergency;
