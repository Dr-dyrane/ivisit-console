import React from 'react';
import { Building, Clock, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '../../ui/button';
import { ModalShell } from '../../ui/ModalShell';
import { StatusPill } from '../../console/primitives';
import { formatDate, formatTime, titleCase } from './walletPageModel';

export const PaymentReceiptDialog = ({
  payment,
  onClose,
  formatCurrency,
  formatPaymentMethod,
  formatPaymentDescription,
}) => {
  const patient = payment?.user_details;
  const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(' ') || 'Patient unavailable';
  const patientInitials = [patient?.first_name?.[0], patient?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'P';
  const facilityName = payment?.emergency_requests?.hospitals?.name || 'Facility unavailable';
  const facilityAddress = payment?.emergency_requests?.hospitals?.address || 'Location unavailable';
  const paymentStatus = String(payment?.status || 'unknown').toLowerCase();
  const paymentStatusLabel = titleCase(paymentStatus);
  const isCompleted = paymentStatus === 'completed';
  const lifecycleTimestamp = isCompleted
    ? payment?.processed_at || payment?.updated_at || payment?.created_at
    : payment?.created_at;
  const lifecycleLabel = isCompleted ? 'Processed' : 'Recorded';
  const receiptLabel = payment?.display_id || payment?.id?.slice(0, 12) || 'Not available';
  const feeValue = payment?.ivisit_fee_amount;
  const hasRecordedFee = feeValue !== null && feeValue !== undefined && Number.isFinite(Number(feeValue));
  const statusClass = paymentStatus === 'completed'
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
    : paymentStatus === 'failed' || paymentStatus === 'declined'
      ? 'bg-destructive/10 text-destructive'
      : paymentStatus === 'refunded'
        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-200'
        : paymentStatus === 'pending'
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
          : 'bg-muted/30 text-muted-foreground';

  return (
    <ModalShell
      isOpen={Boolean(payment)}
      onClose={onClose}
      title="Payment details"
      subtitle={`Receipt ${receiptLabel}`}
      icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
      badge={payment ? (
        <StatusPill label={paymentStatusLabel} className={statusClass} />
      ) : null}
      size="md"
      managed
      className="bg-background"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 no-scrollbar md:px-6 md:pb-6">
          <section className="rounded-card bg-foreground/[0.05] p-5 dark:bg-white/[0.07]">
            <p className="text-sm font-medium text-muted-foreground">Payment amount</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              {payment ? formatCurrency(payment.amount, payment.currency) : 'Amount unavailable'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {lifecycleLabel} {formatDate(lifecycleTimestamp)} at {formatTime(lifecycleTimestamp)}
            </div>
          </section>

          <section className="rounded-card bg-muted/25 p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Payment context</h3>
            <div className="grid gap-2">
              <ReceiptLine
                icon={CreditCard}
                label="Method"
                value={payment ? titleCase(formatPaymentMethod(payment)) : 'Not available'}
              />
              <ReceiptLine
                icon={ShieldCheck}
                label="Service"
                value={payment ? formatPaymentDescription(payment) : 'Not available'}
              />
              <ReceiptLine
                icon={Building}
                label="Facility"
                value={facilityName}
                detail={facilityAddress}
              />
              <ReceiptLine
                icon={Wallet}
                label="iVisit fee"
                value={hasRecordedFee ? formatCurrency(feeValue, payment?.currency) : 'Not recorded'}
              />
            </div>
          </section>

          <section className="rounded-card bg-muted/25 p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Payer</h3>
            <div className="flex items-center gap-3 rounded-inner bg-background/45 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/14 text-sm font-semibold text-sky-700 dark:text-sky-100">
                {patientInitials}
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{patientName}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {patient?.phone || patient?.email || 'Contact unavailable'}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 justify-end bg-muted/15 px-4 py-4 md:px-6">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-button bg-foreground px-6 text-background hover:bg-foreground/90"
          >
            Close
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

const ReceiptLine = ({ icon: Icon, label, value, detail }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/22 p-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-icon bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="mt-1 block break-words text-sm font-semibold text-foreground">{value || 'Not available'}</span>
      {detail && <span className="mt-1 block break-words text-xs text-muted-foreground">{detail}</span>}
    </span>
  </div>
);
