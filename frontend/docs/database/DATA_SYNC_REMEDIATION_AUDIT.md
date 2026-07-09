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

---

## 8. Reconciliation with `ivisit-app/supabase/docs/CONTRIBUTING.md` (2026-07-08)

Read after the initial audit; it **overrides** several earlier recommendations. The already-shipped frontend fixes (reuse `update_*_by_admin` RPCs + `.maybeSingle()`) remain correct — they are the documented pattern. Corrections for work *going forward*:

1. **[CORRECTION] "Silent Guarding" is REQUIRED, not a bug.** §2: restricted-module services (Analytics/Activity/Admin/Finance) MUST include a client-side role check returning empty/neutral to prevent 400 log spam (`if (user?.role === 'patient') return []`). So §3A/§C "un-mask the `[]` returns / client-side role gating is a problem" is **partly wrong**: keep the **pre-query role-guard `[]`**. Only fix the **post-query error swallow** (a real RLS/network failure rendered as empty) — distinguish denied-vs-failed while preserving the silent-guard `[]` for the no-role case.

2. **[CORRECTION] `supabaseHelpers` (`withRetry`/`withAudit`/`withTimeout`/`subscribeToTable`) + `displayIdService` are canonical Zone-1 "must stay in sync" utilities that must be USED — not dead code.** Reverse the "delete dead infra" item: **ADOPT** them — reads→`withRetry` (§9 "all reads use withRetry"), mutations→`withAudit`, RPCs→`withTimeout`. Only the *duplicate* `subscribeToTable` in `supabase.js` is dropped (defer to the canonical `supabaseHelpers` one). Never re-declare `isValidUUID` inline (§2 canonical imports).

3. **[CORRECTION] The RPC proposal goes INTO the core pillar files, NOT a new migration.** §1: "Always update the core pillar file — never create fix migrations." `PROPOSED_CONSOLE_BOUNDARY_RPCS.sql` is a **review artifact only**; real placement is pillar edits — RPCs → `0100_core_rpcs`, RLS → `0007_security`, visits → `0003_logistics`, medical → `0001_identity`, wallet → `0004_finance`. The console then receives them via `node supabase/scripts/sync_to_console.js` (migrations/docs/types auto-sync app→console). **Do not author console-side migrations.**

4. **[REFINEMENT] New RPCs use centralized RBAC helpers** `p_is_admin()` / `p_is_console_allowed()` (in `0007_security`), never inline role strings (§11 RBAC Consolidation Rule).

5. **[VALIDATION] The reuse-RPC strategy is the sanctioned pattern.** §9 "SECURITY DEFINER bypasses RLS for internal logic"; §11 RPC index lists `update_profile_by_admin` + `delete_user_by_admin` as Core-RPCs "used by console profilesService.js" (exactly the verify-provider reuse). `wallet_ledger` append-only + "financial ops log synchronously" (§9) matches `console_record_wallet_fee_debit`.

6. **[PROCESS] Any schema change runs the ivisit-app testing/hardening gate** — `test_runner.js`, the Zero-Side-Effect Cleanup Gate, `hardening:contract-drift-guard` — before the console sync (`TESTING.md`). Migration test artifacts must be cleaned every time (hard gate).

---

## 9. Queued from the UI/UX lane (2026-07-08)

Found live while doing the UI/UX pass on the Requests page. **Queued, not fixed** — per user direction we finish the visual pass first, then close data-sync in a dedicated pass. Two defects, one interaction:

**Symptom (user-facing):** clicking to sort the Requests list by the **Person** column → the whole list fails with `Requests did not load` and the raw Postgres error `column emergency_requests.requester_name does not exist` is shown in the UI.

1. **[DATA-SYNC · invalid sort column]** `emergency_requests` has **no `requester_name` scalar column** — the requester name lives inside `patient_snapshot` (`Json`, `database.ts:722`). But `emergencyService.js:221` lists `'requester_name'` in the sort-field allowlist (`EMERGENCY_REQUEST_SORT_FIELDS`), and `EmergencyRequestsPage.jsx:1568` sorts the Person column by `sortKey="requester_name"`. The service then runs `.order('requester_name')` → Postgres 42703. Fix direction: drop `requester_name` from the sort allowlist and point the Person column at a real sortable scalar (e.g. `created_at`) or make Person non-sortable — a JSON sub-field can't be `.order()`ed directly. Also audit the legacy `EmergencyRequestTableView.jsx:79` (same `columnKey`, currently inactive). NOTE: `patientUtils.js:23` and `EmergencyPanel.jsx:51` only *read* `request?.requester_name` defensively (undefined-safe) — those are fine.
2. **[UX · raw error leak]** the load-error state surfaces the raw Postgres message to the user. Every route data owner should show a friendly, generic message (`Requests did not load. Try again.`) and log the raw error to the console only — never leak DB internals / SQL to end users. This applies to every page's error state, not just Requests.

Evidence: `emergencyService.js:221`, `EmergencyRequestsPage.jsx:1568`, `database.ts:722`, `views/EmergencyRequestTableView.jsx:79`.

**Addendum (2026-07-09) — phantom fields in the emergency details modal (console side CLEANED):**

3. **[DATA-SYNC · phantom columns rendered]** `EmergencyDetailsModal.jsx` rendered `request.description` as the "Situation Report" body and `request.priority` as the header badge / icon tint — but **neither `description` nor `priority` exists** on the `emergency_requests` Row type (evidence: `database.ts:698-742`; no notes/summary-ish column exists either). The description read therefore always fell through to the fallback copy, and priority was always `undefined` (empty badge, default colours; the dead branches also carried non-canon `text-red-500`/`text-orange-500` classes). **Console cleaned the dead reads** (fallback copy is now the only path; priority badge/colour branches removed, neutral defaults kept). IF the product wants situation reports or priority levels on emergency requests, that is an **ivisit-app schema/pillar decision** (new columns authored app-side per §8), not a console patch.

---

## 10. Queued from the Requests page UX audit (2026-07-09)

**Source:** Requests page UX audit (KPI/data-sync agent pass) · **Date:** 2026-07-09. **Queued, not fixed** — same rule as §9: visual pass first, data-sync closed in a dedicated pass. Three findings:

1. **[DATA-SYNC · KPI stats vs sheet Status filter — mixed scopes]** Symptom: with a FilterSheet **Status** filter applied, the KPI chip counts disagree with each other and with the list. Root cause: `getEmergencyRequestsPageStats` (`emergencyService.js:302-333`) builds a `baseFilter` that strips `kpiFilter` (`:305`) but **keeps the sheet `status` array**; the status-keyed counts (`pending`/`inProgress`/`accepted`/`arrived`/`completed`/`cancelled`, `:322`, `:328-332`) then **override** that status with their own scalar; the `active` count (`:323`) applies the KPI status set **on top of** the sheet status (two stacked `.in('status', …)` → intersection: `applyEmergencyListFilters:231-237` then `applyEmergencyKpiFilter:273`); while `total`/`bed`/`ambulance`/`critical`/`emergency` (`:321`, `:324-327`) keep the sheet status as-is. Chips are therefore computed against mixed status scopes — e.g. sheet Status=Completed → "All"/"Beds" show completed-scoped counts, "Needs attention" ignores the sheet entirely, and "Active" intersects to a degenerate near-zero scope. Fix direction: strip the sheet `status` from the stats `baseFilter` (keep search + date) **or** document that KPI stats intersect the sheet status — decide the contract, then make every count obey it.
2. **[DATA-SYNC · search cannot match patient name]** Symptom: typing a patient's name that is visibly rendered as the list's PRIMARY column returns zero results. Root cause: the search `.or()` (`emergencyService.js:251-256`) covers only `display_id`/`service_type`/`hospital_name`/`responder_name` — all real scalar columns (good) — but the rendered patient name (`EmergencyRequestsPage.jsx:1701`, via the projection's `patient_snapshot`-first priority chain, `patientUtils.js:12-31`) lives inside `patient_snapshot` JSON (`database.ts:722`), which PostgREST `.or()/.ilike` cannot query. The bare placeholders ("Search requests..." — `EmergencyRequestsPage.jsx:1590`, `MobileEmergency.jsx:299`) imply broader search than reality; the FilterSheet copy is accurate ("Search by request ID, facility, responder, or type..." — `EmergencyRequestsPage.jsx:631`). Fix direction: a server-side queryable patient-name column (e.g. generated column over `patient_snapshot`, authored app-side in the pillar files per §8) **or** align the placeholder copy with the FilterSheet's accurate wording.
3. **[DATA-SYNC · sort whitelist lists non-existent / non-sortable columns]** Symptom: none today — latent footgun. Root cause: `EMERGENCY_REQUEST_SORT_FIELDS` (`emergencyService.js:218-228`) whitelists `requester_name` (`:221`) and `requester_phone` (`:224`), which do not exist on `emergency_requests` (`database.ts:698-742`; same class as §9.1), plus `patient_location` (`:225`), which is PostGIS geography (`database.ts:721`) and not meaningfully `.order()`-able. Currently unreachable from the UI — only the `created_at` sort is exposed (`EmergencyRequestsPage.jsx:1652`; the §9 `requester_name` sortKey has since been removed) — but wiring any of the three throws a raw PostgREST column-does-not-exist error that surfaces to the user (the §9.2 leak). Fix direction: prune `requester_name`, `requester_phone`, and `patient_location` from the whitelist. Companion to §9.1.

Evidence: `emergencyService.js:218-228, 251-256, 302-333`, `EmergencyRequestsPage.jsx:626-646, 1590, 1652, 1701`, `MobileEmergency.jsx:299`, `patientUtils.js:12-31`, `database.ts:698-742`.

**Status update (2026-07-09, dedicated fix wave):**
- §9.1 + §10.3 **FIXED** — `requester_name`, `requester_phone`, `patient_location` pruned from
  `EMERGENCY_REQUEST_SORT_FIELDS` (commit `b3da13ee`); Person column already non-sortable.
- §9.2 **FIXED (Requests)** — the Requests load error now renders generic copy ("Check your
  connection and try again."); the raw error object goes to `console.error` only. Other pages
  still owe the same treatment (pattern established).
- §10.1 **FIXED** — decided contract: **the KPI chips are the status dimension** —
  `getEmergencyRequestsPageStats` strips the sheet `status` from its base filter (search/date/
  service still apply), so every chip count computes on one consistent base.
- §10.2 **console side FIXED** — toolbar placeholder now matches the FilterSheet's accurate
  wording ("Search by request ID, facility, responder, or type..."). Server-side patient-name
  search remains an ivisit-app schema decision (generated column over `patient_snapshot`).

---

## 11. Visits desktop audit (2026-07-09) — structure + data-sync + live click test

**Source:** desktop-lane Visits pass (handshake row in `tools/automation/revamp-queue.md`; contracts
set before fixes). Live click test ran as admin on localhost:3000/visits (177 records). **Queued —
fixes need the user's go.** Lane ownership per handshake: (M) = mobile-lane file, request via ledger.

### Data-sync (chain proven in code, live-confirmed where noted)

1. **[grid patient label never renders]** `VisitsPage.jsx:764` — `visit.patient?.username ||
   visit.user_id ? 'Linked' : 'Unknown'` parses as `(a || b) ? 'Linked' : 'Unknown'`; the name is
   unreachable. LIVE: every grid card shows literal "Linked". (Rail/table use the shared
   projection and are correct.)
2. **[modal vs row identity mismatch]** (M) The SAME record renders patient
   `umehchioma01@gmail.com` in row + rail but **"Demo Driver 6"** in `VisitModal`, and row date
   "May 18, 05:00 PM" vs modal "5/19/2026, 12:00:00 AM" (date/time composition drift + a
   different patient source). LIVE-confirmed. `VisitModal.jsx` is mobile-lane; flagged in ledger.
3. **[operator written as patient]** `VisitsPage.jsx:455` — `createVisit({ user_id:
   formData.user_id || user.id })`: when no patient is picked the CURRENT OPERATOR becomes the
   visit's patient. LIVE evidence: dozens of visits list the admin as patient. Drop the fallback;
   require explicit patient.
4. **[stats scope mixes sheet status]** (M) `visitsService.getVisitsPageData` keeps
   `filters.status` in `statsRows`, so state-chip counts intersect the sheet Status filter — the
   exact §10.1 class fixed on Requests. Contract decided there: chips ARE the status dimension.
   One-line fix in the service (mobile-lane); requested via ledger.
5. **[no search debounce over a heavy resolver]** every keystroke re-runs the FULL resolution read
   (up to the row limit + 4-table enrichment). Page-side 300ms debounce (Requests pattern) needed;
   service weight noted for the projection owner.
6. **[UTC day boundary]** (M) `getVisitPageStatsFromRows` computes `today` via
   `toISOString().split('T')[0]` — UTC, not local; the count flips at 1am WAT, not midnight.
7. **[raw-id title]** grid card title `Visit #${id.slice(-6)}` while the footer shows the
   display_id — display-IDs-are-labels canon; one card shows two different identifiers. LIVE.
8. **[org_admin patient dropdown empty]** create/edit fetches `getProfiles({ role: 'patient' })`;
   profiles RLS is owner-or-admin, so org_admin gets an empty patient list in the modal
   (backend-flagged class, same as Users page).
9. **[RLS truth update]** LIVE: the signed-in ADMIN sees 177 visits — the backend-research doc's
   "visits RLS owner-only, no admin clause" is stale for admin. org_admin visibility remains
   UNVERIFIED; the honest-empty operator state ships only if org_admin proves empty.
10. Cross-refs already queued: `providerIdField: 'doctor_name'` fragile string scope (persona
    matrix §6); driver nav dead-end (desktop `navigation.js`, mine per handshake).

### UI/UX canon (live-verified)

11. **[signal panel frozen at 39% opacity]** the hero + chips sit permanently dimmed after load
    (`initial={{opacity:0,y:12}}` entrance never completes; measured 0.393 opacity minutes in;
    later interaction completes it). Same family as the TodayHome M1/T4 motion-canon defect.
12. **[FilterSheet body ghost-renders]** (shared `FilterSheet` used by admitted pages — verify
    before touching) sheet opens with fields at near-zero opacity and the page bleeding through;
    only title + Reset/Apply are solid. LIVE screenshot evidence.
13. **[primary command invisible]** "New visit" lives in the auto-hiding header (off-screen at
    load — the conversion contract says it is the FIRST visible command) and when visible renders
    `color: rgb(255,255,255)` on `rgba(255,255,255,0.7)` — white on white; in another state it
    flips to a solid red pill (red-token trap).
14. **[stagger re-runs on every refetch]** chip clicks/refetches leave rows semi-transparent
    mid-stagger (`initial opacity:0 scale:0.9, delay: index*0.03`) — replace-in-place canon says
    rows never re-enter on refetch.
15. **[red tokens live]** `getStatusBadge` (info/warning/success + destructive-for-cancelled),
    rail status Badge map, `hover:bg-primary/10 hover:text-primary` on toolbar/cards/buttons,
    focused-card `bg-primary/6` + `0_24px_80px` primary glow, search focus ring primary.
16. **[structure vs Requests canon]** ViewToggle + 3 density variants vs one canonical render;
    5-wide state strip vs KPI §1.2 (max-3, pinned-while-signal, toggle-to-All — All-tap re-tap
    semantics absent); generic `TableSkeleton` instead of page-shaped skeleton; single `loading`
    boolean (no isFetching refetch pill, §1.6); mega-shadows `0_24px_70px`/`0_18px_54px` and
    arbitrary radii `rounded-[24px]/[40px]/[44px]`; legacy `squircle`/`hover-lift`/`hover-glow`
    chrome in the grid; no `aria-sort`; no Requests-style keyboard list nav; `formatDate` without
    the day-aware pattern; empty state not filter-aware; fallback vocabulary split ("Unlinked
    visit" in Hospital column vs "Unknown Facility" in Location); Cost column always "-"
    (dormant-column decision needed).

### Click-test coverage

PASSED live: state chips filter coherently (hero + list + counts agree); search-scoped stats stay
coherent (Requests contract semantics); View modal opens via ModalShell; rail selection survives
filter changes; pagination indicator honest (Page 1 of 9). NOT yet exercised: dark-mode parity,
Edit/create submit paths (no live writes during audit), pagination navigation, sort correctness
per column, keyboard-only walk.
