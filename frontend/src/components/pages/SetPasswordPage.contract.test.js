import fs from 'fs';
import { APP_ROUTE_METADATA } from '../../app/appRouteMetadata';
import { shouldHideShellChrome } from '../../app/shellVisibility';
import { readAuthImplementation } from '../../test/sourceEstates';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Set Password Page 20 admission contract', () => {
  it('keeps Set Password in the public shell and visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 20 Admission - Set Password');
    expect(gate).toContain('Set Password receiver admission on 2026-07-12');
    expect(APP_ROUTE_METADATA.find((route) => route.path === '/set-password')).toEqual({ id: 'setPassword', path: '/set-password', public: true });
    expect(shouldHideShellChrome('/set-password')).toBe(true);
    expect(routes).toContain("'/set-password': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).toContain('src/components/pages/SetPasswordPage.jsx');
  });

  it('bounds recovery checks and gives missing and failed links a way out', () => {
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const auth = readAuthImplementation();
    const login = read('src/components/pages/LoginPage.jsx');

    expect(page).toContain('const RECOVERY_CHECK_TIMEOUT_MS = 5000;');
    expect(page).toContain("const PASSWORD_LINK_MARKER = 'ivisit_verified_password_link';");
    expect(page).toContain('const hasPasswordLinkIntent = () => {');
    expect(page).toContain("query.has('code')");
    expect(page).toContain("['recovery', 'invite'].includes(linkType)");
    expect(page).toContain('return await Promise.race([');
    expect(page).toContain('supabase.auth.getSession()');
    expect(page).toContain("reject(new Error('RECOVERY_CHECK_TIMEOUT'))");
    expect(page).toContain("const [recoveryStatus, setRecoveryStatus] = useState('checking');");
    expect(page).toContain("setRecoveryStatus('ready')");
    expect(page).toContain("setRecoveryStatus('missing')");
    expect(page).toContain("setRecoveryStatus('error')");
    expect(page).toContain("setRecoveryStatus('success')");
    expect(page).toContain('supabase.auth.onAuthStateChange((event, session) => {');
    expect(page).toContain("event !== 'PASSWORD_RECOVERY'");
    expect(page).toContain('Checking your link');
    expect(page).toContain('Link unavailable');
    expect(page).toContain('Could not check this link');
    expect(page).toContain('Return to sign in');
    expect(page).toContain('Try again');
    expect(page).toContain('onClick={verifyRecoverySession}');
    expect(page).toContain('<ThemeToggle size="xs" />');
    expect(page).not.toContain('sessionVerified');

    expect(auth).toContain("} else if (event === 'PASSWORD_RECOVERY') {");
    expect(auth).toContain("navigate('/set-password');");
    expect(login).toContain('redirectTo: `${window.location.origin}/set-password`');
  });

  it('renders and submits the password form only for a verified recovery session', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/SetPasswordPage.jsx');

    expect(gate).toContain('Recovery-session truth: admitted with explicit link intent and bounded verification.');
    expect(gate).toContain('Password update receiver: admitted.');
    expect(page).toContain("{recoveryStatus === 'ready' && (");
    expect(page).toContain("if (submitLockRef.current || recoveryStatus !== 'ready') return;");
    expect(page).toContain('supabase.auth.updateUser({ password })');
    expect(page).toContain("setFormError('Passwords do not match')");
    expect(page).toContain("setRecoveryStatus('success')");
    expect(page).toContain("window.history.replaceState({}, '', '/set-password')");
    expect(page).toContain("navigate('/', { replace: true })");
    expect(page).toContain('aria-busy={loading}');
    expect(page).toContain("data-state={loading ? 'pending' : 'ready'}");
    expect(page).toContain("aria-label={showPassword ? 'Hide new password' : 'Show new password'}");
    expect(page).toContain("aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}");
  });

  it('uses structural loading and canonical calm tokens', () => {
    const page = read('src/components/pages/SetPasswordPage.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button']) {
      expect(page).toContain(token);
    }
    expect(page).toContain('animate-pulse');
    expect(page).toContain('overflow-y-auto');
    expect(page).not.toContain('bg-primary');
    expect(page).not.toContain('text-primary');
    expect(page).not.toContain('bg-gradient');
    expect(page).not.toContain('glass-card');
    expect(page).not.toContain('Secure Your Account');
    expect(page).not.toContain('End-to-End Encrypted Handshake');
    expect(hardgate).toContain('src/components/pages/SetPasswordPage.jsx');
  });
});
