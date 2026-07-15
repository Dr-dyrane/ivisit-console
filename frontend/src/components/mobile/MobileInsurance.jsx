import React from 'react';
import { LockKeyhole, Shield } from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  SearchRow,
  SkeletonGroupList,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadingMore,
  MobileListLoadMore,
} from './MobileListStates';
import { MobileInsuranceAtlasLayer } from './insurance/MobileInsuranceAtlasLayer';
import { MobileInsuranceRow } from './insurance/MobileInsuranceRow';
import { MobileInsuranceDetailSheet } from './insurance/MobileInsuranceDetailSheet';
import { useMobileInsuranceController } from './insurance/useMobileInsuranceController';

// LIST grammar: the page owns a growing server window, while this surface owns only
// presentation state. Policy commands remain unavailable; selection is review-only.
// grammar:loadmore-append=page-owned-growing-window
// ROUTE-OWNED dock FAB: Policy Stats dispatches openInsuranceAnalytics.
export const MobileInsurance = ({
  policies = [],
  filters,
  setFilters,
  onView,
  onRefresh,
  loading = false,
  denied = false,
  error = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  stats,
  count,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  filterSheetOpen = false,
  analyticsOpen = false,
  isFetching = false,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileInsuranceController({
    policies,
    filters,
    stats,
    count,
    loading,
    denied,
    error,
    isFetching,
    hasMore,
    onLoadMore,
    isLoadingMore,
    selectionEnabled,
    selectedIds,
    onSelect,
    warmingUp,
  });
  const handleOpenPolicy = (policy) => controller.setActivePolicy(policy);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileInsuranceAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Insurance"
            noun="policy"
            count={controller.scopeCount}
            summary={controller.headingSummary}
          />

          <MobileKPIStrip
            loading={controller.showTopSectionLoading}
            kpis={controller.kpis}
            activeKpi={controller.activeKpi}
            onKpiClick={(id) => setFilters((previous) => ({ ...previous, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search policy, provider, or plan..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((previous) => ({ ...previous, search: value }))}
              entityLabel="policies"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={controller.hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open analytics"
            />

            <UpdatingPillRow
              show={(controller.refetching || controller.isBuffering) && !controller.showTopSectionLoading}
            />

            <div className="mt-3 space-y-2">
              {controller.selectionActive && (
                <MobileSelectionBar
                  count={controller.selectedIdSet.size}
                  onSelectAll={() => onSelectAll?.(true)}
                  onClear={() => onSelectAll?.(false)}
                >
                  <button
                    type="button"
                    disabled
                    aria-label="Policy changes are unavailable"
                    title="Policy changes are unavailable"
                    className="flex h-8 items-center gap-1 rounded-button bg-foreground/[0.06] px-2 text-[10px] font-semibold text-muted-foreground opacity-50 dark:bg-white/[0.06]"
                  >
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Unavailable
                  </button>
                </MobileSelectionBar>
              )}

              {!denied && error && controller.displayPolicies.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-insurance-degraded-state"
                >
                  <p className="text-sm font-semibold">Insurance did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">
                    Showing the last loaded policy rows.
                  </p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              {controller.showTopSectionLoading ? (
                <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
              ) : !denied ? (
                <div className="space-y-[18px]">
                  {controller.policyGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((policy, index) => (
                        <React.Fragment key={policy.id}>
                          <MobileInsuranceRow
                            policy={policy}
                            onOpen={handleOpenPolicy}
                            selectionActive={controller.selectionActive}
                            selected={controller.selectedIdSet.has(policy.id)}
                            selectionMode={controller.selectionMode}
                            onToggleSelect={(item) => (
                              onSelect?.(item.id, !controller.selectedIdSet.has(item.id))
                            )}
                            onLongPress={(item) => onSelect?.(item.id, true)}
                          />
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              ) : null}

              <div
                ref={controller.observerTarget}
                className="min-h-[64px] flex flex-col items-center justify-center gap-2"
              >
                {isLoadingMore
                  && !controller.showTopSectionLoading
                  && hasMore
                  && controller.displayPolicies.length > 0
                  && <MobileListLoadingMore />}
                {!loading && !isLoadingMore && hasMore && (
                  <MobileListLoadMore
                    armed={controller.armed}
                    onRequest={controller.requestLoad}
                    labelTone="plain"
                  />
                )}
                {!loading && !hasMore && controller.displayPolicies.length > 0 && (
                  <MobileListEnd label="End of policy list" />
                )}
              </div>

              {!loading && !controller.showTopSectionLoading && denied && (
                <MobileListEmpty
                  icon={Shield}
                  label="Insurance access unavailable"
                  reason="empty"
                  hint="This account does not have access to policy records."
                  labelTone="plain"
                />
              )}

              {controller.displayPolicies.length === 0
                && !loading
                && !controller.showTopSectionLoading
                && !denied
                && error && (
                  <MobileListEmpty
                    icon={Shield}
                    label="Policies did not load"
                    reason="error"
                    hint="Something went wrong loading insurance policies."
                    onRecover={onRetry}
                    recoverLabel="Retry"
                    labelTone="plain"
                  />
              )}

              {controller.displayPolicies.length === 0
                && !loading
                && !controller.showTopSectionLoading
                && !denied
                && !error && (
                  <MobileListEmpty
                    icon={Shield}
                    label="No policies found"
                    reason={filters?.search
                      ? 'search'
                      : controller.hasFilter || controller.kpiEmptyCause
                        ? 'filtered'
                        : 'empty'}
                    hint={filters?.search
                      ? `No policies match "${filters.search}".`
                      : controller.hasFilter
                        ? 'Try clearing filters to see the full policy list.'
                        : controller.kpiEmptyCause
                          ? `No policies in the ${controller.activeKpiLabel} scope.`
                          : 'Policy records for this scope will appear here.'}
                    onRecover={filters?.search
                      ? () => setFilters((previous) => ({ ...previous, search: '' }))
                      : controller.hasFilter
                        ? () => setFilters((previous) => ({
                          ...previous,
                          status: [],
                          type: '',
                          verified: '',
                          created_at: { start: '', end: '' },
                        }))
                        : controller.kpiEmptyCause
                          ? () => setFilters((previous) => ({ ...previous, kpiFilter: 'all' }))
                          : undefined}
                    recoverLabel={filters?.search
                      ? 'Clear Search'
                      : controller.hasFilter
                        ? 'Reset Filters'
                        : controller.kpiEmptyCause
                          ? 'Show all policies'
                          : undefined}
                    labelTone="plain"
                  />
              )}
            </div>
          </section>
        </div>

        <MobileInsuranceDetailSheet
          denied={denied}
          activePolicy={controller.activePolicy}
          setActivePolicy={controller.setActivePolicy}
          onView={onView}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
