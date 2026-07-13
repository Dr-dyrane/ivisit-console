import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { MetricStrip } from '../../console/MetricStrip';
import { formatCompactCurrency, getLedgerTotalsProjection } from './walletPageModel';

const PaymentsMetrics = ({
  loading,
  wallet,
  readState,
  financeMetrics,
  financeMetricsStale,
}) => {
  const totals = getLedgerTotalsProjection({
    wallet,
    readState,
    financeMetrics,
    financeMetricsStale,
  });
  const metrics = [
    {
      id: 'balance',
      label: 'Balance',
      value: totals.balanceAvailable ? formatCompactCurrency(totals.balance, totals.currency) : '',
      icon: Wallet,
      toneClass: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
      priority: 0,
      available: totals.balanceAvailable,
    },
    {
      id: 'credits',
      label: 'Credits',
      value: totals.ledgerTotalsAvailable ? formatCompactCurrency(totals.credits, totals.currency) : '',
      icon: ArrowDownLeft,
      toneClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
      priority: 1,
      available: totals.ledgerTotalsAvailable,
    },
    {
      id: 'debits',
      label: 'Debits',
      value: totals.ledgerTotalsAvailable ? formatCompactCurrency(totals.debits, totals.currency) : '',
      icon: ArrowUpRight,
      toneClass: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
      priority: 2,
      available: totals.ledgerTotalsAvailable,
    },
  ];

  return (
    <div>
      <MetricStrip
        items={metrics}
        loading={loading}
        max={3}
        dataAttr="data-payment-metric"
      />
      {!loading && <p className="mt-2 text-[11px] font-medium text-muted-foreground">{totals.scopeLabel}</p>}
    </div>
  );
};

export { PaymentsMetrics };
