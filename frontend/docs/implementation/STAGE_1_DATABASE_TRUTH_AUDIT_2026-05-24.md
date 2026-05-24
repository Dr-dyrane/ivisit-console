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

If generated docs disagree with migrations, trust the migrations until live database introspection proves otherwise.

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

## Cron/Scheduled Work

Not yet verified. Search targets:

- `cron.schedule`
- `pg_cron`
- `net.http_post`
- Supabase scheduled function conventions
- app or console automation docs

This must be completed before Stage 1 is marked done.

## Commands Used

```powershell
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)'
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE OR REPLACE FUNCTION public\.([a-zA-Z0-9_]+)'
Select-String -Path frontend\supabase\migrations\*.sql -Pattern 'CREATE TRIGGER ([a-zA-Z0-9_]+)|CREATE POLICY "?([^"\r\n]+)"?'
Get-ChildItem -Path frontend\supabase\functions -Directory
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
- any live/staging schema drift is explicitly marked as unverified or verified

## Recommended Commit Point

Commit after this Stage 1 document is expanded beyond inventory into the complete canonical matrix. Suggested commit message:

```text
Document console database truth audit
```
