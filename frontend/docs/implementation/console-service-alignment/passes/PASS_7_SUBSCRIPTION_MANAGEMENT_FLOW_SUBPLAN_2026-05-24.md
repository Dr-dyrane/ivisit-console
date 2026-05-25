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
4. Choose the explicit create-with-welcome command when the operator wants welcome email sent.
5. Edit subscriber status/type.
6. Send welcome email to an existing subscriber.
7. Send a custom email to one subscriber.
8. Send a bulk email to selected active subscribers.
9. Watch realtime updates without duplicate toasts, duplicate emails, or stale row state.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Subscriber CRUD | Two services export overlapping operations. | `subscriptionService.js` remains the workflow facade; `subscribersService.js` is retired from active UI flow. |
| Welcome email | Service auto-send, hook send-after-create, page realtime send, modal direct send. | Single email lifecycle owner with idempotency. |
| Email sent state | UI can mark/show sent independent of durable receiver proof. | Receiver-confirmed queued/sent/failed state. |
| Bulk email | Modal sends directly and returns aggregate success. | Campaign/send owner with per-recipient result. |
| Realtime | Hook and page subscribe separately to subscriber changes. | One subscriber realtime owner/invalidation path. |
| Organization scope | Service comments say org admins see all because table lacks org field. | Platform-admin-only global marketing list for this pass. |

## Implementation Packages

### 1. Subscriber Owner

Decision:

- Keep `subscriptionService.js` as the active workflow facade.
- Remove `subscribersService.js` from active UI paths.
- Leave `subscribersService.js` as compatibility code until a later cleanup pass proves no imports require it.

Acceptance gate:

- `useSubscription`, `SubscriptionManagementPage`, and `SubscriptionModal` import subscription actions from `subscriptionService.js` only.
- Duplicate create/update/delete/realtime paths are removed from active UI flow.

### 2. Schema-Current Payload Contract

Source truth:

- `subscribers` includes `email`, `type`, `status`, `new_user`, `welcome_email_sent`, `subscription_date`, `metadata`, `created_at`, and `updated_at`.
- `type` is constrained to `free` and `paid`.
- The current schema has no organization or campaign scope.

Acceptance gate:

- Subscriber writes do not silently retry with missing-column fallbacks in normal runtime.
- UI only renders editable fields that the receiver persists.

### 3. Welcome Email Lifecycle

Define this lifecycle:

- `createSubscriber` creates a row only.
- `createSubscriberWithWelcome` creates the row, checks `welcome_email_sent`, calls `sendWelcome`, refreshes the row, and returns the final subscriber projection.
- Manual welcome send checks the refreshed row before sending and refreshes again after the Edge Function returns.
- The UI treats `welcome_email_sent = true` as the only durable "sent" row state.
- Edge Function success with an unmarked refreshed row reports "email sent, row not marked" instead of "welcome complete."

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
- return sent count, failed count, and per-recipient results from `sendBulkEmail`
- show per-recipient or aggregate failure details from the receiver

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

### 6. Security And Scope

Decision:

- Subscribers are a platform-admin global marketing list in this pass.
- Org admins do not receive subscriber list visibility in this pass.
- Support/content roles do not receive subscriber list visibility in this pass.
- Delete preserves current hard-delete behavior for platform admins.
- Unsubscribe/status changes are excluded from this implementation slice and must not be inferred from the platform-admin hard-delete control; they require their own receiver-backed lifecycle pass.

Acceptance gate:

- UI copy and filters match the actual table/RLS scope.
- Org admins do not see global subscriber data.

## Detailed Implementation Checklist

Before code changes:

- Read current subscribers table and Edge Function contracts.
- Use `subscriptionService.js` as the owner service.
- Use `welcome_email_sent = true` as the durable welcome-sent row state.
- Treat subscribers as global platform-admin data.
- Keep `supportFaqsService.js` in the care/content/support subpass, not the subscription subpass.

Read-only/UI cleanup:

- Move page/modal direct email actions behind the chosen owner.
- Add pending/disabled state for create, update, delete, welcome, custom, and bulk actions.
- Replace realtime-triggered email sends with passive refresh/toast only.
- Replace generic sent copy with queued/sent/failed copy.
- Add empty/degraded states for no subscribers, unauthorized subscriber scope, and email function unavailable.

L5 repair, only when a deterministic gate fails:

- Add Edge Function idempotency after command-boundary idempotency fails verification.
- Add campaign/send log table only after product requires durable custom/bulk history beyond function responses.
- Add RLS policy repair after platform-admin select stops matching current subscriber management scope.
- Add schema fields only in a future org-scoped subscriber model.

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
