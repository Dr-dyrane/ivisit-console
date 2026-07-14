import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  getPageDataStartupDomainsForRole,
  routeOwnsStartupDomains,
} from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
const readTree = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTree(entryPath);
    return /\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js')
      ? [read(entryPath)]
      : [];
  })
  .join('\n');
const pricingPageEntrySource = () => read('src/components/pages/PricingManagementPage.jsx');
const pricingPageSource = () => [
  pricingPageEntrySource(),
  readTree('src/components/pages/pricing'),
].join('\n');
const mobilePricingEntrySource = () => read('src/components/mobile/MobilePricing.jsx');
const mobilePricingSource = () => [
  mobilePricingEntrySource(),
  readTree('src/components/mobile/pricing'),
].join('\n');
const pricingServiceSource = () => [
  read('src/services/pricingService.js'),
  readTree('src/services/pricing'),
].join('\n');
const appSource = () => [
  read('src/app/AppRoutes.jsx'),
  read('src/app/appRouteMetadata.js'),
].join('\n');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Pricing Page 18 intake contract', () => {
  it('preserves Pricing intake archaeology and admits the canonical active surfaces to the visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = appSource();
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 18 Intake Audit - Pricing');
    expect(gate).toContain('Pricing at `/pricing` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, price create/edit/delete/bulk delete, org-wide pricing save, context-panel command promotion, route-owned action promotion, or hardgate promotion is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Pricing visual pass must close this blocker map before adding Page 18 to the default hardgate.');

    expect(app).toContain("pricing: lazyNamedPage(() => import('../components/pages/PricingManagementPage'), 'PricingManagementPage')");
    expect(app).toContain("{ id: 'pricing', path: '/pricing', minRole: 'org_admin' }");
    expect(routes).toContain("'/pricing': {");
    expect(routes).toContain("minRole: 'org_admin'");
    expect(routes).toContain("resource: 'pricing'");
    expect(navigation).toContain("{ id: 'pricing', path: '/pricing', icon: DollarSign, label: 'Pricing', resource: 'pricing', minRole: 'org_admin' }");
    expect(mobileNavigation).toContain("{ prefix: '/pricing', id: 'pricing', path: '/pricing', label: 'Pricing' }");
    expect(routeOwnsStartupDomains('/pricing')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/pricing')).not.toContain('pricing');

    [
      'src/components/pages/PricingManagementPage.jsx',
      'src/components/pages/pricing/PricingDesktopWorkspace.jsx',
      'src/components/mobile/MobilePricing.jsx',
      'src/components/context/PricingContextPanel.jsx',
    ].forEach((file) => {
      expect(hardgate).toContain(file);
    });

    [
      'src/components/views/PricingTableView.jsx',
      'src/components/views/PricingListView.jsx',
      'src/services/pricingService.js',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('keeps Pricing route, controller, bridge, desktop, and mobile ownership modular', () => {
    const pageEntry = pricingPageEntrySource();
    const mobileEntry = mobilePricingEntrySource();
    const page = pricingPageSource();
    const mobile = mobilePricingSource();

    expect(pageEntry.split(/\r?\n/).length).toBeLessThanOrEqual(80);
    expect(mobileEntry.split(/\r?\n/).length).toBeLessThanOrEqual(240);
    expect(pageEntry).toContain("import { usePricingPageController } from './pricing/usePricingPageController';");
    expect(pageEntry).toContain("import { usePricingRouteBridge } from './pricing/usePricingRouteBridge';");
    expect(pageEntry).toContain("import { usePricingPageChrome } from './pricing/usePricingPageChrome';");
    expect(page).toContain('export const usePricingPageController');
    expect(page).toContain('export const usePricingRouteBridge');
    expect(page).toContain('export const PricingManagementPageView');
    expect(page).toContain('export const PricingDetailRail');
    expect(page).toContain('export const normalizePricingProjection');
    expect(mobile).toContain("import { MobilePricingList } from './pricing/MobilePricingList';");
    expect(mobile).toContain('export const MobilePricingDetailSheet');
    expect(mobile).toContain('export const getMobilePricingCounts');
    expect(page).not.toContain('saveServicePricing');
    expect(page).not.toContain('saveRoomPricing');
  });

  it('closes the desktop shell with role rails, shared KPIs, stats, focus, and honest states', () => {
    const page = pricingPageSource();
    const workspace = read('src/components/pages/pricing/PricingDesktopWorkspace.jsx');
    const panel = read('src/components/context/PricingContextPanel.jsx');

    expect(page).toContain("if (admin) return 'admin';");
    expect(page).toContain("if (orgAdmin) return 'org_admin';");
    expect(page).toContain("if (provider) return driver ? 'driver' : 'provider';");
    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).not.toContain('getConsoleModuleRailItems({');
    expect(page).toContain("usePageFooter(null, 'status', false)");
    expect(page).not.toContain('usePageFooter(footerContent');

    expect(workspace.match(/<KpiStrip/g)).toHaveLength(1);
    expect(workspace).toContain("pinnedIds={['override', 'global']}");
    expect(workspace).toContain('importance={{ all: 0, override: 1, global: 2 }}');
    expect(workspace).not.toMatch(/<KpiStrip[^>]*\bmax=/);
    expect(workspace.match(/<ActivitySheet/g)).toHaveLength(1);
    expect(workspace.match(/<SortableColumnHeader/g)).toHaveLength(1);
    expect(workspace).toContain('onOpen: (row) => setFocused(row.id)');
    expect(workspace).toContain('searchTestId="pricing-sheet-search"');
    expect(workspace).toContain('onRefresh={retry}');

    expect(page).toContain("import { useRowSelection } from '../../../hooks/useRowSelection';");
    expect(page).toContain("import { BulkActionBar } from '../../common/BulkActionBar';");
    expect(page).toContain('const canSelectPricing = admin || orgAdmin;');
    expect(page).toContain('useRowSelection(paginatedPricing)');
    expect(page).toContain('selectable={canSelectPricing}');
    expect(page).toContain('<BulkActionBar');
    expect(page).toContain('selectedCount={selection.selectedIds.length}');
    expect(page).toContain('onClear={selection.clearSelection}');
    expect(page).toContain('Bulk price changes are unavailable');
    expect(workspace).toContain("import { Checkbox } from '../../ui/checkbox';");
    expect(workspace).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(workspace).toContain("aria-label={allSelected ? 'Clear pricing selection' : 'Select all pricing rules'}");
    expect(workspace).toContain('onSelectClick?.(event)');

    expect(page).toContain('onClick={handleOpenPricingStats}');
    expect(page).toContain("data-state={analyticsModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('Pricing stats');
    expect(page).toContain("window.addEventListener('openPricingAnalytics', handleOpenPricingStats)");
    expect(panel).toContain("new CustomEvent('openPricingAnalytics')");
    expect(panel).toContain('Opening pricing stats...');

    expect(workspace).toContain('Array.from({ length: 7 }');
    expect(workspace).toContain('<LoadErrorState title="Pricing did not load"');
    expect(workspace).toContain('Pricing did not refresh. Showing the previous results.');
    expect(workspace).toContain("heading={hasFilter ? 'No matching pricing rules' : 'No pricing rules'}");
    expect(panel).toContain('pricingContext?.loading ?? !pricingContext');
    expect(panel).toContain('role="alert"');

    expect(workspace).not.toContain('Retry to load the pricing projection.');
    expect(workspace).not.toContain('filtered projection');
    expect(workspace).not.toContain('facility authority');
    expect(panel).not.toContain('Read-only pricing evidence');
    expect(panel).not.toContain('Pricing scope');
    expect(panel).toContain('Pricing changes are unavailable until a facility is selected.');
  });

  it('preserves the old Pricing behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/PricingManagementPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobilePricing.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/PricingContextPanel.jsx');
    const oldTable = gitShowHead('frontend/src/components/views/PricingTableView.jsx');
    const oldList = gitShowHead('frontend/src/components/views/PricingListView.jsx');
    const oldService = gitShowHead('frontend/src/services/pricingService.js');

    const page = pricingPageSource();
    const workspace = read('src/components/pages/pricing/PricingDesktopWorkspace.jsx');
    const mobile = mobilePricingSource();
    const panel = read('src/components/context/PricingContextPanel.jsx');
    const table = read('src/components/views/PricingTableView.jsx');
    const list = read('src/components/views/PricingListView.jsx');
    const service = pricingServiceSource();

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/PricingManagementPage.jsx`');
    expect(gate).toContain("`usePageHeader('Pricing Engine')`, `useViewMode('pricing', 'grid')`, `usePagination(12)`");
    expect(gate).toContain('desktop KPI cards for average/global/override values');
    expect(gate).toContain('mobile `Average Service Price`, `Average Room Price`, `Pricing Dynamics`, `Avg Price`, `LIVE` labels');
    expect(gate).toContain('context-panel average/global/override counts, `getPricing()` broad hospital joins, first-hospital organization write resolution, and upsert/delete RPC payloads.');

    for (const source of [oldPage]) {
      expect(source).toContain("useViewMode('pricing', 'grid')");
      expect(source).toContain('const pagination = usePagination(12);');
      expect(source).toContain("usePageHeader('Pricing Engine'");
      expect(source).toContain("window.addEventListener('openPricingModal', handleOpenAdd);");
      expect(source).toContain('<MobilePricing');
      expect(source).toContain('<PricingTableView');
      expect(source).toContain('<PricingListView');
      expect(source).toContain('<AnalyticsModal');
      expect(source).toContain('No price points found');
    }

    expect(page).toContain('const pagination = usePagination(12);');
    expect(page).toContain("usePageHeader('Pricing'");
    expect(page).not.toContain("useViewMode('pricing'");
    expect(page).toContain('<MobilePricing');
    expect(page).toContain('<PricingDesktopWorkspace');
    expect(page).toContain('<AnalyticsModal');
    expect(page).not.toContain('<PricingTableView');
    expect(page).not.toContain('<PricingListView');
    expect(workspace).toContain('<ActivitySheet');
    expect(workspace).toContain('<SortableColumnHeader');
    expect(workspace).toContain('label="Updated"');
    expect(workspace).toContain('aria-label="Inspect pricing rule"');
    expect(workspace).toContain('onOpen: (row) => setFocused(row.id)');
    expect(workspace).not.toContain('Details unavailable');
    expect(page).not.toContain('onView={openModal}');
    expect(page).toContain('useRowSelection(paginatedPricing)');

    expect(oldPage).toContain('saveServicePricing({');
    expect(oldPage).toContain('saveRoomPricing({');
    expect(oldPage).toContain('await deleteServicePricing(item.id);');
    expect(oldPage).toContain('await deleteRoomPricing(item.id);');
    expect(oldPage).toContain('parseFloat(formData.price)');
    expect(oldPage).toContain("toast.success('Pricing saved successfully')");
    expect(oldPage).toContain("toast.success('Pricing deleted successfully')");
    expect(oldPage).toContain('toast.success(`${selectedIds.length} pricing rules deleted`);');
    expect(oldPage).toContain('<ConfirmationModal');
    expect(oldPage).toContain('<BulkActionBar');
    expect(oldPage).toContain('Delete Selected Pricing Rules');

    expect(page).toContain("import { getPricingPageData } from '../../../services/pricingService';");
    expect(page).not.toContain('saveServicePricing');
    expect(page).not.toContain('saveRoomPricing');
    expect(page).not.toContain('deleteServicePricing');
    expect(page).not.toContain('deleteRoomPricing');
    expect(page).not.toContain('parseFloat(formData.price)');
    expect(page).not.toContain("toast.success('Pricing saved successfully')");
    expect(page).not.toContain("toast.success('Pricing deleted successfully')");
    expect(page).not.toContain('toast.success(`${selectedIds.length} pricing rules deleted`);');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).toContain('<BulkActionBar');
    expect(page).toContain('selectedCount={selection.selectedIds.length}');
    expect(page).not.toContain('Delete Selected Pricing Rules');
    expect(page).toContain('useRowSelection(paginatedPricing)');
    expect(workspace).toContain('<Checkbox');
    expect(workspace).toContain('onToggleSelect?.(row.id, value)');
    expect(workspace).toContain('onSelectClick?.(event)');
    expect(workspace).not.toContain('selection excluded by decision');
    expect(mobile).toContain("import { MobileSelectionBar } from './MobileSelectionBar';");
    expect(mobile).toContain('const selectionMode = selectionEnabled && selectedIdSet.size > 0;');
    expect(mobile).toContain('selectable={selectionEnabled}');
    expect(mobile).toContain('selected={selectedIdSet.has(item.id)}');
    expect(mobile).toContain('onToggleSelect={(selectedItem) => onSelect?.(');
    expect(mobile).toContain('!selectedIdSet.has(selectedItem.id)');
    expect(mobile).toContain('onLongPress={(selectedItem) => onSelect?.(selectedItem.id, true)}');
    expect(mobile).toContain('onSelectAll={() => onSelectAll?.(true)}');
    expect(mobile).toContain('onClear={() => onSelectAll?.(false)}');
    expect(mobile).toContain('Bulk price changes are unavailable');
    expect(page).not.toContain('Entity Config');
    expect(page).not.toContain('Item Provisioning');

    expect(oldPage).toContain("getPricing('services', orgId)");
    expect(oldPage).toContain("getPricing('rooms', orgId)");
    expect(page).toContain('getPricingPageData(');
    expect(page).toContain('buildPricingPageQuery({');
    expect(page).toContain('setPricingProjection(projection);');
    expect(page).toContain("const [loadError, setLoadError] = useState(null);");
    expect(page).toContain("setLoadError('Pricing rules could not load. Try again.');");
    expect(page).not.toContain('setPricing([]);');
    expect(mobile).toContain('Pricing did not refresh');
    expect(mobile).toContain('Showing the last loaded pricing rules.');
    expect(page).not.toContain('Pricing did not refresh. Showing the last loaded rules.');
    expect(page).toContain('page: isMobile ? 1 : currentPage');
    expect(page).toContain('pageSize: isMobile ? currentPage * itemsPerPage : itemsPerPage');
    expect(page).toContain('hasMore={pagination.hasNextPage}');
    expect(page).toContain('onLoadMore={handleMobileLoadMore}');
    expect(page).toContain('isLoadingMore={mobileLoadingMore}');
    expect(page).toContain('const fetchRequestRef = useRef(0);');
    expect(page).toContain('fetchRequestRef.current === requestId');
    expect(page).toContain('const mobileIsFetching = isFetching && !mobileLoadingMore;');
    expect(mobile).toContain("item.facilityName || item.facility_name || 'Facility price'");
    expect(page).toContain('const isFetching = loading && hasPricingRows;');
    expect(page).toContain('isFetching={isFetching}');
    expect(workspace).toContain('refreshing={isFetching}');
    expect(workspace).not.toContain('Average ${averageAmount} in these results.');
    expect(workspace).toContain('Show all pricing rules');
    expect(mobile).toContain("label={errorMessage ? 'Pricing did not load' : 'No pricing rules found'}");
    expect(page).toContain('setTotalCount(projection.totalCount || 0);');
    expect(page).toContain('const filteredPricing = pricing;');
    expect(page).toContain('const paginatedPricing = pricing;');
    expect(page).not.toContain("getPricing('services', orgId)");
    expect(page).not.toContain("getPricing('rooms', orgId)");

    for (const source of [oldMobile]) {
      expect(source).toContain('MobileFeaturedMetric');
      expect(source).toContain('MobileSecondaryMetricRail');
      expect(source).toContain('placeholder="Search pricing..."');
      expect(source).toContain('onClick={() => onEdit(item)}');
      expect(source).toContain('onClick={() => onDelete(item)}');
      expect(source).toContain('No pricing rules found');
    }

    expect(oldMobile).toContain("label: activeTab === 'services' ? 'Average Service Price' : 'Average Room Price'");
    expect(oldMobile).toContain("label={activeTab === 'services' ? 'Service Pricing' : 'Room Pricing'}");
    expect(oldMobile).toContain("label: activeTab === 'services' ? 'Price / Unit' : 'Price / Night'");
    expect(oldMobile).toContain("trend: 'LIVE'");
    expect(oldMobile).toContain('Pricing Dynamics');
    expect(oldMobile).toContain("title: 'Avg Price'");
    expect(oldMobile).toContain("getItemType(item).toUpperCase()");
    expect(oldMobile).toContain("badge: globalRule ? 'GLOBAL' : 'LOCAL'");
    expect(mobile).toContain('pricingProjection = null');
    expect(mobile).toContain('const summary = pricingProjection?.summary || {}');
    expect(mobile).toContain('onClick={() => setActiveTab(tab.id)}');
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobilePricingAtlasLayer />');
    expect(mobile).toContain('<SkeletonGroupList groups={2} rowsPerGroup={[3, 2]}');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<MobileListRow');
    // Phone taps still open MobileDetailSheet; tablet taps focus the route-owned rail.
    // Neither surface revives inline row expansion.
    expect(mobile).toContain("import { MobileDetailSheet } from '../MobileDetailSheet';");
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('onOpen={handleOpenItem}');
    expect(mobile).toContain('setActiveItem(item);');
    expect(mobile).toContain('onFocusPrice(item.id);');
    expect(mobile).not.toContain('primary={{');
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('MobileDetailIslands');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('MobileMetricRow');
    expect(mobile).toContain('rounded-inner');
    expect(mobile).toContain('rounded-button');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).not.toContain('Pricing Dynamics');
    expect(mobile).not.toContain("title: 'Avg Price'");
    expect(mobile).not.toContain('getItemType(item).toUpperCase()');
    expect(mobile).not.toContain("badge: globalRule ? 'GLOBAL' : 'LOCAL'");
    expect(mobile).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|md|sm|full|\[[^\]]+\])\b/);
    expect(mobile).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(mobile).not.toMatch(/\bgeo-/);
    expect(mobile).not.toMatch(/\bborder-/);
    expect(mobile).not.toMatch(/\bring-/);
    expect(mobile).not.toMatch(/\boutline-/);
    expect(mobile).not.toMatch(/\buppercase\b/);
    expect(mobile).not.toMatch(/\btracking-/);

    expect(oldPanel).toContain("new CustomEvent('openPricingModal')");
    expect(oldPanel).toContain("new CustomEvent('openAnalyticsModal')");
    expect(oldPanel).toContain('const globalPricing = pricing.filter');
    expect(oldPanel).toContain('const overrides = pricing.filter');
    expect(oldPanel).toContain('const avgPrice = pricing.length > 0');
    expect(oldPanel).toContain('Global');
    expect(oldPanel).toContain('Overrides');
    expect(oldPanel).toContain('Add Item');

    expect(panel).not.toContain("new CustomEvent('openPricingModal')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");
    expect(panel).not.toContain('const globalPricing = pricing.filter');
    expect(panel).not.toContain('const overrides = pricing.filter');
    expect(panel).not.toContain('const avgPrice = pricing.length > 0');
    expect(panel).toContain("const PRICING_UNAVAILABLE_MESSAGE = 'Pricing changes are unavailable until a facility is selected.';");
    expect(panel).toContain('pricingContext = null');
    expect(panel).toContain('pricingContext?.focusedPrice');
    expect(panel).toContain('summary.globalFallbackCount');
    expect(panel).toContain('summary.facilityPriceCount');
    expect(panel).toContain('Pricing details are available to view.');
    expect(panel).not.toContain('Details unavailable');
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain("data-state={unavailable ? 'unavailable' : 'available'}");
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

    for (const source of [oldTable, table]) {
      expect(source).toContain('aria-label="Select all"');
      expect(source).toContain("new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' })");
      expect(source).toContain('View Details');
      expect(source).toContain('onEdit(item)');
      expect(source).toContain('onDelete(item)');
    }

    expect(oldTable).toContain('item.base_price || item.price_per_night || 0');
    expect(table).toContain('item.amount ?? item.base_price ?? item.price_per_night ?? 0');
    expect(table).toContain('sourceLabel');
    expect(table).toContain('facilityLabel');

    for (const source of [oldList, list]) {
      expect(source).toContain("new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' })");
      expect(source).toContain('onView(item)');
      expect(source).toContain('onEdit(item)');
      expect(source).toContain('onDelete(item)');
    }

    expect(oldList).toContain('Standard platform pricing logic applied.');
    expect(oldList).toContain('item.base_price || item.price_per_night || 0');
    expect(list).toContain('item.amount ?? item.base_price ?? item.price_per_night ?? 0');
    expect(list).toContain('Source-labelled pricing row.');
    expect(list).toContain('sourceLabel');

    for (const source of [oldService, service]) {
      expect(source).toContain("const table = type === 'services' ? 'service_pricing' : 'room_pricing';");
      expect(source).toContain("supabase.from('hospitals').select('id, organization_id')");
      expect(source).toContain("supabase.from(table).select('*').order('updated_at', { ascending: false })");
      expect(source).toContain('organization_id: item.organization_id ?? (item.hospital_id ? hospitalOrgMap.get(item.hospital_id) || null : null)');
      expect(source).toContain("normalized = normalized.filter(item => !item.hospital_id || item.organization_id === organizationId);");
      expect(source).toContain('const resolveHospitalIdForPricing = async (item) => {');
      expect(source).toContain(".eq('organization_id', item.organization_id)");
      expect(source).toContain(".order('created_at', { ascending: true })");
      expect(source).toContain('.limit(1)');
      expect(source).toContain('No hospital found for the selected organization. Create a hospital first to manage organization pricing.');
      expect(source).toContain("supabase.rpc('upsert_service_pricing'");
      expect(source).toContain("supabase.rpc('upsert_room_pricing'");
      expect(source).toContain("supabase.rpc('delete_service_pricing'");
      expect(source).toContain("supabase.rpc('delete_room_pricing'");
    }

    expect(service).toContain('export const getPricingPageData');
    expect(service).toContain('sourceLabel');
    expect(service).toContain('facilityName');
    expect(service).toContain(".select('id, organization_id, name', { count: 'exact' })");
    expect(service).toContain("selectOptions: { count: 'exact', head: true }");
    expect(service).toContain('const PRICING_QUERY_CHUNK_SIZE = 500;');
    expect(service).toContain('getScopedFamilyCount(familySummary, scope)');
    expect(service).toContain('summary: {');
    expect(service).toContain('averageAvailable: false');
    expect(service).toContain("basis: 'exact_server_counts'");
    expect(service).toContain("pagination: 'server_windowed_union'");
    expect(service).toContain('readState');
    expect(service).toContain("mode: organizationId ? 'organization_summary' : 'platform_default'");
  });

  it('blocks Pricing canon reuse until facility scope, shell quieting, and quote consequence close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const stage4 = read('docs/implementation/console-service-alignment/stages/STAGE_4_L5_STATE_DATA_OWNERSHIP_AUDIT_2026-05-24.md');
    const stage6 = read('docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md');
    const pass3 = read('docs/implementation/console-service-alignment/passes/PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md');
    const page = pricingPageSource();
    const pageDataContext = read('src/contexts/PageDataContext.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const panel = read('src/components/context/PricingContextPanel.jsx');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');
    const contextAction = read('src/hooks/useContextAction.js');
    const routeActionOwnership = read('src/config/routeActionOwnership.js');
    const service = pricingServiceSource();
    const mobile = mobilePricingSource();
    const table = read('src/components/views/PricingTableView.jsx');

    expect(gate).toContain('Pricing Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('First route startup quieting cleanup on 2026-07-06 made `/pricing` route-owned in `pageDataAccess.js` with a zero-domain startup override.');
    expect(gate).toContain('First right-panel truth cleanup on 2026-07-06 stopped `ContextPanel.jsx` from passing `servicePricing` and `roomPricing` into `/pricing`.');
    expect(gate).toContain('First shell action quieting cleanup on 2026-07-06 made `ContextAwareFAB.jsx` and `DynamicBottomBar.jsx` treat `/pricing` as route-owned');
    expect(gate).toContain('Active command safety cleanup on 2026-07-06 now keeps `PricingManagementPage.jsx` fail-closed for price mutations without importing or calling pricing mutation functions.');
    expect(gate).toContain('Data ownership: partially improved, not admitted. The first safety cleanup removed PageData startup acquisition, route-level pricing realtime, right-panel PageData pricing arrays, and generic FAB/mobile `Add price` action on `/pricing`.');
    expect(gate).toContain('Scope: not admitted. Current copy and form flow blur global, organization, hospital, service, and room scope.');
    expect(gate).toContain('Organization-wide pricing: blocked. The current receiver is hospital-scoped, and there is no proved propagation receiver or sibling-hospital conflict model.');
    expect(gate).toContain('PageData/shell ownership: partially quieted, not admitted. `/pricing` is now route-owned in `pageDataAccess.js`, and the right panel no longer consumes PageData pricing rows.');
    expect(gate).toContain('Metrics and reports: partially improved, not admitted. Desktop/mobile counts, average amount, and analytics values now come from the route projection summary');
    expect(gate).toContain('Pricing mobile/right-panel squircle and source-voice cleanup on 2026-07-06 converted `MobilePricing.jsx` and `PricingContextPanel.jsx` to semantic radius tokens, removed local decorative border/ring/outline/tracking/all-caps mobile chrome, changed `Pricing Dynamics` and `Avg Price` to source-neutral active labels, and preserved search, tabs, analytics trigger, row reveal, unavailable action notice, projection-basis metrics, source-pending panel signals, and fail-closed panel actions.');
    expect(gate).toContain('This gives `MobilePricing.jsx` and `PricingContextPanel.jsx` focused strict-radius and source-voice proof only; it does not admit Pricing, prove selected-facility projection truth, prove price mutation receivers, or prove patient app quote consequence.');
    expect(gate).toContain('| Data quieting | Active route reads now use `getPricingPageData()` and the route consumes projection rows/summary instead of page-local loaded-row metrics.');

    expect(stage4).toContain('| Pricing | `service_pricing`, `room_pricing`, pricing RPCs, selected hospital quote resolution |');
    expect(stage6).toContain('## Pass 3 - Hospitals, Availability, Discovery, And Pricing Scope');
    expect(stage6).toContain('`frontend/src/components/pages/PricingManagementPage.jsx`');
    expect(stage6).toContain('Scoped pricing UX');
    expect(stage6).toContain('Make hospital-scoped versus organization-scoped pricing explicit.');
    expect(stage6).toContain('Add explicit hospital selector or hospital identity display for every pricing rule.');
    expect(stage6).toContain('For org-wide pricing UX, implement deliberate propagation and conflict handling across sibling hospitals.');
    expect(stage6).toContain('Keep patient quote resolution aligned with selected hospital.');
    expect(stage6).toContain('Pricing service tests for single-hospital and multi-hospital orgs.');
    expect(stage6).toContain('App quote comparison for selected hospital pricing after implementation.');

    expect(pass3).toContain('pricingService` maps hospital-scoped pricing back to organization scope and chooses the first hospital');
    expect(pass3).toContain('/pricing` is reachable to `org_admin` and above, renders service/room rows and summary values from unwindowed');
    expect(pass3).toContain('MobilePricing.jsx:53-104,125-203` calculates average price, global/override counts and time-window trend ratios');
    expect(pass3).toContain('| Pricing | Organization filter plus hospital first-choice write semantics. | Facility-scoped `service_pr');
    expect(pass3).toContain('Pricing route all-row load');
    expect(pass3).toContain('Pricing first-hospital write');
    expect(pass3).toContain('Pricing is hospital/facility-scoped for active patient quotes');
    expect(pass3).toContain('Null-hospital rows, where retained, are explicit platform defaults/fallbacks');
    expect(pass3).toContain('Organization-level presentation is aggregation only unless a future propagation receiver');
    expect(pass3).toContain('Multi-hospital organizations cannot silently write pricing to the first hospital.');
    expect(pass3).toContain('App quote comparison for selected hospital pricing.');
    expect(pass3).toContain('Do not implement pricing writes without an explicit facility selection; never write an implicit earliest');

    expect(routeOwnsStartupDomains('/pricing')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/pricing')).not.toContain('pricing');
    expect(pageDataContext).not.toContain("getPricing('services')");
    expect(pageDataContext).not.toContain("getPricing('rooms')");
    expect(pageDataContext).not.toContain(".channel('pricing_changes')");
    expect(pageDataContext).not.toContain("table: 'service_pricing'");
    expect(pageDataContext).not.toContain("table: 'room_pricing'");
    expect(contextPanel).not.toContain('servicePricing');
    expect(contextPanel).not.toContain('roomPricing');
    expect(contextPanel).toContain('<PricingContextPanel pricingContext={pricingRouteContext} />');
    expect(contextPanel).toContain("new CustomEvent('requestPricingRouteContext')");
    expect(panel).not.toContain("new CustomEvent('openPricingModal')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");
    expect(panel).toContain('Select a pricing rule to view more details.');
    expect(panel).toContain('Pricing changes are unavailable until a facility is selected.');
    expect(page).toContain('new CustomEvent(');
    expect(page).toContain("'pricingRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestPricingRouteContext'");
    expect(page).toContain('focusedPrice');

    expect(contextFab).toContain('const routeOwnsAction = routeOwnsShellAction(location.pathname)');
    expect(routeActionOwnership).toContain("'/pricing'");
    expect(bottomBar).toContain("pathname.startsWith('/pricing')");
    expect(bottomBar).toContain("label: 'Pricing stats'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openPricingAnalytics')");
    expect(contextAction).toContain("currentPath.includes('/pricing')");
    expect(contextAction).toContain("label: 'Add price'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openPricingModal'))");

    expect(page).toContain('const PRICING_MUTATION_COMMANDS_ENABLED = false;');
    expect(page).toContain('PRICING_SCOPE_UNAVAILABLE_MESSAGE');
    expect(page).toContain('Price changes need a selected facility before they can run.');
    expect(page).toContain("import { getPricingPageData } from '../../../services/pricingService';");
    expect(page).toContain('getPricingPageData(');
    expect(page).toContain('setPricingProjection(projection);');
    expect(page).toContain('setTotalCount(projection.totalCount || 0);');
    expect(page).toContain('const filteredPricing = pricing;');
    expect(page).toContain('const paginatedPricing = pricing;');
    expect(page).toContain('pricingProjection={pricingProjection}');
    expect(page).toContain('export const PRICING_MUTATION_COMMANDS_ENABLED = false;');
    expect(page).toContain('const showPricingCommandUnavailable = useCallback(() => {');
    expect(page).toContain('setActionNotice(PRICING_SCOPE_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(PRICING_SCOPE_UNAVAILABLE_MESSAGE);');
    expect(page).toContain("data-state={analyticsModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('aria-label="Pricing stats"');
    expect(page).toContain('<PricingDesktopWorkspace');
    expect(page).not.toContain('selection={selection}');
    expect(page).toContain('sortConfig={sortConfig}');
    expect(page).toContain('selectionEnabled={canSelectPricing}');
    expect(page).toContain('onSelect={selection.handleToggleSelect}');
    expect(page).toContain('onSelectAll={selection.handleSelectAll}');
    expect(mobile).toContain('role="status"');
    expect(mobile).toContain('aria-live="polite"');
    expect(page).not.toContain('saveServicePricing');
    expect(page).not.toContain('saveRoomPricing');
    expect(page).not.toContain('deleteServicePricing');
    expect(page).not.toContain('deleteRoomPricing');
    expect(page).not.toContain('<Dialog');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).toContain('<BulkActionBar');
    expect(page).toContain('selectedCount={selection.selectedIds.length}');
    expect(mobile).toContain("actionNotice = ''");
    expect(mobile).toContain('pricingProjection = null');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).toContain('selectionEnabled = false');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('onClear={() => onSelectAll?.(false)}');
    expect(mobile).toContain('role="status"');
    expect(mobile).toContain('aria-live="polite"');
    expect(table).toContain('selectionEnabled = true');
    expect(table).toContain('{selectionEnabled && (');
    expect(table).toContain('sourceLabel');
    expect(service).toContain('export const getPricingPageData');
    expect(service).toContain('facilityName');
    expect(service).toContain('readState');

    expect(page).not.toContain("This will create a local override for your organization.");
    expect(service).toContain("supabase.from('hospitals').select('id, organization_id')");
    expect(service).toContain(".eq('organization_id', item.organization_id)");
    expect(service).toContain('.limit(1)');
    expect(service).toContain("supabase.rpc('upsert_service_pricing'");
    expect(service).toContain("supabase.rpc('upsert_room_pricing'");
  });
});
