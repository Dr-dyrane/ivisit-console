import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  History,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  Building,
  BarChart3,
  Clock,
  Hash,
  Loader2 as LoaderIcon
} from 'lucide-react';
import { MobileMetricRow } from './MobileMetricList';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { MobileActionRail } from './MobileActionRail';
import { statusPill } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';

const mobilePaymentTone = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  info: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
};

const mobileMetricTone = {
  success: {
    active: 'bg-emerald-500/14 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.18)] dark:text-emerald-100',
    rest: 'bg-muted/30 text-muted-foreground',
  },
  info: {
    active: 'bg-sky-500/14 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.18)] dark:text-sky-100',
    rest: 'bg-muted/30 text-muted-foreground',
  },
  muted: {
    active: 'bg-foreground/[0.08] text-foreground',
    rest: 'bg-muted/30 text-muted-foreground',
  },
};

const mobilePaymentReadyColor = 'hsl(160 84% 39%)';
const mobilePaymentWaitingColor = 'hsl(199 89% 48%)';
const mobilePaymentNeutralColor = 'hsl(215 16% 47%)';

export const MobileWallet = ({
  loading,
  wallet,
  projection,
  paymentMethods = [],
  ledger = [],
  payments = [],
  activeTab,
  setActiveTab,
  onRefresh,
  onTopUp,
  onWithdraw,
  onOpenBilling,
  onOpenPayment,
  onViewAnalytics,
  formatCurrency,
  isAdmin,
  isOrgAdmin
}) => {
  const [activeEntry, setActiveEntry] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const showTopSectionLoading = loading && !wallet && ledger.length === 0 && payments.length === 0;
  const items = activeTab === 'ledger' ? ledger : payments;
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
  const signal = useMemo(() => {
    if (showTopSectionLoading) {
      return {
        icon: LoaderIcon,
        spin: true,
        tone: 'muted',
        label: 'Loading',
        headline: 'Payments are loading',
        subhead: 'Balance, cards, and recent activity will appear here.',
      };
    }

    if (paymentMethods.length === 0) {
      return {
        icon: CreditCard,
        tone: 'warning',
        label: 'Cards needed',
        headline: 'Add a card to keep payments ready',
        subhead: 'Add a saved card before adding funds.',
      };
    }

    if (payments.length > 0) {
      return {
        icon: ShieldCheck,
        tone: 'success',
        label: 'Ready',
        headline: `${payments.length} patient payment${payments.length === 1 ? '' : 's'}`,
        subhead: 'Open patient payments or review transactions from the sheet.',
      };
    }

    return {
      icon: Wallet,
      tone: 'info',
      label: 'Ready',
      headline: 'Balance is ready',
      subhead: 'Review transactions, add funds, or manage saved cards.',
    };
  }, [paymentMethods.length, payments.length, showTopSectionLoading]);
  const SignalIcon = signal.icon;
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

  const metricCards = useMemo(() => [
    {
      id: 'balance',
      label: 'Balance',
      value: showBalance ? compactBalance : '****',
      icon: Wallet,
      tone: 'info',
      tab: 'ledger',
      onClick: () => setActiveTab('ledger'),
    },
    {
      id: 'ledger',
      label: 'Transactions',
      value: ledger.length,
      icon: History,
      tone: 'muted',
      tab: 'ledger',
      onClick: () => setActiveTab('ledger'),
    },
    {
      id: 'payments',
      label: 'Patient payments',
      value: payments.length,
      icon: ShieldCheck,
      tone: 'success',
      tab: 'payments',
      onClick: () => setActiveTab('payments'),
    },
    {
      id: 'cards',
      label: 'Cards',
      value: paymentMethods.length,
      icon: CreditCard,
      tone: paymentMethods.length > 0 ? 'success' : 'muted',
      onClick: onOpenBilling,
    },
  ], [compactBalance, ledger.length, onOpenBilling, paymentMethods.length, payments.length, setActiveTab, showBalance]);

  const railActions = useMemo(() => {
    const actions = [];
    if (isOrgAdmin || isAdmin) {
      actions.push({
        id: 'topup',
        label: 'Add funds',
        icon: ArrowDownLeft,
        onClick: onTopUp,
        tone: 'neutral'
      });
    }
    actions.push({
      id: 'withdraw',
      label: 'Withdraw',
      icon: ArrowUpRight,
      onClick: onWithdraw,
      tone: 'neutral'
    });
    actions.push({
      id: 'billing',
      label: paymentMethods.length > 0 ? 'Cards' : 'Link card',
      icon: CreditCard,
      onClick: onOpenBilling,
      tone: 'neutral'
    });
    if (onViewAnalytics) {
      actions.push({
        id: 'analytics',
        label: 'Stats',
        icon: BarChart3,
        onClick: onViewAnalytics,
        tone: 'spark',
        color: 'hsl(var(--spark))'
      });
    }
    return actions;
  }, [isOrgAdmin, isAdmin, onTopUp, onWithdraw, paymentMethods.length, onOpenBilling, onViewAnalytics]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="pt-4 pb-32 text-foreground"
      >
        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4 px-5"
          >
            <div className={`inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${mobilePaymentTone[signal.tone] || mobilePaymentTone.muted}`}>
              <SignalIcon size={15} className={signal.spin ? 'animate-spin' : ''} />
              {signal.label}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[34px] font-semibold leading-[1.03] tracking-normal text-foreground">
                  {signal.headline}
                </h1>
                <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-muted-foreground">
                  {signal.subhead}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBalance((prev) => !prev)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-[0.96]"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {metricCards.map((item) => {
                const Icon = item.icon;
                const active = item.tab ? activeTab === item.tab : false;
                const tone = mobileMetricTone[item.tone] || mobileMetricTone.muted;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.988 }}
                    onClick={item.onClick}
                    className={`min-h-[86px] rounded-card px-4 py-3 text-left transition-all ${active ? tone.active : tone.rest}`}
                    aria-pressed={active}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold leading-tight">{item.label}</span>
                        <span className="mt-2 block truncate text-2xl font-semibold tracking-normal text-foreground">{item.value}</span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/40">
                        <Icon size={16} />
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
              <TrendingUp className="h-3.5 w-3.5" />
              Next 30 days {showBalance ? formatCurrency(projection || 0) : '****'}
            </div>
          </motion.section>

          <section className="-mx-1 rounded-t-sheet bg-card/78 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55">
            <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

            {showTopSectionLoading ? (
              <div className="mb-3 flex gap-2 overflow-hidden">
                <div className="h-12 flex-1 rounded-inner bg-muted/20 shimmer" />
                <div className="h-12 flex-1 rounded-inner bg-muted/20 shimmer" />
                <div className="h-12 flex-1 rounded-inner bg-muted/20 shimmer" />
              </div>
            ) : (
              <MobileActionRail actions={railActions} />
            )}

            <div className="mt-3 flex items-center gap-2 rounded-card bg-background/42 p-2 dark:bg-black/[0.10]">
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-inner text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'ledger' ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.08]' : 'text-muted-foreground'}`}
                aria-pressed={activeTab === 'ledger'}
              >
                <History size={15} />
                Transactions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-inner text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'payments' ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.08]' : 'text-muted-foreground'}`}
                aria-pressed={activeTab === 'payments'}
              >
                <ShieldCheck size={15} />
                Patients
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold tracking-tight">{activeTab === 'ledger' ? 'Transaction History' : 'Patient Payments'}</h2>
              <span className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {loading ? 'Updating' : `${items.length}`}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <AnimatePresence mode="popLayout">
                {/* Date-grouped feed (rollout S5): newest-first, a month header at each
                    boundary. Grouping is render-only. Tapping a row opens the shared detail
                    bottom sheet (MobileDetailSheet) rendered below, not an inline dropdown.
                    A ledger has no linear lifecycle, so there is no VitalTrack here (S4 N/A). */}
                {groupByMonth(items, (entry) => entry?.created_at).map(({ item, header }) => {
                  const isLedger = activeTab === 'ledger';
                  // Ledger carries direction via transaction_type (no status column);
                  // payments carry a real status column (completed/pending/...).
                  const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
                  const rowColor = isLedger
                    ? (isCredit ? mobilePaymentReadyColor : mobilePaymentNeutralColor)
                    : (isCredit ? mobilePaymentReadyColor : mobilePaymentWaitingColor);
                  const amount = Math.abs(Number(item.amount || 0));
                  const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount)}`;
                  const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
                  const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
                  // S3: semantic status pill (raw hue) replaces the rightBlade. Ledger has no
                  // modelled lifecycle, so the generic keyword pill is correct here.
                  const pill = isLedger ? statusPill(item.transaction_type) : statusPill(item.status);
                  // S2: freed meta (amount + counterparty) moves onto the secondary line.
                  const secondary = isLedger
                    ? signedAmount
                    : `${signedAmount} · ${facilityName === 'Hospital unavailable' ? methodLabel : facilityName}`;

                  return (
                    <React.Fragment key={item.id}>
                      {header && (
                        <div className="px-2 pb-1 pt-3 eyebrow">
                          {header}
                        </div>
                      )}
                      {/* Tap opens the shared detail bottom sheet (rendered below), not an
                          inline dropdown — the approved mobile design + desktop detail-rail
                          behaviour. Keep icon/color/label/value/secondary/statusPill. */}
                      <MobileMetricRow
                        icon={isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard}
                        color={rowColor}
                        label={isLedger ? 'Transaction' : 'Patient payment'}
                        value={isLedger ? (item.description || 'Transaction') : formatPaymentDescription(item)}
                        secondary={secondary}
                        statusPill={pill}
                        onClick={() => setActiveEntry(item)}
                      />
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>

              {!loading && items.length === 0 && (
                <MobileListEmpty icon={activeTab === 'ledger' ? History : ShieldCheck} label={activeTab === 'ledger' ? 'No transactions yet' : 'No patient payments yet'} />
              )}
            </div>
          </section>

          {activeEntry && (() => {
            // Tap-opens-detail: the composition that used to live inline (identity islands +
            // the payment-only Details CTA) now renders in the shared MobileDetailSheet.
            const item = activeEntry;
            const isLedger = activeTab === 'ledger';
            // Ledger carries direction via transaction_type (no status column); payments
            // carry a real status column (completed/pending/...).
            const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
            const iconTone = isLedger
              ? (isCredit ? mobilePaymentReadyColor : mobilePaymentNeutralColor)
              : (isCredit ? mobilePaymentReadyColor : mobilePaymentWaitingColor);
            const amount = Math.abs(Number(item.amount || 0));
            const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount)}`;
            const typeLabel = formatServiceTypeLabel(item.transaction_type) || 'Transaction';
            const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
            const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
            const referenceValue = item.reference_id || item.external_reference || null;
            const RowIcon = isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard;
            // S3: generic keyword status pill (a ledger has no modelled lifecycle).
            const pill = isLedger ? statusPill(item.transaction_type) : statusPill(item.status);

            // S6 islands are the same identity tiles the inline expand used. S4 N/A: a
            // ledger has no linear lifecycle, so no VitalTrack (vital omitted). S7: read-only
            // — the only action is a Details CTA on a payment receipt; no money-moving actions.
            return (
              <MobileDetailSheet
                isOpen={!!activeEntry}
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
                  { icon: Clock, label: 'Recorded', value: new Date(item.created_at).toLocaleString() },
                ] : [
                  { icon: Wallet, label: 'Amount', value: formatCurrency(amount) },
                  { icon: CreditCard, label: 'Method', value: methodLabel },
                  { icon: Building, label: 'Facility', value: facilityName },
                  { icon: Clock, label: 'Paid', value: new Date(item.created_at).toLocaleString() },
                ]}
                primary={!isLedger && onOpenPayment
                  ? { label: 'Details', icon: Eye, onClick: () => { setActiveEntry(null); onOpenPayment(item); } }
                  : undefined}
              />
            );
          })()}
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};

