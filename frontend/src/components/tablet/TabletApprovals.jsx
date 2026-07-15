import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import {
  getApprovalLabel,
  getApprovalToneClass,
} from '../../constants/verificationStatus';
import {
  APPROVAL_KPI_IMPORTANCE,
  APPROVAL_KPI_OPTIONS,
  APPROVAL_PINNED_KPI_IDS,
  getApprovalKpiCount,
  getProviderTypeIcon,
} from '../pages/verification/approvalPresentation';
import {
  formatAppliedDate,
  getApprovalProjection,
  hasVerificationFilter,
} from '../pages/verification/verificationQueueModel';
import { TABLET_FOCUS_RING, TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletApprovals = ({
  queueType = 'providers',
  setQueueType,
  items = [],
  activeStats = {},
  loading = false,
  isFetching = false,
  errorMessage,
  filters = {},
  setStatusFilter,
  focusedItem,
  onFocus,
  onOpenRecord,
  onRefresh,
  onRetry,
  onSearchCommit,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  selectable = false,
  selectedIds = [],
  allSelected = false,
  someSelected = false,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  pagination,
  emptyState,
  detail,
}) => {
  const kpis = useMemo(() => APPROVAL_KPI_OPTIONS
    .filter((option) => queueType === 'organizations' || option.id !== 'rejected')
    .map((option) => ({
      ...option,
      value: getApprovalKpiCount(option.id, activeStats),
    })), [activeStats, queueType]);

  const records = useMemo(() => items.map((item) => {
    const projection = getApprovalProjection(item, queueType);
    const TypeIcon = projection.isProvider ? getProviderTypeIcon(projection.meta) : Building2;

    return {
      id: item.id,
      source: item,
      title: projection.primary,
      subtitle: projection.secondary,
      meta: projection.meta,
      trailing: formatAppliedDate(projection.applied),
      statusLabel: getApprovalLabel(projection.statusKey),
      statusClass: getApprovalToneClass(projection.statusKey),
      icon: TypeIcon,
      iconClass: getApprovalToneClass(projection.statusKey),
    };
  }), [items, queueType]);

  const activeFilter = filters.status || 'all';
  const hasFilter = hasVerificationFilter(filters);
  const totalCount = Number(pagination?.totalCount);

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={activeFilter}
      onKpiChange={setStatusFilter}
      kpiPinnedIds={APPROVAL_PINNED_KPI_IDS}
      kpiImportance={APPROVAL_KPI_IMPORTANCE}
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={onSearchCommit}
      searchPlaceholder="Search applicant, email, or facility..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasFilter}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedItem?.id}
      onFocus={onFocus}
      onOpen={onOpenRecord}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      scrollResetKey={pagination?.currentPage}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={emptyState?.heading || 'No applications'}
      emptyBody={emptyState?.body || 'Applications in this scope will appear here.'}
      countLabel={`${Number.isFinite(totalCount) ? totalCount : (activeStats.total || items.length)} applications`}
      toolbarSlot={(
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 items-center rounded-button bg-card/68 p-1 shadow-e1" role="group" aria-label="Approval queue">
            {[
              { id: 'providers', label: 'Providers' },
              { id: 'organizations', label: 'Facilities' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setQueueType?.(option.id)}
                aria-pressed={queueType === option.id}
                className={`relative h-9 rounded-inner px-3 text-xs font-semibold transition-all before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] ${TABLET_FOCUS_RING} ${queueType === option.id
                  ? 'bg-foreground text-background shadow-e1'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      footer={pagination?.totalPages > 1
        ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
        : null}
    />
  );
};

export default TabletApprovals;
