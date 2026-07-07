import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Set Password Page 20 intake contract', () => {
  it('keeps Set Password in intake only as a public recovery-shell exception', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 20 Intake Audit - Set Password');
    expect(gate).toContain('Set Password at `/set-password` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No full visual revamp, recovery-flow rewrite, Auth update promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Set Password visual pass must close this blocker map before adding `SetPasswordPage.jsx` to the default hardgate.');

    expect(app).toContain('<Route path="/set-password" element={<SetPasswordPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/set-password': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).not.toContain('src/components/pages/SetPasswordPage.jsx');
  });

  it('preserves old Set Password behavior while adding visible recovery-link state', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/SetPasswordPage.jsx');
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const auth = read('src/contexts/AuthContext.jsx');
    const login = read('src/components/pages/LoginPage.jsx');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/SetPasswordPage.jsx`');
    expect(gate).toContain('`supabase.auth.getSession()`, unused `sessionVerified`, commented invalid-link toast/navigation');
    expect(gate).toContain('First recovery-link safety cleanup on 2026-07-06 converted the old unused `sessionVerified`/commented invalid-link behavior into visible `recoveryStatus` states.');
    expect(gate).toContain('Second recovery-session cleanup on 2026-07-06 kept the delayed success redirect but moved it behind mounted/timer guards.');

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
    expect(oldPage).toContain("setTimeout(() => navigate('/'), 1000);");
    expect(oldPage).toContain('const [sessionVerified, setSessionVerified] = useState(false);');
    expect(oldPage).toContain('// toast.error("Invalid or expired link");');
    expect(oldPage).toContain('// navigate(\'/login\');');
    expect(oldPage).toContain('Determine Credentials');

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
    expect(page).toContain('window.clearTimeout(redirectTimerRef.current);');
    expect(page).toContain('if (cancelled || !isMountedRef.current) return;');
    expect(page).toContain('if (!isMountedRef.current) return;');
    expect(page).toContain('redirectTimerRef.current = window.setTimeout(() => {');
    expect(page).toContain("navigate('/');");
    expect(page).toContain('Set your password');
    expect(page).toContain('Password recovery');
    expect(page).not.toContain('Secure Your Account');
    expect(page).not.toContain('End-to-End Encrypted Handshake');
    expect(page).not.toContain('// toast.error("Invalid or expired link");');
    expect(page).not.toContain('Determine Credentials');

    expect(auth).toContain("} else if (event === 'PASSWORD_RECOVERY') {");
    expect(auth).toContain("navigate('/set-password');");
    expect(login).toContain('redirectTo: `${window.location.origin}/set-password`');
  });

  it('blocks Set Password canon reuse until recovery, receiver, and redirect proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/SetPasswordPage.jsx');

    expect(gate).toContain('Set Password intake decisions:');
    expect(gate).toContain('Recovery-session truth: safer, not admitted.');
    expect(gate).toContain('Auth receiver ownership: partially proved, not admitted.');
    expect(gate).toContain('Redirect behavior: safer, not admitted.');
    expect(gate).toContain('Login handoff: not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: intentionally absent. `SetPasswordPage.jsx` stays out of `scripts/check-ui-surface-hardgate.js` until the public auth recovery surface enters a guarded implementation pass.');
    expect(gate).toContain('Set Password Requests-canon blocker map:');
    expect(gate).toContain('Page 20 may not reuse Requests visual language because Set Password is a public recovery gateway, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, and `/onboarding-success` redirect/deep-link behavior together before changing public auth copy or flow order.');

    expect(app).not.toContain('<Route path="/set-password" element={<ProtectedRoute');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });

  it('keeps the focused Set Password cleanup aligned to the squircle design system without admitting the route', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('Set Password public-auth squircle/source-feedback cleanup on 2026-07-06 converted `SetPasswordPage.jsx` local recovery chrome to semantic radius tokens');
    expect(gate).toContain('removed decorative border/ring/outline/tracking/all-caps chrome');
    expect(gate).toContain('This is focused strict-radius/source-voice proof only; it does not admit Set Password');

    for (const token of ['rounded-modal', 'rounded-icon', 'rounded-inner', 'rounded-button']) {
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
    ]) {
      expect(page).not.toContain(legacyToken);
    }

    expect(page).not.toContain('End-to-End Encrypted Handshake');
    expect(page).not.toContain('Secure Your Account');
    expect(page).toContain('Set your password');
    expect(page).toContain('Password recovery');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).not.toContain('src/components/pages/SetPasswordPage.jsx');
  });
});
