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
- Insurance field projection has a second semantic drift: the UI labels policy coverage as currency amount, while the service can write `coverage_percentage` from `coverage_amount` and billing SQL uses `coverage_percentage`; card images are private Storage objects stored as signed URLs inside `coverage_details`, not rows in the `documents` table.
- Patient support ticket creation in `ivisit-app` writes `admin_response`, which is absent on the selectable live `support_tickets` surface. The app fallback can therefore retain a local ticket without creating console work.
- Support-ticket console management also assumes `organization_id` scope and provider/org-admin actions, while the visible table source does not declare `organization_id` and the current policy proof supports owner/admin management only. Assignment renders raw profile IDs instead of hydrated operator labels.
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

## Organization, Billing FX, And Documents Boundary Pass

The next full-worktree audit slice classified three cross-surface boundaries:

- Organization registry is a console-admin surface, but current source RLS only proves public active organization SELECT. The page and service direct-write `organizations`, including destructive delete, while wallet creation is trigger-owned and no guarded admin CRUD receiver was found.
- Billing FX quote behavior is currently app-owned. The patient app uses billing preferences, `resolve_currency_for_country`, `get_billing_quote`, `convert_currency_for_payment`, `exchange_rates`, and app-owned billing quote / exchange-rate Edge Functions. No console FX quote surface or service was found, so console finance dashboards should not create independent conversion or regional-pricing rules.
- The `documents` table is a data-room/content table with public-tier/admin reads, while console onboarding and insurance upload files to the Storage bucket named `documents`. Those are separate boundaries; no active console data-room CRUD, invite, or access-request surface was found.

These findings were added to `contracts/PROVIDER_OPERATIONS_CONTRACT_CHART_2026-05-24.md`, `contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`, `contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md`, and the database table matrix.

## RBAC, Helper, And Storage Boundary Pass

The next audit slice narrowed cross-cutting infrastructure that implementation passes are likely to reuse:

- `rbacPatterns.js` is active, not dormant: provider and organization verification services import it. It is still only a client/service-layer helper and must not replace RLS, guarded RPCs, or Edge authorization.
- `supabaseHelpers.js` appears dormant in current imports. It contains mojibake and Vite-style `import.meta.env.DEV` checks, while active timeout callers use `lib/utils.withTimeout`. Do not standardize on this helper until it is repaired and deliberately adopted.
- `storageService.uploadImage()` is active for hospital, doctor, and ambulance modals. It uploads public `images` objects and returns public URLs, but current active migrations did not prove matching `storage.objects` policies.
- Hospital images persist as `hospitals.image`, but app-side hospital media also has provenance fields (`image_source`, `image_confidence`, `image_attribution_text`, `image_synced_at`) that console does not set.
- Doctor images persist as raw `doctors.image`, but profile-linked doctor fields remain subject to profile-projection ownership.
- Ambulance images upload and preview but are not persisted because `ambulances.image` is absent from the live surface and omitted from create/update payloads.
- Insurance cards upload to the `documents` Storage bucket and persist one-year signed URLs inside `insurance_policies.coverage_details`; this is separate from the `public.documents` data-room table and needs bucket-policy/object-path proof.
- Ambulance fleet status language is split: table/RPC truth uses values such as `en_route` and `on_trip`, while UI filters/statistics still use `on_route` and `busy`. Driver availability also reads `profiles.assigned_ambulance_id` while assignment writes `ambulances.profile_id`.
- Ambulance station identity is split: some page queries scope by `ambulances.organization_id`, service queries can scope by `hospital_id`, and modal create/driver-selection paths can write an organization UUID into `hospital_id`. The app/test contract expects a real `ambulance -> hospital -> organization` chain.
- Ambulance responsive projections are not equivalent: desktop filters exact `on_route`, mobile accepts `on_route` or `en_route`, all surfaces render `ambulance.hospital || 'HQ'` without a hospital join, and rating is displayed even though `ambulances.rating` is not table truth.
- Verification queue projection is split by hidden receiver semantics: provider review is `profiles.bvn_verified`, facility review is `hospitals.verification_status`, but the shared UI uses `approved` for both lanes even though organizations store `verified`. Provider rejection collapses back to the same `bvn_verified = false` state as pending, provider views render absent `verification_status`, and bulk approve/reject currently only shows toast without calling a receiver.
- Onboarding claim logic treats `verified = false` as claimable even though `hospitals.verification_status = pending` exists. The active submission path inserts a hospital as the "organization" and then writes that hospital UUID into `profiles.organization_id`, which is foreign-keyed to `organizations`, leaving organization/wallet/authority side effects unproven.
- Hospital facility management has app-discovery drift: console edits visual `type`/tier but not `provider_type`, `emergency_eligible`, `booking_eligible`, `provider_source`, or `category_confidence`; ER wait minutes are collected and included in client payloads but ignored by `update_hospital_by_admin`; Google autofill reads `data.hospitals` and raw `geometry/types` even though the app-owned discovery handler returns normalized rows under `data`.
- User identity editing has additional shape drift: the organization picker is hospital-derived but submits organization IDs, provider type UI includes an enum-invalid `nurse` while omitting allowed/required `driver`, the user modal is rendered twice from one page state, and alternate admin service methods write stale verification/suspension/delete columns that are not in the current identity table source.
- Invite user flow is not a complete org-scoped access receiver: the modal lets org admins invite but the function source requires admin when authenticated, platform-admin organization selection sends hospital IDs as `organization_id`, the visible function returns an invite link without sending mail, and the new-user trigger does not persist invite metadata `organization_id` or `provider_type` into `profiles`.
- Visits need a stricter field/action split: emergency-derived rows are created and mutated by emergency/payment SQL through `request_id`, while the current console visit UI can edit/delete rows through ordinary direct CRUD, render UUID slices instead of stamped display IDs, prefill org IDs into `hospital_id`, and mix appointment status labels with emergency lifecycle labels.
- Facility management has taxonomy drift: console exposes `type` as a visual tier but does not expose app-critical `provider_type`, `emergency_eligible`, `booking_eligible`, `provider_source`, `category_confidence`, or media provenance fields. Modal Google search also reads `data.hospitals` while the app-owned discovery path commonly returns `data` plus metadata.
- Bed reservation management has a concrete view/action defect: the active-reservation Cancel button calls a nonexistent `bedManagementService.cancelReservation()` even though the exposed RPC route is `cancelBedReservation()`. The same pass found capacity-display drift because completed/discharged bed requests are counted as occupied while the UI bar uses separate scalar-bed math and ignores room buckets.
- Emergency detail rendering now has the right defensive pattern for `ambulance_type`: shape-check object, JSON string, scalar string, and empty values before formatting. The broader rule is that every mixed app/console field in detail modals needs the same source-shape proof.
- Mobile emergency rendering uses older aliases (`location`, `contact_phone`, `patient`, `assignedAmbulance`) while the parent page actually loads normalized request rows with `patient_snapshot`, `patient_location`, responder fields, and `eta_display`. Mobile can therefore hide data that desktop/detail surfaces can render from the same row.
- Location helpers are split: emergency creation accepts `lat/lng`, `latitude/longitude`, GeoJSON, and WKT, while display helpers mostly accept PostGIS hex, address, and `lat/lng`. The schema validator already flags `location` and `profiles` aliases but is not consistently connected to mobile/detail renderers.
- Dispatch entrypoints are not equivalent: the main emergency page attempts cash/wallet/status preflight before dispatch, while the map marker panel calls the same dispatch service directly and falls back to generic failure text. The SQL receiver protects pending-approval and terminal states, but the user-facing flow is drifted.
- Console dispatch uses guarded RPC receivers, but ambulance selection is still first available row selection. Route/ETA/proximity optimization remains unproven until the service records real selection inputs and outputs.

These findings were added to the provider operations chart, care/content chart, emergency/payment/capacity chart, identity contract chart, and Stage 5 service coverage audit. No Storage, database, RPC, or Edge mutation was executed.

## Dashboard, Search, Preferences, And FAQ Boundary Pass

The remaining lower-visibility services are now source-classified rather than left as later implementation choices:

- `supportFaqsService.js` exposes complete direct CRUD and table-wide realtime, but no console surface imports it and current RLS proves public FAQ reads only. The patient app is the active FAQ reader; console FAQ authoring is dormant until an authorized authoring receiver and route are defined.
- `QuickSearch` is the active console search surface and `searchService.js` is its active event owner. Its ambulance search queries absent `ambulances.hospital`; because global search composes category requests with `Promise.all()`, that schema error can discard valid search results from other categories.
- The separate search history/event/selection CRUD services are dormant in rendered console UI. Guarded admin aggregation RPCs exist, but `searchAnalyticsService` fabricates ranked fallback values on failure and must not feed visible analytics in that state.
- Visible trend reads are legitimate read-only `trending_topics` consumption, but both trend-regeneration RPC paths return success without aggregation. Trend generation is therefore disabled/manual in implementation planning until a truthful receiver exists.
- `preferencesService.js` has no console importer while Settings renders a notification switch fixed to on. Console may operate only the signed-in operator's notification preference; app-owned demo coverage and patient medical/contact sharing preferences are not console settings.
- `activityService` recent/statistics RPC reads are guarded by `p_is_console_allowed()`, but activity realtime is duplicated in its hook and the broad `PageDataContext`. Consolidate the read owner; do not treat UI activity as financial or privileged mutation audit evidence.
- Dashboard truth is not yet operationally trustworthy: analytics returns `95%` success with zero requests, `PageDataContext` initializes/falls back to mock operational records and estimates on-route ambulances, and the analytics platform-performance panel renders fixed status figures without a telemetry receiver.

These determinations were added to `contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md` and Stage 5. The pass remains static inspection only; no data, Storage, RPC, function, or email mutation was executed.

## Staff Scheduling Receiver Resolution

The outstanding provider-operations decision is now source-resolved:

- `ivisit-app` source defines `doctor_schedules` with stored doctor/date/start/end/shift/availability fields and grants organization-scoped management to org admins plus admins. It is an existing scheduling receiver, not a speculative future model.
- `StaffSchedulingModal` presents real scheduling commands and data inputs, but `staffSchedulingService.js` does not read or mutate `doctor_schedules`. It manufactures today's fixed shifts from doctor and ambulance statuses, toggles doctor status on create/update/delete, and tests current status rather than stored date/time overlap for conflicts.
- The service also reads or filters `ambulances.hospital`, which is absent from the shared logistics schema. Fleet context must be projected through schema-owned hospital/organization relationships, not an unowned label field.
- The deterministic implementation plan is table-backed doctor scheduling in Pass 5: read/write/delete real `doctor_schedules`, compute overlap and statistics from stored shifts, and keep doctor availability as a separate state. Ambulance crew shift creation and synthetic full-day schedule rows are out of scope until a persisted authorized crew scheduling receiver exists.

This resolution was added to the provider operations contract, Stage 5 inventory, service map, and table matrix by static source comparison only; no data mutation was performed.

## Reverse Available-Receiver Coverage Pass

The service inventory is now paired with a reverse source-of-truth inventory. Reading the shared `ivisit-app` pillar migrations identifies 45 source-declared public tables across identity, organization, logistics, finance, content, analytics, and pricing. A Console service scan alone cannot prove coverage when a required receiver has no Console adapter yet.

The reverse matrix closes three previously omitted organization receivers: `hospital_import_logs`, `emergency_doctor_assignments`, and `hospital_media`. It also distinguishes:

- Required missing Console surfaces: provider catalog/classification (`providers`), facility media provenance (`hospital_media`), real doctor schedule management (`doctor_schedules`), clinician emergency handoff (`emergency_doctor_assignments`), emergency transition timeline (`emergency_status_transitions`), request-scoped emergency chat (`emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`), and insurance billing outcome visibility (`insurance_billing`).
- Existing receivers needing corrected visible ownership: import provenance (`hospital_import_logs`), privileged audit visibility (`admin_audit_log`), payment/ledger/capacity/pricing surfaces, and app-discovery facility classification.
- Dependency or separate-surface boundaries: FX rates remain app/backend billing dependencies rather than Console-authored conversion truth; `documents` remains an `ivisit-docs` data-room boundary; patient wallet CRUD, patient consent preferences, and parallel user-role administration are not to be invented as Console CRUD merely because their tables exist.

This coverage is recorded in `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md` and propagated into the contract charts and implementation-pass subplans. It is a static audit/planning checkpoint only; no row, Storage, RPC, Edge Function, email, or migration mutation was performed.

## CRUD Versus Command Authority Pass

The reverse table coverage pass is now refined into operation authority. Current source policy names, RPC families, triggers, and Console direct-write signals were compared so implementation can distinguish:

- scoped reads, such as emergency transition history, chat projection, billing outcomes, wallet/ledger visibility, and activity
- ordinary policy-supported administrative CRUD, such as organization-scoped doctor shifts, provider catalog/media rows, and facility-scoped pricing
- workflow commands, such as emergency lifecycle, emergency chat send/read, clinician assignment, payment settlement, operational capacity, and active responder telemetry
- backend-derived read-only evidence, such as transition rows, ledger evidence, normal trigger-created insurance billing outcomes, and request-derived visit lifecycle
- excluded or separately owned capabilities, including data-room document management, patient consent/preference management, patient wallet administration, and FAQ authoring under current policy

The direct-write scan also identifies visible Console implementation conflicts requiring repair or removal before a pass can close: browser CRUD for organizations, unsupported health-news and FAQ authoring, subscriber update/delete promises, administrative insurance CRUD without authority, request-derived visit CRUD, repair-adjacent ledger/payment writes, and active ambulance/scheduling mutations that bypass the actual workflow receiver.

The complete policy posture lives in `../../../database/console-app-alignment/TRIGGER_POLICY_MATRIX_2026-05-24.md`; command receiver resolution lives in `../../../database/console-app-alignment/RPC_MUTATION_MATRIX_2026-05-24.md`. Each flow subplan now contains an `Action Class And Receiver Map` and Stage 6 requires that classification before implementation.
