import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Onboarding Success Page 22 intake contract', () => {
  it('keeps Onboarding Success in intake only as a public confirmation-shell exception', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 22 Intake Audit - Onboarding Success');
    expect(gate).toContain('Onboarding Success at `/onboarding-success` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No full visual revamp, success-flow rewrite, dashboard-access promise, review-timing promise, display-ID promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Onboarding Success visual pass must close this blocker map before adding `OnboardingSuccessPage.jsx` to the default hardgate.');

    expect(app).toContain('<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/onboarding-success': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).not.toContain('src/components/pages/OnboardingSuccessPage.jsx');
  });

  it('preserves the old success handoff inventory while documenting missing-state blockers', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/OnboardingSuccessPage.jsx');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');
    const service = read('src/services/onboardingService.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/OnboardingSuccessPage.jsx`');
    expect(gate).toContain('`useLocation()` state read, optional organization/user display ID cards, `Registration Submitted!`');
    expect(gate).toContain('`Verification in 24-48 hours`, `Start using iVisit`, `Go to Dashboard`, `mailto:support@ivisit.ng`, and no route-owned data refetch when `location.state` is missing.');
    expect(gate).toContain('First missing-state safety cleanup on 2026-07-06 kept the normal submitted-registration view behind `result.success`');
    expect(gate).toContain('Onboarding Success public-confirmation squircle/source-feedback cleanup on 2026-07-06 converted `OnboardingSuccessPage.jsx` local confirmation chrome to semantic radius tokens');

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

    expect(oldPage).toContain('Registration Submitted!');
    expect(oldPage).toContain('Your organization registration is being reviewed.');
    expect(oldPage).toContain('Organization Identity');
    expect(oldPage).toContain('Administrator Identity');
    expect(oldPage).toContain('Verification in 24-48 hours');
    expect(oldPage).toContain('Start using iVisit');
    expect(oldPage).toContain('You can explore the dashboard while verification is pending');
    expect(oldPage).toContain('Go to Dashboard');
    expect(page).toContain('Registration submitted');
    expect(page).toContain('We received your registration details.');
    expect(page).toContain('Organization ID');
    expect(page).toContain('Administrator ID');
    expect(page).toContain('Review follows the admin queue');
    expect(page).toContain('We will use the submitted details for review.');
    expect(page).toContain('Console access depends on your account state');
    expect(page).toContain('If the console asks you to sign in or continue setup, follow that prompt.');
    expect(page).toContain('Open console');
    expect(page).not.toContain('Registration Submitted!');
    expect(page).not.toContain('Your organization registration is being reviewed.');
    expect(page).not.toContain('Organization Identity');
    expect(page).not.toContain('Administrator Identity');
    expect(page).not.toContain('Verification in 24-48 hours');
    expect(page).not.toContain('Start using iVisit');
    expect(page).not.toContain('You can explore the dashboard while verification is pending');
    expect(page).not.toContain('Go to Dashboard');
    expect(oldPage).not.toContain('const hasSubmissionResult = Boolean(result?.success);');
    expect(oldPage).not.toContain('Registration status unavailable');
    expect(page).toContain('const hasSubmissionResult = Boolean(result?.success);');
    expect(page).toContain('!hasSubmissionResult');
    expect(page).toContain('Registration status unavailable');
    expect(page).toContain('Open this page from the registration flow so we can show your submission details.');
    expect(page).toContain('<Link to="/onboarding">');
    expect(page).toContain('Continue registration');
    expect(page).not.toContain('supabase');
    expect(page).not.toContain('getDisplayId');
    expect(page).not.toContain('useEffect');
    expect(page).not.toContain('role="status"');

    expect(context).toContain("navigate('/onboarding-success', { state: { result } });");
    expect(service).toContain("const { getDisplayId } = await import('./displayIdService');");
    expect(service).toContain('const orgDisplayId = await getDisplayId(organization.id);');
    expect(service).toContain('const userDisplayId = await getDisplayId(session.user.id);');
    expect(service).toContain("message: 'Registration submitted successfully'");

    expect(gate).toContain('Success-state source: safer, not admitted.');
    expect(gate).toContain('a direct visit or refresh loses `location.state.result` and now shows a degraded missing-state instead of success copy without organization/user evidence.');
    expect(gate).toContain('Review timing: not admitted.');
    expect(gate).toContain('Dashboard-access promise: not admitted.');
    expect(gate).toContain('Direct-link/refresh behavior: safer, not admitted.');
  });

  it('blocks Onboarding Success canon reuse until source, verification, dashboard, and support proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');

    expect(gate).toContain('Onboarding Success intake decisions:');
    expect(gate).toContain('Display IDs: not admitted.');
    expect(gate).toContain('Support handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: intentionally absent. `OnboardingSuccessPage.jsx` stays out of `scripts/check-ui-surface-hardgate.js` until the public confirmation surface enters a guarded implementation pass.');
    expect(gate).toContain('Onboarding Success Requests-canon blocker map:');
    expect(gate).toContain('Page 22 may not reuse Requests visual language because Onboarding Success is a public confirmation handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth/registration copy or flow order.');
    expect(gate).toContain('Add hardgate coverage only after the public confirmation visual system is converted to shared tokens, squircle geometry, structural loading/error states, receiver-backed copy, and intentional motion.');

    expect(app).not.toContain('<Route path="/onboarding-success" element={<ProtectedRoute');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });

  it('keeps the focused Onboarding Success cleanup aligned to the squircle design system without admitting the route', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Onboarding Success public-confirmation squircle/source-feedback cleanup on 2026-07-06 converted `OnboardingSuccessPage.jsx` local confirmation chrome to semantic radius tokens');
    expect(gate).toContain('removed decorative radius/tracking/all-caps chrome');
    expect(gate).toContain('This is focused strict-radius/source-voice proof only; it does not admit Onboarding Success');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-pill']) {
      expect(page).toContain(token);
    }

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
      'green-500',
      'orange-500',
      'Verification in 24-48 hours',
      'Start using iVisit',
      'Go to Dashboard',
    ]) {
      expect(page).not.toContain(legacyToken);
    }

    expect(page).toContain('Registration submitted');
    expect(page).toContain('Open console');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).not.toContain('src/components/pages/OnboardingSuccessPage.jsx');
  });
});
