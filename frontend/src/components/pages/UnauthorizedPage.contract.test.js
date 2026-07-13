import fs from 'fs';
import { execFileSync } from 'child_process';
import { APP_ROUTE_METADATA } from '../../app/appRouteMetadata';
import { shouldHideShellChrome } from '../../app/shellVisibility';
import { readAuthImplementation } from '../../test/sourceEstates';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Unauthorized Page 23 admission contract', () => {
  it('admits the Unauthorized visual surface while ProtectedRoute stays the shared guard hardgate file', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 23 Admission - Unauthorized');
    expect(gate).toContain('`UnauthorizedPage` is admitted under the Today/Requests canon as a public denied-state recovery surface only.');
    expect(gate).toContain('First Unauthorized visual pass on 2026-07-07 admitted the `UnauthorizedPage` denied-state surface.');
    expect(gate).toContain('Promotion note: the first Unauthorized visual pass is complete.');

    expect(APP_ROUTE_METADATA.find((route) => route.path === '/unauthorized')).toEqual({ id: 'unauthorized', path: '/unauthorized', public: true });
    expect(shouldHideShellChrome('/unauthorized')).toBe(true);
    expect(routes).toContain("'/unauthorized': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");

    // ProtectedRoute.jsx is the shared guard hardgate file; the Unauthorized surface inside it now passes strict radius.
    expect(hardgate).toContain('src/components/common/ProtectedRoute.jsx');
  });

  it('converts the Unauthorized surface to canonical calm tokens while preserving denial logic and receivers', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldProtectedRoute = gitShowHead('frontend/src/components/common/ProtectedRoute.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const auth = readAuthImplementation();
    const navigation = read('src/config/navigation.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/common/ProtectedRoute.jsx`');
    expect(gate).toContain('old `Access Restricted` copy, `clearance level` copy, decorative background orbs, emoji stop icon, `Current Identity`, `Go Back`, `Return to Dashboard`, sign-out icon button');
    expect(gate).toContain('Unauthorized preservation ledger:');

    // Preservation baseline (f31f29f) still holds the OLD Unauthorized behavior inventory.
    expect(oldProtectedRoute).toContain('export const UnauthorizedPage = () => {');
    expect(oldProtectedRoute).toContain('Access Restricted');
    expect(oldProtectedRoute).toContain('clearance level');
    expect(oldProtectedRoute).toContain('Current Identity');
    expect(oldProtectedRoute).toContain('Return to Dashboard');
    expect(oldProtectedRoute).toContain('<span className="text-5xl drop-shadow-md">');
    expect(oldProtectedRoute).toContain('bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50');

    // Active Unauthorized preserves denial logic, copy, receivers, and pending feedback.
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
    expect(protectedRoute).toContain("pendingAction === 'back' ? 'Opening previous page...' : 'Go back'");
    expect(protectedRoute).toContain("pendingAction === 'today' ? 'Opening Today...' : 'Go to Today'");
    expect(protectedRoute).toContain('aria-label="Sign out"');
    expect(protectedRoute).toContain("aria-busy={pendingAction === 'signout'}");
    expect(protectedRoute).toContain('await signOut();');
    expect(protectedRoute).toContain("toast.error('Could not sign out. Try again.');");

    // Converted to canonical calm tokens, non-danger color, no decorative chrome.
    expect(protectedRoute).toContain('rounded-card');
    expect(protectedRoute).toContain('rounded-icon');
    expect(protectedRoute).toContain('rounded-inner');
    expect(protectedRoute).toContain('rounded-button');
    expect(protectedRoute).toContain('rounded-pill');
    expect(protectedRoute).toContain('bg-foreground');
    expect(protectedRoute).toContain('text-muted-foreground');
    expect(protectedRoute).not.toContain('Access Restricted');
    expect(protectedRoute).not.toContain('clearance level');
    expect(protectedRoute).not.toContain('Current Identity');
    expect(protectedRoute).not.toContain('Return to Dashboard');
    expect(protectedRoute).not.toContain('shadow-glow');
    expect(protectedRoute).not.toContain('backdrop-blur');
    expect(protectedRoute).not.toContain('text-destructive');
    expect(protectedRoute).not.toContain('bg-destructive');
    expect(protectedRoute).not.toContain('tracking-tighter');
    expect(protectedRoute).not.toContain('tracking-widest');
    expect(protectedRoute).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(protectedRoute).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(protectedRoute).not.toMatch(/\bgeo-/);

    expect(auth).toContain('profile_missing');
    expect(auth).toContain('profile_unavailable');
    expect(auth).toContain('session_unavailable');
    expect(navigation).toContain('getAccessibleNav');

    expect(gate).toContain('First action-feedback cleanup on 2026-07-06 kept the same denied-state actions but added local pending feedback.');
  });

  it('records the Unauthorized admission decisions, rendered proof, and remaining cross-route work', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');

    expect(gate).toContain('Unauthorized admission decisions:');
    expect(gate).toContain('Visual surface: admitted.');
    expect(gate).toContain('Local semantic color: admitted calm.');
    expect(gate).toContain('Action feedback: proven.');
    expect(gate).toContain('Sign-out receiver: preserved.');
    expect(gate).toContain('Redirect origin and denied-state owner: excluded until receiver proof.');
    expect(gate).toContain('Shell/layout: proven public-shell exception.');
    expect(gate).toContain('Hardgate: `ProtectedRoute.jsx` remains in the default `scripts/check-ui-surface-hardgate.js` set as shared guard code');
    expect(gate).toContain('Rendered proof, 2026-07-07:');
    expect(gate).toContain('clicking `Go to Today` rendered the disabled `Opening Today...` pending state and navigated to `/`.');
    expect(gate).toContain('zero horizontal overflow (`scrollWidth - innerWidth = 0`)');
    expect(gate).toContain('Unauthorized Requests-canon blocker map:');
    expect(gate).toContain('Page 23 may not reuse Requests visual language because Unauthorized is a public denied-state handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, `/onboarding-success`, and `/unauthorized` redirect/deep-link behavior together before changing public auth/denied-state copy or flow order.');

    expect(APP_ROUTE_METADATA.find((route) => route.path === '/unauthorized')?.public).toBe(true);
    expect(protectedRoute).not.toContain('usePageHeader');
    expect(protectedRoute).not.toContain('usePageShell');
    expect(protectedRoute).not.toContain('ContextPanel');
  });
});
