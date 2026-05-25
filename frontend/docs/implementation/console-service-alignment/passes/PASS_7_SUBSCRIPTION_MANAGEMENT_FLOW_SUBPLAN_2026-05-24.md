# Pass 7 Subscription Management Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, cleanup, email send, seed, migration, or runtime mutation is authorized by this document.

This subplan covers subscription management failures across subscriber CRUD, welcome email, custom email, bulk email, realtime subscriber updates, and duplicate service ownership.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/SubscriptionManagementPage.jsx`
- `frontend/src/components/modals/SubscriptionModal.jsx`
- `frontend/src/hooks/useSubscription.js`
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/subscribersService.js`

Audit docs:

- Stage 3 capability gap audit.
- Stage 4 L5 state/data ownership audit.
- Stage 5 full service coverage audit.
- Stage 6 implementation pass plan.
- Care/content/analytics contract chart.

Observed source signals:

- `subscriptionService.js` and `subscribersService.js` both own `subscribers` table behavior.
- `subscriptionService.js` contains schema-fallback style write handling for optional subscriber columns.
- `createSubscriber` can trigger welcome email automatically.
- `useSubscription` can also send welcome email after create.
- `SubscriptionManagementPage` subscribes to subscribers and invokes `sendWelcome` for new subscribers.
- `SubscriptionModal` can send welcome, custom, and bulk emails directly through `subscriptionService`.
- Page/modal/hook split makes it easy to double-send or mark state before the receiver proves delivery.

## User Flow

Operator path:

1. Open subscription management.
2. Review subscriber list and filters.
3. Create a subscriber.
4. Optionally send welcome email.
5. Edit subscriber status/type.
6. Send welcome email to an existing subscriber.
7. Send a custom email to one subscriber.
8. Send a bulk email to selected active subscribers.
9. Watch realtime updates without duplicate toasts, duplicate emails, or stale row state.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Subscriber CRUD | Two services export overlapping operations. | One subscriber service facade or explicit compatibility boundary. |
| Welcome email | Service auto-send, hook send-after-create, page realtime send, modal direct send. | Single email lifecycle owner with idempotency. |
| Email sent state | UI can mark/show sent independent of durable receiver proof. | Receiver-confirmed queued/sent/failed state. |
| Bulk email | Modal sends directly and returns aggregate success. | Campaign/send owner with per-recipient result or queued state. |
| Realtime | Hook and page subscribe separately to subscriber changes. | One subscriber realtime owner/invalidation path. |
| Organization scope | Service comments say org admins see all because table lacks org field. | Explicit product/security decision before implementation. |

## Implementation Packages

### 1. Subscriber Owner Decision

Choose one:

- consolidate `subscribersService.js` into `subscriptionService.js`
- keep `subscribersService.js` as low-level table adapter and `subscriptionService.js` as workflow owner
- retire one service after compatibility proof

Acceptance gate:

- `useSubscription`, `SubscriptionManagementPage`, and `SubscriptionModal` import from the same chosen owner.
- Duplicate create/update/delete/realtime paths are removed or intentionally wrapped.

### 2. Schema-Current Payload Contract

Before edits:

- confirm current `subscribers` table columns
- confirm allowed values for `type` and `status`
- confirm whether `new_user`, `welcome_email_sent`, and `subscription_date` are current fields
- confirm whether organization/campaign scope exists or is intentionally absent

Acceptance gate:

- Subscriber writes do not silently retry with missing-column fallbacks in normal runtime.
- UI only renders editable fields that the receiver persists.

### 3. Welcome Email Lifecycle

Define one lifecycle:

- create subscriber with `sendWelcomeEmail=true`
- enqueue/send welcome email through one owner
- mark welcome email as queued/sent/failed only after receiver proof
- prevent duplicate sends for the same subscriber unless operator explicitly retries failed state
- expose pending/failure state in the row or modal

Acceptance gate:

- There is one code path that sends welcome email for a new subscriber.
- Page realtime cannot send welcome email as a side effect of receiving an insert.
- Toast copy distinguishes queued, sent, and failed.

### 4. Custom And Bulk Email Lifecycle

Custom email:

- validate selected subscriber and email fields
- call one email owner
- show row/modal pending state
- refresh only after receiver result

Bulk email:

- validate selected subscribers from a current active list
- prevent duplicate submit while pending
- return campaign id, queued count, sent count, failed count, or explicit unavailable state
- show per-recipient or aggregate failure details when available

Acceptance gate:

- Bulk success copy does not claim all messages sent unless receiver confirms all sends.
- The modal can remain open on partial failure and show what happened.

### 5. Realtime And Page State

Replace duplicate realtime ownership:

- one subscriber hook/facade owns `subscribeToSubscribers`
- page consumes hook state or invalidation
- modal does not create its own table truth
- new-subscriber toast is optional and must not trigger email sends

Acceptance gate:

- Subscriber insert/update/delete realtime refreshes the list once.
- No duplicate toasts for one insert.
- No email send occurs from a passive realtime listener.

### 6. Security And Scope Decision

Resolve before implementation:

- platform admin visibility
- org admin visibility
- support/content admin visibility
- whether subscribers are global marketing contacts or organization-scoped contacts
- whether unsubscribe/delete is hard delete, soft delete, or status transition

Acceptance gate:

- UI copy and filters match the actual table/RLS scope.
- Org admins do not see global subscriber data unless that is an explicit product decision and RLS allows it.

## Detailed Implementation Checklist

Before code changes:

- Read current subscribers table and Edge Function contracts.
- Decide subscriber owner service.
- Decide email lifecycle state terms.
- Decide org/global subscriber scope.
- Decide whether `supportFaqsService.js` is part of Pass 7 or a separate support-content subpass.

Read-only/UI cleanup:

- Move page/modal direct email actions behind the chosen owner.
- Add pending/disabled state for create, update, delete, welcome, custom, and bulk actions.
- Replace realtime-triggered email sends with passive refresh/toast only.
- Replace generic sent copy with queued/sent/failed copy.
- Add empty/degraded states for no subscribers, unauthorized subscriber scope, and email function unavailable.

L5 repair, only if required after proof:

- Add or fix Edge Function idempotency.
- Add campaign/send log table or RPC if durable email state is required.
- Add RLS policy repair for subscriber visibility.
- Add schema fields only after deciding source-of-truth semantics.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on subscription management.
- Create subscriber with welcome disabled.
- Create subscriber with welcome enabled.
- Edit status/type.
- Send welcome to existing subscriber.
- Send custom email to one subscriber.
- Send bulk email to selected subscribers.
- Confirm duplicate-click guards and loading states.

Backend/Edge/RLS:

- Read-only table proof for subscriber columns and status/type constraints.
- Non-production Edge Function test for welcome email after idempotency is defined.
- Non-production Edge Function test for custom and bulk email after receiver contract is defined.
- RLS test for platform admin, org admin, and ordinary user visibility.

Stop conditions:

- Do not send test emails from production data during planning.
- Do not keep multiple welcome-email send paths.
- Do not implement UI success copy before durable email receiver semantics are known.
- Do not hard-delete subscribers unless unsubscribe/delete semantics are explicitly approved.
