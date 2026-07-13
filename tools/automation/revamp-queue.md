# Revamp Work Queue (controller state)

Single source of truth for "what to do next." Each run reads THIS file plus only the
target page's gate section — not the whole 1600-line gate. That is the efficiency win.

**executor** — who can actually finish the item:
- `headless` = the `claude -p` 30-min loop (no browser, no Supabase)
- `browser`  = an interactive Claude session with the Chrome MCP, or a human
- `backend`  = needs Supabase projection/receiver/RLS/RPC/Edge + app-consequence truth (not in this repo)

**status** — `todo` | `in_progress` | `done` | `blocked`

Rule: the headless loop may ONLY pick `todo` + `headless` items. If none remain, it records
"no headless-safe work; browser/backend items pending" in the gate and stops (does not spin,
does not attempt browser/backend work).

---

## Done (admitted)
Today, Requests, Approvals, Staff, Payments, Live Map, Visits, Hospitals, Ambulances,
Support, Health News; Page 24 Not Found (`3dbbff7`), Page 23 Unauthorized (`c6b1330`),
Page 22 Onboarding Success (`efac625`).

## Active queue (priority order)

1. **Manual mobile parity proof for the 2026-07-12 priority waves**
   - executor: `browser` / human - status: `in_progress`
   - Wave one: Insurance, Pricing, Payments, and Subscriptions. Verify loading, stale/error/empty,
     search/filter/tab state, row-to-sheet behavior, bottom-pill current-route state, side-menu title,
     and route-owned FAB feedback. Subscriptions must occupy the fourth pill slot while active and its
     Add Subscriber FAB must fail closed. Insurance remains read-only with no fabricated create FAB,
     while its route-owned Policy Stats FAB opens the namespaced read-only analytics surface.
   - Manual side-by-side verdict on 2026-07-12: Payments and Insurance were NOT visually green against
     Requests. The user-rendered correction now declares a HYBRID grammar: shared title/balance hierarchy,
     loaded finance KPIs, separate activity-source tabs, Requests' grouped feed/detail-sheet mechanics,
     a route-owned Payment Stats FAB,
     and context-owned visible-transaction export. It distinguishes missing/failed source truth from zero,
     preserves per-payment currency, grows the loaded window, and removes active add-funds, withdrawal,
     and card-management dispatches. Insurance now separates KPI scope from filter-button state, uses
     a two-group replace-in-place skeleton, distinguishes failed load from true empty, and now keeps
     the required Policy Stats FAB instead of collapsing the dock to a lone pill. Both pages
     remain pending a fresh human render check; do not mark wave one complete from static gates.
   - Payments authority follow-up unmounted `GlobalFinancialModals` from the app shell and removed the
     dormant generic `openTopUpModal` dispatch. Named Edge receiver code remains inactive inventory,
     but no global add-funds, withdrawal, or card-setup listener is mounted while consequence proof is
     absent.
   - Shell action ownership is now centralized in `routeOwnsShellAction()`, shared by the bottom bar,
     desktop FAB, and mobile menu. This prevents route-owned dock actions from being duplicated in the
     side-menu page-actions block; the mobile grammar gate derives its completeness set from the same
     registry. Analytics remains an intentional generic read-only action exception.
   - Mobile overflow navigation now renders the existing role-filtered primary route list before its
     domain accordions, restoring direct Today, Live Map, and Statistics access where RBAC allows it.
     `NavigationShell.contract.test.js` pins the route set and the side-menu rendering handoff.
   - Pricing is now included in the shared desktop list-workspace estate registry, which locks its
     single updated-time sort, keyboard focus, loading/refetch/empty behavior, selection exclusion,
     navbar title, SEO title, and recorded no-deep-link/no-write-surface decisions. Payments remains
     hybrid-tier rather than being forced into the list registry.
   - Cross-surface status colors now align for Subscriptions (active emerald, pending cyan,
     unsubscribed neutral, bounced destructive). Analytics ordinary totals/dominance and the mobile
     higher-demand band no longer consume destructive red; failure, cancelled/declined, bounced, and
     critical telemetry meanings retain it.
   - Pricing and Subscriptions source recheck on 2026-07-12 closed the same donor drift before manual
     proof: Pricing gained the atlas ground and multi-group skeleton, removed duplicate parent error
     copy, and removed a mobile Details CTA that only reached an unavailable command. Subscriptions
     gained multi-group loading, KPI/filter separation, KPI-empty recovery, and moved fail-closed FAB
     feedback inside the canonical page shell. Focused contracts, mobile grammar, and UI hardgate pass;
     rendered admission remains open.
   - Pricing and Insurance follow-up on 2026-07-12 found three static-green defects before the next
     render: Insurance used axis-level KPI totals as the heading count even when search/sheet facets
     narrowed the query, ordinary refetches reused the load-more indicator, and policy coverage
     percentage could render as a dollar amount. The route now passes its exact active-query count,
     load-more has dedicated state, and the normalized projection plus mobile sheet/full detail modal
     render `coverage_percentage` as a rate. Pricing now ignores stale overlapping responses, separates
     load-more from ordinary refetch, and carries facility/platform identity in each row. The full proof
     is 53 suites / 411 tests plus a successful production build; both pages still require the user's
     Requests side-by-side mobile verdict before admission.
   - Wave three: Analytics, Live Map, and Settings. Verify truthful source labels, map control states,
     full-bleed/safe-area behavior, identity/account actions, and unavailable report/billing behavior.
   - Wave-three source recheck closed Analytics shell drift: loading now stays inside MobilePageShell,
     the page reserves bottom-dock clearance, and ordinary request counts/dominance no longer use
     destructive red. Map recenter and emergency commands remain receiver-backed and role-gated;
     Settings retains grounded identity/contact evidence, pending sign-out, proved support routing,
     and unavailable billing. Three focused suites / 19 tests, grammar, and hardgate pass. Rendered
     proof remains required.
   - The user is testing these surfaces manually. The in-app browser is visible but its control bridge
     currently exposes zero tabs, so automated screenshots/interactions remain unavailable.

2. **Desktop counterpart rendered proof**
   - executor: `browser` - status: `in_progress`
   - Insurance, Pricing, Payments, Analytics, Live Map, Settings, Organizations, and Subscriptions have
     authority-safe desktop source parity. Prove list/workspace focus, sorting, stale/error states,
     right-pane context, deep links, and fail-closed commands with authorized roles.
   - Source recheck on 2026-07-12 corrected the recurring context-card radius miss across Analytics,
     Insurance, Pricing, Subscriptions, Map, and Settings: focused right-pane cards now use
     `rounded-card`, with a cross-panel contract banning `rounded-modal` across every mounted context
     pane, including Today/Requests, Organizations, and Payments. Pricing row/keyboard activation
     now focuses read-only evidence instead of invoking unavailable feedback; redundant command-shaped
     detail buttons were removed from the rail and focused context card. Deep-link focus remains proved
     for Payments only; do not invent URL contracts for the other pages without the desktop proof pass.
   - Authenticated admin proof on 2026-07-12 now covers all eight routes at desktop width. Payments,
     Pricing, Subscribers, and Organizations rendered live rows and focused detail rails; Insurance
     rendered its honest no-data state; Statistics, Settings, and Live Map rendered their route-specific
     workspaces. Every checked route had no horizontal overflow and the browser error log was empty.
     Insurance, Subscribers, and Organizations had zero selection controls. Pricing, Insurance, and
     Subscribers no longer mount the legacy `SYSTEM STATUS` footer over sheet pagination. Statistics
     work/evidence cards now resolve to the same background token as detail-pane elements. Remaining
     proof is the non-admin role matrix and deliberately forced denied/stale/error envelopes, which stay
     protected by focused contracts in this checkpoint.

3. **Public/auth rendered proof**
   - executor: `browser` - status: `blocked`
   - Login requires a signed-out context; Set Password requires a real recovery session; Onboarding
     requires signed-out/pending state and must not be submitted during visual proof. Login and Set
     Password have duplicate-submit locks and explicit pending semantics.

4. **Backend authority and app consequence**
   - executor: `backend` - status: `blocked`
   - Prove named RLS/RPC/Edge/Storage receivers and reflected reads before enabling Insurance,
     Organization, subscriber/email, Pricing, analytics export, billing, or provider-profile commands.
     Pricing also requires selected-facility patient quote comparison against `ivisit-app`.

5. **Final repository checkpoint**
   - executor: `headless` - status: `done` (2026-07-12 source checkpoint)
   - Current source-closable parity work is reconciled through `b41c007f`: broad contracts,
     list/donor estate laws, mobile grammar, UI hardgate, database/encoding checks, and production build
     pass. Reopen this item only for a rendered defect or newly proved backend receiver; static green
     does not complete the manual mobile, desktop, public/auth, or backend gates above.

## Parked backend commands (visual/read-only parity remains source-closable)
Pages 12-18 still require named receivers, RLS/RPC/Edge authority, and reconciled
`ivisit-app` consequences before blocked commands can be enabled. That does not block a
read-only visual revamp when the route projection is proved and unsupported commands fail closed.

- Page 12 Insurance: source composition complete on 2026-07-11; authenticated admin desktop proof passed
  on 2026-07-12, with the remaining role/degraded-state matrix still open.
- Page 15 Organizations: source composition complete on 2026-07-11; authenticated admin desktop proof
  passed on 2026-07-12, with backend commands still parked.
- Page 17 Subscriptions: source composition complete on 2026-07-11; authenticated admin desktop proof
  passed on 2026-07-12, with email and subscriber commands still parked.
- Pages 13 Analytics, 16 Settings, and 18 Pricing: source composition complete on 2026-07-11;
  authenticated admin desktop proof passed on 2026-07-12. Their remaining non-admin/degraded-state
  matrix and Page 14 Users identity-command authority blockers stay separate.

## Live claims / run log

### 2026-07-12 - Authenticated desktop parity checkpoint
- Rendered Payments, Pricing, Insurance, Email Subscribers, Statistics, Settings, Live Map, and
  Organizations through the signed-in admin session. Full role rails, max-three KPIs, route actions,
  handled list workspaces, focused right panes, and route-specific empty/full-canvas states remained
  within the viewport with no browser console errors.
- Removed the legacy shell status footer from Pricing, Insurance, and Subscribers after rendered proof
  showed that it competed with sheet-owned pagination. Added page contracts so the footer cannot return.
- Kept unsupported selection and write paths absent on Insurance, Subscribers, and Organizations.
  `SubscriptionModal` remains shared, view-only, and free of direct welcome/custom/bulk email imports.
- Normalized Statistics work-surface and evidence-card backgrounds to the detail-pane element token;
  computed browser styles resolve to the same translucent background value.

### 2026-07-12 - Mobile priority waves and desktop counterpart orchestration
- Reworked Payments after direct user review exposed donor-system drift. It now uses the named HYBRID
  mobile grammar (shared title/balance row + loaded finance KPIs + separate source tabs + Requests grouped
  feed/detail sheet), assigns Payment
  Stats to the bottom FAB, keeps transaction export in the context panel, and limits active side-menu actions to
  Stats and Export. Service/page state now exposes missing/failed projections instead of false zeroes, detects more
  rows with a growing window, preserves loaded records on partial refresh failure, and formats patient
  payments in their row currency. Production build and focused contracts pass; manual render remains open.
- The next rendered review removed the redundant Payment activity/count/export row. Payments now follows
  the confirmed control grammar under its source tabs: loaded-window search, source-aware FilterSheet
  (credit/debit/date or canonical payment status/method/date), and analytics. CSV export is context-panel
  owned. Git archaeology found historical Add funds/Credit Main, Withdraw, and Payment cards commands but
  no separate create-wallet receiver; all three are visible only as disabled context actions because the
  Pass 2 audit still records top-up confirmation, payout reservation/reflection, and card authorization gaps.
- Payment details no longer owns private Radix dialog chrome. It now composes the current `ModalShell`, so
  desktop centering and mobile bottom-sheet alignment, safe areas, focus trap/restore, swipe dismissal,
  backdrop, app-chrome suppression, radius, and close footer follow the same contract as other revamped
  detail modals. The modal uses each payment's currency, labels completed timestamps as Processed, and
  renders `ivisit_fee_amount` only when recorded instead of claiming an unproved included fee.
- Promoted Pricing from `list-migrating` to full LIST grammar with structural skeletons, a real
  refetch signal, growing-window load more, grouped rows, degraded/error states, and a route-owned
  Add Pricing FAB that reaches the existing fail-closed page handler.
- Rebuilt mobile Payments onto the Today dashboard rhythm: one source-scoped signal, navigational
  glance tiles, grouped transaction/payment evidence, structural loading, stale/error preservation,
  and read-only detail sheets. After the first manual comparison failed, the page adopted the shared
  atlas ground and removed mounted money/card commands until receiver and consequence proof exists.
- Kept mobile Insurance read-only and moved terminal/degraded failures into its canonical LIST surface.
- Added Pricing and Subscriptions to the current-route morph registry. Subscriptions now occupies the
  fourth bottom-pill slot while active, uses the Mail icon, keeps the Email Subscribers navbar title,
  and retains the route-owned Add Subscriber fail-closed FAB.
- Reworked mobile Analytics, Live Map, and Settings without inventing source truth: Analytics removed
  synthetic benchmark/readiness claims; Map removed the unsupported Units ready claim while preserving
  full-bleed renderers and proved controls; Settings removed phone-verification/security-strength claims
  and gained grouped account sections plus pending sign-out feedback.
- Parallel desktop lanes closed authority-safe Insurance, Pricing, Payments, Map-panel, and Settings
  parity without editing mobile files. Unsupported writes remain hidden or fail closed.
- Broad proof: 53 Jest suites / 411 tests passed; database-types encoding, mojibake, data-contract,
  115-file UI hardgate, 34-file mobile grammar, and production build passed. Data contract reported no
  new phantom columns; the seven grandfathered onboarding references remain baselined debt.
- Estate background-token audit found ten numeric opacity modifiers used by source but absent from
  Tailwind (`3`, `6`, `38`, `44`, `46`, `48`, `58`, `62`, `76`, `86`). They are now configured, and
  `ConsoleDesignSystem.contract.test.js` scans all source numeric `bg-*/N` modifiers against the
  Tailwind default plus extended scale so authored tints cannot silently compile away again.
- Rendered/manual proof remains open. Payments and Insurance explicitly failed their first visual check
  and await retest after remediation. Health News still intentionally has no desktop or mobile selection.

### 2026-07-11 - Login desktop/mobile rendered proof and authenticated blocker
- Reused the in-app browser at `127.0.0.1:3000/login` in a signed-out session.
- Desktop `1280x720` rendered the public sign-in form with no horizontal overflow or framework
  overlay. The primary submit exposed `data-state="ready"` and `aria-busy="false"`.
- Mobile `390x844` rendered the same form with no horizontal or vertical overflow; the email input
  was focused and the 56px submit control remained fully inside the viewport. The viewport override
  was reset after proof.
- Browser diagnostics reported `Invalid Refresh Token: Refresh Token Not Found`, confirming stale
  local auth state and no usable authenticated session. Pages 12-18 cannot receive honest rendered
  role proof until the user signs in with an authorized account. No credentials were inferred,
  submitted, or read from environment files.

### 2026-07-11 - Insurance read-only parity composition
- Added the authority/preservation constitution and retained patient-owned policy commands as fail-closed.
- Replaced the legacy desktop density modes with the shared list workspace, one `created_at` sort,
  selection with unavailable bulk mutation, keyboard navigation, filter state, and a focused detail rail.
- Promoted mobile Insurance to full LIST grammar and rebuilt the route context panel without private
  Card surfaces or entrance motion.
- Registered the route, desktop composition, mobile, panel, and modal in the shared estate and UI
  hardgate. Source contracts and production checks pass; authenticated desktop/mobile proof remains open.

### 2026-07-11 - Subscriptions read-only parity composition
- Added an admin-scoped page projection with exact counts, explicit denied/failed envelopes, server
  filters/sort/pagination, TanStack cache ownership, and route-owned realtime invalidation.
- Replaced desktop density modes with the shared list workspace, one Joined sort, shared selection,
  unavailable bulk mutation, keyboard navigation, and a focused detail rail.
- Kept mobile on the full LIST grammar and rebuilt the context panel around whole route context.
- Subscriber and email commands remain fail-closed. Source contracts and hardgates pass;
  authenticated desktop/mobile proof remains open.

### 2026-07-07 — headless revamp loop — Page 10 Support chrome cleanup — BLOCKED (reverted)
- **Attempted slice:** canon token-level chrome cleanup on the 7 Support surfaces
  (`pages/SupportTicketsPage.jsx`, `mobile/MobileSupportTickets.jsx`,
  `context/SupportTicketsPanel.jsx`, `modals/SupportTicketModal.jsx`,
  `views/SupportTicketListView.jsx`, `views/SupportTicketTableView.jsx`,
  `views/SupportTicketSimpleListView.jsx`). Chosen because it is the only full-surface
  management page currently NOT in the concurrent codex agent's dirty set (Doctors, Ambulances,
  Verification, Wallet, HealthNews, Emergency, Map, Visits, Insurance, Onboarding/auth are all
  codex WIP; Hospitals partially so via HospitalTableView).
- **Source result (correct):** token map applied (rounded-2xl/3xl->rounded-card;
  rounded-xl/lg/md/sm->rounded-inner; rounded-full->rounded-pill; rounded-[..]->rounded-card;
  squircle-lg/xl->rounded-card; squircle-sm/md->rounded-inner; bare squircle->rounded-inner;
  remove border-*/backdrop-blur-*/shadow-premium/hover-lift; shadow-xl->shadow-sm). Real hardgate
  from git objects (`git show HEAD:frontend/scripts/check-ui-surface-hardgate.js`) PASSED for all
  7 files in BOTH default and `--strict-radius` modes. Diff was 89/89 pure 1:1 line swaps
  (no structural JSX change); touched files stayed ASCII except a pre-existing intentional
  `•` bullet in SimpleListView (present at HEAD, untouched).
- **BLOCKER (concurrent-agent / mid-conflict tree):** the WORKING-TREE
  `frontend/scripts/check-ui-surface-hardgate.js` is in codex's uncommitted dirty set and is
  currently syntactically broken — unterminated string literal at L290
  (`console.error('Active re`). `SupportTicketsPage.contract.test.js` runs that working-tree
  script via `execFileSync`, so the "panel hardgate-clean" assertion throws `SyntaxError`
  regardless of the Support source (6 of 7 Support source assertions PASS). Reverting Support
  does NOT turn the contract green — the fault is entirely in codex's in-flight hardgate edit.
  This blocks the VERIFY/LOCK gate for ANY page whose contract `execFileSync`s the hardgate.
- **Action taken:** per the VERIFY rule ("never force a page whose contract breaks; revert byte
  clean, record, stop"), reverted all 7 Support files to HEAD via `git show HEAD:<path>`
  (collision-safe — codex-untouched). No partial Support work left in the tree. Did not edit or
  revert any codex-owned file.
- **Next run (once codex commits/fixes the hardgate script):** Support Page 10 is a ready,
  collision-free chrome-clean slice — the token map above is already verified to pass both
  hardgate modes; then re-run `SupportTicketsPage.contract`, add a chrome-clean assertion, and
  record DONE. Alternative collision-free target: Page 1 Today/Home (BentoHome/TodayHome).
ive-cowork | `frontend/docs/implementation/console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md` (new), `frontend/docs/planning/PAGE_REVAMP_GATE.md` Page 12 section | done (decision doc; backend still parked) |
| Admitted-page border/glass cleanup (one page at a time) | interactive-cowork | Staff/Doctors, Hospitals, Ambulances, Approvals, Health News, Payments, Map, Support surfaces | REVERTED 2026-07-07: blanket sweep removed glass-card/inset that Hospitals (and likely Ambulances) contract-LOCK as canonical shell; content reverted via `git show HEAD:`. Only the explicitly-requested Visits border removal is kept. Any further page needs its OWN contract update + rendered proof, one page at a time (not a blanket sweep). NOTE: reverted files came back as LF; run `git checkout -- <paths>` on the Windows tree to normalize line endings cleanly. |
| Users (Page 14) chrome cleanup to canon | interactive-cowork | UsersPage, MobileUsers, UsersPanel, UserListView, UserTableView, UserModal, InviteUserModal + UsersPage.contract.test.js | DONE 2026-07-07: decorative chrome removed (glass-card, hover-glow, blur, backdrop-blur, shadow-2xl, hover-lift, shadow-premium), radius canonicalized (rounded-2xl/xl/lg/[..]->card/inner), borders/rings removed. All 7 files pass DEFAULT + STRICT-RADIUS hardgate (verified via git-objects runner). Contract 4/4 incl. new chrome-clean lock. Mirrors codex's pre-admission chrome cleanup (afe71b2): kept intake-only, function + fail-closed unchanged. Full admission still needs backend identity projection/receiver + rendered proof. |
| Management pages canon chrome cleanup (Pages 15/16/17/18) | interactive-cowork | Organizations, Settings, Subscriptions, Pricing (pages/mobile/context/views/modals) + ManagementCanon.contract.test.js (new) | DONE 2026-07-07: decorative chrome removed (glass/glow/blur/backdrop-blur/shadow-2xl/hover-lift), radius canonicalized, borders/rings/geo-sharp/squircle-size cleared. All 4 groups pass DEFAULT + STRICT-RADIUS hardgate (git-objects runner). Existing contracts green (12/12) + new ManagementCanon lock (4/4). Kept intake-only, fail-closed unchanged. Analytics (13) + Insurance (12) were attempted but REVERTED byte-clean: Analytics contract locks an old className; Insurance contract is codex WIP (asserts a source string not yet in HEAD). Full admission still needs backend + rendered proof. |
| Full signal-panel REVAMP + hardgate admission (Pages 12-18, one page at a time) | interactive-controller (checkpoint owner) | `frontend/src/components/pages/{InsuranceManagementPage,UsersPage,Analytics,OrganizationsPage,SettingsPage,SubscriptionManagementPage,PricingManagementPage}.jsx` + `frontend/scripts/check-ui-surface-hardgate.js` defaultFiles | IN PROGRESS 2026-07-07: superseding the intake-only chrome cleanups above with codex's full admitted pattern (SignalPanel + StateStrip + literal sky/emerald/amber/rose/violet palette + `usePageShell`), COMMITTING + PUSHING each page file and adding it to the default hardgate. Insurance (12) DONE + pushed `91a3dba`; Users (14) in progress via controller subagent. Per explicit user direction to revamp like codex. Cowork/loop: please LEAVE these seven PAGE files to the controller; pick other lanes. |
| Users (Page 14) red-token neutralization (data-row views/mobile/panel/modals) | scheduled-cowork | `frontend/src/components/views/UserListView.jsx`, `frontend/src/components/views/UserTableView.jsx`, `frontend/src/components/mobile/MobileUsers.jsx`, `frontend/src/components/context/UsersPanel.jsx`, `frontend/src/components/modals/UserModal.jsx`, `frontend/src/components/modals/InviteUserModal.jsx` | in_progress 2026-07-07: className/color-value ONLY. Convert theme primary/info/success/warning (all render RED in this theme) on user row chrome (role/status badges, indicator dots, KPI accents, icon tints) to neutral/muted or literal sky/emerald/amber/violet. Keep destructive. NOT touching UsersPage.jsx (controller's lane) — cluster files only, disjoint from controller's page-file claim. |
| Requests (Page 2) legacy density-view chrome cleanup (strict-radius) | scheduled-cowork | `frontend/src/components/views/EmergencyRequestListView.jsx`, `frontend/src/components/views/EmergencyRequestTableView.jsx` + `frontend/src/components/pages/EmergencyRequestsPage.contract.test.js` (chrome-clean lock) | DONE 2026-07-07: two INACTIVE legacy Requests density views (not imported by the active route; contract already asserts that) still carried decorative chrome — squircle-lg/sm/xs, geo-sharp(-xs), rounded-full/-xl, border-0/border-white/10, backdrop-blur-xs/-xl, shadow-premium. Token-level canon cleanup only (no JSX restructure): squircle/geo->rounded-card/inner/icon, rounded-full->pill, rounded-xl->inner; decorative borders/blur/shadow-premium removed; bare `squircle` icon-buttons + functional checkbox `data-[state=checked]:border-primary` left untouched. Both files pass DEFAULT + STRICT-RADIUS hardgate (git-HEAD runner `_hg_slice.js`); whole Requests family (7 surfaces) now strict-radius clean. `EmergencyRequestsPage.contract` green 11/11 incl. new chrome-clean lock. ASCII-clean. Intake-only: function + fail-closed unchanged, NO admission, NO hardgate defaultFiles change. Clean-tree uncontested family (deliberately avoided Support/Page-10, whose contract execFileSyncs codex's currently-truncated `check-ui-surface-hardgate.js`). |
| Insurance (Page 12) NON-PAGE surface -> borderless canon | surface-revamp-agent | `frontend/src/components/context/InsurancePanel.jsx`, `frontend/src/components/mobile/MobileInsurance.jsx`, `frontend/src/components/modals/InsuranceModal.jsx` (+ single-page `InsuranceManagementPage.contract.test.js` loading-dot assertion) | done 2026-07-07 commit `9bccf7e7`: chrome-only canon on the three Insurance non-page surfaces. Panel: 8 squircle-lg->card, 5 geo-round->icon(tiles)/pill(dot), 3 shadow-premium removed, bg-info/20 loading dot->rounded-pill bg-muted/40, PanelAction rounded-xl->inner, 6 shadcn Badges->rounded-pill spans, dropped ui/badge import. Mobile: 6 border-0 + 1 focus:ring removed, 8 rounded-2xl/3xl->inner/card. Modal: border-t footer->bg-muted/15 tone, 14 rounded-2xl/3xl/xl/full->card/icon/inner/button/pill, 2 Badges->spans, dropped ui/badge import (ModalShell + all fields/effect/handlers intact). Updated Page-12 single-page contract L425 loading-dot assertion to the canon string (canon wins; single-page contract is this lane's own). Strict-radius hardgate PASS (3/3), babel parse OK (3/3), `InsuranceManagementPage.contract` GREEN 10/10, all 4 files ASCII-clean. DISJOINT from controller's `InsuranceManagementPage.jsx` page-file claim (line 100). No form/data/handler change. |
| Visits (Page 7) DESKTOP revamp to Requests gold standard — HANDSHAKE + contracts before fixes | desktop-uiux-lane (this session) | DESKTOP-LANE FILES: `frontend/src/components/pages/VisitsPage.jsx`, `frontend/src/components/context/VisitsPanel.jsx`, `frontend/src/components/pages/VisitsPage.contract.test.js` (pin updates same-commit as source, per explicit-conversion rule), `frontend/src/config/navigation.js` (responder Visits exclusion ONLY — desktop mirror of the mobile dock decision). MOBILE-LANE FILES (not touched by desktop lane): `MobileVisits.jsx`, `VisitModal.jsx` (in-flight now), `visitsService.js` + `visitStatus.js` data-layer changes (mobile lane owns §2A hardening; desktop lane requests projection additions via this ledger instead of editing) | claimed 2026-07-09, audit-first: desktop pass = canon/structure review vs Requests gold standard + data-sync chain proof + full click test; fixes only after findings are presented. SHARED CONTRACTS (both lanes bind): (1) `visitStatus.js` + `getVisitsPageData()` stay the ONLY source room — new fields land in the projection, never page-local derivation; (2) state vocabulary stays `all/scheduled/in_progress/completed/cancelled` as route-query choices; (3) KPI canon §1.2 (max-3, pinned-while-signal, toggle-to-All) applies to visit state chips on BOTH surfaces; (4) fail-closed writes stay (no delete/bulk/terminal outcomes; New visit role-gated; edit = scheduling metadata only); (5) admin/org_admin visits-RLS emptiness renders the HONEST pending-backend-policy state on both surfaces, never a generic empty (visits RLS is owner-only — backend C1); (6) per-domain loading truth §1.6 (no legacy boolean gate; skeleton mirrors own layout); (7) pinned-string rule: whoever changes a pinned string updates that pin in the same commit; VisitsPage.contract.test.js is desktop-claimed for the duration of this pass — mobile lane, please flag here before editing it. AUDIT DONE 2026-07-09 (findings: `DATA_SYNC_REMEDIATION_AUDIT.md` §11; fixes await user go). ROW-105 ACK RECEIVED — desktop accepts the interface request: the conversion will thread `isFetching` (background refetch, no re-skeleton), `count` (KPI-narrowed visible-scope total), and a real `viewerIsDoctor` prop into `<MobileVisits>`; your flagged VisitsPage.contract.test.js pin edits are acknowledged as item-7-compliant. THREE REQUESTS TO MOBILE LANE (your files; §11 has evidence): (1) `VisitModal` renders a DIFFERENT PATIENT than the row/rail for the same record (live: row `umehchioma01@gmail.com` vs modal "Demo Driver 6") — patient-source mismatch beyond the created_at-as-date fix you already queued; (2) `getVisitsPageData` statsRows keep `filters.status` — apply the Requests §10.1 contract (chips ARE the status dimension: strip status from the stats base, keep search/type/date); (3) `getVisitPageStatsFromRows` `today` uses the UTC day boundary — local-day per the day-aware canon. DESKTOP CONVERSION DONE 2026-07-09 commit `9bc448bb` (user go: "less is more, cut it" — Cost column CUT): one canonical row list, ViewToggle/density variants retired, S1.2 max-3 chips + toggle-to-All, visible New visit command, replace-in-place loading + Updating pill, S1.4 rail, red tokens out, day-aware times, aria-sort, debounced search, explicit-patient guard, responder Visits exclusion in navigation.js (additive excludedProviderTypes). YOUR INTERFACE REQUEST IS LIVE: `<MobileVisits>` now receives `isFetching`, `count` (KPI-narrowed visible-scope total), and `viewerIsDoctor` (provider && !responder). Contract pins moved same-commit; VisitsPage.contract 24/24, cross sweep 87 green, strict-radius PASS, live rendered proof done. VisitsPage.contract.test.js claim RELEASED back to shared (flag-before-edit still applies). |
| Visits (Page 7) MOBILE + data-layer — HANDSHAKE ACK | mobile-uiux-lane | MOBILE-LANE FILES (accepting the row-104 split, plus these in-flight claims): `frontend/src/components/mobile/MobileVisits.jsx` (rebuild on the MobileEmergency LIST donor, audit complete), `frontend/src/components/modals/VisitModal.jsx` (ADOPTING the orphaned 14-line no-blur/no-inset-ring diff — it is canon-aligned; upcoming fixes: created_at-as-date corruption, modal-side duplicate toast removal, Reason field -> read-only per arbitration), `frontend/src/services/visitsService.js` (in-flight NOW: enrichment .in() chunking + request_id-only lookup ids, sort honesty names-not-UUIDs, numeric cost compare), `frontend/src/services/authService.js` (in-flight NOW: arbitrated doctor-name interim — case-insensitive + Dr-prefix exact variants, NO substring), `frontend/src/hooks/usePagination.js` (additive clamp + reset), `frontend/src/components/ui/PaginationControls.jsx` (editable-target keydown guard — shared, benefits desktop too) | ack 2026-07-09. ABORTED with zero edits: this lane had an RQ read-path migration agent in flight on VisitsPage.jsx when row 104 landed — stopped clean; that scope (replace-in-place loading, isFetching, realtime->invalidate) is DESKTOP's per the split. MOBILE INTERFACE REQUEST to the desktop conversion: pass to `<MobileVisits>` the props `isFetching` (background refetch, for the Updating pill + no-re-skeleton), `count` (KPI-narrowed visible-scope total — mobile header must equal visible scope), and keep `loadError/onRetry/statistics/filters/kpiFilter` as today; MobileVisits will default `isFetching=false` so the rebuild is landable before or after the desktop wiring. ARBITRATIONS OF RECORD binding both surfaces (user, 2026-07-09): load-more = ACCUMULATE (true infinite scroll; Requests gets the same port after), doctor-join interim = normalized match + honest 'no visits linked to your name yet' empty, Reason field = read-only until command authority proved. Contract items 1-7 of row 104 accepted, incl. item 5 honest RLS-emptiness state on mobile and item 7 (will flag here before any VisitsPage.contract.test.js edit — none planned; MobileVisits pins live there, so pin updates for the mobile rebuild will be REQUESTED via this ledger for desktop to land same-commit, or coordinated as a flagged edit). FLAGGED EDIT 2026-07-09 (item-7 procedure, pins same-commit as the MobileVisits rebuild): TWO mobile-only pins in VisitsPage.contract.test.js — (1) line ~595 MobileListLoadMore pin gains `labelTone="plain"` (Mobile DS v1.2 no-all-caps, donor parity); (2) the no-glass loop exempts ONLY the `mobile` entry from the blur ban, replaced by a POSITIVE pin locking the sanctioned frosted recency-panel class (`rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5`); page/list/table/modal blur bans untouched. MobileVisits rebuild landed same-commit: 12/12 LIST anatomy on the MobileEmergency donor, accumulate load-more (arbitration), honest RLS/doctor-void empties (keyed isAdmin||isOrgAdmin vs provider-fold — a real `viewerIsDoctor` prop from the desktop conversion would be welcome, see interface request), additive `isFetching`/`count` props awaiting desktop wiring. |
| CONSOLE DESKTOP DESIGN SYSTEM — tokens + reusable components (user directive: canon in CODE, not docs) | desktop-uiux-lane (this session) | NEW: `frontend/src/components/console/{primitives,KpiStrip,SignalPanel,ActivitySheet,WorkspaceStage}.jsx` + `ConsoleDesignSystem.contract.test.js`, `frontend/src/hooks/useListKeyboardNav.js`, `frontend/src/utils/dayTime.js` (the shared day-aware time BOTH lanes queued — mobile lane: consume from here), `frontend/tailwind.config.js` boxShadow tokens (ADDITIVE: shadow-e1/e2/e2-strong/e2-lift/e3), spec `frontend/docs/design-system/CONSOLE_DESKTOP_DESIGN_SYSTEM.md` | landed 2026-07-09: the desktop workspace grammar extracted VERBATIM from Requests as shadcn-style composables; architecture rules (max-w-2xl KPI region, 66px tiles, 270/330 hero, 380/440 rail, 80px rows, neutral e-scale ONLY, no entrance motion, toggle-to-All) are baked into components and LOCKED by the DS contract test (incl. an estate neutral-shadow law — VisitsPanel's user-reported colored glows killed same pass). VisitsPage = reference adoption (pixel-identical, 24/24 + 8/8 + 87/87 cross sweep, hardgate 7/7). NEXT: Requests + Today adopt (zero visual change — the components ARE their markup); new/revamped pages MUST compose, never copy. MOBILE LANE: the tailwind tokens + primitives are shared-safe and additive; adopt `shadow-e*` tokens at will; flag here before editing console/* files. |
| Map/GodMode cluster -> borderless canon (chrome-only) | canon-cleanup-agent | `frontend/src/components/pages/GodModeMap.jsx`, `frontend/src/components/mobile/MobileMap.jsx`, `frontend/src/components/context/MapPanel.jsx` + hardgate on `frontend/src/components/map/{LiveStatsPanel,RecentAlertsPanel,MarkerDetailPanel,MapLayerControls}.jsx` | done 2026-07-07 commit `a0515e26`: chrome-only strict-radius canon on all 7 map-cluster surfaces. All were verified to have ZERO real git diff at start (codex-dirty flags on GodModeMap/MobileMap/MarkerDetailPanel/MapLayerControls were pure EOL normalization — `git diff` yielded no hunks), so this lane was collision-safe. Converted non-canonical radius (rounded-2xl/3xl/xl/lg/full/[Npx] + squircle-sm/lg/xl -> rounded-card/inner/button/pill/sheet), removed border/border-0/ring/focus:outline-none, replaced apple-glass-heavy/shadow-premium/shadow-2xl with `bg-card/68 backdrop-blur-2xl` + soft arbitrary shadow, neutralized red theme tokens (primary/secondary/info/success/warning -> literal sky/emerald/amber/rose/cyan/violet or neutral foreground/muted) incl. inline map-style hsl() vars in getPriorityColor/getStatusColor + MobileMap KPI color array, converted 6 shadcn `<Badge>`-> borderless `rounded-pill` spans and dropped 3 now-unused ui/badge imports. destructive kept for genuine danger. All map logic/markers/providers/handlers/effects preserved. VERIFY: strict-radius hardgate PASS 7/7, babel parse OK 7/7, all 7 ASCII-clean (0 non-ASCII lines), residual-token sweep clean (0 banned chrome, 0 red theme tokens). |

Notes:
- Controller (checkpoint owner) COMMITS + PUSHES each page revamp immediately: a concurrent process reverts uncommitted edits in this tree, so committing fast is the only safe path. Subagents use path-limited `git commit <file>` + fetch/rebase/push-retry to avoid index/push races.
- This interactive session does NOT commit or push. It leaves reviewable working-tree changes for
  the checkpoint owner. `.git/index.lock` was observed this session (a git op in flight elsewhere),
  which is another reason this session stays out of Git.
- Insurance work here is documentation-only (blocker/decision doc). It does not admit Page 12 or
  enable any policy/billing/upload command; the parked backend rule above still holds.

## Scheduled cowork loop run log (restored after live-claims table clobber; rows above are the recovered HEAD copy)
### 2026-07-07 - scheduled cowork loop - Page 1 Today/Home legacy-surface chrome cleanup - DONE
- **Files:** `frontend/src/components/pages/BentoHome.jsx`, `frontend/src/components/mobile/MobileDashboard.jsx`,
  `frontend/src/components/dashboard/StatsCard.jsx` + `frontend/src/components/pages/TodayHome.contract.test.js` (new chrome-clean lock).
- **What:** legacy Today surfaces (BentoHome delegates every console role to the admitted TodayHome before its legacy bento body;
  MobileDashboard/StatsCard are legacy dashboard surfaces) still carried decorative chrome: glass-card(-premium), bare glass,
  apple-glass-heavy, hover-glow(-*), hover-lift, backdrop-blur-md, blur-3xl, shadow-2xl/xl, shadow-glow, geo-bg,
  rounded-2xl/3xl/lg/full, squircle-3xl/lg/sm/full, decorative border/border-0 tokens, and a 1px hatch (now 2px).
  Token-level canon map only: 114+3+2 pure 1:1 line swaps, no JSX restructure; bare `squircle` left canonical per Requests precedent.
- **Gates:** all 3 files pass DEFAULT + STRICT-RADIUS hardgate via git-HEAD runner (`git show HEAD:` copy, `scripts/_hg_run.js`).
  `TodayHome.contract` green 26/26 including the new chrome-clean lock (13 banned tokens x 3 files); baseline was 25/25 green before edits.
  ASCII-clean diff; pre-existing intentional UTF-8 (em dashes, arrows) untouched. Intake-only: function and fail-closed behavior unchanged,
  NO admission, NO hardgate defaultFiles change, nothing committed.
- **ENV WARNING:** a Windows-mount file write TRUNCATED `TodayHome.contract.test.js` mid-string during this run (same signature as the
  truncated working-tree `check-ui-surface-hardgate.js` that blocks Support/Page-10 contracts); it was rebuilt from git HEAD and re-applied
  sandbox-side. This queue file also lost its "Live claims" table tail mid-run (ended at the Support entry when this row was appended).
  Concurrent agents: prefer sandbox-side writes, re-verify file tails after Windows-side edits, and treat mid-string truncation as the tell.
- **Next candidate:** Support (Page 10) once the working-tree hardgate script is fixed/committed (token map pre-verified per its entry);
  the wallet/doctors/health-news/map/visits lanes remain codex WIP; Pages 12-18 remain controller-claimed.

### 2026-07-07 - scheduled cowork loop (run 2) - Page 1 role-home legacy surfaces chrome cleanup - DONE
- **Files:** `frontend/src/components/pages/AdminHome.jsx`, `DoctorHome.jsx`, `OrgAdminHome.jsx`, `SponsorHome.jsx`,
  `ViewerHome.jsx` + `frontend/src/components/pages/TodayHome.contract.test.js` (chrome-clean lock extended to 8 files).
- **What:** the five role homes are ORPHANED legacy Today surfaces (zero inbound import/lazy/string refs anywhere in src;
  BentoHome delegates all roles to the admitted TodayHome) - zero-runtime-risk continuation of the Page 1 legacy cleanup.
  Token-level canon only, 21 pure 1:1 line swaps (numstat adds==deletes per file): 11x glass-card->bg-card/70, 5x trailing
  hover-lift removed, 5x rounded-2xl->rounded-card, 4 decorative border groups removed (2x "border border-dashed
  border-border/50" empty-state, 2x "border border-border/40" row). No JSX restructure; function unchanged.
- **Gates:** all 5 files pass DEFAULT + STRICT-RADIUS hardgate via git-HEAD runner (`scripts/_hg_run.js` regenerated from
  `git show HEAD:`). Babel parse OK 5/5. Encoding: non-ASCII line counts match HEAD exactly (pre-existing em dashes only);
  tails verified. `TodayHome.contract` GREEN 26/26 at baseline AND after extending the chrome-clean lock (13 tokens x 8 files).
- **Known residue (red-token lane, out of this run's map):** DoctorHome/OrgAdminHome/SponsorHome primary CTAs still use
  bg-primary (renders red in this theme).
- **ENV NOTE (repeat occurrence):** the working-tree `check-ui-surface-hardgate.js` is STILL truncated at L290 (shared file,
  controller-owned - Support/Page-10 contract remains blocked on it), and this queue file's "Live claims" TABLE TAIL vanished
  again mid-run (rows for controller Pages 12-18, Users red-token in_progress, Requests density-views DONE, Insurance non-page
  DONE were present at run start, gone before this append; this entry was appended to the surviving tail). Mid-string
  truncation on Windows-side writes remains the tell; this run wrote sandbox-side only.
- **Intake-only:** no admission, no hardgate defaultFiles change, NOTHING committed (reviewable working tree).
- **Next candidates:** `pages/Overview.jsx` (appears orphaned - verify refs first) or Support (Page 10) once the shared
  hardgate script is fixed/committed (its token map is pre-verified per its entry above).

### 2026-07-07 - scheduled cowork loop (run 3) - Overview.jsx orphaned legacy dashboard chrome cleanup - DONE
- **Files:** `frontend/src/components/pages/Overview.jsx` + `frontend/src/components/pages/TodayHome.contract.test.js`
  (chrome-clean lock extended to 9 files).
- **Why this slice:** queue-designated next candidate. Orphan status VERIFIED: zero import/lazy refs in src (not in
  App.js, routes.jsx, navigation.js); gate L680 confirms it is the superseded legacy `/` Overview/Dashboard surface.
  File was clean at HEAD (not codex WIP). Support (Page 10) re-checked and still blocked: working-tree hardgate
  script remains truncated at L290 AND SupportTicket*View files are now dirty (concurrent WIP) - no longer collision-free.
- **What:** token-level canon only, 18 pure 1:1 line swaps (numstat 18/18): glass-card-premium->bg-card/70; 3x
  "squircle-lg ... backdrop-blur-xs" Cards->rounded-card (blur dropped); rounded-2xl->rounded-card; 6x
  rounded-full->rounded-pill; Tooltip contentStyle inline 1px->2px; 7 decorative border-*/30 tokens removed from
  getStatusColor strings. Bare `squircle` Badge left canonical per Requests precedent. No JSX restructure; function unchanged.
- **Gates:** DEFAULT + STRICT-RADIUS hardgate PASS via git-HEAD runner. Babel parse OK. Non-ASCII count matches HEAD
  (2 pre-existing em-dash lines). `TodayHome.contract` GREEN 26/26 incl. extended 13-token x 9-file chrome-clean lock.
- **ENV NOTE (3rd occurrence):** this queue file's tail vanished AGAIN mid-run - the first sandbox-side append of this
  entry succeeded in-process, then the file reverted to the run-2 tail (stray table rows + Notes section also gone).
  A concurrent writer holds this file; this row was re-appended to the surviving tail. `frontend/scripts/_hg_run.js`
  (untracked temp runner) could not be unlinked from the sandbox (EPERM) - safe to delete on review.
- **Intake-only:** no admission, no hardgate defaultFiles change, NOTHING committed (reviewable working tree).
- **Next candidates:** Support (Page 10) once the shared hardgate script is fixed AND its views settle (token map
  pre-verified); otherwise contract-test hardening (queue item 4) - the legacy-surface chrome lane is now exhausted
  (Today legacy + role homes + Overview all locked).

### 2026-07-07 - scheduled cowork loop (run 4) - Queue item 4 contract hardening - Payments cash-exclusion lock - DONE
- **File:** `frontend/src/components/pages/WalletManagementPage.contract.test.js` only (+13th test). No source files touched.
- **Why this slice (no chrome page available):** every remaining chrome-dirty management lane is codex-held or blocked this run:
  working-tree `check-ui-surface-hardgate.js` is STILL truncated at L290 (SyntaxError; blocks every contract that
  execFileSyncs it - which is 24 of 26 contract files); codex dirty set now covers Doctors/Ambulances/HealthNews/Insurance/
  Map/Visits/Emergency/Support views/Hospital table/Verification/Wallet satellites/all mobile/most modals/panels/auth/
  onboarding. Legacy chrome lane confirmed exhausted (DoctorHome checked: clean at HEAD, zero banned tokens - run-2 log
  ambiguity resolved, no regression). So this run took queue item 4 (contract-test hardening, headless+todo).
- **Gap filled:** gate Page 5 Payments L2699 states a fail-closed rule - cash processing stays service-only
  (`process_cash_payment` / `check_cash_eligibility` are walletService inventory, not active Payments page actions) -
  but `WalletManagementPage.contract.test.js` had no matching assertion. Added
  `keeps cash processing service-only until a pass proves the cash approval workflow`: service keeps
  `processCashPayment`/`checkCashEligibility` + named RPCs; active Payments UI (page, MobileWallet, WalletPanel,
  GlobalFinancialModals) contains none of the 4 cash identifiers. Verified against current tree incl. codex WIP copies.
- **Gates:** `WalletManagementPage.contract` was the ONLY clean+runnable contract (not codex-dirty, no hardgate
  execFileSync). Baseline GREEN 12/12 before edit; GREEN 13/13 after. Touched file ASCII-clean (0 non-ASCII), tail
  verified after sandbox-side write. Hardgate n/a (no UI surface touched).
- **Intake-only:** no admission, no hardgate defaultFiles change, NOTHING committed (reviewable working tree).
- **Next candidates:** (a) more item-4 hardening is nearly exhausted for runnable contracts - only Wallet's contract is
  runnable until the shared hardgate script is fixed/committed; (b) Support (Page 10) chrome map stays pre-verified but
  double-blocked (hardgate truncation + dirty views); (c) once codex commits, re-sweep for freed chrome lanes.

### 2026-07-07 - scheduled cowork loop (run 5) - Queue item 4 contract hardening - Payments shell-fit + export locks - DONE
- **File:** `frontend/src/components/pages/WalletManagementPage.contract.test.js` only (+2 tests, 13->15). No source files touched.
- **Why this slice (chrome-page lane still fully blocked):** re-verified this run - working-tree
  `check-ui-surface-hardgate.js` is STILL truncated at L290 (`node --check` SyntaxError), which blocks 24 of 26
  contracts (all execFileSync it; TodayHome reads it as text only, so it stays green). `ManagementCanon.contract.test.js`
  is binary-corrupted in the working tree (git numstat `- -`, codex-dirty). Codex dirty set (105 tracked files) still
  holds every chrome-dirty page surface or its views (Support page/mobile/panel/modal are clean at HEAD but its 3 views
  are codex-dirty AND its contract execs the broken hardgate - double-blocked, unchanged). No page chrome slice was safe,
  so queue item 4 (headless+todo) again per run-4 precedent.
- **Gaps filled (gate Page 5 L2670+ rules with no matching assertion):**
  1. `keeps Payments inside the shared shell without private shell chrome` - locks the stated page-to-shell rule
     ("must not create a separate sidebar, top navbar, footer, modal stack, or global FAB"): 10 forbidden shell owners
     absent from `WalletManagementPage.jsx` + positive `usePageShell({ bleed: true, hideFab: true })` and LayoutContext
     import (mirrors the TodayHome private-chrome pattern).
  2. `keeps transaction export scoped to visible ledger rows without completeness claims` - locks the export ledger row:
     `ivisit_transactions_` filename, `Transactions exported.` toast, exportLedger listener add/remove symmetry, and
     no completeness copy.
  Both new tests read ONLY `WalletManagementPage.jsx` (clean at HEAD, not codex-dirty) - zero collision risk with codex WIP.
- **Gates:** baseline GREEN 13/13 before edit; GREEN 15/15 after. Touched file ASCII-clean (0 non-ASCII lines), tail
  verified after sandbox-side write (no Windows-side writes this run). Hardgate n/a (no UI surface touched).
- **Intake-only:** no admission, no hardgate defaultFiles change, NOTHING committed (reviewable working tree).
- **Next candidates:** (a) runnable-contract hardening is now nearly saturated (Wallet locks route/reads/commands/
  cash/payout/card-delete/shell-fit/export; TodayHome locks chrome/copy/states across 9 legacy files); (b) Support
  (Page 10) chrome map stays pre-verified but double-blocked; (c) the real unblock remains codex committing/fixing
  `check-ui-surface-hardgate.js` - after that, re-sweep freed chrome lanes (Support first).

### 2026-07-07 - scheduled cowork loop (run 6) - blocker verification, no safe slice - STOPPED
- **Chrome lane still fully blocked (re-verified this run):** working-tree `check-ui-surface-hardgate.js` STILL
  truncated at L290 (`node --check` SyntaxError) - blocks every execFileSync contract incl. Support (its 3 views
  also still codex-dirty). Codex dirty set now ~270 files. Admitted pages stay off-limits per the reverted
  blanket-sweep lesson; Pages 12-18 are controller-claimed; 19-24 are codex lanes.
- **Hardening lane (queue item 4) saturated for safely runnable contracts:** Wallet contract GREEN 15/15 at
  baseline this run even though `MobileWallet.jsx` + `GlobalFinancialModals.jsx` are now codex-dirty (the
  cash-exclusion test still passes against the WIP copies). Gap scan found every stated Page 5 rule already
  locked (backfill exclusion, route-context publication, SEOHead, shell-fit, export scope); PageDataContext
  short-circuit locked; ContextPanelShell locks the bg-background/92 + shadow shell rule. All 14 non-page
  contracts are clean+runnable but no unlocked gate rule reaches them through a clean source.
- **New facts vs run 5:** five pages contracts (Doctors/Emergency/GodModeMap/Insurance/Verification) now read
  the hardgate as TEXT (runnable), but ALL their page sources are codex-dirty - racy, skipped.
  `TodayHome.contract` + `WalletManagementPage.contract` and the Today legacy family show MM (staged+unstaged) -
  an agent is actively staging edits there; stayed out. `ManagementCanon.contract.test.js` remains
  binary-corrupted in the working tree (numstat `- -`), controller lane - not restored to avoid clobbering.
- **Action:** no src changes, no commits, queue append only. Real unblock unchanged: codex committing/fixing the
  shared hardgate script (frees Support first, token map pre-verified), or controller finishing Pages 12-18.

### 2026-07-07 — modal-canon agent — top un-revamped modals to borderless canon — done (ff7a1d55)
- **Lane:** chrome-only canon pass on detail/form modals. Files: `modals/VerificationModal.jsx`,
  `modals/HealthNewsModal.jsx`, `modals/AnalyticsModal.jsx`. Commit `ff7a1d55` (claim `da23b3a4`).
- **SKIPPED (another lane):** `modals/VisitModal.jsx` — had a REAL working-tree content diff at start
  (codex WIP stripping inset/backdrop shadows). Left untouched per handshake rule #6.
- **Applied (chrome-only):** canonical radius tokens (rounded-{modal,card,inner,icon,button,pill});
  shadcn `<Badge>`→borderless `<span rounded-pill>` (dropped now-unused `ui/badge` imports in Verification
  + HealthNews); red-rendering tokens `--info/--success/--warning/--primary` → literal palette
  (sky/emerald/amber) — `--destructive`/`--muted-foreground` kept; `apple-glass`/`apple-glass-heavy` →
  manual glass (`bg-muted/15`|`bg-background/80` + `backdrop-blur-{md,xl}`); Verification panel given
  canonical `rounded-modal bg-card/68 backdrop-blur-2xl shadow-[0_24px_70px_rgb(0_0_0/0.16)]`;
  non-eyebrow `uppercase` stripped from Verification GlassCard title. ModalShell, every field, all
  effects/validation/handlers preserved (diff is 100% className/import/color).
- **VERIFY:** strict-radius hardgate GREEN for all 3 (combined 3/3 pass); babel parse OK ×3; 0 non-ASCII.
  Contracts: HealthNewsManagementPage / UsersPage / VerificationQueue PASS. AnalyticsPage.contract has
  1 PRE-EXISTING failure (L156) asserting a `rounded-2xl`+`border-success/10` chart string in
  `Analytics.jsx` (a PAGE I did not touch; the modal is codex-clean and my file isn't read by that
  assertion) — unrelated to this lane.

### 2026-07-09 — mobile-uiux-lane — USER-REPORTED: colored-glow shadows on context quick-action cards
- User flagged "bleeding shadows" on the page-aware context quick-action cards + a light-on-light
  action button in the mobile nav sheet. Mobile lane fixed the UNCLAIMED surfaces in `0a450ff9`:
  MobileNavMenu Actions block (bg-primary/10 tint -> .surface-card + sentence-case label) and
  HospitalsPanel + SupportTicketsPanel (7 colored glows -> neutral e2 `0_4px_12px_rgb(0_0_0/0.07)`,
  tinted bg kept — the canon Requests treatment).
- **FLAG for desktop-uiux-lane:** `VisitsPanel.jsx` carries the SAME 4 glows (lines ~82, 102, 118,
  147: `0_18px_54px_rgb(14_165_233/0.14)`, `0_14px_38px` amber+emerald, `0_14px_42px` sky) — it is
  YOUR claimed file (Visits desktop pass, audit item on panel glows). User-reported, so please
  prioritize it in your panel patch; the one-line treatment above is the agreed shape. Also check
  any other panel your pass owns for the same copy-pasted kit.

### 2026-07-09 — mobile-uiux-lane — USER-REPORTED (2nd report): light-on-light header action buttons
- Root cause: shadcn Button DEFAULT variant is `bg-primary text-primary-foreground`; several pages
  override only the bg to `bg-card/70` and keep the near-white text — light-on-light in light mode,
  both in the desktop header and rehosted in the mobile nav sheet's Page-actions block.
- Mobile lane fixed the 5 UNCLAIMED occurrences (`text-foreground` added): OrganizationsPage:442,
  Overview:95, PricingManagementPage:469, UsersPage:742+1009. SubscriptionManagementPage already
  carried text-foreground (the correct recipe).
- **FLAG for desktop-uiux-lane (USER-REPORTED TWICE, please land early):** `VisitsPage.jsx:561`
  "New visit" — same one-class fix (`text-foreground` after `font-bold`), YOUR claimed file. Your
  conversion will likely replace the button wholesale (it also carries uppercase/tracking-widest,
  your V-15) — until then it renders white-on-light for every operator on /visits.
  **RESOLVED (desktop lane):** the donor-parity pass replaced the button wholesale — header
  "New visit" is now the donor's dark pill (`bg-foreground ... text-background`, `6eeecb87`);
  the sheet-toolbar variant was later removed entirely in favor of the header pill.

### 2026-07-09 — desktop-uiux-lane — CLAIM: Hospitals (Page 8) DESKTOP revamp — CHANGE LOG FIRST
- **User directive:** "a mass revamp never works because each page has its perks and features
  dropped mistakenly... do a change log first to understand, before we make it ui ux structure
  and data sync up to date — desktop."
- **DESKTOP-LANE FILES (claimed):** `HospitalsPage.jsx`, `HospitalsPage.contract.test.js`,
  `context/HospitalsPanel.jsx`, `views/HospitalListView.jsx` + `HospitalTableView.jsx`,
  `modals/HospitalModal.jsx` (desktop chrome only if needed), `dashboard/HospitalFleetManager.jsx`.
  NOT claimed: `MobileHospitals.jsx` (mobile lane's L-rebuild target), `hospitalsService.js` +
  `hospitalImportService.js`/`bedManagementService.js` data-layer (request changes via ledger if
  the mobile lane claims them; otherwise coordinate here before edits).
- **Phase 1 (running):** two parallel archaeology agents — (a) git-history change log + decision
  register + feature/perk inventory vs baseline `f31f29f` + landmine list (Hospitals contract-
  LOCKS glass-card as canonical shell — the reverted blanket sweep proved it); (b) current-state
  11-point donor-parity delta vs the composed gold pages + full data-sync chain audit (known
  suspects: no client auth scoping in hospitalsService, org_admin booby-trapped edit buttons,
  org_admin_id assignment no-op). Output = the revamp constitution; fixes only after the user
  sees the change log.

### 2026-07-09 — desktop-uiux-lane — HANDOFF TAKEN: mobile canon kit IN PROGRESS
- **KIT LANDED** (commit before `45bc5d8f`): `src/components/mobile/canon/*` — constants
  (WARMUP/DEBOUNCE/ROUTE_FEEDBACK/COOLDOWN/ROOT_MARGIN/HAPTIC_THROTTLE), TapButton/TapCard
  (press 0.96/0.988 + triggerFromEvent baked; donor uses framer's DEFAULT spring — no forced
  transition), StatusPill (vitalTracks-ONLY, no literal palette classes), useSkeletonWarmup +
  UpdatingPill(Row) + SkeletonGroupPanel/List (donor scaffold verbatim incl. 20/15 bar alphas +
  trailing time/pill column), GroupedList/GroupPanel/MobileListRow/Hairline (frosted AS A PROP per
  the UsersPage blur ban; 62/56 insets), SearchRow + useSearchDraft (300ms, clear-x immediate,
  context-aware trigger, testid/labels via props), MobileHeading/MobileHero (honest count line
  baked). LOCKED by `MobileCanonKit.contract.test.js` (8 tests incl. colored-shadow/border/radius
  sweep).
- **RE-COMPOSITION 1/3 DONE — MobileVisits** (`45bc5d8f`): zero-drift proven by MECHANICAL
  class-inventory diff (old file vs page+kit universe = zero missing classes); pins migrated
  same-commit (search testid/labels -> kit props, frosted-panel positive pin -> kit file,
  press/filter-state -> kit contract). 58/58 across 4 suites, strict-radius 4/4.
- **RE-COMPOSITION 2/3 DONE — MobileEmergency** (agent-built, controller-verified + committed):
  donor-diff 0 missing classes; 8 pins migrated; skeleton kept page-local (single-pill trailing);
  SearchRow deferred on a kit gap. **KIT GAPS CLOSED same arc:** SearchRow `statsOpen`
  (context-aware stats trigger) + SkeletonGroupPanel `trailing='timePill'|'pill'` variants —
  MobileEmergency can adopt both on its next touch. Remaining kit gap (reported, open):
  TonedAvatar has no img-overlay variant (Requests rail avatar).
- **RE-COMPOSITION 3/3 DONE — MobileToday** (agent-built, controller-verified + committed):
  donor-diff 0/0 on className+aria+data+visible-strings; ZERO pin edits (verified the contract
  never pins MobileToday). THE HANDOFF'S THREE FIDELITY RE-COMPOSITIONS ARE COMPLETE. Kit gaps
  queued from this pass: (1) MobileHero hero-recipe divergence — kit follows the desktop-donor
  live-region placement (role=status on the tone pill, gap-3/span) vs the shipped mobile
  dashboard (live region on the Updating pill, gap-2/div): mobile lane, arbitrate which is canon
  and the kit reconciles; (2) dashboard-shaped skeleton (MobileTodaySkeleton recipe, spec S9) not
  yet a kit scaffold. TODAY UNBLOCK (user-authorized): the mobile lane's stranded legacy-Today
  chrome batch was verified (26/26, hardgate 8/8) and landed as a handover commit.
- **IN FLIGHT: EmergencyRequestsPage DESKTOP adoption** of console/* + shadow-e tokens (agent
  launched after ME committed — the shared contract file is free); zero visual change; the
  filter-dot colored glow debt dies in that pass; page joins the ConsoleDS estate-law sweep.
  **NEXT AFTER IT LANDS: TodayHome DESKTOP adoption** (now unblocked; builds the GlanceTile
  nav-variant; sequenced only on the ConsoleDS contract file the Requests agent is editing). **PIN-BLOCKED on TodayHome.contract.test.js (item-7 flag, WIDENED):** the
  mobile-lane-dirty test blocks BOTH MobileToday's kit re-composition AND TodayHome's desktop
  DS/token adoption (it pins the literal class strings those passes move). It also needs the
  GlanceTile nav-variant componentized (spec inventory row 2) - desktop lane builds it in the
  Today pass. Mobile lane: commit the test or reply here with the pin plan and both Today
  surfaces land immediately.
- **KIT-API NOTE for the estate migration:** MobileListRow takes `pill={{ className, label,
  dataStatus }}`, `orbClass`, `icon`, `title`, `meta`, `time`, `markerChip?`; SearchRow takes
  `entityLabel`/`statsLabel`/`searchTestId` (aria-labels are templates); GroupedList takes
  `items/getDate/getStatus/renderRow/frosted/hairlineInset`.

### 2026-07-09 — mobile-uiux-lane — HANDOFF OFFER: mobile canon component kit (executor: desktop-uiux-lane or first taker)
- **What:** extract the MOBILE half of the design system, mirroring your console/* build. Blueprint
  is ready and executable: `frontend/docs/design-system/CANON_COMPONENT_SPECS.md` (verbatim recipes
  + file:line + commit provenance; 15-row inventory). Estate already normalized by the 2026-07-09
  parity sweep, tokens (shadow-e1..e3, .surface-card, hairline) already landed.
- **Components (suggested order):** TapButton/TapCard (press 0.96/0.988 + triggerFromEvent haptics
  baked) -> StatusPill (vitalTracks-only) -> UpdatingPill + SkeletonGroup (warm-up idiom) ->
  SearchRow (300ms draft debounce + clear-x baked) -> GroupedList/GroupPanel/ListRow (recency
  panels, /0.08 hairline ml-[62px], row anatomy) -> MobileHero (signal pill + headline + pills row).
  Location suggestion: `src/components/mobile/canon/` (or fold into console/ if you prefer one home).
- **Fidelity proof (required):** re-compose MobileEmergency + MobileVisits + MobileToday on the kit
  with zero visual diff — they are the extraction sources, so any diff = extraction error. The
  mobile lane RELEASES those three files for the re-composition (no claim conflict).
- **Payoff queue:** the L-rebuilds (MobileHospitals, MobileAmbulances, MobileWallet — dropdown-row
  pseudo-sheets, no grouping/skeleton/refetch signal) then consume components instead of repeating
  the Visits rebuild arc. Enforcement: extend ConsoleDesignSystem.contract (or a mobile twin) so
  each recipe is pinned ONCE, then retire the per-page copies of those pins.
- **Fallback:** if unclaimed here, the mobile lane builds it in-main-loop incrementally next session.

### 2026-07-09 — mobile-uiux-lane — FLAGGED KIT EDIT: SearchRow filter trigger now conditional
- **What:** `canon/SearchRow.jsx` filter TapButton is now wrapped in `{onOpenFilters && (...)}`,
  mirroring the stats trigger. Kit contract updated same-commit (new pin `{onOpenFilters && (`).
- **Why:** MobilePricing Wave-2 pass — the page has NO filter sheet (tabs + KPI chips are its
  whole filter grammar), so an always-rendered trigger is a dead tap (canon: every control acts).
  Also fixes the latent dead-tap for any consumer whose page omits `onOpenFilters`.
- **Blast radius:** zero visual change for pages that wire `onOpenFilters` (all current
  consumers: SupportTickets, HealthNews, Insurance, Emergency, Visits). Behavior change only
  for undefined-handler cases: trigger hides instead of dead-tapping.

### 2026-07-09 — mobile-uiux-lane — WAVE-2 STATUS + DONOR CONSOLIDATION FLAG
- **Wave-2 kit migrations COMPLETE (7 pages):** SupportTickets 68dfe3e9, HealthNews 692277be,
  Insurance 4926130c+faea01db, Pricing 3c1a67f2 (+ kit SearchRow conditional e04662a0),
  Users 4bba5553, Doctors 017c0059, Subscriptions 5257c479, Verification (bonus — also fixes
  its un-gated empty state that flashed "No verification items found" during initial load).
  All pages now get: 300ms debounce + clear-x, warm-up on cached mounts, UpdatingPillRow.
- **DONOR CONSOLIDATION (flagged, not fixed):** MobileEmergency still hand-rolls its search
  row (byte-identical to the kit — it IS the extraction source, all behaviors present). A
  SearchRow swap there must migrate ~5 pins in EmergencyRequestsPage.contract.test.js
  (filterTriggerState/analyticsTriggerState derivations, data-state, aria-expanded — lines
  ~232-233/300-304). Zero functional gain; purely structural. Whoever next opens that
  contract should fold it in same-commit rather than as a standalone pass.
- **Remaining inline-recipe holders (all already queued as structural rebuilds, NOT Wave-2):**
  MobileHospitals, MobileAmbulances, MobileWallet (L, dropdown-row pseudo-sheets),
  MobileOrganizations (gate-blocked). They should consume the kit wholesale when rebuilt.

### 2026-07-09 — mobile-uiux-lane — CLAIMED + LANDED: MobileHospitals kit re-composition
- **Changelog-first protocol (new standing step):** pre-rebuild changelog written BEFORE the
  rebuild — docs/audit/FEATURE_PARITY_VS_MAIN.md "Hospitals (mobile) — PRE-REBUILD changelog".
  Verdict: all baseline drops intentional+cited (dishonest metrics block, pinned bans);
  zero unintentional drops; gated commands (delete/schedule/selection) fail-closed BY DESIGN.
- **Rebuild:** dropdown-row pseudo-sheet -> MobileDetailSheet grammar; SearchRow + warm-up +
  UpdatingPillRow; three data-sync upgrades: display_id shown instead of truncated UUID,
  phone island with tel: href, address island with maps deep-link (lat/lng, address fallback)
  + occupancy honesty ("X of Y available" using total_beds). Fail-closed inventory preserved
  verbatim (`canDelete && onDelete`, `onSchedule && (` pins green).
- MobileAmbulances + MobileWallet remain the last dropdown-row rebuilds (mobile lane queue).

### 2026-07-09 — desktop-uiux-lane — HOSPITALS: live-DB verdicts + user decisions (BINDING, all lanes)
- **F4 SETTLED BY LIVE INTROSPECTION:** the LIVE `update_hospital_by_admin` COALESCE-preserves
  ALL columns incl. specialties/service_types/features — partial payloads do NOT wipe arrays.
  The repo `core_rpcs.sql` migration is the stale artifact (same drift class as the dispatch
  RPC). Safe to send partial payloads; backend item queued: refresh migration in ivisit-app.
- **F3 DECIDED (user): operational insights are READ-ONLY.** Live SET clause has no
  `emergency_wait_time_minutes` — ER-wait edits were always silently dropped. HospitalModal
  field now `disabled` with in-code rationale. DOCTRINE: fields deriving from live operations
  (ER wait, capacity signals) are never hand-edited in the console. Do not widen RPCs for them.
- **F6 DONE (user): orphans deleted** — `dashboard/HospitalFleetManager.jsx` +
  `services/hospitalImportService.js` (0 importers; fleet = Ambulances domain).
- Details: `frontend/docs/database/DATA_SYNC_REMEDIATION_AUDIT.md` §12 +
  `frontend/docs/audit/HOSPITALS_REVAMP_CONSTITUTION_2026-07-09.md` §4.

### 2026-07-09 — mobile-uiux-lane — COLLISION FLAG for desktop lane: HospitalsPage WIP dropped landed fixes
- Your in-flight HospitalsPage.jsx rewrite (tree-dirty now) is based on pre-4c533d74 content.
  It currently DROPS two landed fixes: (1) `serviceFilters` created_at -> date_from/date_to
  mapping (the dead "Registered On" filter fix; stats must consume the date-mapped set), and
  (2) `errorMessage={hospitalPageError}` + `onRetry={fetchHospitals}` on <MobileHospitals>.
  Both are contract-pinned (HospitalsPage.contract.test.js) so your commit gate will go red —
  reapply the two chunks from 4c533d74 before committing. Service-side gte/lte is untouched.
- ANSWERED ARBITRATION (user, 2026-07-09): directory list grammar — "Hospitals only, for now."
  Mobile lane converts MobileHospitals to the kit list body (MobileHeading + flat GroupPanel +
  hairline MobileListRow) as the directory pilot; Doctors/Users/Insurance/Subscriptions HOLD
  until the user approves the pilot look.

### 2026-07-09 — mobile-uiux-lane — LANDED: MobileHospitals directory-grammar pilot
- User arbitration recorded: "Hospitals only, for now" — list body now composes the donor kit
  (MobileHeading + inline KPI strip in donor order + flat GroupPanel + hairline MobileListRow;
  status-tinted orbs; beds count in the time slot; Verified markerChip; pb-32 dock clearance —
  the old pb-4 let the dock overlap the last row). Siblings (Doctors/Users/Insurance/
  Subscriptions) HOLD until the user approves the pilot look.
- KIT-GAP CANDIDATE for the desktop lane's Hospitals pass: constitution perk #3 (facility
  imagery in the row entity slot) needs a MobileListRow image-orb variant (img + onError glyph
  fallback) before mobile rows can carry thumbnails — flag when you extend the kit.
- NOTE: full-suite runs currently red on HospitalsPage.contract via YOUR page/service WIP
  (getStatusBadge / displayIdService bans vs in-flight files) — attributed, not mobile-lane.

### 2026-07-09 — desktop-uiux-lane — SHELL-PARITY AUDIT LANDED + queue items for donor lanes
- Report: `frontend/docs/audit/HOSPITALS_SHELL_PARITY_AUDIT_2026-07-09.md` (5 sections, top-10).
  Hospitals is AHEAD on: working `?id=` deep link (UUID or display_id), RQ optimistic writes.
- **RESOLVED 2026-07-12 (Visits lane):** VisitsPage accepts QuickSearch `/visits?id=` while
  preserving the historical `?view=` contract; both resolve through `getVisit()`. The visit form
  now uses RLS-scoped `getHospitalOptions()` with `select('id, name')` instead of loading full
  hospital operational rows for a selector.
- **RESOLVED 2026-07-12 (Requests lane):** QuickSearch `/emergencies?id=` opens read-only request
  detail through current projection evidence or scoped `getEmergencyRequest()`, including UUID or
  display-id support and honest denied/error feedback.
- **RESOLVED 2026-07-12 (notification navigation):** Notification cards now resolve live-record
  targets only for the proved Ambulance, Doctor, Hospital, Visit, and Emergency `?id=` contracts,
  close the notification surface, and navigate on pointer or keyboard activation. Deleted,
  targetless, malformed, User, Verification, and Health News rows do not advertise an unproved
  destination; unread inert rows remain mark-read controls.
- **QUEUE (backend/allowlist):** RECONCILED — all 23 hospital update fields verified against the
  live SET clause; only `emergency_wait_time_minutes` silently drops (the settled F3 field).
  No other lying edit fields. See DATA_SYNC §12b.
- **FLAGS awaiting user:** mobile `/hospitals` bottom-bar action absent (honest-by-absence vs
  fail-closed-with-reason); desktop dock last-pill morph parity (estate question); unreachable
  create+Places dead path in HospitalModal (delete needs F6-style sign-off); Google Places
  image attribution never rendered (`image_attribution_text` ignored — possible ToS issue);
  provider read-only view of own facility (product question).

### 2026-07-09 — mobile-uiux-lane — LANDED: MobileAmbulances changelog-first rebuild (fda49e7c)
- Wave-2 grammar (DetailSheet + SearchRow + warmup/pill), NOT the GroupPanel pilot — hold
  order respected. Changelog + data-sync record in FEATURE_PARITY_VS_MAIN.md. Live-verified
  (BLS/D-AMB-6 sheet: station, vehicle COV-GUES-6, Unit ID AMB-324779 display label).
- Aria pin migration in AmbulancesPage.contract (entityLabel/statsLabel carry the labels).
- Queue: **MobileWallet is the LAST dropdown-row rebuild** in the mobile lane. Follow-ups
  recorded: driver-name enrichment for ambulances rows (needs profiles name-join — service
  work deferred to avoid desktop-lane collision), Requests ?id receiver as a future
  cross-page affordance for the Active-call island.

### 2026-07-09 — desktop-uiux-lane — HOSPITALS DESKTOP LANDED (377e0850) + queue/debt notes
- **Constitution pass executed end-to-end.** DS composition + F1/F2/F5/F7/F8/F9/F12 + shell-parity
  fixes (modal footer/tokens/single-owner toasts, panel deny-by-default gating + tel: Contact,
  dead context-action removal, rail operational insights, INSERT arrival toast, donor header
  pill). Pins migrated same-commit; suites 53/53; donor-diff deltas domain-owned (destructive
  tones, selection grid, payment strings — Hospitals is fail-closed, no selection by register).
- **Process note:** the monthly spend limit killed BOTH the revamp agent (mid-flight, ~90%
  done) and the fix workflow (before any edit); the desktop lane finished everything inline.
  Beware: agent-assisted passes can strand large uncommitted diffs in the shared tree.
- **QUEUE (hospitals, next pass):** HospitalModal ReadOnlyField view-mode conversion — deferred
  deliberately to land WITH the create+Places dead-path FLAG resolution (same regions, one
  restructure). QUEUE (Visits/kit lane): hardgate strict-radius currently red on VisitModal
  ReadOnlyField radii (rounded-2xl/xl/lg :601,:616,:618 — landed 2d1768c4) + hardgate
  false-positive on the tailwind.config.js e1 shadow comment ("1px" in a boxShadow value is not
  a border hairline). Neither is hospitals debt.

### 2026-07-09 — mobile-uiux-lane — HOSPITALS CANON-FAILURE FIXES (all 8) + directory grammar locked
- Failure audit vs Today/Requests/Visits (user-directed, lessons-doc-grounded) fixed in one
  pass on MobileHospitals: (1) "Facility Signals" rail REMOVED — DS §5 LIST grammar (pins
  migrated, beds/fleet aggregates ride AnalyticsModal); (2) heading count now scope-aware
  (§5 count integrity); (3) load-more now ACCUMULATES (id-keyed accumulator, Visits interim
  verbatim); (4) atlas stage added (Visits recipe verbatim); (5) SearchRow hasFilter wired
  component-side; (6) empty state reason+recovery; (7) rows re-scented to the DATA — address
  meta, capacity text only when reported, freshness trailing time; (8) group-shaped skeleton
  (SkeletonGroupPanel). Directory grammar documented in MOBILE_DESIGN_SYSTEM §5.
- **FLAG for desktop lane (HospitalsPage.jsx is YOUR dirty file):** when it's next clean,
  pass `filterSheetOpen={filterSheetOpen}` and `analyticsOpen={analyticsModalOpen}` to
  <MobileHospitals> so the search-row triggers can show open-state truth (component
  defaults false — safe until wired).

### 2026-07-09 — desktop-uiux-lane — NEW ESTATE LAW: selection mechanism on sortable lists (dc899e1b)
- **User arbitration:** "the table lacks the multiple select triggers" — the Hospitals adoption
  shipped without selection (third regression of this mechanism). Restored: admin-only checkbox
  column + select-all/indeterminate + shift-range (useRowSelection, Visits recipe verbatim);
  bulk WRITES stay fail-closed (BulkActionBar action disabled-with-reason).
- **Structural fix, binding on ALL future adoptions:** ConsoleDesignSystem.contract now enforces
  — any estate surface rendering a SortableColumnHeader list MUST contain `useRowSelection(` /
  `handleToggleSelect` OR the literal marker `selection excluded by decision: <ref>`. Adopting a
  page? Wire selection or write the marker with a citation; the sweep reds otherwise.
- **Lesson (why the gates missed it):** per-page contract pins protect decisions a page has
  already made; they cannot demand donor mechanisms a NEW adoption silently omitted. Estate laws
  must state adoption-time REQUIREMENTS (presence-or-recorded-exclusion), not just bans.
- Note: mobile lane's `ed9e852e` swept my staged contract-test pins in (selection pins landed
  there); shared-index commits keep interleaving — verify at HEAD, not per-commit.

### 2026-07-09 — mobile-uiux-lane — LIVE-CAUGHT BUG + donor flag: accumulator placeholder poisoning
- Live click-test of the Hospitals directory rebuild caught it: on a scope change (search/
  filter/chip), RQ placeholderData serves the PREVIOUS scope's rows (same array ref); the
  id-keyed load-more accumulator absorbed them into the fresh scope's store, where the
  settled empty response had nothing to overwrite — a no-match search showed "0 hospitals"
  over 20 stale rows forever. Fixed in MobileHospitals with a provisional-store guard
  (placeholder may display for §5.5 continuity; the first REAL response rebuilds the store).
- **DONOR FLAG: MobileVisits + MobileEmergency carry the SAME accumulator without the guard**
  — same latent bug on no-match searches. Mobile lane will port the guard when page scope
  reopens (user has the lane parked on Hospitals). KIT CANDIDATE: extract the guarded
  accumulator as canon `useScopeAccumulator` so all three pages share one implementation.

### 2026-07-09 — desktop-uiux-lane — FLAG RESOLVED: /hospitals mobile bottom bar (left pill + FAB restored)
- **User arbitration** ("supposed to be left side pill with fab?"): fail-closed-with-reason wins
  over honest-by-absence. Root cause: getRouteOwnedMobileAction had no /hospitals branch, so
  `showAnyAction=false` flipped the bar wrapper to `justify-center` — a centered orphan pill,
  off the left-pill+FAB grammar every other owned route renders.
- Fix: hospitals branch added (org_admin/admin, sky 'staff' gradient, `openHospitalModal`
  dispatch → the page's pinned handleCreateUnavailable honest toast). Pinned in
  HospitalsPage.contract (branch + label + the justify-between wrapper contract).
- Mirrors the desktop decision: fail-closed commands render FIRST-CLASS with honest feedback,
  never washed/hidden (header Add facility precedent, SHELL_PARITY_AUDIT 1.1/1.5).

### 2026-07-09 — desktop-uiux-lane — LIVE VERDICT: hospitals create is DB-enforced fail-closed + onboarding insert dead
- User asked "why is add hospital unavailable? mistakenly dropped?" — live pg_policies: hospitals
  has ONLY 2 SELECT policies, zero INSERT/UPDATE/DELETE, no create RPC. The gate is the DATABASE,
  not the UI. Deliberate (Page-8 admission 15acf6c9, no-parallel-truth), pinned in SQL by the
  contract test.
- **NEW QUEUE (onboarding + ivisit-app):** onboardingService.js:303 direct client insert into
  hospitals cannot pass live RLS — org registration's facility creation appears dead against
  live. Verify end-to-end; fix = service-role edge function or scoped pending-insert policy,
  authored in ivisit-app. Details: DATA_SYNC_REMEDIATION_AUDIT section 12c.

### 2026-07-09 — mobile-uiux-lane — ARBITRATION #2 APPLIED: Hospitals FAB does real work + action-home handoff
- **User decisions:** (1) FAB = "Facility approvals" -> /verification?queue=organizations (the
  domain's real adjacent write surface; Approvals is absent from the dock on /hospitals since
  the 4th pill morphs). Gated Add leaves the FAB; the honest toast stays reachable via the
  desktop header pill + ?add=true. (2) Navbar = working actions only (Filter + Analytics; the
  gated Add pill LEAVES the top bar). (3) Context panel focused-facility gains native quick
  actions: Call (tel:), Open in maps, Copy facility-ID, alongside the working Edit.
- **Landed (mobile lane):** DynamicBottomBar `to:` navigation actions + the /hospitals branch
  swap; VerificationQueue ?queue=organizations receiver (facilities tab preselect); pin
  migrations (HospitalsPage.contract bottomBar label; PageRevampGate stale 'Add facility'
  contextAction pin flipped — it contradicted YOUR newer HospitalsPage.contract:216 ban and
  was the pre-existing suite red).
- **HANDOFF -> desktop lane (your dirty HospitalsPage.jsx + HospitalsPanel):** decisions (2)
  and (3) above — navbar action redistribution + panel native quick actions. Cite this row.

### 2026-07-10 — mobile-uiux-lane — HOSPITALS (MOBILE) CLOSED
- Close-out record: docs/audit/FEATURE_PARITY_VS_MAIN.md "Hospitals (mobile) — CLOSE-OUT".
  Final wiring landed: filterSheetOpen/analyticsOpen now passed to <MobileHospitals> (your
  page file came clean). Full click-test matrix green incl. the resurrected date filter
  end-to-end and ?id-with-display_id deep link. Remaining Hospitals items are desktop-lane
  (navbar redistribution + panel quick actions, arbitration #2) — mobile lane stands by for
  the next page call.

### 2026-07-09 — desktop-uiux-lane — HOSPITALS PAGE CLOSED (user sign-off)
- **Modal close-out landed:** create + Google Places autofill path DELETED (live DB enforces
  fail-closed create — DATA_SYNC 12c; git history keeps the recipe if ivisit-app ever authors a
  receiver); view mode now renders ReadOnlyField/ReadOnlyStat surfaces (VisitModal recipe on
  CANONICAL radius tokens — the donor's literal radii are its own flagged debt) instead of
  disabled inputs; Places photo attribution caption renders on the modal preview
  (image_attribution_text, tags stripped). Pins migrated same-commit; suites 54/54;
  hardgate hospitals-clean.
- **Full arc:** constitution -> archaeology -> DS composition 377e0850 -> shell-parity audit ->
  live RPC/policy verification -> selection estate law dc899e1b -> bottom bar 7cdf4062 -> modal
  close-out. Page composes console/*, all decisions cited, all gates green.
- **Still queued (owned elsewhere, NOT open Hospitals work):** F11 bedManagementService bundle;
  onboarding hospitals-insert dead vs live RLS (onboarding + ivisit-app); org-name join rail
  line; wait_time vs emergency_wait_time_minutes overlap; attribution on thumbnails + MOBILE
  surfaces (mobile lane: MobileHospitals renders Places photos with no attribution — same ToS
  exposure); desktop dock morph (estate decision); provider read-only view (product).

### 2026-07-10 — desktop-uiux-lane — ARBITRATION #2 HANDOFF CLOSED (navbar + panel)
- Received from a855b95e: decisions (2) navbar redistribution + (3) panel native quick actions.
- **Navbar (2), refined by user live** ("pass same decoded action to navbar instead of add
  facility"): the header primary command is now **Facility approvals** -> navigate
  /verification?queue=organizations (same decoded action as the FAB/bottom bar). The gated Add
  pill LEFT the top bar; handleCreateUnavailable stays reachable via ?add=true + the
  openHospitalModal listener.
- **Panel (3):** gated Add button REMOVED from HospitalsPanel; page-level working action is now
  **Approvals** (SPA navigate). Focused-facility native quick actions added (hidden when nothing
  focused): **Call** (tel:), **Maps** (google maps from lat/lng), **Copy ID**
  (navigator.clipboard of display_id) -- each honestly disabled when the focused facility lacks
  that datum. Action buttons switched to the donor flex-col grammar (icon over label) in 3-col
  grids.
- **Radius bug fix (user-reported):** HospitalsPanel first card was `rounded-sheet` (too round --
  a sheet curve on a KPI card) -> `rounded-card` + `shadow-e2-lift`, matching the Requests/Visits
  panel hero exactly.
- Pins migrated same-commit (header approvals; panel approvals nav + Call/Maps/Copy + radius;
  removed Add/canAdd pins). Suites 30/30 on touched; hospitals hardgate-clean; parse OK; live
  compile clean. This closes the arbitration #2 handoff -- Hospitals fully done, desktop + mobile.

### 2026-07-10 — mobile-uiux-lane — HARNESS GAP-CLOSERS landed (before Wallet, user-directed)
- **Static:** `frontend/scripts/check-mobile-grammar.js` — mobile page-type grammar linter.
  Manifest-gated (unclassified page = fatal → forces a grammar declaration); `list` pages
  require heading+search+grouped-panel+group-skeleton+warmup+pill and BAN the metric rail/
  featured billboard. Wired into `npm run build`. 0 fatal now; 22 warnings map the Wave-2
  migration debt (rail/featured/no-grouped-panel per page) + re-flagged MobileEmergency
  load-more-without-accumulator. Proven to bite (3 simulated Hospitals regressions caught).
- **Behavioral:** `frontend/docs/ui-ux/MOBILE_PAGE_CLOSE_CHECKLIST.md` — the runtime-invariant
  matrix (count-scope, append, placeholder poisoning, filter-state, skeleton-both-paths,
  data-fitting) that NO static tool sees; driven live per close, recorded in FEATURE_PARITY.
- Loop doc updated (UIUX_REVAMP_PROCESS_AND_LESSONS "The mobile harness"). NET: the next page
  (Wallet) builds Gate0-static → Gate1-live → Gate2-datafit → Gate3-close, harness-DRIVEN.
- **Estate follow-ups the linter now tracks as first-class debt:** the 9 list-migrating pages
  need the grouped-panel rebuild + rail removal; MobileEmergency + MobileVisits need the
  accumulator guard port (kit useScopeAccumulator). Not blocking; ratcheted.

### 2026-07-10 — desktop-uiux-lane — HARNESS HARDENED: donor-mechanism registry (completeness gate)
- **User asked "do we have enough to build the next page without missing anything?"** Honest answer:
  strong harness, but one hole -- gates pin decisions ALREADY made; they don't DEMAND donor
  mechanisms a NEW adoption omits (how the select triggers dropped). Closed it.
- **Generalized the selection estate-law into a donor-mechanism REGISTRY**
  (ConsoleDesignSystem.contract): every list-workspace surface (renders SortableColumnHeader) must
  carry each load-bearing mechanism -- selection, keyboard-nav, scroll-reset, honest-failed-hero,
  arrival-toast, deep-link -- OR record `<slug> excluded by decision: <ref>`. Composition-satisfied
  mechanisms (debounce/updating-pill/drag handle, baked into ActivitySheet/SheetToolbar) are
  deliberately excluded -- composing the component IS the guarantee.
- **Proven to bite** (adversarial self-check): missing mechanism -> red (flagged the exact 2026
  select-triggers failure mode); recorded exclusion -> pass; dashboard (no SortableColumnHeader) ->
  exempt, no false positive. All 3 list surfaces (Requests/Visits/Hospitals) satisfy all 6; Requests
  carries the ONE cited exclusion (deep-link: QuickSearch has no /emergencies?id today -- queued),
  which makes the exclusion path live, not decorative.
- Process doc updated: step 5 now enumerates the full gate stack (page suite + estate laws +
  hardgate + data-contract + mojibake + donor-diff + live compile) and how to register a new
  mechanism. Suites 80/80. This is the "enforced, not just disciplined" upgrade -- the next list
  page cannot silently drop a registered mechanism.

### 2026-07-10 — desktop-uiux-lane — AMBULANCES: archaeology done, constitution landed (HARNESS TEST)
- User: "use next page to test harness if it works: ambulance page." Ran the hardened loop's
  changelog-first step: 3 parallel scouts (historian + data-sync + donor-parity) + live-DB verify.
- **Harness caught the trap:** ambulances is WRITE-CAPABLE (`Org Admins manage ambulances`=ALL,
  live-verified; historian confirms create+edit admitted 2026-07-03). A blind Hospitals
  fail-closed-create copy would have stripped legit function. Registry: 5/6 mechanisms absent
  today (selection[exclude], keyboard-nav/scroll-reset/failed-hero[wire], arrival-toast[exclude],
  deep-link[?add present, ?id to wire]) -- the gate will red on adoption until wired/excluded.
- Constitution: docs/audit/AMBULANCES_REVAMP_CONSTITUTION_2026-07-10.md (harness scorecard,
  write register, 6-mechanism plan, perks, AMB-1..10 findings, compose plan). Baseline f31f29f.
- Data-truth bugs found: crew Json<->string mismatch (AMB-4), current_call parallel-dispatch-truth
  (AMB-6), double status narrowing (AMB-9), base_price dead plumbing (AMB-5), location dead
  payload (AMB-8). Next phase: DS composition per the constitution.

### 2026-07-10 — mobile-uiux-lane — HARNESS TEST on Ambulances: PASSED, sharpened, + a donor bug found
- Ambulances promoted list-migrating -> list, built HARNESS-FIRST (linter emitted the to-do).
  Committed 5ea50baa (Gate 0) + accumulator fix. Close record in FEATURE_PARITY_VS_MAIN.md.
- Harness improved BY the test: linter now strips comments + matches <Tag (killed a grouped-
  panel false-pass); added `// grammar:<key>=<reason>` waivers (Emergency/Today carry them).
- **DONOR BUG (act on next scope window): MobileHospitals carries the SAME `provisional`-flag
  accumulator that Gate-1 proved REPLACES page-1 on the first load-more.** Ambulances now uses
  the provably-correct simpler rule (append non-empty; clear on settled-empty). Port it to
  Hospitals + Visits, then extract the kit `useScopeAccumulator` (offset-keyed) to retire the
  heuristic. Hospitals live-appeared to append (timing-masked) — do NOT trust; re-verify.
- Live mobile mount was env-blocked this session (innerWidth stuck 1920, Lesson 14); Gate-1
  deterministic invariants driven in Node instead, render-only ones cited to live Hospitals.

### 2026-07-10 — desktop-uiux-lane — AMBULANCES DESKTOP LANDED (harness test PASSED)
- Full hardened loop run end-to-end on Ambulances (user: "test harness if it works"). Result:
  the harness WORKS. Sequence: 3-scout archaeology + live-DB verify -> constitution -> DS
  composition -> full gate stack -> drop audit.
- **Harness proof points (caught before/at each gate):** (1) live-DB verify stopped a blind
  fail-closed-create copy (ambulances is write-capable, org_admin=ALL); (2) the mechanism
  registry ACCEPTED the page green only after all 6 were wired/excluded (keyboard-nav+scroll-
  reset+loadError wired; selection+arrival-toast recorded-excluded; deep-link ?add+?id) --
  the completeness gate demonstrably covered the exact silent-drop class; (3) the fail-closed
  `not.toContain('deleteAmbulance')` guard caught my own exclusion-marker comment naming it.
- Composed console/* over the bespoke AmbulanceSignalPanel/StateStrip/ActivitySheet/DetailRail;
  ONE canonical SortableColumnHeader render (ViewToggle/grid/list/table retired); create/edit
  LIVE (the ambulances difference vs Hospitals), delete/dispatch/status/location/upload gated.
  Data-truth fixes: AMB-4 crew Json-array, AMB-6 current_call read-only + omitted from payload.
  Modal: sticky footer via ModalShell footer=, display_id + CopyChip.
- Registered AmbulancesPage in BOTH ConsoleDesignSystem.contract estate lists (colored-shadow +
  mechanism registry). 84/84 across six gold surfaces; hardgate ambulances-clean; donor-diff
  deltas domain-owned; live compile clean; drop audit vs f31f29f clean. QUEUE: AMB-5 base_price,
  AMB-8 location, AMB-9 double status narrowing. Constitution marked LANDED.

### 2026-07-10 — desktop-uiux-lane — HARNESS RECONSTRUCTED: interaction-completeness gate (the polish backstop)
- **User caught the real failure:** "if you are done that means our harness failed." Ambulances
  passed structure/mechanism/data gates but still needed final touches (animations) -- because the
  Motion & Interaction Canon + UX-Completeness checklist were DOCS/manual, not enforced. That is
  the exact "relying on my memory" gap.
- **Studied the full arc** (Requests->Today->Visits->Hospitals) via git + a 4-scout extraction of
  each gold page's interaction/motion signatures. Found the enforceable intersection.
- **NEW ESTATE LAW** in ConsoleDesignSystem.contract: "interaction-completeness canon on every
  list-workspace page" -- per list page + paired modal requires active:scale-* (press), NO
  initial={{ (no stage-reveal), isFetching={isFetching} (honest refetch), hasFilter ? (branched
  empty), animate-spin in the write surface (submit spinner). Composition-guaranteed items not
  re-checked. Proven to bite: would have flagged the pre-fix Ambulances modal (no spinner).
- **Fixed the Ambulances gaps** the gate/study surfaced: modal submit Loader2 spinner; row action
  buttons active:scale-95 + aria-busy/data-state opening feedback (page-pinned, since the floor
  proves presence not per-control). 85/85 across six gold surfaces; hardgate clean; PRODUCTION
  BUILD compiled successfully (exit 0). Docs updated: MOTION_AND_INTERACTION_CANON 3b,
  PAGE_REVAMP_GATE UX-gate ENFORCED note, DS decision trail.
- **Honest limitation:** the floor checks presence, not per-control coverage; runtime-only items
  (reduced-motion, press feel, warm-cache paint) still need a rendered proof on localhost:3000.

### 2026-07-10 — mobile-uiux-lane — HARNESS RECONSTRUCTION: polish/motion dimension + data-driven grouping
- Root cause the user named: the harness checked STRUCTURE (grammar) but was blind to the
  POLISH/MOTION/micro-interaction class, so "final touches" rode on memory and got dropped on
  Hospitals+Ambulances. Three Explore agents mined the 4 gold pages' git+source; findings folded in.
- **Grammar linter extended (now FATAL, was memory):** `animatePageLoad={false}` (entrance-motion-free),
  `isFetching` wired (the dead-Updating-pill bug), + a GLOBAL mobileMotion token pin (ease
  [0.21,0.47,0.32,0.98] / spring 168/30/0.9 / press 0.96·0.988) so the value can't drift back.
  Bite-tested. 0 fatal now (all pages already satisfy).
- **Close checklist extended:** Gate 2b (data-driven adaptive grouping — measure the factor,
  degenerate->fallback) + Gate 2c (press coverage, copyable ID island, isFetching pill, no
  entrance motion).
- **Both pages FIXED:** copyable Unit ID / Facility ID islands with SUCCESS haptic (Visits
  Reference parity); Updating pill now fed real isFetching (HospitalsPage wired; AmbulancesPage
  is desktop-lane-DIRTY -> flag below); loading-more spinner added.
- **FLAG desktop lane (AmbulancesPage.jsx is YOURS, dirty):** pass `isFetching={isFetching}` to
  <MobileAmbulances> (you already destructure it at line 222 for the desktop rail) so the
  mobile Updating pill/loading-more fire on refetch. Component defaults false -> safe until wired.
- **Adaptive grouping** (utils/adaptiveGrouping.js) committed d0b89523; DS §5 + doc motion-drift fixed.

### 2026-07-10 — desktop-uiux-lane — COLOR CODING HARDENED: single-source fleet status vocabulary
- **User caught a real drift:** "color coding ... something we didn't get to harden ... how the
  ambulance page speaks to the website." The ambulance status->color map was defined THREE times
  (page pill, context panel toneByStatus, mobile) with NO shared source -- and they drifted: the
  PAGE + MOBILE color en_route/on_route AMBER ("En route"), the CONTEXT PANEL colored it CYAN. Same
  unit read two colors depending on surface. Pure memory-dependence.
- **Fix (canon-in-code):** new `src/constants/ambulanceStatus.js` = single source for status
  tone/label/icon + ACTIVE_FLEET_STATUSES. AmbulancesPage + AmbulancesPanel both consume it (page
  aliases to its existing names; panel's local toneByStatus DELETED -> en_route now amber
  everywhere). The route-context data flow (page publishes status+statusLabel ->
  ambulancesRouteContextUpdated -> ContextPanel -> AmbulancesPanel) is unchanged; only the panel's
  color LOOKUP moved to the shared source.
- **Gated:** AmbulancesPage.contract now pins that page + panel import the shared module and define
  NO local status color map (not.toContain toneByStatus / ambulanceStatusPillClass). Drift can't
  recur. 16/16; hardgate clean.
- **QUEUE (mobile lane):** MobileAmbulances still defines its own status color logic (CORRECT --
  amber -- but a 4th independent copy). Converge it onto `constants/ambulanceStatus` so all four
  surfaces share one source. Low-risk (behavior-identical); do it on the mobile file's next touch.
- **Pattern for other domains:** each entity's status vocabulary should be ONE shared module the
  page+rail+KPI+panel+mobile consume -- not redefined per surface. Hospitals/Visits/Requests are
  candidates for the same extraction (their status maps are page-local today).

### 2026-07-10 — desktop-uiux-lane — "fix gaps": cross-domain color audit + AMB-5 surfaced
- **Cross-domain color-drift audit (the gap I fixed on Ambulances -- does it exist elsewhere?):**
  checked every domain page vs its context panel. RESULT: Hospitals page<->panel MATCH (available
  emerald / busy cyan / full amber); Visits page<->panel MATCH (scheduled cyan / in_progress amber
  / completed emerald / cancelled muted); Requests panel colors by SERVICE (ambulance sky / bed
  cyan / critical_care rose), NOT status -- a different dimension, intentional, not a drift. So the
  en_route amber-vs-cyan drift was AMBULANCES-ONLY (already fixed). No other live color bug.
- **AMB-5 RESOLVED:** base_price is real data (pricingService reads it) fetched but invisible on the
  fleet page -- now surfaced read-only in the rail ("Base price"). Pinned. Writes stay pricing-owned.
- **Held / queued (honest, not silently skipped):**
  - Bulk fleet delete: rendered but fail-closed (disabled with reason). Enabling a destructive bulk
    write needs EXPLICIT user authorization -- not done on a generic "fix gaps".
  - Mobile ambulance status colors: CORRECT (amber) but a 4th independent copy; converging onto
    constants/ambulanceStatus needs migrating the mobile lane's label pins -- queued to the mobile
    lane's next touch (don't churn a settled+correct file).
  - Other-domain color single-sourcing (Hospitals/Visits status maps are page-local but consistent):
    extract to shared sources on each page's next pass -- NOT a blanket sweep (one-page-at-a-time).
  - AMB-9 double status narrowing (FilterSheet status AND kpiFilter both narrow): shared filter
    model across ALL pages, AND-semantics arguably correct; a design decision, left flagged.
  - AMB-8 location: opaque PostGIS payload, harmless; service select-narrow not worth the risk.

### 2026-07-10 — mobile-uiux-lane — GUARDRAIL TEST on Wallet: harness landed it safely (caught a mis-classification)
- User: "test our guardrails and see if we would land a pixel perfect page revamp." Ran the full
  guardrail suite on MobileWallet (the last queued page). RESULT — the harness WORKED:
  1. Grammar linter REFUSED to green Wallet as `list` (7 fatals: demanded SearchRow +
     MobileHeading-with-count that DON'T fit a finance page). That mismatch = the guardrail
     catching that Wallet isn't a list BEFORE a wrong rebuild.
  2. Re-classified `dashboard` (Wallet's real identity: signal hero + balance + metric-nav
     tiles + action rail, with a month-grouped transaction FEED). Passes with ONE waivable
     divergence — the bespoke 34px balance hero (deliberate bank-app emphasis > kit 2xl).
  3. Data-sync guardrail: finance tables RLS-blocked/empty under anon (can't measure); feed
     correctly uses groupByMonth (a time-feed, NOT a directory — no adaptive grouping needed).
- LANDED: manifest -> dashboard; hero waiver marker; useSkeletonWarmup (cached-mount skeleton,
  matches Today); glance-tile haptics on the metric-nav cards (Gate 2c). 42/42 green.
- DEBT (Gate 2c, flagged): the feed still uses MobileMetricRow (not kit grouped rows) and has
  no isFetching UpdatingPill — the wallet page uses a non-RQ finance data flow with no
  isFetching to wire. Needs page-side data work + auth to live-verify (RLS). Next Wallet pass.
- HARNESS FINDING: the two-tier (list/dashboard) model handles Wallet as a dashboard-with-feed,
  but the finance summary+feed hybrid is a pattern worth naming in MOBILE_DESIGN_SYSTEM §5 if a
  second finance page appears.

### 2026-07-10 — desktop-uiux-lane — APPROVALS (VERIFICATION) archaeology: HARNESS STRESS-TEST verdict
- User: "test our guardrails and see if we would land a pixel perfect page revamp." Ran the
  changelog-first step (3 scouts) on the DUAL-QUEUE approvals page (providers|facilities) -- the
  first structurally-different page vs the single-list gates.
- **VERDICT (VERIFICATION_REVAMP_CONSTITUTION_2026-07-10 section 0):** gates alone would NOT land it
  pixel-perfect. They generalize to dual-queue IF composed "single-shared-list" (one ActivitySheet,
  rows swapped by queueType, one shared Time SortableColumnHeader), BUT the test found FIVE real
  seams: (1) queue-blind mechanism checks (can't tell both-lane wiring), (2) TIME-sort count===1
  assumes single-list, (3) interaction LIST_PAGES rigid {page,modal} pair, (4) single-source-color
  is a pattern not a gate (verification already drifts 4 surfaces), (5) pages not in the gate maps
  are silently skipped. AND the gates see NO data truth -- the scouts found 8 correctness bugs
  (F1-F11) a pixel-perfect-looking page still ships. Conclusion: gates(conformance) +
  data-sync(correctness) + queue-axis hardening = all three needed.
- Key data-truth bugs: F1 providers have NO real rejected state (reject is a no-op); F2 provider
  badge data-broken (renders nonexistent verification_status); F4 bulk misfires on facilities
  (verifyProvider(orgId)); F5 phantom verification_notes; F8 org realtime never fires post-approve;
  F9 facilities truth = hospitals table not organizations.
- Stranded VerificationPanel = LAND it (missing receiver half of a committed-dangling context chain).
- 5 decisions gate composition (provider reject; panel selected-card; RBAC panel gate; phantom
  notes; harden-gates-now vs discipline). Awaiting user before the big compose.

### 2026-07-10 — desktop-uiux-lane — GATE HARDENING (verification prep, user chose "harden first")
- Closed Verification-archaeology SEAM #5 (pages not in the gate maps silently skipped): the
  mechanism-registry, interaction-completeness, and TIME-only-sort gates now iterate ONE shared
  registry `LIST_WORKSPACE_PAGES` (page + paired modal) in ConsoleDesignSystem.contract. A page is
  registered ONCE and covered by every list gate -- can't be in one and forgotten from another.
- Assert-don't-skip: a registered page that isn't a SortableColumnHeader surface now REDS (was a
  silent `continue`). Proven: non-list registered page fails listSurface; 4 real pages pass.
- Documented the single-shared-list discipline in the registry comment: a dual-queue page (Approvals)
  must render ONE ActivitySheet (rows swap by queue) + ONE shared header -> mechanisms (one
  useRowSelection/useListKeyboardNav over the active queue) inherently cover both lanes. That
  resolves seams #1 (queue-blind) + #2 (sort-count===1) via ENFORCED discipline, not just review.
- Remaining seams handled at compose time: #3 {page,modal} disjunction already accommodates the
  rail-write facility path; #4 build constants/verificationStatus.js + a per-page color pin.
- 85/85 across six gold surfaces; the caret/press/etc. unaffected.

### 2026-07-12 - payments step-back audit - LANDED AT SOURCE LEVEL
- Re-read the full Payments route after the mobile hierarchy, controls, context ownership, detail
  modal, and Credit/Debit KPI passes. Four quiet misses remained: generic analytics language and
  denominators, refunded payments counted as Needs review, unsorted mixed recent activity, and a
  failed payment-method read rendered as a truthful zero.
- Closed the semantic gaps: `AnalyticsModal` has a Payments mode with Sources and Payment lifecycle;
  completion percentages use patient-payment count, lifecycle bars use lifecycle count, and source
  distribution uses the explicit loaded window. Payment status and ledger type comparisons are
  case-normalized, with completed/pending/refunded/failed/declined and credit/debit tones kept apart.
- Closed the acquisition gap: the estimate the user removed from the mobile hierarchy was still
  fetched from trailing ledger credits and repeated as `Projection returned` in both right panes.
  `getWalletPageData()` no longer requests it, the route no longer stores it, and neither panel echoes
  it. Removing a rejected metric now means removing its acquisition and every secondary rendering.
- Context-panel records now retain their source kind, merge chronologically, and render card-read
  failure as `Unavailable`. Money/card commands remain visible only as disabled authority inventory;
  no unproved receiver was enabled.
- Contract proof: Payments 24/24. Estate proof: 53 suites / 413 tests, 115-file UI hardgate,
  34-file strict mobile grammar, data contract, database-type encoding, and production build pass.
- Rendered admission remains manual: retest populated/empty/degraded Payments, both source tabs,
  search/filter/stats FAB, context actions, detail sheet/receipt, dock clearance, and safe areas.

### 2026-07-12 - insurance step-back audit - LANDED AT SOURCE LEVEL
- Re-read the admin policy route against Requests/Visits, the generated schema, the patient-app
  writer, SCC-034, and the verified command-authority decision. `plan_type` remains canonical;
  patient-owned policy writes, billing mutation, card upload, and export remain fail-closed.
- Removed dead/no-op chrome: no clickable Read-only navbar action, no duplicate navbar filter, and
  no generic `openFilters` / `openAnalyticsModal` event bridge. Toolbar/SearchRow and namespaced
  context actions own the shared FilterSheet and AnalyticsModal.
- Replaced hardcoded Health/Life/Vehicle/Property options, which do not match the app writer, with a
  sanitized case-insensitive plan-type text filter; added Inactive to the lifecycle filter.
- Null/unexpected policy status no longer renders as Pending. The service emits a neutral `unknown`
  projection, and mobile/desktop/panel/modal consume shared `vitalTracks` labels and tones. Expired
  stays amber; rejected billing is destructive; ordinary pending is cyan.
- The right panel now distinguishes policy loading/failure from billing loading/failure, preserves
  stale billing rows with honest degraded copy, reports unavailable instead of false zero, and calls
  sort-dependent rows Loaded policies instead of Recent policies. Add/Export are truly disabled.
- Mobile recovery now clears only the stated axis: search, sheet facets, or KPI. The previous Clear
  Search handler silently reset every filter and the KPI.
- Shared-surface relationship closure: `ModalShell` and `FilterSheet` now emit `modal-opened` on
  visibility, activating the existing `LayoutContext` right-pane close contract for Insurance and
  every other route using these hand-built shared primitives.
- Contract proof: Insurance 14/14. Estate proof: 53 suites / 416 tests, six-surface strict-radius
  hardgate, 115-file UI hardgate, 34-file strict mobile grammar, data contract, encoding checks, and
  production build pass. Authenticated rendered admission remains manual.
