import React from 'react';
import {
  ArrowRight,
  Building,
  Clock,
  CreditCard,
  History,
  Info,
  LockKeyhole,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { CopyChip, DetailLine, StatusPill } from '../../console/primitives';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import {
  formatDate,
  formatTime,
  getLedgerTotalsProjection,
  titleCase,
} from './walletPageModel';
import { getPaymentStatusTone, paymentToneClass } from './walletPresentation';

export const PaymentDetailRail = ({
  entry,
  entryKind,
  loading,
  wallet,
  paymentMethods,
  readState,
  financeMetrics,
  financeMetricsStale,
  ledgerCount,
  paymentsCount,
  onOpenReceipt,
  formatCurrency,
  formatPaymentMethod,
  formatPaymentDescription,
}) => {
  if (loading) {
    return (
      <DetailRailShell>
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-modal bg-muted/30" />
          <div className="h-14 animate-pulse rounded-card bg-muted/25" />
          <div className="h-14 animate-pulse rounded-card bg-muted/25" />
          <div className="h-14 animate-pulse rounded-card bg-muted/25" />
        </div>
      </DetailRailShell>
    );
  }

  const isPayment = entryKind === 'payments';
  const paymentStatus = String(entry?.status || '').toLowerCase();
  const transactionType = String(entry?.transaction_type || '').toLowerCase();
  const isCredit = isPayment ? paymentStatus === 'completed' : transactionType === 'credit';
  const statusLabel = entry
    ? isPayment ? titleCase(entry.status || 'unknown') : titleCase(entry.transaction_type || 'transaction')
    : 'No selection';
  const statusTone = entry
    ? getPaymentStatusTone({ isPayment, status: paymentStatus, isCredit })
    : paymentToneClass.muted;
  const description = entry
    ? isPayment ? formatPaymentDescription(entry) : entry.description || 'Transaction'
    : 'No record selected';
  const amount = entry
    ? formatCurrency(Math.abs(Number(entry.amount || 0)), isPayment ? entry.currency : undefined)
    : 'Not selected';
  const facilityLabel = isPayment
    ? entry?.emergency_requests?.hospitals?.name || 'Facility unavailable'
    : 'Account wallet';
  const totals = getLedgerTotalsProjection({ wallet, readState, financeMetrics, financeMetricsStale });
  const ledgerScopeLabel = totals.ledgerTotalsAvailable
    ? totals.scopeLabel
    : 'Ledger totals unavailable';

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{isPayment ? 'Payment details' : 'Transaction details'}</h2>
            {entry?.id && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={entry.id}>{entry.id}</p>
                <CopyChip value={entry.id} label="Copy payment record ID" />
              </div>
            )}
            <div className="mt-4">
              <StatusPill label={statusLabel} className={statusTone} />
            </div>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sky-700 dark:text-sky-100">
            {isPayment ? <CreditCard className="h-5 w-5" /> : <History className="h-5 w-5" />}
          </span>
        </div>
        <div className="mt-5 rounded-card bg-background/45 p-4 dark:bg-white/[0.05]">
          <p className="text-xs font-medium text-muted-foreground">Amount</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{amount}</p>
          <p className="mt-2 truncate text-sm font-medium text-muted-foreground">{description}</p>
        </div>
      </RailInsetHero>

      {entry ? (
        <div className="space-y-3">
          <DetailLine icon={Clock} label="Recorded" value={`${formatDate(entry.created_at)} at ${formatTime(entry.created_at)}`} />
          <DetailLine icon={Building} label="Facility" value={facilityLabel} />
          <DetailLine
            icon={isPayment ? CreditCard : History}
            label={isPayment ? 'Method' : 'Reference'}
            value={isPayment ? titleCase(formatPaymentMethod(entry)) : entry.reference_id || 'Not available'}
          />
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-card bg-muted/18 p-6 text-center">
          <Info className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold">No record selected</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose a row to see its payment details.</p>
        </div>
      )}

      {isPayment && entry && (
        <Button
          onClick={() => onOpenReceipt(entry)}
          className="mt-5 h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95"
        >
          <Info className="mr-2 h-4 w-4" />
          Open receipt
          <ArrowRight className="ml-auto h-4 w-4 opacity-70" />
        </Button>
      )}

      <div className="mt-5 space-y-3">
        <div className="rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
          <p className="text-xs font-medium text-muted-foreground">Recorded balance</p>
          <p className="mt-1 text-2xl font-semibold">{wallet ? formatCurrency(wallet.balance) : 'Not available'}</p>
          <p className="mt-2 text-xs text-muted-foreground">Showing {ledgerCount} transactions and {paymentsCount} patient payments, up to 50 in each tab.</p>
        </div>
        <div className="rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-inner bg-foreground/[0.045] p-3 dark:bg-white/[0.055]">
              <p className="text-[11px] font-semibold text-muted-foreground">Credits</p>
              <p className="mt-1 text-sm font-semibold">{totals.ledgerTotalsAvailable ? formatCurrency(totals.credits) : 'Unavailable'}</p>
            </div>
            <div className="rounded-inner bg-foreground/[0.045] p-3 dark:bg-white/[0.055]">
              <p className="text-[11px] font-semibold text-muted-foreground">Debits</p>
              <p className="mt-1 text-sm font-semibold">{totals.ledgerTotalsAvailable ? formatCurrency(totals.debits) : 'Unavailable'}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">{ledgerScopeLabel}</p>
        </div>
        <div className="rounded-inner bg-muted/22 p-3">
          <p className="text-[11px] font-semibold text-muted-foreground">Saved cards</p>
          <p className="mt-1 text-sm font-semibold">{readState?.paymentMethods === 'ready' ? paymentMethods.length : 'Unavailable'}</p>
        </div>
      </div>

      <div className="mt-5 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Money changes unavailable</p>
            <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-100/75">Add funds, withdrawals, and card changes are not available for this account.</p>
          </div>
        </div>
      </div>
    </DetailRailShell>
  );
};
