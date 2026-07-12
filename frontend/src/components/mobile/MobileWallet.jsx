import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
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
  SkeletonGroupPanel,
  useSkeletonWarmup,
} from './canon';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty, MobileListEnd } from './MobileListStates';
import { MobileActionRail } from './MobileActionRail';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { statusPill } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';
import { formatRelativeTime } from '../../utils/activityUtils';

// DASHBOARD grammar: a finance signal and navigational glance tiles lead into a
// read-only temporal feed. Money-moving commands remain owned by their existing
// receivers and are never inferred from optimistic browser state.

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

const WalletSkeleton = () => (
  <div className="space-y-6" aria-label="Loading payments">
    <section className="space-y-3 px-4">
      <div className="h-7 w-24 rounded-pill bg-muted/25 shimmer" />
      <div className="h-8 w-56 rounded-inner bg-muted/25 shimmer" />
      <div className="h-4 w-full max-w-xs rounded-inner bg-muted/20 shimmer" />
    </section>
    <section className="grid grid-cols-2 gap-3 px-4">
      <div className="h-24 rounded-card bg-muted/20 shimmer" />
      <div className="h-24 rounded-card bg-muted/20 shimmer" />
    </section>
    <section className="px-4">
      <SkeletonGroupPanel rows={4} />
    </section>
  </div>
);

const GlanceTile = ({ item, active, onPress }) => {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.988 }}
      onClick={(event) => onPress(event, item)}
      className={`min-h-[92px] rounded-card p-4 text-left transition-colors ${
        active ? 'bg-sky-500/10 text-sky-800 dark:text-sky-100' : 'surface-card text-foreground'
      }`}
      aria-pressed={active}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-muted-foreground">{item.label}</span>
          <span className="mt-2 block truncate text-2xl font-semibold tracking-normal">{item.value}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/45">
          <Icon className="h-4 w-4" />
        </span>
      </span>
    </motion.button>
  );
};

export const MobileWallet = ({
  loading = false,
  isFetching = false,
  errorMessage = null,
  wallet,
  projection,
  paymentMethods = [],
  ledger = [],
  payments = [],
  activeTab = 'ledger',
  setActiveTab,
  onRefresh,
  onExport,
  onOpenPayment,
  onViewAnalytics,
  formatCurrency,
}) => {
  const [activeEntry, setActiveEntry] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const { triggerFromEvent } = useFeedback();
  const warmingUp = useSkeletonWarmup();
  const hasSettledData = Boolean(wallet) || ledger.length > 0 || payments.length > 0 || paymentMethods.length > 0;
  const showSkeleton = warmingUp || (loading && !hasSettledData);
  const items = activeTab === 'ledger' ? ledger : payments;
  const activityGroups = useMemo(() => buildMonthGroups(items), [items]);

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
    if (errorMessage && !hasSettledData) {
      return {
        icon: Wallet,
        tone: 'warning',
        label: 'Unavailable',
        headline: 'Payments did not load',
        subhead: errorMessage,
      };
    }
    if (paymentMethods.length === 0) {
      return {
        icon: CreditCard,
        tone: 'warning',
        label: 'No saved cards',
        headline: showBalance ? `${compactBalance} available` : 'Balance hidden',
        subhead: 'Card information is read-only while payment authority is being verified.',
      };
    }
    return {
      icon: ShieldCheck,
      tone: 'success',
      label: 'Ready',
      headline: showBalance ? `${compactBalance} available` : 'Balance hidden',
      subhead: payments.length > 0
        ? `${payments.length} patient payment${payments.length === 1 ? '' : 's'} loaded for review.`
        : 'Review transactions, saved cards, and patient payment evidence.',
    };
  }, [compactBalance, errorMessage, hasSettledData, paymentMethods.length, payments.length, showBalance]);

  const glanceItems = useMemo(() => [
    { id: 'ledger', label: 'Transactions shown', value: ledger.length, icon: History, tab: 'ledger' },
    { id: 'payments', label: 'Payments shown', value: payments.length, icon: ShieldCheck, tab: 'payments' },
  ], [ledger.length, payments.length]);

  const railActions = useMemo(() => {
    const actions = [];
    if (onExport && activeTab === 'ledger') {
      actions.push({ id: 'export', label: 'Export visible', icon: FileDown, onClick: onExport, tone: 'neutral' });
    }
    if (onViewAnalytics) {
      actions.push({ id: 'analytics', label: 'Stats', icon: BarChart3, onClick: onViewAnalytics, tone: 'spark' });
    }
    return actions;
  }, [activeTab, onExport, onViewAnalytics]);

  const handleGlancePress = (event, item) => {
    triggerFromEvent(event, {
      variant: FEEDBACK_TYPES.CLICK,
      color: 'hsl(var(--foreground))',
      haptic: true,
      sound: true,
    });
    setActiveTab(item.tab);
  };

  const renderActivityRow = (item) => {
    const isLedger = activeTab === 'ledger';
    const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
    const amount = Math.abs(Number(item.amount || 0));
    const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount)}`;
    const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
    const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
    const secondary = isLedger
      ? signedAmount
      : `${signedAmount} / ${facilityName === 'Hospital unavailable' ? methodLabel : facilityName}`;

    return (
      <MobileListRow
        item={item}
        dataAttr="data-mobile-payment-row"
        onOpen={setActiveEntry}
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
            <div className="space-y-6">
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
                Next 30 days {showBalance ? formatCurrency(projection || 0) : '****'}
              </span>
            </MobileHero>

            <section className="grid grid-cols-2 gap-3 px-4">
              {glanceItems.map((item) => (
                <GlanceTile
                  key={item.id}
                  item={item}
                  active={activeTab === item.tab}
                  onPress={handleGlancePress}
                />
              ))}
            </section>

            <section className="px-4">
              <MobileActionRail actions={railActions} className="px-0" />

              <div className="mb-4 grid grid-cols-2 gap-1 rounded-inner bg-muted/20 p-1" role="tablist" aria-label="Payment activity">
                <button
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab('ledger')}
                  aria-selected={activeTab === 'ledger'}
                  className={`h-10 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'ledger' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Transactions
                </button>
                <button
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab('payments')}
                  aria-selected={activeTab === 'payments'}
                  className={`h-10 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'payments' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Patients
                </button>
              </div>

              {errorMessage && hasSettledData && (
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

              {!loading && items.length === 0 && (
                <MobileListEmpty
                  icon={activeTab === 'ledger' ? History : ShieldCheck}
                  label={errorMessage
                    ? 'Payments did not load'
                    : activeTab === 'ledger'
                      ? 'No transactions yet'
                      : 'No patient payments yet'}
                  reason={errorMessage ? 'error' : 'empty'}
                  hint={errorMessage || 'Payment activity will appear here after it is recorded.'}
                  onRecover={errorMessage ? onRefresh : undefined}
                  recoverLabel={errorMessage ? 'Try Again' : undefined}
                  labelTone="plain"
                />
              )}
              {!loading && items.length > 0 && <MobileListEnd label="End of payment activity" />}
            </section>
            </div>
          )}
        </div>

        {activeEntry && (() => {
          const item = activeEntry;
          const isLedger = activeTab === 'ledger';
          const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
          const iconTone = isLedger ? (isCredit ? readyColor : neutralColor) : (isCredit ? readyColor : waitingColor);
          const amount = Math.abs(Number(item.amount || 0));
          const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount)}`;
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
                { icon: Clock, label: 'Recorded', value: new Date(item.created_at).toLocaleString() },
              ] : [
                { icon: Wallet, label: 'Amount', value: formatCurrency(amount) },
                { icon: CreditCard, label: 'Method', value: methodLabel },
                { icon: Building, label: 'Facility', value: facilityName },
                { icon: Clock, label: 'Paid', value: new Date(item.created_at).toLocaleString() },
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
