# Console Layer-Model Plan — Adopting the Five-Layer Determinism Model (No New Deps)

**Created 2026-07-08.** How the console adopts `ivisit-app`'s five-layer state/determinism model **using only libraries already installed** — `@tanstack/react-query@^5.100.9` + `@supabase/supabase-js@^2.91.0` (confirmed `frontend/package.json:36-38`). **No Zustand, no XState, no Jotai, no immer** — and this plan explicitly supersedes the two earlier plans that proposed installing them.

Reference model: `frontend/docs/architecture/IVISIT_APP_DATA_ARCHITECTURE.md` (the app's five layers) + `frontend/docs/database/CONSOLE_DATA_LAYER.md` (settled console data-layer best-practices). Every claim below cites a real `path:line`.

---

## 0. Target model (no new deps)

| Layer | App uses | Console target (this plan) |
|---|---|---|
| **L1** Server truth | Supabase + SECURITY DEFINER RPCs | **Same** — shared Postgres, reused RPCs, `VALID_COLUMNS` allowlists (already the discipline) |
| **L1.5** Projection / normalize seam | `domainNormalize.js` + `mapRow` + `dedupeByIdKeepNewest` | **In-house pure projections** — extend the existing `visitRowProjection` / `buildEmergencyRenderProjection` / `recordUrgency` seam; add one shared `recordIdentity` + `dedupeByIdKeepNewest` util |
| **L2 + L3** Server cache + client store | TanStack Query **+** Zustand | **React Query is the single source** — server cache *and* the normalized cross-surface store; realtime feeds `invalidateQueries`; RQ mutations own optimistic + rollback. **RQ collapses L2+L3 — no Zustand.** |
| **L4** Lifecycle legality | XState (10 machines) | **A pure in-house transition-table module** — `{ [state]: { [action]: nextState } }` + `canTransition()`, consolidating the scattered action-state functions. **No XState.** |
| **L5** Ephemeral UI | Jotai (18 atom files) | **React `useState` + the existing `FocusedRecordContext` / `PageActionsContext`.** **No Jotai.** |

The determinism keystone is unchanged from the app: **derived state is never stored** (`IVISIT_APP_DATA_ARCHITECTURE.md:46-48`) — compute via `useMemo`/selector.

---

## A. Prior-attempts inventory (cited)

Five distinct prior efforts touched this problem. They are **not** a single coherent program — they overlap and, on the deps question, **contradict each other**. This plan reconciles them.

### A.1 The two "install-the-app's-stack" plans (2026-05-04) — **partially superseded**

Both created `2026-05-04` (`git log --diff-filter=A`):

- **`frontend/docs/architecture/CONSOLE_OPTIMISATION_MASTER_PLAN.md`** — names the target `L2 TanStack Query · L3 Zustand · L4 XState · L5 Jotai` (`:34-37`) and sequences passes `A1` install RQ, `A2` install **Zustand + Jotai** (`:134-147`), `D0` add **Jotai** Provider (`:276-282`), `E2` decompose `PageDataContext` into query hooks (`:331-350`), `F1` **XState** candidates (`:401-405`).
- **`frontend/docs/architecture/CONSOLE_GRAND_REFACTOR_PLAN.md`** — same five-layer target but **explicitly drops XState**: "XState is not required for the console … Jotai atoms cover L4 and L5 together" (`:60`), proposes installing **Zustand** (`:176-186`) and a `stores/` dir (`:353`). Its audit table is the sharpest statement of the core defects: `useEffect` for all fetching (`:24`), **dual data path = non-determinism** (`PageDataContext` fetches *and* pages refetch — `:25`), the **1,039-line god context** firing 14 fetches with module-level mock data (`:26`, `:31`), and — at authoring time — "No TanStack Query installed" (`:27`).

**What shipped from these:** only the RQ *foundation* (Pass A1). `queryClient.js` carries the marker `PULLBACK NOTE: Pass A1 — TanStack Query client singleton` (`frontend/src/lib/queryClient.js:1`), and `App.js` carries `PULLBACK NOTE: Pass A1 - TanStack Query foundation` (`frontend/src/App.js:26-31`). **Nothing else** from A2/D0/E2/F1 shipped — no Zustand, no Jotai, no XState, no PageDataContext decomposition (see §B).

> **Why superseded:** these plans predate the actual RQ install and were written when the fix was framed as "mirror the app's 4-library stack." The `IVISIT_APP_DATA_ARCHITECTURE.md:206-222` gap analysis (2026-07-08) later concluded the highest-leverage adoptions are portable **without** new deps — RQ can be L2+L3, and a small pure transition table replaces XState. **This plan keeps their pass *targets* (RQ as cache, decompose the god context, realtime→invalidate) but drops the Zustand/Jotai/XState installs.**

### A.2 Console Service-Alignment program (2026-05-24 → 2026-05-26) — **audit + Pass 1 slices shipped**

- Root: `frontend/docs/implementation/console-service-alignment/README.md` — an audit/planning subtree enforcing the proof chain `source truth → service/RPC → hook/context/state → UI → payload → receiver → app consequence` (`:41-43`).
- `stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md` — 8 passes (emergency → wallet → facility → identity → provider-ops → visits → care/content → shell/analytics, `:180-189`). Directly relevant to determinism: it names **`PageDataContext`** and "duplicated realtime" as the broad ownership defect (`:30`), and every pass's first slice is **read-owner consolidation** (move page/context direct Supabase reads behind one domain owner).
- **What actually shipped** (`IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md`): Pass 1A/1B emergency slices only — a render-safety pass (`:55-73`), a cash-capability downgrade in `getEmergencyActionState()` (`:83-104`), and **`buildEmergencyRenderProjection()` as "the first shared UI-facing emergency projection boundary"** (`:105-153`). Passes 2-8 are **checklists, not code** (`:11-22`).

**This is the L1.5 prior art the plan builds on:** the projection seam exists for one domain (emergency) and is the template.

### A.3 Console UX Revamp Plan (2026-06-18) — **the RQ pilot + event-bus replacement**

`frontend/docs/ux/CONSOLE_UX_REVAMP_PLAN.md` — its §5.3 mandates replacing `window.dispatchEvent` (cited as "57 files") with a `usePageActions` context (`:400-409`), §5 targets a shared `ModalShell`, §6 sequences UX-vs-data-layer (`:431-473`, e.g. "BentoHome after Pass E2 PageDataContext decomposition", `:469`). Its Success Criterion #7 is the determinism goal in UX terms: "no more than one Supabase round-trip per distinct entity type shown" (`:543`).

**What shipped from it:**
- **`useDoctorsQuery`** — the **only** `use*Query` hook in the codebase, docstring citing `CONSOLE_UX_REVAMP_PLAN 5.3` (`frontend/src/hooks/useDoctorsQuery.js:9`). It is the RQ pilot: `useQuery(['doctors', filter])` + a `useInvalidateDoctors()` helper (`:18-45`). No optimistic mutation.
- **`PageActionsContext`** (created 2026-06-18) — replaces the `openCreateModal` custom-event pattern (`frontend/src/contexts/PageActionsContext.jsx:10-11`). This is a working L5 slice.

### A.4 Focused-record foundation (2026-07-07) — **L5 shipped across ~11 rails**

- `frontend/src/contexts/FocusedRecordContext.jsx` — a clean L5-style ephemeral store: one map `{ [entity]: focusedId }` (`:30`), toggle-off on re-click (`:37-45`), and an **urgency-aware fallback** (`mostUrgent`, NOT `list[0]`, `:100-104`) explicitly "mirroring `ivisit-app`'s ordered focus fallback" (`:88-91`).
- `frontend/src/utils/recordUrgency.js` — per-entity rankers for **8 domains** (emergency/visits/verification/support/insurance/operational, `:167-182`), and critically the rankers **reuse the existing action-state helpers** (`rankEmergency` calls `getEmergencyActionState`, `:51-52`). This is the pattern the L4 module formalizes.
- Git history shows the migration **already landed** on ~11 rails (Doctors, Ambulances, Support, Pricing, HealthNews, Hospitals, Insurance, Subscriptions, Users, Organizations — commits `f60f1bed`…`a6f82856`, 2026-07-07).

### A.5 The two settled-architecture docs (2026-07-08) — **the frame this plan executes**

- `frontend/docs/database/CONSOLE_DATA_LAYER.md` — L1 discipline (reused RPCs, `.maybeSingle()`, `withRetry`, scoped realtime, error-classification-not-masking) and the finalization checklist that flags exactly this plan's cleanups: finish the realtime hub (`:52`), adopt under-used `withRetry`/`withAudit` (`:51`), delete the dead mock-data machinery + "unlock its 3 contract locks first" (`:55`), drop the duplicate `subscribeToTable` (`:51`).
- `frontend/docs/architecture/IVISIT_APP_DATA_ARCHITECTURE.md` — the five-layer reference + the §7 gap table (`:206-222`) this plan closes.

---

## B. The REAL current data flow (cited, ASCII)

**De-facto store verdict: `PageDataContext` + per-page `useState` — NOT React Query.** React Query is one dormant pilot (`useDoctorsQuery`). Quantified:

- RQ token counts across `src/`: `useQuery`/`useQueryClient`/`invalidateQueries`/`queryKey` appear in **exactly 3 files** — `App.js` (provider mount), `lib/queryClient.js` (singleton), `hooks/useDoctorsQuery.js` (pilot). `useMutation`/`setQueryData`/`getQueryData`/`useInfiniteQuery` = **0 occurrences**.
- **1** `use*Query` hook total (`useDoctorsQuery.js`); **0** `use*Mutation` hooks.
- All 14 CLAUDE.md domain hooks (`useAmbulances`, `useEmergency`, `useHospitals`, `useVisits`, `useProfiles`, `useAnalytics`, `useActivity`, …) are **plain `useState`+`useEffect`+manual-realtime** wrappers — none use RQ (e.g. `useHospitals.js:20-219`, `useEmergency.js:24-307` per `CONSOLE_GRAND_REFACTOR_PLAN.md:29`).
- `PageDataContext` holds **13 `useState` slices** (`frontend/src/contexts/PageDataContext.jsx:170-186`) and wires **11 realtime subscriptions that each fire a full domain refetch** (`fetchXData`) on any `postgres_changes` event — **never** `invalidateQueries`/`setQueryData` (`:716-910`). It is a **parallel store to RQ, not integrated with it**. Module-level mock data still lives at `:22-135`, gated by a never-UI-wired `useMockData` flag.

```
 READ / SYNC PATH (today — dual-source, non-deterministic)
 ───────────────────────────────────────────────────────────────────────────
 Route load (e.g. /doctors, /emergencies)
   │
   ├─(A) PageDataProvider mounts once  App.js:224 ; PageDataContext.jsx:678-692
   │      └─ fires 14 fetchXData()      → 13 useState slices  :170-186
   │           serves BentoHome / dashboard KPIs
   │
   └─(B) the PAGE ALSO fetches independently
          ├─ DoctorsPage → useDoctorsQuery(['doctors',filter])   ← the ONE RQ path
          │     doctorsService.getDoctors → Supabase             useDoctorsQuery.js:18-25
          └─ EmergencyRequestsPage / AmbulancesPage → direct service call in the page
                getEmergencyRequests(...) via useState/useEffect  EmergencyRequestsPage.jsx:10

   ⇒ TWO copies of the same table's rows (context slice + page state).
     A realtime event fires BOTH  fetchEmergencyData (context)  AND the page refetch.
     = the "dual data path = non-determinism" defect  CONSOLE_GRAND_REFACTOR_PLAN.md:25

 L1.5 (partial): rows are projected only where a projection exists —
   buildEmergencyRenderProjection  emergencyRequestMapper.js:148
   visitRowProjection              visitRowProjection.js:138
   (no shared recordIdentity / dedupeByIdKeepNewest — per-domain only)

 L5 (works): useFocusedRecord(entity,list) resolves the rail record
   explicit selection ?? mostUrgent(list,entity)   FocusedRecordContext.jsx:100-104

 REALTIME → REFETCH (today)
 ───────────────────────────────────────────────────────────────────────────
 Supabase postgres_changes (per table, 11 subs)   PageDataContext.jsx:716-910
   └─ handler calls fetchXData()  → replaces the whole useState slice
      (NOT invalidateQueries; NOT setQueryData; full refetch every event)
   cleanup: supabase.removeChannel(channel) on unmount  ✅ (present)


 WRITE PATH (today)
 ───────────────────────────────────────────────────────────────────────────
 Component button → domain hook / service fn → Supabase RPC (reused, VALID_COLUMNS)
   │   getEmergencyActionState(req) gates which buttons render  emergencyActions.js:7
   ▼
 RPC returns → NO cache to update → the write relies on the realtime sub
   firing a full fetchXData() to eventually reflect the new row.
   No optimistic update, no rollback token, no signature-dedup anywhere
   (useMutation = 0 occurrences).
```

**Where determinism/idempotency IS enforced today:** the L1 write discipline (reused RPCs, `VALID_COLUMNS`, `.maybeSingle()` per `CONSOLE_DATA_LAYER.md`), the emergency + visit projections (L1.5, partial), and `useFocusedRecord`'s pure urgency fallback (L5). **Where it ISN'T:** L2/L3 (dual store, no shared query key, realtime = full-refetch-per-event, zero optimistic/rollback) and L4 (transition legality is scattered — one real function for emergency, inline conditionals everywhere else, §D).

---

## C. Target flow under the model (no new deps)

```
 WRITE PATH (target)
 ───────────────────────────────────────────────────────────────────────────
 View → hook.mutate(input)
   │  L4 guard: canTransition(domain, row.status, action)   (pure table lookup)
   ▼
 RQ useMutation.onMutate
   │  cancelQueries → snapshot previous (rollback token) → setQueryData(optimistic)
   ▼
 L1.5 buildPayload = normalize(input)   (no client id; reused projection)
   ▼
 L1 Supabase RPC (reused, VALID_COLUMNS, withAudit)
   ├─ onError   → setQueryData(previous)         ROLLBACK
   └─ onSettled → invalidateQueries(queryKey)     converge to server truth

 READ / SYNC PATH (target)
 ───────────────────────────────────────────────────────────────────────────
 Route load → use<Domain>Query(queryKey)   ← the ONLY path server data enters
   │  queryFn → service.list → mapRow + dedupeByIdKeepNewest + recordIdentity (L1.5)
   ▼
 RQ cache = the single store (L2 server cache + L3 client snapshot in one)
   ▲
 Supabase realtime (scoped) → invalidateQueries(queryKey)   (NOT full refetch, NOT a 2nd store)
   ▼
 pure selectors / useMemo (derived state never stored)
   ▼
 View  +  L5 useFocusedRecord / useState (draft, modal flags) only
```

One query key per resource, reused by read + mutation-settlement + realtime-invalidate — the app's convergence contract (`IVISIT_APP_DATA_ARCHITECTURE.md:76`), achieved with the RQ already mounted.

---

## D. L4 raw material — the scattered transition logic to consolidate (cited)

The transition table replaces these. **No `{ [state]:{ [action]:nextState } }` table exists today** — only alias-normalization maps and urgency rankers.

| Domain | Existing gating / status logic | Where | Centralized? |
|---|---|---|---|
| Emergency | `getEmergencyActionState()` → `{canDispatch,canComplete,canCancel,hasUnsettledCash,canRetryPayment,…}` | `utils/emergencyActions.js:7-47` | ✅ centralized (the template) |
| Emergency | `canonicalizeEmergencyStatus` + `isActive/isTerminal` + `CANONICAL_EMERGENCY_STATUSES` | `utils/emergencyStatus.js:19,29,37,42` | ✅ |
| Emergency | `EMERGENCY_STATUS` enum + `STATUS_DISPLAY` + display/color/badge fns | `constants/emergency.js:27,39`; TS enum `types/emergency.ts:34` | ✅ (display only) |
| Visit | `canonicalizeVisitStatus`, `resolveVisitStatus`, `isActiveVisitStatus`, `countVisitsByResolvedStatus`, `VISIT_STATUS_STATE_IDS`, **`EMERGENCY_STATUS_TO_VISIT_STATUS`** (cross-domain map) | `utils/visitStatus.js:3-92` | ✅ (a proto-transition map already) |
| Verification | inline permission gates `canApprove=isAdmin()`, `canReview=…` + `rankVerification` | `components/pages/VerificationQueue.jsx:89-90`; `utils/recordUrgency.js:108` | ❌ scattered |
| Support | `STATUS_LABELS{open,in_progress,resolved,closed}` inline + `rankSupport` | `components/modals/SupportTicketModal.jsx:19-24`; `utils/recordUrgency.js:122` | ❌ scattered |
| Insurance | status buckets inside `rankInsurance` (pending/expired/active + verified flag) | `utils/recordUrgency.js:135-144` | ❌ scattered (no enum) |
| Ambulance / staff (operational) | `TRIP_OWNED_STATUSES`, `UNIT_STATUS_OPTIONS` inline; `ACTIVE/AVAILABLE/OFF_OPERATIONAL` sets; `VALID_AMBULANCE_STATUSES`, `STAFF_STATUSES` | `components/modals/AmbulanceModal.jsx:30`; `utils/recordUrgency.js:148-162`; `services/ambulancesService.js:13-14`; `services/doctorsService.js:11` | ❌ scattered across modal/util/service |

**Consolidation target (the L4 module, pure, no deps):** one `constants/lifecycles.js` (or `utils/transitions.js`) holding, per domain, `{ STATES, TERMINAL, TRANSITIONS: { [state]: { [action]: nextState } } }` + `canTransition(domain, state, action)` + a unified `getActionState(domain, record)`. `getEmergencyActionState` becomes the reference implementation re-expressed over the table; `recordUrgency`'s rankers keep reusing it (they already do, `recordUrgency.js:51-52`), so urgency and action-legality stay in sync by construction.

---

## E. Phased, no-new-deps plan (Session 2 vs Session 3)

Each step is small, has a verification (test or browser smoke), and builds on the prior art above. **Sequencing rule** (from `CONSOLE_UX_REVAMP_PLAN.md:433`): never wire a page's UI on top of a store it doesn't yet own — do the L1.5/L4 pure work first (safe, unit-testable), then the L2 per-domain wiring, then decompose the god context.

### SESSION 2 — pure foundations + the first vertical slice (low blast radius)

**S2-1 · L1.5: shared list-normalizer + `recordIdentity`.** Add `utils/recordNormalize.js` with `dedupeByIdKeepNewest(list, getId, getTs)` and a generic `recordIdentity(row)` → `{ id, primary, secondary, status, meta }`, factored from the shapes already in `visitRowProjection.js:138` and `emergencyRequestMapper.js:148`. Pure, no callers changed yet.
*Verify:* unit test — dedupe of a duplicated list is idempotent (re-run = no-op); `recordIdentity` fixed fallbacks.

**S2-2 · L4: the transition-table module.** Add `constants/lifecycles.js` + `utils/transitions.js` (`canTransition`, `getActionState`) covering emergency first, re-expressing `getEmergencyActionState` (`emergencyActions.js:7`) over the table and re-exporting the old name so no call site breaks.
*Verify:* unit test — every legal edge in the table matches current `getEmergencyActionState` output for each canonical status in `CANONICAL_EMERGENCY_STATUSES`; illegal action → `canTransition` false. `npm run build`.

**S2-3 · L4: fold in visit + the four scattered domains.** Move `EMERGENCY_STATUS_TO_VISIT_STATUS`/`resolveVisitStatus` (`visitStatus.js:21-58`) under the module as the visit lifecycle; add verification/support/insurance/operational state sets from their scattered homes (§D) into the table. Replace `VerificationQueue.jsx:89-90` inline gates and `SupportTicketModal.jsx:19-24` labels with `getActionState`.
*Verify:* unit tests per domain; browser smoke `/verification` + `/support-tickets` — actions unchanged. `recordUrgency` rankers still pass (they consume the same helpers).

**S2-4 · L2 pilot proof: optimistic mutation on the existing RQ hook.** Extend the `useDoctorsQuery` pilot (`useDoctorsQuery.js:18`) with a sibling `useDoctorsMutations` using RQ `useMutation` (`onMutate` snapshot→optimistic `setQueryData`, `onError` rollback, `onSettled` `invalidateQueries(['doctors'])`) — reusing `useInvalidateDoctors` (`:42-45`). This proves the L2+L3 pattern on the one domain already on RQ, before touching the god context.
*Verify:* browser smoke `/doctors` — create/edit reflects optimistically then converges; forced-error rolls back. This is the reference other domains copy.

**S2-5 · L1 hardening adoption (cheap, doc-mandated).** Adopt the under-used `withRetry` on the `getDoctors` read and `withAudit` on the doctors mutation (`supabaseHelpers.js` — currently 0 imports per `CONSOLE_DATA_LAYER.md:51`); drop the duplicate `subscribeToTable` in `lib/supabase.js` (`CONSOLE_DATA_LAYER.md:51`).
*Verify:* `npm run build` + doctors smoke; grep proves single `subscribeToTable`.

### SESSION 3 — migrate domains onto RQ + retire the parallel store

**S3-1 · Realtime → invalidate (per domain, wire to RQ).** Convert one `PageDataContext` subscription at a time from `fetchXData()` (`PageDataContext.jsx:716-910`) to `queryClient.invalidateQueries([domainKey])`, once that domain has an RQ hook. Start with emergency (its projection already exists).
*Verify:* per-domain browser smoke — a realtime insert refreshes the list once (network panel: no double-fetch).

**S3-2 · Domain-by-domain hook migration (the E2 pass, no deps).** For each of the 14 `useState` hooks, add a `use<Domain>Query` mirroring the doctors pilot (shared query key, L1.5 `mapRow`+`dedupeByIdKeepNewest`), migrate the page + the PageDataContext slice to read from RQ, then delete that slice. Order by prior-art readiness: emergency → visits → hospitals → ambulances → the rest. This is `CONSOLE_OPTIMISATION_MASTER_PLAN.md:331-350`'s E2 **with RQ as both L2 and L3** (no Zustand).
*Verify:* per domain — one Supabase round-trip per entity type (`CONSOLE_UX_REVAMP_PLAN.md:543` success #7); `git show HEAD:<page>` behavior parity.

> **Not every domain is a CRUD domain — ASSESS the write path + governance contract BEFORE migrating.** Migration status (2026-07-08): **done** — doctors (`b6d2bf10`), hospitals + ambulances (`53552bce`). **DEFERRED — do NOT migrate:** **insurance** is a read-only, fail-closed admin surface with **no write path by design** (every `insuranceService.js:620-649` write throws until an admin receiver RPC exists — see `console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md`), and a deliberate degraded-read contract (`getInsurancePage` never throws; keeps last-loaded rows on failure). A naive `useInsuranceQuery`/`useInsuranceMutations` wiring would violate the no-writes gate and delete the "don't blank the admin on a failed refresh" guarantee — its contract test pins both. The only governance-preserving read migration (if ever wanted) is a `queryFn` that **throws on `page.failed`** so RQ retains last-good data + surfaces `error`; that is a deliberate opt-in, not a default. **Remaining quiet domains** (subscriptions, support, users, organizations, pricing, health-news) must each be checked the same way — some may likewise be deferred. **Hot (UI-lane) domains** emergency/verification/visits/wallet wait for the UI lane to checkpoint.

**S3-3 · Wire L4 into the migrated write paths + optimistic mutations everywhere.** As each domain lands on RQ, add its `use<Domain>Mutations` (copy S2-4) and gate the buttons through `getActionState` (S2/S3 table). Emergency/verification/support first (they have the richest lifecycles).
*Verify:* per domain — optimistic+rollback smoke; illegal transitions not renderable.

**S3-4 · Retire the god context + dead machinery.** Once all slices are migrated, thin `PageDataContext` to a <150-line shell (or delete it), and remove the module-level mock data (`PageDataContext.jsx:22-135`) — after "unlocking its 3 contract locks" (`CONSOLE_DATA_LAYER.md:55`).
*Verify:* full smoke of BentoHome + every management route; `npm run build`; grep confirms no `mockEmergencyData` reference remains.

**S3-5 · Guardrail.** Add a `check:data-contract` npm script running the app's surface-field guards for the console's active tables and wire it into the existing `build` gate (`CONSOLE_DATA_LAYER.md:67-72`), so future drift (an unwired hook, a `.single()` regression, a direct write) fails CI.
*Verify:* the script fails on a deliberately-drifted column, passes clean.

### Dependency order (what blocks what)

```
S2-1 (normalize) ─┐
S2-2 (L4 table) ──┼─► S2-4 (RQ mutation pilot) ─► S3-1 (realtime→invalidate)
S2-3 (L4 domains)─┘                               └─► S3-2 (hook migration) ─► S3-3 (L4+mutations) ─► S3-4 (retire god ctx) ─► S3-5 (guard)
S2-5 (hardening) ──────────────────────────────────►
```

Session 2 is all pure/low-risk (unit-testable foundations + one proven vertical slice). Session 3 is the mechanical, per-domain migration that each S2 piece de-risked.

---

## F. Reconciliation note (for future readers)

If you are following `CONSOLE_OPTIMISATION_MASTER_PLAN.md` or `CONSOLE_GRAND_REFACTOR_PLAN.md`: their **pass goals stand** (RQ as server cache, decompose `PageDataContext`, realtime→invalidate, replace the window event bus) but their **library choices are superseded** — do **not** install Zustand, Jotai, or XState. React Query (already installed) is L2+L3; a pure transition table is L4; `useState`+`FocusedRecordContext`+`PageActionsContext` (already built) are L5. This is the `IVISIT_APP_DATA_ARCHITECTURE.md:206-222` "portable without new deps" conclusion made executable.

## G. File index (every cited source)

**Docs:** `IVISIT_APP_DATA_ARCHITECTURE.md`, `database/CONSOLE_DATA_LAYER.md`, `architecture/CONSOLE_OPTIMISATION_MASTER_PLAN.md`, `architecture/CONSOLE_GRAND_REFACTOR_PLAN.md`, `ux/CONSOLE_UX_REVAMP_PLAN.md`, `implementation/console-service-alignment/README.md` + `stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md` + `IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md`.

**L1 / L1.5:** `lib/queryClient.js`, `lib/supabase.js`, `services/supabaseHelpers.js`, `utils/emergencyRequestMapper.js` (`buildEmergencyRenderProjection:148`), `utils/visitRowProjection.js:138`.

**L2 (pilot):** `hooks/useDoctorsQuery.js`; the 14 `useState` domain hooks under `hooks/`.

**L3 (de-facto store):** `contexts/PageDataContext.jsx` (slices `:170-186`, realtime `:716-910`, mock `:22-135`).

**L4 raw material:** `utils/emergencyActions.js:7`, `utils/emergencyStatus.js`, `utils/visitStatus.js`, `constants/emergency.js`, `types/emergency.ts:34`, `utils/recordUrgency.js`, `components/pages/VerificationQueue.jsx:89`, `components/modals/SupportTicketModal.jsx:19`, `components/modals/AmbulanceModal.jsx:30`, `services/ambulancesService.js:13`, `services/doctorsService.js:11`.

**L5 (shipped):** `contexts/FocusedRecordContext.jsx`, `contexts/PageActionsContext.jsx`, `utils/recordUrgency.js` (`mostUrgent:201`).
