# Pass 8 Analytics, Search, Realtime, And Feedback Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, automation run, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers dashboard analytics, search, search telemetry, preferences/demo mode, trending topics, analytics automation, `PageDataContext`, realtime ownership, route loading, and action feedback.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/components/pages/Overview.jsx`
- `frontend/src/components/context/DashboardPanel.jsx`
- `frontend/src/components/context/AnalyticsPanel.jsx`
- `frontend/src/components/modals/AnalyticsModal.jsx`
- `frontend/src/components/navigation/QuickSearch.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/components/common/NotificationCenter.jsx`
- `frontend/src/components/common/ConsoleStartupOverlay.jsx`
- `frontend/src/components/pwa/InstallPrompt.jsx`
- `frontend/src/components/pwa/OfflineIndicator.jsx`
- `frontend/src/components/pwa/UpdateNotification.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/App.js`
- `frontend/src/contexts/FeedbackContext.jsx`
- `frontend/src/contexts/PWAContext.jsx`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/contexts/MapContext.jsx`
- `frontend/src/hooks/useAnalytics.js`
- `frontend/src/hooks/useActivity.js`
- `frontend/src/hooks/useContextAction.js`
- `frontend/src/services/analyticsService.js`
- `frontend/src/services/activityService.js`
- `frontend/src/services/notificationService.js`
- `frontend/src/services/searchService.js`
- `frontend/src/services/searchEventsService.js`
- `frontend/src/services/searchHistoryService.js`
- `frontend/src/services/searchSelectionsService.js`
- `frontend/src/services/preferencesService.js`
- `frontend/src/services/supabaseHelpers.js`
- `frontend/src/services/trendingTopicsService.js`
- `frontend/src/services/analyticsAutomationService.js`
- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `frontend/supabase/docs/API_REFERENCE.md`
- `frontend/supabase/docs/SCHEMA_SNAPSHOT.md`

Observed source signals:

- `PageDataContext` initializes with mock emergency, analytics, doctors, visits, verification, and support data.
- `PageDataContext` falls back to mock data on some fetch failures and owns many global realtime channels.
- `App.js` mounts `BentoHome` at `/` and `Analytics` at `/analytics`; `Overview.jsx` is source-present but is not the live dashboard route found in the route scan.
- `App.js` also renders `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` outside the routed shell. PWA install/offline/update notices and feedback bursts therefore exist across authenticated and public routes, while a visible hard-coded version badge is rendered on every route.
- `FeedbackProvider` can create an audio context and vibration for interaction feedback; current mobile callers explicitly opt into sound and haptic behavior. This is an interaction-surface contract requiring reduced-motion/accessibility and operator-setting disposition, not a data-owner issue.
- `ContextPanel` mounts when the desktop/tablet context panel is open, calls `useSubscription()` independent of whether the active route is `/subscriptions`, and renders `DashboardPanel` for `/` and `AnalyticsPanel` for `/analytics`.
- `AppShell` always renders `ContextAwareFAB` and `DynamicBottomBar`; each calls `useInsurance()`, `useSupportTickets()` and `useSubscription()` before its viewport-based `return null`. Thus two hidden-or-visible shell controls can fetch and subscribe to care/subscriber domains on every route, independent of their command modal being opened.
- `Analytics.jsx` contains deterministic fallback/predictive values and role-specific analytics rendering.
- The live `/analytics` route permits provider-level access, but `Analytics.jsx` includes `fetchSubscriptionAnalytics()` in its aggregate load and `analyticsService.getAnalyticsData()` includes `getSubscriptionAnalytics()` in a single `Promise.all`. Pass 7 proved subscriber reads are admin-only, so provider/org analytics can fail or silently lose a subscriber slice because a broader route consumes a narrower authority.
- `analyticsService` reports `successRate: 95` when it sees no emergency rows; `AnalyticsModal` reports a default `12.0m` response time when the value is zero/unavailable; `BentoHome` substitutes response, completion, ambulance and hospital values when context data is absent.
- Live `BentoHome` renders unsupported performance copy including a fixed patient satisfaction value and fixed response/request trend statements. `Analytics.jsx` also renders fixed trend labels such as faster response or excellent performance independently of computed comparison windows.
- `useAnalytics` is not mounted by the live analytics route in the inspected import scan; its timestamped cache key and partial range filtering remain dormant-risk code, not the current live analytics owner.
- `QuickSearch` uses `searchService.searchAll`, recent searches, trending searches, and record selection.
- `QuickSearch` is shell navigation UI and searches doctors, hospitals, ambulances, visits, emergency requests, and profiles, including profile email. It has no per-role result-type projection; table/RLS outcomes alone decide whether sensitive categories appear or collapse to empty.
- `searchEventsService`, `searchHistoryService`, and `searchSelectionsService` exist but are not directly imported by UI.
- `searchSelectionsService` includes privacy comments removing broad access, while search analytics may aggregate behavior.
- `preferencesService` exposes demo mode but is not actively wired.
- `SettingsPage` renders a notification switch with `checked={true}` and no preference receiver; the mounted notification center fetches and marks notifications regardless of that displayed setting. `preferencesService` is source-present but no mounted import was found in the pass scan.
- The preferences schema defaults `demo_mode_enabled` to true while `preferencesService.createUserPreferences()` writes false, and neither is connected to `PageDataContext.useMockData`; production mock behavior is therefore not governed by an explicit operator preference.
- `NotificationCenter` performs a user-scoped, bounded read (`30`) and scoped insert subscription with visible loading state. `notificationService` retries legacy inserts without `action_data`, which can remove navigation/action metadata while still rendering a delivered notification.
- `PageDataContext` reads recent activity through the bounded `get_recent_activity` RPC but also subscribes globally to `user_activity`; `useActivity` exposes a second global activity subscription path. The dashboard feed is a recent preview and must not be labeled as complete audit history.
- `analyticsAutomationService` calls trend update RPCs and reads trending views/history.
- `BentoHome` assumes a hard-coded public Supabase map image asset, and `DashboardPanel` defines a dormant `/api/backup` handler without a named audited receiver or failure-facing workflow.
- Live routing uses `App.js` plus `ProtectedRoute`, while dormant `RouteGuard` / `config/routes.jsx` declarations conflict for dashboard and map access; shell route feedback cannot rely on two divergent access doctrines.
- `DashboardPanel` dispatches `openAnalyticsModal` for its Report control without mounting an analytics receiver on the dashboard route; map and pricing controls also expose event/receiver gaps assigned to their domain passes.
- `DashboardPanel` renders a `realTimeEnabled` switch and alert threshold inputs that update component-local state only; they do not govern `PageDataContext` subscriptions, alert evaluation, persistence, or a command receiver. The source-defined backup and analytics-navigation handlers were not found wired to visible controls in that rendered panel and are dormant until proven otherwise.
- `QuickSearch` starts six parallel category searches per query without visible cancellation/sequence protection; dashboard and analytics sources continue broad multi-domain reads whose partial/failure and freshness limits are not explicit.
- `searchService.searchAll()` rejects the whole combined response when one category query fails; `QuickSearch` displays the resulting empty array as no results rather than partial/error/unauthorized. It also bounds each category independently at 50 with no partial/completeness marker.
- `withTimeout()` only races a timer against the unresolved operation and does not cancel it, so it cannot by itself prevent late stale list/search responses after a page or filter change.

## User Flow

Operator path:

1. Land on dashboard/Bento/overview and see truthful summaries.
2. Navigate between routes and receive immediate loading/skeleton feedback.
3. Open analytics and understand live, derived, degraded, or unavailable values.
4. Use QuickSearch and optionally record history/selection/analytics under correct privacy rules.
5. See trends only when they are live or clearly labeled.
6. Realtime updates refresh the correct domain without duplicate fetch storms.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Dashboard server truth | `PageDataContext` owns many domain reads and mock fallbacks. | Domain selectors plus shell summary facade. |
| Mock/demo mode | Failed fetch can fall back to mock-looking data. | Explicit demo mode or degraded empty state. |
| Analytics derivation | Page and service both derive metrics/fallbacks. | Analytics owner with source labels. |
| Analytics role authority | Provider-accessible analytics composes admin-only subscriber analytics into a single aggregate load. | Scope each aggregate by authorized audience and isolate unavailable slices without failing allowed operational metrics. |
| Metric evidence | Dashboard, analytics and modal surfaces show default/fixed rates, response times and trend language as measured values. | Computed comparison windows or explicit unavailable/demo labels; no substituted operational claims. |
| Search telemetry | QuickSearch records through `searchService`; telemetry services are orphaned. | Search owner with privacy-aware history/event/selection policy. |
| Search exposure and failure | Shell search can request profile emails and clinical/operational rows across roles, and one denied category becomes an indistinguishable empty result. | Per-role result projection plus sequenced, bounded partial/error handling. |
| Trending topics | Manual/stub/live signals can blur. | Trend owner with live/manual/stub/unavailable label. |
| Realtime | `PageDataContext` subscribes to many tables globally. | One owner per domain/table family, with map/modal scoped exceptions. |
| Route/action feedback | Some route and action paths can blank or overclaim success. | Shell loading/pending/degraded feedback standard. |
| Globally mounted utility feedback | PWA banners, interaction bursts/audio/haptics and a visible hard-coded version badge mount independently of route/domain workflow. | Deliberately owned shell utilities: truthful build/version display or no debug artifact, accessible preference-aware interaction feedback, and tested install/offline/update behavior. |
| Public asset and dormant backup handler | Dashboard assumes a public Storage asset; source contains an unproved `/api/backup` handler not evidenced as a rendered current control. | App-owned stable asset delivery; remove dormant command or enable only through an authorized/audited operations boundary. |
| Dashboard/map route doctrine | Live guard and dormant route configuration disagree about public versus operational access. | One routed shell access authority with visible allowed/rejected/loading states. |
| Dashboard report entry | Dashboard Report dispatches a page-local modal event whose receiver is mounted only on other routes. | Deliberate analytics navigation or mounted dashboard report projection with accurate source labels. |
| Search and aggregate fetch reliability | Parallel search/summary fetches can fail or complete out of order without a declared partial/stale result contract. | Query-sequenced or cancellable reads with bounded aggregate/search scope and visible partial/degraded states. |
| Dashboard switches and thresholds | Visible realtime and alert settings change local component state only while global channels remain active. | Persisted, authorized configuration with a real runtime receiver, or remove disabled-looking controls. |
| Notification preference and action metadata | Settings claims a notification toggle without wiring; legacy insert retry can discard notification action metadata. | One own-user notification preference owner and deliberate compatibility behavior that preserves or visibly omits actions. |
| Recent activity and audit truth | Dashboard renders a bounded activity preview while multiple global channels may observe activity. | One activity projection owner, labeled recent window, and separately proven durable privileged audit trail. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View dashboard/analytics metric | Scoped read projection or explicitly unavailable state | Domain facades and guarded analytics reads | No mock or constant operational value presented as measured truth. |
| View subscription-derived analytics | Admin-only subscriber projection or excluded slice | Subscriber authority proved in Pass 7 | General provider analytics must not call admin-only subscriber reads or fail because that slice is unavailable. |
| Search and retain own recent history/selection | Authorized user telemetry CRUD/insert | `search_history`, `search_selections`, `search_events` through active search owner | Keep private/history scope and avoid duplicate adapter owners. |
| View trends | Scoped read projection | `trending_topics` / `get_trending_searches` | Label source; do not imply successful regeneration. |
| Regenerate/manage trends | Conditional admin CRUD or disabled command | Admin table policy exists; generation command is stubbed | Permit only honest manual administration or disable automatic regeneration. |
| View activity | Guarded read projection | `get_recent_activity`, `get_activity_stats` | Consolidate owner; activity is not privileged write audit. |
| View privileged audit | Backend-derived read-only evidence | `admin_audit_log` | Require durable guarded write policy before relying on audit logging. |
| Edit settings | Own-user CRUD subset | `preferences` | Only signed-in operator settings; no patient consent/demo substitution. |
| View/mark notification | Own-user bounded read and read-state mutation | `notifications` through `NotificationCenter` / `notificationService` | Keep user scope and loading feedback; do not promise an action target when compatibility fallback discarded it. |
| Realtime/route feedback | UI/read invalidation behavior | Domain hook/query owners and skeletons | No global context canonical server state or blank navigation pause. |
| Display PWA/install/update/offline and interaction feedback | Shell-owned browser/UI behavior | `PWAProvider`, `FeedbackProvider`, and their mounted surfaces | Keep immediate feedback intentional and accessible; do not expose a hard-coded debug version marker as operational truth. |
| Trigger system backup | Excluded until authorized workflow exists | Dormant handler only; no rendered trigger or named backend receiver proved | Remove dormant handler or implement only under a separately approved auditable operations command. |
| Navigate dashboard or operational map | Role-scoped UI access and route feedback | Consolidated live route/navigation authority | Do not reuse dormant contradictory config; allowed and rejected navigation render immediate honest feedback. |
| Open dashboard report | Read navigation or scoped analytics projection | Verified analytics owner and mounted route surface | Do not leave a visible report action dependent on an absent route-local listener. |
| Search across operational records | Scoped read plus user telemetry | Search owner with request sequencing and partial-result policy | Older query results cannot replace newer input, and one category failure cannot silently misstate total search availability. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Search and trends | own query/history/selection/event identity, result source, trend value/source/time and aggregation provenance | Keep active search telemetry scoped; disable stub-success regeneration and never fabricate ranked production results. |
| Activity and privileged audit | actor/action/entity/time/details plus permission scope and durable write proof for critical audit | Activity RPCs are a display projection, not proof that a destructive command was durably audited. |
| Dashboard, settings and realtime | metric source/empty/unavailable state, operator notification preference, domain invalidation/channel owner and pending route state | Remove mock/constants as operational truth and leave patient consent/demo preferences outside Console operational settings. |

## Mounted Surface Read, Exposure, And Operation Closure

| Surface or acquisition path | Mounted status and audience | Reads or visible claim | Mutation/action path | Deterministic audit outcome |
| --- | --- | --- | --- | --- |
| `/` `BentoHome` | Live route for allowed dashboard roles in `App.js`. | Uses global PageData data plus subscriber analytics; displays response/completion/fleet/hospital summary and fixed performance language. | Refresh and navigation actions. | Broken truth boundary: default values and unsupported comparative labels must be removed or explicitly demo/unavailable; subscriber slice must obey admin scope. |
| Dashboard `ContextPanel` / `DashboardPanel` | Live side panel when opened on `/`; `ContextPanel` invokes `useSubscription()` while open. | Emergency, analytics, doctor, verification and recent activity projections; live indicator based only on `useMockData`. | Report emits `openAnalyticsModal`; visible realtime switch and thresholds update local state only. | Broken receiver and configuration boundary: report receiver absent on `/`; switch/thresholds do not control or persist system behavior; context-open subscriber fetch adds duplicate ownership. |
| `ContextAwareFAB` / `DynamicBottomBar` | Both are always rendered by `AppShell`; each hook executes before desktop/mobile early return. | Each mounts insurance, support-ticket and subscriber hooks independent of current route or whether its modal is opened. | Later opens domain command modals when visible for the relevant viewport/route. | Critical hidden acquisition path: eliminate route-independent sensitive/full-list reads and broad channels; load command dependencies only for an authorized active surface/action. |
| `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` | Always mounted outside the routed shell, including public/auth routes. | Install/offline/update UI, interaction burst/audio/haptic feedback, and a visible hard-coded `v1.0.33` badge. | PWA install/update/dismiss actions and feedback calls from mobile controls. | Shell utility disposition required: remove production debug artifact or bind it to authoritative build metadata; test PWA status behavior; define accessible feedback preferences/reduced-motion behavior. No server CRUD exposure was found in these providers. |
| `PageDataContext` | Mounted above all application routes for authenticated users. | Broad emergency, verification, analytics, doctors, visits, hospitals, ambulances, profiles, support, insurance, wallet, activity, pricing and organizations reads; mock-initialized values. | Refreshes from broad table subscriptions. | Critical shell ownership defect: route-independent reads can leak sensitive/bounded/incomplete state and duplicate all domain owners; support failure can turn broad shell data into mock mode. |
| `/analytics` `Analytics.jsx` | Live provider-or-higher route. | Direct counts/lists plus subscriber analytics; predictive empty intervals and fixed trend labels. | Export and modal event listeners mounted only on this page. | Broken authority/truth boundary: provider-visible analytics composes admin-only subscriber read; computed versus fallback and scope completeness are not distinguishable. |
| `AnalyticsPanel` / `AnalyticsModal` | Panel is live on `/analytics`; modal is received where individual pages mount listeners. | Panel repeats PageData metrics; modal accepts heterogeneous domain data and uses generic labels/default response time. | Open/report/export navigation only. | Broken semantic projection: default `12m`, generic health/in-flow labels and subscription revenue/retention wording must be backed by actual fields or removed. |
| `Overview.jsx` | Source-present but no live route import found in inspected route scan. | Static chart/trend and fixed average response logic. | Its own generic realtime subscription. | Dormant-risk only: do not implement around it; retire or explicitly remount only after truth contract is rebuilt. |
| `QuickSearch` / `searchService` | Live shell search entry for navigational surfaces. | Six record categories, including profile email and emergency/visit detail, plus recent/trending searches; each category capped at 50. | Own history/event/selection recording. | Broken access/reliability boundary: define role-safe categories/fields, sequence queries, label partial/capped results, and distinguish denied/error from no match. |
| Search telemetry, trends and analytics adapters | `searchService` is live; separate event/history/selection services, search analytics and trend automation have no rendered import proved in this pass. | Trend RPC read and service-only analytics/fallbacks. | Service-only CRUD/realtime/regeneration APIs. | Keep dormant adapters out of implementation surface until guarded receiver exists; no fake fallback rankings or no-op regeneration success. |
| `NotificationCenter` / `notificationService` | Live through smart header/top navigation, user scoped. | Latest 30 own notifications with loading skeleton and user-filtered realtime inserts. | Mark read; producers create notification records. | Mostly aligned projection, with compatibility gap: fallback insert deletes `action_data`, so action-capable notification semantics need an explicit contract. |
| `SettingsPage` / `preferencesService` | Settings page live; preference service unmounted in source scan. | Displays notification switch as always checked; schema/service disagree on default demo mode and mock state is disconnected. | No wired preference update from the visible notification switch. | Broken settings claim: wire a deliberate operator preference or render no toggle; do not conflate patient privacy/demo fields with console shell truth. |
| Activity feed / `activityService` | Dashboard consumes PageData recent activity; separate hook exists. | Bounded recent activity RPC projection, transformed into visible feed. | Multiple service helpers log events; broad activity realtime paths exist. | Partial read only: label preview scope, consolidate channel ownership, and separately prove audit durability for critical commands. |
| `MapContext` shell projection | Mounted across shell independent of `/map`. | Emergency/ambulance/hospital map feeds and user-location assumptions traced in Passes 1, 3 and 5. | Map selection/location events. | Global dependency closure: Pass 8 removes duplicate shell ownership while domain passes retain scoped map projections. |

## Cross-Pass Global Projection Register

| Domain truth consumed by global shell/analytics/search | Earlier domain owner | Pass 8 closure requirement |
| --- | --- | --- |
| Emergency request status, response, map and cash/payment release | Pass 1 emergency/payment | Metrics and search/modal labels must project backend-confirmed lifecycle only; no fabricated response/success claims. |
| Wallet, payments, ledger and organization balances | Pass 2 wallet | Shell previews must stay bounded and labeled; analytics cannot imply complete financial totals from preview rows. |
| Hospitals, capacity, pricing and map facility discovery | Pass 3 facilities | Hospital/fleet/capacity totals must not be derived from a capped/unbounded shell list; the confirmed 1000-hospital failure remains an implementation gate. |
| Profiles, verification, organizations and route authority | Pass 4 identity | Search profile fields, analytics roles, and settings/notifications need proved role and own-user scope. |
| Ambulances, doctors, map telemetry and scheduling | Pass 5 provider operations | Map and dashboard fleet/provider projections must be bounded and use one telemetry/read owner. |
| Visits and clinical record context | Pass 6 visits | Search and analytics expose visit/emergency-linked fields only through authorized projections and truthful lifecycle totals. |
| Insurance, support, content, subscriptions and email delivery | Pass 7 care/content/support/subscribers | Hidden shell FAB/bottom-bar mounts cannot fetch sensitive/full lists or broad channels on every route; shell cannot switch to fake data on support failure or call admin-only subscriber reads from provider/viewer dashboards; subscription language needs delivery/payment proof. |
| Public acquisition and patient-facing product truth | `ivisit` public subscriber owner and `ivisit-app` patient owner | Console search/analytics are operational projections only; they must not invent public conversion, patient satisfaction or patient emergency outcome truth. |

## Pass 8 Deterministic Closure Register

| Audit unit | Required proof before implementation pass is complete | Current determination |
| --- | --- | --- |
| Live route and mount inventory | Every dashboard/analytics/search/notification/settings consumer classified live or dormant. | Source-traced for primary Pass 8 surfaces; implementation pending. |
| Dashboard metric truth | Every visible number/label has source, scope, completeness and empty/error state. | Failed: mock/default/fixed trend and subscriber-scope claims present. |
| Cross-role analytics access | Provider/org/sponsor/admin routes load only authorized slices. | Failed: live analytics and shell subscription dependency exceed subscriber read proof. |
| Search read/render/privacy | Each result category and visible field has role scope, bounds, sequencing and error state. | Failed: profile email/clinical categories and whole-result failure are not surfaced deliberately. |
| Search telemetry/trending | One live owner, privacy scope, source provenance and honest fallback/regeneration state. | Partial: active owner identified; dormant duplicate adapters/automation remain unapproved. |
| Realtime ownership | Each table/channel has one owner plus justified scoped projections. | Failed: PageData and map/activity/global consumers duplicate domain paths. |
| Feedback and route transitions | Skeleton/pending/failed/unauthorized rendering is truthful for actions and navigation. | Partial: some skeletons exist; blank lazy fallback, dead report event and inert dashboard controls remain. |
| Notifications/preferences | Own-user notification lifecycle and settings receiver agree, including compatibility action metadata. | Failed: visible toggle is unwired and fallback creation can discard action payload. |
| Activity/audit | Recent operational feed separated from durable privileged-command evidence. | Partial: recent feed exists; single owner and critical-command audit proof remain required. |

## Implementation Packages

### 1. PageDataContext Reduction

Reduce `PageDataContext` to:

- shell-level summary selectors
- route/navigation support
- optional composition of domain hook outputs
- explicit demo mode only if product-approved

Acceptance gate:

- `PageDataContext` no longer owns durable domain server truth for emergency, visits, doctors, pricing, support, organizations, or analytics.

### 2. Analytics Truth Labels

Analytics outputs must say whether data is:

- live
- derived
- cached
- partial
- degraded
- unavailable
- demo/manual

Acceptance gate:

- Analytics UI does not show deterministic fallback values as production truth.

### 3. Search Telemetry And Privacy

Define policy for:

- search events
- search history
- search selections
- recent searches
- trending searches
- admin aggregate analytics
- user-sensitive detail visibility

Acceptance gate:

- Keep `searchService.js` as QuickSearch's active read/event owner, repair its ambulance projection, and leave separate telemetry CRUD/realtime adapters dormant unless a guarded analytics use case is introduced.
- Admin analytics never expose user-sensitive search history without policy proof.

### 4. Trending And Automation

Classify trend generation:

- RPC-generated
- view-derived
- manual curated
- stub/unavailable
- disabled

Acceptance gate:

- Regeneration actions have pending/failure state and cannot return success for a no-op stub.

### 5. Realtime Ownership

For each table family, define one owner:

- emergency requests/payments
- hospitals/pricing
- visits
- doctors/ambulances/telemetry
- support/subscribers
- organizations/verification
- activity/audit
- search/trending

Acceptance gate:

- Global channels in `PageDataContext` are removed or justified after domain owners exist.

### 6. Loading, Pending, And Route Feedback

Apply console-wide feedback doctrine:

- route skeletons for important routes
- compact table/list skeletons
- row/action pending keys
- disabled duplicate action controls
- backend-confirmed success copy
- degraded/unauthorized empty states

Acceptance gate:

- Navigation and primary commands acknowledge intent immediately without false completion claims.

### 7. Dashboard Asset And Maintenance Boundaries

- Replace or validate the hard-coded public map asset through a stable, deliberately public delivery path.
- Remove or disable the backup action until a named authenticated receiver, audit evidence and result lifecycle are proved.

Acceptance gate:

- Dashboard media does not rely on an unverified public bucket assumption, and no backup action can imply completion from an unproved endpoint.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on dashboard, overview, analytics, quick search, and route transitions.
- Mobile and desktop viewport checks for route skeleton and compact loading states.
- Console error scan after route changes.

Backend/RLS/RPC:

- Analytics query fixture tests where available.
- Search privacy/RLS tests for events, history, selections.
- Trending RPC/view proof before enabling regeneration.
- Realtime subscription count/cleanup smoke.

Stop conditions:

- Do not replace mock fallbacks with new fake values.
- Do not expose user search history broadly.
- Do not refactor all route loading while domain owner passes are still unstable unless route shell is isolated.
