import React from 'react';
import { Headphones } from 'lucide-react';
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
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadMore,
  MobileListLoadingMore,
} from './MobileListStates';
import {
  MobileSupportAtlasLayer,
  MobileSupportNotices,
  MobileSupportTicketDetailSheet,
  MobileSupportTicketRow,
} from './support/MobileSupportTicketsView';
import { useMobileSupportTicketsController } from './support/useMobileSupportTicketsController';
import { EMPTY_TICKET_IDS } from './support/mobileSupportModel';

// grammar:loadmore-append=page-keyed-accumulator

export {
  createMobileSupportAccumulator,
  pruneSupportTicketIdsFromCache,
  reconcileMobileSupportAccumulator,
} from './support/mobileSupportModel';

/**
 * Compatibility entry point for the Support mobile route. The wrapper retains the canon page
 * grammar while Support-owned model, controller, row, notice, and detail modules carry behavior.
 */
export const MobileSupportTickets = ({
  tickets = [],
  stats,
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onAssign,
  canAssign = false,
  canEditTicket,
  onRefresh,
  canManage = false,
  loading = false,
  isFetching = false,
  errorMessage = null,
  convergenceMessage = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore = false,
  onLoadMore,
  currentPage = 1,
  confirmedDeletedTicketIds = EMPTY_TICKET_IDS,
}) => {
  const {
    activeKpi,
    activeTicket,
    armed,
    displayTickets,
    editAllowed,
    hasFilter,
    isBuffering,
    observerTarget,
    refetching,
    requestLoad,
    scopeCount,
    setActiveTicket,
    ticketGroups,
    ticketKPIs,
  } = useMobileSupportTicketsController({
    tickets,
    stats,
    filters,
    canEditTicket,
    canManage,
    hasMore,
    loading,
    isFetching,
    onLoadMore,
    currentPage,
    confirmedDeletedTicketIds,
  });
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayTickets.length === 0);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileSupportAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Support"
            noun="request"
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && displayTickets.length === 0}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={ticketKPIs}
            activeKpi={activeKpi}
            onKpiClick={(id) => setFilters((prev) => ({ ...prev, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search support"
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((prev) => ({ ...prev, search: value }))}
              entityLabel="support requests"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open support analytics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              <MobileSupportNotices
                convergenceMessage={convergenceMessage}
                errorMessage={errorMessage}
                hasRows={displayTickets.length > 0}
                onRetry={onRetry}
              />

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {ticketGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((ticket, index) => (
                        <React.Fragment key={ticket.id}>
                          <MobileSupportTicketRow ticket={ticket} onOpen={setActiveTicket} />
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                {refetching && !showTopSectionLoading && hasMore && displayTickets.length > 0 && <MobileListLoadingMore />}
                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                {!loading && !hasMore && displayTickets.length > 0 && <MobileListEnd label="End of support queue" />}
              </div>

              {displayTickets.length === 0 && !loading && !showTopSectionLoading && (
                <MobileListEmpty
                  icon={Headphones}
                  label={errorMessage ? 'Support did not load' : 'No support requests'}
                  reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the queue as clear.'
                    : filters?.search
                      ? `No support requests match "${filters.search}".`
                      : hasFilter
                        ? 'Try clearing filters to see the full queue.'
                        : 'Use New ticket when you need support.'}
                  onRecover={!errorMessage && (filters?.search || hasFilter)
                    ? () => setFilters((prev) => ({ ...prev, search: '', kpiFilter: 'all', status: [], priority: [], category: [] }))
                    : undefined}
                  recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileSupportTicketDetailSheet
          activeTicket={activeTicket}
          canAssign={canAssign}
          canManage={canManage}
          editAllowed={editAllowed}
          onAssign={onAssign}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
          setActiveTicket={setActiveTicket}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
