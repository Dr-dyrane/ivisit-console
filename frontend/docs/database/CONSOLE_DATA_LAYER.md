# Console Data Layer — Best-Practices & Finalization

**Created 2026-07-08.** The single reference for how the console talks to Supabase, so the data layer is codified + guarded and UI/UX can be the only thing you actively design. Grounded in `DATA_SYNC_REMEDIATION_AUDIT.md` (+ its §8 reconciliation), the four `backend-research/*` docs, `ivisit-app/supabase/docs/CONTRIBUTING.md`, and the live grand schema (`src/types/database.ts`).

---

## 0. The settled architecture (facts, verified)

- **One shared Postgres**, project `dlwtcmhdzoklveihuhjf`, owned by `ivisit-app`. The console reads/administers it; it does **not** own canonical patient/clinical/financial truth ("no parallel truth").
- **The console has its own service + edge layer** on that same project: `frontend/supabase/functions/` (`invite-user`, `check-user`, `unsubscribe`, `discovery`, `payments`, `webhooks`) + `frontend/src/services/*`. `frontend/supabase/*` (migrations/docs/types) is a **synced mirror** of `ivisit-app` via `sync_to_console.js` — the console never authors migrations.
- **Schema truth = `src/types/database.ts`** (4414 lines, generated from live). NEVER infer columns from the pillar migrations — they lag the live DB (e.g. `insurance_policies` is 19 live cols vs 10 in the stale pillar). If in doubt, grep `database.ts` or the live probe `ivisit-app/docs/audit/inventory/live_schema_inventory_latest.json`.
- **RLS is the only real guard.** Owner-scoped by default (`auth.uid() = user_id`); operators write past it only through **SECURITY DEFINER RPCs**.
- **The global schema is the source of truth → the UI is decoupled from it.** `database.ts` (types) + the service-layer projections are the seam. Today those projections are `visitRowProjection` + `buildEmergencyRenderProjection` (Pass 1 output); the generalized `recordIdentity` normalizer referenced across the design docs is **not yet built** — it's the L1.5 target in `../architecture/CONSOLE_LAYER_MODEL_PLAN.md`. The stable `{primary, secondary, status, meta}` shape is the contract regardless. The UI binds to those projections and typed contracts, **never to raw columns or query shape**. So a schema change flows `live DB → database.ts → services/projections` and stops there — the UI never has to know. That's why Session 1 (UI/UX) is data-constraint-free: it designs against a stable contract, not the database.

---

## 1. The narrow best-practices (memorize these — everything else follows)

### Reads
1. `.maybeSingle()`, **never `.single()`**, on any row that can return 0/many under RLS. `.single()` on 0 rows → PGRST116/HTTP 406 (the crash we fixed). Guard the null.
2. Wrap reads in **`withRetry`** (from `services/supabaseHelpers.js` — canonical, must stay in sync with the app). Reads retry 3×; they're idempotent.
3. **Validate UUIDs before querying**: `if (!isValidUUID(id)) return null;` (`isValidUUID` from `lib/utils.js`; resolve display→uuid via `displayIdService.resolveEntityId`). Display IDs are labels, never write keys.
4. **Silent Guarding (required, not masking):** restricted modules (Analytics/Activity/Admin/Finance) return empty/neutral on a client role check — `if (user?.role === 'patient') return [];` — to avoid 400 log spam. Keep these. (Distinct from swallowing a *real* error, which you must not do — see Errors.)
5. Paginate — never `SELECT *` without `.limit()`/range.

### Writes
6. **Never write a canonical shared table directly** (`profiles`, `visits`, `medical_profiles`, `hospitals`, `organizations`, `wallet_ledger`, `payments`). Route through a **SECURITY DEFINER RPC**. Reuse existing ones first:
   - profile/verify/role → `update_profile_by_admin` · delete user → `delete_user_by_admin`
   - hospital/org verify/bed/status → `update_hospital_by_admin`
   - cash/fee → `approve_cash_payment` / `process_cash_payment` (fee debit already handled — don't duplicate it client-side)
   - medical arrays → extend `update_medical_profile` (don't add a parallel fn)
7. **Column allowlist** on every update payload (copy `ambulancesService.updateAmbulance`'s `VALID_COLUMNS`). Never forward an arbitrary object.
8. Wrap critical mutations in **`withAudit(scope, entity, fn, meta)`**. `wallet_ledger` is append-only + logs synchronously.
9. Never let the client set `id` on insert (DB defaults `gen_random_uuid()`).

### Realtime
10. Subscribe **scoped** (`filter: 'id=eq.<id>'` or `user_id`), **never a whole table**; always `removeChannel` on cleanup; fall back to polling after 3 reconnect fails. Wire domain channels into the hub (`PageDataContext`) for the published tables; unpublished tables (`wallet_ledger`, `organization_wallets`, `subscribers`, `insurance_billing`) need an app-side publication add first.

### Errors (the one masking rule)
11. A **role guard `[]` is fine** (rule 4). A **failed/denied query rendered as empty is not.** Return `{ data, error, kind }` (denied vs failed) — the `analyticsService.js` model — and surface it via the existing `markDomainError`/`errorHandler.handleError`. Never `catch → return []` on a real error.

### Schema & change discipline
12. Truth is `database.ts` + the live probe. Any schema/RPC/RLS change lands in the **`ivisit-app` pillar file** (never a fix migration) → psql/Dashboard delta → hardening + cleanup gates → `migration repair --status reverted` → `sync_to_console.js`. **Never `db reset`.** (Full SOP: `backend-research/04_EDGE_FUNCTIONS_AND_CHANGE_SOP.md`.)

---

## 2. Finalization checklist ("done" = every box ticked)

### A. Frontend-safe (console repo only, no DB change — a session can run these)
- [ ] `.single()` → `.maybeSingle()` sweep on non-owner reads (verify-provider done; audit the rest).
- [ ] Adopt `withRetry` on reads, `withAudit` on critical mutations, `withTimeout` on RPCs (they're canonical + currently under-used). Drop the duplicate `subscribeToTable` in `lib/supabase.js`.
- [ ] Finish the realtime hub wiring (hospitals/ambulances/payments/activity landed; confirm cleanup + invalidation).
- [ ] Error model: convert real-error `[]`/`null` swallows to `{data,error,kind}` + `markDomainError`; **keep** the Silent-Guard role `[]`s.
- [ ] `adminService`: stop reading phantom `profiles` columns (`status`/`suspended_at`/`verification_status`) — gate those features off until the columns exist app-side.
- [ ] Consolidate the duplicate `subscribersService`/`subscriptionService`; delete the dead mock-data machinery in `PageDataContext` (unlock its 3 contract locks first).
- [ ] **Drop from the plan (false alarm):** insurance schema drift — `database.ts` confirms all columns are live.

### B. Backend-owned (`ivisit-app` pillars + deploy — needs your DB creds / the SOP)
- [ ] **Operator SELECT on `visits` + `medical_profiles`** (the "you only see your own visits" root cause) — add an OR-clause mirroring the `emergency_requests` SELECT policy (owner OR admin OR org-scope) in `0007_security`. Decide whether `viewer` may read.
- [ ] The new RPCs from `PROPOSED_CONSOLE_BOUNDARY_RPCS.sql` — placed **into the pillars** (`0100_core_rpcs`/`0003_logistics`/`0001_identity`/`0004_finance`), guarded via `p_is_admin()`/inlined role-list per house style; visit clinical writes + wallet-fee-debit + hospital-assign.
- [ ] `update_hospital_by_admin` array-COALESCE fix (so it stops needing the console-side array-resend workaround).
- [ ] Publication additions (`wallet_ledger`/`organization_wallets`/`subscribers`/`insurance_billing`); `visits.status` CHECK.
- [ ] Two incidental leaks flagged: `get_org_stripe_status` / `check_cash_eligibility` granted to any authenticated user.

---

## 3. The guardrail (so it STAYS finalized — this is what lets you ignore data)

`ivisit-app` already ships per-table **surface-field guards** (`npm run hardening:<table>-surface-field-guard` for visits/profiles/insurance/medical-profiles/hospitals/…) + `hardening:contract-drift-guard` + `hardening:table-field-runtime-coverage`. **Adopt these as a console CI check** (run the relevant guards against the console's service field-usage). Then any future drift — a service reading a column that isn't live, an unguarded direct write, a `.single()` regression — fails CI automatically. You don't police it; the guard does.

Add one console npm script (e.g. `check:data-contract`) that runs the surface-field guards for the console's active tables, and wire it into the existing `npm run build`/hardgate gate.

---

## 4. What you own going forward

**UI/UX + the design system.** The data layer is: one shared DB (truth = `database.ts`), writes via reused RPCs, reads via `withRetry`+`.maybeSingle()`, errors classified not masked, realtime scoped, changes only through the `ivisit-app` pillar SOP — all guarded by the surface-field checks. Anything data-shaped a new feature needs is either an existing RPC (reuse) or a pillar change (SOP + your deploy). Nothing in this file should require your attention again unless a guard fails.
