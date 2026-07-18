import React from 'react';
import { ActivitySheet, SheetToolbar } from '../../console/ActivitySheet';
import { KpiStrip } from '../../console/KpiStrip';
import { SignalPanel } from '../../console/SignalPanel';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SupportDetailRail } from './SupportDetailRail';
import { SupportTicketList } from './SupportTicketList';
import {
  PINNED_SUPPORT_KPI_IDS,
  SUPPORT_KPI_IMPORTANCE,
  SUPPORT_KPI_OPTIONS,
  SUPPORT_TONE_CLASS,
  getSupportSignal,
  getSupportStateCount,
} from './supportTicketsModel';

export const SupportDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  convergenceMessage,
  isProviderOnly,
  canCreate,
  canManage,
  canAssign,
  canEditTicket,
  assignPending,
  deletePending,
  focusedTicket,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onCreate,
  faqs,
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getSupportSignal({ stats, tickets: items, kpiFilter, isProviderOnly, loadError, hasAny });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/support-tickets"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <SupportDetailRail
          ticket={focusedTicket}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={focusedTicket ? canEditTicket(focusedTicket) : false}
          canManage={canManage}
          canAssign={canAssign}
          canCreate={canCreate}
          assignPending={assignPending}
          deletePending={deletePending}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssign={onAssign}
          onCreate={onCreate}
          faqs={faqs}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={SUPPORT_TONE_CLASS}>
        <KpiStrip
          options={SUPPORT_KPI_OPTIONS}
          getCount={(id) => getSupportStateCount({ id, stats, tickets: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_SUPPORT_KPI_IDS}
          importance={SUPPORT_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-support-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="requests"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search support by subject or message..."
            searchTestId="support-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="support"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <SupportTicketList
          activeActionFeedback={activeActionFeedback}
          allSelected={allSelected}
          assignPending={assignPending}
          canAssign={canAssign}
          canCreate={canCreate}
          canEditTicket={canEditTicket}
          canManage={canManage}
          convergenceMessage={convergenceMessage}
          deletePending={deletePending}
          focusedTicket={focusedTicket}
          hasFilter={hasFilter}
          items={items}
          kpiFilter={kpiFilter}
          loadError={loadError}
          loading={loading}
          onAssign={onAssign}
          onClearFilters={onClearFilters}
          onCreate={onCreate}
          onDelete={onDelete}
          onEdit={onEdit}
          onRetry={onRetry}
          onSelectAll={onSelectAll}
          onSelectClick={onSelectClick}
          onSort={onSort}
          onToggleSelect={onToggleSelect}
          onView={onView}
          pagination={pagination}
          selectable={selectable}
          selectedIds={selectedIds}
          setFocused={setFocused}
          someSelected={someSelected}
          sortConfig={sortConfig}
        />
      </ActivitySheet>
    </WorkspaceStage>
  );
};
