import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  getPageDataStartupDomainsForRole,
  routeOwnsStartupDomains,
} from '../../config/pageDataAccess';
import { readAnalyticsModalImplementation } from '../../test/sourceEstates';

const read = (path) => fs.readFileSync(path, 'utf8');
const readSubscriptionServiceEstate = () => [
  'src/services/subscriptionService.js',
  ...fs.readdirSync('src/services/subscriptions')
    .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
    .map((name) => `src/services/subscriptions/${name}`),
].map(read).join('\n');
const readSubscriptionPageEstate = () => [
  'src/components/pages/SubscriptionManagementPage.jsx',
  'src/components/pages/subscriptions/SubscriptionManagementPageView.jsx',
  'src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx',
  'src/components/pages/subscriptions/subscriptionPageModel.js',
  'src/components/pages/subscriptions/useSubscriptionPageChrome.js',
  'src/components/pages/subscriptions/useSubscriptionPageController.js',
].map(read).join('\n');
const readMobileSubscriptionEstate = () => [
  'src/components/mobile/MobileSubscriptions.jsx',
  'src/components/mobile/subscriptions/MobileSubscriptionDetailSheet.jsx',
  'src/components/mobile/subscriptions/MobileSubscriptionsAtlasLayer.jsx',
  'src/components/mobile/subscriptions/mobileSubscriptionModel.js',
  'src/components/mobile/subscriptions/useMobileSubscriptionsController.js',
].map(read).join('\n');
const readAppRouteEstate = () => [
  'src/app/AppRoutes.jsx',
  'src/app/appRouteMetadata.js',
].map(read).join('\n');
const readAnalyticsEstate = () => [
  'src/components/pages/Analytics.jsx',
  'src/components/pages/analytics/analyticsPageModel.js',
  'src/components/pages/analytics/useAnalyticsPageController.js',
].map(read).join('\n');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Subscriptions Page 17 intake contract', () => {
  it('provides an explicit route projection and query boundary for the active revamp', () => {
    const service = readSubscriptionServiceEstate();
    const queryHook = read('src/hooks/useSubscriptionsQuery.js');

    expect(service).toContain('export async function getSubscriptionsPage(filter = {})');
    expect(service).toContain("scope: 'admin_subscriber_projection'");
    expect(service).toContain("reason: 'admin_only'");
    expect(service).toContain("reason: 'query_failed'");
    expect(service).toContain("select('*', { count: 'exact' })");
    expect(service).toContain('const exactSubscriberCount = async (filter');
    expect(service).toContain('exactSubscriberCount(totalStatsFilter)');
    expect(service).toContain('exactSubscriberCount(statusStatsFilter');
    expect(service).toContain('exactSubscriberCount(typeStatsFilter');
    expect(queryHook).toContain("queryKey: ['subscriptions', filter]");
    expect(queryHook).toContain('placeholderData: (previous) => previous');
    expect(queryHook).toContain('isPlaceholderData: query.isPlaceholderData');
    expect(queryHook).toContain("invalidateQueries({ queryKey: ['subscriptions'] })");
    expect(queryHook).toContain('return useCallback(');
    const page = readSubscriptionPageEstate();
    const desktop = read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx');
    expect(page).toContain('subscribeToSubscribers(() => invalidateSubscriptions())');
    expect(page).toContain("distributionScope: statsUnavailable ? 'visible_page' : 'exact_filtered_projection'");
    expect(page).toContain('buildSubscriptionAnalytics');
    expect(page).not.toContain('total: subscribers.length');
    expect(page).toContain('useRowSelection(visibleSubscriberRows)');
    expect(page).toContain('byType: { paid, free }');
    expect(page).toContain('byStatus: { active, pending, unsubscribed }');
    expect(desktop).toContain('<Checkbox');
    expect(desktop).toContain('selectedIds.includes(subscriber.id)');
    expect(page).toContain("key: 'dateRange'");
  });

  it('keeps desktop and mobile multi-select admin-gated and fail-closed', () => {
    const page = readSubscriptionPageEstate();
    const desktop = read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx');
    const mobile = readMobileSubscriptionEstate();
    const mobileListRow = read('src/components/mobile/canon/GroupedList.jsx');

    // One page-owned selection state follows every row currently rendered on each viewport.
    expect(page).toContain('useRowSelection');
    expect(page).toContain('const canManageSubscribers = admin;');
    expect(page).toContain('useRowSelection(visibleSubscriberRows)');
    expect(page).toContain('selectable={role.canManageSubscribers}');
    expect(page).toContain('selectionEnabled={role.canManageSubscribers}');
    expect(page).toContain('selectedIds={selection.selectedIds}');
    expect(page).toContain('onSelect={selection.handleToggleSelect}');
    expect(page).toContain('onSelectClick={selection.handleSelectClick}');
    expect(page).toContain('onSelectAll={selection.handleSelectAll}');

    // Desktop uses the shared checkbox/range-selection mechanism and shared bulk bar.
    expect(desktop).toContain("import { Checkbox } from '../../ui/checkbox';");
    expect(desktop).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(desktop).toContain("aria-label={allSelected ? 'Clear subscriber selection' : 'Select all subscribers'}");
    expect(desktop).toContain('checked={selectedIds.includes(subscriber.id)}');
    expect(desktop).toContain('onSelectClick?.(event);');
    expect(page).toContain('<BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>');

    // Mobile long-press enters selection, selected rows receive the shared check overlay,
    // and the selection bar owns select-all plus clear.
    expect(mobile).toContain('selectable={controller.selectionActive}');
    expect(mobile).toContain('selected={controller.selectedIdSet.has(subscriber.id)}');
    expect(mobile).toContain('onLongPress={(item) => onSelect?.(item.id, true)}');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('onSelectAll={() => onSelectAll?.(true)}');
    expect(mobile).toContain('onClear={() => onSelectAll?.(false)}');
    expect(mobileListRow).toContain('{selectable && selected && (');
    expect(mobile).toContain('!loading && !controller.refetching && !controller.showTopSectionLoading && !hasMore');

    // Selection never implies write authority: both bulk controls are disabled and no
    // subscriber/email mutation is called from the page or mobile surface.
    expect(page).toContain('aria-label="Bulk subscriber changes unavailable"');
    expect(mobile).toContain('aria-label="Bulk subscriber changes unavailable"');
    expect(page).toMatch(/<BulkActionBar[\s\S]*?<Button[\s\S]*?disabled/);
    expect(mobile).toMatch(/<MobileSelectionBar[\s\S]*?<button[\s\S]*?disabled/);
    expect(page).not.toContain('sendBulkEmail');
    expect(page).not.toContain('await deleteSubscriber');
    expect(mobile).not.toContain('sendBulkEmail');
  });

  it('uses fixed offset pages and appends only settled mobile results', () => {
    const page = readSubscriptionPageEstate();
    const mobile = readMobileSubscriptionEstate();

    expect(page).toContain('limit: pagination.itemsPerPage');
    expect(page).toContain('offset: (pagination.currentPage - 1) * pagination.itemsPerPage');
    expect(page).not.toContain('pagination.currentPage * pagination.itemsPerPage');
    expect(page).toContain('mobileSubscriberPagesRef');
    expect(page).toContain('if (!isMobile || isPlaceholderData || loading || error || subscriptionDenied) return;');
    expect(page).toContain('pages.set(pagination.currentPage, pageRows)');
    expect(page).toContain('seen.has(subscriber.id)');
    expect(mobile).toContain('loading: loading || refetching');
  });

  it('keeps subscriber rows visible with explicit loaded-row stats when auxiliary counts fail', () => {
    const service = readSubscriptionServiceEstate();
    const page = readSubscriptionPageEstate();
    const mobile = readMobileSubscriptionEstate();

    expect(service).toContain('UNAVAILABLE_SUBSCRIPTION_STATS');
    expect(service).toContain("reason: 'stats_query_failed'");
    expect(service).toContain('statsPromise');
    expect(page).toContain('buildVisibleSubscriptionStats');
    expect(page).toContain('subscriptionStatsUnavailable');
    expect(page).toContain("distributionScope: statsUnavailable ? 'visible_page' : 'exact_filtered_projection'");
    expect(page).toContain('stats={data.subscriptionDisplayStats}');
    expect(mobile).toContain('statsUnavailable = false');
    expect(mobile).toContain('Subscriber statistics are unavailable. Counts use the loaded rows; the list remains current.');
  });

  it('maps exact subscriber type and status buckets to their analytics phases', () => {
    const page = readSubscriptionPageEstate();
    const analyticsModal = readAnalyticsModalImplementation();

    expect(page).toContain('byType: { paid, free }');
    expect(page).toContain('byStatus: { active, pending, unsubscribed }');
    expect(analyticsModal).toContain("type === 'subscription'");
    expect(analyticsModal).toContain('? (analytics.byType || {})');
    expect(analyticsModal).toContain('? (analytics.byStatus || {})');
    expect(analyticsModal).toContain("{ id: 'tiers', label: 'Types' }");
    expect(analyticsModal).toContain("{ id: 'growth', label: 'Status' }");
  });

  it('closes the desktop shell with donor rails, shared KPIs, stats, context, and honest states', () => {
    const page = readSubscriptionPageEstate();
    const desktop = read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx');
    const panel = read('src/components/context/SubscriptionsPanel.jsx');

    expect(page).toContain("if (admin) return 'admin';");
    expect(page).toContain("if (orgAdmin) return 'org_admin';");
    expect(page).toContain("if (provider) return driver ? 'driver' : 'provider';");
    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).not.toContain('getConsoleModuleRailItems({');
    expect(page).toContain('denied: subscriptionDenied');
    expect(page).toContain('denied={data.subscriptionDenied}');

    expect(desktop.match(/<KpiStrip/g)).toHaveLength(1);
    expect(desktop).toContain("pinnedIds={['pending', 'new']}");
    expect(desktop).toContain('importance={{ all: 0, pending: 1, new: 2 }}');
    expect(desktop).not.toMatch(/<KpiStrip[^>]*\bmax=/);
    expect(desktop.match(/<ActivitySheet/g)).toHaveLength(1);
    expect(desktop.match(/<SortableColumnHeader/g)).toHaveLength(1);
    expect(desktop).toContain('searchTestId="subscriptions-sheet-search"');
    expect(desktop).toContain('Subscriber access unavailable');
    expect(desktop).toContain('!denied && failedEmpty && <LoadErrorState');
    expect(desktop).toContain('onRefresh={retry}');
    expect(desktop).toContain("label: 'New subscribers'");

    expect(page).toContain('onClick={handleViewAnalytics}');
    expect(page).toContain("data-state={analyticsModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('Subscriber stats');
    expect(page).toContain("usePageHeader('Email Subscribers', headerActions, null, filterButtonComponent)");
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).not.toContain('usePageFooter(footerContent');
    expect(page).toContain('aria-label="Filter subscribers"');
    expect(panel).toContain("new CustomEvent('openAnalyticsModal')");
    expect(panel).toContain('Opening subscriber stats...');
    expect(panel).toContain('role="status"');

    expect(desktop).toContain('Array.from({ length: 7 }');
    expect(desktop).toContain('<LoadErrorState title="Subscribers did not load"');
    expect(desktop).toContain('Subscribers did not refresh. Showing the previous results.');
    expect(desktop).toContain("heading={hasFilter ? 'No matching subscribers' : 'No subscribers'}");
    expect(panel).toContain('subscriptionsContext?.summary?.loading ?? !subscriptionsContext');
    expect(panel).toContain('role="alert"');

    expect(desktop).not.toContain('Retry to load the subscriber projection.');
    expect(desktop).not.toContain('Commands remain unavailable until authority is proved.');
    expect(panel).not.toContain('Subscriber scope');
    expect(panel).not.toContain('Quick actions');
    expect(panel).toContain('Adding subscribers is not available yet.');
    expect(panel).toContain('Subscriber email tools are not available yet.');
  });

  it('surfaces welcome and unsubscribe evidence timestamps on the desktop read surfaces', () => {
    const model = read('src/components/pages/subscriptions/subscriptionPageModel.js');
    const desktop = read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx');

    // ADOPT-15: fetched welcome_email_sent_at evidence reaches the row subtitle and the
    // detail rail through one model helper; an absent timestamp falls back to the bare
    // boolean and renders the honest Not sent, never a fabricated Pending state.
    expect(model).toContain('formatSubscriberEventDate(subscriber?.welcome_email_sent_at)');
    expect(model).toContain("return subscriber?.welcome_email_sent === true ? 'Sent' : 'Not sent';");
    expect(desktop).toContain('{`Welcome ${getWelcomeEmailEvidenceLabel(subscriber).toLowerCase()}`}');
    expect(desktop).toContain('label="Welcome email" value={getWelcomeEmailEvidenceLabel(subscriber)}');
    expect(desktop).not.toContain("'Welcome sent' : 'Welcome pending'");
    expect(desktop).not.toContain("welcome_email_sent ? 'Sent' : 'Pending'");

    // ADOPT-16: unsubscribed_at renders on the detail rail for status=unsubscribed rows
    // only; a terminal row missing the timestamp reports Unknown, never a made-up date.
    expect(model).toContain("if (String(subscriber?.status || '').toLowerCase() !== 'unsubscribed') return null;");
    expect(model).toContain("return formatSubscriberEventDate(subscriber?.unsubscribed_at) || 'Unknown';");
    expect(desktop).toContain('{getUnsubscribedEvidenceLabel(subscriber) && <DetailLine icon={MailX} label="Unsubscribed" value={getUnsubscribedEvidenceLabel(subscriber)} />}');

    // Evidence dates go through the date-only-safe formatter (local-noon anchor) so a
    // date-only value cannot shift a calendar day in negative UTC offsets.
    expect(model).toContain('T12:00:00');
  });

  it('keeps Subscriptions in intake only and out of the default visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = readAppRouteEstate();
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 17 Intake Audit - Subscriptions');
    // VISUAL-ONLY pass applied 2026-07-08: the Requests-canon energy now renders in
    // MobileSubscriptions, while command/backend authority stays unauthorized and
    // fail-closed (no mutation added). The doc must say visual done, commands NOT granted.
    expect(gate).toContain('has the VISUAL-ONLY Requests-canon energy applied to `MobileSubscriptions.jsx`');
    expect(gate).toContain('The visual pass changed presentation only; no mutation was added.');
    expect(gate).toContain('Command and backend authority stay unauthorized and fail-closed: subscriber edit/delete/status/type, welcome/custom/bulk email send, and export remain blocked pending backend authority and delivery-consequence proof');
    expect(gate).toContain('remains command/backend intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('Promotion rule: the first Subscriptions visual pass must close this blocker map before adding Page 17 to the default hardgate.');

    expect(app).toContain("subscriptions: lazyNamedPage(() => import('../components/pages/SubscriptionManagementPage'), 'SubscriptionManagementPage')");
    expect(app).toContain("{ id: 'subscriptions', path: '/subscriptions', minRole: 'admin' }");
    expect(routes).toContain("'/subscriptions': {");
    expect(routes).toContain("minRole: 'admin'");
    expect(routes).toContain("resource: 'subscriptions'");
    expect(navigation).toContain("{ id: 'subscriptions', path: '/subscriptions', icon: Mail, label: 'Email Subscribers', resource: 'subscriptions', minRole: 'admin' }");
    expect(mobileNavigation).toContain("{ prefix: '/subscriptions', id: 'subscriptions', path: '/subscriptions', label: 'Subscribers' }");
    expect(routeOwnsStartupDomains('/subscriptions')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/subscriptions')).toEqual([]);

    [
      'src/components/pages/SubscriptionManagementPage.jsx',
      'src/components/mobile/MobileSubscriptions.jsx',
      'src/components/context/SubscriptionsPanel.jsx',
      'src/components/modals/SubscriptionModal.jsx',
    ].forEach((file) => {
      expect(hardgate).toContain(file);
    });
    [
      'src/components/views/SubscriptionListView.jsx',
      'src/components/views/SubscriptionTableView.jsx',
      'src/hooks/useSubscription.js',
      'src/services/subscriptionService.js',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('preserves the old Subscriptions behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/SubscriptionManagementPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobileSubscriptions.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/SubscriptionsPanel.jsx');
    const oldModal = gitShowHead('frontend/src/components/modals/SubscriptionModal.jsx');
    const oldList = gitShowHead('frontend/src/components/views/SubscriptionListView.jsx');
    const oldTable = gitShowHead('frontend/src/components/views/SubscriptionTableView.jsx');
    const oldHook = gitShowHead('frontend/src/hooks/useSubscription.js');
    const oldService = gitShowHead('frontend/src/services/subscriptionService.js');
    const oldDuplicateService = gitShowHead('frontend/src/services/subscribersService.js');

    const page = readSubscriptionPageEstate();
    const mobile = readMobileSubscriptionEstate();
    const panel = read('src/components/context/SubscriptionsPanel.jsx');
    const modal = read('src/components/modals/SubscriptionModal.jsx');
    const list = read('src/components/views/SubscriptionListView.jsx');
    const table = read('src/components/views/SubscriptionTableView.jsx');
    const hook = read('src/hooks/useSubscription.js');
    const service = readSubscriptionServiceEstate();
    // subscribersService.js was deleted 2026-07-07 after removal proof (zero source imports);
    // its old shape is preserved as baseline evidence via oldDuplicateService, and the working
    // tree must no longer carry the duplicate owner.
    const duplicateServiceExists = fs.existsSync('src/services/subscribersService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/SubscriptionManagementPage.jsx`');
    expect(gate).toContain("`usePageHeader('Subscription Management')`, `useViewMode('subscription', 'grid')`, `usePagination(20)`, `useSubscription()`");
    expect(gate).toContain('desktop KPI cards for Total/Active/New/Paid/Free, local filter/search/pagination, grid/list/table renderers');
    expect(gate).toContain('mobile `Paid Conversion`, `Revenue Dynamics`, `LIVE` labels, row reveal/edit/delete');
    expect(gate).toContain('modal welcome/custom/bulk email modes, campaign template loading, hook auto fetch/realtime, direct subscriber table writes, direct Edge Function invokes, and duplicate subscriber service exports.');

    for (const source of [oldPage]) {
      expect(source).toContain("useViewMode('subscription', 'grid')");
      expect(source).toContain('const pagination = usePagination(20);');
      expect(source).toContain("window.addEventListener('openSubscriptionModal', handleOpenModal);");
      expect(source).toContain("window.addEventListener('openAnalyticsModal', handleOpenAnalytics);");
      expect(source).toContain("usePageHeader(\n    'Subscription Management'");
      expect(source).toContain('ADD SUBSCRIBER');
      expect(source).toContain('<MobileSubscriptions');
      expect(source).toContain('<SubscriptionModal');
      expect(source).toContain('<AnalyticsModal');
      expect(source).toContain('<FilterSheet');
      expect(source).toContain('<ConfirmationModal');
      expect(source).toContain('<BulkActionBar');
      expect(source).toContain('<SubscriptionListView');
      expect(source).toContain('<SubscriptionTableView');
      expect(source).toContain('paidConversionRate');
      expect(source).toMatch(/\{isAdmin(?:\(\))? && \(/);
    }
    expect(oldPage).toContain('useSubscription();');
    expect(page).toContain('useSubscriptionsQuery(subscriptionQueryFilter);');
    expect(page).toContain('<SubscriptionsDesktopWorkspace');
    expect(page).not.toMatch(/useViewMode|SubscriptionListView|SubscriptionTableView/);
    expect(page).toContain('<BulkActionBar');
    expect(oldPage).toContain('await deleteSubscriber(subscriber.id);');
    expect(oldPage).toContain('await updateSubscriber(selectedSubscriber.id, data);');
    expect(oldPage).toContain('await createSubscriber(data);');
    expect(oldPage).toContain("toast.success('Subscriber deleted successfully')");
    expect(oldPage).toContain("toast.success('Subscriber updated successfully')");
    expect(oldPage).toContain("toast.success('Subscriber created successfully')");
    expect(oldPage).toContain('toast.success(`${selectedIds.length} subscribers deleted`);');
    expect(oldPage).toContain('canManage={isAdmin()}');
    expect(page).not.toContain('createSubscriber,');
    expect(page).not.toContain('updateSubscriber,');
    expect(page).not.toContain('deleteSubscriber,');
    expect(page).not.toContain('await deleteSubscriber');
    expect(page).not.toContain('await updateSubscriber');
    expect(page).not.toContain('await createSubscriber');
    expect(page).not.toContain("toast.success('Subscriber deleted successfully')");
    expect(page).not.toContain("toast.success('Subscriber updated successfully')");
    expect(page).not.toContain("toast.success('Subscriber created successfully')");
    expect(page).toContain("const SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE = 'Subscriber and email changes are not available yet.';");
    expect(page).toContain('setSubscriptionCommandNotice(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);');
    expect(mobile).toContain('id="subscriptions-action-feedback"');
    expect(page).toContain('actionNotice={state.subscriptionCommandNotice}');
    expect(page).toContain('aria-label="Subscriber stats"');
    expect(read('src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx')).toContain('<Checkbox');
    expect(page).toContain("data-state={analyticsModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('onEdit={null}');
    expect(page).toContain('onDelete={null}');
    expect(page).toContain('canManage={role.canManageSubscribers}');
    expect(page).toContain("return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';");
    expect(page).toContain("return 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]';");
    expect(page).toContain("return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';");

    // Baseline (f31f29f) billboard inventory: the old dashboard billboard + glance-tile rail
    // existed before the canon LIST rebuild. Preserved as EVIDENCE (oldMobile only), not canon.
    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('MobileSecondaryMetricRail');
    expect(oldMobile).toContain("title: 'Paid Mix'");
    expect(oldMobile).toContain('Subscriber Registry');

    // The terminal end-of-list label is contract-pinned verbatim across the rebuild.
    for (const source of [oldMobile, mobile]) {
      expect(source).toContain('<MobileListEnd label="End of subscriber list" />');
    }

    // CANON LIST rebuild (2026-07-11): MobileSubscriptions composes the same grammar as
    // MobileUsers / MobileSupportTickets / MobileHealthNews. The DASHBOARD billboard + glance
    // rail are GONE (the LIST grammar bans both); the canon kit + status KPI axis replace them.
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).toContain("import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupList } from './canon';");
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<SkeletonGroupList');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('useSkeletonWarmup');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).toContain('scopeCount');
    // The Updating pill consumes the REAL refetch signal (page-synthesised isFetching).
    expect(mobile).toContain('isFetching');
    expect(mobile).toContain('<UpdatingPillRow');
    // Baseline (f31f29f) old-markup evidence: revenue/live wording, all-caps blades, the
    // old inline welcome-email tile, and live edit/delete row CTAs existed before the pass.
    expect(oldMobile).toContain("delta: 'LIVE'");
    expect(oldMobile).toContain("label: 'Paid Conversion'");
    expect(oldMobile).toContain('Revenue Dynamics');
    expect(oldMobile).toContain("subtitle: 'Monetization'");
    expect(oldMobile).toContain("badge: paid ? 'PAID' : 'FREE'");
    expect(oldMobile).toContain("String(sub.status || 'unknown').toUpperCase()");
    expect(oldMobile).toContain("Welcome Email: {sub.welcome_email_sent ? 'Sent' : 'Pending'}");
    expect(oldMobile).toContain('onClick={() => onEdit(sub)}');
    expect(oldMobile).toContain('onClick={() => onDelete(sub)}');

    // The canonical list now carries only grounded status/type evidence. The status KPI really
    // scopes the rows and the adaptive grouping falls back to coarse recency when one status
    // dominates; there is no billboard-era loaded/shown metric furniture left to preserve.
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain("import { resolveVital } from '../../constants/vitalTracks';");
    expect(mobile).toContain('resolveAdaptiveGroups');
    expect(mobile).not.toContain("import { groupByMonth } from '../../utils/groupByMonth';");
    expect(mobile).toContain('buildMobileSubscriptionGroups(displaySubscribers)');
    expect(mobile).toContain('<SkeletonGroupList groups={2} rowsPerGroup={[3, 2]}');
    expect(mobile).toContain("const kpiEmptyCause = activeKpi !== 'all'");
    expect(mobile).toContain("type: 'coarse-recency'");
    expect(mobile).toContain("const vital = resolveVital('subscription', status);");
    expect(mobile).toContain('statusPill={vital?.pill}');
    expect(mobile).toContain("meta={`${planLabel(subscriber.type)} plan`}");
    expect(mobile).toContain("markerChip={welcomed ? 'Welcome' : null}");

    // Phone taps open one detail sheet; tablet taps focus the route-owned rail. No inline
    // row expansion or live write command survives.
    expect(mobile).toContain('const [activeSubscriber, setActiveSubscriber] = useState(null);');
    expect(mobile).toContain('onOpen={handleOpenSubscriber}');
    expect(mobile).toContain('controller.setActiveSubscriber(subscriber);');
    expect(mobile).not.toContain('onFocusSubscriber');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('isOpen={!!activeSubscriber}');
    expect(mobile).toContain('onClose={() => controller.setActiveSubscriber(null)}');
    expect(mobile).toContain("vital={vital ? { ...vital, label: 'Subscription status' } : null}");
    expect(mobile).toContain('islands={[');
    expect(mobile).toContain("value: planLabel(activeSubscriber.type)");

    // The inline-expand mechanism is fully removed (no dropdown state or reveal props).
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('expandedId');
    expect(mobile).not.toContain('onExpand');

    // NEW ENERGY removed the status-only rightBlade and the old status label/badge.
    expect(mobile).not.toContain('rightBlade');
    expect(mobile).not.toContain("badge: paid ? 'Paid' : 'Free'");
    expect(mobile).not.toContain('label={formatLabel(sub.status)}');

    // Read-only lock (S7): a single Details CTA on the sheet, no live edit/delete handler.
    expect(mobile).toContain("label: 'Details'");
    expect(mobile).toContain('onView?.(activeSubscriber)');
    expect(mobile).not.toContain('onClick={() => onEdit(sub)}');
    expect(mobile).not.toContain('onClick={() => onDelete(sub)}');

    // Chrome-clean locks preserved (borderless; canonical radius only). The last
    // in-file radius holders (search input + trigger buttons) moved into the canon
    // kit in the Wave-2 migration (2026-07-09); the raw-radius bans below still
    // prove no non-token radius sneaks back in.
    expect(mobile).toContain("from './canon'");
    expect(mobile).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|md|sm|full|\[[^\]]+\])\b/);
    expect(mobile).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(mobile).not.toMatch(/\bgeo-/);
    expect(mobile).not.toMatch(/\bborder-/);
    expect(mobile).not.toMatch(/\bring-/);
    expect(mobile).not.toMatch(/\boutline-/);
    expect(mobile).not.toMatch(/\buppercase\b/);
    expect(mobile).not.toMatch(/\btracking-/);
    // No-revenue-language safety locks preserved.
    expect(mobile).not.toContain("delta: 'LIVE'");
    expect(mobile).not.toContain('Revenue Dynamics');
    expect(mobile).not.toContain('Monetization');
    expect(mobile).not.toContain("badge: paid ? 'PAID' : 'FREE'");

    expect(oldPanel).toContain("new CustomEvent('openEmailActionsModal')");
    expect(oldPanel).toContain("new CustomEvent('openSubscriptionModal')");
    expect(oldPanel).toContain("new CustomEvent('openAnalyticsModal')");
    expect(oldPanel).toContain('Pulse Overview');
    expect(oldPanel).toContain('Active Reach');
    expect(oldPanel).toContain('Growth active');
    expect(oldPanel).toContain('Free Tier');
    expect(oldPanel).toContain('Premium');
    expect(oldPanel).toContain('Broadcast');
    expect(oldPanel).toContain('Live Feed');
    expect(oldPanel).toContain('{subscriber.email}');

    expect(panel).not.toContain("new CustomEvent('openEmailActionsModal')");
    expect(panel).toContain("new CustomEvent('openSubscriptionModal')");
    expect(panel).toContain("new CustomEvent('openAnalyticsModal')");
    expect(panel).toContain('Subscriber overview');
    expect(panel).toContain('Current subscriber');
    expect(panel).toContain('Actions');
    expect(panel).toContain('Recent subscribers');
    expect(panel).toContain('subscriber.email');
    expect(panel).toContain('subscriptionsContext');
    expect(panel).toContain('rounded-card');
    expect(panel).not.toContain('rounded-modal');
    expect(panel).toContain('rounded-inner');
    expect(panel).toContain('rounded-icon');
    expect(panel).toContain('rounded-pill');
    expect(panel).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|md|sm|full|\[[^\]]+\])\b/);
    expect(panel).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(panel).not.toMatch(/\bgeo-/);
    expect(panel).not.toMatch(/\bborder-/);
    expect(panel).not.toMatch(/\bring-/);
    expect(panel).not.toMatch(/\boutline-/);
    expect(panel).not.toMatch(/\btracking-/);

    expect(oldModal).toContain('getSubscribersForBulkEmail');
    expect(oldModal).toContain('sendBulkEmail');
    expect(oldModal).toContain('sendWelcomeToSubscriber');
    expect(oldModal).toContain('sendCustomEmail');
    expect(oldModal).toContain('IVISIT_106_CAMPAIGN_SUBJECT');
    expect(oldModal).toContain('System Registry v2');
    expect(modal).toContain('<ModalShell');
    expect(modal).toContain("mode === 'view'");
    expect(modal).toContain('Subscriber changes unavailable');
    expect(modal).not.toContain('getSubscribersForBulkEmail');
    expect(modal).not.toContain('sendBulkEmail');
    expect(modal).not.toContain('sendWelcomeToSubscriber');
    expect(modal).not.toContain('sendCustomEmail');
    expect(modal).not.toContain('System Registry v2');

    for (const source of [oldList, list]) {
      expect(source).toContain('onView(subscriber)');
      expect(source).toContain('onEdit(subscriber)');
      expect(source).toContain('onDelete(subscriber)');
      expect(source).toContain('Welcome');
      expect(source).toContain('Status');
    }

    for (const source of [oldTable, table]) {
      expect(source).toContain('aria-label="Select all"');
      expect(source).toContain('View Details');
      expect(source).toContain('Edit');
      expect(source).toContain('Delete');
      expect(source).toContain('Welcome Email');
    }

    expect(oldHook).toContain('export const useSubscription = () => {');
    expect(hook).toContain('export const useSubscription = (options = {}) => {');
    expect(hook).toContain('autoFetch = true');
    expect(hook).toContain('autoSubscribe = true');
    expect(hook).toContain('if (!autoFetch) {');
    expect(hook).toContain('if (!autoSubscribe) return undefined;');

    for (const source of [oldHook, hook]) {
      expect(source).toContain('useEffect(() => {');
      expect(source).toContain('fetchSubscribers');
      expect(source).toContain('return subscribeToSubscribers((payload) => {');
      expect(source).toContain('createSubscriberWithWelcome(subscriberData)');
      expect(source).toContain('updateSubscriberStatus(id, status)');
      expect(source).toContain('updateSubscriberType(id, type)');
      expect(source).toContain('markWelcomeEmailSent(id)');
      expect(source).toContain('sendWelcomeToSubscriber(subscriberId)');
    }

    for (const source of [oldService, service]) {
      expect(source).toContain("const TABLE_NAME = 'subscribers';");
      expect(source).toContain('export async function getSubscribers(filter = {})');
      expect(source).toContain("if (user?.role !== 'admin') {");
      expect(source).toContain('return []; // Return empty array on error');
      expect(source).toContain('export async function createSubscriber(input)');
      expect(source).toContain('export async function updateSubscriber(subscriberId, input)');
      expect(source).toContain('export async function deleteSubscriber(subscriberId)');
      expect(source).toContain('export async function createSubscriberWithWelcome(input)');
      expect(source).toContain("supabase.functions.invoke('sendWelcome'");
      expect(source).toContain("supabase.functions.invoke('sendCustomEmail'");
      expect(source).toContain("supabase.functions.invoke('sendBulkEmail'");
      expect(source).toContain('export async function getSubscribersForBulkEmail()');
      expect(source).toContain("channel('subscribers_changes')");
      expect(source).toContain("channel('new_subscribers')");
    }

    // Baseline evidence: the duplicate owner existed at f31f29f with its own table CRUD/count/realtime.
    expect(oldDuplicateService).toContain("const TABLE_NAME = 'subscribers';");
    expect(oldDuplicateService).toContain('export async function getSubscribers()');
    expect(oldDuplicateService).toContain('export async function createSubscriber(input)');
    expect(oldDuplicateService).toContain('export async function deleteSubscriber(subscriberId)');
    expect(oldDuplicateService).toContain('export async function getSubscriberCount()');
    expect(oldDuplicateService).toContain('export function subscribeToSubscribers(callback)');
    expect(oldDuplicateService).toContain("channel('subscribers_all')");

    // Removal proof: the duplicate owner is gone and subscriptionService is the single facade.
    expect(duplicateServiceExists).toBe(false);
    expect(service).toContain('export function subscribeToSubscribers(callback)');
    expect(service).toContain('export async function deleteSubscriber(subscriberId)');
  });

  it('blocks Subscriptions canon reuse until subscriber, email, shell, and billing semantics close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const subplan = read('docs/implementation/console-service-alignment/passes/PASS_7_SUBSCRIPTION_MANAGEMENT_FLOW_SUBPLAN_2026-05-24.md');
    const evidence = read('docs/implementation/console-service-alignment/passes/PASS_7_SUBSCRIPTION_MANAGEMENT_EVIDENCE_AUDIT_2026-05-24.md');
    const checklist = read('docs/implementation/console-service-alignment/checklists/PASS_7_CARE_CONTENT_SUBSCRIBERS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md');
    const stage5 = read('docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md');
    const page = readSubscriptionPageEstate();
    const panel = read('src/components/context/SubscriptionsPanel.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/SubscriptionsPanel.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');
    const routeActionOwnership = read('src/config/routeActionOwnership.js');
    const analytics = readAnalyticsEstate();
    const hook = read('src/hooks/useSubscription.js');
    const pageDataAccess = read('src/config/pageDataAccess.js');

    expect(gate).toContain('Subscriptions Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('Data ownership: not admitted. The active page hook, active service, duplicate service, and explicit modal/email actions can still touch subscriber truth.');
    expect(gate).toContain('Hidden shell hooks are quiet and Analytics no longer mounts the subscriber hook');
    expect(gate).toContain('PageData/shell ownership: partially quieted, not admitted. `/subscriptions` now has a zero-domain startup override');
    expect(gate).toContain('ContextPanel requests the page-published `subscriptionsRouteContextUpdated` projection instead of mounting a subscriber hook');
    expect(gate).toContain('First command safety cleanup on 2026-07-06 stopped the active page from destructuring `createSubscriber`, `updateSubscriber`, or `deleteSubscriber`');
    expect(gate).toContain('header add, context-panel Join, empty-state add, edit/delete buttons, mobile edit/delete, table selection, modal save, and bulk delete now fail closed or stay hidden');
    expect(gate).toContain('Command authority: blocked and fail-closed in active UI.');
    expect(gate).toContain('Active page edit/delete/select/bulk paths now show unavailable feedback or stay hidden instead of calling subscriber mutations.');
    expect(gate).toContain('Create authority: intake only and fail-closed in active UI.');
    expect(gate).toContain('Active header/context/empty-state create now shows unavailable feedback until create-without-email is separated from any welcome command.');
    expect(gate).toContain('Email lifecycle: blocked. Welcome, custom, bulk, campaign, unsubscribe, and bulk-recipient actions must remain unavailable');
    expect(gate).toContain('Paid/billing semantics: blocked. `type = paid`, old `Paid Conversion`, old `Revenue Dynamics`, and old `Monetization` remain marketing tier inventory only');
    expect(gate).toContain('The right panel no longer renders `Premium`; it labels the count as `Paid type`. Mobile no longer renders `Paid Conversion`, `Revenue Dynamics`, `Monetization`, `LIVE`, or all-caps paid/free blades in active source.');
    expect(gate).toContain('Shared modal/panel: intake only. `SubscriptionModal` uses private chrome and direct command imports');
    expect(gate).toContain('Subscriptions mobile/right-panel squircle and source-voice cleanup on 2026-07-06 converted `MobileSubscriptions.jsx` and `SubscriptionsPanel.jsx` to semantic radius tokens, removed local decorative border/ring/outline/tracking/all-caps mobile chrome, replaced loaded-row `LIVE`/revenue/monetization wording with loaded-row subscriber mix language, and preserved search, filters, analytics trigger, row reveal, pull-to-refresh, load more, route-summary panel counts, Join/Data event bridges, disabled Email off, and unavailable command guards.');
    expect(gate).toContain('This gives `MobileSubscriptions.jsx` and `SubscriptionsPanel.jsx` focused strict-radius and source-voice proof only; it does not admit Subscriptions, prove subscriber projection/counts, prove email delivery, or make loaded-row charts canonical.');
    // VISUAL-ONLY rollout pass documented (visual done, commands NOT granted).
    expect(gate).toContain('Subscriptions VISUAL-ONLY rollout pass on 2026-07-08 applied the Requests-canon energy to `MobileSubscriptions.jsx`');
    expect(gate).toContain('This pass changed presentation only; it added no mutation');
    expect(gate).toContain('and did not grant subscriber command/backend authority, prove subscriber projection/counts, prove email delivery, or admit Page 17 to the default hardgate.');
    expect(gate).toContain('| Data quieting | PageData startup, context panel hook, desktop FAB hook, and mobile bottom hook are quieted from hidden subscriber fetch/realtime; Analytics no longer mounts the subscriber hook.');

    expect(subplan).toContain('Detailed implementation subplan only. No product, database, Edge Function, cleanup, email send, seed, migration, or runtime mutation is authorized by this document.');
    expect(subplan).toContain('This subplan covers subscription management failures across subscriber intake/read, unsupported management writes, welcome email, custom email, bulk email, realtime subscriber updates, and duplicate service ownership.');
    expect(subplan).toContain('`subscriptionService.js` and `subscribersService.js` both own `subscribers` table behavior.');
    expect(subplan).toContain('`SubscriptionModal` can send welcome, custom, and bulk emails directly through `subscriptionService`.');
    expect(subplan).toContain('every mounted hook instance performs its own full subscriber fetch and broad realtime subscription.');
    expect(subplan).toContain('`SubscriptionsPanel` exposes a Broadcast button that dispatches `openEmailActionsModal`, while `SubscriptionManagementPage` only receives create and analytics events; the visible email action currently has no mounted receiver.');
    expect(subplan).toContain('Subscriber paging is client-side over an unwindowed hook fetch, and `subscriptionService.getSubscribers()` returns an empty array for both unauthorized and failed list fetches.');
    expect(subplan).toContain('MobileSubscriptions` reports `Paid Conversion`, `Revenue Dynamics`, and `Monetization` from `subscribers.type`');

    expect(evidence).toContain('This is an evidence-only checkpoint for the subscription management subpass. It does not authorize implementation, email sends, database writes, Edge Function tests, seed data, or cleanup.');
    expect(evidence).toContain('Subscription management is not missing a single handler. It has too many owners for one lifecycle');
    expect(evidence).toContain('RLS allows public insert and admin select.');
    expect(evidence).toContain('current source proves admin read but not admin update/delete');
    expect(evidence).toContain('Keep passive realtime behavior and consolidate repeated hook-mounted reads/channels.');
    expect(evidence).toContain('Replace revenue/conversion/premium-payment implications derived only from `subscribers.type` unless an authorized billing source is joined.');
    expect(evidence).toContain('Disable the dead Broadcast panel action or mount it through the single audited email command surface.');

    expect(checklist).toContain('Implementation-control checklist only. This document does not authorize');
    expect(checklist).toContain('subscriber update/delete/export, welcome/custom/bulk email send, unsubscribe endpoint work, Edge Function invocation');
    expect(checklist).toContain('Stop hidden shell controls from mounting full protected insurance/support/subscriber reads before an authorized route or command opens.');
    expect(checklist).toContain('| `/subscriptions` and variants | Platform-admin read-only subscriber list; create row without email where authorized. | Edit/delete/status/type, false bulk delete, revenue/paid conversion language. | Lifecycle receiver, admin scope, billing proof if revenue labels remain. |');
    expect(checklist).toContain('| `SubscriptionsPanel` | Admin-only source-labelled subscriber summary. | Dead Broadcast event and raw email exposure outside intended admin scope. | Mounted email command surface and capability. |');
    expect(checklist).toContain('| `SubscriptionModal` | Create subscriber without welcome send. | Welcome/custom/bulk send. | Deployed slugs, durable lifecycle fields, idempotency and per-recipient results. |');
    expect(checklist).toContain('| `ContextAwareFAB` and `DynamicBottomBar` | Visible command shells only. | Hooking protected insurance/support/subscriber lists while hidden or unrelated. | Action-owned lazy command data and route/auth gate. |');
    expect(checklist).toContain('Never render loaded-window counts as complete queue/content/subscriber analytics.');
    expect(checklist).toContain('Never treat `subscribers.type = paid` as payment, revenue, entitlement or billing proof.');
    expect(checklist).toContain('Never mount hidden global hooks that load protected care/subscriber rows.');
    expect(checklist).toContain('Never send email or claim unsubscribe support until slug topology and durable lifecycle state are proved.');

    expect(stage5).toContain('| `ContextAwareFAB` shell mount | Insurance policies, support tickets and subscribers |');
    expect(stage5).toContain('| `DynamicBottomBar` shell mount | Insurance policies, support tickets and subscribers |');
    expect(stage5).toContain('| Subscription Broadcast action | `SubscriptionsPanel` dispatches `openEmailActionsModal`; `SubscriptionManagementPage` listens for create and analytics events only');
    expect(stage5).toContain('| `openEmailActionsModal` | The subscription panel emits this event; no listener was found.');
    expect(stage5).toContain('Pass 7 retains `subscriptionService.js` as the active subscriber/email workflow facade and keeps `subscribersService.js` compatibility-only until removal proof exists.');
    expect(stage5).toContain('Removal proof (2026-07-07): a repo-wide import scan found zero source imports of `subscribersService.js`');
    expect(stage5).toContain('Welcome email state must be receiver-confirmed before `welcome_email_sent` style fields are shown as truth.');
    expect(stage5).toContain('Bulk/custom email must have row-level pending, failure, and retry semantics.');

    expect(oldPanel).toContain("new CustomEvent('openEmailActionsModal')");
    expect(panel).not.toContain("new CustomEvent('openEmailActionsModal')");
    expect(panel).toContain('subscriber.email');
    expect(panel).not.toContain('Premium');
    expect(panel).toContain('subscriptionsContext = null');
    expect(panel).toContain('label="Email" unavailable');
    expect(panel).toContain("data-state={unavailable ? 'unavailable' : 'available'}");
    expect(page).not.toContain("window.addEventListener('openEmailActionsModal'");
    expect(page).not.toContain('await createSubscriber');
    expect(page).not.toContain('await updateSubscriber');
    expect(page).not.toContain('await deleteSubscriber');
    expect(page).toContain('handleSubscriptionCommandUnavailable');
    expect(page).toContain('subscriptionsRouteContextUpdated');
    expect(page).toContain('requestSubscriptionsRouteContext');
    expect(contextPanel).not.toContain('const { subscribers } = useSubscription({ autoFetch: false, autoSubscribe: false });');
    expect(contextPanel).toContain('subscriptionsRouteContextUpdated');
    expect(contextPanel).toContain('requestSubscriptionsRouteContext');
    expect(contextPanel).toContain('subscriptionsContext={subscriptionsRouteContext}');
    expect(contextFab).toContain('const routeOwnsAction = routeOwnsShellAction(location.pathname)');
    expect(routeActionOwnership).toContain("'/subscriptions'");
    expect(contextFab).toContain("case 'subscription': return <SubscriptionModal key={key} {...props} mode=\"create\" />;");
    expect(contextFab).not.toContain('createSubscriber');
    expect(contextFab).toContain("case 'emailActions': return <SubscriptionModal key={key} {...props} mode=\"emailActions\" />;");
    expect(bottomBar).toContain("pathname.startsWith('/subscriptions')");
    expect(bottomBar).toContain("label: 'Subscriber stats'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openAnalyticsModal')");
    expect(bottomBar).toContain("case 'subscription': return <SubscriptionModal key={key} {...props} mode=\"create\" />;");
    expect(bottomBar).not.toContain('createSubscriber');
    expect(bottomBar).toContain("case 'emailActions': return <SubscriptionModal key={key} {...props} mode=\"emailActions\" />;");
    expect(analytics).not.toContain('useSubscription');
    expect(analytics).not.toContain('fetchSubscriptionAnalytics');
    expect(analytics).toContain('DEFAULT_ANALYTICS_SUBSCRIPTION_STATS');
    expect(analytics).toContain('getAnalyticsIntakePage');
    expect(hook).toContain('export const useSubscription = (options = {}) => {');
    expect(hook).toContain('fetchSubscribers({ quiet: true });');
    expect(hook).toContain('if (!autoFetch) {');
    expect(hook).toContain('if (!autoSubscribe) return undefined;');
    expect(hook).toContain('return subscribeToSubscribers((payload) => {');
    expect(pageDataAccess).not.toContain("domains.push('subscribers'");
    expect(routeOwnsStartupDomains('/subscriptions')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/subscriptions')).toEqual([]);
  });
});
