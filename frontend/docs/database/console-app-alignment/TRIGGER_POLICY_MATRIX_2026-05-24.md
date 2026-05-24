# Trigger And Policy Matrix - 2026-05-24

## Status

Started. Static migration audit only. This matrix is intentionally focused on high-risk triggers and RLS policy groups first.

## RLS Helper Functions

| Helper | Source | Purpose | Risk |
| --- | --- | --- | --- |
| `p_is_admin()` | `20260219000700_security.sql:5` | Recursion-safe admin check for policies and admin RPCs | high: all admin scope depends on role truth in `profiles` |
| `p_is_console_allowed()` | `20260219000700_security.sql:16` | Console permission helper for privileged access checks | high: must match console RBAC expectations |
| `p_get_current_org_id()` | `20260219000700_security.sql:94` | Resolves current user's organization for org-scoped policies | high: org admin scoping depends on this |
| `p_is_emergency_chat_participant()` | `20260219010000_core_rpcs.sql` | Chat access helper | medium: emergency chat read/write scope |

## High-Risk Trigger Matrix

| Trigger | Table | Timing | Function | Side Effect | Console Risk |
| --- | --- | --- | --- | --- | --- |
| `stamp_profile_display_id` | `profiles` | before insert/update | `stamp_entity_display_id` | creates/updates `display_id` and `id_mappings` | high: display ID prefix changes with role/type |
| `stamp_org_display_id` | `organizations` | before insert | `stamp_entity_display_id` | creates org display ID | medium/high: org wallet and support surfaces display this |
| `stamp_hosp_display_id` | `hospitals` | before insert | `stamp_entity_display_id` | creates hospital display ID | high: discovery/map/admin search |
| `stamp_amb_display_id` | `ambulances` | before insert | `stamp_entity_display_id` | creates ambulance display ID | high: dispatch/search |
| `stamp_req_display_id` | `emergency_requests` | before insert | `stamp_entity_display_id` | creates request display ID | critical: app/console request IDs |
| `stamp_visit_display_id` | `visits` | before insert | `stamp_entity_display_id` | creates visit display ID | high: app visit history/support |
| `stamp_pay_display_id` | `payments` | before insert | `stamp_entity_display_id` | creates payment display ID | high: billing/support |
| `on_auth_user_created` | `auth.users` | after insert | `handle_new_user` | creates profile/wallet/default related rows | high: auth/profile bootstrap |
| `on_org_created` | `organizations` | after insert | `handle_new_organization` | creates org wallet/default setup | high: wallet and provider onboarding |
| `on_profile_sync_doctor_record` | `profiles` | after profile changes | `sync_doctor_record_from_profile` | syncs profile identity to doctor record | high: doctor profile/service duplication |
| `on_emergency_completed` | `emergency_requests` | after update | `sync_emergency_to_visit` | creates/updates visit from emergency lifecycle | critical: visit history depends on emergency completion |
| `on_emergency_auto_assign_doctor` | `emergency_requests` | after insert/update | `auto_assign_doctor` | assigns doctor for eligible emergency | high: bed/doctor paired flows |
| `on_emergency_release_doctor` | `emergency_requests` | after terminal update | `release_doctor_assignment` | releases doctor assignment | high: provider availability accuracy |
| `on_emergency_create_billing` | `emergency_requests` | after completion | `create_insurance_billing_on_completion` | creates insurance billing rows | medium/high: billing side effects |
| `on_emergency_start_dispatch` | `emergency_requests` | after update | `auto_assign_driver` | starts dispatch for eligible emergency | critical: direct status changes can trigger dispatch unexpectedly |
| `on_emergency_status_resource_sync` | `emergency_requests` | after status update | `update_resource_availability` | syncs ambulance/hospital resource status | critical: resource availability can drift if bypassed |
| `on_ambulance_unavailability_failover` | `ambulances` | after status update | `handle_ambulance_unavailability_failover` | reassigns or fails over affected emergencies | high: status edits have cascading effects |
| `on_doctor_unavailability_failover` | `doctors` | after availability update | `handle_doctor_unavailability_failover` | releases/reassigns doctor assignments | high |
| `trg_enforce_emergency_status_write_path` | `emergency_requests` | before status update | `enforce_emergency_status_write_path` | blocks status writes outside approved context | critical: console must use RPCs that set context |
| `trg_log_emergency_status_transition` | `emergency_requests` | after status update | `log_emergency_status_transition` | inserts transition evidence row | critical: claims/evidence and audit trail |
| `trg_validate_emergency_status_transition` | `emergency_requests` | before status update | `validate_emergency_status_transition` | enforces allowed status graph | critical: UI dropdowns cannot define truth |
| `trg_sync_dispatch_eligibility` | `hospitals` / related | trigger | `sync_dispatch_eligibility` | keeps hospital dispatch eligibility fields aligned | high: map/dispatch filtering |
| `normalize_hosp_bed_state` | `hospitals` | trigger | `normalize_hospital_bed_state` | normalizes bed/capacity state | high: bed-only and paired flows |
| `handle_*_updated_at` | many tables | before update | `handle_updated_at` | updates timestamps | low alone, but can mask business state changes |

## Policy Group Matrix

| Table Group | Policy Pattern | Helper Functions | Console Risk |
| --- | --- | --- | --- |
| `profiles` | owner/admin read, owner update | `p_is_admin` | high: admin profile updates must use admin RPC where owner policy is insufficient |
| `emergency_requests` | user own, org admin by hospital org, admin | `p_get_current_org_id`, `p_is_admin` | critical: console filters must match RLS scope |
| `emergency_status_transitions` | users/org/admin see scoped transition rows | `p_get_current_org_id`, `p_is_admin` | high: evidence must be visible to support/operator roles |
| `emergency_chat_*` | participant/scoped read | `p_is_emergency_chat_participant` | medium: console support access must be explicit |
| `hospitals` | public verified read, org/admin manage | `p_get_current_org_id`, `p_is_admin` | high: provider dashboards and admin pages differ |
| `ambulances` | public read, org/admin manage | `p_get_current_org_id`, `p_is_admin` | high: status writes can trigger failover |
| `doctors` and `doctor_schedules` | public read, org/admin manage | `p_get_current_org_id`, `p_is_admin` | high: booking and assignment availability |
| `payments` | user own and org own read | `p_get_current_org_id`, `p_is_admin` | critical: console wallet/payment pages must be org-scoped |
| `organization_wallets` | org admin own wallet and admin | `p_get_current_org_id`, `p_is_admin` | critical: wallet visibility and fee collection |
| `wallet_ledger` | admin read observed | `p_is_admin` | critical: org visibility may need service/RPC, not direct read |
| `payment_methods` | user manages own | auth uid | high: console org payment method management goes through Edge/RPC paths |
| `service_pricing` / `room_pricing` | public read, org/admin manage | `p_get_current_org_id`, `p_is_admin` | high: pricing CRUD must use RPCs for access and shape |
| `notifications` | user own read/update/insert | auth uid | medium/high: org-admin notification paths use RPCs |
| `subscribers` | public insert, admin read | `p_is_admin` | medium: CSV/export must remain untracked and scoped |
| `search_events` / `trending_topics` | analytics insert/admin read/public read | `p_is_admin` | medium: cron/manual update clarity needed |
| `documents` | public tier or admin | `p_is_admin` | high if data-room/confidential docs are added |

## Early Findings

1. Emergency status is heavily protected by triggers and session settings. Any direct update to `emergency_requests.status` from console service/page code is suspicious unless it goes through an RPC that calls `set_emergency_transition_context`.
2. Resource availability is trigger-coupled to emergency status and provider availability. Console UI cannot treat ambulance/hospital/doctor status as isolated fields.
3. Wallet ledger visibility is admin-only by policy in the visible scan. Org finance views may need RPC/service aggregation instead of direct ledger reads.
4. Pricing tables have public read policies but org/admin write policies. Console pricing pages must resolve org scope exactly.
5. Cron/scheduled updates are not source-controlled in current migrations; analytics/trending and subscriber processing should remain marked incomplete.

## Next Trigger/Policy Work

- Add exact policy names for every table in the table domain matrix.
- Add line exhibits for high-risk trigger function bodies.
- Verify whether `providers` and `hospital_media` policies live outside the current scan set.
- Compare policy helpers against console `AuthContext`, `rbacPatterns.js`, and navigation RBAC docs.
