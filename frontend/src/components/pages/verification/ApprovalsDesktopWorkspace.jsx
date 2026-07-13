import React from 'react';
import { Building2, FileCheck, Shield } from 'lucide-react';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import { ActivitySheet, ListRowShell, SheetToolbar } from '../../console/ActivitySheet';
import {
  EmptyState,
  LoadErrorState,
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { getAvatarFallback } from '../../../lib/avatarUtils';
import {
  getApprovalIcon,
  getApprovalLabel,
  getApprovalToneClass,
} from '../../../constants/verificationStatus';
import {
  formatAppliedDate,
  getApprovalProjection,
  getFacilityInitials,
} from './verificationQueueModel';
import {
  APPROVAL_GRID_COLS,
  APPROVAL_GRID_COLS_SELECT,
  APPROVAL_KPI_IMPORTANCE,
  APPROVAL_KPI_OPTIONS,
  APPROVAL_PINNED_KPI_IDS,
  APPROVAL_TONE_CLASS,
  getApprovalKpiCount,
  getApprovalSignal,
  getProviderTypeIcon,
} from './approvalPresentation';
import { ApprovalDetailRail } from './ApprovalDetailRail';

const ApprovalQueueToggle = ({ queueType, setQueueType }) => {
  const tabClass = (value) => `rounded-pill px-4 py-1.5 text-sm font-semibold transition-all active:scale-[0.96] ${
    queueType === value
      ? 'bg-card text-foreground shadow-e2 dark:bg-white/[0.10]'
      : 'text-muted-foreground hover:text-foreground'
  }`;

  return (
    <div className="flex w-fit items-center gap-1 rounded-pill bg-muted/30 p-1" role="tablist" aria-label="Approval queue">
      <button
        type="button"
        role="tab"
        aria-selected={queueType === 'providers'}
        data-testid="approval-tab-providers"
        onClick={() => setQueueType('providers')}
        className={tabClass('providers')}
      >
        Providers
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={queueType === 'organizations'}
        data-testid="approval-tab-facilities"
        onClick={() => setQueueType('organizations')}
        className={tabClass('organizations')}
      >
        Facilities
      </button>
    </div>
  );
};

const ApprovalListHeader = ({
  queueType,
  selectable,
  allSelected,
  someSelected,
  onSelectAll,
  timeHeader,
}) => (
  <div className={`grid ${selectable ? APPROVAL_GRID_COLS_SELECT : APPROVAL_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : `Select all ${queueType === 'providers' ? 'providers' : 'facilities'}`}
        className="h-4 w-4"
      />
    )}
    <span>{queueType === 'providers' ? 'Applicant' : 'Facility'}</span>
    <span>Status</span>
    <span>{queueType === 'providers' ? 'Role' : 'Type'}</span>
    {timeHeader}
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const ApprovalRow = ({
  item,
  queueType,
  selected,
  onFocus,
  onOpen,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
}) => {
  const projection = getApprovalProjection(item, queueType);
  const toneClass = getApprovalToneClass(projection.statusKey);
  const StatusIcon = getApprovalIcon(projection.statusKey);
  const statusLabel = getApprovalLabel(projection.statusKey);
  const MetaIcon = projection.isProvider ? getProviderTypeIcon(projection.meta) : Building2;

  return (
    <ListRowShell
      id={item.id}
      dataAttrName="data-approval-row"
      gridCols={selectable ? APPROVAL_GRID_COLS_SELECT : APPROVAL_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onOpen(item)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(item.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.primary}` : `Select ${projection.primary}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        {projection.isProvider ? (
          <Avatar className="h-11 w-11 shrink-0 rounded-pill shadow-sm">
            <AvatarImage src={projection.avatarUrl || undefined} />
            <AvatarFallback className="rounded-pill bg-amber-500/10 text-sm font-semibold text-amber-700 dark:text-amber-200">
              {getAvatarFallback(item)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sm font-semibold text-sky-700 dark:text-sky-200">
            {getFacilityInitials(projection.primary)}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.primary}>{projection.primary}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={projection.secondary}>{projection.secondary}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={statusLabel} icon={StatusIcon} className={toneClass} compact />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
          <MetaIcon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium capitalize" title={projection.meta}>{projection.meta}</span>
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatAppliedDate(projection.applied)}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(item);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
      >
        Review
      </Button>
    </ListRowShell>
  );
};

export const ApprovalsDesktopWorkspace = ({
  queueType,
  setQueueType,
  items,
  activeStats,
  loading,
  isFetching,
  loadError,
  canReview,
  canApprove,
  actionLoading,
  focusedItem,
  setFocusedId,
  filters,
  setStatusFilter,
  setSearchFilter,
  hasFilter,
  emptyState,
  filterSheetOpen,
  openFilters,
  onRetry,
  pagination,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onOpenRecord,
  onApprove,
  onReject,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  listScrollRef,
  onListKeyDown,
  timeHeader,
}) => {
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const activeId = filters.status || 'pending';
  const signal = getApprovalSignal({ queueType, activeStats, activeId, loadError, hasAny });
  const noun = queueType === 'providers' ? 'providers' : 'facilities';
  const kpiPool = queueType === 'providers'
    ? APPROVAL_KPI_OPTIONS.filter((option) => option.id !== 'rejected')
    : APPROVAL_KPI_OPTIONS;

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/verification"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <ApprovalDetailRail
          item={focusedItem}
          queueType={queueType}
          canApprove={canApprove}
          actionLoading={actionLoading}
          loading={loading}
          hasFilter={hasFilter}
          onOpen={onOpenRecord}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    >
      <ApprovalQueueToggle queueType={queueType} setQueueType={setQueueType} />

      <SignalPanel signal={signal} loading={loading} toneClassMap={APPROVAL_TONE_CLASS}>
        <KpiStrip
          options={kpiPool}
          getCount={(id) => getApprovalKpiCount(id, activeStats)}
          kpiFilter={activeId}
          setKpiFilter={setStatusFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={APPROVAL_PINNED_KPI_IDS}
          importance={APPROVAL_KPI_IMPORTANCE}
          defaultId="pending"
          dataAttr="data-approval-kpi"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun={noun}
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder={queueType === 'providers' ? 'Search applicants...' : 'Search facilities...'}
            searchTestId="approvals-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun={noun}
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          role="list"
          tabIndex={0}
          onKeyDown={onListKeyDown}
          aria-label={`${queueType === 'providers' ? 'Provider' : 'Facility'} approvals list`}
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <ApprovalListHeader
            queueType={queueType}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            timeHeader={timeHeader}
          />

          {loading && <SkeletonRows />}

          {!loading && !canReview && (
            <EmptyState icon={Shield} heading="Access restricted" body="This role cannot open Approvals." />
          )}

          {!loading && canReview && loadError && items.length === 0 && (
            <LoadErrorState title="Approvals did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && canReview && !loadError && items.length === 0 && (
            <EmptyState icon={FileCheck} heading={emptyState.heading} body={emptyState.body}>
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setStatusFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all {noun}
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && canReview && items.length > 0 && items.map((item) => (
            <ApprovalRow
              key={item.id}
              item={item}
              queueType={queueType}
              selected={focusedItem?.id === item.id}
              onFocus={() => setFocusedId(item.id)}
              onOpen={onOpenRecord}
              selectable={selectable}
              checked={selectedIds.includes(item.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};
