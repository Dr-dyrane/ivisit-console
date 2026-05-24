# Read-Only Live Confirmation Matrix - 2026-05-24

## Status

Aggregate live-data confirmation pass completed for the highest-risk Stage 2 contract findings.

This pass is audit-only. It did not execute RPCs, Edge Functions, repair routines, test flows, migrations, resets, inserts, updates, or deletes. No row identifiers, patient details, provider details, email addresses, or secret values were recorded in this document.

## Method

The audit used an in-memory Node/Supabase client probe from the configured `ivisit-app` environment because the app worktree is already ahead of its remote and must remain read-only reference context. The probe:

- issued only `SELECT` queries against shared tables
- used paginated reads and exact count for hospitals after detecting the default 1,000-row response limit
- printed aggregate counts, schema-column availability, and JSON key presence only
- wrote no generated report into `ivisit-app`

Static source still establishes receiver behavior. Live aggregates establish whether a currently observable data state is consistent with, or exposed to, the contract defect.

## Schema Surface Confirmation

| Surface | Read-only probe result | Static contract implication | Audit conclusion |
| --- | --- | --- | --- |
| `hospitals.emergency_wait_time_minutes`, `bed_availability`, `last_availability_update` | All columns are selectable live. | Console edit service sends ER wait, but `update_hospital_by_admin` does not persist that field; the operational availability RPC does. | The target field exists live; the lost console field is not a stale-schema excuse. |
| `subscribers.status`, `new_user`, `welcome_email_sent`, `welcome_email_sent_at`, `unsubscribed_at` | All columns are selectable live. | Multiple services/functions write overlapping welcome state. | The lifecycle flags required for one idempotent owner are present live. |
| `ambulances.status`, `location`, `current_call`, `profile_id` | All operational columns are selectable live. | Console must respect dispatch/status ownership. | Operational ambulance contract exists live. |
| `ambulances.image`, `last_maintenance`, `rating` | Select failed with PostgreSQL `42703`; `image` does not exist. | Modal collects fields not accepted by service/migration. | Confirmed live schema drift for the visible unsupported ambulance fields. |
| `doctors.profile_id`, `status`, `email`, `name`; `doctor_schedules` date/time/shift fields | Columns are selectable live. | Doctor link ownership and real schedule CRUD can be implemented against existing receiver fields. | Missing console behavior is not caused by absent table fields. |
| `emergency_requests.id/status/service_type`; `visits.request_id` | Link fields are selectable live. | Canonical RPC creates a visit; fallback console creation does not. | Link integrity can be monitored read-only; forward path remains defective even when existing rows are intact. |

## Current Impact Aggregates

### Emergency, Payment, And Visit Linkage

| Aggregate | Observed result | Interpretation |
| --- | ---: | --- |
| Emergency requests read | 160 | Scope examined for visit linkage. |
| Visits read | 169 | Scope examined for correlated request linkage. |
| Emergency requests missing a linked visit | 0 | No present missing-link incident observed. This does not remove the fallback creation defect because the SQL receiver still omits visit creation. |
| Payments read | 171 | Scope examined for cash settlement contract. |
| Cash payments | 156 | Cash is a major operational path in current data. |
| Cash payments linked to an emergency request | 147 | Rows eligible for request/payment consistency comparison. |
| Cash-linked requests terminal while payment is not completed | 1 | Live data already contains a state that the documented completion-order defect can produce or leave unresolved. Cause attribution requires a controlled mutation trace and is not claimed here. |
| Cash payment organization mismatching request hospital organization | 7 | Live data contains identity inconsistency of the same type the console hospital-ID fallback can produce. Cause attribution is not claimed from aggregate reads alone. |
| Cash currencies observed | `USD` only | The current dataset does not require multi-currency resolution, though the discarded service parameter remains a contract smell. |

### Subscribers

| Aggregate | Observed result | Interpretation |
| --- | ---: | --- |
| Subscriber rows read | 16 | Scope examined for welcome lifecycle. |
| `new_user = false` while `welcome_email_sent` is not true | 2 | Rows can satisfy the batch selector even after the direct welcome path has cleared `new_user`; duplicate-welcome exposure is live. |
| Unsubscribed rows still welcome-eligible by flag | 0 | No currently observed unsubscribe/welcome collision. |

### Provider Operations

| Aggregate | Observed result | Interpretation |
| --- | ---: | --- |
| Doctor rows read | 232 | Scope examined for profile linkage. |
| Doctors linked to a profile | 232 | No currently observed unlinked doctor row. |
| Doctors without a profile link | 0 | The create-then-invite duplication path remains a forward contract risk, but existing data does not show the unlinked half of that pattern. |
| Duplicate normalized email groups | 0 | No email-key duplicate evidence observed. |
| Duplicate normalized name groups | 10 | Not proof of duplicate doctor creation; names are not unique identity. Do not use this count as remediation input without stronger keys. |

### Hospital Capacity Projection

The migration source defines `normalize_hospital_bed_state()` and its `BEFORE INSERT OR UPDATE` trigger, which would populate `bed_availability` on touched hospital rows. Live aggregate reads show the existing population has not been projected into that JSON surface.

| Aggregate | Observed result | Interpretation |
| --- | ---: | --- |
| Hospitals reviewed with pagination/exact count | 1,278 | Complete readable population for this probe. |
| Rows with positive `available_beds` | 127 | Scalar capacity data exists. |
| Rows with positive `total_beds` | 1 | Population is sparse/incomplete for total-bed modeling. |
| Rows with non-empty `bed_availability` | 0 | App-consumed JSON capacity projection is unpopulated in currently readable live rows. |
| Rows with non-null `emergency_wait_time_minutes` | 0 | ER wait is also unpopulated in the current live population. |
| Rows with `last_availability_update` | 1,278 | Freshness timestamps alone do not prove capacity payload completeness. |

Conclusion: static trigger ownership protects forward writes only if that migration/trigger is deployed and invoked. It does not make current capacity data aligned. A later implementation/deployment plan needs read-only trigger deployment proof and, only after explicit authorization, a controlled backfill or normalization plan.

## Finding Status After Live Confirmation

| Contract finding | Source status before probe | Live confirmation status | Implementation priority |
| --- | --- | --- | --- |
| Cash completion order rejects post-completion manual settlement | Confirmed drift | One terminal/unsettled cash-linked state observed; path remains source-proven. | Critical |
| Cash organization identity fallback can pass hospital UUID | Confirmed drift | Seven cash payment/request-hospital organization mismatches observed. | Critical |
| Subscriber direct welcome versus batch welcome flags | Confirmed drift | Two rows are in the duplicate-send eligibility pattern. | High |
| Ambulance unsupported visible fields | Confirmed drift | Fields are absent in live table schema. | High |
| Hospital ER-wait edit is discarded by admin RPC | Confirmed drift | Field exists but has no populated live values; mutation was not run to attribute cause. | High |
| Hospital bed JSON snapshot protected by normalization trigger | Source-aligned for future trigger writes | Current live projection is empty despite scalar availability values. | High data-readiness/deployment proof |
| Fallback emergency creation can omit linked visit | Confirmed forward drift | Zero current missing links observed. | High forward contract; no present repair count |
| Manual doctor create-plus-invite can create unlinked/projected duplication | Confirmed forward drift | Zero current unlinked doctor rows observed. | Medium/high forward contract |
| Staff scheduling ignores `doctor_schedules` rows | Confirmed drift | Real schedule columns exist live. | Medium/high |

## Ordered Implementation Pass Inputs

No code implementation is authorized by this audit file. It supplies a narrow order for the later pass-plan set:

1. Cash lifecycle and organization identity: select one eligible settlement/completion order and remove hospital UUID fallback for organization identity.
2. Subscriber welcome idempotency: establish one writer/eligibility transition before any additional email automation use.
3. Capacity data truth: prove deployed trigger/function ownership read-only, decide canonical console availability writer, then plan any authorized data normalization separately.
4. Ambulance form/status contract: remove unsupported fields or add an intentional receiver; align operational status controls with supported schema/RPC vocabulary.
5. Emergency/visits ownership: prevent console fallback creation from producing lifecycle records without the app-required linked visit.
6. Doctor and scheduling ownership: link provider identity before directory projection and either implement true `doctor_schedules` CRUD or reduce the UI claim.

## Excluded Actions

The audit deliberately did not run:

- `sync_to_console.js`, generated report scripts, or app validation scripts that write local evidence files
- any Supabase RPC, Edge Function, test-flow script, migration, seed, cleanup, repair, backfill, or email function
- any console UI action that could change production or staging state
