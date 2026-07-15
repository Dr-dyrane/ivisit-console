import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Eye,
  EyeOff,
  History,
  LockKeyhole,
  Wallet,
} from 'lucide-react';
import { BulkActionBar } from '../common/BulkActionBar';
import { Button } from '../ui/button';
import { PaymentDetailRail } from '../pages/wallet/PaymentDetailRail';
import { usePaymentsDesktopController } from '../pages/wallet/usePaymentsDesktopController';
import {
  formatDateTime,
  getLedgerTotalsProjection,
  titleCase,
} from '../pages/wallet/walletPageModel';
import {
  getPaymentOrbTone,
  getPaymentStatusTone,
} from '../pages/wallet/walletPresentation';
import { TabletCollectionPage } from './TabletCollectionPage';

const TabletWalletMetrics = ({ totals, formatCurrency, showBalance, onToggleBalance }) => {
  const metrics = [
    {
      id: 'balance',
      label: 'Balance',
      value: totals.balanceAvailable && showBalance
        ? formatCurrency(totals.balance, totals.currency)
        : totals.balanceAvailable ? 'Hidden' : 'Unavailable',
      icon: Wallet,
      className: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    },
    {
      id: 'credits',
      label: 'Credits',
      value: totals.ledgerTotalsAvailable
        ? formatCurrency(totals.credits, totals.currency)
        : 'Unavailable',
      icon: ArrowDownLeft,
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    },
    {
      id: 'debits',
      label: 'Debits',
      value: totals.ledgerTotalsAvailable
        ? formatCurrency(totals.debits, totals.currency)
        : 'Unavailable',
      icon: ArrowUpRight,
      className: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" data-tablet-wallet-metrics>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.id} className="min-w-0 rounded-card bg-card/68 px-3 py-2.5 shadow-e1">
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-icon ${metric.className}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {metric.id === 'balance' && totals.balanceAvailable && (
                <button
                  type="button"
                  onClick={onToggleBalance}
                  className="flex h-7 w-7 items-center justify-center rounded-icon text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                  aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                >
                  {showBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <p className="mt-2 truncate text-[10px] font-semibold uppercase text-muted-foreground">{metric.label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">{metric.value}</p>
          </div>
        );
      })}
    </div>
  );
};

const TabletWalletTabs = ({ activeTab, onChange }) => (
  <div className="grid grid-cols-2 gap-1 rounded-inner bg-muted/20 p-1" role="tablist" aria-label="Payment activity source">
    {[
      { id: 'ledger', label: 'Transactions' },
      { id: 'payments', label: 'Patient payments' },
    ].map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        onClick={() => onChange(tab.id)}
        aria-selected={activeTab === tab.id}
        className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.97] ${activeTab === tab.id
          ? 'bg-card text-foreground shadow-e1'
          : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const TabletWallet = ({ controller }) => {
  const [showBalance, setShowBalance] = useState(true);
  const workspace = usePaymentsDesktopController({
    activeTab: controller.activeTab,
    setActiveTab: controller.setActiveTab,
    ledger: controller.ledger,
    payments: controller.payments,
    loadError: controller.loadError,
    search: controller.search,
    filters: controller.activeFilters,
    onPaymentOpen: controller.setSelectedPayment,
  });

  const totals = useMemo(() => getLedgerTotalsProjection({
    wallet: controller.wallet,
    readState: controller.readState,
    financeMetrics: controller.financeMetrics,
    financeMetricsStale: controller.financeMetricsStale,
  }), [
    controller.financeMetrics,
    controller.financeMetricsStale,
    controller.readState,
    controller.wallet,
  ]);

  const records = workspace.activeItems.map((item) => {
    const isPayment = controller.activeTab === 'payments';
    const status = String(item.status || '').toLowerCase();
    const transactionType = String(item.transaction_type || '').toLowerCase();
    const isCredit = isPayment ? status === 'completed' : transactionType === 'credit';
    const amount = controller.formatCurrency(
      Math.abs(Number(item.amount || 0)),
      isPayment ? item.currency : controller.wallet?.currency,
    );
    const patientName = [item.user_details?.first_name, item.user_details?.last_name]
      .filter(Boolean)
      .join(' ');
    return {
      id: item.id,
      source: item,
      title: isPayment
        ? controller.formatPaymentDescription(item)
        : item.description || 'Transaction',
      subtitle: isPayment
        ? patientName || titleCase(controller.formatPaymentMethod(item))
        : titleCase(transactionType || 'transaction'),
      meta: isPayment
        ? `${amount} - ${item.emergency_requests?.hospitals?.name || 'Facility unavailable'}`
        : `${amount}${item.reference_id ? ` - ${item.reference_id}` : ''}`,
      trailing: formatDateTime(item.processed_at || item.updated_at || item.created_at),
      statusLabel: isPayment
        ? titleCase(status || 'unknown')
        : titleCase(transactionType || 'transaction'),
      statusClass: getPaymentStatusTone({ isPayment, status, isCredit }),
      icon: isPayment ? CreditCard : History,
      iconClass: getPaymentOrbTone({ isPayment, status, isCredit }),
    };
  });

  const hasMore = Boolean(controller.hasMore[controller.activeTab]);
  const footer = hasMore ? (
    <button
      type="button"
      onClick={controller.handleLoadMore}
      disabled={controller.loading || controller.isFetching || controller.loadingMore}
      className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {controller.loadingMore ? 'Loading activity...' : 'Load more'}
    </button>
  ) : null;

  const detail = (
    <PaymentDetailRail
      entry={workspace.focusedEntry}
      entryKind={controller.activeTab}
      loading={controller.loading && !controller.hasLoaded}
      wallet={controller.wallet}
      paymentMethods={controller.paymentMethods}
      readState={controller.readState}
      financeMetrics={controller.financeMetrics}
      financeMetricsStale={controller.financeMetricsStale}
      ledgerCount={controller.ledger.length}
      paymentsCount={controller.payments.length}
      onOpenReceipt={controller.setSelectedPayment}
      formatCurrency={controller.formatCurrency}
      formatPaymentMethod={controller.formatPaymentMethod}
      formatPaymentDescription={controller.formatPaymentDescription}
      embedded
    />
  );

  return (
    <>
      <TabletCollectionPage
        detail={detail}
        records={records}
        loading={controller.loading && !controller.hasLoaded}
        isFetching={controller.isFetching || controller.loadingMore}
        error={workspace.failedEmpty ? controller.loadError : null}
        onRetry={controller.fetchData}
        onRefresh={controller.fetchData}
        searchValue={controller.search}
        onSearchCommit={controller.setSearch}
        searchPlaceholder={controller.activeTab === 'ledger' ? 'Search transactions...' : 'Search patient payments...'}
        onOpenFilters={() => controller.setFilterSheetOpen(true)}
        filtersActive={workspace.filtersActive}
        onOpenAnalytics={() => controller.setAnalyticsModalOpen(true)}
        focusedId={workspace.focusedEntry?.id}
        onFocus={workspace.setFocusedId}
        onOpen={workspace.handleOpen}
        selectable
        selectedIds={workspace.selectedIds}
        onToggleSelect={workspace.handleToggleSelect}
        onSelectAll={workspace.handleSelectAll}
        allSelected={workspace.allSelected}
        someSelected={workspace.someSelected}
        emptyTitle={workspace.isNarrowed
          ? `No matching ${workspace.itemNoun}`
          : `No ${workspace.itemNoun} available`}
        emptyBody={workspace.isNarrowed
          ? 'Change your search or filters.'
          : 'Payment activity for this account will appear here.'}
        countLabel={`${workspace.activeItems.length} ${workspace.itemNoun}`}
        footer={footer}
        toolbarSlot={(
          <div className="space-y-2">
            <TabletWalletMetrics
              totals={totals}
              formatCurrency={controller.formatCurrency}
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance((current) => !current)}
            />
            <p className="px-1 text-[10px] font-medium text-muted-foreground">{totals.scopeLabel}</p>
            <TabletWalletTabs activeTab={controller.activeTab} onChange={workspace.handleTabChange} />
            {controller.loadError && controller.hasLoaded && (
              <p className="rounded-inner bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100" role="status">
                {controller.loadError} Current rows remain visible and may be out of date.
              </p>
            )}
          </div>
        )}
      />
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

export default TabletWallet;
