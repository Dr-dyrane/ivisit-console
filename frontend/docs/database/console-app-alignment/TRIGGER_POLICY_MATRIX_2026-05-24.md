# Trigger And Policy Matrix - 2026-05-24

## Status

Expanded CRUD-and-command authority matrix. Static source evidence only: this document records what current source policies authorize, then distinguishes ordinary table CRUD from workflow commands that must remain RPC, trigger, or Edge Function owned.

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

## Full Shared Table CRUD And Command Authority Matrix

Legend:

- `R`, `C`, `U`, and `D` mean direct table operations authorized by the named source policy for the listed actor; they do not prove the current UI is correctly scoped.
- `Command only` means Console may need to initiate an operation, but the business mutation must use the listed receiver rather than direct CRUD.
- `No Console CRUD` means the shared table exists without an authorized ordinary Console management responsibility.

### Identity And Access

| Table | Named policy evidence | Direct Console-authorized posture | Workflow command or boundary | Determination |
| --- | --- | --- | --- | --- |
| `id_mappings` | No direct policy found in reviewed security source. | none | `get_entity_id`/display-ID helpers resolve identity. | No Console CRUD; infrastructure only. |
| `profiles` | `Profiles are readable by owner or admin`; `Profiles are updatable by owner`. | admin `R`; signed-in owner `R/U` | Admin changes require approved admin/auth receiver, not direct browser update of another profile. | Current profile/admin creation and verification promises exceed ordinary table CRUD. |
| `preferences` | `Users manage own preferences`. | signed-in owner `C/R/U/D` only | Console may edit operator's own notification/display preference only. | Patient consent/demo behavior is not Console administration. |
| `medical_profiles` | `Users manage own medical profiles`. | patient owner `C/R/U/D` only | Any clinical/operator read requires a separate authorized care projection. | No broad Console CRUD. |
| `emergency_contacts` | `Users manage own emergency contacts` includes admin. | owner/admin `C/R/U/D` in policy source | Emergency detail should consume only justified contact context. | Admin policy exists; general Console contact management is still outside defined flow. |
| `subscribers` | `Public can subscribe`; `Admins read subscribers`. | public `C`; admin `R` | Email/unsubscribe lifecycle requires an authorized function/receiver. | Visible Console update/delete lifecycle is unsupported by table policy. |
| `user_roles` | `Users see own roles`. | owner/admin `R` only | Role mutation must follow approved identity authority. | No parallel Console role CRUD. |
| `user_sessions` | `Users see own sessions`. | signed-in owner `C/R/U/D` by broad own-row policy; no admin read shown. | Security/session management receiver needed for admin oversight. | Current admin session metrics are not policy-backed. |

### Organization, Provider, And Logistics

| Table | Named policy evidence | Direct Console-authorized posture | Workflow command or boundary | Determination |
| --- | --- | --- | --- | --- |
| `organizations` | `Public read for active organizations`. | public `R` active only | Organization creation/update/delete needs guarded administrative authority. | Current Console registry CRUD is unsupported by reviewed table policy. |
| `hospitals` | `Public read for verified hospitals`; `Explore providers are publicly readable`. | public/org/admin scoped `R`; no ordinary table mutation policy shown here | `update_hospital_by_admin`, `delete_hospital_by_admin`, and `update_hospital_availability` own distinct mutations. | Console must separate metadata commands from operational capacity commands. |
| `hospital_import_logs` | `Admins manage hospital import logs`; own creator read/insert/update policies. | creator `C/R/U`; admin `C/R/U/D` | Log rows are provenance for import operations, not import authority themselves. | Render outcomes and failures wherever import is offered. |
| `providers` | `Public read active providers`; `Org admins manage providers`; service-role policy. | public active `R`; org admin/admin `C/R/U/D` for owned hospital scope | Discovery/import writer authority still must be deliberate. | Required Console catalog/classification capability is policy-supported but absent. |
| `hospital_media` | `Public read active hospital media`; `Org Admins manage hospital media`. | public active `R`; org admin/admin `C/R/U/D` for owned hospital scope | Media upload/storage and chosen active asset need provenance ownership. | Required Console media capability is policy-supported but absent. |
| `doctors` | `Public read doctors`; `Org Admins manage doctors`. | public `R`; org admin/admin `C/R/U/D` scoped through hospital | Profile synchronization and emergency assignment remain separate command concerns. | Directory CRUD allowed when scope and profile ownership are respected. |
| `doctor_schedules` | `Public read doctor schedules`; `Org Admins manage doctor schedules`. | public `R`; org admin/admin `C/R/U/D` scoped through doctor hospital | Schedule conflicts/statistics must read actual shift rows. | Required Console CRUD is authorized and currently missing. |
| `emergency_doctor_assignments` | `Users see own doctor assignments`; `Org Admins manage doctor assignments`. | patient/admin scoped `R`; org admin/admin `C/R/U/D` through doctor organization | Prefer `assign_doctor_to_emergency` for operational assignment state/side effects. | Missing Console handoff capability; treat assignment as command-backed workflow. |
| `ambulances` | `Public read for ambulances`; `Org Admins manage ambulances`. | public `R`; org admin/admin `C/R/U/D` scoped to organization/hospital | Active dispatch, responder location, and failover must use request-aware receivers. | Fleet CRUD is permitted; active-trip mutation is not ordinary CRUD. |
| `emergency_requests` | User create/update/select and org-admin hospital-select policies. | Console org admin `R` for scoped hospital requests; no ordinary Console mutation policy. | `create_emergency_v4` or explicit console-create; console update/dispatch/complete/cancel RPCs. | Console lifecycle actions are command only. |
| `emergency_status_transitions` | `Users see emergency status transitions in scope`. | scoped `R` only | Trigger-generated append-only evidence; mutation prevention trigger blocks `U/D`. | Required Console timeline is read-only. |
| `visits` | `Users see own visits`; `Users insert/update own visits` uses `FOR ALL`. | patient owner CRUD only in policy; no Console org/admin scope shown. | Emergency-derived visit lifecycle is trigger/RPC-owned. | Console visit CRUD requires separate authority and request-derived guard. |
| `emergency_chat_rooms` | `Users see emergency chat rooms in scope`. | participant `R` only | `ensure_emergency_chat_room`. | Console chat room creation/access is command-and-scope based, not table CRUD. |
| `emergency_chat_participants` | `Users see emergency chat participants in scope`. | participant `R` only | Chat RPC manages participant/read-state semantics. | No direct Console membership CRUD. |
| `emergency_chat_messages` | `Users see emergency chat messages in scope`. | participant `R` only | `send_emergency_chat_message`; `mark_emergency_chat_room_read`. | Console send/read must use chat commands. |

### Finance, Content, Analytics, And Pricing

| Table | Named policy evidence | Direct Console-authorized posture | Workflow command or boundary | Determination |
| --- | --- | --- | --- | --- |
| `organization_wallets` | `Org Admins see own org wallet`. | scoped org admin/admin `R` only | Payment, payout, cash settlement, and webhook receivers own balance changes. | No direct Console wallet mutation. |
| `patient_wallets` | `Users see own wallets`. | patient/admin `R` only | Patient wallet payment receiver owns mutations. | No ordinary Console CRUD. |
| `ivisit_main_wallet` | `Admins manage main wallet`. | platform admin table policy is broad, but ordinary UI should read summary only. | Settlement/ledger commands own money movement. | Do not turn broad policy into manual balance CRUD. |
| `wallet_ledger` | `Admins see all ledger`. | platform admin `R` only | Backend settlement/audited maintenance inserts entries. | Append-only operational evidence; normal Console repair write is not authorized. |
| `payment_methods` | `Users manage own payment methods`. | owner CRUD only | Stripe/Edge/RPC owns payment-method confirmation and organization use. | No administrative direct CRUD for patient or organization methods. |
| `payments` | `Users see own payments`; `Org Admins see org payments`. | scoped `R` only | Approval, decline, cash, card, wallet, retry and webhook commands own writes. | Console payment operations are command only. |
| `exchange_rates` | No direct policy found in reviewed policy source. | none proven | App billing quote/refresh functions own rate use and refresh. | Dependency only; no Console FX CRUD. |
| `insurance_policies` | `Users manage own insurance policies`. | patient owner CRUD only | Administrative policy actions need guarded authority. | Current Console admin policy CRUD/verify promise is unsupported. |
| `insurance_billing` | Own/hospital billing reads; `Admins manage all billing`. | patient/org admin scoped `R`; platform admin `C/R/U/D` | Completion trigger creates normal billing outcome; exceptions must be explicit. | Required scoped result view; ordinary org-admin mutation is not authorized. |
| `notifications` | Own select/update/insert policies. | signed-in owner `C/R/U`; no `D` shown | Backend notification dispatch handles workflow notifications. | Operator own inbox supported; broad notification management is not. |
| `support_tickets` | `Users manage own tickets` with admin bypass. | owner/platform admin `C/R/U/D` | Org-admin/provider queue authority is not shown. | Console admin management supported; wider visible role promise drifted. |
| `support_faqs` | `Public read for support faqs`. | public `R` only | Future authoring requires authorized receiver. | Dormant Console FAQ CRUD unsupported. |
| `health_news` | `Public read for health news`. | published public `R` only | Future authoring requires authorized receiver and schema fields. | Visible draft/publish CRUD unsupported in current source. |
| `documents` | `Public read public documents`. | public-tier/admin `R` only | Data-room administration belongs to `ivisit-docs`; Storage uploads are separate. | No normal Console document CRUD. |
| `user_activity` | Own select/insert; admin read policies. | user `C/R`; admin `R` | Guarded activity RPCs own Console activity projection. | Read/log only; not privileged mutation audit. |
| `admin_audit_log` | `Admins read audit log`. | platform admin `R` only | Critical audit insertion requires a guarded writer or proven backend path. | Existing browser insert promise is not shown as policy-authorized. |
| `search_history` | `Users manage own search history`. | owner `C/R/U/D` | QuickSearch is current UI owner. | Keep user-private history; no broad analytics CRUD. |
| `search_selections` | Own management, public insert, admin read. | user/private CRUD; anonymous/own `C`; admin `R` | Aggregation is separately guarded. | QuickSearch write is plausible; standalone management UI unnecessary. |
| `search_events` | Authenticated insert; admin read. | authenticated `C`; admin `R` | Analytics aggregation must remain truthful. | No update/delete; no fabricated metrics. |
| `trending_topics` | Public read; admin manage. | public `R`; admin `C/R/U/D` | Regeneration RPC is not truthful until implemented. | Manual/admin table capability exists; automatic success claim disabled. |
| `service_pricing` | `Public view active service pricing`; `Org Admins manage pricing`. | public `R`; org admin/admin `C/R/U/D` | Prefer scoped pricing RPCs for facility authority and shape. | Console CRUD permitted only with explicit hospital scope. |
| `room_pricing` | `Public view active room pricing`; `Org Admins manage room pricing`. | public `R`; org admin/admin `C/R/U/D` | Prefer scoped pricing RPCs for facility/room authority and shape. | Console CRUD permitted only with explicit hospital scope. |

## Direct Console Mutation Conflicts Found In Runtime Scan

The direct-write scan of `frontend/src` identifies visible or service-exposed operations that do not match the policy/command posture above. This is not a complete call-graph proof; it is an implementation blocking list.

| Current Console mutation signal | Target receiver | Authority conflict | Deterministic implementation posture |
| --- | --- | --- | --- |
| `organizationsService.js` direct insert/update/delete | `organizations` | Reviewed source proves public active read only. | Do not retain browser CRUD; require guarded administrative registry/onboarding receiver. |
| `hospitalsService.js` direct insert and partial table updates; `hospitalImportService.js` direct updates | `hospitals` | Source provides read policies and separate admin/availability RPC paths; operational fields have side effects. | Split metadata command from `update_hospital_availability`; discovery/import authority separately verified. |
| `AuthContext.jsx`, `profilesService.js`, `onboardingService.js`, `verificationService.js` direct profile writes | `profiles` | Owner update policy does not authorize admin updates of other profiles; onboarding/verification meaning is separate. | Use auth/admin/onboarding/verification receiver appropriate to the action; no orphan-profile direct create. |
| `walletService.js` inserts `wallet_ledger` and updates `payments` during repair-adjacent path | `wallet_ledger`, `payments` | Ledger has admin read only and payment writes are command-owned. | Remove normal UI repair mutation; isolate audited maintenance receiver only if authorized. |
| `visitsService.js` direct create/update/delete/status actions | `visits` | Policy is patient-own; emergency-derived rows are trigger/RPC-owned. | Split authorized administrative visits from request-derived read-only/command flow. |
| `healthNewsService.js` direct create/update/delete/publish/import | `health_news` | Current policy supports published read only. | Retain curated feed read boundary; no authoring UI until authorized. |
| `supportFaqsService.js` direct create/update/delete | `support_faqs` | Current policy supports public read only. | Keep adapter dormant; do not expose authoring. |
| `insuranceService.js` and `insurancePoliciesService.js` direct administrative CRUD/verify | `insurance_policies` | Policy supports policy-owner CRUD only. | Consolidate facade, then add guarded admin/support receiver before any administrative action. |
| `subscriptionService.js` and `subscribersService.js` update/delete writes | `subscribers` | Policy proves public insert/admin read only. | Establish lifecycle receiver for unsubscribe/status/email effects; no schema-fallback browser writes. |
| `trendingTopicsService.js` direct management and analytics automation | `trending_topics` | Admin table management exists, but regeneration RPC success is source-stubbed. | Allow explicitly manual/admin operations only; do not claim generated trends. |
| `ambulancesService.js` direct status/location/driver updates | `ambulances` | Fleet CRUD policy exists, but active response changes trigger failover and must align with request telemetry. | Separate non-active fleet administration from RPC-owned active operations. |
| `staffSchedulingService.js` updates doctors while showing shifts | `doctors` versus `doctor_schedules` | `doctor_schedules` has authorized CRUD; status changes do not persist shift fields. | Implement real schedule CRUD and keep availability separate. |

## Early Findings

1. Emergency status is heavily protected by triggers and session settings. Any direct update to `emergency_requests.status` from console service/page code is suspicious unless it goes through an RPC that calls `set_emergency_transition_context`.
2. Resource availability is trigger-coupled to emergency status and provider availability. Console UI cannot treat ambulance/hospital/doctor status as isolated fields.
3. Wallet ledger visibility is admin-only by policy in the visible scan. Org finance views may need RPC/service aggregation instead of direct ledger reads.
4. Pricing tables have public read policies but org/admin write policies. Console pricing pages must resolve org scope exactly.
5. Cron/scheduled updates are not source-controlled in current migrations; analytics/trending and subscriber processing should remain marked incomplete.
6. Policy-backed table CRUD and workflow commands are different rights. Emergency lifecycle, chat, money movement, active telemetry, and insurance-billing creation must stay command/trigger owned even where related table rows can be read or administered.
7. Current runtime exposes unsupported browser CRUD for organizations, published content, FAQs, subscribers, insurance administration, and request-derived visits; these are implementation blockers, not cleanup details.

## Next Trigger/Policy Work

- Reconfirm this full policy/CRUD posture after any shared migration or RLS change.
- Add line exhibits for high-risk trigger function bodies.
- Verify deployed/live policy parity for source-supported `providers`, `hospital_media`, schedules, assignments, billing, and Storage policies before enabling new UI commands.
- Compare policy helpers against console `AuthContext`, `rbacPatterns.js`, and navigation RBAC docs.
