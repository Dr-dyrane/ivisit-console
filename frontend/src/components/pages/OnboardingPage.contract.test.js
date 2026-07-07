import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Onboarding Page 21 intake contract', () => {
  it('keeps Onboarding in intake only as a public registration-shell exception', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 21 Intake Audit - Onboarding');
    expect(gate).toContain('Onboarding at `/onboarding` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No full visual revamp, registration-flow rewrite, account/org/facility creation promotion, document upload promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Onboarding visual pass must close this blocker map before adding `OnboardingPage.jsx`, `OnboardingContext.jsx`, `OnboardingWizard.jsx`, or `onboardingService.js` to the default hardgate.');

    expect(app).toContain('<Route path="/onboarding" element={<OnboardingPage />} />');
    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/onboarding': {");
    expect(routes).toContain("'/onboarding-success': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/onboarding" replace />;');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");

    [
      'src/components/pages/OnboardingPage.jsx',
      'src/contexts/OnboardingContext.jsx',
      'src/components/onboarding/OnboardingWizard.jsx',
      'src/services/onboardingService.js',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('preserves the old Onboarding wizard and service inventory while documenting active blockers', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/OnboardingPage.jsx');
    const oldContext = gitShowHead('frontend/src/contexts/OnboardingContext.jsx');
    const oldWizard = gitShowHead('frontend/src/components/onboarding/OnboardingWizard.jsx');
    const oldService = gitShowHead('frontend/src/services/onboardingService.js');
    const page = read('src/components/pages/OnboardingPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');
    const service = read('src/services/onboardingService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/OnboardingPage.jsx`');
    expect(gate).toContain('Back to Login, iVisit header, theme toggle, `Join iVisit`, registration copy, `OnboardingProvider`, `OnboardingWizard`');
    expect(gate).toContain('selected hospital autofill through `selectHospital()`, success navigation to `/onboarding-success`, and shell-hidden public route handling.');
    expect(gate).toContain('First source cleanup on 2026-07-06 replaced the visible footer copyright mojibake in `OnboardingPage.jsx` with source-safe `&copy;`.');
    expect(gate).toContain('Second source cleanup on 2026-07-06 kept the public wizard flow but added a shared submit lock and awaited the final submit receiver call.');
    expect(gate).toContain('Onboarding public-registration squircle/source-feedback cleanup on 2026-07-06 converted `OnboardingPage.jsx` and `OnboardingWizard.jsx` local route/wizard chrome to semantic radius tokens');

    for (const source of [oldPage, page]) {
      expect(source).toContain("const { user, loading: authLoading, isOnboarding, isSkippedOnboarding } = useAuth();");
      expect(source).toContain("navigate('/', { replace: true });");
      expect(source).toContain('Back to Login');
      expect(source).toContain('Join iVisit');
      expect(source).toContain('<OnboardingProvider>');
      expect(source).toContain('<OnboardingWizard />');
      expect(source).toContain('<ThemeToggle size="xs" />');
    }

    expect(oldPage).toContain('Register your healthcare organization and start providing emergency response services.');
    expect(page).toContain('Tell us about your healthcare organization so we can set up the review.');
    expect(page).not.toContain('Register your healthcare organization and start providing emergency response services.');
    expect(page).toContain('&copy; {new Date().getFullYear()} iVisit. All rights reserved.');
    expect(page).not.toContain(String.fromCharCode(0xc2, 0xa9));

    for (const source of [oldContext, context]) {
      expect(source).toContain("const STORAGE_KEY = 'ivisit_onboarding_data';");
      expect(source).toContain("const STEP_KEY = 'ivisit_onboarding_step';");
      expect(source).toContain('selectedHospitalId: null');
      expect(source).toContain('isClaimingExisting: false');
      expect(source).toContain('const createAdminAccount = useCallback(async () => {');
      expect(source).toContain('onboardingService.createAdminAccount(formData)');
      expect(source).toContain('const submitOnboarding = useCallback(async () => {');
      expect(source).toContain('onboardingService.submitOnboarding(formData)');
      expect(source).toContain("navigate('/onboarding-success', { state: { result } });");
      expect(source).toContain('const skipOnboarding = useCallback(async () => {');
      expect(source).toContain('onboardingService.skipOnboarding()');
      expect(source).toContain('window.location.reload();');
      expect(source).toContain('const selectHospital = useCallback((hospital) => {');
      expect(source).toContain('selectedHospitalId: hospital.id');
      expect(source).toContain('isClaimingExisting: true');
    }

    for (const source of [oldWizard, wizard]) {
      expect(source).toContain('submitOnboarding();');
      expect(source).toContain('await createAdminAccount();');
      expect(source).toContain('onClick={skipOnboarding}');
      expect(source).toContain("currentStepConfig?.id === 'account'");
    }

    expect(context).toContain('const submittingRef = useRef(false);');
    expect(context).toContain('const beginSubmitting = useCallback(() => {');
    expect(context).toContain('if (submittingRef.current) {');
    expect(context).toContain("return { success: false, message: 'Submission already in progress' };");
    expect(context).toContain('const endSubmitting = useCallback(() => {');
    expect(wizard).toContain('await submitOnboarding();');

    for (const source of [oldService, service]) {
      expect(source).toContain('supabase.auth.signUp({');
      expect(source).toContain("onboarding_status: 'pending'");
      expect(source).toContain(".from('profiles')");
      expect(source).toContain('submitOnboarding: async (formData) => {');
      expect(source).toContain(".from('hospitals')");
      expect(source).toContain('.insert(orgData)');
      expect(source).toContain("role: 'org_admin'");
      expect(source).toContain('organization_id: organization.id');
      expect(source).toContain("onboarding_status: 'complete'");
      expect(source).toContain(".from('documents')");
      expect(source).toContain('.upload(filePath, doc.file)');
      expect(source).toContain("const { getDisplayId } = await import('./displayIdService');");
      expect(source).toContain('skipOnboarding: async () => {');
      expect(source).toContain("role: 'viewer'");
      expect(source).toContain('getPendingOrganizations: async () => {');
      expect(source).toContain('approveOrganization: async (organizationId) => {');
      expect(source).toContain('rejectOrganization: async (organizationId, reason) => {');
    }

    expect(service.match(/searchHospitalsByName: async/g)).toHaveLength(2);
    expect(service).not.toContain('selectedHospitalId');
    expect(service).not.toContain('isClaimingExisting');
    expect(gate).toContain('The duplicate `searchHospitalsByName` definitions also mean the later schema-safe search overrides the earlier pending/claimed status logic.');
    expect(gate).toContain('`OnboardingContext.jsx` stores `selectedHospitalId` and `isClaimingExisting`, but `submitOnboarding()` does not consume either field and always inserts a new `hospitals` row.');
  });

  it('blocks Onboarding canon reuse until account, identity, claim, storage, and verification proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/OnboardingPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');

    expect(gate).toContain('Onboarding intake decisions:');
    expect(gate).toContain('Admin account receiver: partially proved, not admitted.');
    expect(gate).toContain('Organization identity: not admitted.');
    expect(gate).toContain('Existing facility claim: not admitted.');
    expect(gate).toContain('Storage documents: not admitted.');
    expect(gate).toContain('Verification/admin consequence: not admitted.');
    expect(gate).toContain('Skip onboarding: safer, not admitted.');
    expect(gate).toContain('Success handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: intentionally absent. `OnboardingPage.jsx`, `OnboardingContext.jsx`, `OnboardingWizard.jsx`, and `onboardingService.js` stay out of `scripts/check-ui-surface-hardgate.js` until the public registration surface enters a guarded implementation pass.');
    expect(gate).toContain('Onboarding Requests-canon blocker map:');
    expect(gate).toContain('Page 21 may not reuse Requests visual language because Onboarding is a public registration wizard, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth/registration copy or flow order.');
    expect(gate).toContain('Add hardgate coverage only after the public onboarding visual system is converted to shared tokens, squircle geometry, structural loading/error states, and intentional motion.');

    expect(app).not.toContain('<Route path="/onboarding" element={<ProtectedRoute');
    [page, context, wizard].forEach((source) => {
      expect(source).not.toContain('usePageHeader');
      expect(source).not.toContain('usePageShell');
      expect(source).not.toContain('ContextPanel');
    });
  });

  it('keeps the focused Onboarding route and wizard cleanup aligned to the squircle design system without admitting the flow', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingPage.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Onboarding public-registration squircle/source-feedback cleanup on 2026-07-06 converted `OnboardingPage.jsx` and `OnboardingWizard.jsx` local route/wizard chrome to semantic radius tokens');
    expect(gate).toContain('This is focused strict-radius/source-voice proof for the route shell and wizard chrome only; it does not admit Onboarding');
    expect(gate).toContain('does not certify the onboarding step form components');

    expect(page).toContain('<Loader2 className="h-8 w-8 animate-spin text-primary" />');
    expect(page).toContain('Tell us about your healthcare organization so we can set up the review.');
    expect(page).not.toContain('emergency response services');

    for (const token of ['rounded-card', 'rounded-inner', 'rounded-icon', 'rounded-pill']) {
      expect(wizard).toContain(token);
    }

    for (const source of [page, wizard]) {
      for (const legacyToken of [
        'rounded-2xl',
        'rounded-xl',
        'rounded-full',
        'rounded-[',
        'border-',
        'ring-',
        'outline-',
        'tracking-',
        'uppercase',
        'bg-orb',
        'squircle-xl',
        'geo-',
        'Registration Steps',
      ]) {
        expect(source).not.toContain(legacyToken);
      }
    }

    expect(wizard).toContain('Registration steps');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).not.toContain('src/components/pages/OnboardingPage.jsx');
    expect(hardgate).not.toContain('src/components/onboarding/OnboardingWizard.jsx');
  });
});
