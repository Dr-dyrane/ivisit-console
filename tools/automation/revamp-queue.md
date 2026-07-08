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

1. **Page 19 Login** — split into two sub-tasks by capability
   - 1a. Chrome cleanup — executor: `headless` · status: `todo`
     - `LoginPage.jsx` has ~6 non-canonical tokens (blur/glow/heavy-shadow/glass/non-canonical radius).
       Convert to calm canonical tokens; keep OAuth/reset/MFA logic + copy. Source + strict-radius
       only (no admission, no hardgate add) — exactly like the Page 21 chrome cleanup (`afe71b2`).
   - 1b. Rendered admission — executor: `browser` · status: `blocked`
     - `/login` REDIRECTS signed-in users to `/` (LoginPage.jsx L54-55), so the form only renders
       signed-out. Needs a signed-out session (sign-out disrupts the user's active login, or use a
       separate/incognito browser context). Then admit gate Page 19 + test + add to hardgate.

   GENERAL RULE for public/auth pages (Login/Onboarding/Set-Password): the source-side chrome
   cleanup is `headless`-doable; the rendered *admission* is `browser` + needs a signed-out session.

2. **Page 21 Onboarding** — wizard rendered proof + admit
   - executor: `browser` · status: `blocked` (chrome cleaned `afe71b2`; not admitted)
   - blocker: wizard renders only for signed-out/pending users; needs a signed-out session.
     Do NOT submit the form (live account/org/Storage writes). Flow receivers are `backend`-blocked.

3. **Page 20 Set Password** — visual pass + rendered proof
   - executor: `browser` · status: `blocked`
   - blocker: form renders only under a recovery deep-link session; auth receiver `backend`-blocked.

4. **Contract-test hardening** — lock any admitted fail-closed/canonical rule lacking a test
   - executor: `headless` · status: `todo`
   - do: scan admitted/intake pages for a stated fail-closed or source-pending rule with no
     matching `.contract.test.js` assertion; add it. (Last audit found intake guards covered —
     verify and fill any gap. This is the loop's main safe work.)

## Parked — `backend`-blocked (NOT source-closable; loop must NOT attempt)
Page 12 Insurance · 13 Analytics · 14 Users · 15 Organizations · 16 Settings ·
17 Subscriptions · 18 Pricing. Each needs a named server projection owner + receiver/RLS/RPC/Edge
authority + `ivisit-app` app-consequence proof. All source-closable safety cleanups are already
done (fail-closed commands, no fake metrics, quieted reads). Only document blockers; do not
admit or enable.

## Live claims / run log

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
