# Hospitals Shell-Parity Gap Audit (2026-07-09)

> Companion to `HOSPITALS_REVAMP_CONSTITUTION_2026-07-09.md` (the governing doc). F1–F13 and the
> §5 composition plan are NOT re-reported here — this audit covers what the constitution does
> **not** already carry: shell wiring navbar→bottombar, modal canon, side-effect inventory, the
> full 43-column data-sync sweep, and the five-persona RBAC walk. Read at HEAD `4c533d74`.
> Canon: Requests (`EmergencyRequestsPage.jsx`) is the gold donor; Visits is the first consumer;
> Hospitals is measured against them, never the reverse.
>
> Classifications: **FIX** = mechanical parity gap the revamp pass should close ·
> **QUEUE** = data-sync ledger item (coordinate, don't derail) · **FLAG** = needs user decision ·
> **ALREADY-CANON** = Hospitals is fine or ahead.

---

## 1. Shell integration — navbar to bottombar

### 1.1 SmartHeader / page title / header actions
- Title map parity: `SmartHeader.jsx:109` (`/hospitals → 'Hospitals'`) alongside `:112` visits,
  `:113` requests. **ALREADY-CANON.**
- **FIX — header primary command recipe.** Hospitals' "Add facility" renders as a washed
  `bg-card/68 backdrop-blur-2xl … opacity-70` button (`HospitalsPage.jsx:522-539`). Donor canon is
  the fg-on-bg pill (`EmergencyRequestsPage.jsx:732-749`; Visits `VisitsPage.jsx:673-688`), now
  componentized as `PrimaryCommand` (DS §2, "never header-hidden, never white-on-white"). Keep the
  honest-toast behavior (decision register), but render the command in the canon pill recipe with
  an explicit unavailable `data-state` — the current 70%-opacity frosted button reads as a
  broken/loading control, not a policied one. Also add the donor's `aria-haspopup`/`aria-expanded`
  vocabulary where applicable.
- **FIX (dissolves with plan).** Hospitals passes `viewToggleComponent` as `usePageHeader`'s third
  arg (`HospitalsPage.jsx:544`); donors pass `null` (`EmergencyRequestsPage.jsx:751-756`,
  `VisitsPage.jsx:708-713`). Retires with the one-canonical-render conversion (DS decision trail
  "One canonical render").

### 1.2 Sidebar (IslandNavigation) + navigation.js + routes.jsx
- `navigation.js:45` — ops group, `minRole: 'org_admin'`, no exclusions; `routes.jsx:57-61` same.
  Filtering path identical to donors (`navigation.js:89-120`, `routes.jsx:167-219`). No nav item
  carries badges/counts for ANY route, so nothing is missing per-route. **ALREADY-CANON.**

### 1.3 Wayfinding dock / module rail
- `/hospitals` is not a `consoleModuleRailItems` destination for any role
  (`consoleModuleRail.js:10-26`) — same as `/visits`, which still renders the dock with the shared
  slate (`VisitsPage.jsx:339-342, 807-809`). When Hospitals adopts `WorkspaceStage` (plan §5) it
  must derive `roleKind` (donor idiom `EmergencyRequestsPage.jsx:511-517`) and pass
  `getConsoleModuleRailItems(roleKind)` + `activePath="/hospitals"` + `useWayfindingNav`.
  **Covered by the plan; no new dock item needed (Visits precedent).**
- **FLAG — desktop dock morph parity.** The 2026-07-09 user decision made the MOBILE last pill
  morph into the current page (`mobileNavigation.js:67-84`; `/hospitals` registered at `:73`), so
  mobile always shows where you are — but the DESKTOP dock (`ConsoleModuleRail.jsx:10-35`) has no
  morph slot: on `/visits` and (post-adoption) `/hospitals`, no pill is active. Estate-wide
  question, surfaced by this adoption: should the desktop dock adopt the same last-slot morph?
  User decision; do not improvise in this pass.

### 1.4 ContextPanel bridge
- Bridge fully symmetric: listen `hospitalsRouteContextUpdated` / dispatch
  `requestHospitalsRouteContext` (`ContextPanel.jsx:193-210`, render `:479-480`), page halves at
  `HospitalsPage.jsx:345-362`. **ALREADY-CANON** (panel-internal gaps → §1.7).

### 1.5 DynamicBottomBar + ContextAwareFAB
- FAB suppression parity: `/hospitals` in `routeOwnsAction` on both surfaces
  (`ContextAwareFAB.jsx:29`, `DynamicBottomBar.jsx:61`) with `usePageShell({ hideFab: true })`
  (`HospitalsPage.jsx:549`). **ALREADY-CANON.**
- **FLAG — mobile route-owned action absent.** `getRouteOwnedMobileAction`
  (`DynamicBottomBar.jsx:168-218`) has branches for `/emergencies` (`:181-188`) and `/visits`
  (`:199-206`) but none for `/hospitals` → falls through to `null` (`:217`), so mobile `/hospitals`
  renders **no bottom-bar action at all** while both donors do. Because create is fail-closed
  (decision register), the choice is: (a) keep honest-by-absence (current), or (b) render the
  fail-closed pattern (disabled with reason / honest toast, matching `?add=true`). Donor-parity
  law says divergences need a recorded domain reason — record one either way.
- **FIX (trivial) — dead registry entry.** `useContextAction.js:41-50` defines an "Add facility"
  action dispatching `openHospitalModal`, but the FAB is hidden on `/hospitals` and no other route
  keys it → unreachable everywhere. Remove or wire deliberately (dead-affordance hygiene).

### 1.6 Breadcrumbs / NavigationContext
- `BentoBreadcrumbs.jsx:7-40` derives crumbs from the path slug for all routes equally;
  `NavigationContext.jsx:13-52` holds no breadcrumb state. **ALREADY-CANON** (parity by
  indifference).

### 1.7 NotificationCenter / toasts / QuickSearch
- QuickSearch: hospitals fully in scope with `?id=` deep link (`searchService.js:80-95`, path at
  `:93`; category tint `QuickSearch.jsx:10`). **ALREADY-CANON — and AHEAD:** Hospitals is the only
  one of the three whose `?id=` deep link actually works end-to-end (`HospitalsPage.jsx:287-307`,
  UUID **or** display_id). Requests has no URL-param handler at all; Visits reads `?view=` while
  QuickSearch emits `/visits?id=` (`searchService.js:125` vs `VisitsPage.jsx:256-277`) — **QUEUE
  (donor lanes): fix the Visits `?id`/`?view` mismatch and add a Requests `?id` handler; upstream
  the Hospitals deep-link idiom.**
- **QUEUE (estate-wide) — notification deep-linking.** `NotificationCard.jsx:96-98,137-139`
  renders a chevron (`hasActionTarget`) but never navigates for ANY type — HOSPITAL, EMERGENCY,
  VISIT alike. When fixed estate-wide, hospital notifications should navigate to
  `/hospitals?id=<id>` (the page already handles it).
- Notification vocabulary: `NotificationTypes.HOSPITAL` with `created/updated/deleted`
  (`notificationService.js:39-43`) vs Requests' lifecycle set (`:55-60`). Thinner by domain reason
  (facility records have no dispatch lifecycle). **ALREADY-CANON.** Cosmetic: `resolveNewPillTone`
  (`NotificationCard.jsx:72-80`) special-cases only `emergency_request`/`verification` — hospital
  default tone is correct (neutral law).
- Page toast vocabulary: see §2 (double-toast bug) and §3 (INSERT arrival toast).

### 1.8 PageDataContext
- Hospitals is route-owned (`pageDataAccess.js:47-49`), in the org-role startup set (`:180`), has
  its fetcher (`PageDataContext.jsx:418-450`) and a context-level realtime sub invalidating
  `['hospitals']` (`:901-913`). **ALREADY-CANON**, with one nit: the page comment at
  `HospitalsPage.jsx:263-265` claims its channel "is the only hospitals realtime on /hospitals" —
  the context sub at `PageDataContext.jsx:901-913` may also be live there (both converge on the
  same invalidation, so behavior is safe). **FIX (comment-truth):** verify and reword to the
  donor's honest "additive to PageDataContext" phrasing (`EmergencyRequestsPage.jsx:616-620`).

---

## 2. Modal canon — HospitalModal vs donors

Settled decisions confirmed implemented, not re-opened: ER-wait field `disabled` +
operational-insight title (`HospitalModal.jsx:552-559`, citing F3); embedded read-only bed
management with in-modal realtime (`:199-655`, channel `bed_reservations_${hospitalId}`,
`bedManagementService.js:166`) — in-modal realtime is canon-blessed by
`EmergencyDetailsModal.jsx:176-182`. **ALREADY-CANON.**

Deltas (donor refs = `EmergencyRequestModal.jsx` / `EmergencyDetailsModal.jsx`; consumer =
`VisitModal.jsx`):

1. **FIX — footer recipe.** Cancel/Save row lives inside the scrollable `<form>`
   (`HospitalModal.jsx:787-817`); canon is ModalShell's sticky `footer` prop +
   `form={formId}` cross-boundary submit (`EmergencyRequestModal.jsx:225-246`, form `:248`).
2. **FIX — field + surface tokens.** `modalFieldClassName = rounded-button bg-muted/30`
   (`HospitalModal.jsx:89`) vs donor `rounded-inner bg-background/60`
   (`EmergencyRequestModal.jsx:49`); section GlassCard is single-tone `bg-white/5`
   (`HospitalModal.jsx:826`) vs donor two-tone `bg-foreground/[0.05] dark:bg-white/[0.07]`
   (`EmergencyRequestModal.jsx:429`, `EmergencyDetailsModal.jsx:503`) — the single-tone tint is
   near-invisible in light mode.
3. **FIX — view-mode treatment.** All-disabled live inputs; no read-only presentation. Adopt
   VisitModal's `ReadOnlyField` (`VisitModal.jsx:610-634`) for `mode='view'`.
4. **FIX — double error toast (bug).** Modal catch calls `handleApiError`
   (`HospitalModal.jsx:293`) AND the page's `handleSave` catch calls it again then re-throws
   (`HospitalsPage.jsx:439-443`) → two error toasts per failed save. Adopt the single-owner rule
   VisitModal documents (`VisitModal.jsx:167-170`).
5. **FIX — toast verbosity.** `'Hospital updated successfully'` (`HospitalModal.jsx:289`) vs
   terse canon `'Request updated'` (`EmergencyRequestModal.jsx:158,169`).
6. **FIX (minor) — submit pending affordance.** Text-only `'Saving...'` (`HospitalModal.jsx:805`);
   consumer canon adds the Loader2 spinner (`VisitModal.jsx:573-579`).
7. **FIX (minor) — inert `onClose(true)`.** `HospitalModal.jsx:290` passes the refresh flag but
   `handleModalClose` ignores it (`HospitalsPage.jsx:449-452`) since mutation `onSettled` owns the
   refresh — Hospitals' mutation-driven refresh is AHEAD; just drop/annotate the dead flag so the
   contract reads one way.
8. **FLAG — unreachable create path + Google Places autofill.** The full "Auto-fill from Google"
   card, edge-function search, and Add-Facility submit path (`HospitalModal.jsx:317-380,124-162,
   237-253`) are gated on `isCreate` — but the page never sets `modalMode='create'`
   (`handleCreateUnavailable` toasts instead, `HospitalsPage.jsx:309-312`; `handleSave` throws on
   non-edit, `:424-426`). This is a fully interactive dead path — the opposite of the honest
   disabled+title pattern the ER-wait field demonstrates beside it. Deleting it is dead-code
   removal (F6 precedent: needs user sign-off); until then it is a booby-trap held closed only by
   the page.
9. **QUEUE — silent-drop audit for the live RPC SET clause.** F3 proved the live
   `update_hospital_by_admin` omits `emergency_wait_time_minutes` (edits silently dropped).
   `HOSPITAL_UPDATE_FIELDS` (`hospitalsService.js:39-64`) still ships 23 columns including
   `image`, `place_id`, `wait_time`, `verified`, `verification_status`. Introspect the live SET
   clause once and reconcile the allowlist — any allowlisted column absent from the live SET is
   another silently-dropped edit of the F3 class. (The editable image-URL field,
   `HospitalModal.jsx:763-773`, is only honest if `image` is actually in the live SET.)
10. **FIX — a11y.** Capacity-grid Labels lack `htmlFor` / Inputs lack `id`
    (`HospitalModal.jsx:474-561`); `Label htmlFor="type"/"status"` point at id-less
    SelectTriggers (`:399,690`); no `aria-live` on the realtime reservations/utilization region
    (`:568-655`) — live updates announce silently. (VisitModal pairs its inputs; ModalShell
    provides trap/Escape/restore for all, `ModalShell.jsx:38-106,273-276`.)
11. **FIX (trivial).** `isEdit` declared and never used (`HospitalModal.jsx:94`).
12. **FIX — modal identity row.** Modal header shows no `display_id` + CopyChip; the donor detail
    surface leads with the case ID + copy affordance (`EmergencyRequestsPage.jsx:1873-1878` rail
    idiom; `CopyChip` in `console/primitives`). Add facility display_id (ORG-XXXXXX) to the modal
    header block.

---

## 3. Side-effects inventory (window events · realtime · RQ graph · URL · scroll/focus)

| Wiring | Requests (donor) | Visits | Hospitals | Verdict |
|---|---|---|---|---|
| Page realtime channel | `emergency_requests_page_changes`: table `*` → invalidate `['emergency']`; INSERT → throttled arrival toast (10s); + `payments` table (`EmergencyRequestsPage.jsx:626-651`) | `visits` channel: `*` → refetch; INSERT toast throttled (`VisitsPage.jsx:429-461`) | `hospitals_page_changes`: `*` → invalidate `['hospitals']` only (`HospitalsPage.jsx:266-282`) | **FIX**: add the throttled INSERT arrival toast ("New facility added") — donor anatomy; inserts arrive from app-side sync, exactly when an operator wants to know. No second table needed (no payments analogue) — record that as the sanctioned delta. |
| Guard trio | `active` flag | `active && isMountedRef` | `active && isMountedRef` (`:271-274`) | ALREADY-CANON |
| RQ store | `['emergency', filter]` + optimistic status mutations | manual useState fetch loop (pre-RQ) | `['hospitals', filter]` + optimistic upsert/rollback/settle (`useHospitalsQuery.js:22-42`, `useHospitalsMutations.js:95-167`) | **ALREADY-CANON — AHEAD of Visits** (constitution perk #10) |
| Post-write refresh | modal-close flag → `fetchRequests()` (`:1245-1251`) | page refetch in `handleSaveVisit` | mutation `onSettled` invalidation only (`HospitalsPage.jsx:446-452`) | ALREADY-CANON (ahead; see §2.7 dead flag) |
| Window events in | `openEmergencyModal`/`openFilters`/`openAnalyticsModal` (`:658-672`) | `openVisitModal`/`openEmergencyDetails`/`openFilters`/`openVisitAnalytics`/`openAnalyticsModal` (`:539-566`) | `openHospitalModal`/`openFilters`/`openAnalyticsModal` (`:376-388`) | ALREADY-CANON |
| Route-context out | `emergencyRouteContextUpdated` on change + on `request…` (`:787-804`) | same idiom (`:520-537`) | same idiom (`:345-362`) | ALREADY-CANON |
| URL params | none | `?view=` (mismatch w/ QuickSearch `?id=`) | `?id=` (UUID or display_id) + `?add=true` honest toast (`:287-307,365-373`) | **ALREADY-CANON — AHEAD**; upstream to donors (§1.7 QUEUE) |
| Notifications on write | cancel → `createNotification` best-effort, never fails the write (`:830-841`) | none | update → `createNotification` HOSPITAL/UPDATED (`:431-436`) inside the try — a notification failure after a committed write would report failure | **FIX (small)**: move `createNotification` to best-effort (donor's false-negative lesson, `EmergencyRequestsPage.jsx:828-839`) |
| Action feedback | modal-open `data-state` | `markActionFeedback` 900ms | `markActionFeedback` 900ms (`:236-245`) | ALREADY-CANON (Visits precedent) |
| Scroll/keyboard | `useListKeyboardNav` + `useScrollResetOnPage` (`:1411-1419`) | same (`:925-933`) | absent | Covered by plan §5 — not re-reported |
| Search commit | `SheetToolbar` 300ms debounce | same | per-keystroke `setFilters` (`:1156-1163`) | F9 — constitution, not re-reported |

Panel-side effects (from the panel comparison):
- **FIX — HospitalsPanel RBAC + honesty.** The panel reads NO gating flags even though the page
  publishes `canAdd: false` / `canEdit` (`HospitalsPage.jsx:332-333`): its Add button hardcodes
  `data-state="unavailable"` yet still dispatches `openHospitalModal`
  (`HospitalsPanel.jsx:67-70,165`) — cosmetically disabled but live. Adopt EmergencyPanel's
  deny-by-default context gating (`EmergencyPanel.jsx:80,90-98,187-190`: `disabled`,
  `aria-disabled`, early-return + notice). Also: no `context.errorMessage` surfacing (donor
  `EmergencyPanel.jsx:81,84-88`) and missing `!hasContext → loading` treatment (`:75-76`).
- **FIX — HospitalsPanel banned glow + no-op Contact.** The one banned colored box-shadow left in
  the trio: `shadow-[0_14px_42px_rgb(6_182_212/0.12)]` (`HospitalsPanel.jsx:176`) + off-scale
  neutral shadows (`:188,:200,:229`) + a Contact quick action that does nothing
  (`:82-84,195-207`). Neutral e-tokens; remove or wire Contact (facility `phone` exists — a
  `tel:` link would make it real).

---

## 4. Data available but not considered — the 43-column sweep

`hospitals` Row (`types/database.ts:1140-1186`) → where each column surfaces at HEAD.
Canonical desktop = grid card (`HospitalsPage.jsx:643-788`) + detail rail (`:1009-1119`) + signal
pills (`:863-932`); legacy list/table views retire per the arbitrated canon (not counted);
Modal = `HospitalModal.jsx`; Mobile = `MobileHospitals.jsx`; Panel = `HospitalsPanel.jsx`.

| Column | Desktop card/rail | Modal | Mobile | Nowhere? / note |
|---|---|---|---|---|
| id, name, address, status | ✓ | ✓ | ✓ | — |
| display_id | ✗ (rail: plan §5 adds) | ✗ (§2.12 FIX) | ✓ | |
| image | card ✓ / rail ✗ | ✓ (URL field) | ✓ | rail `RailInsetHero` could carry the thumbnail (perk #3 extends naturally) |
| image_attribution_text / image_source / image_confidence / image_synced_at | ✗ | ✗ | ✗ | **NOWHERE — FLAG below** |
| phone | rail fact ✓ | ✓ | ✓ | **FIX (minor):** rail phone gets `CopyChip` (donor `EmergencyRequestsPage.jsx:1916-1920`) |
| rating | ✓ | ✓ | ✓ | — |
| type | rail "Tier" ✓ | ✓ | ✓ | — |
| provider_type | ✗ | ✗ | ✓ | mobile-only; persona law derives signals from provider_type — **QUEUE:** consider desktop surface when persona filters land |
| provider_source | ✗ | ✗ | ✗ | provenance (imported vs manual) — note only |
| verified | ✓ badges | ✓ | ✓ | — |
| verification_status | ✗ (rail boolean only) | ✓ | ✓ | plan §5 StageStrip pending→verified covers |
| available_beds | ✓ (card, rail, pills) | ✓ | ✓ | — |
| total_beds | ✗ | ✓ | ✓ | **FIX (judgment):** rail "Beds" shows available only — `X of Y` is more honest capacity evidence |
| icu_beds_available | ✗ | ✓ | ✓ | **FIX (judgment):** ICU is dispatch-relevant; candidates: rail Beds metric sub-line |
| ambulances_count | ✓ | ✓ | ✓ | — |
| emergency_wait_time_minutes | ✗ | ✓ (disabled, F3) | ✓ | **FIX:** surface read-only in the rail ("ER wait · Xm") — the operational-insight doctrine says these fields are for READING; today the canonical desktop hides the insight entirely |
| wait_time (text) | ✗ | ✓ | ✓ | **QUEUE:** overlaps `emergency_wait_time_minutes`; pick one surfaced semantic, document the other |
| emergency_level | rail "Care" ✓ | ✓ | ✗ | — |
| booking_eligible / dispatch_eligible / emergency_eligible | ✗ | ✗ | ✓ (added `4c533d74`) | **FIX:** desktop rail should show the same capability trio read-only (chips/DetailLine) — these gate what ivisit-app can actually do with the facility; mobile already surfaces them, desktop operator flies blind |
| bed_availability (Json) | ✗ | ✗ (modal reads `bed_reservations`-derived data instead) | ✗ | nowhere directly; live evidence comes via `bedManagementService` — acceptable, note |
| ambulance_availability (Json) | ✗ | ✗ | ✗ | NOWHERE — pairs with fleet count; note only |
| specialties | ✗ | ✓ | ✓ (chips) | **FIX (selectivity call):** mobile shows specialty chips, desktop shows none — rail could carry top-3 chips; keep it lean (donor taste) |
| service_types / features | ✗ | ✓ | ✗ | modal-only; acceptable |
| price_range | rail "Price" ✓ | ✓ | ✗ | — |
| base_price | ✗ | ✗ | ✗ | NOWHERE — pricing domain owns display; note only |
| latitude / longitude | ✗ | ✓ (edit) | ✓ (map link) | plan §5 adds the rail maps link — covered |
| coordinates (PostGIS) | ✗ | ✗ | ✓ (1 ref) | lat/lng serve; ignore |
| place_id | ✗ | ✓ | ✗ | could power a precise `maps.google.com/?q=place_id:` link vs raw lat/lng — optional upgrade to the planned maps link |
| org_admin_id / organization_id | ✗ | ✗ | ✗ | **NOWHERE in any UI.** Required for the F5 client-scope check (row carries it via `select('*')` — fine), and operationally valuable as rail "Organization" line. Org NAME needs a join → **QUEUE** (narrow service addition via ledger) |
| category_confidence | ✗ | ✗ | ✗ | internal ML score; fine |
| last_availability_update | rail "Updated" ✓ | ✓ | ✓ | perk #6 — ALREADY-CANON |
| created_at | sort/filter only | ✗ | ✗ | surfaces as the Time column with F1 — covered |
| updated_at | ✗ | ✗ | ✗ | `last_availability_update` serves; fine |

Service-side sync notes:
- **Selection:** `getHospitals` selects `'*'` (`hospitalsService.js:299-300`) — matches the donor
  (`emergencyService.js:447` also `'*'`), so no delta; but the row carries two Json blobs +
  four image-metadata columns per list row. Note only (donor-parity).
- **QUEUE — unbounded dropdown fetch.** `VisitsPage.jsx:468` calls `getHospitals()` with no
  filter/limit → every column of every visible hospital to fill a `<select>`. VisitsService
  already demonstrates the narrow idiom (`visitsService.js:310` `select('id, name, address')`).
  Coordinate with the Visits lane: a `getHospitalOptions()` narrow read.
- **Stats:** `getHospitalPageStats` computes `verified` (`hospitalsService.js:186-201`) which no
  KPI/pill consumes (AnalyticsModal receives the whole object). Harmless; note for the KpiStrip
  smart-select inputs — a Verified chip is a candidate 4th option under max-3 smart context.
- Search `.or()` covers `name,address` only (`hospitalsService.js:140-143`) — F9 (constitution)
  adds `display_id`/`phone`; not re-reported.
- **FLAG — image attribution compliance.** `image_source`/`image_attribution_text` exist and are
  populated by the app-side Places sync, but the console renders facility photos (card
  `HospitalsPage.jsx:670-691`, modal preview `HospitalModal.jsx:744-760`, mobile) with NO
  attribution anywhere. If `image_source` is Google Places, displaying the photo without its
  attribution text violates the Places API terms. Decide: render `image_attribution_text` as a
  caption/overlay wherever the photo renders, or confirm the images are not attribution-bound.

---

## 5. RBAC persona walk — /hospitals as each role

Gates: route `minRole: 'org_admin'` (`routes.jsx:57-61`); nav `navigation.js:45`; panel access
`isAdmin() || isOrgAdmin()` (`ContextPanel.jsx:73`); page `canEditHospitals = isAdmin() ||
isOrgAdmin()` (`HospitalsPage.jsx:162`).

| Persona | Route | Nav shows | Commands rendered | Rail/panel | Dead/booby-trapped |
|---|---|---|---|---|---|
| **admin (100)** | ✓ | ops group | Edit everywhere; Add = honest toast; delete/bulk/selection fail-closed (`canDelete={false} selectionEnabled={false}`, `:573-574,800-801,812-813`) | full rail; panel Add/Stats/Filter/Contact | Panel Add cosmetically-disabled-but-live (§3 FIX); Contact no-op (§3 FIX); mobile has no bottom-bar action (§1.5 FLAG) |
| **org_admin (80)** | ✓ | ops group | **Edit renders on EVERY row including foreign orgs'** — `canEditHospitals` has no `organization_id` check at `:162`, grid `:764-782`, rail `:1102-1114`; the RPC will reject foreign writes → booby-trap confirmed **still open at HEAD** (constitution F5 verification: NOT yet scoped; fix stays in-pass, client-scope `hospital.organization_id === orgId`, reframe not grant; remember the `org_admin_id`-only-linked nuance) | same as admin | F5 (verified open); same panel items as admin |
| **sponsor (60)** | ✗ 60<80 → `/unauthorized` | hidden (minRole) | — | panel never selects hospitals branch for them | Honest-by-hiding — **ALREADY-CANON.** (Donors use explicit `excludedRoles:['sponsor']`; Hospitals achieves it via level. Equivalent outcome.) |
| **provider (40)** | ✗ | hidden | — | — | **FLAG (product note, not this pass):** clinicians can never see even their own facility's record; the service docstring (`hospitalsService.js:289`) says RLS lets "others see verified ones", so a read-only provider view is DB-feasible — user decision, record and move on |
| **viewer (20)** | ✗ | hidden | — | — | honest — ALREADY-CANON |

Donor comparison for per-role affordances: Requests derives a `roleKind` and feeds
persona-scoped KPI pools (`includeMine = isDriver()`, `EmergencyRequestsPage.jsx:1191,1409`) and
gates rail actions per `actionState` × role (`:1842-1862,2006-2015`); Visits splits
`canCreate`/`canEdit` (`VisitsPage.jsx:315-316`) and publishes both to the panel. Hospitals
publishes `canAdd:false`/`canEdit` (`HospitalsPage.jsx:332-333`) — the page side is honest;
the panel ignores the flags (§3 FIX) and the org_admin edit affordance is unscoped (F5).
No hospitals persona chip is warranted (no `responder`-like sub-persona in this domain) —
**ALREADY-CANON** on KPI persona scoping.

---

## Top 10 (priority order)

1. **F5 verified still open at HEAD** — org_admin Edit unscoped (`HospitalsPage.jsx:162,764,1102`);
   constitution FIX confirmed pending, ship in-pass. *(verification result, not a new finding)*
2. **FIX — modal double error toast** (`HospitalModal.jsx:293` + `HospitalsPage.jsx:441`): every
   failed save toasts twice; adopt the VisitModal single-owner rule.
3. **QUEUE — live RPC SET-clause reconciliation** against all 23 `HOSPITAL_UPDATE_FIELDS`
   (`hospitalsService.js:39-64`): F3 proved one silent-drop; `image`, `place_id`, `wait_time`,
   `verified` et al. are unverified — every miss is a lying edit form.
4. **FLAG — unreachable create + Google Places autofill dead path in the modal**
   (`HospitalModal.jsx:317-380`): fully interactive, rejected only at the page; delete (F6-style
   sign-off) or render fail-closed.
5. **FIX — HospitalsPanel parity bundle**: deny-by-default `canAdd` gating, errorMessage +
   `!hasContext` loading, banned cyan glow `:176`, off-scale shadows, no-op Contact.
6. **FIX — modal canon bundle**: sticky footer + `form` id, field/surface tokens, ReadOnlyField
   view mode, terse toasts, submit spinner, a11y label pairing + `aria-live`, display_id header.
7. **FIX — rail operational-insight surfacing**: ER wait (read-only), eligibility trio
   (booking/dispatch/emergency — mobile already shows them), Beds `X of Y (+ICU)`, phone CopyChip;
   FLAG image-attribution compliance wherever the photo renders.
8. **FLAG — mobile bottom-bar action absence** on `/hospitals` (`DynamicBottomBar.jsx:168-218`):
   honest-by-absence vs fail-closed-with-reason — record the decision either way; also delete the
   dead `useContextAction.js:41-50` entry.
9. **FIX — realtime INSERT arrival toast** (throttled, donor anatomy) + notification-after-write
   made best-effort (`HospitalsPage.jsx:431-436`); correct the "only realtime" comment.
10. **QUEUE (estate) — deep-link debts Hospitals exposes**: notification cards never navigate
    (all types); Visits `?id`/`?view` mismatch + Requests missing `?id` handler (Hospitals' idiom
    is the upstream candidate); desktop dock morph parity (FLAG); `getHospitalOptions()` narrow
    dropdown read for VisitsPage.

*End of audit — fixes execute in the main lane under the constitution's one-page-at-a-time law.*
