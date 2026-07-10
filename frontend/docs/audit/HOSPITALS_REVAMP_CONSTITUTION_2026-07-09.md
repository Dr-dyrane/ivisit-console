# Hospitals Desktop — Change Log & Revamp Constitution (2026-07-09)

> The user's law: "a mass revamp never works because each page has its perks and features dropped
> mistakenly — do a change log first to understand." Two-agent archaeology (git historian +
> current-state/data-sync surveyor), synthesized here. **This document governs the Hospitals
> desktop pass**: every perk is preserved or explicitly converted with a citation; every finding
> is fixed, queued, or flagged — never silently dropped.

## 1. Timeline (condensed)

- **2026-01→03 accretion:** apple-glass chrome; image rendering; smart bed allocation
  (`bedManagementService`); staff scheduling; delete/update via RPCs; org_admin `organization_id`
  scoping; write allowlists; service-centralized mutations.
- **2026-06-18 sprints:** fabrication removal; **`f31f29f` = preservation baseline** (page still
  had usePageData, create/delete/bulk, BulkActionBar, StaffSchedulingModal, old KPI cards,
  storage upload, Places autofill in modal, live bed-reservation commands).
- **2026-07-02→06 Page-8 admission** (landed in `15acf6c9`, pins `18f90d63`): route-owned
  `getHospitalsPageData`, signal panel + state strip, activity sheet, read-only detail rail,
  fail-closed create/delete/schedule/upload/reservations, honest mobile. Canonical shell was
  glass-card THEN.
- **2026-07-07:** blanket glass sweep REVERTED (glass-card was contract-locked) → the
  one-page-at-a-time law; same evening **`2b90369f` flipped the lock legitimately** — borderless
  frosted canon (`bg-card/68 backdrop-blur-2xl` pinned, `glass-card` now BANNED), table rebuilt
  as borderless CSS grid; then RPC write-allowlists + array-wipe guard; `useFocusedRecord`
  migration.
- **2026-07-08:** rows focus the rail (Staff parity); **React Query migration `53552bce`**
  (useHospitalsQuery + optimistic useHospitalsMutations + realtime→invalidate); service
  hardening; client array-merge workaround deleted (RPC COALESCE — but see F4).
- **2026-07-09:** HospitalsPanel colored glows → neutral (`0a450ff9`); this pass claimed.

## 2. Decision register (locked — breaking any is a DECISION, not a refactor)

All enforced by `HospitalsPage.contract.test.js` (7 suites) and/or the Page-8 gate ledger:
fail-closed **create** (no INSERT policy exists — the test asserts it in SQL; `?add=true` →
honest toast), **delete/bulk/selection**, **staff scheduling** (modal now orphaned app-wide),
**bed-reservation writes** (read-only evidence + "Manage in Requests" pinned), **storage
upload**, **import-in-modal**; edit = the ONLY write, via `update_hospital_by_admin`
(`useHospitalsMutations` optimistic path); route-owned data + `['hospitals', filter]` RQ key;
page-owned realtime channel with guard trio → cache invalidation; signal/strip/sheet/rail const
pins + testids + banned old copy (`Network Size`, `Medical Facilities`, `FILTERED`…);
`useFocusedRecord('hospitals', …)` (no local focus state); `?id` (UUID **or** display_id)
deep-link + `AnimatePresence` modal import (crash pin); grid/list/table `useViewMode` allowlist;
KPI stats computed status-agnostic (`getHospitalStatsFilters`) so chip counts stay stable;
panel route-context window-event bridge; hardgate membership (8 files). **Gate doc Page-8
section is load-bearing** — `gateSource()` pins mean editing it can red the suite.

## 3. Perk inventory — MUST SURVIVE the revamp

1. `?id` deep-link accepting UUID or display_id → focus + auto-open view modal.
2. `?add=true` honest-unavailable feedback.
3. **Facility imagery** with `onError` glyph fallback — the DS row's entity slot carries the
   thumbnail instead of initials.
4. "Visible beds / Visible fleet" page-scope pills (honest service-derived sums).
5. Verified / verification_status badges (StageStrip pending→verified is the natural upgrade).
6. Rail metrics (Beds/Fleet/Rating/Care) + facts (Phone/Tier/Price/Updated from
   `last_availability_update`) — become DetailLine rows.
7. The pinned read-only capacity notice ("Capacity changes need review… Use Requests").
8. Modal's embedded read-only bed management (reservations + utilization + realtime).
9. Panel route-context wiring + `AnalyticsModal type="hospital"`.
10. The optimistic write path (ahead of the donor — keep).
11. `useFocusedRecord` shared focus store (newer than donor's local state — keep; upstream later).
12. Signal `aria-live="polite"` + rich per-action aria-labels (upstream candidates).
13. NOT perks (dead code): `HospitalFleetManager.jsx` (0 importers), `hospitalImportService.js`
    (0 importers) — **deletion needs user sign-off** (F6).

## 4. Findings (F1–F13) — classification

**FIX IN THIS PASS (mechanical canon / dissolves into DS composition):**
- F1 dead sort headers (9 sortable, none wired; service hard-codes created_at) → canon: ONE
  sortable header (Time) plumbed `sortKey/sortDirection` → service allowlist.
- F2 `created_at` FilterSheet filter is a no-op (service ignores it) → wire gte/lte.
- F7 signal hero lies on failed load (no loadError branch) → donor's honest failed hero.
- F8 `isFetching` unused → Updating pill + chip spinner (free with ActivitySheet/KpiStrip).
- F9 per-keystroke search refetch → DS 300ms debounce; add `display_id`/`phone` to the
  search `.or()` (real columns).
- F12 display_id enrichment double-read can clobber real ids → read the column directly.
- Colored-glow chips + amber error banner + red-trap `getStatusBadge` + banned entrances
  (`y:12`, scale-stagger) + focus-ring primary trap → neutral e-scale / destructive / literal
  palette / replace-in-place (no pin protects any of these).
- F5 booby-trapped Edit → client-scope the affordance for org_admin to
  `hospital.organization_id === orgId` (reframe > grant; do NOT widen the RPC). Note the
  `org_admin_id`-only-linked hospital nuance (recorded; backend item).

**QUEUE (data-sync ledger; do not derail):** F11 bedManagementService (`.single()` 406 on
unverified reads, completed-counts-as-occupied inflation, unbounded read, toast-in-service).

**FLAGS — ALL RESOLVED (user arbitration + live DB introspection, 2026-07-09):**
- **F3 RESOLVED — ER-wait reframed READ-ONLY** (user: "reframe it as read only — those are
  operational insights"). LIVE-CONFIRMED: the live `update_hospital_by_admin` SET clause contains
  NO `emergency_wait_time_minutes` — the field was never writable; every prior "edit" was
  silently dropped. `HospitalModal` field is now `disabled` with the operational-insight title +
  in-code citation. **DOCTRINE (user decision): operational-insight fields (ER wait, live
  capacity signals) derive from live activity and are never hand-edited in the console** — apply
  this test to every future editable-field question.
- **F4 RESOLVED — the LIVE RPC COALESCE-preserves ALL arrays** (specialties/service_types/
  features verified via pg_get_functiondef introspection; no unconditional wipe). The REPO
  MIGRATION (`core_rpcs.sql`) is the stale artifact — same production-drift class as the
  dispatch-RPC finding (PERSONA_MATRIX §6 #2). Partial-payload writes are SAFE against live;
  backend item: update the repo migration in ivisit-app to match the live function.
- **F6 RESOLVED — orphans DELETED** (user: "delete orphan codes; fleet manager I believe is the
  ambulance page"): `HospitalFleetManager.jsx` + `hospitalImportService.js` removed (zero
  importers verified twice). Fleet management belongs to the Ambulances page domain.
- F13 dormant capacity writers stay unwired (fail-closed).

## 5. The plan (Visits/Requests precedent, one page at a time)

Compose `console/*`: WorkspaceStage/atlas/dock (page has NONE today — grid layout, 320-360 rail,
no wayfinding), SignalPanel (+ keep the beds/fleet pills as children), KpiStrip (max-3
smart-select, toggle-to-All, KPI_TILE_REST — kills the glows), ActivitySheet/SheetToolbar
(debounce, refresh, filter states, count-row triplet + UpdatingPill), useListKeyboardNav +
useScrollResetOnPage, ListRowShell rows with the image-thumbnail entity slot (ONE canonical
render; ViewToggle + grid/list densities retire per the arbitrated canon; legacy views stay
unimported chrome-lint targets), DetailRailShell/RailInsetHero/DetailLine/CopyChip/StageStrip
rail (display_id + copy, verification stage strip, maps link from latitude/longitude), tokens
everywhere, page joins the estate-law sweep. ~40 page-local pins migrate same-commit;
governance pins survive verbatim; donor-diff gates the fidelity (sanctioned deltas enumerated).
Service: narrow additions only (sort plumbing + allowlist, created_at range, search columns) —
coordinate via ledger. Verify: full suite + strict-radius + donor-diff + live render both states.
