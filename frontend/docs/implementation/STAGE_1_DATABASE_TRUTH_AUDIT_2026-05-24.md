# Stage 1 Database Truth Audit - 2026-05-24

## Status

Started. This is the first concrete audit stage for console-app alignment. No product code should change from this document alone.

## Objective

Establish the database, RPC, trigger, Edge Function, ID, and Postgres behavior that `ivisit-console` must respect before service or UI alignment begins.

## Canonical Sources

Use current pillar migrations first:

- `frontend/supabase/migrations/20260219000000_infra.sql`
- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000200_org_structure.sql`
- `frontend/supabase/migrations/20260219000300_logistics.sql`
- `frontend/supabase/migrations/20260219000400_finance.sql`
- `frontend/supabase/migrations/20260219000500_ops_content.sql`
- `frontend/supabase/migrations/20260219000600_analytics.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`
- `frontend/supabase/migrations/20260219000900_automations.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`

Reference docs are secondary:

- `frontend/supabase/docs/REFERENCE.md`
- `frontend/supabase/docs/MODULE_SCHEMA_BIBLE.md`
- `frontend/supabase/docs/API_REFERENCE.md`
- `frontend/supabase/docs/SCHEMA_SNAPSHOT.md`
- `frontend/docs/database/DATABASE_SCHEMA.md`
- `frontend/docs/database/DATABASE_SCHEMA_REFERENCE.md`

App repo cross-checks:

- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/docs/REFERENCE.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/tests/validation/table_flow_trace_*.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/tests/scripts/`

If generated docs disagree with migrations, trust the migrations until live database introspection proves otherwise.

The app repo is the reference implementation for intent and scope. Console does not need to copy every app abstraction in Stage 1, but app services, hooks, Edge Functions, and tests should be consulted to catch missing console service coverage.

## Initial Table Inventory

Found from current console pillar migrations:

```text
admin_audit_log
ambulances
doctor_schedules
doctors
documents
emergency_chat_messages
emergency_chat_participants
emergency_chat_rooms
emergency_contacts
emergency_doctor_assignments
emergency_requests
emergency_status_transitions
exchange_rates
health_news
hospital_import_logs
hospital_media
hospitals
id_mappings
insurance_billing
insurance_policies
ivisit_main_wallet
medical_profiles
notifications
organization_wallets
organizations
patient_wallets
payment_methods
payments
preferences
profiles
providers
room_pricing
search_events
search_history
search_selections
service_pricing
subscribers
support_faqs
support_tickets
trending_topics
user_activity
user_roles
user_sessions
visits
wallet_ledger
```

Next action: expand this into a table-by-table matrix with columns, types, defaults, nullability, constraints, indexes, RLS policies, owning services, and app/console usage.

The first subtree matrix has started at:

- `frontend/docs/database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`

Keep detailed table findings in that subtree. This stage document should summarize and link, not absorb every table row.

## Initial Function/RPC Inventory

Found from current console pillar migrations:

```text
admin_update_trending_topics
approve_cash_payment
archive_emergency_chat_room_on_request_close
assign_ambulance_to_emergency
assign_doctor_to_emergency
auto_assign_ambulance
auto_assign_doctor
auto_assign_driver
calculate_ambulance_eta
calculate_emergency_cost_v2
calculate_emergency_priority
cancel_bed_reservation
cancel_trip
canonicalize_emergency_status
check_cash_eligibility
check_hospital_capacity
complete_card_payment
complete_trip
console_cancel_emergency
console_complete_emergency
console_create_emergency_request
console_dispatch_emergency
console_update_emergency_request
console_update_responder_location
convert_currency_for_payment
create_emergency_v4
create_insurance_billing_on_completion
current_user_is_admin
current_user_permission_level
decline_cash_payment
delete_hospital_by_admin
delete_room_pricing
delete_service_pricing
delete_user
delete_user_by_admin
discharge_patient
enforce_emergency_status_write_path
ensure_emergency_chat_room
exec_sql
fail_card_payment
generate_display_id
generate_username_from_email
get_activity_stats
get_all_auth_users
get_ambulance_status
get_available_ambulances
get_available_doctors
get_billing_quote
get_emergency_medical_data
get_entity_id
get_fallback_payment_options
get_insurance_policies
get_medical_summary
get_org_stripe_status
get_recent_activity
get_room_price
get_search_analytics
get_search_analytics_summary
get_service_price
get_trending_searches
get_user_statistics
handle_ambulance_unavailability_failover
handle_doctor_unavailability_failover
handle_new_organization
handle_new_user
handle_updated_at
is_admin
is_valid_emergency_status_transition
jsonb_to_point_geometry
log_emergency_status_transition
log_profile_updates
log_user_activity
mark_emergency_chat_room_read
nearby_ambulances
nearby_hospitals
nearby_providers
normalize_hospital_bed_state
notify_cash_approval_org_admins
notify_emergency_events
p_get_current_org_id
p_is_admin
p_is_console_allowed
p_is_emergency_chat_participant
patient_update_emergency_request
prevent_emergency_status_transition_mutation
process_cash_payment
process_cash_payment_v2
process_insurance_claim
process_payment_distribution
process_visit_tip
process_wallet_payment
rate_visit
recalculate_onboarding_status
record_visit_cash_tip
release_doctor_assignment
reload_schema
resolve_currency_for_country
retry_payment_with_different_method
search_auth_users
send_emergency_chat_message
set_emergency_transition_context
stamp_entity_display_id
sync_dispatch_eligibility
sync_doctor_record_from_profile
sync_emergency_to_visit
track_emergency_progress
update_ambulance_location
update_ambulance_status
update_hospital_availability
update_hospital_by_admin
update_medical_profile
update_profile_by_admin
update_resource_availability
update_trending_topics_from_search
upsert_room_pricing
upsert_service_pricing
validate_emergency_request
validate_emergency_status_transition
validate_insurance_coverage
validate_medical_profile
validate_payment_method
```

Next action: classify each function as read, write, trigger-only, RPC, auth helper, validation helper, pricing helper, dispatch helper, payment helper, or deprecated/legacy candidate.

The first RPC classification matrix has started at:

- `frontend/docs/database/console-app-alignment/RPC_MUTATION_MATRIX_2026-05-24.md`

Current high-risk drift candidates:

- Console uses `process_cash_payment`; app uses `process_cash_payment_v2`.
- Console page code calls `delete_user_by_admin` directly.
- App calls `update_hospital_availability`; console service usage is not yet observed.
- Emergency status mutations must go through RPCs that set transition context.

## Initial Edge Function Inventory

Found under `frontend/supabase/functions/`:

```text
check-user
discovery
invite-user
payments
shared
unsubscribe
webhooks
```

Next action: open each function and map external inputs, table writes, RPC calls, auth requirements, and app/console call sites.

## ID Rules To Verify

Working rule:

- `id` is the database identity and should be UUID.
- `display_id` is for user-visible labels, search, support, and cross-surface readability.
- UI may show `display_id`.
- Mutations should resolve to UUID before touching data paths that expect `id`.
- `id_mappings` and `get_entity_id` are the bridge.

Known display prefixes from current migration logic:

```text
USR / ADM / DOC / PAT / HSP / ORG / AMB / REQ / VIST / PAY / NTF / WLT / OWL
```

Risk to audit:

- page forms passing display IDs directly into UUID columns
- mixed `requestId`, `displayId`, `id`, and `request_uuid` naming
- RPCs accepting `TEXT` for UUID-like inputs
- visits historically having ID type migration concerns
- app services accepting beautified IDs and resolving through `get_entity_id`

## Postgres Nuances To Track

- `SECURITY DEFINER` functions can bypass RLS and must be treated as privileged mutation surfaces.
- RLS helpers must avoid recursion.
- `jsonb` payloads require explicit field validation before an RPC trusts them.
- Geometry/point fields need one canonical parser/serializer path.
- Append-only tables such as emergency status transitions should not be updated by UI code.
- Triggers can mutate related resources after the visible RPC returns.
- `updated_at` triggers can mask whether the business state actually changed.
- `CHECK` constraints or validation functions should define status truth, not UI dropdowns.
- Cash payment and wallet flows must be transactional because ledger, organization wallet, main wallet, payment row, and emergency request status are linked.

## Trigger And Policy Work Remaining

The initial scan found many policies and triggers, including:

- display ID stamping triggers
- `updated_at` triggers
- emergency status validation/logging triggers
- emergency resource sync triggers
- dispatch eligibility sync
- hospital bed normalization
- emergency chat archive/read triggers
- new user and new organization triggers
- payment completion/distribution triggers
- doctor and ambulance unavailability failover triggers

Next action: build a trigger matrix:

| Trigger | Table | Timing | Function | Side Effect | Console Risk |
| --- | --- | --- | --- | --- | --- |

Then build an RLS matrix:

| Table | Policy | Operation | Role/Scope | Helper Function | Console Risk |
| --- | --- | --- | --- | --- | --- |

The first trigger/policy matrix has started at:

- `frontend/docs/database/console-app-alignment/TRIGGER_POLICY_MATRIX_2026-05-24.md`

## Edge Function Matrix

The Edge Function side-effect matrix has started at:

- `frontend/docs/database/console-app-alignment/EDGE_FUNCTION_MATRIX_2026-05-24.md`

Current findings:

- `discovery/index.ts` behaves like a user existence/check-user function, not provider discovery.
- `payments/index.ts` behaves like an invite-user/admin invitation function, not a payment processor.
- `process-subscribers`, `sendWelcome`, and `webhooks` mutate subscriber lifecycle state.
- `sendBulkEmail`, `sendCustomEmail`, `sendWelcome`, and `process-subscribers` can send external email.
- Several functions have no observed in-function admin authorization check.
- Email HTML includes mojibake and should be scanned before any public campaign.

## UUID And Display ID Rules

The identity rule doc has started at:

- `frontend/docs/database/console-app-alignment/UUID_DISPLAY_ID_RULES_2026-05-24.md`

Working rule:

- `id` is the UUID database identity.
- `display_id` is the human-readable label.
- `id_mappings` and `get_entity_id` bridge display IDs into UUIDs.
- Console mutations should use UUIDs unless an RPC intentionally accepts display ID text.

Stage 2 must prove this service by service.

## Postgres Nuance Risk Register

The Postgres risk register has started at:

- `frontend/docs/database/console-app-alignment/POSTGRES_NUANCE_RISK_REGISTER_2026-05-24.md`

High-risk themes:

- `SECURITY DEFINER` RPC boundaries.
- `exec_sql` exposure.
- emergency transition context and triggers.
- JSONB payload contracts.
- wallet/payment atomicity.
- geometry serialization.
- generated-doc drift.
- missing source-controlled cron.
- mojibake in generated/public surfaces.

## Read-Only Audit Guardrails

The read-only evidence map has started at:

- `frontend/docs/database/console-app-alignment/READ_ONLY_AUDIT_EVIDENCE_2026-05-24.md`

This audit must not run database resets, migration runners, seeders, repair scripts, cleanup scripts, email scripts, subscriber processors, or mutating Edge Functions. Scripts from `ivisit-app` are valuable reference evidence but are not safe to execute by default because many insert, update, delete, call mutating RPCs, or clean up fixtures.

## Cron/Scheduled Work

Initial static search result:

- Current migrations enable `pgcrypto` and `postgis`.
- No current migration was found that enables `pg_cron` or calls `cron.schedule`.
- `frontend/docs/architecture/CONSOLE_GRAND_REFACTOR_PLAN.md` explicitly notes that cron schedules belong in migrations and calls out a missing `pg_cron` migration for `process-subscribers`.
- Legacy references mention a commented `cron.schedule('update-trending-topics', '0 */6 * * *', 'SELECT update_trending_topics_from_search();')`, but this is not current source-of-truth migration behavior.

Remaining search targets:

- `cron.schedule`
- `pg_cron`
- `net.http_post`
- Supabase scheduled function conventions
- app or console automation docs

This must be completed before Stage 1 is marked done.

## Current App-Console Gap Signals

Static cross-checks against `ivisit-app` show that the app has a more mature L5-style surface:

- service modules for payment, pricing, route, discovery, emergency requests, dispatch, realtime availability, visits, medical profile, preferences, notifications, and app migrations
- hooks/query layers for visits, payment, map, medical profile, search, and emergency surfaces
- XState/Jotai/Zustand-adjacent architecture docs and implementations
- Supabase `_shared` Edge Function utilities for HTTP, env, auth, payments, providers, and domain normalization
- validation scripts for runtime CRUD, cross-repo contracts, console UI CRUD contracts, direct mutation surfaces, Edge Function smoke, table-flow trace export, and emergency hardening

Console currently has many CRUD services, but Stage 2 must prove field coverage and mutation ownership service by service rather than assuming parity from matching table names.

## Commands Used

```powershell
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)'
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE OR REPLACE FUNCTION public\.([a-zA-Z0-9_]+)'
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE TRIGGER ([a-zA-Z0-9_]+)|CREATE POLICY "?([^"\r\n]+)"?'
Get-ChildItem -Path frontend\supabase\functions -Directory
rg --files -g ".env*" -g "*.ps1" -g "*.js" frontend\supabase frontend\scripts frontend\src\utils .
rg --files frontend\supabase\tests frontend\supabase\scripts frontend\supabase\functions -g "*.js" -g "*.ts" -g "*.sql" -g "*.md"
rg -n "rpc\('|\.from\('|\.insert\(|\.update\(|\.delete\(|\.upsert\(" frontend\src -S
```

## Stage 1 Completion Criteria

Stage 1 is not complete until:

- every table has a row in the canonical matrix
- every RPC/function is classified
- every Edge Function has inputs, outputs, and data side effects mapped
- every trigger has owner table, timing, function, and side effect documented
- every policy has operation and access scope documented
- UUID/display ID rules are checked against app and console services
- Postgres nuance risks are called out by domain
- app repo and console repo schema sources are compared
- app repo services/tests are consulted for missing console implementation scope
- read-only audit guardrails are documented before any live/staging introspection
- any live/staging schema drift is explicitly marked as unverified or verified

## Recommended Commit Point

Commit after this Stage 1 document is expanded beyond inventory into the complete canonical matrix. Suggested commit message:

```text
Document console database truth audit
```
