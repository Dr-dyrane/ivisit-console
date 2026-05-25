# Pass 1 Emergency Detail Evidence Audit - 2026-05-24

## Scope

This is an evidence-only checkpoint for Pass 1. It does not authorize implementation yet. It proves the current emergency detail, cash approval, retry payment, scoped realtime, and request-derived visit contracts before runtime code is changed.

Covered feature rows from `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`:

- Emergency operations and dispatch command center
- Emergency detail modal
- Cash approval and decline
- Payment retry
- Request-derived visit lookup
- Scoped realtime refresh
- Patient and hospital context needed by emergency detail

## Current Finding

The console has the important backend receivers for cash approval, cash decline, dispatch, completion, and retry payment, but the emergency detail surface is not consuming them through one coherent detail owner. The page, modal, list/table views, payment service, visits service, and direct Supabase reads each own a piece of the same object. That split explains why an emergency can exist while its detail modal cannot reliably show the payment row, lifecycle outcome, or visit record.

The first implementation pass starts by creating a detail projection boundary that reads the request, latest payment, request-derived visit/outcome, patient, hospital/org, and action eligibility as one contract. Modal edits come after that boundary exists.

## Evidence Table

| Evidence | Source | Meaning | Required owner |
| --- | --- | --- | --- |
| Modal reads latest payment directly from `payments` by `emergency_request_id`. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:129`, `:132` | Detail payment visibility is component-owned, not service-owned. RLS gaps or missing rows become modal behavior instead of a typed detail state. | Emergency detail projection service/hook |
| Modal logs missing payment row as likely org-admin RLS. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:153` | The surface already knows a backend visibility contract is unstable, but handles it as a warning. | Payment detail read contract |
| Modal subscribes directly to `payments` and `emergency_requests`. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:195`, `:198` | Realtime ownership is inside the modal and duplicates page-level payment subscriptions. | Scoped realtime detail hook |
| Page fetches payment summaries directly from `payments`. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:191` | List enrichment and detail enrichment are separate ad hoc reads. | Emergency list/detail facade split |
| Page has global `payments` realtime refresh. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:226` | Page-level refresh can race or duplicate detail modal refresh. | Page data owner plus scoped detail owner |
| Cash dispatch precheck guesses org id from `orgId || request.organization_id || request.hospital_id`. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:429` | Hospital id can masquerade as org id if it is UUID-shaped. | Payment/wallet eligibility service |
| Manual cash processing uses the same org fallback and calls wallet service directly. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:496`, `:497` | Completed cash settlement is page-owned and may bypass the newer approval lifecycle. | Cash command service with request refresh |
| Manual cash success copy claims fee deduction. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:499` | UI can imply settlement before the canonical request/payment projection is refreshed. | Command result projection |
| Retry payment flow fetches patient payment methods from page code. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:538` | Patient payment method selection is page-owned rather than part of payment retry command state. | Payment retry controller |
| Retry payment calls emergency service RPC and tells operator patient must complete payment. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:572`, `:573` | Retry creates a pending/completable payment path, not a completed settlement. | Payment retry state model |
| Emergency service exposes `approveCashPayment` and calls `approve_cash_payment`. | `frontend/src/services/emergencyService.js:449`, `:455` | The receiver exists and should be used by approval UI rather than manual payment processing for pending approval requests. | Emergency command service |
| Emergency service exposes `declineCashPayment` and calls `decline_cash_payment`. | `frontend/src/services/emergencyService.js:489`, `:495` | Decline receiver exists and returns canonical request/payment consequences. | Emergency command service |
| Emergency service exposes `retryPaymentWithDifferentMethod`. | `frontend/src/services/emergencyService.js:630`, `:636` | Retry receiver exists, but command result needs a refresh and pending-state projection. | Payment retry command service |
| `getVisit` only queries `visits.id` or `visits.display_id`. | `frontend/src/services/visitsService.js:199`, `:216`, `:218` | Calling `getVisit(request.id)` only works if visit id equals request id. The schema truth also has `visits.request_id`, so request-derived lookup needs an explicit method. | Visits service |
| Modal calls `getVisit(id)` with request id for completed/cancelled outcomes. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:175` | Detail outcome can disappear when the visit is linked by `request_id` but does not share the request UUID as its primary id. | Request-derived visit lookup |
| `approve_cash_payment` validates pending payment/request pair. | `frontend/supabase/scripts/apply_live_fixes.sql:715` and function body | Approval is keyed by both payment id and request id, which is the right receiver shape for the modal action. | Cash approval command |
| `approve_cash_payment` moves request to `in_progress`, marks payment completed, and updates linked visit. | `frontend/supabase/scripts/apply_live_fixes.sql:875`, `:876`, `:880` | Approval is not a cosmetic state change. It changes emergency, payment, wallet ledger, responder fields, and visit state. | Command result refresh |
| `decline_cash_payment` moves request to `payment_declined`, marks payment failed, and cancels linked visit. | `frontend/supabase/scripts/apply_live_fixes.sql:934`, `:1047`, `:1052` | Decline has canonical lifecycle consequences and should not be reproduced in UI code. | Command result refresh |
| Current migrations define `sync_emergency_to_visit` and index `visits.request_id`. | `frontend/supabase/migrations/20260219000900_automations.sql:156`, `:224`, `:234`, `:1084` | Request-derived visit is a first-class relationship even when legacy records share primary ids. | Visits service |
| Current payment RLS lets users see their own payments and org admins/admins see organization payments. | `frontend/supabase/migrations/20260219000700_security.sql:248`, `:253` | Missing detail payment rows are not accepted as a UI limitation. The implementation must use canonical `organization_id` and surface degraded state only when the backend denies or lacks the row. | Payment detail read contract |

## Broken Contract Name

Emergency detail is currently a component-assembled object. It needs to become a service-backed projection:

`emergency_request -> latest payment -> request-derived visit/outcome -> patient -> hospital/org -> allowed actions -> scoped realtime refresh`

The modal should render that projection. It should not decide how to query payments, infer payment visibility, derive visit lookup strategy, or subscribe to table-level changes by itself.

## Deterministic Decisions For Pass 1

1. Create one emergency detail projection boundary that returns:
   - `request`
   - `latestPayment`
   - `visitOutcome`
   - `patient`
   - `hospital`
   - `organization`
   - `actionState`
   - `visibilityState` for hidden/missing payment rows
2. Add `getVisitByRequestId(requestId)` in `visitsService.js`; preserve `getVisit(visitId)` for true visit identity.
3. Move payment-by-request reads out of the modal and page into a service/helper used by both list enrichment and detail projection.
4. Keep `approveCashPayment(paymentId, requestId)` and `declineCashPayment(paymentId, requestId)` as the canonical cash approval commands.
5. After any cash approval, cash decline, dispatch, complete, or retry command, refresh the same detail projection before success copy implies final state.
6. Keep manual post-completion cash recording out of the pending-approval path. Pending cash approval uses only `approveCashPayment` and `declineCashPayment`.
7. Replace modal-owned table subscriptions with a scoped realtime hook that invalidates or refetches the detail projection.
8. Do not change request lifecycle statuses in UI code. Use RPC result plus refreshed backend truth.

## First Safe Implementation Slice

The first implementation slice is fixed:

1. Add service helpers:
   - `getLatestEmergencyPayment(requestId)`
   - `getVisitByRequestId(requestId)`
   - `getEmergencyDetailProjection(requestId)`
2. Wire `EmergencyDetailsModal` to consume the projection instead of direct `payments` and `getVisit(request.id)` calls.
3. Keep the existing UI layout and action buttons unchanged.
4. Add detail refresh after approve/decline/retry.
5. Verify one pending cash request, one declined retry request, one completed request, and one completed request whose visit is linked by `request_id`.

## Hard Blockers

Implementation pauses only for these blockers:

- A pending approval request has no visible payment row even though `payments.organization_id` matches the operator organization. That is an RLS/data integrity defect, not a modal defect.
- A completed/cancelled request has no linked visit by `visits.id`, `visits.display_id`, or `visits.request_id`. That becomes an explicit "No visit record linked" state and a separate data repair ticket, not a blocked modal render.
- `retry_payment_with_different_method` returns success without a new readable pending payment. The UI still refreshes backend truth and shows pending retry state from the request/payment projection.
- `walletService.processCashPayment` remains a Pass 2 finance hardening target and is not used for pending cash approval in Pass 1.

## Pass 2 Cross-Check

Pass 1 fixes detail visibility and command refresh. These payment issues belong to Pass 2:

- `walletService.processCashPayment` uses the manual cash path and must be compared against `process_cash_payment_v2` and `approve_cash_payment`.
- Ledger entries from cash approval and manual cash processing must be checked for duplicate platform fee credits.
- Wallet eligibility must resolve organization id from the canonical hospital/org relationship, not from a UUID-shaped fallback.
