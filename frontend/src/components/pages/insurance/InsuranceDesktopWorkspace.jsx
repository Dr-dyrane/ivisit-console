import React, { useRef } from 'react';
import { Eye, Shield } from 'lucide-react';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import {
  ActivitySheet,
  ListRowShell,
  SheetToolbar,
  SortableColumnHeader,
} from '../../console/ActivitySheet';
import {
  EmptyState,
  LoadErrorState,
  Shimmer,
  StatusPill,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  useListKeyboardNav,
  useScrollResetOnPage,
} from '../../../hooks/useListKeyboardNav';
import { InsuranceDetailRail } from './InsuranceDetailRail';
import {
  buildInsuranceSignal,
  formatInsuranceRowDate,
  getInsurancePolicyPill,
  getInsuranceStateCount,
  hasInsuranceWorkspaceFilter,
  INSURANCE_GRID,
  INSURANCE_STATE_IMPORTANCE,
  INSURANCE_STATE_OPTIONS,
  INSURANCE_TONE_CLASSES,
  SELECTABLE_INSURANCE_GRID,
} from './insurancePresentation';

export const InsuranceDesktopWorkspace = ({
  rows,
  stats,
  denied,
  loading,
  isFetching,
  error,
  filters,
  setFilters,
  filterSheetOpen,
  openFilters,
  retry,
  clearFilters,
  pagination,
  sortConfig,
  onSort,
  focusedPolicy,
  setFocused,
  onView,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  allSelected = false,
  someSelected = false,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listRef = useRef(null);
  const loadError = error;
  const failedEmpty = !denied && Boolean(loadError) && rows.length === 0;
  const active = filters.kpiFilter || 'all';
  const activeCount = getInsuranceStateCount(stats, rows, active);
  const signal = buildInsuranceSignal({ active, activeCount, denied, failedEmpty });
  const hasFilter = hasInsuranceWorkspaceFilter(filters);

  useScrollResetOnPage(listRef, pagination.currentPage);
  const onKeyDown = useListKeyboardNav({
    items: rows,
    focusedItem: focusedPolicy,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listRef,
    rowAttr: 'data-insurance-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/insurance"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <InsuranceDetailRail
          policy={focusedPolicy}
          denied={denied}
          loading={loading}
          hasFilter={hasFilter}
          onView={onView}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={INSURANCE_TONE_CLASSES}>
        <KpiStrip
          options={INSURANCE_STATE_OPTIONS}
          getCount={(id) => getInsuranceStateCount(stats, rows, id)}
          kpiFilter={active}
          setKpiFilter={(id) => setFilters((previous) => ({ ...previous, kpiFilter: id }))}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={['pending', 'unverified']}
          importance={INSURANCE_STATE_IMPORTANCE}
          defaultId="all"
          dataAttr="data-insurance-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="policies"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(search) => setFilters((previous) => ({ ...previous, search }))}
            searchPlaceholder="Search policy, provider, or plan..."
            searchTestId="insurance-sheet-search"
            onRefresh={retry}
            refreshing={isFetching}
            refreshNoun="policies"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={!denied && error && rows.length ? (
          <div className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Insurance did not refresh. Showing the previous results.
          </div>
        ) : null}
      >
        <div
          ref={listRef}
          role="region"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Insurance policies list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          data-testid="insurance-list"
        >
          <div className={`grid ${selectable ? SELECTABLE_INSURANCE_GRID : INSURANCE_GRID} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
            {selectable && (
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={onSelectAll}
                onClick={(event) => event.stopPropagation()}
                aria-label={allSelected ? 'Clear policy selection' : 'Select all visible policies'}
                className="h-4 w-4"
              />
            )}
            <span>Policy</span>
            <span>Provider</span>
            <span>Status</span>
            <SortableColumnHeader
              label="Added"
              sortKey="created_at"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <span className="justify-self-end">Action</span>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, index) => (
                <Shimmer key={index} className="h-[80px] rounded-card" />
              ))}
            </div>
          )}
          {!loading && denied && (
            <EmptyState
              icon={Shield}
              heading="Insurance access unavailable"
              body="This account does not have access to policy records."
            />
          )}
          {!loading && !denied && failedEmpty && (
            <LoadErrorState title="Insurance did not load" message={error} onRetry={retry} />
          )}
          {!loading && !denied && !error && pagination.totalCount === 0 && (
            <EmptyState
              icon={Shield}
              heading={hasFilter ? 'No matching policies' : 'No policies'}
              body={hasFilter ? 'Change filters or search again.' : 'Policy records will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold active:scale-95"
                >
                  Show all policies
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && !denied && rows.map((policy) => {
            const pill = getInsurancePolicyPill(policy.status);
            const policyLabel = policy.policy_holder_name
              || policy.policy_number
              || 'Insurance policy';
            const checked = selectedIds.includes(policy.id);
            return (
              <ListRowShell
                key={policy.id}
                id={policy.id}
                dataAttrName="data-insurance-row"
                gridCols={selectable ? SELECTABLE_INSURANCE_GRID : INSURANCE_GRID}
                selected={focusedPolicy?.id === policy.id}
                onFocus={() => setFocused(policy.id)}
                onOpen={() => onView(policy)}
              >
                {selectable && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => onToggleSelect?.(policy.id, value)}
                    onClick={(event) => {
                      onSelectClick?.(event);
                      event.stopPropagation();
                    }}
                    aria-label={checked ? `Deselect ${policyLabel}` : `Select ${policyLabel}`}
                    className="h-4 w-4"
                  />
                )}
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${pill.className}`}>
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">
                      {policy.policy_holder_name || 'Unnamed holder'}
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {policy.policy_number || 'No policy number'}
                    </div>
                  </div>
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {policy.provider_name || 'Unknown provider'}
                </span>
                <StatusPill label={pill.label} className={pill.className} compact />
                <span className="text-sm text-muted-foreground">
                  {formatInsuranceRowDate(policy.created_at)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onView(policy);
                  }}
                  className="h-8 w-8 justify-self-end rounded-pill bg-background/45 text-muted-foreground hover:bg-foreground hover:text-background"
                  aria-label="View policy"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </ListRowShell>
            );
          })}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};
