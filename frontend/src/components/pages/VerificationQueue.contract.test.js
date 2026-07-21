import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { getPageDataStartupDomainsForRole } from '../../config/pageDataAccess';
import { readIslandNavigationImplementation } from '../../test/sourceEstates';
import { canAccessContextPanel } from '../navigation/context-panel/contextPanelAccess';

// Approvals DESKTOP contract. The mobile surface (MobileVerification.jsx) has its
// OWN contract (MobileVerification.contract.test.js) so the two lanes gate
// INDEPENDENTLY -- a mobile refactor can no longer red the desktop page's test on a
// stale byte-string (that cross-lane breakage is the reason the split happened,
// 2026-07-10). This file reads ONLY the desktop page + shared surfaces.
describe('VerificationQueue Approvals desktop contract', () => {
  const readModuleEstate = (entry, directory) => [
    fs.readFileSync(entry, 'utf8'),
    ...fs.readdirSync(directory)
      .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.endsWith('.test.js'))
      .sort()
      .map((name) => fs.readFileSync(`${directory}/${name}`, 'utf8')),
  ].join('\n');
  const pageSource = () => readModuleEstate(
    'src/components/pages/VerificationQueue.jsx',
    'src/components/pages/verification',
  );
  const appRouteSource = () => [
    fs.readFileSync('src/app/AppRoutes.jsx', 'utf8'),
    fs.readFileSync('src/app/appRouteMetadata.js', 'utf8'),
  ].join('\n');
  const modalSource = () => fs.readFileSync('src/components/modals/VerificationModal.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/context/VerificationPanel.jsx', 'utf8');
  const colorSource = () => fs.readFileSync('src/constants/verificationStatus.js', 'utf8');
  const islandSource = () => readIslandNavigationImplementation();
  const checkboxSource = () => fs.readFileSync('src/components/ui/checkbox.jsx', 'utf8');
  const providerServiceSource = () => fs.readFileSync('src/services/verificationService.js', 'utf8');
  const facilityServiceSource = () => fs.readFileSync('src/services/orgVerificationService.js', 'utf8');

  it('keeps Approvals route-owned so PageData does not duplicate route reads', () => {
    expect(getPageDataStartupDomainsForRole('org_admin', '/verification')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/verification')).toEqual([]);
    expect(appRouteSource()).toContain("verification: lazyNamedPage(() => import('../components/pages/VerificationQueue'), 'VerificationQueue')");
    expect(appRouteSource()).toContain("{ id: 'verification', path: '/verification', minRole: 'org_admin' }");
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
    // PIN UPDATE (ADOPT-20, strictly more truthful): the old pin
    // `onVerify={canApprove ? handleVerify : null}` asserted the modal ALWAYS got
    // the provider receiver -- which was the defect (facility rows' Approve threw
    // 'Provider not found'). The modal now takes the lane-aware handler; the
    // admin gate (canApprove ? ... : null) survives unchanged.
    expect(source).toContain('onVerify={canApprove ? modalVerifyHandler : null}');
    expect(source).toContain('canApprove={canApprove}');
    expect(source).toContain('Admin approval required');
    expect(source).toContain('Access restricted');
    expect(source).toContain('This role cannot open Approvals.');
    expect(source).not.toContain('canVerifyProviders');
  });

  it('uses exact server counts for facility queue statistics', () => {
    const source = facilityServiceSource();

    expect(source).toContain("select('id', { count: 'exact', head: true })");
    expect(source).toContain("readFacilityVerificationStats()");
    expect(source).not.toContain(".select('verification_status');");
  });

  it('is composed on the console design system, not the retired ViewToggle/bento shell', () => {
    const source = pageSource();
    // COMPOSITION: the dual-queue page is ONE canonical render on the shared DS.
    expect(source).toContain("from '../console/WorkspaceStage'");
    expect(source).toContain("import { SignalPanel } from '../../console/SignalPanel';");
    expect(source).toContain("import { KpiStrip } from '../../console/KpiStrip';");
    expect(source).toContain("from '../console/ActivitySheet'");
    expect(source).toContain('<WorkspaceStage');
    expect(source).toContain('<SignalPanel');
    expect(source).toContain('<KpiStrip');
    expect(source).toContain('<ActivitySheet');
    expect(source).toContain('usePageShell({ bleed: true, hideFab: true });');
    // Neutral queue toggle -- its own control, NOT amber tabs / NOT a KPI chip.
    expect(source).toContain('<ApprovalQueueToggle');
    expect(source).toContain('data-testid="approval-tab-providers"');
    expect(source).toContain('data-testid="approval-tab-facilities"');
    // The retired grid/list/table shell is GONE.
    expect(source).not.toContain('ViewToggle');
    expect(source).not.toContain('VerificationQueueListView');
    expect(source).not.toContain('VerificationQueueTableView');
    expect(source).not.toContain('quietTabPanelStyle');
    expect(source).not.toContain('data-[state=active]:bg-amber-400/15');
    expect(source).not.toContain('LayoutGroup');
    // Single-shared-list discipline: exactly ONE sortable (Time) header for BOTH lanes.
    expect((source.match(/<SortableColumnHeader/g) || []).length).toBe(1);
    // No re-introduced entrance stagger; no colored bleeding shadow glow.
    expect(source).not.toContain('initial={{');
    expect({ coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(source) }).toEqual({ coloredRgb: false });
    expect({ rgba: /shadow-\[[^\]]*rgba\(/.test(source) }).toEqual({ rgba: false });
    expect({ hslShadow: /shadow-\[[^\]]*hsl\(/.test(source) }).toEqual({ hslShadow: false });
  });

  it('routes ALL status color through the single verificationStatus source', () => {
    const source = pageSource();
    const color = colorSource();
    // The page no longer carries a bespoke status->class switch; it composes the source.
    expect(source).toContain("from '../../../constants/verificationStatus'");
    expect(source).toContain('getApprovalStatusKey');
    expect(source).toContain('getApprovalToneClass(');
    expect(source).toContain('getApprovalLabel(');
    expect(source).toContain('getApprovalIcon(');
    expect(source).not.toContain('const getStatusBadge');
    // The source normalizes BOTH storage shapes into ONE vocabulary: providers are
    // BINARY (bvn_verified, no rejected); facilities are a real tri-state enum.
    expect(color).toContain("return item?.bvn_verified ? 'approved' : 'pending';");
    expect(color).toContain("if (s === 'rejected' || s === 'suspended') return 'rejected';");
    // Literal palette only (the theme info/success/warning tokens all render red).
    expect(color).toContain('amber-500/10');
    expect(color).toContain('emerald-500/10');
    expect(color).not.toContain('bg-success');
    expect(color).not.toContain('bg-warning');
  });

  it('surfaces adopted schema truth on the detail rail: identity, facility claims, provenance', () => {
    const source = pageSource();
    // ADOPT-07: the provider lane binds the fetched profile identity columns to
    // the rail render -- full_name was searchable but invisible before this pass.
    expect(source).toContain('label="Legal name" value={item.full_name}');
    expect(source).toContain('label="Organization" value={item.organization_name}');
    expect(source).toContain('value={formatOnboardingStatus(item.onboarding_status)}');
    // ADOPT-08: the facility lane renders the claims approval unlocks, parsed
    // defensively at the projection boundary (arrays may arrive as Json strings).
    expect(source).toContain('const facilityClaims = isProviders ? null : getFacilityClaims(item);');
    expect(source).toContain('toFacilityClaimList(item?.specialties)');
    expect(source).toContain('toFacilityClaimList(item?.service_types)');
    expect(source).toContain('label="Beds" value={facilityClaims.beds}');
    expect(source).toContain('label="Eligibility" value={facilityClaims.eligibility}');
    expect(source).toContain('{facilityClaims.specialties.length > 0 && (');
    expect(source).toContain('{facilityClaims.serviceTypes.length > 0 && (');
    // ADOPT-09: provenance is presence-only and renders NOTHING when both columns
    // are null (the pill is gated on the projection's honest null).
    expect(source).toContain('const provenance = isProviders ? null : getFacilityProvenance(item);');
    expect(source).toContain('{provenance && (');
    expect(source).toContain("if (source) return 'Self-registered';");
    expect(source).toContain("return 'Demo seed';");
  });

  it('surfaces payout readiness presence-only and never a raw Stripe identifier (ADOPT-40)', () => {
    const source = pageSource();
    // ADOPT-40: the provider rail binds profiles.payout_method_brand/_last4 --
    // fetched by the queue's select('*') but invisible before this pass. The line
    // is gated on the projection's honest null: production rows are mostly
    // unpopulated, and both-null renders NOTHING (no fabricated unfunded state).
    expect(source).toContain('export const formatPayoutMethod = (item) => {');
    expect(source).toContain("typeof item?.payout_method_brand === 'string'");
    expect(source).toContain("typeof item?.payout_method_last4 === 'string'");
    expect(source).toContain('const payoutMethod = isProviders ? formatPayoutMethod(item) : null;');
    expect(source).toContain('{payoutMethod && <DetailLine icon={CreditCard} label="Payout method" value={payoutMethod} />}');
    // Presence-only Stripe semantics: the same profiles row carries raw
    // payment-method/account/customer identifiers; none may enter this estate.
    expect(source).not.toContain('payout_method_id');
    expect(source).not.toContain('stripe_account_id');
    expect(source).not.toContain('stripe_customer_id');
  });

  it('gives BOTH lanes multi-select + bulk, routed per queue (providers approve-only, facilities tri-state)', () => {
    const source = pageSource();
    const bottomBarSource = [
      fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
      fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
    ].join('\n');

    expect(source).not.toContain('onDelete={() => { }}');
    // Multi-select + bulk on BOTH lanes for admins (facilities used to have neither).
    expect(source).toContain('const selectable = canApprove;');
    expect(source).toContain('{selectable && (');
    // Selection uses the shared hook (Requests/Users parity).
    expect(source).toContain("from '../../hooks/useRowSelection'");
    expect(source).toContain('useRowSelection(sortedItems)');
    // Bulk routes each id to the CORRECT service per queue -- never the F4 misfire of one
    // queue's ids against the other's RPC. Lock the ROUTING SELECTOR and the id source,
    // not just the branch bodies: a one-line inversion of either fully misroutes F4 while
    // the branch-body substrings stay present (2026-07-10 adversarial review, major gap).
    expect(source).toContain("const isProviders = queueType === 'providers';");
    expect(source).toContain("const activeItems = queueType === 'providers' ? providers : organizations;");
    expect(source).toContain('verifyProviderCommand: verifyProvider');
    expect(source).toContain('verifyOrganizationCommand: verifyOrganization');
    expect(source).toContain('if (isProviders) await verifyProviderCommand(id, true);');
    expect(source).toContain('else await verifyOrganizationCommand(id, approved);');
    // Facilities get a bulk Reject (real tri-state); it is queue-gated -- providers don't.
    // Pin each button's ARGUMENT so a Reject-that-approves regression reds.
    expect(source).toContain('title="Reject Selected"');
    expect(source).toContain("{queueType === 'organizations' && (");
    expect(source).toContain('onClick={() => handleBulkAction(false)}');
    expect(source).toContain('onClick={() => handleBulkAction(true)}');
    // The FAB + bottom bar still own the /verification approval action (mobile).
    expect(routeOwnsShellAction('/verification')).toBe(true);
    expect(bottomBarSource).toContain("pathname.startsWith('/verification')");
  });

  it('auto-selects the focused row via the shared FocusedRecord hook (donor parity: no empty rail with data)', () => {
    const source = pageSource();
    // COMPOSE the extracted mechanism (Hospitals/Ambulances) rather than re-rolling
    // `find || list[0]` inline -- the inline reinvention is what dropped the behavior and
    // took a user correction (2026-07-10). The rail is never empty when there is data.
    expect(source).toContain("import { useFocusedRecord } from '../../contexts/FocusedRecordContext';");
    expect(source).toContain("const { focusedRecord: focusedItem, setFocused } = useFocusedRecord('verification', sortedItems);");
    expect(source).not.toContain('const focusedItem = useMemo(');
  });

  it('keeps the shared context panel copy aligned with Approvals naming', () => {
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
    expect(panel).toContain('Export is not available yet.');
    expect(panel).toContain('Filter the list or open a pending row to review details.');
    expect(panel).toContain('title="Filter approvals"');
    expect(panel).toContain('title="View approval trends"');
    expect(panel).not.toContain('Verification Overview');
    expect(panel).not.toContain('All verification requests');
    expect(panel).not.toContain('Success Rate');
    expect(panel).not.toContain('Quick Actions');
    expect(panel).not.toContain('border');
    expect(panel).not.toContain('ring');
    expect(panel).not.toContain('outline');
    expect(panel).not.toContain('divide');
  });

  it('keeps the provider detail modal inside the Approvals visual and copy gate', () => {
    const page = pageSource();
    const modal = modalSource();
    const island = islandSource();
    const checkbox = checkboxSource();
    const hardgate = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

    expect(page).not.toContain('getAvatarUrl');
    expect(modal).not.toContain('getAvatarUrl');
    expect(page).toContain('item?.avatar_url || item?.image_uri');
    expect(page).toContain("style={{ outline: 'none' }}");
    expect(page).not.toContain('data-[state=active]:bg-primary');
    expect(page).not.toContain('hover-glow-primary');
    expect(island).toContain('hsl(var(--spark))');
    expect(island).toContain('bg-[hsl(var(--spark)/0.75)]');
    expect(checkbox).toContain('data-[state=checked]:bg-foreground');
    expect(checkbox).toContain('dark:data-[state=checked]:bg-white');
    expect(checkbox).not.toContain('data-[state=checked]:bg-[hsl(var(--spark)');
    expect(checkbox).not.toContain('border-primary');
    expect(checkbox).not.toContain('data-[state=checked]:bg-primary');
    expect(hardgate).toContain('src/components/modals/VerificationModal.jsx');
    // The retired list/table view files are no longer hardgated (they were deleted).
    expect(hardgate).not.toContain('VerificationQueueListView');
    expect(hardgate).not.toContain('VerificationQueueTableView');
    expect(modal).toContain('Review note');
    expect(modal).toContain('Only admins can approve or reject.');
    expect(modal).not.toContain('Security Notice');
    expect(modal).not.toContain('bg-success');
    expect(modal).not.toContain('bg-warning');
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
    expect(facilityService).toContain("const normalizedStatus = status === 'approved' ? 'verified' : status;");
    expect(facilityService).toContain('getDisplayIds(orgIds, { quiet: filters.quiet })');
    expect(facilityService).toContain('facility approvals');
  });

  // Dual-queue: two datasets behind ONE canonical render. Prove a COMMAND is wired to
  // BOTH lanes (from the page) and that the per-lane stats never assume a single list.
  it('proves every approval COMMAND is wired to BOTH lanes (dual-queue, not one)', () => {
    const source = pageSource();
    // Both verify handlers exist and are DISTINCT (a shared handler would hide a lane).
    expect(source).toContain('const handleVerify = useCallback(async (providerId, approved)');
    expect(source).toContain('const handleVerifyOrg = useCallback(async (hospitalId, approved)');
    // Both are wired down each canApprove-gated -- not just the provider lane.
    expect(source).toContain('onVerifyProvider={canApprove ? handleVerify : null}');
    expect(source).toContain('onVerifyOrganization={canApprove ? handleVerifyOrg : null}');
    // Per-lane STATS are distinct; the active stats + count never assume one list.
    expect(source).toContain('const [stats, setStats]');
    expect(source).toContain('const [orgStats, setOrgStats]');
    expect(source).toContain('const activeStats = useMemo(');
    // Pin the facility 'approved' normalization (verified -> approved). Dropping it makes
    // the facility Approved count silently read 0; a vacuous `queueType === 'providers'`
    // substring (24 occurrences) did NOT catch that (2026-07-10 adversarial review).
    expect(source).toContain('approved: facilityStats?.verified || 0');
    expect(source).toContain('const items = getActiveVerificationItems(queueType, providers, organizations);');
    expect(source).toContain('count: items.length');
  });

  it('preserves receiver feedback, modal closure, and refetch sequencing', () => {
    const source = pageSource();
    const providerCommand = source.slice(
      source.indexOf('const handleVerify = useCallback'),
      source.indexOf('const handleVerifyOrg = useCallback'),
    );
    const facilityCommandStart = source.indexOf('const handleVerifyOrg = useCallback');
    const controllerBulkStart = source.indexOf('const handleBulkAction = useCallback', facilityCommandStart);
    const facilityCommand = source.slice(
      facilityCommandStart,
      controllerBulkStart,
    );
    const bulkCommand = source.slice(
      controllerBulkStart,
      source.indexOf('return {', controllerBulkStart),
    );

    expect(providerCommand.indexOf('setActionLoading(true)'))
      .toBeLessThan(providerCommand.indexOf('await verifyProvider(providerId, approved)'));
    expect(providerCommand.indexOf('onProviderVerified?.();'))
      .toBeLessThan(providerCommand.indexOf('await fetchVerificationData();'));
    expect(providerCommand).toContain('finally');
    expect(providerCommand).toContain('setActionLoading(false)');

    expect(facilityCommand.indexOf('await verifyOrganization(hospitalId, approved)'))
      .toBeLessThan(facilityCommand.indexOf('fetchOrgVerificationData();'));
    expect(facilityCommand).toContain('finally');
    expect(facilityCommand).toContain('setActionLoading(false)');

    expect(bulkCommand.indexOf('clearSelection?.();'))
      .toBeLessThan(bulkCommand.indexOf('await refetchActive();'));
    expect(bulkCommand.indexOf('await refetchActive();'))
      .toBeLessThan(bulkCommand.indexOf('setActionLoading(false)'));
  });

  it('makes the PROVIDER lane approve-only and the FACILITY lane keep a real reject', () => {
    const source = pageSource();
    const modal = modalSource();
    const providerService = providerServiceSource();
    const facilityService = facilityServiceSource();
    // Providers have NO rejected state -> reject is removed from EVERY provider surface
    // on the page (grid/rail/bulk), not just an extracted view. Org reject stays real.
    expect(modal).not.toContain('handleVerifyAction(false)');
    expect(source).not.toContain('handleVerify(provider.id, false)');
    expect(source).not.toContain('handleVerify(item.id, false)');
    // Providers bulk is approve-only: the provider branch hardcodes approve (true), so a
    // provider can never be bulk-rejected even though the shared handler takes `approved`.
    expect(source).toContain('if (isProviders) await verifyProviderCommand(id, true);');
    expect(source).toContain("onReject={queueType === 'organizations'");
    // The service no longer LIES that 'rejected' == 'pending'; it is honest-empty.
    expect(providerService).not.toContain('Rejected providers are also unverified');
    expect(providerService).toContain('A provider cannot be "rejected"');
    // 'Rejected' status filter is FACILITY-ONLY (queue-gated, never a dead 0-chip).
    expect(source).toContain("...(queueType === 'providers' ? [] : [{ value: 'rejected'");
    // Facilities keep the REAL Approve + Reject (verification_status has rejected).
    expect(source).toContain('handleVerifyOrg(item.id, false)');
    expect(facilityService).toContain("status === 'approved' ? 'verified' : status");
  });

  // ADOPT-20: the record modal was provider-shaped while BOTH queues fed it --
  // facility rows rendered 'Unknown Provider'/always-PENDING and the modal's
  // Approve called verifyProvider(hospital.id), which always threw 'Provider
  // not found'. These gates are lane-aware and were RED before the fix.
  it('routes the record modal per lane: facilities bind the facility receiver, never verifyProvider (ADOPT-20)', () => {
    const source = pageSource();
    const modal = modalSource();

    // ONE lane selector derived from the same queueType the list renders.
    expect(source).toContain("const isFacilityQueue = queueType === 'organizations';");
    expect(source).toContain('const modalVerifyHandler = isFacilityQueue ? handleVerifyOrg : handleVerify;');
    // ALL THREE mounts (phone/tablet/desktop branches) pass the lane-aware pair --
    // the defect existed on every lane, so every mount is pinned by count.
    expect((source.match(/<VerificationModal/g) || []).length).toBe(3);
    expect((source.match(/isFacility=\{isFacilityQueue\}/g) || []).length).toBe(3);
    expect((source.match(/onVerify=\{canApprove \? modalVerifyHandler : null\}/g) || []).length).toBe(3);
    // The page never hands the provider receiver straight to the modal again.
    expect(source).not.toContain('onVerify={canApprove ? handleVerify : null}');
    // Queue switch closes the open record so the lane flag cannot go stale.
    expect(source).toContain('setSelectedProvider(null);');

    // Modal: the facility branch carries a REAL Approve AND Reject through the
    // lane handler; the provider action path still cannot reject (approve-only).
    expect(modal).toContain('handleFacilityDecision(true)');
    expect(modal).toContain('handleFacilityDecision(false)');
    expect(modal).not.toContain('handleVerifyAction(false)');
    // Facility write path keeps the submit spinner (interaction-completeness).
    expect(modal).toContain('animate-spin');

    // Facility truth renders through the SAME projections the rail uses: name
    // (not username), the RAW tri-state pill, claims chips + provenance.
    expect(modal).toContain("from '../pages/verification/verificationQueueModel'");
    expect(modal).toContain('getFacilityStatusPresentation(provider?.verification_status)');
    expect(modal).toContain('getFacilityClaims(provider)');
    expect(modal).toContain('getFacilityProvenance(provider)');
    expect(modal).toContain("provider?.name || 'Unnamed facility'");
    // Honest raw status: unknown values are humanized, NEVER coerced to
    // pending/verified; null hides the pill instead of fabricating 'pending'.
    const model = fs.readFileSync('src/components/pages/verification/verificationQueueModel.js', 'utf8');
    expect(model).toContain('export const getFacilityStatusPresentation = (value) => {');
    expect(model).toContain('if (!raw) return null;');
    expect(model).toContain("key: 'unknown'");
    expect(model).toContain("label: raw.replace(/_/g, ' ')");

    // Return-semantics alignment: BOTH lane receivers report success as a
    // boolean so runVerificationAction can gate close/success on the result.
    const facilityCommandStart = source.indexOf('const handleVerifyOrg = useCallback');
    const facilityCommand = source.slice(
      facilityCommandStart,
      source.indexOf('const handleBulkAction = useCallback', facilityCommandStart),
    );
    expect(facilityCommand).toContain('return true;');
    expect(facilityCommand).toContain('return false;');
  });

  it('bans the phantom verification_notes field from the whole approvals estate (ADOPT-20)', () => {
    // No verification_notes column exists on profiles OR hospitals
    // (types/database.ts): the textarea silently discarded operator input on
    // every save since the modal shipped. Banned from both lanes of the modal
    // and the page estate; no replacement notes persistence (schema decision).
    expect(modalSource()).not.toContain('verification_notes');
    expect(pageSource()).not.toContain('verification_notes');
  });

  it('keeps the hospital claim review chain on the canonical evidence, claim, and organization receivers', () => {
    const service = facilityServiceSource();
    const modal = modalSource();
    const page = pageSource();

    expect(service).toContain(".from('organization_facility_claims')");
    expect(service).toContain(".from('organization_verification_documents')");
    expect(service).toContain("supabase.rpc('review_organization_verification_document'");
    expect(service).toContain("supabase.rpc('review_console_facility_claim'");
    expect(service).toContain("supabase.rpc('review_console_organization'");

    expect(page).toContain('getFacilityReviewGates(item)');
    expect(page).toContain('canApproveFacility: organizationVerified && claimApproved');
    expect(page).toContain('disabled={actionLoading || !facilityApprovalReady}');
    expect(page).toContain('Review evidence, ownership, and organization before approving this facility.');
    expect(modal).toContain('getFacilityReviewGates(provider)');
    expect(modal).toContain('disabled={loading || !canApproveClaim}');
    expect(modal).toContain('disabled={loading || !canApproveOrganization}');
    expect(modal).toContain('disabled={loading || !canApproveFacility}');
  });

  it('lets an org_admin reviewer see the review panel (route is org_admin-reachable)', () => {
    // The panel is READ-ONLY review context; the page/route is org_admin-reachable, so
    // an org_admin reviewer must get it. Approval COMMANDS stay admin-gated (canApprove).
    expect(canAccessContextPanel('/verification', {
      admin: false,
      orgAdmin: true,
      patient: false,
      provider: false,
      sponsor: false,
      viewer: false,
    })).toBe(true);
    expect(canAccessContextPanel('/verification', {
      admin: false,
      orgAdmin: false,
      patient: true,
      provider: false,
      sponsor: false,
      viewer: false,
    })).toBe(false);
    expect(pageSource()).toContain('const canApprove = isAdmin();');
    expect(pageSource()).toContain('const canReview = canApprove || isOrgAdmin();');
  });
});
