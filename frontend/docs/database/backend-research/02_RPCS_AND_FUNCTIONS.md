# 02 — RPCs & SQL Functions (Backend Research)

> READ-ONLY research. Shared schema is owned by `ivisit-app`. This doc catalogs every
> `CREATE OR REPLACE FUNCTION public.*` in the SCOPE files, records its guard/mutation/idempotency,
> reconciles the two generated API indices against the SQL, gives the console-should-call mapping,
> and re-verifies the "all 7 new" claim in `PROPOSED_CONSOLE_BOUNDARY_RPCS.sql` against the SQL
> (not just the docs).
>
> All citations are `path:line` into `ivisit-app/supabase/migrations/*` unless noted. Paths are
> abbreviated: `core` = `20260219010000_core_rpcs.sql`, `emlogic` = `20260219000800_emergency_logic.sql`,
> `finance` = `20260219000400_finance.sql`, `security` = `20260219000700_security.sql`,
> `autos` = `20260219000900_automations.sql`, `identity` = `20260219000100_identity.sql`,
> `orgstruct` = `20260219000200_org_structure.sql`.

---

## 0. RBAC helper definitions (the actor/role guards every write RPC leans on)

| Helper | Def | Returns | Volatility / SECDEF | Roles permitted | Notes |
|---|---|---|---|---|---|
| `p_is_admin()` | `security:5-13` | BOOLEAN | SECURITY DEFINER (no STABLE marker) | `profiles.role = 'admin'` for `auth.uid()` | Super-admin gate. Used everywhere. |
| `p_is_console_allowed()` | `security:16-25` | BOOLEAN | SECURITY DEFINER | `role IN ('admin','org_admin','dispatcher','viewer')` | **Includes `viewer` (read-tier)** — do NOT use as a write gate. Used by `get_recent_activity`, `get_activity_stats`, `process_cash_payment` read/guard paths. |
| `p_get_current_org_id()` | `security:94-99` | UUID | SECURITY DEFINER | returns `profiles.organization_id` of `auth.uid()` | Org-scoping key; used in RLS + `update_hospital_by_admin`. |
| `p_is_emergency_chat_participant(p_room_id)` | `security:27-92` | BOOLEAN | SECURITY DEFINER, `SET search_path=public` | admin, request owner, responder, explicit participant, or same-org `org_admin/dispatcher/provider` | Chat RLS predicate only. |

Two duplicate admin helpers live in `core` (not `security`): `current_user_is_admin()` (`core:412-420`, STABLE SECDEF) and its alias `is_admin()` (`core:423-428`). `current_user_permission_level()` (`core:431-439`) returns the raw role string (fallback `'user'`). The console calls `current_user_is_admin` / `current_user_permission_level` / `is_admin` — NOT `p_is_admin` directly (`adminService.js:84,98`, `profilesService.js:18`, `searchAnalyticsService.js:134`).

**Write-gate spelling that write RPCs actually use.** Most mutating RPCs do NOT call `p_is_console_allowed()` (it lets `viewer` through). Instead they inline the manager tier:
`role IN ('admin','org_admin','dispatcher')`, then org-scope `org_admin`/`dispatcher` via `p_get_current_org_id()` or an explicit `organization_id` compare. This is the canonical console write guard; the 7 proposals mirror it verbatim.

Role hierarchy (console-side, `frontend/src/config/routes.jsx`): `patient(10) < viewer(20) < provider(40) < sponsor(60) < org_admin(80) < admin(100)`. Note `dispatcher` is not in that numeric ladder but is a first-class write role in the DB guards.

---

## 1. Full RPC catalog (SCOPE files)

Legend — **Guard**: `svc?` = service_role JWT short-circuit present; `mgr` = `role IN (admin,org_admin,dispatcher)`; `admin` = `p_is_admin()` only; `owner` = `auth.uid()=subject`; `none` = no actor guard (RLS-only). **Mut** = what it writes. All are `LANGUAGE plpgsql`.

### 1a. `core` — Module 08/12/13/14 (the API/facade boundary)

| Fn (`core:line`) | Args | Returns | SECDEF / vol | Guard | Mutates | Idempotency |
|---|---|---|---|---|---|---|
| `nearby_hospitals` `11` | lat, lng, radius=15 | TABLE(15 cols) | Y / STABLE | none | — (read) | n/a |
| `nearby_providers` `78` | lat, lng, type=NULL, radius=15, limit=20 | TABLE(20 cols) | N / STABLE | RLS/invoker | — (read) | n/a |
| `nearby_ambulances` `135` | lat, lng, radius=50 | TABLE(7) | Y / STABLE | none | — (read) | n/a |
| `get_all_auth_users` `167` | p_organization_id=NULL | TABLE(15) | Y | inline `role IN (admin,org_admin,dispatcher)` `188-193` | — (reads auth.users) | n/a |
| `update_hospital_by_admin` `222` | target_hospital_id, payload JSONB | JSONB | Y | `p_is_admin() OR org owns hospital` `230-235` | `hospitals` cols + arrays | **not idempotent-safe**: arrays hard-set (see §5a bug) |
| `delete_hospital_by_admin` `287` | target_hospital_id | JSONB | Y | same as above `296-301` | DELETE `hospitals` | returns `deleted=0` if absent |
| `get_user_statistics` `317` | — | TABLE(12) | Y | none | — (read) | n/a |
| `admin_update_trending_topics` `351` | payload | JSONB | Y | `p_is_admin()` `354` | **stub** (no-op) | n/a |
| `update_trending_topics_from_search` `361` | — | JSONB | Y | none | **stub** (no-op) | n/a |
| `delete_user_by_admin` `371` | target_user_id | JSONB | Y | `p_is_admin()` `377`; self-delete blocked `382` | DELETE auth.users / profiles | reports not-found |
| `current_user_is_admin` `412` | — | BOOLEAN | Y/STABLE | — | — | n/a |
| `is_admin` `423` | — | BOOLEAN | Y/STABLE | — | — | n/a |
| `current_user_permission_level` `431` | — | TEXT | Y/STABLE | — | — | n/a |
| `search_auth_users` `444` | search_term | TABLE(6) | Y | `p_is_admin()` `454` | — (read) | n/a |
| `update_profile_by_admin` `465` | target_user_id, profile_data | JSONB | Y | `role IN (admin,org_admin,dispatcher)` `474` | `profiles` cols | present-key CASE per field |
| `notify_cash_approval_org_admins` `522` | request, payment, +6 | JSONB | Y | owner OR `role IN (admin,org_admin,dispatcher)` `551-558` | INSERT `notifications` | not idempotent (re-notifies) |
| `delete_user` `644` | — | JSONB | Y | none (uses `auth.uid()`) | DELETE own profile | n/a |
| `get_trending_searches` `655` | days_back=7, limit=10 | TABLE(4) | Y/STABLE | none | — (read) | n/a |
| `get_search_analytics` `672` | days_back=7, limit=10 | TABLE(5) | Y | `p_is_admin()` `681` | — (read) | n/a |
| `get_search_analytics_summary` `706` | days_back=7 | TABLE(5) | Y | `p_is_admin()` `715` | — (read) | n/a |
| `log_user_activity` `746` | action, +4 | JSONB | Y | none (uses `auth.uid()`) | INSERT `user_activity` | n/a |
| `get_recent_activity` `765` | limit=20, offset=0 | TABLE(8) | Y | `p_is_console_allowed()` `778` | — (read) | n/a |
| `get_activity_stats` `792` | days_back=7 | JSONB | Y | `p_is_console_allowed()` `798` | — (read) | n/a |
| `get_org_stripe_status` `816` | p_organization_id | JSONB | Y | **none** | — (read) | n/a |
| `process_cash_payment` `833` | req, org, amount | JSONB | Y | `svc? OR p_is_console_allowed()` `843` | delegates → `process_cash_payment_v2` | inherits v2 |
| `check_cash_eligibility` `853` | p_organization_id | JSONB | Y | **none** | — (read) | n/a |
| `process_wallet_payment` `870` | user, amount, req=NULL | JSONB | Y | `svc?`; self OR `mgr` + org-scope `897-918`; `FOR UPDATE` on wallet | UPDATE `patient_wallets.balance` | balance-check, not txn-idempotent |
| `calculate_emergency_cost_v2` `937` | service_type, +3 | JSONB | Y/STABLE | none | — (pricing calc) | n/a |
| `reload_schema` `1019` | — | VOID | Y | none | `NOTIFY pgrst` | n/a |
| `get_available_doctors` `1031` | hospital, specialty=NULL | TABLE(6) | Y/STABLE | none | — (read) | n/a |
| `assign_doctor_to_emergency` `1067` | req, doctor, notes=NULL | JSONB | Y | `svc?`/admin; else `role IN (org_admin,dispatcher)` + org match `1156-1172`; `FOR UPDATE` | INSERT `emergency_doctor_assignments`, UPDATE `doctors.current_patients` + `emergency_requests` | **idempotent**: same-doctor short-circuit `1200-1218` |
| `get_service_price` `1264` | service_type, hospital=NULL | TABLE(3) | Y/STABLE | none | — (read) | n/a |
| `get_room_price` `1281` | room_type, hospital=NULL | TABLE(3) | Y/STABLE | none | — (read) | n/a |
| `rate_visit` `1298` | visit, rating, comment=NULL | JSONB | Y | `WHERE user_id=auth.uid()` (owner) `1310` | UPDATE `visits.rating*` | NOT FOUND → `{success:false}` |
| `jsonb_to_point_geometry` `1325` | p_location JSONB | geometry | Y | none (helper) | — | n/a |
| `canonicalize_emergency_status` `1363` | status, default=NULL | TEXT | Y | none (helper) | — | n/a |
| `set_emergency_transition_context` `1397` | source, +5 | VOID | Y | none (helper; GRANT to `service_role` only, `core:3752`) | `set_config` GUCs | n/a |
| `console_create_emergency_request` `1432` | p_payload JSONB | JSONB | Y | `role IN (admin,org_admin,dispatcher)` `1455`; org owns hospital if non-admin `1530-1543` | INSERT `emergency_requests` | not idempotent (new row each call) |
| `console_update_emergency_request` `1585` | request_id, payload | JSONB | Y | `mgr` + org-scope | UPDATE `emergency_requests` | present-key updates |
| `console_dispatch_emergency` `1720` | request, ambulance, +7 | JSONB | Y | `mgr` + org-scope, `FOR UPDATE` on req+amb | UPDATE req (responder/status), ambulance status | guarded by status/payment preconditions |
| `console_complete_emergency` `1878` | request_id | JSONB | Y | `mgr` + org-scope | status→completed, cascade | **idempotent** `already_completed` short-circuit |
| `console_cancel_emergency` `1975` | request_id, reason=NULL | JSONB | Y | `mgr` + org-scope | status→cancelled | **idempotent** `already_cancelled` short-circuit |
| `console_update_responder_location` `2076` | request, location, heading=NULL | JSONB | Y | `mgr` + org-scope | UPDATE responder geo | n/a |
| `patient_update_emergency_request` `2181` | request, payload='{}' | JSONB | Y | owner (`auth.uid()=user_id`) `2195`, `FOR UPDATE` | UPDATE own req (triage/location/status) | transition-validated |
| `assign_ambulance_to_emergency` `2290` | req, ambulance, priority=1 | JSONB | Y | (mirrors emlogic variant) | assignment + statuses | guarded |
| `auto_assign_ambulance` `2500` | req, max_dist=50, specialty=NULL | JSONB | Y | — | picks + assigns nearest ambulance | guarded |
| `approve_cash_payment` `2593` | payment, request | JSONB | Y | (mirrors emlogic variant, see 1b) | wallet moves + status | precondition-guarded |
| `decline_cash_payment` `2829` | payment, request | JSONB | Y | — | payment declined + status | precondition-guarded |
| `discharge_patient` `2956` | request_uuid TEXT | JSONB | Y | — | bed release + visit | guarded |
| `cancel_bed_reservation` `3049` | request_uuid TEXT | JSONB | Y | — | bed cancel | guarded |
| `complete_trip` `3146` | request_uuid TEXT | JSONB | Y | — | trip complete + visit | guarded |
| `cancel_trip` `3238` | request_uuid TEXT | JSONB | Y | — | trip cancel | guarded |
| `ensure_emergency_chat_room` `3335` | request_id | JSONB | Y, `SET search_path` | `svc?` + participant logic, `FOR UPDATE OF er` | upsert chat room/participants | **idempotent** (ensure-semantics) |
| `send_emergency_chat_message` `3475` | room, body, +3 | JSONB | Y, `SET search_path` | participant guard | INSERT message | `p_client_message_id` dedupe |
| `mark_emergency_chat_room_read` `3625` | room, message=NULL | BOOLEAN | Y, `SET search_path` | participant guard | UPDATE read cursor | idempotent |
| `archive_emergency_chat_room_on_request_close` `3681` | — | TRIGGER | Y, `SET search_path` | trigger (AFTER UPDATE OF status) | archive room on completed/cancelled | idempotent |

> **NOTE — duplicate definitions.** `assign_ambulance_to_emergency`, `auto_assign_ambulance`, `approve_cash_payment`, `decline_cash_payment`, `discharge_patient`, `cancel_bed_reservation`, `complete_trip`, `cancel_trip`, `update_ambulance_status` are each defined in BOTH `emlogic` and `core`. Because migrations run in filename order, the **`core` (10000) definition wins** (it is applied last and is `CREATE OR REPLACE`). Note the signatures differ: `approve_cash_payment` is `(p_payment_id, p_request_id)` in both; `discharge_patient`/`cancel_*`/`*_trip` return `JSONB` in `core` but `BOOLEAN` in `emlogic` — the `core` JSONB shape is the live one.

### 1b. `emlogic` — Module 09/10/11 (emergency + finance-emergency + pricing)

| Fn (`emlogic:line`) | Args | Returns | Guard | Mutates | Idempotency |
|---|---|---|---|---|---|
| `get_available_ambulances` `8` | (geo args) | TABLE | none | read | n/a |
| `update_ambulance_status` `50` / `1947` | ambulance, status, location=NULL | JSONB | `mgr`/`svc?` | UPDATE `ambulances` | deterministic |
| `assign_ambulance_to_emergency` `108` | (see core — core wins) | JSONB | — | assignment | — |
| `auto_assign_ambulance` `186` | — | JSONB | — | assignment | — |
| `validate_emergency_request` `278` | payload | JSONB | none | read/validate | n/a |
| `check_hospital_capacity` `342` | hospital | JSONB | none | read | n/a |
| `calculate_emergency_priority` `394` | payload | INT/JSONB | none | read | n/a |
| `create_emergency_v4` `441` | user, request_data, payment_data=NULL | JSONB | (app path) | INSERT emergency + payment | app-owned create path |
| `complete_card_payment` `630` | (payment args) | JSONB | `svc?` | payment complete + `visits` `725` | precondition-guarded |
| `fail_card_payment` `745` | (payment args) | JSONB | `svc?` | payment failed | guarded |
| `approve_cash_payment` `838` | payment, request | JSONB | `svc?`; else `role IN (admin,org_admin,dispatcher)` + org match `917-936`; `FOR UPDATE` on payment+req+wallets | org-wallet debit + platform credit `974,979`, `wallet_ledger` inserts, `payments.metadata` fee stamp, status write | precondition (`status/payment_status`) guards double-apply |
| `decline_cash_payment` `1072` | payment, request | JSONB | same tier | payment declined + status | guarded |
| `process_cash_payment_v2` `1182` | req, org, amount, currency='USD' | JSONB | `svc?`/console | payment + wallet path | guarded |
| `discharge_patient`/`cancel_bed_reservation`/`complete_trip`/`cancel_trip` `1290/1350/1411/1471` | request_uuid TEXT | BOOLEAN (core JSONB wins) | — | bed/trip lifecycle + `visits` `994,1174` | guarded |
| `update_hospital_availability` `1531` | hospital, beds, wait, status, amb_count | BOOLEAN | `svc?`; else `mgr` + org-scope `1556-1575`, `FOR UPDATE OF h` | UPDATE `hospitals` availability | last-writer-wins |
| `upsert_service_pricing` `1661` | payload JSONB | JSONB | `svc?`; else `mgr`; `org_admin/dispatcher` need hospital_id + org match; **global (hospital_id NULL) pricing = admin only** `1699-1711` | UPSERT `service_pricing` | ON CONFLICT(hospital_id,service_type) |
| `upsert_room_pricing` `1733` | payload | JSONB | same as above | UPSERT `room_pricing` | ON CONFLICT(hospital_id,room_type) |
| `delete_service_pricing` `1805` | target_id | JSONB | same tier + org-scope | DELETE `service_pricing` | not-found guard |
| `delete_room_pricing` `1858` | target_id | JSONB | same tier + org-scope | DELETE `room_pricing` | not-found guard |
| `enforce_emergency_status_write_path` `2074` | — | TRIGGER | trigger | blocks direct status writes | n/a |
| `log_emergency_status_transition` `2097` | — | TRIGGER | trigger | INSERT `emergency_status_transitions` | n/a |
| `is_valid_emergency_status_transition` `2203` | from, to | BOOLEAN | none/IMMUTABLE-ish | read | n/a |
| `validate_emergency_status_transition` `2235` | — | TRIGGER | trigger | rejects illegal transitions | n/a |

### 1c. `finance` — Module (payments/wallets/currency)

| Fn (`finance:line`) | Args | Returns | Guard | Mutates | Notes |
|---|---|---|---|---|---|
| `process_payment_distribution` `166` | — | TRIGGER | trigger | `wallet_ledger` inserts `236,266` | AFTER payment settle |
| `process_wallet_payment` `294` | (see core — core wins) | JSONB | — | `patient_wallets` | core def is live |
| `process_visit_tip` `438` | visit, tip_amount, currency='USD' | JSONB | owner (`auth.uid()=visit.user_id`) `478` | `patient_wallets`, `wallet_ledger` `404`, `visits.tip_*` `595` | idempotent: `tip already processed` `482` |
| `record_visit_cash_tip` `614` | (tip args) | JSONB | owner | `visits` `718`, `wallet_ledger` `571` | guarded |
| `validate_payment_method` `754` | (args) | JSONB | none | read | n/a |
| `get_fallback_payment_options` `790` | (args) | JSONB | none | read | n/a |
| `retry_payment_with_different_method` `835` | (args) | JSONB | — | payment retry | called by console `emergencyService.js:985` |
| `resolve_currency_for_country` `902` | country | TEXT | none/IMMUTABLE `959` | read | n/a |
| `get_billing_quote` `961` | (args) | JSONB | none/STABLE `1072` | read | n/a |
| `convert_currency_for_payment` `1075` | (args) | JSONB | none/STABLE `1180` | read | n/a |

### 1d. `autos` — trigger functions (no direct console call surface)

`handle_new_user` `5`, `handle_new_organization` `69`, `sync_doctor_record_from_profile` `86`, `sync_emergency_to_visit` `156` (UPDATE `visits` `207`), `auto_assign_doctor` `240`, `release_doctor_assignment` `333`, `create_insurance_billing_on_completion` `391`, `auto_assign_driver` `444`, `update_resource_availability` `537`, `handle_ambulance_unavailability_failover` `646`, `handle_doctor_unavailability_failover` `815`. All are triggers; the console never RPC-calls these — they fire as side effects of the writes above. `sync_emergency_to_visit` is the automation that materializes `visits` rows from emergency completion (relevant to visit-write proposals 1-4).

---

## 2. Docs-vs-SQL reconciliation (drift flags)

Two generated indices exist and they DISAGREE with each other and with the SQL:

**`API_REFERENCE.md`** (`ivisit-app/supabase/docs/API_REFERENCE.md`) — header says "Generated from `core_rpcs.sql`". It lists exactly the 63 `core` functions (rows `7-62`), in file order. It is faithful to `core` **but scoped only to `core`** — it omits every function in `emlogic`, `finance`, `security`, `autos`, `identity`, `orgstruct`. So the pricing RPCs (`upsert_service_pricing` etc.), `update_hospital_availability`, `approve_cash_payment`'s emlogic twin, `process_visit_tip`, and the RBAC helpers are **absent from this "API reference"** despite being console-callable. Not a bug in the SQL — a scope limitation of the doc.

**`console/api_reference.json`** (`ivisit-app/supabase/docs/console/api_reference.json`) — claims `totalFunctions: 63`, `lastSync: 2026-05-17`. This one samples ACROSS pillars (includes triggers + helpers) but is **stale and internally wrong**:

- **Missing the entire console_* emergency write surface**: `console_create_emergency_request`, `console_update_emergency_request`, `console_dispatch_emergency`, `console_complete_emergency`, `console_cancel_emergency`, `console_update_responder_location`, `patient_update_emergency_request`, `assign_ambulance_to_emergency`, `auto_assign_ambulance`, and all 4 chat RPCs — **none appear**, yet the console actively calls them (`emergencyService.js`, `driverManagementService.js`, `bedManagementService.js`, `emergencyResponseService.js`). Major drift.
- **Wrong file attribution**: it lists `upsert_service_pricing`, `update_hospital_availability`, the cash-payment RPCs, etc. as living in `20260219000800_emergency_logic.sql`. They ARE defined there, but the **live winning definitions are in `core` (10000)** for the cash/ambulance/trip set (last-applied). The JSON never notes the `core` duplicates.
- **Signature drift vs SQL**: JSON shows `get_all_auth_users()` (no args) but SQL is `get_all_auth_users(p_organization_id UUID DEFAULT NULL)` (`core:167`). JSON shows `get_trending_searches(p_limit INTEGER DEFAULT 10)`, `get_search_analytics(p_days ...)`, `get_recent_activity(p_limit ...)`, `get_activity_stats(p_days ...)`, `update_profile_by_admin(..., payload JSONB)` — but SQL uses `days_back/limit_count/offset_count` and `profile_data` (`core:655,672,765,792,465`). The JSON param names are wrong; **the console calls by positional/named args must follow the SQL, not this JSON.**
- **`update_hospital_availability` arg name**: JSON says `status TEXT`; SQL renamed it to `p_status TEXT` to avoid column ambiguity (`emlogic:1535`). Callers must pass `p_status`.

**Verdict:** neither generated index is authoritative for console integration. `API_REFERENCE.md` is correct-but-partial (core-only). `console/api_reference.json` is broad-but-stale/wrong (missing console_* writes, wrong sigs). **Trust the migration SQL.** Recommend the app owner regenerate both indices; flag to them that the console_* emergency RPCs and the pricing/availability RPCs must be included with correct signatures.

---

## 3. Console-should-call catalog (reuse existing RPCs; per write domain)

Grounded in the console's current `.rpc()` usage (verified in `frontend/src/services/*`). "Already wired" = the console already calls it today.

| Console write need | RPC to call (existing) | Cite | Console caller today |
|---|---|---|---|
| **Verify / approve org & profile** | `update_profile_by_admin(target_user_id, profile_data)` | `core:465` | `verificationService.js:210`, `profilesService.js:394,479` ✅ |
| Admin-check gating | `current_user_is_admin` / `current_user_permission_level` / `is_admin` | `core:412/431/423` | `adminService.js`, `profilesService.js` ✅ |
| **Profile** edits (admin) | `update_profile_by_admin` | `core:465` | ✅ |
| User stats / search | `get_user_statistics`, `search_auth_users`, `get_all_auth_users` | `core:317/444/167` | `profilesService.js` ✅ |
| Delete user | `delete_user_by_admin` | `core:371` | (admin flows) |
| **Hospital** edit | `update_hospital_by_admin(id, payload)` | `core:222` | `hospitalsService.js:426,509,545`, `hospitalImportService.js:101`, `orgVerificationService.js:162` ✅ |
| Hospital delete | `delete_hospital_by_admin` | `core:287` | `hospitalsService.js:445` ✅ |
| Hospital availability (beds/wait/status) | `update_hospital_availability(id, beds, wait, p_status, amb)` | `emlogic:1531` | (bed mgmt) |
| Hospital → org_admin assignment | **NO EXISTING RPC** → proposal #7 | — | gap (see §4) |
| **Visit** create | (app path `create_emergency_v4` / console direct insert) | `emlogic:441` | `visitsService.createVisit` (direct) |
| Visit edit/complete/cancel/no-show | **NO console RPC** — console writes `visits` directly | — | `visitsService.js:553,593,654` (direct `.update`) → proposals #1-4 |
| Visit rating (patient) | `rate_visit` | `core:1298` | app-side |
| **Medical profile** whole-object write | `update_medical_profile(user, jsonb)` — **EXISTS** | `identity:503` | see §4/§5 nuance |
| Medical profile per-array add/remove | console does read-modify-write in JS | — | `medicalProfilesService.js:188-332` → proposal #5 |
| **Wallet** cash approve (does fee debit) | `approve_cash_payment(payment, request)` | `core:2593`/`emlogic:838` | `emergencyService.js:812` ✅ |
| Cash decline | `decline_cash_payment` | `core:2829` | `emergencyService.js:846` ✅ |
| Cash process (legacy) | `process_cash_payment` → `process_cash_payment_v2` | `core:833`/`emlogic:1182` | `walletService.js:409` ✅ |
| Wallet/stripe status, eligibility | `get_org_stripe_status`, `check_cash_eligibility` | `core:816/853` | `walletService.js:354,427` ✅ |
| Standalone fee-debit reconcile | **NO EXISTING RPC** → proposal #6 | — | gap (see §4) |
| Patient wallet debit | `process_wallet_payment` | `core:870` | app path |
| **Subscriber** | (no dedicated write RPC; RLS INSERT policy `security:391`) | — | direct insert under RLS |
| **Emergency** create/update/dispatch/complete/cancel/locate | `console_create_/update_/dispatch_/complete_/cancel_emergency`, `console_update_responder_location` | `core:1432-2180` | `emergencyService.js`, `driverManagementService.js`, `bedManagementService.js`, `emergencyResponseService.js` ✅ |
| Doctor assign to emergency | `assign_doctor_to_emergency` | `core:1067` | (dispatch flows) |
| Ambulance assign | `assign_ambulance_to_emergency` / `auto_assign_ambulance` | `core:2290/2500` | dispatch |
| **Pricing** service/room upsert+delete | `upsert_service_pricing`, `upsert_room_pricing`, `delete_service_pricing`, `delete_room_pricing` | `emlogic:1661-1909` | `pricingService.js:226,236,256,266` ✅ |
| **Activity** log/read | `log_user_activity`, `get_recent_activity`, `get_activity_stats` | `core:746/765/792` | `activityService.js` ✅ |
| **Search analytics** | `get_search_analytics`, `_summary`, `get_trending_searches` | `core:672/706/655` | `searchAnalyticsService.js`, `searchService.js` ✅ |

Everything the console needs for verify / profile / hospital / emergency / pricing / wallet / activity **already has a reuse RPC**. The only genuine gaps are the visit-lifecycle writes, the medical-profile array mutation, the hospital→org_admin assignment, and standalone fee reconciliation — i.e. the 7 proposals.

---

## 4. Re-verification of the "all 7 new" claim (against SQL, not docs)

Method: independent grep across ALL migration files for any function that (a) has a matching name stem, or (b) mutates the target table/column. Results:

| # | Proposed fn | Existing fn touching same table/op? | Verdict |
|---|---|---|---|
| 1 | `console_update_visit(uuid, jsonb)` | `UPDATE public.visits` appears only in: `rate_visit` (rating only, `core:1305`), tip fns (`finance:595,718`), emergency-lifecycle status writes (`emlogic:994,1174`; `core:2775,2947`), and trigger `sync_emergency_to_visit` (`autos:207`). **None is a general console visit column-edit.** | **NEW** ✅ |
| 2 | `console_complete_visit(uuid, text, text[])` | Visit status→`completed` is written only inside emergency/trip completion (`complete_card_payment` `emlogic:725`, `complete_trip`) and the sync trigger. No standalone visit-complete RPC. | **NEW** ✅ |
| 3 | `console_cancel_visit(uuid, text)` | Same — cancel is emergency-driven (`emlogic:1174`), never a standalone visit RPC. | **NEW** ✅ |
| 4 | `console_mark_visit_no_show(uuid)` | No function anywhere sets a no-show status. | **NEW** ✅ |
| 5 | `console_mutate_medical_profile_array(uuid, field, op, value)` | **`update_medical_profile(p_user_id, p_medical_data JSONB)` EXISTS** (`identity:503`), and mutates `medical_profiles` (`identity:532`). | **NEW *operation*, but see caveat below — the proposal's "no reuse candidate covers them" is OVERSTATED for #5.** |
| 6 | `console_record_wallet_fee_debit(uuid)` | Fee debit exists ONLY inline inside `approve_cash_payment` (`emlogic:974-979`, `core:2750-2757`); there is no standalone/idempotent fee-debit entry point. Confirmed no other `wallet_ledger` debit fn. | **NEW** ✅ |
| 7 | `console_assign_hospital_to_admin(uuid, uuid)` | `org_admin_id` appears in the schema **only as a column definition** (`orgstruct:44`) — grep found **zero** functions that write it. `update_hospital_by_admin` (`core:222`) never touches `org_admin_id`. | **NEW** ✅ |

### The one correction to the RPC-draft agent's claim

The proposal's header (`PROPOSED_CONSOLE_BOUNDARY_RPCS.sql:37`) asserts "**All 7 are GENUINELY NEW. No reuse candidate covers them**," and its nearest-existing list (`:28-39`) names only `update_hospital_by_admin`, `rate_visit`, and `approve_cash_payment` — it **does not mention `update_medical_profile`**, which is the direct table-mate of proposal #5.

Re-checked against the SQL:
- **#5 is not net-new as "a medical-profile write RPC exists."** `update_medical_profile` already writes `medical_profiles` (`identity:503`).
- **BUT the two are not interchangeable.** `update_medical_profile` (i) treats `allergies/medications/conditions` as **scalar TEXT overwrite** (`p_medical_data->>'allergies'`, `identity:534-538`) — whole-value replace, not per-element array add/remove; and (ii) has **no actor guard at all** (no `auth.uid()`, no `p_is_admin()`, RLS-only). Proposal #5's contract is the opposite: single-statement `TEXT[]` element add/remove with an explicit owner/admin guard, replacing the console's racy JS read-modify-write (`medicalProfilesService.js:188-332`).

**Net verdict:** function-name-wise, **7 of 7 names do not exist** in the schema, so all 7 can be created without collision. Operation-wise, **6 of 7 are genuinely gap-filling with no functional overlap; #5 overlaps an existing RPC (`update_medical_profile`) on the same table.** The recommendation for the schema owner: either (a) accept #5 as the array-granular + guarded companion, or (b) **extend `update_medical_profile`** to add array-op semantics + an actor guard and have the console call that instead — the cleaner reuse. The proposal's "no reuse candidate" line should be amended to acknowledge `update_medical_profile` for #5.

---

## 5. Secondary findings worth carrying forward

**5a. Pre-existing array-wipe bug in `update_hospital_by_admin` (not new).** `core:238-278` hard-sets `specialties = v_specialties`, `service_types = v_service_types`, `features = v_features` from payload arrays that default to `'{}'` when the key is absent — so any partial edit that omits those keys **wipes** the existing arrays. The proposal flags this (`PROPOSED_CONSOLE_BOUNDARY_RPCS.sql:804-815`) and recommends present-key semantics (as its `console_update_visit` uses). Confirmed against the SQL; this is an owner-side fix, independent of the 7.

**5b. Unguarded reads.** `get_org_stripe_status` (`core:816`) and `check_cash_eligibility` (`core:853`) have **no actor/role guard** and are `GRANT`ed to `authenticated` — any logged-in user can read an org's stripe id + wallet balance by org UUID. Console currently calls them from `walletService.js:354,427`. Flag for owner (info leak), not a console-repo fix.

**5c. `p_is_console_allowed()` includes `viewer`.** Any RPC using it as a gate (`get_recent_activity`, `get_activity_stats`, `process_cash_payment`) admits read-tier `viewer`. Fine for reads; the write RPCs correctly avoid it and inline the manager tier instead.

**5d. GRANT/REVOKE hygiene is consistent.** Every console-facing write RPC ends with `REVOKE ALL ... FROM PUBLIC, anon;` + `GRANT EXECUTE ... TO authenticated, service_role;` (`core:3709-3758`, `emlogic:1911-1929`). The 7 proposals replicate this exactly (`PROPOSED_CONSOLE_BOUNDARY_RPCS.sql:847-861`).

---

## 6. Bottom line

- **RBAC helpers** (`p_is_admin`, `p_is_console_allowed`, `p_get_current_org_id`) are defined in `security` (§0); the canonical **write gate** is the inlined `role IN ('admin','org_admin','dispatcher')` + org-scope, NOT `p_is_console_allowed` (which leaks `viewer`).
- **Console should reuse existing RPCs** for verify/profile/hospital/emergency/pricing/wallet/activity — all already wired (§3). No new RPC is needed for those.
- **The 7 proposals fill real gaps**: visit lifecycle (1-4), medical-array mutation (5), fee reconcile (6), hospital-admin assignment (7). By name, **all 7 are new** (no collision). By operation, **6/7 have no existing equivalent; #5 overlaps `update_medical_profile` (`identity:503`)** on the same table with a different (scalar, unguarded) contract — the RPC-draft agent's blanket "no reuse candidate covers them" is **inaccurate for #5** and should be amended (reuse-or-extend `update_medical_profile`).
- **Doc drift**: both generated indices are unreliable for integration — `API_REFERENCE.md` is core-only; `console/api_reference.json` is stale (omits all `console_*` emergency writes) and has wrong signatures. Trust the SQL.
