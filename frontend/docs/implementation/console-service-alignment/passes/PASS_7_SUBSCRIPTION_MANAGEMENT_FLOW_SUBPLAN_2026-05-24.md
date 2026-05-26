# Pass 7 Subscription Management Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, cleanup, email send, seed, migration, or runtime mutation is authorized by this document.

This subplan covers subscription management failures across subscriber intake/read, unsupported management writes, welcome email, custom email, bulk email, realtime subscriber updates, and duplicate service ownership.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/SubscriptionManagementPage.jsx`
- `frontend/src/components/mobile/MobileSubscriptions.jsx`
- `frontend/src/components/context/SubscriptionsPanel.jsx`
- `frontend/src/components/modals/SubscriptionModal.jsx`
- `frontend/src/emails/ivisit106Campaign.js`
- `frontend/src/components/views/SubscriptionListView.jsx`
- `frontend/src/components/views/SubscriptionTableView.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/components/navigation/ContextAwareFAB.jsx`
- `frontend/src/components/navigation/DynamicBottomBar.jsx`
- `frontend/src/hooks/useSubscription.js`
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/subscribersService.js`
- `frontend/src/services/analyticsService.js`

Schema, policy, and receiver evidence:

- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/functions/payments/sendWelcome/index.ts`
- `frontend/supabase/functions/payments/process-subscribers/index.ts`
- `frontend/supabase/functions/payments/sendCustomEmail/index.ts`
- `frontend/supabase/functions/payments/sendBulkEmail/index.ts`
- `frontend/supabase/functions/webhooks/index.ts`
- `frontend/supabase/functions/README.md`
- `frontend/supabase/docs/TESTING.md`

Audit docs:

- Stage 3 capability gap audit.
- Stage 4 L5 state/data ownership audit.
- Stage 5 full service coverage audit.
- Stage 6 implementation pass plan.
- Care/content/analytics contract chart.

Observed source signals:

- `subscriptionService.js` and `subscribersService.js` both own `subscribers` table behavior.
- Current `subscriptionService.createSubscriber()` creates a row only; `createSubscriberWithWelcome()` is an explicit wrapper selected by the hook when `sendWelcomeEmail` is enabled. Earlier audit notes that said plain create always sends are superseded by this source read.
- Current `SubscriptionManagementPage` no longer mounts a page-level realtime email sender; `useSubscription` owns the active route subscription. Earlier audit notes that described a page insert listener sending welcome mail are superseded by this source read.
- `SubscriptionModal` can send welcome, custom, and bulk emails directly through `subscriptionService`.
- `SubscriptionModal` imports `ivisit106Campaign.js`, whose rendered campaign HTML embeds a hard-coded `/functions/v1/unsubscribe?email=` URL. Welcome, custom, bulk and batch function templates embed the same endpoint, while the only local unsubscribe handler evidence found in this pass is under `frontend/supabase/functions/webhooks/index.ts`; deployed function-slug ownership and lifecycle authority must be proven before the link is treated as implemented.
- The source topology does not prove any addressed subscriber-email slug: handlers for `sendWelcome`, `sendCustomEmail`, `sendBulkEmail` and `process-subscribers` are nested below `frontend/supabase/functions/payments/`, while the public `unsubscribe` handler is under `frontend/supabase/functions/webhooks/index.ts`. A README naming intended endpoints is not proof that those top-level slugs are deployed or share one lifecycle writer.
- `sendWelcome` sends email but updates only `new_user = false`; the separate `process-subscribers` worker later selects `welcome_email_sent = false` rows and can send the same welcome email again before marking that flag.
- The hook, route, context panel, navigation FAB/bottom bar, analytics page, and home surface each mount or consume `useSubscription`; every mounted hook instance performs its own full subscriber fetch and broad realtime subscription. `AppShell` always renders both `ContextAwareFAB` and `DynamicBottomBar`, and each invokes the hook before its mobile/non-mobile early return, so at least two subscriber reads/channels can execute on every routed shell even when no subscription command is visible.
- `SubscriptionsPanel` exposes a Broadcast button that dispatches `openEmailActionsModal`, while `SubscriptionManagementPage` only receives create and analytics events; the visible email action currently has no mounted receiver.
- Subscriber paging is client-side over an unwindowed hook fetch, and `subscriptionService.getSubscribers()` returns an empty array for both unauthorized and failed list fetches.
- Desktop grid, list, and table variants always receive edit/delete callbacks although current policy proves admin read and public insert only; mobile hides those controls behind `canManage={isAdmin()}` but still calls the same unauthorized operations for an admin.
- The page uses `isAdmin` as a function for mobile management, but tests the function object itself in the header and bulk action (`isAdmin &&`), making those capability checks structurally invalid if route composition changes.
- `MobileSubscriptions` reports `Paid Conversion`, `Revenue Dynamics`, and `Monetization` from `subscribers.type`; this is subscriber classification, not a payment, ledger, or paid-plan lifecycle proof.
- `SubscriptionsPanel` exposes the latest subscriber email addresses and global counts in the context panel; its scope must remain platform-admin-only and its `Premium` label cannot imply collected subscription revenue.
- Runtime source contains pre-existing corrupted punctuation in `SubscriptionsPanel.jsx`; this pass documents the issue without copying it into maintained docs.

## User Flow

Operator path:

1. Open subscription management.
2. Review subscriber list and filters.
3. Create a subscriber.
4. Choose the explicit create-with-welcome command when the operator wants welcome email sent.
5. Keep edit/delete/status actions disabled unless an authorized lifecycle receiver is added.
6. Send welcome email to an existing subscriber.
7. Send a custom email to one subscriber.
8. Send a bulk email to selected active subscribers.
9. Watch realtime updates without duplicate toasts, duplicate emails, or stale row state.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Subscriber management writes | Two services export overlapping create/update/delete operations although policy proves public insert and admin read only. | `subscriptionService.js` remains the workflow facade for allowed read/intake and future authorized commands; unsupported edit/delete/status actions are removed or disabled. |
| Welcome email | Explicit hook/modal welcome command and batch worker can deliver mail while writing different lifecycle state. | Single email lifecycle owner with idempotency. |
| Email sent state | UI can mark/show sent independent of durable receiver proof. | Receiver-confirmed queued/sent/failed state. |
| Bulk email | Modal sends directly and returns aggregate success. | Campaign/send owner with per-recipient result. |
| Realtime | Hook and page subscribe separately to subscriber changes. | One subscriber realtime owner/invalidation path. |
| Organization scope | Table has no organization field; current route and list service constrain exposure to platform admins. | Preserve platform-admin-only global marketing list for this pass. |
| Broadcast entry point | Context panel dispatches an email-actions event with no page receiver. | Disabled action until the single authorized email lifecycle surface is mounted and audited. |
| Subscriber list reliability | Full-list client pagination and empty-on-error behavior hide incomplete or failed admin list truth. | Paged administrator read projection distinguishing empty, unauthorized and unavailable states. |
| Welcome durable state | Manual `sendWelcome` changes `new_user` but does not mark `welcome_email_sent`; the worker later selects the still-pending row. | One idempotent welcome command that writes the one durable lifecycle status used by every sender. |
| Unsubscribe receiver ownership | Campaign and delivery templates hard-code an `unsubscribe` Edge URL, but local source evidence places unsubscribe handling in a differently located webhook function source. | One deployable, tested unsubscribe command endpoint that records the durable status consumed by list/export/send eligibility and by every email template. |
| Email receiver deployment topology | Console calls top-level welcome/custom/bulk slugs and may rely on a batch worker, while inspected sources are nested below a category folder without deployable-slug proof. | One deployed-function inventory proving slug, auth, idempotency, durable writes, failure response and scheduling for every email command/worker before enabling lifecycle claims. |
| Subscriber KPI semantics | Mobile and context surfaces call `type = paid` conversion, premium, monetization, and revenue dynamics without a billing receiver. | Label as subscriber tier/mix only, or join an authorized subscription-payment outcome projection. |
| Variant action parity | Desktop variants always expose edit/delete; mobile conditionally exposes the same unsupported actions. | One operation capability map shared by every variant, based on proven command authority. |
| Bulk delete false success | Route bulk-delete confirmation emits a success toast and clears selection while its handler contains only a placeholder comment. | Keep bulk delete unavailable until a policy-backed lifecycle/delete command returns per-row outcome and refreshed list truth. |
| Mounted read ownership | Multiple shell/page consumers mount `useSubscription`, each full-fetching/subscribing to the same global list; hidden FAB/bottom-bar components do so on all viewports/routes. | One authorized route projection and action-owned command loading; no hidden shell mount may read or subscribe to the global email list. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Public subscribe | Authorized create | `subscribers` public insert policy | Preserve idempotent signup/result behavior. |
| Admin view/export list | Scoped read projection | `subscribers` admin read policy | Protect scope and exported data. |
| Edit/delete/unsubscribe subscriber | Missing lifecycle command | Current source does not prove browser update/delete management | Do not implement as direct CRUD from existing services. |
| Bulk delete selected subscribers | Destructive command, currently unsupported | No receiver is invoked by the route bulk-action handler | Disable/remove; never toast deletion or clear selection as completion without an authorized durable result. |
| Send welcome email | Workflow command | Email function and persisted delivery/lifecycle state | One owner; no duplicate send or success before durable outcome. |
| Send custom/bulk email | Workflow command | Authorized campaign/send boundary | Add explicit pending/result/audit state before enabling broad sends. |
| Follow email unsubscribe link | Workflow command | Verified deployed unsubscribe Edge endpoint and subscriber lifecycle writer | Do not ship templates that promise unsubscribe until the linked endpoint and durable `unsubscribed` projection are proven together. |
| Open Broadcast action | Workflow entry point | Single mounted subscriber/email command surface | No clickable event may remain without a mounted receiver and authorized command disposition. |
| Realtime subscriber update | Read projection/invalidation | Single selected subscription facade | Remove duplicate service-family subscription ownership. |
| Paid, premium, conversion, or revenue labels | Derived business claim | Authorized billing/subscription outcome source, if one exists | Do not infer payment success or revenue from `subscribers.type`. |
| Show subscriber email in context shell | Sensitive read projection | Platform-admin subscriber read scope | Do not mount outside the admin-protected path or leak into shared shell surfaces. |
| Mount subscriber hook for global action affordance | Excluded shell acquisition | No subscriber read is necessary before an admin opens an authorized command surface | Do not perform admin-only full reads/realtime in hidden or unauthorized-route shell controls. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Subscription row and read scope | email, type, status, new-user flag, welcome sent/timestamp and unsubscribe state | Public insert and admin read are the only table actions currently proven; preserve fixed-field payload handling and remove unsupported management commands. |
| Welcome and lifecycle delivery | command idempotency, queued/sent/failed result, persisted state writer and unsubscribe receiver | Select one authorized lifecycle writer before enabling send/unsubscribe controls or reporting success. |
| Export/realtime and future campaigns | administrator scope, export content, invalidation owner, campaign pending/result/audit state | Retain one facade for reads; broad email actions stay disabled until an authorized auditable command exists. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Subscriber registry row | Subscriber id, email, type, status, new-user flag, welcome sent/timestamp, unsubscribe state, created time | Admin read/create are the only currently proved table actions; edit/delete remain unavailable until policy/RPC proof. | Marketing subscriber state does not become patient account or billing truth. |
| Create subscriber form | Email, type, new-user flag, optional welcome selection, actor id | Public/admin insert payload must stay fixed-field and idempotent around duplicate emails. | App/user lifecycle is not implied by newsletter signup. |
| Welcome email command | Subscriber id/email, command id, queued/sent/failed state, persisted lifecycle writer, template id | Manual send and worker send must share one idempotent writer before success copy appears. | Recipients do not receive duplicate welcome messages from competing send paths. |
| Unsubscribe link | Subscriber id/email token, verified endpoint URL, unsubscribe result, timestamp | Template link generation must prove deployed receiver and durable state update. | Public email lifecycle matches console subscriber status. |
| Broadcast/custom email action | Audience scope, selected ids/query, template/body, actor, queued/result/audit state | Keep disabled until one mounted auditable command receiver exists. | Console cannot claim campaign delivery from a dead button. |
| Export action | Admin scope, selected filters, exported fields, row count, timestamp | Export must use the same authorized projection and avoid hidden broader reads. | Email exports do not leak outside the intended admin surface. |
| Bulk delete action | Admin scope, selected ids, lifecycle eligibility, per-row receiver results, audit state and refreshed counts | Current placeholder handler remains disabled/unavailable; no ordinary delete until RLS/RPC command authority is proved. | Subscriber lifecycle cannot be falsely removed while sends/unsubscribe eligibility still depend on the row. |
| Subscriber analytics | Count source, bounded/unbounded state, status/type grouping, time window | Revenue/conversion labels require billing/subscription outcome source; otherwise remove. | Sponsor/dashboard copy does not overstate paid or premium traction from subscriber type. |
| Realtime subscriber update | Channel owner, invalidated query key, admin scope, cleanup state | Retain one subscription facade and one invalidation owner. | Console lists update without duplicate broad realtime reads. |
| Global shell subscriber preview | Route, role, opened command, visible surface id | Hidden global action containers must not mount admin-only subscriber hooks. | Subscriber emails do not leak into non-subscription routes or unauthorized shells. |

Implementation rule: the first slice may narrow the subscriber projection, remove unsupported commands, and centralize lifecycle command labels. It must not ship edit/delete, broadcast/custom email, revenue labels, or unsubscribe promises until the exact receiver and durable state writer are proved.

## Surface Read, Exposure, And Operation Closure

| Surface | Reads and renders today | Mutations or commands exposed today | Authority/data-flow finding | Required implementation disposition |
| --- | --- | --- | --- | --- |
| `/subscriptions` route, grid view | Full `subscribers` collection, email, type, status, dates, welcome flag; filters and slices locally. | Create, edit, hard delete, analytics, selection. | Admin route is aligned, but list is unwindowed and edit/delete lack policy-backed command authority. | Replace with paged admin projection; retain row create only until lifecycle receivers authorize additional operations. |
| `/subscriptions` bulk delete action | Selected subscriber rows from the page-sliced directory. | Confirmation callback contains placeholder deletion code, then reports successful deletion and clears selection. | This is an active false-success destructive control with no receiver. | Disable/remove until lifecycle-aware authorized batch deletion and reflected list/count outcomes exist. |
| `SubscriptionListView` and `SubscriptionTableView` | Same page-sliced row projection including email and welcome state. | Page passes edit/delete callbacks unconditionally. | Variant components make unsupported management look operational. | Consume one capability map and omit unavailable commands. |
| `MobileSubscriptions` | Growing slice of loaded collection; email and welcome state; local counts/trends. | View and admin-gated edit/delete. | Loaded-window metrics are described as live conversion/revenue and management still targets unproved writes. | Display bounded registry truth only; remove revenue claims and unauthorized commands. |
| `SubscriptionsPanel` in `ContextPanel` | Global counts and first four raw subscriber email addresses. | Create and analytics events have page receivers; Broadcast event does not. | Sensitive global data is duplicated in shell context and one primary command is dead. | Keep admin-only, use shared projection, disable Broadcast until a receiver is mounted. |
| `ContextAwareFAB` and `DynamicBottomBar` shell containers | Both execute `useSubscription()` before checking viewport visibility and exist on every app route. | Visible per-route action can open create/email modals; hidden instance still reads/subscribes. | Remove admin-only subscriber acquisition from global command containers; load allowed command state only after authorized navigation/action. |
| `SubscriptionModal` create/edit/view | Selected row fields and optional welcome toggle. | Creates row, updates row; email mode invokes welcome/custom/bulk functions. | Create can explicitly select welcome lifecycle; edit is currently an unauthorized direct update. | Keep create separate from email command; remove edit until authorized; route email through audited command state. |
| `ivisit106Campaign.js` and Edge email templates | Campaign HTML exposes an unsubscribe link with subscriber email in the query string. | Clicking the email link targets a hard-coded `unsubscribe` Edge route; local handler/deployment identity is not yet proved. | A visible recipient lifecycle command exists outside the page UI and can be broken or unaudited even if Console sends succeed. | Centralize verified unsubscribe URL generation and lifecycle result semantics across every sent template. |
| `useSubscription` and `subscriptionService.js` | Full-list fetch, row refresh, analytics and broad table realtime. | Insert, update/delete/status/type, mark welcome, welcome/custom/bulk. | Active facade is still over-capable; each hook mount repeats read and channel ownership. | Narrow facade to authorized commands and one projection owner. |
| `subscribersService.js` | Separate full-list and row reads. | Separate create/delete and realtime. | Available duplicate owner is not needed by active UI and can drift. | Retire after import proof; it cannot authorize missing operations. |
| `sendWelcome` and `process-subscribers` | Email receiver and batch pending-row processor. | Both can send welcome email; only worker writes `welcome_email_sent`. | Manual welcome email leaves the row eligible for later batch resend. | Consolidate idempotent lifecycle writer before any welcome command is trusted. |

## Ecosystem And Receiver Dependency Closure

| Source truth or dependent owner | Console exposure or gap | Required Pass 7 constraint |
| --- | --- | --- |
| Public acquisition/email subscription lane | Console administers subscriber intake and campaigns; this is not patient visit, wallet, or emergency truth. | Keep subscriber management separate from `ivisit-app` patient records and define its public acquisition receiver before broad campaign operations. |
| `subscribers` policy | Current migrations prove public insert and admin select only. | Platform-admin read plus public intake are the only table capabilities treated as implemented; no browser edit/delete/status claim. |
| Email Edge Functions | Custom/bulk functions return invocation results; welcome send and pending-worker state do not share one durable sent transition. | Do not claim completed lifecycle or run broad sends until command outcome and idempotency are closed. |
| Email-template unsubscribe link | Campaign and function-generated HTML expose a public action endpoint not proven against a deployed source/slug in this audit. | Treat unsubscribe as a first-class receiver path: verify route deployment, idempotent status update, privacy of query identity and send-eligibility exclusion. |
| Wallet/payment outcomes | No audited join from `subscribers.type = paid` to charge, subscription invoice, ledger, or active entitlement is exposed here. | Do not call the tier field revenue, monetization, premium payment, or paid conversion outcome. |
| Pass 8 shell/realtime ownership | Subscription hook is consumed in route, navigation/context and analytics/home surfaces. | Remove repeated full global loads and broad channels through shared bounded projections/invalidation. |

## Pass 7 Subscription Deterministic Surface Register

| Surface or contract | Source read complete | Render/exposure traced | Create/read/update/delete or command authority traced | Data source versus claim traced | Status |
| --- | --- | --- | --- | --- | --- |
| Route directory and pagination | Yes | Yes | Yes | Yes | Blocked by unwindowed list and unsupported writes |
| Grid/list/table/mobile variants | Yes | Yes | Yes | Yes | Blocked by inconsistent action gating and misleading KPIs |
| Context panel and global action-container sensitive data | Yes | Yes | Yes | Yes | Blocked by dead Broadcast receiver and hidden route-independent subscriber projection |
| Create/edit/view modal | Yes | Yes | Yes | Yes | Create constrained; edit blocked; email lifecycle blocked |
| Hook and active service facade | Yes | Yes | Yes | Yes | Blocked by over-capable API and repeated mounts |
| Duplicate subscribers service | Yes | N/A | Yes | Yes | Retire from active surface after import proof |
| Welcome/custom/bulk receiver path | Yes | Yes | Yes | Yes | Blocked by welcome durable-state split and campaign auditability |
| Policy/table/test authority | Yes | N/A | Yes | Yes | Public insert/admin read proven only |

## Exact Subscriber And Email Flow Exhibits

These line exhibits define the next implementation edge: subscriber rows are marketing/contact truth, not billing, patient, or entitlement truth.

| Exhibit | Code anchor | Current contract break | Implementation target |
| --- | --- | --- | --- |
| Route-local list truth | `frontend/src/components/pages/SubscriptionManagementPage.jsx:103-172,420-423` | Search, filters and KPI totals are derived from the hook's loaded collection, not from a paged admin projection. | Build a paged subscriber read owner with total/count/filter metadata and explicit unavailable/unauthorized states. |
| Direct edit/delete exposure | `frontend/src/components/pages/SubscriptionManagementPage.jsx:203-221,243-256,774-792,808-824` | Edit and delete are wired through route/list/table variants even though the proved table contract is public insert plus admin read. | Keep create/read; disable edit/delete/status/type until an authorized lifecycle command exists. |
| Bulk delete false success | `frontend/src/components/pages/SubscriptionManagementPage.jsx:912-929` | The confirmation action reports selected-row deletion and clears selection while no durable receiver is documented. | Disable/remove until a lifecycle-aware batch receiver returns per-row result and refreshed counts. |
| Mobile paid/revenue semantics | `frontend/src/components/mobile/MobileSubscriptions.jsx:53-78,101-124,170-173,251-277` | `type = paid` becomes paid conversion, monetization and revenue-style copy without payment or entitlement evidence. | Rename to subscriber tier/mix or join a proved billing/subscription outcome projection. |
| Context-panel raw email exposure | `frontend/src/components/context/SubscriptionsPanel.jsx:32-35,74-126` | The shell panel exposes raw subscriber emails and premium counts outside the route-specific read owner. | Restrict to platform-admin context, consume the same bounded projection, and disable Broadcast until receiver mounted. |
| Hook over-capability | `frontend/src/hooks/useSubscription.js:40-70,81-147,176-181` | One hook exposes create, update, delete, status/type, welcome and realtime while every mount full-fetches/subscribes. | Split read projection from explicit email/lifecycle commands; one realtime invalidation owner only. |
| Service duplicate ownership | `frontend/src/services/subscriptionService.js:58-100,154-205,224-282,362-380` and `frontend/src/services/subscribersService.js:45-64,109-165,202-206` | Two services own the same table and broad realtime/mutation behavior. | Keep one active facade and retire duplicate paths after import proof. |
| Welcome lifecycle split | `frontend/src/services/subscriptionService.js:270-299,409-429` | Manual welcome send checks and marks one path, while the worker contract separately depends on `welcome_email_sent`. | One idempotent send command writes the durable lifecycle field used by every sender. |
| Direct email/bulk commands | `frontend/src/components/modals/SubscriptionModal.jsx:174-227,426-572,649-805` | Modal commands can send welcome/custom/bulk email from UI state without a unified campaign result/audit projection. | Add queued/sent/failed per-recipient command state before broad sends are enabled. |
| Unsubscribe endpoint promise | `frontend/src/emails/ivisit106Campaign.js` and `frontend/supabase/functions/payments/sendWelcome/index.ts` | Templates promise an unsubscribe URL, but source topology places handlers under nested function folders and webhook source. | Prove deployed slug, auth/privacy, idempotent unsubscribe writer and send-eligibility exclusion before shipping the link as implemented. |

## Cross-Pass Subscription Register

| Dependency pass or ecosystem owner | Shared object or decision | Why this pass cannot close independently | Required handoff |
| --- | --- | --- | --- |
| Pass 4 identity/security | Admin role and raw email visibility. | Subscriber list exposes personally identifying contact data globally. | Preserve admin-only projection and align all action capability checks to real role calls and RLS. |
| Pass 7 care/content/support | Email content, help destinations and communication expectations. | Campaign copy may direct recipients into support/content workflows. | Route template/content review through the care/content contract rather than embedding unmanaged promises. |
| Pass 8 analytics/realtime/shell | Context panel, analytics/home consumers and broad subscriber channels. | Repeated full loads and realtime cannot be repaired from route UI alone. | Consolidate bounded read/invalidation ownership and truthful analytics labels. |
| Public acquisition surface | Newsletter/signup entry and paid-tier semantics, if any. | Console cannot invent lifecycle or business meaning for rows created outside the patient app. | Prove subscriber intake, unsubscribe, tier and campaign outcome contracts before widening management. |

## Implementation Packages

### 1. Subscriber Owner

Decision:

- Keep `subscriptionService.js` as the active workflow facade.
- Remove `subscribersService.js` from active UI paths.
- Leave `subscribersService.js` as compatibility code until a later cleanup pass proves no imports require it.

Acceptance gate:

- `useSubscription`, `SubscriptionManagementPage`, and `SubscriptionModal` import subscription actions from `subscriptionService.js` only.
- Duplicate mutation/realtime paths are removed from active UI flow, and unsupported update/delete actions are not preserved behind the facade.

### 2. Schema-Current Payload Contract

Source truth:

- `subscribers` includes `email`, `type`, `status`, `new_user`, `welcome_email_sent`, `subscription_date`, `metadata`, `created_at`, and `updated_at`.
- `type` is constrained to `free` and `paid`.
- The current schema has no organization or campaign scope.

Acceptance gate:

- Policy-backed subscriber insert does not silently retry with missing-column fallbacks in normal runtime.
- UI only renders editable fields for operations an authorized receiver actually persists.

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
- Manual send and batch processing cannot both deliver the same pending welcome row.

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
- route, context, navigation and analytics consumers share a bounded projection or invalidation owner
- modal does not create its own table truth
- new-subscriber toast is optional and must not trigger email sends

Acceptance gate:

- Subscriber insert and any future authorized lifecycle-event refreshes the list once.
- No duplicate toasts for one insert.
- No email send occurs from a passive realtime listener.

### 6. Security And Scope

Decision:

- Subscribers are a platform-admin global marketing list in this pass.
- Org admins do not receive subscriber list visibility in this pass.
- Support/content roles do not receive subscriber list visibility in this pass.
- Edit/delete/status/unsubscribe controls are excluded from this implementation slice because current source proves platform-admin reads, not browser management writes.
- Any retained management action requires its own receiver-backed lifecycle authorization before implementation.

Acceptance gate:

- UI copy and filters match the actual table/RLS scope.
- Org admins do not see global subscriber data.
- Subscriber tier copy is not presented as revenue or completed payment without a receiver-backed billing projection.

## Detailed Implementation Checklist

Before code changes:

- Read current subscribers table and Edge Function contracts.
- Use `subscriptionService.js` as the owner service.
- Use `welcome_email_sent = true` as the durable welcome-sent row state.
- Treat subscribers as global platform-admin data.
- Keep `supportFaqsService.js` in the care/content/support subpass, not the subscription subpass.

Read-only/UI cleanup:

- Move page/modal direct email actions behind the chosen owner.
- Add pending/disabled state for allowed create and any authorized welcome/custom/bulk actions; remove or visibly disable unsupported edit/delete/status actions.
- Preserve passive realtime behavior and route repeated subscribers channels through one projection owner.
- Replace generic sent copy with queued/sent/failed copy.
- Add empty/degraded states for no subscribers, unauthorized subscriber scope, and email function unavailable.
- Replace local `Paid Conversion`/`Revenue Dynamics`/`Premium` claims with truthful subscriber tier language unless billing outcome authority is added.
- Remove or disable edit/delete operations consistently across grid, list, table and mobile variants until an authorized receiver exists.
- Disable the context Broadcast action until it opens the single audited email command surface.

L5 repair, only when a deterministic gate fails:

- Add Edge Function idempotency after command-boundary idempotency fails verification.
- Add campaign/send log table only after product requires durable custom/bulk history beyond function responses.
- Add an explicit lifecycle receiver or policy repair only if platform-admin update/delete/status management remains a product requirement.
- Add schema fields only in a future org-scoped subscriber model.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on subscription management.
- Create subscriber with welcome disabled.
- Create subscriber with welcome enabled only after email-command authorization/deployment proof.
- Confirm edit/status/delete controls are absent or disabled under current policy.
- Send welcome to existing subscriber.
- Send custom email to one subscriber.
- Send bulk email to selected subscribers.
- Confirm duplicate-click guards and loading states.
- Confirm directory search/page navigation remains server-backed and distinguishes zero rows from denied/unavailable reads.
- Confirm desktop, mobile, and context variants expose the same authorized command set.
- Confirm no revenue/payment-completion language is produced from subscriber tier alone.

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
