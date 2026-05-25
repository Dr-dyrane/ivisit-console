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
