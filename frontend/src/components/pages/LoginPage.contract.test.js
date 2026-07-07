import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Login Page 19 intake contract', () => {
  it('keeps Login in intake only as a public auth-shell exception', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 19 Intake Audit - Login');
    expect(gate).toContain('Login at `/login` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, auth copy rewrite, OAuth/reset/MFA promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Login visual pass must close this blocker map before adding `LoginPage.jsx` to the default hardgate.');

    expect(app).toContain('<Route path="/login" element={<LoginPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/login': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/login" state={{ from: location }} replace />;');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).not.toContain('src/components/pages/LoginPage.jsx');
  });

  it('preserves the old Login behavior inventory while fixing MFA factor/challenge state', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/LoginPage.jsx');
    const page = read('src/components/pages/LoginPage.jsx');
    const auth = read('src/contexts/AuthContext.jsx');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/LoginPage.jsx`');
    expect(gate).toContain('email-first progressive step, `check-user` Edge Function, email validation, account-not-found feedback');
    expect(gate).toContain('password sign-in through `signIn(email, password)`, MFA factor listing, MFA challenge and verify, Google OAuth');
    expect(gate).toContain('First MFA receiver cleanup on 2026-07-06 separated `mfaFactorId` from `mfaChallengeId` in `LoginPage.jsx`.');
    expect(gate).toContain('Second MFA state cleanup on 2026-07-06 clears stale MFA state before each password sign-in, validates the local six-digit code before receiver calls, and sends users back to password sign-in with visible feedback when the challenge state is missing or expired.');

    for (const source of [oldPage, page]) {
      expect(source).toContain('const [step, setStep] = useState("email");');
      expect(source).toContain('emailSchema.parse(email);');
      expect(source).toContain("supabase.functions.invoke('check-user'");
      expect(source).toContain('resetPasswordForEmail(email, {');
      expect(source).toContain('redirectTo: `${window.location.origin}/set-password`');
      expect(source).toContain('const { data, error } = await signIn(email, password);');
      expect(source).toContain('supabase.auth.mfa.listFactors()');
      expect(source).toContain('supabase.auth.mfa.challenge({');
      expect(source).toContain('supabase.auth.mfa.verify({');
      expect(source).toContain("provider: 'google'");
      expect(source).toContain('href="/onboarding"');
      expect(source).toContain('https://www.ivisit.ng/support');
      expect(source).toContain('<ThemeToggle />');
      expect(source).toContain('toast.error("Authentication Failed")');
    }

    expect(oldPage).toContain('factorId: mfaChallengeId');
    expect(page).toContain('const [mfaFactorId, setMfaFactorId] = useState(null);');
    expect(page).toContain('setMfaFactorId(factor.id);');
    expect(page).toContain('setMfaChallengeId(challenge.id);');
    expect(page).toContain('setMfaFactorId(null);');
    expect(page).toContain('setMfaChallengeId(null);');
    expect(page).toContain('setMfaCode("");');
    expect(page).toContain('const normalizedMfaCode = mfaCode.trim();');
    expect(page).toContain('setError("Enter the 6-digit code.");');
    expect(page).toContain('if (!mfaFactorId || !mfaChallengeId) {');
    expect(page).toContain('setStep("password");');
    expect(page).toContain('setError("Security check expired. Sign in again.");');
    expect(page).toContain('toast.error("Security check expired. Sign in again.");');
    expect(page).toContain('factorId: mfaFactorId');
    expect(page).toContain('challengeId: mfaChallengeId');
    expect(page).toContain('code: normalizedMfaCode');
    expect(page).not.toContain('factorId: mfaChallengeId');

    expect(auth).toContain('const signIn = async (email, password) => {');
    expect(auth).toContain('supabase.auth.signInWithPassword({');
  });

  it('blocks Login canon reuse until auth receivers, redirects, and public proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/LoginPage.jsx');

    expect(gate).toContain('Login intake decisions:');
    expect(gate).toContain('Auth receiver ownership: partially proved, not admitted.');
    expect(gate).toContain('Edge Function truth: not admitted.');
    expect(gate).toContain('OAuth and reset links: not admitted.');
    expect(gate).toContain('Onboarding handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: intentionally absent. `LoginPage.jsx` stays out of `scripts/check-ui-surface-hardgate.js` until the public auth surface enters a guarded implementation pass.');
    expect(gate).toContain('Login Requests-canon blocker map:');
    expect(gate).toContain('Page 19 may not reuse Requests visual language because Login is a public auth gateway, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth copy or flow order.');

    expect(app).not.toContain('<Route path="/login" element={<ProtectedRoute');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });

  it('keeps the focused Login cleanup aligned to the squircle design system without admitting the route', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/LoginPage.jsx');
    const designSystem = read('docs/design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md');
    const tailwind = read('tailwind.config.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Login public-auth squircle/source-feedback cleanup on 2026-07-06 converted `LoginPage.jsx` local public-auth chrome to semantic radius tokens');
    expect(gate).toContain('removed decorative border/ring/outline/tracking/all-caps chrome');
    expect(gate).toContain('This is focused strict-radius/source-voice proof only; it does not admit Login');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button', 'rounded-pill']) {
      expect(page).toContain(token);
    }

    for (const legacyToken of [
      'rounded-2xl',
      'rounded-xl',
      'rounded-full',
      'border-',
      'ring-',
      'outline-',
      'tracking-',
      'uppercase',
      'bg-orb',
      'squircle-xl',
      'geo-',
    ]) {
      expect(page).not.toContain(legacyToken);
    }

    for (const removedCopy of [
      'Mission-critical emergency response coordination link.',
      'System Online',
      'Encrypted',
      'SECURE CONNECTION',
    ]) {
      expect(page).not.toContain(removedCopy);
    }

    expect(page).toContain('Care team console access.');
    expect(page).toContain('Email first');
    expect(page).toContain('Step by step');
    expect(page).toContain('Public sign-in');
    expect(page).not.toContain('console.error(');
    expect(page).not.toContain('console.warn(');
    expect(page).not.toContain('console.log(');

    expect(designSystem).toContain('Continuous (squircle) corners are the ivisit standard.');
    expect(designSystem).toContain('Active revamp code should use those Tailwind utilities or semantic global aliases');
    expect(tailwind).toContain("button: 'var(--radius-button, 20px)'");
    expect(tailwind).toContain("pill: 'var(--radius-pill, 999px)'");
    expect(hardgate).toContain('strictRadiusPatterns');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
  });
});
