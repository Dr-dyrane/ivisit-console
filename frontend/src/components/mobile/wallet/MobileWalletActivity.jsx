import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { statusPill } from '../../../constants/vitalTracks';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  formatServiceTypeLabel,
  getPaymentDescription,
  isCompletedPayment,
  normalizedValue,
} from '../../pages/wallet/walletPageModel';
import { MobileListRow, SearchRow, UpdatingPillRow } from '../canon';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadMore,
  MobileListLoadingMore,
} from '../MobileListStates';

export const WALLET_ACTIVITY_TABS = [
  { id: 'ledger', label: 'Transactions' },
  { id: 'payments', label: 'Patient payments' },
];

export const WalletActivityTabButtons = ({ activeTab, setActiveTab }) => (
  <>
    {WALLET_ACTIVITY_TABS.map((tab) => {
      const selected = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          onClick={() => setActiveTab(tab.id)}
          aria-selected={selected}
          className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${selected
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </>
);

export const WalletActivityTabs = ({ activeTab, setActiveTab }) => (
  <div
    className="mb-3 grid grid-cols-2 gap-1 rounded-inner bg-muted/20 p-1"
    role="tablist"
    aria-label="Payment activity source"
  >
    <WalletActivityTabButtons activeTab={activeTab} setActiveTab={setActiveTab} />
  </div>
);

export const UnavailableBulkPaymentAction = () => (
  <button
    type="button"
    disabled
    aria-label="Bulk payment actions are unavailable"
    title="Bulk payment actions are unavailable"
    className="flex h-8 w-8 items-center justify-center rounded-button bg-foreground/[0.05] text-muted-foreground opacity-50 dark:bg-white/[0.06]"
  >
    <LockKeyhole className="h-4 w-4" />
  </button>
);

export const MobileWalletActivityRow = ({
  item,
  activeTab,
  wallet,
  formatCurrency,
  selected,
  selectionMode,
  onToggleSelect,
  onLongPress,
  onOpen,
}) => {
  const isLedger = activeTab === 'ledger';
  const paymentStatus = normalizedValue(item.status);
  const isCredit = isLedger ? normalizedValue(item.transaction_type) === 'credit' : isCompletedPayment(item);
  const amount = Math.abs(Number(item.amount || 0));
  const rowCurrency = isLedger ? wallet?.currency : item.currency;
  const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount, rowCurrency)}`;
  const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
  const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
  const secondary = isLedger
    ? signedAmount
    : `${signedAmount} / ${facilityName === 'Hospital unavailable' ? methodLabel : facilityName}`;
  const orbClass = isLedger
    ? isCredit
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'
      : 'bg-foreground/[0.07] text-muted-foreground dark:bg-white/[0.08]'
    : isCredit
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'
      : ['failed', 'declined'].includes(paymentStatus)
        ? 'bg-destructive/10 text-destructive'
        : paymentStatus === 'refunded'
          ? 'bg-sky-500/12 text-sky-700 dark:text-sky-200'
          : 'bg-amber-500/12 text-amber-700 dark:text-amber-200';

  return (
    <MobileListRow
      item={item}
      dataAttr="data-mobile-payment-row"
      onOpen={onOpen}
      ariaLabel={`${isLedger ? 'Transaction' : 'Patient payment'}, ${signedAmount}`}
      orbClass={orbClass}
      icon={isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard}
      title={isLedger ? (item.description || 'Transaction') : getPaymentDescription(item)}
      meta={secondary}
      time={formatRelativeTime(item.created_at)}
      pill={isLedger ? statusPill(item.transaction_type) : statusPill(item.status)}
      selectable
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};

export const MobileWalletActivity = ({
  activeTab,
  controller,
  search,
  onSearchCommit,
  onOpenFilters,
  filterSheetOpen,
  onOpenStats,
  statsOpen,
  isFetching,
  isLoadingMore,
  errorMessage,
  hasLoaded,
  onRefresh,
  loading,
  hasMore,
  onClearFilters,
  tabs,
  selectionBar,
  children,
}) => (
  <section className="px-4">
    {tabs}
    <SearchRow
      placeholder={activeTab === 'ledger' ? 'Search transactions...' : 'Search patient payments...'}
      search={search}
      onSearchCommit={onSearchCommit}
      entityLabel={activeTab === 'ledger' ? 'transactions' : 'patient payments'}
      onOpenFilters={onOpenFilters}
      filterSheetOpen={filterSheetOpen}
      hasFilter={controller.hasFilter}
      onOpenStats={onOpenStats}
      statsOpen={statsOpen}
      statsLabel="Open payment analytics"
    />
    <UpdatingPillRow show={Boolean(isFetching) && !isLoadingMore} />

    {selectionBar}

    {errorMessage && hasLoaded && (
      <div className="mb-4 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
        <p className="text-sm font-semibold">Payments did not refresh</p>
        <p className="mt-1 text-xs opacity-80">Showing the last loaded payment activity.</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 h-9 rounded-inner bg-amber-500/10 px-4 text-xs font-semibold active:scale-[0.96]"
        >
          Try again
        </button>
      </div>
    )}

    {children}

    <div ref={controller.observerTarget} className="flex min-h-[64px] items-center justify-center">
      {isLoadingMore && controller.items.length > 0 && <MobileListLoadingMore />}
      {!loading && !isLoadingMore && hasMore && (
        <MobileListLoadMore armed={controller.armed} onRequest={controller.requestLoad} labelTone="plain" />
      )}
      {!loading && !hasMore && controller.items.length > 0 && (
        <MobileListEnd label="End of loaded payment activity" />
      )}
    </div>

    {!loading && controller.items.length === 0 && (
      <MobileListEmpty
        icon={activeTab === 'ledger' ? History : ShieldCheck}
        label={controller.activeUnavailable
          ? `${activeTab === 'ledger' ? 'Transactions' : 'Patient payments'} unavailable`
          : controller.normalizedSearch
            ? `No matching ${activeTab === 'ledger' ? 'transactions' : 'patient payments'}`
            : controller.hasFilter
              ? `No ${activeTab === 'ledger' ? 'transactions' : 'patient payments'} match these filters`
              : activeTab === 'ledger'
                ? 'No transactions yet'
                : 'No patient payments yet'}
        reason={controller.activeUnavailable
          ? 'error'
          : controller.normalizedSearch
            ? 'search'
            : controller.hasFilter
              ? 'filtered'
              : 'empty'}
        hint={controller.activeUnavailable
          ? 'Retry to load this payment activity.'
          : controller.normalizedSearch
            ? `No loaded activity matches "${search}".`
            : controller.hasFilter
              ? 'Clear filters to view the loaded activity.'
              : 'Payment activity will appear here after it is recorded.'}
        onRecover={controller.activeUnavailable
          ? onRefresh
          : controller.normalizedSearch
            ? () => onSearchCommit('')
            : controller.hasFilter
              ? onClearFilters
              : undefined}
        recoverLabel={controller.activeUnavailable
          ? 'Try Again'
          : controller.normalizedSearch
            ? 'Clear Search'
            : controller.hasFilter
              ? 'Clear Filters'
              : undefined}
        labelTone="plain"
      />
    )}
  </section>
);
