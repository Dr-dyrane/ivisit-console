import React from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
import { ListRowShell, SheetToolbar, SortableColumnHeader } from '../../console/ActivitySheet';
import { StatusPill } from '../../console/primitives';
import { formatDate, formatTime, hasWalletFilters, titleCase } from './walletPageModel';
import {
  getPaymentOrbTone,
  getPaymentStatusTone,
  PAYMENT_GRID_COLS_SELECT,
} from './walletPresentation';

export const PaymentsToolbar = ({
  activeTab,
  setActiveTab,
  loading,
  isFetching,
  onRefresh,
  search,
  onSearchCommit,
  filters,
  filterSheetOpen,
  onOpenFilters,
}) => (
  <div className="space-y-3">
    <div
      className="grid max-w-lg grid-cols-2 gap-1 rounded-inner bg-muted/30 p-1"
      role="tablist"
      aria-label="Payment activity source"
    >
      {[
        { id: 'ledger', label: 'Transaction History', icon: History },
        { id: 'payments', label: 'Patient Payments', icon: ShieldCheck },
      ].map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            onClick={() => setActiveTab(item.id)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-button px-3 text-sm font-semibold transition-all active:scale-[0.98] ${active ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.10]' : 'text-muted-foreground hover:text-foreground'}`}
            aria-selected={active}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
    <SheetToolbar
      searchValue={search}
      onSearchCommit={onSearchCommit}
      searchPlaceholder={activeTab === 'ledger' ? 'Search transactions...' : 'Search patient payments...'}
      searchTestId="payments-sheet-search"
      onRefresh={onRefresh}
      refreshing={loading || isFetching}
      refreshNoun="payments"
      onOpenFilters={onOpenFilters}
      filterSheetOpen={filterSheetOpen}
      filtersActive={hasWalletFilters(filters)}
    />
  </div>
);

export const PaymentsListHeader = ({ sortConfig, onSort, allSelected, someSelected, onSelectAll }) => (
  <div className={`grid ${PAYMENT_GRID_COLS_SELECT} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    <Checkbox
      checked={someSelected ? 'indeterminate' : allSelected}
      onCheckedChange={onSelectAll}
      onClick={(event) => event.stopPropagation()}
      aria-label={allSelected ? 'Clear payment selection' : 'Select all visible payment records'}
      className="h-4 w-4"
    />
    <span>Activity</span>
    <span>Status</span>
    <span>Facility</span>
    <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="text-right">Amount</span>
    <span className="justify-self-end text-right">Action</span>
  </div>
);

export const PaymentRow = ({
  item,
  activeTab,
  selected,
  checked,
  onFocus,
  onOpen,
  onToggleSelect,
  onSelectClick,
  formatCurrency,
  formatPaymentMethod,
  formatPaymentDescription,
}) => {
  const isPayment = activeTab === 'payments';
  const paymentStatus = String(item.status || '').toLowerCase();
  const transactionType = String(item.transaction_type || '').toLowerCase();
  const isCredit = isPayment ? paymentStatus === 'completed' : transactionType === 'credit';
  const Icon = isPayment ? CreditCard : isCredit ? ArrowDownLeft : ArrowUpRight;
  const amountPrefix = !isPayment ? (isCredit ? '+' : '-') : '';
  const label = isPayment ? formatPaymentMethod(item) : titleCase(item.transaction_type || 'transaction');
  const description = isPayment ? formatPaymentDescription(item) : item.description || 'Transaction';
  const subline = isPayment
    ? item.emergency_requests?.hospitals?.name || `ID: ${item.id?.slice(0, 8) || 'payment'}`
    : `Ref: ${item.reference_id?.slice(0, 8) || 'N/A'}`;
  const tone = getPaymentOrbTone({ isPayment, status: paymentStatus, isCredit });
  const statusTone = getPaymentStatusTone({ isPayment, status: paymentStatus, isCredit });

  return (
    <ListRowShell
      id={item.id}
      dataAttrName="data-payment-row"
      gridCols={PAYMENT_GRID_COLS_SELECT}
      selected={selected}
      onFocus={onFocus}
      onOpen={onOpen}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onToggleSelect(item.id, value)}
        onClick={(event) => {
          onSelectClick(event);
          event.stopPropagation();
        }}
        aria-label={checked ? `Deselect ${description}` : `Select ${description}`}
        className="h-4 w-4"
      />
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-foreground">{description}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{subline}</span>
        </span>
      </div>

      <div className="min-w-0">
        <StatusPill label={label} className={statusTone} />
      </div>

      <div className="truncate text-sm font-medium text-muted-foreground">
        {isPayment ? item.emergency_requests?.hospitals?.name || 'Facility unavailable' : 'Account wallet'}
      </div>

      <div className="text-sm font-medium text-muted-foreground">{formatDate(item.created_at)}</div>

      <div className="text-right">
        <div className="text-base font-semibold text-foreground">
          {amountPrefix} {formatCurrency(Math.abs(Number(item.amount || 0)), isPayment ? item.currency : undefined)}
        </div>
        <div className="mt-1 text-[11px] font-medium text-muted-foreground">{formatTime(item.created_at)}</div>
      </div>

      <span className="justify-self-end inline-flex h-9 items-center gap-1 rounded-pill bg-background/45 px-3 text-xs font-semibold text-muted-foreground shadow-sm transition-all group-hover:bg-foreground group-hover:text-background">
        {isPayment ? 'Receipt' : 'Details'}
        {isPayment && <ArrowRight className="h-3.5 w-3.5" />}
      </span>
    </ListRowShell>
  );
};
