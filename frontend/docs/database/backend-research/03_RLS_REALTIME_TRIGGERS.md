# 03 · RLS, RBAC, Realtime & Triggers — Backend Research

**Repo of record for schema:** `ivisit-app` (patient app owns the shared Postgres). This console repo is **read-only** against that schema.
**Method:** full read of the two security/automation pillars plus the trigger/constraint definitions in the table pillars. Every claim cites `path:line` against `ivisit-app/supabase/migrations/*`. Nothing here proposes editing `ivisit-app` — it maps *where* the sign-off'd fixes in `DATA_SYNC_REMEDIATION_AUDIT.md §C` would land and what the current policy at that spot looks like.

**Primary sources**
- `ivisit-app/supabase/migrations/20260219000700_security.sql` — all RLS enable + policies + RBAC helpers.
- `ivisit-app/supabase/migrations/20260219000900_automations.sql` — realtime publication + cross-table triggers.
- Trigger/constraint definitions in the table pillars: `..._000100_identity.sql`, `..._000200_org_structure.sql`, `..._000300_logistics.sql`, `..._000400_finance.sql`, `..._000500_ops_content.sql`, `..._000600_analytics.sql`, `..._000800_emergency_logic.sql`.

> **The one-line answer to "why the console only sees its own rows":** `visits` and `medical_profiles` each have exactly **one owner-only policy** — `visits` SELECT `USING (auth.uid() = user_id)` (`security.sql:317-320`) and `medical_profiles` `FOR ALL USING (auth.uid() = user_id)` (`security.sql:285-287`). Neither has any `p_is_admin()` / org override. So an operator's `select().eq(...)` on another patient's row matches **0 rows**; `.single()` then throws `PGRST116` / **HTTP 406**. That is the "every Visits row is *admin*" symptom (the only row visible is the operator's own).

---

## 1 · RBAC helper functions (the vocabulary every policy speaks)

All four are `SECURITY DEFINER` (bypass RLS internally to break recursion), defined at the top of `security.sql`:

| Function | File:line | Returns | Grants / logic |
|---|---|---|---|
| `p_is_admin()` | `security.sql:5-13` | bool | `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`. **Only `role = 'admin'`** — `org_admin`, `dispatcher`, `viewer`, `provider` are **NOT** admins here. |
| `p_is_console_allowed()` | `security.sql:16-25` | bool | true when `role IN ('admin','org_admin','dispatcher','viewer')`. **Defined but used by ZERO policies in this file** (grep: no policy references it). It is the intended console gate but is currently inert in RLS. |
| `p_get_current_org_id()` | `security.sql:94-99` | uuid | `SELECT organization_id FROM profiles WHERE id = auth.uid()`. The org-scoping key for hospital/ambulance/doctor/org-wallet policies. |
| `p_is_emergency_chat_participant(room_id)` | `security.sql:27-92` | bool | admin OR active participant OR request user/responder OR same-org (`org_admin`/`dispatcher`/`provider` with matching `organization_id`). Used by the 3 emergency-chat SELECT policies. |

**RBAC consequence for the console:** because `p_is_admin()` is `role='admin'`-only and `p_is_console_allowed()` is unused, an `org_admin`/`dispatcher`/`viewer` operator gets **no elevated read** on owner-scoped tables (`visits`, `medical_profiles`, `payments` beyond org scope, etc.). Only a true `admin` sees across users, and even then only where a policy actually calls `p_is_admin()`.

---

## 2 · Per-table RLS policy matrix

RLS is enabled on every table in the explicit block `security.sql:102-140` + `:384-386` (`user_roles`, `user_sessions`, `ivisit_main_wallet`) + `:441-443` (`doctor_schedules`, `emergency_doctor_assignments`, `insurance_billing`).

Legend: **owner** = `auth.uid() = user_id`/`= id`; **admin** = `p_is_admin()`; **org** = via `p_get_current_org_id()`; **RPC-only** = RLS on, no write policy → writes must go through a `SECURITY DEFINER` RPC or `service_role`.

### Identity / user data

| Table | SELECT | INSERT | UPDATE | DELETE | File:line | Console gap |
|---|---|---|---|---|---|---|
| `profiles` | owner OR admin | *(none)* | owner only (`WITH CHECK auth.uid()=id`) | *(none)* | `:150-157` | **Owner/admin only.** No `org_admin` override, and **admin cannot UPDATE** other profiles via RLS — only via RPC (`update_profile_by_admin`). Console verify-provider `.update('profiles')…single()` on another user = 0 rows → **406**. |
| `preferences` | ALL: owner | ← | ← | ← | `:281-283` | owner-only |
| `medical_profiles` | **ALL: owner** (`FOR ALL USING auth.uid()=user_id`) | ← | ← | ← | `:285-287` | **owner-only, NO admin/org clause** → operator can't even SELECT another patient's clinical row. Console read-modify-write of arrays = 406/denied. |
| `emergency_contacts` | ALL: owner OR admin | ← | ← | ← | `:289-293` | admin OK |
| `subscribers` | admin (SELECT) | **public** (`WITH CHECK true`) | *(none)* | *(none)* | `:391-392` | **No UPDATE/DELETE policy** → `deleteSubscriberByEmail` is RLS-denied (RPC-only). Anyone can INSERT (newsletter). |
| `user_roles` | owner OR admin | *(none)* | *(none)* | *(none)* | `:425-426` | RPC-only writes |
| `user_sessions` | ALL: owner | ← | ← | ← | `:429-430` | owner-only |

### Org / facility / fleet

| Table | SELECT | INSERT/UPDATE/DELETE | File:line | Console gap |
|---|---|---|---|---|
| `organizations` | `is_active = true` (public) | **(none)** | `:186-188` | **No write policy at all → RPC-only.** Console org edits must route through an RPC. |
| `hospitals` | `verified=true OR org OR admin` | **(none)** | `:190-196` | **No write policy → RPC-only.** All hospital bed/status/approve writes are RLS-denied unless via `update_hospital_by_admin`. |
| `hospital_import_logs` | owner(`created_by`) OR admin | admin OR owner (INSERT/UPDATE per-cmd) | `:331-374` | writable by owner/admin (explicit grants `:374`) |
| `doctors` | public (`true`) | ALL: org(hospital→org) OR admin | `:395-400` | org_admin can manage own-hospital doctors |
| `ambulances` | public (`true`) | ALL: org(direct or via hospital) OR admin | `:296-315` | org_admin can manage; console must drop caller-supplied `id` |
| `doctor_schedules` | public (`true`) | ALL: org(doctor→hospital→org) OR admin | `:446-455` | org-scoped |
| `emergency_doctor_assignments` | own-request OR admin; org manage | ALL: org OR admin | `:458-474` | org-scoped |

### Emergency / dispatch (the healthy template)

| Table | SELECT | INSERT | UPDATE | File:line | Note |
|---|---|---|---|---|---|
| `emergency_requests` | owner OR admin; **+ org** ("Org Admins see their hospital emergencies") | owner (`WITH CHECK auth.uid()=user_id`) | owner | `:160-183` | Two SELECT policies (owner/admin at `:160`, org at `:175`) are **OR-combined** — this is the operator-visibility pattern `visits` lacks. `status` writes further gated by trigger (§4). |
| `emergency_status_transitions` | in-scope (owner/responder/org/admin) | — | — | `:198-215` | join-scoped read |
| `emergency_chat_rooms` / `_participants` / `_messages` | `p_is_emergency_chat_participant(...)` | — | — | `:217-237` | participant-scoped; explicit `GRANT SELECT … TO authenticated` `:235-237` |

### Finance (very restricted — mostly RPC-only writes)

| Table | SELECT | INSERT/UPDATE/DELETE | File:line | Console gap |
|---|---|---|---|---|
| `patient_wallets` | owner OR admin | **(none)** | `:240-242` | RPC-only writes |
| `organization_wallets` | org OR admin | **(none)** | `:244-246` | RPC-only writes |
| `wallet_ledger` | **admin only** | **(none)** | `:403` | **RLS on, SELECT-admin-only, NO write policy → append-only via RPC.** Client `backfillMissingFeeLedger` write = RLS-denied AND double-debit-prone. Table has **no `updated_at`** and **no idempotency unique index** (`finance.sql:33-43`). |
| `payments` | owner OR admin; **+ org** | **(none)** | `:248-256` | Two OR-combined SELECT policies (owner `:248`, org `:253`). No write policy → RPC/webhook only. |
| `payment_methods` | ALL: owner | ← | `:258-260` | owner-only |
| `insurance_policies` | ALL: owner | ← | `:262-264` | **owner-only, no admin/org.** Console also reads columns that don't exist (schema drift, §5). |
| `insurance_billing` | owner; org(hospital); admin manage | ALL: admin | `:477-488` | admin-manage |
| `ivisit_main_wallet` | ALL: admin | ← | `:433` | admin-only |

### Ops / content / analytics

| Table | SELECT | Write | File:line |
|---|---|---|---|
| `health_news` | `published = true` (public) | *(none in this file → RPC/admin)* | `:328` |
| `support_faqs` | public (`true`) | *(none)* | `:329` |
| `support_tickets` | ALL: owner OR admin | ← | `:406-407` |
| `documents` | `tier='public' OR admin` | *(none)* | `:410-411` |
| `notifications` | owner (SELECT/UPDATE/INSERT split) | owner | `:267-278` |
| `user_activity` | admin (SELECT); owner INSERT | owner INSERT `:436`, admin SELECT `:437` | `:377`,`:436-437` |
| `search_history` | ALL: owner | ← | `:378` |
| `search_selections` | owner ALL; public INSERT; admin SELECT | mixed | `:379-381` |
| `search_events` | admin SELECT; any-auth INSERT | `:417-418` | |
| `trending_topics` | public read; admin manage | `:421-422` | |
| `admin_audit_log` | admin only | *(none)* | `:414` |

### Tables with RLS enabled but NO write policy (writes only via `SECURITY DEFINER` RPC / `service_role`)

`organizations` (`:187`), `hospitals` (`:191`), `payments` (`:249`), `patient_wallets` (`:241`), `organization_wallets` (`:245`), `wallet_ledger` (`:403`), `subscribers` UPDATE/DELETE (`:391-392` only give INSERT+SELECT), `user_roles` (`:425`), `admin_audit_log` (`:414`), `documents` (`:410`), `health_news`/`support_faqs` (`:328-329`), `trending_topics` writes are admin-only (`:422`).

### Owner-only tables with NO admin/org override (the 406 factory)

- **`medical_profiles`** — `FOR ALL USING (auth.uid()=user_id)` (`:285-287`). No admin, no org.
- **`visits`** — SELECT `USING (auth.uid()=user_id)` (`:317-320`) + `FOR ALL USING (auth.uid()=user_id)` (`:322-325`). No admin, no org.
- **`insurance_policies`** — `FOR ALL USING (auth.uid()=user_id)` (`:262-264`). No admin, no org.
- **`payment_methods`** (`:258-260`), **`preferences`** (`:281-283`), **`user_sessions`** (`:429-430`) — owner-only (less critical for the console).

`profiles` is *almost* here: owner OR admin **read**, but **write is owner-only** (`:154-157`) — admin cannot UPDATE another profile through RLS; it must use `update_profile_by_admin`.

---

## 3 · Realtime — `supabase_realtime` publication membership

Added in one idempotent loop, `automations.sql:960-1009`. The published set (`v_targets`, `:963-980`):

```
ambulances · emergency_contacts · doctors · emergency_requests · health_news ·
hospitals · insurance_policies · notifications · organizations · payments ·
profiles · room_pricing · service_pricing · support_tickets · user_activity · visits
```

**Published (16):** the list above.
**NOT published (relevant to §C):** `wallet_ledger`, `organization_wallets`, `patient_wallets`, `ivisit_main_wallet`, `insurance_billing`, `subscribers`. (Also unpublished: the emergency-chat tables, `emergency_status_transitions`, `medical_profiles`, `documents`, search/analytics tables, `admin_audit_log`.)

Cross-check with the console audit: `DATA_SYNC_REMEDIATION_AUDIT.md:71` asks to publish `wallet_ledger, organization_wallets, ivisit_main_wallet, insurance_billing, subscribers, profiles` — **`profiles` is already published** (`automations.sql:971`), so only `wallet_ledger, organization_wallets, ivisit_main_wallet, insurance_billing, subscribers` are genuinely missing. Note that even once published, `wallet_ledger` realtime only reaches **admins** (SELECT policy `:403`) and the wallets only reach owner/org — RLS still filters the realtime stream.

---

## 4 · Trigger map (operational hooks per table)

### Cross-table automation triggers (`automations.sql`)

| Trigger | Table / event | Function | File:line | Effect |
|---|---|---|---|---|
| `on_auth_user_created` | `auth.users` AFTER INSERT | `handle_new_user` | `:61-64` | Creates `profiles` + `preferences` + `medical_profiles` + `patient_wallets` rows. |
| `on_org_created` | `organizations` AFTER INSERT | `handle_new_organization` | `:79-82` | Auto-creates `organization_wallets` row. |
| `on_profile_sync_doctor_record` | `profiles` AFTER INS/UPD(role,provider_type,org,name,email,phone) | `sync_doctor_record_from_profile` | `:147-151` | Upserts `doctors` row when profile is a provider-doctor. |
| `on_emergency_completed` | `emergency_requests` AFTER UPDATE | `sync_emergency_to_visit` | `:231-234` | Mirrors ER status/cost/hospital/doctor into the linked `visits` row (by `request_id`). **This is how visits get their status** — the app-side path. |
| `on_emergency_auto_assign_doctor` | `emergency_requests` AFTER UPDATE | `auto_assign_doctor` | `:327-330` | Assigns a doctor + bumps `doctors.current_patients`. |
| `on_emergency_release_doctor` | `emergency_requests` AFTER UPDATE | `release_doctor_assignment` | `:385-388` | Releases doctor on complete/cancel/reassign. |
| `on_emergency_create_billing` | `emergency_requests` AFTER UPDATE | `create_insurance_billing_on_completion` | `:433-436` | Inserts `insurance_billing` on completion (reads `insurance_policies.coverage_percentage`, `status`, `is_default`). |
| `on_emergency_start_dispatch` | `emergency_requests` AFTER INS/UPD | `auto_assign_driver` | `:634-637` | Claims an ambulance (`FOR UPDATE SKIP LOCKED`), sets ER to `accepted`. Sets `ivisit.transition_*` GUCs. |
| `on_emergency_status_resource_sync` | `emergency_requests` AFTER INS/UPD | `update_resource_availability` | `:639-642` | Ambulance status + hospital `available_beds`/`icu_beds_available` bookkeeping. **This is the real bed inventory the console's `reserveBed()` `Math.random()` should call instead.** |
| `on_ambulance_unavailability_failover` | `ambulances` AFTER UPD(status,profile_id,current_call) | `handle_ambulance_unavailability_failover` | `:809-812` | Re-dispatches a replacement ambulance mid-flow. |
| `on_doctor_unavailability_failover` | `doctors` AFTER UPD(status,is_available,current_patients,max_patients) | `handle_doctor_unavailability_failover` | `:953-956` | Re-assigns a replacement doctor mid-flow. |

### Status-write-path enforcement + transition logging (`emergency_logic.sql`)

| Trigger | Table / event | Function | File:line | Effect |
|---|---|---|---|---|
| `trg_enforce_emergency_status_write_path` | `emergency_requests` BEFORE UPDATE OF status | `enforce_emergency_status_write_path` | `:2091-2095` | **Blocks any direct `status` change** unless GUC `ivisit.allow_emergency_status_write='1'` (set only inside the canonical RPCs). Raises **`ERRCODE 42501`** otherwise. This is why the console *cannot* mint an unreconcilable emergency — the model the audit wants `visits`/wallet writes to imitate. |
| `trg_log_emergency_status_transition` | `emergency_requests` | `log_emergency_status_transition` | `:2196` | Writes `emergency_status_transitions` from `ivisit.transition_*` GUCs. |
| `trg_validate_emergency_status_transition` | `emergency_requests` | (validate fn) | `:2250` | Enforces legal state-machine edges. |

### `updated_at` triggers (`handle_updated_at`, BEFORE UPDATE)

| Table | File:line | | Table | File:line |
|---|---|---|---|---|
| `preferences` | `identity:403` | | `ambulances` | `logistics:301` |
| `medical_profiles` | `identity:404` | | `emergency_requests` | `logistics:302` |
| `emergency_contacts` | `identity:405` | | `visits` | `logistics:303` |
| `subscribers` | `identity:406` | | chat rooms/participants/messages | `logistics:306,309,312` |
| `organizations` | `org_structure:300` | | `payment_methods` | `finance:1189` |
| `hospitals` | `org_structure:301` | | `organization_wallets` | `finance:1190` |
| `doctors` | `org_structure:302` | | `patient_wallets` | `finance:1191` |
| `emergency_doctor_assignments` | `org_structure:303` | | `insurance_policies` | `finance:1192` |
| `hospital_media` | `org_structure:405` | | `insurance_billing` | `finance:1193` |
| `service_pricing` / `room_pricing` | `emergency_logic:1932-1933` | | `notifications` / `support_tickets` / `documents` | `ops_content:172-174` |
| `trending_topics` | `analytics:73` | | | |

**No `handle_updated_at` trigger on:** `profiles` (its only UPDATE triggers are `stamp_profile_display_id` `identity:398-400` and `on_profile_updated` activity-log `analytics:85-87` — the `updated_at` column exists but is **not auto-stamped** on UPDATE), and `wallet_ledger` (append-only, no `updated_at` column at all — `finance:33-43`).

### `display_id` stamping (`stamp_entity_display_id`, BEFORE INSERT)

`profiles` (BEFORE INS **OR UPD**, `identity:398`), `emergency_contacts` (`identity:408`), `organizations`/`hospitals`/`doctors` (`org_structure:305-307`), `ambulances`/`emergency_requests`/`visits` (`logistics:314-316`), `payments`/`patient_wallets`/`organization_wallets` (`finance:746-748`), `notifications` (`ops_content:169`). Reinforces the console rule: **display IDs are labels stamped by the DB; never a write identity.**

---

## 5 · §C mapping — current policy vs. what the fix edits, and exactly WHERE

Each row: the gap from `DATA_SYNC_REMEDIATION_AUDIT.md §C` → the **current** object → the **pillar + section** in `ivisit-app` where the schema owner would edit (per the CONTRIBUTING "edit the core pillar, never a fix migration" rule the audit records at `DATA_SYNC_REMEDIATION_AUDIT.md:178`). **All edits below are in `ivisit-app`, not this repo.**

### C1 — Operator SELECT on `visits` / `medical_profiles` (the root 406 gap)

- **Current — `visits`:** `security.sql:317-320`
  ```sql
  CREATE POLICY "Users see own visits"
  ON public.visits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
  ```
  and write `security.sql:322-325` `FOR ALL USING (auth.uid()=user_id)`. No admin/org clause.
- **Current — `medical_profiles`:** `security.sql:285-287`
  ```sql
  CREATE POLICY "Users manage own medical profiles"
  ON public.medical_profiles FOR ALL
  USING (auth.uid() = user_id);
  ```
- **Where the fix edits:** **Security pillar `20260219000700_security.sql`**, section **"7. LOGISTICS (Ambulances & Visits)"** (the `visits` block at `:317-325`) and section **"6. USER DATA (Preferences & Medical)"** (the `medical_profiles` block at `:285-287`).
- **Shape of fix (owner's choice, per audit `:69` / `:162`):** *extend* the existing SELECT `USING` with an OR clause mirroring the emergency pattern already in this file — `OR public.p_is_admin() OR <org-scope>` (org via `p_get_current_org_id()` joined through `hospital_id`, exactly as `emergency_requests` "Org Admins see their hospital emergencies" `:175-183` does) **or** keep RLS closed and route operator reads through new `SECURITY DEFINER` RPCs. Amend the policy in place; do not add a second parallel policy.

### C2 — No write policy on `hospitals`/`organizations`/`payments`/`wallet_ledger`/`subscribers`

- **Current:** `hospitals` `:190-196` (SELECT only), `organizations` `:186-188` (SELECT only), `payments` `:248-256` (SELECT only), `wallet_ledger` `:403` (SELECT admin only), `subscribers` `:391-392` (INSERT public + SELECT admin; **no UPDATE/DELETE**).
- **Where / what:** **No edit to `security.sql` needed.** The audit's own §C `:70` marks these "keep RPC-only (preferred) — correctly closed." The fix is **console-side**: stop writing these tables directly; route through the existing/new RPCs (`update_hospital_by_admin`, `console_record_wallet_fee_debit`, a subscriber-delete RPC). Recorded here only so the owner doesn't "fix" a policy that is intentionally closed.

### C3 — Realtime publication additions

- **Current:** publication loop `automations.sql:960-1009`, target array `:963-980` (16 tables). Missing: `wallet_ledger`, `organization_wallets`, `ivisit_main_wallet`, `insurance_billing`, `subscribers`. (`profiles` is **already** present at `:971` — drop it from the audit's ask.)
- **Where the fix edits:** **Automations pillar `20260219000900_automations.sql`**, the **`v_targets TEXT[]` array at `:963-980`** — append the five missing table names to the same array; the idempotent guard loop (`:986-1007`) already handles add-if-absent. No new block.
- **Caveat to record:** publishing does not widen visibility — `wallet_ledger` realtime still filters to `p_is_admin()` (`:403`); wallets to owner/org. Console realtime subscribers must be admin/owner/org to receive rows.

### C4 — `visits.status` free-text drift → CHECK

- **Current:** `logistics.sql:163` — `status TEXT DEFAULT 'upcoming'` with **NO CHECK constraint**. Confirmed: the `visits` table (`logistics:142-194`) has CHECK only on `tip_amount` (`:192`) and `rating` (`:193`). Meanwhile the app-side writer trigger `sync_emergency_to_visit` maps to `'scheduled'|'in_progress'|'completed'|'cancelled'` (`automations:174-181`), the table default is `'upcoming'`, another table's default is `'active'`, and the console writes `'no-show'`/`'completed'` — three vocabularies, zero enforcement.
- **Where the fix edits:** **Logistics pillar `20260219000300_logistics.sql`**, the **`visits` CREATE TABLE, `status` column at `:163`** — replace `status TEXT DEFAULT '...'` with a single canonical `CHECK (status IN (...))` covering the union the writers actually use, and align the `sync_emergency_to_visit` CASE (`automations:174-181`) + console projection to it. (Owner must reconcile `'upcoming'` vs `'scheduled'` vs `'active'` first — they currently disagree.)

### C5 — Schema drift: `insurance_policies` / `profiles` columns the console reads

- **Current — `insurance_policies`:** owner-only RLS `security.sql:262-264`; table in `finance.sql`. The completion trigger already reads `coverage_percentage`, `status`, `is_default` (`automations:402,412,426`), so those exist. The audit (`DATA_SYNC_REMEDIATION_AUDIT.md:72`) flags console reads of `status/verified/plan_type/expires_at/coverage_percentage/coverage_details` — the owner must diff the real `insurance_policies` DDL against that list (this doc confirms `coverage_percentage`/`status` exist; `verified/plan_type/expires_at/coverage_details` need verification).
- **Current — `profiles`:** `adminService` reads `status/suspended_at/verification_status/verified_at/…` which are not in the identity-pillar `profiles` shape.
- **Where the fix edits:** **Identity pillar `20260219000100_identity.sql`** (`profiles` + `insurance_policies` if it lives there, else **Finance pillar `..._000400_finance.sql`** for `insurance_policies`). Per audit `:164`, prefer **realigning the console projection to the real schema** (deletes console dead code) over adding columns — decide per column.

### C6 — No distinct "rejected" verification state

- **Current:** provider verification rides on `profiles.bvn_verified` (bool) only — no `verification_status` enum, no reason column, no review table.
- **Where the fix edits:** **Identity pillar `20260219000100_identity.sql`** (`profiles`), adding `verification_status` + reason, or a new review table — paired with a new `console_verify_provider` RPC (audit §4) that flips it via `update_profile_by_admin`-style `SECURITY DEFINER`.

### C7 — No idempotency key on `wallet_ledger`

- **Current:** `wallet_ledger` `finance.sql:33-43` — has `reference_id UUID` and `transaction_type TEXT` but **no unique index** on them; append-only, RLS SELECT-admin-only, no write policy (`security:403`).
- **Where the fix edits:** **Finance pillar `20260219000400_finance.sql`**, at the `wallet_ledger` definition (`:33-43`) — add `CREATE UNIQUE INDEX … ON wallet_ledger (reference_id, transaction_type) WHERE reference_id IS NOT NULL`, and pair with the new idempotent `console_record_wallet_fee_debit` RPC (audit §4) so the client never writes the ledger directly.

---

## 6 · Bottom line

- **The exact RLS gap that causes the console's owner-only visibility:** `visits` SELECT is `USING (auth.uid() = user_id)` (`security.sql:317-320`) and `medical_profiles` is `FOR ALL USING (auth.uid() = user_id)` (`security.sql:285-287`) — **both owner-scoped with no `p_is_admin()`/org override**. `p_is_admin()` is `role='admin'`-only (`:5-13`) and `p_is_console_allowed()` (`:16-25`) is defined but **wired into zero policies**. So operators match 0 rows on other users' clinical/visit data; `.single()` → `PGRST116`/**406**, and the only visible row (their own) reads as "admin." The healthy contrast is `emergency_requests`, which OR-combines an owner/admin SELECT (`:160-163`) with an org SELECT (`:175-183`) — the precise pattern `visits`/`medical_profiles` must adopt, plus a `visits.status` CHECK (`logistics:163`) and the five realtime publication additions (`automations:963-980`). **All edits land in `ivisit-app` pillar files, not this repo.**
