import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Set Password Page 20 admission contract', () => {
  it('admits the Set Password visual surface as a guarded public recovery-shell exception and hardgates it', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 20 Admission - Set Password');
    expect(gate).toContain('the Set Password public-recovery visual surface is admitted for guarded continuation on 2026-07-07');
    expect(gate).toContain('is admitted under the Today/Requests canon as a public recovery-gateway surface, visual surface only.');
    expect(gate).toContain('The form must not be submitted from a proof session because submit performs a live `updateUser` password write.');
    expect(gate).toContain('First Set Password visual pass on 2026-07-07 admitted the Set Password visual surface and moved it off brand red.');
    expect(gate).toContain('Set Password admission scope guard: this admission is visual surface only.');
    expect(gate).toContain('Rendered proof, 2026-07-07: signed out through the app');

    // Route mounting is unchanged: still a public shell route outside ProtectedRoute.
    expect(app).toContain('<Route path="/set-password" element={<SetPasswordPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).not.toContain('<Route path="/set-password" element={<ProtectedRoute');
    expect(routes).toContain("'/set-password': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");

    // The recovery visual surface is now in the default hardgate.
    expect(hardgate).toContain('src/components/pages/SetPasswordPage.jsx');
  });

  it('preserves old Set Password behavior including the visible recovery-link state', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/SetPasswordPage.jsx');
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const auth = read('src/contexts/AuthContext.jsx');
    const login = read('src/components/pages/LoginPage.jsx');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/SetPasswordPage.jsx`');
    expect(gate).toContain('First recovery-link safety cleanup on 2026-07-06 converted the old unused `sessionVerified`/commented invalid-link behavior into visible `recoveryStatus` states.');

    for (const source of [oldPage, page]) {
      expect(source).toContain('const passwordSchema = z.string().min(8, "Password must be at least 8 characters");');
      expect(source).toContain('supabase.auth.getSession()');
      expect(source).toContain('supabase.auth.updateUser({');
      expect(source).toContain('password: password');
      expect(source).toContain('toast.success("Password set successfully!")');
      expect(source).toContain('handleAuthError(error, \'update\')');
    }

    expect(oldPage).toContain('Secure Your Account');
    expect(oldPage).toContain('End-to-End Encrypted Handshake');

    expect(page).toContain("const [recoveryStatus, setRecoveryStatus] = useState('checking');");
    expect(page).toContain("setRecoveryStatus('ready');");
    expect(page).toContain("setRecoveryStatus('missing');");
    expect(page).toContain("toast.error(\"Open the latest password link and try again.\");");
    expect(page).toContain('role="status"');
    expect(page).toContain('Checking your password link.');
    expect(page).toContain('This password link is missing or expired. Request a new link from Login.');
    expect(page).toContain('disabled={loading || !sessionVerified}');
    expect(page).toContain("{sessionVerified ? 'Set password' : 'Open latest link'}");
    expect(page).toContain('const isMountedRef = useRef(true);');
    expect(page).toContain('const redirectTimerRef = useRef(null);');
    expect(page).toContain('redirectTimerRef.current = window.setTimeout(() => {');
    expect(page).toContain("navigate('/');");
    expect(page).toContain('Set your password');
    expect(page).toContain('Password recovery');
    expect(page).not.toContain('Secure Your Account');
    expect(page).not.toContain('End-to-End Encrypted Handshake');

    expect(auth).toContain("} else if (event === 'PASSWORD_RECOVERY') {");
    expect(auth).toContain("navigate('/set-password');");
    expect(login).toContain('redirectTo: `${window.location.origin}/set-password`');
  });

  it('keeps Set Password recovery receivers blocked until recovery, receiver, and redirect proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/SetPasswordPage.jsx');

    expect(gate).toContain('Set Password intake decisions:');
    expect(gate).toContain('Recovery-session truth: safer, not admitted.');
    expect(gate).toContain('Auth receiver ownership: partially proved, not admitted.');
    expect(gate).toContain('Redirect behavior: safer, not admitted.');
    expect(gate).toContain('Login handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: visual surface admitted 2026-07-07.');
    expect(gate).toContain('The recovery-authority owners (the `AuthContext.jsx` `PASSWORD_RECOVERY` redirect and `supabase.auth.updateUser`) stay out of the hardgate until the recovery receivers are proved and admitted.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth copy or flow order.');

    // The admitted visual surface must not reach for authenticated console shell primitives.
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
    expect(page).toContain('const submitLockRef = useRef(false);');
    expect(page).toContain('if (submitLockRef.current) return;');
    expect(page).toContain('aria-busy={loading}');
    expect(page).toContain("data-state={loading ? 'pending' : sessionVerified ? 'ready' : 'unavailable'}");
  });

  it('holds the Set Password surface to the squircle canon with no decorative or brand-red chrome', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('First Set Password visual pass on 2026-07-07 admitted the Set Password visual surface and moved it off brand red.');
    expect(gate).toContain('because `--primary` resolves to `rgb(115, 17, 22)` in this theme');

    // Canonical radius vocabulary is present.
    for (const token of ['rounded-modal', 'rounded-icon', 'rounded-inner', 'rounded-button']) {
      expect(page).toContain(token);
    }
    // Neutral (non-red) primary submit button.
    expect(page).toContain('bg-foreground hover:bg-foreground/90 text-background');

    // No decorative, brand-red, glass, gradient, or non-canonical radius chrome.
    for (const legacyToken of [
      'rounded-2xl', 'rounded-xl', 'rounded-lg', 'rounded-full', 'rounded-[',
      'border-', 'ring-', 'outline-', 'divide-', 'tracking-', 'uppercase', 'bg-orb', 'squircle-xl', 'geo-',
      'bg-primary', 'text-primary', 'backdrop-blur', 'bg-gradient', 'glass-card',
      'shadow-xl', 'shadow-2xl', 'shadow-premium', 'shadow-primary',
    ]) {
      expect(page).not.toContain(legacyToken);
    }

    // Preserved copy and removed unproved security theater stay as-is.
    expect(page).toContain('Set your password');
    expect(page).toContain('Password recovery');
    expect(page).not.toContain('Secure Your Account');
    expect(page).not.toContain('End-to-End Encrypted Handshake');

    // Hardgate still enforces the strict-radius rules and now covers SetPasswordPage.
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).toContain('src/components/pages/SetPasswordPage.jsx');
  });
});
