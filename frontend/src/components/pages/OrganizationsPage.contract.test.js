import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  getPageDataStartupDomainsForRole,
  routeOwnsStartupDomains,
} from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
const readBundle = (paths) => paths.map(read).join('\n');
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowBaseline = (path) => execFileSync(
  'git',
  ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`],
  { encoding: 'utf8' }
);

const ORGANIZATIONS_PAGE_MODULES = [
  'src/components/pages/OrganizationsPage.jsx',
  'src/components/pages/organizations/OrganizationDetailRail.jsx',
  'src/components/pages/organizations/OrganizationsDesktopWorkspace.jsx',
  'src/components/pages/organizations/OrganizationsPageView.jsx',
  'src/components/pages/organizations/organizationPageModel.js',
  'src/components/pages/organizations/organizationPresentation.js',
  'src/components/pages/organizations/useOrganizationsPageChrome.js',
  'src/components/pages/organizations/useOrganizationsPageController.js',
];

const MOBILE_ORGANIZATIONS_MODULES = [
  'src/components/mobile/MobileOrganizations.jsx',
  'src/components/mobile/organizations/MobileOrganizationDetailSheet.jsx',
  'src/components/mobile/organizations/MobileOrganizationRow.jsx',
  'src/components/mobile/organizations/MobileOrganizationsAtlasLayer.jsx',
  'src/components/mobile/organizations/mobileOrganizationsModel.js',
  'src/components/mobile/organizations/useMobileOrganizationsController.js',
];

describe('Organizations Page 15 revamp contract', () => {
  it('preserves the baseline perk inventory while retiring old active renderers and commands', () => {
    const oldPage = gitShowBaseline('frontend/src/components/pages/OrganizationsPage.jsx');
    const oldMobile = gitShowBaseline('frontend/src/components/mobile/MobileOrganizations.jsx');
    const oldPanel = gitShowBaseline('frontend/src/components/context/OrganizationsPanel.jsx');
    const page = readBundle(ORGANIZATIONS_PAGE_MODULES);
    const mobile = readBundle(MOBILE_ORGANIZATIONS_MODULES);
    const constitution = read('docs/audit/ORGANIZATIONS_REVAMP_CONSTITUTION_2026-07-11.md');

    expect(oldPage).toContain("useViewMode('organizations', 'table')");
    expect(oldPage).toContain('usePagination(12)');
    expect(oldPage).toContain('const data = await getOrganizations();');
    expect(oldPage).toContain('Board New Org');
    expect(oldPage).toContain('Network Float');
    expect(oldPage).toContain('Avg_Fee');
    expect(oldPage).toContain('<OrganizationTableView');
    expect(oldPage).toContain('<OrganizationListView');
    expect(oldPage).toContain('await saveOrganization(selectedOrg);');
    expect(oldPage).toContain('await deleteOrganization(org.id);');
    expect(oldPage).toContain('await Promise.all(selectedIds.map((id) => deleteOrganization(id)));');

    expect(oldMobile).toContain('MobileFeaturedMetric');
    expect(oldMobile).toContain('MobileSecondaryMetricRail');
    expect(oldMobile).toContain("delta: 'LIVE'");
    expect(oldMobile).toContain('Network Dynamics');
    expect(oldMobile).toContain('Revenue share');
    expect(oldMobile).toContain('onClick={() => onEdit(org)}');
    expect(oldMobile).toContain('onClick={() => onDelete(org)}');
    expect(oldPanel).toContain('Network Hub');
    expect(oldPanel).toContain('Growth');
    expect(oldPanel).toContain('Pulse');

    expect(page).not.toContain('useViewMode');
    expect(page).not.toContain('<OrganizationTableView');
    expect(page).not.toContain('<OrganizationListView');
    expect(page).not.toContain('saveOrganization');
    expect(page).not.toContain('deleteOrganization');
    expect(page).not.toContain('Board New Org');
    expect(page).not.toContain('Onboard New Partner');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain("delta: 'LIVE'");
    expect(mobile).not.toContain('Revenue share');
    expect(mobile).not.toContain('onEdit');
    expect(mobile).not.toContain('onDelete');

    expect(constitution).toContain('## Baseline changelog and perk inventory');
    expect(constitution).toContain('## Authority register');
    expect(constitution).toContain('ORG-8 - placeholder poisoning / page replacement');
  });

  it('uses one bounded, exact read projection and keeps every organization write fail-closed', () => {
    const appRoutes = read('src/app/AppRoutes.jsx');
    const routeMetadata = read('src/app/appRouteMetadata.js');
    const routes = read('src/config/routes.jsx');
    const page = readBundle(ORGANIZATIONS_PAGE_MODULES);
    const service = read('src/services/organizationsService.js');
    const hook = read('src/hooks/useOrganizationsQuery.js');
    const pageDataAccess = read('src/config/pageDataAccess.js');

    expect(appRoutes).toContain("organizations: lazyNamedPage(() => import('../components/pages/OrganizationsPage'), 'OrganizationsPage')");
    expect(appRoutes).toContain('APP_ROUTE_METADATA.map((route) => (');
    expect(routeMetadata).toContain("{ id: 'organizations', path: '/organizations', minRole: 'admin' }");
    expect(routes).toContain("'/organizations': {");
    expect(routes).toContain("resource: 'organizations'");
    expect(routes).toContain("title: 'Organizations'");
    expect(routeOwnsStartupDomains('/organizations')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/organizations')).toEqual([]);
    expect(pageDataAccess).toContain("const isTodayPath = (pathname = '') => pathname === '' || pathname === '/';");
    expect(pageDataAccess).toContain('return !isTodayPath(pathname);');

    expect(page).toContain('useOrganizationsQuery');
    expect(page).toContain('kpiFilter,');
    expect(page).toContain('isPlaceholderData,');
    expect(page).toContain('const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE');
    expect(page).toContain('handleOrganizationCommandUnavailable');
    expect(page).toContain("const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE = 'Organization changes are not available from this page.';");
    expect(page).toContain('role="status"');
    expect(page).not.toContain('aria-label="Add organization unavailable"');
    expect(page).toContain('<BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>');
    expect(page).toContain('title="Bulk organization changes are not available"');
    expect(page).toContain('data-state="unavailable"');
    expect(page).not.toContain('handleBulkDelete');

    expect(service).toContain('const ORG_PAYOUT_RESOLUTION_ROW_LIMIT = 5000;');
    expect(service).toContain('async function getOrganizationPayoutBuckets');
    expect(service).toContain('function applyOrganizationPayoutFilter');
    expect(service).toContain("query = applyOrganizationPayoutFilter(query, filter.kpiFilter, payoutBuckets);");
    expect(service).toContain('payoutGap: Math.max(total - funded, 0)');
    expect(service).toContain('backend organization payout projection required.');
    expect(service).toContain('throw error;');
    expect(hook).toContain("queryKey: ['organizations', filter]");
    expect(hook).toContain('placeholderData: (previous) => previous');
    expect(hook).toContain('isPlaceholderData: query.isPlaceholderData');

    expect(page).not.toContain("from '../../services/organizationsService'");
    expect(page).not.toContain('await saveOrganization');
    expect(page).not.toContain('await deleteOrganization');
  });

  it('locks desktop, mobile, context, modal, navbar, and FAB parity to the canon', () => {
    const page = readBundle(ORGANIZATIONS_PAGE_MODULES);
    const mobile = readBundle(MOBILE_ORGANIZATIONS_MODULES);
    const panel = read('src/components/context/OrganizationsPanel.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const dock = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');
    const mobileGrammar = read('scripts/check-mobile-grammar.js');
    const modal = read('src/components/modals/OrganizationModal.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<DetailRailShell');
    expect(page).toContain('useRowSelection(orgRows)');
    expect(page).toContain('const ORGANIZATION_GRID_COLS_SELECT');
    expect(page).toContain("checked={someSelected ? 'indeterminate' : allSelected}");
    expect(page).toContain('onSelectClick?.(event)');
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('isFetching={isFetching}');
    expect(page).toContain('hasFilter ?');
    expect(page).toContain("usePageHeader('Organizations', null, null, filterButtonComponent)");
    expect(page).toContain('selectionEnabled={selectable}');
    expect(page).toContain('selectable={selectable}');
    expect((page.match(/<SortableColumnHeader/g) || [])).toHaveLength(1);
    expect(page).not.toContain('Legacy page contracts still inspect');

    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<SkeletonGroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('useRowSelection(displayOrganizations)');
    expect(mobile).toContain('selectable={selectionEnabled}');
    expect(mobile).toContain('selectionMode={selectionMode}');
    expect(mobile).toContain('onLongPress={(item) => handleToggleSelect(item.id, true)}');
    expect(mobile).toContain('onSelectAll={() => handleSelectAll(true)}');
    expect(mobile).toContain('onClear={clearSelection}');
    expect(mobile).toContain('<UpdatingPillRow');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).toContain('const accumulatorRef = useRef');
    expect(mobile).toContain('if (!isPlaceholderData)');
    expect(mobile).toContain('if (page === 1) reset();');
    expect(mobile).toContain('Bulk organization changes are not available');
    expect(mobile).toContain("label: 'Organization ID'");
    expect(mobile).toContain('navigator.clipboard?.writeText');

    expect(contextPanel).toContain('<OrganizationsPanel orgContext={organizationsRouteContext} />');
    expect(panel).toContain('export const OrganizationsPanel = ({ orgContext }) =>');
    expect(panel).toContain('rounded-card');
    expect(panel).toContain('rounded-inner');
    expect(panel).toContain('rounded-icon');
    expect(panel).not.toMatch(/\brounded-(?:xl|2xl|3xl|full)\b|\bshadow-premium\b/);

    expect(dock).toContain("pathname.startsWith('/organizations') && canReach('/organizations')");
    expect(dock).toContain("label: 'Organization stats'");
    expect(dock).toContain("action: dispatchWindowEvent('openAnalyticsModal')");
    expect(mobileGrammar).toContain("'MobileOrganizations.jsx': { tier: 'list', selection: 'required' }");
    expect(mobileGrammar).not.toContain("'/organizations': 'Page 15 gate-blocked");

    expect(modal).toContain('const ReadOnlyField');
    expect(modal).toContain('Registry identity and payout-readiness evidence');
    expect(modal).not.toContain('disabled={isView}');
    expect(modal).toContain('animate-spin');
    expect(modal).not.toContain('saveOrganization');
    expect(modal).not.toContain('deleteOrganization');

    [
      'src/components/pages/OrganizationsPage.jsx',
      'src/components/mobile/MobileOrganizations.jsx',
      'src/components/context/OrganizationsPanel.jsx',
      'src/components/modals/OrganizationModal.jsx',
    ].forEach((file) => expect(hardgate).toContain(file));
  });

  // ADOPT-02: the rail Type line reads the real organizations.organization_type column
  // (types/database.ts); the old row.type / row.org_type reads were dead and rendered a
  // fabricated 'Not set' on every row. Honest null: absent value reads Unknown.
  it('binds the rail Type line to the real organization_type column with honest nulls', () => {
    const rail = read('src/components/pages/organizations/OrganizationDetailRail.jsx');
    const model = read('src/components/pages/organizations/organizationPageModel.js');

    expect(rail).toContain('const typeValue = formatOrganizationType(organization.organization_type);');
    expect(rail).toContain('<DetailLine icon={Globe} label="Type" value={typeValue} />');
    expect(rail).not.toContain('organization.org_type');
    expect(rail).not.toMatch(/organization\.type\b/);

    expect(model).toContain('export const formatOrganizationType');
    expect(model).toContain("if (!text) return 'Unknown';");
  });

  // ADOPT-26: organizations.verification_status is a real, live gate (NOT NULL enum,
  // migration 20260219000200: legacy rows backfilled 'verified', self-service inserts
  // 'pending'; the dispatch RPC requires verification_status = 'verified'). The desktop
  // row and rail status bind to it via the shared approvals vocabulary and drop the
  // degenerate is_active pill. Honest null renders Unknown.
  it('binds the desktop row and rail status to the live verification_status gate', () => {
    const rail = read('src/components/pages/organizations/OrganizationDetailRail.jsx');
    const workspace = read('src/components/pages/organizations/OrganizationsDesktopWorkspace.jsx');
    const model = read('src/components/pages/organizations/organizationPageModel.js');

    expect(model).toContain('export const getOrganizationVerificationMeta');
    expect(model).toContain("getApprovalStatusKey(organization, 'organizations')");
    expect(model).toContain("label: 'Unknown',");

    expect(rail).toContain('const verificationMeta = getOrganizationVerificationMeta(organization);');
    expect(rail).toContain('{verificationMeta.label}');
    expect(rail).toContain('<DetailLine icon={ShieldCheck} label="Verification" value={verificationMeta.label} />');
    expect(rail).toContain('formatOrganizationDate(organization.verified_at)');
    expect(rail).toContain('{organization.rejection_reason && (');
    expect(rail).toContain('<DetailLine icon={AlertCircle} label="Rejection reason" value={organization.rejection_reason} />');
    expect(rail).not.toContain('organization.is_active');

    expect(workspace).toContain('const verificationMeta = getOrganizationVerificationMeta(organization);');
    expect(workspace).toContain('<StatusPill label={verificationMeta.label} className={verificationMeta.tone} compact />');
    expect(workspace).toContain('<span>Verification</span>');
    expect(workspace).not.toContain('organization.is_active');
  });

  // ADOPT-27: the wallet join used to drop everything but balance. The read now carries
  // organization_wallets.currency and updated_at, the amount renders in the row's own
  // currency (null currency keeps the legacy presentation), and the rail shows wallet
  // freshness only when a wallet row exists.
  it('carries wallet currency and freshness from the read through to the rendered rail and row', () => {
    const service = read('src/services/organizationsService.js');
    const rail = read('src/components/pages/organizations/OrganizationDetailRail.jsx');
    const workspace = read('src/components/pages/organizations/OrganizationsDesktopWorkspace.jsx');

    expect(service).toContain(".select('organization_id, balance, currency, updated_at', { count: 'exact' })");
    expect(service).toContain('wallet_currency: walletMeta?.currency ?? null,');
    expect(service).toContain('wallet_updated_at: walletMeta?.updated_at ?? null,');

    expect(rail).toContain('formatOrganizationWallet(organization.wallet_balance, organization.wallet_currency)');
    expect(rail).toContain('{organization.wallet_updated_at && (');
    expect(rail).toContain('<DetailLine icon={History} label="Wallet updated" value={formatOrganizationDate(organization.wallet_updated_at)} />');
    expect(workspace).toContain('formatOrganizationWallet(organization.wallet_balance, organization.wallet_currency)');
  });
});
