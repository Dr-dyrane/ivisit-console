# Pass 1 Emergency Detail Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, cleanup, or historical repair is authorized by this document.

This subplan covers the user-visible failure where an operator cannot reliably open or trust an emergency detail modal. The fix must not start inside the modal. The modal is the receiver of a broken read model spanning emergency requests, payments, cash approval, request-derived visits, status-transition history, emergency communication, clinician assignment, and scoped realtime refresh.

## Source Evidence

Console files inspected:

- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/modals/EmergencyRequestModal.jsx`
- `frontend/src/components/ui/LocationCell.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/mobile/MobileEmergency.jsx`
- `frontend/src/components/context/EmergencyPanel.jsx`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/utils/emergencyRequestMapper.js`
- `frontend/src/services/emergencyService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/visitsService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- Generated Console types for `emergency_status_transitions`, `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`, and `emergency_doctor_assignments`, with no corresponding rendered runtime service found.
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/emergencyChatService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql`

Audit docs:

- Stage 2 service data flow audit.
- Stage 3 capability gap audit.
- Stage 4 L5 state/data ownership audit.
- Stage 5 full service coverage audit.
- Stage 6 implementation pass plan.
- Emergency/payment/capacity contract chart.
- Read-only live confirmation matrix.

Observed source signals reconciled against current runtime on May 25:

- `EmergencyDetailsModal` now consumes `getEmergencyDetailProjection(request.id, request)` and `subscribeToEmergencyDetail(requestId, callback)` from `emergencyService`; prior direct modal payment/visit/subscription claims are superseded.
- `getEmergencyDetailProjection` currently projects the request, latest request payment, and terminal request-derived visit; it does not yet project transition history, emergency chat, persisted clinician assignment, or complete field-normalization state.
- `EmergencyDetailsModal` refreshes after cash approve/decline and only says dispatch is released when the refreshed projected request is `in_progress`; this repair must be preserved.
- The modal retains unreachable legacy fallback code after an unconditional `return` inside its projection effect and visit helper, which should be removed during implementation without reintroducing direct reads.
- `EmergencyRequestListView` and `EmergencyRequestTableView` already call `getVisitByRequestId`; the remaining clinical-record defect is mounted receiver/navigation closure, not lookup creation.
- `LocationCell` owns direct Google reverse geocoding for detail locations while its accepted coordinate shapes are narrower than app location inputs; location fallback is therefore part of emergency detail truth, not leaf formatting.
- `EmergencyDetailsModal` also exposes a Google Maps navigation link built from request latitude/longitude. This is an intentional operator action only if coordinates are validated, disclosure is appropriate for the authorized actor, and the external handoff is visibly distinct from Console-owned tracking truth.
- `EmergencyDetailsModal` closes after dispatching `openVisitModal`, but the only active receiver is mounted by `VisitsPage`; from `/emergencies`, the visible "View Full Clinical Record" action has no mounted modal receiver.
- `EmergencyRequestsPage` does page-local server pagination/count and current-row payment enrichment; pagination exists, but its filter/count/enrichment/failure lifecycle is not yet owned by the emergency read model.
- `EmergencyRequestsPage` refreshes from broad emergency/payment subscriptions, attempts dispatch cash eligibility with `orgId || request.organization_id || request.hospital_id`, and can claim dispatched resources or cash fee deduction before refreshed projected truth.
- `EmergencyRequestsPage`, `MobileEmergency`, and `EmergencyPanel` contain corrupted separator bytes in rendered copy; this is a user-visible encoding defect, not merely a documentation gate.
- `MobileEmergency` renders alias fields not synthesized by the row mapper and labels the non-approval command `Navigate` while the parent routes it to dispatch.
- `MarkerDetailPanel` and `MobileMap` dispatch and complete emergency markers outside the page preflight and detail projection refresh contract.
- Shared source defines append-only status-transition evidence plus emergency chat and clinician-assignment receivers; Console runtime currently references these only through generated types or inferred doctor display, while the patient app implements chat RPC/realtime flow.

## User Flow

Operator path:

1. Open emergency requests.
2. Select a request.
3. View patient, service, hospital, responder, payment, and lifecycle details.
4. For completed/cancelled requests, view linked clinical/visit outcome when it exists.
5. For cash pending approval, approve or decline using backend truth.
6. For declined card payment, retry payment with a safe patient-completable payment method.
7. See realtime updates while the modal is open without corrupting list-level state.
8. View request lifecycle history and communicate through the same urgent thread the patient/provider flow uses, when authorized.
9. View or command the persisted clinician assignment/handoff state instead of an inferred doctor label.

## Broken Contract To Fix

The current detail flow conflates these owners:

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Emergency request detail | Row passed from page/list plus modal realtime refresh. | Emergency detail read model. |
| Payment row for approval | Detail projection owns latest payment; page still directly enriches listed rows from `payments`. | Preserve detail boundary and add list read ownership with RLS-aware degraded state. |
| Cash approval/decline | Detail modal uses command plus refreshed projection; page completion still separately invokes manual cash processing. | Preserve modal command boundary; reconcile completion/manual cash under payment authority. |
| Visit/clinical outcome | Detail projection and list/table call `getVisitByRequestId`; the clinical-record launch path still closes into an unmounted event receiver. | Preserve request-derived visit lookup and add a mounted outcome receiver. |
| Clinical-record navigation from emergency detail | Modal dispatches a visit event and closes while the visits route/listener is not mounted. | Emergency-route-owned outcome detail surface or explicit identity-preserving navigation into the visit projection. |
| Location/address projection | Leaf cell makes external geocoding request and falls back across mixed coordinate shapes. | Emergency detail location projection with normalized coordinates, bounded external lookup and explicit unavailable/fallback rendering. |
| External map navigation handoff | Detail modal opens a Google Maps URL with emergency coordinates. | Authorized, user-initiated external-navigation command with validated coordinates and explicit handoff semantics; not evidence that Console map/tracking is working. |
| Realtime refresh | Detail modal uses scoped service subscription; page owns broad emergency/payment refresh and map paths own local mutation refresh. | Retain scoped detail invalidation and specify list/map invalidation ownership. |
| List paging and enrichment | Page directly constructs count/window/filter queries and payment enrichment. | Emergency list owner with stable paging, count/filter parity and explicit enrichment failure state. |
| Status-transition history | Shared append-only table exists; no Console rendered timeline found. | Read-only detail timeline sourced from `emergency_status_transitions`; no update/delete actions. |
| Urgent chat thread | Patient app implements room/message/read RPC flow; Console has type-only references. | Request-scoped communication projection/command owner using shared chat authorization. |
| Clinician assignment | UI can show doctor context without a canonical Console assignment workflow. | Guarded `emergency_doctor_assignments` / assignment RPC owner. |
| Success feedback | Toast claims dispatch/cash outcome immediately. | Backend-confirmed status/payment/ledger copy after refresh. |

## Surface Read, Exposure, And Operation Closure

| Surface and mounted path | What it reads and renders now | Mutation or receiver path | Deterministic audit result |
| --- | --- | --- | --- |
| `/emergencies` desktop list/table | Windowed `emergency_requests`, count, current-page payment method/status enrichment, normalized request labels, state and pagination footer. | Dispatch, complete, cancel, retry and manual cash are page-owned handlers; broad request/payment realtime refetches the page. | **Blocked.** Pagination is present, but list enrichment/failure and post-command confirmation are not owned by one list contract; visible footer/payment labels contain corrupted separator bytes. |
| `/emergencies` mobile list | Receives the same page rows, but reads legacy `patient_name`, `location`, `contact_phone` and `assignedAmbulance` shapes. | Approval opens detail; the `Navigate` action invokes parent dispatch. | **Blocked.** Mobile can hide true patient/location/responder data and misnames a dispatch command. |
| `EmergencyDetailsModal` | Existing projection renders request, payment approval state and terminal visit; `LocationCell` renders mixed location values. | Existing approve/decline commands refresh the projection; `openVisitModal` event closes the modal. | **Partially repaired, still blocked.** Preserve the projection/refresh repair; clinical-record receiver is unmounted from this route and transition/chat/assignment data is absent. |
| `EmergencyDetailsModal` external map link | Displays an action that constructs a Google Maps destination from request coordinates. | Opens a third-party navigation page from emergency location truth. | **Exposure/reliability gate.** Validate coordinate source and actor exposure, label it as external navigation, and do not use this action as tracking or dispatch confirmation. |
| `EmergencyRequestModal` create/edit | Exposes patient, hospital, service, status, cost/payment and bed data. | Service selects atomic create or console fallback/create-update RPC contracts. | **Blocked by create contract drift.** The atomic path drops or derives visible status/cost/payment/bed fields differently from fallback; operator input is not deterministically persisted. |
| `EmergencyPanel` through global page context | Renders recent emergency summaries and aggregate state from global acquisition rather than the route window. | Emits create/filter/analytics events; rendered recent copy contains corrupted separator bytes. | **Blocked.** Global unwindowed ownership and event receiver coverage must be reconciled with route data; encoding defect is visible. |
| `/map` desktop `MarkerDetailPanel` and mobile map detail | Renders selected emergency marker, patient contact/location and assignment state. | Direct dispatch and complete calls with local toast/refresh behavior. | **Blocked.** Map actions bypass route preflight/payment explanation and do not confirm the same detail projection before declaring outcome. |
| Lifecycle history surface | No rendered Console timeline found. | Shared emergency transition rows are append-only evidence. | **Missing required read surface.** Add authorized read-only transition timeline; never edit history. |
| Urgent communication surface | No Console room/message view found. | App and SQL expose room ensure, message send and read-marker RPC flow. | **Missing required operational surface.** Adopt request-scoped authorized communication contract. |
| Clinician assignment/handoff surface | Doctor context can be displayed without found persisted assignment workflow. | SQL exposes guarded assignment receiver and assignment table. | **Missing required command/read surface.** Display and mutate only persisted handoff state. |

## Patient-Facing Dependency Closure

| App-owned truth that Console operations affect | App evidence | Console implementation obligation |
| --- | --- | --- |
| Tracking-ready dispatch handoff | Patient map rules require request id, hospital id, active status, route or ETA seed, pickup/patient context when available, and responder identity or explicit hydrating state. | A Console dispatch or cash approval success state cannot imply active tracking until refreshed backend output can satisfy that snapshot. |
| Payment-to-tracking transition | Patient live tracker states that approval must hand tracking a warm dispatch snapshot rather than depending on reload/remount. | Detail, page and map commands must converge on the same confirmed request/payment/responder result. |
| Contact dispatch thread | Patient `emergencyChatService` owns RPC-backed room/message/read and scoped realtime semantics. | Console emergency operators require an authorized participant-facing counterpart, not a separate direct-table chat implementation. |
| Visit and clinical outcome | Patient request/visit flow retains emergency identity into outcome surfaces. | A Console clinical-record CTA must resolve and mount the request-derived visit receiver without dropping context. |

## Pass 1 Deterministic Surface Register

| Surface family | Read/render closure | Command/receiver closure | Pagination/realtime closure | Status |
| --- | --- | --- | --- | --- |
| Emergency desktop route list/table | Mapped; payment enrichment is page-local. | Mapped; dispatch, completion, manual cash and retry need common confirmation contract. | Server page exists; ownership and subscription scope remain open. | Blocked |
| Emergency mobile route variant | Field exposure traced; alias drift confirmed. | Maps visible `Navigate` to dispatch. | Inherits desktop page window. | Blocked |
| Emergency detail modal | Existing request/payment/visit projection confirmed. | Cash approval/decline refresh is present; visit launch receiver missing. | Scoped subscription exists; missing receiver families not included. | Partially repaired / blocked |
| Emergency create/edit modal | Exposed input fields traced to dual receivers. | Atomic/fallback persistence mismatch confirmed. | Not applicable. | Blocked |
| Context/global recent and KPI panel | Global acquisition identified. | Event commands partly receiver-dependent. | Unwindowed global owner remains to reconcile. | Blocked |
| Map emergency detail variants | Read and command paths traced. | Direct dispatch/complete differs from route safeguards. | Local refresh only; detail convergence unproven. | Blocked |
| Timeline/chat/clinician handoff | No rendered ownership found. | Canonical tables/RPCs exist outside Console UI. | Scoped consumption is absent. | Missing required surfaces |
| Patient downstream tracking/contact/outcome | Required app contracts recorded. | Console commands can change app-visible truth. | Realtime recovery contract remains a verification gate. | Blocked dependency |

## Cross-Pass Emergency Register

| Dependent pass | Emergency dependency that must not be lost |
| --- | --- |
| Pass 2 - wallet, payment and ledger | Cash eligibility org resolution, manual completion payment, approval ledger effects, retry completion and backend-confirmed financial copy. |
| Pass 3 - hospital, capacity and pricing | Selected hospital, bed reservation/capacity truth, patient quote and facility dispatch eligibility. |
| Pass 4 - onboarding and verification | Organization/facility verification that can enable or prevent operational dispatch. |
| Pass 5 - fleet and providers | Ambulance selection, responder telemetry and persisted clinician handoff. |
| Pass 6 - visits and clinical outcomes | Request-derived visit linkage and mounted clinical record projection. |
| Pass 8 - global shell, map, analytics and realtime | Context acquisition, marker actions, event receiver mounting and scoped invalidation parity. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Open request detail and refresh row | Scoped read projection | `emergency_requests` through emergency read owner | Render normalized row/detail truth; do not let modal become list owner. |
| Render patient/pickup/responder address | Scoped external read projection | Normalized emergency location model plus bounded geocoding provider call | Accept canonical coordinate forms and display fallback/degraded truth when address lookup is unavailable. |
| View lifecycle timeline | Backend-derived read-only evidence | `emergency_status_transitions` | Add scoped read timeline; no edit/delete controls. |
| Open/send/read urgent conversation | Workflow command plus scoped read | Chat RPC family and emergency chat tables | Add participant-authorized projection/actions only through RPC contract. |
| View/assign clinician handoff | Workflow command plus projection | `assign_doctor_to_emergency`, `emergency_doctor_assignments` | Persist assignment before UI claims handoff. |
| Dispatch, complete, cancel | Workflow command | Console emergency RPC family | No direct request status CRUD; refresh row before success claim. |
| Approve/decline/retry payment | Workflow command | Payment RPC family | No payment-table write from modal; success waits for refreshed truth. |
| View linked visit outcome | Backend-derived read-only evidence in emergency detail | `visits.request_id` projection | Detail modal reads outcome; visit lifecycle editing belongs to Pass 6 authority. |
| Open full clinical record from emergency detail | Cross-surface read navigation | Canonical request-to-visit projection and mounted route surface | Do not close the emergency modal into an unreceived custom event; show a mounted detail or transition intentionally. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Request/detail identity and state | `id`, `display_id`, `status`, `service_type`, `ambulance_type`, `hospital_id`, patient/pickup/responder location, `patient_snapshot`, responder/ETA and cost/payment metadata | Normalize mixed shapes before render; all lifecycle state changes remain RPC-owned. |
| Audit and urgent communication | transition status/actor/time; chat room/request/participant/message/read/archive identity | Timeline is read-only; chat create/send/read uses the authenticated chat RPC family only. |
| Clinical handoff and outcome | assignment request/doctor/status/notes/time; payment identity/state; `visits.request_id`, terminal clinical outcome | Do not claim assigned clinician, cash/payment resolution, or visit outcome without persisted refreshed rows. |

## Field-To-Render Closure For First Slice

The first Pass 1 implementation slice must close the scalar/object/null assumptions that caused the emergency detail crash class. The table below is the minimum row-level mapper contract before touching JSX.

| UI field or control | Current render sites | Current field source and shape assumption | Required mapper/output before implementation |
| --- | --- | --- | --- |
| Patient name | Detail modal, desktop list/table, mobile row | Detail/list prefer `patient_snapshot.fullName`; table uses `getStandardizedPatient(req).name`; mobile still reads `patient_name` and `patient.name`. | `patientDisplay.name` from `patient_snapshot`, joined profile, requester aliases, then explicit unknown state. Mobile must consume the same value. |
| Patient contact | Detail modal, desktop list/table, mobile row | Desktop list reads `patient_snapshot.phone || requester_phone || patient_phone`; table uses standardized patient; mobile reads `contact_phone || patient.phone`. | `patientDisplay.phone` with empty/no-contact state; no mobile-only alias chain. |
| Service label and badge | Detail modal, desktop list/table, mobile row | Desktop helpers use `service_type`; detail uppercases raw string; mobile replaces underscores. | `serviceDisplay.label`, `serviceDisplay.badgeClass`, and canonical `service_type` token from one emergency row normalizer. |
| Ambulance type | Detail modal only today | `ambulance_type` can be object, JSON-looking string, plain scalar string, empty value, or malformed JSON. | `ambulanceTypeLabel` from a guarded service/detail mapper. Never call `JSON.parse` unless the string starts with `{` or `[`, and preserve scalar tokens as labels. |
| Status label and action legality | Detail modal, desktop list/table, mobile row, actions | Status is canonicalized in some paths; mobile also checks `status === 'active'`; actions use `getEmergencyActionState(req)`. | `statusDisplay` and `actionState` from one canonical status mapper. No surface should branch on legacy `active` without translation. |
| Patient/pickup/responder location | Detail modal, desktop list/table, mobile row, external map link | Detail/list/table use `LocationCell`; mobile reads `location`; external map link uses coordinates from request fields. | `locationDisplay` plus `coordinates` object that accepts `lat/lng`, `latitude/longitude`, PostGIS/WKT/GeoJSON where supported, and explicit unavailable/external-handoff state. |
| Hospital/facility label | Detail modal, desktop list/table, mobile row | Desktop reads `hospital_name`; mobile reads `assignedHospital.name` or `hospital_name`. | `facilityDisplay.name` from request/hospital projection, with "not assigned" only when backend truth is absent, not when an alias is missing. |
| Responder/ambulance display | Detail modal, desktop list/table, mobile row, map marker | Desktop uses `ambulance_id` to show `Auto`; mobile reads `assignedAmbulance.vehicleId` and `eta`. | `responderDisplay` from assigned ambulance/responder fields plus route/ETA seed, including hydrating/unassigned/degraded states. |
| Payment method/status/amount | Detail modal, desktop table, page handlers | Table reads `payment_method`, `payment_status`, `total_cost`; detail projection reads latest payment; page enriches current rows from `payments`. | `paymentDisplay` from list/detail payment projection with source labels: request field, latest payment row, hidden/RLS, not created, failed. Amounts must stay unavailable when nonnumeric. |
| Clinical record CTA | Detail modal, desktop list/table | Detail dispatches `openVisitModal`; list/table navigate after `getVisitByRequestId(req.id)`. | One `clinicalOutcome` object with `canOpen`, `visitId`, `visibilityState`, and receiver path. No custom event is valid unless the receiver is mounted on the current route. |
| Cash approval/decline/retry controls | Detail modal, desktop list/table/page handlers, mobile row | Detail uses approved RPCs and refresh; page still exposes manual cash and retry paths; mobile label can say `Navigate`. | `actionState` must name command class, pending key, allowed receiver, and post-command refresh requirement. No copy can say dispatched, fee deducted, or payment complete before refreshed truth. |

Implementation rule: JSX may render only this normalized projection for the first slice. Raw row fields are allowed at the service/mapper boundary and in debug-only evidence, not as independent UI fallback chains.

## Service-Level End-To-End Closure Checkpoint

This checkpoint starts the Pass 1 service-depth audit. It is not implementation approval yet; it names the current evidence chain and the remaining links that must close before code changes.

| Service or surface owner | Current code exhibit | End-to-end status | Next proof required before implementation |
| --- | --- | --- | --- |
| `EmergencyDetailsModal` detail projection consumer | `frontend/src/components/modals/EmergencyDetailsModal.jsx:92-96` calls `getEmergencyDetailProjection()` and stores projected payment/visit state. | Partially aligned. The modal consumes a service projection instead of owning payment/visit reads. | Move remaining field normalization such as `ambulance_type`, location, payment display, and clinical CTA capability into the projection before JSX edits. |
| `EmergencyDetailsModal` scoped refresh | `EmergencyDetailsModal.jsx:233` returns `subscribeToEmergencyDetail()`; `emergencyService.js:289-306` subscribes to request, payment, and visit changes. | Partially aligned. Request/payment/visit invalidation is scoped to the detail. | Add transition/chat/clinician-assignment invalidation only after those projections are added; do not revive broad modal reads. |
| `EmergencyDetailsModal` ambulance type parser | `EmergencyDetailsModal.jsx:37-54` still parses `ambulance_type` locally and must handle object, JSON-looking string, scalar string, empty, and malformed values. | Open risk. This is the crash class that proved parser assumptions must be audited. | Replace local parsing with service/detail mapper output; raw scalar strings such as `ambulance` must render safely. |
| `EmergencyDetailsModal` cash commands | `EmergencyDetailsModal.jsx:121` and `:153` call `approveCashPayment()` / `declineCashPayment()`; `emergencyService.js:559-613` owns the RPC calls. | Mostly aligned for modal approval/decline. | Preserve refresh-before-final-copy behavior and prove dispatch-release copy comes from refreshed request state, not command optimism. |
| `EmergencyDetailsModal` clinical CTA | `EmergencyDetailsModal.jsx:469-470` dispatches `openVisitModal` and closes the modal. | Blocked. The receiver is not mounted on `/emergencies`. | Replace with mounted emergency-route outcome surface or explicit route transition that preserves request-derived visit identity. |
| `emergencyService` detail projection | `emergencyService.js:246-284` returns request, latest payment result, terminal visit result, visibility state, and errors. | Partially aligned. It is the right owner but not complete enough for the first slice. | Extend to normalized patient/service/status/location/responder/payment/clinical/action projection and degraded states. |
| `emergencyService` detail realtime owner | `emergencyService.js:289-306` subscribes to `emergency_requests`, `payments`, and `visits` by request id. | Partially aligned. Scoped owner exists. | Keep cleanup behavior and add only receiver-backed domains, not broad channels. |
| `EmergencyRequestsPage` list/payment owner | `EmergencyRequestsPage.jsx:191` reads `payments`; `:226` subscribes broadly to `payments`; list count/window remains page-owned. | Blocked. Page still duplicates payment/list truth outside the emergency owner. | Move list paging, count, filters, current-page payment enrichment, and failure states behind an emergency list projection. |
| `EmergencyRequestsPage` dispatch and copy | `EmergencyRequestsPage.jsx:432-447` checks cash eligibility, dispatches, and immediately shows dispatched-resource success. | Blocked. Success copy can outrun backend convergence and org id fallback can use hospital id. | Use canonical org/facility identity, backend receiver result, and refreshed projection before claiming dispatch/resources assigned. |
| `EmergencyRequestsPage` complete/manual cash path | `EmergencyRequestsPage.jsx:470-497` completes emergency then may call `walletService.processCashPayment()` manually. | Blocked. Completion and cash settlement are split across emergency and wallet owners. | Separate emergency completion from cash settlement authority; no fee-deducted/settled copy until payment/ledger truth reflects it. |
| `EmergencyRequestsPage` retry path | `EmergencyRequestsPage.jsx:572-573` calls `retryPaymentWithDifferentMethod()` and tells operator patient must complete payment. | Partially aligned. Copy acknowledges patient action is still required. | Return/refetch retry payment state through the same payment projection so retry is visible as pending/completable, not terminal. |
| `emergencyResponseService` dispatch/complete commands | `emergencyResponseService.js:92-108` calls `console_dispatch_emergency`; `:218-228` calls `console_complete_emergency`. | Receiver-backed but duplicated with `emergencyService` command family. | Decide one command facade for page/map/detail and ensure all surfaces share preflight, pending state, refresh, and success semantics. |
| `bedManagementService` completion receiver | `bedManagementService.js:123-128` calls `console_complete_emergency`. | Cross-owner collision. Bed/capacity service can complete emergency lifecycle. | Pass 1 must name whether this remains an allowed reservation command or routes through emergency completion owner with capacity side-effect projection. |
| `visitsService` request-derived lookup | `visitsService.js:242-281` documents and implements `getVisitByRequestId()` using `visits.request_id` before legacy fallback. | Aligned read boundary. | Preserve lookup; Pass 1 only consumes read-only outcome. Visit edit/delete lifecycle authority belongs to Pass 6. |
| `visitsService` broad CRUD methods | `visitsService.js:287-428` exposes create/update/delete/complete/cancel/no-show direct table writers. | Out of Pass 1 implementation scope. | Do not let emergency clinical CTA become a visit CRUD backdoor; Pass 6 owns lifecycle legality. |
| `walletService` cash processing | `walletService.js:277` exposes `processCashPayment()`; `EmergencyRequestsPage.jsx:497` calls it from completion flow. | Blocked. Browser-visible manual settlement competes with payment/cash approval lifecycle. | Move behind explicit payment authority or remove from ordinary emergency completion flow. |
| `walletService` fee backfill parser/mutation | `walletService.js:292-361` reads completed payments, parses `metadata`, and inserts missing ledger rows. | Out of Pass 1 direct slice but high-risk Pass 2 dependency. | Do not trigger repair from emergency/payment UI; metadata parsing and ledger mutation need Pass 2 maintenance authority. |

Implementation readiness rule: Pass 1 can start code only after every "Blocked" row above has either a documented first-slice disposition or is explicitly deferred to its owning pass with the UI control disabled/unavailable.

Generated trace confirmation (May 25): `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`, and `emergency_doctor_assignments` now have cross-repo table-flow traces, and each reports zero matched Console CRUD surfaces. Chat and clinical handoff are required new operational consumption/command work, not hidden existing UI ownership.

`emergency_contacts` is also traced with zero matched Console CRUD surfaces. Contact context may be projected only where an authorized emergency/detail workflow justifies it; this pass does not introduce operator contact management.

## Implementation Packages

### 1. Emergency Detail Read Model

Retain and extend the existing `getEmergencyDetailProjection(requestId, initialRequest)` boundary so it returns a complete detail projection for a request id:

- canonical emergency request row
- patient snapshot/profile projection
- hospital/service context
- responder/ambulance context when assigned
- payment summary and cash approval eligibility
- payment row visibility state:
  - visible
  - not created
  - unauthorized/RLS hidden
  - loading
  - failed
- request-derived visit summary:
  - linked visit found
  - no linked visit expected yet
  - no linked visit but expected for terminal request
  - lookup failed
- degraded flags with operator-safe copy
- append-only lifecycle transition timeline, when visible to the operator
- scoped chat summary/unread state and thread availability
- clinician assignment row/status or explicit unassigned/unavailable state

Acceptance gate:

- `EmergencyDetailsModal` continues to consume the existing projection without reintroducing direct payment/visit reads.
- Existing list/table request-derived clinical lookup remains on `getVisitByRequestId`; page payment enrichment is reconciled to explicit service ownership.
- A displayed clinician assignment and visible message thread are receiver-backed, not inferred from request decoration.

### 2. Request-Derived Visit Lookup

Decision:

- Add `getVisitByRequestId(requestId)` to `visitsService.js`.
- Use `visits.request_id` as the canonical request-derived lookup.
- Keep `getVisit(request.id)` only as compatibility fallback for legacy rows where visit id equals emergency id.
- Treat `sync_emergency_to_visit` as the current backend owner for emergency-to-visit linking.
- Terminal requests without a linked visit render an explicit "No visit record linked" state and generate a data repair follow-up, not a broken modal.

Acceptance gate:

- Clinical record buttons in modal/list/table route through the canonical `visits.request_id` lookup, with legacy fallback isolated and labelled.
- Empty copy distinguishes "not created yet" from "not visible" from "not applicable."

### 3. Payment And Cash Approval Detail State

Move approval payment discovery behind the owner boundary:

- find latest payment by request id only through service/facade
- include status, amount, currency, organization id, ledger/audit markers if available
- include actor authorization/degraded state
- do not make org-admin RLS failures look like missing patient payment

Cash command requirements:

- Disable approve/decline while command is pending.
- Use a per-request pending key so duplicate clicks cannot race.
- After approval/decline, refresh request and payment detail before final success copy.
- Approval copy may say "approval recorded" only when the RPC succeeds.
- Dispatch copy may say "dispatch released" only when refreshed emergency status/responder state proves it.

Acceptance gate:

- UI never says fee deducted, cash settled, or responder dispatched unless backend truth confirms the corresponding state.

### 4. Retry Payment Detail State

Retry must remain separate from cash approval:

- show retry only for payment-declined/card-eligible states
- resolve patient payment methods through the emergency/payment service
- confirm retry receiver returns a patient-completable payment path or a clear pending state
- do not show payment complete after retry setup alone

Acceptance gate:

- Retry action has pending/disabled state and refreshes the detail projection before closing the modal.

### 5. Detail-Scoped Realtime

Keep modal realtime scoped to the open request, but move it behind the detail owner:

- emergency row changes invalidate/refetch detail projection
- payment changes invalidate/refetch payment projection
- visit changes invalidate/refetch request-derived visit projection if linked
- message/read-state changes invalidate/refetch the scoped chat projection
- clinician assignment changes invalidate/refetch the assignment/handoff projection

### 6. Transition History, Emergency Communication, And Clinician Assignment

Required missing-surface contract:

- Render `emergency_status_transitions` as an append-only timeline inside emergency detail when scoped read authorization permits it.
- Add request-scoped emergency chat through the existing shared room/message/read RPC pattern; do not introduce direct unscoped table messaging.
- Add persisted clinician assignment/handoff through `emergency_doctor_assignments` or its guarded RPC boundary; a suggested or displayed doctor is not an assignment.
- Keep assignment status and chat availability visibly unavailable when authorization or receiver state is absent.

Acceptance gate:

- An operator handling an emergency can inspect its lifecycle history, communicate in its authorized urgent thread, and see persisted clinician assignment truth without bypassing shared receivers.
- modal closure unsubscribes cleanly
- list/page state is refreshed through domain owner, not by modal-local mutation

Acceptance gate:

- One detail owner coordinates detail refresh; `PageDataContext` does not become the durable owner.

## Service-By-Service Audit And Implementation Plan

This is the required bridge between evidence and implementation. Runtime code may start only after each row has a complete audit disposition for the first slice.

| Service or surface family | Current owner and exhibits | First-slice audit still required | Implementation disposition after audit closure |
| --- | --- | --- | --- |
| `emergencyService.js` detail projection | `getLatestEmergencyPayment()` reads latest `payments` row at `frontend/src/services/emergencyService.js:205-244`; `getEmergencyDetailProjection()` composes request/payment/visit at `:246-286`; `subscribeToEmergencyDetail()` scopes request/payment/visit realtime at `:289-306`. | Define the exact output shape for patient, service, status, location, responder, payment, visit, action state, parser/degraded flags, timeline, chat summary, and clinician assignment. Verify every output field has a source and unavailable state. | Extend the existing projection. Do not create a new modal-owned data path. |
| `EmergencyDetailsModal.jsx` | Consumes projection at `frontend/src/components/modals/EmergencyDetailsModal.jsx:92-97`; still formats `ambulance_type` locally at `:37-60` and renders raw request type at `:598-604`; fires unmounted `openVisitModal` at `:468-471`. | Enumerate every raw request field still rendered directly in the modal and map it to a projection field. Confirm the current route has a mounted clinical receiver or define explicit navigation. | Convert JSX to projection-only rendering for first slice; replace clinical CTA receiver; remove dead fallback scaffold only after projection tests/smoke exist. |
| `EmergencyRequestsPage.jsx` list owner | Page enriches current window with direct `payments` query at `frontend/src/components/pages/EmergencyRequestsPage.jsx:187-205`; broad request/payment realtime at `:219-229`; action state imports `getEmergencyActionState()`. | Define route-list projection owner: filters, count, payment enrichment, RLS-hidden/failed payment state, current selected row refresh, paging and realtime invalidation. | Move list acquisition/enrichment to service/facade after projection contract closes. Keep page as route composition only. |
| `EmergencyRequestsPage.jsx` commands | Cash preflight uses `orgId || request.organization_id || request.hospital_id` at `:425-433`; dispatch success copy fires after command at `:443-447`; completion can call wallet cash processing at `:469-497`; retry uses emergency RPC at `:572-574`. | For each action, prove command class, receiver, canonical organization/facility identity, pending key, refreshed read target, success/error copy, and disabled state. | Keep dispatch/complete/retry behind one emergency command facade; defer manual cash settlement to Pass 2 or disable it in this pass. |
| `emergencyResponseService.js` | Dispatch and complete also call `console_dispatch_emergency` / `console_complete_emergency` at `frontend/src/services/emergencyResponseService.js:92-108` and `:218-226`. | Decide whether this remains the canonical route/map command facade or becomes an adapter under `emergencyService`. Audit result payload shape for route, detail and map parity. | One command policy for route, detail, desktop map and mobile map. No alternate optimistic toasts. |
| `bedManagementService.js` | `dischargePatient()` completes emergency through `console_complete_emergency` at `frontend/src/services/bedManagementService.js:121-130`. | Determine whether bed discharge is a Pass 1 emergency command, Pass 3 capacity command, or a wrapper that must call the shared emergency completion owner. | Do not let capacity UI own lifecycle completion independently; document side effects on beds/visits/payments before enabling. |
| `walletService.js` | `processCashPayment()` calls `process_cash_payment` at `frontend/src/services/walletService.js:277-283`; `backfillMissingFeeLedger()` parses metadata and mutates ledger/payment rows at `:292-361`. | Separate pending cash approval, post-completion cash settlement, and historical ledger repair. Prove which receiver is canonical and which UI can invoke it. | Pass 1 disables or defers manual settlement paths that cannot be proven. Pass 2 owns ledger/repair hardening. |
| `visitsService.js` | `getVisitByRequestId()` uses `visits.request_id` first and legacy fallback in `frontend/src/services/visitsService.js:242-281`; broader visit CRUD exists at `:287-428`. | Confirm every emergency clinical CTA consumes read-only `visitOutcome` and cannot invoke visit edit/delete/complete/cancel from emergency context. | Preserve request-derived read. Pass 6 owns visit lifecycle CRUD legality. |
| `emergencyRequestMapper.js` | `normalizeEmergencyRequestRow()` currently normalizes status, payment method/status, ETA and bed category at `frontend/src/utils/emergencyRequestMapper.js:44-65`. | Expand mapper contract or supersede it with an emergency list projection that covers patient, contact, location, facility, responder, payment visibility, and action state. | Use one route/mobile/list/table row projection; no mobile-only alias chains. |
| `emergencyActions.js` | `getEmergencyActionState()` derives dispatch/complete/cash/retry/clinical flags at `frontend/src/utils/emergencyActions.js:7-40`. | Reconcile action legality with actual RPC legal transitions, cash approval state, payment visibility, bed flow, responder assignment, and route/map/mobile labels. | Keep as pure helper only if it consumes normalized projection and receiver availability. Otherwise move action state into service projection. |
| `LocationCell.jsx` | Leaf component chooses `location || responderLocation || pickupLocation`, decodes PostGIS and calls Google geocoding at `frontend/src/components/ui/LocationCell.jsx:8-66` and `:77-103`. | Define accepted coordinate/address shapes and external lookup policy. Distinguish app-owned location truth, third-party geocode failure, and external navigation handoff. | Move emergency location projection upstream; leaf renders display/degraded state instead of owning truth. |
| Mobile and map emergency surfaces | `MobileEmergency.jsx:369-465`, `MarkerDetailPanel.jsx:127-168`, and `MobileMap.jsx:273-303` render aliases and dispatch/complete through alternate paths. | Map each rendered field/control to the same route projection and command facade. Confirm mobile copy and map toasts cannot imply success before refreshed truth. | Keep alternate surfaces, but make them consumers of the same emergency projection/action model. |
| Chat, transition and clinician receivers | App chat service uses `ensure_emergency_chat_room`, `send_emergency_chat_message`, `mark_emergency_chat_room_read` (`ivisit-app/services/emergencyChatService.js:170-314`); shared SQL defines `assign_doctor_to_emergency` and chat/status RPCs in `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql`. | Add exact Console read/write service plan for transition timeline, chat summary/messages/read state, and clinician assignment. Identify role access and unavailable states before UI work. | Implement as missing operational surfaces only after receiver proof. No direct table chat/assignment writes. |

First implementation cannot begin until the "First-slice audit still required" column is resolved or explicitly deferred with a disabled/unavailable control.

## Emergency Detail Projection Target Contract

`getEmergencyDetailProjection()` is the first service to close in Pass 1. The implementation should make `EmergencyDetailsModal` render from this projection instead of raw `request.*` fallback chains.

| Projection key | Required source fields or receiver | Current raw render evidence | Required output and unavailable state |
| --- | --- | --- | --- |
| `identity` | `emergency_requests.id`, `display_id` / `request_id`, `created_at` | Case/time/request id render from `request.id`, `request.created_at`, `request.request_id` in `EmergencyDetailsModal.jsx:300-304` and `:495-499`, `:568-569`. | `{ id, displayLabel, createdAtLabel, createdTimeLabel }`; unknown labels when missing. |
| `statusDisplay` | canonical status plus RPC legality; transition rules from shared RPC source | Status tracker uses local `normalizedStatus` and hard-coded steps at `EmergencyDetailsModal.jsx:323-343`; service details render raw `request.status` at `:612-613`. | `{ status, label, stepIndex, steps, tone, isTerminal }`; no surface branches on legacy status tokens. |
| `priorityDisplay` | `priority` plus current priority color helpers or replacement token | Header badge reads `request.priority` at `EmergencyDetailsModal.jsx:294` and `:309-310`. | `{ label, toneClass }`; default "normal" only when source is truly absent. |
| `serviceDisplay` | `service_type`, `ambulance_type`, bed fields, specialty | Header and service cards render `request.service_type`, local ambulance parser, ETA, bed number/type and specialty at `EmergencyDetailsModal.jsx:299`, `:572-573`, `:598-632`. | `{ type, label, mode, ambulanceTypeLabel, bedLabel, bedCategoryLabel, specialtyLabel }`; scalar/object/malformed ambulance type normalized in service. |
| `patientDisplay` | `patient_snapshot`, joined profile/user fields, request aliases | Requester section uses `getStandardizedPatient(request)` plus raw username aliases at `EmergencyDetailsModal.jsx:507-543`. | `{ name, initials, avatar, username, phone, email, contactAvailability }`; no separate mobile/modal alias chain. |
| `facilityDisplay` | `hospital_id`, hospital name/projection, organization/facility scope | Location card renders `request.hospital_name || 'N/A'` at `EmergencyDetailsModal.jsx:550-552`. | `{ hospitalId, organizationId, name, scopeState }`; `not_assigned`, `hidden`, and `missing_name` remain distinct. |
| `locationDisplay` | patient/pickup/responder location fields, coordinate normalizer, optional external geocoding state | Location card renders `LocationCell` with raw location fields at `EmergencyDetailsModal.jsx:554-563`; map link uses `request.latitude`/`request.longitude` at `:586-591`. | `{ addressLabel, coordinates, coordinateSource, canOpenExternalMap, externalMapUrl, degradedReason }`; third-party geocode failure is not backend-truth failure. |
| `paymentDisplay` | `getLatestEmergencyPayment()`, request payment aliases, payment visibility/RLS state | Approval amount uses `paymentData?.amount ?? request.total_cost` at `EmergencyDetailsModal.jsx:359-364`; missing payment copy uses `paymentVisibilityState` at `:384-391`. | `{ paymentId, amountLabel, currency, methodLabel, status, visibilityState, canApproveCash, canDeclineCash, canRetry }`; nonnumeric amounts render unavailable, not zero. |
| `actionState` | emergency action helper plus receiver availability and refreshed projection rules | Approval/retry buttons use local booleans and pending state at `EmergencyDetailsModal.jsx:346-418`; page/map/mobile have separate action logic. | `{ approveCash, declineCash, retryPayment, openClinicalRecord, externalNavigation }` with command class, disabled reason, pending key, and post-command refresh target. |
| `clinicalOutcome` | `visits.request_id` projection via `getVisitByRequestId()` | Clinical block renders `visitOutcome` and dispatches `openVisitModal` at `EmergencyDetailsModal.jsx:438-489`. | `{ visibilityState, summary, doctorLabel, prescriptions, canOpen, receiver }`; receiver cannot be custom event unless mounted on current route. |
| `responderDisplay` | dispatch RPC result fields, responder/ambulance fields, telemetry/ETA seed where present | Dispatch indicator uses `request.ambulance_id` at `EmergencyDetailsModal.jsx:421-426`; responder card uses `request.responder_*` at `:638-664`; ETA uses `etaDisplay` at `:608-609`. | `{ assignmentState, ambulanceId, responderName, phone, vehiclePlate, vehicleType, etaLabel, telemetryState }`; no confident ETA if seed is absent. |
| `timelineSummary` | `emergency_status_transitions` append-only rows | No current rendered Console timeline. | `{ visibilityState, rows }`; read-only, no edit/delete controls. |
| `chatSummary` | `ensure_emergency_chat_room`, message/read RPCs, scoped chat tables | No current rendered Console chat surface. | `{ availabilityState, roomId, unreadCount, latestMessage, canSend }`; no direct table-send path. |
| `clinicianAssignment` | `assign_doctor_to_emergency`, `emergency_doctor_assignments` | No current persisted Console assignment surface. | `{ availabilityState, assignmentId, doctorId, doctorLabel, status, notes }`; displayed doctor context is not assignment proof. |
| `reportAction` | No receiver proved in this pass | Bottom button says `Generate Incident Report` at `EmergencyDetailsModal.jsx:676-679`. | Disabled/unavailable until report receiver is named, or removed from first slice. |

Implementation gate: after this projection contract is implemented, `EmergencyDetailsModal` should treat raw `request` as an input seed only. Direct raw-field rendering is allowed only where the projection explicitly passes through a field with a named unavailable/degraded state.

## Emergency Command And Action Target Contract

The first implementation slice must also close command parity. Route, modal, mobile and map surfaces must share one action model instead of each surface deciding dispatch, completion, cash, retry or clinical navigation independently.

| Action | Current visible surfaces and code evidence | Canonical receiver or source | First-slice command contract | Deferred or disabled boundary |
| --- | --- | --- | --- | --- |
| Approve cash and release dispatch | Detail modal calls `approveCashPayment(paymentData.id, request.id)` at `EmergencyDetailsModal.jsx:121`; service calls `approve_cash_payment` at `emergencyService.js:559-568`. | `approve_cash_payment(payment_id, request_id)` plus refreshed request/payment projection. | Keep modal as the initial owner. Command state must include `pendingKey`, `paymentId`, `requestId`, disabled reason when payment is hidden/missing, and post-command refresh of detail/list row before final dispatch-release copy. | Do not use `walletService.processCashPayment()` for pending approval. |
| Decline cash | Detail modal calls `declineCashPayment(paymentData.id, request.id)` at `EmergencyDetailsModal.jsx:153`; service calls `decline_cash_payment` at `emergencyService.js:599-608`. | `decline_cash_payment(payment_id, request_id)` plus refreshed request/payment projection. | Keep modal as the initial owner. Command result copy may say decline recorded after RPC success; lifecycle/payment labels come from refreshed projection. | Do not direct-write payment/request status. |
| Retry declined payment | Detail modal delegates to `onRetryPayment`; page calls `retryPaymentWithDifferentMethod()` at `EmergencyRequestsPage.jsx:572`; service calls RPC at `emergencyService.js:740-750`. | `retry_payment_with_different_method(request_id, payment_method_id, user_id)` plus refreshed payment/request projection. | One retry controller must own patient method resolution, selected method id, pending state, refresh target, and copy that says patient completion is still required. | Do not present retry as completed payment or settled dispatch release. |
| Dispatch emergency | Page dispatch path uses `dispatchEmergency()` at `EmergencyRequestsPage.jsx:443-447`; desktop map uses it at `MarkerDetailPanel.jsx:133-140`; mobile map uses it at `MobileMap.jsx:277-284`; service calls `console_dispatch_emergency` at `emergencyResponseService.js:92-108`. | `console_dispatch_emergency` through one Console command facade. | One command facade must own preflight, canonical org/facility identity, selected ambulance/hospital/bed payload, pending state, result projection refresh, and success copy. | Do not let map/mobile bypass cash approval, wallet eligibility, or refreshed responder/tracking truth. |
| Complete emergency | Page calls `completeEmergency()` then may trigger cash prompt at `EmergencyRequestsPage.jsx:469-497`; desktop map calls complete at `MarkerDetailPanel.jsx:158-164`; mobile map calls complete at `MobileMap.jsx:293-299`; bed management calls `console_complete_emergency` at `bedManagementService.js:121-130`. | `console_complete_emergency` through one Console command facade with capacity/visit/payment side-effect projection. | One completion command must name the actor surface, pending state, request id, expected side effects, refresh targets and copy. If cash settlement is needed, show a separate unavailable/pending finance state. | Do not auto-run manual cash settlement from ordinary completion in Pass 1. |
| Manual cash settlement | Page calls `walletService.processCashPayment()` after prompt at `EmergencyRequestsPage.jsx:489-497`; service calls `process_cash_payment` at `walletService.js:277-283`. | Finance receiver to be adjudicated in Pass 2. | In Pass 1, action state should mark this unavailable/deferred unless the request is explicitly in a post-completion cash-settlement state with finance authority proved. | Do not claim fee deducted or cash settled from emergency route code. |
| Open clinical record | Detail modal dispatches `openVisitModal` at `EmergencyDetailsModal.jsx:468-471`; only `VisitsPage` receives `openVisitModal` at `VisitsPage.jsx:359-366`. | `visits.request_id` projection plus mounted route receiver or explicit navigation. | `clinicalOutcome.receiver` must be `mounted_modal`, `navigate_to_visits`, or `unavailable`. The emergency route cannot close the modal into an unreceived event. | Visit edit/delete/complete/cancel remains Pass 6. |
| External map navigation | Detail modal opens Google Maps from `request.latitude`/`request.longitude` at `EmergencyDetailsModal.jsx:586-591`. | Validated coordinate projection plus user-initiated external URL. | Action is allowed only when `locationDisplay.canOpenExternalMap` and coordinates are valid. Copy must indicate external navigation, not Console tracking. | Third-party geocoding/navigation failures are degraded location display, not emergency backend failure. |
| Generate incident report | Detail modal renders button at `EmergencyDetailsModal.jsx:676-679`. | No receiver proved in Pass 1. | First slice should disable or remove this action with an unavailable reason. | Do not add report generation in Pass 1 unless a separate receiver/audit plan is created. |

Command implementation gate: every visible emergency action must consume the shared `actionState` from the projection or route-list projection. A surface may style or position the action differently, but it cannot invent legality, payload, success copy, or refresh behavior locally.

## Detailed Implementation Checklist

Before code changes:

- Preserve `getEmergencyDetailProjection(requestId, initialRequest)` as the already-present emergency detail read boundary and extend it only for missing receiver truth.
- Use `getLatestEmergencyPayment(requestId)` as the payment-by-request read boundary.
- Use `approveCashPayment(paymentId, requestId)` for cash approval.
- Use `declineCashPayment(paymentId, requestId)` for cash decline.
- Use `retryPaymentWithDifferentMethod(requestId, paymentMethodId, userId)` for retry payment.
- Use `getVisitByRequestId(requestId)` for request-derived visit lookup.
- Treat current payment RLS as sufficient for org-scoped payment reads; a visible mismatch becomes a data/RLS defect with evidence.
- Treat terminal emergency requests as expected to have linked visits through `sync_emergency_to_visit`; missing links become explicit empty state plus data repair follow-up.

Read-only/UI cleanup:

- Refine the existing emergency detail projection/facade for missing transition, chat, assignment and typed field state.
- Remove unreachable legacy modal fallback code while retaining projection-only payment/visit reads.
- Preserve list/table use of the same request-derived visit lookup while repairing the route-owned clinical record receiver.
- Replace optimistic success copy with backend-confirmed or pending copy.
- Add structural loading state for detail projection and compact degraded rows.

L5 repair, only when a deterministic gate fails:

- Repair payment visibility policy or RPC wrapper.
- Repair visit creation/linking trigger/RPC.
- Repair cash approval/decline receiver if it does not atomically enforce legal state and finance effects.
- Repair retry payment receiver if it only creates setup state without a patient-completable path.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on emergency list.
- Open detail modal for:
  - pending approval cash request
  - payment declined request
  - accepted/in-progress request
  - completed request with linked visit
  - completed request without linked visit
- Verify no blank modal state and no console error for missing visit/payment rows.

Backend/RLS/RPC:

- Read-only proof for payment visibility by platform admin and org admin.
- RPC test for approve cash payment.
- RPC test for decline cash payment.
- RPC test or fixture for retry payment with different method.
- Visit lookup proof by request id.

Hard blockers:

- Do not patch modal fields before `getVisitByRequestId(requestId)` exists.
- Do not change cash approval UI before `approve_cash_payment` and `decline_cash_payment` remain proven in source.
- Do not backfill emergency/visit/payment history inside this pass.
