import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  getPageDataStartupDomainsForRole,
  routeOwnsStartupDomains,
} from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Pricing Page 18 intake contract', () => {
  it('preserves Pricing intake archaeology and admits the canonical active surfaces to the visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 18 Intake Audit - Pricing');
    expect(gate).toContain('Pricing at `/pricing` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, price create/edit/delete/bulk delete, org-wide pricing save, context-panel command promotion, route-owned action promotion, or hardgate promotion is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Pricing visual pass must close this blocker map before adding Page 18 to the default hardgate.');

    expect(app).toContain('<Route path="/pricing" element={<ProtectedRoute minRole="org_admin"><PricingManagementPage /></ProtectedRoute>} />');
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

  it('preserves the old Pricing behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/PricingManagementPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobilePricing.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/PricingContextPanel.jsx');
    const oldTable = gitShowHead('frontend/src/components/views/PricingTableView.jsx');
    const oldList = gitShowHead('frontend/src/components/views/PricingListView.jsx');
    const oldService = gitShowHead('frontend/src/services/pricingService.js');

    const page = read('src/components/pages/PricingManagementPage.jsx');
    const workspace = read('src/components/pages/pricing/PricingDesktopWorkspace.jsx');
    const mobile = read('src/components/mobile/MobilePricing.jsx');
    const panel = read('src/components/context/PricingContextPanel.jsx');
    const table = read('src/components/views/PricingTableView.jsx');
    const list = read('src/components/views/PricingListView.jsx');
    const service = read('src/services/pricingService.js');

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
    expect(workspace).toContain('<SortableColumnHeader label="Updated"');
    expect(workspace).toContain('aria-label="Inspect pricing rule"');
    expect(workspace).toContain('onOpen: (row) => setFocused(row.id)');
    expect(workspace).not.toContain('Details unavailable');
    expect(page).not.toContain('onView={openModal}');
    expect(workspace).toContain('selection excluded by decision');

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

    expect(page).toContain("import { getPricingPageData } from '../../services/pricingService';");
    expect(page).not.toContain('saveServicePricing');
    expect(page).not.toContain('saveRoomPricing');
    expect(page).not.toContain('deleteServicePricing');
    expect(page).not.toContain('deleteRoomPricing');
    expect(page).not.toContain('parseFloat(formData.price)');
    expect(page).not.toContain("toast.success('Pricing saved successfully')");
    expect(page).not.toContain("toast.success('Pricing deleted successfully')");
    expect(page).not.toContain('toast.success(`${selectedIds.length} pricing rules deleted`);');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).not.toContain('<BulkActionBar');
    expect(page).not.toContain('Delete Selected Pricing Rules');
    expect(page).not.toContain('useRowSelection(paginatedPricing)');
    expect(workspace).not.toContain('<Checkbox');
    expect(workspace).toContain('selection excluded by decision');
    expect(page).not.toContain('Entity Config');
    expect(page).not.toContain('Item Provisioning');

    expect(oldPage).toContain("getPricing('services', orgId)");
    expect(oldPage).toContain("getPricing('rooms', orgId)");
    expect(page).toContain('getPricingPageData({');
    expect(page).toContain('setPricingProjection(projection);');
    expect(page).toContain("const [loadError, setLoadError] = useState(null);");
    expect(page).toContain("setLoadError('Pricing rules could not load. Try again.');");
    expect(page).not.toContain('setPricing([]);');
    expect(mobile).toContain('Pricing did not refresh');
    expect(mobile).toContain('Showing the last loaded pricing rules.');
    expect(page).not.toContain('Pricing did not refresh. Showing the last loaded rules.');
    expect(page).toContain('page: isMobile ? 1 : pagination.currentPage');
    expect(page).toContain('pageSize: isMobile ? mobilePageSize : pagination.itemsPerPage');
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
    expect(workspace).toContain('Average ${averageAmount} in this filtered projection.');
    expect(mobile).toContain("label={errorMessage ? 'Pricing did not load' : 'No pricing rules found'}");
    expect(page).toContain('pagination.setTotalCount(projection.totalCount || 0);');
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
    // Tap-opens-detail-sheet: the row now opens MobileDetailSheet on tap instead of
    // expanding an inline dropdown (no MobileDetailIslands/expandedContent composition).
    expect(mobile).toContain("import { MobileDetailSheet } from './MobileDetailSheet';");
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('onOpen={setActiveItem}');
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
    expect(panel).toContain("const PRICING_UNAVAILABLE_MESSAGE = 'Pricing actions unavailable until facility scope is verified.';");
    expect(panel).toContain('pricingContext = null');
    expect(panel).toContain('pricingContext?.focusedPrice');
    expect(panel).toContain('summary.globalFallbackCount');
    expect(panel).toContain('summary.facilityPriceCount');
    expect(panel).toContain('Read-only pricing evidence');
    expect(panel).not.toContain('Details unavailable');
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('data-state="unavailable"');
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
    expect(service).toContain("basis: 'current_filter'");
    expect(service).toContain('readState');
    expect(service).toContain("mode: organizationId ? 'organization_summary' : 'platform_default'");
  });

  it('blocks Pricing canon reuse until facility scope, shell quieting, and quote consequence close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const stage4 = read('docs/implementation/console-service-alignment/stages/STAGE_4_L5_STATE_DATA_OWNERSHIP_AUDIT_2026-05-24.md');
    const stage6 = read('docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md');
    const pass3 = read('docs/implementation/console-service-alignment/passes/PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md');
    const page = read('src/components/pages/PricingManagementPage.jsx');
    const pageDataContext = read('src/contexts/PageDataContext.jsx');
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const panel = read('src/components/context/PricingContextPanel.jsx');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = read('src/components/navigation/DynamicBottomBar.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const routeActionOwnership = read('src/config/routeActionOwnership.js');
    const service = read('src/services/pricingService.js');
    const mobile = read('src/components/mobile/MobilePricing.jsx');
    const table = read('src/components/views/PricingTableView.jsx');

    expect(gate).toContain('Pricing Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('First route startup quieting cleanup on 2026-07-06 made `/pricing` route-owned in `pageDataAccess.js` with a zero-domain startup override.');
    expect(gate).toContain('First right-panel truth cleanup on 2026-07-06 stopped `ContextPanel.jsx` from passing `servicePricing` and `roomPricing` into `/pricing`.');
    expect(gate).toContain('First shell action quieting cleanup on 2026-07-06 made `ContextAwareFAB.jsx` and `DynamicBottomBar.jsx` treat `/pricing` as route-owned');
    expect(gate).toContain('Active command safety cleanup on 2026-07-06 now keeps `PricingManagementPage.jsx` fail-closed for price mutations without importing or calling pricing mutation functions.');
    expect(gate).toContain('Header add, `openPricingModal`, empty-state create, row view/edit/delete, and mobile row actions now show unavailable feedback; table selection and bulk delete stay hidden while `PRICING_MUTATION_COMMANDS_ENABLED` is false.');
    expect(gate).toContain('Data ownership: partially improved, not admitted. The first safety cleanup removed PageData startup acquisition, route-level pricing realtime, right-panel PageData pricing arrays, and generic FAB/mobile `Add price` action on `/pricing`.');
    expect(gate).toContain('Scope: not admitted. Current copy and form flow blur global, organization, hospital, service, and room scope.');
    expect(gate).toContain('Command authority: blocked. Active command safety cleanup moved create, edit, delete, selection, and bulk delete paths to unavailable feedback, hidden state, or active-source removal');
    expect(gate).toContain('Organization-wide pricing: blocked. The current receiver is hospital-scoped, and there is no proved propagation receiver or sibling-hospital conflict model.');
    expect(gate).toContain('PageData/shell ownership: partially quieted, not admitted. `/pricing` is now route-owned in `pageDataAccess.js`, and the right panel no longer consumes PageData pricing rows.');
    expect(gate).toContain('Route-owned action: partially fail-closed, not admitted. Generic desktop/mobile `Add price`, right-panel pricing dispatches, page header `Add Pricing`, row view/edit/delete, mobile view/edit/delete, table selection, and bulk delete are hidden, removed, or unavailable');
    expect(gate).toContain('Metrics and reports: partially improved, not admitted. Desktop/mobile counts, average amount, and analytics values now come from the route projection summary');
    expect(gate).toContain('Pricing mobile/right-panel squircle and source-voice cleanup on 2026-07-06 converted `MobilePricing.jsx` and `PricingContextPanel.jsx` to semantic radius tokens, removed local decorative border/ring/outline/tracking/all-caps mobile chrome, changed `Pricing Dynamics` and `Avg Price` to source-neutral active labels, and preserved search, tabs, analytics trigger, row reveal, unavailable action notice, projection-basis metrics, source-pending panel signals, and fail-closed panel actions.');
    expect(gate).toContain('This gives `MobilePricing.jsx` and `PricingContextPanel.jsx` focused strict-radius and source-voice proof only; it does not admit Pricing, prove selected-facility projection truth, prove price mutation receivers, or prove patient app quote consequence.');
    expect(gate).toContain('| Route-owned action | Generic desktop/mobile `Add price` is hidden on `/pricing`; right-panel add/report/bulk actions are unavailable; header add, empty-state create, row view/edit/delete, and mobile view/edit/delete now fail closed; table selection and bulk delete stay hidden while `PRICING_MUTATION_COMMANDS_ENABLED` is false.');
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

    expect(pageDataAccess).toContain("'pricing'");
    expect(pageDataAccess).toContain("pathname === '/pricing'");
    expect(routeOwnsStartupDomains('/pricing')).toBe(true);
    expect(getPageDataStartupDomainsForRole('org_admin', '/pricing')).not.toContain('pricing');
    expect(pageDataContext).toContain("getPricing('services')");
    expect(pageDataContext).toContain("getPricing('rooms')");
    expect(pageDataContext).toContain(".channel('pricing_changes')");
    expect(pageDataContext).toContain("table: 'service_pricing'");
    expect(pageDataContext).toContain("table: 'room_pricing'");
    expect(contextPanel).not.toContain('servicePricing');
    expect(contextPanel).not.toContain('roomPricing');
    expect(contextPanel).toContain('<PricingContextPanel pricingContext={pricingRouteContext} />');
    expect(contextPanel).toContain("new CustomEvent('requestPricingRouteContext')");
    expect(panel).not.toContain("new CustomEvent('openPricingModal')");
    expect(panel).not.toContain("new CustomEvent('openAnalyticsModal')");
    expect(panel).toContain('Pricing scope pending.');
    expect(panel).toContain('Pricing actions unavailable until facility scope is verified.');
    expect(page).toContain("new CustomEvent('pricingRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestPricingRouteContext'");
    expect(page).toContain('focusedPrice');

    expect(contextFab).toContain('const routeOwnsAction = routeOwnsShellAction(location.pathname)');
    expect(routeActionOwnership).toContain("'/pricing'");
    expect(bottomBar).toContain("pathname.startsWith('/pricing')");
    expect(bottomBar).toContain("window.dispatchEvent(new CustomEvent('openPricingModal'))");
    expect(contextAction).toContain("currentPath.includes('/pricing')");
    expect(contextAction).toContain("label: 'Add price'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openPricingModal'))");

    expect(page).toContain('const PRICING_MUTATION_COMMANDS_ENABLED = false;');
    expect(page).toContain("const PRICING_SCOPE_UNAVAILABLE_MESSAGE = 'Price changes need a selected facility before they can run.';");
    expect(page).toContain("import { getPricingPageData } from '../../services/pricingService';");
    expect(page).toContain('getPricingPageData({');
    expect(page).toContain('setPricingProjection(projection);');
    expect(page).toContain('pagination.setTotalCount(projection.totalCount || 0);');
    expect(page).toContain('const filteredPricing = pricing;');
    expect(page).toContain('const paginatedPricing = pricing;');
    expect(page).toContain('pricingProjection={pricingProjection}');
    expect(page).toContain('if (!PRICING_MUTATION_COMMANDS_ENABLED) return false;');
    expect(page).toContain('const showPricingCommandUnavailable = useCallback(() => {');
    expect(page).toContain('setActionNotice(PRICING_SCOPE_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('toast.info(PRICING_SCOPE_UNAVAILABLE_MESSAGE);');
    expect(page).toContain('data-state="unavailable"');
    expect(page).toContain('aria-label={`Add pricing unavailable. ${PRICING_SCOPE_UNAVAILABLE_MESSAGE}`}');
    expect(page).toContain('<PricingDesktopWorkspace');
    expect(page).not.toContain('selection={selection}');
    expect(page).toContain('sortConfig={sortConfig}');
    expect(page).not.toContain('selectionEnabled={PRICING_MUTATION_COMMANDS_ENABLED}');
    expect(page).not.toContain('onSelect={handleSelect}');
    expect(page).not.toContain('onSelectAll={(checked) => handleSelectAll(checked, paginatedPricing)}');
    expect(mobile).toContain('role="status"');
    expect(mobile).toContain('aria-live="polite"');
    expect(page).not.toContain('saveServicePricing');
    expect(page).not.toContain('saveRoomPricing');
    expect(page).not.toContain('deleteServicePricing');
    expect(page).not.toContain('deleteRoomPricing');
    expect(page).not.toContain('<Dialog');
    expect(page).not.toContain('<ConfirmationModal');
    expect(page).not.toContain('<BulkActionBar');
    expect(mobile).toContain("actionNotice = ''");
    expect(mobile).toContain('pricingProjection = null');
    expect(mobile).not.toContain("trend: 'LIVE'");
    expect(mobile).not.toContain('selectionEnabled');
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
