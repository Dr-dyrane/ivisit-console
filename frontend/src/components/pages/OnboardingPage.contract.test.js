import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const ONBOARDING_SURFACE_FILES = [
  'src/components/pages/OnboardingPage.jsx',
  'src/components/onboarding/OnboardingWizard.jsx',
  'src/components/onboarding/OrganizationTypeStep.jsx',
  'src/components/onboarding/AdminAccountStep.jsx',
  'src/components/onboarding/OrganizationDetailsStep.jsx',
  'src/components/onboarding/VerificationStep.jsx',
];

describe('Onboarding Page 21 receiver contract', () => {
  it('keeps the four-step registration flow in the public shell and visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 21 Admission - Onboarding');
    expect(gate).toContain('Onboarding receiver admission on 2026-07-12');
    expect(app).toContain('<Route path="/onboarding" element={<OnboardingPage />} />');
    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).not.toContain('<Route path="/onboarding" element={<ProtectedRoute');
    expect(routes).toContain("'/onboarding': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/onboarding" replace />;');

    ONBOARDING_SURFACE_FILES.forEach((file) => expect(hardgate).toContain(file));
    expect(hardgate).not.toContain('src/components/onboarding/InitialSetupStep.jsx');
  });

  it('mounts the real wizard and removes the old skip and setup step paths', () => {
    const page = read('src/components/pages/OnboardingPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');

    expect(page).toContain('<OnboardingProvider>');
    expect(page).toContain('<OnboardingWizard />');
    expect(page).toContain("profile?.onboarding_status === 'complete'");
    expect(context).toContain("{ id: 'account', title: 'Account'");
    expect(context).toContain("{ id: 'organization', title: 'Organization'");
    expect(context).toContain("{ id: 'essentials', title: 'Essentials'");
    expect(context).toContain("{ id: 'review', title: 'Review'");
    expect(context).toContain('if (currentStep === 0) setCurrentStep(1);');
    expect(context).toContain("const persisted = { ...formData, adminPassword: '', documents: [] };");
    expect(context).not.toContain('skipOnboarding');
    expect(wizard).not.toContain('InitialSetupStep');
    expect(wizard).not.toContain('Skip');
    expect(wizard).toContain("if (currentStepConfig.id === 'account') return createAdminAccount();");
    expect(wizard).toContain('if (isLastStep) return submitOnboarding();');
  });

  it('uses canonical Auth, private Storage, and atomic provisioning receivers only', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const service = read('src/services/onboardingService.js');
    const organizationStep = read('src/components/onboarding/OrganizationTypeStep.jsx');

    expect(gate).toContain('Canonical provisioning receiver: admitted.');
    expect(gate).toContain('Existing-facility ownership: support/admin review only.');
    expect(service).toContain('supabase.auth.signUp({');
    expect(service).toContain('data: { full_name: fullName }');
    expect(service).not.toContain('data: { role:');
    expect(service).toContain("supabase.rpc('search_onboarding_facilities'");
    expect(service).toContain("supabase.rpc('get_console_identity_projection')");
    expect(service).toContain("supabase.rpc('provision_console_organization'");
    expect(service).toContain('data?.provisioningVerified !== true');
    expect(service).toContain("return `onboarding/${userId}/${randomId}.${extension}`;");
    expect(service).toContain('const MAX_DOCUMENTS = 3;');
    expect(service).toContain('await removeUploadedDocuments');
    expect(service).not.toContain(".from('hospitals')");
    expect(service).not.toContain(".from('profiles')");
    expect(service).not.toContain('.insert(');

    expect(organizationStep).toContain("const isValid = !isExistingMode");
    expect(organizationStep).toContain('Existing access needs review');
    expect(organizationStep).toContain('Ask the current administrator to invite you');
  });

  it('provides structural loading and immediate submit feedback on calm geometry', () => {
    const page = read('src/components/pages/OnboardingPage.jsx');
    const wizard = read('src/components/onboarding/OnboardingWizard.jsx');

    expect(page).toContain('const OnboardingLoadingState = () => (');
    expect(page).toContain('aria-label="Preparing registration"');
    expect(page).toContain('animate-pulse');
    expect(page).toContain('aria-busy={leaving}');
    expect(page).toContain('<ThemeToggle size="xs" />');
    expect(wizard).toContain('aria-busy={isSubmitting}');
    expect(wizard).toContain("data-state={isSubmitting ? 'pending' : 'ready'}");
    expect(wizard).toContain("isLastStep ? 'Submitting' : 'Please wait'");

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button', 'rounded-pill']) {
      expect(`${page}\n${wizard}`).toContain(token);
    }
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });
});
