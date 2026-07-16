import fs from 'fs';
import { execFileSync } from 'child_process';
import { getAccessibleNav } from '../../config/navigation';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';
import { readAnalyticsModalImplementation } from '../../test/sourceEstates';

describe('HealthNewsManagementPage intake audit contract', () => {
  const readOwnedModules = (directory) => fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.[jt]sx?$/.test(entry.name) && !entry.name.includes('.test.'))
    .map((entry) => entry.name)
    .sort()
    .map((name) => fs.readFileSync(`${directory}/${name}`, 'utf8'));
  const pageSource = () => [
    fs.readFileSync('src/components/pages/HealthNewsManagementPage.jsx', 'utf8'),
    ...readOwnedModules('src/components/pages/health-news'),
  ].join('\n');
  const panelSource = () => fs.readFileSync('src/components/context/HealthNewsPanel.jsx', 'utf8');
  const listSource = () => fs.readFileSync('src/components/views/HealthNewsListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/HealthNewsTableView.jsx', 'utf8');
  const mobileSource = () => [
    fs.readFileSync('src/components/mobile/MobileHealthNews.jsx', 'utf8'),
    ...readOwnedModules('src/components/mobile/health-news'),
  ].join('\n');
  const modalSource = () => fs.readFileSync('src/components/modals/HealthNewsModal.jsx', 'utf8');
  const filterSheetSource = () => fs.readFileSync('src/components/common/FilterSheet.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const serviceSource = () => [
    fs.readFileSync('src/services/healthNewsService.js', 'utf8'),
    ...readOwnedModules('src/services/health-news'),
  ].join('\n');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
  const PRESERVATION_BASELINE = 'f31f29f';
  const headSource = (path) => execFileSync('git', ['show', `${PRESERVATION_BASELINE}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  it('keeps Health News org-admin scoped in route and navigation contracts', () => {
    const appRoutes = fs.readFileSync('src/app/AppRoutes.jsx', 'utf8');
    const routeMetadata = fs.readFileSync('src/app/appRouteMetadata.js', 'utf8');

    expect(getRouteProtection('/health-news')).toEqual({
      minRole: 'org_admin',
      resource: 'news',
      title: 'Health News',
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/health-news');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/health-news');
    expect(getProtectedRoutesForRole('provider')).not.toContain('/health-news');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/health-news');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/health-news');

    expect(getAccessibleNav({ role: 'org_admin' }).mgmt.items.find((item) => item.path === '/health-news')?.label)
      .toBe('Health News');
    expect(getAccessibleNav({ role: 'admin' }).mgmt.items.find((item) => item.path === '/health-news')?.label)
      .toBe('Health News');
    expect(getAccessibleNav({ role: 'provider' }).mgmt.items.map((item) => item.path))
      .not.toContain('/health-news');
    expect(getAccessibleNav({ role: 'sponsor' }).mgmt)
      .toBeNull();
    expect(appRoutes).toContain("healthNews: lazyNamedPage(() => import('../components/pages/HealthNewsManagementPage'), 'HealthNewsManagementPage')");
    expect(routeMetadata).toContain("{ id: 'healthNews', path: '/health-news', minRole: 'org_admin' }");
  });

  it('keeps the phone accumulator out of tablet renders and stabilizes the empty query result', () => {
    const controller = fs.readFileSync('src/components/pages/health-news/useHealthNewsPageController.js', 'utf8');
    const hook = fs.readFileSync('src/hooks/useHealthNewsQuery.js', 'utf8');

    expect(controller).toContain('const { isPhone, isMobile } = useNavigation();');
    expect(controller).toContain('if (!isPhone) return;');
    expect(controller).toContain('[currentPage, isPhone, newsRows]');
    expect(hook).toContain('const EMPTY_HEALTH_NEWS_ROWS = Object.freeze([]);');
    expect(hook).toContain('data: query.data?.data ?? EMPTY_HEALTH_NEWS_ROWS');
  });

  it('anchors the Health News ledger to old Git-backed behavior', () => {
    const oldPage = headSource('frontend/src/components/pages/HealthNewsManagementPage.jsx');
    const oldService = headSource('frontend/src/services/healthNewsService.js');
    const gate = gateSource();

    expect(oldPage).toContain('usePageFooter');
    expect(oldPage).toContain("useViewMode('health-news-page', 'table')");
    expect(oldPage).toContain('<ViewToggle');
    expect(oldPage).toContain('<FilterSheet');
    expect(oldPage).toContain('<AnalyticsModal');
    expect(oldPage).toContain('<HealthNewsModal');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('<HealthNewsListView');
    expect(oldPage).toContain('<HealthNewsTableView');
    expect(oldPage).toContain('<MobileHealthNews');
    expect(oldPage).toContain('<PaginationControls');
    expect(oldPage).toContain('handleDelete');
    expect(oldPage).toContain('handleTogglePublish');
    expect(oldPage).toContain('selectedIds');
    expect(oldPage).toContain('openHealthNewsModal');
    expect(oldPage).toContain('openAnalyticsModal');

    expect(oldService).toContain("const TABLE_NAME = 'health_news'");
    expect(oldService).toContain('export async function getHealthNews(filter)');
    expect(oldService).toContain('export async function createHealthNews(input)');
    expect(oldService).toContain('export async function updateHealthNews(newsId, input)');
    expect(oldService).toContain('export async function deleteHealthNews(newsId)');
    expect(oldService).toContain('export async function toggleHealthNewsPublish(newsId, published)');
    expect(oldService).toContain('export async function bulkImportHealthNews(newsItems)');
    expect(oldService).toContain('export async function getHealthNewsAnalytics()');
    expect(oldService).toContain('export function subscribeToHealthNews(callback)');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/HealthNewsManagementPage.jsx`');
    expect(gate).toContain('Health News preservation ledger');
  });

  it('records Health News as Page 11 admitted for read-only continuation only', () => {
    const page = pageSource();
    const gate = gateSource();

    expect(gate).toContain('### Page 11 Admission - Health News');
    expect(gate).toContain('Health News at `/health-news` is admitted under the Today/Requests canon as a read-only published-feed surface only.');
    expect(gate).toContain('This does not make Health News a reusable global pattern source, and it does not admit create, edit, publish, delete, import, or notification side effects.');
    expect(gate).toContain('| Health News | `/health-news` | Admitted for guarded read-only continuation after source, schema/RLS authoring block, shared shell, context-panel, read-only modal, mobile hooks, shared filter semantics, hardgate, build, and responsive Browser proof completed 2026-07-03. It is not a new global pattern source and does not admit content authoring.');

    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(page).toContain("usePageFooter(null, 'status', false)");
    // DS composition (2026-07-10): the bespoke signal/state-strip/grid-card/rail
    // look-alikes are replaced by the shared console workspace grammar.
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<DetailRailShell');
    expect(page).toContain('<RailInsetHero');
    expect(page).toContain('<SortableColumnHeader');
    expect(page).not.toContain('<BulkActionBar');
    expect(page).not.toContain('<ConfirmationModal');
    // View-mode toggle + grid/list/table density switch retired: one shared list.
    expect(page).not.toContain('useViewMode');
    expect(page).not.toContain('<ViewToggle');
    expect(page).not.toContain('<HealthNewsListView');
    expect(page).not.toContain('<HealthNewsTableView');
  });

  it('locks Health News to a route-owned published-feed projection before visual admission', () => {
    const page = pageSource();
    const service = serviceSource();
    const modal = modalSource();
    const gate = gateSource();
    const hook = fs.readFileSync('src/hooks/useHealthNewsQuery.js', 'utf8');

    // Read path is now the FRESH React Query projection hook (mirrors useSupportTicketsQuery).
    // useHealthNews.js stays absent (see below); the page reads the hook, the hook wraps the
    // route-owned getHealthNewsPage projection. No page-level fetch loop, no write mutations.
    expect(page).toContain('useHealthNewsQuery');
    expect(hook).toContain('getHealthNewsPage');
    expect(hook).not.toMatch(/createHealthNews|updateHealthNews|deleteHealthNews|toggleHealthNewsPublish|useMutation/);
    expect(page).toContain('HEALTH_NEWS_EMPTY_STATS');
    expect(page).toContain('healthNewsError');
    expect(page).toContain('loadError');
    expect(page).toContain('Health news could not load. Try again.');
    expect(page).toContain('statsFilter');
    expect(page).toContain("key: 'created_at'");
    expect(page).not.toContain("supabase.from('health_news')");
    expect(page).not.toContain('applyAuthFilter');
    expect(page).not.toContain('getCurrentUser');
    expect(page).not.toContain('createNotification');
    expect(page).not.toContain('createHealthNews');
    expect(page).not.toContain('updateHealthNews');
    expect(page).not.toContain('deleteHealthNews');
    expect(page).not.toContain('toggleHealthNewsPublish');
    expect(page).not.toContain('handleDelete');
    expect(page).not.toContain('handleTogglePublish');
    expect(page).not.toContain('selectedIds');
    expect(page).not.toContain('handleEditUnavailable');
    expect(page).not.toContain('handleCreate');
    expect(page).not.toContain('handleSave');
    expect(page).not.toContain('New article');
    expect(page).not.toContain('openHealthNewsModal');
    expect(page).toContain("window.addEventListener('openAnalyticsModal', handleOpenAnalytics)");
    expect(page).not.toContain('{isAdmin && (');
    expect(page).not.toContain("onEdit={");
    expect(page).not.toContain("onDelete={");
    expect(page).not.toContain("onTogglePublish={");
    expect(page).not.toContain('selectionEnabled={false}');

    expect(service).toContain('export async function getHealthNewsPage(filter = {})');
    expect(service).toContain('export async function getHealthNewsPageStats(filter = {}, quiet = false)');
    expect(service).toContain('async function getHealthNewsExactCount');
    expect(service).toContain('async function getHealthNewsCategoryCount');
    expect(service).toContain('function applyHealthNewsPublishedScope(query)');
    expect(service).toContain("scope: 'published_feed'");
    expect(service).toContain('draftUnavailable: true');
    expect(service).toContain('categories,');
    expect(service).toContain('source_url_valid');
    expect(service).toContain('throw error;');
    expect(service).toContain('return []; // Return empty array on error instead of throwing');
    expect(service).toContain('return []; // Return empty array on error');

    expect(modal).toContain('ModalShell');
    expect(modal).toContain('size="lg"');
    expect(modal).toContain('managed');
    expect(modal).not.toContain('<form');
    expect(modal).not.toContain('onSubmit');
    expect(modal).not.toContain('onSave');
    expect(modal).not.toContain('Create Article');
    expect(modal).not.toContain('Save Changes');
    expect(modal).not.toContain('fixed inset-0');
    expect(modal).not.toContain('role="dialog"');
    expect(modal).not.toContain('aria-modal="true"');

    expect(gate).toContain('`healthNewsService.js` now exposes `getHealthNewsPage()` and `getHealthNewsPageStats()`');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` no longer performs page-level direct `supabase.from');
    expect(gate).toContain('Active create, edit, publish/unpublish, single delete, bulk delete, and notification side effects are unavailable/excluded');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` now publishes a route-owned `healthNewsPanelContext`');
    expect(gate).toContain('`HealthNewsListView.jsx` and `HealthNewsTableView.jsx` are read/details-only density surfaces.');
    expect(gate).toContain('`HealthNewsModal.jsx` now uses shared `ModalShell` for dialog chrome.');
    expect(gate).toContain('Active page behavior opens a read-only `HealthNewsReadView` for details');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` now uses `usePageShell({ bleed: true, hideFab: true })`');
    expect(gate).toContain('create/edit writer authority, payload fields, RLS, and app/public-feed consequence remain unproved');
  });

  it('locks the Health News shared shell, handled sheet, focused rail, and hardgate membership', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const panel = panelSource();
    const list = listSource();
    const table = tableSource();
    const modal = modalSource();
    const filterSheet = filterSheetSource();
    const hardgate = hardgateSource();
    const gate = gateSource();

    expect(page).toContain('getNewsSignal');
    expect(page).toContain('NEWS_KPI_OPTIONS');
    // Bespoke look-alikes deleted -> shared DS grammar (SheetToolbar/KpiStrip/ListRowShell/
    // LoadErrorState replace the state-strip, sheet-toolbar, grid-card, and error-banner).
    expect(page).not.toContain('HealthNewsStateStrip');
    expect(page).not.toContain('HealthNewsSheetToolbar');
    expect(page).not.toContain('HealthNewsErrorBanner');
    expect(page).not.toContain('HealthNewsGridCard');
    expect(page).toContain('<SheetToolbar');
    expect(page).toContain('<ListRowShell');
    expect(page).toContain('<LoadErrorState');
    expect(page).toContain('health-news-sheet-search');
    expect(page).toContain('health-news-list');
    expect(page).not.toContain('<Card');
    expect(page).not.toContain('footerContent');

    expect(mobile).toContain('errorMessage');
    expect(mobile).toContain('Health news could not load');
    expect(mobile).toContain('mobile-health-news-activity-sheet');
    expect(mobile).toContain('mobile-health-news-search');
    expect(mobile).toContain('mobile-health-news-error-state');
    expect(modal).toContain('HealthNewsReadView');
    expect(modal).toContain('Published feed record');
    expect(filterSheet).toContain('role="dialog"');
    expect(filterSheet).toContain('aria-modal="true"');
    expect(filterSheet).toContain("data-testid={usesSheetPresentation ? 'mobile-filter-sheet' : 'filter-sheet'}");

    [
      'src/components/pages/HealthNewsManagementPage.jsx',
      'src/components/mobile/MobileHealthNews.jsx',
      'src/components/context/HealthNewsPanel.jsx',
      'src/components/views/HealthNewsListView.jsx',
      'src/components/views/HealthNewsTableView.jsx',
      'src/components/modals/HealthNewsModal.jsx',
    ].forEach((file) => {
      expect(hardgate).toContain(file);
    });

    [page, mobile, panel, list, table, modal].forEach((source) => {
      expect(source).not.toMatch(/\b(?:border|ring|outline|divide)-/);
      expect(source).not.toMatch(/\b(?:h|w)-px\b/);
      expect(source).not.toMatch(/(?:^|[^0-9])(?:0\.5|1)px\b/);
    });

    expect(gate).toContain('The active Health News surfaces are now in the default UI hardgate');
    expect(gate).toContain('Rendered Browser/IAB proof reused one static production server on `127.0.0.1:3000`');
    expect(gate).toContain('The mobile filter tap opened one `role="dialog"`/`aria-modal="true"` bottom sheet');
    expect(gate).toContain('Health News is admitted for guarded read-only continuation only.');
  });

  it('mounts honest visible-page source and category analytics', () => {
    const page = pageSource();
    const analyticsModal = readAnalyticsModalImplementation();

    expect(page).toContain('buildHealthNewsAnalytics');
    expect(page).toContain('bySource[source] = (bySource[source] || 0) + 1;');
    expect(page).toContain('byCategory[category] = (byCategory[category] || 0) + 1;');
    expect(page).toContain("distributionScope: 'visible_page'");
    expect(page).toContain('analytics={controller.newsAnalytics}');
    expect(analyticsModal).toContain("type === 'news'");
    expect(analyticsModal).toContain('? (analytics.bySource || {})');
    expect(analyticsModal).toContain("type === 'news' || type === 'support'");
  });

  it('keeps readable rows visible when auxiliary Health News statistics are unavailable', () => {
    const page = pageSource();
    const service = serviceSource();

    expect(service).toContain('HEALTH_NEWS_STATS_UNAVAILABLE');
    expect(service).toContain("select('*', { count: 'exact' })");
    expect(service).toContain('.catch(() => ({ stats: HEALTH_NEWS_STATS_UNAVAILABLE }))');
    expect(service).toContain("reason: 'stats_query_failed'");
    expect(page).toContain('buildVisibleHealthNewsStats');
    expect(page).toContain('statsUnavailable');
    expect(page).toContain('Health News statistics are unavailable. Counts use the loaded rows; the list remains current.');
    expect(page).toContain("distributionLabel: statsUnavailable ? 'Loaded rows (statistics unavailable)' : 'Current page'");
  });

  it('keeps the Health News context panel route-owned and density views read/details-only', () => {
    const page = pageSource();
    const panel = panelSource();
    const contextPanel = contextPanelSource();
    const list = listSource();
    const table = tableSource();
    const gate = gateSource();

    expect(page).toContain('healthNewsPanelContext');
    expect(page).toContain('healthNewsRouteContextUpdated');
    expect(page).toContain('requestHealthNewsRouteContext');
    expect(contextPanel).toContain('healthNewsRouteContext');
    expect(contextPanel).toContain('healthNewsRouteContextUpdated');
    expect(contextPanel).toContain('requestHealthNewsRouteContext');
    expect(contextPanel).toContain('<HealthNewsPanel healthNewsContext={healthNewsRouteContext} />');
    expect(panel).toContain('healthNewsContext');
    expect(panel).not.toContain('getHealthNewsPage');
    expect(panel).not.toContain('subscribeToHealthNews');
    expect(panel).toContain('Published Feed');
    expect(panel).not.toContain("supabase.from('health_news')");
    expect(panel).not.toContain('openHealthNewsModal');
    expect(panel).not.toContain('Download');
    expect(panel).not.toContain('Export');
    expect(panel).not.toContain('Preview');

    [list, table].forEach((source) => {
      expect(source).toContain('onView');
      expect(source).toContain('Eye');
      expect(source).not.toContain('onEdit');
      expect(source).not.toContain('onDelete');
      expect(source).not.toContain('onTogglePublish');
      expect(source).not.toContain('selectedIds');
      expect(source).not.toContain('selectionEnabled');
      expect(source).not.toContain('Trash2');
      expect(source).not.toContain('FileCheck');
      expect(source).not.toContain('Checkbox');
    });
    expect(table).toContain('View Details');

    expect(page).not.toContain('onEdit={');
    expect(page).not.toContain('isAdmin={canManageContent}');
    expect(page).not.toContain('selectionEnabled');
    // useHealthNews.js deleted 2026-07-08 (orphaned, 0 importers). Removal proof.
    expect(fs.existsSync('src/hooks/useHealthNews.js')).toBe(false);

    expect(gate).toContain('Context panel now renders the route-owned Health News projection instead of starting a second feed request.');
    expect(gate).toContain('List and table density views are read/details-only');
  });

  it('surfaces the fetched image_url as an article thumbnail in the rail and read-only modal (ADOPT-19)', () => {
    const page = pageSource();
    const modal = modalSource();
    const normalization = fs.readFileSync('src/services/health-news/normalization.js', 'utf8');

    // Projection truth: the normalized row keeps the trimmed image_url column.
    expect(normalization).toContain("image_url: typeof row.image_url === 'string' ? row.image_url.trim() : row.image_url || null,");

    // Rail binding: the focused row's image_url reaches a conditional <img> src.
    expect(page).toContain('{news.image_url && (');
    expect(page).toContain('src={news.image_url}');

    // Read-only modal binding: the same column reaches the read view's <img> src.
    expect(modal).toContain("const imageUrl = String(news?.image_url || '').trim();");
    expect(modal).toContain('{imageUrl && (');
    expect(modal).toContain('src={imageUrl}');

    // Honest null: broken or missing image is a clean omit, never a broken-image glyph.
    [page, modal].forEach((source) => {
      expect(source).toContain("onError={(event) => { event.currentTarget.style.display = 'none'; }}");
    });
  });

  it('surfaces the literal source URL in the rail with the CopyChip idiom (ADOPT-49)', () => {
    const rail = fs.readFileSync('src/components/pages/health-news/HealthNewsDetailRail.jsx', 'utf8');
    const normalization = fs.readFileSync('src/services/health-news/normalization.js', 'utf8');

    // Projection truth: only an http(s) URL survives normalization as `url`.
    expect(normalization).toContain("url: allowed ? parsed.toString() : ''");
    // Literal URL + copy affordance, gated on validity.
    expect(rail).toContain('news.source_url_valid && news.url');
    expect(rail).toContain('<span className="truncate" title={news.url}>{news.url}</span>');
    expect(rail).toContain('<CopyChip value={news.url} label="Copy source URL" />');
    // Honest null: invalid or absent URL never renders a fabricated link.
    expect(rail).toContain("'No valid link'");
  });

  it('shows the published (created_at) date in the read-only details modal (ADOPT-50)', () => {
    const modal = modalSource();

    // health_news has no published_at column; created_at is the projection's
    // publish date and reaches the read view.
    expect(modal).toContain('const publishedOn = formatNewsDate(news?.created_at);');
    expect(modal).toContain('Published ${publishedOn}');
    // Honest null: a missing or invalid date says so instead of inventing one.
    expect(modal).toContain('if (Number.isNaN(date.getTime())) return null;');
    expect(modal).toContain('Publish date unknown');
  });

  it('wires the whole-table analytics read into the analytics modal, fail-safe (ADOPT-62)', () => {
    const controller = fs.readFileSync('src/components/pages/health-news/useHealthNewsPageController.js', 'utf8');
    const model = fs.readFileSync('src/components/pages/health-news/healthNewsPageModel.js', 'utf8');

    // The previously orphaned whole-table read is now called -- lazily, only
    // once the analytics modal opens. Read path only; no mutation appears.
    expect(controller).toContain("import { getHealthNewsAnalytics } from '../../../services/healthNewsService';");
    expect(controller).toContain('enabled: analyticsModalOpen');
    expect(controller).toContain('tableAnalytics,');
    expect(controller).not.toContain('useMutation');
    // Whole-table scope is adopted only when the read returned rows; the
    // service's swallowed-error zero shape falls back to the visible-page
    // projection (fallback strings stay pinned by the visible-page gate above).
    expect(model).toContain('export const isUsableHealthNewsTableAnalytics');
    expect(model).toContain('return Number.isFinite(total) && total > 0;');
    expect(model).toContain("distributionScope: 'whole_table'");
    expect(model).toContain("distributionLabel: 'All articles'");
    expect(model).toContain("distributionScope: 'visible_page'");
  });

  it('renders a route-owned trending topics tile with a data-truth staleness stamp (ADOPT-63)', () => {
    const controller = fs.readFileSync('src/components/pages/health-news/useHealthNewsPageController.js', 'utf8');
    const model = fs.readFileSync('src/components/pages/health-news/healthNewsPageModel.js', 'utf8');
    const panel = panelSource();

    // The route controller owns the read and publishes it through the context.
    expect(controller).toContain("import { getTopTrendingTopics } from '../../../services/trendingTopicsService';");
    expect(controller).toContain('buildTrendingTopicsTile');
    expect(controller).toContain("errorMessage: trendingTopicsQuery.error ? 'Trending topics could not load.' : null");
    expect(controller).toContain('trendingTopics: trendingTopicsContext');
    // The stamp is the rows' own updated_at/created_at, never the fetch time.
    expect(model).toContain('export const buildTrendingTopicsTile');
    expect(model).toContain('row?.updated_at || row?.created_at');
    // The panel renders the tile from context only -- no second fetch path.
    expect(panel).toContain('healthNewsContext?.trendingTopics');
    expect(panel).toContain('Trending topics');
    expect(panel).toContain('No trending topics yet');
    expect(panel).toContain('This data carries no update timestamp');
    expect(panel).toContain('Data updated ${trendingStamp}');
    expect(panel).not.toContain('getTopTrendingTopics');
    expect(panel).not.toContain('trendingTopicsService');
    expect(panel).not.toContain("supabase.from('trending_topics')");
  });

  it('keeps mobile Health News read-focused without fake live metrics or destructive controls', () => {
    const mobile = mobileSource();
    const gate = gateSource();

    expect(mobile).toContain('PullToRefresh');
    expect(mobile).toContain('useLoadMoreControl');
    expect(mobile).toContain('MobileKPIStrip');
    // Canon LIST anatomy (rebuilt 2026-07-10 mirroring MobileUsers): heading + KPI strip +
    // SearchRow + adaptive GroupPanel + group-shaped skeleton + warm-up + Updating pill.
    // The MobileFeaturedMetric billboard and MobileSecondaryMetricRail glance rail are
    // DASHBOARD furniture the list grammar FATALLY bans - the rebuild removes both.
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<SkeletonGroupPanel');
    expect(mobile).toContain('useSkeletonWarmup');
    expect(mobile).toContain('UpdatingPillRow');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).toContain('isFetching');
    expect(mobile).toContain('resolveAdaptiveGroups');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).toContain('const sourceArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);');
    expect(mobile).toContain('useStableList(sourceArticles, loading)');
    expect(mobile).not.toContain('filteredArticles');
    expect(mobile).not.toContain('let result = Array.isArray(articles)');
    expect(mobile).not.toContain('result.filter');
    expect(mobile).toContain("delta: 'Current'");
    expect(mobile).toContain("delta: 'Locked'");
    expect(mobile).not.toContain('chartData');
    expect(mobile).not.toContain('LIVE');
    expect(mobile).not.toContain('Live status');
    expect(mobile).not.toContain('Publishing Pulse');
    expect(mobile).not.toContain('Published Ratio');
    expect(mobile).not.toContain('Medical Share');
    expect(mobile).not.toContain('Total Articles');
    expect(mobile).not.toContain('News Registry');
    expect(mobile).not.toContain('Writer blocked');
    // Retired with the billboard/rail: 'Feed Summary' + 'Authoring locked' were the
    // MobileSecondaryMetricRail copy, 'Article List' the MobileSectionHeader label. The
    // grouped panel renders adaptive CATEGORY / recency headers instead.
    expect(mobile).not.toContain('Feed Summary');
    expect(mobile).not.toContain('Article List');
    expect(mobile).not.toContain('Authoring locked');
    expect(mobile).not.toContain('selectedIds');
    expect(mobile).not.toContain('onTogglePublish');
    expect(mobile).not.toContain('onDelete');
    expect(mobile).not.toContain('Trash2');

    // Rows now tap-open the canonical detail bottom sheet (MobileDetailSheet),
    // not an inline MobileMetricRow dropdown. Read-only: the sheet's only CTA is Details.
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('setActiveArticle');
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('expandedId');

    expect(gate).toContain('It no longer renders hardcoded chart data, `LIVE` trend copy, row selection, publish/unpublish, edit, or delete controls.');
    expect(gate).toContain('Mobile projection cleanup on 2026-07-04 removed duplicate local search/KPI row filtering');
    expect(gate).toContain('Fake charts, `LIVE` copy, ratio/pulse/registry dashboard wording, local-only row filtering, selection, publish, edit, and delete are removed from active mobile');
  });
});
