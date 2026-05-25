# Stage 4 L5 State Data Ownership Audit - 2026-05-24

## Status

Initial Stage 4 matrix. Static source review only.

This document follows the documented audit spine after Stage 2 service contracts and Stage 3 capability gaps. It focuses on what each console surface consumes, cannot consume, writes, or bypasses compared with the source-of-truth owner.

## Method

Each row uses this shape:

```text
surface/service -> source of truth -> console consumes -> console cannot consume -> console writes -> bypass/drift -> required owner
```

State ownership labels:

- L1 local UI: modal state, selected row, filters, view mode, transient pending state
- L2 server/query: Supabase table/RPC/Edge Function data that should be loaded through service/query owners
- L3 persisted client: durable client preferences/snapshots
- L4 ephemeral atoms/context: shell UI, panels, modal routing, selected objects
- L5 workflow: lifecycle legality such as emergency dispatch, payment settlement, verification, onboarding, subscriber lifecycle, and visit sync

## L5 Consumption Matrix

| Surface/service | Source of truth | Console consumes | Console cannot consume yet | Console writes/actions | Bypass or drift | Required owner |
| --- | --- | --- | --- | --- | --- | --- |
| Emergency requests | `create_emergency_v4`, console emergency RPCs, payment state, trip/resource truth | Requests, status, service type, patient/hospital/responder snippets, payment status, dispatch actions | Full app creation payload parity, tracking-ready context, route/ETA seed, fallback route flags, complete cash settlement truth | Create/update/cancel/dispatch/complete, cash process, retry payment | Page/context/direct reads and fallback create path can bypass app contract; payment event refetch is page-owned | Emergency domain service/hook plus payment-aware invalidation |
| Cash payment and emergency completion | Payment RPCs, Stripe/webhook/RPC settlement, wallet ledger | Cash eligibility and process actions | Reliable fee deduction proof for current manual console path; estimated-fee eligibility cap | Manual cash processing and completion | Legacy `process_cash_payment`, unsafe success copy, repair/backfill population | Payment/wallet service facade with backend-confirmed settlement |
| Wallet and finance | `wallet_ledger`, `organization_wallets`, `ivisit_main_wallet`, Stripe Edge Functions, payout/payment RPCs | Wallet rows, ledger, projection, cards, payouts/top-up actions, payments | Confirmed org ledger RLS/write capability, app-owned Edge Function authorization, wallet reservation semantics | Top-up, payout, card management, repair/backfill path | Context/page/service triplicate reads; repair path is too normal-UI adjacent | Wallet domain query/service facade |
| Hospitals and capacity | `hospitals`, provider taxonomy, capacity RPC/trigger, app hospital snapshots | Hospital list/detail, modal fields, counts, bed scalars, discovery | Full Explore Care taxonomy, dispatch eligibility classification, Google attribution flags, multi-facility pricing context | CRUD, status/bed edits, discovery/import | Direct capacity/status edits and discovery fallback can bypass canonical availability/discovery contract | Hospital/provider service with capacity and discovery sub-owners |
| Provider catalog and facility media | `providers`, `hospital_media`, discovery/media receivers | Base hospital row and raw `hospitals.image` only | Provider taxonomy CRUD/projection, booking/emergency classification, media source/confidence/selection history | Facility form/image changes without catalog/media row ownership | Console can alter visible hospital truth without operating the app's provider catalog or media provenance | Facility catalog/media owner under hospital operations |
| Pricing | `service_pricing`, `room_pricing`, pricing RPCs, selected hospital quote resolution | Service/room pricing rows and CRUD | Organization-wide pricing truth for multi-hospital orgs; sibling facility divergence | Upsert/delete service and room pricing | Org-admin UI resolves earliest hospital while app quote is selected-hospital scoped | Pricing service/hook scoped by hospital, with explicit org aggregation only if supported |
| Ambulances and responder telemetry | `ambulances`, dispatch RPCs, `console_update_responder_location`, map telemetry projection | Ambulance list/detail, status/location, driver assignment, map location | Canonical active-request-coupled telemetry for generic ambulance updates | CRUD, assign driver, update status/location, dispatch status | Direct CRUD/location/status can bypass active request telemetry and profile assignment mirror | Ambulance operations owner plus scoped map telemetry projection |
| Doctors and scheduling | `doctors`, `profiles`, provider automation, `doctor_schedules`, emergency assignments | Doctor list/detail, profile links, status, scheduling projections | True schedule CRUD/use of `doctor_schedules`, provider-profile automation parity, dispatch doctor assignment truth | Doctor CRUD, invite/profile path, status/schedule edits | Direct doctor CRUD can fight profile-trigger automation; scheduling is status projection | Provider operations owner with doctor/profile/schedule split |
| Clinician emergency assignment | `emergency_doctor_assignments`, `assign_doctor_to_emergency`, request/visit truth | Doctor suggestions and emergency detail context, but no persisted assignment workflow | Assigned clinician state, acceptance/completion/cancelled handoff evidence | No table/RPC-backed Console assignment action found | Emergency operations can display clinicians without recording the canonical handoff assignment | Emergency/provider assignment command owner |
| Users/profiles/admin | Supabase Auth, `profiles`, admin RPCs, org/provider automation | Profile lists, auth users RPC, user stats, role/provider/status fields | Complete current schema field proof for legacy verification/status fields, auth-backed user creation parity | Profile create/update, role/status/delete, invite, BVN verification | Direct profile insert can orphan auth; page-level delete/admin metrics bypass service | Auth/admin/profile service boundary |
| Verification and onboarding | Facility dispatch verification, organization onboarding, profile BVN verification | Verification queues, provider/org approval actions, onboarding form data | Dispatch-authority facility verification through legacy profile/BVN route; live absent legacy receiver fields | Approve/reject provider/org, onboarding signup/hospital insert | Provider verification writes BVN/profile lane; onboarding hospital-as-org identity mismatch | Verification/onboarding workflow owner |
| Visits | `visits`, emergency-to-visit sync trigger, app visit hydration | Visit list/detail, patient/hospital/profile lookups, create/update/delete | Full app hydration fallback, emergency request linkage creation, request-derived visit ownership | Manual visit CRUD, lifecycle status, no-show/cancel/complete | Direct CRUD can fight emergency sync; page owns count/search | Visits read/write owner with request-derived row guard |
| Emergency communication | `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`, chat RPCs | No runtime Console chat surface found; types only | Scoped urgent thread, participants, read state, provider/operator replies | None | Console operates urgent requests while patient app has a communication channel Console cannot consume | Emergency communication owner scoped to operated requests |
| Insurance | `insurance_policies`, storage, app coverage/checkout use | Policy list/detail, analytics, documents | Consolidated current service facade and checkout coverage parity | Policy CRUD, document upload | Duplicate services and duplicate subscriptions | Single insurance policy service under `useInsurance` |
| Insurance billing outcome | `insurance_billing`, completion billing trigger, scoped policy reads | Policy management only; no billing-result surface found | Trigger-created claim/billing result, hospital/admin visibility, exception outcome | None proven | Console can manage policy UI without seeing the billing consequence of completed emergency care | Insurance billing read/exception owner |
| Support tickets | `support_tickets`, app patient support creation, console assignment/status | Ticket list, analytics, CRUD/status/assign | Exact patient-created ticket receipt semantics and assignment/status taxonomy | Create/update/delete/assign | Mostly hook-owned but panel/context duplicate realtime exists | Support tickets service/hook owner |
| Health news/content | `health_news`, public app read/published content | News CRUD, publish state, KPI counts, panel summaries | Centralized KPI/read-summary owner; policy proof for public/private edits | Create/update/delete/publish/import | Page/panel duplicate direct count reads | Health-news service/hook owner |
| Subscribers/email | `subscribers`, email Edge Functions, unsubscribe function, campaign state | Subscriber list, welcome/custom/bulk email actions, analytics | One lifecycle owner for welcome state, unsubscribe, campaign sends, schema-current payload | Subscriber CRUD, welcome email, bulk/custom sends | Duplicate services; runtime schema fallback; page-level Edge send | Subscription service facade and email lifecycle owner |
| Search/trending/analytics | Search RPCs/tables, trend RPCs, app discovery/search events | Search analytics RPCs, trend rows, dashboard analytics | Non-stub trend regeneration truth; production analytics without fallback/demo constants | Track events, update/regenerate trends | Stub success functions and fallback analytics can look real | Search/analytics service owner |
| Dashboard/Bento/Overview | Domain service summaries, page metrics, `PageDataContext` | Cross-domain stats, recent records, wallet/news/support snippets | Trustworthy summaries after domain owner consolidation | Mostly read-only navigation/dashboard actions | Broad context owns server state and mock/realtime; Overview direct reads duplicate | Dashboard summary facade fed by domain owners |
| Map/God mode | Emergency, ambulance, hospital/provider, user/profile projection, route/dispatch truth | Map markers, live stats, dispatch/complete controls, route fallback | Canonical route/ETA and active trip truth for all map actions; provider discovery classification | Dispatch unit, complete mission, responder location | Map projection can become canonical state if not scoped | Map projection owner that consumes emergency/ambulance owners |
| Notifications/preferences/settings | Supabase Auth, notifications, preferences, profile settings | Notifications, profile/settings, theme/sidebar/demo preference | Clean demo-mode connection to production mock paths | Mark read, preference toggles, security/MFA, sign out | Mostly acceptable SDK/service boundaries; demo preference unconnected to PageData mock mode | Auth/preferences/notification services |
| Activity/audit | `user_activity`, `admin_audit_log`, RPCs | Recent activity, activity stats, admin action logs | Guaranteed audit persistence for swallowed failures | Log activity/admin actions | Audit failures can be swallowed while action appears successful | Activity/audit service with failure policy |

## State Ownership Findings

### 1. L5 Workflow Truth Is Mixed With L2 Reads

Emergency, payment, verification, onboarding, subscriber, visit, and wallet flows are not ordinary CRUD. They have lifecycle legality and side effects. The console currently often consumes these through L2 reads or page-owned actions, but the required owner is an L5 workflow/service boundary.

### 2. `PageDataContext` Is Not A Valid L5 Owner

The broad context consumes many domain datasets, stores mock state, and subscribes to realtime tables. It should not decide emergency, wallet, visits, verification, subscriber, or pricing truth. At most it can compose shell summaries from domain-owned selectors.

### 3. Some Surfaces Consume Enough To Render But Not Enough To Operate

Hospitals, pricing, visits, wallet, verification, subscribers, analytics, provider catalog/media, clinician assignments, emergency communication, and insurance billing can render partial context or related rows, but they cannot yet consume the full source-of-truth contract needed for safe operations.

### 4. Some Console Actions Are Semantically Not CRUD

Dispatch, cash process, retry payment, payout, publish, verify, invite, send email, and emergency completion must be treated as lifecycle commands with explicit backend confirmation and auditability.

## Required Stage 4 Follow-Ups

1. Convert this matrix into implementation inputs per pass: emergency, wallet, hospitals/pricing, provider operations, visits, identity/verification/onboarding, content/support/subscribers, analytics/search, and dashboard/map shell.
2. For each pass, mark which rows are safe read-only improvements versus L5 backend contract repairs.
3. Before implementation, choose the first pass by risk and user impact rather than by easiest UI diff.

## Implementation Pass Inputs

These are not implementation instructions yet. They are the Stage 4 handoff inputs that Stage 6 should turn into narrow, ordered plans.

| Pass | Rows covered | Safe read-only/service-owner work | L5/backend contract repair | Why this order matters |
| --- | --- | --- | --- | --- |
| Emergency request lifecycle | Emergency requests, map/God mode, visits linkage, communication, clinician assignment | Move page/context reads behind an emergency query owner; centralize emergency list/count/search; keep modal/detail realtime scoped; replace generic payment-event refetch with domain invalidation; add scoped transition/chat/assignment projections. | Repair fallback create parity, complete/dispatch lifecycle legality, tracking-ready route/ETA consumption, emergency-to-visit creation, chat command authority, and clinician assignment contract. | Emergency is the highest user-safety surface and drives visits, map, payments, communication, and dispatch. |
| Payments, cash, wallet, and payouts | Cash payment, wallet and finance, activity/audit | Create one wallet read facade for wallet, ledger, payments, Stripe status, projection, and profile enrichment; isolate maintenance/repair UI; correct success copy to backend-confirmed states. | Fix cash eligibility/settlement, wallet reservation/sufficiency, Edge Function authorization, ledger RLS/mutation policy, webhook/reflection path, and auditability. | Payment state gates dispatch trust and can create money movement or false completion. |
| Hospitals, availability, discovery, and pricing | Hospitals/capacity, provider catalog/media, pricing, dashboard summaries | Centralize hospital/pricing reads; expose hospital-scoped pricing honestly; route ER wait/capacity UI through one service owner; make discovery fallback explicitly read-only; surface import/media provenance truth. | Route operational capacity/status/wait edits through `update_hospital_availability`; add provider taxonomy/media authority; repair public discovery write authority; preserve facility-scoped pricing semantics. | Hospital and pricing data are consumed by app checkout and dispatch routing; wrong scope silently affects many facilities. |
| Provider operations and telemetry | Ambulances, responder telemetry, doctors, scheduling, map projection | Move ambulance/doctor counts, lookups, and modal support reads behind services; split map telemetry projection from canonical CRUD; consolidate schedule read model. | Replace unsafe direct operational ambulance status/location writes; define driver/profile assignment mirror; use `doctor_schedules` for doctor-shift CRUD while keeping ambulance shift CRUD unavailable without a receiver. | Dispatch quality depends on accurate responder and provider state, but some work can be service-boundary cleanup before backend repair. |
| Identity, admin, verification, and onboarding | Users/profiles/admin, verification/onboarding, notifications/preferences/settings | Move admin metrics/delete RPCs behind profile/admin service; document accepted direct Auth/MFA SDK boundaries; connect demo preference if retained. | Replace raw profile creation with auth/invite-backed user creation; fix provider verification versus facility dispatch verification; repair onboarding hospital/org identity boundary. | Identity errors create long-lived access and ownership defects. Verification copy must not imply dispatch authority from the wrong lane. |
| Visits and clinical history | Visits, emergency request lifecycle | Create visits read model for count/search/hydration; mark request-derived rows read-only or guarded; centralize patient/hospital/profile lookups. | Define canonical creation/repair strategy for fallback emergency rows and request-derived visit lifecycle. | Visits are downstream of emergency truth; do not repair manually in the UI before source ownership is fixed. |
| Content, support, subscribers, and email | Health news/content, support tickets, insurance policies/billing, subscribers/email, notifications | Move health-news KPIs to service; keep support tickets on hook pattern; consolidate subscriber and insurance services; expose fallback/degraded states visibly; add scoped billing-result reads. | Fix subscriber lifecycle owner, insurance policy/billing authority, schema-current payloads, welcome/unsubscribe/campaign state, support RLS/status taxonomy, content authoring policy. | These are less urgent than emergency/payment but visible to patients and operators; subscriber email can duplicate external sends and hidden billing outcomes can mislead support. |
| Search, trending, analytics, and dashboard shell | Search/trending/analytics, dashboard/Bento/Overview, activity/audit | Move analytics raw reads/derivations to services; remove production mock defaults; replace route blank fallback; feed dashboards from domain selectors. | Replace stub trend regeneration and fallback analytics truth; decide audit failure policy. | This pass should follow domain owner cleanup so dashboards summarize truth instead of reproducing drift. |
| Realtime/query invalidation | All rows | Remove global `PageDataContext` table channels after domain hooks own reads; dedupe page/panel direct subscriptions; preserve scoped modal/map channels. | Payment/emergency, responder telemetry, and workflow state changes need contract-aware invalidation, not generic table refreshes. | Realtime changes should happen with or immediately after domain owner consolidation to avoid flicker or stale data. |
| Operational UI feedback | All command surfaces | Add route skeleton, pending/disabled states, row-level/bulk-action guards, degraded/fallback flags, and truthful success copy. | Success copy must wait for lifecycle/settlement/verification truth where backend confirmation is currently incomplete. | UI feedback is valuable but dangerous if it claims completion before source truth exists. |

## Read-Only Versus L5 Repair Classification

| Classification | Safe examples | Not safe until contract repair |
| --- | --- | --- |
| Read-only owner cleanup | Move page count reads into services; dedupe panel KPI reads; replace blank route fallback; remove mock initial state; consolidate subscriptions behind hooks. | Changing status, payment, verification, visit, invite, payout, or dispatch semantics while receiver contracts are still drifted. |
| Service facade consolidation | Wallet read facade; hospital/pricing read service; health-news summary service; visits read model; admin metrics service. | Letting a facade preserve unsafe direct writes just because it moved code out of the page. |
| UI feedback improvement | Pending states, disabled repeated clicks, skeletons, degraded-result labels, safer success copy. | Success messages that imply cash settled, payout reserved, dispatch released, provider verified, or visit synced before backend truth confirms it. |
| Backend/RPC/Edge repair | Cash settlement, wallet reservation, discovery authorization, emergency fallback create parity, onboarding identity, subscriber lifecycle owner. | Running migrations/backfills/cleanup from audit context without an implementation plan and explicit authorization. |

## Risk-Ordered Stage 6 Candidate Plan

1. Emergency lifecycle and cash/payment truth.
2. Wallet/payout/Stripe function and ledger authority.
3. Hospital availability, discovery authority, and pricing scope.
4. Identity, verification, and onboarding authority.
5. Provider operations, ambulance telemetry, doctors, and scheduling.
6. Visits ownership and request-derived history.
7. Subscribers/email, support, content, and notifications.
8. Analytics/search/dashboard truth, `PageDataContext` reduction, realtime dedupe, and route feedback.

This order intentionally handles user-safety, money movement, dispatch authority, and identity before lower-risk dashboard polish. It should be revisited only if a blocking implementation dependency forces a narrower preparatory pass first.

## Stage 4 Completion Criteria

Stage 4 is coherent enough for the broader contract-truth pack when:

- every route/domain row has source truth, console consumption, missing consumption, writes/actions, drift, and required owner
- pass inputs identify read-only owner cleanup versus L5 backend repair
- commit discipline is clear and no doc-only micro-commit is pending
- Stage 6 can start without hidden research for the first selected pass

Current status: initial matrix and pass inputs are present, but Stage 6 should still read the Stage 2 contract exhibits before producing exact implementation steps.

## Commit Discipline

Do not commit this Stage 4 doc alone unless explicitly requested. It belongs with the contract-truth evidence pack once Stage 1-4 docs are internally consistent and resumable.
