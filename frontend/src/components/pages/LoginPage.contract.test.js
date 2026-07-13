import fs from 'fs';
import { APP_ROUTE_METADATA } from '../../app/appRouteMetadata';
import { PUBLIC_SHELL_ROUTES, shouldHideShellChrome } from '../../app/shellVisibility';
import { readAuthImplementation, readLoginImplementation } from '../../test/sourceEstates';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Login Page 19 admission contract', () => {
  it('keeps Login in the public shell and the visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 19 Admission - Login');
    expect(gate).toContain('Login receiver admission on 2026-07-12');
    expect(APP_ROUTE_METADATA.find((route) => route.path === '/login')).toEqual({ id: 'login', path: '/login', public: true });
    expect(PUBLIC_SHELL_ROUTES).toContain('/login');
    expect(shouldHideShellChrome('/login')).toBe(true);
    expect(routes).toContain("'/login': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/login" state={{ from: location }} replace />;');
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
  });

  it('does not disclose account existence and keeps password setup explicit', () => {
    const page = readLoginImplementation();
    const auth = readAuthImplementation();

    expect(page).toContain('const [step, setStep] = useState("email");');
    expect(page).toContain('const normalizedEmail = emailSchema.parse(email.trim().toLowerCase());');
    expect(page).not.toContain('check-user');
    expect(page).toContain('moveTo("password");');
    expect(page).toContain('const handleSetupLink = async (event) => {');
    expect(page).toContain('Set up password');
    expect(page).toContain('Forgot password?');
    expect(page.match(/resetPasswordForEmail/g)).toHaveLength(2);
    expect(page).toContain('The email or password is incorrect.');
    expect(page).not.toContain('Account not found');

    expect(page).toContain('const { assurance } = await signIn(email, password);');
    expect(page).toContain('assurance?.status === ASSURANCE_STATUS.MFA_REQUIRED');
    expect(page).toContain('const result = await verifyMfa(code);');
    expect(page).toContain('void beginMfaChallenge();');
    expect(page).not.toContain('supabase.auth.mfa.');
    expect(page).not.toContain('mfaFactorId');
    expect(page).not.toContain('mfaChallengeId');
    expect(auth).toContain('supabase.auth.mfa.getAuthenticatorAssuranceLevel()');
    expect(auth).toContain('supabase.auth.mfa.listFactors()');
    expect(auth).toContain('supabase.auth.mfa.challenge({ factorId: verifiedFactor.id })');
    expect(auth).toContain('supabase.auth.mfa.verify({');
    expect(auth).toContain('factorId: challenge.factorId');
    expect(auth).toContain('challengeId: challenge.challengeId');
    expect(page).toContain('supabase.auth.signInWithOAuth({');
    expect(page).toContain('provider: "google"');
    expect(page).toContain('<Link to="/onboarding"');
    expect(page).toContain('https://www.ivisit.ng/support');
    expect(page).toContain('<ThemeToggle size="xs" />');

    expect(auth).toContain('const signIn = useCallback(async (email, password) => {');
    expect(auth).toContain('supabase.auth.signInWithPassword({');
  });

  it('keeps AAL1 sessions in the security flow until canonical assurance is satisfied', () => {
    const page = readLoginImplementation();
    const auth = readAuthImplementation();
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');

    expect(auth).toContain("MFA_REQUIRED: 'mfa_required'");
    expect(auth).toContain("currentLevel === 'aal1' && nextLevel === 'aal2'");
    expect(auth).toContain('const inFlight = assuranceRequestRef.current;');
    expect(auth).toContain('const inFlight = challengeRequestRef.current;');
    expect(auth).toContain('requireAal2: true');
    expect(page).toContain('assuranceStatus === ASSURANCE_STATUS.SATISFIED');
    expect(page).toContain('if (!hasSatisfiedSession || redirectLockRef.current) return;');
    expect(page).toContain("const activeStep = sessionGateActive ? '2fa' : step;");
    expect(page).toContain('Retry security check');
    expect(page).toContain('Use another account');
    expect(protectedRoute).toContain('assuranceState?.status === ASSURANCE_STATUS.MFA_REQUIRED');
    expect(protectedRoute).toContain('assuranceState?.status !== ASSURANCE_STATUS.SATISFIED');
  });

  it('guards submits and records the admitted auth boundary', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = readLoginImplementation();

    expect(gate).toContain('Account discovery: retired.');
    expect(gate).toContain('Password and MFA sign-in: admitted.');
    expect(gate).toContain('Reset and setup delivery: admitted with generic feedback.');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
    expect(page).toContain('const submitLockRef = useRef(false);');
    expect(page).toContain('if (submitLockRef.current) return false;');
    expect(page).toContain('aria-busy={loading}');
    expect(page).toContain('data-state={loading ? "pending" : disabled ? "unavailable" : "ready"}');
  });

  it('uses compact calm auth chrome on mobile and desktop', () => {
    const page = readLoginImplementation();
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-button', 'rounded-pill']) {
      expect(page).toContain(token);
    }
    expect(page).toContain('overflow-y-auto');
    expect(page).toContain('Care team console');
    expect(page).toContain('Care team access');
    expect(page).not.toContain('overflow-hidden');
    expect(page).not.toContain('Email first');
    expect(page).not.toContain('Step by step');
    expect(page).not.toContain('Public sign-in');
    expect(page).not.toContain('bg-primary');
    expect(page).not.toContain('text-primary');
    expect(page).not.toContain('bg-gradient');
    expect(page).not.toContain('glass-card');
    expect(page).not.toContain('console.error(');
    expect(page).not.toContain('console.warn(');
    expect(page).not.toContain('console.log(');
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
  });
});
