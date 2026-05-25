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
7. For each rendered or submitted field, record the expected shape and the live/app shape: scalar, object, JSON string, array, nullable, enum/check value, date, number, geometry, or derived display value.
8. Compare against `ivisit-app` reference service/hook behavior.
9. Mark status: `aligned`, `drift suspected`, `missing implementation`, or `needs live read-only introspection`.

## Field-Contract Granularity Rule

The audit is not complete for a service until its high-risk UI fields have an explicit field-to-UI and payload-to-receiver chart. The chart must be granular enough to catch render-time defects, not only write-time defects.

Required checks:

- database column/RPC JSON key name
- source shape supplied by `ivisit-app`, console service, or live read-only evidence
- service transform, fallback, and default
- hook/query projection shape
- UI render assumption and formatter
- mutation payload key and value shape
- SQL/RPC/Edge Function receiver expectation
- user-visible failure mode when the shape is wrong

Example defect class: `ambulance_type` may arrive as a scalar string such as `ambulance`, not only a JSON object/string with a `title`. A detail modal that blindly runs `JSON.parse` on that field is a field-contract violation even if the surrounding emergency service and table are otherwise reachable.

## Commit Discipline

Service-family maps and contract exhibits are working evidence, not individual commit boundaries. Continue adding them locally until the complete contract-truth pack includes:

- database/RPC/RLS/Edge Function ownership
- `ivisit-app` mutation and dependency evidence
- console service, UI, and missing-capability mapping
- exact field/payload contract exhibits
- read-only confirmation where safe and relevant
- ordered implementation inputs

Publish the pack in one coherent commit once these pieces are complete and indexed. Use an interim checkpoint only for an explicitly requested push, a deployment/build repair baseline, or a before/after boundary required for a sync or schema refresh.

## Current Stage 2 Documents

- `frontend/docs/implementation/console-service-alignment/service-maps/EMERGENCY_PAYMENT_CAPACITY_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/service-maps/IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/service-maps/VISITS_CONTENT_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/README.md`
- `frontend/docs/implementation/console-service-alignment/contracts/READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md`

## First Coverage Pass Summary

The first Stage 2 pass now covers the main console service families:

- emergency/payment/capacity
- identity/admin/provider operations
- visits/medical/insurance/content/subscriber/search/support

The next audit layer should produce exact field-to-UI and payload-to-RPC charts for drift-suspected services before any implementation changes. These charts must inspect render-time assumptions with the same seriousness as mutation payloads.

## Exact Contract Exhibit Pass

The next layer has started under `frontend/docs/implementation/console-service-alignment/contracts/`.

Completed source-only exhibits:

- emergency creation/update, manual cash completion, wallet ledger repair, and availability mutation
- profile editing and display ID resolution
- visits ownership and subscriber lifecycle
- ambulance fleet, doctor invite/projection, and staff scheduling

First confirmed contract failures requiring implementation planning:

- Console cash completion first marks the request `completed`, then invokes an RPC whose v2 receiver rejects completed requests.
- The emergency create modal provides status, bed number, cost, and payment-status fields that the atomic creation path does not consistently forward or persist.
- The current hospital edit path does not persist the visible ER-wait field; a follow-up trigger proof corrected the earlier bed-snapshot concern because `normalize_hospital_bed_state` maintains scalar-bed projection into `bed_availability`.
- Admin profile edit accepts fields, including email and image/name components, that `update_profile_by_admin` does not update.
- The display ID bulk resolver queries `hospitals` for consumers that supply profile/provider IDs.
- Direct visit CRUD has no documented separation for rows whose lifecycle is owned by emergency-to-visit synchronization.
- Subscriber lifecycle flags are written by multiple console services and Edge Functions.
- Ambulance UI offers a schema-invalid `busy` status and collects fields its table/service cannot persist.
- Manual doctor creation can insert an unlinked directory row before an invitation triggers creation of a second profile-linked doctor row.
- Staff scheduling collects shift fields but writes only doctor status rather than `doctor_schedules`.

All findings above are static source findings. Runtime and deployed-schema proof remains read-only follow-up work.

## Trigger And Edge Function Ownership Follow-Up

The contract subtree now includes an ownership proof pass. It confirms:

- `create_emergency_v4` creates an associated visit, while `console_create_emergency_request` does not.
- `sync_emergency_to_visit` only updates an already-associated visit row and cannot create linkage missing from fallback creation.
- `sendWelcome` sends mail but updates only `new_user`, while `process-subscribers` selects by `welcome_email_sent` and can send the welcome mail again.

It also corrects one preliminary conclusion: direct bed scalar writes execute the hospital normalization trigger, which reconstructs `bed_availability` and timestamps changed capacity.

## Read-Only Live Confirmation Checkpoint

An aggregate-only SELECT pass has now tested the highest-risk source findings against currently readable shared tables. No row identifiers or private content were recorded, and no RPC, Edge Function, repair routine, migration, or database write was executed.

Confirmed current exposure:

- one cash-linked request is terminal while its payment is not completed
- seven cash payment rows have organization identity inconsistent with the associated request hospital organization
- two subscriber rows remain welcome-batch eligible after `new_user` has already been cleared
- ambulance `image`, `last_maintenance`, and `rating` columns are absent from the live table surface exposed to the console
- all 1,278 readable hospitals have empty `bed_availability`, even though 127 carry positive scalar available-bed values; source normalization exists, but current population cannot be considered aligned

Narrowed forward-only risks:

- no currently missing emergency-to-visit linkage was observed across 160 emergency requests
- no currently unlinked doctor directory rows were observed across 232 doctors

These zero-current-incident results do not erase the source-proven fallback-creation and create-then-invite defects. They establish repair scope separately from forward contract repair.

## Care, Content, And Analytics Contract Pass

The next exact exhibit now covers services whose page promises depend directly on RLS or shared app/console field shape:

- Insurance management exposes admin and org-admin policy operations through direct browser table calls, but current RLS source grants policy CRUD only to the patient owner. Modern policy fields exist live and in generated types while the current finance pillar table declaration remains on the older field model.
- Patient support ticket creation in `ivisit-app` writes `admin_response`, which is absent on the selectable live `support_tickets` surface. The app fallback can therefore retain a local ticket without creating console work.
- Console support management exposes org-admin/provider operations while current policy source authorizes ticket owner or administrator only.
- Health-news authoring collects description, content, and icon fields absent from the live receiver, and its current policy source permits published reads without authoring or draft-management writes.
- Console notifications are correctly scoped as the operator's own activity stream; patient app notification clear/delete actions lack a DELETE policy in current source.
- Quick search reads public trend rows through a valid RPC, while automatic trend regeneration functions are success-returning stubs and the analytics screen visibly renders constant search metrics.

A SELECT-only follow-up found zero current policy or ticket rows, two published news rows, zero notification/search event rows, and 21 trend rows. These counts narrow current repair population; they do not reduce the forward contract priority.

## Edge Function Runtime Ownership Pass

The database Edge Function matrix has been expanded against the app-owned deployment runbook and function sources:

- `ivisit-app` is the identified runtime source for `create-payment-intent`, `create-payout`, `manage-payment-methods`, `discover-hospitals`, and `stripe-webhook`, while console calls these slugs without containing their matching implementation tree.
- Console-local Edge Function sources instead cover legacy subscriber/email, invite, check-user, and unsubscribe behavior; their deployed-slug ownership remains unproven from the app runtime inventory.
- The app-owned `manage-payment-methods` function accepts organization context and uses a service-role client without an observed organization authorization guard before organization card/payout-method operations. A SELECT-only receiver check also confirms its organization customer/payout-method target fields are absent live on `organizations` and instead exist on `profiles`.
- Console wallet top-up omits `is_top_up`, discards the returned payment confirmation path, and presents success immediately.
- The app-owned payout function checks actor/org authority, but server-side wallet balance reservation or sufficiency is not evident before Stripe payout creation and later webhook deduction.
- The console cash dispatch check treats the JSON result of `check_cash_eligibility` as a boolean and the SQL function considers any nonnegative wallet eligible without considering the estimated fee; the advertised cash wallet cap is not enforced.
- Manual cash processing calculates a fee but inserts an already-completed cash payment; the completed-payment settlement trigger runs only on update and skips cash, so the visible "fee deducted" outcome is not backed by that path.
- Org-admin wallet UI reads ledger-based balance history/KPIs and auto-attempts a repair write, while current RLS source grants `wallet_ledger` visibility only to platform admins and provides no org-admin ledger mutation policy.
- `discover-hospitals` is configured as a public endpoint and uses a service-role client for merge-enabled provider persistence; a discovery request can therefore write canonical `hospitals` and `providers` rows without a console operator identity.
- The rendered console hospital modal posts text search without coordinates and reads a response key not returned by the app-owned handler, while its Google attribution is not represented in its request flags.
- Console hospital create/edit payloads omit app-required provider taxonomy and eligibility fields, so console currently cannot intentionally operate the broader Explore Care catalog or control discovery-to-dispatch classification.

This function-boundary work remains part of the uncommitted comprehensive contract-truth evidence pack under the revised commit discipline.

A SELECT-only finance linkage follow-up strengthens the cash-settlement finding without running a mutating path: 28 completed cash payments with positive fees have referenced ledger pairs, and 22 of those pairs are explicitly labelled `runtime_data_integrity_repair` backfill output. This is evidence of multiple settlement/repair lanes in the current population, not evidence that the defective manual console path works.

## Pricing, Telemetry, Verification, And Onboarding Contract Pass

The existing contract charts now include four additional provider-support boundaries:

- Console pricing CRUD writes hospital-scoped records, but the org-admin surface resolves an organization to its earliest hospital and labels the result as an organization override. App quote resolution is selected-hospital scoped, so sibling facility prices can diverge silently.
- The live operations-map responder telemetry control follows `console_update_responder_location` and its request/ambulance coupled receiver. The generic ambulance hook remains an exposed direct-location writer outside that active-request contract.
- Hospital verification is the dispatch-authority lane. The parallel provider-profile verification lane writes `profiles.bvn_verified`, is not a dispatch certification receiver, and is blocked for admin-on-other-profile writes by current profile RLS source.
- The onboarding path has an identity-boundary defect: it inserts a hospital as the submitted organization and assigns that hospital UUID to `profiles.organization_id`, which is foreign-keyed to `organizations`, without an observed RLS-authorized hospital insert path.

These findings are documented in `contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md` and `contracts/PROVIDER_OPERATIONS_CONTRACT_CHART_2026-05-24.md`; they remain part of the uncommitted contract-truth pack.

A client-scoped SELECT-only follow-up confirms exposure without mutation: 21 visible organizations already have multiple hospitals, containing 410 of 422 visible service-pricing rows and 208 of 219 visible room-pricing rows. It also confirms that legacy onboarding approval targets absent live fields (`hospitals.rejection_reason`, `hospitals.verified_at`, `hospitals.rejected_at`, and `profiles.verification_status`).
