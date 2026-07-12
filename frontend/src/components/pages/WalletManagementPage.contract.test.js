import fs from 'fs';
import { getAccessibleNav } from '../../config/navigation';
import { getPageDataStartupDomainsForRole } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('WalletManagementPage Payments contract', () => {
  const pageSource = () => fs.readFileSync('src/components/pages/WalletManagementPage.jsx', 'utf8');
  const appSource = () => fs.readFileSync('src/App.js', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileWallet.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/walletService.js', 'utf8');
  const pageDataSource = () => fs.readFileSync('src/contexts/PageDataContext.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const walletPanelSource = () => fs.readFileSync('src/components/context/WalletPanel.jsx', 'utf8');
  const modalsSource = () => fs.readFileSync('src/components/modals/GlobalFinancialModals.jsx', 'utf8');
  const contextActionSource = () => fs.readFileSync('src/hooks/useContextAction.js', 'utf8');
  const smartHeaderSource = () => fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
  const mobileNavMenuSource = () => fs.readFileSync('src/components/navigation/MobileNavMenu.jsx', 'utf8');
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');

  it('keeps the Payments route at org-admin scope while preserving the /wallet route', () => {
    expect(getRouteProtection('/wallet')).toEqual({
      minRole: 'org_admin',
      resource: 'wallet',
      title: 'Payments',
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/wallet');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/wallet');
    expect(getProtectedRoutesForRole('provider')).not.toContain('/wallet');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/wallet');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/wallet');

    expect(getAccessibleNav({ role: 'org_admin' }).finance.items.find((item) => item.path === '/wallet')?.label)
      .toBe('Payments');
  });

  it('keeps Payments route-owned so PageData does not duplicate the page', () => {
    expect(getPageDataStartupDomainsForRole('org_admin', '/wallet')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/wallet')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/wallet')).not.toContain('wallet');

    const pageData = pageDataSource();

    expect(pageData).toContain("import { getWalletContextData } from '../services/walletService';");
    expect(pageData).toContain('const data = await getWalletContextData({');
    expect(pageData).not.toContain("supabase.from('ivisit_main_wallet')");
    expect(pageData).not.toContain("supabase.from('organization_wallets')");
    expect(pageData).not.toContain("supabase.from('wallet_ledger')");
  });

  it('moves page wallet reads into walletService and removes the payment profile N+1 lookup', () => {
    const page = pageSource();
    const service = serviceSource();

    expect(page).toContain('getWalletPageData');
    expect(page).not.toContain("supabase.from('ivisit_main_wallet')");
    expect(page).not.toContain("supabase.from('organization_wallets')");
    expect(page).not.toContain("supabase.from('wallet_ledger')");
    expect(page).not.toContain("supabase.from('payments')");
    expect(page).not.toContain("supabase.from('profiles')");
    expect(page).not.toContain('Promise.all((payData || []).map(async');

    expect(service).toContain('export const getWalletPageData = async');
    expect(service).toContain('export const getWalletPayments = async');
    expect(service).toContain('profiles!payments_user_id_fkey');
    expect(service).toContain('user_details: normalizePaymentProfile(profiles)');
    expect(service).not.toContain("from('profiles')");
  });

  it('keeps repair mutations out of active Payments page load', () => {
    const page = pageSource();
    const service = serviceSource();

    // Removed: redundant/dangerous client-side fee-ledger write. The canonical
    // approve_cash_payment RPC owns the fee debit; the client duplicate was double-debit-prone.
    expect(service).not.toContain('backfillMissingFeeLedger');
    expect(page).not.toContain('backfillMissingFeeLedger');
    expect(page).not.toContain('backfillLedger');
    expect(page).not.toContain('Self-healing');
    expect(page).not.toContain('Backfill error');
  });

  it('keeps dormant Payments command inventory guarded before Edge receivers', () => {
    const modals = modalsSource();

    expect(modals).toContain('const activeWallet = eventWallet || contextWallet;');
    expect(modals).toContain('Number(activeWallet?.balance || 0)');
    expect(modals).toContain('Available: {formatCurrency(activeWallet?.balance)}');
    expect(modals).toContain('const parsedAmount = Number(amount);');
    expect(modals).toContain('Number.isFinite(parsedAmount) && parsedAmount > 0');
    expect(modals).toContain("toast.error('Enter an amount above 0.')");
    expect(modals).toContain("toast.error('Add a card before adding funds.')");
    expect(modals).toContain("toast.error('Amount is above the available balance.')");
    expect(modals).toContain('disabled={processing || !hasValidAmount || paymentMethods.length === 0}');
    expect(modals).toContain('disabled={processing || !hasValidAmount || exceedsBalance}');
    expect(modals).toContain('min="0.01"');
    expect(modals).toContain('step="0.01"');
    expect(modals).not.toContain('if (!amount || isNaN(amount)) return;');
    expect(modals).not.toContain('supabase');
  });

  it('loads Stripe only when the Payment cards modal is opened', () => {
    const modals = modalsSource();

    expect(modals).toContain("import { loadStripe } from '@stripe/stripe-js/pure';");
    expect(modals).not.toContain("from '@stripe/stripe-js';");
    expect(modals).toContain('const canLoadStripe = Boolean(STRIPE_PUBLISHABLE_KEY && canUseStripeInCurrentOrigin);');
    expect(modals).toContain('const [stripePromise, setStripePromise] = useState(null);');
    expect(modals).toContain('if (!isBillingOpen || !canLoadStripe || stripePromise) return;');
    expect(modals).toContain('setStripePromise(loadStripe(STRIPE_PUBLISHABLE_KEY));');
    expect(modals).toContain('Card setup is loading.');
    expect(modals).not.toContain('const stripePromise =');
  });

  it('keeps unproved global Payments modals out of the mounted shell', () => {
    const app = appSource();
    const page = pageSource();
    const modals = modalsSource();
    const contextAction = contextActionSource();
    const mobileNavMenu = mobileNavMenuSource();

    expect(app).not.toContain('import { GlobalFinancialModals }');
    expect(app).not.toContain('<GlobalFinancialModals />');
    expect(page).not.toContain("new CustomEvent('openTopUpModal'");
    expect(page).not.toContain("new CustomEvent('openWithdrawModal'");
    expect(page).not.toContain("new CustomEvent('openBillingModal'");
    expect(contextAction).not.toContain("new CustomEvent('openTopUpModal'");
    expect(mobileNavMenu).not.toContain("'openTopUpModal'");
    expect(mobileNavMenu).not.toContain("'openWithdrawModal'");
    expect(page).toContain("window.addEventListener('paymentsDataChanged', handlePaymentsDataChanged)");
    expect(page).toContain("window.removeEventListener('paymentsDataChanged', handlePaymentsDataChanged)");
    expect(modals).toContain('setEventWallet(event.detail?.wallet || null);');
    expect(modals).toContain("window.dispatchEvent(new CustomEvent('paymentsDataChanged'))");
    expect(modals).toContain("currency: activeWallet?.currency || 'USD'");
    expect(modals).not.toContain('const { wallet } = walletData;');
  });

  it('feeds the Payments right panel from route-owned context instead of PageData wallet fallback', () => {
    const page = pageSource();
    const contextPanel = contextPanelSource();
    const walletPanel = walletPanelSource();

    expect(page).toContain('const walletPanelContext = useMemo(() => ({');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('walletRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestWalletRouteContext', publishWalletRouteContext)");
    expect(page).toContain("window.removeEventListener('requestWalletRouteContext', publishWalletRouteContext)");

    expect(contextPanel).toContain('const [walletRouteContext, setWalletRouteContext] = React.useState(null);');
    expect(contextPanel).toContain("window.addEventListener('walletRouteContextUpdated', handleWalletRouteContext)");
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestWalletRouteContext'))");
    expect(contextPanel).toContain('<WalletPanel walletContext={walletRouteContext} />');
    expect(contextPanel).not.toContain('walletData');

    expect(walletPanel).toContain('export const WalletPanel = ({ walletContext }) =>');
    expect(walletPanel).toContain("new CustomEvent('openWalletAnalytics')");
    expect(walletPanel).toContain("new CustomEvent('exportLedger')");
    expect(walletPanel).toContain('Loaded records are read-only. Money and card changes remain unavailable.');
    expect(walletPanel).not.toContain('handleTopUp');
    expect(walletPanel).not.toContain('handleWithdraw');
    expect(walletPanel).not.toContain('handleCards');
    expect(walletPanel).not.toContain("new CustomEvent('openTopUpModal'");
    expect(walletPanel).not.toContain("new CustomEvent('openWithdrawModal'");
    expect(walletPanel).not.toContain("new CustomEvent('openBillingModal'");
    expect(walletPanel).not.toContain('usePageData');
    expect(walletPanel).not.toContain('walletData');
  });

  it('keeps dormant Payments command inventory behind named service receivers', () => {
    const service = serviceSource();
    const modals = modalsSource();

    expect(service).toContain("supabase.functions.invoke('create-payment-intent'");
    expect(service).toContain("supabase.functions.invoke('create-payout'");
    expect(service).toContain("supabase.functions.invoke('manage-payment-methods'");
    expect(service).toContain("body: { action: 'create-setup-intent', organization_id: organizationId }");
    expect(service).toContain("body: { action: 'list-payment-methods', organization_id: organizationId }");
    expect(service).toContain("body: { action: 'delete-payment-method', organization_id: organizationId, payment_method_id: paymentMethodId }");
    expect(service).toContain("body: { action: 'set-payout-method', organization_id: organizationId, payment_method_id: paymentMethodId }");
    expect(service).toContain('Promise.allSettled([');
    expect(service).toContain('listPaymentMethods(isAdmin ? null : organizationId)');
    expect(service).toContain('getProjectedRevenue(isAdmin ? null : organizationId, { throwOnError: true })');
    expect(service).toContain("wallet: wallet ? 'ready' : 'missing'");
    expect(modals).toContain('topUpWallet(parsedAmount');
    expect(modals).toContain('withdrawFunds(parsedAmount');
    expect(modals).toContain('createSetupIntent(organizationId)');
    expect(modals).toContain('fetchPaymentMethods(orgId, { quiet: true })');
    expect(modals).not.toContain("console.error('Error fetching billing data:'");
  });

  it('keeps saved-card delete out of active Payments UI until proof exists', () => {
    const page = pageSource();
    const panel = walletPanelSource();
    const service = serviceSource();

    expect(service).toContain('export const deletePaymentMethod = async');
    expect(service).toContain("body: { action: 'delete-payment-method', organization_id: organizationId, payment_method_id: paymentMethodId }");
    expect(page).toContain('Cards returned');
    expect(panel).toContain("readState.paymentMethods === 'ready'");
    expect(page).not.toContain('deletePaymentMethod');
    expect(page).not.toContain('Card removed.');
    expect(page).not.toContain('onDeleteMethod');
    expect(page).not.toContain('aria-label="Remove card"');
    expect(page).not.toContain('hover:bg-destructive/10');
  });

  it('keeps cash processing service-only until a pass proves the cash approval workflow', () => {
    const service = serviceSource();
    const activePaymentsUi = [pageSource(), mobileSource(), walletPanelSource(), modalsSource()].join('\n');

    expect(service).toContain('export const processCashPayment = async');
    expect(service).toContain("supabase.rpc('process_cash_payment'");
    expect(service).toContain('export const checkCashEligibility = async');
    expect(service).toContain("supabase.rpc('check_cash_eligibility'");

    expect(activePaymentsUi).not.toContain('processCashPayment');
    expect(activePaymentsUi).not.toContain('checkCashEligibility');
    expect(activePaymentsUi).not.toContain('process_cash_payment');
    expect(activePaymentsUi).not.toContain('check_cash_eligibility');
  });

  it('does not present payout-method setup as shipped Payments UI', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const modals = modalsSource();
    const service = serviceSource();
    const activePaymentsUi = `${page}\n${mobile}\n${modals}`;

    expect(page).toContain("label: 'Cards returned'");
    expect(page).toContain('Money changes unavailable');
    expect(mobile).toContain("label: 'Payments'");
    expect(mobile).toContain("headline: 'Balance unavailable'");
    expect(mobile).not.toContain("label: 'No saved cards'");
    expect(mobile).not.toContain("label: 'Add funds'");
    expect(mobile).not.toContain("label: 'Withdraw'");
    expect(mobile).not.toContain("label: 'Link card'");
    expect(page).toContain("import { SEOHead } from '../common/SEOHead';");
    expect(page).toContain('<SEOHead title="Payments"');
    expect(page).not.toContain('Payouts ready');
    expect(page).not.toContain("orgInfo?.stripe_account_id ? 'Payouts ready' : 'Setup needed'");
    expect(activePaymentsUi).not.toContain("label: 'Setup needed'");
    expect(activePaymentsUi).not.toContain('Start with the saved card flow before accepting new payment work.');
    expect(page).not.toContain('orgInfo={orgInfo}');
    expect(service).not.toContain('getOrgStripeStatus(organizationId)');
    expect(modals).toContain('Withdraw available funds.');
    expect(activePaymentsUi).not.toContain('Send funds to your payout method.');
    expect(activePaymentsUi).not.toContain('setPayoutMethod(');
  });

  it('uses simple Payments language across page, mobile, panel, and financial modals', () => {
    const activeSurface = [
      pageSource(),
      mobileSource(),
      contextPanelSource(),
      walletPanelSource(),
      modalsSource(),
      contextActionSource(),
      smartHeaderSource(),
    ].join('\n');

    expect(activeSurface).toContain("usePageHeader('Payments', headerActions)");
    expect(activeSurface).toContain("usePageFooter(null, 'status', false)");
    expect(activeSurface).toContain('Payment details');
    expect(activeSurface).toContain('Transaction History');
    expect(activeSurface).toContain('Patient Payments');
    expect(activeSurface).toContain('Add funds');
    expect(activeSurface).toContain('Payment cards');
    expect(activeSurface).not.toContain('Manage cards');
    expect(activeSurface).toContain('No transactions yet');
    expect(activeSurface).toContain('No patient payments yet');
    expect(activeSurface).toContain("if (pathname.startsWith('/wallet')) return 'Payments';");

    [
      'Wallet & Billing',
      'Treasury Dynamics',
      'Financial Hub',
      'Live Balance Active',
      'Payment Complete',
      'Ledger exported successfully',
      'Capital Assets',
      'Main Portfolio',
      'Silent Balance',
      'Financial Operations',
      'Billing & Payments',
      'Active Methods',
      'Secure New Source',
      'Complete Funding',
      'Withdrawal initiated successfully',
      'Wallet topped up successfully',
      'Top Up',
    ].forEach((blockedTerm) => {
      expect(activeSurface).not.toContain(blockedTerm);
    });
  });

  it('keeps Payments inside the shared shell without private shell chrome', () => {
    const page = pageSource();

    const forbiddenShellOwners = [
      'SmartHeader',
      'SmartTopNav',
      'ResponsiveSidebar',
      'IslandNavigation',
      'DynamicBottomBar',
      'ContextAwareFAB',
      'NotificationCenter',
      'MobileNavMenu',
      'ContextPanelShell',
      'SmartFooter',
    ];

    forbiddenShellOwners.forEach((owner) => {
      expect(page).not.toContain(owner);
    });

    expect(page).toContain("import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true });');
  });

  it('composes the canonical desktop workspace with focused read-only records', () => {
    const page = pageSource();

    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<SortableColumnHeader label="Time"');
    expect(page).toContain('<ListRowShell');
    expect(page).toContain('<DetailRailShell>');
    expect(page).toContain('<RailInsetHero>');
    expect(page).toContain('dataAttrName="data-payment-row"');
    expect(page).toContain("useListKeyboardNav({");
    expect(page).toContain('activePath="/wallet"');
    expect(page).toContain("getConsoleModuleRailItems(roleKind)");
    expect(page).toContain("searchParams.get('id')");
    expect(page).toContain("nextParams.set('tab', activeTab)");
    expect(page).toContain('Open receipt');
    expect(page).toContain('Read only');
  });

  it('keeps desktop money writes and bulk selection fail closed', () => {
    const page = pageSource();
    const panel = walletPanelSource();
    const desktopSurface = `${page}\n${panel}`;

    expect(page).toContain('Money changes unavailable');
    expect(page).toContain('receiver authority and reflected app consequences are proved');
    expect(panel).toContain('Loaded records are read-only. Money and card changes remain unavailable.');
    expect(panel).not.toContain('aria-disabled="true"');
    expect(desktopSurface).not.toContain('useRowSelection');
    expect(desktopSurface).not.toContain('BulkActionBar');
    expect(desktopSurface).not.toContain('selectedIds');
  });

  it('surfaces initial and refresh errors while preserving loaded rows', () => {
    const page = pageSource();
    const panel = walletPanelSource();

    expect(page).toContain("const [loadError, setLoadError] = useState('');");
    expect(page).toContain('const [isFetching, setIsFetching] = useState(false);');
    expect(page).toContain('if (hasLoadedRef.current)');
    expect(page).toContain('setIsFetching(true);');
    expect(page).toContain('Existing rows are preserved and may be out of date.');
    expect(page).toContain('<LoadErrorState title="Payments did not load"');
    expect(page).toContain('No financial values are being inferred.');
    expect(page).not.toContain('setLedger([])');
    expect(page).not.toContain('setPayments([])');
    expect(panel).toContain('Showing preserved loaded records.');
  });

  it('exposes honest refresh and growing-window state to the mobile owner', () => {
    const page = pageSource();
    const service = serviceSource();

    expect(page).toContain('<MobileWallet');
    expect(page).toContain('isFetching={isFetching && !mobileLoadingMore}');
    expect(page).toContain('errorMessage={loadError}');
    expect(page).toContain('onRefresh={fetchData}');
    expect(page).toContain('hasMore={Boolean(hasMore[activeTab])}');
    expect(page).toContain('onLoadMore={handleMobileLoadMore}');
    expect(page).toContain('readState={readState}');
    expect(service).toContain('safeLimit + 1');
    expect(service).toContain('ledgerRows.length > safeLimit');
    expect(service).toContain('paymentRows.length > safeLimit');
    expect(service).toContain("projection: projectionResult.status === 'fulfilled' ? projectionResult.value : null");
    expect(service).toContain("partialFailure: Object.values(readState).some((state) => state === 'failed')");
  });

  it('preserves row currency and lifecycle timestamp truth across payment surfaces', () => {
    const page = pageSource();
    const mobile = mobileSource();

    expect(page).toContain('formatCurrency(payment.amount, payment.currency)');
    expect(page).toContain('isPayment ? item.currency : undefined');
    expect(page).toContain('isPayment ? entry.currency : undefined');
    expect(mobile).toContain('const rowCurrency = isLedger ? wallet?.currency : item.currency;');
    expect(mobile).toContain("label: item.status === 'completed' ? 'Processed' : 'Recorded'");
    expect(mobile).toContain('item.processed_at || item.updated_at || item.created_at');
    expect(mobile).not.toContain("label: 'Paid'");
  });

  it('keeps transaction export scoped to visible ledger rows without completeness claims', () => {
    const page = pageSource();

    expect(page).toContain('ivisit_transactions_');
    expect(page).toContain("toast.success('Transactions exported.');");
    expect(page).toContain("window.addEventListener('exportLedger', handleExportEvent);");
    expect(page).toContain("window.removeEventListener('exportLedger', handleExportEvent);");
    expect(page).not.toContain('All transactions exported');
    expect(page).not.toContain('Full ledger');
  });

  it('opens mobile ledger and payment rows in the shared detail bottom sheet, not an inline dropdown', () => {
    const mobile = mobileSource();

    expect(mobile).toContain('<MobileWalletAtlasLayer />');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain("label: 'Transactions'");
    expect(mobile).toContain("label: 'Patient payments'");
    expect(mobile).toContain('aria-label="Export visible transactions"');
    expect(mobile).toContain('<MobileListLoadMore');
    expect(mobile).toContain('End of loaded payment activity');
    expect(mobile).not.toContain('<MobileActionRail');
    expect(mobile).not.toContain('role="tablist"');
    expect(mobile).not.toContain('onTopUp');
    expect(mobile).not.toContain('onWithdraw');
    expect(mobile).not.toContain('onOpenBilling');

    // Tap-opens-detail-sheet: active-record state + row onClick + one MobileDetailSheet render.
    expect(mobile).toContain("import { MobileDetailSheet } from './MobileDetailSheet';");
    expect(mobile).toContain('const [activeEntry, setActiveEntry] = useState(null);');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('setActiveEntry({ kind: activeTab, item: entry })');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('isOpen');
    expect(mobile).toContain('onClose={() => setActiveEntry(null)}');

    // Read-only ledger: the payment receipt CTA is the only action, still via onOpenPayment.
    expect(mobile).toContain('onOpenPayment(item)');

    // The inline-expand affordance is fully removed from the ledger rows.
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('expandedId');
    expect(mobile).not.toContain('setExpandedId');
    expect(mobile).not.toContain('isExpanded=');
    expect(mobile).not.toContain('onExpand=');
  });

  it('assigns the route-owned mobile Stats FAB without exposing money commands', () => {
    const page = pageSource();
    const dock = bottomBarSource();
    const menu = mobileNavMenuSource();

    expect(dock).toContain("pathname.startsWith('/wallet')");
    expect(dock).toContain("label: 'Payment stats'");
    expect(dock).toContain("new CustomEvent('openWalletAnalytics')");
    expect(page).toContain("window.addEventListener('openWalletAnalytics', handleOpenAnalytics)");
    expect(menu).toContain("'openWalletAnalytics'");
    expect(dock).not.toContain("label: 'Add funds'");
    expect(dock).not.toContain("label: 'Withdraw'");
  });
});
