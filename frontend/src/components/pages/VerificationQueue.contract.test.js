import fs from 'fs';
import { getPageDataStartupDomainsForRole } from '../../config/pageDataAccess';

describe('VerificationQueue Approvals contract', () => {
  const pageSource = () => fs.readFileSync('src/components/pages/VerificationQueue.jsx', 'utf8');
  const mobileSource = () => fs.readFileSync('src/components/mobile/MobileVerification.jsx', 'utf8');
  const listSource = () => fs.readFileSync('src/components/views/VerificationQueueListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/VerificationQueueTableView.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/VerificationModal.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/context/VerificationPanel.jsx', 'utf8');
  const islandSource = () => fs.readFileSync('src/components/common/IslandNavigation.jsx', 'utf8');
  const checkboxSource = () => fs.readFileSync('src/components/ui/checkbox.jsx', 'utf8');
  const providerServiceSource = () => fs.readFileSync('src/services/verificationService.js', 'utf8');
  const facilityServiceSource = () => fs.readFileSync('src/services/orgVerificationService.js', 'utf8');

  it('keeps Approvals route-owned so PageData does not duplicate route reads', () => {
    expect(getPageDataStartupDomainsForRole('org_admin', '/verification')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/verification')).toEqual([]);
  });

  it('splits review access from admin-only approval commands', () => {
    const source = pageSource();

    expect(source).toContain('const canApprove = isAdmin();');
    expect(source).toContain('const canReview = canApprove || isOrgAdmin();');
    expect(source).toContain('const isTransientVerificationRefreshError = (error) =>');
    expect(source).toContain('providerRequestSeqRef');
    expect(source).toContain('facilityRequestSeqRef');
    expect(source).toContain('quiet: true');
    expect(source).toContain('aria-label="Filter approvals"');
    expect(source).toContain("import { SEOHead } from '../common/SEOHead';");
    expect(source).toContain('<SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />');
    expect(source).not.toContain('aria-label="Filter verification queue"');
    expect(source).toContain('onVerify={canApprove ? handleVerify : null}');
    expect(source).toContain('canApprove={canApprove}');
    expect(source).toContain('Admin approval required');
    expect(source).toContain("canApprove ? 'All Clear' : 'No visible provider applications'");
    expect(source).toContain('Provider applications are not visible for this role.');
    expect(source).toContain('<ViewToggle value={viewMode} onChange={setViewMode} tone="review" />');
    expect(source).not.toContain('canVerifyProviders');
  });

  it('removes inert destructive controls and gates selection by command capability', () => {
    const source = pageSource();
    const list = listSource();
    const table = tableSource();
    const fabSource = fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
    const bottomBarSource = fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');

    expect(source).not.toContain('onDelete={() => { }}');
    expect(list).not.toContain('onDelete');
    expect(list).not.toContain('Delete');
    expect(table).not.toContain('onDelete');
    expect(table).not.toContain('Delete');
    expect(source).toContain('onSelect={canApprove ? handleSelect : null}');
    expect(source).toContain('onSelectAll={canApprove ? handleSelectAll : null}');
    expect(table).toContain("const canSelect = typeof onSelect === 'function' && typeof onSelectAll === 'function';");
    expect(table).toContain('{canSelect && (');
    expect(fabSource).toContain("location.pathname.startsWith('/verification')");
    expect(fabSource.indexOf('if (isMobile || isContextPanelOpen || hideFab) return null;'))
      .toBeLessThan(fabSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));
    expect(bottomBarSource).toContain("location.pathname.startsWith('/verification')");
    expect(bottomBarSource.indexOf('{!hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />}'))
      .toBeLessThan(bottomBarSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));
  });

  it('keeps mobile copy and actions aligned with desktop authority', () => {
    const source = mobileSource();

    expect(source).toContain('canApprove = false');
    expect(source).toContain('pending && canApprove && onVerifyProvider');
    expect(source).toContain('pending && canApprove && onVerifyOrganization');
    expect(source).toContain('ADMIN REVIEW');
    expect(source).toContain("canApprove ? 'No verification items found' : 'No visible approval items'");
    expect(source).toContain('Approval items are not visible for this role.');
    expect(source).toContain('Review Summary');
    expect(source).toContain('useStableList(sourceItems, loading)');
    expect(source).not.toContain('filteredItems');
    expect(source).not.toContain('let result = [...items]');
    expect(source).not.toContain('result.filter');
    expect(source).not.toContain('chartData:');
    expect(source).not.toContain('Trust Dynamics');
    expect(source).not.toContain("'LIVE'");
    expect(source).not.toContain('Organization Queue');
    expect(source).not.toContain('Verification Queue');
  });

  it('keeps shared context panel copy aligned with Approvals naming', () => {
    const panel = contextPanelSource();
    const hardgate = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

    expect(hardgate).toContain('src/components/context/VerificationPanel.jsx');
    expect(panel).toContain('Approvals overview');
    expect(panel).toContain('All approval items');
    expect(panel).toContain('Approval rate');
    expect(panel).toContain('Approved share');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain("const [panelNotice, setPanelNotice] = React.useState('Approval actions ready.');");
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('data-state="unavailable"');
    expect(panel).toContain('Export is unavailable until approval report authority is proved.');
    expect(panel).toContain('Filter the list or open a pending row to review details.');
    expect(panel).toContain('title="Filter approvals"');
    expect(panel).toContain('title="View approval trends"');
    expect(panel).not.toContain('Verification Overview');
    expect(panel).not.toContain('All verification requests');
    expect(panel).not.toContain('Success Rate');
    expect(panel).not.toContain('Filter Queue');
    expect(panel).not.toContain('Quick Actions');
    expect(panel).not.toContain('Real-time feed coming soon');
    expect(panel).not.toContain('Critical Alerts');
    expect(panel).not.toContain('High Backlog');
    expect(panel).not.toContain('border');
    expect(panel).not.toContain('ring');
    expect(panel).not.toContain('outline');
    expect(panel).not.toContain('divide');
  });

  it('keeps the provider detail modal inside the Approvals visual and copy gate', () => {
    const page = pageSource();
    const list = listSource();
    const table = tableSource();
    const modal = modalSource();
    const island = islandSource();
    const checkbox = checkboxSource();
    const hardgate = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

    expect(hardgate).toContain('src/components/views/VerificationQueueListView.jsx');
    expect(list).toContain('data-testid="approval-provider-list-row"');
    expect(list).toContain("case 'approved':");
    expect(list).not.toContain('Card');
    expect(list).not.toContain('bg-success');
    expect(list).not.toContain('text-success');
    expect(list).not.toContain('bg-warning');
    expect(list).not.toContain('text-warning');
    expect(table).toContain('data-testid="approval-provider-table"');
    expect(page).not.toContain('getAvatarUrl');
    expect(list).not.toContain('getAvatarUrl');
    expect(table).not.toContain('getAvatarUrl');
    expect(modal).not.toContain('getAvatarUrl');
    expect(page).toContain('provider.avatar_url || provider.image_uri || undefined');
    expect(page).toContain('data-[state=active]:bg-amber-400/15');
    expect(page).toContain('const quietTabPanelStyle = {');
    expect(page).toContain("'--tw-ring-shadow': '0 0 #0000'");
    expect(page).toContain('style={quietTabPanelStyle}');
    expect(page).toContain("style={{ outline: 'none' }}");
    expect(page).toContain('focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_24px_60px_rgba(0,0,0,0.26)]');
    expect(page).not.toContain('data-[state=active]:bg-primary');
    expect(page).not.toContain('hover-glow-primary');
    expect(island).toContain('hsl(var(--spark))');
    expect(island).toContain('bg-[hsl(var(--spark)/0.75)]');
    expect(island).not.toContain("profile?.role === 'admin' ? 'bg-red-500");
    expect(checkbox).toContain('data-[state=checked]:bg-[hsl(var(--spark)/0.88)]');
    expect(checkbox).not.toContain('border-primary');
    expect(checkbox).not.toContain('data-[state=checked]:bg-primary');
    expect(hardgate).toContain('src/components/context/VerificationPanel.jsx');
    expect(hardgate).toContain('src/components/modals/VerificationModal.jsx');
    expect(modal).toContain('Review note');
    expect(modal).toContain('Only admins can approve or reject.');
    expect(modal).not.toContain('Security Notice');
    expect(modal).not.toContain('audited');
    expect(modal).not.toContain('bg-success');
    expect(modal).not.toContain('text-success');
    expect(modal).not.toContain('bg-warning');
    expect(modal).not.toContain('text-warning');
  });

  it('keeps service authority and facility status vocabulary explicit', () => {
    const providerService = providerServiceSource();
    const facilityService = facilityServiceSource();

    expect(providerService).toContain("if (!['admin', 'org_admin'].includes(role))");
    expect(providerService).toContain("return role === 'admin';");
    expect(providerService).toContain('display_id: p.display_id || null');
    expect(providerService).not.toContain('getDisplayIds(profileIds');
    expect(providerService).toContain('async function getProviderVerificationStats()');
    expect(providerService).toContain('const PROVIDER_STATS_CACHE_MS = 30000');
    expect(providerService).toContain('clearProviderVerificationStatsCache();');
    // Estimated (planner) count, not exact: three parallel HEAD counts on a large
    // profiles table were timing out into 503s. Still a HEAD count, never a full-row read.
    expect(providerService).toContain("select('id', { count: 'estimated', head: true })");
    expect(providerService).not.toContain(".select('role, bvn_verified')");
    expect(providerService).not.toContain("'sponsor'].includes(role)");
    expect(facilityService).toContain("const normalizedStatus = status === 'approved' ? 'verified' : status;");
    expect(facilityService).toContain('getDisplayIds(orgIds, { quiet: filters.quiet })');
    expect(facilityService).toContain('facility approvals');
    expect(facilityService).not.toContain('Verification Queue ->');
  });
});
