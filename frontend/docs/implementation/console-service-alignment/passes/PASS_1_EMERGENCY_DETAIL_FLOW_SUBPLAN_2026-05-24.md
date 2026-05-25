# Pass 1 Emergency Detail Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, cleanup, or historical repair is authorized by this document.

This subplan covers the user-visible failure where an operator cannot reliably open or trust an emergency detail modal. The fix must not start inside the modal. The modal is the receiver of a broken read model spanning emergency requests, payments, cash approval, request-derived visits, and scoped realtime refresh.

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

## User Flow

Operator path:

1. Open emergency requests.
2. Select a request.
3. View patient, service, hospital, responder, payment, and lifecycle details.
4. For completed/cancelled requests, view linked clinical/visit outcome when it exists.
5. For cash pending approval, approve or decline using backend truth.
6. For declined card payment, retry payment with a safe patient-completable payment method.
7. See realtime updates while the modal is open without corrupting list-level state.

## Broken Contract To Fix

The current detail flow conflates these owners:

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Emergency request detail | Row passed from page/list plus modal realtime refresh. | Emergency detail read model. |
| Payment row for approval | Modal direct `payments` query. | Emergency/payment detail read model or payment facade with RLS-aware degraded state. |
| Cash approval/decline | Modal direct command calls. | Emergency command boundary with post-command refresh/confirmation. |
| Visit/clinical outcome | Modal/list/table call `getVisit(request.id)`. | Request-derived visit read model that knows whether lookup is by visit id, request id, or linked request field. |
| Realtime refresh | Modal owns payments and emergency channel locally. | Detail-scoped realtime invalidation owned by the detail model/hook. |
| Success feedback | Toast claims dispatch/cash outcome immediately. | Backend-confirmed status/payment/ledger copy after refresh. |

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

Acceptance gate:

- `EmergencyDetailsModal`, list view, and table view no longer independently call `getVisit` for request-derived clinical records.
- The modal does not query `payments` directly.

### 2. Request-Derived Visit Lookup Decision

Before editing UI, decide the correct lookup contract:

- If `visits.id` is the visit id, do not call `getVisit(request.id)` unless request id and visit id are intentionally the same.
- If visits link by `request_id`, add a service method that reads by request id.
- If emergency completion should create/link visit records, name the trigger/RPC that owns it.
- If terminal requests may not have visits, expose that as an expected empty state, not a broken modal.

Acceptance gate:

- Clinical record buttons in modal/list/table route through the same lookup decision.
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
- modal closure unsubscribes cleanly
- list/page state is refreshed through domain owner, not by modal-local mutation

Acceptance gate:

- One detail owner coordinates detail refresh; `PageDataContext` does not become the durable owner.

## Detailed Implementation Checklist

Before code changes:

- Confirm receiver names for:
  - emergency detail read
  - payment-by-request read
  - cash approval
  - cash decline
  - retry payment
  - visit-by-request lookup
- Confirm whether any RLS policy repair is required for org-admin payment visibility.
- Confirm whether terminal emergency requests should always have linked visits.
- Confirm whether historical repair is needed; if yes, create a separate read-only maintenance plan.

Read-only/UI cleanup:

- Introduce emergency detail hook/service facade.
- Update modal to consume projection, not direct Supabase/payment/visit reads.
- Update list/table clinical record button to use the same request-derived visit lookup.
- Replace optimistic success copy with backend-confirmed or pending copy.
- Add structural loading state for detail projection and compact degraded rows.

L5 repair, only if required after proof:

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

Stop conditions:

- Do not patch modal fields if visit lookup ownership is still ambiguous.
- Do not change cash approval UI if the payment receiver does not prove finance side effects.
- Do not backfill emergency/visit/payment history inside this pass.
