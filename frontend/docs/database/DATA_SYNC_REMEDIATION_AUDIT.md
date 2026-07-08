# Data-Sync Remediation Audit — iVisit Console ↔ Shared Supabase

**Date:** 2026-07-07 · **Method:** 6 read-only domain audits (Identity, Emergency, Money, Clinical, Facility/Fleet, Infra/Content), every service/hook/context/util read in full and cross-checked against the schema owner `ivisit-app/supabase/migrations/*`. Every claim is cited to `path:line` in the source audits.

> **Prime directive:** the console shares one Postgres with `ivisit-app` (the patient app, schema owner). It must **read and write only through the RLS/RPC boundary the app defines** — never by loosening shared RLS or writing canonical tables directly. Nothing in this doc has been implemented; it is the recommendation set for sign-off.

---

## 1. The systemic root cause (one problem, wearing many hats)

The console was built to **read and write canonical shared tables directly as an operator** (`profiles`, `visits`, `medical_profiles`, `hospitals`, `organizations`, `wallet_ledger`, `payments`, `subscribers`). But the shared DB's RLS is **owner-scoped** (`auth.uid() = user_id`) or, for some tables, **has no write policy at all**. So when the console acts as an admin/org-operator on *another* user's row:

- the query matches **0 rows** → `.select().single()` demands exactly one → PostgREST returns **`PGRST116` / HTTP 406 "Cannot coerce the result to a single JSON object."** (the wall of 406s + the verify-provider crash you saw), **or**
- the write is **silently RLS-denied** and the failure is **masked as empty state** (`return []` / zeroed balances / "no subscribers").

**The fix direction is already proven inside this repo.** The Emergency domain is fully healthy: every mutation goes through a `SECURITY DEFINER` RPC and the DB itself enforces RPC-only writes at the trigger level (`enforce_emergency_status_write_path`, ERRCODE 42501). The console *cannot* mint an unreconcilable emergency even if it tried. `profilesService.updateProfile` already routes admin edits through the `update_profile_by_admin` RPC; `AuthContext` already reads with `.maybeSingle()`. **The remedy is to make every broken path look like these three.**

---

## 2. Severity by domain

| Domain | State | Headline |
|---|---|---|
| **Emergency/Dispatch** | ✅ Healthy (template) | RPC-gated + trigger-enforced. Only defect: `reserveBed()` fabricates bed numbers with `Math.random()`. |
| **Identity/Access** | 🔴 Broken | verify-provider/BVN/admin writes all 406 (owner-only `profiles` RLS); `adminService` writes **columns that don't exist**; a silent-failure layer hides it all. |
| **Clinical** | 🔴 Broken | Direct writes to canonical `visits`/`medical_profiles`; **operators can't even SELECT** other users' clinical rows (owner-only RLS) → the "every Visits row is *admin*" symptom. Read-modify-write races on medical arrays. |
| **Money** | 🔴 Broken | Client-side `wallet_ledger` writes → double-debit; financial tables not in realtime publication; `insurance_policies` **schema drift** (reads columns that never shipped); `subscribers` split-brain + no write RLS. |
| **Facility/Fleet** | 🟠 Mixed | Hospital bed/status/approval writes RLS-denied (no hospitals write policy); `update_hospital_by_admin` **wipes arrays** on partial edits; realtime unwired though tables are published. |
| **Infra/Content** | 🟠 Mixed | Realtime hub subscribes 8 of 16 published tables; `errorHandler` used by **0 services** (303 raw `console.error`); one live mock-data leak. Parser discipline & client config are clean. |

---

## 3. Fix matrix — three categories

### A · [FRONTEND-SAFE] — console-only, reversible, no schema change (do first)

| Fix | Where | Why |
|---|---|---|
| `.single()` → `.maybeSingle()` on all non-owner reads + null-handling | `verificationService:182`, `profilesService:411`, `walletService:134-285`, `hospitalsService:381`, `bedManagementService:89`, `staffScheduling:407`, `authService:44`, `onboarding:337` … | Stops the 406 crash on RLS-denied/absent rows (turns crash → graceful). |
| **Wire realtime for `hospitals`, `ambulances`, `payments`, `user_activity`** into the hub | `PageDataContext.jsx:709-847` (`subscribeToAllAmbulances` already exists) | All four are **already in the publication** — trivial, kills the stale-balance / stale-fleet gap. |
| Stop masking failures as empty | `subscriptionService:97`, `walletService`, `PageDataContext:588`, `insuranceService:459`, `useAdmin`, healthNews reads | A denied/broken query renders as legitimate empty — adopt `analyticsService`'s `{data, error, kind}` "denied-vs-failed" model (best-in-class in the repo). Surface the existing `domainErrors` map. |
| Add write allowlists | `hospitalImportService.updateHospital:246`, `doctorsService.updateDoctor:253` (copy `ambulancesService.updateAmbulance:369`) | Prevent arbitrary/forged column writes. |
| Drop caller-supplied `id` on insert | `ambulancesService.createAmbulance:325` | Console shouldn't mint entity identity. |
| Fix dead KPIs + mock leak | `PageDataContext:174` (init `verificationData` → `null`), `:427` (`on_route`→`en_route`, `busy` invalid), remove the `mock*Data`/`useMockData` bag | Fabricated counts/zeros render as real. |
| Bridge React Query ↔ realtime hub | `queryClient.js` + hub callbacks call `invalidateQueries` | Two disconnected caches: `useQuery` pages stay ≤2min stale even after a realtime event. |
| Consolidate + fix subscribers | `subscribersService` vs `subscriptionService` (split-brain); `deleteSubscriberByEmail:156` normalize/route to UUID | One contract; wrong-key delete risk. |
| `cancelVisit` **append** notes, don't clobber | `visitsService:635` | Destroys prior clinical note today. |
| Fix the silent-failure layer | `adminService.hasPermission:110` (always-false for real admins), `rbacPatterns.handleServiceError:159` (rethrows where callers `return`), `logAuthorizationEvent` (no-op) | These turn every P0 into a blank screen with no diagnostic. |
| Normalize non-array `crew` before `.map` | `staffSchedulingService:59` (`crew` is JSONB object) | Parser break. |

### B · [NEEDS-RPC] — new/existing SECURITY DEFINER RPCs (author in `ivisit-app`; see §4)

| Console path (broken) | Fix |
|---|---|
| `verifyProvider` `.update('profiles')…single()` (`verificationService:194`) — **the live 406** | **new** `console_verify_provider` (or reuse `update_profile_by_admin`) |
| `verifyProfileBVN` (`profilesService:472`), `adminService` suspend/activate/delete/role (`:264-385`) | `update_profile_by_admin` (role) + a new lifecycle RPC (needs columns, §C) |
| `verifyOrganization` `.update('hospitals')…single()` (`orgVerificationService:151`) | **reuse existing** `update_hospital_by_admin` — no new RPC |
| Hospital bed/status (`hospitalsService:498,522`), approve/reject/assign (`hospitalImportService:146-207`) | reuse `update_hospital_by_admin` or a narrow bed/status RPC; new approve/assign RPC |
| `backfillMissingFeeLedger` client ledger write (`walletService:474`) — **double-debit** | **new** `console_record_wallet_fee_debit` (idempotent) + partial unique index |
| Visit clinical writes (`visitsService:531-673`) | **new** `console_update_visit` / `console_complete_visit` / `console_cancel_visit` / `console_mark_visit_no_show` |
| Medical array read-modify-write (`medicalProfilesService:186-352`) | **new** `console_mutate_medical_profile_array` (SQL array ops) |
| `reserveBed()` random string (`emergencyResponseService:169`) | **new** real bed-reservation RPC |
| `createProfile`/`submitOnboarding` direct INSERT (`profilesService:300`, `onboardingService:239`) | invite Edge Function / `console_onboard_organization` RPC — console should not INSERT canonical rows |

### C · [NEEDS-RLS/SCHEMA] — owned by `ivisit-app` (careful — must not break the patient app)

| Gap | Table | Fix |
|---|---|---|
| **No operator SELECT** → console sees only its own rows (the "all rows = admin" symptom) | `visits`, `medical_profiles` | add admin/org-scoped `SELECT` policy **or** route operator reads through `SECURITY DEFINER` RPCs |
| No write policy at all | `hospitals`, `organizations`, `payments`, `wallet_ledger`, `subscribers` (UPDATE/DELETE) | keep RPC-only (preferred) — these are correctly closed; the console just needs to stop writing them directly |
| Financial/other tables **not in `supabase_realtime`** | `wallet_ledger`, `organization_wallets`, `ivisit_main_wallet`, `insurance_billing`, `subscribers`, `profiles` | add to the publication so console realtime can subscribe |
| **Schema drift** — console reads columns that never shipped | `insurance_policies` (`status/verified/plan_type/expires_at/coverage_percentage/coverage_details`), `profiles` (`status/suspended_at/verification_status/verified_at/…` used by `adminService`) | add the columns app-side **or** realign the console projection to the real schema |
| No `CHECK` on status → free-text drift | `visits.status` (console writes `'no-show'`/`'completed'`; app writes `'upcoming'`/`'active'`) | one canonical enum + `CHECK` |
| No distinct **rejected** state | provider verification (`profiles.bvn_verified` bool only) | add `verification_status` + reason, or a review table |
| No idempotency key on ledger | `wallet_ledger` | partial unique index `(reference_id, transaction_type) WHERE reference_id IS NOT NULL` |

---

## 4. RPC drafts to author in `ivisit-app` (signatures, mirroring `update_hospital_by_admin` / `console_complete_emergency`)

All: `SECURITY DEFINER`, `p_`-args, `JSONB {success,…}` return, guard via `p_is_admin()`/`p_get_current_org_id()`/service-role, then `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated, service_role;`

```sql
console_verify_provider(target_user_id uuid, approved boolean) returns jsonb
console_record_wallet_fee_debit(p_payment_id uuid) returns jsonb   -- idempotent on (reference_id, transaction_type='debit') under FOR UPDATE
console_update_visit(p_visit_id uuid, p_payload jsonb) returns jsonb
console_complete_visit(p_visit_id uuid, p_summary text, p_prescriptions text[]) returns jsonb
console_cancel_visit(p_visit_id uuid, p_reason text) returns jsonb          -- appends to notes
console_mark_visit_no_show(p_visit_id uuid) returns jsonb                   -- whitelisted status
console_mutate_medical_profile_array(p_user_id uuid, p_field text, p_operation text, p_value text) returns jsonb  -- field whitelist; array_append/array_remove + dedup
console_reserve_bed(p_hospital_id uuid, p_request_id uuid) returns jsonb    -- real inventory, replaces Math.random()
-- reuse existing: update_profile_by_admin, update_hospital_by_admin, delete_user_by_admin, delete_hospital_by_admin
```

These SQL drafts should land as a new `ivisit-app/supabase/migrations/<ts>_console_boundary_rpcs.sql` (14-digit-timestamp + REVOKE/GRANT convention), reviewed and deployed by the schema owner — **not** as a parallel console schema.

---

## 5. Phased remediation plan

1. **Phase 1 — Frontend-safe (console repo, now, reversible):** the entire §A list. Kills the 406 crashes, un-masks the failures, wires the already-published realtime, fixes the dead KPIs and the silent-failure layer. **No DB change, cannot break `ivisit-app`.**
2. **Phase 2 — RPC boundary (draft here, deploy in `ivisit-app`):** author the §4 RPCs; rewire the §B console paths to call them (behind the same `.maybeSingle()` guards). Reuse `update_hospital_by_admin`/`update_profile_by_admin` where they already exist.
3. **Phase 3 — Schema/RLS (owned by `ivisit-app`, careful):** the §C policies/columns/publication/enum. Each reviewed against the patient app so no existing access is weakened.

---

## 6. Recommendation on the parked question

**Do Phase 1 now** (frontend-safe: `.maybeSingle()` pass + realtime wiring + un-masking), and **draft the Phase 2 RPCs as a reviewable `ivisit-app` migration** without deploying them. Hold Phase 3 (RLS/schema) for the `ivisit-app` owner's review. This makes the console fail gracefully and surface *why* immediately, wires the realtime that needs no DB change, and hands the schema owner a precise, mirror-the-existing-pattern spec — with zero risk to the patient app.

---

## 7. Reuse-first execution — modify what exists, delete dead code, create almost nothing

**Governing principle:** every fix below either (i) re-points a call to an **RPC/pattern/subscription that already exists** in the codebase, or (ii) **deletes dead/redundant code**. New SQL is authored **only** where nothing equivalent exists, and always by mirroring an existing function. No new client abstractions, no parallel contexts, no duplicate services.

### 7.1 · Reuse existing RPCs — change the console call site only (ZERO new SQL)

The two most severe buckets (Identity 406s + all hospital writes) need **no new database code** — the RPCs already exist and are already used elsewhere in this repo:

| Broken console path | Existing RPC to reuse | Template already in repo |
|---|---|---|
| `verifyProvider` (`verificationService:194`), `verifyProfileBVN` (`profilesService:472`), `adminService.changeUserRole` (`:377`) | **`update_profile_by_admin(target_user_id, {bvn_verified / role})`** | `profilesService.updateProfile:392` already calls it |
| `verifyOrganization` (`orgVerificationService:151`), hospital `approve/reject/assign` (`hospitalImportService:146-207`), `updateHospitalBedCount/Status` (`hospitalsService:498,522`), `hospitalImportService.updateHospital:246` | **`update_hospital_by_admin(id, {verification_status, verified, available_beds, status})`** | `hospitalsService.updateHospital:417` already calls it |
| `adminService.deleteUser` (`:343`) | **`delete_user_by_admin`** | exists, unused |

Action: delete the raw `.from('…').update(...).eq('id',…).select().single()` bodies and replace with the RPC call + `.maybeSingle()` guard. This fixes the **live 406** and every hospital-write P0 with **no migration**.

### 7.2 · Reuse existing patterns — copy in-repo, add no new abstraction

| Need | Copy from (exists) | Apply to |
|---|---|---|
| Non-owner reads that don't 406 | `AuthContext:66` (`.maybeSingle()` + null-handling) | every `.single()` in §3A |
| Error handling that distinguishes denied vs failed | `analyticsService:33-58` (`{data, error, kind}`) → feed the **existing** `markDomainError` (`PageDataContext:186`); surface via the **existing** `errorHandler.handleError` at the UI layer | all `[]`/`null`/zero-masking reads |
| Write column allowlist | `ambulancesService.updateAmbulance:369` (`VALID_COLUMNS`) | `hospitalImportService.updateHospital`, `doctorsService.updateDoctor` |
| Realtime wiring | the hub's own emergency effect (`PageDataContext:709-721`) + **existing** `subscribeToAllAmbulances` | add `hospitals`/`ambulances`/`payments`/`user_activity` channels (tables already published) |

### 7.3 · Delete dead / redundant code (directly addresses "lots of dead code")

| Delete | Where | Why it's dead/redundant |
|---|---|---|
| `backfillMissingFeeLedger` client ledger write | `walletService:474-500` | `approve_cash_payment` **already writes the fee debit** — this is a redundant, double-debit-prone duplicate. Delete; if legacy rows truly lack it, a one-off admin backfill, not a live client path. |
| All `mock*Data` + `useMockData` branches | `PageDataContext:22-135, 174, 210-636, 1014-1022` | `useMockData` is never set true → unreachable, except the live leak at `:174` (init `verificationData` → `null`). Replace with the existing `domainErrors` empty/error states. |
| One duplicate subscriber service | `subscribersService.js` vs `subscriptionService.js` | split-brain over one table — consolidate to one, delete the other. |
| Dead KPI counters | `PageDataContext:426-429`, `driverManagementService:108` | `on_route`/`busy` aren't valid ambulance statuses → always 0. Map to real (`en_route`) or remove. |
| Redundant infra | `supabase.js:22` (2nd `subscribeToTable`), unused `withRetry`/`withAudit` (`supabaseHelpers`), orphaned `SidebarTrigger.jsx`, dead ETA calc (`emergencyResponseService:182`) | never consumed / superseded. |
| `reserveBed` random-string fabrication | `emergencyResponseService:169-177` | invents facility truth. Delete the `Math.random()`; wire to a real bed source or gate the feature off until one exists. |

### 7.4 · Create new ONLY where nothing exists (mirror the existing pattern)

These are the **only** genuinely-new artifacts — each mirrors an existing function, so they don't introduce a new style:

| New RPC (in `ivisit-app`) | Mirrors | Because |
|---|---|---|
| `console_update/complete/cancel/mark_no_show_visit` | `console_complete_emergency` | no visit-write RPC exists (only `rate_visit`) |
| `console_mutate_medical_profile_array` | `update_hospital_by_admin` array handling | no medical-array RPC exists |

Everything else reuses §7.1's existing RPCs. No new client-side context/util/service is created.

### 7.5 · Schema/RLS — extend the existing objects, don't fork them

- **Extend** the existing `visits`/`medical_profiles` `SELECT` policies with an admin/org clause (amend the policy, don't add a parallel one) — this is what makes operators see clinical data (the "all rows = admin" fix).
- **Extend** the existing `supabase_realtime` publication loop (`automations.sql`) with the missing tables.
- **Align** `insurance_policies`/`profiles` to what the console already reads: add the missing columns **or** realign the console projection — choose whichever removes console dead code rather than adds it.

**Net:** ~2 new RPCs, ~0 new client abstractions, and a sizable **deletion** of dead mock/duplicate/redundant code. The bulk of the P0/P1 set is fixed by re-pointing calls to RPCs that already exist and copying three in-repo patterns.
