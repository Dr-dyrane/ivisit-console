# RPC Mutation Matrix - 2026-05-24

## Status

Started. Static audit only. This matrix is based on migration signatures plus app/console call-site scans.

## Purpose

Classify database functions by mutation ownership before console service work begins. The console must not bypass RPCs that own cross-table side effects, RLS-sensitive updates, wallet movement, emergency status evidence, or app-visible lifecycle transitions.

## Sources Read

- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000400_finance.sql`
- `frontend/supabase/migrations/20260219000500_ops_content.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- Console call-site scan: `frontend/src`
- App call-site scan: `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services`, `hooks`, `components`, `supabase/functions`

## Core Mutation Matrix

| RPC / Function | Domain | Kind | Owner Surface | Console Call Sites | App Call Sites | Side Effects / Tables | Console Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `create_emergency_v4(p_user_id UUID, p_request_data JSONB, p_payment_data JSONB DEFAULT NULL)` | Emergency | write RPC | app primary, console fallback/create path | `emergencyService.js` | `emergencyRequestsService.js` | inserts `emergency_requests`, `visits`, optional `payments`; sets status context; may defer dispatch for cash/payment | critical: payload shape and patient location JSON must match app contract |
| `patient_update_emergency_request(p_request_id UUID, p_payload JSONB DEFAULT '{}')` | Emergency | write RPC | app patient updates | none observed in console | `emergencyRequestsService.js` | updates patient-facing request fields, status via transition context, triage/location snapshots | high: console should not use this for operator actions |
| `console_create_emergency_request(p_payload JSONB)` | Emergency | write RPC | console admin/operator create | `emergencyService.js` | none observed | inserts `emergency_requests`; logs transition evidence | high: payload must use UUIDs, not display IDs |
| `console_update_emergency_request(p_request_id UUID, p_payload JSONB)` | Emergency | write RPC | console operator update | `emergencyService.js`, `emergencyResponseService.js`, `bedManagementService.js`, `driverManagementService.js` | `serviceCostService.js` | updates request fields, status via transition context, location/triage fields | critical: central console update path; direct page writes are suspect |
| `console_dispatch_emergency(p_request_id UUID, p_ambulance_id UUID, p_hospital_id UUID DEFAULT NULL, ...)` | Emergency/Dispatch | write RPC | console dispatch | `emergencyService.js`, `emergencyResponseService.js` | none observed | assigns ambulance/hospital/bed/responder fields; updates ambulance state; logs transition | critical: paired ambulance plus bed flow depends on this shape |
| `console_complete_emergency(p_request_id UUID)` | Emergency | write RPC | console completion | `emergencyService.js`, `emergencyResponseService.js`, `bedManagementService.js`, `driverManagementService.js` | none observed | completes request, visit, resource availability | critical: completion side effects must stay RPC-owned |
| `console_cancel_emergency(p_request_id UUID, p_reason TEXT DEFAULT NULL)` | Emergency | write RPC | console cancellation | `emergencyService.js`, `bedManagementService.js`, `driverManagementService.js` | none observed | cancels request, visit/resource state, status evidence | critical: cancellation must not be a direct status update |
| `console_update_responder_location(p_request_id UUID, p_location JSONB, p_heading DOUBLE PRECISION DEFAULT NULL)` | Emergency/Realtime | write RPC | console/responder location | `emergencyService.js`, `emergencyResponseService.js` | none observed | updates request responder location/heading with geometry conversion | high: geometry parser and heading normalization matter |
| `approve_cash_payment(p_payment_id UUID, p_request_id UUID)` | Payment/Emergency | write RPC | app and console approval | `emergencyService.js` | `paymentService.js` | validates payment/request/org wallet; moves fee; updates payment, request, visit; notifies | critical: never replace with page-level ledger/payment writes |
| `decline_cash_payment(p_payment_id UUID, p_request_id UUID)` | Payment/Emergency | write RPC | app and console decline | `emergencyService.js` | `paymentService.js` | marks payment/request/visit declined/cancelled; status evidence | critical: decline must keep request and payment in lockstep |
| `process_cash_payment(p_emergency_request_id UUID, p_organization_id UUID, p_amount NUMERIC, p_currency TEXT DEFAULT 'USD')` | Payment/Wallet | write RPC | console wallet path | `walletService.js` | none observed | cash fee/payment processing path | high: compare against app `process_cash_payment_v2` |
| `process_cash_payment_v2(...)` | Payment/Wallet | write RPC | app cash path | none observed | `paymentService.js` | organization wallet fee movement, platform wallet credit, payment row, request payment status | critical: console may need v2 parity or documented reason for v1 use |
| `process_wallet_payment(p_user_id UUID, p_organization_id UUID, p_emergency_request_id UUID, p_amount NUMERIC, p_currency TEXT DEFAULT 'USD')` | Payment/Wallet | write RPC | app wallet path | none observed | `paymentService.js` | debits patient wallet, credits org/platform, creates payment and ledger | critical: wallet ledger ownership |
| `retry_payment_with_different_method(p_emergency_request_id UUID, p_new_payment_method_id UUID, p_user_id UUID)` | Payment | write RPC | app and console retry | `emergencyService.js` | none observed in scanned app services except payment-related flow not direct | updates failed payment method retry path | medium/high: verify expected app call surface |
| `process_visit_tip(p_visit_id UUID, p_tip_amount NUMERIC, p_currency TEXT DEFAULT 'USD')` | Visits/Wallet | write RPC | app visit tip | none observed | `paymentService.js` | wallet/payment/tip fields on `visits` | medium: console should render tip data read-only unless admin action exists |
| `record_visit_cash_tip(p_visit_id UUID, p_tip_amount NUMERIC, p_currency TEXT DEFAULT 'USD')` | Visits/Payment | write RPC | app cash tip | none observed | `paymentService.js` | records cash tip payment and visit tip fields | medium |
| `calculate_emergency_cost_v2(...)` | Pricing | read/calculation RPC | app pricing | none observed in console services | `pricingService.js`, `serviceCostService.js` | reads pricing, hospital/org fee, insurance/currency context | high: console pricing CRUD must preserve app cost formula assumptions |
| `upsert_service_pricing(payload JSONB)` | Pricing | write RPC | console/org admin pricing | `pricingService.js` | scripts only | upserts `service_pricing` after org/hospital access checks | high: service pricing page should use only this path |
| `delete_service_pricing(target_id UUID)` | Pricing | write RPC | console/org admin pricing | `pricingService.js` | none observed | deletes `service_pricing` after access checks | medium/high |
| `upsert_room_pricing(payload JSONB)` | Pricing | write RPC | console/org admin room pricing | `pricingService.js` | scripts only | upserts `room_pricing` after access checks | high: bed pricing depends on this |
| `delete_room_pricing(target_id UUID)` | Pricing | write RPC | console/org admin room pricing | `pricingService.js` | none observed | deletes `room_pricing` after access checks | medium/high |
| `update_hospital_availability(hospital_id UUID, beds_available INTEGER, er_wait_time INTEGER, p_status TEXT, ambulance_count INTEGER)` | Hospital/Capacity | write RPC | app realtime capacity, console capacity | none observed in console services yet | `realtimeAvailabilityService.js` | updates hospital availability/count/status fields | high: console should use this instead of ad hoc hospital updates for availability |
| `update_hospital_by_admin(target_hospital_id UUID, payload JSONB)` | Hospital/Admin | write RPC | console admin | `hospitalsService.js` | none observed | admin-safe hospital update | high: page-level hospital writes should be suspect |
| `delete_hospital_by_admin(target_hospital_id UUID)` | Hospital/Admin | write RPC | console admin | `hospitalsService.js` | none observed | deletes hospital and related ambulances; bypasses RLS by design | critical: destructive admin action |
| `update_profile_by_admin(p_user_id UUID, p_payload JSONB)` | Identity/Admin | write RPC | console admin | `profilesService.js` | none observed | admin-safe profile update | high: profile shape, roles, org scope |
| `delete_user_by_admin(target_user_id UUID)` | Identity/Admin | write RPC | console page-level call | `UsersPage.jsx` | none observed | destructive auth/profile action | critical: currently page calls RPC directly |
| `delete_user()` | Identity | write RPC | app user self-delete | none observed | `authService.js` | deletes current user/profile | high: auth side effects |
| `get_entity_id(p_display_id TEXT)` | Identity/IDs | read helper | app and console bridge | `displayIdService.js` | `displayIdService.js` | resolves display ID to UUID through prefix/table/id_mappings | critical: required before UUID mutations |
| `log_user_activity(...)` | Audit | write RPC | app and console audit | `activityService.js`, `supabaseHelpers.js` | `supabaseHelpers.js` | inserts `user_activity`; should not block main op | medium |
| `notify_cash_approval_org_admins(...)` | Notification/Payment | write RPC | app notification side effect | none observed in console | `notificationDispatcher.js` | inserts notifications for org admins | medium/high: console cash approval should verify notification path |
| `nearby_hospitals(...)` | Discovery/Map | read RPC | app and console map/import | `hospitalImportService.js`, `supabaseMapService.js` | `hospitalsService.js` | reads hospitals with distance/eligibility fields | high: return shape feeds app search/map and console map |
| `nearby_ambulances(...)` | Discovery/Dispatch | read RPC | app dispatch/search | none observed in console services | not directly observed in app service scan | reads ambulances with distance/status | medium: console dispatch may need parity |
| `nearby_providers(...)` | Discovery | read RPC | app provider discovery | none observed in console | `hospitalsService.js` | reads provider/hospital union fields | high: providers/hospitals/doctors overlap needs audit |
| `get_all_auth_users(p_organization_id UUID DEFAULT NULL)` | Admin/Users | read RPC | console users | `profilesService.js` | none observed | joins auth user data to profiles | high: user admin page depends on exact returned fields |
| `search_auth_users(search_term TEXT)` | Admin/Users | read RPC | console users | `profilesService.js` | none observed | searches auth/profile records | medium |
| `get_user_statistics()` | Admin/Users | read RPC | console dashboards | `profilesService.js` | none observed | profile/user stats | low/medium |
| `admin_update_trending_topics(payload JSONB)` | Analytics | write/admin RPC | console analytics | `analyticsAutomationService.js` | none observed | updates `trending_topics` from search data | medium: cron/source-control gap remains |
| `update_trending_topics_from_search()` | Analytics | write RPC | console/manual automation | `analyticsAutomationService.js` | none observed | refreshes trending topics | medium: should be scheduled or explicitly manual |

## RPCs Needing Signature Follow-Up

These appear in app or console call sites and should be classified in the next pass:

- `current_user_is_admin`
- `current_user_permission_level`
- `get_recent_activity`
- `get_activity_stats`
- `get_search_analytics`
- `get_search_analytics_summary`
- `is_admin`
- `get_trending_searches`
- `get_org_stripe_status`
- `check_cash_eligibility`
- `reload_schema`
- `exec_sql`
- `get_available_ambulances`
- `get_available_doctors`
- `assign_ambulance_to_emergency`
- `assign_doctor_to_emergency`
- `get_billing_quote`
- `validate_payment_method`
- `validate_insurance_coverage`
- `get_insurance_policies`
- `ensure_emergency_chat_room`
- `send_emergency_chat_message`
- `mark_emergency_chat_room_read`

## Early Findings

1. Console and app both use `approve_cash_payment` / `decline_cash_payment`, so those RPCs are true shared contract points.
2. Console uses `process_cash_payment`, while app uses `process_cash_payment_v2`; this is a drift candidate until payloads and side effects are compared line-by-line.
3. Console calls `delete_user_by_admin` directly from `UsersPage.jsx`; the audit should decide whether this remains page-level or moves behind `profilesService`.
4. Console uses `create_emergency_v4` and `console_create_emergency_request`; the correct split between patient-compatible create and operator create must be documented before implementation.
5. `update_hospital_availability` is called by the app but not yet observed in console services; hospital capacity UI may be bypassing the canonical capacity RPC.
6. Several RPCs are `SECURITY DEFINER`; service code must treat them as privileged mutation surfaces, not convenience wrappers.

## Next RPC Work

- Extract exact argument and return shapes for every high-risk RPC above.
- Add line exhibits for each RPC body once the matrix is stable.
- Compare `process_cash_payment` vs `process_cash_payment_v2`.
- Compare `create_emergency_v4` payload extraction against app `emergencyRequestsService.js`.
- Map every console direct `.from(...).update/insert/delete` call against this matrix to find bypasses.
