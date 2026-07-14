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
| Emergency service exposes `approveCashPayment` and calls `approve_cash_payment`. | `frontend/src/services/emergencyService.js:559-568` | The receiver exists and should be used by approval UI rather than manual payment processing for pending approval requests. | Emergency command service |
| Emergency service exposes `declineCashPayment` and calls `decline_cash_payment`. | `frontend/src/services/emergencyService.js:599-608` | Decline receiver exists and returns canonical request/payment consequences. | Emergency command service |
| Emergency service exposes `retryPaymentWithDifferentMethod`. | `frontend/src/services/emergencyService.js:740-750` | Retry receiver exists, but command result needs a refresh and pending-state projection. | Payment retry command service |
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

## Exact Line Refresh - May 25 Continuation

The following refreshed exhibits are the current Pass 1 service-closure baseline after adding the Console `AGENTS.md`. They prevent the next contributor from relying on stale line numbers.

| Claim element | Current exhibit | Audit meaning |
| --- | --- | --- |
| Detail projection reads request, latest payment, and request-derived visit only through service boundary. | `frontend/src/services/emergencyService.js:246-286` | Keep this as the detail read owner and extend it; do not move payment/visit logic back into JSX. |
| Detail realtime scope is request/payment/visit by request id. | `frontend/src/services/emergencyService.js:289-306` | Existing scoped invalidation is correct for current projection; future transition/chat/assignment channels must be equally scoped. |
| Detail modal consumes projection fields. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:92-97` | JSX already depends on projection output for payment and visit state. |
| Detail modal approval waits for projection refresh. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:121-125` | Preserve this repaired feedback pattern; final copy must come from refreshed request state. |
| Detail modal decline waits for projection refresh. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:153-155` | Preserve this repaired feedback pattern; do not infer final state from a direct table update. |
| Detail modal scoped subscription triggers projection refresh. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:230-235` | Modal refresh behavior is service-owned and should not become broad page realtime. |
| Detail modal clinical CTA dispatches an unmounted custom event. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:468-471` | This remains a route receiver defect; the emergency route needs a mounted outcome surface or explicit navigation. |
| Detail modal still owns ambulance type parsing. | `frontend/src/components/modals/EmergencyDetailsModal.jsx:37-60` and `:598-604` | Parser safety is partly patched locally, but first-slice implementation should move this into the emergency projection normalizer. |
| Page list enriches current window from `payments`. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:187-205` | List payment truth remains page-owned and must move behind an emergency list projection. |
| Page uses broad emergency/payment realtime for list refresh. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:219-229` | Broad list refresh can race the scoped detail owner; list and detail invalidation must be deliberately separate. |
| Page cash preflight can fall back from organization id to hospital id. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:425-433` | UUID shape is not authority. Cash eligibility must resolve canonical organization scope. |
| Page dispatch success copy is immediate after command call. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:443-447` | Success copy is still too optimistic unless refreshed request/responder truth confirms dispatch. |
| Page completion can call manual wallet cash processing. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:469-497` | Emergency completion and cash settlement remain split across service owners. |
| Page retry command creates patient-completable payment state. | `frontend/src/components/pages/EmergencyRequestsPage.jsx:572-574` | Retry copy is directionally correct but needs reflected payment projection state. |
| `emergencyResponseService` also dispatches and completes emergencies. | `frontend/src/services/emergencyResponseService.js:92-108`; `:218-226` | Pass 1 must choose one command facade for route, detail, and map surfaces. |
| `bedManagementService` completes an emergency through bed discharge. | `frontend/src/services/bedManagementService.js:121-130` | Capacity discharge and emergency completion share the receiver; implementation must document ownership and side effects. |
| `walletService.processCashPayment()` calls `process_cash_payment`. | `frontend/src/services/walletService.js:277-283` | Manual cash settlement is a Pass 2 finance boundary and must not be ordinary Pass 1 completion behavior. |
| `walletService.backfillMissingFeeLedger()` parses payment metadata and inserts ledger rows. | `frontend/src/services/walletService.js:292-361` | Browser-visible repair mutation is not emergency UI truth; keep it out of Pass 1 and harden in Pass 2. |
| Mobile emergency row uses legacy aliases for patient, location, contact, ambulance, and facility. | `frontend/src/components/mobile/MobileEmergency.jsx:369-428` | Mobile must consume the same normalized emergency row projection as desktop/detail. |
| Mobile emergency row contains visible mojibake in ambulance/ETA copy. | `frontend/src/components/mobile/MobileEmergency.jsx:419` | Encoding repair is part of first implementation hygiene for touched emergency UI. |
| Mobile non-approval action can invoke edit/dispatch with legacy `active` status branch. | `frontend/src/components/mobile/MobileEmergency.jsx:455-465` | Mobile action labels and legality must come from the shared action-state projection. |
| Desktop map marker dispatches and completes directly. | `frontend/src/components/map/MarkerDetailPanel.jsx:127-168` | Map operations bypass route cash preflight, pending-state semantics, and projection refresh. |
| Mobile map marker dispatches and completes directly. | `frontend/src/components/mobile/MobileMap.jsx:273-303` | Mobile map operations need the same emergency command policy as route and desktop map. |
| Location leaf chooses mixed coordinate sources and calls Google geocoding. | `frontend/src/components/ui/LocationCell.jsx:8-66`; `:77-103` | Location display should become a normalized emergency projection with external lookup/degraded state, not a leaf-owned truth source. |

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

## Git History Decision Context - 2026-07-14

- App commit `29d39219` deliberately expanded `sync_emergency_to_visit` across lifecycle states while keeping
  it update-only to avoid duplicate visits. Do not add client-side visit synchronization or casually turn the
  trigger into an insert path.
- App commit `f907a29b` introduced optional card deferral plus service-role-only, idempotent card completion and
  failure RPCs invoked by the Stripe webhook. Commits `8d717951` and `09d9195c` improved tracking and settlement
  recovery without closing the missing client deferral producer.
- Console commits `c7e71738`, `a48ca9f2`, and `2bf6a87c` deliberately moved emergency/finance authority away
  from visible CRUD, hardened render evidence, and downgraded unsupported cash settlement.
- App commit `b3c547df` made Console emergency creation atomically create its visit. The patient creation path
  still catches visit-insert failure, so the residual is App creation atomicity or a server-owned idempotent
  repair path, not a reason to reintroduce page-owned visit writes.

History consequence: preserve webhook finalizers, RPC-owned lifecycle, and the update-only visit-sync trigger.
Close the remaining gaps inside App-owned migration pillars, then synchronize the maintained source to Console.

## Adversarial Launch Gate - 2026-07-14

This is the current cross-repository decision record from Console, App, migrations, RPCs, RLS, automations,
and demo code. It does not authorize deployment. It narrows the remaining emergency blockers so a frontend
improvement cannot be mistaken for live operational readiness.

| Contract | Evidence | Decision | Launch class |
| --- | --- | --- | --- |
| Card payment release | `create_emergency_v4` defaults `defer_dispatch_until_payment` to false and marks a supplied non-deferred card payment completed with the request in progress (`../ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:464-554`). App request construction does not establish a server-owned guarantee that this flag is true. | Preserve the existing service-role card finalizers and webhook delegation. Make card dispatch deferral server-owned and pending by default until signed webhook confirmation; the client must not choose whether dispatch waits. | P0 backend lifecycle |
| Cash approval | The approval receiver locks request/payment, checks actor and organization scope, settles the fee, updates payment/request/visit, and releases the request (`../ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:838-1050`). | Preserve this receiver. Prove idempotency, insufficient-wallet behavior, notification reflection, and duplicate-ledger resistance against the deployed backend before launch. | P0 deployed proof |
| Operational lifecycle ownership | Patient and generic status paths can currently participate in accepted/arrived/completed state, while provider commands have broader field effects than a narrow status transition. | Add role-specific responder commands and patient acknowledgement. Enforce accepted -> arrived -> completed with responder ownership and exactly-once automation effects. | P0 backend lifecycle |
| Responder decline | Existing cancellation cancels the patient's emergency; no proved receiver means only release and requeue. | Keep driver decline unavailable until an atomic decline/release/requeue command exists with reason and audit evidence. | P0 backend command |
| Visit creation and synchronization | `create_emergency_v4` catches and suppresses visit insert failure, while `sync_emergency_to_visit` intentionally updates existing rows and does not create a missing row (`../ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:576-593`; `../ivisit-app/supabase/migrations/20260219000900_automations.sql:202-280`). | Keep the update-only trigger. Make patient creation atomic like the newer Console path, or add one server-owned idempotent repair command with exactly-one request ownership. Never sync visits from the client. | P0 data consequence |
| Patient arrival and ETA | App presentation can derive elapsed countdown arrival and enable arrival/completion interaction without authoritative backend arrival telemetry. | Remove clock-manufactured arrival. Render backend lifecycle plus telemetry freshness; patient action may acknowledge, not own responder arrival/completion. | P0 client and lifecycle |
| Demo automation | Demo uses real linked profiles but also service-role cash approval and synthetic movement. | Keep it as a separately labelled simulation lane. Demo success is never accepted as production payment, telemetry, push, or lifecycle proof. | Intentional separation |

Go-live decision: onboarding and demo testing may continue, but live emergency dispatch remains `NO-GO` until
every P0 row above and the Pass 5 responder/RLS/telemetry gates pass against the deployed backend with zero
cross-organization residue.

## Production Closure - 2026-07-14

This section supersedes the launch verdict above without erasing the audit trail. The additive dispatch pack
is deployed through `20260714203000_emergency_cash_notification_authority_hotfix.sql`, generated App and
Console types are synchronized, and linked migration history is exact.

The isolated production run passed `65/65` checks with `cleanup_passed=true` and
`zero_residue_passed=true`. It proved card payment deferral and webhook release, cash notification and decline
without settlement residue, responder-owned accept/arrive/complete commands, decline/requeue, exactly-one
visit consequences, two-session dispatcher and responder convergence, role and organization RLS, Realtime,
Storage, fallback, and idempotent retries. The static production contract passed `251/251`; cash-fee and all
sixteen Console shared-contract guards are green.

Pass 1 payment and lifecycle blockers are therefore closed for a supervised foreground dispatch pilot. The
remaining `NO-GO` is narrower: unattended background dispatch still lacks a native background-location task
and APNs/FCM delivery in the current binary. Browser alerts and telemetry recovery are honest foreground
capabilities and must not be marketed as background readiness.
