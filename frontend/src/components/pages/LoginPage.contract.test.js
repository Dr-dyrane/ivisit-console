import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Login Page 19 admission contract', () => {
  it('admits the Login visual surface as a guarded public auth-shell exception and hardgates LoginPage', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 19 Admission - Login');
    expect(gate).toContain('the Login public-auth visual surface is admitted for guarded continuation on 2026-07-07');
    expect(gate).toContain('is admitted under the Today/Requests canon as a public auth-gateway surface, visual surface only.');
    expect(gate).toContain('The email step must not be submitted from a proof session because `check-user` is a live Edge call and the no-password path sends a real reset email.');
    expect(gate).toContain('First Login visual pass on 2026-07-07 admitted the Login visual surface and moved it off brand red.');
    expect(gate).toContain('Login admission scope guard: this admission is visual surface only.');
    expect(gate).toContain('Rendered proof, 2026-07-07: signed out through the app');

    // Route mounting is unchanged: still a public shell route outside ProtectedRoute.
    expect(app).toContain('<Route path="/login" element={<LoginPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).not.toContain('<Route path="/login" element={<ProtectedRoute');
    expect(routes).toContain("'/login': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/login" state={{ from: location }} replace />;');

    // The Login visual surface is now in the default hardgate.
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
  });

  it('preserves the old Login behavior inventory including the fixed MFA factor/challenge state', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/LoginPage.jsx');
    const page = read('src/components/pages/LoginPage.jsx');
    const auth = read('src/contexts/AuthContext.jsx');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/LoginPage.jsx`');
    expect(gate).toContain('email-first progressive step, `check-user` Edge Function, email validation, account-not-found feedback');
    expect(gate).toContain('password sign-in through `signIn(email, password)`, MFA factor listing, MFA challenge and verify, Google OAuth');

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

    // MFA factor/challenge fix is preserved (old sent the challenge id as the factor id).
    expect(oldPage).toContain('factorId: mfaChallengeId');
    expect(page).toContain('setMfaFactorId(factor.id);');
    expect(page).toContain('setMfaChallengeId(challenge.id);');
    expect(page).toContain('factorId: mfaFactorId');
    expect(page).toContain('challengeId: mfaChallengeId');
    expect(page).toContain('code: normalizedMfaCode');
    expect(page).not.toContain('factorId: mfaChallengeId');

    expect(auth).toContain('const signIn = async (email, password) => {');
    expect(auth).toContain('supabase.auth.signInWithPassword({');
  });

  it('keeps Login auth receivers blocked until receiver, redirect, and public proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/LoginPage.jsx');

    expect(gate).toContain('Login intake decisions:');
    expect(gate).toContain('Auth receiver ownership: partially proved, not admitted.');
    expect(gate).toContain('Edge Function truth: not admitted.');
    expect(gate).toContain('OAuth and reset links: not admitted.');
    expect(gate).toContain('Onboarding handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: visual surface admitted 2026-07-07.');
    expect(gate).toContain('The auth-authority files (`AuthContext.jsx`, `authService.js`, the `check-user` Edge Function) stay out of the hardgate until the auth receivers are proved and admitted.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth copy or flow order.');

    // The admitted visual surface must not reach for authenticated console shell primitives.
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });

  it('holds the Login surface to the squircle canon with no decorative or brand-red chrome', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/LoginPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('First Login visual pass on 2026-07-07 admitted the Login visual surface and moved it off brand red.');
    expect(gate).toContain('because `--primary` resolves to `rgb(115, 17, 22)` in this theme');

    // Canonical radius vocabulary is present.
    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button', 'rounded-pill']) {
      expect(page).toContain(token);
    }
    // Neutral (non-red) primary submit button.
    expect(page).toContain('bg-foreground hover:bg-foreground/90 text-background');

    // No decorative, brand-red, glass, gradient, or non-canonical radius chrome.
    for (const legacyToken of [
      'rounded-2xl', 'rounded-xl', 'rounded-lg', 'rounded-full', 'rounded-[',
      'border-', 'ring-', 'outline-', 'divide-', 'tracking-', 'uppercase', 'bg-orb', 'squircle-xl', 'geo-',
      'bg-primary', 'text-primary', 'backdrop-blur', 'bg-gradient', 'glass-card', 'animate-pulse',
      'shadow-xl', 'shadow-2xl', 'shadow-premium', 'shadow-primary',
    ]) {
      expect(page).not.toContain(legacyToken);
    }

    // Preserved copy and removed unproved security theater stay as-is.
    expect(page).toContain('Care team console access.');
    expect(page).toContain('Email first');
    expect(page).toContain('Step by step');
    expect(page).toContain('Public sign-in');
    for (const removedCopy of ['Mission-critical emergency response coordination link.', 'System Online', 'Encrypted', 'SECURE CONNECTION']) {
      expect(page).not.toContain(removedCopy);
    }
    expect(page).not.toContain('console.error(');
    expect(page).not.toContain('console.warn(');
    expect(page).not.toContain('console.log(');

    // Hardgate still enforces the strict-radius rules and now covers LoginPage.
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
  });
});
