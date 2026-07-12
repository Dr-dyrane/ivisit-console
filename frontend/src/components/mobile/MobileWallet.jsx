import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileDown,
  Hash,
  History,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHero,
  MobileListRow,
  SkeletonGroupList,
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

// HYBRID grammar: a Today-shaped finance signal leads into a Requests-shaped KPI
// selector and grouped activity feed. Money-moving commands remain unavailable and
// are never inferred from optimistic browser state.
// grammar:loadmore-append=WalletManagementPage owns the growing server window.

const signalTone = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  info: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  muted: 'bg-muted/35 text-muted-foreground',
};

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

const WalletSkeleton = () => (
  <div className="space-y-6" aria-label="Loading payments">
    <section className="space-y-3 px-4">
      <div className="h-7 w-24 rounded-pill bg-muted/25 shimmer" />
      <div className="h-8 w-56 rounded-inner bg-muted/25 shimmer" />
      <div className="h-4 w-full max-w-xs rounded-inner bg-muted/20 shimmer" />
    </section>
    <section className="flex gap-2 px-4 py-3">
      <div className="h-9 w-32 rounded-pill bg-muted/20 shimmer" />
      <div className="h-9 w-36 rounded-pill bg-muted/20 shimmer" />
    </section>
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-pill bg-muted/25 shimmer" />
          <div className="h-3 w-20 rounded-pill bg-muted/15 shimmer" />
        </div>
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
  projection,
  readState = {},
  ledger = [],
  payments = [],
  activeTab = 'ledger',
  setActiveTab,
  onRefresh,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onExport,
  onOpenPayment,
  formatCurrency,
}) => {
  const observerTarget = useRef(null);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const warmingUp = useSkeletonWarmup();
  const showSkeleton = warmingUp || (loading && !hasLoaded);
  const items = activeTab === 'ledger' ? ledger : payments;
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

  const signal = useMemo(() => {
    if (errorMessage && !hasLoaded) {
      return {
        icon: Wallet,
        tone: 'warning',
        label: 'Payments',
        headline: 'Payments did not load',
        subhead: 'Retry to load balance and payment activity.',
      };
    }
    if (readState?.wallet !== 'ready') {
      return {
        icon: Wallet,
        tone: 'warning',
        label: 'Payments',
        headline: 'Balance unavailable',
        subhead: errorMessage || 'No wallet balance was returned for this scope. Loaded activity remains review-only.',
      };
    }
    return {
      icon: ShieldCheck,
      tone: 'success',
      label: 'Payments',
      headline: showBalance ? `${compactBalance} balance` : 'Balance hidden',
      subhead: errorMessage
        ? 'Some payment information is unavailable. Showing preserved loaded records.'
        : 'Review the recorded balance and loaded payment activity for this scope.',
    };
  }, [compactBalance, errorMessage, hasLoaded, readState?.wallet, showBalance]);

  const kpis = useMemo(() => [
    { id: 'ledger', label: 'Transactions', value: ledger.length, color: 'hsl(215 16% 47%)' },
    { id: 'payments', label: 'Patient payments', value: payments.length, color: 'hsl(199 89% 48%)' },
  ], [ledger.length, payments.length]);

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
            <MobileHero
              toneClass={signalTone[signal.tone] || signalTone.muted}
              icon={signal.icon}
              statusLabel={signal.label}
              headline={signal.headline}
              subhead={signal.subhead}
              isFetching={Boolean(isFetching)}
            >
              <button
                type="button"
                onClick={() => setShowBalance((current) => !current)}
                className="inline-flex h-9 items-center gap-2 rounded-pill surface-card px-3 text-xs font-semibold text-muted-foreground active:scale-[0.96]"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showBalance ? 'Hide balance' : 'Show balance'}
              </button>
              <span className="inline-flex h-9 items-center rounded-pill surface-card px-3 text-xs font-medium text-muted-foreground">
                {readState?.projection === 'ready'
                  ? `30-day estimate ${showBalance ? formatCurrency(projection || 0) : '****'}`
                  : '30-day estimate unavailable'}
              </span>
            </MobileHero>

            <MobileKPIStrip
              kpis={kpis}
              activeKpi={activeTab}
              onKpiClick={setActiveTab}
              loading={false}
              loadingCount={2}
              animateOnMount={false}
            />

            <section className="px-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Payment activity</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {items.length} loaded {activeTab === 'ledger' ? 'transactions' : 'patient payments'}
                  </p>
                </div>
                {activeTab === 'ledger' && onExport && items.length > 0 && (
                  <button
                    type="button"
                    onClick={onExport}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button surface-card text-muted-foreground transition-transform active:scale-[0.96]"
                    aria-label="Export visible transactions"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                )}
              </div>

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
                    : activeTab === 'ledger'
                      ? 'No transactions yet'
                      : 'No patient payments yet'}
                  reason={activeUnavailable ? 'error' : 'empty'}
                  hint={activeUnavailable ? 'Retry to load this payment activity.' : 'Payment activity will appear here after it is recorded.'}
                  onRecover={activeUnavailable ? onRefresh : undefined}
                  recoverLabel={activeUnavailable ? 'Try Again' : undefined}
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
