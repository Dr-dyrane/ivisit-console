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
- `EmergencyRequestTableView` logs the fetched linked visit record in the browser, and `emergencyService` logs cash approval/decline RPC result data; clinical and payment command evidence must not leak through browser diagnostics.
- `emergencyService` also writes emergency-created/completed/updated activity descriptions and metadata containing pickup or destination address values through `logEmergencyActivity`; those records feed the dashboard recent-activity path and require a scoped, minimized activity projection rather than treating address-bearing audit copy as generally renderable.
- `LocationCell` owns direct Google reverse geocoding for detail locations while its accepted coordinate shapes are narrower than app location inputs; location fallback is therefore part of emergency detail truth, not leaf formatting.
- `EmergencyDetailsModal` also exposes a Google Maps navigation link built from request latitude/longitude. This is an intentional operator action only if coordinates are validated, disclosure is appropriate for the authorized actor, and the external handoff is visibly distinct from Console-owned tracking truth.
- `EmergencyDetailsModal` closes after dispatching `openVisitModal`, but the only active receiver is mounted by `VisitsPage`; from `/emergencies`, the visible "View Full Clinical Record" action has no mounted modal receiver.
- `EmergencyRequestsPage` does page-local server pagination/count and current-row payment enrichment; pagination exists, but its filter/count/enrichment/failure lifecycle is not yet owned by the emergency read model.
- `EmergencyRequestsPage` refreshes from broad emergency/payment subscriptions, attempts dispatch cash eligibility with `orgId || request.organization_id || request.hospital_id`, and can claim dispatched resources or cash fee deduction before refreshed projected truth.
- `EmergencyRequestsPage`, `MobileEmergency`, and `EmergencyPanel` contain corrupted separator bytes in rendered copy; this is a user-visible encoding defect, not merely a documentation gate.
- `MobileEmergency` renders alias fields not synthesized by the row mapper and labels the non-approval command `Navigate` while the parent routes it to dispatch.
- `MobileEmergency.jsx:106-147,207-288` falls back from absent statistics to the currently supplied emergency rows for service/status totals and response success, then labels fallback trends `LIVE` and supplies fixed response-time copy. The responsive view can therefore present a page window or missing aggregate as network/lifecycle performance truth.
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
| `/emergencies` mobile list | Receives the same page rows, but reads legacy `patient_name`, `location`, `contact_phone` and `assignedAmbulance` shapes; its performance tiles can compute totals/success from those rows and label them `LIVE`. | Approval opens detail; the `Navigate` action invokes parent dispatch. | **Blocked.** Mobile can hide true patient/location/responder data, misname a dispatch command, and misstate a loaded window as emergency response performance. |
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
| Emergency mobile route variant | Field exposure and local fallback KPI derivation traced; alias drift and `LIVE` claim confirmed. | Maps visible `Navigate` to dispatch. | Inherits desktop page window; requires scoped emergency aggregate or unavailable labels. | Blocked |
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
| `EmergencyDetailsModal` cash commands | `EmergencyDetailsModal.jsx:121` and `:153` call `approveCashPayment()` / `declineCashPayment()`; `emergencyService.js:559-613` owns the RPC calls and logs RPC command/result values in the browser. | Mostly aligned for modal approval/decline, with a disclosure defect. | Preserve refresh-before-final-copy behavior, prove dispatch-release copy from refreshed request state, and remove/redact browser payment-result logging. |
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

## Route Receiver And Clinical Navigation Sweep

Post-checkpoint route read confirms there are two different clinical-record paths. Do not flatten them during implementation:

| Path | Exact source | Current behavior | Required disposition |
| --- | --- | --- | --- |
| Mobile emergency detail modal mount | `frontend/src/components/pages/EmergencyRequestsPage.jsx:621-631` | Mobile route composition mounts `EmergencyDetailsModal` and passes `onRetryPayment`; close can refresh the route. | Preserve the mounted detail receiver. Any clinical CTA inside the modal must also resolve inside this route or navigate deliberately. |
| Desktop emergency detail modal mount | `frontend/src/components/pages/EmergencyRequestsPage.jsx:1200-1210` | Desktop route composition mounts the same `EmergencyDetailsModal` and refresh contract. | Shared detail-modal behavior must stay viewport-neutral; do not implement a clinical receiver only for desktop or only for mobile. |
| Detail-modal clinical CTA | `frontend/src/components/modals/EmergencyDetailsModal.jsx:469-470` | Dispatches `openVisitModal` and closes the modal. No `/emergencies` listener for that event was found in the route sweep. | Replace with a mounted emergency-route clinical outcome surface or explicit navigation that preserves request-derived visit identity. |
| List clinical CTA | `frontend/src/components/views/EmergencyRequestListView.jsx:129-132` | Calls `getVisitByRequestId(req.id)` and navigates to `/visits?view=${visitData.id}` on success. | Preserve as the currently working route-transition pattern, but move lookup/capability into the emergency/visit projection before code cleanup. |
| Table clinical CTA | `frontend/src/components/views/EmergencyRequestTableView.jsx:179-185` | Calls the same lookup and navigates to `/visits?view=...`, but logs the request and visit data to the browser console. | Preserve navigation semantics, remove clinical payload logs, and consume the same projected `clinicalOutcome` capability as list and detail. |
| Missing receiver event | `frontend/src/components/pages/EmergencyRequestsPage.jsx:243-250` | Route listeners cover `openEmergencyModal`, `openFilters`, and `openAnalyticsModal`, but not `openVisitModal`. | Do not add a quick listener as a patch unless it mounts the same request-derived read-only projection and Pass 6 authority gates. |
| Analytics modal on emergency route | `frontend/src/components/pages/EmergencyRequestsPage.jsx:651-653,1231-1233` | Mobile fallback analytics can derive from loaded requests while desktop uses `emergencyData?.stats`; both are route-local modal inputs. | Pass 8 owns analytics truth, but Pass 1 must not let emergency action cleanup deepen fallback performance claims. |

## Page, Service, Mobile, And Map Sweep - May 25 Continuation

This continuation narrows the implementation blockers that must be resolved before Pass 1 code starts. It is still audit-only.

| Flow segment | Exact source | Current contract break | Required first-slice disposition |
| --- | --- | --- | --- |
| Detail projection owner | `frontend/src/services/emergencyService.js:246-286` | `getEmergencyDetailProjection()` returns raw request, latest payment and visit outcome only; it does not normalize patient, service, location, responder, action state, timeline, chat or clinician assignment. | Extend the existing projection rather than adding modal/page fallback reads. First slice must define the full projection shape before JSX changes. |
| Detail scoped realtime | `frontend/src/services/emergencyService.js:289-306` | Scoped subscription covers request, payments and visits. This is correct but incomplete for transition/chat/assignment once added. | Preserve cleanup and add only receiver-backed channels; no broad modal-owned realtime. |
| Detail modal dead fallback code | `frontend/src/components/modals/EmergencyDetailsModal.jsx:184-205,207-225` | Effects/functions contain unreachable legacy branches after unconditional `return`; they can confuse future implementers into reintroducing modal-local payment/visit fetches. | Remove only after projection contract and smoke checks are defined; do not revive the old fallback paths. |
| Detail local parser | `frontend/src/components/modals/EmergencyDetailsModal.jsx:29-60` | `ambulance_type` normalization lives in the modal and logs malformed JSON values. | Move parser to service/detail projection and render a safe scalar label; no data-bearing parser logs in production. |
| Page list/count owner | `frontend/src/components/pages/EmergencyRequestsPage.jsx:124-205` | The route owns count query, page query, filters, search, sort and current-page payment enrichment. | Move into emergency list projection with count/filter parity, payment visibility state and normalized rows. |
| Broad list realtime | `frontend/src/components/pages/EmergencyRequestsPage.jsx:219-229` | Page subscribes broadly to all request and payment changes, then refetches the route page. | Replace with a list invalidation owner scoped by role/filter/page where feasible; broad subscription cannot become canonical truth. |
| Visible mojibake in footer and retry prompt | `frontend/src/components/pages/EmergencyRequestsPage.jsx:344-345,527-552` | Footer and payment-method prompt contain corrupted bullet bytes in rendered copy. | Fix during first implementation touch and include mojibake smoke for emergency route copy. |
| Dispatch command preflight | `frontend/src/components/pages/EmergencyRequestsPage.jsx:425-447` | Cash eligibility can fall back from organization id to hospital id, then success copy says resources assigned immediately after `dispatchEmergency()`. | Use canonical organization/facility identity and refreshed projection before dispatch/release copy. |
| Complete plus manual cash settlement | `frontend/src/components/pages/EmergencyRequestsPage.jsx:469-499` and `frontend/src/services/walletService.js:277-286` | Emergency completion can call wallet cash processing from the page and immediately claim fee deduction. | Disable/defer manual settlement unless Pass 2 names it as an authorized payment command; emergency completion copy must reflect refreshed request/payment truth. |
| Alternate dispatch facade | `frontend/src/services/emergencyResponseService.js:77-108,218-228` | Route/map use `emergencyResponseService` while `emergencyService` also exposes emergency RPC command wrappers. | Select one command facade or adapter policy for route, detail, map and mobile; success semantics must be shared. |
| Map desktop commands | `frontend/src/components/map/MarkerDetailPanel.jsx:127-168` | Marker detail can dispatch or complete from selected marker data and optimistic toasts, outside route payment/cash/detail projection. | Route through the same Pass 1 action projection and refresh target; marker data alone cannot authorize lifecycle commands. |
| Mobile map commands | `frontend/src/components/mobile/MobileMap.jsx:273-303` | Mobile map dispatches/completes selected emergency markers with `Unit Dispatched` / `Mission Complete` copy. | Same action projection and backend-confirmed copy as desktop route; no map-only command semantics. |
| Mobile emergency row aliases | `frontend/src/components/mobile/MobileEmergency.jsx:369-428` | Mobile rows use `patient_name`, `patient`, `location`, `contact_phone`, `assignedAmbulance`, `eta` and `assignedHospital` aliases that are not guaranteed by the route row mapper. | Mobile consumes the same emergency row projection as desktop list/table. |
| Mobile live metrics | `frontend/src/components/mobile/MobileEmergency.jsx:106-147,207-288` | Missing aggregates fall back to loaded rows and fixed response values, then render `LIVE` trend copy. | Use scoped summary projection or explicit current-window/unavailable labels; no page-window performance truth. |
| Location leaf ownership | `frontend/src/components/ui/LocationCell.jsx:8-66,77-103` | Leaf component chooses location precedence, decodes PostGIS and calls Google Geocoding; failed geocoding logs errors and falls back locally. | Emergency projection owns accepted location shapes and degraded state. Leaf renders prepared display, not source truth. |
| Context panel recent rows | `frontend/src/components/context/EmergencyPanel.jsx:17-23,133-150` | Panel emits global route events and renders recent rows/location from `PageDataContext`, separate from route owner. | Keep as Pass 8 shell dependency, but Pass 1 must specify the emergency summary/recent projection it may consume. |

## Missing Backend Receiver Matrix

These receivers are present in shared source but absent from mounted Console runtime. They are not optional polish: they are required to make emergency detail trustworthy without inventing parallel state.

| Receiver family | Exact source evidence | Authority/behavior proven | Console implementation rule |
| --- | --- | --- | --- |
| Status transition timeline | `frontend/supabase/migrations/20260219000300_logistics.sql:91-132` defines `emergency_status_transitions`, request/time indexes, and an append-only mutation blocker. | Rows contain from/to status, actor, source, reason, metadata, request snapshot and time. Update/delete raises an exception. | Console may read a scoped timeline only. It must never edit, delete, backfill or rewrite transition rows from UI. |
| Transition row writer | `frontend/supabase/migrations/20260219000800_emergency_logic.sql:2166-2189` inserts transition rows from emergency status changes. | Emergency lifecycle commands generate evidence automatically with actor/source metadata. | Detail timeline should reflect backend-generated evidence; do not create separate UI audit events as lifecycle truth. |
| Transition RLS | `frontend/supabase/migrations/20260219000700_security.sql:198-216` permits scoped select for patient, responder, request hospital organization, or admin. | Visibility is tied to request/user/responder/org scope. | Projection must report `hidden`, `unavailable`, `empty`, and `visible` separately, not collapse RLS denial into no history. |
| Chat room ensure | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:3335-3473` and `ivisit-app/services/emergencyChatService.js:169-205` use `ensure_emergency_chat_room`. | RPC validates request scope, creates/updates room, links visit when available, and inserts patient/responder participants. | Console must call the RPC/facade, not insert rooms or participants directly. |
| Chat message send/read | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:3475-3678` and `ivisit-app/services/emergencyChatService.js:245-314` use `send_emergency_chat_message` and `mark_emergency_chat_room_read`. | RPC enforces participant scope, room status, message kind and body length; read state is participant-specific. | Console chat UI must be request-scoped, participant-authorized and idempotent by client message id where used. |
| Chat realtime | `ivisit-app/services/emergencyChatService.js:337-357` subscribes to `emergency_chat_messages` by room id. | Realtime is room-scoped and maps rows before emission. | Console may subscribe by room after `ensureRoomForRequest`; no broad chat channels in route or shell. |
| Chat RLS | `frontend/supabase/migrations/20260219000700_security.sql:217-237` permits chat room/participant/message select through `p_is_emergency_chat_participant`. | Select authority follows participant membership, not generic route role. | Detail projection must show chat unavailable/hidden when the actor is not a participant or cannot ensure room. |
| Clinician assignment RPC | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:1067-1258` defines `assign_doctor_to_emergency`. | RPC rejects terminal requests, verifies actor role/org, request hospital, doctor organization/hospital, availability/status/capacity, and handles reassignment/current-patient counts. | Console assignment/handoff must call this RPC or an audited facade; a displayed/suggested doctor is not persisted assignment truth. |
| Clinician assignment RLS | `frontend/supabase/migrations/20260219000700_security.sql:442-466` enables RLS and policies for own/admin/org-managed assignment access. | Patients see own assignments; org admins manage assignments scoped through doctor/hospital org; admins bypass. | Projection must distinguish no assignment from no visibility. Direct table mutation is not acceptable from UI. |
| Assignment automation | `frontend/supabase/migrations/20260219000900_automations.sql` contains assignment and release automation tied to emergency state. | Backend can create/release assignment state as lifecycle changes. | Console must refresh assignment from backend truth after emergency status changes; do not maintain a local doctor snapshot as canonical. |

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
| Mobile emergency operational metrics | `MobileEmergency.jsx:106-147,207-288` falls back to `emergencies.length`, locally filtered statuses/services and locally resolved rows for totals/success, while missing trends or response times render as `LIVE`/fixed copy. | Add scoped emergency summary projection with explicit aggregate basis and measurement window. | No current-page count, missing statistic or placeholder response time may be rendered as live response performance. |
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
| `patientContactAction` | No communication receiver proved in this pass | Requester card renders `Call Patient` without an `onClick` handler at `EmergencyDetailsModal.jsx:537-540`. | Disabled/unavailable until a role-authorized communication handoff exists, or removed from first slice. |
| `reportAction` | No receiver proved in this pass | Bottom button says `Generate Incident Report` at `EmergencyDetailsModal.jsx:676-679`. | Disabled/unavailable until report receiver is named, or removed from first slice. |

Implementation gate: after this projection contract is implemented, `EmergencyDetailsModal` should treat raw `request` as an input seed only. Direct raw-field rendering is allowed only where the projection explicitly passes through a field with a named unavailable/degraded state.

### Modal Raw Field Closure Matrix

This is the implementation checklist for removing modal raw-field assumptions. Each exhibit must either move behind the projection key or be removed/disabled.

| Raw modal exhibit | Current render or action | Projection owner |
| --- | --- | --- |
| `EmergencyDetailsModal.jsx:294-310` | priority icon/badge, service icon/title, case id and created time from raw request fields. | `priorityDisplay`, `serviceDisplay`, `identity`. |
| `EmergencyDetailsModal.jsx:363` | cash approval amount falls back to `request.total_cost`. | `paymentDisplay.amountLabel` with nonnumeric/unavailable state. |
| `EmergencyDetailsModal.jsx:422-435` | dispatch indicator and incident description read `ambulance_id` and `description`. | `responderDisplay.assignmentState`, `detailSummary.description`. |
| `EmergencyDetailsModal.jsx:495-521` | request date/time and username aliases read `created_at`, `patient_snapshot`, and `profiles`. | `identity`, `patientDisplay`. |
| `EmergencyDetailsModal.jsx:552-573` | hospital, location, request id and service type use raw request fields and `LocationCell`. | `facilityDisplay`, `locationDisplay`, `identity`, `serviceDisplay`. |
| `EmergencyDetailsModal.jsx:587` | external Google Maps URL uses `request.latitude` / `request.longitude`. | `locationDisplay.externalMapUrl` and `actionState.externalNavigation`. |
| `EmergencyDetailsModal.jsx:598-604` | ambulance type is parsed and rendered locally. | `serviceDisplay.ambulanceTypeLabel`; no render-time `JSON.parse`. |
| `EmergencyDetailsModal.jsx:613-632` | status, bed number, bed category and specialty read raw fields. | `statusDisplay`, `serviceDisplay.bedLabel`, `serviceDisplay.bedCategoryLabel`, `serviceDisplay.specialtyLabel`. |
| `EmergencyDetailsModal.jsx:639-659` | responder name, phone, plate and vehicle type read raw fields. | `responderDisplay`. |

Implementation rule: a code pass should work down this matrix in order and stop if any projection field lacks a source, unavailable state, or test/smoke expectation.

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
| Call patient | Detail modal renders `Call Patient` without a receiver at `EmergencyDetailsModal.jsx:537-540`. | No communication/calling receiver proved in Pass 1. | First slice should remove or visibly disable this operational affordance unless an audited contact handoff is introduced. | Do not imply outreach or coordination occurred from an inert button. |
| Generate incident report | Detail modal renders button at `EmergencyDetailsModal.jsx:676-679`. | No receiver proved in Pass 1. | First slice should disable or remove this action with an unavailable reason. | Do not add report generation in Pass 1 unless a separate receiver/audit plan is created. |

Command implementation gate: every visible emergency action must consume the shared `actionState` from the projection or route-list projection. A surface may style or position the action differently, but it cannot invent legality, payload, success copy, or refresh behavior locally.

### Emergency Command Facade Decision Matrix

The first implementation should create or designate one command facade for emergency lifecycle actions. Today, command ownership is split across services and surfaces.

| Command owner/path | Current evidence | Risk | First-slice disposition |
| --- | --- | --- | --- |
| `emergencyService.js` lifecycle RPCs | `acceptEmergencyRequest()`, `completeEmergencyRequest()`, `cancelEmergencyRequest()`, `approveCashPayment()`, `declineCashPayment()`, `retryPaymentWithDifferentMethod()` call canonical RPCs. | This is closest to the desired app-aligned command boundary but is not what page/map dispatch currently use. | Prefer this as the facade home or wrap it from a new emergency command module. |
| `emergencyResponseService.js` dispatch | `dispatchEmergency()` selects ambulance/hospital/doctor/bed client-side, then calls `console_dispatch_emergency` or `console_update_emergency_request`. | It owns resource selection and optimistic assignment copy, but not shared action legality or detail/list projection refresh. | Keep as an adapter only if the command facade owns preflight, payload, pending state, refresh target and success copy. |
| `emergencyResponseService.js` completion | `completeEmergency()` calls `console_complete_emergency` and returns request. | Duplicates `emergencyService.completeEmergencyRequest()`. | Collapse route/map/mobile completion to one facade method. |
| Route page commands | `EmergencyRequestsPage.jsx:350-505` cancels, bulk cancels, dispatches, completes and manually processes cash. | Route combines lifecycle, finance and copy. | Route calls command facade with projected row/action; no direct wallet settlement. |
| Map marker commands | `MarkerDetailPanel.jsx:127-168` dispatches/completes with local status checks and toasts. | Map bypasses cash/payment/wallet preflight and refreshed projection copy. | Map consumes `actionState` and command facade or marks lifecycle commands unavailable. |
| Mobile map commands | `MobileMap.jsx:273-303` dispatches/completes with local ambulance-id checks. | Mobile can dispatch/complete without route legality, payment state or refreshed detail. | Mobile map consumes the same `actionState` and command facade. |
| `useEmergency.js` hook commands | `useEmergency.js:182-230` wraps accept/complete/cancel and mutates local state. | Hook state can drift from route projection and is not the route owner today. | Leave untouched unless a consumer is in first-slice scope; do not make it a second source of list truth. |
| Bed/driver service lifecycle commands | `bedManagementService` and `driverManagementService` call complete/cancel/update RPCs. | Capacity/fleet services can mutate emergency lifecycle outside Pass 1 rules. | Document as dependent Pass 3/5 consumers; later route them through the same command policy or prove why they remain service-owned. |

Command facade output must include:

| Output field | Meaning |
| --- | --- |
| `success` | RPC accepted the command; not proof that every visible downstream state has refreshed. |
| `request` | Refreshed emergency request row or null when caller must refetch. |
| `payment` | Refreshed payment state when command affects payment. |
| `ledger` | Only present for finance-authorized commands; absent in Pass 1 emergency lifecycle commands. |
| `assignments` | Responder/hospital/bed/doctor assignment result with source and degraded state. |
| `refreshTargets` | list row, detail projection, payment projection, map marker, global summary. |
| `operatorCopy` | Pending/success/failure copy that is truthful to refreshed state. |

Implementation rule: route, detail, mobile and map commands may style buttons differently, but the facade owns payload construction, legal receiver, pending key, success copy and refresh target. No surface-level toast may claim dispatch, completion, cash settlement or fee deduction from an unrefreshed local result.

### Capacity And Fleet Dependent Command Consumers

Pass 1 cannot close emergency lifecycle commands while capacity and fleet surfaces still own parallel lifecycle actions. These are not first-slice emergency-page implementation targets, but their contracts must be named so future Pass 3/5 work does not reintroduce drift.

| Dependent surface/service | Current evidence | Emergency truth overlap | First-slice disposition |
| --- | --- | --- | --- |
| Hospital modal bed reservations | `HospitalModal.jsx:236-265` subscribes through `bedManagementService` and loads active reservations/utilization. | View-mode hospital detail is reading active `emergency_requests` with `service_type='bed'` as capacity truth. | Treat as read-only consumer of the future bed/capacity projection until Pass 3. |
| Hospital modal reservation actions | `HospitalModal.jsx:721-745` calls `bedManagementService.cancelReservation`, `updateReservationStatus`, and `dischargePatient`. | The rendered cancel call references `cancelReservation`, while the service exposes `cancelBedReservation`; arrived/discharge mutate emergency lifecycle. | Mark these actions unavailable or route through the shared command facade when Pass 3 begins; the missing method name is a concrete implementation bug. |
| Bed management service reads | `bedManagementService.js:15-65` joins emergency requests, hospitals and profiles manually; `:77-110` calculates utilization from scalar hospital bed fields plus request statuses. | Capacity is inferred from scalar beds and request lifecycle, not room/hold truth. | Pass 3 must distinguish hospital scalar bed counts, room inventory, active reservations, arrivals, completions/discharges and unavailable proof. |
| Bed management service commands | `bedManagementService.js:121-152` calls complete/cancel RPCs; `:272-285` calls generic update status. | Capacity service can complete/cancel/arrive emergency requests outside Pass 1 action model. | Keep documented as dependent consumer; do not edit in Pass 1 unless emergency command facade is implemented and this service becomes an adapter. |
| Ambulance modal driver assignments | `AmbulanceModal.jsx:100-129` subscribes through `driverManagementService` and loads active assignments/utilization. | View-mode ambulance detail reads active `emergency_requests` with `service_type='ambulance'` as fleet truth. | Treat as read-only consumer of future fleet/provider projection until Pass 5. |
| Ambulance modal driver actions | `AmbulanceModal.jsx:752-776` calls cancel, arrived and complete through driver management service. | Fleet modal can mutate emergency lifecycle outside the emergency page/map command policy. | Disable/defer or route through shared command facade when Pass 5 begins. |
| Driver management service reads | `driverManagementService.js:15-75` joins emergency requests, hospitals, profiles and ambulances manually; `:87-121` derives utilization from ambulance status and request counts. | Driver utilization can disagree with emergency responder assignment, ambulance status, and route/telemetry truth. | Pass 5 must define fleet projection from ambulance status, responder assignment, active request and telemetry state. |
| Driver management service commands | `driverManagementService.js:132-221` calls complete/cancel/update status RPCs with local status copy. | Driver service owns lifecycle toasts and status transitions outside the shared action state. | Route to command facade or prove service-specific authority; no independent success copy after Pass 1 command policy exists. |
| Driver map controls | `GodModeMap.jsx:353-389` updates responder location and status; `:584-653` renders driver telemetry/actions. | Driver map is both telemetry source and lifecycle command surface. | Location ping can remain telemetry-specific, but status updates must consume lifecycle legality and refreshed projection. |

Dependent-consumer gate: the first emergency implementation may leave these surfaces unchanged only if it clearly marks them as dependent Pass 3/5 consumers. If Pass 1 changes shared command behavior, these consumers must either adopt the facade or be explicitly disabled/unavailable to avoid two competing lifecycle policies.

## Missing Operational Surface Receiver Plan

Pass 1 is not complete if it only repairs the existing modal fields. The audit found shared emergency tables/RPCs that `ivisit-app` and Supabase already treat as operational truth, while Console has no mounted surface for them. These must be planned before implementation starts, even if first implementation defers part of the UI behind an unavailable state.

| Missing surface | Source/receiver evidence | Console first-slice read plan | Console command plan | Unavailable/deferred rule |
| --- | --- | --- | --- | --- |
| Lifecycle transition timeline | Generated Console types include `emergency_status_transitions`; shared SQL grants transition-context helpers and uses status-transition validation in `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql`. | Add read-only `timelineSummary` to `getEmergencyDetailProjection()` by request id, ordered by transition time, with actor/source/reason metadata where visible. | No Console edit/delete command. Timeline is backend-derived evidence only. | If RLS denies or rows are absent, render `unavailable`, `hidden`, or `empty` distinctly; do not fabricate history from current status. |
| Urgent chat room summary | App service calls `ensure_emergency_chat_room` at `ivisit-app/services/emergencyChatService.js:172-190`; SQL authorizes room creation and participant sync at `core_rpcs.sql:3335-3471`. | Add `chatSummary` to projection: availability, room id, participant count, latest message, unread count when readable. | Console command service may call `ensure_emergency_chat_room(requestId)` only when operator opens/activates chat or the detail explicitly needs summary; no direct room insert. | If receiver/RLS proof fails, show "urgent thread unavailable" and do not mount a message composer. |
| Urgent chat messages | App lists messages from `emergency_chat_messages` at `emergencyChatService.js:206-233` and subscribes by room id at `:332-350`; SQL sends via `send_emergency_chat_message` at `core_rpcs.sql:3475-3621`. | Detail projection may include summary only; full message list belongs to a request-scoped chat panel/controller with bounded page size. | Send through `send_emergency_chat_message(roomId, body, kind, clientMessageId, metadata)` with idempotent client message id and pending/error state. | No direct table insert, no unbounded message list, no composer for archived/unavailable rooms. |
| Chat read marker | App calls `mark_emergency_chat_room_read` at `emergencyChatService.js:312-323`; SQL validates participant scope at `core_rpcs.sql:3625-3678`. | Projection or chat panel should expose unread state from participant/read fields where available. | Mark read only when room is opened or explicit read acknowledgement occurs. | Do not mark read during background summary fetch. |
| Clinician assignment/handoff | SQL defines `assign_doctor_to_emergency` at `core_rpcs.sql:1067-1245`; generated Console types include `emergency_doctor_assignments`. | Add `clinicianAssignment` to detail projection by request id, with assignment id, doctor id/name if joinable, status, notes and unavailable state. | Assign/reassign through `assign_doctor_to_emergency(requestId, doctorId, notes)` only after Pass 5 provider availability projection can supply valid doctors. | First Pass 1 slice may render current assignment/unavailable state and disable assign controls until Pass 5 doctor/schedule truth closes. |
| Doctor availability for handoff | Assignment RPC checks doctor hospital/org, availability, status and patient load in `core_rpcs.sql:1129-1190`. | Pass 1 should not infer availability from profile or doctor display fields. | No manual doctor picker until provider operations pass supplies scoped available-doctor projection. | Show "assignment requires provider availability audit" rather than an optimistic picker. |

Receiver implementation gate: transition timeline can be read-only in Pass 1; chat and clinician assignment may be rendered as unavailable if receiver/role proof is incomplete. What is not allowed is pretending these surfaces do not exist, because patient/app emergency truth already includes them.

### Missing Surface Field Contracts

These contracts are field-level audit targets for the missing operational surfaces. They do not authorize implementation yet; they prevent implementation from inventing a partial shape later.

| Surface | Source fields/RPCs | Projection fields | First-slice behavior |
| --- | --- | --- | --- |
| Lifecycle timeline | `emergency_status_transitions` row fields: `id`, `emergency_request_id`, `from_status`, `to_status`, `actor_user_id`, `actor_role`, `source`, `reason`, `transition_metadata`, `request_snapshot`, `occurred_at`, `created_at`. | `timelineSummary.visibilityState`, `rows[].fromStatus`, `rows[].toStatus`, `rows[].actorLabel`, `rows[].actorRole`, `rows[].source`, `rows[].reason`, `rows[].occurredAtLabel`, `rows[].metadataSummary`. | Read-only only. Empty, hidden, failed and no-transition-yet states remain distinct. Do not reconstruct history from current status. |
| Chat room summary | `ensure_emergency_chat_room(p_request_id)` returns room and participants; room fields include `id`, `emergency_request_id`, `visit_id`, `created_by`, `status`, `last_message_at`, `archived_at`. | `chatSummary.availabilityState`, `roomId`, `status`, `isArchived`, `participantCount`, `lastMessageAtLabel`, `canOpen`, `canSend`. | Summary can be unavailable until role proof is complete. Calling `ensure` should happen only on explicit open or when summary contract requires it. |
| Chat participants/read state | Participant fields: `room_id`, `user_id`, `role`, `display_name_snapshot`, `joined_at`, `left_at`, `last_read_message_id`, `last_read_at`. | `chatSummary.currentParticipant`, `participants[]`, `unreadCount`, `readState`. | Do not mark read during background summary. Mark read only when chat is opened or explicitly acknowledged. |
| Chat messages | App service lists `emergency_chat_messages`; message fields include `id`, `room_id`, `sender_id`, `sender_role`, `kind`, `body`, `client_message_id`, `metadata`, `created_at`, `edited_at`, `deleted_at`. `send_emergency_chat_message` enforces body length, participant scope and idempotent `client_message_id`. | `chatPanel.messages[]`, `pendingMessages[]`, `sendState`, `composerAvailability`, `messagePageInfo`. | Full message list belongs to a request-scoped panel/controller, not the detail projection payload. No direct table insert. |
| Chat realtime | App subscribes to `emergency_chat_messages` scoped by `room_id`. | `chatRealtime.channelName`, `roomId`, `onMessageEvent`, `onReadStateRefresh`. | Subscribe only while chat panel/detail chat summary is mounted; cleanup on close. |
| Clinician assignment | `emergency_doctor_assignments` fields: `id`, `emergency_request_id`, `doctor_id`, `status`, `notes`, `assigned_at`, `created_at`, `updated_at`; `assign_doctor_to_emergency()` checks role/org/hospital/status/doctor availability. | `clinicianAssignment.availabilityState`, `assignmentId`, `doctorId`, `doctorLabel`, `status`, `notes`, `assignedAtLabel`, `canAssign`, `disabledReason`. | Pass 1 may render read-only/unavailable state. Assign/reassign waits for Pass 5 provider availability projection unless exact doctor source is proven. |

Missing-surface verification references:

- App chat service: `ivisit-app/services/emergencyChatService.js:172-233`, `:240-265`, `:312-352`.
- Shared RPCs: `core_rpcs.sql:1067-1245`, `:3335-3471`, `:3475-3621`, `:3625-3692`.
- Schema snapshots/types: `emergency_status_transitions`, `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`, `emergency_doctor_assignments`.

## Emergency List And Surface Projection Plan

Pass 1 also needs a route-list projection. Detail projection alone cannot close emergency operations because visible actions and rendered fields are exposed from grid, list, table, mobile, map and context surfaces.

| Surface or owner | Current evidence | Projection gap | Required first-slice disposition |
| --- | --- | --- | --- |
| Route count/window query | `EmergencyRequestsPage.jsx:126-158` builds count and data queries directly with duplicated filters. | Count, page window, filter parity, sort, RBAC and timeout are route-owned instead of service-owned. | Define `getEmergencyListProjection({ page, pageSize, filters, sort, actor })` or equivalent before moving code; keep page as composition. |
| Route payment enrichment | `EmergencyRequestsPage.jsx:187-205` queries `payments` for current rows and merges through `normalizeEmergencyRequestRow()`. | Payment visibility/error/hidden state is collapsed into a payment map or warning. | List projection must return per-row `paymentDisplay` with visible/not_created/hidden/failed states and source label. |
| Route realtime | `EmergencyRequestsPage.jsx:219-229` subscribes broadly to all `emergency_requests` and `payments`. | Broad updates refetch current route and can duplicate detail subscriptions. | Route list owns list invalidation; detail owns request-scoped invalidation. Both must be separate and documented. |
| Grid cards | `EmergencyRequestsPage.jsx:960-1134` render raw patient/contact/location/hospital/payment/action fields and command buttons. | Grid has independent field chains and action rendering. | Grid consumes list row projection: patientDisplay, locationDisplay, facilityDisplay, paymentDisplay, statusDisplay, actionState. |
| List view | `EmergencyRequestListView.jsx:43-230` renders raw aliases, `LocationCell`, local clinical navigation and action buttons. | List variant repeats field/action logic and directly fetches visit for clinical navigation. | List view becomes presentational: receives row projection and command callbacks with disabled reasons. |
| Table view | `EmergencyRequestTableView.jsx:93-260` renders raw payment/status/location and directly fetches visit for clinical navigation. | Table variant repeats field/action logic and logs/debugs clinical fetch. | Table view consumes row projection; clinical receiver comes from `clinicalOutcome`, not local lookup. |
| Mobile route | `MobileEmergency.jsx:369-465` renders legacy aliases and action labels. | Mobile can hide true fields or mislabel dispatch as navigation. | Mobile receives the same row projection and action labels as desktop, with mobile-specific layout only. |
| Map marker detail | `MarkerDetailPanel.jsx:127-168` and `MobileMap.jsx:273-303` dispatch/complete directly. | Map has separate action semantics and toasts. | Map marker receives `actionState` and command facade from the same emergency route/model or marks actions unavailable. |
| Context/global panel | `PageDataContext.jsx` and `EmergencyPanel` acquire/render emergency summaries independently. | Global recent/KPI truth can drift from route list. | Keep global panel read-only or bind it to a bounded summary projection; it cannot own action truth. |

List projection output must include at minimum: `identity`, `patientDisplay`, `serviceDisplay`, `statusDisplay`, `locationDisplay`, `facilityDisplay`, `paymentDisplay`, `responderDisplay`, `clinicalOutcome`, `actionState`, `rowVisibilityState`, and `degradedReasons`.

Implementation gate: do not update page, list, table, mobile or map action handlers until the shared list row projection exists or a surface is explicitly disabled/unavailable for the first slice.

### `getEmergencyListProjection()` Target Contract

The first list implementation should be a service/facade contract, not a page-local refactor. It may keep Supabase query details inside `emergencyService.js` or a sibling emergency read-model module, but the route should receive one stable projection result.

| Contract part | Required shape | Current evidence to replace |
| --- | --- | --- |
| Input | `{ page, pageSize, filters, kpiFilter, sort, actor }` where `actor` includes user id, role, organization id and provider identity. | `EmergencyRequestsPage.jsx:119-217` pulls current user, applies auth filter twice, repeats filters and writes pagination/list state directly. |
| Count query | Applies the exact same RBAC, search, status and KPI filters as the row query. Returns `{ totalCount, countVisibilityState }`. | `EmergencyRequestsPage.jsx:126-152` builds the count query separately from the data query. |
| Row query | Applies RBAC, filters, range and sort. Returns raw request rows only inside the service boundary. | `EmergencyRequestsPage.jsx:154-183` owns row query and timeout. |
| Payment enrichment | Reads latest payment rows for current request ids and returns per-row payment display plus hidden/failed/not-created state. | `EmergencyRequestsPage.jsx:187-205` builds `paymentByRequestId` and collapses payment read failure to a console warning. |
| Row projection | Returns `rows[]` where each row has `rawId`, `identity`, `patientDisplay`, `serviceDisplay`, `statusDisplay`, `locationDisplay`, `facilityDisplay`, `paymentDisplay`, `responderDisplay`, `clinicalOutcome`, `actionState`, `rowVisibilityState`, `degradedReasons`. | `normalizeEmergencyRequestRow()` only canonicalizes status, payment method/status, ETA and bed category. |
| Selected row refresh | If `selectedRequestId` is supplied, returns the selected projected row or a `selectedRowVisibilityState`. | `EmergencyRequestsPage.jsx:207-210` locally replaces selected row if the row remains in the current page window. |
| Realtime invalidation | Returns channel descriptors or an invalidation policy: list channel for filtered list, detail channel for selected request, payment channel scoped to visible ids when possible. | `EmergencyRequestsPage.jsx:223-227` subscribes to whole `emergency_requests` and whole `payments`. |
| Error/degraded state | Returns `loadState`, `partialFailure[]`, and operator-safe messages; does not leave failures as console-only warnings. | `EmergencyRequestsPage.jsx:196-198` warns on payment read failure while rows still render as if payment state is absent. |

Required first-slice row fields:

| Projection field | Required content | Surfaces that must consume it |
| --- | --- | --- |
| `identity` | `id`, display id, short id, created-at labels, sort timestamp. | Grid card, list row, table row, detail open command, pagination footer. |
| `patientDisplay` | name, phone, avatar/initials, requester availability, source label. | Grid card, list row, table patient cell, mobile row, detail seed. |
| `serviceDisplay` | canonical service type, label, icon key, tone, ambulance type label, bed labels, specialty/category. | KPI cards, grid/list/table/mobile badges, create/edit echo, detail seed. |
| `statusDisplay` | canonical status, label, tone, is terminal, lifecycle step, active/pending/completed grouping. | KPI counts, grid/list/table/mobile badges, action state, detail seed. |
| `locationDisplay` | address label, coordinate object, coordinate source, degraded reason, external map availability. | Grid/list/table/mobile location, map marker summary, detail seed. |
| `facilityDisplay` | hospital id, organization id, hospital name, hidden/missing/unassigned state. | Grid/list/table/mobile hospital text, dispatch/cash org identity, detail seed. |
| `paymentDisplay` | method label, status label, amount label, payment id, visibility state, latest payment source. | Grid/table cash/retry controls, detail seed, finance boundary. |
| `responderDisplay` | assignment state, ambulance id, responder name/phone/vehicle, ETA label, telemetry seed state. | Grid action state, map marker, detail seed, patient tracking consequence. |
| `clinicalOutcome` | visibility state, visit id, receiver type, disabled reason. | Detail CTA, list/table clinical buttons, completed/cancelled row affordance. |
| `actionState` | command availability, disabled reasons, pending key seed, receiver/facade name and refresh target. | Grid buttons, list/table actions, mobile action labels, map marker actions. |

Implementation stop condition: if a row projection cannot distinguish "missing", "hidden by RLS", "not created yet", and "failed to load" for payment, location, facility or clinical outcome, the UI should render a degraded/unavailable state and the implementation should not continue into button wiring.

## Clinical Receiver Closure Plan

The emergency clinical-record action is a receiver problem, not a lookup problem. `visitsService.getVisitByRequestId()` now provides request-derived read truth, but the UI still has divergent receivers.

| Clinical path | Current evidence | Receiver problem | Required disposition before implementation |
| --- | --- | --- | --- |
| Emergency detail CTA | `EmergencyDetailsModal.jsx:468-471` dispatches `openVisitModal` with `visitOutcome` and closes the emergency modal. | `/emergencies` does not mount `VisitsPage`, so the event has no active route receiver. | Replace with an emergency-route mounted read-only visit outcome surface, or navigate intentionally to `/visits?view=<visitId>` after preserving request context. |
| Visits route URL receiver | `VisitsPage.jsx:44-60` reads `?view=<id>` and calls `getVisit(viewVisitId)`. | This route can open a visit modal by id, but it is route-scoped and not mounted while the emergency page is active. | If chosen as the first-slice receiver, the emergency CTA must navigate to this route and pass the canonical visit id, not fire a custom event. |
| Visits route event receiver | `VisitsPage.jsx:340-344` handles `openVisitModal` by calling `handleCreate()`, not by opening the passed visit detail. | Even when mounted, the event receiver does not consume the event payload as a view receiver. | Do not rely on `openVisitModal` for emergency detail view until Visits owns a payload-aware receiver. |
| Desktop list/table clinical button | `EmergencyRequestListView.jsx:129-132` and `EmergencyRequestTableView.jsx:181-185` call `getVisitByRequestId(req.id)` and navigate to `/visits?view=<visitId>`; the table logs fetched visit data. | This path is closer to a real receiver, but repeats lookup/action logic inside leaf views and exposes clinical data to browser logs. | Row projection exposes `clinicalOutcome.receiver = navigate_to_visits` with `visitId`; leaf views only invoke the route command and emit no record payload logs. |
| Visit modal context fetch | `VisitModal.jsx:80-83` calls `fetchEmergencyContext(visit.request_id || visit.id)` for emergency visits. | The modal can hydrate emergency context after mount, but only once the correct visit object reaches it. | Emergency route must pass a real visit id/object through a mounted receiver; the modal should not be used as a hidden emergency lookup owner. |

First-slice receiver decision: use `navigate_to_visits` for list/table/detail if a full clinical record is needed, or add a small emergency-route read-only outcome panel if the operator only needs outcome summary. Custom events are not valid cross-route receivers in this pass.

## Finance Boundary And Cash Settlement Plan

Pass 1 may display payment state and invoke emergency approval/decline/retry commands. It must not become the finance repair layer.

| Finance edge | Current evidence | Contract risk | Required first-slice disposition |
| --- | --- | --- | --- |
| Cash approval | `EmergencyDetailsModal.jsx:121-153` uses `approveCashPayment()` / `declineCashPayment()`; `emergencyService.js:559-608` calls the cash approval RPCs. | This is the intended emergency approval lane, but success copy must wait for refreshed request/payment truth. | Preserve this lane and make `paymentDisplay` the only source for approval/decline availability and result copy. |
| Cash diagnostic disclosure | `emergencyService.js:561-613` logs cash approval/decline command parameters and returned data to the browser console. | Browser diagnostics become a secondary payment/incident exposure channel. | Remove or redact data-bearing logs; durable audit and operational feedback must come from receiver-backed projection and protected audit records. |
| Emergency dispatch preflight | `EmergencyRequestsPage.jsx:425-433` resolves `orgId || request.organization_id || request.hospital_id` before `checkCashEligibility()`. | `hospital_id` can masquerade as organization identity. UUID length is not domain proof. | Projection/action state must expose canonical `organizationId` and `facilityId` separately; no wallet preflight can fall back to hospital id. |
| Emergency completion | `EmergencyRequestsPage.jsx:469-497` calls `completeEmergency()` and then may prompt for cash amount. | Lifecycle completion and financial settlement are coupled in a browser prompt. | Completion command returns/request-refreshes lifecycle state only. Cash settlement is unavailable/deferred unless Pass 2 proves its receiver and reflected read. |
| Manual cash settlement RPC | `walletService.js:277-283` calls `process_cash_payment`. | The current Console service uses the legacy manual receiver, while app docs name `process_cash_payment_v2`, `approve_cash_payment`, and `decline_cash_payment` as emergency/payment pillars. | Do not wire this into Pass 1 UI. Pass 2 must decide legacy versus v2 receiver, idempotency, metadata contract, and ledger reflection. |
| Ledger repair | `walletService.js:292-361` parses payment metadata, inserts missing `wallet_ledger` rows, and updates payment metadata. | Repair logic mutates permanent financial audit state and can hide payment bugs if invoked from operational UI. | Keep this as an explicit wallet maintenance action only. Emergency route, detail and map surfaces must never trigger ledger repair. |
| Financial audit doctrine | `ivisit-app/supabase/docs/CONTRIBUTING.md:171-216` marks `wallet_ledger` financial audit as permanent and append-only; `TESTING.md:309-328` names wallet/payment/cash/runtime guards. | Console implementation can accidentally weaken auditability or skip side-effect cleanup. | Any Pass 2 implementation must run wallet/payment/cash guards and cleanup dry-run guard; Pass 1 only documents the boundary. |

Finance gate: emergency implementation can proceed only if manual cash settlement controls are disabled/deferred or moved behind a proven payment authority. No first-slice emergency success message may say cash settled, fee deducted, wallet updated, or ledger repaired unless the refreshed payment/ledger projection proves it.

## Create/Edit Payload And Receiver Plan

Pass 1 includes emergency create/edit because the route exposes a "New Request" operator command and the modal can write lifecycle, payment and visit-affecting fields.

| Create/edit edge | Current evidence | Contract risk | Required first-slice disposition |
| --- | --- | --- | --- |
| Route receiver mode | `EmergencyRequestsPage.jsx:634-639` and `:1214-1219` mount `EmergencyRequestModal` with `mode="create"` only. | The modal contains edit logic, but the active route receiver does not intentionally mount edit mode. | Treat edit as unavailable for Pass 1 unless a route action explicitly opens `mode="edit"` with selected request identity and legal fields. |
| Modal state seed | `EmergencyRequestModal.jsx:48-59` merges `...request` into create defaults; `:67-80` merges request again. | A stale selected request can leak fields into a create form if route state is wrong. | Create mode must seed from clean defaults; edit mode must seed from a projection, not a raw row spread. |
| Visible type control | `EmergencyRequestModal.jsx:345-366` writes `emergency_type` and then sets `service_type` to values such as `cardiac`, `accident`, `respiratory`, `stroke`, `pregnancy`, `other`. | The backend expects service type to be `ambulance`, `bed`, or `booking`; console fallback coerces invalid service types to `ambulance`. Specialty and service mode are being conflated. | Split `service_type` from clinical specialty/category before implementation. Type options should write `specialty` or incident category, not service mode. |
| Location payload | `EmergencyRequestModal.jsx:125-131` submits `{ latitude, longitude }`; `emergencyService.js:319-327` can normalize this for atomic RPC. | Atomic RPC requires hospital id, user id, service type and patient location; missing hospital or location silently changes receiver to console fallback. | Create UI must show which fields are required for atomic app-aligned creation, or explicitly choose fallback with visible degraded consequence. |
| Atomic create receiver | `emergencyService.js:323-356` calls `create_emergency_v4` only when user, hospital, service type and normalized location exist. | Atomic path creates request, visit and payment semantics consistent with app flow. | Prefer this path when all app-required fields exist; project payment and visit consequences after reload. |
| Console fallback receiver | `emergencyService.js:367-398` calls `console_create_emergency_request`; SQL at `core_rpcs.sql:1432-1525` canonicalizes service/status/payment and records transition context. | Fallback can produce a request without the same payment/visit creation semantics as app initiation. | Fallback must be labelled as console-created operational record and its payment/visit expectations must be explicit in post-create projection. |
| Update receiver | `emergencyService.js:426-446` calls `console_update_emergency_request`; SQL at `core_rpcs.sql:1585-1655` enforces role/org scope and legal status transitions. | Direct edit can become a lifecycle mutation if status fields remain freely editable. | Edit mode must expose only legal fields from `actionState` or a dedicated update projection; status changes use command semantics, not generic form save. |
| Visit sync consequence | `automations.sql:156-234` updates existing visits on emergency update but does not create a missing visit in that trigger. | Updating a console-created request is not proof that a visit outcome exists. | Post-create/update copy and clinical CTA must use `clinicalOutcome.visibilityState`, not assume sync created or repaired a visit. |

Create/edit gate: before any runtime form change, decide whether Pass 1 supports operator-created emergency requests through the atomic app-aligned path, a degraded console fallback path, or both. The UI must not conflate incident category with service type, must not expose generic status editing as lifecycle command, and must not imply visit/payment creation without a refreshed projection.

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
- `npm run check:database-types-encoding`
- `npm run lint` for changed Console source when implementation begins
- `npm run build` after any runtime implementation that can affect deployment

Frontend:

- Browser smoke on emergency list.
- Open detail modal for:
  - pending approval cash request
  - payment declined request
  - accepted/in-progress request
  - completed request with linked visit
  - completed request without linked visit
- Verify no blank modal state and no console error for missing visit/payment rows.
- Verify no clinical-record or cash-payment payload is emitted to browser console while opening detail, following clinical links or approving/declining cash.

Backend/RLS/RPC:

- Read-only proof for payment visibility by platform admin and org admin.
- RPC test for approve cash payment.
- RPC test for decline cash payment.
- RPC test or fixture for retry payment with different method.
- Visit lookup proof by request id.
- App-side hardening references when DB/RPC receiver behavior is in scope:
  - `npm run hardening:emergency`
  - `npm run hardening:console-matrix`
  - `npm run hardening:cash-matrix`
  - `npm run hardening:chat-rls`
  - `npm run hardening:emergency-runtime-confidence`

### Verification Command Classification

Use the smallest check set that matches the implementation slice. During audit, do not run DB-mutating checks.

| Check | Repo and command | Side-effect class | Use when |
| --- | --- | --- | --- |
| Diff whitespace | `ivisit-console`: `git diff --check` | None. | Every doc or code edit. |
| Touched-doc mojibake scan | `ivisit-console`: `rg -n --pcre2 "[\\x{00C2}\\x{00C3}\\x{00E2}\\x{00EF}\\x{00F0}\\x{FFFD}]" <touched-files>` | None. | Every doc/code/copy edit. |
| Touched-doc non-ASCII review | `ivisit-console`: `rg -n --pcre2 "[^\\x00-\\x7F]" <touched-files>` | None. | Every doc/code/copy edit; non-ASCII is review prompt, not automatic failure. |
| Database type encoding | `ivisit-console/frontend`: `npm run check:database-types-encoding` | None. | Type/schema sync, generated types, or Vercel/build risk. |
| Lint | `ivisit-console/frontend`: `npm run lint` | None. | Runtime JS/JSX edits. |
| Build | `ivisit-console/frontend`: `npm run build` | None except local build output/cache. | Deployment-affecting runtime edits or Vercel failure closure. |
| Emergency field guard | `ivisit-app`: `npm run hardening:emergency-requests-surface-field-guard` | Static/read-oriented guard. | Emergency row projection, field mapping or source-of-truth changes. |
| Status transition field guard | `ivisit-app`: `npm run hardening:emergency-status-transitions-surface-field-guard` | Static/read-oriented guard. | Timeline projection or transition-surface implementation. |
| Console transition matrix | `ivisit-app`: `npm run hardening:console-matrix` | Potential live/test DB interaction; cleanup discipline required. | Lifecycle command implementation after audit, not during static audit. |
| Cash role matrix | `ivisit-app`: `npm run hardening:cash-matrix` | Potential live/test DB interaction; cleanup discipline required. | Cash approval/decline or payment visibility implementation. |
| Chat RLS matrix | `ivisit-app`: `npm run hardening:chat-rls` | Potential live/test DB interaction; cleanup discipline required. | Emergency chat implementation. |
| Emergency runtime confidence | `ivisit-app`: `npm run hardening:emergency-runtime-confidence` | Mutating/runtime matrix; cleanup gates required. | Broad emergency implementation nearing closure. |
| Runtime data integrity | `ivisit-app`: `npm run hardening:runtime-data-integrity` | Read/audit of live data quality. | Post-implementation confidence when payment/visit linkage is in question. |
| Cleanup dry-run guard | `ivisit-app`: `npm run hardening:cleanup-dry-run-guard` | Read-only cleanup assertion. | After any hardening command that may create test artifacts and before commit/push. |

Implementation verification rule: if a DB/RPC hardening command is skipped, record why. If a DB/RPC hardening command is run, follow with the documented cleanup guard before commit or push. Do not run `hardening:runtime-data-repair`, `hardening:cleanup-apply`, or any repair/apply command during audit.

## Implementation Readiness State

Pass 1 remains in audit/planning mode. Implementation can start only when every row below is either closed or deliberately deferred with disabled/unavailable UI.

| Readiness gate | Current state | What must be true before runtime code changes |
| --- | --- | --- |
| Detail projection contract | Target contract is documented for identity, status, service, patient, facility, location, payment, action state, clinical outcome, responder, timeline, chat, clinician assignment and report action. | Exact source fields and unavailable/degraded states are accepted as the first-slice mapper contract. |
| Command/action contract | Shared action contract is documented for approve, decline, retry, dispatch, complete, manual cash, clinical record, external navigation and incident report. | Route, detail, mobile and map agree to consume one action model and one command facade. |
| Missing operational surfaces | Timeline, chat and clinician assignment receiver plan is documented. | Decide first-slice UI disposition: read-only timeline, chat unavailable/summary/panel, clinician assignment unavailable/read-only/command. |
| List/page projection | Planned, not implemented. Page owns list query, count, payment enrichment and broad realtime; the required list projection keys and surface consumers are now documented. | Accept `getEmergencyListProjection()` or equivalent as the route-list owner, then move page/list/table/mobile/map consumers behind it or mark each unavailable. |
| Create/edit payload | Planned, not implemented. The modal can write request, location, specialty, status, payment and visit-affecting fields; active route mounts create mode only. | Decide atomic app-aligned create versus console fallback; split service type from incident category; disable generic lifecycle status edits unless routed through command state. |
| Mobile/map parity | Planned, not implemented. Mobile alias drift and map direct command paths are documented as consumers of the same row/action projection. | Define the shared row/action projection consumed by mobile and map before touching their action handlers. |
| Clinical receiver | Planned, not implemented. `openVisitModal` is not valid from `/emergencies`; `/visits?view=<visitId>` is the existing mounted route receiver. | Choose route navigation for full clinical record or an emergency-route read-only outcome panel, then remove the unreceived custom-event path. |
| Finance boundary | Planned, not implemented. Manual cash settlement and ledger repair are documented as Pass 2/finance authority unless explicitly proven. | Disable/defer manual settlement in Pass 1 or prove finance receiver, idempotency, organization identity and reflected payment/ledger read. |
| Verification commands | Static commands named; backend/app hardening references identified. | For implementation, choose the smallest verification set that matches touched code and note skipped commands with reasons. |

## Continuation Queue Before Implementation

Continue in this order. Do not start runtime implementation until each item either has a closed first-slice contract or a deliberately disabled/unavailable UI disposition.

1. Finish `getEmergencyListProjection()` shape:
   - exact input: page, page size, filters, sort, actor role/org, selected request id
   - exact output: rows, total count, payment visibility, realtime channel plan, degraded reasons, refresh targets
   - consumers: desktop grid, list view, table view, mobile list, map marker summary, global read-only summary
2. Finish command facade decision:
   - choose whether `emergencyResponseService` remains the facade or becomes an adapter under `emergencyService`
   - map dispatch, complete, retry, approve, decline, clinical navigation and external map navigation to one action model
   - define pending keys, disabled reasons, payload identity and post-command refresh for each action
3. Finish create/edit disposition:
   - decide atomic `create_emergency_v4` first path versus console fallback path
   - split incident category/specialty from `service_type`
   - disable generic status edit unless routed through lifecycle command legality
4. Finish missing operational surfaces:
   - timeline read-only projection
   - chat summary/unavailable state or request-scoped panel plan
   - clinician assignment read-only/unavailable state until provider availability pass closes
5. Finish verification plan:
   - static checks: diff, mojibake, type/schema encoding
   - browser smoke for emergency list/detail/create form
   - targeted app hardening references for emergency, cash, chat and console matrix
   - no DB mutation during audit; runtime DB tests only when implementation begins and cleanup gates are explicit

Hard blockers:

- Do not patch modal fields before the projection consumes `getVisitByRequestId(requestId)` through a mounted or explicitly navigated receiver.
- Do not change cash approval UI before `approve_cash_payment` and `decline_cash_payment` remain proven in source.
- Do not backfill emergency/visit/payment history inside this pass.
