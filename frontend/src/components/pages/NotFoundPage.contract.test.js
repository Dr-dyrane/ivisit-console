import fs from 'fs';
import { execFileSync } from 'child_process';
import { APP_ROUTE_METADATA } from '../../app/appRouteMetadata';
import { AUTHENTICATED_SHELL_ROUTES, PUBLIC_SHELL_ROUTES, shouldHideShellChrome } from '../../app/shellVisibility';
import { readAppImplementation } from '../../test/sourceEstates';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Catch-All Not Found Page 24 admission contract', () => {
  it('admits the catch-all route as a public route-recovery surface in the default hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 24 Admission - Catch-All Not Found');
    expect(gate).toContain('the `*` catch-all `NotFoundPage` is admitted under the Today/Requests canon as a public route-recovery surface only.');
    expect(gate).toContain('First Catch-All visual pass on 2026-07-07 admitted `NotFoundPage.jsx` as a public route-recovery surface.');
    expect(gate).toContain('Promotion note: the first Catch-All visual pass is complete.');

    expect(APP_ROUTE_METADATA.find((route) => route.path === '*')).toEqual({ id: 'notFound', path: '*', public: true });
    expect(PUBLIC_SHELL_ROUTES).not.toContain('*');
    expect(AUTHENTICATED_SHELL_ROUTES).not.toContain('*');
    expect(shouldHideShellChrome('/missing-route')).toBe(true);
    expect(APP_ROUTE_METADATA.some((route) => route.path === '/not-found')).toBe(false);

    // The catch-all page is now in the default UI hardgate.
    expect(hardgate).toContain("'src/components/pages/NotFoundPage.jsx'");
  });

  it('converts old Not Found chrome to canonical calm tokens while preserving recovery targets and feedback', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/NotFoundPage.jsx');
    const page = read('src/components/pages/NotFoundPage.jsx');
    const oldApp = gitShowHead('frontend/src/App.js');
    const app = readAppImplementation();

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/App.js`, `git show HEAD:frontend/src/components/pages/NotFoundPage.jsx`');
    expect(gate).toContain('lazy `NotFoundPage` import, catch-all route outside `ProtectedRoute`, `usePageHeader("Lost Signal", null)`');
    expect(gate).toContain('decorative destructive gradient and blurred orb, `404`, `Signal Lost`, haiku copy, `Go Back`, `Return to Dashboard`');
    expect(gate).toContain('First catch-all shell/action cleanup on 2026-07-06 removed `usePageHeader("Lost Signal", null)` from the active catch-all page');
    expect(gate).toContain('Catch-All preservation ledger: the old `usePageHeader("Lost Signal")` shared-header write is converted');

    expect(oldApp).toContain('NotFoundPage');
    expect(oldApp).toContain('<Route path="*" element={<NotFoundPage />} />');
    expect(app).toContain("notFound: lazyNamedPage(() => import('../components/pages/NotFoundPage'), 'NotFoundPage')");
    expect(APP_ROUTE_METADATA.find((route) => route.path === '*')?.public).toBe(true);

    // Preservation baseline (f31f29f) still holds the OLD Not Found behavior inventory.
    expect(oldPage).toContain('usePageHeader("Lost Signal", null);');
    expect(oldPage).toContain('Card');
    expect(oldPage).toContain('bg-gradient-to-br from-destructive/5');
    expect(oldPage).toContain('bg-destructive/10 rounded-full blur-[80px]');
    expect(oldPage).toContain('Signal Lost');
    expect(oldPage).toContain('Every second counts,');
    expect(oldPage).toContain('But this path leads to void space,');
    expect(oldPage).toContain('Return to the pulse.');
    expect(oldPage).toContain('Go Back');
    expect(oldPage).toContain('Return to Dashboard');
    expect(oldPage).toContain('squircle-3xl');
    expect(oldPage).toContain('animate-pulse-slow');

    // Active page converts the decorative, scary, and stale chrome.
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('Lost Signal');
    expect(page).not.toContain('Signal Lost');
    expect(page).not.toContain('Every second counts,');
    expect(page).not.toContain('But this path leads to void space,');
    expect(page).not.toContain('Return to the pulse.');
    expect(page).not.toContain('Return to Dashboard');
    expect(page).not.toContain('bg-gradient-to-br from-destructive/5');
    expect(page).not.toContain('rounded-full blur-[80px]');
    expect(page).not.toContain('animate-pulse-slow');
    expect(page).not.toContain('tracking-tighter');
    expect(page).not.toContain("'../ui/card'");
    expect(page).not.toContain('<Card');
    expect(page).not.toMatch(/rounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])/);
    expect(page).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(page).not.toMatch(/\bgeo-/);

    // Active page keeps preserved recovery targets + feedback and uses canonical calm tokens.
    expect(page).toContain('404');
    expect(page).toContain('Page not found');
    expect(page).toContain('This page does not exist or may have moved. Go back, or head to Today.');
    expect(page).toContain('rounded-card');
    expect(page).toContain('rounded-icon');
    expect(page).toContain('rounded-button');
    expect(page).toContain('bg-foreground');
    expect(page).toContain('Compass');
    expect(page).toContain('const [pendingAction, setPendingAction] = React.useState(null);');
    expect(page).toContain("setPendingAction('back');");
    expect(page).toContain("setPendingAction('today');");
    expect(page).toContain('navigate(-1)');
    expect(page).toContain("navigate('/')");
    expect(page).toContain('disabled={Boolean(pendingAction)}');
    expect(page).toContain("pendingAction === 'back' ? 'Opening previous page...' : 'Go back'");
    expect(page).toContain("pendingAction === 'today' ? 'Opening Today...' : 'Go to Today'");

    expect(gate).toContain('Auth/shell exposure: proven for this page.');
    expect(gate).toContain('Unknown paths no longer inherit app chrome, context panel, FAB, bottom bar, footer, or startup overlay');
    expect(gate).toContain('`App.js` now centralizes shell visibility with `PUBLIC_SHELL_ROUTES`, `AUTHENTICATED_SHELL_ROUTES`, `normalizeShellPath()`, and `shouldHideShellChrome()`');
    expect(gate).toContain('Copy: converted and admitted.');
    expect(gate).toContain('Shell/layout: resolved for this page.');
  });

  it('keeps the catch-all a route-recovery exception with rendered proof and cross-route flow work named', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/NotFoundPage.jsx');

    expect(gate).toContain('Catch-All admission decisions:');
    expect(gate).toContain('Route ownership: render-404 admitted for unknown URLs.');
    expect(gate).toContain('Missing-route recovery: generic recovery admitted.');
    expect(gate).toContain('Action feedback: proven.');
    expect(gate).toContain('Hardgate: `NotFoundPage.jsx` is now in the default `scripts/check-ui-surface-hardgate.js` set and passes strict-radius');
    expect(gate).toContain('Rendered proof, 2026-07-07:');
    expect(gate).toContain('clicking `Go to Today` rendered the disabled `Opening Today...` pending state and navigated to `/`.');
    expect(gate).toContain('zero horizontal overflow (`scrollWidth - innerWidth = 0`)');
    expect(gate).toContain('Catch-All Requests-canon blocker map:');
    expect(gate).toContain('Page 24 may not reuse Requests visual language because the catch-all is a route-recovery handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, `/onboarding-success`, `/unauthorized`, and `*` redirect/deep-link behavior together before changing coordinated public auth/route-recovery flow order.');
    expect(gate).toContain('Data quieting | AuthProvider and app providers wrap the route; `AppShell` now hides chrome for unknown paths through `shouldHideShellChrome()`.');

    expect(APP_ROUTE_METADATA.find((route) => route.path === '*')?.public).toBe(true);
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });
});
