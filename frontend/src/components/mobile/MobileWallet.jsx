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
  ArrowDownRight,
  Eye,
  EyeOff,
  Building,
  BarChart3,
  Minus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { MobileActionRail } from './MobileActionRail';

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
  const [expandedId, setExpandedId] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const items = activeTab === 'ledger' ? ledger : payments;
  const creditEntries = useMemo(
    () => ledger.filter(entry => entry.transaction_type === 'credit').length,
    [ledger]
  );
  const completedPayments = useMemo(
    () => payments.filter(payment => payment.status === 'completed').length,
    [payments]
  );
  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || 0).getTime();
    const splitByPeriod = (collection) => ({
      current: collection.filter((item) => {
        const ts = getTime(item);
        return Number.isFinite(ts) && ts >= now - periodMs;
      }),
      previous: collection.filter((item) => {
        const ts = getTime(item);
        return Number.isFinite(ts) && ts < now - periodMs && ts >= now - (2 * periodMs);
      })
    });
    const buildTrend = (currentValue, previousValue) => {
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || currentValue === 0 || previousValue === 0) {
        return { direction: 'flat', deltaText: 'N/A' };
      }
      const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', deltaText: `${delta > 0 ? '+' : ''}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1)}%` };
    };
    const ledgerSplit = splitByPeriod(ledger);
    const paymentSplit = splitByPeriod(payments);
    const currentInflowRatio = ledgerSplit.current.length > 0
      ? ledgerSplit.current.filter((entry) => entry.transaction_type === 'credit').length / ledgerSplit.current.length
      : 0;
    const previousInflowRatio = ledgerSplit.previous.length > 0
      ? ledgerSplit.previous.filter((entry) => entry.transaction_type === 'credit').length / ledgerSplit.previous.length
      : 0;
    const currentPaymentSuccessRatio = paymentSplit.current.length > 0
      ? paymentSplit.current.filter((payment) => payment.status === 'completed').length / paymentSplit.current.length
      : 0;
    const previousPaymentSuccessRatio = paymentSplit.previous.length > 0
      ? paymentSplit.previous.filter((payment) => payment.status === 'completed').length / paymentSplit.previous.length
      : 0;
    return {
      inflowRatio: buildTrend(currentInflowRatio, previousInflowRatio),
      paymentSuccess: buildTrend(currentPaymentSuccessRatio, previousPaymentSuccessRatio)
    };
  }, [ledger, payments]);

  const kpis = useMemo(() => [
    { id: 'balance', label: 'Balance', value: formatCurrency(wallet?.balance || 0), color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'projection', label: '30d', value: formatCurrency(projection || 0), color: 'hsl(var(--success))', delta: 'LIVE', direction: 'up' },
    { id: 'credits', label: 'Credits', value: creditEntries, color: 'hsl(var(--info))', delta: periodTrends.inflowRatio.deltaText, direction: periodTrends.inflowRatio.direction },
    { id: 'payments', label: 'Paid', value: completedPayments, color: 'hsl(var(--warning))', delta: periodTrends.paymentSuccess.deltaText, direction: periodTrends.paymentSuccess.direction },
    { id: 'methods', label: 'Cards', value: paymentMethods.length, color: 'hsl(var(--secondary))', delta: 'LIVE', direction: 'flat' }
  ], [wallet?.balance, projection, paymentMethods.length, formatCurrency, creditEntries, completedPayments, periodTrends]);

  const railActions = useMemo(() => {
    const actions = [];
    if (isOrgAdmin || isAdmin) {
      actions.push({
        id: 'topup',
        label: isAdmin ? 'Credit Main' : 'Top Up',
        icon: ArrowDownLeft,
        onClick: onTopUp,
        tone: 'success',
        color: 'hsl(var(--success))'
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
      label: paymentMethods.length > 0 ? 'Billing' : 'Link Card',
      icon: CreditCard,
      onClick: onOpenBilling,
      tone: 'neutral'
    });
    if (onViewAnalytics) {
      actions.push({
        id: 'analytics',
        label: 'Analytics',
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
        kpiStrip={<MobileKPIStrip kpis={kpis} activeKpi="balance" onKpiClick={() => { }} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <section className="mb-4 px-1">
          <div className="relative overflow-hidden rounded-3xl p-6 min-h-[160px] flex flex-col justify-between bg-[linear-gradient(135deg,hsl(var(--primary)/0.14)_0%,hsl(var(--spark)/0.12)_35%,hsl(var(--background)/0.96)_100%)] shadow-xl">
            <div className="absolute -top-14 -right-8 h-32 w-32 rounded-full bg-[hsl(var(--spark)/0.16)] blur-3xl" />
            <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-[hsl(var(--primary)/0.14)] blur-3xl" />
            <div className="absolute top-5 right-4 opacity-20">
              <Wallet className="h-6 w-6 text-[hsl(var(--spark))]" />
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/75 font-semibold">Wallet Balance</p>
                <p className="mt-2 text-[36px] leading-none font-dashboard-numbers tracking-tighter text-foreground">
                  {showBalance ? formatCurrency(wallet?.balance || 0) : '******'}
                </p>
              </div>

              <button
                onClick={() => setShowBalance((prev) => !prev)}
                className="h-9 w-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-muted-foreground/75 hover:text-foreground transition-colors"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative z-10 mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5">
              <TrendingUp className="h-3 w-3 text-[hsl(var(--spark))]" />
              <span className="text-[9px] uppercase tracking-[0.16em] text-foreground/80">
                30D {showBalance ? formatCurrency(projection || 0) : '****'}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-3">
          <MobileSectionHeader
            label="Treasury Dynamics"
            count={ledger.length}
            color="hsl(var(--info))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <ArrowDownLeft className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Inflow Ratio</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Credit share</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round((creditEntries / (ledger.length || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.inflowRatio.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.inflowRatio.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.inflowRatio.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.inflowRatio.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <CreditCard className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Payment Success</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Completed</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round((completedPayments / (payments.length || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.paymentSuccess.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.paymentSuccess.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.paymentSuccess.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.paymentSuccess.deltaText}
                </span>
              </div>
            </div>
          </div>
        </section>

        <MobileActionRail actions={railActions} />

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="p-1 rounded-xl bg-muted/20 backdrop-blur-md flex relative w-full">
            <motion.div
              className="absolute top-1 bottom-1 bg-[hsl(var(--spark)/0.10)] shadow-sm rounded-lg"
              initial={false}
              animate={{
                left: activeTab === 'ledger' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'ledger'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'payments'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              Payments
            </button>
          </div>
        </div>

        <MobileSectionHeader
          label={activeTab === 'ledger' ? 'Transaction Ledger' : 'Service Payments'}
          count={items.length}
          color="hsl(var(--primary))"
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const isLedger = activeTab === 'ledger';
              const isCredit = isLedger ? item.transaction_type === 'credit' : item.status === 'completed';
              const amount = Math.abs(Number(item.amount || 0));
              return (
                <MobileMetricRow
                  key={item.id}
                  icon={isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard}
                  color={isCredit ? 'hsl(var(--success))' : 'hsl(var(--warning))'}
                  label={(isLedger ? item.transaction_type : item.status || 'payment').toUpperCase()}
                  value={item.description || 'Transaction'}
                  rightBlade={{
                    badge: isLedger ? 'LEDGER' : 'PAYMENT',
                    direction: isCredit ? 'up' : 'down',
                    label: 'Amount',
                    value: `${isLedger ? (isCredit ? '+' : '-') : ''} ${formatCurrency(amount)}`,
                    color: isCredit ? 'hsl(var(--success))' : 'hsl(var(--warning))'
                  }}
                  isExpanded={expandedId === item.id}
                  onExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                  itemId={item.id}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <History size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal opacity-80">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        {!isLedger && (
                          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                            <Building size={14} className="text-muted-foreground/40" />
                            <span className="text-xs font-normal opacity-80">
                              {item.emergency_requests?.hospitals?.name || 'Hospital unavailable'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`border-0 text-[9px] uppercase ${isCredit ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                          {isCredit ? 'SUCCESS' : 'PENDING'}
                        </Badge>
                      </div>

                      {!isLedger && (
                        <Button variant="ghost" className="w-full h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onOpenPayment(item)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Receipt</span>
                        </Button>
                      )}
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {!loading && items.length === 0 && (
            <MobileListEmpty icon={activeTab === 'ledger' ? History : ShieldCheck} label={`No ${activeTab} recorded yet`} />
          )}
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};

