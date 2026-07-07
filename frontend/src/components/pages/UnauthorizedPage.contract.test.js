import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `HEAD:${path}`], { encoding: 'utf8' });

describe('Unauthorized Page 23 intake contract', () => {
  it('keeps Unauthorized in intake while ProtectedRoute remains the shared guard hardgate file', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 23 Intake Audit - Unauthorized');
    expect(gate).toContain('Unauthorized at `/unauthorized` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, denied-state copy rewrite, missing-profile recovery promotion, role display promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('`ProtectedRoute.jsx` stays in the default UI hardgate because it is the shared route guard; that hardgate status does not admit the Unauthorized visual route.');

    expect(app).toContain('<Route path="/unauthorized" element={<UnauthorizedPage />} />');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).toContain('<ConsoleStartupOverlay disabled={hideNav} />');
    expect(routes).toContain("'/unauthorized': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).toContain('src/components/common/ProtectedRoute.jsx');
  });

  it('preserves old Unauthorized behavior inventory while documenting active denied-state cleanup', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldProtectedRoute = gitShowHead('frontend/src/components/common/ProtectedRoute.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const auth = read('src/contexts/AuthContext.jsx');
    const navigation = read('src/config/navigation.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/common/ProtectedRoute.jsx`');
    expect(gate).toContain('old `Access Restricted` copy, `clearance level` copy, decorative background orbs, emoji stop icon, `Current Identity`, `Go Back`, `Return to Dashboard`, sign-out icon button');

    expect(oldProtectedRoute).toContain('export const UnauthorizedPage = () => {');
    expect(oldProtectedRoute).toContain('Access Restricted');
    expect(oldProtectedRoute).toContain('clearance level');
    expect(oldProtectedRoute).toContain('Current Identity');
    expect(oldProtectedRoute).toContain('Go Back');
    expect(oldProtectedRoute).toContain('Return to Dashboard');
    expect(oldProtectedRoute).toContain('<span className="text-5xl drop-shadow-md">');
    expect(oldProtectedRoute).toContain('bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50');
    expect(oldProtectedRoute).toContain('if (!profile) {');
    expect(oldProtectedRoute).toContain('return <DynamicAuthSkeleton pathname={currentPath} />;');

    expect(protectedRoute).toContain('export const UnauthorizedPage = () => {');
    expect(protectedRoute).toContain('const reason = location.state?.reason;');
    expect(protectedRoute).toContain("const missingProfile = reason === 'profile_missing' || reason === 'profile_unavailable' || reason === 'session_unavailable';");
    expect(protectedRoute).toContain('const [pendingAction, setPendingAction] = React.useState(null);');
    expect(protectedRoute).toContain("return <Navigate to=\"/unauthorized\" state={{ reason: authError.type, from: location }} replace />;");
    expect(protectedRoute).toContain('LockKeyhole');
    expect(protectedRoute).toContain('Loader2');
    expect(protectedRoute).toContain("missingProfile ? 'Account not ready' : 'You do not have access'");
    expect(protectedRoute).toContain('Your console profile is not ready yet.');
    expect(protectedRoute).toContain('cannot open this page.');
    expect(protectedRoute).toContain('Current role');
    expect(protectedRoute).toContain('Go back');
    expect(protectedRoute).toContain("pendingAction === 'back' ? 'Opening previous page...' : 'Go back'");
    expect(protectedRoute).toContain('Go to Today');
    expect(protectedRoute).toContain("pendingAction === 'today' ? 'Opening Today...' : 'Go to Today'");
    expect(protectedRoute).toContain('aria-label="Sign out"');
    expect(protectedRoute).toContain("aria-busy={pendingAction === 'signout'}");
    expect(protectedRoute).toContain('await signOut();');
    expect(protectedRoute).toContain("toast.error('Could not sign out. Try again.');");
    expect(protectedRoute).not.toContain('Access Restricted');
    expect(protectedRoute).not.toContain('clearance level');
    expect(protectedRoute).not.toContain('Current Identity');
    expect(protectedRoute).not.toContain('Return to Dashboard');

    expect(auth).toContain('profile_missing');
    expect(auth).toContain('profile_unavailable');
    expect(auth).toContain('session_unavailable');
    expect(navigation).toContain('getAccessibleNav');

    expect(gate).toContain('Active source recertification: `ProtectedRoute.jsx` now routes missing-profile `authError` to `/unauthorized` with `state.reason`');
    expect(gate).toContain('uses the lucide `LockKeyhole` icon instead of the old emoji stop icon');
    expect(gate).toContain('First action-feedback cleanup on 2026-07-06 kept the same denied-state actions but added local pending feedback.');
  });

  it('blocks Unauthorized visual admission until redirect, denial, recovery, and action proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');

    expect(gate).toContain('Unauthorized intake decisions:');
    expect(gate).toContain('Redirect origin: not admitted.');
    expect(gate).toContain('Missing-profile semantics: safer, not admitted.');
    expect(gate).toContain('Role/resource denial: not admitted.');
    expect(gate).toContain('Action feedback: safer, not admitted.');
    expect(gate).toContain('Sign-out receiver: safer, not admitted.');
    expect(gate).toContain('Shell/layout: public-shell exception only.');
    expect(gate).toContain('Hardgate: shared guard only.');
    expect(gate).toContain('Unauthorized Requests-canon blocker map:');
    expect(gate).toContain('Page 23 may not reuse Requests visual language because Unauthorized is a public denied-state handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, `/onboarding-success`, and `/unauthorized` redirect/deep-link behavior together before changing public auth/denied-state copy or flow order.');
    expect(gate).toContain('Promotion rule: the first Unauthorized visual pass must close this blocker map before treating `UnauthorizedPage` as visually admitted.');

    expect(app).not.toContain('<Route path="/unauthorized" element={<ProtectedRoute');
    expect(protectedRoute).not.toContain('usePageHeader');
    expect(protectedRoute).not.toContain('usePageShell');
    expect(protectedRoute).not.toContain('ContextPanel');
  });
});
