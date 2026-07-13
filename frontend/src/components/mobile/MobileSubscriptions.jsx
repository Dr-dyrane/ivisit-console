import React from 'react';
import { AlertTriangle, Crown, Mail, MailX, Users } from 'lucide-react';
// LIST-type page, DIRECTORY expression. Subscriber writes and email commands remain fail-closed;
// visible selection changes local state only and its bulk command stays disabled.
// grammar:loadmore-append=page-owns-settled-page-accumulator
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupList } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEnd,
  MobileListEmpty,
  MobileListLoadMore,
  MobileListLoadingMore,
} from './MobileListStates';
import { resolveVital } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { MobileSubscriptionDetailSheet } from './subscriptions/MobileSubscriptionDetailSheet';
import { MobileSubscriptionsAtlasLayer } from './subscriptions/MobileSubscriptionsAtlasLayer';
import {
  normalizeSubscriptionStatus,
  planLabel,
  subscriptionOrbClass,
} from './subscriptions/mobileSubscriptionModel';
import { useMobileSubscriptionsController } from './subscriptions/useMobileSubscriptionsController';

export const MobileSubscriptions = ({
  subscribers = [],
  stats,
  statsUnavailable = false,
  filters,
  setFilters,
  onView,
  onRefresh,
  canManage = false,
  loading = false,
  isFetching = false,
  errorMessage = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  analyticsOpen = false,
  actionNotice = '',
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  hasMore = false,
  onLoadMore,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileSubscriptionsController({
    subscribers,
    stats,
    filters,
    loading,
    isFetching,
    hasMore,
    onLoadMore,
    canManage,
    selectionEnabled,
    selectedIds,
    onSelect,
    warmingUp,
  });

  const renderSubscriberRow = (subscriber) => {
    const status = normalizeSubscriptionStatus(subscriber);
    const paid = subscriber.type === 'paid';
    const vital = resolveVital('subscription', status);
    const welcomed = controller.welcomeEmailDistributes && subscriber.welcome_email_sent === true;

    return (
      <MobileListRow
        item={subscriber}
        dataAttr="data-mobile-subscription-row"
        onOpen={controller.setActiveSubscriber}
        ariaLabel={`${subscriber.email || 'Subscriber'}, ${vital?.pill?.label || status}`}
        orbClass={subscriptionOrbClass(status)}
        icon={paid ? Crown : Mail}
        title={subscriber.email || 'No email'}
        meta={`${planLabel(subscriber.type)} plan`}
        time={formatRelativeTime(subscriber.subscription_date || subscriber.created_at)}
        markerChip={welcomed ? 'Welcome' : null}
        pill={vital?.pill}
        selectable={controller.selectionActive}
        selected={controller.selectedIdSet.has(subscriber.id)}
        selectionMode={controller.selectionMode}
        onToggleSelect={(item) => onSelect?.(item.id, !controller.selectedIdSet.has(item.id))}
        onLongPress={(item) => onSelect?.(item.id, true)}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileSubscriptionsAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Subscribers"
            noun="subscriber"
            count={controller.scopeCount}
            showSkeleton={controller.showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && controller.displaySubscribers.length === 0}
          />

          <MobileKPIStrip
            loading={controller.showTopSectionLoading}
            kpis={controller.subscriberKPIs}
            activeKpi={controller.activeKpi}
            onKpiClick={(id) => setFilters((previous) => ({ ...previous, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search subscribers..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((previous) => ({ ...previous, search: value }))}
              entityLabel="subscribers"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={controller.hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open subscriber analytics"
            />

            <UpdatingPillRow
              show={(controller.refetching || controller.isBuffering) && !controller.showTopSectionLoading}
            />

            {statsUnavailable && (
              <p
                className="mt-3 flex items-start gap-2 rounded-inner bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-100"
                role="status"
                aria-live="polite"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Subscriber statistics are unavailable. Counts use the loaded rows; the list remains current.</span>
              </p>
            )}

            {actionNotice && (
              <p
                id="subscriptions-action-feedback"
                className="mt-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {actionNotice}
              </p>
            )}

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
                    aria-label="Bulk subscriber changes unavailable"
                    title="Bulk subscriber changes unavailable"
                    className="flex h-8 w-8 items-center justify-center rounded-button bg-foreground/[0.06] text-muted-foreground opacity-50 dark:bg-white/[0.07]"
                  >
                    <MailX className="h-4 w-4" />
                  </button>
                </MobileSelectionBar>
              )}

              {errorMessage && controller.displaySubscribers.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-subscriptions-degraded-state"
                >
                  <p className="text-sm font-semibold">Subscribers did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">Showing the last loaded subscriber rows.</p>
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
              ) : (
                <div className="space-y-[18px]">
                  {controller.subscriberGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((subscriber, index) => (
                        <React.Fragment key={subscriber.id}>
                          {renderSubscriberRow(subscriber)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div
                ref={controller.observerTarget}
                className="min-h-[64px] flex flex-col items-center justify-center gap-2"
              >
                {controller.refetching && !controller.showTopSectionLoading && hasMore && controller.displaySubscribers.length > 0 && (
                  <MobileListLoadingMore />
                )}
                {!loading && !controller.refetching && hasMore && (
                  <MobileListLoadMore
                    armed={controller.armed}
                    onRequest={controller.requestLoad}
                    labelTone="plain"
                  />
                )}
                {!loading && !controller.refetching && !controller.showTopSectionLoading && !hasMore && controller.displaySubscribers.length > 0 && (
                  <MobileListEnd label="End of subscriber list" />
                )}
              </div>

              {controller.displaySubscribers.length === 0 && !loading && !controller.showTopSectionLoading && (
                <MobileListEmpty
                  icon={Users}
                  label={errorMessage ? 'Subscribers did not load' : 'No subscribers found'}
                  reason={filters?.search ? 'search' : controller.hasFilter || controller.kpiEmptyCause ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the list as empty.'
                    : filters?.search
                      ? `No subscribers match "${filters.search}".`
                      : controller.hasFilter
                        ? 'Try clearing filters to see every subscriber.'
                        : controller.kpiEmptyCause
                          ? `No subscribers in the ${controller.activeKpiLabel} scope.`
                          : 'Subscribers will appear here once they register.'}
                  onRecover={!errorMessage && (filters?.search || controller.hasFilter || controller.kpiEmptyCause)
                    ? () => setFilters((previous) => ({
                      ...previous,
                      search: '',
                      kpiFilter: 'all',
                      status: [],
                      type: [],
                      welcomeEmailSent: '',
                      dateRange: 'all',
                    }))
                    : errorMessage ? onRetry : undefined}
                  recoverLabel={!errorMessage && filters?.search
                    ? 'Clear Search'
                    : !errorMessage && controller.hasFilter
                      ? 'Reset Filters'
                      : !errorMessage && controller.kpiEmptyCause
                        ? 'Show all subscribers'
                        : errorMessage ? 'Try again' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileSubscriptionDetailSheet
          activeSubscriber={controller.activeSubscriber}
          onClose={() => controller.setActiveSubscriber(null)}
          onView={onView}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
