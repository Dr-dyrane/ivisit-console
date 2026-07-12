import fs from 'fs';
import { getAccessibleNav } from '../../config/navigation';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('EmergencyRequestsPage service ownership contract', () => {
  it('keeps Requests list/count/payment reads owned by emergencyService', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const serviceSource = fs.readFileSync('src/services/emergencyService.js', 'utf8');
    const queryHookSource = fs.readFileSync('src/hooks/useEmergencyQuery.js', 'utf8');

    // S3 migration: the route-owned page read now flows through useEmergencyQuery,
    // the only caller of the service projection. The page reads the ['emergency']
    // cache, never the raw table, and never invokes the service read directly.
    expect(pageSource).toContain('useEmergencyQuery(queryFilter');
    expect(queryHookSource).toContain('getEmergencyRequestsPage(filter)');
    expect(pageSource).not.toContain('getEmergencyRequestsPage({');
    expect(pageSource).not.toContain("supabase.from('emergency_requests')");
    expect(pageSource).not.toContain("supabase.from('payments')");
    expect(pageSource).not.toContain('applyAuthFilter(query');
    expect(pageSource).not.toContain('usePageData');
    expect(pageSource).not.toContain('emergencyData?.stats');
    expect(pageSource).toContain('const [requestStats, setRequestStats] = useState(null)');
    expect(pageSource).toContain('setRequestStats(stats || null)');
    expect(pageSource).toContain('statistics={requestStats}');
    expect(pageSource).toContain('stats={requestStats}');
    expect(pageSource).toContain('analytics={requestStats || {');

    expect(serviceSource).toContain('export async function getEmergencyRequestsPage');
    expect(serviceSource).toContain('export async function getEmergencyRequestsPageStats');
    expect(serviceSource).toContain('async function getEmergencyPageExactCount');
    expect(serviceSource).toContain("supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true })");
    expect(serviceSource).toContain(".from('payments')");
    expect(serviceSource).toContain('applyEmergencyRequestScope');
    expect(serviceSource).toContain('normalizeEmergencyRequestRow');
  });

  it('keeps Requests filters, exact counts, sort, and pagination service-owned', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const serviceSource = fs.readFileSync('src/services/emergencyService.js', 'utf8');

    expect(pageSource).toContain('const buildRequestsServiceFilter = (filters = {}) =>');
    expect(pageSource).toContain('status: filters.status');
    expect(pageSource).toContain('search: filters.search');
    expect(pageSource).toContain('date_from: dateRange.start ?');
    expect(pageSource).toContain('date_to: dateRange.end ?');
    expect(pageSource).toContain('...buildRequestsServiceFilter(filters)');
    expect(pageSource).toContain('useEmergencyQuery(queryFilter, { enabled: authReady })');
    expect(pageSource).toContain('kpiFilter: selectedKpiFilter,');
    expect(pageSource).toContain('limit: pagination.itemsPerPage');
    expect(pageSource).toContain('offset: pagination.paginationRange.start');
    expect(pageSource).toContain('sortKey: sortConfig.key');
    expect(pageSource).toContain('sortDirection: sortConfig.direction');
    // Sort UI: clickable column headers toggle setSortConfig (VisitsPage/HospitalsPage
    // idiom), feeding the sortKey/sortDirection plumbing above into the service filter.
    // The header/sheet/count-row/pagination anatomy composes from the console DS
    // (locked in ConsoleDesignSystem.contract.test.js); the page wires the domain:
    // TIME-only sort key + the shared pagination store.
    expect(pageSource).toContain('const handleSort = useCallback((key) =>');
    expect(pageSource).toContain('setSortConfig((current) => ({');
    expect(pageSource).toContain("SortableColumnHeader, getFilterTriggerState } from '../console/ActivitySheet'");
    expect(pageSource).toContain('<SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />');
    expect(pageSource).toContain('onSort={handleSort}');
    expect(pageSource).toContain('pagination.setTotalCount(count || 0);');
    expect(pageSource).toContain('<ActivitySheet');
    expect(pageSource).toContain('itemNoun="requests"');
    expect(pageSource).toContain('pagination={pagination}');
    expect(pageSource).toContain('Number(pagination.totalCount) === 0');
    expect(pageSource).not.toContain('setTotalCount(data.length');
    expect(pageSource).not.toContain('setTotalCount(normalizedRows.length');
    expect(pageSource).not.toContain('pagination.setTotalCount(requests.length');

    expect(serviceSource).toContain('async function getEmergencyPageExactCount(filter = {}, user) {');
    expect(serviceSource).toContain("supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true })");
    expect(serviceSource).toContain('query = applyEmergencyRequestScope(query, user);');
    expect(serviceSource).toContain('query = applyEmergencyListFilters(query, filter);');
    expect(serviceSource).toContain('if (Array.isArray(filter.status)) {');
    expect(serviceSource).toContain('if (filter.status.length > 0) {');
    expect(serviceSource.indexOf('if (filter.status.length > 0) {'))
      .toBeGreaterThan(serviceSource.indexOf('if (Array.isArray(filter.status)) {'));
    expect(serviceSource).not.toContain("if (Array.isArray(filter.status) && filter.status.length > 0) {\n    query = query.in('status', filter.status);\n  } else if (filter.status) {");
    expect(serviceSource).toContain('query = applyEmergencyKpiFilter(query, filter.kpiFilter);');
    expect(serviceSource).toContain("if (kpiFilter === 'critical') return query.eq('service_type', 'critical_care');");
    expect(serviceSource).toContain('const countPromise = getEmergencyPageExactCount(filter, user);');
    expect(serviceSource).toContain('const statsPromise = getEmergencyRequestsPageStats(statsFilter, user, true);');
    expect(serviceSource).toContain("const sortKey = EMERGENCY_REQUEST_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';");
    expect(serviceSource).toContain("dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });");
    expect(serviceSource).toContain('const limit = Number(filter.limit);');
    expect(serviceSource).toContain('const offset = Number(filter.offset) || 0;');
    expect(serviceSource).toContain('dataQuery = dataQuery.range(offset, offset + limit - 1);');
    expect(serviceSource).not.toContain('.limit(1000)');
  });

  it('opens Quick Search request deep links through the scoped single-record owner', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const searchSource = fs.readFileSync('src/services/searchService.js', 'utf8');

    expect(searchSource).toContain('path: `/emergencies?id=${e.id}`');
    expect(pageSource).toContain("new URLSearchParams(location.search).get('id')");
    expect(pageSource).toContain('getEmergencyRequest(requestId)');
    expect(pageSource).toContain("request.id === requestId || request.display_id === requestId");
    expect(pageSource).toContain("toast.info('Request is unavailable in your current scope.')");
    expect(pageSource).not.toContain('deep-link excluded by decision:');
  });

  it('keeps legacy Requests density views out of the active route renderer', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const mobileSource = fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');
    const activeRequestsSource = `${pageSource}\n${mobileSource}`;

    expect(pageSource).toContain('const RequestsDesktopWorkspace = (');
    // Signal panel + KPI strip compose from the console DS (this page is the donor);
    // the page keeps its domain maps (signal copy, tone classes, options, counts).
    expect(pageSource).toContain('<SignalPanel signal={signal} loading={loading} toneClassMap={requestToneClass}>');
    expect(pageSource).toContain('<KpiStrip');
    expect(pageSource).toContain('<RequestRow');
    expect(pageSource).toContain('<RequestDetailRail');
    expect(pageSource).toContain('viewToggle={null}');
    // Mobile Requests now renders the iOS-Settings grouped list (recency panels) via the
    // mobile canon kit (GroupedList/MobileListRow own the recency grouping + row anatomy;
    // recipes are locked in MobileCanonKit.contract.test.js) instead of the flat feed.
    expect(mobileSource).toContain("from './canon/GroupedList'");
    expect(mobileSource).toContain('dataAttr="data-mobile-request-row"');

    expect(activeRequestsSource).not.toContain('EmergencyRequestListView');
    expect(activeRequestsSource).not.toContain('EmergencyRequestTableView');
    expect(activeRequestsSource).not.toContain('useViewMode');
    expect(activeRequestsSource).not.toContain('setViewMode');
    expect(activeRequestsSource).not.toContain('ViewToggle');
  });

  it('keeps Requests out of private shell chrome', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const mobileSource = fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');
    const activeRequestsSource = `${pageSource}\n${mobileSource}`;
    const forbiddenShellOwners = [
      'SmartHeader',
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
      expect(activeRequestsSource).not.toContain(owner);
    });

    expect(pageSource).toContain("import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';");
    // The stage owns the atlas + wayfinding dock now (console DS WorkspaceStage
    // renders ConsoleModuleRail); the page stopped importing the rail directly.
    expect(pageSource).toContain("import { WorkspaceStage, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';");
    expect(pageSource).toContain("import { FilterSheet } from '../common/FilterSheet';");
    expect(pageSource).toContain("import { ModalShell } from '../ui/ModalShell';");
    expect(pageSource).toContain('const RequestDetailRail = ({');
    expect(mobileSource).toContain('dataAttr="data-mobile-request-row"');
    expect(pageSource).toContain('usePageHeader(');
    expect(pageSource).toContain("'Requests',");
    expect(pageSource).toContain("usePageFooter(null, 'status', false);");
    expect(pageSource).toContain('usePageShell({ bleed: true, hideFab: true });');
  });

  it('keeps Requests realtime and route event side effects scoped and cleaned up', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const addListeners = pageSource.match(/window\.addEventListener\('/g) || [];
    const removeListeners = pageSource.match(/window\.removeEventListener\('/g) || [];

    // S3 migration: the manual useState/requestSeqRef/withTimeout fetch loop is gone.
    // The page reads via React Query; the realtime channel invalidates the cache.
    expect(pageSource).not.toContain('requestSeqRef');
    expect(pageSource).not.toContain('const fetchRequests = useCallback(async () => {');
    expect(pageSource).not.toContain('isTransientRequestRefreshError');
    expect(pageSource).not.toContain("console.error('Error fetching requests:', error);");
    expect(pageSource).toContain('useEmergencyQuery(queryFilter, { enabled: authReady })');
    expect(pageSource).toContain('const fetchRequests = refetch;');

    expect(pageSource).toContain(".channel('emergency_requests_page_changes')");
    expect(pageSource).toContain("table: 'emergency_requests' }, () => {");
    expect(pageSource).toContain("table: 'payments' }, () => {");
    expect(pageSource).toContain("queryClient.invalidateQueries({ queryKey: ['emergency'] })");
    expect(pageSource).toContain('.subscribe();');
    expect(pageSource).toContain('supabase.removeChannel(channel);');

    expect(addListeners).toHaveLength(4);
    expect(removeListeners).toHaveLength(4);
    expect(pageSource).toContain('const requestPanelContext = useMemo(() => ({');
    expect(pageSource).toContain("window.dispatchEvent(new CustomEvent('emergencyRouteContextUpdated', {");
    expect(pageSource).toContain("window.addEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);");
    expect(pageSource).toContain("window.removeEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);");
    expect(pageSource).toContain("window.addEventListener('openEmergencyModal', handleOpenModal);");
    expect(pageSource).toContain("window.addEventListener('openFilters', handleOpenFilters);");
    expect(pageSource).toContain("window.addEventListener('openAnalyticsModal', handleOpenAnalytics);");
    expect(pageSource).toContain("window.removeEventListener('openEmergencyModal', handleOpenModal);");
    expect(pageSource).toContain("window.removeEventListener('openFilters', handleOpenFilters);");
    expect(pageSource).toContain("window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);");
    expect(pageSource).not.toContain("window.addEventListener('resize'");
    expect(pageSource).not.toContain("window.addEventListener('scroll'");
  });

  it('keeps Requests loading, error, empty, selected, and mobile states distinct', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const mobileSource = fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');

    // Count-row copy ('Loading requests' / 'One moment') renders through the DS
    // ActivitySheet from itemNoun="requests"; the skeleton rows are the shared
    // SkeletonRows primitive (both locked in ConsoleDesignSystem.contract.test.js).
    expect(pageSource).toContain('itemNoun="requests"');
    expect(fs.readFileSync('src/components/console/ActivitySheet.jsx', 'utf8')).toContain("'One moment'");
    expect(pageSource).toContain('{loading && <SkeletonRows />}');
    expect(pageSource).toContain('<RequestLoadErrorState message={loadError} onRetry={onRetry} />');
    expect(pageSource).toContain('<RequestLoadNotice message={loadError} onRetry={onRetry} />');
    expect(pageSource).toContain('Number(pagination.totalCount) === 0');
    expect(pageSource).toContain('No matching requests');
    expect(pageSource).toContain('Change filters');
    expect(pageSource).toContain("SkeletonRows, CopyChip, DetailLine, StageStrip, EmptyState } from '../console/primitives'");
    expect(pageSource).toContain('const RequestLoadErrorState = ({ message, onRetry }) => (');
    expect(pageSource).toContain('const RequestLoadNotice = ({ message, onRetry }) => (');
    // KPI chip selected/idle + aria-pressed anatomy is locked once in the DS
    // KpiStrip; the row keeps its own selected/idle truth in the page.
    expect(pageSource).toContain('dataAttr="data-request-kpi"');
    expect(pageSource).toContain("data-state={selected ? 'selected' : 'idle'}");
    expect(pageSource).toContain('aria-pressed={selected}');
    expect(pageSource).toContain('data-state={filterTriggerState}');
    expect(pageSource).toContain('aria-expanded={filterSheetOpen}');

    expect(mobileSource).toContain('<PullToRefresh onRefresh={onRefresh}>');
    // Skeleton-first on EVERY mount: the canon warm-up hook (400ms recipe locked in
    // MobileCanonKit.contract.test.js) guarantees the skeleton shows on cached bottom-nav
    // navigation too (not just refresh), so content never assembles top-to-bottom. When it
    // clears, the group-shaped skeleton is REPLACED in place. The scaffold itself stays
    // PAGE-LOCAL: its trailing column (single pill bar) differs from the kit scaffold's
    // time+pill column, and fidelity wins over kit adoption.
    expect(mobileSource).toContain("from './canon/Loading'");
    expect(mobileSource).toContain('const warmingUp = useSkeletonWarmup();');
    expect(mobileSource).toContain('const showSkeleton = warmingUp || (loading && displayItems.length === 0);');
    expect(mobileSource).toContain('const MobileRequestsListSkeleton = (');
    expect(mobileSource).toContain('{showSkeleton ? (');
    expect(mobileSource).toContain('<MobileRequestsListSkeleton />');
    expect(mobileSource).toContain('MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain"');
    expect(mobileSource).toContain('label="Requests did not load"');
    expect(mobileSource).toContain('label="No requests found"');
    expect(mobileSource).toContain("const filterTriggerState = filterSheetOpen ? 'open' : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';");
    expect(mobileSource).toContain("const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';");
    expect(mobileSource).toContain("activeKpi={kpiFilter || 'pending'}");
    expect(mobileSource).toContain('<MobileDetailSheet');
    expect(mobileSource).toContain('onClose={() => setActiveRequest(null)}');
  });

  it('keeps Requests UI language simple and interaction-safe', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const mobileSource = fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');
    const listSource = fs.readFileSync('src/components/views/EmergencyRequestListView.jsx', 'utf8');
    const tableSource = fs.readFileSync('src/components/views/EmergencyRequestTableView.jsx', 'utf8');
    const hardgateSource = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
    const fabSource = fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
    const bottomBarSource = fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
    const railSource = fs.readFileSync('src/config/consoleModuleRail.js', 'utf8');
    const railComponentSource = fs.readFileSync('src/components/common/ConsoleModuleRail.jsx', 'utf8');
    const mobileMenuSource = fs.readFileSync('src/components/navigation/MobileNavMenu.jsx', 'utf8');
    const smartHeaderSource = fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
    const filterSheetSource = fs.readFileSync('src/components/common/FilterSheet.jsx', 'utf8');
    const analyticsModalSource = fs.readFileSync('src/components/modals/AnalyticsModal.jsx', 'utf8');
    const installPromptSource = fs.readFileSync('src/components/pwa/InstallPrompt.jsx', 'utf8');
    const contextPanelSource = fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
    const emergencyPanelSource = fs.readFileSync('src/components/context/EmergencyPanel.jsx', 'utf8');
    const activeRequestsSource = `${pageSource}\n${mobileSource}`;
    const allRequestsSource = `${activeRequestsSource}\n${listSource}\n${tableSource}`;

    expect(activeRequestsSource).toContain("'Requests'");
    expect(pageSource).toContain('<SEOHead title="Requests"');
    expect(activeRequestsSource).not.toContain('Emergency Logs');
    expect(activeRequestsSource).not.toContain('Emergency Requests');
    expect(activeRequestsSource).not.toContain('NEW REQUEST');
    expect(activeRequestsSource).not.toContain('Live Buffer');
    expect(activeRequestsSource).not.toContain('growthData');
    expect(activeRequestsSource).not.toMatch(/\bmission\b/i);
    expect(activeRequestsSource).not.toMatch(/\bcontrol\b/i);
    expect(pageSource).toContain('Number(pagination.totalCount) === 0');
    expect(pageSource).toContain('No matching requests');
    expect(pageSource).toContain('Change filters');
    // 'Loading requests' / 'One moment' come from the DS ActivitySheet count row
    // via itemNoun="requests" (locked in ConsoleDesignSystem.contract.test.js).
    expect(pageSource).toContain('itemNoun="requests"');
    expect(pageSource).toContain('const EMPTY_REQUEST_FILTERS = Object.freeze({');
    expect(pageSource).toContain('const buildRequestsServiceFilter = (filters = {}) =>');
    expect(pageSource).toContain('date_from: dateRange.start');
    expect(pageSource).toContain('date_to: dateRange.end');
    // getFilterTriggerState is DS-owned now (ActivitySheet); the page imports it
    // for the header trigger and the DS toolbar computes its own state from props.
    expect(pageSource).toContain("import { ActivitySheet, SheetToolbar, SortableColumnHeader, getFilterTriggerState } from '../console/ActivitySheet';");
    expect(pageSource).toContain('const filterTriggerState = getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter });');
    expect(pageSource).toContain("data-state={isEmergencyModalOpen ? 'open' : 'idle'}");
    expect(pageSource).toContain('aria-expanded={isEmergencyModalOpen}');
    expect(pageSource).toContain('data-state={filterTriggerState}');
    expect(pageSource).toContain('aria-haspopup="dialog"');
    expect(pageSource).toContain('aria-expanded={filterSheetOpen}');
    // loadError is derived from the React Query error object now (no setLoadError state).
    expect(pageSource).toContain('const loadError = queryError ?');
    expect(pageSource).not.toContain('setLoadError(');
    expect(pageSource).toContain('resetValues={EMPTY_REQUEST_FILTERS}');
    expect(pageSource).toContain('resetLabel="Clear"');
    expect(pageSource).toContain('<RequestLoadErrorState message={loadError} onRetry={onRetry} />');
    expect(pageSource).toContain('<RequestLoadNotice message={loadError} onRetry={onRetry} />');
    expect(mobileSource).toContain('loadError,');
    expect(mobileSource).toContain('Requests did not load');
    expect(mobileSource).toContain('onRecover={onRetry}');
    expect(mobileSource).toContain('const hasMobileRequestFilters = (filters = {}) => Boolean(');
    expect(mobileSource).toContain('filterSheetOpen = false,');
    expect(mobileSource).toContain('analyticsOpen = false,');
    expect(mobileSource).toContain("const filterTriggerState = filterSheetOpen ? 'open' : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';");
    expect(mobileSource).toContain("const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';");
    expect(mobileSource).toContain('data-state={filterTriggerState}');
    expect(mobileSource).toContain('data-state={analyticsTriggerState}');
    expect(mobileSource).toContain('aria-expanded={filterSheetOpen}');
    expect(mobileSource).toContain('aria-expanded={analyticsOpen}');
    expect(filterSheetSource).toContain('resetValues = null');
    expect(filterSheetSource).toContain('resetLabel = \'Reset\'');
    expect(filterSheetSource).toContain('const filterBackdropTransition = { duration: 0.18');
    expect(filterSheetSource).toContain('const filterSheetTransition = { duration: 0.22');
    expect(filterSheetSource).toContain('if (!isOpen) return null;');
    expect(filterSheetSource).toContain('key="filter-sheet-backdrop"');
    expect(filterSheetSource).toContain('key="filter-sheet-shell"');
    expect(filterSheetSource).toContain('transition={filterBackdropTransition}');
    expect(filterSheetSource).toContain('transition={filterSheetTransition}');
    expect(filterSheetSource).not.toContain("transition={{ type: 'spring', stiffness: 300, damping: 30 }}\n            role=\"dialog\"");
    expect(filterSheetSource).toContain('aria-labelledby={titleId}');
    expect(filterSheetSource).toContain('aria-describedby={descriptionId}');
    expect(filterSheetSource).toContain('data-filter-sheet-shell="true"');
    expect(filterSheetSource).toContain('htmlFor={startDateId}');
    expect(filterSheetSource).toContain('htmlFor={endDateId}');
    expect(filterSheetSource).toContain('Start date');
    expect(filterSheetSource).toContain('End date');
    expect(filterSheetSource).toContain('grid max-h-[min(68dvh,620px)] grid-cols-2');
    expect(filterSheetSource).toContain('space-y-6 max-h-[58dvh]');
    expect(filterSheetSource).toContain('bg-foreground text-background');
    expect(filterSheetSource).not.toContain('bg-primary hover:bg-primary/90');
    expect(filterSheetSource).toContain('hover:bg-foreground hover:text-background');
    expect(filterSheetSource).not.toContain('hover:bg-primary hover:text-primary-foreground');
    expect(filterSheetSource).toContain('setFilters(resetValues || initialValues)');
    expect(analyticsModalSource).toContain("import { ModalShell } from '../ui/ModalShell';");
    expect(analyticsModalSource).toContain('<ModalShell');
    expect(analyticsModalSource).toContain('title="Statistics"');
    expect(analyticsModalSource).toContain('subtitle={displayType}');
    expect(analyticsModalSource).toContain('footer={footer}');
    expect(analyticsModalSource).toContain('Statistics');
    expect(analyticsModalSource).toContain("emergency: [\n    { id: 'summary', label: 'Summary' }");
    expect(analyticsModalSource).toContain('const formatMinutes = (value, total) => {');
    expect(analyticsModalSource).toContain("if (!hasRows || !Number.isFinite(parsed)) return 'No data';");
    expect(analyticsModalSource).toContain("label: 'Avg response'");
    expect(analyticsModalSource).toContain("label: 'Needs review'");
    expect(analyticsModalSource).toContain("{isFirst ? 'Close' : 'Previous'}");
    expect(analyticsModalSource).toContain('Next');
    expect(analyticsModalSource).not.toContain('Analytic Engine');
    expect(analyticsModalSource).not.toContain('Response Pulse');
    expect(analyticsModalSource).not.toContain('Priority Heat');
    expect(analyticsModalSource).not.toContain('Status Flow');
    expect(analyticsModalSource).not.toContain('Health Index');
    expect(analyticsModalSource).not.toContain('In-Flow');
    expect(analyticsModalSource).not.toContain('Signal processing');
    expect(analyticsModalSource).not.toContain('No segments detected');
    expect(analyticsModalSource).not.toContain('avgResponseTime || 12');
    expect(analyticsModalSource).not.toContain('bg-primary');
    expect(analyticsModalSource).not.toContain('text-primary');
    expect(analyticsModalSource).not.toContain('var(--primary');
    expect(analyticsModalSource).not.toContain('fixed inset-0');
    expect(analyticsModalSource).not.toContain('role="dialog"');
    expect(analyticsModalSource).not.toContain('aria-modal="true"');
    expect(installPromptSource).toContain('hasBlockingSurface');
    expect(installPromptSource).toContain('[role="dialog"][aria-modal="true"], [data-filter-sheet-shell="true"], [data-modal-shell="true"]');
    expect(installPromptSource).toContain('isVisible && !hasBlockingSurface');
    expect(installPromptSource).toContain('bottom-24 left-4 right-4');
    expect(installPromptSource).toContain('md:bottom-4');
    expect(pageSource).toContain('const [kpiFilter, setKpiFilter] = useState(null);');
    expect(pageSource).toContain('const selectedKpiFilter = useMemo(');
    expect(pageSource).toContain('kpiFilter || getDefaultRequestKpi(requestStats)');
    expect(pageSource).toContain('useEmergencyMutations({');
    expect(pageSource).toContain("applyOptimisticStatus(cache, variables.id, 'accepted')");
    expect(pageSource).toContain("applyOptimisticStatus(cache, variables.id, 'completed')");
    expect(pageSource).toContain("applyOptimisticStatus(cache, variables.id, 'cancelled')");
    expect(pageSource).toContain('usePageShell({ bleed: true, hideFab: true })');
    expect(pageSource).toContain("usePageFooter(null, 'status', false)");
    // The atlas layer + module rail render inside the DS WorkspaceStage
    // (ConsoleAtlasLayer is this page's own recipe, extracted verbatim);
    // wayfinding press feedback comes from the shared useWayfindingNav.
    expect(pageSource).toContain('<WorkspaceStage');
    expect(pageSource).toContain('activePath="/emergencies"');
    expect(pageSource).toContain('moduleRailItems={moduleRailItems}');
    expect(pageSource).toContain('getConsoleModuleRailItems(roleKind)');
    expect(pageSource).toContain('const { routingPath, handleRailNavigate } = useWayfindingNav();');
    expect(pageSource).toContain('routingPath={routingPath}');
    expect(railSource).toContain("admin: ['today', 'requests', 'staff', 'payments', 'help']");
    expect(railComponentSource).toContain('aria-current={isActive ? \'page\' : undefined}');
    expect(pageSource).toContain('<SignalPanel signal={signal} loading={loading} toneClassMap={requestToneClass}>');
    expect(pageSource).toContain('getRequestSignal({ stats, requests, kpiFilter, loadError })');
    expect(pageSource).toContain('return normalizeCount(stats?.pending, rowCount);');
    expect(pageSource).toContain("id: 'active'");
    expect(pageSource).toContain("label: 'Active'");
    expect(pageSource).toContain('isActiveEmergencyStatus(request.status)');
    expect(pageSource).toContain('return normalizeCount(stats?.active, rowCount);');
    expect(pageSource).toContain("headline: count > 0 ? `${count} active request");
    expect(pageSource).toContain('getDefaultRequestKpi');
    expect(pageSource).toContain("if (pending > 0) return 'pending';");
    expect(pageSource).toContain("if (active > 0) return 'active';");
    expect(pageSource).toContain('kpiFilter: selectedKpiFilter');
    expect(pageSource).toContain("request.service_type === 'critical_care'");
    expect(pageSource).toContain("critical: requests.filter((request) => request.service_type === 'critical_care').length");
    expect(pageSource).not.toContain("label: 'Critical care'");
    expect(pageSource).not.toContain("priority === 'critical'");
    expect(pageSource).not.toContain('requests.length > 0 ? rowCount : normalizeCount(stats?.pending, rowCount)');
    // Chip anatomy (data-state selected/idle, aria-pressed, aria-label) is locked
    // once in the DS KpiStrip; the page pins its domain wiring: pool pins,
    // importance, the 'pending' default, and the zero-pending emerald override.
    expect(pageSource).toContain('dataAttr="data-request-kpi"');
    expect(pageSource).toContain('pinnedIds={PINNED_KPI_IDS}');
    expect(pageSource).toContain('importance={KPI_IMPORTANCE}');
    expect(pageSource).toContain('defaultId="pending"');
    expect(pageSource).toContain('resolveActive={resolveRequestKpiActive}');
    expect(pageSource).toContain('data-request-row={request.id}');
    expect(pageSource).toContain("data-state={selected ? 'selected' : 'idle'}");
    expect(pageSource).toContain('aria-pressed={selected}');
    expect(pageSource).toContain("tone: hasPending ? 'danger' : 'clear'");
    expect(pageSource).toContain("label: hasPending ? 'Needs attention' : 'Clear'");
    expect(pageSource).toContain('const getRequestAvatarClass = (request) =>');
    expect(pageSource).toContain('const rowAvatarClass = getRequestAvatarClass(request);');
    expect(pageSource).toContain('const avatarClass = getRequestAvatarClass(request);');
    expect(pageSource).toContain('bg-emerald-500/10 text-emerald-700');
    expect(pageSource).toContain('bg-amber-500/10 text-amber-700');
    expect(pageSource).toContain('bg-cyan-500/10 text-cyan-700');
    expect(pageSource).toContain('bg-sky-500/10 text-sky-700');
    expect(pageSource).not.toContain('bg-success/14 text-success');
    expect(pageSource).not.toContain('bg-warning/14 text-warning');
    expect(pageSource).not.toContain('bg-info/14 text-info');
    expect(pageSource).not.toContain('bg-primary/14 text-primary');
    expect(pageSource).not.toContain('bg-primary text-white');
    expect(pageSource).not.toContain('bg-warning text-background');
    expect(pageSource).toContain('hover:bg-foreground/10 hover:text-foreground');
    // Neutral-shadow law (DS adoption): the header filter dot keeps the sky fill
    // but lost its colored glow -- the documented self-debt (Visits precedent).
    expect(pageSource).toContain('h-2 w-2 rounded-pill bg-sky-500');
    expect(pageSource).not.toContain('shadow-[0_0_24px_rgba(14,165,233,0.55)]');
    expect(pageSource).not.toContain('hover:bg-primary/10 hover:text-primary');
    expect(pageSource).not.toContain('bg-primary shadow-[0_0_24px_hsl(var(--primary)');
    expect(pageSource).not.toContain('rounded-full bg-destructive/16 text-lg font-semibold text-destructive');
    // Stage + activity-sheet surfaces live in the DS files now (this page is the
    // donor); the detail rail shell stays page-local for its mobile bottom margin
    // (mb-[calc(13rem+var(--safe-bottom))]) the DS DetailRailShell does not carry.
    const workspaceStageSource = fs.readFileSync('src/components/console/WorkspaceStage.jsx', 'utf8');
    const activitySheetSource = fs.readFileSync('src/components/console/ActivitySheet.jsx', 'utf8');
    expect(workspaceStageSource).toContain('min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground');
    expect(workspaceStageSource).toContain('lg:h-[calc(100dvh-3rem)]');
    expect(activitySheetSource).toContain('rounded-t-sheet bg-card/68');
    expect(activitySheetSource).toContain('mx-auto mb-3 h-1.5 w-[42px]');
    expect(pageSource).toContain('md:rounded-sheet');
    expect(pageSource).toContain('overflow-y-auto rounded-card');
    expect(pageSource).not.toContain('rounded-t-[44px] bg-card/68');
    expect(pageSource).not.toContain('overflow-y-auto rounded-[30px]');
    expect(pageSource).toContain('lg:h-[calc(100dvh-5.5rem)]');
    expect(pageSource).toContain('mx-auto mb-4 h-1.5 w-[42px]');
    expect(pageSource).toContain('const railPrimaryActionClass = {');
    expect(activeRequestsSource).not.toContain('opacity-0 group-hover:opacity-100');
    expect(activeRequestsSource).not.toContain('group-hover:opacity-100');
    expect(activeRequestsSource).not.toContain('hover:opacity');
    expect(pageSource).toContain('const primaryAction = getPrimaryRailAction({');
    expect(pageSource).toContain('const primaryClass = railPrimaryActionClass[primaryAction.kind] || railPrimaryActionClass.details;');
    expect(pageSource).toContain('onClick={() => primaryAction.onClick(request)}');
    expect(pageSource).toContain('{primaryAction.label}');
    expect(pageSource).toContain("primaryAction.kind !== 'dispatch'");
    expect(pageSource).toContain("primaryAction.kind !== 'complete'");
    expect(pageSource).toContain("primaryAction.kind !== 'retry'");
    expect(pageSource).toContain('<RailActionButton icon={Info} label="Details" onClick={() => onView(request)} />');
    expect(pageSource).toContain("aria-label={`${selected ? 'Selected' : 'Open'} ${patientName}`}");
    expect(pageSource).not.toContain('aria-label={`Select ${patientName}`}');
    expect(pageSource).not.toContain('container mx-auto');
    expect(pageSource).not.toContain('inset_0_1px');
    expect(mobileSource).toContain('return countNumber(statistics?.pending, rowCount);');
    expect(mobileSource).toContain("id: 'active'");
    expect(mobileSource).toContain("label: 'Active'");
    expect(mobileSource).toContain('return countNumber(statistics?.active, rowCount);');
    expect(mobileSource).not.toContain("label: 'Critical care'");
    expect(mobileSource).not.toContain('emergencies.length > 0 ? rowCount : countNumber(statistics?.pending, rowCount)');
    expect(mobileSource).toContain('const getMobileRequestAvatarClass = (request) =>');
    expect(mobileSource).toContain('const avatarClass = getMobileRequestAvatarClass(request);');
    expect(mobileSource).toContain('bg-emerald-500/10 text-emerald-700');
    expect(mobileSource).toContain('bg-amber-500/10 text-amber-700');
    expect(mobileSource).toContain('bg-cyan-500/10 text-cyan-700');
    expect(mobileSource).toContain('bg-sky-500/10 text-sky-700');
    expect(mobileSource).not.toContain('bg-success/14 text-success');
    expect(mobileSource).not.toContain('bg-warning/14 text-warning');
    expect(mobileSource).not.toContain('bg-info/14 text-info');
    expect(mobileSource).not.toContain('bg-primary/14 text-primary');
    expect(mobileSource).toContain("color: 'hsl(var(--foreground))'");
    expect(mobileSource).toContain('hover:bg-foreground/10 hover:text-foreground');
    expect(mobileSource).not.toContain("color: 'hsl(var(--primary))'");
    expect(mobileSource).not.toContain('hover:bg-primary/10 hover:text-primary');
    expect(mobileSource).toContain('const MobileRequestsAtlasLayer = () => (');
    expect(mobileSource).toContain('relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground');
    expect(mobileSource).toContain('MobileKPIStrip');
    expect(mobileSource).toContain('kpis={kpis}');
    expect(mobileSource).toContain("activeKpi={kpiFilter || 'pending'}");
    expect(mobileSource).toContain("onKpiClick={(id) => setKpiFilter?.(id)}");
    expect(mobileSource).toContain('dataAttr="data-mobile-request-row"');
    // Grouped-list row: taps open the detail sheet directly via setActiveRequest, rendered
    // inside a frosted recency PANEL with slate hairlines between transparent rows. The
    // press ladder + row anatomy come from the canon kit (MobileCanonKit.contract.test.js).
    expect(mobileSource).toContain('onOpen={setActiveRequest}');
    expect(mobileSource).toContain('<GroupedList');
    expect(mobileSource).toContain('rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl');
    expect(mobileSource).toContain('h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]');
    expect(mobileSource).toContain('aria-haspopup="dialog"');
    // Heading (title + honest count line) renders through the canon MobileHeading;
    // the h1 recipe is locked in MobileCanonKit.contract.test.js.
    expect(mobileSource).toContain('<MobileHeading');
    expect(mobileSource).toContain('title="Requests"');
    expect(mobileSource).toContain('noun="request"');
    expect(mobileSource).not.toContain('rounded-t-sheet bg-card/78');
    expect(mobileSource).toContain("from './canon/MobileHero'");
    // Detail tiles now render through the shared MobileDetailIslands (canon rounded-button
    // tiles), replacing the old inline `rounded-inner bg-background/30 p-3` tiles.
    expect(mobileSource).toContain('MobileDetailIslands');
    expect(mobileSource).not.toContain('rounded-t-[44px] bg-card/78');
    expect(mobileSource).not.toContain('rounded-[28px]');
    expect(mobileSource).not.toContain('mx-auto mb-3 h-1.5 w-[42px]');
    expect(mobileSource).toContain('MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain"');
    expect(mobileSource).not.toContain('overflow-x-auto');
    expect(fabSource).toContain("location.pathname === '/'");
    expect(fabSource).toContain("location.pathname.startsWith('/emergencies')");
    expect(fabSource).toContain("location.pathname.startsWith('/verification')");
    expect(fabSource).toContain("location.pathname.startsWith('/map')");
    expect(fabSource).toContain("location.pathname.startsWith('/wallet')");
    expect(fabSource).toContain('const hideFab = Boolean(pageShellConfig?.hideFab)');
    expect(fabSource).toContain('if (isMobile || isContextPanelOpen || hideFab) return null;');
    expect(fabSource.indexOf('if (isMobile || isContextPanelOpen || hideFab) return null;'))
      .toBeLessThan(fabSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));
    expect(bottomBarSource).toContain("location.pathname === '/'");
    expect(bottomBarSource).toContain("location.pathname.startsWith('/emergencies')");
    expect(bottomBarSource).toContain("location.pathname.startsWith('/verification')");
    expect(bottomBarSource).toContain("location.pathname.startsWith('/map')");
    expect(bottomBarSource).toContain("location.pathname.startsWith('/wallet')");
    expect(bottomBarSource).toContain('!hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />');
    expect(bottomBarSource).toContain('getRouteOwnedMobileAction(location.pathname, userRole)');
    expect(bottomBarSource).toContain("pathname.startsWith('/emergencies') && (userRole === 'admin' || userRole === 'org_admin')");
    expect(bottomBarSource).toContain("label: 'New request'");
    expect(bottomBarSource).toContain("window.dispatchEvent(new CustomEvent('openEmergencyModal'))");
    expect(mobileMenuSource).toContain("location.pathname.startsWith('/emergencies')");
    expect(mobileMenuSource).toContain('!routeOwnsMobileAction');
    expect(mobileMenuSource).not.toContain('Page Actions');
    expect(smartHeaderSource).toContain("if (pathname.startsWith('/emergencies')) return 'Requests';");
    expect(bottomBarSource.indexOf('!hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />'))
      .toBeLessThan(bottomBarSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));

    expect(allRequestsSource).not.toContain('window.prompt');
    expect(allRequestsSource).not.toContain('window.confirm');
    expect(allRequestsSource).not.toMatch(/\bprompt\s*\(/);
    expect(allRequestsSource).not.toMatch(/\bconfirm\s*\(/);
    expect(pageSource).toContain('setRetryModal({');
    expect(pageSource).toContain('selectedId: methods[defaultIndex]?.id || methods[0]?.id');
    expect(pageSource).toContain('name="paymentMethod"');
    expect(pageSource).toContain('checked={retryModal.selectedId === method.id}');
    expect(pageSource).toContain("setCompleteModal({ open: true, request });");
    expect(pageSource).toContain('title="Mark request complete"');
    expect(pageSource).toContain('onConfirm={() => executeComplete(completeModal.request)}');
    expect(pageSource).not.toContain('processCashPayment');

    expect(hardgateSource).toContain('src/components/pages/EmergencyRequestsPage.jsx');
    expect(hardgateSource).toContain('src/components/mobile/MobileEmergency.jsx');
    expect(hardgateSource).toContain('src/components/context/EmergencyPanel.jsx');
    expect(hardgateSource).toContain('src/components/modals/EmergencyDetailsModal.jsx');
    expect(hardgateSource).toContain('src/components/modals/EmergencyRequestModal.jsx');
    expect(contextPanelSource).toContain('const [emergencyRouteContext, setEmergencyRouteContext] = React.useState(null);');
    expect(contextPanelSource).toContain("window.addEventListener('emergencyRouteContextUpdated', handleEmergencyRouteContext);");
    expect(contextPanelSource).toContain("window.dispatchEvent(new CustomEvent('requestEmergencyRouteContext'));");
    expect(contextPanelSource).toContain('<EmergencyPanel requestContext={emergencyRouteContext} />');
    expect(contextPanelSource).not.toContain('emergencyData={emergencyData}');
    expect(emergencyPanelSource).toContain('export const EmergencyPanel = ({ requestContext }) =>');
    expect(emergencyPanelSource).toContain('Requests overview');
    expect(emergencyPanelSource).toContain('Current route scope');
    expect(emergencyPanelSource).toContain('Panel actions');
    expect(emergencyPanelSource).toContain('Current list');
    expect(emergencyPanelSource).toContain('role="status" aria-live="polite"');
    expect(emergencyPanelSource).toContain("window.dispatchEvent(new CustomEvent('openEmergencyModal'))");
    expect(emergencyPanelSource).toContain("window.dispatchEvent(new CustomEvent('openFilters'))");
    expect(emergencyPanelSource).toContain("window.dispatchEvent(new CustomEvent('openAnalyticsModal'))");
    expect(emergencyPanelSource).not.toContain('usePageData');
    expect(emergencyPanelSource).not.toContain('Using Mock Data');
    expect(emergencyPanelSource).not.toContain('Live Status');
    expect(emergencyPanelSource).not.toContain('Quick Actions');
    expect(emergencyPanelSource).not.toContain('Clear runway');
  });

  it('keeps Requests provider-owned and sponsor-excluded across route and nav contracts', () => {
    expect(getRouteProtection('/emergencies')).toEqual({
      minRole: 'provider',
      resource: 'emergency_requests',
      title: 'Requests',
      excludedRoles: ['sponsor'],
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/emergencies');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/emergencies');
    expect(getProtectedRoutesForRole('provider')).toContain('/emergencies');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/emergencies');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/emergencies');

    expect(getAccessibleNav({ role: 'provider' }).ops.items.map((item) => item.path)).toContain('/emergencies');
    expect(getAccessibleNav({ role: 'sponsor' }).ops).toBeNull();
  });

  it('keeps Requests actions tied to explicit receivers and removes mobile destructive shortcuts', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const mobileSource = fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');
    const detailsModalSource = fs.readFileSync('src/components/modals/EmergencyDetailsModal.jsx', 'utf8');
    const requestModalSource = fs.readFileSync('src/components/modals/EmergencyRequestModal.jsx', 'utf8');
    const actionSource = fs.readFileSync('src/utils/emergencyActions.js', 'utf8');
    const responseServiceSource = fs.readFileSync('src/services/emergencyResponseService.js', 'utf8');
    const emergencyServiceSource = fs.readFileSync('src/services/emergencyService.js', 'utf8');

    // Dispatch/complete/cancel now route through useEmergencyMutations.mutateAsync,
    // whose mutationFn is the SAME reused RPC service fn (never bypassed).
    expect(pageSource).toContain('dispatchEmergency(id, request)');
    expect(pageSource).toContain('dispatchMutation.mutateAsync({ id: request.id, request })');
    expect(pageSource).toContain('completeEmergency(id)');
    expect(pageSource).toContain('completeMutation.mutateAsync({ id: request.id })');
    expect(pageSource).toContain('retryPaymentWithDifferentMethod(requestId');
    expect(pageSource).toContain("if (currentUser.isAdmin() || currentUser.isOrgAdmin())");
    expect(pageSource).toContain('const canManage = currentUser.isAdmin() || currentUser.isOrgAdmin();');
    expect(pageSource).toContain('const canCompleteAsProvider = currentUser.isProvider() && actionState.canComplete;');
    expect(pageSource).toContain('if (!actionState.canDispatch)');
    expect(pageSource).toContain('This request is not ready to dispatch. Refreshing list...');
    expect(pageSource).toContain("toast.loading('Dispatching request...', { id: 'dispatch' });");
    expect(pageSource).toContain("toast.success('Request dispatched', { id: 'dispatch' });");
    expect(pageSource).toContain("toast.error(message || 'Failed to dispatch request', { id: 'dispatch' });");
    expect(pageSource).toContain('setCompleteModal({ open: true, request });');
    expect(pageSource).toContain('await completeMutation.mutateAsync({ id: request.id });');
    expect(pageSource).toContain("toast.success('Request completed');");
    expect(pageSource).toContain("toast.error('Failed to complete request');");
    expect(pageSource).toContain("toast.info('Cash settlement is not ready here yet'");
    expect(pageSource).toContain('The finance receiver pass still owns this action.');
    expect(pageSource).toContain('if (!actionState.canRetryPayment)');
    expect(pageSource).toContain('This request is not ready for payment retry. Refreshing list...');
    expect(pageSource).toContain('Missing request or patient identifier for retry');
    expect(pageSource).toContain("toast.loading('Preparing payment retry...', { id: 'retry-pay' });");
    expect(pageSource).toContain("toast.success('Payment retry created', { id: 'retry-pay' });");
    expect(pageSource).toContain("toast.error(error.message || 'Failed to retry payment', { id: 'retry-pay' });");
    expect(pageSource).toContain("import { ModalShell } from '../ui/ModalShell';");
    expect(pageSource).toContain('<ModalShell');
    expect(pageSource).toContain('title="Select payment method"');
    expect(pageSource).toContain('onClick={executeRetryPayment}');
    expect(pageSource).toContain('onClose={closeRetryModal}');
    expect(pageSource).toContain('cancelEmergencyRequest(id, reason)');
    expect(pageSource).toContain("cancelMutation.mutateAsync({ id: request.id, reason: 'cancelled_from_console' })");
    expect(pageSource).toContain('if (!getEmergencyActionState(request).canCancel)');
    expect(pageSource).toContain('currentUser.isAdmin() && actionState.canCancel');
    // Desktop bulk cancel: admin-gated multi-select routed through the SAME reused cancel
    // path (cancelMutation.mutateAsync in a loop), confirmed via the shared ConfirmationModal.
    // No parallel cancel service call is introduced.
    expect(pageSource).toContain("import { BulkActionBar } from '../common/BulkActionBar';");
    expect(pageSource).toContain('const [selectedIds, setSelectedIds] = useState([]);');
    expect(pageSource).toContain('const executeBulkCancel = useCallback');
    expect(pageSource).toContain('<BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>');
    expect(pageSource).toContain('selectable={currentUser.isAdmin()}');
    expect(pageSource).not.toContain(".from('emergency_requests').update");
    expect(pageSource).not.toContain(".from(TABLE_NAME).update");
    expect(pageSource).not.toContain('fixed inset-0');
    expect(pageSource).not.toContain('Close payment retry');

    expect(detailsModalSource).toContain("import { ModalShell } from '../ui/ModalShell';");
    expect(detailsModalSource).toContain('<ModalShell');
    expect(detailsModalSource).toContain('title={modalTitle}');
    expect(detailsModalSource).toContain('subtitle={modalSubtitle}');
    expect(detailsModalSource).toContain('const formatRequestTitle = (value) =>');
    expect(detailsModalSource).toContain('return `${label.charAt(0).toUpperCase()}${label.slice(1)} request`;');
    expect(detailsModalSource).toContain('onClose={() => onClose(false)}');
    expect(detailsModalSource).not.toContain('fixed inset-0');
    expect(detailsModalSource).not.toContain('role="dialog"');
    expect(detailsModalSource).not.toContain('aria-modal="true"');
    expect(detailsModalSource).not.toMatch(/\bborder(?:-| |")/);

    expect(requestModalSource).toContain("import { ModalShell } from '../ui/ModalShell';");
    expect(requestModalSource).toContain('<ModalShell');
    expect(requestModalSource).toContain('title={modalTitle}');
    expect(requestModalSource).toContain('subtitle={modalSubtitle}');
    expect(requestModalSource).toContain('const STATUS_SHORT_LABELS = {');
    expect(requestModalSource).toContain('sm:hidden');
    expect(requestModalSource).toContain('form={formId}');
    expect(requestModalSource).toContain("'New request'");
    expect(requestModalSource).toContain("'Create request'");
    expect(requestModalSource).not.toContain('fixed inset-0');
    expect(requestModalSource).not.toContain('role="dialog"');
    expect(requestModalSource).not.toContain('aria-modal="true"');
    expect(requestModalSource).not.toContain('Dispatch Unit');
    expect(requestModalSource).not.toContain('NEW EMERGENCY');
    expect(requestModalSource).not.toContain('Incident dispatch');
    expect(requestModalSource).not.toMatch(/\bborder(?:-| |")/);

    expect(responseServiceSource).toContain("supabase.rpc('console_dispatch_emergency'");
    expect(responseServiceSource).toContain("supabase.rpc('console_complete_emergency'");
    expect(emergencyServiceSource).toContain("supabase.rpc('console_cancel_emergency'");
    expect(emergencyServiceSource).toContain("supabase.rpc('retry_payment_with_different_method'");
    expect(actionSource).toContain('const canCancel = !isTerminal');
    expect(actionSource).toContain('canDispatch,');
    expect(actionSource).toContain('canComplete,');
    expect(actionSource).toContain('canRetryPayment,');
    expect(actionSource).toContain('canProcessCash: false');
    expect(actionSource).toContain('canCancel,');

    expect(mobileSource).not.toContain('Cancel request');
    // Mobile dispatch is restored (non-destructive): the detail sheet exposes a Dispatch
    // CTA wired to onDispatch -> the desktop handleDispatch mutation path. Destructive
    // shortcuts (cancel/delete) stay off mobile.
    expect(mobileSource).toContain("label: 'Dispatch'");
    expect(mobileSource).toContain('onDispatch');
    expect(mobileSource).not.toContain('Trash2');
  });

  it('keeps closed request modals from preloading requester profiles', () => {
    const modalSource = fs.readFileSync('src/components/modals/EmergencyRequestModal.jsx', 'utf8');

    expect(modalSource).toContain('if (!isOpen) return;');
    expect(modalSource.indexOf('if (!isOpen) return;'))
      .toBeLessThan(modalSource.indexOf('fetchUsers();'));
    expect(modalSource).toContain('[fetchUsers, isOpen]');
  });

  it('keeps legacy Requests density views free of decorative chrome tokens', () => {
    const listSource = fs.readFileSync('src/components/views/EmergencyRequestListView.jsx', 'utf8');
    const tableSource = fs.readFileSync('src/components/views/EmergencyRequestTableView.jsx', 'utf8');
    const chromeTokens = [
      'glass-card',
      'hover-glow',
      'hover-lift',
      'blur-xl',
      'blur-2xl',
      'backdrop-blur',
      'shadow-2xl',
      'shadow-xl',
      'shadow-premium',
      'rounded-2xl',
      'rounded-3xl',
      'rounded-full',
      'rounded-xl',
      'geo-sharp',
      'squircle-lg',
      'squircle-sm',
      'squircle-xs',
      'border-0',
      'border-white',
    ];

    for (const token of chromeTokens) {
      expect(listSource).not.toContain(token);
      expect(tableSource).not.toContain(token);
    }
  });

  it('reads Requests via useEmergencyQuery and writes via reused-RPC optimistic mutations', () => {
    const pageSource = fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
    const queryHookSource = fs.readFileSync('src/hooks/useEmergencyQuery.js', 'utf8');
    const mutationsHookSource = fs.readFileSync('src/hooks/useEmergencyMutations.js', 'utf8');
    const pageDataSource = fs.readFileSync('src/contexts/PageDataContext.jsx', 'utf8');

    // Read path: a single ['emergency', filter] React Query store, no parallel list state.
    expect(pageSource).toContain("import { useEmergencyQuery } from '../../hooks/useEmergencyQuery';");
    expect(pageSource).toContain('useEmergencyQuery(queryFilter, { enabled: authReady })');
    expect(pageSource).not.toContain('const [requests, setRequests]');
    expect(pageSource).not.toContain('getEmergencyRequestsPage({');
    expect(queryHookSource).toContain("queryKey: ['emergency', filter]");
    expect(queryHookSource).toContain('getEmergencyRequestsPage(filter)');
    expect(queryHookSource).toContain("queryClient.invalidateQueries({ queryKey: ['emergency'] })");

    // Write path: mutations wrap the EXISTING reused RPC service fns; onMutate
    // snapshot -> optimistic status -> onError rollback -> onSettled invalidate(['emergency']).
    expect(pageSource).toContain("import { useEmergencyMutations, applyOptimisticStatus } from '../../hooks/useEmergencyMutations';");
    expect(pageSource).toContain('dispatchMutation.mutateAsync(');
    expect(pageSource).toContain('completeMutation.mutateAsync(');
    expect(pageSource).toContain('cancelMutation.mutateAsync(');
    expect(mutationsHookSource).toContain("export const EMERGENCY_KEY_ROOT = ['emergency'];");
    expect(mutationsHookSource).toContain('export function applyOptimisticStatus(');
    expect(mutationsHookSource).toContain('queryClient.cancelQueries({ queryKey: EMERGENCY_KEY_ROOT })');
    expect(mutationsHookSource).toContain('queryClient.setQueryData(context.listKey, context.previous)');

    // Gating: illegal transitions stay non-renderable via the L4 action state
    // (getEmergencyActionState -> canTransition).
    expect(pageSource).toContain('const actionState = getEmergencyActionState(request);');
    expect(pageSource).toContain('if (!actionState.canDispatch)');
    expect(pageSource).toContain('if (!actionState.canRetryPayment)');

    // PageDataContext emergency realtime now invalidates the cache; dashboards keep
    // their slice hydration via fetchEmergencyData on mount.
    expect(pageDataSource).toContain("queryClient.invalidateQueries({ queryKey: ['emergency'] })");
    expect(pageDataSource).toContain('const fetchEmergencyData = useCallback(');
  });
});
