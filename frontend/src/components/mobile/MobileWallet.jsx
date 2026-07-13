import React from 'react';
import { MobilePageShell } from './MobilePageShell';
import { PullToRefresh } from './PullToRefresh';
import { GroupPanel, Hairline, MobileHeading, useSkeletonWarmup } from './canon';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import {
  MobileWalletActivity,
  MobileWalletActivityRow,
  UnavailableBulkPaymentAction,
  WalletActivityTabButtons,
} from './wallet/MobileWalletActivity';
import { getMobileWalletDetailProps } from './wallet/MobileWalletDetail';
import {
  MobileWalletAtlasLayer,
  WalletBalanceVisibilityButton,
  WalletSkeleton,
} from './wallet/MobileWalletHeader';
import { useMobileWalletController } from './wallet/useMobileWalletController';

// HYBRID grammar: the shared list-page heading leads into read-only finance KPIs,
// source tabs, and a Requests-shaped grouped activity feed. Money-moving commands
// remain unavailable and are never inferred from optimistic browser state.
// grammar:skeleton=WalletSkeleton owns the group-shaped loading anatomy.
// grammar:loadmore-append=WalletManagementPage owns the growing server window.
// grammar:search=Search and filters narrow the explicitly loaded route window only.

export const MobileWallet = ({
  loading = false,
  isFetching = false,
  errorMessage = null,
  hasLoaded = false,
  wallet,
  readState = {},
  financeMetrics = null,
  financeMetricsStale = false,
  ledger = [],
  payments = [],
  activeTab = 'ledger',
  setActiveTab,
  search = '',
  onSearchCommit,
  filters = {},
  onOpenFilters,
  filterSheetOpen = false,
  onClearFilters,
  onOpenStats,
  statsOpen = false,
  onRefresh,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onOpenPayment,
  formatCurrency,
}) => {
  const warmingUp = useSkeletonWarmup();
  const showSkeleton = warmingUp || (loading && !hasLoaded);
  const controller = useMobileWalletController({
    loading,
    isFetching,
    wallet,
    readState,
    financeMetrics,
    financeMetricsStale,
    ledger,
    payments,
    activeTab,
    setActiveTab,
    search,
    filters,
    hasMore,
    isLoadingMore,
    onLoadMore,
    formatCurrency,
  });
  const detailProps = getMobileWalletDetailProps({
    activeEntry: controller.activeEntry,
    setActiveEntry: controller.setActiveEntry,
    wallet,
    formatCurrency,
    onOpenPayment,
  });

  const tabs = (
    <div
      className="mb-3 grid grid-cols-2 gap-1 rounded-inner bg-muted/20 p-1"
      role="tablist"
      aria-label="Payment activity source"
    >
      <WalletActivityTabButtons activeTab={activeTab} setActiveTab={controller.handleTabChange} />
    </div>
  );

  const selectionBar = controller.selectionMode ? (
    <div className="mt-3">
      <MobileSelectionBar
        count={controller.selectedIds.length}
        onSelectAll={() => controller.handleSelectAll(true)}
        onClear={controller.clearSelection}
      >
        <UnavailableBulkPaymentAction />
      </MobileSelectionBar>
    </div>
  ) : null;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileWalletAtlasLayer />
        <div className="relative z-10">
          {showSkeleton ? (
            <WalletSkeleton />
          ) : (
            <div className="space-y-3">
              <MobileHeading
                title="Payments"
                noun="payment"
                count={payments.length}
                hideSummary
                trailing={(
                  <WalletBalanceVisibilityButton
                    showBalance={controller.showBalance}
                    setShowBalance={controller.setShowBalance}
                  />
                )}
              >
                <p className="mt-3 text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                  {['ready', 'stale'].includes(readState?.wallet)
                    ? controller.showBalance ? controller.compactBalance : 'Balance hidden'
                    : 'Balance unavailable'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Recorded balance</p>
              </MobileHeading>

              <MobileKPIStrip
                kpis={controller.kpis}
                interactive={false}
                ariaLabel="Wallet ledger totals"
                loading={false}
                loadingCount={2}
                animateOnMount={false}
              />
              <p className="px-4 text-[11px] font-medium text-muted-foreground">
                {controller.ledgerScopeLabel}
              </p>

              <MobileWalletActivity
                activeTab={activeTab}
                controller={controller}
                search={search}
                onSearchCommit={onSearchCommit}
                onOpenFilters={onOpenFilters}
                filterSheetOpen={filterSheetOpen}
                onOpenStats={onOpenStats}
                statsOpen={statsOpen}
                isFetching={isFetching}
                isLoadingMore={isLoadingMore}
                errorMessage={errorMessage}
                hasLoaded={hasLoaded}
                onRefresh={onRefresh}
                loading={loading}
                hasMore={hasMore}
                onClearFilters={onClearFilters}
                tabs={tabs}
                selectionBar={selectionBar}
              >
                <div className="space-y-[18px]">
                  {controller.activityGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <MobileWalletActivityRow
                            item={item}
                            activeTab={activeTab}
                            wallet={wallet}
                            formatCurrency={formatCurrency}
                            selected={controller.selectedIdSet.has(item.id)}
                            selectionMode={controller.selectionMode}
                            onOpen={(entry) => controller.setActiveEntry({ kind: activeTab, item: entry })}
                            onToggleSelect={(entry) => controller.handleToggleSelect(
                              entry.id,
                              !controller.selectedIdSet.has(entry.id),
                            )}
                            onLongPress={(entry) => controller.handleToggleSelect(entry.id, true)}
                          />
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              </MobileWalletActivity>
            </div>
          )}
        </div>

        {detailProps && <MobileDetailSheet {...detailProps} />}
      </MobilePageShell>
    </PullToRefresh>
  );
};

export { MobileWalletActivity } from './wallet/MobileWalletActivity';
export { MobileWalletDetail } from './wallet/MobileWalletDetail';
