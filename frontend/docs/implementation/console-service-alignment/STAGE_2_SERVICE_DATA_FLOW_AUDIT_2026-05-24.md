# Stage 2 Service Data Flow Audit - 2026-05-24

## Status

Started after Stage 1 database truth checkpoint `497622d`.

This is still audit-only. No product code changes are authorized by this document.

## Objective

Map `ivisit-console` service behavior against:

- current console database truth
- current console UI consumption
- `ivisit-app` service/hook behavior
- RPC, trigger, RLS, Edge Function, and realtime ownership

The goal is to make console work as the operational back office for the app without broad refactors or accidental direct-table bypasses.

## Reference Sources

Console:

- `frontend/src/services/`
- `frontend/src/hooks/`
- `frontend/src/components/`
- `frontend/docs/database/console-app-alignment/`

App:

- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/atoms/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/machines/`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/tests/scripts/`

## Service Inventory Snapshot

Console has service coverage for:

```text
activity
admin
analytics
analyticsAutomation
ambulances
auth
bedManagement
displayId
doctors
driverManagement
emergency
emergencyResponse
healthNews
hospitalImport
hospitals
insurance
insurancePolicies
medicalProfiles
notification
onboarding
organizations
orgVerification
preferences
pricing
profiles
searchAnalytics
searchEvents
searchHistory
searchSelections
staffScheduling
subscribers
subscription
supportFaqs
supportTickets
trendingTopics
verification
visits
wallet
```

App has deeper patient-facing service coverage for:

```text
ambulance
appMigrations
auth
billingQuote
dispatch
discovery
emergencyChat
emergencyContacts
emergencyRequests
hospitals
insurance
medicalProfile
notifications
payment
preferences
pricing
profileCompletion
realtimeAvailability
route
savedLocationsSync
serviceCost
triage
visits
```

## First Gap Signals

| Area | Console Signal | App Reference Signal | Audit Meaning |
| --- | --- | --- | --- |
| Emergency creation | Console has `createEmergencyRequest` with `create_emergency_v4` and `console_create_emergency_request` fallback. | App uses `create_emergency_v4`, active-request preflight, patient mapping, local fallback, and payment deferral metadata. | Console must keep RPC creation but verify exact payload parity and active-request handling. |
| Patient update | Console uses `console_update_emergency_request`. | App patient path uses `patient_update_emergency_request` after resolving display ID to UUID. | Console operator updates and patient updates are intentionally different trust boundaries. |
| Dispatch | Console uses `console_dispatch_emergency` and `console_update_responder_location`. | App subscribes to request and ambulance updates and preserves route/ETA identity in hooks. | Console dispatch responses must include enough fields for app realtime recovery. |
| Cash payment | Console still exposes `process_cash_payment` in wallet service. | App creates cash flow through `create_emergency_v4` and approval through `approve_cash_payment`; app docs name `process_cash_payment_v2` as app-heavy. | Legacy RPC use needs narrowing; approval path seems canonical, manual processing needs proof. |
| Hospital availability | Console has direct `hospitals` updates for beds/status. | App has `realtimeAvailabilityService.updateAvailability()` calling `update_hospital_availability`. | Console should likely route capacity/status through the same RPC unless admin CRUD is intentionally broader. |
| Bed flow | Console computes reservation utilization from emergency rows and hospital totals. | App builds bed room availability from `bed_availability`, `room_pricing`, `available_beds`, and hospital snapshots. | Console bed views may under-model room buckets and price/availability contracts. |
| Pricing | Console CRUD uses `upsert_*_pricing` RPCs. | App checkout reads hierarchy: entity override -> hospital pricing -> hospital base -> global defaults -> fallback. | Console pricing writes must populate fields app reads for checkout. |
| Edge Functions | Console wallet calls `create-payment-intent`, `create-payout`, and `manage-payment-methods`; Stage 1 local function tree does not include those names. | App references these functions as payment infrastructure. | Need deployed function/source ownership map before finance UI can be declared aligned. |

## Stage 2 Method

For each service:

1. List service exports.
2. List read tables/RPCs/functions.
3. List mutation tables/RPCs/functions.
4. Map accepted input identity: UUID, display ID, email, auth user, organization ID, hospital ID.
5. Map payload fields to database columns or RPC JSONB extraction.
6. Map rendered UI fields.
7. Compare against `ivisit-app` reference service/hook behavior.
8. Mark status: `aligned`, `drift suspected`, `missing implementation`, or `needs live read-only introspection`.

## Commit Discipline

Commit after each coherent service-family map, not after every small note. Suggested boundaries:

- emergency/payment/capacity map
- identity/admin/user map
- provider/hospital/doctor/ambulance map
- content/support/subscriber/search map
- final Stage 2 index and implementation plan

## Current Stage 2 Documents

- `frontend/docs/implementation/console-service-alignment/EMERGENCY_PAYMENT_CAPACITY_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/VISITS_CONTENT_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/README.md`

## First Coverage Pass Summary

The first Stage 2 pass now covers the main console service families:

- emergency/payment/capacity
- identity/admin/provider operations
- visits/medical/insurance/content/subscriber/search/support

The next audit layer should produce exact field-to-UI and payload-to-RPC charts for drift-suspected services before any implementation changes.

## Exact Contract Exhibit Pass

The next layer has started under `frontend/docs/implementation/console-service-alignment/contracts/`.

Completed source-only exhibits:

- emergency creation/update, manual cash completion, wallet ledger repair, and availability mutation
- profile editing and display ID resolution
- visits ownership and subscriber lifecycle

First confirmed contract failures requiring implementation planning:

- Console cash completion first marks the request `completed`, then invokes an RPC whose v2 receiver rejects completed requests.
- The emergency create modal provides status, bed number, cost, and payment-status fields that the atomic creation path does not consistently forward or persist.
- The current hospital edit path does not persist the visible ER-wait field; a follow-up trigger proof corrected the earlier bed-snapshot concern because `normalize_hospital_bed_state` maintains scalar-bed projection into `bed_availability`.
- Admin profile edit accepts fields, including email and image/name components, that `update_profile_by_admin` does not update.
- The display ID bulk resolver queries `hospitals` for consumers that supply profile/provider IDs.
- Direct visit CRUD has no documented separation for rows whose lifecycle is owned by emergency-to-visit synchronization.
- Subscriber lifecycle flags are written by multiple console services and Edge Functions.

All findings above are static source findings. Runtime and deployed-schema proof remains read-only follow-up work.

## Trigger And Edge Function Ownership Follow-Up

The contract subtree now includes an ownership proof pass. It confirms:

- `create_emergency_v4` creates an associated visit, while `console_create_emergency_request` does not.
- `sync_emergency_to_visit` only updates an already-associated visit row and cannot create linkage missing from fallback creation.
- `sendWelcome` sends mail but updates only `new_user`, while `process-subscribers` selects by `welcome_email_sent` and can send the welcome mail again.

It also corrects one preliminary conclusion: direct bed scalar writes execute the hospital normalization trigger, which reconstructs `bed_availability` and timestamps changed capacity.
