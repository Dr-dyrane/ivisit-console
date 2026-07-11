import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  getPageDataStartupDomainsForRole,
  routeOwnsStartupDomains,
} from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowBaseline = (path) => execFileSync(
  'git',
  ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`],
  { encoding: 'utf8' }
);

describe('Organizations Page 15 revamp contract', () => {
  it('preserves the baseline perk inventory while retiring old active renderers and commands', () => {
    const oldPage = gitShowBaseline('frontend/src/components/pages/OrganizationsPage.jsx');
    const oldMobile = gitShowBaseline('frontend/src/components/mobile/MobileOrganizations.jsx');
    const oldPanel = gitShowBaseline('frontend/src/components/context/OrganizationsPanel.jsx');
    const page = read('src/components/pages/OrganizationsPage.jsx');
    const mobile = read('src/components/mobile/MobileOrganizations.jsx');
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
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const page = read('src/components/pages/OrganizationsPage.jsx');
    const service = read('src/services/organizationsService.js');
    const hook = read('src/hooks/useOrganizationsQuery.js');
    const pageDataAccess = read('src/config/pageDataAccess.js');

    expect(app).toContain('<Route path="/organizations" element={<ProtectedRoute minRole="admin"><OrganizationsPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/organizations': {");
    expect(routes).toContain("resource: 'organizations'");
    expect(routes).toContain("title: 'Organizations'");
    expect(routeOwnsStartupDomains('/organizations')).toBe(true);
    expect(getPageDataStartupDomainsForRole('admin', '/organizations')).toEqual([]);
    expect(pageDataAccess).toContain("pathname === '/organizations'");

    expect(page).toContain("import { useOrganizationsQuery } from '../../hooks/useOrganizationsQuery';");
    expect(page).toContain('kpiFilter,');
    expect(page).toContain('isPlaceholderData,');
    expect(page).toContain('const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE');
    expect(page).toContain('handleOrganizationCommandUnavailable');
    expect(page).toContain('aria-label="Add organization unavailable"');
    expect(page).toContain('aria-label="Delete organizations unavailable"');
    expect(page).toContain('data-state="unavailable"');
    expect(page).toContain('role="status"');

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
    const page = read('src/components/pages/OrganizationsPage.jsx');
    const mobile = read('src/components/mobile/MobileOrganizations.jsx');
    const panel = read('src/components/context/OrganizationsPanel.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const dock = read('src/components/navigation/DynamicBottomBar.jsx');
    const mobileGrammar = read('scripts/check-mobile-grammar.js');
    const modal = read('src/components/modals/OrganizationModal.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('<DetailRailShell');
    expect(page).toContain('useRowSelection(orgRows)');
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('isFetching={isFetching}');
    expect(page).toContain('hasFilter ?');
    expect(page).toContain("usePageHeader('Organizations', headerActions, null, filterButtonComponent)");
    expect(page).toContain('Add organization');
    expect((page.match(/<SortableColumnHeader/g) || [])).toHaveLength(1);

    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<MobileKPIStrip');
    expect(mobile).toContain('<SearchRow');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<SkeletonGroupPanel');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).toContain('<UpdatingPillRow');
    expect(mobile).toContain('animatePageLoad={false}');
    expect(mobile).toContain('const accumulatorRef = useRef');
    expect(mobile).toContain('if (!isPlaceholderData)');
    expect(mobile).toContain('if (page === 1) reset();');
    expect(mobile).toContain('Organization deletion is locked until organization authority is verified');
    expect(mobile).toContain("label: 'Organization ID'");
    expect(mobile).toContain('navigator.clipboard?.writeText');

    expect(contextPanel).toContain('<OrganizationsPanel orgContext={organizationsRouteContext} />');
    expect(panel).toContain('export const OrganizationsPanel = ({ orgContext }) =>');
    expect(panel).toContain('rounded-card');
    expect(panel).toContain('rounded-inner');
    expect(panel).toContain('rounded-icon');
    expect(panel).not.toMatch(/\brounded-(?:xl|2xl|3xl|full)\b|\bshadow-premium\b/);

    expect(dock).toContain("pathname.startsWith('/organizations') && canReachRoute(userRole, '/organizations')");
    expect(dock).toContain("label: 'Add organization'");
    expect(dock).toContain("new CustomEvent('openOrganizationModal')");
    expect(mobileGrammar).toContain("'MobileOrganizations.jsx': { tier: 'list' }");
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
});
