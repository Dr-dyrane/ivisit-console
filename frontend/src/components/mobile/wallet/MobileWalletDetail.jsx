import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Clock,
  CreditCard,
  Eye,
  Hash,
  Wallet,
} from 'lucide-react';
import { statusPill } from '../../../constants/vitalTracks';
import {
  formatDateTime,
  formatServiceTypeLabel,
  getPaymentDescription,
  isCompletedPayment,
  normalizedValue,
} from '../../pages/wallet/walletPageModel';
import { MobileDetailSheet } from '../MobileDetailSheet';

const readyColor = 'hsl(160 84% 39%)';
const waitingColor = 'hsl(38 92% 50%)';
const infoColor = 'hsl(199 89% 48%)';
const dangerColor = 'hsl(var(--destructive))';
const neutralColor = 'hsl(215 16% 47%)';

export const getMobileWalletDetailProps = ({
  activeEntry,
  setActiveEntry,
  wallet,
  formatCurrency,
  onOpenPayment,
}) => {
  if (!activeEntry) return null;

  const { item, kind } = activeEntry;
  const isLedger = kind === 'ledger';
  const paymentStatus = normalizedValue(item.status);
  const isCredit = isLedger ? normalizedValue(item.transaction_type) === 'credit' : isCompletedPayment(item);
  const iconTone = isLedger
    ? (isCredit ? readyColor : neutralColor)
    : isCredit
      ? readyColor
      : ['failed', 'declined'].includes(paymentStatus)
        ? dangerColor
        : paymentStatus === 'refunded'
          ? infoColor
          : waitingColor;
  const amount = Math.abs(Number(item.amount || 0));
  const entryCurrency = isLedger ? wallet?.currency : item.currency;
  const signedAmount = `${isLedger ? (isCredit ? '+' : '-') : ''}${formatCurrency(amount, entryCurrency)}`;
  const typeLabel = formatServiceTypeLabel(item.transaction_type) || 'Transaction';
  const methodLabel = formatServiceTypeLabel(item.payment_method) || 'Card';
  const facilityName = item.emergency_requests?.hospitals?.name || 'Hospital unavailable';
  const referenceValue = item.reference_id || item.external_reference || null;
  const RowIcon = isLedger ? (isCredit ? ArrowDownLeft : ArrowUpRight) : CreditCard;
  const pill = isLedger ? statusPill(item.transaction_type) : statusPill(item.status);

  return {
    isOpen: true,
    onClose: () => setActiveEntry(null),
    icon: RowIcon,
    iconTone,
    eyebrow: isLedger ? typeLabel : 'Patient payment',
    title: isLedger ? signedAmount : getPaymentDescription(item),
    statusPill: pill,
    islands: isLedger ? [
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
        label: isCompletedPayment(item) ? 'Processed' : 'Recorded',
        value: formatDateTime(
          isCompletedPayment(item)
            ? item.processed_at || item.updated_at || item.created_at
            : item.created_at,
        ),
      },
    ],
    primary: !isLedger && onOpenPayment ? {
      label: 'Details',
      icon: Eye,
      onClick: () => {
        setActiveEntry(null);
        onOpenPayment(item);
      },
    } : undefined,
  };
};

export const MobileWalletDetail = (props) => {
  const detailProps = getMobileWalletDetailProps(props);
  return detailProps ? <MobileDetailSheet {...detailProps} /> : null;
};
