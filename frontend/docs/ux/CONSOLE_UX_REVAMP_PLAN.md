---
status: living
owner: product
created: 2026-06-18
source: deep audit — 4 parallel agents, 17 pages, 50+ components, full role journey mapping
---

# Console UX Revamp Plan

> Synthesised from four simultaneous deep-audit investigations: page-by-page UX, role journey mapping, architectural state, and component/interaction consistency. This is the deterministic revamp plan.

---

## 0. What This Console Must Feel Like

The console serves three distinct human types who are not product people:

- **Doctors (provider role)** — they have patients to see. They need a clear personal queue, fast emergency access, and nothing else in their way.
- **Hospital admins (org_admin role)** — they manage a facility. They need staff roster, credential approvals, fleet status, and wallet balance. They do not know what a "ledger" is.
- **System admins (admin role)** — they maintain the platform. They need cross-org oversight, user management, and global configuration. They can handle complexity.

The design target, extracted from ivisit-app, is: **calm over contrast, one primary action per screen, glass surfaces with generous whitespace, and squircle geometry that communicates softness not power.** The console must feel like a premium professional tool — closer to Apple Health than to Salesforce.

The four audit violations that most block this feeling, in order of severity:

1. **Fabricated numbers shown as real data.** Twelve-plus hardcoded fallback values populate dashboard metrics confidently. This destroys trust the moment anyone notices.
2. **Analytics generates and displays entirely synthetic data without disclosure.** A doctor reviewing their response times on day one sees a plausible chart. Every number is invented. This is a clinical governance risk, not just a UX problem.
3. **Platform-wide metrics shown to users who need personal metrics.** Every dashboard shows aggregate counts, not the individual user's queue. A doctor cannot find "my patients today" anywhere.
4. **The console does not know what role you are.** Navigation group labels (Operations, Management, Finance), menu structure, and home state are identical in organisation across all roles. A doctor and an admin see the same architecture.

---

## 1. Role-by-Role Experience Targets

### 1.1 Doctor / Provider (level 40)

**What they need in one session:**
1. See their assigned visits for today — names, times, status
2. Check the emergency queue — are there any dispatched to them or their facility
3. File a support ticket if something is broken

**What must change:**
- Home screen must show *their* queue, not the platform's aggregate counts. `appStats.liveEmergencies` is a platform-wide number and must not be the largest element a doctor sees.
- "Shift: Active" in the footer is always hardcoded. Either compute it from real provider availability state or remove it.
- Live Map in the primary nav is noise for a doctor. It should be deprioritised (hidden from main nav, accessible through the map page itself).
- Analytics (platform-wide stats) is accessible to providers but is not scoped to them. Either scope it to their personal performance or gate it at org_admin.
- The mobile bottom bar should be fixed for doctors: Home, My Visits, Emergencies. Not a smart-recommendation system.
- Support ticket creation must be surfaced as "Report a Problem" in a visible, labelled location — not buried in Management > Support.

**Post-revamp home state for a doctor:**
A "Your day" summary card showing 3 upcoming visits with patient names and times, an emergency queue count scoped to their facility, and a single "Quick actions" strip (Start Visit, Report Problem). No platform-wide metrics anywhere in the doctor's home screen.

---

### 1.2 Hospital Admin / Org Admin (level 80)

**What they need in one session:**
1. Process the credential verification queue — approve pending doctor registrations
2. Check staff availability — which doctors are on shift
3. Review the wallet balance and recent transactions
4. Add or update a doctor profile

**What must change:**
- The verification queue card must appear on the org_admin home screen. Currently it is admin-only. An org_admin's primary administrative task (approving credentials) has zero home screen representation.
- The nav label "Queue" must be renamed to "Pending Approvals" or "Staff Verification". "Queue" communicates nothing.
- **Critical bug: route/nav mismatch.** `navigation.js` shows Hospitals with `minRole: 'org_admin'` but `routes.jsx` protects `/hospitals` at `minRole: 'admin'`. An org_admin can see the nav item and will be denied on click. Fix required before any UX work on this page.
- **Critical bug: same mismatch on Insurance.** Nav shows org_admin, route requires admin.
- WalletManagementPage tab labels "Ledger" and "Payments" must become "Transaction History" and "Patient Payments". Hospital admins do not think in accounting terms.
- PricingManagementPage tabs "Services" vs "Rooms" map to database table names, not to how an admin thinks. Merge into a single pricing list with a Type column.
- The mobile bottom bar for org_admin should be fixed: Home, Staff (Doctors), Approvals (Verification). Not dynamic.

---

### 1.3 System Admin (level 100)

**What they need in one session:**
1. Global platform health — active emergencies, org onboarding status, system alerts
2. User and role management
3. Org-level financial configuration
4. Resolve escalated support issues

**What must change:**
- **Critical bug: `/organizations` route is absent from `routes.jsx`.** It exists in `navigation.js` and renders at `/organizations` but has no explicit route protection entry. Verify that the fallback in `getRouteProtection()` correctly protects it, then add an explicit entry.
- The "Subscriptions" page in the admin nav manages a newsletter email list (`subscribers` table), not patient/clinical subscriptions. This must be renamed "Newsletter Subscribers" or moved out of the primary nav into a Marketing sub-section under Settings. An admin arriving here expecting to manage pricing plans or patient subscriptions will be confused.
- SubscriptionManagementPage should not appear alongside Hospitals, Doctors, and Emergencies in the nav. It is an email marketing CRM record, categorically different from every other page in the console.
- The `ivisit_fee_percentage` field in OrganizationsPage create/edit modal has no validation guard. A typo (25 vs 2.5) affects every transaction for that org. Add a confirmation step on save when this field changes.

---

### 1.4 Sponsor (level 60)

**What they need:**
Currently undefined in the console. The role exists in the RBAC hierarchy but no page, widget, or workflow is purpose-built for sponsors. They land on an operations dashboard designed for people who dispatch ambulances and see platform-wide emergency counts.

**Minimum viable fix:** Give sponsors a dedicated "Impact" view on the home screen (funded programs, lives impacted, outcomes summary) and replace their nav defaults (Visits, Emergencies) with the Statistics page as the primary destination. The full sponsor workflow is a future sprint.

---

### 1.5 Viewer (level 20)

The viewer role is a pre-activation placeholder. There is nothing to do as a viewer except read Health News. The home screen shows a near-empty bento grid with a "Public Information" card. The experience communicates "your account is not set up" even when it is.

**Minimum viable fix:** Show a clear orientation card: "Your account is pending activation. Contact your administrator to receive a role assignment." Remove the decorative empty bento cards for this role.

---

## 2. The Fabricated Data Removal Plan

This is not a UX decision — it is a correctness requirement. The following hardcoded fallback values must be removed or explicitly labelled:

### BentoHome.jsx — Remove or label all of these:

| Field | Current | Required action |
|---|---|---|
| `appStats.liveEmergencies` fallback | `0` | Keep — zero is a valid empty state |
| `appStats.completionRate` fallback | `94` | Remove — show `—` or empty |
| `appStats.availableAmbulances` fallback | `12` | Remove — show `—` or empty |
| `appStats.activeHospitals` fallback | `8` | Remove — show `—` or empty |
| `doctorsStats.totalDoctors` fallback | `48` | Remove — show `—` or empty |
| `visitsStats.today` fallback | `24` | Remove — show `—` or empty |
| `"23% faster today"` trend string | Hardcoded | Remove entirely |
| `"Patient Satisfaction: 4.8/5.0"` | Hardcoded | Remove entirely |
| `"System Health: 99%"` | Hardcoded | Remove entirely |
| `"Beds Available": appStats.availableAmbulances * 13` | Fabricated formula | Remove entirely — ambulances × 13 has no relationship to bed count |
| `sparkline chartData` | Static array `[{time:'00:00',value:5}...]` | Remove or replace with real data |
| Footer status pills ("System: Nominal", "Hospital: Operational", "Available: Ready", "Shift: Active") | All hardcoded strings | Remove — or compute from real data only |

### Analytics.jsx — The synthetic fallback crisis:

The Analytics page generates plausible-looking chart data (cardiac/trauma/respiratory breakdowns, day-by-day response time curves, demand heatmaps) when there is no real data. Nothing in the UI discloses that these are projections or estimates.

**Required actions, in order:**
1. Replace all synthetic fallback chart generation with explicit empty states: "Not enough data yet — charts will appear after your first 7 days of activity."
2. Gate the Export CSV button when data is synthetic or sparse — do not let synthetic data be exported.
3. Until this is fixed: add a clearly visible banner "Showing estimated baseline data" on the Analytics page for any user whose account is less than 30 days old or has fewer than 20 real records.

### DoctorsPage.jsx:
- `doctor.rating || '4.5'` — Every doctor in a fresh system shows 4.5 stars. Either remove the rating display or show an empty state ("No ratings yet") when the rating is null.
- `doctor.experience || '5'` — Same. Show `—` not `5`.

---

## 3. Page-by-Page Simplification Decisions

### 3.1 BentoHome — Redesign home to be task-based, not metric-based

**Current problem:** All cards show numbers that link to list views. No card tells the user what to do.

**Decision:** Role-branch the home state into purpose-built "today" views, not generic metric cards.

| Role | Home card set |
|---|---|
| Doctor | "Your visits today" (next 3, names + times), Emergency queue count for their facility, Quick actions (Start Visit, Report Problem) |
| Org Admin | "Pending approvals" (count + link), "Staff on shift" count, Wallet balance, Quick actions (Add Doctor, Review Approvals) |
| Admin | System-wide counts (real, with explicit — for missing data), Active emergencies, Verification backlog, Quick actions (Add Org, User Management) |
| Sponsor | Impact summary (future sprint), links to Analytics and HealthNews |
| Viewer | Orientation card ("Awaiting role assignment") |

Remove: Hardcoded status pills, the `appStats.availableAmbulances * 13` Beds card, the hidden Trending Topics card, the AnalyticsQuickCard with hardcoded 4.8 satisfaction score, the sparkline with static data.

Consolidate: Wallet + Subscription + System Status → single "Platform Status" strip (admin only). Not three separate large cards.

---

### 3.2 Analytics — Fix the synthetic data before touching UX

**Blocked** until the synthetic fallback is removed (see Section 2 above). Do not ship any UX changes to Analytics until it shows explicit empty states instead of invented chart data.

After data is fixed: Collapse the 4 near-duplicate chart blocks (admin/org_admin/sponsor/provider variants of the same area chart) into a single `<ResponseTimeChart color={roleColor} label={roleLabel} data={data} />` component. This reduces ~320 lines of duplicated JSX. The Recharts wrapper, axis configuration, and tooltip styling are identical across all four — only the color and label string differ.

---

### 3.3 EmergencyRequestsPage — Surfaceable now

The render projection was hardened in Pass 1A/1B. This page is architecturally the safest to revamp first.

**Changes:**
1. Make primary actions (Dispatch, Complete) permanently visible on the card. Remove the `opacity-0 group-hover:opacity-100` pattern. On touch devices, hover does not exist and these actions are invisible.
2. Replace `window.prompt()` for payment method selection with an inline modal. A native browser prompt that asks the user to type a number is not acceptable in any clinical environment.
3. Replace `confirm()` for bulk cancel and mark-complete with `ConfirmationModal` — consistent with the single-delete flow already on the same page.
4. "Needs Attention" KPI consolidation: Pending + Active are the same state from an operational standpoint. Consider collapsing them into a single "Needs Action: N" card and using the freed card slot for "Critical Priority: N" if priority filtering is available.

---

### 3.4 DoctorsPage — Display polish safe now, functional changes wait for Pass 5

**Immediate (safe now):**
- Remove rating stars and experience fallbacks (see Section 2).
- The three-view-mode toggle can stay for Doctors — a visual grid is genuinely useful for browsing a doctor roster. Grid and Table are the two useful views. Remove List (it is redundant with Table at a compact zoom level).

**Wait for Pass 5:**
- Availability status indicators, schedule display, "On Call" realtime count. These require the provider operations data layer.

---

### 3.5 HospitalsPage — Add the KPI strip that is missing

This is the only management page without a KPI filter strip at the top. Add: Total, Active, Inactive, Low Capacity. This is a layout change only, using the existing KPI filter component.

**Block first:** Fix the route/nav mismatch (org_admin in nav, admin in route). Until corrected, org_admins see Hospitals in their nav but are denied access when they click it.

**Do not revamp** the data surface or pagination until Pass 3A (facility pagination defect repair).

---

### 3.6 UsersPage — Merge the dual create flow

Two buttons exist: "Create User" and "Invite User." A non-technical admin does not know the difference and will create duplicate accounts by trial and error.

**Decision:** Single "Add User" primary action that opens a modal with a first-step choice: "Invite via email" or "Create directly." The flow then continues as today. This is a UX wrapper around the existing two flows — no data layer change required.

**Also:** Remove grid view for users. A table is always correct for user management. Grid cards showing email addresses and role badges are harder to scan than a sorted table column.

---

### 3.7 VisitsPage — Fix default sort

Default sort is reverse-chronological, which buries active visits under completed ones. Change default sort to status-priority: In Progress first, Scheduled second, Completed last. This is a one-line change to the default sort config and requires no data layer work.

For providers: their visits view should be scoped to their own patient assignments by default, not all org visits. This requires a provider-scoped query — defer to the visits data layer work (Pass 6A).

---

### 3.8 WalletManagementPage — Rename tabs, fix the N+1 query

**Rename immediately (layout only):**
- "Ledger" → "Transaction History"
- "Payments" → "Patient Payments"

**N+1 query fix (blocking performance issue):**
The Payments tab fires one Supabase query per payment row to enrich with user profile data. With 50 rows this is 50 simultaneous round-trips per page load. Fix by adding a join in the query: `payments.select('*, profiles!payments_user_id_fkey(display_name, avatar_url)')`. This is a service-layer fix, not a UX change, but it is blocking because the current behavior will appear broken to users on slow connections.

**Block full revamp** until Pass 2A (wallet read facade).

---

### 3.9 VerificationQueue — Fix the silent failure

When `canVerify` is false (permission check fails), the page renders empty with no feedback. The `catch (error) { }` block swallows the error entirely.

**Fix:** Add an explicit access-denied state: "You don't have permission to access the verification queue. Contact your administrator." This is a one-function change in the permission check error path.

**Rename:** Page title "Identity Vault" → "Verification Queue". Nav label "Queue" → "Pending Approvals". Route `/verification` is fine. Three names for one page is one of the most confusing nomenclature problems in the console.

---

### 3.10 SettingsPage — Remove dead UI

Three non-functional UI elements display as real features:
- "Current Plan: Free Tier" with a broken Upgrade link (no `to` or `href` prop)
- Notifications toggle that cannot be toggled (`checked={true}`, no `onCheckedChange`)
- Language selector permanently disabled with `opacity-60 cursor-not-allowed`

**Remove** the Upgrade link and language selector entirely. **Replace** the Notifications toggle with a "Coming soon" label. These are not "coming soon" features hidden behind disabled UI — they are furniture. Non-functional UI elements signal an incomplete product to every new user who sees them.

**Rename** "Control Center" → "Account Settings". Remove the duplicate Sign Out button from the page header (it already exists in the Preferences card).

---

### 3.11 SupportTicketsPage — Split provider from admin experience

Providers land on a full support CRM with disabled admin actions and no guidance. They came here to report a problem.

**Decision:** Gate the full support queue view at `org_admin`. For providers, show a simplified "My Support Requests" view: their own tickets, a "Report a Problem" button at the top, and a status explanation for each open ticket. No bulk actions, no assignment, no admin queue. This is a role-branched render, not a new page.

---

### 3.12 HealthNewsManagementPage — Gate at org_admin

Providers have no write actions on this page. They can see the article list but cannot create, edit, or publish. The route being accessible to providers adds a nav item with no actions for them.

**Decision:** Raise min role to `org_admin` for the management view. If providers need to read health news, create a read-only `/health-news/feed` route at `provider` level.

---

### 3.13 SubscriptionManagementPage — Rename and relocate

This page manages a newsletter email subscriber list (`subscribers` table), not clinical or pricing subscriptions. In the admin nav it sits alongside Hospitals, Doctors, Insurance, and Emergencies.

**Decision:** Rename to "Email Subscribers" or "Newsletter List". Move out of the main Management nav group. Place under a new "Communications" or "Marketing" section, or under Settings > Platform > Email. This is a nav config change only.

---

## 4. Navigation Architecture Changes

### 4.1 Fix the structural bugs first

These must be fixed before any revamp ships — they are correctness issues, not UX issues:

1. **Hospitals route mismatch:** Change `routes.jsx` entry for `/hospitals` from `minRole: 'admin'` to `minRole: 'org_admin'`, OR change `navigation.js` to hide Hospitals from org_admin until they actually have access. Audit this carefully — the decision is whether org_admins should manage hospital records or only admin.

2. **Insurance route mismatch:** Same pattern. Align routes.jsx and navigation.js.

3. **Organizations missing from routes.jsx:** Add an explicit entry: `'/organizations': { public: false, minRole: 'admin', resource: 'organizations' }`.

4. **Smart bottom bar recommendations:** The `SMART_RECOMMENDATIONS` map must check route accessibility for the current user's role before surfacing a recommendation. A viewer being recommended `/analytics` (which requires provider) is a confusing broken link.

### 4.2 Rename navigation labels for non-technical users

| Current label | Renamed to | Rationale |
|---|---|---|
| Queue | Pending Approvals | A hospital admin's primary task — naming should say what it is |
| Control Center (Settings) | Account Settings | "Control Center" is dramatic naming for a profile page |
| Identity Vault (Verification page title) | Verification Queue | Consistent with nav label |
| Subscriptions (email list) | Email Subscribers | Disambiguates from clinical subscriptions |
| Ledger (Wallet tab) | Transaction History | Hospital admins do not think in ledger terms |
| Payments (Wallet tab) | Patient Payments | Clearer what these records are |

### 4.3 Mobile nav entry point

The full navigation is currently behind the user's **avatar image** in the top-left. A non-technical doctor will not intuit that tapping their photo opens a navigation menu.

**Decision:** Add a visible hamburger/menu icon to the top-left of the SmartHeader on mobile (3-line icon, optionally labelled "Menu"). Keep the avatar for profile/settings access only. The avatar-as-nav pattern is a UX discovery barrier for anyone not familiar with the pattern.

### 4.4 Role-fixed bottom bar slots

Replace the smart recommendation system with deterministic role-fixed slots:

| Role | Bottom bar slot 1 | Slot 2 | Slot 3 |
|---|---|---|---|
| Doctor | Home | My Visits | Emergencies |
| Org Admin | Home | Staff (Doctors) | Approvals (Verification) |
| Admin | Home | Users | Emergencies |
| Sponsor | Home | Analytics | Health News |
| Viewer | Home | — | — |

The fourth slot (the existing smart recommendation) can remain dynamic for "currently open page" or be removed.

### 4.5 Context panel labelling

The desktop context panel is triggered by an unlabeled `PanelRightOpen` icon in the SmartHeader. Add a visible tooltip on hover. For first-time users, consider a one-time "Quick Info Panel" callout that disappears after first click. The context panel contains the most useful per-entity quick-actions in the console and it is effectively invisible to non-technical users.

On mobile, the "Context" tab in `MobileNavMenu` must be renamed "Quick Actions" or "This Page". "Context" is an engineering term that communicates nothing to a doctor or hospital admin.

---

## 5. Component Unification Targets

### 5.1 Shared ModalShell component — Highest leverage

Every entity modal (Doctor, Hospital, User, Ambulance, Emergency, Health News, Insurance…) re-implements:
- AnimatePresence + motion.div enter/exit
- backdrop `bg-black/30 backdrop-blur-md`
- rounded container
- header (icon + name + badge + close button)
- scrollable body
- action footer

The `GlassCard` sub-component is copy-pasted in at least three modal files. Label styles, input heights, button shapes, and z-index values all diverge between files.

**Target:** Create `src/components/ui/ModalShell.jsx` and `src/components/ui/GlassSection.jsx`. All entity modals become thin data+config wrappers. This eliminates the three-different-footer-patterns problem and makes modal close-on-backdrop, z-index, and ARIA semantics consistent everywhere.

**Also fix:** Add `role="dialog" aria-modal="true" aria-labelledby` to all modals. Currently only ConfirmationModal has ARIA semantics.

### 5.2 Converge view-mode to context panel

Two parallel paths exist for viewing entity details:
- Modal with `mode="view"` (Doctor, Hospital, User)
- Context panel (DoctorsPanel, HospitalsPanel, etc.)

Both show the same entity detail in read-only form. The duplication means any display improvement must be made twice. Maintaining two display surfaces also confuses users: clicking "view" in a table opens a modal; clicking a row opens a context panel; both show the same content.

**Decision:** Route all entity detail views through the context panel. Remove `mode="view"` from modals. Modals are for write operations only. This removes ~30% of modal form code and creates a clear mental model: **context panel = read, modal = write**.

### 5.3 Replace `window.dispatchEvent` with `usePageActions` context

57 files currently use `window.addEventListener` / `window.dispatchEvent` for cross-component communication. Context panels fire events to trigger modals in parent pages. Events fail silently (no listener = nothing happens), are not type-safe, are impossible to trace in DevTools, and cannot be unit tested.

**Target:** Create `src/contexts/PageActionsContext.jsx` exposing:
```js
const { openModal, openFilters, openContextPanel } = usePageActions();
```

Context panels and list views call `openModal('doctor', item, 'edit')` instead of `window.dispatchEvent(new CustomEvent('openDoctorModal', ...))`. Pages consume the context instead of attaching window event listeners. This is a prerequisite for removing the window event bus (Pass D2 in the refactor plan).

### 5.4 Design tokens in Tailwind config

The `CONSOLE_DESIGN_SYSTEM_FROM_APP.md` defines precise CSS custom property tokens but the code uses ad-hoc Tailwind classes:

| Intent | Current code | Token target |
|---|---|---|
| Card radius | `rounded-3xl` / `rounded-[28px]` / `rounded-[32px]` | `rounded-card` → `var(--radius-card, 30px)` |
| Inner radius | `rounded-2xl` / `rounded-xl` | `rounded-inner` → `var(--radius-inner, 22px)` |
| Icon radius | `rounded-[14px]` | `rounded-icon` → `var(--radius-icon, 14px)` |
| Glass surface | `bg-white/5 backdrop-blur-md` | `glass-surface` class → CSS shorthand |
| Brand primary | `text-red-700` / `bg-red-800` / `#86100E` (inline) | `text-brand` / `bg-brand` → `var(--color-brand)` |

Add these to `tailwind.config.js` as `theme.extend` entries. Inconsistencies then become visible as wrong tokens rather than unnoticed pixel differences.

### 5.5 Extract shared metric utilities

`calcDeltaPercent`, `formatSignedPercent`, and `toDeltaBadge` are copy-pasted in at least 10 files (MobileDashboard, MobileEmergency, MobileHospitals, and others). Extract to `src/utils/metricsUtils.js`. Any rounding fix or format change then applies everywhere.

---

## 6. UX Work vs Data Layer Sequencing

**Rule:** Never ship new UX on top of a broken data layer. Each page below is categorised by what must happen before UX work can begin.

### Tier 1 — Revamp safe now (no data layer dependency)

| Page/Component | Safe work |
|---|---|
| EmergencyRequestsPage | Remove hover-hidden actions, replace window.prompt/confirm, visible primary actions |
| SettingsPage | Remove dead UI, rename, fix duplicate sign-out |
| LoginPage / OnboardingPage | Visual polish only — isolated from data architecture |
| Navigation config | Fix route/nav mismatches, rename labels, fix bottom bar role-slots |
| VerificationQueue | Fix silent permission failure, rename page and nav labels |
| All modals | ModalShell extraction — structural, not data-dependent |
| Context panels | Replace window events with usePageActions, rename "Context" tab |

### Tier 2 — Revamp after Pass D2 + first useQuery hooks

| Page | Prerequisite |
|---|---|
| SupportTicketsPage | Pass 7 (support ticket read model), useQuery migration |
| HealthNewsManagementPage | Pass 7A, min-role gating decision |
| DoctorsPage (functional) | Pass 5 (provider operations data layer) |
| AmbulancesPage | Pass 5 (fleet telemetry data layer) |

### Tier 3 — Revamp after domain data layer pass

| Page | Prerequisite pass |
|---|---|
| HospitalsPage | Pass 3A — pagination defect repair, org ownership |
| UsersPage | Pass 4A — admin service boundary, 1000-row truncation fix |
| VisitsPage | Pass 6A — visit read model, emergency-derived guard |
| OrganizationsPage | Add to routes.jsx, validate org management ownership |

### Tier 4 — Full data layer prerequisite (do not touch UX until complete)

| Page | Prerequisite |
|---|---|
| BentoHome | Pass E2 (PageDataContext decomposition) + Pass H1 (mock data elimination) |
| Analytics | Pass E2 + G2 (page decomposition) + synthetic fallback removal |
| WalletManagementPage | Pass 2A (wallet read facade) + N+1 query fix |
| GodModeMap | Pass 5 (map singleton ownership) |

---

## 7. Critical Bugs — Fix Before Anything Else Ships

These are correctness and trust issues, not UX decisions. They must be fixed in the next sprint regardless of revamp sequencing.

1. **Hospitals route/nav mismatch** — org_admin sees Hospitals in nav, is denied on click. One-line fix in either routes.jsx or navigation.js.
2. **Insurance route/nav mismatch** — same pattern.
3. **Organizations absent from routes.jsx** — add explicit route protection entry.
4. **`window.prompt()` for payment method selection** — EmergencyRequestsPage. Native browser prompt in a production clinical flow. Replace with inline modal.
5. **`confirm()` for bulk emergency cancel and mark-complete** — same page, same severity. Replace with ConfirmationModal.
6. **VerificationQueue silent empty on permission failure** — `catch (error) { }` swallows the error. Add access-denied UI.
7. **`appStats.availableAmbulances * 13` labeled as "Beds Available"** — fabricated metric in BentoHome. Remove.
8. **Wallet Payments N+1 query** — 50 Supabase round-trips per page load. Fix with a join at the query level.
9. **DoctorPage `rating || '4.5'` and `experience || '5'` hardcoded fallbacks** — every doctor in a new system shows fake ratings. Remove fallbacks.
10. **Smart bottom bar recommends inaccessible routes** — add role check to SMART_RECOMMENDATIONS logic.

---

## 8. What to Build First — Sprint Sequence

### Sprint 1: Trust and Correctness (no blocked dependencies)
- Remove all hardcoded metric fallbacks from BentoHome (Section 2)
- Add "Estimated baseline data" banner to Analytics page
- Fix all 10 critical bugs above
- Fix route/nav mismatches (Hospitals, Insurance, Organizations)
- Rename VerificationQueue nav label, page title, and wallet tab labels

### Sprint 2: Home and Navigation (parallel with data layer Pass D2)
- Extract `ModalShell` + `GlassSection` shared components
- Replace `window.dispatchEvent` with `usePageActions` context (first 5 pages)
- Role-fixed mobile bottom bar slots
- Add hamburger menu icon to mobile nav (separate from avatar)
- Doctor home state: scoped visits today card + facility emergency count
- Org_admin home state: add verification queue card

### Sprint 3: High-traffic page polish (EmergencyRequestsPage + Settings + Support)
- EmergencyRequestsPage: visible actions, consistent modals
- SettingsPage: remove dead UI, rename
- SupportTicketsPage: provider-specific "My Requests" view
- HealthNewsManagementPage: gate at org_admin or split into feed + manage
- UsersPage: merge Create/Invite into single "Add User" flow

### Sprint 4: Design token enforcement (after ModalShell ships)
- Add Tailwind config token aliases (rounded-card, rounded-inner, bg-brand)
- Extract `metricsUtils.js` shared utilities
- Audit and update modal interiors to use shared GlassSection tokens
- Remove duplicate view-mode (modal view → context panel only)

### Sprint 5+: Data-layer-gated pages (parallel with refactor passes)
- Analytics revamp (after synthetic fallback removal + Pass E2)
- BentoHome full redesign (after Pass E2 + H1)
- WalletManagementPage (after Pass 2A + N+1 fix)
- HospitalsPage (after Pass 3A)
- UsersPage full revamp (after Pass 4A)
- VisitsPage (after Pass 6A)

---

## 9. Success Criteria

The revamp is complete when:

1. A doctor logging in for the first time can find their patient queue within 10 seconds without being shown any metric they cannot act on.
2. A hospital admin can process a credential approval within 3 taps on mobile without needing to know the word "Queue."
3. No number on the dashboard is hardcoded, fabricated, or derived from a formula unrelated to its label.
4. Every chart or statistical display in Analytics has an explicit empty state instead of synthetic baseline data.
5. All clinical actions (dispatch, complete, approve, reject) use in-app modal confirmation, not native browser dialogs.
6. All entity modals have consistent ARIA semantics, button shapes, label styles, and footer patterns.
7. All high-traffic pages load without triggering more than one Supabase round-trip per distinct entity type shown.

---

## Appendix: Audit Sources

This plan synthesises findings from four simultaneous read-only investigations conducted 2026-06-18:

- **Audit 1** — 17 route-level page components read in full (BentoHome through SettingsPage)
- **Audit 2** — routes.jsx, navigation.js, ResponsiveSidebar, SmartHeader, DynamicBottomBar, RBAC docs
- **Audit 3** — CONSOLE_GRAND_REFACTOR_PLAN, CONSOLE_OPTIMISATION_MASTER_PLAN, Stage 6 pass plans, PageDataContext (1,039 lines), queryClient.js, 3 domain hooks, package.json
- **Audit 4** — 5 modals, 3 context panels, list/table views, 3 mobile components, CONTEXT_PANEL_SYSTEM.md, MANAGEMENT_PAGE_STANDARDS.md, CONSOLE_DESIGN_SYSTEM_FROM_APP.md
