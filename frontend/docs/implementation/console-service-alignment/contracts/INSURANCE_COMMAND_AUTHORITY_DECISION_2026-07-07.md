---
status: verified-evidence; decisions follow the recommendation below
owner: product + backend
created: 2026-07-07
updated: 2026-07-07 (verified against sister repo ivisit-app backend truth)
source: ivisit-app migrations, RLS, RPCs, and cross-repo hardening guards (cited inline)
authority: subordinate to PAGE_REVAMP_GATE.md and AGENTS.md authority order
enables: nothing - decision/blocker document; no console command is un-fail-closed here
---

# Insurance (Page 12) Backend-Authority Decision (verified)

## Why this document exists

Page 12 (Insurance, `/insurance`, `minRole: admin`) is held in intake. Every source-closable
safety cleanup is already done (route reads through one projection owner; all commands fail closed).
What remained was a set of backend-authority questions. This version answers them from the sister
repo `ivisit-app` (the canonical backend owner), cites exact evidence, and follows the standing
recommendation: B for edit, D for verify, E for delete, never A, and nothing un-fail-closed until
the exact allow-list, admin authorization check, and reconciled app-side effect are defined.

It authorizes no code change and does not admit Page 12.

## The sister repo's testing / decision approach (adopt this)

`ivisit-app` decides and proves CRUD authority with contract guards, not prose. The console should
mirror this. Relevant machinery:

- `supabase/tests/scripts/assert_insurance_surface_field_guard.js` - a cross-repo guard that reads
  BOTH `ivisit-app/services/insuranceService.js` AND `ivisit-console/frontend/src/services/insuranceService.js`
  (+ `insurancePoliciesService.js`). It enforces type parity of `insurance_policies` and
  `insurance_billing` between app and console `types/database.ts`, requires a canonical
  `buildInsuranceWritePayload`, and forbids legacy columns in direct mutations.
- `supabase/tests/scripts/run_console_ui_crud_contract_matrix.js` - a declarative `UI_SURFACES`
  matrix: each console CRUD surface is bound to `{ table, modal, page, service, createFn, updateFn,
  allowed field set, uiOnlyFields }` and verified. Insurance is deliberately ABSENT from this matrix,
  which is the machine-checked statement that the console has no insurance CRUD surface today.
- `assert_rpc_authority_map.js`, `run_cross_repo_contract_matrix.js` - RPC authority and cross-repo
  drift guards.

Decision rule taken from this approach: a console command may exist only when it maps to a named
table/RPC receiver with an allowed field set and an authorization check, and a guard locks it.

## Verified backend truth (evidence)

Insurance policies - patient-owned, no admin write:
- `ivisit-app/supabase/migrations/20260219000700_security.sql:262-264`
  `CREATE POLICY "Users manage own insurance policies" ON public.insurance_policies FOR ALL USING (auth.uid() = user_id);`
  There is no admin or org-admin write policy on `insurance_policies`.

Insurance billing - admin CAN manage:
- `20260219000700_security.sql:477-478` users see own (SELECT `auth.uid() = user_id`).
- `20260219000700_security.sql:480-485` org admins see their hospital's rows (SELECT).
- `20260219000700_security.sql:487-488`
  `CREATE POLICY "Admins manage all billing" ON public.insurance_billing FOR ALL USING (public.p_is_admin());`
  Platform admins have full RLS authority over `insurance_billing`.

Billing is trigger-created and RPC-created, not hand-authored:
- `20260219000900_automations.sql:391,436` `create_insurance_billing_on_completion()` inserts a
  billing row when an emergency completes.
- `20260219000500_ops_content.sql:253` `process_insurance_claim(...)` inserts an `insurance_billing`
  claim; `:180` `validate_insurance_coverage(...)`; `:318` `get_insurance_policies(...)` (patient-scoped).
  There is no admin policy create/edit/delete/verify RPC.

Canonical field allow-list and forbidden legacy columns (from the cross-repo guard):
- `insurance_policies` canonical Row fields: `coverage_details, coverage_percentage, created_at,
  expires_at, id, is_default, linked_payment_method, plan_type, policy_number, provider_name,
  starts_at, status, updated_at, user_id, verified`.
- Forbidden legacy columns (never write directly): `group_number, policy_holder_name,
  front_image_url, back_image_url, coverage_type, policy_type, start_date, end_date`.
- App card upload key `insurance/${user.id}/${Date.now()}.${ext}` with a one-hour signed URL
  (patient-owned).

## Decisions (following the recommendation, now with evidence)

Decision 1 - admin policy create / edit / delete / verify: **keep excluded (E), edit path is B when built.**
Verified: `insurance_policies` is patient-owned `FOR ALL (auth.uid() = user_id)` with no admin RLS and
no admin RPC. Option A (broad admin RLS write) is confirmed the wrong move. To ever enable admin edit,
build Option B: a `SECURITY DEFINER` RPC (proposed `console_admin_update_insurance_policy`) with a
`p_is_admin()` check and a column allow-list restricted to the canonical fields above (never the
legacy columns). Verify is Option D: a narrow verify-only receiver setting `verified` with a defined
app consequence. Delete stays E until a delete receiver + consequence is modeled. Until such a
receiver exists, the console policy create/edit/delete/verify exports MUST stay fail-closed (current
state is correct).

Decision 2 - billing exception / settle / status: **authority exists; blocker is now reconciliation + proof, not RLS.**
Refined by evidence: `"Admins manage all billing" FOR ALL USING (p_is_admin())` means a console admin
DOES have RLS authority to mutate `insurance_billing`. The remaining blockers are: (1) which status
transitions are safe without fighting `create_insurance_billing_on_completion()` and
`process_insurance_claim()`; (2) an allowed field set (e.g. `status`, `paid_date` only); (3) rendered
proof. Recommendation: keep console billing READ-ONLY for now, but this is the one insurance surface
with a real, evidence-backed path to a future admin action (a narrow "mark claim status" receiver),
not an authority dead-end. Do not invent an `insurance_billing` writer from the trigger; add a named
receiver with the allow-list above.

Decision 3 - insurance card Storage: **keep excluded.** App uses a patient-owned key
`insurance/${user.id}/...`; there is no admin-written card path. Keep upload and direct preview
disabled; keep the read-only "Image reference on file" acknowledgement.

## Cross-repo guard conflict found (needs an owner decision)

The console's fail-closed cleanup broke one shared guard rule:
- `assert_insurance_surface_field_guard.js` rule `console_get_user_policies_normalized` REQUIRES
  `ivisit-console/frontend/src/services/insurancePoliciesService.js` `getUserInsurancePolicies()` to
  `return (data || []).map(normalizeInsurancePolicy)`.
- Current console state: `insurancePoliciesService.js:60` `getUserInsurancePolicies()` returns
  `legacyReadError()` (fail-closed) - reads are intentionally owned by `getInsurancePage()`.
- Effect: if the app team runs `npm run hardening:insurance-surface-field-guard`, it FAILS on the
  console file.

Recommended resolution (owner decision, not done here): update the APP guard to accept the console's
fail-closed compatibility state (console user-policy reads are owned by `getInsurancePage()`), rather
than reintroducing a broad console read of a single user's policies (which the revamp deliberately
removed and which makes no sense for an admin console). The other guard rules still pass: the console
keeps `buildInsuranceWritePayload` (`insuranceService.js:596`) and writes no legacy columns directly.

## Admission checklist (unchanged in spirit, now evidence-anchored)

1. Decision 1/2/3 resolved with named receivers (or explicit exclusion), each with a `p_is_admin()`
   check, a canonical-field allow-list, and a reconciled app consequence.
2. The chosen `insuranceService.js` export replaced from fail-closed throw with the receiver call.
3. Console + app contract guards updated together (type parity, the `console_get_user_policies_normalized`
   conflict above, and a new console contract asserting each newly-enabled command's receiver/payload).
4. Rendered desktop/tablet/mobile proof per the gate's Rendered Proof Access Guide (admin session; do
   not mutate real policy/billing rows to pass proof).
5. Add Page 12 files to `scripts/check-ui-surface-hardgate.js` only when visual implementation starts.

## What this document does NOT do

- It does not enable any command, add any file to the hardgate, or admit Page 12.
- It does not edit the sister repo. The cross-repo guard conflict is recorded for the owners.
- Parked backend rule in `tools/automation/revamp-queue.md` still holds for Insurance.
