# Pass 7 Subscription Management Evidence Audit - 2026-05-24

## Scope

This is an evidence-only checkpoint for the subscription management subpass. It does not authorize implementation, email sends, database writes, Edge Function tests, seed data, or cleanup.

Covered feature rows from `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`:

- Subscription and email
- Subscriber intake/read and currently exposed but unauthorized management writes
- Welcome email lifecycle
- Custom email lifecycle
- Bulk email lifecycle
- Subscriber realtime refresh
- Subscriber visibility and RLS scope

## Current Finding

Subscription management is not missing a single handler. It has too many owners for one lifecycle and exposes management writes not authorized by current source RLS.

The route can create, update, delete, filter, view, send welcome email, send custom email, send bulk email, and react to realtime inserts. Those behaviors are split across `subscriptionService.js`, `subscribersService.js`, `useSubscription.js`, `SubscriptionManagementPage.jsx`, `SubscriptionModal.jsx`, and Edge Functions under `frontend/supabase/functions/payments/`.

The riskiest defect is welcome email duplication. A new subscriber can trigger welcome email from the service create path, the hook create path, and a page-level realtime insert listener. The modal can also send welcome email manually. These paths do not share an idempotent email lifecycle state.

## Evidence Table

| Evidence | Source | Meaning | Required owner |
| --- | --- | --- | --- |
| `subscriptionService.js` owns subscriber CRUD, analytics, realtime, and email sends. | `frontend/src/services/subscriptionService.js:79`, `:165`, `:200`, `:224`, `:319`, `:375`, `:407`, `:425`, `:451` | One service is acting as table adapter, workflow owner, realtime owner, and email client. | Subscription workflow facade plus lower-level table adapter |
| `subscribersService.js` also owns subscriber CRUD and realtime. | `frontend/src/services/subscribersService.js:45`, `:64`, `:86`, `:109`, `:139`, `:156`, `:204` | Duplicate table owner exists and can drift from `subscriptionService.js`. Active UI imports already use `subscriptionService.js`, so `subscribersService.js` is retired from UI flow and retained only as compatibility code until deletion proof. | `subscriptionService.js` workflow facade |
| Subscriber writes use schema fallback that strips missing columns and retries. | `frontend/src/services/subscriptionService.js:54`, `:67`, `:74` | Runtime can silently adapt to schema drift instead of failing a contract check. | Schema-current subscriber write contract |
| `subscriptionService.createSubscriber` always fires welcome email after insert when an email exists. | `frontend/src/services/subscriptionService.js:165`, `:185` | Service-level create ignores the modal/hook `sendWelcomeEmail` choice and can send even when the caller intends no email. | Email lifecycle owner |
| `useSubscription.createNewSubscriber` sends welcome email after create unless `sendWelcomeEmail === false`. | `frontend/src/hooks/useSubscription.js:38`, `:44`, `:46` | Hook-level create can send a second welcome email because service create already fired one. | Email lifecycle owner |
| `useSubscription` also exposes direct `sendWelcome`. | `frontend/src/hooks/useSubscription.js:139`, `:141` | Welcome send can be invoked independently without shared idempotency or row state refresh. | Email command controller |
| `useSubscription` subscribes to new subscriber inserts and mutates local state/toasts. | `frontend/src/hooks/useSubscription.js:175`, `:179`, `:182`, `:203` | Hook realtime can add duplicate rows if the page also consumes realtime or optimistic create has already inserted the row. | One realtime owner |
| `SubscriptionManagementPage` imports both hook state and direct `subscribeToSubscribers`. | `frontend/src/components/pages/SubscriptionManagementPage.jsx:7`, `:40` | Page bypasses the hook's ownership and starts a second realtime path. | Page consumes hook/facade only |
| Page realtime insert listener invokes `sendWelcome` Edge Function directly for `new_user` inserts. | `frontend/src/components/pages/SubscriptionManagementPage.jsx:103`, `:107`, `:116` | Passive realtime can create side effects. This is the highest duplicate-send risk. | Realtime listener must be passive |
| Page refreshes subscribers after realtime welcome send. | `frontend/src/components/pages/SubscriptionManagementPage.jsx:127`, `:128` | A table event can trigger an email send, then a fetch, then more state churn. | Command result refresh only |
| Modal imports email functions directly. | `frontend/src/components/modals/SubscriptionModal.jsx:7` | Modal owns workflow calls instead of using a single command owner. | Subscription command facade |
| Modal bulk send claims all selected subscribers received email. | `frontend/src/components/modals/SubscriptionModal.jsx:107`, `:108` | UI ignores per-recipient failures returned by the Edge Function. | Bulk email result model |
| Modal custom send claims success to selected subscriber. | `frontend/src/components/modals/SubscriptionModal.jsx:137`, `:138` | UI copy depends on function success only; no durable send log exists in the console service layer. | Custom email result model |
| Modal welcome send claims success to selected subscriber. | `frontend/src/components/modals/SubscriptionModal.jsx:157`, `:158` | Manual welcome send can duplicate prior welcome sends and does not prove idempotency. | Welcome email lifecycle owner |
| Subscriber table has `type`, `status`, `new_user`, `welcome_email_sent`, and `metadata`. | `frontend/supabase/migrations/20260219000100_identity.sql:157` | The schema supports current UI fields, so normal runtime should not need missing-column retry for these fields. | Schema-current table adapter |
| RLS allows public insert and admin select. | `frontend/supabase/migrations/20260219000700_security.sql:390`, `:391`, `:392` | Current database policy does not match service comments saying org admins get all subscribers. | Security/scope decision |
| `subscriptionService.getSubscribers` treats org admins as allowed because table has no org field. | `frontend/src/services/subscriptionService.js:87`, `:91` | Client-side scope assumption conflicts with RLS source truth. | Product/RLS scope owner |
| `sendWelcome` sends through Brevo and then updates `subscribers.welcome_email_sent`. | `frontend/supabase/functions/payments/sendWelcome/index.ts:63`, `:86`, `:87`, `:88`, `:100` | Welcome send has a receiver-confirmed state update, but duplicate callers can still trigger duplicate emails before or after that flag. | Idempotent welcome command |
| `sendCustomEmail` returns success but does not write a send log. | `frontend/supabase/functions/payments/sendCustomEmail/index.ts:68`, `:94` | Console has no durable evidence of custom email delivery beyond function response. | Email send/campaign log decision |
| `sendBulkEmail` returns per-recipient `results`, success count, and failure count. | `frontend/supabase/functions/payments/sendBulkEmail/index.ts:65`, `:90`, `:103`, `:108`, `:113` | The receiver has enough detail for partial failure UI, but modal currently collapses this to one success toast. | Bulk email result UI |
| Hardening docs name a subscribers surface field guard. | `frontend/supabase/docs/TESTING.md:251`, `:253`, `:256` | There is an expected test gate for canonical subscriber fields and mutation lanes. | Verification gate before implementation |
| Functions README documents `/functions/v1/sendBulkEmail`, `/functions/v1/sendCustomEmail`, and `/functions/v1/sendWelcome`. | `frontend/supabase/functions/README.md:38`, `:45`, `:52` | Endpoint names are known. The `payments/` folder location is packaging structure, not a planning blocker. | Edge Function command contract |

## Broken Contract Name

Subscriber management is currently a UI-assembled lifecycle. It needs one workflow contract:

`subscriber row -> policy-backed read/insert or authorized lifecycle command -> optional email command -> receiver result -> row refresh -> passive realtime refresh`

Realtime must never send email. CRUD must not fire email unless the command explicitly owns that lifecycle. Email success copy must reflect the receiver result and, where available, persisted row state.

## Deterministic Decisions For Pass 7 Subscription

1. Retain `subscriptionService.js` as the subscription workflow facade for active UI code.
2. Retire `subscribersService.js` from active UI flow. It remains compatibility code until a later cleanup proves no imports depend on it.
3. Keep plain `createSubscriber` as the public-insert-compatible row-only action; do not retain browser update/delete/status actions without a new authorized receiver.
4. Add an explicit `createSubscriberWithWelcome` command only after Edge authorization/deployment proof for the create-and-email path.
5. Make `sendWelcomeEmail` idempotent at the command boundary by checking refreshed subscriber state before sending and refreshing after the Edge Function returns.
6. Remove email sends from passive realtime listeners.
7. Consolidate realtime to one owner consumed by page/mobile/context surfaces.
8. Make bulk email UI consume `successful`, `failed`, and `results` from the receiver before claiming send status.
9. Treat subscribers as a platform-admin global marketing list for this pass because the current schema has no organization scope and RLS grants admin select only.
10. Remove the org-admin "all subscribers" assumption from the service.
11. Replace runtime schema fallback with a contract check because current migrations define the subscriber fields the UI uses.
12. Remove or disable hard-delete, edit, and status-change promises in this pass because current source proves admin read but not admin update/delete; those operations require a separate authorized lifecycle receiver.

## First Safe Implementation Slice

The first implementation slice is fixed:

1. Make `createSubscriber` the only policy-backed row mutation retained in the first slice and make admin list access read-only.
2. Add a separate `createSubscriberWithWelcome` command only after its function authorization/deployment contract is proven; it must own send, mark, refresh, and duplicate guard.
3. Remove the page realtime `sendWelcome` side effect and keep realtime as passive refresh/toast only.
4. Route modal welcome/custom/bulk actions through one command facade.
5. Update bulk success/failure copy to use Edge Function result counts.
6. Run the subscribers surface field guard before browser testing.

## Hard Blockers

Implementation pauses only for these blockers:

- The current deployment lacks callable `sendWelcome`, `sendCustomEmail`, or `sendBulkEmail` functions. The repo contract names them, so deployment mismatch is an environment defect.
- A non-admin role needs subscriber management. Current schema/RLS makes this out of scope for this pass; it requires a separate org-scoped subscriber model.
- Platform-admin editing or deletion is required. Current schema/RLS proves admin read only; a guarded lifecycle receiver or policy repair must be explicitly planned first.
- `sendWelcome` returns success but the refreshed subscriber row does not show `welcome_email_sent = true`. The UI must report "email sent, subscriber row not marked" rather than "welcome complete."
- Production subscriber emails are never used for tests. Test email sends use non-production patterned addresses only.

## Cross-Pass Notes

- This pass intersects Pass 7 support/content because email templates and support contact copy appear in email bodies.
- This pass intersects Pass 8 notifications/realtime because passive subscriber realtime should use the same invalidation doctrine as other console live surfaces.
- This pass intersects security/RLS in Pass 4 because subscriber visibility is currently global in UI assumptions but admin-only in database policy.
