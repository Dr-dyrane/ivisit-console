# Pass 1 Emergency Detail Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, cleanup, or historical repair is authorized by this document.

This subplan covers the user-visible failure where an operator cannot reliably open or trust an emergency detail modal. The fix must not start inside the modal. The modal is the receiver of a broken read model spanning emergency requests, payments, cash approval, request-derived visits, status-transition history, emergency communication, clinician assignment, and scoped realtime refresh.

## Source Evidence

Console files inspected:

- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/services/emergencyService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/visitsService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- Generated Console types for `emergency_status_transitions`, `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`, and `emergency_doctor_assignments`, with no corresponding rendered runtime service found.
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/emergencyChatService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql`

Audit docs:

- Stage 2 service data flow audit.
- Stage 3 capability gap audit.
- Stage 4 L5 state/data ownership audit.
- Stage 5 full service coverage audit.
- Stage 6 implementation pass plan.
- Emergency/payment/capacity contract chart.
- Read-only live confirmation matrix.

Observed source signals:

- `EmergencyDetailsModal` imports `supabase` directly and queries `payments` by `emergency_request_id`.
- `EmergencyDetailsModal` imports `getVisit` and calls it with the emergency request id.
- `EmergencyRequestListView` and `EmergencyRequestTableView` also import `getVisit` directly.
- `EmergencyDetailsModal` imports `approveCashPayment` and `declineCashPayment` directly.
- The cash approval success copy says dispatching responder after the cash approval call, before the refreshed emergency row is proven in the modal.
- The direct payment query already warns that missing payment rows may be finance RLS visibility, which means the UI sees the symptom but does not own the contract.
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
| Payment row for approval | Modal direct `payments` query. | Emergency/payment detail read model with RLS-aware degraded state. |
| Cash approval/decline | Modal direct command calls. | Emergency command boundary with post-command refresh/confirmation. |
| Visit/clinical outcome | Modal/list/table call `getVisit(request.id)`. | Request-derived visit read model using explicit `getVisitByRequestId(requestId)` plus compatibility fallback. |
| Realtime refresh | Modal owns payments and emergency channel locally. | Detail-scoped realtime invalidation owned by the detail model/hook. |
| Status-transition history | Shared append-only table exists; no Console rendered timeline found. | Read-only detail timeline sourced from `emergency_status_transitions`; no update/delete actions. |
| Urgent chat thread | Patient app implements room/message/read RPC flow; Console has type-only references. | Request-scoped communication projection/command owner using shared chat authorization. |
| Clinician assignment | UI can show doctor context without a canonical Console assignment workflow. | Guarded `emergency_doctor_assignments` / assignment RPC owner. |
| Success feedback | Toast claims dispatch/cash outcome immediately. | Backend-confirmed status/payment/ledger copy after refresh. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Open request detail and refresh row | Scoped read projection | `emergency_requests` through emergency read owner | Render normalized row/detail truth; do not let modal become list owner. |
| View lifecycle timeline | Backend-derived read-only evidence | `emergency_status_transitions` | Add scoped read timeline; no edit/delete controls. |
| Open/send/read urgent conversation | Workflow command plus scoped read | Chat RPC family and emergency chat tables | Add participant-authorized projection/actions only through RPC contract. |
| View/assign clinician handoff | Workflow command plus projection | `assign_doctor_to_emergency`, `emergency_doctor_assignments` | Persist assignment before UI claims handoff. |
| Dispatch, complete, cancel | Workflow command | Console emergency RPC family | No direct request status CRUD; refresh row before success claim. |
| Approve/decline/retry payment | Workflow command | Payment RPC family | No payment-table write from modal; success waits for refreshed truth. |
| View linked visit outcome | Backend-derived read-only evidence in emergency detail | `visits.request_id` projection | Detail modal reads outcome; visit lifecycle editing belongs to Pass 6 authority. |

## Implementation Packages

### 1. Emergency Detail Read Model

Create or refine one read boundary that returns a detail projection for a request id:

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

- `EmergencyDetailsModal`, list view, and table view no longer independently call `getVisit` for request-derived clinical records.
- The modal does not query `payments` directly.
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

- Use `getEmergencyDetailProjection(requestId)` as the emergency detail read boundary.
- Use `getLatestEmergencyPayment(requestId)` as the payment-by-request read boundary.
- Use `approveCashPayment(paymentId, requestId)` for cash approval.
- Use `declineCashPayment(paymentId, requestId)` for cash decline.
- Use `retryPaymentWithDifferentMethod(requestId, paymentMethodId, userId)` for retry payment.
- Use `getVisitByRequestId(requestId)` for request-derived visit lookup.
- Treat current payment RLS as sufficient for org-scoped payment reads; a visible mismatch becomes a data/RLS defect with evidence.
- Treat terminal emergency requests as expected to have linked visits through `sync_emergency_to_visit`; missing links become explicit empty state plus data repair follow-up.

Read-only/UI cleanup:

- Introduce emergency detail hook/service facade.
- Update modal to consume projection, not direct Supabase/payment/visit reads.
- Update list/table clinical record button to use the same request-derived visit lookup.
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
