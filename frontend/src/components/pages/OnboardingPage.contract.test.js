import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

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
  it('keeps Onboarding in the public shell and its visual files in the hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 21 Admission - Onboarding');
    expect(gate).toContain('Onboarding receiver fail-closed correction on 2026-07-12');
    expect(app).toContain('<Route path="/onboarding" element={<OnboardingPage />} />');
    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).not.toContain('<Route path="/onboarding" element={<ProtectedRoute');
    expect(routes).toContain("'/onboarding': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/onboarding" replace />;');

    ONBOARDING_SURFACE_FILES.forEach((file) => expect(hardgate).toContain(file));
    expect(hardgate).not.toContain('src/contexts/OnboardingContext.jsx');
    expect(hardgate).not.toContain('src/services/onboardingService.js');
  });

  it('keeps every unproved registration receiver unreachable from the active route', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingPage.jsx');

    expect(gate).toContain('found no approved organization-provisioning or existing-facility-claim receiver');
    expect(gate).toContain('no longer mounts `OnboardingProvider` or `OnboardingWizard`');
    expect(gate).toContain('The dormant wizard/context/service inventory remains in source for a later receiver-backed pass; it is not active product behavior.');

    expect(page).not.toContain('OnboardingContext');
    expect(page).not.toContain('OnboardingProvider');
    expect(page).not.toContain('OnboardingWizard');
    expect(page).not.toContain('onboardingService');
    expect(page).not.toContain('supabase');
    expect(page).not.toContain('createAdminAccount');
    expect(page).not.toContain('submitOnboarding');
    expect(page).not.toContain('skipOnboarding');
  });

  it('retains the dormant flow inventory without promoting it as mounted behavior', () => {
    const context = read('src/contexts/OnboardingContext.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');
    const service = read('src/services/onboardingService.js');

    expect(context).toContain('onboardingService.createAdminAccount(formData)');
    expect(context).toContain('onboardingService.submitOnboarding(formData)');
    expect(context).toContain('onboardingService.skipOnboarding()');
    expect(context).toContain("navigate('/onboarding-success', { state: { result } });");
    expect(wizard).toContain('await createAdminAccount();');
    expect(wizard).toContain('await submitOnboarding();');
    expect(service).toContain('supabase.auth.signUp({');
    expect(service).toContain(".from('hospitals')");
    expect(service).toContain('.insert(orgData)');
    expect(service).toContain('organization_id: organization.id');
    expect(service).not.toContain('provisioningVerified');
  });

  it('offers only honest recovery actions with immediate feedback', () => {
    const page = read('src/components/pages/OnboardingPage.jsx');

    expect(page).toContain('const OnboardingLoadingState = () => (');
    expect(page).toContain('aria-label="Checking registration access"');
    expect(page).toContain('animate-pulse');
    expect(page).toContain('Registration unavailable');
    expect(page).toContain('New organization setup is paused');
    expect(page).toContain('Existing team members can still sign in. Contact support for help setting up a new organization.');
    expect(page).toContain('<Link to="/login"');
    expect(page).toContain('href="mailto:support@ivisit.ng"');
    expect(page).toContain('await signOut();');
    expect(page).toContain("navigate('/login', { replace: true });");
    expect(page).toContain('aria-busy={leaving}');
    expect(page).toContain("data-state={leaving ? 'pending' : 'ready'}");
    expect(page).toContain('<ThemeToggle size="xs" />');
  });

  it('keeps the public state on canonical calm geometry', () => {
    const page = read('src/components/pages/OnboardingPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button', 'rounded-pill']) {
      expect(page).toContain(token);
    }
    for (const forbidden of [
      'rounded-2xl', 'rounded-3xl', 'rounded-xl', 'rounded-lg', 'rounded-full', 'rounded-[',
      'border-', 'ring-', 'outline-', 'tracking-', 'bg-orb', 'squircle-xl', 'geo-',
      'bg-primary', 'text-primary', 'border-primary', 'backdrop-blur', 'bg-gradient',
      'shadow-premium', 'shadow-xl', 'shadow-2xl', 'shadow-primary',
    ]) {
      expect(page).not.toContain(forbidden);
    }
    expect(page).not.toContain('fixed bottom-0');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
    expect(hardgate).toContain('src/components/pages/OnboardingPage.jsx');
  });
});
