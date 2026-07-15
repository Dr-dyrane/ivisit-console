import React, { useMemo } from 'react';
import { Headphones, Trash2 } from 'lucide-react';
import { BulkActionBar } from '../common/BulkActionBar';
import {
  formatSupportDate,
  getSupportPriorityMeta,
  getSupportStateCount,
  getSupportStatusMeta,
  hasActiveSupportFilters,
  SUPPORT_KPI_OPTIONS,
} from '../pages/support/supportTicketsModel';
import { TabletCollectionPage } from './TabletCollectionPage';
import { Button } from '../ui/button';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletSupport = ({
  tickets = [],
  stats,
  loading = false,
  isFetching = false,
  errorMessage,
  convergenceMessage,
  filters = {},
  kpiFilter = 'all',
  setKpiFilter,
  focusedTicket,
  onFocus,
  onView,
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
  detail,
}) => {
  const kpis = useMemo(() => SUPPORT_KPI_OPTIONS.map((option) => ({
    ...option,
    value: getSupportStateCount({ id: option.id, stats, tickets }),
  })), [stats, tickets]);

  const records = useMemo(() => tickets.map((ticket) => {
    const status = getSupportStatusMeta(ticket.status);
    const priority = getSupportPriorityMeta(ticket.priority);

    return {
      id: ticket.id,
      source: ticket,
      title: ticket.subject || 'Untitled request',
      subtitle: ticket.message || ticket.category || 'No message was added',
      meta: `${priority.label} priority`,
      trailing: formatSupportDate(ticket.created_at),
      statusLabel: status.label,
      statusClass: status.tone,
      icon: Headphones,
      iconClass: status.tone,
    };
  }), [tickets]);

  const totalCount = Number(pagination?.totalCount);
  const hasFilter = hasActiveSupportFilters(filters, kpiFilter);

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={onSearchCommit}
      searchPlaceholder="Search requests, messages, or category..."
      onOpenFilters={onOpenFilters}
      filtersActive={filterSheetOpen || hasFilter}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedTicket?.id}
      onFocus={onFocus}
      onOpen={onView}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={hasFilter ? 'No matching requests' : 'No support requests'}
      emptyBody={hasFilter
        ? 'Change the current filters or search again.'
        : 'Support requests in this scope will appear here.'}
      countLabel={`${Number.isFinite(totalCount) ? totalCount : tickets.length} requests`}
      toolbarSlot={convergenceMessage ? (
        <p className="truncate text-xs font-medium text-amber-700 dark:text-amber-200">
          {convergenceMessage}
        </p>
      ) : null}
      footer={pagination?.totalPages > 1
        ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
        : null}
    />
  );
};

export const TabletSupportBulkActions = ({
  selectable,
  selectedIds = [],
  onClear,
  canManage,
  onDelete,
  deletePending = false,
}) => {
  if (!selectable) return null;

  return (
    <BulkActionBar selectedCount={selectedIds.length} onClear={onClear}>
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={selectedIds.length === 0 || deletePending}
          aria-busy={deletePending}
          className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-[0.96] disabled:opacity-40"
          title="Delete selected"
          aria-label={`Delete ${selectedIds.length} selected ticket${selectedIds.length === 1 ? '' : 's'}`}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      )}
    </BulkActionBar>
  );
};

export default TabletSupport;
