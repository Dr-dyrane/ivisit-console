export const createWalletFilters = () => ({
  ledger: {
    transactionType: 'all',
    dateRange: { start: '', end: '' },
  },
  payments: {
    status: 'all',
    paymentMethod: 'all',
    dateRange: { start: '', end: '' },
  },
});

export const createWalletReadState = () => ({
  wallet: 'unavailable',
  ledger: 'unavailable',
  payments: 'unavailable',
  paymentMethods: 'unavailable',
  financeMetrics: 'unavailable',
});

export const createWalletPageDataState = () => ({
  wallet: null,
  ledger: [],
  paymentMethods: [],
  payments: [],
  hasMore: { ledger: false, payments: false },
  readState: createWalletReadState(),
  financeMetrics: null,
  financeMetricsStale: false,
});

export const reconcileWalletPageData = (current, data) => {
  const incomingReadState = data?.readState || createWalletReadState();
  let financeMetrics = null;
  let financeMetricsStale = false;
  let financeMetricsReadState = incomingReadState.financeMetrics;

  if (incomingReadState.financeMetrics === 'ready' && data?.financeMetrics?.complete) {
    financeMetrics = data.financeMetrics;
  } else if (incomingReadState.financeMetrics === 'failed' && current.financeMetrics?.complete) {
    financeMetrics = current.financeMetrics;
    financeMetricsStale = true;
    financeMetricsReadState = 'stale';
  }

  return {
    wallet: data?.wallet ?? null,
    ledger: incomingReadState.ledger === 'failed' ? current.ledger : (data?.ledger || []),
    paymentMethods: incomingReadState.paymentMethods === 'failed'
      ? current.paymentMethods
      : (data?.paymentMethods || []),
    payments: incomingReadState.payments === 'failed' ? current.payments : (data?.payments || []),
    hasMore: {
      ledger: incomingReadState.ledger === 'failed'
        ? current.hasMore.ledger
        : Boolean(data?.hasMore?.ledger),
      payments: incomingReadState.payments === 'failed'
        ? current.hasMore.payments
        : Boolean(data?.hasMore?.payments),
    },
    readState: {
      ...incomingReadState,
      financeMetrics: financeMetricsReadState,
    },
    financeMetrics,
    financeMetricsStale,
  };
};

export const preserveWalletPageDataAfterFailure = (current) => {
  const hasConfirmedMetrics = current.financeMetrics?.complete === true;
  const readState = Object.fromEntries(Object.entries(current.readState).map(([key, value]) => [
    key,
    value === 'ready' || (key === 'financeMetrics' && hasConfirmedMetrics) ? 'stale' : value,
  ]));

  return {
    ...current,
    readState,
    financeMetricsStale: hasConfirmedMetrics || current.financeMetricsStale,
  };
};

export const formatCurrency = (amount, currency = 'USD') => {
  const safeCurrency = String(currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurrency }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  }
};

export const formatCompactCurrency = (amount, currency = 'USD') => {
  const value = Number(amount || 0);
  const compact = Math.abs(value) >= 10000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
};

export const formatServiceTypeLabel = (serviceType) => {
  if (!serviceType || typeof serviceType !== 'string') return null;
  return serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getPaymentMethod = (payment) => payment?.payment_method || 'unknown';

export const getPaymentDescription = (payment) => {
  const serviceLabel = formatServiceTypeLabel(payment?.emergency_requests?.service_type);
  if (serviceLabel) return `${serviceLabel} service`;
  if (payment?.display_id) return `Payment ${payment.display_id}`;
  if (payment?.emergency_request_id) return 'Emergency service payment';
  return 'Service payment';
};

export const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
};

export const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

export const normalizedValue = (value) => String(value || '').toLowerCase();

export const isCompletedPayment = (payment) => normalizedValue(payment?.status) === 'completed';

export const hasNumericValue = (value) => value !== null
  && value !== undefined
  && String(value).trim() !== ''
  && Number.isFinite(Number(value));

export const getAvailableCurrency = (wallet) => {
  const currency = typeof wallet?.currency === 'string' ? wallet.currency.trim().toUpperCase() : '';
  if (!currency) return null;

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0);
    return currency;
  } catch {
    return null;
  }
};

export const matchesDateRange = (value, range = {}) => {
  if (!range.start && !range.end) return true;
  const time = new Date(value || '').getTime();
  if (Number.isNaN(time)) return false;
  const start = range.start ? new Date(`${range.start}T00:00:00`).getTime() : null;
  const end = range.end ? new Date(`${range.end}T23:59:59.999`).getTime() : null;
  return (start === null || time >= start) && (end === null || time <= end);
};

export const hasWalletFilters = (filters = {}) => Object.entries(filters).some(([key, value]) => {
  if (key === 'dateRange') return Boolean(value?.start || value?.end);
  return Boolean(value && value !== 'all');
});

export const matchesWalletActivity = ({ item, activeTab, filters = {}, normalizedSearch = '' }) => {
  if (!matchesDateRange(item.created_at, filters.dateRange)) return false;

  if (activeTab === 'ledger') {
    const transactionType = normalizedValue(item.transaction_type);
    if (filters.transactionType && filters.transactionType !== 'all' && transactionType !== filters.transactionType) {
      return false;
    }
    if (!normalizedSearch) return true;
    return [
      item.id,
      item.description,
      item.transaction_type,
      item.reference_id,
      item.external_reference,
      item.amount,
    ].some((value) => normalizedValue(value).includes(normalizedSearch));
  }

  const status = normalizedValue(item.status);
  const paymentMethod = normalizedValue(item.payment_method);
  if (filters.status && filters.status !== 'all' && status !== filters.status) return false;
  if (filters.paymentMethod && filters.paymentMethod !== 'all' && paymentMethod !== filters.paymentMethod) return false;
  if (!normalizedSearch) return true;
  return [
    item.id,
    item.display_id,
    item.emergency_request_id,
    item.payment_method,
    item.status,
    item.amount,
    item.user_details?.first_name,
    item.user_details?.last_name,
    item.user_details?.email,
    item.user_details?.phone,
    item.emergency_requests?.service_type,
    item.emergency_requests?.hospitals?.name,
  ].some((value) => normalizedValue(value).includes(normalizedSearch));
};

export const matchesMobileWalletActivity = ({ item, activeTab, filters = {}, normalizedSearch = '' }) => {
  if (!matchesDateRange(item.created_at, filters.dateRange)) return false;

  if (activeTab === 'ledger') {
    const transactionType = normalizedValue(item.transaction_type);
    if (filters.transactionType && filters.transactionType !== 'all' && transactionType !== filters.transactionType) {
      return false;
    }
    if (!normalizedSearch) return true;
    return [
      item.description,
      item.transaction_type,
      item.reference_id,
      item.external_reference,
      item.amount,
    ].some((value) => normalizedValue(value).includes(normalizedSearch));
  }

  const status = normalizedValue(item.status);
  const paymentMethod = normalizedValue(item.payment_method);
  if (filters.status && filters.status !== 'all' && status !== filters.status) return false;
  if (filters.paymentMethod && filters.paymentMethod !== 'all' && paymentMethod !== filters.paymentMethod) return false;
  if (!normalizedSearch) return true;
  return [
    item.display_id,
    item.payment_method,
    item.status,
    item.amount,
    item.user_details?.first_name,
    item.user_details?.last_name,
    item.user_details?.email,
    item.user_details?.phone,
    item.emergency_requests?.service_type,
    item.emergency_requests?.hospitals?.name,
  ].some((value) => normalizedValue(value).includes(normalizedSearch));
};

export const selectWalletActivity = ({ items = [], activeTab, filters, search, sortDirection = 'desc' }) => {
  const normalizedSearch = normalizedValue(search).trim();
  return items
    .filter((item) => matchesWalletActivity({ item, activeTab, filters, normalizedSearch }))
    .sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return sortDirection === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    });
};

export const buildLoadedPaymentAnalytics = ({ ledger = [], payments = [], now = new Date() }) => {
  const byStatus = payments.reduce((counts, payment) => {
    const status = normalizedValue(payment.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const completed = byStatus.completed || 0;
  const needsReview = payments.filter((payment) => (
    !['completed', 'refunded'].includes(normalizedValue(payment.status))
  )).length;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = payments.filter((payment) => {
    if (!payment.created_at) return false;
    const createdAt = new Date(payment.created_at);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= cutoff;
  }).length;

  return {
    total: ledger.length + payments.length,
    completed,
    active: completed,
    needsReview,
    recent,
    paymentCount: payments.length,
    lifecycleCount: payments.length,
    byCategory: {
      transactions: ledger.length,
      patient_payments: payments.length,
    },
    byStatus,
    visibleCount: ledger.length + payments.length,
    distributionScope: 'loaded_preview',
    distributionLabel: 'Records currently shown',
  };
};

export const getLedgerTotalsProjection = ({ wallet, readState, financeMetrics, financeMetricsStale }) => {
  const currency = getAvailableCurrency(wallet);
  const balanceAvailable = ['ready', 'stale'].includes(readState?.wallet)
    && currency
    && hasNumericValue(wallet?.balance);
  const ledgerTotalsAvailable = ['ready', 'stale'].includes(readState?.financeMetrics)
    && financeMetrics?.complete === true
    && Boolean(currency)
    && hasNumericValue(financeMetrics?.credits)
    && hasNumericValue(financeMetrics?.debits);

  return {
    currency,
    balanceAvailable: Boolean(balanceAvailable),
    ledgerTotalsAvailable,
    balance: balanceAvailable ? Number(wallet.balance) : null,
    credits: ledgerTotalsAvailable ? Number(financeMetrics.credits) : null,
    debits: ledgerTotalsAvailable ? Number(financeMetrics.debits) : null,
    scopeLabel: ledgerTotalsAvailable
      ? financeMetricsStale ? 'Last confirmed ledger totals' : financeMetrics.scopeLabel
      : 'Ledger totals unavailable for this account',
  };
};

export const getPaymentSignal = ({ loadError, hasLoaded, wallet, ledger = [], payments = [] }) => {
  const loadedCount = ledger.length + payments.length;

  if (loadError && !hasLoaded) {
    return {
      kind: 'load-error',
      tone: 'danger',
      label: 'Load failed',
      headline: 'Payments did not load',
      subhead: 'No payment totals are shown. Try again from the activity list.',
    };
  }

  if (loadError) {
    return {
      kind: 'refresh-error',
      tone: 'warning',
      label: 'Refresh failed',
      headline: 'Showing the most recent payment records',
      subhead: 'The latest refresh failed, so visible values may be out of date.',
    };
  }

  if (!wallet && loadedCount === 0) {
    return {
      kind: 'empty',
      tone: 'muted',
      label: 'No payment activity',
      headline: 'No payment records are available',
      subhead: 'This account has no wallet, transactions, or patient payments available.',
    };
  }

  return {
    kind: 'ready',
    tone: 'success',
    label: 'Payment activity',
    headline: `${loadedCount} payment record${loadedCount === 1 ? '' : 's'} available`,
    subhead: 'Review transactions and patient payments. Money changes are unavailable.',
  };
};

export const getWalletFilterSchema = (activeTab) => {
  const dateFilter = {
    key: 'dateRange',
    type: 'date',
    label: 'Recorded date',
  };

  if (activeTab === 'ledger') {
    return [
      {
        key: 'transactionType',
        type: 'select',
        label: 'Transaction type',
        options: [
          { label: 'All transactions', value: 'all' },
          { label: 'Credit', value: 'credit' },
          { label: 'Debit', value: 'debit' },
        ],
      },
      dateFilter,
    ];
  }

  return [
    {
      key: 'status',
      type: 'select',
      label: 'Payment status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Declined', value: 'declined' },
      ],
    },
    {
      key: 'paymentMethod',
      type: 'select',
      label: 'Payment method',
      options: [
        { label: 'All methods', value: 'all' },
        { label: 'Cash', value: 'cash' },
        { label: 'Card', value: 'card' },
        { label: 'Wallet', value: 'wallet' },
      ],
    },
    dateFilter,
  ];
};
