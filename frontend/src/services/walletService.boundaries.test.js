import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('wallet service authority boundaries', () => {
  const ledgerSource = read('wallet/ledger.js');
  const pageDataSource = read('wallet/pageData.js');
  const analyticsSource = read('wallet/analytics.js');
  const commandsSource = read('wallet/commands.js');
  const paymentMethodsSource = read('wallet/paymentMethods.js');
  const productionSource = [
    ledgerSource,
    pageDataSource,
    analyticsSource,
    commandsSource,
    paymentMethodsSource,
    read('wallet/query.js'),
  ].join('\n');

  it('keeps ledger, payment, wallet, and analytics reads free of direct mutations', () => {
    const readSource = [ledgerSource, pageDataSource, analyticsSource].join('\n');

    expect(ledgerSource).toContain(".from('wallet_ledger')");
    expect(pageDataSource).toContain(".from('payments')");
    expect(pageDataSource).toContain(".from('organization_wallets')");
    expect(analyticsSource).toContain(".from('ivisit_main_wallet')");
    expect(readSource).not.toMatch(/\.(?:insert|update|upsert|delete)\s*\(/);
  });

  it('preserves UUID organization scope and wallet-id ledger scope without a facility fallback', () => {
    expect(pageDataSource).toContain('if (!isValidUUID(profile?.organization_id)) return null;');
    expect(pageDataSource).toContain(".eq('organization_id', profile.organization_id)");
    expect(pageDataSource).toContain('listPaymentMethods(isAdmin ? null : organizationId)');
    expect(ledgerSource).toContain(".eq('wallet_id', walletId)");
    expect(productionSource).not.toContain('profile?.hospital_id');
  });

  it('keeps money commands behind their existing RPC and Edge Function receivers', () => {
    expect(commandsSource).toContain("supabase.functions.invoke('create-payout'");
    expect(commandsSource).toContain("supabase.functions.invoke('create-payment-intent'");
    expect(commandsSource).toContain("supabase.rpc('process_cash_payment'");
    expect(commandsSource).toContain("supabase.rpc('check_cash_eligibility'");
    expect(paymentMethodsSource).toContain("supabase.rpc('get_org_stripe_status'");
    expect(paymentMethodsSource).toContain("supabase.functions.invoke('manage-payment-methods'");
    expect(`${commandsSource}\n${paymentMethodsSource}`).not.toContain('.from(');
    expect(productionSource).not.toMatch(/\.(?:insert|update|upsert|delete)\s*\(/);
  });

  it('does not introduce wallet-owned realtime or UI dependencies', () => {
    expect(productionSource).not.toMatch(/supabase\.(?:channel|removeChannel)\s*\(/);
    expect(productionSource).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });

  it('retains exact-total and honest partial-state guards at their read boundaries', () => {
    expect(ledgerSource).toContain("select('id', { count: 'exact', head: true })");
    expect(ledgerSource).toContain("basis: 'complete_wallet_ledger_scan'");
    expect(ledgerSource).toContain("throw new Error('Wallet ledger changed before totals could be confirmed.')");
    expect(pageDataSource).toContain("ledgerResult.status === 'fulfilled' ? 'ready' : 'failed'");
    expect(pageDataSource).toContain('emergency_requests!payments_emergency_request_id_fkey');
    expect(pageDataSource).toContain("payments: readState.payments === 'ready'");
    expect(pageDataSource).toContain("financeMetricsResult.status === 'fulfilled' ? 'ready' : 'failed'");
    expect(pageDataSource).toContain("partialFailure: Object.values(readState).some((state) => state === 'failed')");
  });
});
