import {
  buildLoadedPaymentAnalytics,
  createWalletPageDataState,
  getLedgerTotalsProjection,
  getWalletActivityLoadError,
  getWalletFilterSchema,
  matchesMobileWalletActivity,
  matchesWalletActivity,
  preserveWalletPageDataAfterFailure,
  reconcileWalletPageData,
  selectWalletActivity,
} from './walletPageModel';

describe('walletPageModel', () => {
  const confirmedMetrics = {
    complete: true,
    credits: 120,
    debits: 45,
    scopeLabel: 'All recorded ledger entries',
  };

  it('keeps optional saved-card failures out of the activity warning', () => {
    expect(getWalletActivityLoadError({
      ledger: 'ready',
      payments: 'ready',
      paymentMethods: 'failed',
      financeMetrics: 'ready',
    })).toBe('');
    expect(getWalletActivityLoadError({ payments: 'failed' }))
      .toBe('Patient payments could not refresh.');
    expect(getWalletActivityLoadError({ ledger: 'failed', financeMetrics: 'failed' }))
      .toBe('Some payment activity could not refresh.');
  });

  it('preserves only failed slices and keeps last confirmed finance totals stale', () => {
    const current = {
      ...createWalletPageDataState(),
      ledger: [{ id: 'ledger-old' }],
      paymentMethods: [{ id: 'card-old' }],
      payments: [{ id: 'payment-old' }],
      hasMore: { ledger: true, payments: false },
      financeMetrics: confirmedMetrics,
    };

    const next = reconcileWalletPageData(current, {
      wallet: { id: 'wallet-new', balance: 12, currency: 'USD' },
      ledger: [],
      paymentMethods: [],
      payments: [{ id: 'payment-new' }],
      hasMore: { ledger: false, payments: true },
      financeMetrics: null,
      readState: {
        wallet: 'ready',
        ledger: 'failed',
        payments: 'ready',
        paymentMethods: 'failed',
        financeMetrics: 'failed',
      },
    });

    expect(next.wallet.id).toBe('wallet-new');
    expect(next.ledger).toEqual([{ id: 'ledger-old' }]);
    expect(next.paymentMethods).toEqual([{ id: 'card-old' }]);
    expect(next.payments).toEqual([{ id: 'payment-new' }]);
    expect(next.hasMore).toEqual({ ledger: true, payments: true });
    expect(next.financeMetrics).toBe(confirmedMetrics);
    expect(next.financeMetricsStale).toBe(true);
    expect(next.readState.financeMetrics).toBe('stale');
  });

  it('replaces confirmed totals only with a complete ready projection', () => {
    const nextMetrics = {
      complete: true,
      credits: 400,
      debits: 25,
      scopeLabel: 'All recorded ledger entries',
    };
    const next = reconcileWalletPageData(createWalletPageDataState(), {
      wallet: { id: 'wallet', balance: 375, currency: 'USD' },
      ledger: [],
      paymentMethods: [],
      payments: [],
      hasMore: {},
      financeMetrics: nextMetrics,
      readState: {
        wallet: 'ready',
        ledger: 'ready',
        payments: 'ready',
        paymentMethods: 'ready',
        financeMetrics: 'ready',
      },
    });

    expect(next.financeMetrics).toBe(nextMetrics);
    expect(next.financeMetricsStale).toBe(false);
    expect(next.readState.financeMetrics).toBe('ready');
  });

  it('marks previously ready reads stale after a route-level failure without inventing availability', () => {
    const failed = preserveWalletPageDataAfterFailure({
      ...createWalletPageDataState(),
      financeMetrics: confirmedMetrics,
      readState: {
        wallet: 'ready',
        ledger: 'ready',
        payments: 'failed',
        paymentMethods: 'missing',
        financeMetrics: 'failed',
      },
    });

    expect(failed.readState).toEqual({
      wallet: 'stale',
      ledger: 'stale',
      payments: 'failed',
      paymentMethods: 'missing',
      financeMetrics: 'stale',
    });
    expect(failed.financeMetrics).toBe(confirmedMetrics);
    expect(failed.financeMetricsStale).toBe(true);
  });

  it('filters and sorts only the supplied activity window', () => {
    const ledger = [
      {
        id: 'older-credit',
        transaction_type: 'CREDIT',
        external_reference: 'needle',
        created_at: '2026-06-02T12:00:00Z',
      },
      {
        id: 'newer-credit',
        transaction_type: 'credit',
        external_reference: 'needle',
        created_at: '2026-06-04T12:00:00Z',
      },
      {
        id: 'debit',
        transaction_type: 'debit',
        external_reference: 'needle',
        created_at: '2026-06-03T12:00:00Z',
      },
    ];

    const visible = selectWalletActivity({
      items: ledger,
      activeTab: 'ledger',
      search: 'NEEDLE',
      filters: {
        transactionType: 'credit',
        dateRange: { start: '2026-06-01', end: '2026-06-30' },
      },
      sortDirection: 'asc',
    });

    expect(visible.map((item) => item.id)).toEqual(['older-credit', 'newer-credit']);
  });

  it('normalizes payment lifecycle analytics and excludes refunds from review', () => {
    const analytics = buildLoadedPaymentAnalytics({
      ledger: [{ id: 'ledger' }],
      payments: [
        { status: 'COMPLETED', created_at: '2026-07-01T00:00:00Z' },
        { status: 'refunded', created_at: '2026-07-02T00:00:00Z' },
        { status: 'Pending', created_at: '2026-05-01T00:00:00Z' },
      ],
      now: new Date('2026-07-13T00:00:00Z'),
    });

    expect(analytics.completed).toBe(1);
    expect(analytics.needsReview).toBe(1);
    expect(analytics.recent).toBe(2);
    expect(analytics.paymentCount).toBe(3);
    expect(analytics.lifecycleCount).toBe(3);
    expect(analytics.byCategory).toEqual({ transactions: 1, patient_payments: 3 });
    expect(analytics.distributionScope).toBe('loaded_preview');
  });

  it('publishes balance and totals only when currency, values, and source readiness are valid', () => {
    const ready = getLedgerTotalsProjection({
      wallet: { balance: '75', currency: 'usd' },
      readState: { wallet: 'stale', financeMetrics: 'stale' },
      financeMetrics: confirmedMetrics,
      financeMetricsStale: true,
    });
    expect(ready).toMatchObject({
      currency: 'USD',
      balanceAvailable: true,
      ledgerTotalsAvailable: true,
      balance: 75,
      credits: 120,
      debits: 45,
      scopeLabel: 'Last confirmed ledger totals',
    });

    const unavailable = getLedgerTotalsProjection({
      wallet: { balance: 'not-a-number', currency: 'invalid' },
      readState: { wallet: 'ready', financeMetrics: 'ready' },
      financeMetrics: confirmedMetrics,
      financeMetricsStale: false,
    });
    expect(unavailable.balanceAvailable).toBe(false);
    expect(unavailable.ledgerTotalsAvailable).toBe(false);
    expect(unavailable.scopeLabel).toBe('Ledger totals unavailable for this account');
  });

  it('keeps ledger and patient-payment filters as separate schemas', () => {
    expect(getWalletFilterSchema('ledger').map((filter) => filter.key))
      .toEqual(['transactionType', 'dateRange']);
    expect(getWalletFilterSchema('payments').map((filter) => filter.key))
      .toEqual(['status', 'paymentMethod', 'dateRange']);
  });

  it('keeps mobile search limited to user-facing payment fields', () => {
    const item = {
      id: 'internal-payment-id',
      emergency_request_id: 'internal-request-id',
      display_id: 'PAY-1042',
      created_at: '2026-07-12T12:00:00Z',
    };
    const query = {
      item,
      activeTab: 'payments',
      filters: {},
      normalizedSearch: 'internal-payment-id',
    };

    expect(matchesWalletActivity(query)).toBe(true);
    expect(matchesMobileWalletActivity(query)).toBe(false);
    expect(matchesMobileWalletActivity({ ...query, normalizedSearch: 'pay-1042' })).toBe(true);
  });
});
