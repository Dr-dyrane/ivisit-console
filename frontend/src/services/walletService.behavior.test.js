import {
  checkCashEligibility,
  createSetupIntent,
  deletePaymentMethod,
  getFinanceAnalytics,
  getOrgStripeStatus,
  getProjectedRevenue,
  getWalletPageData,
  listPaymentMethods,
  processCashPayment,
  setPayoutMethod,
  topUpWallet,
  withdrawFunds,
} from './walletService';
import { supabase } from '../lib/supabase';
import { withAudit, withRetry } from './supabaseHelpers';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(),
  withRetry: jest.fn(),
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const WALLET_ID = '22222222-2222-4222-8222-222222222222';
const EMERGENCY_ID = '33333333-3333-4333-8333-333333333333';
const PAYMENT_METHOD_ID = 'pm_wallet_123';
const BUILDER_METHODS = ['select', 'eq', 'order', 'range', 'limit', 'maybeSingle', 'gte'];

const makeBuilder = (response) => {
  const builder = {};
  BUILDER_METHODS.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected);
  return builder;
};

describe('wallet service preserved behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withRetry.mockImplementation((operation) => operation());
    withAudit.mockImplementation((_action, _entity, operation) => operation());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves organization scope, payment normalization, and unavailable result shapes', async () => {
    const wallet = {
      id: WALLET_ID,
      organization_id: ORGANIZATION_ID,
      balance: '42.50',
      currency: 'USD',
    };
    const paymentProfile = { first_name: 'Ari', last_name: 'Ng' };
    const organizationWalletBuilder = makeBuilder({ data: wallet, error: null });
    const paymentsBuilder = makeBuilder({
      data: [
        { id: 'payment-1', amount: 15, profiles: [paymentProfile] },
        { id: 'payment-2', amount: 20, profiles: null },
      ],
      error: null,
      count: 2,
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'organization_wallets') return organizationWalletBuilder;
      if (table === 'payments') return paymentsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
    supabase.functions.invoke.mockResolvedValue({
      data: { data: [{ id: PAYMENT_METHOD_ID }] },
      error: null,
    });

    const result = await getWalletPageData({
      profile: { organization_id: ORGANIZATION_ID },
      isAdmin: false,
      isOrgAdmin: true,
      limit: 1,
    });

    expect(organizationWalletBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(paymentsBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(paymentsBuilder.limit).toHaveBeenCalledWith(2);
    expect(paymentsBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining('emergency_requests!payments_emergency_request_id_fkey'),
      { count: 'exact' },
    );
    expect(supabase.functions.invoke).toHaveBeenCalledWith('manage-payment-methods', {
      body: { action: 'list-payment-methods', organization_id: ORGANIZATION_ID },
    });
    expect(result).toEqual({
      wallet,
      ledger: [],
      paymentMethods: [{ id: PAYMENT_METHOD_ID }],
      payments: [{ id: 'payment-1', amount: 15, user_details: paymentProfile }],
      financeMetrics: null,
      hasMore: { ledger: false, payments: true },
      totalCounts: { ledger: null, payments: 2 },
      readState: {
        wallet: 'ready',
        ledger: 'unavailable',
        payments: 'ready',
        paymentMethods: 'ready',
        financeMetrics: 'unavailable',
      },
      partialFailure: false,
      limit: 1,
    });
  });

  it('keeps wallet data available when the independent payments projection fails', async () => {
    const denied = { code: '42501', message: 'payments read denied' };
    const wallet = {
      id: WALLET_ID,
      organization_id: ORGANIZATION_ID,
      balance: '42.50',
      currency: 'USD',
    };
    supabase.from.mockImplementation((table) => {
      if (table === 'organization_wallets') return makeBuilder({ data: wallet, error: null });
      if (table === 'payments') return makeBuilder({ data: null, error: denied, count: null });
      throw new Error(`Unexpected table: ${table}`);
    });
    supabase.functions.invoke.mockResolvedValue({ data: { data: [] }, error: null });

    await expect(getWalletPageData({
      profile: { organization_id: ORGANIZATION_ID },
      isAdmin: false,
      isOrgAdmin: true,
      limit: 5,
    })).resolves.toEqual({
      wallet,
      ledger: [],
      paymentMethods: [],
      payments: [],
      financeMetrics: null,
      hasMore: { ledger: false, payments: false },
      totalCounts: { ledger: null, payments: null },
      readState: {
        wallet: 'ready',
        ledger: 'unavailable',
        payments: 'failed',
        paymentMethods: 'ready',
        financeMetrics: 'unavailable',
      },
      partialFailure: true,
      limit: 5,
    });
  });

  it('preserves successful rows while marking independent wallet reads as failed', async () => {
    const denied = { code: '42501', message: 'wallet read denied' };
    const wallet = { id: WALLET_ID, balance: 100, currency: 'USD' };
    const ledgerResponses = [
      { data: null, error: denied, count: null },
      { data: null, error: denied, count: null },
    ];
    supabase.from.mockImplementation((table) => {
      if (table === 'ivisit_main_wallet') return makeBuilder({ data: wallet, error: null });
      if (table === 'wallet_ledger') return makeBuilder(ledgerResponses.shift());
      if (table === 'payments') return makeBuilder({ data: [], error: null, count: 0 });
      throw new Error(`Unexpected table: ${table}`);
    });
    supabase.functions.invoke.mockResolvedValue({ data: null, error: denied });

    const result = await getWalletPageData({
      profile: {},
      isAdmin: true,
      isOrgAdmin: false,
      limit: 5,
    });

    expect(result).toEqual({
      wallet,
      ledger: [],
      paymentMethods: [],
      payments: [],
      financeMetrics: null,
      hasMore: { ledger: false, payments: false },
      totalCounts: { ledger: null, payments: 0 },
      readState: {
        wallet: 'ready',
        ledger: 'failed',
        payments: 'ready',
        paymentMethods: 'failed',
        financeMetrics: 'failed',
      },
      partialFailure: true,
      limit: 5,
    });
  });

  it('preserves quiet fallbacks and quiet throw-on-error behavior for aborted reads', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockImplementation((table) => {
      if (table === 'wallet_ledger') return makeBuilder({ data: [], error: null, count: 0 });
      if (table === 'ivisit_main_wallet') return makeBuilder({ data: null, error: abortError });
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(getFinanceAnalytics({}, true, 7, { quiet: true, throwOnError: true }))
      .rejects.toBe(abortError);
    expect(errorSpy).not.toHaveBeenCalled();

    supabase.functions.invoke.mockResolvedValue({ data: null, error: abortError });
    await expect(listPaymentMethods(ORGANIZATION_ID, { quiet: true })).resolves.toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('preserves projected-revenue zero fallback without logging when quiet', async () => {
    const denied = { code: '42501', message: 'projection denied' };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ledgerBuilder = makeBuilder({ data: null, error: denied });
    supabase.from.mockImplementation((table) => {
      if (table === 'wallet_ledger') return ledgerBuilder;
      if (table === 'organization_wallets') {
        return makeBuilder({ data: { id: WALLET_ID }, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(getProjectedRevenue(ORGANIZATION_ID, { quiet: true })).resolves.toBe(0);
    expect(ledgerBuilder.eq).toHaveBeenCalledWith('wallet_id', WALLET_ID);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('preserves payout, top-up, and cash receiver payloads and returns receiver truth unchanged', async () => {
    const payoutResult = { id: 'payout-1', status: 'pending' };
    const topUpResult = { paymentIntentId: 'pi_1', clientSecret: 'secret' };
    const cashResult = { success: true, payment_id: 'payment-1' };
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: payoutResult, error: null })
      .mockResolvedValueOnce({ data: topUpResult, error: null });
    supabase.rpc.mockResolvedValueOnce({ data: cashResult, error: null });

    await expect(withdrawFunds('12.50', 'Operations payout', ORGANIZATION_ID))
      .resolves.toBe(payoutResult);
    await expect(topUpWallet('25', 'Wallet reserve', ORGANIZATION_ID))
      .resolves.toBe(topUpResult);
    await expect(processCashPayment(EMERGENCY_ID, ORGANIZATION_ID, '40', 'EUR'))
      .resolves.toBe(cashResult);

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'create-payout', {
      body: {
        amount: 12.5,
        organization_id: ORGANIZATION_ID,
        currency: 'usd',
        description: 'Operations payout',
      },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'create-payment-intent', {
      body: {
        amount: 25,
        organization_id: ORGANIZATION_ID,
        currency: 'usd',
        metadata: { type: 'wallet_topup', description: 'Wallet reserve' },
      },
    });
    expect(supabase.rpc).toHaveBeenCalledWith('process_cash_payment', {
      p_emergency_request_id: EMERGENCY_ID,
      p_organization_id: ORGANIZATION_ID,
      p_amount: 40,
    });
    expect(withAudit).toHaveBeenNthCalledWith(
      1,
      'wallet.withdraw',
      'wallet',
      expect.any(Function),
      { amount: 12.5, organization_id: ORGANIZATION_ID }
    );
    expect(withAudit).toHaveBeenNthCalledWith(
      2,
      'wallet.topup',
      'wallet',
      expect.any(Function),
      { amount: 25, organization_id: ORGANIZATION_ID }
    );
    expect(withAudit).toHaveBeenNthCalledWith(
      3,
      'wallet.cash_payment',
      'payment',
      expect.any(Function),
      { emergency_request_id: EMERGENCY_ID, organization_id: ORGANIZATION_ID, amount: 40 }
    );
  });

  it('preserves payment-method and Stripe-status receiver shapes', async () => {
    const setupResult = { clientSecret: 'seti_secret' };
    const method = { id: PAYMENT_METHOD_ID, brand: 'visa' };
    const deleteResult = { deleted: true };
    const payoutMethodResult = { updated: true };
    const stripeStatus = { has_customer: true };
    const eligibility = { eligible: true, balance: 50 };
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: setupResult, error: null })
      .mockResolvedValueOnce({ data: { data: [method] }, error: null })
      .mockResolvedValueOnce({ data: deleteResult, error: null })
      .mockResolvedValueOnce({ data: payoutMethodResult, error: null });
    supabase.rpc
      .mockResolvedValueOnce({ data: stripeStatus, error: null })
      .mockResolvedValueOnce({ data: eligibility, error: null });

    await expect(createSetupIntent(ORGANIZATION_ID)).resolves.toBe(setupResult);
    await expect(listPaymentMethods(ORGANIZATION_ID)).resolves.toEqual([method]);
    await expect(deletePaymentMethod(ORGANIZATION_ID, PAYMENT_METHOD_ID)).resolves.toBe(deleteResult);
    await expect(setPayoutMethod(ORGANIZATION_ID, PAYMENT_METHOD_ID)).resolves.toBe(payoutMethodResult);
    await expect(getOrgStripeStatus(ORGANIZATION_ID)).resolves.toBe(stripeStatus);
    await expect(checkCashEligibility(ORGANIZATION_ID, 100)).resolves.toBe(eligibility);

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'manage-payment-methods', {
      body: { action: 'create-setup-intent', organization_id: ORGANIZATION_ID },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'manage-payment-methods', {
      body: { action: 'list-payment-methods', organization_id: ORGANIZATION_ID },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(3, 'manage-payment-methods', {
      body: {
        action: 'delete-payment-method',
        organization_id: ORGANIZATION_ID,
        payment_method_id: PAYMENT_METHOD_ID,
      },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(4, 'manage-payment-methods', {
      body: {
        action: 'set-payout-method',
        organization_id: ORGANIZATION_ID,
        payment_method_id: PAYMENT_METHOD_ID,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_org_stripe_status', {
      p_organization_id: ORGANIZATION_ID,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'check_cash_eligibility', {
      p_organization_id: ORGANIZATION_ID,
    });
  });

  it('propagates receiver failures instead of manufacturing financial success', async () => {
    const edgeError = { code: 'EDGE_FAILED', message: 'payout rejected' };
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: edgeError });

    await expect(withdrawFunds(10, 'Rejected payout', ORGANIZATION_ID)).rejects.toBe(edgeError);

    supabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'Cash settlement was not recorded' },
      error: null,
    });
    await expect(processCashPayment(EMERGENCY_ID, ORGANIZATION_ID, 10))
      .rejects.toThrow('Cash settlement was not recorded');
  });
});
