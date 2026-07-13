import React, { useMemo } from 'react';
import { AlertCircle, History, LockKeyhole, ShieldCheck, Wallet } from 'lucide-react';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { Button } from '../../ui/button';
import { BulkActionBar } from '../../common/BulkActionBar';
import { ActivitySheet } from '../../console/ActivitySheet';
import { SignalPanel } from '../../console/SignalPanel';
import { EmptyState, ErrorBanner, LoadErrorState, SkeletonRows } from '../../console/primitives';
import { useWayfindingNav, WorkspaceStage } from '../../console/WorkspaceStage';
import { PaymentDetailRail } from './PaymentDetailRail';
import { PaymentRow, PaymentsListHeader, PaymentsToolbar } from './PaymentsActivity';
import { PaymentsMetrics } from './PaymentsMetrics';
import { getPaymentSignal } from './walletPageModel';
import { paymentToneClass } from './walletPresentation';
import { usePaymentsDesktopController } from './usePaymentsDesktopController';

const paymentSignalIcons = {
  'load-error': AlertCircle,
  'refresh-error': AlertCircle,
  empty: Wallet,
  ready: ShieldCheck,
};

export const PaymentsDesktopWorkspace = ({
  loading,
  wallet,
  ledger,
  payments,
  paymentMethods,
  readState,
  financeMetrics,
  financeMetricsStale,
  loadError,
  hasLoaded,
  isFetching,
  roleKind,
  activeTab,
  setActiveTab,
  fetchData,
  onPaymentOpen,
  formatCurrency,
  formatPaymentMethod,
  formatPaymentDescription,
  search,
  onSearchCommit,
  filters,
  filterSheetOpen,
  onOpenFilters,
}) => {
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
  const signalProjection = getPaymentSignal({ loadError, hasLoaded, wallet, ledger, payments });
  const signal = {
    ...signalProjection,
    icon: paymentSignalIcons[signalProjection.kind],
  };
  const workspace = usePaymentsDesktopController({
    activeTab,
    setActiveTab,
    ledger,
    payments,
    loadError,
    search,
    filters,
    onPaymentOpen,
  });

  return (
    <>
      <WorkspaceStage
        moduleRailItems={moduleRailItems}
        activePath="/wallet"
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
        rail={(
          <PaymentDetailRail
            entry={workspace.focusedEntry}
            entryKind={activeTab}
            loading={loading}
            wallet={wallet}
            paymentMethods={paymentMethods}
            readState={readState}
            financeMetrics={financeMetrics}
            financeMetricsStale={financeMetricsStale}
            ledgerCount={ledger.length}
            paymentsCount={payments.length}
            onOpenReceipt={onPaymentOpen}
            formatCurrency={formatCurrency}
            formatPaymentMethod={formatPaymentMethod}
            formatPaymentDescription={formatPaymentDescription}
          />
        )}
      >
        <SignalPanel signal={signal} loading={loading} toneClassMap={paymentToneClass}>
          <PaymentsMetrics
            loading={loading}
            wallet={wallet}
            readState={readState}
            financeMetrics={financeMetrics}
            financeMetricsStale={financeMetricsStale}
          />
        </SignalPanel>

        <ActivitySheet
          loading={loading}
          isFetching={isFetching}
          failedEmpty={workspace.failedEmpty}
          pagination={workspace.pagination}
          itemNoun={workspace.itemNoun}
          loadingLabel="Loading payment records"
          toolbar={(
            <PaymentsToolbar
              activeTab={activeTab}
              setActiveTab={workspace.handleTabChange}
              loading={loading}
              isFetching={isFetching}
              onRefresh={fetchData}
              search={search}
              onSearchCommit={onSearchCommit}
              filters={filters}
              filterSheetOpen={filterSheetOpen}
              onOpenFilters={onOpenFilters}
            />
          )}
          errorBanner={loadError && !workspace.failedEmpty ? (
            <ErrorBanner
              title="Payments refresh failed"
              message={`${loadError} Current rows remain visible and may be out of date.`}
              onRetry={fetchData}
              testId="payments-error-state"
            />
          ) : null}
        >
          <div
            ref={workspace.listScrollRef}
            role="region"
            tabIndex={0}
            onKeyDown={workspace.handleListKeyDown}
            aria-label={activeTab === 'ledger' ? 'Transaction history list' : 'Patient payments list'}
            style={{ outline: 'none' }}
            className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          >
            {loading && <SkeletonRows />}
            {!loading && workspace.failedEmpty && (
              <LoadErrorState title="Payments did not load" message={loadError} onRetry={fetchData} />
            )}
            {!loading && !workspace.failedEmpty && (
              <>
                <PaymentsListHeader
                  sortConfig={workspace.sortConfig}
                  onSort={workspace.handleSort}
                  allSelected={workspace.allSelected}
                  someSelected={workspace.someSelected}
                  onSelectAll={workspace.handleSelectAll}
                />
                {workspace.activeItems.length === 0 && (
                  <EmptyState
                    icon={History}
                    heading={workspace.isNarrowed
                      ? `No matching ${activeTab === 'ledger' ? 'transactions' : 'patient payments'}`
                      : activeTab === 'ledger' ? 'No transactions available' : 'No patient payments available'}
                    body={workspace.isNarrowed
                      ? 'Change your search or filters.'
                      : 'No records are available in this tab for the current account.'}
                  />
                )}
                {workspace.activeItems.map((item) => (
                  <PaymentRow
                    key={item.id}
                    item={item}
                    activeTab={activeTab}
                    selected={workspace.focusedEntry?.id === item.id}
                    checked={workspace.selectedIds.includes(item.id)}
                    onFocus={() => workspace.setFocusedId(item.id)}
                    onOpen={() => workspace.handleOpen(item)}
                    onToggleSelect={workspace.handleToggleSelect}
                    onSelectClick={workspace.handleSelectClick}
                    formatCurrency={formatCurrency}
                    formatPaymentMethod={formatPaymentMethod}
                    formatPaymentDescription={formatPaymentDescription}
                  />
                ))}
              </>
            )}
          </div>
        </ActivitySheet>
      </WorkspaceStage>
      <BulkActionBar selectedCount={workspace.selectedIds.length} onClear={workspace.clearSelection}>
        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-50"
          title="Bulk payment actions are unavailable"
          aria-label="Bulk payment actions are unavailable"
        >
          <LockKeyhole className="h-5 w-5" />
        </Button>
      </BulkActionBar>
    </>
  );
};
