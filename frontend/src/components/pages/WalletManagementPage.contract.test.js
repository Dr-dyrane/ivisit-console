import fs from 'fs';
import path from 'path';
import { getAccessibleNav } from '../../config/navigation';
import { getPageDataStartupDomainsForRole } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';
import {
  readAnalyticsModalImplementation,
  readPageDataImplementation,
} from '../../test/sourceEstates';

describe('WalletManagementPage Payments contract', () => {
  const readTree = (directory) => fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return readTree(entryPath);
      return /\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js')
        ? [fs.readFileSync(entryPath, 'utf8')]
        : [];
    })
    .join('\n');
  const pageEntrySource = () => fs.readFileSync('src/components/pages/WalletManagementPage.jsx', 'utf8');
  const pageSource = () => [
    pageEntrySource(),
    readTree('src/components/pages/wallet'),
  ].join('\n');
  const walletModuleSource = (file) => fs.readFileSync(`src/components/pages/wallet/${file}`, 'utf8');
  const mobileWalletModuleSource = (file) => fs.readFileSync(`src/components/mobile/wallet/${file}`, 'utf8');
  const appSource = () => [
    fs.readFileSync('src/app/AppRoutes.jsx', 'utf8'),
    fs.readFileSync('src/app/appRouteMetadata.js', 'utf8'),
    fs.readFileSync('src/app/AppLayout.jsx', 'utf8'),
  ].join('\n');
  const mobileEntrySource = () => fs.readFileSync('src/components/mobile/MobileWallet.jsx', 'utf8');
  const mobileSource = () => [
    mobileEntrySource(),
    readTree('src/components/mobile/wallet'),
  ].join('\n');
  const analyticsModalSource = readAnalyticsModalImplementation;
  const serviceSource = () => [
    fs.readFileSync('src/services/walletService.js', 'utf8'),
    readTree('src/services/wallet'),
  ].join('\n');
  const pageDataSource = readPageDataImplementation;
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const walletPanelSource = () => fs.readFileSync('src/components/context/WalletPanel.jsx', 'utf8');
  const modalsSource = () => fs.readFileSync('src/components/modals/GlobalFinancialModals.jsx', 'utf8');
  const contextActionSource = () => fs.readFileSync('src/hooks/useContextAction.js', 'utf8');
  const smartHeaderSource = () => fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
  const mobileNavMenuSource = () => fs.readFileSync('src/components/navigation/MobileNavMenu.jsx', 'utf8');
  const bottomBarSource = () => [
    fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
    fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
  ].join('\n');

  it('keeps PAGE-04 route, controller, model, and presentation ownership modular', () => {
    const pageEntry = pageEntrySource();
    const mobileEntry = mobileEntrySource();
    const routeController = walletModuleSource('useWalletPageController.js');
    const desktopController = walletModuleSource('usePaymentsDesktopController.js');
    const model = walletModuleSource('walletPageModel.js');
    const desktopPresentation = [
      walletModuleSource('PaymentsDesktopWorkspace.jsx'),
      walletModuleSource('PaymentsActivity.jsx'),
      walletModuleSource('PaymentsMetrics.jsx'),
      walletModuleSource('PaymentDetailRail.jsx'),
      walletModuleSource('PaymentReceiptDialog.jsx'),
    ].join('\n');
    const mobileController = mobileWalletModuleSource('useMobileWalletController.js');
    const app = appSource();

    expect(pageEntry.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(mobileEntry.split(/\r?\n/).length).toBeLessThanOrEqual(240);
    expect(pageEntry).toContain("import { useWalletPageController } from './wallet/useWalletPageController';");
    expect(pageEntry).toContain("export { PaymentReceiptDialog } from './wallet/PaymentReceiptDialog';");
    expect(pageEntry).toContain("export { PaymentsDesktopWorkspace } from './wallet/PaymentsDesktopWorkspace';");
    expect(mobileEntry).toContain("import { useMobileWalletController } from './wallet/useMobileWalletController';");
    expect(mobileEntry).toContain("export { MobileWalletActivity } from './wallet/MobileWalletActivity';");
    expect(mobileEntry).toContain("export { MobileWalletDetail } from './wallet/MobileWalletDetail';");

    expect(routeController).toContain('getWalletPageData({');
    expect(routeController).toContain('buildLoadedLedgerCsv({');
    expect(routeController).not.toContain('<PaymentsDesktopWorkspace');
    expect(desktopController).toContain('useRowSelection(activeItems)');
    expect(desktopController).toContain('useSearchParams()');
    expect(model).not.toContain("from 'react'");
    expect(model).not.toContain('window.');
    expect(model).not.toContain('document.');
    expect(model).not.toContain('getWalletPageData');
    expect(desktopPresentation).not.toContain('getWalletPageData');
    expect(desktopPresentation).not.toContain('buildLoadedLedgerCsv');
    expect(mobileController).not.toContain('getWalletPageData');
    expect(app).toContain("wallet: lazyNamedPage(() => import('../components/pages/WalletManagementPage'), 'WalletManagementPage')");
    expect(app).toContain("{ id: 'wallet', path: '/wallet', minRole: 'org_admin' }");
  });

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

    expect(pageData).toContain("import { getWalletContextData } from '../../../services/walletService';");
    expect(pageData).toContain('export const loadWalletPageData = async ({ profile, isAdmin }) => getWalletContextData({');
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
    expect(walletPanel).toContain('Payment history is available here. Money and card changes are unavailable.');
    expect(walletPanel).toContain('These actions are not available for this account.');
    expect(walletPanel).toContain('<span className="text-center text-xs font-semibold leading-tight">Add funds</span>');
    expect(walletPanel).toContain('<span className="text-center text-xs font-semibold leading-tight">Withdraw</span>');
    expect(walletPanel).toContain('<span className="text-center text-xs font-semibold leading-tight">Payment cards</span>');
    expect(walletPanel.match(/disabled/g)?.length).toBeGreaterThanOrEqual(4);
    expect(walletPanel).not.toContain('handleTopUp');
    expect(walletPanel).not.toContain('handleWithdraw');
    expect(walletPanel).not.toContain('handleCards');
    expect(walletPanel).not.toContain("new CustomEvent('openTopUpModal'");
    expect(walletPanel).not.toContain("new CustomEvent('openWithdrawModal'");
    expect(walletPanel).not.toContain("new CustomEvent('openBillingModal'");
    expect(walletPanel).not.toContain('usePageData');
    expect(walletPanel).not.toContain('walletData');
    expect(walletPanel).toContain("map((item) => ({ kind: 'ledger', item }))");
    expect(walletPanel).toContain("map((item) => ({ kind: 'payment', item }))");
    expect(walletPanel).toContain('.sort((left, right) => new Date(right.item.created_at || 0).getTime() - new Date(left.item.created_at || 0).getTime())');
    expect(walletPanel).toContain('const cardState = readState.paymentMethods === \'ready\' ? paymentMethods.length : \'Unavailable\';');
    expect(walletPanel).toContain('{cardState}');
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
    expect(service).not.toContain('getProjectedRevenue(isAdmin ? null : organizationId, { throwOnError: true })');
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
    expect(page).toContain('Saved cards');
    expect(panel).toContain("readState.paymentMethods === 'ready'");
    expect(panel).toContain("paymentMethods.length : 'Unavailable'");
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

    expect(page).toContain('Saved cards');
    expect(page).toContain('Money changes unavailable');
    expect(mobile).toContain('title="Payments"');
    expect(mobile).toContain("'Balance unavailable'");
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
    const page = pageEntrySource();

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

    expect(page).toContain("import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';");
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true });');
  });

  it('composes the canonical desktop workspace with focused payment records', () => {
    const page = pageSource();

    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<MetricStrip');
    expect(page).toContain('<SheetToolbar');
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
    expect(page).toContain("{isPayment ? 'Receipt' : 'Details'}");
  });

  it('shows at most three source-backed desktop payment metrics', () => {
    const page = pageSource();
    const metrics = walletModuleSource('PaymentsMetrics.jsx');
    const service = serviceSource();

    expect(metrics).toContain('MetricStrip');
    expect(metrics).toContain('const PaymentsMetrics = ({');
    expect(metrics).toContain('max={3}');
    expect(metrics.match(/label: '(Balance|Credits|Debits)'/g)).toHaveLength(3);
    expect(page).toContain("['ready', 'stale'].includes(readState?.wallet)");
    expect(page).toContain("['ready', 'stale'].includes(readState?.financeMetrics)");
    expect(page).toContain("String(value).trim() !== ''");
    expect(metrics).toContain('available: totals.balanceAvailable');
    expect(metrics).toContain('available: totals.ledgerTotalsAvailable');
    expect(page).toContain('financeMetrics.credits');
    expect(page).toContain('financeMetrics.debits');
    expect(page).toContain('Last confirmed ledger totals');
    expect(service).toContain("basis: 'complete_wallet_ledger_scan'");
    expect(service).toContain("scopeLabel: 'All recorded ledger entries'");
    expect(service).toContain(".select('id', { count: 'exact', head: true })");
    expect(service).toContain(".select('amount, transaction_type')");
    expect(service).toContain('if (confirmedCount !== expectedCount || processedCount !== expectedCount)');
    expect(page).not.toContain('const creditRows = ledger.filter');
    expect(page).not.toContain('const debitRows = ledger.filter');
    expect(page).not.toContain('PaymentsMetricStrip');
    expect(page).not.toContain("label: 'Transactions loaded'");
    expect(page).not.toContain("label: 'Payments loaded'");
    expect(page).not.toContain("label: 'Cards returned'");
  });

  it('wires desktop search, refresh, and FilterSheet to the returned activity window', () => {
    const page = pageSource();

    expect(page).toContain('ActivitySheet');
    expect(page).toContain('search={controller.search}');
    expect(page).toContain('onSearchCommit={controller.setSearch}');
    expect(page).toContain('filters={controller.activeFilters}');
    expect(page).toContain('export const matchesWalletActivity = ({ item, activeTab, filters = {}, normalizedSearch = \'\' }) =>');
    expect(page).toContain('.filter((item) => matchesWalletActivity({ item, activeTab, filters, normalizedSearch }))');
    expect(page).toContain('searchValue={search}');
    expect(page).toContain('searchTestId="payments-sheet-search"');
    expect(page).toContain('onOpenFilters={onOpenFilters}');
    expect(page).toContain('filtersActive={hasWalletFilters(filters)}');
    expect(page).toContain('isMobile={isMobile}');
    expect(page).not.toContain('Search and filters apply only to the records currently shown.');
    expect(page).toContain('role="tablist"');
    expect(page).toContain('aria-label="Payment activity source"');
    expect(page).toContain('role="tab"');

    // Narrowing and source changes do not replace the canonical tab/id deep link contract.
    expect(page).toContain("searchParams.get('tab')");
    expect(page).toContain("searchParams.get('id')");
    expect(page).toContain("nextParams.set('tab', activeTab)");
    expect(page).toContain("nextParams.set('id', id)");
    expect(page).toContain("key: 'created_at'");
    expect(page).toContain('<SortableColumnHeader label="Time"');
    expect(page).toContain('onOpenReceipt={onPaymentOpen}');
  });

  it('keeps internal implementation language out of desktop Payments copy', () => {
    const desktopSurface = `${pageSource()}\n${walletPanelSource()}`;

    [
      'Read only',
      'read-only',
      'loaded records',
      'records loaded',
      'loaded payment',
      'route scope',
      'Current role scope',
      '>Scope<',
      'label="Scope"',
      'receiver authority',
      'app consequences',
      'Projection returned',
    ].forEach((internalCopy) => {
      expect(desktopSurface).not.toContain(internalCopy);
    });
  });

  it('provides authority-safe desktop selection for the active visible payment source', () => {
    const page = pageSource();
    const panel = walletPanelSource();
    const desktopSurface = `${page}\n${panel}`;

    expect(page).toContain('Money changes unavailable');
    expect(page).toContain('Add funds, withdrawals, and card changes are not available for this account.');
    expect(panel).toContain('Payment history is available here. Money and card changes are unavailable.');
    expect(panel).not.toContain('aria-disabled="true"');
    expect(page).toContain('useRowSelection');
    expect(page).toContain('BulkActionBar');
    expect(page).toContain('Checkbox');
    expect(page).toContain('useRowSelection(activeItems)');
    expect(page).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(page).toContain('aria-label={allSelected ? \'Clear payment selection\' : \'Select all visible payment records\'}');
    expect(page).toContain('checked={workspace.selectedIds.includes(item.id)}');
    expect(page).toContain('onSelectClick={workspace.handleSelectClick}');
    expect(page).toContain('<BulkActionBar selectedCount={workspace.selectedIds.length} onClear={workspace.clearSelection}>');
    expect(page).toContain('Bulk payment actions are unavailable');
    expect(page).toContain('[activeTab, clearSelection, filters, normalizedSearch, pagination.currentPage]');
    expect(page).toContain('[clearSelection, searchParams, setActiveTab, setSearchParams]');
    expect(page).toMatch(/<BulkActionBar[\s\S]*?<Button[\s\S]*?disabled[\s\S]*?title="Bulk payment actions are unavailable"/);
    expect(desktopSurface).not.toContain('handleBulkPayment');
    expect(desktopSurface).not.toContain('handleBulkTransaction');
  });

  it('uses the shared long-press selection grammar on mobile without money writes', () => {
    const mobile = mobileSource();

    expect(mobile).toContain('MobileSelectionBar');
    expect(mobile).toContain('useRowSelection');
    expect(mobile).toContain('useRowSelection(items)');
    expect(mobile).toContain('selectable');
    expect(mobile).toContain('selected={controller.selectedIdSet.has(item.id)}');
    expect(mobile).toContain('selectionMode={controller.selectionMode}');
    expect(mobile).toContain('onLongPress={(entry) => controller.handleToggleSelect(entry.id, true)}');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('onSelectAll={() => controller.handleSelectAll(true)}');
    expect(mobile).toContain('onClear={controller.clearSelection}');
    expect(mobile).toContain('Bulk payment actions are unavailable');
    expect(mobile).toContain('[activeTab, clearSelection, filters, normalizedSearch]');
    expect(mobile).toContain('role="tablist"');
    expect(mobile).toContain('<WalletActivityTabButtons activeTab={activeTab} setActiveTab={controller.handleTabChange} />');
    expect(mobile).toMatch(/<MobileSelectionBar[\s\S]*?<button[\s\S]*?disabled[\s\S]*?title="Bulk payment actions are unavailable"/);
    expect(mobile).not.toContain('handleBulkPayment');
    expect(mobile).not.toContain('handleBulkTransaction');
  });

  it('surfaces initial and refresh errors while preserving current rows', () => {
    const page = pageSource();
    const panel = walletPanelSource();

    expect(page).toContain("const [loadError, setLoadError] = useState('');");
    expect(page).toContain('const [isFetching, setIsFetching] = useState(false);');
    expect(page).toContain('if (hasLoadedRef.current)');
    expect(page).toContain('setIsFetching(true);');
    expect(page).toContain('Current rows remain visible and may be out of date.');
    expect(page).toContain('<LoadErrorState title="Payments did not load"');
    expect(page).toContain('No payment totals are shown.');
    expect(page).not.toContain('setLedger([])');
    expect(page).not.toContain('setPayments([])');
    expect(page).not.toContain('error?.message');
    expect(page).toContain("setLoadError('Payments could not load. Please try again.');");
    expect(page).toContain("key === 'financeMetrics' && hasConfirmedMetrics");
    expect(page).toContain("value === 'ready'");
    expect(page).toContain('preserveWalletPageDataAfterFailure(current)');
    expect(page).toContain('financeMetricsStale: hasConfirmedMetrics || current.financeMetricsStale');
    expect(panel).toContain('Showing the most recent available records.');
  });

  it('exposes honest refresh and growing-window state to the mobile owner', () => {
    const page = pageSource();
    const service = serviceSource();

    expect(page).toContain('<MobileWallet');
    expect(page).toContain('isFetching={controller.isFetching && !controller.mobileLoadingMore}');
    expect(page).toContain('errorMessage={controller.loadError}');
    expect(page).toContain('onRefresh={controller.fetchData}');
    expect(page).toContain('hasMore={Boolean(controller.hasMore[controller.activeTab])}');
    expect(page).toContain('onLoadMore={controller.handleMobileLoadMore}');
    expect(page).toContain('readState={controller.readState}');
    expect(page).toContain('search={controller.search}');
    expect(page).toContain('filters={controller.activeFilters}');
    expect(page).toContain('<FilterSheet');
    expect(page).toContain("title={controller.activeTab === 'ledger' ? 'Transaction filters' : 'Payment filters'}");
    expect(service).toContain('safeLimit + 1');
    expect(service).toContain('ledgerRows.length > safeLimit');
    expect(service).toContain('paymentRows.length > safeLimit');
    expect(service).not.toContain('projectionResult');
    expect(service).toContain("partialFailure: Object.values(readState).some((state) => state === 'failed')");
  });

  it('does not reacquire or re-present the rejected 30-day estimate on the Payments route', () => {
    const page = pageSource();
    const panel = walletPanelSource();
    const service = serviceSource();

    expect(service).not.toContain('getProjectedRevenue(isAdmin ? null : organizationId');
    expect(page).not.toContain('Projection returned');
    expect(page).not.toContain('readState?.projection');
    expect(panel).not.toContain('Projection returned');
    expect(panel).not.toContain('readState.projection');
  });

  it('preserves row currency and lifecycle timestamp truth across payment surfaces', () => {
    const page = pageSource();
    const mobile = mobileSource();

    expect(page).toContain('formatCurrency(payment.amount, payment.currency)');
    expect(page).toContain('ModalShell');
    expect(page).toContain('<ModalShell');
    expect(page).toContain('title="Payment details"');
    expect(page).toContain('size="md"');
    expect(page).toContain('managed');
    expect(page).not.toContain('<DialogContent');
    expect(page).not.toContain('<DialogTitle');
    expect(page).not.toContain('<DialogDescription');
    expect(page).toContain('isPayment ? item.currency : undefined');
    expect(page).toContain('isPayment ? entry.currency : undefined');
    expect(page).toContain("const lifecycleLabel = isCompleted ? 'Processed' : 'Recorded';");
    expect(page).toContain('payment?.processed_at || payment?.updated_at || payment?.created_at');
    expect(page).toContain("{hasRecordedFee ? formatCurrency(feeValue, payment?.currency) : 'Not recorded'}");
    expect(page).not.toContain('<span>Included</span>');
    expect(page).not.toContain('<span>Subtotal</span>');
    expect(mobile).toContain('const rowCurrency = isLedger ? wallet?.currency : item.currency;');
    expect(mobile).toContain("label: isCompletedPayment(item) ? 'Processed' : 'Recorded'");
    expect(mobile).toContain('item.processed_at || item.updated_at || item.created_at');
    expect(mobile).not.toContain("label: 'Paid'");
  });

  it('uses the shared status pill and exact ledger-total language across payment rails', () => {
    const page = pageSource();
    const panel = walletPanelSource();

    expect(page).toContain('<StatusPill label={paymentStatusLabel} className={statusClass} />');
    expect(page).toContain('<StatusPill label={label} className={statusTone} />');
    expect(page).toContain('<StatusPill label={statusLabel} className={statusTone} />');
    expect(panel).toContain("import { StatusPill } from '../console/primitives';");
    expect(panel).toContain('<StatusPill label={freshnessLabel} className={freshnessTone} />');
    expect(panel).toContain('financeMetrics.credits');
    expect(panel).toContain('financeMetrics.debits');
    expect(panel).toContain('Ledger totals unavailable for this account');
  });

  it('uses payment-owned analytics and lifecycle denominators instead of generic dashboard language', () => {
    const page = pageSource();
    const analyticsModal = analyticsModalSource();

    expect(page.match(/type="payments"/g)?.length).toBe(1);
    expect(page).not.toContain('type="generic"');
    expect(page).toContain('const byStatus = payments.reduce((counts, payment) => {');
    expect(page).toContain("!['completed', 'refunded'].includes(normalizedValue(payment.status))");
    expect(page).toContain('paymentCount: payments.length');
    expect(page).toContain('lifecycleCount: payments.length');
    expect(page).toContain('transactions: ledger.length');
    expect(page).toContain('patient_payments: payments.length');
    expect(page).not.toContain('methods: readState.paymentMethods');

    expect(analyticsModal).toContain('payments: [');
    expect(analyticsModal).toContain("{ id: 'lifecycle', label: 'Payment lifecycle' }");
    expect(analyticsModal).toContain("payments: 'Payments'");
    expect(analyticsModal).toContain("{ label: 'Loaded records', value: genericTotal");
    expect(analyticsModal).toContain("{ label: 'Completed', value: getCount(analytics.completed)");
    expect(analyticsModal).toContain("{ label: 'Needs review', value: getCount(analytics.needsReview)");
    expect(analyticsModal).toContain("['visible_page', 'loaded_preview'].includes(analytics.distributionScope)");
    expect(analyticsModal).toContain("type === 'payments' ? analytics.paymentCount");
    expect(analyticsModal).toContain('Number(analytics.lifecycleCount)');
  });

  it('keeps transaction export scoped to visible ledger rows without completeness claims', () => {
    const page = pageSource();
    const panel = walletPanelSource();
    const mobile = mobileSource();

    expect(page).toContain('buildLoadedLedgerCsv({');
    expect(page).toContain('ledger: pageData.ledger');
    expect(page).toContain('ivisit_loaded_transactions_');
    expect(page).toContain('loaded transaction${pageData.ledger.length === 1');
    expect(page).toContain("window.addEventListener('exportLedger', handleExportEvent);");
    expect(page).toContain("window.removeEventListener('exportLedger', handleExportEvent);");
    expect(panel).toContain("new CustomEvent('exportLedger')");
    expect(panel).toContain('Export shown');
    expect(panel).toContain('Exporting ${transactionsCount} loaded transaction');
    expect(mobile).not.toContain('Export visible transactions');
    expect(mobile).not.toContain('<FileDown');
    expect(page).not.toContain('All transactions exported');
    expect(page).not.toContain('Full ledger');
  });

  it('opens mobile ledger and payment rows in the shared detail bottom sheet, not an inline dropdown', () => {
    const mobile = mobileSource();

    expect(mobile).toContain('<MobileWalletAtlasLayer />');
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('interactive={false}');
    expect(mobile).toContain("label: 'Credits'");
    expect(mobile).toContain("label: 'Debits'");
    expect(mobile).not.toContain("label: 'Loaded in'");
    expect(mobile).not.toContain("label: 'Loaded out'");
    expect(mobile).not.toContain("label: 'Needs review'");
    expect(mobile).toContain('financeMetrics.credits');
    expect(mobile).toContain('financeMetrics.debits');
    expect(mobile).toContain('Last confirmed ledger totals');
    expect(mobile).toContain('normalizedValue');
    expect(mobile).toContain("label: 'Transactions'");
    expect(mobile).toContain("label: 'Patient payments'");
    expect(mobile).toContain('role="tablist"');
    expect(mobile).toContain('aria-label="Payment activity source"');
    expect(mobile).toContain("aria-label={showBalance ? 'Hide balance' : 'Show balance'}");
    expect(mobile).toContain('Recorded balance');
    expect(mobile).not.toContain('30-day estimate');
    expect(mobile).not.toContain('statusLabel=');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('onOpenFilters={onOpenFilters}');
    expect(mobile).toContain('onOpenStats={onOpenStats}');
    expect(mobile).toContain('Search and filters narrow the explicitly loaded route window only.');
    expect(mobile).not.toContain('<h2 className="text-sm font-semibold text-foreground">Payment activity</h2>');
    expect(mobile).toContain('<MobileListLoadMore');
    expect(mobile).toContain('End of loaded payment activity');
    expect(mobile).not.toContain('<MobileActionRail');
    expect(mobile).not.toContain('onTopUp');
    expect(mobile).not.toContain('onWithdraw');
    expect(mobile).not.toContain('onOpenBilling');

    // Tap-opens-detail-sheet: active-record state + row onClick + one MobileDetailSheet render.
    expect(mobile).toContain("import { MobileDetailSheet } from '../MobileDetailSheet';");
    expect(mobile).toContain('const [activeEntry, setActiveEntry] = useState(null);');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('controller.setActiveEntry({ kind: activeTab, item: entry })');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('isOpen');
    expect(mobile).toContain('onClose: () => setActiveEntry(null)');

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
    expect(dock).toContain("action: dispatchWindowEvent('openWalletAnalytics')");
    expect(page).toContain("window.addEventListener('openWalletAnalytics', handleOpenAnalytics)");
    expect(menu).toContain("'openWalletAnalytics'");
    expect(dock).not.toContain("label: 'Add funds'");
    expect(dock).not.toContain("label: 'Withdraw'");
  });
});
