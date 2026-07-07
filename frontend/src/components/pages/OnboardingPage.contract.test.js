import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

const ONBOARDING_SURFACE_FILES = [
  'src/components/pages/OnboardingPage.jsx',
  'src/components/onboarding/OnboardingWizard.jsx',
  'src/components/onboarding/OrganizationTypeStep.jsx',
  'src/components/onboarding/AdminAccountStep.jsx',
  'src/components/onboarding/OrganizationDetailsStep.jsx',
  'src/components/onboarding/InitialSetupStep.jsx',
  'src/components/onboarding/VerificationStep.jsx',
];

describe('Onboarding Page 21 admission contract', () => {
  it('admits the Onboarding visual surface as a guarded public registration exception and hardgates the seven surface files', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 21 Admission - Onboarding');
    expect(gate).toContain('the Onboarding public-registration visual surface is admitted for guarded continuation on 2026-07-07');
    expect(gate).toContain('is admitted under the Today/Requests canon as a public registration surface, visual surface only.');
    expect(gate).toContain('The wizard must not be submitted from a proof session because submit performs live account/org/Storage/verification writes.');
    expect(gate).toContain('First Onboarding visual pass on 2026-07-07 admitted the Onboarding visual surface');
    expect(gate).toContain('The seven Onboarding surface files (`OnboardingPage.jsx`, `OnboardingWizard.jsx`, and the five step components) are now in the default UI hardgate');
    expect(gate).toContain('Onboarding admission scope guard: this admission is visual surface only.');
    expect(gate).toContain('Rendered proof, 2026-07-07: signed out of the local admin session');

    // Route mounting is unchanged: still a public shell route outside ProtectedRoute.
    expect(app).toContain('<Route path="/onboarding" element={<OnboardingPage />} />');
    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).not.toContain('<Route path="/onboarding" element={<ProtectedRoute');
    expect(routes).toContain("'/onboarding': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/onboarding" replace />;');

    // The seven visual surface files are now in the default hardgate.
    ONBOARDING_SURFACE_FILES.forEach((file) => {
      expect(hardgate).toContain(file);
    });
    // Backend-authority files stay out of the hardgate until receivers are admitted.
    expect(hardgate).not.toContain('src/contexts/OnboardingContext.jsx');
    expect(hardgate).not.toContain('src/services/onboardingService.js');
  });

  it('preserves the old Onboarding wizard, service inventory, and receiver flow from the baseline', () => {
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

    // Wizard still drives the same receivers; only visual chrome changed.
    for (const source of [oldWizard, wizard]) {
      expect(source).toContain('submitOnboarding();');
      expect(source).toContain('await createAdminAccount();');
      expect(source).toContain('onClick={skipOnboarding}');
      expect(source).toContain("currentStepConfig?.id === 'account'");
    }
    expect(context).toContain('const submittingRef = useRef(false);');
    expect(context).toContain('const beginSubmitting = useCallback(() => {');
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
      expect(source).toContain('skipOnboarding: async () => {');
      expect(source).toContain("role: 'viewer'");
    }
    // The onboarding service is untouched by the visual pass.
    expect(service.match(/searchHospitalsByName: async/g)).toHaveLength(2);
    expect(service).not.toContain('selectedHospitalId');
    expect(service).not.toContain('isClaimingExisting');
  });

  it('keeps registration-flow receivers blocked until backend authority proof closes', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const context = read('src/contexts/OnboardingContext.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');
    const page = read('src/components/pages/OnboardingPage.jsx');

    expect(gate).toContain('Onboarding intake decisions:');
    expect(gate).toContain('Admin account receiver: partially proved, not admitted.');
    expect(gate).toContain('Organization identity: not admitted.');
    expect(gate).toContain('Existing facility claim: not admitted.');
    expect(gate).toContain('Storage documents: not admitted.');
    expect(gate).toContain('Verification/admin consequence: not admitted.');
    expect(gate).toContain('Skip onboarding: safer, not admitted.');
    expect(gate).toContain('Success handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: visual surface admitted 2026-07-07.');
    expect(gate).toContain('The backend-authority files `OnboardingContext.jsx` and `onboardingService.js` stay out of the hardgate until the registration-flow receivers are proved and admitted.');
    expect(gate).toContain('The duplicate `searchHospitalsByName` definitions also mean the later schema-safe search overrides the earlier pending/claimed status logic.');
    expect(gate).toContain('`OnboardingContext.jsx` stores `selectedHospitalId` and `isClaimingExisting`, but `submitOnboarding()` does not consume either field and always inserts a new `hospitals` row.');

    // The admitted visual surface must not reach for authenticated console shell primitives.
    [page, context, wizard].forEach((source) => {
      expect(source).not.toContain('usePageHeader');
      expect(source).not.toContain('usePageShell');
      expect(source).not.toContain('ContextPanel');
    });
  });

  it('holds the whole Onboarding surface to the squircle canon with no decorative or brand-red chrome', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingPage.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('First Onboarding visual pass on 2026-07-07 admitted the Onboarding visual surface');
    expect(gate).toContain('every `bg-primary`/`text-primary`/`border-primary` accent was neutralized');
    expect(gate).toContain('the expanded organization-type card rendered with a neutral white CTA (`rgb(255, 255, 255)`, formerly a red `bg-primary` play button)');

    // The route spinner is now a calm muted tone, not the red primary.
    expect(page).toContain('<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />');
    expect(page).not.toContain('animate-spin text-primary');
    // Canonical radius vocabulary is present in the wizard shell.
    for (const token of ['rounded-card', 'rounded-inner', 'rounded-icon', 'rounded-pill']) {
      expect(wizard).toContain(token);
    }
    expect(wizard).toContain('Registration steps');

    // No decorative, brand-red, glass, gradient, or non-canonical radius chrome in any surface file.
    // ('uppercase' is intentionally omitted: AdminAccountStep uses it as a password-strength object key/label, not a CSS class.)
    const forbidden = [
      'rounded-2xl', 'rounded-3xl', 'rounded-xl', 'rounded-lg', 'rounded-full', 'rounded-[',
      'border-', 'ring-', 'outline-', 'divide-', 'tracking-', 'bg-orb', 'squircle-xl', 'geo-',
      'bg-primary', 'text-primary', 'border-primary', 'backdrop-blur', 'bg-gradient',
      'shadow-premium', 'shadow-xl', 'shadow-2xl', 'shadow-primary', 'bg-white/',
      'blur(1px)', 'blur(2px)', 'variant="secondary"',
    ];
    for (const file of ONBOARDING_SURFACE_FILES) {
      const source = read(file);
      for (const legacyToken of forbidden) {
        expect({ file, legacyToken, present: source.includes(legacyToken) })
          .toEqual({ file, legacyToken, present: false });
      }
    }

    // The hardgate still enforces the strict-radius/geometry rules and now covers the surface files.
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    ONBOARDING_SURFACE_FILES.forEach((file) => {
      expect(hardgate).toContain(file);
    });
  });
});
