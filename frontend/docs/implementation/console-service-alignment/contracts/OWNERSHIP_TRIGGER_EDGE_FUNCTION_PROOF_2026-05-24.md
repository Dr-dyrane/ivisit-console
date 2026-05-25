# Ownership Trigger And Edge Function Proof - 2026-05-24

## Status

Static source ownership proof for the first contract chart findings. This pass corrects one capacity interpretation and confirms emergency-visit and subscriber lifecycle ownership gaps.

No database query, mutation, Edge Function invocation, or write-oriented test was executed.

## Evidence Scope

- `frontend/supabase/migrations/20260219000200_org_structure.sql:187-246`
- `frontend/supabase/migrations/20260219000900_automations.sql:156-239,537-642`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql:441-627,1531-1607`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql:222-285,1432-1582`
- `frontend/supabase/migrations/20260219000100_identity.sql:157-168,398-406`
- `frontend/supabase/functions/payments/sendWelcome/index.ts:20-110`
- `frontend/supabase/functions/payments/process-subscribers/index.ts:20-116`
- `frontend/supabase/functions/webhooks/index.ts:21-95`

## Capacity Ownership Correction

The field chart originally treated direct bed scalar writes as necessarily leaving `bed_availability` stale. The table trigger changes that conclusion.

| Mutation source | Trigger behavior | Corrected status | Proof |
| --- | --- | --- | --- |
| Any insert or update on `hospitals`, including direct `available_beds` writers | `normalize_hosp_bed_state` clamps scalar beds, rebuilds `bed_availability` for hospitals, refreshes `last_availability_update` when bed state changes, and toggles `full`/`available` when capacity crosses zero | source-aligned for forward trigger writes; live population drift confirmed | `org_structure.sql:187-246`; `READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md` |
| Live modal `emergency_wait_time_minutes` edit through `update_hospital_by_admin` | Admin RPC does not extract `emergency_wait_time_minutes`; normalization trigger does not set wait time | confirmed drift remains | `core_rpcs.sql:242-280`; `org_structure.sql:187-246` |
| Direct specialized `status` API with no bed-state change | Trigger only refreshes availability timestamp for changed bed values/JSON; direct status service is outside `update_hospital_availability` | drift suspected remains for exposed API | `org_structure.sql:220-246`; `emergency_logic.sql:1531-1607` |

Read-only live confirmation narrows this correction: all 1,278 reviewed hospital rows expose empty `bed_availability`, including 127 with positive scalar availability. The trigger body establishes intended behavior for a write if deployed and invoked; it does not prove the existing population is normalized.

### Resource Automation Interaction

`update_resource_availability` adjusts hospital beds when active bed requests begin, end, or move hospitals (`automations.sql:583-627`). Because those updates also execute on `hospitals`, the normalization trigger is the database owner that projects those scalar adjustments into the bed JSON snapshot.

Implementation implication: the missing console work is not to duplicate bed snapshot arithmetic. It is to route ER-wait and operational availability edits through a receiver that owns all displayed operational fields while preserving the existing normalization trigger.

## Emergency To Visit Ownership Proof

| Emergency creation/mutation path | Visit behavior in SQL | Status | Finding |
| --- | --- | --- | --- |
| Canonical `create_emergency_v4` | Inserts an emergency request, then attempts to insert a correlated `visits` row with `request_id = v_request_id` (`emergency_logic.sql:562-613`) | aligned creation owner | The app-lifecycle creation path creates history linkage at creation time. |
| Console fallback `console_create_emergency_request` | Inserts only into `emergency_requests` and returns the row (`core_rpcs.sql:1545-1582`) | confirmed drift | A fallback-created emergency has no SQL-visible visit creation step. |
| Later emergency state or field updates | `sync_emergency_to_visit` runs after emergency update but performs only `UPDATE public.visits ... WHERE request_id = NEW.id` (`automations.sql:156-234`) | confirmed drift amplification | The trigger cannot create the missing visit row for fallback-created emergencies. |
| Resource availability | Separate emergency trigger adjusts beds/ambulance state (`automations.sql:537-642`) | aligned ownership separation | Resource synchronization does not repair visit linkage. |

### Consequence

The earlier chart finding can be narrowed further: console manual visit CRUD is not merely in tension with app ownership. The fallback emergency creation path can require a manually invented visit to hide a missing lifecycle link, but that would still bypass the canonical creation owner. The implementation plan needs one canonical repair/migration strategy for existing fallback rows and one forward creation contract.

## Subscriber Ownership Proof

The `subscribers` schema owns `new_user` and `welcome_email_sent` (`identity.sql:157-168`) and supplies only an `updated_at` trigger (`identity.sql:398-406`). There is no database trigger in the reviewed source that consolidates welcome lifecycle semantics.

| Writer | Action | Fields changed | Status | Finding |
| --- | --- | --- | --- | --- |
| `subscriptionService.createSubscriber()` and `createSubscriberWithWelcome()` | Plain create inserts a pending row; only the explicit wrapper invokes `sendWelcome` (`subscriptionService.js:154-179,297-301`) | Initial payload sets `new_user = true`, `welcome_email_sent = false`, `status = pending` | create/email split repaired; lifecycle still blocked | Explicit welcome send remains unsafe until it and the batch worker share one durable completion transition. |
| `sendWelcome` Edge Function | Sends a welcome email, then updates by email | Sets only `new_user = false` (`sendWelcome/index.ts:86-97`) | confirmed incomplete state transition | Successfully sent mail can leave `welcome_email_sent = false`, still eligible for batch resend. |
| `process-subscribers` Edge Function | Selects rows where `welcome_email_sent` is false/null, sends mail, then updates by ID | Sets `welcome_email_sent = true`, `welcome_email_sent_at`, and `status = active` (`process-subscribers/index.ts:27-96`) | confirmed duplicate-send risk | A row emailed by `sendWelcome` remains selectable by the batch worker. |
| `webhooks` unsubscribe function | Public unsubscribe behavior using service-role client | Sets `status = unsubscribed`, `unsubscribed_at`, and `new_user = false` (`webhooks/index.ts:49-86`) | separate legitimate transition, authorization review needed | This writer owns unsubscribe state but uses the same record without a unified transition model. |

### Subscriber Implementation Boundary

Before code changes, define one state transition contract with idempotent send ownership:

| Transition | Required single-owner result |
| --- | --- |
| Create/pending welcome | Row starts eligible for exactly one welcome send. |
| Welcome send success | Same writer atomically or idempotently marks `welcome_email_sent`, send timestamp, `new_user`, and active status. |
| Unsubscribe | Unsubscribed rows must be excluded from welcome/broadcast processing. |

## Corrections And Confirmed Findings

| Prior chart area | Ownership proof result |
| --- | --- |
| Bed snapshot from scalar updates | Corrected: normalization trigger maintains bed JSON/timestamp for changed bed state. |
| ER wait modal field | Confirmed: current admin hospital RPC does not consume the submitted minutes field. |
| Fallback emergency visit linkage | Confirmed: fallback create has no visit insert, and update trigger cannot insert missing linkage. |
| Subscriber multiple writers | Confirmed with correction: plain create is row-only in current source, while explicit/manual welcome and batch welcome writers update incompatible flag sets. |
