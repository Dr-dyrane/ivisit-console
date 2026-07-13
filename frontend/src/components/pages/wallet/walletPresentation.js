export const paymentToneClass = {
  success: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:bg-emerald-300/15 dark:text-emerald-100',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:bg-amber-300/15 dark:text-amber-100',
  danger: 'bg-destructive/10 text-destructive shadow-e2',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:bg-sky-300/15 dark:text-sky-100',
  muted: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06] dark:text-slate-200',
};

export const PAYMENT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(180px,1.35fr)_minmax(110px,0.75fr)_minmax(110px,0.8fr)_108px_124px_78px]';

export const getPaymentStatusTone = ({ isPayment, status, isCredit }) => {
  if (!isPayment) return isCredit ? paymentToneClass.success : paymentToneClass.muted;
  if (status === 'completed') return paymentToneClass.success;
  if (status === 'failed' || status === 'declined') return paymentToneClass.danger;
  if (status === 'refunded') return paymentToneClass.info;
  return paymentToneClass.warning;
};

export const getPaymentOrbTone = ({ isPayment, status, isCredit }) => {
  if (!isPayment) {
    return isCredit
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100'
      : 'bg-foreground/[0.055] text-muted-foreground';
  }
  if (status === 'completed') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100';
  if (status === 'failed' || status === 'declined') return 'bg-destructive/10 text-destructive';
  if (status === 'refunded') return 'bg-sky-500/12 text-sky-700 dark:text-sky-100';
  return 'bg-amber-500/12 text-amber-700 dark:text-amber-100';
};
