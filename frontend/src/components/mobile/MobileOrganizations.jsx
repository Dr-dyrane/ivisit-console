import React from 'react';
import { Building2, Trash2 } from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  SearchRow,
  SkeletonGroupPanel,
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
import { MobileOrganizationDetailSheet } from './organizations/MobileOrganizationDetailSheet';
import { MobileOrganizationRow } from './organizations/MobileOrganizationRow';
import { MobileOrganizationsAtlasLayer } from './organizations/MobileOrganizationsAtlasLayer';
import { useMobileOrganizationsController } from './organizations/useMobileOrganizationsController';

// grammar:loadmore-append=useMobileOrganizationsController-owns-the-id-keyed-accumulator
export const MobileOrganizations = ({
  organizations = [],
  statistics = null,
  filters = {},
  setFilters,
  onView,
  onRefresh,
  loading = false,
  isFetching = false,
  isPlaceholderData = false,
  errorMessage = null,
  onRetry,
  onOpenFilters,
  filterSheetOpen = false,
  onViewAnalytics,
  analyticsOpen = false,
  selectionEnabled = false,
  hasMore = false,
  onLoadMore,
  page = 1,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileOrganizationsController({
    organizations,
    statistics,
    filters,
    selectionEnabled,
    hasMore,
    onLoadMore,
    page,
    loading,
    isFetching,
    isPlaceholderData,
    warmingUp,
  });
  const {
    observerTarget,
    activeOrganization,
    setActiveOrganization,
    busy,
    armed,
    requestLoad,
    displayOrganizations,
    isBuffering,
    showTopSectionLoading,
    organizationKPIs,
    activeKpi,
    scopeCount,
    hasFilter,
    selectedIds,
    selectedIdSet,
    selectionMode,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    organizationGroups,
    handleCopyOrganizationId,
  } = controller;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileOrganizationsAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Organizations"
            noun="organization"
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && displayOrganizations.length === 0}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={organizationKPIs}
            activeKpi={activeKpi}
            onKpiClick={(id) => setFilters((current) => ({ ...current, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search organizations..."
              search={filters.search || ''}
              onSearchCommit={(value) => setFilters((current) => ({ ...current, search: value }))}
              entityLabel="organizations"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open organization analytics"
            />
            <UpdatingPillRow
              show={(isFetching || isBuffering) && !showTopSectionLoading && !isPlaceholderData}
            />

            <div className="mt-3 space-y-2">
              {selectionEnabled && (
                <MobileSelectionBar
                  count={selectedIds.length}
                  onSelectAll={() => handleSelectAll(true)}
                  onClear={clearSelection}
                >
                  <button
                    type="button"
                    disabled
                    aria-label="Bulk organization changes are not available"
                    title="Bulk organization changes are not available"
                    data-state="unavailable"
                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </MobileSelectionBar>
              )}

              {errorMessage && displayOrganizations.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-organizations-degraded-state"
                >
                  <p className="text-sm font-semibold">Organizations did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">
                    Showing the last loaded organization rows.
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

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {organizationGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((organization, index) => (
                        <React.Fragment key={organization.id}>
                          <MobileOrganizationRow
                            organization={organization}
                            selectionEnabled={selectionEnabled}
                            selectedIdSet={selectedIdSet}
                            selectionMode={selectionMode}
                            onToggleSelect={(item) => (
                              handleToggleSelect(item.id, !selectedIdSet.has(item.id))
                            )}
                            onLongPress={(item) => handleToggleSelect(item.id, true)}
                            onOpen={setActiveOrganization}
                          />
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div
                ref={observerTarget}
                className="flex min-h-[64px] flex-col items-center justify-center gap-2"
              >
                {isFetching && page > 1 && hasMore && displayOrganizations.length > 0 && (
                  <MobileListLoadingMore />
                )}
                {!busy && hasMore && (
                  <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
                )}
                {!busy && !hasMore && displayOrganizations.length > 0 && (
                  <MobileListEnd label="End of organization list" />
                )}
              </div>

              {displayOrganizations.length === 0 && !showTopSectionLoading && !isFetching && (
                <MobileListEmpty
                  icon={Building2}
                  label={errorMessage ? 'Organizations did not load' : 'No organizations found'}
                  reason={filters.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the registry as empty.'
                    : filters.search
                      ? `No organizations match "${filters.search}".`
                      : hasFilter
                        ? 'Try clearing filters to see the full registry.'
                        : 'Organizations will appear here when available.'}
                  onRecover={errorMessage
                    ? onRetry
                    : hasFilter
                      ? () => setFilters({ search: '', kpiFilter: 'all' })
                      : undefined}
                  recoverLabel={errorMessage ? 'Try again' : hasFilter ? 'Reset filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileOrganizationDetailSheet
          organization={activeOrganization}
          onClose={() => setActiveOrganization(null)}
          onView={onView}
          onCopyId={handleCopyOrganizationId}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};

export default MobileOrganizations;
