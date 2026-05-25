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

Runtime reconciliation on May 25 supersedes the earlier modal-read diagnosis: `EmergencyDetailsModal` now consumes `getEmergencyDetailProjection()` and `subscribeToEmergencyDetail()`, and refreshes the projected request after cash approval/decline before claiming dispatch release. This is an existing repair baseline to preserve, not future work.

The remaining emergency ownership split is still material. The page separately owns windowed request/payment enrichment, dispatch/completion/manual-cash/retry feedback and broad realtime; map variants directly dispatch and complete; mobile renders stale aliases; clinical-record opening has no mounted receiver from the emergency route; and no rendered Console transition history, emergency chat or clinician-assignment workflow was found. Pass 1 therefore closes the full operational surface around the existing modal projection rather than recreating it.

## Evidence Table

| Evidence | Source | Meaning | Required owner |
| --- | --- | --- | --- |
| Modal calls `getEmergencyDetailProjection()` and renders projected payment/terminal visit state. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:92-113`; `frontend/src/services/emergencyService.js:246-287` | Detail payment and terminal visit visibility already have a service projection boundary. | Preserve and extend emergency detail projection |
| Modal calls `subscribeToEmergencyDetail()` for request/payment/visit refresh. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:230-235`; `frontend/src/services/emergencyService.js:289-310` | Scoped modal refresh is already service-owned, although transition/chat/assignment invalidation is absent. | Extend scoped detail invalidation only for added projections |
| Modal approval/decline refreshes projection before its outcome copy. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:118-162` | The prior premature modal dispatch-release claim is guarded by refreshed request status. | Preserve repaired command feedback |
| Modal contains unreachable legacy fallback blocks after unconditional `return`. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:178-225` | Old local-fetch scaffold remains in runtime source even though the projection path has replaced it. | Remove dead scaffold during implementation without restoring direct reads |
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
| `getVisitByRequestId()` queries `visits.request_id` and isolates the legacy identity fallback. | `frontend/src/services/visitsService.js:244-279` | Request-derived lookup repair already exists and should not be recast as unimplemented work. | Preserve visits service boundary |
| Modal, list and table use `getVisitByRequestId()` for emergency-linked clinical outcomes. | `frontend/src/services/emergencyService.js:266`; `frontend/src/components/views/EmergencyRequestListView.jsx:129`; `frontend/src/components/views/EmergencyRequestTableView.jsx:181` | Lookup ownership is aligned across these read surfaces; mounted receiver/navigation remains broken separately. | Preserve lookup; repair clinical receiver |
| `approve_cash_payment` validates pending payment/request pair. | `frontend/supabase/scripts/apply_live_fixes.sql:715` and function body | Approval is keyed by both payment id and request id, which is the right receiver shape for the modal action. | Cash approval command |
| `approve_cash_payment` moves request to `in_progress`, marks payment completed, and updates linked visit. | `frontend/supabase/scripts/apply_live_fixes.sql:875`, `:876`, `:880` | Approval is not a cosmetic state change. It changes emergency, payment, wallet ledger, responder fields, and visit state. | Command result refresh |
| `decline_cash_payment` moves request to `payment_declined`, marks payment failed, and cancels linked visit. | `frontend/supabase/scripts/apply_live_fixes.sql:934`, `:1047`, `:1052` | Decline has canonical lifecycle consequences and should not be reproduced in UI code. | Command result refresh |
| Current migrations define `sync_emergency_to_visit` and index `visits.request_id`. | `frontend/supabase/migrations/20260219000900_automations.sql:156`, `:224`, `:234`, `:1084` | Request-derived visit is a first-class relationship even when legacy records share primary ids. | Visits service |
| Current payment RLS lets users see their own payments and org admins/admins see organization payments. | `frontend/supabase/migrations/20260219000700_security.sql:248`, `:253` | Missing detail payment rows are not accepted as a UI limitation. The implementation must use canonical `organization_id` and surface degraded state only when the backend denies or lacks the row. | Payment detail read contract |
| Detail modal dispatches `openVisitModal` and closes; the receiver is mounted only by `VisitsPage`. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:469`; `frontend/src/components/pages/VisitsPage.jsx:359-366` | An operator on `/emergencies` can select clinical record and receive no mounted detail surface. | Emergency-route-owned outcome receiver or explicit navigation |
| Mobile emergency renders legacy aliases and sends its `Navigate` action to parent dispatch. | `frontend/src/components/mobile/MobileEmergency.jsx:365-459`; `frontend/src/components/pages/EmergencyRequestsPage.jsx:604-614` | The same request can render incomplete data on mobile and mislabel a lifecycle command. | Shared row exposure model and action labeling |
| Desktop and mobile map marker detail invoke dispatch/complete directly. | `frontend/src/components/map/MarkerDetailPanel.jsx:128-165`; `frontend/src/components/mobile/MobileMap.jsx:274-303` | Alternate mounted command paths omit route cash/preflight messaging and projected confirmation. | One emergency command policy across route and map surfaces |
| Page, mobile and context panel source contain corrupted separator bytes in visible labels. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:327,524-527`; `frontend/src/components/mobile/MobileEmergency.jsx:420`; `frontend/src/components/context/EmergencyPanel.jsx:154` | Operator-facing request/payment/location copy is visibly corrupted. | Encoding repair as part of the appropriate UI implementation pass |

## Broken Contract Name

Emergency detail now has an initial service-backed projection, but the full mounted emergency operation remains split:

`windowed request list and actions -> projected request/payment/visit detail -> transition/chat/assignment evidence -> map/mobile/context alternate surfaces -> patient tracking/contact/outcome truth`

The modal projection should be preserved and completed. The route list, maps and context variants must not separately claim outcomes or expose incompatible fields; absent operational receivers must be made explicit implementation work.

## Deterministic Decisions For Pass 1

1. Retain and extend the existing emergency detail projection boundary so it returns:
   - `request`
   - `latestPayment`
   - `visitOutcome`
   - `patient`
   - `hospital`
   - `organization`
   - `actionState`
   - `visibilityState` for hidden/missing payment rows
2. Preserve existing request-derived visit use in detail, list and table; repair only the unmounted clinical-record outcome receiver.
3. Move payment-by-request reads out of the page list enrichment into an explicit list/detail service boundary; the modal is already compliant.
4. Keep `approveCashPayment(paymentId, requestId)` and `declineCashPayment(paymentId, requestId)` as the canonical cash approval commands.
5. After any cash approval, cash decline, dispatch, complete, or retry command, refresh the same detail projection before success copy implies final state.
6. Keep manual post-completion cash recording out of the pending-approval path. Pending cash approval uses only `approveCashPayment` and `declineCashPayment`.
7. Retain the existing scoped detail subscription and extend its invalidation scope only as transition/chat/assignment projections are added.
8. Do not change request lifecycle statuses in UI code. Use RPC result plus refreshed backend truth.

## Deterministic Surface Coverage Register

| Mounted or required surface | Read/render proof | Command/receiver proof | Current disposition |
| --- | --- | --- | --- |
| Desktop emergency list/table | Server-windowed requests with page-local payment enrichment and count/footer. | Page owns dispatch, complete, cancellation, retry and manual cash. | Blocked: list ownership and outcome confirmation remain split. |
| Mobile emergency route | Same rows, legacy render aliases and incomplete responder/location projection. | Non-approval `Navigate` action invokes dispatch. | Blocked: field and command-label drift. |
| Emergency detail modal | Existing request/payment/terminal-visit projection and scoped refresh. | Cash approve/decline refresh prior to modal success copy. | Repaired base; blocked by missing receiver families and clinical CTA. |
| Create/edit modal | Operator exposes status/cost/payment/bed values. | Atomic and fallback creation persist different subsets. | Blocked: command input does not have one storage contract. |
| Context panel/global acquisition | Recent rows/KPIs rendered independently from the route page. | Create/filter/analytics are event-driven. | Blocked: global acquisition and receiver parity require closure. |
| Desktop/mobile map marker detail | Selected emergency renders location/contact/assignment. | Direct dispatch/complete handlers. | Blocked: alternate command path lacks route/detail parity. |
| Timeline, chat and clinician assignment | No rendered Console consumer found. | Tables/RPCs exist in shared backend and patient chat service. | Missing required operational surfaces. |
| Patient tracking/contact/outcome dependencies | App rules require tracking-ready confirmed snapshot and RPC-backed contact dispatch. | Console actions alter the same emergency/payment/responder identity. | Required downstream verification dependency. |

## Next Safe Implementation Slice

The next implementation slice is fixed around the already-present modal base:

1. Keep `getEmergencyDetailProjection()`, request-derived visit lookup, approve/decline refresh and scoped subscription as protected baseline behavior.
2. Remove unreachable modal fallback scaffolding only after projection behavior has targeted coverage.
3. Define one route-list enrichment/action projection and reconcile desktop/mobile/map mounted action paths to its confirmed results.
4. Replace the unreceived clinical-record event path with a mounted request-derived visit outcome receiver.
5. Add authorized transition timeline, emergency communication and clinician-assignment projection/commands behind their canonical receivers.
6. Verify pending cash, declined retry, tracked dispatch, terminal visit, map command and mobile render variants against patient tracking/contact/outcome contracts.

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
