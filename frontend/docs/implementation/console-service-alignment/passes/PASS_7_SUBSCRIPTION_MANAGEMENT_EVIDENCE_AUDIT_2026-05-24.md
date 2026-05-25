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

Subscription management is not missing a single handler. It has too many owners for one lifecycle, exposes management writes not authorized by current source RLS, and renders unsupported commercial meaning from a marketing subscriber row.

The route can create, update, delete, filter, view, and render analytics. Email commands are present in `SubscriptionModal.jsx` and can also be mounted by navigation modal hosts. Those behaviors are split across `subscriptionService.js`, `subscribersService.js`, `useSubscription.js`, route/context/navigation surfaces, and Edge Functions under `frontend/supabase/functions/payments/`.

Source reconciliation on May 25, 2026 corrects two stale earlier findings: current `createSubscriber()` creates a row only, with the optional welcome command explicitly chosen through `createSubscriberWithWelcome()`; current `SubscriptionManagementPage.jsx` does not directly subscribe or send welcome mail on realtime insert. The remaining high-risk defect is sharper: `sendWelcome` delivers mail but only clears `new_user`, while `process-subscribers` later selects rows whose `welcome_email_sent` remains false and can deliver the welcome message again.

## Evidence Table

| Evidence | Source | Meaning | Required owner |
| --- | --- | --- | --- |
| `subscriptionService.js` owns subscriber CRUD, analytics, realtime, and email sends. | `frontend/src/services/subscriptionService.js:57`, `:154`, `:181`, `:205`, `:306`, `:362`, `:394`, `:409`, `:436`, `:462` | One service is acting as table adapter, workflow owner, realtime owner, and email client. | Narrow subscription workflow facade |
| `subscribersService.js` also owns subscriber CRUD and realtime. | `frontend/src/services/subscribersService.js:45`, `:64`, `:86`, `:109`, `:139`, `:156`, `:204` | Duplicate table owner exists and can drift from `subscriptionService.js`. Active UI imports already use `subscriptionService.js`, so `subscribersService.js` is retired from UI flow and retained only as compatibility code until deletion proof. | `subscriptionService.js` workflow facade |
| Subscriber writes now use a fixed allowed-field payload rather than schema fallback. | `frontend/src/services/subscriptionService.js:11`, `:21`, `:42` | Earlier schema-fallback finding has been repaired in current source; remaining issue is whether updates/deletes are authorized at all. | Preserve schema-current payload and constrain authority |
| Plain create is row-only; optional welcome is explicit. | `frontend/src/services/subscriptionService.js:154`, `:297`; `frontend/src/hooks/useSubscription.js:38` | Earlier auto-send-on-every-create finding has been repaired in current source. | Preserve command separation |
| `useSubscription` owns broad realtime and may be mounted by route, context, FAB/bottom bar, home and analytics surfaces. | `frontend/src/hooks/useSubscription.js:147`, `:171`; `frontend/src/components/navigation/ContextPanel.jsx:56`; `frontend/src/components/pages/SubscriptionManagementPage.jsx:43`; `frontend/src/components/pages/Analytics.jsx:83`; `frontend/src/components/pages/BentoHome.jsx:444` | Each mounted instance performs full list fetch and broad table subscription, duplicating sensitive global read ownership. | One bounded projection/invalidation owner |
| Page uses local filter/pagination and always passes edit/delete callbacks to desktop variants. | `frontend/src/components/pages/SubscriptionManagementPage.jsx:102`, `:176`, `:203`, `:243`, `:807`, `:820` | Rendered directory looks fully searchable and manageable although it is an unwindowed read plus unauthorized direct writes. | Paged read projection and command capability map |
| Page tests `isAdmin` as a function object for header/bulk actions while calling it in mobile props. | `frontend/src/components/pages/SubscriptionManagementPage.jsx:42`, `:284`, `:396`, `:905` | Current route is admin-protected, but the component check is structurally unsound for reuse or route change. | Single evaluated capability predicate |
| Desktop list/table variants render edit/delete whenever callbacks exist; page supplies both. | `frontend/src/components/views/SubscriptionListView.jsx:129`, `:140`; `frontend/src/components/views/SubscriptionTableView.jsx:155`, `:161`; `frontend/src/components/pages/SubscriptionManagementPage.jsx:807`, `:820` | Unauthorized actions are exposed consistently on desktop variants. | Remove controls until receiver-backed authority exists |
| Mobile computes `Paid Conversion`, `Revenue Dynamics`, and `Monetization` from subscriber type. | `frontend/src/components/mobile/MobileSubscriptions.jsx:51`, `:123`, `:159`, `:168` | A marketing tier classification is presented as commercial performance without payment/ledger proof. | Subscriber-tier labels or authorized billing join |
| Context panel renders global metrics and raw recent emails and dispatches an unreceived Broadcast event. | `frontend/src/components/context/SubscriptionsPanel.jsx:16`, `:31`, `:74`, `:91`, `:111`, `:142`; `frontend/src/components/pages/SubscriptionManagementPage.jsx:83`, `:93` | Sensitive admin projection is repeated in shell context and a visible command has no page receiver. | Admin-only shared projection and mounted command receiver |
| Modal imports email functions directly. | `frontend/src/components/modals/SubscriptionModal.jsx:7` | Modal owns workflow calls instead of using a single command owner. | Subscription command facade |
| Modal bulk send now consumes aggregate sent/failed counts but does not render per-recipient results. | `frontend/src/components/modals/SubscriptionModal.jsx:107`, `:109`, `:113` | Earlier all-success collapse is partially repaired; recipient-level audit/retry evidence is still absent. | Bulk email result model |
| Modal custom send claims success to selected subscriber. | `frontend/src/components/modals/SubscriptionModal.jsx:137`, `:138` | UI copy depends on function success only; no durable send log exists in the console service layer. | Custom email result model |
| Modal welcome send acknowledges an unmarked row, but closes after delivery. | `frontend/src/components/modals/SubscriptionModal.jsx:153`, `:163`, `:164` | Truthful warning exists, but leaving `welcome_email_sent` false preserves batch resend exposure. | Welcome email lifecycle owner |
| Subscriber table has `type`, `status`, `new_user`, `welcome_email_sent`, and `metadata`. | `frontend/supabase/migrations/20260219000100_identity.sql:157` | The schema supports current UI fields, so normal runtime should not need missing-column retry for these fields. | Schema-current table adapter |
| RLS allows public insert and admin select. | `frontend/supabase/migrations/20260219000700_security.sql:390`, `:391`, `:392` | Current migrations authorize intake plus platform-admin read, but not the rendered update/delete/status commands. | Security/scope decision |
| `subscriptionService.getSubscribers` currently enforces admin list read but collapses denied and failed reads to `[]`. | `frontend/src/services/subscriptionService.js:57`, `:62`, `:89`, `:94` | Scope has been narrowed, but UI cannot distinguish empty data from unavailable or denied truth. | Paged read with explicit state |
| `sendWelcome` sends through Brevo then updates only `new_user = false`. | `frontend/supabase/functions/payments/sendWelcome/index.ts:63`, `:86`, `:90`, `:100` | Manual welcome delivery does not write the `welcome_email_sent` durable guard consumed by UI and batch processing. | Idempotent welcome command |
| `process-subscribers` selects rows with unmarked welcome state and sends mail before setting `welcome_email_sent`. | `frontend/supabase/functions/payments/process-subscribers/index.ts:27`, `:32`, `:52`, `:83`, `:85` | A row manually emailed by `sendWelcome` remains eligible for a second welcome send. | Single lifecycle writer or idempotency key |
| `sendCustomEmail` returns success but does not write a send log. | `frontend/supabase/functions/payments/sendCustomEmail/index.ts:68`, `:94` | Console has no durable evidence of custom email delivery beyond function response. | Email send/campaign log decision |
| `sendBulkEmail` returns per-recipient `results`, success count, and failure count. | `frontend/supabase/functions/payments/sendBulkEmail/index.ts:65`, `:90`, `:103`, `:108`, `:113` | The modal now distinguishes aggregate partial failure, but does not expose recipient-level results or retry evidence. | Bulk email result UI |
| Hardening docs name a subscribers surface field guard. | `frontend/supabase/docs/TESTING.md:251`, `:253`, `:256` | There is an expected test gate for canonical subscriber fields and mutation lanes. | Verification gate before implementation |
| Functions README documents `/functions/v1/sendBulkEmail`, `/functions/v1/sendCustomEmail`, and `/functions/v1/sendWelcome`. | `frontend/supabase/functions/README.md:38`, `:45`, `:52` | Endpoint names are known. The `payments/` folder location is packaging structure, not a planning blocker. | Edge Function command contract |

## Broken Contract Name

Subscriber management is currently a UI-assembled lifecycle. It needs one workflow contract:

`subscriber row -> policy-backed read/insert or authorized lifecycle command -> optional email command -> one durable delivery transition -> bounded read refresh -> passive realtime invalidation`

Realtime must never send email. CRUD must not fire email unless the command explicitly owns that lifecycle. Email success copy must reflect the receiver result and, where available, persisted row state.

## Deterministic Decisions For Pass 7 Subscription

1. Retain `subscriptionService.js` as the subscription workflow facade for active UI code.
2. Retire `subscribersService.js` from active UI flow. It remains compatibility code until a later cleanup proves no imports depend on it.
3. Preserve plain `createSubscriber` as the public-insert-compatible row-only action; do not retain browser update/delete/status actions without a new authorized receiver.
4. Keep the explicit `createSubscriberWithWelcome` shape, but do not trust it until it and `process-subscribers` share one durable idempotent welcome transition.
5. Repair welcome ownership so manual delivery cannot leave a row eligible for batch redelivery.
6. Keep realtime passive; current page source no longer performs the previously documented realtime email send.
7. Consolidate repeated hook-mounted full reads and realtime to one owner consumed by page/mobile/context/analytics surfaces.
8. Preserve aggregate partial-failure handling for bulk mail and add recipient-level outcome visibility before treating campaigns as audited.
9. Treat subscribers as a platform-admin global marketing list for this pass because the current schema has no organization scope and RLS grants admin select only.
10. Preserve the current admin-only list check, while replacing its empty-on-denied/failure ambiguity with explicit states.
11. Preserve the current fixed-field payload repair; do not reintroduce runtime schema fallback.
12. Remove or disable hard-delete, edit, and status-change promises in this pass because current source proves admin read but not admin update/delete; those operations require a separate authorized lifecycle receiver.
13. Replace revenue/conversion/premium-payment implications derived only from `subscribers.type` unless an authorized billing source is joined.
14. Disable the dead Broadcast panel action or mount it through the single audited email command surface.

## Surface Coverage Closure

| Surface | Render/read evidence | Mutation/command evidence | Deterministic conclusion |
| --- | --- | --- | --- |
| Subscription route and desktop variants | Full collection is locally filtered/sliced and renders emails/status/tier/welcome state. | Create/edit/delete callbacks are exposed. | Server-backed paging and command authority are not closed. |
| Mobile subscription surface | Loaded array feeds registry plus local KPI/trend sections. | Admin-gated edit/delete reuse direct page commands. | CRUD remains blocked; commercial labels are unsupported. |
| Context panel | Global counts and four recent email rows are rendered. | Join/Data events have receivers; Broadcast does not. | Admin-only exposure must use shared projection; Broadcast is disabled pending receiver. |
| Modal/email actions | Modal reads active recipients and invokes welcome/custom/bulk functions. | Partial bulk aggregate is handled; custom has no durable log; welcome is not durably marked. | Email lifecycle remains blocked by auditability and duplicate welcome risk. |
| Hook/service/realtime | Multiple consumers mount a full list read and broad subscription. | Service offers more writes than RLS proves. | One bounded read owner and constrained command facade are required. |
| Edge worker/function contract | Welcome function clears `new_user`; worker sets sent flag after sending pending rows. | Both can deliver welcome mail. | One durable idempotent transition is mandatory before enablement. |

## First Safe Implementation Slice

The first implementation slice is fixed:

1. Make `createSubscriber` the only policy-backed row mutation retained in the first slice and make admin list access read-only.
2. Keep `createSubscriberWithWelcome` behind the closed welcome lifecycle; it must own send, mark, refresh, and duplicate guard with the batch worker.
3. Keep passive realtime behavior and consolidate repeated hook-mounted reads/channels.
4. Route modal welcome/custom/bulk actions through one command facade.
5. Preserve aggregate bulk partial-failure messaging and add per-recipient outcome presentation.
6. Remove unsupported edit/delete controls and unsupported commercial KPI wording.
7. Run the subscribers surface field guard before browser testing.

## Hard Blockers

Implementation pauses only for these blockers:

- The current deployment lacks callable `sendWelcome`, `sendCustomEmail`, or `sendBulkEmail` functions. The repo contract names them, so deployment mismatch is an environment defect.
- A non-admin role needs subscriber management. Current schema/RLS makes this out of scope for this pass; it requires a separate org-scoped subscriber model.
- Platform-admin editing or deletion is required. Current schema/RLS proves admin read only; a guarded lifecycle receiver or policy repair must be explicitly planned first.
- `sendWelcome` currently returns success while leaving `welcome_email_sent` false. The existing warning copy is truthful, but implementation is blocked because the batch worker can redeliver the same welcome email.
- Production subscriber emails are never used for tests. Test email sends use non-production patterned addresses only.

## Cross-Pass Notes

- This pass intersects Pass 7 support/content because email templates and support contact copy appear in email bodies.
- This pass intersects Pass 8 notifications/realtime because the same hook is mounted by route, context/navigation, home and analytics surfaces and must use the same bounded invalidation doctrine as other console live surfaces.
- This pass intersects security/RLS in Pass 4 because subscriber email visibility is global platform-admin data and direct management writes are not policy-backed.
- This pass intersects public acquisition ownership, not patient emergency ownership: subscriber tier and campaign lifecycle must be reconciled with the public signup/payment receiver before Console labels it as revenue or conversion.
