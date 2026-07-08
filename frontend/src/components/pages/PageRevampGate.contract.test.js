import fs from 'fs';
import { execFileSync } from 'child_process';

describe('Today/Requests revamp gate contract', () => {
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');
  const designSystemSource = () => fs.readFileSync('docs/design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md', 'utf8');
  const indexCssSource = () => fs.readFileSync('src/index.css', 'utf8');
  const tailwindSource = () => fs.readFileSync('tailwind.config.js', 'utf8');
  const packageSource = () => fs.readFileSync('package.json', 'utf8');
  const uxSource = () => fs.readFileSync('docs/ux/CONSOLE_UX_REVAMP_PLAN.md', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  const appSource = () => fs.readFileSync('src/App.js', 'utf8');
  const navigationSource = () => fs.readFileSync('src/config/navigation.js', 'utf8');
  const mobileNavigationSource = () => fs.readFileSync('src/config/mobileNavigation.js', 'utf8');
  const moduleRailSource = () => fs.readFileSync('src/config/consoleModuleRail.js', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const bottomBarSource = () => fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8');
  const contextActionSource = () => fs.readFileSync('src/hooks/useContextAction.js', 'utf8');
  const htmlShellSource = () => fs.readFileSync('public/index.html', 'utf8');
  const appBootstrapSource = () => fs.readFileSync('src/index.js', 'utf8');
  const errorBoundarySource = () => fs.readFileSync('src/components/common/ErrorBoundary.jsx', 'utf8');
  const cracoConfigSource = () => fs.readFileSync('craco.config.js', 'utf8');
  const globalFinancialModalsSource = () => fs.readFileSync('src/components/modals/GlobalFinancialModals.jsx', 'utf8');
  const verificationPanelSource = () => fs.readFileSync('src/components/context/VerificationPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const dashboardPanelSource = () => fs.readFileSync('src/components/context/DashboardPanel.jsx', 'utf8');
  const emergencyPanelSource = () => fs.readFileSync('src/components/context/EmergencyPanel.jsx', 'utf8');
  const emergencyRequestsSource = () => fs.readFileSync('src/components/pages/EmergencyRequestsPage.jsx', 'utf8');
  const todayHomeSource = () => fs.readFileSync('src/components/pages/TodayHome.jsx', 'utf8');
  const mobileEmergencySource = () => fs.readFileSync('src/components/mobile/MobileEmergency.jsx', 'utf8');
  const emergencyDetailsModalSource = () => fs.readFileSync('src/components/modals/EmergencyDetailsModal.jsx', 'utf8');
  const emergencyRequestModalSource = () => fs.readFileSync('src/components/modals/EmergencyRequestModal.jsx', 'utf8');
  // Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See "Preservation Baseline Re-Anchor - 2026-07-07" in PAGE_REVAMP_GATE.md.
  const PRESERVATION_BASELINE = 'f31f29f';
  const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });
  const nonCanonicalRadiusPattern = /rounded-(?:\[[^\]]+\]|full|sm|md|lg|xl|2xl|3xl)(?=[\s"'`])/;

  it('enforces the global squircle geometry canon through CSS, Tailwind, and hardgate', () => {
    const gate = gateSource();
    const designSystem = designSystemSource();
    const indexCss = indexCssSource();
    const tailwind = tailwindSource();
    const packageJson = packageSource();
    const hardgate = hardgateSource();

    expect(gate).toContain('Global geometry canon: the new console UI uses iVisit squircles.');
    expect(gate).toContain('`src/index.css` owns the `geo-*` legacy aliases, legacy size aliases such as `squircle-xl` / `squircle-sm`, and semantic squircle utilities');
    expect(gate).toContain('legacy `geo-*` shape utilities');
    expect(gate).toContain('size-named `squircle-*` shortcuts');
    expect(gate).toContain('The default UI hardgate checks `App.js`, `src/index.css`, and `tailwind.config.js`');
    expect(gate).toContain('npm run check:ui-hardgate:revamp -- <files>');
    expect(gate).toContain('Legacy size aliases such as `squircle-xl` and `squircle-sm` remain only as migration shims in global CSS.');
    expect(gate).toContain('Today/Requests squircle admission lock, 2026-07-06:');
    expect(gate).toContain('The active Today pair (`TodayHome.jsx`, `DashboardPanel.jsx`) and active Requests slice (`EmergencyRequestsPage.jsx`, `MobileEmergency.jsx`, `EmergencyPanel.jsx`, `EmergencyDetailsModal.jsx`, `EmergencyRequestModal.jsx`) now pass `node scripts/check-ui-surface-hardgate.js --strict-radius ...`.');
    expect(gate).toContain('`App.js` route loading fallback uses `rounded-card`, `rounded-inner`, `rounded-icon`, and `rounded-pill` and is part of default hardgate coverage.');
    expect(gate).toContain('`ContextAwareFAB.jsx` uses `rounded-button` for the icon surface and `rounded-pill` for its tooltip');
    expect(gate).toContain('`DynamicBottomBar.jsx` uses `rounded-pill` for the island and `rounded-button` for nav/action controls');
    expect(gate).toContain('Global voice lock: `.bg-orb` is retired.');
    expect(gate).toContain('Global typography lock: `CONSOLE_DESIGN_SYSTEM_FROM_APP.md` examples now use plain readable labels, normal letter spacing, and role-based squircle tokens.');
    expect(gate).toContain('Global chrome lock: active design-system examples avoid decorative Tailwind border, ring, outline, divider, and hairline utilities.');
    expect(designSystem).toContain('**Console enforcement:** `src/index.css` is the canonical geometry owner.');
    expect(designSystem).toContain('The generic `--squircle` alias resolves back to `--radius-card` so there is one radius ladder');
    expect(designSystem).toContain('never to `border-radius: 0`');
    expect(designSystem).toContain('legacy `geo-*` utilities and size-named `squircle-*` utilities are compatibility aliases for older pages');
    expect(designSystem).toContain('New examples must also use plain readable labels with normal letter spacing and avoid decorative Tailwind border, ring, outline, divider, and hairline utilities');
    expect(designSystem).not.toContain('border-[3px]');
    expect(designSystem).not.toContain('border-white"');
    expect(designSystem).not.toContain('tracking-widest uppercase');
    expect(designSystem).toContain('plus legacy `geo-*` and `squircle-xl` / `squircle-sm` utilities');
    expect(designSystem).toContain('includes `App.js`, `src/index.css`, and `tailwind.config.js`');
    expect(designSystem).toContain('when run with `--strict-radius`');
    expect(designSystem).toContain('npm run check:ui-hardgate:revamp -- <files>');
    expect(designSystem).toContain('Global orb/background decoration utilities');
    expect(indexCss).toContain('Global Surface Geometry - iVisit continuous corners.');
    expect(indexCss).not.toContain('bg-orb');
    expect(indexCss).toContain('.squircle-modal');
    expect(indexCss).toContain('.squircle-card');
    expect(indexCss).toContain('.squircle-inner');
    expect(indexCss).toContain('.squircle-button');
    expect(indexCss).toContain('.squircle-icon');
    expect(indexCss).toContain('.squircle-pill');
    expect(indexCss).toContain('.squircle-3xl');
    expect(indexCss).toContain('.squircle-2xl');
    expect(indexCss).toContain('.squircle-xl');
    expect(indexCss).toContain('.squircle-lg');
    expect(indexCss).toContain('.squircle-md');
    expect(indexCss).toContain('.squircle-sm');
    expect(indexCss).toContain('.squircle-xs');
    expect(indexCss).toContain('border-radius: var(--radius-sheet);');
    expect(indexCss).toContain('border-radius: var(--radius-modal);');
    expect(indexCss).toContain('border-radius: var(--radius-card);');
    expect(indexCss).toContain('border-radius: var(--radius-inner);');
    expect(indexCss).toContain('border-radius: var(--radius-button);');
    expect(indexCss).toContain('border-radius: var(--radius-icon);');
    expect(indexCss).toContain('border-radius: var(--radius-pill);');
    expect(indexCss).toContain('--squircle: var(--radius-card);');
    expect(indexCss).not.toContain('border-radius: 0;');
    expect(indexCss).not.toMatch(/border-radius:\s*(?!var\()[^;\s][^;]*/);
    expect(indexCss).not.toMatch(/letter-spacing:\s*(?!0(?:;|\s|$))[^;\s][^;]*/);
    expect(packageJson).toContain('"check:ui-hardgate:revamp": "node scripts/check-ui-surface-hardgate.js --strict-radius"');
    expect(tailwind).toContain("brand: 'hsl(var(--primary))'");
    expect(tailwind).not.toContain('--color-brand');
    expect(tailwind).toContain("sheet: 'var(--radius-sheet, 44px)'");
    expect(tailwind).toContain("button: 'var(--radius-button, 20px)'");
    expect(tailwind).toContain("pill: 'var(--radius-pill, 999px)'");
    expect(tailwind).toContain("squircle: 'var(--squircle, 1.75rem)'");
    expect(hardgate).toContain("'src/App.js'");
    expect(hardgate).toContain("'src/index.css'");
    expect(hardgate).toContain("'tailwind.config.js'");
    expect(hardgate).toContain('zero-radius geometry');
    expect(hardgate).toContain('hardcoded radius');
    expect(hardgate).toContain('nonzero letter spacing');
    expect(hardgate).toContain('non-canonical radius utility');
    expect(hardgate).toContain('legacy geometry utility');
    expect(hardgate).toContain('legacy squircle size utility');
    expect(hardgate).toContain('decorative orb utility');
    expect(hardgate).toContain('--strict-radius');

    [
      appSource(),
      todayHomeSource(),
      dashboardPanelSource(),
      emergencyRequestsSource(),
      mobileEmergencySource(),
      emergencyPanelSource(),
      emergencyDetailsModalSource(),
      emergencyRequestModalSource(),
      fabSource(),
      bottomBarSource(),
    ].forEach((source) => {
      expect(source).not.toMatch(nonCanonicalRadiusPattern);
      expect(source).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
      expect(source).not.toMatch(/\bgeo-/);
    });
  });

  it('re-anchors the preservation baseline to f31f29f after the checkpoint advanced HEAD', () => {
    const gate = gateSource();

    expect(gate).toContain('## Preservation Baseline Re-Anchor - 2026-07-07');
    expect(gate).toContain('checkpoint commits advanced `HEAD` past the preservation baseline `f31f29f`');
    expect(gate).toContain('every `git show HEAD:<old page>` reference in this gate and earlier ledgers means the preservation baseline commit `f31f29f`');
    expect(gate).toContain('The contract-test preservation helpers are pinned to `f31f29f`');

    expect(gate).toContain('## Post-Checkpoint Canon And Intake Safety Recertification - 2026-07-07');
    expect(gate).toContain('Intake safety audit, zero remaining source-closable violations:');
    expect(gate).toContain('Goal status: the console revamp is NOT complete.');

    expect(gate).toContain('## Rendered Proof Access Guide - 2026-07-07');
    expect(gate).toContain('Local rendered proof should use `frontend/.env.local`.');
    expect(gate).toContain('`frontend/.env.local` contains the Supabase runtime variables used by the local console');
    expect(gate).toContain('The local proof credential keys are `IVISIT_TEST_ADMIN_EMAIL` and `IVISIT_TEST_ADMIN_PASSWORD`.');
    expect(gate).toContain('Do not print their values in logs, docs, commits, screenshots, or final answers.');
    expect(gate).toContain('Reuse an existing `localhost:3000` server when it is already running.');
    expect(gate).toContain('Browser proof must capture desktop and mobile where the gate asks for rendered proof');

    // The pinned helper must still read the OLD Requests behavior from the baseline commit.
    const baselineRequests = gitShowHead('frontend/src/components/pages/EmergencyRequestsPage.jsx');
    expect(baselineRequests).toContain("import { useViewMode } from '../../hooks/useViewMode';");
  });

  it('proves the old Git-backed Today and Requests anchors before reuse', () => {
    const oldToday = gitShowHead('frontend/src/components/pages/BentoHome.jsx');
    const oldRequests = gitShowHead('frontend/src/components/pages/EmergencyRequestsPage.jsx');

    expect(oldToday).toContain("import { usePageData } from '../../contexts/PageDataContext';");
    expect(oldToday).toContain("import { useSubscription } from '../../hooks/useSubscription';");
    expect(oldToday).toContain('MobileDashboard');
    expect(oldToday).toContain('MapViewCard');
    expect(oldToday).toContain('VerificationQueueCard');
    expect(oldToday).toContain('AnalyticsQuickCard');
    expect(oldToday).toContain('EmergencyCounterCard');
    expect(oldToday).toContain('getWalletSummary');
    expect(oldToday).toContain('refreshAllData');
    expect(oldToday).toContain('const appStats = useMemo(() => {');

    expect(oldRequests).toContain("import { useViewMode } from '../../hooks/useViewMode';");
    expect(oldRequests).toContain('EmergencyRequestListView');
    expect(oldRequests).toContain('EmergencyRequestTableView');
    expect(oldRequests).toContain('MobileEmergency');
    expect(oldRequests).toContain('FilterSheet');
    expect(oldRequests).toContain('AnalyticsModal');
    expect(oldRequests).toContain('ConfirmationModal');
    expect(oldRequests).toContain('PaginationControls');
    expect(oldRequests).toContain('EmergencyDetailsModal');
    expect(oldRequests).toContain("const { viewMode, setViewMode } = useViewMode('emergency-requests-page', 'grid');");
    expect(oldRequests).toContain('const [selectedIds, setSelectedIds] = useState([]);');
    expect(oldRequests).toContain('const [bulkCancelModal, setBulkCancelModal] = useState({ open: false });');
    expect(oldRequests).toContain("const [cashModal, setCashModal] = useState({ open: false, request: null, amount: '50.00' });");
    expect(oldRequests).toContain('const [retryModal, setRetryModal] = useState({ open: false, request: null, methods: [], selectedId: null });');
    expect(oldRequests).toContain(".channel('emergency_changes')");
    expect(oldRequests).toContain("table: 'payments'");
    expect(oldRequests).toContain("window.addEventListener('openEmergencyModal', handleOpenModal);");
  });

  it('keeps the user-requested Today and Requests canonical audit explicit', () => {
    const gate = gateSource();

    expect(gate).toContain('## Canonical Audit Reset - 2026-06-25');
    expect(gate).toContain('Before expanding the revamp again, treat Today plus Requests as the canonical layout audit pair.');
    expect(gate).toContain('A confirmed app shell contract for the left rail/sidebar, top navbar, footer, right context panel, notification center, FABs, modals, drawers, dropdowns, and responsive states.');
    expect(gate).toContain('A page-to-layout contract that prevents any page from inventing private chrome, private spacing, private modal patterns, or private data-rendering behavior.');
    expect(gate).toContain('A Requests preservation ledger that represents the old Git-backed page and classifies every old view, modal, filter, side effect, action, subscription, pagination path, and responsive state.');
    expect(gate).toContain('A reusable Requests pattern for multi-data rendering: signal field, state choices, handled sheet, focused detail rail, route-owned action, immediate feedback, and mobile recomposition.');
    expect(gate).toContain('A design-system canon aligned with the iVisit app direction: simple language, one primary action, progressive reveal, quiet hierarchy, local non-danger semantic colors, and visible tap/hover/pending feedback.');
    expect(gate).toContain('### Active Goal Resume - 2026-07-03');
    expect(gate).toContain('Admitted pages now total 11: Today, Requests, Approvals, Staff, Payments, Live Map, Visits, Hospitals, Ambulances, Support, and Health News.');
    expect(gate).toContain('Ambulances is Page 9 and is now admitted for guarded continuation');
    expect(gate).toContain('Support is Page 10 and is now admitted for guarded continuation');
    expect(gate).toContain('Health News | `/health-news` | Admitted for guarded read-only continuation after source, schema/RLS authoring block, shared shell, context-panel, read-only modal, mobile hooks, shared filter semantics, hardgate, build, and responsive Browser proof completed 2026-07-03. It is not a new global pattern source and does not admit content authoring.');
    expect(gate).toContain('Insurance has entered Page 12 intake audit only. It is not admitted and no visual revamp is authorized until remaining admin policy command authority, billing exception authority, Storage evidence, and rendered proof blockers are closed.');
    expect(gate).toContain('policy command recertification keeps Console create/edit/delete/status/verify exports fail-closed, and legacy policy adapter plus legacy service/hook reads now fail closed.');
    expect(gate).toContain('Analytics is Page 13 intake audit only. It is not admitted and no visual revamp, report/export enablement, shared Requests pattern reuse, or hardgate promotion is authorized until actor-scoped analytics projection, export scope, degraded states, and source ownership are proved.');
    expect(gate).toContain('Users is Page 14 intake audit only. It is not admitted and no visual revamp, invite/role/delete enablement, shared Requests pattern reuse, route-owned action promotion, or hardgate promotion is authorized until identity projection, invite receiver, role mutation, destructive command, and mobile metric blockers are closed.');
    expect(gate).toContain('Organizations is Page 15 intake audit only. It is not admitted and no visual revamp, organization create/edit/delete enablement, wallet/billing metric promotion, shared Requests pattern reuse, route-owned action promotion, or hardgate promotion is authorized until organization identity, wallet scope, command authority, PageData quieting, and mobile metric blockers are closed.');
    expect(gate).toContain('Settings is Page 16 intake audit only. It is not admitted and no visual revamp, profile/security/support/billing enablement, provider self-service promotion, shared Requests pattern reuse, route-owned action promotion, or hardgate promotion is authorized until own-user settings projection, Auth adapter, preference, billing, support handoff, and provider profile blockers are closed.');
    expect(gate).toContain('Subscriptions is Page 17: the VISUAL-ONLY Requests-canon pass is applied to `MobileSubscriptions.jsx` (presentation only, no mutation added), but it remains command/backend intake only and is not admitted. Subscriber edit/delete/status/type, welcome/custom/bulk email send, export, shared Requests pattern reuse, route-owned action promotion, or hardgate promotion is not authorized until subscriber projection, email lifecycle, hidden shell acquisition, paid/billing semantics, and delivery-consequence blockers are closed.');
    expect(gate).toContain('Pricing is Page 18 intake audit only. It is not admitted and no visual revamp, price create/edit/delete/bulk delete, org-wide pricing save, context-panel command promotion, shared Requests pattern reuse, route-owned action promotion, or hardgate promotion is authorized until facility scope, pricing source owner, command authority, quote consequence, PageData/shell boundaries, and selected-hospital app quote blockers are closed.');
    expect(gate).toContain('Login is Page 19 and its public-auth visual surface is admitted for guarded continuation only (`LoginPage.jsx`). It is not a Requests multi-data pattern source. No auth-flow rewrite, auth copy rewrite, OAuth/reset/MFA promotion, or Requests pattern reuse is authorized until Auth receiver ownership, Edge `check-user` deployment truth, redirect/deep-link behavior, session/onboarding redirects, MFA factor/challenge state, and rendered public-flow proof blockers are closed.');
    expect(gate).toContain('Set Password is Page 20 and its public-recovery visual surface is admitted for guarded continuation only (`SetPasswordPage.jsx`). It is not a Requests multi-data pattern source. No recovery-flow rewrite, recovery copy rewrite, Auth update promotion, or Requests pattern reuse is authorized until recovery-session truth, password update receiver ownership, invalid/expired-link handling, redirect behavior, and rendered public-flow proof blockers are closed.');
    expect(gate).toContain('Onboarding is Page 21 and its public-registration visual surface is admitted for guarded continuation only (the route shell `OnboardingPage.jsx`, the wizard `OnboardingWizard.jsx`, and the five step components). It is not a Requests multi-data pattern source. No registration-flow rewrite, registration copy rewrite, account/org/facility creation promotion, document upload promotion, or Requests pattern reuse is authorized until admin account receiver ownership, organization/hospital identity, existing-facility claim behavior, Storage evidence, wallet/verification consequence, and rendered public-flow proof blockers are closed.');
    expect(gate).toContain('Onboarding Success is Page 22 and its visual surface is admitted for guarded public confirmation-recovery continuation only. It is not a Requests multi-data pattern source. No success-flow rewrite, dashboard-access promise, review-timing promise, display-ID product promotion, support receiver, or backend success-state source is admitted until success-state source, direct-link behavior, verification consequence, dashboard redirect outcome, support handoff, and rendered public-flow proof blockers are closed.');
    expect(gate).toContain('Unauthorized is Page 23 intake audit only. It is not admitted and no visual revamp, denied-state copy rewrite, missing-profile recovery promotion, role display promotion, public-shell hardgate promotion, or Requests pattern reuse is authorized until redirect origin, role/resource denial source, missing-profile semantics, action feedback, sign-out receiver, and rendered public-flow proof blockers are closed. `ProtectedRoute.jsx` remains in the default hardgate as shared guard code, not as Unauthorized visual admission.');
    expect(gate).toContain('Catch-All Not Found is Page 24 intake audit only. It is not admitted and no visual revamp, 404 copy rewrite, unknown-route redirect behavior, app-shell rendering, public-shell hardgate promotion, or Requests pattern reuse is authorized until route ownership, auth/shell exposure, missing-route recovery, action feedback, and rendered public-flow proof blockers are closed.');
    expect(gate).toContain('Insurance | `/insurance` | Page 12 intake audit only. Not admitted under the Today/Requests canon.');
    expect(gate).toContain('first context-panel cleanup moved the right panel off PageData; right-panel route-context cleanup on 2026-07-06 moved policy rows/stats and billing rows/stats to the active route context while keeping billing outcomes read-only');
    expect(gate).toContain('do not revamp or promote the page until admin policy command receiver authority, billing exception authority, Storage evidence, and rendered proof blockers are resolved.');
    expect(gate).toContain('Requests right-panel route-context cleanup on 2026-07-06 moved the shared desktop panel to the active route context');
    expect(gate).toContain('current `HEAD` commit `f31f29f`');
    expect(gate).toContain('Requests is the reusable multi-data reference, but only as a pattern.');
    expect(gate).toContain('The previous Git-backed page remains the preservation anchor.');
    expect(gate).toContain('Layout consistency is a gate, not polish.');
    expect(gate).toContain('Every visible action surface must acknowledge intent immediately');
    expect(gate).toContain('### Requests Trigger Feedback Recertification - 2026-07-05');
    expect(gate).toContain('Desktop header filter, desktop sheet filter, and empty-state `Change filters` triggers expose `data-state="idle|filtered|open"`');
    expect(gate).toContain('Desktop `New request` exposes `data-state="idle|open"`');
    expect(gate).toContain('Mobile filter uses the same `idle|filtered|open` filter state.');
    expect(gate).toContain('This is trigger feedback only. It does not change the Requests service owner');
    expect(gate).toContain('Desktop `/emergencies?proof=requests-trigger-feedback-2026-07-05` rendered `Requests | iVisit Console`');
    expect(gate).toContain('Opening the desktop filter changed the header filter trigger to `data-state="open"`');
    expect(gate).toContain('Mobile `390x844` `/emergencies?proof=requests-trigger-feedback-mobile-2026-07-05`');
    expect(gate).toContain('Shared FilterSheet close repair, 2026-07-05:');
    expect(gate).toContain('a closed `FilterSheet` could leave an invisible `role="dialog"` / `aria-modal="true"` surface');
    expect(gate).toContain('`FilterSheet.jsx` now returns `null` when closed and uses keyed direct `filter-sheet-backdrop` and `filter-sheet-shell` motion children plus bounded `filterBackdropTransition` and `filterSheetTransition` timings');
    expect(gate).toContain('Closed filter sheets must unmount instead of becoming invisible modal chrome.');
    expect(gate).toContain('any shared drawer, sheet, or modal must prove close/dismiss leaves no active dialog, no focus trap, no pointer-catching invisible surface, and no bottom-island suppression');
    expect(gate).toContain('Shared ModalShell close repair, 2026-07-05:');
    expect(gate).toContain('`ModalShell.jsx` still used an `AnimatePresence` exit path');
    expect(gate).toContain('Closed modals must unmount instead of relying on exit animation cleanup.');
    expect(gate).toContain('canonical modals must share `ModalShell`, open with immediate visible feedback, and prove close/dismiss leaves no active `role="dialog"`');
    expect(gate).toContain('### Shared Analytics Modal Recertification - 2026-07-05');
    expect(gate).toContain('`AnalyticsModal.jsx` now uses plain labels such as `Statistics`, `Summary`, `Priority`, `Status`, `Avg response`, `Needs review`, `Close`, and `Next`.');
    expect(gate).toContain('`AnalyticsModal.jsx` now uses shared `ModalShell` chrome for backdrop, ARIA dialog semantics, scroll containment, sticky footer framing, and mobile shell suppression instead of private fixed overlay/dialog markup.');
    expect(gate).toContain('It removes old command-room copy such as `Analytic Engine`, `Response Pulse`, `Priority Heat`, `Status Flow`, `Health Index`, `In-Flow`, `Signal processing`, and `No segments detected`.');
    expect(gate).toContain('The modal no longer invents `12.0m` response time from `avgResponseTime || 12`');
    expect(gate).toContain('Missing response time or missing denominator renders `No data`.');
    expect(gate).toContain('`AnalyticsModal` remains a renderer for route-provided stats and does not become a data owner');
    expect(gate).toContain('### Requests RBAC Resource Recertification - 2026-07-05');
    expect(gate).toContain('Requests route compatibility stays `/emergencies`, but the permission and backend resource name is now `emergency_requests`.');
    expect(gate).toContain('`AuthContext.can()` normalizes the old `emergencies` resource name to `emergency_requests` as a compatibility alias only.');
    expect(gate).toContain('Rendered proof, 2026-07-05 recertification:');
    expect(gate).toContain('the in-app Browser loaded `/emergencies?proof=requests-rbac-render-2026-07-05` in a fresh tab');
    expect(gate).toContain('settled to `Requests | iVisit Console`');
    expect(gate).toContain('Opening the desktop `Filters` trigger resolved one control');
    expect(gate).not.toContain('Rendered proof is still not claimed for this recertification.');
    expect(gate).toContain('### Today/Requests Color And Feedback Recertification - 2026-07-03');
    expect(gate).toContain('Today route actions use neutral foreground buttons, not brand-danger red.');
    expect(gate).toContain('Today non-danger `primary` tone now uses the local sky semantic treatment');
    expect(gate).toContain('Requests filter triggers, active-filter indicators, empty-state filter recovery, mobile filter taps, and mobile statistics taps use neutral or sky feedback rather than red.');
    expect(gate).toContain('Each Today glance card renders a route CTA icon (`ArrowRight`) and mutates that icon to `Loader2` while opening');
    expect(gate).toContain('Rendered proof, 2026-07-04:');
    expect(gate).toContain('Today desktop at `/?proof=today-color-canon` rendered `Today | iVisit Console`');
    expect(gate).toContain('Requests desktop at `/emergencies?proof=requests-color-canon` rendered `Requests | iVisit Console`');
    expect(gate).toContain('Requests mobile at `/emergencies?proof=requests-color-canon-mobile`');
    expect(gate).toContain('The in-app browser automation API reset twice during local content polling');
    expect(gate).toContain('The next page may enter audit intake only.');
    expect(gate).toContain('### Active Goal Resume - 2026-07-04');
    expect(gate).toContain('The goal is resumed as a canon-confirmation pass before any further page expansion.');
    expect(gate).toContain('shared shell first, page relationship second, old Git preservation third, Requests pattern extraction fourth, and visual implementation last');
    expect(gate).toContain('`TodayHome.jsx` and `EmergencyRequestsPage.jsx` both use `usePageShell({ bleed: true, hideFab: true })`');
    expect(gate).toContain('The avatar/account sheet may contain `Menu` and `Quick Actions` tabs, but it is not a second bottom-bar menu or hamburger entry point.');
    expect(gate).toContain('`getEmergencyRequestsPage()` and `getEmergencyRequestsPageStats()` remain the route read/stat owners');
    expect(gate).toContain('Today and Requests stay the only canonical reference pair.');
    expect(gate).toContain('### User Canon Checkpoint - 2026-07-04');
    expect(gate).toContain('Today is the role-first home. It does not carry the old dashboard\'s full multi-data burden.');
    expect(gate).toContain('Requests is the page that absorbs the old multi-data work: list/table/card density, filters, modals, realtime refresh, pagination, mobile recomposition, detail focus, and action feedback.');
    expect(gate).toContain('Active Requests handled-sheet lock, 2026-07-05:');
    expect(gate).toContain('The old Git-backed Requests page remains the preservation anchor for `useViewMode`, `ViewToggle`, `EmergencyRequestListView`, and `EmergencyRequestTableView`.');
    expect(gate).toContain('The active Requests route does not import those legacy density surfaces.');
    expect(gate).toContain('Legacy list/table/card density may be reintroduced only as variants of the same `getEmergencyRequestsPage()` projection');
    expect(gate).toContain('It cannot return as a second request source, private view-mode store, or private page chrome.');
    expect(gate).toContain('Today/Requests data-ownership lock, 2026-07-05:');
    expect(gate).toContain('Today at `/` is not a route-owned startup override.');
    expect(gate).toContain('Today cannot present PageData startup failure, mock fallback, or role-critical loading as complete truth.');
    expect(gate).toContain('Requests at `/emergencies` is route-owned with a zero-domain startup override.');
    expect(gate).toContain('Active Requests cannot consume `PageDataContext` emergency stats for KPI, signal, mobile, analytics, or handled-sheet rendering.');
    expect(gate).toContain('Today right-panel route-context lock, 2026-07-06:');
    expect(gate).toContain('`TodayHome.jsx` publishes `todayPanelContext`');
    expect(gate).toContain('passes `<DashboardPanel todayContext={todayRouteContext} />`');
    expect(gate).toContain('`DashboardPanel.jsx` consumes `todayContext`, not `usePageData`');
    expect(gate).toContain('Requests right-panel route-context lock, 2026-07-06:');
    expect(gate).toContain('`EmergencyRequestsPage.jsx` publishes `requestPanelContext`');
    expect(gate).toContain('`ContextPanel.jsx` requests that context with `requestEmergencyRouteContext`');
    expect(gate).toContain('passes `<EmergencyPanel requestContext={emergencyRouteContext} />`');
    expect(gate).toContain('`EmergencyPanel.jsx` consumes `requestContext`, not `usePageData`');
    expect(gate).toContain('Today/Requests private shell chrome lock, 2026-07-05:');
    expect(gate).toContain('Today and Requests consume shell state through `usePageHeader`, `usePageFooter`, and `usePageShell`.');
    expect(gate).toContain('They do not import shared shell owners such as `SmartHeader`, `ResponsiveSidebar`, `IslandNavigation`, `DynamicBottomBar`, `ContextAwareFAB`, `NotificationCenter`, `MobileNavMenu`, `ContextPanelShell`, or `SmartFooter`.');
    expect(gate).toContain('Page-local surfaces are allowed only when mapped in the ledger and backed by the shared component system');
    expect(gate).toContain('A private header, sidebar, notification dropdown, mobile menu, footer, FAB, or right-panel shell fails the page-to-layout gate before visual review.');
    expect(gate).toContain('Today/Requests route-owned action duplication lock, 2026-07-05:');
    expect(gate).toContain('`ContextAwareFAB.jsx` and `DynamicBottomBar.jsx` both treat `/` and `/emergencies` as route-owned action surfaces');
    expect(gate).toContain('Requests mobile may show one route-owned `New request` action through `getRouteOwnedMobileAction()` and `openEmergencyModal`.');
    expect(gate).toContain('Today has no shell-level mobile FAB because the first-glance cards and primary CTA own the next action.');
    expect(gate).toContain('They cannot show two competing action models for the same route.');
    expect(gate).toContain('Today/Requests state-pattern lock, 2026-07-05:');
    expect(gate).toContain('Today treats role-critical loading, PageData domain failure, or mock fallback as not-ready truth');
    expect(gate).toContain('It must not show clear/all-clear copy while the role-critical summary is incomplete.');
    expect(gate).toContain('Requests separates structural loading, full failed load, stale refresh failure with existing rows, true empty filters, selected rows, opened filters, and modal-open feedback.');
    expect(gate).toContain('`RequestSkeletonRows`, `RequestLoadErrorState`, `RequestLoadNotice`, `No matching requests`, `Change filters`, `data-state`, `aria-pressed`, `aria-expanded`, and retry controls are the desktop reference.');
    expect(gate).toContain('Requests mobile mirrors the same state contract with `MobileListSkeletonRows`, `MobileListEmpty`, `MobileListLoadMore`, pull-to-refresh, filter/statistics open state, KPI selected state, and row `expanded`/`idle` state.');
    expect(gate).toContain('A page cannot turn failed, capped, loading, or filtered data into complete truth.');
    expect(gate).toContain('Today/Requests action-authority lock, 2026-07-05:');
    expect(gate).toContain('Today is navigation-only.');
    expect(gate).toContain('`TodayHome.jsx` can set route-transition feedback and call `navigate(path)`, but it must not import Supabase, Requests service commands, dispatch/complete/cancel/payment receivers, or toast success copy.');
    expect(gate).toContain('Requests is receiver-backed.');
    expect(gate).toContain('dispatch uses `dispatchEmergency`; completion uses `completeEmergency`; payment retry uses `retryPaymentWithDifferentMethod`; cancellation uses `cancelEmergencyRequest`; all stay behind `getEmergencyActionState()` and role checks.');
    expect(gate).toContain('Requests must show immediate action feedback through `data-state`, modal open state, confirmation modal, or toast loading/success/error.');
    expect(gate).toContain('Cash settlement remains unavailable in Requests until the finance receiver pass proves authority.');
    expect(gate).toContain('Requests native dialog recertification, 2026-07-05:');
    expect(gate).toContain('Active Requests contains no `window.prompt`, `window.confirm`, `prompt(`, or `confirm(` calls in the route, mobile, legacy density, request modal, details modal, emergency service, response service, or action utility slice.');
    expect(gate).toContain('Payment retry saved-method selection uses shared `ModalShell` with route-owned radio choices and `retryPaymentWithDifferentMethod` as the receiver-backed submit.');
    expect(gate).toContain('Single cancel and mark-complete use `ConfirmationModal`; bulk cancel/select remains excluded until destructive receiver authority, role scope, confirmation design, and app consequence are proved.');
    expect(gate).toContain('Native browser dialogs are not reusable modal or confirmation proof for any future page.');
    expect(gate).toContain('Requests visible-action recertification, 2026-07-05:');
    expect(gate).toContain('Active Requests contains no `opacity-0 group-hover:opacity-100`, `group-hover:opacity-100`, or `hover:opacity` action reveal pattern in the route or mobile surface.');
    expect(gate).toContain('Desktop actions are visible in the focused detail rail: one full-width primary action from `getPrimaryRailAction()` plus visible secondary rail buttons for Dispatch, Complete, Retry, and Details when those receivers are allowed.');
    expect(gate).toContain('The old inactive list view still contains hover-reveal action chrome and cannot be reintroduced as active UI until it is converted to visible pointer, keyboard, and touch-safe actions.');
    expect(gate).toContain('Future pages must keep receiver, role, payload, pending feedback, success/failure feedback, and app consequence named before any action remains enabled.');
    expect(gate).toContain('Today/Requests realtime and side-effect lock, 2026-07-05:');
    expect(gate).toContain('Today has no page-owned realtime, direct Supabase reads/writes, or domain side-effect owner.');
    expect(gate).toContain('Its only window event listener is the route-context publisher that feeds the shared right panel');
    expect(gate).toContain("one `supabase.channel('emergency_changes')` in `EmergencyRequestsPage.jsx`, scoped to `emergency_requests` and `payments`");
    expect(gate).toContain('Requests guards concurrent route refreshes with `requestSeqRef`.');
    expect(gate).toContain('Stale responses must return before mutating rows, stats, loading, or error state');
    expect(gate).toContain('Requests still has a legacy shell action bridge for route-owned openings: `openEmergencyModal`, `openFilters`, and `openAnalyticsModal`.');
    expect(gate).toContain('Each listener must have a matching `removeEventListener` cleanup');
    expect(gate).toContain('Future pages must name startup domains, direct Supabase/Auth/Edge/Storage call sites, realtime channel owner, event-bus/timer owner, cleanup behavior, stale-response behavior, and denied/failed feedback before any side effect remains active.');
    expect(gate).toContain('Today/Requests query-scope lock, 2026-07-05:');
    expect(gate).toContain('Today may display role-scoped summary counts from `PageDataContext` only as first-glance routing guidance.');
    expect(gate).toContain('Requests owns multi-data query scope through `getEmergencyRequestsPage()`');
    expect(gate).toContain('the route passes `kpiFilter`, `limit`, `offset`, `sortKey`, and `sortDirection`');
    expect(gate).toContain('`emergencyService.js` owns exact counts through `getEmergencyPageExactCount()` with `count: \'exact\'` and `head: true`');
    expect(gate).toContain('page rows are loaded with `.range(offset, offset + limit - 1)` and an allowlisted sort key.');
    expect(gate).toContain('The Requests sheet renders `PaginationControls` from the service-backed `totalCount` and `itemsPerPage`.');
    expect(gate).toContain('Empty filter state is based on `Number(pagination.totalCount) === 0`');
    expect(gate).toContain('Future pages must name exact count owner, filter normalization, date bounds, sort allowlist, pagination owner, export scope');
    expect(gate).toContain('The shared shell is the product frame: left sidebar/rail, top navbar, footer visibility, right context panel, notification dropdown, FABs, modals, drawers, dropdowns, filters, and responsive states belong to shared shell/components.');
    expect(gate).toContain('It must not add private sidebar, header, modal chrome, filter language, dropdown style, footer, FAB model, notification dropdown, or data-rendering behavior unless the page ledger records an approved canonical exception.');
    expect(gate).toContain('audit old behavior, preserve function and data, revamp UI, confirm the page-specific canon, then reuse globally.');
    expect(gate).toContain('### Today/Requests Canon Evidence Matrix - 2026-07-04');
    expect(gate).toContain('This matrix is not a full-console completion claim.');
    expect(gate).toContain('Proved for Today/Requests shell ownership');
    expect(gate).toContain('Represented and classified: old views, filters, modals, side effects, actions, subscriptions, pagination, loading, empty, error, and responsive states');
    expect(gate).toContain('Proved as pattern, not markup');
    expect(gate).toContain('New page actions need the full `source truth -> receiver -> app consequence` chain before controls stay enabled.');
    expect(gate).toContain('Each long run must check for leftover listeners/artifacts before final status.');
    expect(gate).toContain('### Active Goal Completion Audit - 2026-07-05');
    expect(gate).toContain('This audit protects the active thread goal from being marked complete too early.');
    expect(gate).toContain('The current evidence proves the Today/Requests canon and the page-by-page admission system; it does not prove the whole console revamp is finished.');
    expect(gate).toContain('| Finish the whole console revamp. | Current gate records release-complete gaps, intake-only pages, blocked actions, excluded destructive/finance/content-authoring flows, and per-page proof requirements. | Not complete.');
    expect(gate).toContain('Do not call the active goal achieved until every admitted page has current triad proof, RBAC/action authority, source owner, desktop/mobile rendered proof, hardgate/build/encoding proof, local cleanup, and no remaining release blockers');
    expect(gate).toContain('Decision: keep the goal active.');
    expect(gate).toContain('### Today/Requests Git-History Source Recertification - 2026-07-05');
    expect(gate).toContain("Targeted history check: `git log --since='2026-06-28'");
    expect(gate).toContain('returned no newer committed changes for those anchor files');
    expect(gate).toContain('The preservation baseline for this pass therefore remains committed `HEAD` at `f31f29f`.');
    expect(gate).toContain('Old Today evidence is `git show HEAD:frontend/src/components/pages/BentoHome.jsx`');
    expect(gate).toContain('Old Requests evidence is `git show HEAD:frontend/src/components/pages/EmergencyRequestsPage.jsx`');
    expect(gate).toContain('Active Today evidence is `TodayHome.jsx`');
    expect(gate).toContain('publishes `todayPanelContext` for the shared right panel');
    expect(gate).toContain('Active Requests evidence is `EmergencyRequestsPage.jsx`');
    expect(gate).toContain('Future-page rule: before a page can reuse Requests, the ledger must include the same three-part proof');
    expect(gate).toContain('targeted recent Git history, `git show HEAD:<old page>` behavior inventory, and active-source grep');
  });

  it('keeps the Requests right panel route-owned under the shared shell', () => {
    const gate = gateSource();
    const hardgate = hardgateSource();
    const page = emergencyRequestsSource();
    const shellPanel = contextPanelSource();
    const requestsPanel = emergencyPanelSource();

    expect(gate).toContain('Requests right-panel route-context lock, 2026-07-06:');
    expect(gate).toContain('old right-panel emergency rows.');
    expect(gate).toContain('Active Requests no longer consumes `PageDataContext` emergency stats for KPI, signal, mobile, analytics, handled-sheet, or right-panel rendering.');
    expect(gate).toContain('Requests right-panel route-context cleanup on 2026-07-06 moved the panel off PageData emergency rows and into the active route context');
    expect(page).toContain('const requestPanelContext = useMemo(() => ({');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('emergencyRouteContextUpdated', {");
    expect(page).toContain("window.addEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);");
    expect(shellPanel).toContain('const [emergencyRouteContext, setEmergencyRouteContext] = React.useState(null);');
    expect(shellPanel).toContain("window.dispatchEvent(new CustomEvent('requestEmergencyRouteContext'));");
    expect(shellPanel).toContain('<EmergencyPanel requestContext={emergencyRouteContext} />');
    expect(shellPanel).not.toContain('emergencyData={emergencyData}');
    expect(requestsPanel).toContain('export const EmergencyPanel = ({ requestContext }) =>');
    expect(requestsPanel).toContain('Requests overview');
    expect(requestsPanel).toContain('Current route scope');
    expect(requestsPanel).toContain('Panel actions');
    expect(requestsPanel).toContain('Current list');
    expect(requestsPanel).toContain('role="status" aria-live="polite"');
    expect(requestsPanel).not.toContain('usePageData');
    expect(requestsPanel).not.toContain('Using Mock Data');
    expect(hardgate).toContain('src/components/context/EmergencyPanel.jsx');
  });

  it('keeps the Today right panel route-owned under the shared shell', () => {
    const gate = gateSource();
    const hardgate = hardgateSource();
    const today = fs.readFileSync('src/components/pages/TodayHome.jsx', 'utf8');
    const shellPanel = contextPanelSource();
    const dashboardPanel = dashboardPanelSource();
    const oldDashboardPanel = gitShowHead('frontend/src/components/context/DashboardPanel.jsx');

    expect(oldDashboardPanel).toContain("import { usePageData } from '../../contexts/PageDataContext';");
    expect(oldDashboardPanel).toContain('refreshAllData');
    expect(oldDashboardPanel).toContain("new CustomEvent('openEmergencyModal')");
    expect(oldDashboardPanel).toContain("fetch('/api/backup'");
    expect(gate).toContain('Today right-panel route-context lock, 2026-07-06:');
    expect(gate).toContain('old global dashboard data props');
    expect(gate).toContain('Active Today no longer lets the shared right panel duplicate PageData summary truth');
    expect(today).toContain('const todayPanelContext = useMemo(() => ({');
    expect(today).toContain("window.dispatchEvent(new CustomEvent('todayRouteContextUpdated', {");
    expect(today).toContain("window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);");
    expect(shellPanel).toContain('const [todayRouteContext, setTodayRouteContext] = React.useState(null);');
    expect(shellPanel).toContain("window.dispatchEvent(new CustomEvent('requestTodayRouteContext'));");
    expect(shellPanel).toContain('<DashboardPanel todayContext={todayRouteContext} />');
    expect(shellPanel).not.toContain('refreshAllData={refreshAllData}');
    expect(dashboardPanel).toContain('export const DashboardPanel = ({ todayContext }) =>');
    expect(dashboardPanel).toContain('Today overview');
    expect(dashboardPanel).toContain('Current route scope');
    expect(dashboardPanel).toContain('Panel actions');
    expect(dashboardPanel).toContain('Current list');
    expect(dashboardPanel).toContain('role="status" aria-live="polite"');
    expect(dashboardPanel).not.toContain('usePageData');
    expect(dashboardPanel).not.toContain('refreshAllData');
    expect(dashboardPanel).not.toContain('openEmergencyModal');
    expect(dashboardPanel).not.toContain('openAnalyticsModal');
    expect(dashboardPanel).not.toContain('/api/backup');
    expect(dashboardPanel).not.toContain('Quick Actions');
    expect(hardgate).toContain('src/components/context/DashboardPanel.jsx');
  });

  it('keeps the Approvals right panel inside the shared shell hardgate', () => {
    const gate = gateSource();
    const hardgate = hardgateSource();
    const panel = verificationPanelSource();

    expect(hardgate).toContain('src/components/context/VerificationPanel.jsx');
    expect(gate).toContain('Approvals right-panel hardgate cleanup on 2026-07-06');
    expect(gate).toContain('`VerificationPanel.jsx` is now in the default UI hardgate');
    expect(gate).toContain('Export is unavailable until approval report authority is proved.');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain('data-state="unavailable"');
    expect(panel).toContain('aria-live="polite"');
  });

  it('keeps the shell, page relationship, and next-page admission gate in one source of truth', () => {
    const gate = gateSource();

    expect(gate).toContain('### Canonical App Shell');
    expect(gate).toContain('Pages consume the shell; pages do not invent shell.');
    expect(gate).toContain('usePageShell({ bleed, hideFab })');
    expect(gate).toContain('Mobile navigation is `DynamicBottomBar` plus the top-left avatar/account sheet.');
    expect(gate).toContain('Global FABs are off on route-owned pages.');
    expect(gate).toContain('### Shell Architecture Source Recertification - 2026-07-04');
    expect(gate).toContain('`App.js` mounts one authenticated frame');
    expect(gate).toContain('`LayoutContext.jsx` owns route shell state');
    expect(gate).toContain('`SmartHeader.jsx` owns top title, shared search, notification trigger, context-panel trigger, and the top-left mobile account sheet.');
    expect(gate).toContain('`QuickSearch` is the shared search dialog.');
    expect(gate).toContain('the current `Requests` category label for `/emergencies` results instead of the old `Emergency Requests` copy');
    expect(gate).toContain('`DynamicBottomBar.jsx` owns the mobile bottom island and route-owned mobile actions.');
    expect(gate).toContain('`ModalShell.jsx` is now in the default UI surface hardgate.');
    expect(gate).toContain('wraps subtitle copy on mobile');
    expect(gate).toContain('Shell data side-effect cleanup, 2026-07-05:');
    expect(gate).toContain('`useSupportTickets()` now has explicit `autoFetch`, `autoSubscribe`, and `quiet` options.');
    expect(gate).toContain('`ContextAwareFAB.jsx` and `DynamicBottomBar.jsx` call `useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })`');
    expect(gate).toContain('global shell chrome may expose command affordances, but it may not acquire page-domain truth');
    expect(gate).toContain('Rendered shell/modal proof, 2026-07-04:');
    expect(gate).toContain('Desktop `1440x900` opened Requests, then `New request`');
    expect(gate).toContain('Mobile `390x844` opened Requests with the top-left account/Home model and bottom island');
    expect(gate).toContain('hid `#dynamic-bottom-bar` with `aria-hidden="true"` / invisible / non-interactive state');
    expect(gate).toContain('No Requests/modal runtime warning or error was produced.');
    expect(gate).toContain('private app chrome, private modal wrappers, private notification dropdowns, private right-panel shells, private mobile menu buttons, or private filter/dialog surfaces');
    expect(gate).toContain('### Canonical Interaction Surface Ownership - 2026-07-04');
    expect(gate).toContain('| Modal trigger | Route action, shared header control, route-owned mobile action, or context-panel action that the page handles.');
    expect(gate).toContain('| Modal design | `ModalShell` plus the domain modal body.');
    expect(gate).toContain('| Dropdown/menu | Shared shell or common UI dropdown primitives.');
    expect(gate).toContain('| Filters | Shared `FilterSheet` plus route-owned filter state.');
    expect(gate).toContain('| Tabs/segmented controls | Shared tab/view primitives when a page ledger keeps density variants.');
    expect(gate).toContain('| Cards, rows, and tables | Page scan surface using the route projection.');
    expect(gate).toContain('| Empty/loading/error states | Page body using shared structural state patterns.');
    expect(gate).toContain('| Right panel/detail rail | `ContextPanelShell` for shell context or an approved page-owned focused rail.');
    expect(gate).toContain('| Notifications | `NotificationCenter` in the shell.');
    expect(gate).toContain('| Responsive behavior | Shared shell plus page-specific recomposition declared in the ledger.');
    expect(gate).toContain('No private hamburger unless the shell canon changes.');
    expect(gate).toContain('### Page-To-Layout Relationship');
    expect(gate).toContain('No page may add a private sidebar, private header, private footer, private notification dropdown, private modal chrome, private FAB model, private filter language, or private dropdown style');
    expect(gate).toContain('### Canonical Page Ledger Template');
    expect(gate).toContain('### Today Preservation Ledger From HEAD');
    expect(gate).toContain('HEAD did not contain `frontend/src/components/pages/TodayHome.jsx`');
    expect(gate).toContain('Treat old `BentoHome` as the Git-backed preservation anchor for Page 1.');
    expect(gate).toContain('Console roles enter `TodayHome` before the legacy bento loading grid.');
    expect(gate).toContain('role-critical loading, mock data, or domain errors as `Live details are not ready`');
    expect(gate).toContain('Legacy skeletons remain only for the non-console/patient dashboard path.');
    expect(gate).toContain('### Next Page Admission Gate');
    expect(gate).toContain('audit old behavior -> preserve function/data -> revamp UI -> confirm canonical -> reuse globally');
  });

  it('keeps Page 11 Health News in audit-only intake until source and UX proof exist', () => {
    const gate = gateSource();

    expect(gate).toContain('### Page 11 Admission - Health News');
    expect(gate).toContain('Health News at `/health-news` is admitted under the Today/Requests canon as a read-only published-feed surface only.');
    expect(gate).toContain('This does not make Health News a reusable global pattern source');
    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/HealthNewsManagementPage.jsx`');
    expect(gate).toContain('`healthNewsService.js` now exposes `getHealthNewsPage()` and `getHealthNewsPageStats()`');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` no longer performs page-level direct `supabase.from');
    expect(gate).toContain('Route read failure now renders `Health news could not load. Try again.`');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` now publishes a route-owned `healthNewsPanelContext`');
    expect(gate).toContain('`HealthNewsListView.jsx` and `HealthNewsTableView.jsx` are read/details-only density surfaces.');
    expect(gate).toContain('`HealthNewsModal.jsx` now uses shared `ModalShell` for dialog chrome.');
    expect(gate).toContain('Active page behavior opens a read-only `HealthNewsReadView` for details');
    expect(gate).toContain('`HealthNewsManagementPage.jsx` now uses `usePageShell({ bleed: true, hideFab: true })`');
    expect(gate).toContain('The active Health News surfaces are now in the default UI hardgate');
    expect(gate).toContain('Rendered Browser/IAB proof reused one static production server on `127.0.0.1:3000`');
    expect(gate).toContain('The mobile filter tap opened one `role="dialog"`/`aria-modal="true"` bottom sheet');
    expect(gate).toContain('Health News is admitted for guarded read-only continuation only.');
    expect(gate).toContain('create/edit writer authority, payload fields, RLS, and app/public-feed consequence remain unproved');
    expect(gate).toContain('Active create, edit, publish/unpublish, single delete, bulk delete, and notification side effects are unavailable/excluded');
    expect(gate).toContain('It no longer renders hardcoded chart data, `LIVE` trend copy, row selection, publish/unpublish, edit, or delete controls.');
    expect(gate).toContain('Decision: Health News is admitted as a deliberately read-only published-feed surface.');
  });

  it('keeps Page 12 Insurance in intake only until authority, storage, billing, and shell blockers close', () => {
    const gate = gateSource();
    const hardgate = hardgateSource();

    expect(gate).toContain('### Page 12 Intake Audit - Insurance');
    expect(gate).toContain('Insurance at `/insurance` is in intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, or command re-enable is authorized yet.');
    expect(gate).toContain('`App.js` mounts `/insurance` behind `ProtectedRoute minRole="admin"`.');
    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/InsuranceManagementPage.jsx`');
    expect(gate).toContain('First route projection cleanup on 2026-07-03 added `getInsurancePage()` and `getInsurancePageStats()`');
    expect(gate).toContain('`InsuranceManagementPage.jsx` now consumes `getInsurancePage()` directly instead of `useInsurance()`');
    expect(gate).toContain('Current policy proof says `insurance_policies` is patient-owner CRUD only.');
    expect(gate).toContain('`insurance_billing` is trigger-created billing truth');
    expect(gate).toContain('Storage evidence is blocked.');
    expect(gate).toContain('Route identity cleanup on 2026-07-06 mounted `SEOHead title="Insurance"` in both desktop and mobile Insurance branches');
    expect(gate).toContain('First modal/mobile truth cleanup on 2026-07-03 converted `InsuranceModal.jsx` to the shared `ModalShell`');
    expect(gate).toContain('`MobileInsurance.jsx` now consumes scoped route stats from `getInsurancePage()`');
    expect(gate).toContain('First context-panel cleanup on 2026-07-03 moved `InsurancePanel.jsx` off `PageDataContext` policy rows and stats.');
    expect(gate).toContain('Right-panel route-context cleanup on 2026-07-06 moved the policy side of `InsurancePanel.jsx` to the active route projection');
    expect(gate).toContain('Right-panel billing route-context cleanup on 2026-07-06 moved the panel claim summary to the active route projection too');
    expect(gate).toContain('First billing-result cleanup on 2026-07-03 added a read-only `insurance_billing` projection through `getInsuranceBillingOutcomes()` and `getInsuranceBillingOutcomeStats()`.');
    expect(gate).toContain('Second data-owner cleanup on 2026-07-04 moved the remaining lazy/manual `PageDataContext` Insurance read path from `insurancePoliciesService.js` to `getInsurancePage()`.');
    expect(gate).toContain('Third duplicate-write cleanup on 2026-07-04 removed the direct Supabase `insert`, policy `update`, `delete`, and document-image `update` bodies from `insurancePoliciesService.js`.');
    expect(gate).toContain('First storage safety cleanup on 2026-07-04 removed the active Storage upload and one-year signed URL creation from `uploadInsuranceCardImage()` in `insuranceService.js`.');
    expect(gate).toContain('Card preview safety cleanup on 2026-07-05 stopped `InsuranceModal.jsx` from rendering `front_image_url` and `back_image_url` as direct `<img>` requests.');
    expect(gate).toContain('First policy-command safety cleanup on 2026-07-04 removed the active direct Supabase `insert`, policy `update`, status `update`, verification `update`, and `delete` bodies from `insuranceService.js`.');
    expect(gate).toContain('First legacy-hook command cleanup on 2026-07-04 removed policy command imports and optimistic local policy mutations from `useInsurance.js`.');
    expect(gate).toContain('Legacy service/hook read cleanup on 2026-07-05 removed the old direct `getInsurancePolicies()` / `getInsurancePolicy()` read bodies from `insuranceService.js` and removed the `useInsurance()` auto-fetch/realtime subscription.');
    expect(gate).toContain('Context-panel command affordance cleanup on 2026-07-05 kept Add and Export page-owned but changed both right-panel controls to muted unavailable states');
    expect(gate).toContain('Right-panel loading/chrome cleanup on 2026-07-05 removed the primary glow loader from `InsurancePanel.jsx`');
    expect(gate).toContain('Ordinary insurance color/language cleanup on 2026-07-05 moved non-danger read-only policy evidence, verified marks, filter feedback, mobile details, list/table icons, and modal evidence chrome away from brand-primary styling');
    expect(gate).toContain('Legacy payload-builder cleanup on 2026-07-05 kept the old `buildInsuranceWritePayload()` export for import compatibility but changed it to fail closed, then removed the dead linked-payment and coverage-detail mutation helper scaffolding from `insuranceService.js`.');
    expect(gate).toContain('Failed-read state cleanup on 2026-07-05 changed `getInsurancePage()` and `getInsuranceBillingOutcomes()` to return explicit `failed: true`');
    expect(gate).toContain('preserves the last loaded route projection during a failed refresh');
    expect(gate).toContain('Route realtime cleanup on 2026-07-05 added `isMountedRef`, `fetchRequestRef`, and `canUpdateRouteState()` guards to `InsuranceManagementPage.jsx`.');
    expect(gate).toContain('The 2026-07-06 route-context cleanups superseded that panel ownership');
    expect(gate).toContain('`InsurancePanel.jsx` no longer starts policy or billing reads');
    expect(gate).toContain('App storage evidence recertification on 2026-07-04 read `ivisit-app/services/insuranceService.js`');
    expect(gate).toContain('Billing command surface recertification on 2026-07-04 found Console only reads `insurance_billing`');
    expect(gate).toContain('Console must not invent an `insurance_billing` mutation path from trigger-created evidence.');
    expect(gate).toContain('Policy command authority recertification on 2026-07-04 checked the app-side service, RLS migration, and insurance surface field guard.');
    expect(gate).toContain('That guard does not prove Console admin create/edit/delete/status/verify authority, a Console command receiver, an admin policy RPC, or app consequence.');
    expect(gate).toContain('The fail-closed Console command exports remain the correct state.');
    expect(gate).toContain('Command/storage/billing recertification on 2026-07-05 checked current `ivisit-app` service, RLS, console API reference, console schema snapshot, Edge Functions, and insurance surface guard.');
    expect(gate).toContain('The app API reference exposes `approve_cash_payment` and `create_insurance_billing_on_completion()` as the only insurance/billing-adjacent names');
    expect(gate).toContain('no Console policy command receiver, billing exception receiver, Storage owner/path contract, or app consequence');
    expect(gate).toContain('Therefore Console policy commands, billing mutations, card upload, and direct card previews remain fail-closed.');
    expect(gate).toContain('Rendered intake proof on 2026-07-05 reused the single `localhost:3000` server');
    expect(gate).toContain('true empty state `No policies yet` / `No policy records are available for this scope yet.`');
    expect(gate).toContain('The same proof pass also observed the explicit denied/degraded copy path without a blank shell.');
    expect(gate).toContain('This closes the old local login/runtime proof blocker only; it does not admit Insurance visually or prove admin policy/billing/storage authority.');
    expect(gate).toContain('Read-only feedback proof on 2026-07-05 found the header read-only action needed persistent visible feedback beyond a toast.');
    expect(gate).toContain('Default hardgate admission guard on 2026-07-05 keeps Insurance outside `scripts/check-ui-surface-hardgate.js`');
    expect(gate).toContain('Rendered intake proof is runtime proof only, not visual admission.');
    expect(gate).toContain('First safety cleanup on 2026-07-03 removed those imports/cases');
    expect(gate).toContain('First safety cleanup on 2026-07-03 removed Insurance from default admin startup domains');
    expect(gate).toContain('First safety cleanup on 2026-07-03 removed the data-bearing payload log');
    expect(gate).toContain('Query failure, provider denial, and true empty are now separated in the active intake source.');
    expect(gate).toContain('Global FAB/mobile bottom action opening Insurance modal.');
    expect(gate).toContain('Insurance is Page 12 intake only. It is not admitted, not a reusable pattern source, and not ready for visual implementation.');
    [
      'src/components/pages/InsuranceManagementPage.jsx',
      'src/components/mobile/MobileInsurance.jsx',
      'src/components/context/InsurancePanel.jsx',
      'src/components/modals/InsuranceModal.jsx',
      'src/components/views/InsuranceListView.jsx',
      'src/components/views/InsuranceTableView.jsx',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('keeps reachable but unadmitted routes queued outside the Requests canon and hardgate', () => {
    const gate = gateSource();
    const app = appSource();
    const navigation = navigationSource();
    const mobileNavigation = mobileNavigationSource();
    const moduleRail = moduleRailSource();
    const hardgate = hardgateSource();

    expect(gate).toContain('### Reachable But Unadmitted Route Queue - 2026-07-05');
    expect(gate).toContain('Route/nav inventory checked `App.js`, `navigation.js`, `mobileNavigation.js`, `consoleModuleRail.js`, and `scripts/check-ui-surface-hardgate.js`.');
    expect(gate).toContain('| `/analytics` | Main nav `Statistics`, sponsor mobile `Statistics`, module rail `Statistics`; route min role `provider`. | Not admitted.');
    expect(gate).toContain('| `/users` | Admin nav `Users`; route min role `org_admin`. | Not admitted.');
    expect(gate).toContain('| `/organizations` | Admin nav `Organizations`; route min role `admin`. | Not admitted.');
    expect(gate).toContain('| `/settings` | Account nav `Settings`, viewer/sponsor mobile `Settings`; protected route. | Not admitted.');
    expect(gate).toContain('| `/subscriptions` | Admin nav `Email Subscribers`; route min role `admin`. | Not admitted.');
    expect(gate).toContain('| `/pricing` | Payments nav `Pricing`; route min role `org_admin`. | Not admitted.');
    expect(gate).toContain('Public/auth shell routes are separate from the authenticated console route queue. `/login` has Page 19 admitted as a guarded public-auth visual-surface exception only (receivers still blocked), `/set-password` has Page 20 admitted as a guarded public-recovery visual-surface exception only (receivers still blocked), `/onboarding` has Page 21 admitted as a guarded public-registration visual-surface exception only (receivers still blocked), `/onboarding-success` has Page 22 admitted as a guarded confirmation-recovery exception only, `/unauthorized` has opened Page 23 intake only, and the `*` catch-all has opened Page 24 intake only. No other public/auth shell route is visually admitted from this intake sequence until its own blockers and rendered proof close.');

    expect(app).toContain('<Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/organizations" element={<ProtectedRoute minRole="admin"><OrganizationsPage /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/subscriptions" element={<ProtectedRoute minRole="admin"><SubscriptionManagementPage /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/pricing" element={<ProtectedRoute minRole="org_admin"><PricingManagementPage /></ProtectedRoute>} />');

    expect(navigation).toContain("{ id: 'analytics', path: '/analytics', icon: TrendingUp, label: 'Statistics', resource: 'analytics', minRole: 'provider' }");
    expect(navigation).toContain("{ id: 'users', path: '/users', icon: Users, label: 'Users', resource: 'users', minRole: 'org_admin' }");
    expect(navigation).toContain("{ id: 'organizations', path: '/organizations', icon: Building2, label: 'Organizations', resource: 'organizations', minRole: 'admin' }");
    expect(navigation).toContain("{ id: 'settings', path: '/settings', icon: Settings, label: 'Settings', resource: 'settings', minRole: 'viewer' }");
    expect(navigation).toContain("{ id: 'subscriptions', path: '/subscriptions', icon: Mail, label: 'Email Subscribers', resource: 'subscriptions', minRole: 'admin' }");
    expect(navigation).toContain("{ id: 'pricing', path: '/pricing', icon: DollarSign, label: 'Pricing', resource: 'pricing', minRole: 'org_admin' }");
    expect(mobileNavigation).toContain("{ id: 'statistics', path: '/analytics', label: 'Statistics' }");
    expect(mobileNavigation).toContain("{ id: 'settings', path: '/settings', label: 'Settings' }");
    expect(moduleRail).toContain("statistics: { id: 'statistics', icon: BarChart3, label: 'Statistics', path: '/analytics' },");

    [
      'src/components/pages/Analytics.jsx',
      'src/components/mobile/MobileAnalytics.jsx',
      'src/components/context/AnalyticsPanel.jsx',
      'src/components/mobile/MobileUsers.jsx',
      'src/components/context/UsersPanel.jsx',
      'src/components/pages/OrganizationsPage.jsx',
      'src/components/mobile/MobileOrganizations.jsx',
      'src/components/context/OrganizationsPanel.jsx',
      'src/components/pages/SettingsPage.jsx',
      'src/components/mobile/MobileSettings.jsx',
      'src/components/context/SettingsPanel.jsx',
      'src/components/pages/SubscriptionManagementPage.jsx',
      'src/components/mobile/MobileSubscriptions.jsx',
      'src/components/context/SubscriptionsPanel.jsx',
      'src/components/pages/PricingManagementPage.jsx',
      'src/components/mobile/MobilePricing.jsx',
      'src/components/context/PricingContextPanel.jsx',
      'src/contexts/OnboardingContext.jsx',
      'src/services/onboardingService.js',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
    expect(hardgate).toContain('src/components/pages/OnboardingSuccessPage.jsx');
    // Page 14 Users page admitted 2026-07-07 via the codex signal-panel revamp: UsersPage.jsx is in the default hardgate.
    expect(hardgate).toContain('src/components/pages/UsersPage.jsx');
    // Page 19 Login visual surface admitted 2026-07-07: LoginPage.jsx is in the default hardgate; the auth-authority files stay out.
    expect(hardgate).toContain('src/components/pages/LoginPage.jsx');
    expect(gate).toContain('### Page 19 Admission - Login');
    // Page 20 Set Password visual surface admitted 2026-07-07: SetPasswordPage.jsx is in the default hardgate; the recovery-authority owners stay out.
    expect(hardgate).toContain('src/components/pages/SetPasswordPage.jsx');
    expect(gate).toContain('### Page 20 Admission - Set Password');
    expect(gate).toContain('Public/auth hardgate exception, 2026-07-07: `OnboardingSuccessPage.jsx` is in the default UI hardgate as the admitted Page 22 public confirmation-recovery surface only.');
    // Page 21 Onboarding visual surface admitted 2026-07-07: the seven visual files are in the default hardgate; the backend files stay out.
    [
      'src/components/pages/OnboardingPage.jsx',
      'src/components/onboarding/OnboardingWizard.jsx',
      'src/components/onboarding/OrganizationTypeStep.jsx',
      'src/components/onboarding/AdminAccountStep.jsx',
      'src/components/onboarding/OrganizationDetailsStep.jsx',
      'src/components/onboarding/InitialSetupStep.jsx',
      'src/components/onboarding/VerificationStep.jsx',
    ].forEach((file) => {
      expect(hardgate).toContain(file);
    });
    expect(gate).toContain('### Page 21 Admission - Onboarding');
    expect(hardgate).toContain('src/components/common/ProtectedRoute.jsx');
    expect(gate).toContain('`ProtectedRoute.jsx` remains in the default hardgate as shared guard code, not as Unauthorized visual admission.');
  });

  it('keeps the July 3 recertification tied to source evidence before Page 10', () => {
    const gate = gateSource();

    expect(gate).toContain('### Current Canon Recertification - 2026-07-03');
    expect(gate).toContain('`App.js` still owns the authenticated frame');
    expect(gate).toContain('`LayoutContext.jsx` still owns `pageShellConfig`');
    expect(gate).toContain('`TodayHome.jsx` still uses `usePageShell({ bleed: true, hideFab: true })`');
    expect(gate).toContain('`EmergencyRequestsPage.jsx` still uses `usePageShell({ bleed: true, hideFab: true })`, `getEmergencyRequestsPage()`');
    expect(gate).toContain('`git show HEAD:frontend/src/components/pages/EmergencyRequestsPage.jsx` at `f31f29f` still confirms the old Requests behavior inventory');
    expect(gate).toContain('Today remains the first-glance role-home canon. Requests remains the multi-data stage/sheet/detail canon.');
    expect(gate).toContain('This authorizes only audited page-by-page continuation');
  });

  it('keeps Requests as the multi-data canon without allowing copied markup or silent behavior loss', () => {
    const gate = gateSource();
    const design = designSystemSource();
    const ux = uxSource();

    expect(gate).toContain('### Requests As Multi-Data Canonical');
    expect(gate).toContain('Historical proof notes below may quote old titles such as `Emergency Requests | iVisit Console` or old headings such as `Emergency Logs`.');
    expect(gate).toContain('they are superseded by the current `Requests` canon and must not be used as present-day UI acceptance copy.');
    expect(gate).toContain('Route/nav permission resource is `emergency_requests`, matching the Supabase table and Requests service owner.');
    expect(gate).toContain('Route data owner is `getEmergencyRequestsPage()`');
    expect(gate).toContain('Cross-page request language is locked: `Needs attention`, `to review`, and `Review requests` mean `pending_approval`; `active` means non-terminal care activity and must not be described as review-needed work.');
    expect(gate).toContain('The page now starts from a smart selected state.');
    expect(gate).toContain('if pending is clear and active requests exist, it selects `active`');
    expect(gate).toContain('A dataset with `pending = 0` and `active > 0` must render the active request rows instead of an empty pending slice.');
    expect(gate).toContain('Today `/` rendered the same semantic priority: pending approvals can own the page headline, but Requests is shown as `1 active`, not `1 request to review`, when `pending = 0` and `active > 0`.');
    expect(gate).toContain('UI filter state is not backend query state until the route service normalizes it.');
    expect(gate).toContain('Regression guard from 2026-07-07: an empty UI status array (`status: []`) once reached Supabase as an equality filter');
    expect(gate).toContain('Legacy Git behavior represented for Requests');
    expect(gate).toContain('Requests preservation ledger from `HEAD`');
    expect(gate).toContain('Do not copy the Requests markup into the rest of the app.');
    expect(gate).toContain('Each later page must still audit its own old behavior first.');
    expect(gate).toContain('### Requests Pattern Extraction Contract');
    expect(gate).toContain('When a later page says it follows Requests, it must map its old behavior into these slots before UI work starts.');
    expect(gate).toContain('| Signal field | One first-glance sentence, one support line, one status chip, and local semantic color.');
    expect(gate).toContain('| State choices | 2-4 clickable filters, KPI choices, or workflow states tied to the same projection.');
    expect(gate).toContain('| Filter normalization | UI filter defaults, clear/reset state, date bounds, search terms, and status arrays normalized before the backend query.');
    expect(gate).toContain('Empty arrays, blank strings, empty date objects, and cleared defaults do not become backend constraints');
    expect(gate).toContain('| Handled sheet | The main scan surface for rows, cards, or table variants.');
    expect(gate).toContain('| Focused detail | A right rail, selected row reveal, or context panel with one primary next action.');
    expect(gate).toContain('| Route-owned action | A single create/review/manage action in the header, page, or mobile FAB.');
    expect(gate).toContain('| Shared modal/sheet | `ModalShell`, `FilterSheet`, `AnalyticsModal`, or a documented canonical exception.');
    expect(gate).toContain('proves close/dismiss unmounts shared chrome with no active dialog, hidden backdrop, focus trap, pointer-catching invisible surface, or lingering bottom-island suppression');
    expect(gate).toContain('| Mobile recomposition | Avatar/account sheet, bottom island, signal first, compact choices, handled bottom sheet, row reveal, and route-owned action when allowed.');
    expect(gate).toContain('| Data quieting | Route-owned reads with global providers asleep unless they own the route domain.');
    expect(gate).toContain('| Local semantic color | Emerald for clear/success, amber for waiting, sky/cyan for ordinary selection/information, red only for danger/error/emergency/destructive meaning.');
    expect(gate).toContain('| Interaction feedback | Pressed, selected, opening, pending, disabled, loading, toast, or route transition feedback.');
    expect(gate).toContain('shared modal/sheet with close-unmount proof');
    expect(gate).toContain('Reusable pattern proof is complete only when the page ledger includes this slot map');
    expect(design).toContain('## 11. Today/Requests Canonical Page Pattern');
    expect(design).toContain('Reuse the pattern, not the markup.');
    expect(design).toContain('Do not treat visual resemblance to Requests as admission.');
    expect(design).toContain('A page may reuse the canon only after its ledger maps signal field, state choices, handled sheet, focused detail, route-owned action, shared modal/sheet, mobile recomposition, data quieting, local semantic color, and interaction feedback.');
    expect(design).toContain('That ledger must include the gate\'s three-part evidence rule: targeted recent Git history, `git show HEAD:<old page>` behavior inventory, and active-source proof for shell ownership, data owner, side effects, actions, feedback states, and mobile recomposition.');
    expect(design).toContain('`planning/PAGE_REVAMP_GATE.md` owns the canonical interaction-surface checklist for modal triggers, modal design, drawers, dropdowns, filters, tabs, cards, tables, empty/loading/error states, right panels, notifications, and responsive behavior.');
    expect(design).toContain('It may not invent private modal triggers, private dropdown/menu chrome, private right-panel shells, private notification dropdowns, or private responsive navigation.');
    expect(design).toContain('Shared modal, sheet, and drawer chrome may animate open, but closed state must unmount.');
    expect(design).toContain('Modal, sheet, and drawer close/dismiss must leave no active dialog, no hidden backdrop, no focus trap, no pointer-catching invisible surface, and no lingering app-chrome or bottom-island suppression.');
    expect(design).toContain('Shared modal/sheet reuse means using `ModalShell` or `FilterSheet` semantics: open with immediate visible feedback, close by unmounting the shared chrome, and prove no stale dialog surface remains.');
    expect(design).toContain('export const MODAL_OPEN = {');
    expect(design).not.toContain('export const MODAL_ENTER = {');
    expect(design).toContain('Do not keep an enabled action unless the page proves `source truth -> receiver -> app consequence`');
    expect(design).toContain('rendered desktop/mobile proof, and local process cleanup');
    expect(ux).toContain('Before any further page revamp, use `planning/PAGE_REVAMP_GATE.md` as the operating contract.');
    expect(ux).toContain('Today defines the role-first first-glance experience.');
    expect(ux).toContain('Requests defines the multi-data stage/sheet/detail-rail experience.');
    expect(ux).toContain('The design-system pattern is descriptive. `planning/PAGE_REVAMP_GATE.md` is the admission authority.');
    expect(ux).toContain('Requests reuse requires an explicit slot map for signal field, state choices, handled sheet, focused detail, route-owned action, shared modal/sheet, mobile recomposition, data quieting, local semantic color, and interaction feedback.');
    expect(ux).toContain('That reuse slot map must be backed by the same three-part proof now required by the gate: targeted recent Git history, `git show HEAD:<old page>` behavior inventory, and active-source proof for shell ownership, data owner, side effects, actions, feedback states, and mobile recomposition.');
    expect(ux).toContain('The canonical interaction surfaces also live in `planning/PAGE_REVAMP_GATE.md`: modal triggers, modal design, drawers, dropdowns, filters, tabs, cards, tables, empty/loading/error states, right-panel behavior, notifications, and responsive behavior.');
    expect(ux).toContain('cannot invent private chrome or private responsive navigation without a ledger-approved exception.');
    expect(ux).toContain('Shared modal, sheet, and drawer surfaces must animate open with immediate visible feedback, then unmount when closed.');
    expect(ux).toContain('A close/dismiss action must leave no active `role="dialog"`, no hidden backdrop, no focus trap, no pointer-catching invisible surface, and no lingering app-chrome or bottom-island suppression.');
    expect(ux).toContain('Shared modal chrome may animate open, but closed state must unmount instead of relying on exit animation cleanup.');
    expect(ux).not.toContain('AnimatePresence + motion.div enter/exit');
    expect(ux).toContain('Any enabled page action must prove `source truth -> receiver -> app consequence` before it remains clickable.');
    expect(ux).toContain('Visual resemblance to Requests is not enough');
  });

  it('keeps the shared FAB and action hook inside the active hardgate', () => {
    const hardgate = hardgateSource();
    const fab = fabSource();
    const bottomBar = bottomBarSource();
    const contextAction = contextActionSource();

    expect(hardgate).toContain('src/components/navigation/ContextAwareFAB.jsx');
    expect(hardgate).toContain('src/hooks/useContextAction.js');
    expect(hardgate).toContain('src/components/ui/ModalShell.jsx');
    expect(hardgate).toContain('src/components/pages/HealthNewsManagementPage.jsx');
    expect(hardgate).toContain('src/components/mobile/MobileHealthNews.jsx');
    expect(hardgate).toContain('src/components/context/HealthNewsPanel.jsx');
    expect(hardgate).toContain('src/components/views/HealthNewsListView.jsx');
    expect(hardgate).toContain('src/components/views/HealthNewsTableView.jsx');
    expect(hardgate).toContain('src/components/modals/HealthNewsModal.jsx');
    expect(fab).toContain("location.pathname === '/'");
    expect(fab).toContain("location.pathname.startsWith('/emergencies')");
    expect(fab).toContain("location.pathname.startsWith('/verification')");
    expect(fab).toContain("location.pathname.startsWith('/doctors')");
    expect(fab).toContain("location.pathname.startsWith('/hospitals')");
    expect(fab).toContain("location.pathname.startsWith('/ambulances')");
    expect(fab).toContain("location.pathname.startsWith('/health-news')");
    expect(fab).toContain("location.pathname.startsWith('/map')");
    expect(fab).toContain("location.pathname.startsWith('/wallet')");
    expect(fab).toContain('const hideFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction');
    expect(fab).not.toContain("import { HealthNewsModal }");
    expect(fab).not.toContain("case 'healthNews'");
    expect(bottomBar).toContain("location.pathname.startsWith('/health-news')");
    expect(bottomBar).not.toContain('HealthNewsModal');
    expect(bottomBar).not.toContain("case 'healthNews'");
    expect(contextAction).toContain("label: 'Add facility'");
    expect(contextAction).toContain("label: 'Add unit'");
    expect(contextAction).toContain("label: 'New article'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openAmbulanceModal'))");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openHealthNewsModal'))");
    expect(contextAction).not.toContain("label: 'Add Hospital'");
    expect(contextAction).not.toContain("label: 'Add Ambulance'");
    expect(contextAction).not.toContain("label: 'Add News'");
    expect(contextAction).not.toContain("openModal('healthNews')");
  });

  it('pins the July 6 current-source Today/Requests reaudit to actual source owners', () => {
    const gate = gateSource();
    const today = fs.readFileSync('src/components/pages/TodayHome.jsx', 'utf8');
    const requests = emergencyRequestsSource();
    const contextPanel = contextPanelSource();
    const dashboardPanel = dashboardPanelSource();
    const emergencyPanel = emergencyPanelSource();
    const mobileNavigation = mobileNavigationSource();
    const fab = fabSource();
    const bottomBar = bottomBarSource();

    expect(gate).toContain('### Today/Requests Current-Source Reaudit - 2026-07-06');
    expect(gate).toContain('The audit does not replace the old Git-backed preservation anchor');
    expect(gate).toContain('the active canon is current uncommitted worktree source on top of that baseline');
    expect(gate).toContain('Active Today source remains the role-first page.');
    expect(gate).toContain('Active Requests source remains the multi-data reference.');
    expect(gate).toContain("overflowOwner: 'avatar'");
    expect(gate).toContain("bottomMenuButton: false");
    expect(gate).toContain("Cannot read properties of undefined (reading 'total')");
    expect(gate).toContain('Analytics stays Page 13 intake-only');
    expect(gate).toContain('If source drift changes shell ownership, route context, mobile navigation, event cleanup, state feedback, or data ownership, pause expansion');

    expect(today).toContain('} = usePageData();');
    expect(today).toContain('const live = !useMockData && !hasTodayDataError && !hasTodayLoading;');
    expect(today).toContain("usePageHeader('Today', headerAction);");
    expect(today).toContain("usePageFooter(null, 'status', false);");
    expect(today).toContain('usePageShell({ bleed: true, hideFab: true });');
    expect(today).toContain('const todayPanelContext = useMemo(() => ({');
    expect(today).toContain("window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);");
    expect(today).not.toContain("from '../../lib/supabase'");
    expect(today).not.toContain('getEmergencyRequestsPage');

    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestTodayRouteContext'));");
    expect(contextPanel).toContain('<DashboardPanel todayContext={todayRouteContext} />');
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestEmergencyRouteContext'));");
    expect(contextPanel).toContain('<EmergencyPanel requestContext={emergencyRouteContext} />');
    expect(contextPanel).not.toContain('emergencyData={emergencyData}');

    expect(dashboardPanel).toContain('export const DashboardPanel = ({ todayContext }) =>');
    expect(dashboardPanel).toContain('context.onNavigate(action.path)');
    expect(dashboardPanel).toContain('role="status" aria-live="polite"');
    expect(dashboardPanel).not.toContain('usePageData');
    expect(dashboardPanel).not.toContain('/api/backup');

    expect(requests).toContain('getEmergencyRequestsPage({');
    expect(requests).toContain('const serviceFilter = buildRequestsServiceFilter(filters);');
    expect(requests).toContain('pagination.setTotalCount(count || 0);');
    expect(requests).toContain('const requestPanelContext = useMemo(() => ({');
    expect(requests).toContain("window.addEventListener('requestEmergencyRouteContext', publishEmergencyRouteContext);");
    expect(requests).toContain('<RequestsDesktopWorkspace');
    expect(requests).toContain('<MobileEmergency');
    expect(requests).toContain('<FilterSheet');
    expect(requests).toContain('<ModalShell');
    expect(requests).not.toContain('EmergencyRequestListView');
    expect(requests).not.toContain('EmergencyRequestTableView');

    expect(emergencyPanel).toContain('export const EmergencyPanel = ({ requestContext }) =>');
    expect(emergencyPanel).toContain('Requests overview');
    expect(emergencyPanel).toContain('role="status" aria-live="polite"');
    expect(emergencyPanel).toContain("window.dispatchEvent(new CustomEvent('openEmergencyModal'))");
    expect(emergencyPanel).not.toContain('usePageData');
    expect(emergencyPanel).not.toContain('Live Status');

    expect(mobileNavigation).toContain("overflowOwner: 'avatar'");
    expect(mobileNavigation).toContain('bottomMenuButton: false');
    expect(mobileNavigation).toContain("provider: [\n    { id: 'today', path: '/', label: 'Today' },");
    expect(mobileNavigation).toContain("{ id: 'emergencies', path: '/emergencies', label: 'Requests' }");
    expect(mobileNavigation).not.toContain('hamburger');

    expect(fab).toContain("location.pathname === '/'");
    expect(fab).toContain("location.pathname.startsWith('/emergencies')");
    expect(fab).toContain('const hideFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction');
    expect(bottomBar).toContain('const routeOwnedAction = getRouteOwnedMobileAction(location.pathname, userRole);');
    expect(bottomBar).toContain("label: 'New request'");
    expect(bottomBar).toContain("window.dispatchEvent(new CustomEvent('openEmergencyModal'))");
  });

  it('keeps stale chunk recovery as a rendered-proof stability gate', () => {
    const gate = gateSource();
    const htmlShell = htmlShellSource();
    const appBootstrap = appBootstrapSource();
    const errorBoundary = errorBoundarySource();
    const cracoConfig = cracoConfigSource();
    const globalFinancialModals = globalFinancialModalsSource();

    expect(gate).toContain('### Runtime Proof Stability Recertification - 2026-07-05');
    expect(gate).toContain('Stale CRA chunk failures are proof stability failures, not page-domain truth.');
    expect(gate).toContain("`Unexpected token '<'`");
    expect(gate).toContain('`public/index.html` installs an early capture-phase stale-asset guard');
    expect(gate).toContain('same-origin root `*.hot-update.js`, `*.hot-update.json`, `*.chunk.js`, and module-style `*.mjs`/`*.jsx` failures');
    expect(gate).toContain('`src/index.js` mirrors the guard after React boot.');
    expect(gate).toContain('Local development unregisters service workers through `src/index.js`');
    expect(gate).toContain('`ErrorBoundary.jsx` remains the human-facing fallback');
    expect(gate).toContain('`App.js` now uses a shared `RouteLoadingState` Suspense fallback instead of a blank shell.');
    expect(gate).toContain('`craco.config.js` now restricts the dev-server history fallback to real HTML navigations.');
    expect(gate).toContain('The dev server also inserts `ivisit-missing-runtime-asset-404` before `connect-history-api-fallback`');
    expect(gate).toContain('The local dev server also sends `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`');
    expect(gate).toContain('stale same-origin JavaScript URLs, including missing `/static/js/*.mjs` and `/static/js/*.jsx`, receive a `404` with `application/javascript` and hot-update manifests receive `application/json` instead of an HTML error page.');
    expect(gate).toContain('The stale-asset guard now cache-busts with `__asset_refresh`');
    expect(gate).toContain('marks stale runtime errors for the Webpack overlay filter');
    expect(gate).toContain('The overlay filter also trusts the bare stale-asset message');
    expect(gate).toContain('The dev-server runtime overlay calls the same stale-asset recovery hook before filtering stale runtime overlays');
    expect(gate).toContain('clears console-owned CacheStorage entries before the recovery refresh');
    expect(gate).toContain('shows a single `Refresh needed` fallback instead of letting the framework overlay render');
    expect(gate).toContain('preventing the browser from executing `<!doctype html>` as JavaScript');
    expect(gate).toContain('Supabase GoTrue navigator-lock `AbortError: signal is aborted without reason` noise');
    expect(gate).toContain('this does not classify arbitrary aborts or page data failures as healthy');
    expect(gate).toContain('Restarted-server Browser proof on `/emergencies?proof=requests-after-restart-2026-07-05`');
    expect(gate).toContain('settled to `Requests | iVisit Console`');
    expect(gate).toContain('Follow-up Browser proof on `/visits?proof=runtime-token-debug-2026-07-05`');
    expect(gate).toContain('missing chunk and stale hot-update URLs returned `404 application/javascript` with no-store headers, not HTML.');
    expect(gate).toContain('Overlay follow-up on 2026-07-06 keeps the dev-server overlay self-contained');
    expect(gate).toContain('`ivisitConsoleRuntimeErrorOverlayFilter` now carries its own stale-asset detector and reload fallback');
    expect(gate).toContain('Browser error follow-up on 2026-07-06 chains `window.onerror`');
    expect(gate).toContain('including `SyntaxError: Unexpected token \'<\'`, now call the same stale-asset recovery path');
    expect(gate).toContain('Stale HTML parse follow-up on 2026-07-06 promotes this into an explicit HTML-as-JS detector');
    expect(gate).toContain('Localhost analytics follow-up on 2026-07-06 keeps PostHog out of local proof runs.');
    expect(gate).toContain('third-party analytics scripts cannot show up as misleading `Unexpected token \'<\'` overlays');
    expect(gate).toContain('Localhost payment-script follow-up on 2026-07-06 moved Stripe.js to the pure loader');
    expect(gate).toContain('Stripe.js cannot load on unrelated local proof routes before the Payment cards modal opens');
    expect(gate).toContain('while non-stale errors keep flowing to the previous handler and the app error boundary');
    expect(gate).toContain('rendered proof for future pages must reuse one local server when safe, check `netstat`, treat stale chunk overlays as runtime-proof issues first');

    expect(htmlShell).toContain('var staleAssetReloadKey = "ivisit-console:stale-asset-reload";');
    expect(htmlShell).toContain('var staleAssetOverlaySuppressMs = 5000;');
    expect(htmlShell).toContain('window.addEventListener("error", function (event)');
    expect(htmlShell).toContain('window.addEventListener("unhandledrejection", function (event)');
    expect(htmlShell).toContain('var previousWindowOnError = window.onerror;');
    expect(htmlShell).toContain('window.onerror = function (message, source, lineno, colno, error)');
    expect(htmlShell).toContain('isAppAssetUrl(source) || isStaleAssetMessage(error || message)');
    expect(htmlShell).toContain('return previousWindowOnError.apply(window, arguments);');
    expect(htmlShell).toContain('function isHtmlAssetParseFailureMessage(message)');
    expect(htmlShell).toContain("/Unexpected token ['\"]?</i.test(message)");
    expect(htmlShell).toContain("/Unexpected token .*?</i.test(message)");
    expect(htmlShell).toContain('/<!doctype html/i.test(message)');
    expect(htmlShell).toContain('isHtmlAssetParseFailureMessage(message)');
    expect(htmlShell).toContain('/Loading hot update chunk .+ failed/i.test(message)');
    expect(htmlShell).toContain('function isAppAssetUrl(value)');
    expect(htmlShell).toContain('/\\.hot-update\\.js$/.test(pathname)');
    expect(htmlShell).toContain('/\\.(?:jsx|mjs)$/.test(pathname)');
    expect(htmlShell).toContain('url.searchParams.set("__asset_refresh", String(Date.now()))');
    expect(htmlShell).toContain('function showStaleAssetFallback()');
    expect(htmlShell).toContain('function shouldSuppressRuntimeOverlay(value)');
    expect(htmlShell).toContain('var isKnownStaleAsset = isStaleAssetMessage(value);');
    expect(htmlShell).toContain('if (isKnownStaleAsset) return true;');
    expect(htmlShell).toContain('(isMarkedStaleAsset || isStaleAssetRecoveryActive())');
    expect(htmlShell).toContain('window.__ivisitConsoleHandleStaleAssetFailure = handleStaleAssetFailure;');
    expect(htmlShell).toContain('function isStaleAssetRecoveryActive()');
    expect(htmlShell).toContain('url.searchParams.has("__asset_refresh")');
    expect(htmlShell).toContain('isStaleAssetStack(value)');
    expect(htmlShell).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay = shouldSuppressRuntimeOverlay;');
    expect(htmlShell).toContain('function clearConsoleCaches()');
    expect(htmlShell).toContain('window.caches.delete(key)');
    expect(htmlShell).toContain('id="ivisit-stale-asset-refresh"');
    expect(htmlShell).toContain('function isSupabaseAuthLockAbort(value)');
    expect(htmlShell).toContain('/signal is aborted without reason/i.test(message)');
    expect(htmlShell).toContain('event.stopImmediatePropagation');
    expect(htmlShell).toContain('navigator.serviceWorker.getRegistrations()');
    expect(htmlShell).toContain('window.location.hostname === "::1"');
    expect(htmlShell).toContain('if (isLocalhost) return;');
    expect(htmlShell).toContain('posthog.init(');

    expect(appBootstrap).toContain("const STALE_ASSET_RELOAD_KEY = 'ivisit-console:stale-asset-reload';");
    expect(appBootstrap).toContain("const STALE_ASSET_OVERLAY_SUPPRESS_MS = 5000;");
    expect(appBootstrap).toContain("window.addEventListener('error'");
    expect(appBootstrap).toContain("window.addEventListener('unhandledrejection'");
    expect(appBootstrap).toContain('const installWindowOnErrorStaleAssetHandler = () => {');
    expect(appBootstrap).toContain('const previousWindowOnError = window.onerror;');
    expect(appBootstrap).toContain('window.onerror = (message, source, lineno, colno, error) => {');
    expect(appBootstrap).toContain('isAppAssetUrl(source) || isStaleAssetFailure(error || message)');
    expect(appBootstrap).toContain("previousWindowOnError.call(window, message, source, lineno, colno, error)");
    expect(appBootstrap).toContain('installWindowOnErrorStaleAssetHandler();');
    expect(appBootstrap).toContain('const isAppAssetUrl = (value) => {');
    expect(appBootstrap).toContain('/\\.hot-update\\.js$/.test(pathname)');
    expect(appBootstrap).toContain('/\\.(?:jsx|mjs)$/.test(pathname)');
    expect(appBootstrap).toContain('isSupabaseAuthLockAbort(reason)');
    expect(appBootstrap).toContain('/signal is aborted without reason/i.test(message)');
    expect(appBootstrap).toContain("url.searchParams.set('__asset_refresh', String(Date.now()))");
    expect(appBootstrap).toContain('const isStaleAssetRecoveryActive = () => {');
    expect(appBootstrap).toContain("url.searchParams.has('__asset_refresh')");
    expect(appBootstrap).toContain('const isKnownStaleAsset = isStaleAssetFailure(errorLike);');
    expect(appBootstrap).toContain('if (isKnownStaleAsset) return true;');
    expect(appBootstrap).toContain('(isMarkedStaleAsset || isStaleAssetRecoveryActive())');
    expect(appBootstrap).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay = shouldSuppressRuntimeOverlay;');
    expect(appBootstrap).toContain('window.__ivisitConsoleHandleStaleAssetFailure = recoverFromStaleAssetFailure;');
    expect(appBootstrap).toContain('const clearConsoleRuntimeCaches = async () => {');
    expect(appBootstrap).toContain('window.caches.delete(key)');
    expect(appBootstrap).toContain('handleStaleAssetFailure(event)');
    expect(appBootstrap).toContain('showStaleAssetFallback();');
    expect(appBootstrap).toContain('event.stopImmediatePropagation();');
    expect(appBootstrap).toContain('serviceWorkerRegistration.unregister();');
    expect(appBootstrap).toContain("if (process.env.NODE_ENV === 'production') {");
    expect(appBootstrap).toContain('serviceWorkerRegistration.register();');

    expect(errorBoundary).toContain("'Refresh Needed'");
    expect(errorBoundary).toContain("'The app updated while this page was loading. Refresh this page to continue.'");
    expect(errorBoundary).toContain("name === 'ChunkLoadError'");
    expect(errorBoundary).toContain('const isHtmlAssetParseFailureMessage = (message) => (');
    expect(errorBoundary).toContain("/Unexpected token ['\"]?</i.test(message)");
    expect(errorBoundary).toContain("/Unexpected token .*?</i.test(message)");
    expect(errorBoundary).toContain('/<!doctype html/i.test(message)');
    expect(errorBoundary).toContain('/Loading hot update chunk .+ failed/i.test(message)');
    expect(errorBoundary).toContain("url.searchParams.set('__asset_refresh', String(Date.now()))");
    expect(errorBoundary).toContain('clearChunkRuntimeCaches().finally');
    expect(errorBoundary).toContain('window.location.replace(getChunkReloadUrl())');
    expect(appSource()).toContain('const RouteLoadingState = () => (');
    expect(appSource()).toContain('data-testid="route-loading-state"');
    expect(appSource()).toContain('Loading page');
    expect(appSource()).toContain('rounded-card bg-card/70');
    expect(appSource()).toContain('rounded-icon bg-primary/10');
    expect(appSource()).toContain('h-20 rounded-inner');
    expect(appSource()).toContain('rounded-pill shadow-2xl');
    expect(appSource()).toContain('fallback={<RouteLoadingState />}');

    expect(cracoConfig).toContain('const htmlFallbackAcceptHeaders = ["text/html", "application/xhtml+xml"];');
    expect(cracoConfig).toContain("const devNoStoreHeaders = {");
    expect(cracoConfig).toContain("'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'");
    expect(cracoConfig).toContain("Pragma: 'no-cache'");
    expect(cracoConfig).toContain("Expires: '0'");
    expect(cracoConfig).toContain('const createDevNoStoreMiddleware = () => (req, res, next) => {');
    expect(cracoConfig).toContain("name: 'ivisit-dev-no-store'");
    expect(cracoConfig).toContain('const staticAssetFallbackRewrite = {');
    expect(cracoConfig).toContain('.*\\.(?:css|gif|ico|jpeg|jpg|js|jsx|json|map|mjs|png|svg|txt|wasm|webp)');
    expect(cracoConfig).toContain('disableDotRule: false');
    expect(cracoConfig).toContain('configureHtmlOnlyHistoryFallback(devServerConfig)');
    expect(cracoConfig).toContain('const createMissingRuntimeAssetMiddleware = () => (req, res, next) => {');
    expect(cracoConfig).toContain("name: 'ivisit-missing-runtime-asset-404'");
    expect(cracoConfig).toContain('const javascriptAssetRequestPattern = /(?:^\\/static\\/js\\/.*\\.(?:js|jsx|mjs)$|\\/[^/]+\\.(?:chunk|hot-update)\\.js$|\\/(?:bundle|main|runtime~main)(?:\\.[^/]+)?\\.js$)/;');
    expect(cracoConfig).toContain('const jsonRuntimeAssetRequestPattern = /(?:^\\/static\\/js\\/.*\\.json$|\\/[^/]+\\.hot-update\\.json$)/;');
    expect(cracoConfig).toContain("middleware?.name === 'connect-history-api-fallback'");
    expect(cracoConfig).toContain("res.type(isJsonRuntimeAsset ? 'application/json' : 'application/javascript');");
    expect(cracoConfig).toContain("res.send('{}');");
    expect(cracoConfig).toContain('htmlAcceptHeaders: htmlFallbackAcceptHeaders');
    expect(cracoConfig).toContain('rewrites: [staticAssetFallbackRewrite, ...fallbackRewrites]');
    expect(cracoConfig).toContain('configureDevNoStoreMiddleware(devServerConfig)');
    expect(cracoConfig).toContain('configureMissingRuntimeAssetMiddleware(devServerConfig)');
    expect(cracoConfig).toContain('const configureRuntimeErrorOverlayFilter = (devServerConfig) => {');
    expect(cracoConfig).toContain('runtimeErrors: function ivisitConsoleRuntimeErrorOverlayFilter(error)');
    expect(cracoConfig).toContain('function isStaleAssetRuntimeError(value)');
    expect(cracoConfig).toContain('function isHtmlAssetParseFailureMessage(message)');
    expect(cracoConfig).toContain("/Unexpected token .*?</i.test(message)");
    expect(cracoConfig).toContain('/<!doctype html/i.test(message)');
    expect(cracoConfig).toContain('isHtmlAssetParseFailureMessage(message)');
    expect(cracoConfig).toContain('function recoverStaleAssetWithoutShellHook()');
    expect(cracoConfig).toContain("var key = 'ivisit-console:stale-asset-reload:' + window.location.pathname;");
    expect(cracoConfig).toContain("url.searchParams.set('__asset_refresh', String(now));");
    expect(cracoConfig).toContain("((isStaleAssetRecoveryActive() || /SyntaxError/i.test(name)) && isStaleAssetStack(value))");
    expect(cracoConfig).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay');
    expect(cracoConfig).toContain('configureRuntimeErrorOverlayFilter(devServerConfig)');
    expect(cracoConfig).toContain('var recover = window.__ivisitConsoleHandleStaleAssetFailure;');
    expect(cracoConfig).toContain("if (typeof recover === 'function') {");
    expect(cracoConfig).toContain('recover();');
    expect(cracoConfig).toContain('recoverStaleAssetWithoutShellHook();');

    expect(globalFinancialModals).toContain("import { loadStripe } from '@stripe/stripe-js/pure';");
    expect(globalFinancialModals).toContain('if (!isBillingOpen || !canLoadStripe || stripePromise) return;');
    expect(globalFinancialModals).toContain('setStripePromise(loadStripe(STRIPE_PUBLISHABLE_KEY));');
    expect(globalFinancialModals).not.toContain("from '@stripe/stripe-js';");
  });
});
