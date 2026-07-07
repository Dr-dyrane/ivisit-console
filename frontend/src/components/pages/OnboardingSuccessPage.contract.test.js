import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Onboarding Success Page 22 admission contract', () => {
  it('admits the Onboarding Success visual surface as a public confirmation-recovery exception in the hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 22 Admission - Onboarding Success');
    expect(gate).toContain('`OnboardingSuccessPage` is admitted under the Today/Requests canon as a public confirmation-recovery surface only.');
    expect(gate).toContain('First Onboarding Success visual pass on 2026-07-07 admitted the `OnboardingSuccessPage` visual surface.');
    expect(gate).toContain('Promotion note: the first Onboarding Success visual pass is complete.');

    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/onboarding-success': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");

    // The confirmation surface is now in the default UI hardgate.
    expect(hardgate).toContain('src/components/pages/OnboardingSuccessPage.jsx');
  });

  it('preserves the old success handoff inventory while documenting the converted visual surface', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/OnboardingSuccessPage.jsx');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');
    const service = read('src/services/onboardingService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/OnboardingSuccessPage.jsx`');
    expect(gate).toContain('`useLocation()` state read, optional organization/user display ID cards, `Registration Submitted!`');
    expect(gate).toContain('`Verification in 24-48 hours`, `Start using iVisit`, `Go to Dashboard`, `mailto:support@ivisit.ng`, and no route-owned data refetch when `location.state` is missing.');
    expect(gate).toContain('First missing-state safety cleanup on 2026-07-06 kept the normal submitted-registration view behind `result.success`');
    expect(gate).toContain('Onboarding Success preservation ledger:');

    for (const source of [oldPage, page]) {
      expect(source).toContain('const result = location.state?.result;');
      expect(source).toContain('const organization = result?.organization;');
      expect(source).toContain('const user = result?.user;');
      expect(source).toContain('<title>Registration Submitted | iVisit Console</title>');
      expect(source).toContain('What happens next?');
      expect(source).toContain('<Link to="/">');
      expect(source).toContain('href="mailto:support@ivisit.ng"');
      expect(source).toContain('Contact Support');
    }

    // Preservation baseline (f31f29f) still holds the OLD success handoff inventory.
    expect(oldPage).toContain('Registration Submitted!');
    expect(oldPage).toContain('Your organization registration is being reviewed.');
    expect(oldPage).toContain('Organization Identity');
    expect(oldPage).toContain('Administrator Identity');
    expect(oldPage).toContain('Verification in 24-48 hours');
    expect(oldPage).toContain('Start using iVisit');
    expect(oldPage).toContain('You can explore the dashboard while verification is pending');
    expect(oldPage).toContain('Go to Dashboard');
    expect(oldPage).not.toContain('const hasSubmissionResult = Boolean(result?.success);');
    expect(oldPage).not.toContain('Registration status unavailable');

    // Active page keeps the honest converted copy + both branches.
    expect(page).toContain('Registration submitted');
    expect(page).toContain('We received your registration details.');
    expect(page).toContain('Organization ID');
    expect(page).toContain('Administrator ID');
    expect(page).toContain('Review follows the admin queue');
    expect(page).toContain('We will use the submitted details for review.');
    expect(page).toContain('Console access depends on your account state');
    expect(page).toContain('If the console asks you to sign in or continue setup, follow that prompt.');
    expect(page).toContain('Open console');
    expect(page).toContain('const hasSubmissionResult = Boolean(result?.success);');
    expect(page).toContain('!hasSubmissionResult');
    expect(page).toContain('Registration status unavailable');
    expect(page).toContain('Open this page from the registration flow so we can show your submission details.');
    expect(page).toContain('<Link to="/onboarding">');
    expect(page).toContain('Continue registration');
    expect(page).not.toContain('Registration Submitted!');
    expect(page).not.toContain('Your organization registration is being reviewed.');
    expect(page).not.toContain('Organization Identity');
    expect(page).not.toContain('Administrator Identity');
    expect(page).not.toContain('Verification in 24-48 hours');
    expect(page).not.toContain('Start using iVisit');
    expect(page).not.toContain('You can explore the dashboard while verification is pending');
    expect(page).not.toContain('Go to Dashboard');
    expect(page).not.toContain('supabase');
    expect(page).not.toContain('getDisplayId');
    expect(page).not.toContain('useEffect');
    expect(page).not.toContain('role="status"');

    expect(context).toContain("navigate('/onboarding-success', { state: { result } });");
    expect(service).toContain("const { getDisplayId } = await import('./displayIdService');");
    expect(service).toContain('const orgDisplayId = await getDisplayId(organization.id);');
    expect(service).toContain("message: 'Registration submitted successfully'");

    expect(gate).toContain('Success-state source: excluded until receiver proof.');
    expect(gate).toContain('Review timing and dashboard-access: excluded until receiver proof.');
    expect(gate).toContain('Direct-link/refresh behavior: proven degraded state.');
  });

  it('records the Onboarding Success admission decisions with backend/Page-21 work still excluded', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');

    expect(gate).toContain('Onboarding Success admission decisions:');
    expect(gate).toContain('Visual surface: admitted.');
    expect(gate).toContain('Local semantic color: admitted calm.');
    expect(gate).toContain('Display IDs: excluded until receiver proof.');
    expect(gate).toContain('Support handoff: preserved as a simple fallback.');
    expect(gate).toContain('Shell/layout: proven public-shell exception.');
    expect(gate).toContain('Hardgate: `OnboardingSuccessPage.jsx` is now in the default `scripts/check-ui-surface-hardgate.js` set and passes strict radius.');
    expect(gate).toContain('Rendered proof, 2026-07-07:');
    expect(gate).toContain('Onboarding Success Requests-canon blocker map:');
    expect(gate).toContain('Page 22 may not reuse Requests visual language because Onboarding Success is a public confirmation handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth/registration copy or flow order.');

    expect(app).not.toContain('<Route path="/onboarding-success" element={<ProtectedRoute');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });

  it('keeps the Onboarding Success surface on canonical calm tokens with no decorative chrome', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Onboarding Success public-confirmation squircle/source-feedback cleanup on 2026-07-06 converted `OnboardingSuccessPage.jsx` local confirmation chrome to semantic radius tokens');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-pill']) {
      expect(page).toContain(token);
    }

    for (const removed of [
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
      'green-500',
      'orange-500',
      'backdrop-blur',
      'shadow-premium',
      'pulse-dot',
      'bg-gradient',
      'bg-white',
      'Verification in 24-48 hours',
      'Start using iVisit',
      'Go to Dashboard',
    ]) {
      expect(page).not.toContain(removed);
    }

    expect(page).toContain('Registration submitted');
    expect(page).toContain('Open console');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).toContain('src/components/pages/OnboardingSuccessPage.jsx');
  });
});
