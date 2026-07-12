import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Hash,
  History,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupList,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty, MobileListEnd, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';
import { formatRelativeTime } from '../../utils/activityUtils';

// HYBRID grammar: the shared list-page heading leads into read-only finance KPIs,
// source tabs, and a Requests-shaped grouped activity feed. Money-moving commands
// remain unavailable and are never inferred from optimistic browser state.
// grammar:loadmore-append=WalletManagementPage owns the growing server window.
// grammar:search=Search and filters narrow the explicitly loaded route window only.

const readyColor = 'hsl(160 84% 39%)';
const waitingColor = 'hsl(199 89% 48%)';
const neutralColor = 'hsl(215 16% 47%)';

const MobileWalletAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--spark) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(var(--spark) / 0.09), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const formatServiceTypeLabel = (serviceType) => {
  if (!serviceType || typeof serviceType !== 'string') return null;
  return serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatPaymentDescription = (payment) => {
  const serviceLabel = formatServiceTypeLabel(payment?.emergency_requests?.service_type);
  if (serviceLabel) return `${serviceLabel} service`;
  if (payment?.display_id) return `Payment ${payment.display_id}`;
  if (payment?.emergency_request_id) return 'Emergency service payment';
  return 'Service payment';
};

const buildMonthGroups = (items) => {
  const groups = [];
  let current = null;
  groupByMonth(items, (entry) => entry?.created_at).forEach(({ item, header }) => {
    if (header || !current) {
      current = { key: header || 'undated', label: header || 'Date unavailable', items: [] };
      groups.push(current);
    }
    current.items.push(item);
  });
  return groups;
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
};

const matchesDateRange = (value, range = {}) => {
  if (!range.start && !range.end) return true;
  const time = new Date(value || '').getTime();
  if (Number.isNaN(time)) return false;
  const start = range.start ? new Date(`${range.start}T00:00:00`).getTime() : null;
  const end = range.end ? new Date(`${range.end}T23:59:59.999`).getTime() : null;
  return (start === null || time >= start) && (end === null || time <= end);
};

const hasWalletFilters = (filters = {}) => Object.entries(filters).some(([key, value]) => {
  if (key === 'dateRange') return Boolean(value?.start || value?.end);
  return Boolean(value && value !== 'all');
});

const WalletActivityTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'ledger', label: 'Transactions' },
    { id: 'payments', label: 'Patient payments' },
  ];

  return (
    <div
      className="mb-3 grid grid-cols-2 gap-1 rounded-inner bg-muted/20 p-1"
      role="tablist"
      aria-label="Payment activity source"
    >
      {tabs.map((tab) => {
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
    </div>
  );
};

const WalletSkeleton = () => (
  <div className="space-y-3" aria-label="Loading payments">
    <section className="px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-28 rounded-inner bg-muted/25 shimmer" />
        <div className="h-11 w-11 rounded-icon bg-muted/20 shimmer" />
      </div>
      <div className="mt-4 h-9 w-44 rounded-inner bg-muted/25 shimmer" />
      <div className="mt-2 h-4 w-28 rounded-inner bg-muted/20 shimmer" />
    </section>
    <section className="flex gap-2 px-4 py-3">
      <div className="h-9 w-28 rounded-pill bg-muted/20 shimmer" />
      <div className="h-9 w-28 rounded-pill bg-muted/20 shimmer" />
      <div className="h-9 w-32 rounded-pill bg-muted/20 shimmer" />
    </section>
    <section className="px-4">
      <div className="mb-3 h-11 w-full rounded-inner bg-muted/20 shimmer" />
      <div className="mb-3 flex items-center gap-2">
        <div className="h-9 flex-1 rounded-inner bg-muted/20 shimmer" />
        <div className="h-9 w-9 rounded-button bg-muted/20 shimmer" />
        <div className="h-9 w-9 rounded-button bg-muted/20 shimmer" />
      </div>
      <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
    </section>
  </div>
);

export const MobileWallet = ({
  loading = false,
  isFetching = false,
  errorMessage = null,
  hasLoaded = false,
  wallet,
  readState = {},
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
  const observerTarget = useRef(null);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const warmingUp = useSkeletonWarmup();
  const showSkeleton = warmingUp || (loading && !hasLoaded);
  const sourceItems = activeTab === 'ledger' ? ledger : payments;
  const normalizedSearch = search.trim().toLowerCase();
  const hasFilter = hasWalletFilters(filters);
  const items = useMemo(() => sourceItems.filter((item) => {
    if (!matchesDateRange(item.created_at, filters.dateRange)) return false;

    if (activeTab === 'ledger') {
      const transactionType = String(item.transaction_type || '').toLowerCase();
      if (filters.transactionType && filters.transactionType !== 'all' && transactionType !== filters.transactionType) return false;
      if (!normalizedSearch) return true;
      return [
        item.description,
        item.transaction_type,
        item.reference_id,
        item.external_reference,
        item.amount,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    }

    const status = String(item.status || '').toLowerCase();
    const paymentMethod = String(item.payment_method || '').toLowerCase();
    if (filters.status && filters.status !== 'all' && status !== filters.status) return false;
    if (filters.paymentMethod && filters.paymentMethod !== 'all' && paymentMethod !== filters.paymentMethod) return false;
    if (!normalizedSearch) return true;
    return [
      item.display_id,
      item.payment_method,
      item.status,
      item.amount,
      item.user_details?.first_name,
      item.user_details?.last_name,
      item.user_details?.email,
      item.user_details?.phone,
      item.emergency_requests?.service_type,
      item.emergency_requests?.hospitals?.name,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  }), [activeTab, filters, normalizedSearch, sourceItems]);
  const activityGroups = useMemo(() => buildMonthGroups(items), [items]);
  const activeReadState = readState?.[activeTab] || 'unavailable';
  const activeUnavailable = activeReadState !== 'ready';
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || isFetching || isLoadingMore,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) triggerLoad();
    }, { threshold: 0.1, rootMargin: '120px' });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const compactBalance = useMemo(() => {
    const value = Number(wallet?.balance || 0);
    const compact = Math.abs(value) >= 10000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD',
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 0,
    }).format(value);
  }, [wallet?.balance, wallet?.currency]);

  const kpis = useMemo(() => {
    const moneyIn = ledger
      .filter((entry) => String(entry.transaction_type || '').toLowerCase() === 'credit')
      .reduce((total, entry) => total + Math.abs(Number(entry.amount || 0)), 0);
    const moneyOut = ledger
      .filter((entry) => String(entry.transaction_type || '').toLowerCase() === 'debit')
      .reduce((total, entry) => total + Math.abs(Number(entry.amount || 0)), 0);
    const needsReview = payments.filter((payment) => String(payment.status || '').toLowerCase() !== 'completed').length;

    return [
      { id: 'credit', label: 'Credit', value: formatCurrency(moneyIn, wallet?.currency), color: readyColor },
      { id: 'debit', label: 'Debit', value: formatCurrency(moneyOut, wallet?.currency), color: neutralColor },
      { id: 'needs-review', label: 'Needs review', value: needsReview, color: waitingColor },
    ];
  }, [formatCurrency, ledger, payments, wallet?.currency]);

  const renderActivityRow = (item) => {
    const isLedger = activeTab === 'ledger';
    const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
    const amount = Math.abs(Number(item.amount || 0));
    const rowCurrency = isLedger ? wallet?.currency : item.currency;
    const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount, rowCurrency)}`;
    const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
    const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
    const secondary = isLedger
      ? signedAmount
      : `${signedAmount} / ${facilityName === 'Hospital unavailable' ? methodLabel : facilityName}`;

    return (
      <MobileListRow
        item={item}
        dataAttr="data-mobile-payment-row"
        onOpen={(entry) => setActiveEntry({ kind: activeTab, item: entry })}
        ariaLabel={`${isLedger ? 'Transaction' : 'Patient payment'}, ${signedAmount}`}
        orbClass={isCredit
          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'
          : 'bg-sky-500/12 text-sky-700 dark:text-sky-200'}
        icon={isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard}
        title={isLedger ? (item.description || 'Transaction') : formatPaymentDescription(item)}
        meta={secondary}
        time={formatRelativeTime(item.created_at)}
        pill={isLedger ? statusPill(item.transaction_type) : statusPill(item.status)}
      />
    );
  };

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
                <button
                  type="button"
                  onClick={() => setShowBalance((current) => !current)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-muted-foreground transition-colors hover:bg-foreground/[0.06] active:scale-[0.96]"
                  aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                  aria-pressed={!showBalance}
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
            >
              <p className="mt-3 text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                {readState?.wallet === 'ready'
                  ? showBalance ? compactBalance : 'Balance hidden'
                  : 'Balance unavailable'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Recorded balance</p>
            </MobileHeading>

            <MobileKPIStrip
              kpis={kpis}
              interactive={false}
              ariaLabel="Loaded payment KPIs"
              loading={false}
              loadingCount={3}
              animateOnMount={false}
            />

            <section className="px-4">
              <WalletActivityTabs activeTab={activeTab} setActiveTab={setActiveTab} />
              <SearchRow
                placeholder={activeTab === 'ledger' ? 'Search transactions...' : 'Search patient payments...'}
                search={search}
                onSearchCommit={onSearchCommit}
                entityLabel={activeTab === 'ledger' ? 'transactions' : 'patient payments'}
                onOpenFilters={onOpenFilters}
                filterSheetOpen={filterSheetOpen}
                hasFilter={hasFilter}
                onOpenStats={onOpenStats}
                statsOpen={statsOpen}
                statsLabel="Open payment analytics"
              />
              <UpdatingPillRow show={Boolean(isFetching) && !isLoadingMore} />

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

              <div className="space-y-[18px]">
                {activityGroups.map((group) => (
                  <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                    {group.items.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {renderActivityRow(item)}
                        {index < group.items.length - 1 && <Hairline />}
                      </React.Fragment>
                    ))}
                  </GroupPanel>
                ))}
              </div>

              <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                {isLoadingMore && items.length > 0 && <MobileListLoadingMore />}
                {!loading && !isLoadingMore && hasMore && (
                  <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
                )}
                {!loading && !hasMore && items.length > 0 && (
                  <MobileListEnd label="End of loaded payment activity" />
                )}
              </div>

              {!loading && items.length === 0 && (
                <MobileListEmpty
                  icon={activeTab === 'ledger' ? History : ShieldCheck}
                  label={activeUnavailable
                    ? `${activeTab === 'ledger' ? 'Transactions' : 'Patient payments'} unavailable`
                    : normalizedSearch
                      ? `No matching ${activeTab === 'ledger' ? 'transactions' : 'patient payments'}`
                      : hasFilter
                        ? `No ${activeTab === 'ledger' ? 'transactions' : 'patient payments'} match these filters`
                    : activeTab === 'ledger'
                      ? 'No transactions yet'
                      : 'No patient payments yet'}
                  reason={activeUnavailable ? 'error' : normalizedSearch ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={activeUnavailable
                    ? 'Retry to load this payment activity.'
                    : normalizedSearch
                      ? `No loaded activity matches "${search}".`
                      : hasFilter
                        ? 'Clear filters to view the loaded activity.'
                        : 'Payment activity will appear here after it is recorded.'}
                  onRecover={activeUnavailable ? onRefresh : normalizedSearch ? () => onSearchCommit('') : hasFilter ? onClearFilters : undefined}
                  recoverLabel={activeUnavailable ? 'Try Again' : normalizedSearch ? 'Clear Search' : hasFilter ? 'Clear Filters' : undefined}
                  labelTone="plain"
                />
              )}
            </section>
            </div>
          )}
        </div>

        {activeEntry && (() => {
          const { item, kind } = activeEntry;
          const isLedger = kind === 'ledger';
          const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
          const iconTone = isLedger ? (isCredit ? readyColor : neutralColor) : (isCredit ? readyColor : waitingColor);
          const amount = Math.abs(Number(item.amount || 0));
          const entryCurrency = isLedger ? wallet?.currency : item.currency;
          const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount, entryCurrency)}`;
          const typeLabel = formatServiceTypeLabel(item.transaction_type) || 'Transaction';
          const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
          const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
          const referenceValue = item.reference_id || item.external_reference || null;
          const RowIcon = isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard;
          const pill = isLedger ? statusPill(item.transaction_type) : statusPill(item.status);

          return (
            <MobileDetailSheet
              isOpen
              onClose={() => setActiveEntry(null)}
              icon={RowIcon}
              iconTone={iconTone}
              eyebrow={isLedger ? typeLabel : 'Patient payment'}
              title={isLedger ? signedAmount : formatPaymentDescription(item)}
              statusPill={pill}
              islands={isLedger ? [
                { icon: isCredit ? ArrowDownLeft : ArrowUpRight, label: 'Type', value: typeLabel },
                { icon: Wallet, label: 'Amount', value: signedAmount },
                referenceValue && { icon: Hash, label: 'Reference', value: referenceValue },
                { icon: Clock, label: 'Recorded', value: formatDateTime(item.created_at) },
              ] : [
                { icon: Wallet, label: 'Amount', value: formatCurrency(amount, item.currency) },
                { icon: CreditCard, label: 'Method', value: methodLabel },
                { icon: Building, label: 'Facility', value: facilityName },
                {
                  icon: Clock,
                  label: item.status === 'completed' ? 'Processed' : 'Recorded',
                  value: formatDateTime(item.status === 'completed' ? item.processed_at || item.updated_at || item.created_at : item.created_at),
                },
              ]}
              primary={!isLedger && onOpenPayment ? {
                label: 'Details',
                icon: Eye,
                onClick: () => {
                  setActiveEntry(null);
                  onOpenPayment(item);
                },
              } : undefined}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};
