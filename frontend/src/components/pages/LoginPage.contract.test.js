import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Login Page 19 admission contract', () => {
  it('keeps Login in the public shell and the visual hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 19 Admission - Login');
    expect(gate).toContain('Login usability and side-effect correction on 2026-07-12');
    expect(app).toContain('<Route path="/login" element={<LoginPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).not.toContain('<Route path="/login" element={<ProtectedRoute');
    expect(routes).toContain("'/login': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain('return <Navigate to="/login" state={{ from: location }} replace />;');
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
  });

  it('keeps the progressive auth paths while making password setup explicit', () => {
    const page = read('src/components/pages/LoginPage.jsx');
    const auth = read('src/contexts/AuthContext.jsx');

    expect(page).toContain('const [step, setStep] = useState("email");');
    expect(page).toContain('const normalizedEmail = emailSchema.parse(email.trim().toLowerCase());');
    expect(page).toContain('supabase.functions.invoke("check-user"');
    expect(page).toContain('moveTo(!checkError && data?.hasPassword === false ? "setup" : "password");');
    expect(page).toContain('const handleSetupLink = async (event) => {');
    expect(page).toContain('Send setup link');
    expect(page).toContain('We will only send a setup link after you confirm.');
    expect(page.match(/resetPasswordForEmail/g)).toHaveLength(2);
    expect(page).not.toContain('just in case');
    expect(page).not.toContain('new Promise(resolve => setTimeout');

    expect(page).toContain('const { error: signInError } = await signIn(email, password);');
    expect(page).toContain('supabase.auth.mfa.listFactors()');
    expect(page).toContain('supabase.auth.mfa.challenge({');
    expect(page).toContain('setMfaFactorId(enrolledFactor.id);');
    expect(page).toContain('setMfaChallengeId(challenge.id);');
    expect(page).toContain('factorId: mfaFactorId');
    expect(page).toContain('challengeId: mfaChallengeId');
    expect(page).not.toContain('factorId: mfaChallengeId');
    expect(page).toContain('supabase.auth.signInWithOAuth({');
    expect(page).toContain('provider: "google"');
    expect(page).toContain('<Link to="/onboarding"');
    expect(page).toContain('https://www.ivisit.ng/support');
    expect(page).toContain('<ThemeToggle size="xs" />');

    expect(auth).toContain('const signIn = async (email, password) => {');
    expect(auth).toContain('supabase.auth.signInWithPassword({');
  });

  it('guards submits and keeps unproved receivers outside the console shell', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/LoginPage.jsx');

    expect(gate).toContain('Auth receiver ownership: partially proved, not admitted.');
    expect(gate).toContain('Edge Function truth: not admitted.');
    expect(gate).toContain('OAuth and reset links: not admitted.');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
    expect(page).toContain('const submitLockRef = useRef(false);');
    expect(page).toContain('if (submitLockRef.current) return false;');
    expect(page).toContain('aria-busy={loading}');
    expect(page).toContain('data-state={loading ? "pending" : disabled ? "unavailable" : "ready"}');
  });

  it('uses compact calm auth chrome on mobile and desktop', () => {
    const page = read('src/components/pages/LoginPage.jsx');
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
