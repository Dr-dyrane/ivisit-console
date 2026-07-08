# 04 — Edge Function Index + Safe-Change SOP (Backend Research)

> READ-ONLY research. Shared schema + edge functions are owned by `ivisit-app`
> (`C:\Users\Dyrane\Documents\GitHub\ivisit-app`). This console repo reads,
> approves, and administers that truth — it does not invent parallel truth.
> Every claim below cites `path:line` against the `ivisit-app` tree unless the
> path is explicitly `frontend/...` (this console repo).

**Runtime:** Deno edge functions, served via `Deno.serve` / `std@0.168.0`
`serve()`. Deployed to the shared Supabase project. Public base:
`https://<ref>.supabase.co/functions/v1/<name>`.

**Two edge-function estates exist.** The functions catalogued in SCOPE A live in
`ivisit-app/supabase/functions/`. The console ALSO invokes a *second* set that
does NOT exist in that folder — `invite-user`, `check-user`, `sendWelcome`,
`sendCustomEmail`, `sendBulkEmail`, `unsubscribe`. Those are deployed from a
different source and are out of scope here (flagged at the end).

---

## SCOPE A — Edge Function Index

### Shared plumbing (`supabase/functions/_shared/`)

The auth/HTTP/env contract every function inherits:

| Helper | File:line | Behavior |
|---|---|---|
| `getEnv(...names)` | `_shared/env/env.ts:1` | First non-empty of the named env vars (tries `SUPABASE_URL` then `EXPO_PUBLIC_SUPABASE_URL`, etc.). |
| `getBooleanEnv(fallback, ...names)` | `_shared/env/env.ts:9` | Truthy set = `1/true/yes/on/enabled`. |
| `createServiceClient()` | `_shared/supabase/clients.ts:4` | Service-role client (bypasses RLS) from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. |
| `createUserClient(authHeader)` | `_shared/supabase/clients.ts:18` | Anon client with caller's `Authorization` header → RLS-scoped. |
| `requireAuthenticatedUser(req)` | `_shared/supabase/auth.ts:53` | Throws on missing/invalid JWT; returns `{ user, supabaseClient }`. |
| `readAuthenticatedUser(req)` | `_shared/supabase/auth.ts:89` | Non-throwing; returns `{ user|null, error }`. |
| `probeOptionalAuthHeader(req, tag)` | `_shared/supabase/auth.ts:4` | Optional auth; continues anonymously if absent/invalid. |
| `createStripeClient()` | `_shared/payments/stripe.ts:6` | Stripe SDK (`esm.sh/stripe@12`, apiVersion `2022-11-15`) keyed by `STRIPE_SECRET_KEY`. |
| `constructStripeWebhookEvent(body, sig)` | `_shared/payments/stripe.ts:18` | Verifies signature with `STRIPE_WEBHOOK_SECRET`. |
| CORS `optionsResponse()` / `jsonResponse()` | `_shared/http/cors.ts:20` / `:7` | `Access-Control-Allow-Origin: *`; every function short-circuits `OPTIONS`. |

Auth-model shorthand used in the table below:
- **service-role** = uses `createServiceClient()` (RLS-bypassing) after its own guard.
- **user-JWT required** = `requireAuthenticatedUser` (401/400 if absent).
- **user-JWT optional** = `readAuthenticatedUser` / `probeOptionalAuthHeader`.
- **role-gated** = additional `profiles.role ∈ {...}` check.
- **signature** = Stripe HMAC, no user JWT.

---

### Payments estate (`functions/payments/`)

#### `create-payment-intent` — `payments/create-payment-intent/index.ts`
- **Purpose:** Creates a Stripe PaymentIntent for emergency service checkout OR wallet top-up, and writes/updates the mirror `payments` row.
- **HTTP:** `POST /functions/v1/create-payment-intent`. Body: `{ amount, currency="usd", organization_id?, emergency_request_id?, is_top_up?, payment_method_id?, stripe_payment_method_id? }` (`:18`). Returns `{ clientSecret, paymentIntentId, customerId }` (`:280`).
- **Auth:** user-JWT required (`:16`).
- **Tables/RPCs:** resolves display IDs via `maybeResolveDisplayId` (`:38`); reads `emergency_requests` (`:52`), `payments` (pending lookup, `:64`), `organizations` (fee % + `stripe_account_id`, `:119`); inserts/updates `payments` (`:207`,`:227`,`:260`) and `emergency_requests.total_cost` (`:246`). Application fee via `organizations.ivisit_fee_percentage` default 2.5% (`:130`).
- **Console link:** **YES** — `walletService.topUpWallet` invokes it (`frontend/src/services/walletService.js:330`) for org wallet top-up. Contract-tested at `frontend/src/components/pages/WalletManagementPage.contract.test.js:155`.

#### `create-payout` — `payments/create-payout/index.ts`
- **Purpose:** Initiates a Stripe payout to a provider org (or platform) bank.
- **HTTP:** `POST /functions/v1/create-payout`. Body: `{ amount, currency="usd", organization_id }` (`:26`). Returns `{ success, payoutId, status }` (`:69`).
- **Auth:** user-JWT required **+ role-gated** — `profiles.role ∈ {org_admin, admin}`, and `org_admin` may only payout their own `organization_id` (`:22`,`:28`).
- **Tables/RPCs:** reads `profiles` (RLS client, `:16`), `organizations.stripe_account_id` (service client, `:42`); calls `stripe.payouts.create` with `stripeAccount` header for connected accounts (`:65`). DB wallet is decremented later by the webhook, not here.
- **Console link:** **YES** — `walletService.withdrawFunds` invokes it (`frontend/src/services/walletService.js:309`).

#### `manage-payment-methods` — `payments/manage-payment-methods/index.ts`
- **Purpose:** Setup-intent / list / delete / set-payout-method for a patient profile or an org customer.
- **HTTP:** `POST /functions/v1/manage-payment-methods`. Body: `{ action, organization_id?, payment_method_id? }` where `action ∈ {create-setup-intent, list-payment-methods, delete-payment-method, set-payout-method}` (`:17`,`:74`-`:113`).
- **Auth:** user-JWT required (`:15`).
- **Tables/RPCs:** resolves org display ID (`:23`); reads/writes `organizations` (`stripe_customer_id`, `payout_method_*`, `:28`,`:44`,`:103`) or `profiles.stripe_customer_id` (`:50`,`:67`); Stripe: `customers.create`, `setupIntents.create`, `paymentMethods.list/detach/retrieve`.
- **Console link:** **YES** — `walletService.createSetupIntent/listPaymentMethods/deletePaymentMethod` (`frontend/src/services/walletService.js:366`,`:379`,`:395`).

#### `billing-quote` — `payments/billing-quote/index.ts`
- **Purpose:** Deterministic FX/billing quote snapshot for the caller (display-currency conversion).
- **HTTP:** `POST /functions/v1/billing-quote`. Body: `{ amount|amount_usd, source_currency="USD", billing_country_code?, billing_currency_code? }` (`:30`). If country/currency omitted, resolves from `preferences` (`:41`).
- **Auth:** user-JWT required (`:24`).
- **Tables/RPCs:** reads `preferences` (`:41`); calls RPCs `get_billing_quote` (`:62`), `resolve_currency_for_country` (`:77`), `convert_currency_for_payment` (`:90`).
- **Console link:** **NO** (patient-app billing lane). Not invoked from `frontend/src`. Could be reused if the console ever displays multi-currency quotes.

#### `refresh-exchange-rates` — `payments/refresh-exchange-rates/index.ts`
- **Purpose:** Refreshes the finance-owned `exchange_rates` cache from a manual JSON or a configured provider.
- **HTTP:** `POST /functions/v1/refresh-exchange-rates`. No body needed; driven by env. Returns `{ success, base_currency, rate_count, source, fetched_at, stale_after }` (`:269`).
- **Auth:** user-JWT required **+ role-gated** `profiles.role ∈ {admin, org_admin}` (`:190`).
- **Tables/RPCs:** reads `profiles.role` (`:180`); upserts `exchange_rates` on `(base_currency, quote_currency)` (`:259`). Sources: `FX_MANUAL_RATES_JSON` or `FX_PROVIDER_URL` (`:194`).
- **Console link:** **NO** today. Candidate console ops action ("refresh FX rates") — it is admin/org-admin gated, matching console RBAC.

---

### Webhooks estate (`functions/webhooks/`)

#### `stripe-webhook` — `webhooks/stripe-webhook/index.ts`
- **Purpose:** The authoritative post-payment settlement lane. Turns Stripe events into DB truth.
- **HTTP:** `POST /functions/v1/stripe-webhook`. Raw body + `stripe-signature` header.
- **Auth:** **signature only** (`constructStripeWebhookEvent`, `:22`). No user JWT. Service-role DB writes.
- **Events → effects:**
  - `payment_intent.succeeded` (`:34`): top-up/non-emergency → mark `payments.status='completed'` (`:73`); emergency card → RPC `complete_card_payment` (`:89`).
  - `payment_intent.payment_failed` (`:108`): mark `failed` or RPC `fail_card_payment` (`:128`).
  - `account.updated` (`:147`): sync `organizations.is_active` from `details_submitted && payouts_enabled` (`:151`).
  - `payout.paid` (`:164`): decrement `organization_wallets.balance` OR `ivisit_main_wallet.balance`, append `wallet_ledger` row `transaction_type='payout'` (`:186`,`:194`,`:221`).
  - `payout.failed` (`:234`): logged only.
- **Console link:** **Indirect** — the console's `withdrawFunds`/`topUpWallet` rely on this webhook to reflect the result into the wallet tables (see walletService comments `frontend/src/services/walletService.js:320`,`:344`). Console never calls it directly.

---

### Discovery estate

#### `discover-hospitals` — `discovery/discover-hospitals/handler.ts` (+ two entry shims)
- **Entry points:** `discovery/discover-hospitals/index.ts:4` serves the handler; the legacy top-level `discover-hospitals/index.ts:1` just re-imports it (`import "../discovery/discover-hospitals/index.ts";`) so both function slugs resolve to one handler.
- **Purpose:** Location-based provider discovery + enrichment. Emergency mode → dispatchable hospitals; explore mode → category providers (labs/pharmacies/clinics) via Mapbox/Google fallback and persistence back to DB.
- **HTTP:** `POST`. Body: `{ action?="discover"|"enrich_provider", latitude, longitude, radius, mode, providerCategory, ... }` (`:47`-`:120`). Rich `meta` block in response (`:287`).
- **Auth:** user-JWT **optional** (`probeOptionalAuthHeader`, `:45`); DB work via service-role.
- **Tables/RPCs:** RPCs `nearby_hospitals` (emergency) / `nearby_providers` (explore) via `fetchNearbyProviderRows` (`:147`); persists discovered rows into `hospitals` (`persistDiscoveredProviderRows`, `:238`). External: Google Places + Mapbox.
- **Console link:** **YES** — `hospitalImportService` invokes `discover-hospitals` (`frontend/src/services/hospitalImportService.js:127`,`:437`) and `HospitalModal.jsx:134` calls `${REACT_APP_SUPABASE_URL}/functions/v1/discover-hospitals` directly via `fetch`.

#### `hospital-media` — `hospital-media/index.ts`
- **Purpose:** Image proxy — 302-redirects to a hospital's best media (provider photo → stored media → hospital.image → deterministic Unsplash fallback).
- **HTTP:** `GET|HEAD /functions/v1/hospital-media?hospital_id=…|place_id=…` (`:44`,`:53`). Returns a `302` `Location` redirect (`:100`,`:155`).
- **Auth:** **none** (public image endpoint), service-role reads.
- **Tables/RPCs:** reads `hospitals` (`:66`), `hospital_media` (`:110`). Google Places photo fetch when `ENABLE_GOOGLE_PLACES` + key present (`:83`).
- **Console link:** **NO** direct invoke; the URL is embedded as an image `src` in hospital records (referenced defensively at `hospital-media/index.ts:151`).

---

### Demo / review estate

#### `bootstrap-demo-ecosystem` — `bootstrap-demo-ecosystem/handler.ts`
- **Purpose:** Deterministically builds a demo healthcare ecosystem (org, hospitals, staff, pricing, finance) for low-coverage zones. Phased: `prepare|hospitals|staff|pricing|full` (`:37`,`:84`,`:108`).
- **HTTP:** `POST /functions/v1/bootstrap-demo-ecosystem`. Body: `{ phase, userId?, latitude, longitude, radiusKm }` (`:36`-`:44`).
- **Auth:** user-JWT **optional-with-fallback** — reads user from JWT, else uses body `userId`; 401 if neither (`:50`-`:65`).
- **Tables/RPCs:** service-role writes across org/hospital/staff/pricing/finance via `_shared/domain/demo/*` (`ensureDemoOrganization` `:77`, `ensureDemoHospitals` `:114`, `ensureDemoStaff` `:120`, `ensureDemoFinancialReadiness` `:135`, `ensureDemoPricing` `:138`).
- **Console link:** **NO** (patient-app demo-coverage flow). Console must NOT invoke — it seeds patient-facing demo data.

#### `demo-approve-cash-payment` — `demo-approve-cash-payment/index.ts`
- **Purpose:** Demo-only auto-approval of a pending **cash** emergency payment (skips the human console approval step) for demo hospitals only.
- **HTTP:** `POST /functions/v1/demo-approve-cash-payment`. Body: `{ paymentId (uuid), requestId (uuid) }` (`:91`).
- **Auth:** user-JWT (non-throwing) → 401 if absent (`:82`); ownership check `emergency_requests.user_id == user.id` (`:108`); **demo-hospital gate** (`isDemoHospital`, `:141`) — refuses non-demo (`403`).
- **Tables/RPCs:** reads `emergency_requests` (`:98`), `hospitals` (`:131`), `payments` (`:148`); calls RPC `approve_cash_payment` (`:191`), then RPC `auto_assign_ambulance` for ambulance requests (`:214`).
- **Console link:** **NO** — this is the demo shortcut for the *patient* app. The console's real cash lane is RPC `process_cash_payment` / `approve_cash_payment` (see `frontend/src/services/walletService.js:409`), NOT this edge function.

#### `demo-dispatch-reply` — `demo-dispatch-reply/handler.ts`
- **Purpose:** Generates an automated dispatcher chat reply in a demo emergency chat room.
- **HTTP:** `POST /functions/v1/demo-dispatch-reply`. Body: `{ roomId, requestId, messageId }` (uuids) (`:39`-`:45`).
- **Auth:** user-JWT (non-throwing) → 401 if absent (`:34`); participant + ownership + demo-hospital gates (`:47`,`:66`,`:71`).
- **Tables/RPCs:** reads chat participants/rooms/messages + `emergency_requests` + `hospitals` via `_shared/domain/emergencyChat/demoDispatchData.ts`; inserts a reply message (`insertDemoDispatchReply`, `:102`).
- **Console link:** **NO** (patient-app demo chat).

#### `review-demo-auth` — `review-demo-auth/index.ts`
- **Purpose:** Lets app-store review testers complete OTP sign-in without mailbox access.
- **HTTP:** `POST /functions/v1/review-demo-auth`. Body: `{ email, otp }` (`:129`). Returns a real `email_otp` for the fixed review email (`:149`).
- **Auth:** **public, double-guarded** — feature flag `REVIEW_DEMO_AUTH_ENABLED` + exact email match + `REVIEW_DEMO_AUTH_OTP` match, else 404/401 (`:118`,`:124`,`:132`).
- **Tables/RPCs:** `auth.admin.listUsers/createUser/updateUserById/generateLink` (`:33`,`:71`,`:54`,`:140`); upserts `profiles` (`:90`).
- **Console link:** **NO** (store-review lane; must never be console-reachable).

---

### Console ↔ edge summary

| Function | Auth model | Console invokes? | Console caller |
|---|---|---|---|
| `create-payment-intent` | user-JWT | ✅ | `walletService.topUpWallet` |
| `create-payout` | user-JWT + admin/org_admin | ✅ | `walletService.withdrawFunds` |
| `manage-payment-methods` | user-JWT | ✅ | `walletService` (setup/list/delete) |
| `stripe-webhook` | Stripe signature | ⛓ indirect | settles wallet mutations |
| `discover-hospitals` | optional JWT | ✅ | `hospitalImportService`, `HospitalModal` |
| `billing-quote` | user-JWT | ❌ | (app billing) |
| `refresh-exchange-rates` | user-JWT + admin/org_admin | ❌ (candidate) | — |
| `hospital-media` | public | ❌ (embedded `src`) | — |
| `bootstrap-demo-ecosystem` | optional JWT + userId | ❌ (app demo) | — |
| `demo-approve-cash-payment` | user-JWT + demo gate | ❌ (app demo) | — |
| `demo-dispatch-reply` | user-JWT + demo gate | ❌ (app demo) | — |
| `review-demo-auth` | flag + email + OTP | ❌ (store review) | — |

**Out-of-estate functions the console invokes (NOT in `ivisit-app/supabase/functions/`):**
`invite-user` (`frontend/src/services/adminService.js:828`, `InviteUserModal.jsx:56`),
`check-user` (`LoginPage.jsx:72`), `sendWelcome`/`sendCustomEmail`/`sendBulkEmail`
(`subscriptionService.js:402`,`:448`,`:476`), `unsubscribe`
(`emails/ivisit106Campaign.js:92`). These deploy from a separate source; treat
their contracts as unverified here.

---

## SCOPE B — Safe-Change SOP for the Shared Live DB (no reset)

Goal: land a schema/RPC/RLS change on the **live shared Supabase DB** without a
`db reset` and without leaving a permanent fix migration. Authority:
`supabase/docs/CONTRIBUTING.md` §1/§10, `supabase/docs/TESTING.md` (cleanup gates).

### Hard gates (read first — violating any of these is a stop-the-line error)

1. **NEVER `npx supabase db reset`** on the shared DB. It destroys shared data. (Implied throughout CONTRIBUTING §1; the whole SOP exists to avoid it.)
2. **NEVER create a permanent fix migration.** Always edit the correct **core pillar** file; delete any temp/fix migration after integrating. `CONTRIBUTING.md:10`, `:191`, example `:42`.
3. **Docker is unavailable** → `npx supabase db diff` and `db dump` do NOT work. Fallback = **psql via Session Pooler** or the **Dashboard SQL Editor** to land deltas live. `CONTRIBUTING.md:16`.
4. **`db push` only runs *untracked* migrations.** Editing an already-applied pillar does NOT re-apply it — the live delta must be applied out-of-band (gate 3). `CONTRIBUTING.md:16`.
5. **Zero Side-Effect Cleanup Gate is mandatory before every commit/push.** `CONTRIBUTING.md:244`, `TESTING.md:717`.
6. **Do not merge on contract drift** (missing tables/columns/RPC signatures). `CONTRIBUTING.md:267`, guard `tests/scripts/assert_contract_drift_zero.js`.
7. **`wallet_ledger` is append-only** — never UPDATE/DELETE. `CONTRIBUTING.md:214`.

### The 11 core pillars (pick the right one to edit) — `CONTRIBUTING.md:19`
`0000_infra · 0001_identity · 0002_org_structure · 0003_logistics ·
0004_finance · 0005_ops_content · 0006_analytics · 0007_security ·
0008_emergency_logic · 0009_automations · 0100_core_rpcs`.
RLS/role changes → `0007_security` (use `p_is_console_allowed`-style helpers, not
hardcoded role strings — `CONTRIBUTING.md:378`). Location/admin/analytics RPCs →
`0100_core_rpcs`.

> All commands run from the **`ivisit-app` repo root** (that is where
> `supabase/`, `package.json` `hardening:*` scripts, and `.env` live). This
> console repo is only touched at the final `sync_to_console.js` step.

### Ordered SOP with exact commands

**Step 0 — Baseline green (before touching anything).** `TESTING.md:451`
```bash
node supabase/tests/scripts/test_runner.js comprehensive_system
npx supabase migration list          # confirm remote history is clean
```

**Step 1 — Edit the correct core pillar file** (never a new fix file). `CONTRIBUTING.md:10`,`:191`
```
# e.g. add column / RPC / RLS policy directly inside:
supabase/migrations/20260219000100_identity.sql        # identity pillar
# or 20260219010000_core_rpcs.sql, 0007_security pillar, etc.
```

**Step 2 — Land the delta on the LIVE DB (Docker-free).** The pillar is already
applied, so `db push` will not re-run it. Apply the exact delta via ONE of: `CONTRIBUTING.md:16`
```bash
# Option A — psql via Session Pooler (recommended, scriptable)
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
  -f /path/to/just-the-delta.sql
# Option B — paste the delta statement into Supabase Dashboard → SQL Editor and run.
```
Notes:
- The delta SQL must be **idempotent** (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + `CREATE POLICY`) so it matches what the edited pillar now declares.
- Alternative (only if the change can be expressed as a *new untracked* migration you will delete afterward): create a **TEMP dated migration**, `npx supabase db push` (add `--db-url "<session-pooler-url>"` if the IPv6 :5432 push times out — `CONTRIBUTING.md:15`), then remove it in Step 6.

**Step 3 — Verify the delta actually landed (Docker-free confirm).** `CONTRIBUTING.md:17`
```bash
npx supabase db push       # must report "Remote database is up to date" / no drift
# or:
npx supabase db pull       # regenerate remote diff to confirm the column/RPC exists
```

**Step 4 — Run the relevant test runner + targeted guards.** `TESTING.md:36`, `CONTRIBUTING.md:288`
```bash
node supabase/tests/scripts/test_runner.js comprehensive_system
# then the guard(s) matching your change surface, e.g.:
npm run hardening:finance-rpc-contract-guard      # finance RPC edits
npm run hardening:automation-contract-guard       # 0009 automation edits
npm run hardening:edge-payments                   # payment/webhook edge edits
npm run hardening:runtime-data-integrity          # live data coherence
```

**Step 5 — Zero-Side-Effect Cleanup Gate (mandatory, in order).** `CONTRIBUTING.md:247`, `TESTING.md:717`
```bash
node supabase/tests/scripts/cleanup_test_side_effects.js      # 1) preview (review output)
npm run hardening:cleanup-apply                               # 2) apply deletes
node supabase/tests/scripts/cleanup_test_side_effects.js      # 3) re-preview → must be zero
npm run hardening:cleanup-dry-run-guard                       # 4) enforced zero-guard (fails if >0)
npm run hardening:contract-drift-guard                        # 5) enforced schema/RPC drift guard
```
`cleanup-dry-run-guard` parses the cleanup plan JSON and fails if the summed
planned side-effects `> 0` (`tests/scripts/assert_cleanup_dry_run_zero.js:81`).
`contract-drift-guard` fails on any missing table/column/required-insert-column/
RPC/stale-signature (`tests/scripts/assert_contract_drift_zero.js:28`; it also
chains `project-ref-guard`, `contract-matrix`, `tip-rpc-sql-guard` per
`package.json` `hardening:contract-drift-guard`).

**Step 6 — Delete the TEMP migration (if you created one in Step 2 Option B).** `CONTRIBUTING.md:11`,`:233`
```bash
rm supabase/migrations/<temp_timestamp>_<name>.sql
```

**Step 7 — Repair remote migration history (untrack the deleted temp).** `CONTRIBUTING.md:14`,`:234`
```bash
npx supabase migration repair --status reverted <temp_timestamp>
npx supabase migration list        # confirm the temp entry is gone, data untouched
```

**Step 8 — Sync canonical artifacts into the console repo.** `CONTRIBUTING.md:13`,`:199`
```bash
# (regenerate docs from the edited pillars first, if your change added tables/RPCs)
node supabase/scripts/generate_schema_snapshot.js     # → supabase/docs/SCHEMA_SNAPSHOT.md
node supabase/scripts/generate_api_reference.js       # → supabase/docs/API_REFERENCE.md
# (types) npx supabase gen types typescript --linked > supabase/database.ts
node supabase/scripts/sync_to_console.js              # copies migrations+docs+scripts+types → ivisit-console/frontend/supabase & src/types/database.ts
```
`sync_to_console.js` clean-overwrites the console's
`frontend/supabase/migrations`, `frontend/supabase/docs`,
`frontend/supabase/scripts`, and `frontend/src/types/database.ts`
(`scripts/sync_to_console.js:12`,`:57`,`:104`).
**Zone 1 services (`displayIdService.js`, `supabaseHelpers.js`) are NOT synced by
this script — copy manually if changed** (`CONTRIBUTING.md:70`,`:202`).

**Step 9 — Final validation (100% required).** `TESTING.md:69`, `CONTRIBUTING.md:297`
```bash
node supabase/tests/scripts/test_runner.js comprehensive_system   # 100% pass, 0 critical
npm run hardening:cleanup-dry-run-guard                           # still zero
npm run hardening:contract-drift-guard                            # still no drift
# optional broad sweep (auto-runs cleanup apply mid-run): npm run hardening:full
```

### One-glance command sequence

```bash
# 0 baseline
node supabase/tests/scripts/test_runner.js comprehensive_system
npx supabase migration list
# 1 edit the correct core pillar (no fix file)
# 2 land delta live (Docker-free): psql Session Pooler -f delta.sql  OR  Dashboard SQL Editor
# 3 confirm
npx supabase db push          # "Remote database is up to date"
# 4 tests + targeted guard
node supabase/tests/scripts/test_runner.js comprehensive_system
npm run hardening:<surface>-guard
# 5 ZERO-SIDE-EFFECT CLEANUP GATE
node supabase/tests/scripts/cleanup_test_side_effects.js
npm run hardening:cleanup-apply
node supabase/tests/scripts/cleanup_test_side_effects.js
npm run hardening:cleanup-dry-run-guard
npm run hardening:contract-drift-guard
# 6 delete temp migration (if any)
rm supabase/migrations/<temp_timestamp>_*.sql
# 7 repair remote history
npx supabase migration repair --status reverted <temp_timestamp>
# 8 regenerate docs + sync to console
node supabase/scripts/generate_schema_snapshot.js
node supabase/scripts/generate_api_reference.js
node supabase/scripts/sync_to_console.js
# 9 final validation
node supabase/tests/scripts/test_runner.js comprehensive_system
npm run hardening:cleanup-dry-run-guard
npm run hardening:contract-drift-guard
```

### Gate reminders (do not skip)
- ❌ `db reset` on shared DB · ❌ permanent fix migration · ❌ `db diff`/`db dump` (need Docker).
- ✅ edit pillar → psql/Dashboard delta → guards → cleanup gate → delete temp → `migration repair --status reverted` → `sync_to_console.js` → final validation.
- Push nothing if cleanup preview shows planned rows, or if contract-drift guard reports any missing table/column/RPC signature.

---

*Research doc — read-only. Sources cited against `ivisit-app` unless prefixed `frontend/` (this console repo).*
