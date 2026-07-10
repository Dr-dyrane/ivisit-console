# Ambulances Desktop — Change Log & Revamp Constitution (2026-07-10)

> Built by the **hardened harness** (user: "use next page to test harness if it works: ambulance
> page"). Produced changelog-first by three parallel scouts (git historian + data-sync surveyor +
> donor-parity/shell/mechanism surveyor) + a live-DB verify, synthesized here. **This document
> governs the Ambulances desktop pass**: every perk is preserved or converted with a citation;
> every finding is fixed, queued, or flagged — never silently dropped. Baseline = `f31f29f`
> (the pre-revamp sprint pack the contract test pins as `PRESERVATION_BASELINE`).

## 0. Harness scorecard (what the process caught BEFORE any code) — the point of this pass

| Harness step | What it caught on Ambulances |
|---|---|
| **Live-DB verify** | Ambulances is **write-capable** — `Org Admins manage ambulances` = **ALL** (CRUD), *not* SELECT-only like Hospitals. **Stopped a blind fail-closed-create copy.** No `create/update_ambulance` RPC — writes are raw table ops under RLS. 9 domain RPCs (assign/auto-assign/failover/location/status/eta/nearby/available). |
| **Changelog-first** | Historian independently confirmed the same: create+edit **admitted LIVE 2026-07-03** (`canManageFleet`); delete/bulk/dispatch/status/location/upload dropped-with-reason. The two methods converged — high confidence. |
| **Mechanism registry** | 5 of 6 registry mechanisms are **NOT present today** (selection, keyboard-nav, scroll-reset, honest-failed-hero, arrival-toast) — exactly the silent-drop class the gate exists to force. When AmbulancesPage joins the registry surfaces list, it goes RED until each is wired or excluded-with-marker. **This is the gate doing its job.** |
| **Data-sync sweep** | Real bugs a UI pass alone would miss: crew Json↔string shape mismatch (AMB-4), current_call hand-editable parallel-dispatch-truth (AMB-6), double status narrowing (AMB-9), base_price dead plumbing (AMB-5), location dead payload (AMB-8). |

**Verdict so far: the harness works.** It prevented the fail-closed trap, enumerated the completeness debt mechanically, and surfaced data-truth bugs — before a line of page code.

## 1. Timeline (condensed)

- **`f31f29f` BASELINE:** usePageData/ambulancesData, direct `from('ambulances')` + `applyAuthFilter` + `limit(1000)` client paging, ViewToggle grid/list/table, FilterSheet, single+bulk delete (BulkActionBar/ConfirmationModal), `?add=true`, old modal with `uploadImage`/`getProfilesByRole`/driverManagementService trip controls.
- **`15acf6c9`** checkpoint (HEAD advanced past baseline — why proofs read `f31f29f`).
- **`f586f1a0`** "visual-start repair": bespoke local `AmbulanceSignalPanel`/`StateStrip`/`ActivitySheet`/`DetailRail`; borderless; dropped BulkActionBar/ConfirmationModal/delete; `canDelete/selectionEnabled=false`.
- **`18f90d63`** contract test created (anchors old behavior to `f31f29f`).
- Modal rewrite onto shared `ModalShell` + `buildAmbulancePayload` + `organization_id`; dropped uploadImage/getProfilesByRole/driverManagementService (→ UnavailableNotes).
- **`a621f80b`** service §2A hardening (maybeSingle+withRetry+withAudit). **`035d1e52`** RBAC/scope unify (`applyAmbulanceOrgAdminScope` composite OR; `on_route→en_route`, `busy→ACTIVE_AMBULANCE_STATUSES`). **`f9294308`** orphan `useAmbulances.js` removed. **`53552bce`** read path → React Query (`useAmbulancesQuery`/`useAmbulancesMutations`, `['ambulances', filter]`).
- Mobile: **`fda49e7c`** MobileAmbulances rebuilt on the canon kit (DONE — the settled domain vocabulary to reuse on desktop).

## 2. Decision register (locked — breaking any is a DECISION, not a refactor)

- **Write register — DIVERGES FROM HOSPITALS (live-confirmed):**
  - **CREATE + EDIT = LIVE, KEEP.** Gated to admin/org_admin (`canManageFleet`). Receiver = the `Org Admins manage ambulances` ALL policy (live-verified). Do **not** fail-close them. (Resolves AMB-7: the receiver is proven.)
  - **DELETE / BULK = EXCLUDED** (dropped `f586f1a0`; no console receiver wired; `deleteAmbulance` stays service-inventory only). On adoption the selection mechanism is recorded-excluded, not wired.
  - **DISPATCH (assign/auto-assign/failover), TRIP status, LOCATION = READ-ONLY evidence.** Operational/dispatch-owned; "Dispatch changes stay in Requests." `assignDriverToAmbulance`/`updateAmbulanceStatus`/`updateAmbulanceLocation` stay service-inventory; modal keeps the honest UnavailableNotes.
  - **MEDIA UPLOAD = EXCLUDED** (no storage policy proof).
- **Org-admin composite scope** `organization_id OR hospital_id.in(org hospitals)` — list AND stats scope identically (`applyAmbulanceOrgAdminScope`). Never widen.
- **Status vocabulary** (reuse mobile verbatim): available→Ready(emerald), en_route/on_route→En route(amber), dispatched/on_trip/on_scene/busy→Active(cyan), returning→muted, maintenance/offline→Service(amber)/Offline, pending→Pending(amber). `ACTIVE_FLEET_STATUSES={dispatched,on_trip,en_route,on_scene}`. Alias mapping `on_route→['en_route']`, `busy→ACTIVE_AMBULANCE_STATUSES` MUST keep routing every KPI/filter token.
- **One canonical render** — ViewToggle/grid/list/table retire (AMB-3); `AmbulanceListView`/`AmbulanceTableView` become unimported chrome-lint targets.
- **Route/RBAC** — `/ambulances` minRole org_admin; admin+org_admin only; provider/sponsor/viewer/**driver** blocked (driver is a Requests actor + an ivisit-app fleet surface, never this page). Station filter admin-only.

## 3. Mechanism registry status (the completeness gate — must be green on adoption)

On adoption AmbulancesPage renders `SortableColumnHeader` → enters the registry. Each of the 6:

| Mechanism | Today | Action on adoption |
|---|---|---|
| `selection` | absent | **Record `selection excluded by decision: <ref>`** — delete dropped, no console bulk-write receiver. Do NOT wire live selection. |
| `keyboard-nav` | absent (ad-hoc Enter/Space only) | **WIRE** `useListKeyboardNav` on the new scroll viewport. |
| `scroll-reset` | absent | **WIRE** `useScrollResetOnPage(listScrollRef, pagination.currentPage)`. |
| `honest-failed-hero` | absent (signal not failure-aware) | **WIRE** loadError-aware signal (mirror `getRequestSignal`); align var to `loadError`. |
| `arrival-toast` | absent | **Record `arrival-toast excluded by decision: <ref>`** — a new unit INSERT is not an operator-attention event like a new emergency (`subscribeToAllAmbulances` exists if reversed later). |
| `deep-link` | present (`?add=true`) | Gate satisfied by `?add`. **Perk-add:** wire `params.get('id')` unit-focus (donor idiom, QuickSearch emits none today) OR queue as a cited donor-lane item. |

## 4. Perk inventory — MUST SURVIVE

1. Server-paged fleet list + **exact** org-scoped count (`getAmbulancesPageData`) — never capped-client.
2. Composite org scope (list + KPIs identical).
3. Search (`call_sign`/`vehicle_number`/`license_plate`) + status/type/station/date(created_at) filters.
4. KPI states Fleet/Ready/En route/Active/Service with exact counts — **reduce 5→max-3** via KpiStrip `pinnedIds`/`importance` (vocabulary survives, presentation caps).
5. Status alias normalization (on_route→en_route; busy→active set).
6. Station enrichment (`hospital_id`→name `station_name`); base-station select.
7. Vehicle signals: call_sign, type (BLS/ALS/basic/advanced/critical), vehicle_number, license_plate, `vehicle_label`, ETA.
8. Live-location boundary — read-only under "Dispatch changes stay in Requests."
9. Driver/crew/assignment **fail-closed** notes (UnavailableNotes) — keep honest-disabled, do not activate.
10. `display_id` label + **CopyChip** — mobile shows "Unit ID"; **ADD to desktop rail + modal** (currently missing).
11. Active-run readable secondary line (ETA on a run vs vehicle identity at rest — Pricing-precedent).
12. AnalyticsModal secondary reveal (route-owned scoped stats).
13. ContextPanel route-context bridge (already wired — preserve the projection shape).

## 5. Findings — classification

**FIX IN THIS PASS (dissolve into DS composition or mechanical):**
- **AMB-1** page composes bespoke locals, not `console/*` → the whole revamp (compose WorkspaceStage/SignalPanel/KpiStrip/ActivitySheet/DetailRailShell/primitives).
- **AMB-2** colored/oversized shadows (`0_22px_52px_rgba(16,185,129,…)`, primary glows, `0_24px_70px`) → neutral e-scale (free via DS components).
- **AMB-3** ViewToggle/grid/list/table → one canonical render.
- **AMB-10** red-token accents (Fleet chip, hover/focus rings on `bg-primary`/`text-primary`) → literal palette / neutral (Add-unit CTA staying brand is fine).
- **AMB-4** crew Json↔string mismatch: read side `Array.isArray(crew)`, write side sends trimmed **string** → rail always shows "Not listed". Align read+write to one shape (parse to array on write, or render the string) — parser-discipline fix.
- **AMB-6** `current_call` hand-editable free text = parallel dispatch truth → make **read-only/system-owned** (like trip statuses).

**QUEUE (data-sync ledger; don't derail):**
- **AMB-5** `base_price` dead form plumbing (in payload builder, no input, shown nowhere) — decide: surface an editable price field, or drop from the payload builder.
- **AMB-8** `location` PostGIS pulled by `select('*')`, rendered nowhere — drop from the projection or route to the map.
- **AMB-9** double status narrowing (FilterSheet status AND kpiFilter both `.eq`/`.in` status) can silently zero results — document the precedence or reconcile.

**FLAG (awaiting decision / backend):**
- crew/location DB types inferred from source (introspection denied `data_type`); the code-level shape bug (AMB-4) stands regardless.
- ORG-scope of the UPDATE policy on `profile_id`/`organization_id` unverified live (predicate columns permission-denied) — confirm an org_admin cannot reassign `organization_id` across orgs (parallel-truth risk); client scoping is in `applyAmbulanceOrgAdminScope`.

## 6. The plan (Visits/Requests/Hospitals precedent, one page at a time) — **LANDED (2026-07-10)**

> Executed as written. Console DS composed over the four bespoke locals; one canonical
> `SortableColumnHeader` render; **create/edit kept LIVE** (the ambulances difference), delete/
> dispatch/status/location/upload gated; mechanisms wired (keyboard-nav, scroll-reset,
> loadError-signal, ?add + ?id) with `selection` + `arrival-toast` recorded-excluded; AMB-4 crew
> Json-array fix + AMB-6 current_call read-only + modal footer/display_id/CopyChip. **Registered
> in BOTH estate laws — the mechanism registry ACCEPTED the page green (all 6 present-or-excluded),
> proving the archaeology named every mechanism and none was silently dropped.** Verified: 84/84
> across all six gold surfaces, hardgate ambulances-clean, data-contract + mojibake clean,
> donor-diff deltas all domain-owned, live compile clean, main-parity drop audit vs f31f29f clean
> (window events superset; no functional drop). QUEUE remains: AMB-5 base_price, AMB-8 location,
> AMB-9 double status narrowing.

### Plan detail

Compose `console/*` replacing the four bespoke locals: `AmbulanceSignalPanel`→`SignalPanel`(loadError-aware `signal` + `toneClassMap`); `AmbulanceStateStrip`(5-chip)→`KpiStrip`(max-3: `pinnedIds=['available','on_route']`, `importance {all:0,available:1,on_route:2,busy:3,maintenance:4}`, `data-ambulance-kpi`); `AmbulanceActivitySheet`→`ActivitySheet`+`SheetToolbar`(fixes the un-debounced search)+`getFilterTriggerState`; `AmbulanceDetailRail`→`DetailRailShell`+`RailInsetHero`+`DetailLine`+`StatusPill`+`CopyChip`(add display_id eyebrow; keep the Dispatch note). Wrap the desktop return in `WorkspaceStage`(`getConsoleModuleRailItems(roleKind)`, `activePath='/ambulances'`, `useWayfindingNav`). Retire ViewToggle/useViewMode/List+Table views → one `SortableColumnHeader` list: **Unit (call_sign + type eyebrow) | Status | Station | Vehicle/plate | ETA-or-Updated (sortable Time-equivalent) | Action**. Swap TableSkeleton/local empty/error → `SkeletonRows`/`EmptyState`/`LoadErrorState`/`ErrorBanner`. Wire the registry: `useListKeyboardNav` + `useScrollResetOnPage` + loadError-signal; record the `selection` + `arrival-toast` exclusion markers; wire `?id` focus. Modal: move footer to `ModalShell footer=`; add display_id + CopyChip; keep the fail-closed UnavailableNotes; fix AMB-4/AMB-6. **Register the page in BOTH `ConsoleDesignSystem.contract` surface lists** (colored-shadow estate-law + donor-mechanism registry) — the completeness gate then covers it. Service: narrow only (crew shape, current_call read-only) — coordinate via ledger. Verify: full gate stack (page suite + estate laws + hardgate --strict-radius + data-contract + mojibake + donor-diff vs Requests + live compile) + main-parity drop audit vs `f31f29f`.
