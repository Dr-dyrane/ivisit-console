import fs from 'fs';
import { execFileSync } from 'child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `HEAD:${path}`], { encoding: 'utf8' });

describe('Catch-All Not Found Page 24 intake contract', () => {
  it('keeps the catch-all route in intake until auth and shell behavior are decided', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 24 Intake Audit - Catch-All Not Found');
    expect(gate).toContain('the `*` catch-all route is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, 404 copy rewrite, unknown-route redirect behavior, app-shell rendering, public-shell hardgate promotion, or Requests pattern reuse is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Catch-All visual pass must close this blocker map before adding `NotFoundPage.jsx` to the default hardgate.');

    expect(app).toContain('const NotFoundPage = React.lazy(() => import("./components/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));');
    expect(app).toContain('<Route path="*" element={<NotFoundPage />} />');
    expect(app).not.toContain('<Route path="*" element={<ProtectedRoute');
    expect(app).toContain('const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];');
    expect(app).toContain('const AUTHENTICATED_SHELL_ROUTES = [');
    expect(app).toContain('const shouldHideShellChrome = (pathname) => {');
    expect(app).toContain('return PUBLIC_SHELL_ROUTES.includes(currentPath) || !AUTHENTICATED_SHELL_ROUTES.includes(currentPath);');
    expect(app).toContain('const hideNav = shouldHideShellChrome(location.pathname);');
    expect(app).not.toContain('"/not-found"');
    expect(hardgate).not.toContain('src/components/pages/NotFoundPage.jsx');
  });

  it('preserves the old Not Found behavior inventory while documenting shell exposure blockers', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/NotFoundPage.jsx');
    const page = read('src/components/pages/NotFoundPage.jsx');
    const oldApp = gitShowHead('frontend/src/App.js');
    const app = read('src/App.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/App.js`, `git show HEAD:frontend/src/components/pages/NotFoundPage.jsx`');
    expect(gate).toContain('lazy `NotFoundPage` import, catch-all route outside `ProtectedRoute`, `usePageHeader("Lost Signal", null)`');
    expect(gate).toContain('decorative destructive gradient and blurred orb, `404`, `Signal Lost`, haiku copy, `Go Back`, `Return to Dashboard`');
    expect(gate).toContain('First catch-all shell/action cleanup on 2026-07-06 removed `usePageHeader("Lost Signal", null)` from the active catch-all page');

    for (const source of [oldApp, app]) {
      expect(source).toContain('NotFoundPage');
      expect(source).toContain('<Route path="*" element={<NotFoundPage />} />');
    }

    expect(oldPage).toContain('usePageHeader("Lost Signal", null);');

    for (const source of [oldPage, page]) {
      expect(source).toContain('export const NotFoundPage = () => {');
      expect(source).toContain('Card');
      expect(source).toContain('bg-gradient-to-br from-destructive/5');
      expect(source).toContain('bg-destructive/10 rounded-full blur-[80px]');
      expect(source).toContain('404');
      expect(source).toContain('Signal Lost');
      expect(source).toContain('Every second counts,');
      expect(source).toContain('But this path leads to void space,');
      expect(source).toContain('Return to the pulse.');
      expect(source).toContain('navigate(-1)');
      expect(source).toContain('Go Back');
      expect(source).toContain("navigate('/')");
      expect(source).toContain('Return to Dashboard');
    }

    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('Lost Signal');
    expect(page).toContain('const [pendingAction, setPendingAction] = React.useState(null);');
    expect(page).toContain("setPendingAction('back');");
    expect(page).toContain("setPendingAction('today');");
    expect(page).toContain('disabled={Boolean(pendingAction)}');
    expect(page).toContain("pendingAction === 'back' ? 'Opening previous page...' : 'Go Back'");
    expect(page).toContain("pendingAction === 'today' ? 'Opening Today...' : 'Return to Dashboard'");

    expect(gate).toContain('Auth/shell exposure: safer, not admitted.');
    expect(gate).toContain('Unknown paths no longer inherit app chrome, context panel, FAB, bottom bar, footer, or startup overlay');
    expect(gate).toContain('`App.js` now centralizes shell visibility with `PUBLIC_SHELL_ROUTES`, `AUTHENTICATED_SHELL_ROUTES`, `normalizeShellPath()`, and `shouldHideShellChrome()`');
    expect(gate).toContain('Copy: not admitted.');
    expect(gate).toContain('Shell/layout: safer, unresolved.');
  });

  it('blocks Catch-All canon reuse until unknown-route ownership and recovery proof close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const page = read('src/components/pages/NotFoundPage.jsx');

    expect(gate).toContain('Catch-All intake decisions:');
    expect(gate).toContain('Route ownership: not admitted.');
    expect(gate).toContain('Missing-route recovery: not admitted.');
    expect(gate).toContain('Action feedback: safer, not admitted.');
    expect(gate).toContain('Hardgate: intentionally absent.');
    expect(gate).toContain('Catch-All Requests-canon blocker map:');
    expect(gate).toContain('Page 24 may not reuse Requests visual language because the catch-all is a route-recovery handoff, not a multi-data work stage.');
    expect(gate).toContain('Prove `/login`, `/set-password`, `/onboarding`, `/onboarding-success`, `/unauthorized`, and `*` redirect/deep-link behavior together before changing public auth/route-recovery copy or flow order.');
    expect(gate).toContain('Data quieting | AuthProvider and app providers wrap the route; `AppShell` now hides chrome for unknown paths through `shouldHideShellChrome()`.');

    expect(app).not.toContain('<Route path="*" element={<ProtectedRoute');
    expect(page).not.toContain('usePageHeader');
    expect(page).not.toContain('usePageShell');
    expect(page).not.toContain('ContextPanel');
  });
});
