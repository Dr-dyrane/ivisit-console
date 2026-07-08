# iVisit-App Data Architecture — The Five-Layer State Model

**Created 2026-07-08.** Read-only study of how the sibling repo `ivisit-app` (Expo / React-Native patient app) structures its **data-management architecture** on the *shared* remote Supabase project. Every claim below is confirmed against a real file with a `path:line` citation. Nothing is inferred from a textbook — this documents *their* actual layers.

> **Why this exists (for the console):** the console reads/administers the same Postgres the app owns ("no parallel truth"). The app has already solved deterministic, idempotent, strictly-typed data flow with an explicit N-layer model. This doc names those layers so the console can adopt the parts it's missing (see §7).

All `path:` citations are relative to `C:\Users\Dyrane\Documents\GitHub\ivisit-app\`.

---

## 0. The headline: it is **five** layers, not "~5"

`ivisit-app`'s own source-of-truth architecture doc names them exactly, top to bottom:

> `L1 Supabase → L2 TanStack Query → L3 Zustand → L4 XState → L5 Jotai`
> — `docs/architecture/overview/ARCHITECTURE.md:62-100` ("## 3. The Five-Layer State Architecture")

Each layer owns exactly one kind of state, has one implementation, and one directory:

| # | Layer | Concern | Implementation | Directory | Count |
|---|---|---|---|---|---|
| **L1** | Server Truth | Authoritative rows, RPC responses, realtime events | Supabase + Realtime | `supabase/`, `services/*` | — |
| **L2** | Server Cache | Fetch, cache, invalidation, optimistic mutation | TanStack Query | `hooks/**/use*Query.js`, `providers/QueryProvider.jsx` | — |
| **L3** | Persisted Client Snapshot | Cross-surface, reload-durable client state | Zustand (+ `immer`, `persist`) | `stores/` | 22 files |
| **L4** | Lifecycle Legality | Named states with legal transitions | XState | `machines/` | 10 files |
| **L5** | Ephemeral UI State | Modals, drafts, selected-row pointers, sheet phase | Jotai | `atoms/` | 18 files |

Source for the directory map + counts: `docs/architecture/overview/ARCHITECTURE.md:48-58` and `:82-99`.

There is also a **normalization/mapping seam** that is not a "layer" in their five-layer taxonomy but sits between L1 and L2/L3 and is where most idempotency/determinism is actually enforced in code: `utils/domainNormalize.js` + per-domain `services/*ApiService.js` row mappers + `services/mappers/userMapper.js`. This doc treats it as **Layer 1.5 (the projection/normalization seam)** because that is where the strict single-shape contract is minted.

The canonical reference implementation of all five layers is the **EmergencyContacts** domain, explicitly declared as such: `docs/architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md:9-17` ("canonical five-layer reference implementation"). Every citation below uses that domain because it is the one the app itself points to as the pattern.

---

## 1. Layer ownership decision tree (theirs, verbatim)

`docs/architecture/overview/ARCHITECTURE.md:104-111`:

| Question | Answer |
|---|---|
| Did the server tell us this? | L1 → L2 |
| Should it survive an app reload? | L3 |
| Is it a named lifecycle state (`IDLE/WAITING/DISPATCHED`)? | L4 |
| Is it a modal flag, draft field, or "selected row" pointer? | L5 |
| Is it derived from any of the above? | **None** — compute via `useMemo`/selector |

The rule "derived state is never stored" is the determinism keystone — it forbids two copies of the same fact drifting apart.

---

## 2. Layer-by-layer: responsibility · files · the exact idempotency / determinism / strictness mechanism

### L1 — Supabase (server truth)

- **Responsibility:** authoritative Postgres rows, RPC responses, user-scoped realtime events. Shared with `ivisit-console`; schema/RPC/RLS are ecosystem infra. (`docs/architecture/overview/ARCHITECTURE.md:116-126`)
- **Files:** `supabase/**` (schema/RPC/RLS), `services/supabase.js` (client singleton), `services/*ApiService.js` (adapters).
- **Idempotency:** writes go through the canonical adapter, never raw. Every write re-runs the *same* input normalizer so optimistic shape == server shape (`services/emergencyContactsApiService.js:107-117`, `createPayload`). RLS is user-scoped (`.eq("user_id", userId)` on every read/write/delete — e.g. `services/emergencyContactsApiService.js:143-216`).
- **Determinism:** DB owns identity (`gen_random_uuid()`); the client never sets `id` on insert (payload in `createPayload` has no `id`, `:109-116`). Ordering is server-imposed: `.order("is_primary", …).order("updated_at", …)` (`:147-148`).
- **Strictness:** a single explicit `SELECT_FIELDS` allowlist is the *only* projection ever requested (`services/emergencyContactsApiService.js:9-20`). The UI never sees `SELECT *`.

### L1.5 — Projection / normalization seam (the strict-shape mint)

This is where a raw DB row becomes the *one shape the whole app binds to*.

- **Responsibility:** turn wire rows (snake_case, JSON-or-scalar, nullable) into a single stable camelCase domain object; dedup lists; coerce timestamps.
- **Files:** `utils/domainNormalize.js`, per-domain `mapRow` in `services/*ApiService.js`, `services/mappers/userMapper.js`, `services/displayIdService.js`.
- **Idempotency:** `dedupeByIdKeepNewest(items, getId, getTimestampMs)` collapses duplicate rows keeping the newest by timestamp — used inside `normalizeVisitsList` / `normalizeNotificationsList` (`utils/domainNormalize.js:41-56`, `:84`, `:129`). Re-running normalization on an already-normalized list is a no-op — the definition of idempotent.
- **Determinism:** `mapEmergencyContactRow` produces a fixed key set with fixed fallbacks (`updatedAt ?? createdAt ?? null`) so the same row always maps to the same object (`services/emergencyContactsApiService.js:47-68`). `coerceStartedAtMs` / `toIsoString` normalize time to one representation, fixing a real "progress resets on Metro reload" bug caused by non-deterministic `Date.now()` clobbering (`utils/domainNormalize.js:20-39`, documented inline `:20-25`).
- **Strictness:** `mapRow` **returns `null`** for a row that fails the canonical rule (`if (!phone) return null;` — phone-first model, `services/emergencyContactsApiService.js:49-51`), and lists `.filter(Boolean)` those out (`:153`). The UI can never receive a half-shaped record. **Display IDs are labels only** — `displayIdService` resolves display→UUID for lookups; UUIDs own all writes (`services/displayIdService.js:1-6`, `ID_PREFIXES` + `isDisplayId` `:9-46`).

### L2 — TanStack Query (server cache)

- **Responsibility:** the *only* path server data enters the client; fetch lifecycle, invalidation, optimistic mutation, reconnection. (`docs/architecture/overview/ARCHITECTURE.md:130-140`)
- **Files:** `providers/QueryProvider.jsx` (root), `hooks/emergency/useEmergencyContactsQuery.js`, `…Mutations.js`, `…Realtime.js`, `emergencyContacts.queryKeys.js`.
- **Idempotency:** one shared **query-key contract** reused by read, write, realtime, and hydration — `["emergencyContacts", userId]` (`hooks/emergency/emergencyContacts.queryKeys.js:4-7`). Realtime and mutation settlement both call `invalidateQueries` against that *same* key, so any number of refetch triggers converge to one cache entry (`useEmergencyContactsRealtime.js:16-20`, `useEmergencyContactsMutations.js:82-85`). Optimistic create dedups on **content signature**, not id, so it drops only the matching optimistic row on success — replaying the mutation can't produce a phantom (`useEmergencyContactsMutations.js:69-81`, `buildEmergencyContactSignature`).
- **Determinism:** optimistic writes snapshot `previousContacts` and roll back exactly on error (`onError` restores it — `useEmergencyContactsMutations.js:64-68`, `:110-113`, `:142-145`); `onSettled` always invalidates so the server value is the final word (`:82-85`). Reads are gated declaratively `enabled: Boolean(userId)` (`useEmergencyContactsQuery.js:16`), `staleTime: 30s`, `refetchOnReconnect: true` (`:10`, `:17-18`) — no imperative `if` guards, no `useState`+`useEffect` fetching (forbidden by `ARCHITECTURE.md:136`).
- **Strictness:** the query returns the L1.5-normalized shape (queryFn calls the service which maps rows), so consumers bind to the same object the store holds.

### L3 — Zustand (persisted client snapshot)

- **Responsibility:** cross-surface, reload-durable snapshot (active trips, contacts, coverage mode, location, visits, migration metadata). 22 stores. (`docs/architecture/overview/ARCHITECTURE.md:143-170`; inventory `docs/architecture/stores/STORES_README.md:22-59`)
- **Files:** `stores/emergencyContactsStore.js` (+ `emergencyContactsSelectors.js`).
- **Idempotency:** hydration is guarded by a module-level `hydrationPromise` so concurrent mounts hydrate once (`stores/emergencyContactsStore.js:52`, `:201-221`, inline note `:204`). `upsertContact` finds-by-id then replaces-or-unshifts — applying the same contact twice yields the same list (`:94-108`). Persistence is a single `subscribe` that writes a normalized snapshot on every change (`:225-231`).
- **Determinism:** all mutations run through `immer` (`create(immer(...))`, `:55-56`) so updates are structural/value-based, never in-place aliasing. Lists are re-sorted through the one canonical `sortEmergencyContacts` after every change (`:105`, `:80`) so order is a pure function of content. `null` vs populated meaning is preserved (store rule `ARCHITECTURE.md:166`; `normalizeSnapshot` keeps `null` — `:32-50`).
- **Strictness:** the store only ever holds already-mapped domain objects; `normalizeSnapshot` re-filters `Boolean` on rehydrate (`:34-36`, `:42-44`).

### L4 — XState (lifecycle legality)

- **Responsibility:** named states with *legal* transitions only — readiness, migration-review, sync-failure, mutation-pending. Use a machine only when the state space is `IDLE → WAITING → DISPATCHED → …`, not for a flag. (`docs/architecture/overview/ARCHITECTURE.md:174-190`)
- **Files:** `machines/emergencyContactsMachine.js` (10 machines total incl. `tripLifecycleMachine`, `billingQuoteMachine`).
- **Idempotency / determinism:** an explicit finite state enum (`EmergencyContactsState`: `bootstrapping / awaitingAuth / migratingLegacy / syncing / ready / mutationPending / migrationReviewRequired / error` — `machines/emergencyContactsMachine.js:12-21`) with a typed event union (`:24-38`). Illegal transitions are *impossible*, not merely discouraged — the same event in the same state always yields the same next state. It owns **no** canonical arrays (inline note `:3-5` "Does NOT own canonical contact arrays; those stay in Query + Zustand"), so it can't fork truth.
- **Strictness:** context is a fixed shape `{ userId, error, hasMigrationReview }` (`:7-11`); events are a discriminated union typed via `setup({ types })`.

### L5 — Jotai (ephemeral UI state)

- **Responsibility:** modal flags, drafts, selected-row pointers, wizard steps, sheet phase — anything that must NOT survive reload. 18 atom files. (`docs/architecture/overview/ARCHITECTURE.md:193-207`)
- **Files:** `atoms/emergencyContactsAtoms.js`, `atoms/mapScreenAtoms.js` (sheet phase), `atoms/paymentAtoms.ts`, etc.
- **Idempotency / determinism:** atoms are the smallest addressable unit; setting the same atom value is inherently idempotent, and derived UI values are forbidden here — they go in `useMemo` (rule `ARCHITECTURE.md:207`).
- **Strictness:** contract rule "atoms do not duplicate query data / do not own canonical contacts" (`EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md:128-132`). UI drafts never masquerade as truth.

---

## 3. End-to-end unidirectional data flow (ASCII)

The path is strictly one-directional; realtime feeds **invalidation**, never data pushed sideways into L3/L5 (`ARCHITECTURE.md:139`, `EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md:60-61`).

```
 WRITE PATH (user intent → server truth)
 ────────────────────────────────────────────────────────────────────────
 View (EmergencyContactsScreen)
   │  createContact(input)                       useEmergencyContactsMutations.js:153-155
   ▼
 L2 mutation.onMutate                            useEmergencyContactsMutations.js:53-63
   │  · cancelQueries → snapshot previous (rollback token)
   │  · setQueryData([optimistic, ...prev])  ← OPTIMISTIC, same query key
   ▼
 L1.5 createPayload = normalizeInput(input)      emergencyContactsApiService.js:103-117
   │  (client never sets id; canonical shape)
   ▼
 L1 Supabase .insert(payload).select(FIELDS)     emergencyContactsApiService.js:162-173
   │  DB mints uuid + display_id + timestamps (RLS: user_id scoped)
   ▼
 mapEmergencyContactRow(row)  → strict domain obj emergencyContactsApiService.js:47-68
   │
   ├─ onError  → setQueryData(previous)  ROLLBACK   useEmergencyContactsMutations.js:64-68
   ├─ onSuccess→ drop matching optimistic by SIGNATURE, insert real  :69-81
   └─ onSettled→ invalidateQueries(queryKey)  ← converge to server   :82-85


 READ / SYNC PATH (server truth → screen)
 ────────────────────────────────────────────────────────────────────────
 L1 Supabase row / realtime event (user_id=eq.<id>)   emergencyContactsApiService.js:218-243
   │  realtime callback → invalidateQueries(list(userId))  ← NO direct mutation
   ▼                                                     useEmergencyContactsRealtime.js:16-20
 L2 TanStack Query  (queryKey ["emergencyContacts", userId])
   │  queryFn → service.list → listByUser → map+dedupe+sort   emergencyContactsApiService.js:140-155
   ▼
 L1.5 normalize/dedupe/sort  (dedupeByIdKeepNewest)    domainNormalize.js:41-56
   ▼
 L3 Zustand snapshot  (immer upsert, re-sort, persist)  emergencyContactsStore.js:94-108
   ▼
 L4 XState  (bootstrapping→syncing→ready — legality gate) emergencyContactsMachine.js:12-21
   ▼
 pure selectors  (selectReachable…, selectPrimary…, memoized) emergencyContactsSelectors.js:18-45
   ▼
 hook facade  useEmergencyContacts()  (no side effects)  EMERGENCY_CONTACTS_..._V1.md:79
   ▼
 View  (binds ONE shape; L5 Jotai only for editor draft/modal flags)
```

**Where each guarantee is enforced per hop:**

| Hop | Idempotency | Determinism | Strictness |
|---|---|---|---|
| Write → L1 | `createPayload` re-normalizes; no client `id` | DB mints uuid/ts | `SELECT_FIELDS` allowlist |
| L1 → L1.5 | `dedupeByIdKeepNewest` | `mapRow` fixed fallbacks | `mapRow` returns `null` on invalid → filtered |
| L1.5 → L2 | shared query key | `onSettled` invalidate = final word | normalized shape only |
| Realtime → L2 | invalidate (not push) | one invalidation contract | — |
| L2 → L3 | `hydrationPromise` once-guard; `upsert` find-replace | `immer` value updates + canonical re-sort | `normalizeSnapshot` filter |
| L3 → L4 | — | finite enum, legal transitions only | typed context/events |
| L4 → View | — | memoized pure selectors | `useMemo` for derived, atoms never own truth |

---

## 4. Supporting cross-cutting service helpers (L1 hardening)

`services/supabaseHelpers.js` centralizes the retry/timeout/audit patterns the app applies at the service boundary:

- **`withRetry(fn, {maxRetries:3, baseDelayMs:500})`** — exponential backoff **with jitter** (`:66-89`). Its `isRetryable` predicate is the idempotency-safety gate: it retries network/429/502-504/`40001` (serialization) but **never** retries `409`/`23505` (unique-violation) or `42501` (RLS denial) — i.e. it only retries operations that are safe to repeat (`:31-53`).
- **`withTimeout(promise, 8000)`** — bounds RPC latency (`:19-24`).
- **`withAudit(action, entity, fn, meta)`** — fire-and-forget `log_user_activity`; audit failure never blocks the user (`:196-237`).
- **`subscribeToTable(table, event, cb, filter)`** — managed realtime with `removeChannel` auto-cleanup (`:150-182`).

The console already mirrors these (`frontend/docs/database/CONSOLE_DATA_LAYER.md:21`, `:33`) — they are declared "canonical, must stay in sync with the app."

---

## 5. Backend-fallback idempotency (a notable extra)

The service layer has a per-user backend-availability state machine so a missing table degrades gracefully instead of corrupting truth:

- `runWithBackendFallback(userId, serverOp, localOp)` tries server, marks available/unavailable per user, falls to local canonical storage only on a *specific* backend-unavailable error, and re-throws everything else (`services/emergencyContactsService.js:66-88`).
- Legacy migration is idempotent by **content signature**: it builds a `Map` of existing rows by `buildEmergencyContactSignature` and `continue`s past any already-present signature, so repeated app launches never duplicate migrated contacts (`services/emergencyContactsMigrationService.js:188-214`, inline note `:203`). Migration itself is de-duplicated by a `migrationPromises` map keyed on userId (`services/emergencyContactsService.js:142-154`).

---

## 6. How this maps to Apple's `View ← State ← Model` + single-source-of-truth + unidirectional flow

Apple's SwiftUI doctrine is: **a single source of truth**, the **View is a pure function of State**, State is derived from a **Model**, and mutations flow **one way** (View sends intent → Model changes → State recomputes → View re-renders). iVisit-app is a faithful RN translation:

| Apple / SwiftUI concept | iVisit-app realization | Evidence |
|---|---|---|
| **Model** (authoritative domain data) | L1 Supabase + L1.5 normalized projection | `ARCHITECTURE.md:116-126`; `emergencyContactsApiService.js:47-68` |
| **Single source of truth** | One query key per resource; derived state *never* stored (computed in selectors/`useMemo`) | `emergencyContacts.queryKeys.js:4-7`; `ARCHITECTURE.md:110` |
| **`@State` / `@StateObject` (durable local state)** | L3 Zustand persisted snapshot | `emergencyContactsStore.js:55-56` |
| **`View is a function of state`** | Pure memoized selectors → hook facade → presentational leaf; no side-effects in the read hook | `emergencyContactsSelectors.js:18-65`; `EMERGENCY_CONTACTS_..._V1.md:79` |
| **Unidirectional flow** | Intent → mutation → server → invalidate → refetch → selector → view; realtime only *invalidates* | flow diagram §3; `ARCHITECTURE.md:139` |
| **Value semantics / immutability** | `immer` structural updates; normalized value objects; XState value transitions | `emergencyContactsStore.js:55-56`; `machines/emergencyContactsMachine.js` |
| **Illegal states unrepresentable** | XState finite enum + typed event union (L4) | `emergencyContactsMachine.js:12-38` |

The one addition beyond vanilla SwiftUI is **L4 XState**, which makes "illegal states unrepresentable" explicit rather than convention — closer to Apple's *"make invalid states impossible"* guidance than `@State` alone provides.

---

## 7. What the CONSOLE has vs is missing (vs `CONSOLE_DATA_LAYER.md`)

Comparing the app's five layers against the console's data layer as documented in `frontend/docs/database/CONSOLE_DATA_LAYER.md` and `CLAUDE.md`.

| App layer | Mechanism (app) | Console equivalent | Status | Gap / note |
|---|---|---|---|---|
| **L1 Supabase (server truth)** | Shared Postgres, RLS, SECURITY DEFINER RPCs, `SELECT_FIELDS` allowlists | Same shared DB; writes via reused RPCs + `VALID_COLUMNS` allowlist; `frontend/supabase/*` synced mirror | ✅ **Has** | Fully aligned — same project, same RPC discipline (`CONSOLE_DATA_LAYER.md:9-12`, `:27-34`) |
| **L1.5 Projection / normalize seam** | `domainNormalize.js` + `mapRow` (returns `null` on invalid) + `dedupeByIdKeepNewest` + `displayIdService` | Service-layer projections `recordIdentity`/`visitRowProjection` → stable `{primary, secondary, status, meta}`; `displayIdService.resolveEntityId` | ✅ **Has (partial)** | Console has stable projections + display-ID discipline (`CONSOLE_DATA_LAYER.md:13`, `:22`), but **no centralized `dedupeByIdKeepNewest`-style list normalizer** — dedup/parser discipline is per-service, not one shared util. |
| **L2 TanStack Query (server cache)** | `use*Query` + optimistic `use*Mutations` (signature dedup, rollback) + shared query-key contract + realtime-invalidate | React Query present (`@tanstack/react-query` via `lib/queryClient.js`, `CLAUDE.md`); realtime hub wiring in `PageDataContext` | ⚠️ **Partial** | Realtime→invalidate hub is only *partly* wired (hospitals/ambulances/payments/activity landed; cleanup/invalidation to confirm — `CONSOLE_DATA_LAYER.md:37`, `:52`). No documented **optimistic-mutation + signature-dedup + rollback** pattern like `useEmergencyContactsMutations.js`. |
| **L3 Persisted client snapshot** | Zustand + `immer` + `persist`, 22 stores, once-guarded hydration, canonical re-sort | `PageDataContext` (shell-level data preloading store) + `useFocusedRecord`/`useFocusedRecord`-style focused-record state | ⚠️ **Partial / different** | Console's "store" is a **React Context** (`PageDataContext`), not a value-based Zustand store with `immer`. `CONSOLE_DATA_LAYER.md:55` flags "delete the dead mock-data machinery in PageDataContext." No persisted, reload-durable, cross-surface snapshot layer with structural-update guarantees. |
| **L4 Lifecycle legality (XState)** | 10 machines; finite enums; illegal transitions impossible | **None** | ❌ **Missing** | Console has no state-machine layer. Lifecycle-heavy console flows (verification queue, onboarding wizard, dispatch/approval) rely on ad-hoc flags/`useState` rather than a legal-transition machine. **This is the single biggest structural gap.** |
| **L5 Ephemeral UI (Jotai)** | 18 atom files; drafts/modals/sheet-phase; never own truth | Ad-hoc `useState` + contexts (`OnboardingContext`, `FeedbackContext`, `FocusContext`, etc.) | ⚠️ **Different** | Console uses many purpose-built React contexts instead of atoms. Works, but there's no enforced "atoms never duplicate query data" rule — UI-state/truth separation is convention, not a layer boundary. |
| **L1 hardening helpers** | `withRetry`/`withTimeout`/`withAudit`/`subscribeToTable` in `supabaseHelpers.js` | Canonical `supabaseHelpers.js` mirrored, but **under-used** | ⚠️ **Has, under-adopted** | `CONSOLE_DATA_LAYER.md:21`, `:33`, `:51` — "currently under-used"; TODO to adopt `withRetry` on reads, `withAudit` on mutations. |

### Top gap

**The console lacks Layers 4 (XState lifecycle legality) and a true Layer 3 (value-based persisted store).** The most consequential single gap is **L4 — there is no state-machine layer at all**, so console flows with named lifecycles (verification approval, onboarding wizard, dispatch, cash-payment approval) enforce transition legality by hand instead of making illegal states unrepresentable. The app's answer — a small XState machine per lifecycle domain that owns *no* canonical data — is directly portable and is the highest-leverage adoption for the console. Secondary: the console's L3 is a React Context (`PageDataContext`) rather than an `immer`-backed value store, so it lacks the structural-update + once-guarded-hydration + canonical-re-sort determinism guarantees the app's Zustand stores provide.

---

## 8. File index (every cited source)

**iVisit-app docs**
- `docs/architecture/overview/ARCHITECTURE.md` — the five-layer definition (source of truth)
- `docs/architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md` — the canonical reference-impl contract
- `docs/architecture/stores/STORES_README.md` — L3 store inventory
- `docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` — the migration history (3-layer → 5-layer)
- `AGENTS.md` — idempotency/source-of-truth rules (`:271`, `:367`, `:379`)

**iVisit-app code (EmergencyContacts reference impl)**
- L1/L1.5: `services/emergencyContactsApiService.js`, `services/displayIdService.js`, `utils/domainNormalize.js`, `services/supabaseHelpers.js`
- Service orchestration: `services/emergencyContactsService.js`, `services/emergencyContactsMigrationService.js`
- L2: `hooks/emergency/useEmergencyContactsQuery.js`, `…Mutations.js`, `…Realtime.js`, `emergencyContacts.queryKeys.js`
- L3: `stores/emergencyContactsStore.js`, `stores/emergencyContactsSelectors.js`
- L4: `machines/emergencyContactsMachine.js`
- L5: `atoms/emergencyContactsAtoms.js`

**Console comparison basis**
- `frontend/docs/database/CONSOLE_DATA_LAYER.md`, `CLAUDE.md` (this repo)
