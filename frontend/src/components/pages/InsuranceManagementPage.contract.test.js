import fs from 'fs';
import path from 'path';

describe('Insurance Page 12 intake contract', () => {
  const read = (path) => fs.readFileSync(path, 'utf8');
  const readIfPresent = (path) => (fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '');
  const readTreeIfPresent = (dirPath) => {
    if (!fs.existsSync(dirPath)) return '';

    const files = [];
    const walk = (currentPath) => {
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        const nextPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          walk(nextPath);
        } else if (/\.(ts|js|json|md)$/i.test(entry.name)) {
          files.push(nextPath);
        }
      }
    };

    walk(dirPath);
    return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  };

  it('records Insurance as admin-only intake, not an admitted visual revamp', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');

    expect(gate).toContain('### Page 12 Intake Audit - Insurance');
    expect(gate).toContain('Insurance at `/insurance` is in intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, or command re-enable is authorized yet.');
    expect(gate).toContain('Route identity cleanup on 2026-07-06 mounted `SEOHead title="Insurance"` in both desktop and mobile Insurance branches');
    expect(app).toContain('<Route path="/insurance" element={<ProtectedRoute minRole="admin"><InsuranceManagementPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/insurance':");
    expect(routes).toContain("minRole: 'admin'");
    expect(routes).toContain("resource: 'insurance'");
    expect(routes).toContain("title: 'Insurance'");
    expect(navigation).toContain("{ id: 'insurance', path: '/insurance'");
    expect(navigation).toContain("label: 'Insurance'");
    expect(navigation).toContain("minRole: 'admin'");
    expect(page).toContain("import { SEOHead } from '../common/SEOHead';");
    expect(page).toContain('<SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />');
  });

  it('preserves the old page behavior inventory before any UI conversion', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const mobile = read('src/components/mobile/MobileInsurance.jsx');

    expect(gate).toContain('usePageHeader`, `usePageFooter`, `useInsurance`, `useViewMode');
    expect(gate).toContain('create/edit/view/delete/verify/bulk delete handlers');
    expect(page).toContain('getInsurancePage');
    expect(page).toContain("useViewMode('insurance', 'grid')");
    expect(page).toContain('ViewToggle');
    expect(page).toContain('FilterSheet');
    expect(page).toContain('AnalyticsModal');
    expect(page).toContain('InsuranceModal');
    expect(page).toContain('<SEOHead title="Insurance"');
    expect(gate).toContain('ConfirmationModal');
    expect(gate).toContain('BulkActionBar');
    expect(page).toContain('showPolicyCommandUnavailable');
    expect(page).toContain('mobile-insurance-error-state');
    expect(page).toContain('openInsuranceModal');
    expect(page).toContain('openAnalyticsModal');
    expect(mobile).toContain('PullToRefresh');
    expect(mobile).toContain('MobileKPIStrip');
    expect(mobile).toContain('MobileFeaturedMetric');
    expect(mobile).toContain('MobileSecondaryMetricRail');
    // Tap opens the canonical detail bottom sheet (MobileDetailSheet), not an inline dropdown.
    expect(mobile).toContain('MobileDetailSheet');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('const [activePolicy, setActivePolicy] = useState(null);');
    expect(mobile).toContain('onClick={() => setActivePolicy(policy)}');
    expect(mobile).toContain('isOpen={!!activePolicy}');
    expect(mobile).toContain("vital={v ? { ...v, label: 'Policy status' } : null}");
    // The old inline-expand composition must be fully removed.
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('expandedId');
    expect(mobile).not.toContain('onExpand');
    expect(mobile).not.toContain('isExpanded');
    // Read-only boundary: the mobile sheet never wires an insurance mutation hook.
    expect(mobile).not.toContain('useInsurance');
    expect(gate).toContain('create/edit/view/delete/verify/bulk delete handlers');
  });

  it('keeps unsafe Insurance authority and storage blockers explicit', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const service = read('src/services/insuranceService.js');
    const policiesService = read('src/services/insurancePoliciesService.js');
    const hook = read('src/hooks/useInsurance.js');
    const appInsuranceService = readIfPresent('../../ivisit-app/services/insuranceService.js');
    const appSecurityMigration = readIfPresent('../../ivisit-app/supabase/migrations/20260219000700_security.sql');
    const appTestingDocs = readIfPresent('../../ivisit-app/supabase/docs/TESTING.md');
    const appInsuranceFieldGuard = readIfPresent('../../ivisit-app/supabase/tests/scripts/assert_insurance_surface_field_guard.js');
    const appApiReference = readIfPresent('../../ivisit-app/supabase/docs/console/api_reference.json');
    const appSchemaSnapshot = readIfPresent('../../ivisit-app/supabase/docs/console/schema_snapshot.json');
    const appFunctionsSource = readTreeIfPresent('../../ivisit-app/supabase/functions');
    const modal = read('src/components/modals/InsuranceModal.jsx');
    const analyticsModal = read('src/components/modals/AnalyticsModal.jsx');
    const mobile = read('src/components/mobile/MobileInsurance.jsx');
    const panel = read('src/components/context/InsurancePanel.jsx');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');

    expect(gate).toContain('First route projection cleanup on 2026-07-03 added `getInsurancePage()` and `getInsurancePageStats()`');
    expect(gate).toContain('`InsuranceManagementPage.jsx` now consumes `getInsurancePage()` directly instead of `useInsurance()`');
    expect(gate).toContain('Current policy proof says `insurance_policies` is patient-owner CRUD only.');
    expect(gate).toContain('`insurance_billing` is trigger-created billing truth with patient/org/admin scoped reads');
    expect(gate).toContain('Old Console behavior uploaded `documents/insurance-cards/*` and persisted a one-year signed URL');
    expect(gate).toContain('active `uploadInsuranceCardImage()` now fails closed instead of writing to Storage');
    expect(gate).toContain('Card preview safety cleanup on 2026-07-05 stopped `InsuranceModal.jsx` from rendering `front_image_url` and `back_image_url` as direct `<img>` requests.');
    expect(gate).toContain('First modal/mobile truth cleanup on 2026-07-03 converted `InsuranceModal.jsx` to the shared `ModalShell`');
    expect(gate).toContain('`MobileInsurance.jsx` now consumes scoped route stats from `getInsurancePage()`');
    expect(gate).toContain('no longer accepts or renders mobile edit/delete/verify command props or selection props');
    expect(gate).toContain('First context-panel cleanup on 2026-07-03 moved `InsurancePanel.jsx` off `PageDataContext` policy rows and stats.');
    expect(gate).toContain('Right-panel route-context cleanup on 2026-07-06 moved the policy side of `InsurancePanel.jsx` to the active route projection');
    expect(gate).toContain('Right-panel billing route-context cleanup on 2026-07-06 moved the panel claim summary to the active route projection too');
    expect(gate).toContain('First billing-result cleanup on 2026-07-03 added a read-only `insurance_billing` projection through `getInsuranceBillingOutcomes()` and `getInsuranceBillingOutcomeStats()`.');
    expect(gate).toContain('Second data-owner cleanup on 2026-07-04 moved the remaining lazy/manual `PageDataContext` Insurance read path from `insurancePoliciesService.js` to `getInsurancePage()`.');
    expect(gate).toContain('Third duplicate-write cleanup on 2026-07-04 removed the direct Supabase `insert`, policy `update`, `delete`, and document-image `update` bodies from `insurancePoliciesService.js`.');
    expect(gate).toContain('legacy export names remain for compatibility, but they now delegate to `createInsurancePolicy`, `updateInsurancePolicy`, and `deleteInsurancePolicy` in `insuranceService.js`');
    expect(gate).toContain('First storage safety cleanup on 2026-07-04 removed the active Storage upload and one-year signed URL creation from `uploadInsuranceCardImage()` in `insuranceService.js`.');
    expect(gate).toContain('First policy-command safety cleanup on 2026-07-04 removed the active direct Supabase `insert`, policy `update`, status `update`, verification `update`, and `delete` bodies from `insuranceService.js`.');
    expect(gate).toContain('First legacy-hook command cleanup on 2026-07-04 removed policy command imports and optimistic local policy mutations from `useInsurance.js`.');
    expect(gate).toContain('Read-only modal boundary cleanup on 2026-07-05 removed the dead `onSave` handoff from `InsuranceManagementPage.jsx` to `InsuranceModal.jsx`.');
    expect(gate).toContain('no save-shaped prop crosses the active route boundary while policy command authority is unproved.');
    expect(gate).toContain('Insurance analytics completeness cleanup on 2026-07-05 keeps exact route totals but marks provider/type breakdowns as visible-page evidence.');
    expect(gate).toContain('Legacy analytics export cleanup on 2026-07-05 removed the old direct all-policy analytics read from `getInsuranceAnalytics()`.');
    expect(gate).toContain('the legacy export now fails closed until route-wide distribution scope and report authority are proved.');
    expect(gate).toContain('Legacy hook analytics cleanup on 2026-07-05 removed the `useInsurance()` call into `getInsuranceAnalytics()`.');
    expect(gate).toContain('stale hook consumers cannot revive broad analytics by accident.');
    expect(gate).toContain('Legacy adapter read cleanup on 2026-07-05 removed direct Supabase policy reads, user-policy reads, active-coverage checks, false coverage fallbacks, and legacy realtime channels from `insurancePoliciesService.js`.');
    expect(gate).toContain('The adapter now fails closed for reads/subscriptions and keeps only write compatibility exports delegating to fail-closed owner commands.');
    expect(gate).toContain('Legacy service/hook read cleanup on 2026-07-05 removed the old direct `getInsurancePolicies()` / `getInsurancePolicy()` read bodies from `insuranceService.js` and removed the `useInsurance()` auto-fetch/realtime subscription.');
    expect(gate).toContain('The legacy hook still returns its compatibility shape, but list reads now throw unavailable feedback and cannot start hidden broad policy reads outside `getInsurancePage()`.');
    expect(gate).toContain('Context-panel command affordance cleanup on 2026-07-05 kept Add and Export page-owned but changed both right-panel controls to muted unavailable states');
    expect(gate).toContain('The Insurance panel no longer presents Add or Export as primary live commands while policy authority and report scope are unproved.');
    expect(gate).toContain('Right-panel loading/chrome cleanup on 2026-07-05 removed the primary glow loader from `InsurancePanel.jsx`');
    expect(gate).toContain('The 2026-07-06 route-context cleanups superseded that panel ownership');
    expect(gate).toContain('`InsurancePanel.jsx` no longer starts policy or billing reads');
    expect(gate).toContain('Ordinary insurance color/language cleanup on 2026-07-05 moved non-danger read-only policy evidence, verified marks, filter feedback, mobile details, list/table icons, and modal evidence chrome away from brand-primary styling');
    expect(gate).toContain('Legacy payload-builder cleanup on 2026-07-05 kept the old `buildInsuranceWritePayload()` export for import compatibility but changed it to fail closed, then removed the dead linked-payment and coverage-detail mutation helper scaffolding from `insuranceService.js`.');
    expect(gate).toContain('Console no longer exposes a usable policy mutation payload builder while admin policy command authority, receiver ownership, payload contract, authorization expectation, and app consequence remain unproved.');
    expect(gate).toContain('App storage evidence recertification on 2026-07-04 read `ivisit-app/services/insuranceService.js`');
    expect(gate).toContain('Billing command surface recertification on 2026-07-04 found Console only reads `insurance_billing`');
    expect(gate).toContain('create_insurance_billing_on_completion()');
    expect(gate).toContain('Policy command authority recertification on 2026-07-04 checked the app-side service, RLS migration, and insurance surface field guard.');
    expect(gate).toContain('That guard does not prove Console admin create/edit/delete/status/verify authority, a Console command receiver, an admin policy RPC, or app consequence.');
    expect(gate).toContain('The fail-closed Console command exports remain the correct state.');
    expect(gate).toContain('Command/storage/billing recertification on 2026-07-05 checked current `ivisit-app` service, RLS, console API reference, console schema snapshot, Edge Functions, and insurance surface guard.');
    expect(gate).toContain('the schema snapshot has no `console_*insurance*` or insurance command receiver');
    expect(gate).toContain('policy commands, billing mutations, card upload, and direct card previews remain fail-closed.');
    expect(gate).toContain('Rendered intake proof on 2026-07-05 reused the single `localhost:3000` server');
    expect(gate).toContain('The page rendered inside the shared shell with `Insurance`, view toggles, filter trigger, read-only header action, finance navigation, zero scoped metrics, and the true empty state');
    expect(gate).toContain('The same proof pass also observed the explicit denied/degraded copy path without a blank shell.');
    expect(gate).toContain('This closes the old local login/runtime proof blocker only; it does not admit Insurance visually or prove admin policy/billing/storage authority.');
    expect(gate).toContain('Read-only feedback proof on 2026-07-05 found the header read-only action needed persistent visible feedback beyond a toast.');
    expect(gate).toContain('Second command-affordance cleanup on 2026-07-04 simplified the active header to `Insurance`, removed the active desktop `Add Policy` label, create-empty-state copy, hover-hidden edit icon, command-like `VERIFY NOW` / `ACTION NEEDED` badges, active `ConfirmationModal`, active `BulkActionBar`, and active mobile edit/delete/verify handlers.');
    expect(gate).toContain('First mobile route-filter cleanup on 2026-07-04 removed local search/KPI filtering from `MobileInsurance.jsx`');
    expect(gate).toContain('mobile search input and KPI taps now only write `filters.search` and `filters.kpiFilter`');
    expect(page).toContain("usePageHeader(\n    'Insurance',");
    expect(mobile).not.toContain('onEdit');
    expect(mobile).not.toContain('onDelete');
    expect(mobile).not.toContain('onVerify');
    expect(mobile).not.toContain('canManage');
    expect(mobile).not.toContain('selectedIds');
    expect(mobile).not.toContain('onSelect');
    expect(mobile).not.toContain('onSelectAll');
    expect(mobile).not.toContain('selectionMode');
    expect(mobile).not.toContain('isSelected');
    expect(mobile).not.toContain('isAllSelected');
    expect(mobile).not.toContain('Trash2');
    expect(mobile).not.toContain('Edit');
    expect(mobile).not.toContain('filteredPolicies');
    expect(mobile).not.toContain('let result = [...policies]');
    expect(mobile).not.toContain('result.filter');
    expect(mobile).toContain('useStableList(policies, loading)');
    expect(mobile).toContain("onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}");
    // Canon kit (Wave 2, 2026-07-09): search now flows through SearchRow's debounced
    // commit -- same filters-owned data path as the old inline onChange, new recipe.
    expect(mobile).toContain("onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}");
    expect(page).not.toContain('canManage={');
    expect(page).toContain('canDelete={false}');
    expect(page).toContain('canVerify={false}');
    expect(page).toContain('selectionEnabled={false}');
    expect(page).toContain('Read-only');
    expect(page).not.toContain('READ ONLY');
    expect(page).not.toContain('>READ<');
    expect(page).not.toContain('bg-primary');
    expect(page).not.toContain('text-primary');
    expect(page).not.toContain('ring-primary');
    expect(page).not.toContain('border-primary');
    expect(page).not.toContain('hover-glow-primary');
    expect(mobile).not.toContain('hsl(var(--primary))');
    expect(mobile).not.toContain('focus:ring-primary');
    expect(mobile).not.toContain('text-primary');
    expect(mobile).not.toContain('VERIFIED');
    expect(mobile).not.toContain('UNVERIFIED');
    expect(page).not.toContain('Policy save');
    expect(page).not.toContain('handleSave');
    expect(page).not.toContain('onSave={');
    expect(page).toContain('const visibleInsuranceAnalytics = useMemo(() => {');
    expect(page).toContain("distributionScope: 'visible_page'");
    expect(page).toContain("distributionLabel: 'Visible page only'");
    expect(page).toContain('analytics={visibleInsuranceAnalytics}');
    expect(page).not.toContain('byProvider: paginatedPolicies.reduce');
    expect(page).not.toContain('byCategory: paginatedPolicies.reduce');
    expect(page).not.toContain('useInsurance()');
    expect(page).not.toContain('deletePolicy(');
    expect(page).not.toContain('verifyPolicy(');
    expect(page).not.toContain('ConfirmationModal');
    expect(page).not.toContain('BulkActionBar');
    expect(page).not.toContain('ADD POLICY');
    expect(page).not.toContain('Add Policy');
    expect(page).toContain('const [commandNotice, setCommandNotice] = useState(null);');
    expect(page).toContain('setCommandNotice(message);');
    expect(page).toContain('const handlePolicyToolsPress = useCallback((event) => {');
    expect(page).toContain('event.preventDefault();');
    expect(page).toContain('onPointerDown={handlePolicyToolsPress}');
    expect(page).toContain('onClick={handlePolicyToolsUnavailable}');
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('bg-muted/40');
    expect(page).not.toContain('Create your first insurance policy');
    expect(page).not.toContain('VERIFY NOW');
    expect(page).not.toContain('ACTION NEEDED');
    expect(page).not.toContain('<Edit');
    expect(page).not.toContain('handleCreate');
    expect(page).not.toContain('handleEdit');
    expect(page).not.toContain('handleDelete');
    expect(page).not.toContain('handleVerify');
    expect(page).not.toContain('handleSelect');
    expect(page).not.toContain('handleSelectAll');
    expect(page).not.toContain('selectedIds');
    expect(page).not.toContain('confirmationModal');
    expect(page).not.toContain('opacity-0 group-hover');
    expect(page).not.toContain('Delete Selected');
    expect(page).not.toContain('Delete Policy');
    expect(page).not.toContain('Verify Policy');
    expect(page).not.toContain('ACTIONS');
    expect(service).toContain('export async function getInsurancePage');
    expect(service).toContain('export async function getInsurancePageStats');
    expect(service).toContain('getInsuranceExactCount');
    expect(service).toContain("scope: 'admin_policy_projection'");
    expect(service).toContain("channelName = 'insurance_policies_changes'");
    expect(service).toContain('export async function getInsurancePolicies()');
    expect(service).toContain('export async function getInsurancePolicy()');
    expect(service).toContain('Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.');
    expect(service).not.toContain('Admin gets all policies');
    expect(service).not.toContain('Org Admin gets all policies');
    expect(service).not.toContain("Providers shouldn't access insurance data");
    expect(service).not.toContain("const { data, error } = await query.eq('id', policyId).single();");
    expect(service).toContain('export async function getInsuranceBillingOutcomes');
    expect(service).toContain('export async function getInsuranceBillingOutcomeStats');
    expect(service).toContain("scope: 'admin_billing_outcome_projection'");
    expect(service).toContain('export function normalizeInsuranceBillingOutcome');
    expect(service).toContain('export function subscribeToInsuranceBillingOutcomes');
    expect(service).toContain('This observes claim/billing truth; it does not create, settle, or repair billing rows.');
    expect(service).not.toContain('supabase.from(BILLING_TABLE_NAME).insert');
    expect(service).not.toContain('supabase.from(BILLING_TABLE_NAME).update');
    expect(service).not.toContain('supabase.from(BILLING_TABLE_NAME).delete');
    expect(service).not.toContain("rpc('process_insurance_claim'");
    expect(service).not.toContain("rpc('validate_insurance_coverage'");
    expect(modal).toContain('ModalShell');
    expect(modal).toContain('Read-only review');
    expect(modal).toContain('Policy changes, verification, deletion, and card upload need admin authority first.');
    expect(modal).toContain('getInsuranceBillingOutcomes');
    expect(modal).toContain('Billing outcomes');
    expect(modal).toContain('Request ID');
    expect(modal).toContain('Hospital ID');
    expect(modal).not.toContain('text-primary');
    expect(modal).not.toContain('bg-primary');
    expect(modal).not.toContain('uppercase tracking');
    expect(modal).not.toContain('green-500');
    expect(modal).not.toContain('red-500');
    expect(modal).not.toContain('orange-500');
    expect(modal).not.toContain('blue-500');
    expect(modal).not.toContain('fixed inset-0');
    expect(modal).not.toContain('uploadInsuranceCardImage');
    expect(modal).toContain('const hasImageReference = Boolean(String(src || \'\').trim());');
    expect(modal).toContain('Image reference on file');
    expect(modal).toContain('Preview stays unavailable until the storage path is verified.');
    expect(modal).not.toContain('<img src={src}');
    expect(modal).not.toContain('alt={`${label} insurance card`}');
    expect(modal).not.toContain('await onSave');
    expect(modal).not.toContain('onSave(policy.id');
    expect(analyticsModal).toContain("analytics.distributionScope === 'visible_page'");
    expect(analyticsModal).toContain('analytics.visibleCount');
    expect(analyticsModal).toContain("analytics.distributionLabel || 'Visible page only'");
    expect(service).toContain('export async function createInsurancePolicy');
    expect(service).toContain('export async function updateInsurancePolicy');
    expect(service).toContain('export async function deleteInsurancePolicy');
    expect(service).toContain('export async function updatePolicyStatus');
    expect(service).toContain('export async function verifyInsurancePolicy');
    expect(service).toContain('export function buildInsuranceWritePayload(');
    expect(service).toContain('Insurance write payload construction is unavailable until admin policy authority is verified.');
    expect(service).toContain('Insurance policy create is unavailable until admin policy authority is verified.');
    expect(service).toContain('Insurance policy update is unavailable until admin policy authority is verified.');
    expect(service).toContain('Insurance policy delete is unavailable until admin policy authority is verified.');
    expect(service).toContain('Insurance policy status update is unavailable until admin policy authority is verified.');
    expect(service).toContain('Insurance policy verification is unavailable until admin policy authority is verified.');
    expect(service).toContain('export async function getInsuranceAnalytics()');
    expect(service).toContain('Insurance analytics export is unavailable until route-wide distribution scope is verified.');
    expect(service).not.toContain("select('provider_name, plan_type, status, verified, created_at, starts_at, expires_at')");
    expect(service).not.toContain('byCoverageType');
    expect(service).not.toContain('const assignIfDefined = (key, value)');
    expect(service).not.toContain('function toNullableNumber');
    expect(service).not.toContain('function normalizeLinkedPaymentValue');
    expect(service).not.toContain('function buildCoverageDetails');
    expect(service).not.toContain("assignIfDefined('provider_name'");
    expect(service).not.toContain('payload.coverage_details = buildCoverageDetails');
    expect(service).not.toContain('payload.user_id = input.user_id');
    expect(service).not.toContain('payload.updated_at = now');
    expect(service).not.toContain('.insert([payload])');
    expect(service).not.toContain('.update(payload)');
    expect(service).not.toContain('.delete()');
    expect(service).not.toContain("verified,\n        updated_at: new Date().toISOString()");
    expect(service).toContain('export async function uploadInsuranceCardImage()');
    expect(service).toContain('Insurance card upload is unavailable until private storage ownership is verified.');
    expect(service).not.toContain('insurance-cards');
    expect(service).not.toContain('.upload(filePath, file)');
    expect(service).not.toContain('createSignedUrl(filePath, 31536000)');
    expect(hook).toContain('const showUnavailableCommand = useCallback((message) => {');
    expect(hook).toContain('Insurance policy create is unavailable until admin policy authority is verified.');
    expect(hook).toContain('Insurance policy update is unavailable until admin policy authority is verified.');
    expect(hook).toContain('Insurance policy delete is unavailable until admin policy authority is verified.');
    expect(hook).toContain('Insurance policy status update is unavailable until admin policy authority is verified.');
    expect(hook).toContain('Insurance policy verification is unavailable until admin policy authority is verified.');
    expect(hook).toContain('Insurance policy list reads are unavailable; use getInsurancePage() from insuranceService.');
    expect(hook).toContain('Insurance analytics are unavailable until route-wide distribution scope is verified.');
    expect(hook).not.toContain('getInsurancePolicies');
    expect(hook).not.toContain('subscribeToInsurancePolicies');
    expect(hook).not.toContain('useEffect');
    expect(hook).not.toContain('fetchInsurancePolicies();');
    expect(hook).not.toContain('const unsubscribe');
    expect(hook).not.toContain('Refetch on any change');
    expect(hook).not.toContain('useAuth');
    expect(hook).not.toContain('getInsuranceAnalytics');
    expect(hook).not.toContain('const data = await getInsuranceAnalytics()');
    expect(hook).not.toContain('createInsurancePolicy,');
    expect(hook).not.toContain('updateInsurancePolicy,');
    expect(hook).not.toContain('deleteInsurancePolicy,');
    expect(hook).not.toContain('updatePolicyStatus,');
    expect(hook).not.toContain('verifyInsurancePolicy,');
    expect(hook).not.toContain('setInsurancePolicies((prev) => [newPolicy, ...prev])');
    expect(hook).not.toContain('prev.map((policy) => policy.id === id');
    expect(hook).not.toContain('prev.filter((policy) => policy.id !== id)');
    if (appInsuranceService) {
      expect(appInsuranceService).toContain('const fileName = `insurance/${user.id}/${Date.now()}.${ext}`;');
      expect(appInsuranceService).toContain('.createSignedUrl(fileName, 60 * 60)');
      expect(appInsuranceService).toContain('userId: user.id');
      expect(appInsuranceService).toContain('.eq("user_id", user.id)');
      expect(appInsuranceService).not.toContain('insurance-cards');
    }
    if (appSecurityMigration) {
      expect(appSecurityMigration).toContain('CREATE POLICY "Users manage own insurance policies"');
      expect(appSecurityMigration).toContain('ON public.insurance_policies FOR ALL');
      expect(appSecurityMigration).toContain('USING (auth.uid() = user_id);');
      expect(appSecurityMigration).not.toContain('CREATE POLICY "Admins manage all insurance policies"');
    }
    if (appTestingDocs) {
      expect(appTestingDocs).toContain('### **Insurance Surface Field Guard**');
      expect(appTestingDocs).toContain('app/console type parity for `insurance_policies` and `insurance_billing`');
      expect(appTestingDocs).toContain('insurance policy write services must use canonical payload builder and avoid legacy top-level column mutations');
      expect(appTestingDocs).not.toContain('admin policy command authority');
    }
    if (appInsuranceFieldGuard) {
      expect(appInsuranceFieldGuard).toContain('insurance_payload_builder_present');
      expect(appInsuranceFieldGuard).toContain('insurance_no_legacy_direct_mutation_shape');
      expect(appInsuranceFieldGuard).toContain('insurance_no_legacy_payload_assignments');
      expect(appInsuranceFieldGuard).not.toContain('admin policy authority');
    }
    if (appApiReference) {
      expect(appApiReference).toContain('"name": "create_insurance_billing_on_completion"');
      expect(appApiReference).toContain('"name": "approve_cash_payment"');
      expect(appApiReference).not.toMatch(/console.*insurance|insurance.*command|process_insurance|settle_insurance|approve_insurance|reject_insurance|repair_insurance/i);
    }
    if (appSchemaSnapshot) {
      expect(appSchemaSnapshot).not.toMatch(/console.*insurance|insurance.*command|process_insurance|settle_insurance|approve_insurance|reject_insurance|repair_insurance/i);
    }
    if (appFunctionsSource) {
      expect(appFunctionsSource).not.toMatch(/insurance_policies|insurance_billing|process_insurance|settle_insurance|approve_insurance|reject_insurance|repair_insurance|insurance.*exception/i);
    }
    expect(policiesService).toContain('export async function createInsurancePolicy');
    expect(policiesService).toContain('export async function updateInsurancePolicy');
    expect(policiesService).toContain('export async function deleteInsurancePolicy');
    expect(policiesService).toContain('Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.');
    expect(policiesService).toContain('Legacy insurance policy realtime is unavailable; use route-owned subscribeToInsurancePolicies() from insuranceService.');
    expect(policiesService).toContain('createInsurancePolicy as createInsurancePolicyThroughOwner');
    expect(policiesService).toContain('updateInsurancePolicy as updateInsurancePolicyThroughOwner');
    expect(policiesService).toContain('deleteInsurancePolicy as deleteInsurancePolicyThroughOwner');
    expect(policiesService).toContain('return createInsurancePolicyThroughOwner(input);');
    expect(policiesService).toContain('return updateInsurancePolicyThroughOwner(policyId, input);');
    expect(policiesService).toContain('return deleteInsurancePolicyThroughOwner(policyId);');
    expect(policiesService).toContain('return updateInsurancePolicyThroughOwner(policyId, {');
    expect(policiesService).not.toContain('buildInsuranceWritePayload');
    expect(policiesService).not.toContain("from(TABLE_NAME).select('*')");
    expect(policiesService).not.toContain(".eq('user_id', userId)");
    expect(policiesService).not.toContain(".lte('starts_at', today)");
    expect(policiesService).not.toContain(".gte('expires_at', today)");
    expect(policiesService).not.toContain('.channel(');
    expect(policiesService).not.toContain('.insert([payload])');
    expect(policiesService).not.toContain('.update(payload)');
    expect(policiesService).not.toContain('.delete()');
    expect(mobile).toContain('stats,');
    expect(mobile).toContain('currentLabel');
    expect(mobile).not.toContain("delta: 'LIVE'");
    expect(mobile).not.toContain('trend: \'LIVE\'');
    expect(mobile).not.toContain('chartData');
    expect(page).toContain('insurancePanelContext');
    expect(page).toContain('insuranceBillingContext');
    expect(page).toContain('billingFetchRequestRef');
    expect(page).toContain('getInsuranceBillingOutcomes');
    expect(page).toContain("subscribeToInsuranceBillingOutcomes(() => {");
    expect(page).toContain("'insurance_billing_route_context'");
    expect(page).toContain('billing: insuranceBillingContext');
    expect(page).toContain('insuranceRouteContextUpdated');
    expect(page).toContain('requestInsuranceRouteContext');
    expect(panel).toContain('insuranceContext');
    expect(panel).toContain('insuranceContext?.billing');
    expect(panel).toContain('billingContext.failed');
    expect(panel).not.toContain('getInsurancePage');
    expect(panel).not.toContain('getInsuranceBillingOutcomes');
    expect(panel).not.toContain('subscribeToInsurancePolicies');
    expect(panel).not.toContain('subscribeToInsuranceBillingOutcomes');
    expect(panel).toContain('aria-disabled={unavailable}');
    expect(panel).toContain("data-state={unavailable ? 'unavailable' : 'available'}");
    expect(panel).toContain('title="Add unavailable until policy authority is verified"');
    expect(panel).toContain('title="Export unavailable until report scope is verified"');
    expect(panel).toContain('tone="muted"');
    expect(panel).toContain('unavailable');
    expect(panel).toContain('Billing outcomes');
    expect(panel).toContain('Recent claims');
    expect(panel).not.toContain('bg-primary/25');
    expect(panel).not.toContain('shadow-[0_0_32px_hsl(var(--primary)/0.25)]');
    expect(panel).toContain('h-8 w-8 animate-pulse rounded-pill bg-muted/40');
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('openInsuranceModal'))");
    expect(panel).toContain('Insurance export is unavailable until report scope is verified.');
    expect(panel).not.toContain('getInsuranceStats');
    expect(panel).not.toContain('insuranceData');
    expect(panel).not.toContain('getInsurancePolicies');
    expect(panel).not.toContain("tone=\"primary\"");
    expect(panel).not.toContain('bg-primary/10 text-primary');
    expect(panel).not.toContain('uppercase tracking-wider');
    expect(contextPanel).toContain('<InsurancePanel insuranceContext={insuranceRouteContext} />');
    expect(contextPanel).toContain('insuranceRouteContextUpdated');
    expect(contextPanel).toContain('requestInsuranceRouteContext');
    expect(contextPanel).not.toContain('getInsuranceStats');
    expect(contextPanel).not.toContain('insuranceData={insurance}');
  });

  it('requires explicit capability props before Insurance density views expose commands', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const list = read('src/components/views/InsuranceListView.jsx');
    const table = read('src/components/views/InsuranceTableView.jsx');

    expect(gate).toContain('Renderer command capability cleanup on 2026-07-05');
    expect(gate).toContain('Insurance list/table density views now require explicit `canVerify`, `canDelete`, and `selectionEnabled` capability props');
    expect(page).toContain('canDelete={false}');
    expect(page).toContain('canVerify={false}');
    expect(page).toContain('selectionEnabled={false}');
    expect(list).toContain('canDelete = false');
    expect(list).toContain('canVerify = false');
    expect(list).toContain("const showVerifyAction = canVerify && typeof onVerify === 'function';");
    expect(list).toContain("const showDeleteAction = canDelete && typeof onDelete === 'function';");
    expect(table).toContain('canDelete = false');
    expect(table).toContain('canVerify = false');
    expect(table).toContain('selectionEnabled = false');
    expect(table).toContain("const canSelect = selectionEnabled && typeof onSelect === 'function' && typeof onSelectAll === 'function';");
    expect(table).toContain("const showVerifyAction = canVerify && typeof onVerify === 'function';");
    expect(table).toContain("const showDeleteAction = canDelete && typeof onDelete === 'function';");
    expect(table).toContain('const hasSecondaryActions = showVerifyAction || showDeleteAction;');
    expect(table).toContain('Policy details');
    expect(table).not.toContain('uppercase tracking');
  });

  it('keeps active Insurance filters aligned to the service-owned projection shape', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const service = read('src/services/insuranceService.js');

    expect(gate).toContain('First filter-shape cleanup on 2026-07-04 aligned the active Insurance reset path with the route-owned service contract');
    expect(gate).toContain('use `verified` instead of the dead `verification` key');
    expect(gate).toContain('empty arrays or empty date objects do not show false filtered states');
    expect(page).toContain('const EMPTY_INSURANCE_FILTERS = Object.freeze({');
    expect(page).toContain("status: [],");
    expect(page).toContain("type: [],");
    expect(page).toContain("verified: '',");
    expect(page).toContain("created_at: { start: '', end: '' },");
    expect(page).toContain("kpiFilter: 'all',");
    expect(page).toContain('const hasInsuranceFilterValue = (value) => {');
    expect(page).toContain('const hasActiveInsuranceFilters = (filters = {}) => (');
    expect(page).toContain('const [filters, setFilters] = useState(EMPTY_INSURANCE_FILTERS);');
    expect(page).toContain('const hasActiveFilters = useMemo(() => hasActiveInsuranceFilters(filters), [filters]);');
    expect(page).toContain('setFilters(EMPTY_INSURANCE_FILTERS)');
    expect(page).toContain('resetValues={EMPTY_INSURANCE_FILTERS}');
    expect(page).toContain('resetLabel="Clear"');
    expect(page).toContain("filters.kpiFilter === 'all' && !hasActiveFilters");
    expect(page).not.toContain("verification: ''");
    expect(page).not.toContain("setFilters({ kpiFilter: 'all'");
    expect(page).not.toContain('Object.keys(filters)');
    expect(service).toContain('const statusValues = normalizeFilterList(filter.status);');
    expect(service).toContain('const typeValues = normalizeFilterList(filter.type || filter.policy_type || filter.plan_type);');
    expect(service).toContain("if (filter.verified === 'verified' || filter.verified === true)");
    expect(service).toContain('const dateRange = filter.created_at;');
  });

  it('separates failed, denied, and empty Insurance reads without clearing stale route evidence', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const mobile = read('src/components/mobile/MobileInsurance.jsx');
    const panel = read('src/components/context/InsurancePanel.jsx');
    const modal = read('src/components/modals/InsuranceModal.jsx');
    const service = read('src/services/insuranceService.js');

    expect(gate).toContain('Failed-read state cleanup on 2026-07-05 changed `getInsurancePage()` and `getInsuranceBillingOutcomes()` to return explicit `failed: true`');
    expect(gate).toContain("reason: 'query_failed'");
    expect(gate).toContain('exactCounts: false');
    expect(gate).toContain('preserves the last loaded route projection during a failed refresh');
    expect(gate).toContain('Query failure, provider denial, and true empty are now separated in the active intake source.');
    expect(service).toContain('const buildInsuranceFailedPage = (error) => ({');
    expect(service).toContain('const buildInsuranceBillingFailedPage = (error) => ({');
    expect(service).toContain('failed: true');
    expect(service).toContain("reason: 'query_failed'");
    expect(service).toContain('exactCounts: false');
    expect(service).toContain('return buildInsuranceFailedPage(error);');
    expect(service).toContain('return buildInsuranceBillingFailedPage(error);');
    expect(page).toContain('if (page.failed) {');
    expect(page).toContain('setInsurancePage(prevPage => ({');
    expect(page).toContain('...prevPage,');
    expect(page).toContain('data-testid="insurance-degraded-state"');
    expect(page).toContain('Showing the last loaded policy rows until the route read works again.');
    expect(page).toContain('error && !hasDesktopRows');
    expect(page).toContain('error && !loading && !hasMobileRows');
    expect(page).toContain('error={error}');
    expect(page).toContain('onRetry={fetchInsurancePage}');
    expect(mobile).toContain('error = null');
    expect(mobile).toContain('onRetry');
    expect(mobile).toContain('data-testid="mobile-insurance-degraded-state"');
    expect(mobile).toContain('Showing the last loaded policy rows.');
    expect(panel).toContain('insuranceContext?.failed');
    expect(panel).toContain("insuranceContext?.denied ? 'Insurance context is unavailable for this role.' : null");
    expect(panel).toContain('policyError');
    expect(page).toContain('if (billingResult.failed) {');
    expect(panel).toContain('billingContext.failed');
    expect(modal).toContain('if (page.failed) {');
    expect(modal).toContain("setBillingError('Billing outcomes could not load.');");
  });

  it('guards Insurance route reads and realtime refresh against stale state mutation', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');

    expect(gate).toContain('Route realtime cleanup on 2026-07-05 added `isMountedRef`, `fetchRequestRef`, and `canUpdateRouteState()` guards to `InsuranceManagementPage.jsx`.');
    expect(gate).toContain('Route reads now ignore stale or unmounted responses before mutating rows, count, stats, loading, or error state');
    expect(gate).toContain('cleanup flips `active = false`, invalidates the current fetch generation, and unsubscribes the Supabase channel.');
    expect(page).toContain("import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';");
    expect(page).toContain('const isMountedRef = useRef(false);');
    expect(page).toContain('const fetchRequestRef = useRef(0);');
    expect(page).toContain('const requestId = fetchRequestRef.current + 1;');
    expect(page).toContain('fetchRequestRef.current = requestId;');
    expect(page).toContain('const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;');
    expect(page).toContain('if (!canUpdateRouteState()) return;');
    expect(page).toContain('isMountedRef.current = true;');
    expect(page).toContain('isMountedRef.current = false;');
    expect(page).toContain('fetchRequestRef.current += 1;');
    expect(page).toContain('let active = true;');
    expect(page).toContain('if (active && isMountedRef.current) {');
    expect(page).toContain('active = false;');
    expect(page).toContain('unsubscribe();');
  });

  it('guards route-owned Insurance billing context and keeps the panel render-only', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/InsuranceManagementPage.jsx');
    const panel = read('src/components/context/InsurancePanel.jsx');

    expect(gate).toContain('Right-panel billing route-context cleanup on 2026-07-06 moved the panel claim summary to the active route projection too');
    expect(gate).toContain('`InsurancePanel.jsx` no longer starts policy or billing reads');
    expect(gate).toContain('unsubscribes the route-owned billing channel.');
    expect(page).toContain('const billingFetchRequestRef = useRef(0);');
    expect(page).toContain('const requestId = billingFetchRequestRef.current + 1;');
    expect(page).toContain('billingFetchRequestRef.current = requestId;');
    expect(page).toContain('const canUpdateBillingState = () => isMountedRef.current && billingFetchRequestRef.current === requestId;');
    expect(page).toContain('if (!canUpdateBillingState()) return;');
    expect(page).toContain('billingFetchRequestRef.current += 1;');
    expect(page).toContain("subscribeToInsuranceBillingOutcomes(() => {");
    expect(page).toContain('fetchInsuranceBillingContext();');
    expect(page).toContain("'insurance_billing_route_context'");
    expect(page).toContain('unsubscribeBilling();');
    expect(panel).toContain("import React from 'react';");
    expect(panel).not.toContain('useEffect');
    expect(panel).not.toContain('useRef');
    expect(panel).not.toContain('useState');
    expect(panel).not.toContain('fetchRequestRef');
    expect(panel).not.toContain('canUpdatePanelState');
    expect(panel).not.toContain('unsubscribePolicies();');
    expect(panel).not.toContain("subscribeToInsurancePolicies(handleRealtimeRefresh, 'insurance_policies_context_panel')");
    expect(panel).not.toContain('unsubscribeBilling();');
    expect(panel).not.toContain('subscribeToInsuranceBillingOutcomes');
  });

  it('keeps hidden shell and global data acquisition closed after first cleanup', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const fab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = read('src/components/navigation/DynamicBottomBar.jsx');
    const contextAction = read('src/hooks/useContextAction.js');
    const pageDataAccess = read('src/config/pageDataAccess.js');
    const pageDataContext = read('src/contexts/PageDataContext.jsx');
    const hook = read('src/hooks/useInsurance.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('First cleanup excluded Insurance from global shell imports/cases and made the shared action page-owned.');
    expect(gate).toContain('First cleanup removed Insurance from unrelated admin startup domains and made `/insurance` route-owned.');
    expect(gate).toContain('Keep hidden insurance data acquisition closed in global FAB, mobile bottom action, unrelated `PageDataContext` startup domains, and right-panel handoffs.');
    expect(gate).toContain('Keep mobile policy rows read-only. Do not restore mobile edit/delete/verify, selection, or bulk props/buttons until admin policy command authority, receiver ownership, payload contract, authorization expectation, and app consequence are proved.');
    expect(fab).toContain("location.pathname.startsWith('/insurance')");
    expect(fab).not.toContain("import { useInsurance }");
    expect(fab).not.toContain("import { InsuranceModal }");
    expect(fab).not.toContain("case 'insurance'");
    expect(bottomBar).toContain("location.pathname.startsWith('/insurance')");
    expect(bottomBar).not.toContain("import { useInsurance }");
    expect(bottomBar).not.toContain('InsuranceModal');
    expect(bottomBar).not.toContain("case 'insurance'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openInsuranceModal'))");
    expect(contextAction).not.toContain("openModal('insurance')");
    expect(pageDataAccess).toContain("pathname === '/insurance'");
    expect(pageDataAccess).toContain("domains.push('organizations')");
    expect(pageDataAccess).not.toContain("domains.push('insurance', 'organizations')");
    expect(pageDataContext).toContain('getInsurancePage({ limit: 10, quiet: true })');
    expect(pageDataContext).toContain('setInsurancePageStats(page.stats || null)');
    expect(pageDataContext).not.toContain("from '../services/insurancePoliciesService'");
    expect(hook).not.toContain("console.log('Insurance policy change:', payload)");
    [
      'src/components/pages/InsuranceManagementPage.jsx',
      'src/components/mobile/MobileInsurance.jsx',
      'src/components/context/InsurancePanel.jsx',
      'src/components/modals/InsuranceModal.jsx',
      'src/components/views/InsuranceListView.jsx',
      'src/components/views/InsuranceTableView.jsx',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('blocks Requests-canon reuse until Insurance closes every required slot', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Insurance Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('Page 12 may not reuse Requests visual language until each slot below is proved, adapted, excluded, or marked legacy inactive');
    expect(gate).toContain('| Signal field | `getInsurancePage()` now owns policy rows, exact count, scoped stats, denied state, failed state, and stale-refresh degraded state, but the active UI still presents the old management/KPI opener.');
    expect(gate).toContain('| State choices | Old total/active/pending/expired/unverified KPIs and mobile metric chips are preserved as inventory; current stats are scoped but type/date taxonomy still needs product proof.');
    expect(gate).toContain('| Handled sheet | Grid/list/table density modes, pagination, search, and filters remain represented; route reads are now service-owned.');
    expect(gate).toContain('| Focused detail | `InsuranceModal.jsx` uses shared `ModalShell` and is read-only, with policy evidence, linked billing outcomes, and card-reference acknowledgement without direct signed-URL image preview.');
    expect(gate).toContain('| Route-owned action | Header Add, edit, delete, verify, bulk delete, export, and global actions now route to unavailable feedback or are hidden; right-panel Add and Export are muted and marked unavailable instead of primary/live.');
    expect(gate).toContain('`source truth -> receiver -> app consequence` are proved.');
    expect(gate).toContain('| Shared modal/sheet | `InsuranceModal` uses `ModalShell`; `FilterSheet` and `AnalyticsModal` remain as old secondary surfaces.');
    expect(gate).toContain('| Mobile recomposition | `MobileInsurance` keeps pull-to-refresh, load more, search, filters, analytics, row reveal, scoped stats, and read-only Details, and removes fake `LIVE`/chart data, local-only visible-row filtering, plus mobile edit/delete/verify and selection controls.');
    expect(gate).toContain('| Data quieting | Global FAB/bottom action imports are removed, `/insurance` is route-owned, PageData startup no longer loads insurance by default, the remaining lazy/manual PageData read now uses `getInsurancePage()`, mobile search/KPI controls write route filters instead of filtering a partial visible list, route reads/realtime refresh use stale-result/unmount guards, right-panel policy rows/stats and billing rows/stats now come from `insurancePanelContext`, legacy duplicate read/realtime/coverage helpers fail closed, legacy service/hook list/detail reads fail closed without auto-fetch or auto-subscription, legacy duplicate write export names delegate to fail-closed `insuranceService.js` commands, legacy payload construction fails closed, legacy `useInsurance` commands fail closed before local mutation, and the old card-upload export fails closed instead of writing Storage.');
    expect(gate).toContain('Storage path ownership for re-enabling uploads, admin policy command authority, and billing command ownership remain blockers.');
    expect(gate).toContain('| Local semantic color | Current active page still contains old card geometry and some semantic destructive/ring patterns and is not in the default visual hardgate; right-panel loading plus ordinary policy evidence, verified marks, filter feedback, mobile details, list/table icons, and modal evidence chrome have moved off brand-primary.');
    expect(gate).toContain('| Interaction feedback | Unavailable command feedback exists through toasts, loading/error states exist, and mobile row reveal remains.');
    expect(gate).toContain('Default hardgate admission guard on 2026-07-05 keeps Insurance outside `scripts/check-ui-surface-hardgate.js`');
    expect(gate).toContain('Rendered intake proof is runtime proof only, not visual admission.');
    expect(gate).toContain('Promotion rule: the first Insurance visual pass must close this blocker map before adding Page 12 to the default hardgate.');
    [
      'src/components/pages/InsuranceManagementPage.jsx',
      'src/components/mobile/MobileInsurance.jsx',
      'src/components/context/InsurancePanel.jsx',
      'src/components/modals/InsuranceModal.jsx',
      'src/components/views/InsuranceListView.jsx',
      'src/components/views/InsuranceTableView.jsx',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });
});
