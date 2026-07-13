import { buildLoadedLedgerCsv, getWalletLedgerMetrics } from './walletService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

const WALLET_ID = '11111111-1111-4111-8111-111111111111';
const BUILDER_METHODS = ['select', 'eq', 'order', 'range', 'limit', 'maybeSingle'];

const makeBuilder = (response, builders) => {
  const builder = {};
  BUILDER_METHODS.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected);
  builders.push(builder);
  return builder;
};

const queueWalletReads = (responses) => {
  const builders = [];
  const queue = [...responses];
  supabase.from.mockImplementation(() => makeBuilder(
    queue.shift() || { data: null, error: null, count: 0 },
    builders,
  ));
  return builders;
};

describe('walletService payment truth projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes credit and debit totals only after every exactly counted row is scanned', async () => {
    const builders = queueWalletReads([
      { data: null, error: null, count: 3 },
      {
        data: [
          { amount: 10, transaction_type: 'credit' },
          { amount: -2.5, transaction_type: 'debit' },
        ],
        error: null,
      },
      { data: [{ amount: -4, transaction_type: 'credit' }], error: null },
      { data: null, error: null, count: 3 },
    ]);

    const result = await getWalletLedgerMetrics({ walletId: WALLET_ID, pageSize: 2 });

    expect(result).toEqual(expect.objectContaining({
      basis: 'complete_wallet_ledger_scan',
      scopeLabel: 'All recorded ledger entries',
      complete: true,
      rowCount: 3,
      credits: 14,
      debits: 2.5,
      creditCount: 2,
      debitCount: 1,
    }));
    expect(builders[0].select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builders[1].select).toHaveBeenCalledWith('amount, transaction_type');
    expect(builders[1].range).toHaveBeenCalledWith(0, 1);
    expect(builders[2].range).toHaveBeenCalledWith(2, 2);
  });

  it('rejects a short page instead of publishing partial totals', async () => {
    queueWalletReads([
      { data: null, error: null, count: 2 },
      { data: [{ amount: 10, transaction_type: 'credit' }], error: null },
    ]);

    await expect(getWalletLedgerMetrics({ walletId: WALLET_ID, pageSize: 2 }))
      .rejects.toThrow('Wallet ledger changed before totals could be confirmed.');
  });

  it('rejects totals when the append-only ledger count changes during the scan', async () => {
    queueWalletReads([
      { data: null, error: null, count: 2 },
      {
        data: [
          { amount: 10, transaction_type: 'credit' },
          { amount: -2, transaction_type: 'debit' },
        ],
        error: null,
      },
      { data: null, error: null, count: 3 },
    ]);

    await expect(getWalletLedgerMetrics({ walletId: WALLET_ID, pageSize: 2 }))
      .rejects.toThrow('Wallet ledger changed before totals could be confirmed.');
  });

  it('fails closed when the ledger exceeds the bounded projection limit', async () => {
    queueWalletReads([{ data: null, error: null, count: 11 }]);

    await expect(getWalletLedgerMetrics({ walletId: WALLET_ID, pageSize: 5, maxRows: 10 }))
      .rejects.toThrow('Wallet ledger is too large for a complete browser projection.');
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('propagates a denied server read so the page can show unavailable totals', async () => {
    queueWalletReads([{
      data: null,
      count: null,
      error: { code: '42501', message: 'permission denied for wallet_ledger' },
    }]);

    await expect(getWalletLedgerMetrics({ walletId: WALLET_ID }))
      .rejects.toMatchObject({ code: '42501' });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

describe('walletService loaded-ledger CSV export', () => {
  it('quotes fields, preserves numeric debits, and neutralizes spreadsheet formulas', () => {
    const csv = buildLoadedLedgerCsv({
      currency: 'usd',
      ledger: [
        {
          created_at: '2026-07-13T12:00:00.000Z',
          transaction_type: 'debit',
          description: '=HYPERLINK("https://example.test","Open")',
          amount: -5,
        },
        {
          created_at: '2026-07-13T13:00:00.000Z',
          transaction_type: 'credit',
          description: 'He said "hello", then\nleft',
          amount: 8.25,
        },
      ],
    });

    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"",""Open"")"');
    expect(csv).toContain('"He said ""hello"", then\nleft"');
    expect(csv).toContain('"-5"');
    expect(csv).not.toContain('"\'-5"');
    expect(csv).toContain('"USD"');
    expect(csv.split('\r\n')).toHaveLength(3);
  });
});
