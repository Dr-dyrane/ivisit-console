import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import {
  getApprovalLabel,
  getApprovalToneClass,
} from '../../constants/verificationStatus';
import {
  APPROVAL_KPI_OPTIONS,
  getApprovalKpiCount,
  getProviderTypeIcon,
} from '../pages/verification/approvalPresentation';
import {
  formatAppliedDate,
  getApprovalProjection,
  hasVerificationFilter,
} from '../pages/verification/verificationQueueModel';
import { TabletCollectionPage } from './TabletCollectionPage';
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
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={onSearchCommit}
      searchPlaceholder="Search applicant, email, or facility..."
      onOpenFilters={onOpenFilters}
      filtersActive={filterSheetOpen || hasFilter}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedItem?.id}
      onFocus={onFocus}
      onOpen={onOpenRecord}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={emptyState?.heading || 'No applications'}
      emptyBody={emptyState?.body || 'Applications in this scope will appear here.'}
      countLabel={`${Number.isFinite(totalCount) ? totalCount : (activeStats.total || items.length)} applications`}
      toolbarSlot={(
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 items-center rounded-button bg-card/68 p-1 shadow-e1" role="group" aria-label="Approval queue">
            {[
              { id: 'providers', label: 'Providers' },
              { id: 'organizations', label: 'Facilities' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setQueueType?.(option.id)}
                aria-pressed={queueType === option.id}
                className={`h-8 rounded-inner px-3 text-xs font-semibold transition-all ${queueType === option.id
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
