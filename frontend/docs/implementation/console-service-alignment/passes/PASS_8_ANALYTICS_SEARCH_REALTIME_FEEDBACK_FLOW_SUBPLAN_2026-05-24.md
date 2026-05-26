# Pass 8 Analytics, Search, Realtime, And Feedback Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, automation run, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers dashboard analytics, search, search telemetry, preferences/demo mode, trending topics, analytics automation, `PageDataContext`, realtime ownership, route loading, and action feedback.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/components/pages/Overview.jsx`
- `frontend/src/components/mobile/MobileAnalytics.jsx`
- `frontend/src/components/mobile/MobileDashboard.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`
- `frontend/src/components/dashboard/HospitalFleetManager.jsx`
- `frontend/src/components/context/DashboardPanel.jsx`
- `frontend/src/components/context/AnalyticsPanel.jsx`
- `frontend/src/components/modals/AnalyticsModal.jsx`
- `frontend/src/components/navigation/QuickSearch.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/components/navigation/NotificationCenter.jsx`
- `frontend/src/components/common/NotificationCenter.jsx`
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/components/common/ConsoleStartupOverlay.jsx`
- `frontend/src/components/pwa/InstallPrompt.jsx`
- `frontend/src/components/pwa/OfflineIndicator.jsx`
- `frontend/src/components/pwa/UpdateNotification.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/App.js`
- `frontend/src/index.js`
- `frontend/src/serviceWorkerRegistration.js`
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
- `BentoHome` mounts `MobileDashboard` on small viewports; it renders completion target comparisons, paid-member language and facility/fleet summary claims from the same global/fallback-prone dashboard data, so mobile dashboard truth is independently in the live surface boundary.
- `MobileDashboard` also renders a patient-only `Medical Services` strip with tappable `Book a Visit`, `Medical History` and `Emergency SOS` rows whose handlers are empty functions; it advertises canonical patient flows inside Console without navigation or command receivers.
- `MobileDashboard` includes visible corrupted separator text in fleet-state expanded copy, so mobile dashboard implementation must pass the same encoding gate as finance and analytics surfaces.
- `App.js` also renders `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` outside the routed shell. PWA install/offline/update notices and feedback bursts therefore exist across authenticated and public routes, while a visible hard-coded version badge is rendered on every route.
- `index.js` actively calls `serviceWorkerRegistration.register()` even though `serviceWorkerRegistration.js` retains stale commentary saying registration is not called by default. PWA update/offline behavior is deployed startup scope, not dormant utility code.
- `FeedbackProvider` can create an audio context and vibration for interaction feedback; current mobile callers explicitly opt into sound and haptic behavior. This is an interaction-surface contract requiring reduced-motion/accessibility and operator-setting disposition, not a data-owner issue.
- `ContextPanel` mounts when the desktop/tablet context panel is open, calls `useSubscription()` independent of whether the active route is `/subscriptions`, and renders `DashboardPanel` for `/` and `AnalyticsPanel` for `/analytics`.
- `AppShell` always renders `ContextAwareFAB` and `DynamicBottomBar`; each calls `useInsurance()`, `useSupportTickets()` and `useSubscription()` before its viewport-based `return null`. Thus two hidden-or-visible shell controls can fetch and subscribe to care/subscriber domains on every route, independent of their command modal being opened.
- `Analytics.jsx` contains deterministic fallback/predictive values and role-specific analytics rendering.
- `Analytics.jsx` exposes a live CSV export in its page header, passes the same export callback to `MobileAnalytics` as `Generate Analytics Report`, and receives `exportAnalytics` from `AnalyticsPanel`; the exported rows serialize the same `stats`, subscription, emergency-type, request-status and response-time state that can contain fallback or unauthorized slices.
- The live `/analytics` route permits provider-level access, but `Analytics.jsx` includes `fetchSubscriptionAnalytics()` in its aggregate load and `analyticsService.getAnalyticsData()` includes `getSubscriptionAnalytics()` in a single `Promise.all`. Pass 7 proved subscriber reads are admin-only, so provider/org analytics can fail or silently lose a subscriber slice because a broader route consumes a narrower authority.
- `analyticsService` reports `successRate: 95` when it sees no emergency rows; `AnalyticsModal` reports a default `12.0m` response time when the value is zero/unavailable; `BentoHome` substitutes response, completion, ambulance and hospital values when context data is absent.
- `AnalyticsModal` is shared by emergency, hospital, ambulance, doctor, visit, user, verification, insurance, support, news, subscriptions, organization, pricing, wallet and analytics routes; it is a renderer for domain projections, not evidence that those route metrics are authoritative.
- Live `BentoHome` renders unsupported performance copy including a fixed patient satisfaction value and fixed response/request trend statements. `Analytics.jsx` also renders fixed trend labels such as faster response or excellent performance independently of computed comparison windows.
- `useAnalytics` is not mounted by the live analytics route in the inspected import scan; its timestamped cache key and partial range filtering remain dormant-risk code, not the current live analytics owner.
- `QuickSearch` uses `searchService.searchAll`, recent searches, trending searches, and record selection.
- `QuickSearch` is shell navigation UI and searches doctors, hospitals, ambulances, visits, emergency requests, and profiles, including profile email. It has no per-role result-type projection; table/RLS outcomes alone decide whether sensitive categories appear or collapse to empty.
- `searchEventsService`, `searchHistoryService`, and `searchSelectionsService` exist but are not directly imported by UI.
- `searchSelectionsService` includes privacy comments removing broad access, while search analytics may aggregate behavior.
- `preferencesService` exposes demo mode but is not actively wired.
- `SettingsPage` renders a notification switch with `checked={true}` and no preference receiver; the mounted notification center fetches and marks notifications regardless of that displayed setting. `preferencesService` is source-present but no mounted import was found in the pass scan.
- Desktop `SettingsPage` also renders a static `Free Tier` plan and an `Upgrade` button with no receiver, while its mobile variant does not show that plan action. Subscription/billing status cannot be asserted from a viewport-specific static card.
- The preferences schema defaults `demo_mode_enabled` to true while `preferencesService.createUserPreferences()` writes false, and neither is connected to `PageDataContext.useMockData`; production mock behavior is therefore not governed by an explicit operator preference.
- `NotificationCenter` performs a user-scoped, bounded read (`30`) and scoped insert subscription with visible loading state. `notificationService` retries legacy inserts without `action_data`, which can remove navigation/action metadata while still rendering a delivered notification.
- On notification-read failure, `notificationService.getNotifications()` writes the requesting user UUID plus raw backend error details/hint/object to the browser console while returning an empty list, collapsing failed delivery into empty presentation and an identity-bearing diagnostic.
- `components/navigation/NotificationCenter.jsx` contains fixed incident/user notification rows, but no live importer was found; the mounted header imports `components/common/NotificationCenter.jsx`. The mock menu is dormant/excluded, not live evidence.
- `components/common/ErrorBoundary.jsx` uses a production `console.error` call as its monitoring path and includes the full route URL, stack and component stack. Failure on an object-bearing route can disclose identity/context through diagnostics while the operator sees only a generic error page.
- `PageDataContext` reads recent activity through the bounded `get_recent_activity` RPC but also subscribes globally to `user_activity`; `useActivity` exposes a second global activity subscription path. The dashboard feed is a recent preview and must not be labeled as complete audit history.
- The live feed renders `activity.description` through `transformActivityData()`. Current emergency activity writers include pickup/destination address values in description/metadata, and provider verification activity writes provider email/username metadata. Activity is therefore an identity/location exposure projection as well as an audit/realtime ownership issue.
- `analyticsAutomationService` calls trend update RPCs and reads trending views/history.
- `BentoHome` assumes a hard-coded public Supabase map image asset, and `DashboardPanel` defines a dormant `/api/backup` handler without a named audited receiver or failure-facing workflow.
- `HospitalFleetManager.jsx` contains hard-coded staff, incident, fleet and performance values plus an `Export Report` control, but no importing/mounted consumer was found in the active source scan. It is dormant mock operational UI, not audited dashboard capability.
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
| Analytics CSV/report export | Live desktop, mobile and analytics-panel actions download the active aggregate state, including any fallback metric or admin-only subscriber slice already loaded into the page. | Export projection with actor scope, included datasets, time window, completeness/degraded labels and unavailable behavior; no download of unproved operational claims. |
| Shared analytics modal reuse | Domain pages mount one modal with route-specific arrays/stats, and emergency mode substitutes `12.0m` for absent or zero response time. | Each route supplies an owner-backed typed projection with scope/window/unavailable semantics; the modal renders no invented defaults or generic confidence language over unproved data. |
| Search telemetry | QuickSearch records through `searchService`; telemetry services are orphaned. | Search owner with privacy-aware history/event/selection policy. |
| Search exposure and failure | Shell search can request profile emails and clinical/operational rows across roles, and one denied category becomes an indistinguishable empty result. | Per-role result projection plus sequenced, bounded partial/error handling. |
| Trending topics | Manual/stub/live signals can blur. | Trend owner with live/manual/stub/unavailable label. |
| Realtime | `PageDataContext` subscribes to many tables globally. | One owner per domain/table family, with map/modal scoped exceptions. |
| Route/action feedback | Some route and action paths can blank or overclaim success. | Shell loading/pending/degraded feedback standard. |
| Globally mounted utility feedback | PWA banners, interaction bursts/audio/haptics and a visible hard-coded version badge mount independently of route/domain workflow. | Deliberately owned shell utilities: truthful build/version display or no debug artifact, accessible preference-aware interaction feedback, and tested install/offline/update behavior. |
| Public asset and dormant backup handler | Dashboard assumes a public Storage asset; source contains an unproved `/api/backup` handler not evidenced as a rendered current control. | App-owned stable asset delivery; remove dormant command or enable only through an authorized/audited operations boundary. |
| Dashboard/map route doctrine | Live guard and dormant route configuration disagree about public versus operational access. | One routed shell access authority with visible allowed/rejected/loading states. |
| Dashboard report entry | Dashboard Report dispatches a page-local modal event whose receiver is mounted only on other routes. | Deliberate analytics navigation or mounted dashboard report projection with accurate source labels. |
| Mobile dashboard patient-care entries | The live mobile dashboard renders `Book a Visit`, `Medical History` and `Emergency SOS` as interactive rows for a patient role, but each uses an empty click handler. | Decide ecosystem ownership deliberately: route authenticated patient flows to the canonical patient app surface or remove/mark unavailable in Console; do not count dead controls as coverage. |
| Search and aggregate fetch reliability | Parallel search/summary fetches can fail or complete out of order without a declared partial/stale result contract. | Query-sequenced or cancellable reads with bounded aggregate/search scope and visible partial/degraded states. |
| Dashboard switches and thresholds | Visible realtime and alert settings change local component state only while global channels remain active. | Persisted, authorized configuration with a real runtime receiver, or remove disabled-looking controls. |
| Notification preference and action metadata | Settings claims a notification toggle without wiring; legacy insert retry can discard notification action metadata. | One own-user notification preference owner and deliberate compatibility behavior that preserves or visibly omits actions. |
| Failure diagnostics and notification query failure | Production error handling logs full route/stack metadata, and notification read failure logs user UUID plus raw backend error while rendering empty state. | Redacted approved diagnostics plus visible failed/degraded notification and route-error presentation; never use browser console as the monitoring sink. |
| Settings Billing quick action and dormant PDF export | `SettingsPanel` renders a Billing action that only toasts `Billing portal coming soon`; source-present unmounted `useAnalytics` exposes `PDF export coming soon`. | Keep billing visibly unavailable or route to a proved wallet/billing surface; keep dormant PDF export outside capability claims unless it consumes the authorized analytics export projection. |
| Settings plan/upgrade claim | Desktop settings displays `Free Tier` and a visible `Upgrade` button with no handler while mobile does not present the same plan surface. | Billing/subscription projection with an explicit receiver or unavailable state; no static viewport-specific plan assertion. |
| Dormant mock fleet dashboard | `HospitalFleetManager` defines fixed operational and performance data with an export affordance but is not mounted in the active route graph. | Retire or leave explicitly excluded; do not mount until it consumes provider/fleet/emergency truth and a scoped export receiver. |
| Recent activity and audit truth | Dashboard renders a bounded activity preview while multiple global channels may observe activity; current writers can persist emergency location copy and provider email/username metadata. | One role-scoped, field-minimized activity projection owner, labeled recent window, and separately proven durable privileged audit trail. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View dashboard/analytics metric | Scoped read projection or explicitly unavailable state | Domain facades and guarded analytics reads | No mock or constant operational value presented as measured truth. |
| View subscription-derived analytics | Admin-only subscriber projection or excluded slice | Subscriber authority proved in Pass 7 | General provider analytics must not call admin-only subscriber reads or fail because that slice is unavailable. |
| Search and retain own recent history/selection | Authorized user telemetry CRUD/insert | `search_history`, `search_selections`, `search_events` through active search owner | Keep private/history scope and avoid duplicate adapter owners. |
| View trends | Scoped read projection | `trending_topics` / `get_trending_searches` | Label source; do not imply successful regeneration. |
| Regenerate/manage trends | Conditional admin CRUD or disabled command | Admin table policy exists; generation command is stubbed | Permit only honest manual administration or disable automatic regeneration. |
| View activity | Guarded read projection containing potentially sensitive writer metadata | `get_recent_activity`, `get_activity_stats` | Consolidate owner, minimize/redact visible location and identity fields, and do not treat activity as privileged write audit. |
| View privileged audit | Backend-derived read-only evidence | `admin_audit_log` | Require durable guarded write policy before relying on audit logging. |
| Edit settings | Own-user CRUD subset | `preferences` | Only signed-in operator settings; no patient consent/demo substitution. |
| Open Billing from settings | Unavailable action pending receiver | No billing-portal or scoped finance-navigation receiver is proved in `SettingsPanel` | Remove/disable the quick action or deliberately navigate to the authorized wallet/billing surface; a toast is not capability. |
| View or upgrade own plan from settings | Unavailable until lifecycle owner exists | Pass 7 subscriber/billing authority plus Pass 2 finance destination if applicable | Do not render `Free Tier` or an Upgrade command as live truth without a user-scoped plan projection and mounted receiver. |
| View/mark notification | Own-user bounded read and read-state mutation | `notifications` through `NotificationCenter` / `notificationService` | Keep user scope and loading feedback; do not promise an action target when compatibility fallback discarded it. |
| Handle notification or global UI failure | Shell-level degraded/error behavior | Notification owner plus approved diagnostics boundary | Distinguish empty from failed notification reads and strip actor/route/stack identifiers from browser diagnostics. |
| Realtime/route feedback | UI/read invalidation behavior | Domain hook/query owners and skeletons | No global context canonical server state or blank navigation pause. |
| Display PWA/install/update/offline and interaction feedback | Shell-owned browser/UI behavior | `PWAProvider`, `FeedbackProvider`, and their mounted surfaces | Keep immediate feedback intentional and accessible; do not expose a hard-coded debug version marker as operational truth. |
| Trigger system backup | Excluded until authorized workflow exists | Dormant handler only; no rendered trigger or named backend receiver proved | Remove dormant handler or implement only under a separately approved auditable operations command. |
| Navigate dashboard or operational map | Role-scoped UI access and route feedback | Consolidated live route/navigation authority | Do not reuse dormant contradictory config; allowed and rejected navigation render immediate honest feedback. |
| Open dashboard report | Read navigation or scoped analytics projection | Verified analytics owner and mounted route surface | Do not leave a visible report action dependent on an absent route-local listener. |
| Export analytics report/CSV | Scoped data export | Verified analytics projection and export owner | Desktop, mobile and panel entry points may export only role-authorized, source-labelled metrics; disable export when the projection contains fake or unauthorized slices. |
| Search across operational records | Scoped read plus user telemetry | Search owner with request sequencing and partial-result policy | Older query results cannot replace newer input, and one category failure cannot silently misstate total search availability. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Search and trends | own query/history/selection/event identity, result source, trend value/source/time and aggregation provenance | Keep active search telemetry scoped; disable stub-success regeneration and never fabricate ranked production results. |
| Activity and privileged audit | actor/action/entity/time/details plus permission scope, sensitivity classification/redaction and durable write proof for critical audit | Activity RPCs are a display projection, not proof that a destructive command was durably audited or that address/email metadata is fit for every dashboard reader. |
| Dashboard, settings, diagnostics and realtime | metric source/empty/unavailable state, operator notification preference, notification read-failure state, redacted error metadata, domain invalidation/channel owner and pending route state | Remove mock/constants as operational truth, expose real failure state without console disclosure and leave patient consent/demo preferences outside Console operational settings. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Dashboard KPI card | Metric value, source query/RPC, actor scope, time window, bounded/unavailable state, refreshed timestamp | No fallback/mock value may render as operational truth. | Operators do not make dispatch or sponsor decisions from fabricated metrics. |
| Dashboard report action | Report type, scope, route/modal receiver, export format, actor | Visible report buttons require a mounted receiver or disabled unavailable state. | Console does not expose dead analytics actions as product capability. |
| Mobile patient-care dashboard action | Role classification, visible label, target surface/deep link, receiver or unavailable reason | Patient-only `Book a Visit`, `Medical History` and `Emergency SOS` controls cannot retain empty handlers; any handoff must preserve canonical app ownership and immediate feedback. | Console does not impersonate the patient product or strand urgent user intent on a no-op. |
| Analytics export action | Export format, actor role, time range, metric source, included domains, excluded/unauthorized domains, completeness/degraded state and generated timestamp | `Analytics.jsx`, `MobileAnalytics` and `AnalyticsPanel` must invoke one export projection; it cannot serialize fallback values or inaccessible subscription analytics as measured output. | Exported operational evidence does not amplify misleading dashboard data or reveal a stricter-scope subscriber dataset. |
| Shared `AnalyticsModal` route projection | Modal type, actor scope, source owner, metric window/completeness, unavailable/degraded fields and sensitive-breakdown visibility | A domain route may open the modal only from its own proved projection; `avgResponseTime || 12`, generic `Health Index` and preview-derived summaries cannot stand in for absent evidence. | Detail analytics stays consistent with the operational list and cannot create confidence from missing or bounded records. |
| Analytics chart/trend | Aggregation source, interval, denominator, previous-period baseline, fallback state | Fixed trend labels and predictive empty intervals must be removed unless backed by fields. | App/company performance claims stay auditable. |
| QuickSearch result row | Query id, sequence id, category, result id, display id/label, source table, matched field, actor scope | Older async results cannot replace newer input; category failures must be surfaced as partial. | Operators navigate to the correct record without seeing denied/error as no-match. |
| Search telemetry event | Query id, selection id, actor id, category, result id, timestamp, latency/failure state | Telemetry writes require scoped service owner; no stub-success regeneration. | Search analytics reflect real user behavior and not fake ranked data. |
| Recent/trending search list | Actor scope, trend source, query text, count, time window, unavailable state | Trend RPC/service-only fallback cannot fabricate production rankings. | Console suggestions do not reveal unrelated users or unproved popularity. |
| Activity feed row | Actor, action, entity type/id, timestamp, sensitivity/redaction state, details and durable audit source | Display activity RPC is not proof that underlying commands are audited or that emergency address/provider email metadata may be rendered to the current role. | Critical changes need their own auditability without spreading protected context through general dashboard feeds. |
| Realtime invalidation channel | Domain, table/channel, query key, role scope, cleanup state, degraded state | Global shell subscriptions must invalidate owners, not hold canonical state. | App/console data converges after changes without duplicate hidden broad reads. |
| Settings/notification preference | User id, preference key, value, source, persisted state, unavailable state | Patient demo/consent preferences remain outside Console operational settings. | Console settings do not mutate patient-facing behavior accidentally. |
| Settings Billing action and optional PDF export | Actor role, destination/export format, authorized source projection, receiver/mounted state and unavailable reason | Billing placeholder remains unavailable; dormant PDF export cannot be mounted until it shares verified analytics scope and degradation rules. | Shell actions and generated reports do not promise operations that do not occur. |
| Settings plan and upgrade action | Actor identity, current-plan source, billing/subscriber lifecycle source, upgrade receiver and responsive visibility | Static desktop `Free Tier`/Upgrade is unavailable unless backed by a mounted scoped lifecycle projection; mobile omission cannot define different truth. | Console does not misstate membership or purchase capability based on viewport. |
| PWA/update/feedback surface | Build/version source, update status, offline/install state, reduced-motion/feedback preference | Hard-coded debug badge must be removed or tied to authoritative metadata. | Operators receive immediate, accessible shell feedback without confusing debug artifacts for system truth. |
| System backup control | Actor, target scope, backup job id, receiver, audit/result state | Keep dormant/removed until authorized auditable workflow exists. | Console cannot imply a protected infrastructure operation from an unbacked button. |

Implementation rule: the first slice may remove mock truth, add unavailable/partial/degraded states, sequence search results, and consolidate realtime invalidation ownership. It must not add backup, fake trend regeneration, broad shell reads, or new analytics claims before source and receiver proof exists.

## Mounted Surface Read, Exposure, And Operation Closure

| Surface or acquisition path | Mounted status and audience | Reads or visible claim | Mutation/action path | Deterministic audit outcome |
| --- | --- | --- | --- | --- |
| `/` `BentoHome` / `MobileDashboard` | Live route and its mounted mobile composition for allowed dashboard roles in `App.js`. | Uses global PageData data plus subscriber analytics; displays response/completion/fleet/hospital summary, mobile paid-member/facility language, fixed performance comparisons and corrupted fleet-state copy. | Refresh/navigation plus patient-only `Book a Visit`, `Medical History` and `Emergency SOS` rows with empty handlers. | Broken truth and action boundary: default values and unsupported labels must be removed or explicitly demo/unavailable; subscriber slice must obey admin scope; patient-care controls must intentionally hand off to canonical ownership or remain unavailable; visible encoding must be repaired. |
| Dashboard `ContextPanel` / `DashboardPanel` | Live side panel when opened on `/`; `ContextPanel` invokes `useSubscription()` while open. | Emergency, analytics, doctor, verification and recent activity projections; live indicator based only on `useMockData`. | Report emits `openAnalyticsModal`; visible realtime switch and thresholds update local state only. | Broken receiver and configuration boundary: report receiver absent on `/`; switch/thresholds do not control or persist system behavior; context-open subscriber fetch adds duplicate ownership. |
| `ContextAwareFAB` / `DynamicBottomBar` | Both are always rendered by `AppShell`; each hook executes before desktop/mobile early return. | Each mounts insurance, support-ticket and subscriber hooks independent of current route or whether its modal is opened. | Later opens domain command modals when visible for the relevant viewport/route. | Critical hidden acquisition path: eliminate route-independent sensitive/full-list reads and broad channels; load command dependencies only for an authorized active surface/action. |
| `PWAProvider`, `serviceWorkerRegistration`, `FeedbackProvider` and `PWADebugTracker` | Providers/debug marker are always mounted outside the routed shell, including public/auth routes; `index.js` calls service-worker registration at startup. | Install/offline/update UI, active cache/update lifecycle, interaction burst/audio/haptic feedback, and a visible hard-coded `v1.0.33` badge. | PWA install/update/dismiss actions, service-worker activation/reload behavior and feedback calls from mobile controls. | Shell utility disposition required: remove production debug artifact or bind it to authoritative build metadata; test active PWA status/update behavior; define accessible feedback preferences/reduced-motion behavior. No domain-table CRUD exposure was found in these providers. |
| `PageDataContext` | Mounted above all application routes for authenticated users. | Broad emergency, verification, analytics, doctors, visits, hospitals, ambulances, profiles, support, insurance, wallet, activity, pricing and organizations reads; mock-initialized values. | Refreshes from broad table subscriptions. | Critical shell ownership defect: route-independent reads can leak sensitive/bounded/incomplete state and duplicate all domain owners; support failure can turn broad shell data into mock mode. |
| `/analytics` `Analytics.jsx` and `MobileAnalytics` | Live provider-or-higher route and its mobile composition. | Direct counts/lists plus subscriber analytics; predictive empty intervals and fixed trend labels. Mobile renders `Generate Analytics Report` using the page export callback. | Desktop header and mobile action serialize the current aggregate state into the same CSV download; modal/event listeners are mounted only on this page. | Broken authority/export truth boundary: provider-visible analytics composes admin-only subscriber read and can export fallback/unproved values without completeness labels. |
| `AnalyticsPanel` / `AnalyticsModal` | Panel is live on `/analytics`; modal is received where individual pages mount listeners. | Panel repeats PageData metrics; modal accepts heterogeneous domain data and uses generic labels/default response time. | Panel `Export` dispatches `exportAnalytics` into the live page CSV handler; report/modal navigation is page-scoped. | Broken semantic/export projection: default `12m`, generic health/in-flow labels and subscription revenue/retention wording must be backed by actual fields or removed before their data can be downloaded. |
| `Overview.jsx` | Source-present but no live route import found in inspected route scan. | Static chart/trend and fixed average response logic. | Its own generic realtime subscription. | Dormant-risk only: do not implement around it; retire or explicitly remount only after truth contract is rebuilt. |
| `QuickSearch` / `searchService` | Live shell search entry for navigational surfaces. | Six record categories, including profile email and emergency/visit detail, plus recent/trending searches; each category capped at 50. | Own history/event/selection recording. | Broken access/reliability boundary: define role-safe categories/fields, sequence queries, label partial/capped results, and distinguish denied/error from no match. |
| Search telemetry, trends and analytics adapters | `searchService` is live; separate event/history/selection services, search analytics and trend automation have no rendered import proved in this pass. | Trend RPC read and service-only analytics/fallbacks. | Service-only CRUD/realtime/regeneration APIs. | Keep dormant adapters out of implementation surface until guarded receiver exists; no fake fallback rankings or no-op regeneration success. |
| `NotificationCenter` / `notificationService` | Live through smart header/top navigation, user scoped. | Latest 30 own notifications with loading skeleton and user-filtered realtime inserts; failed reads are currently collapsed to `[]` after logging UUID/backend details. | Mark read; producers create notification records. | Partial projection: fallback insert deletes `action_data`, and read failure must render unavailable/error rather than an empty list plus identity-bearing console diagnostic. |
| `components/navigation/NotificationCenter.jsx` | Source-present with fixed emergency/user/system/shift rows; no live importer found while mounted headers import `components/common/NotificationCenter.jsx`. | Hard-coded notification copy only. | No proved current action path. | Dormant/excluded mock surface: do not cite as capability or mount without the owned notification projection. |
| `ErrorBoundary.jsx` | Global error handling path when a descendant throws; production branch is active behavior. | Generic visible failure page while internal production console output contains route URL and stack metadata. | Try Again/Go Home; development-only copy action. | Broken diagnostics boundary: provide useful visible failure handling but route error metadata must flow through approved redacted monitoring, not browser console disclosure. |
| `SettingsPage` / `preferencesService` | Settings page live; preference service unmounted in source scan. | Displays notification switch as always checked; schema/service disagree on default demo mode and mock state is disconnected. | No wired preference update from the visible notification switch. | Broken settings claim: wire a deliberate operator preference or render no toggle; do not conflate patient privacy/demo fields with console shell truth. |
| Desktop/mobile `SettingsPage` billing and plan variants | Desktop renders a static `Free Tier` plus unhandled `Upgrade`; mobile does not render that plan action; context panel Billing only toasts coming-soon text. | Implies plan and finance navigation without a common user-scoped subscription/billing projection. | No proved upgrade receiver or reflected plan result. | Keep plan/upgrade/billing unavailable or implement through the Pass 2/7 owned lifecycle with identical truth semantics across viewports. |
| `SettingsPanel` quick actions and dormant `useAnalytics` PDF export | Settings context panel is live when its route context is opened; `useAnalytics` was source-present but unmounted in the live analytics route scan. | Billing quick action implies portal access while only toasting coming-soon text; dormant hook offers PDF export placeholder. | No billing receiver and no mounted PDF export owner proved. | Keep Billing unavailable or navigate intentionally to authorized finance; do not promote dormant PDF generation to capability until it uses the verified analytics export contract. |
| `HospitalFleetManager.jsx` | Source-present dashboard component; no live route or parent import found in inspected source scan. | Hard-coded incidents, staff/fleet performance and analytics-like values with an `Export Report` affordance. | No mounted command receiver or projection owner. | Dormant/excluded surface: do not cite as feature coverage or mount without replacing mock truth and assigning export authority. |
| Activity feed / `activityService` | Dashboard consumes PageData recent activity; separate hook exists. | Bounded recent activity RPC projection, transformed into visible descriptions; emergency writers can include locations and provider verification can include identity metadata. | Multiple service helpers log events; broad activity realtime paths exist. | Sensitive partial read only: label preview scope, minimize/redact by role, consolidate channel ownership, and separately prove audit durability for critical commands. |
| `MapContext` shell projection | Mounted across shell independent of `/map`. | Emergency/ambulance/hospital map feeds and user-location assumptions traced in Passes 1, 3 and 5. | Map selection/location events. | Global dependency closure: Pass 8 removes duplicate shell ownership while domain passes retain scoped map projections. |

## Shared Analytics Modal Consumer Register

The modal is a rendering component, not a data owner. Every live caller remains owned by its domain pass; Pass 8 owns removal of modal-level fabricated defaults and the shared projection requirement.

| Live caller surface | Modal type / supplied basis found in source | Domain pass and closure requirement |
| --- | --- | --- |
| `/emergencies` and `/analytics` | `emergency`; request stats or aggregate analytics, vulnerable to default response-time presentation. | Pass 1 / Pass 8: lifecycle-scoped aggregates and no missing-response fallback. |
| `/hospitals` | `hospital`; facility stats. | Pass 3: scoped aggregates cannot be derived from incomplete hospital loads. |
| `/ambulances` and `/doctors` | `ambulance` / `doctor`; displayed provider stats. | Pass 5: scoped provider/fleet aggregates and truthful availability/verification semantics. |
| `/visits` | `visit`; visit stats. | Pass 6: request-derived clinical records and administrative visits remain distinguished. |
| `/users`, `/verification` and `/organizations` | `user`, `verification` or `generic`; identity/org queue or registry values. | Pass 4: role-scoped aggregates, responsive parity and no report authority inferred from a modal. |
| `/insurance`, `/support-tickets`, `/health-news` and `/subscriptions` | `insurance`, `support`, `news` or `subscription`; care/content/subscriber values. | Pass 7: policy/lifecycle authority and subscriber role boundaries remain explicit. |
| `/pricing` and `/wallet` | `generic`; route-created pricing or capped wallet ledger/payment summaries. | Pass 2 / Pass 3: distinguish financial/pricing scope and bounded-preview semantics; generic labels are not proof. |

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
| Dormant operational components | Source-present dashboard/report components are classified before any future mount. | `Overview`, `useAnalytics` and `HospitalFleetManager` are dormant/excluded until deliberately re-authorized. |
| Dashboard metric truth | Every visible number/label has source, scope, completeness and empty/error state. | Failed: mock/default/fixed trend and subscriber-scope claims present. |
| Cross-role analytics access | Provider/org/sponsor/admin routes load only authorized slices. | Failed: live analytics and shell subscription dependency exceed subscriber read proof. |
| Analytics report/export exposure | Every download action consumes a role-safe, source-labelled, bounded projection and refuses false/degraded output. | Failed: desktop, mobile and panel actions export active aggregate state that may include fallback values or admin-only subscription data. |
| Search read/render/privacy | Each result category and visible field has role scope, bounds, sequencing and error state. | Failed: profile email/clinical categories and whole-result failure are not surfaced deliberately. |
| Search telemetry/trending | One live owner, privacy scope, source provenance and honest fallback/regeneration state. | Partial: active owner identified; dormant duplicate adapters/automation remain unapproved. |
| Realtime ownership | Each table/channel has one owner plus justified scoped projections. | Failed: PageData and map/activity/global consumers duplicate domain paths. |
| Feedback and route transitions | Skeleton/pending/failed/unauthorized rendering is truthful for actions and navigation. | Partial: some skeletons exist; blank lazy fallback, dead report event and inert dashboard controls remain. |
| Mobile dashboard patient-flow ownership | Every visible patient-only control either reaches a deliberate canonical destination or is not presented as interactive capability. | Failed: three live patient-care rows have empty handlers in the Console mobile dashboard. |
| Notifications/preferences | Own-user notification lifecycle and settings receiver agree, including compatibility action metadata. | Failed: visible toggle is unwired and fallback creation can discard action payload. |
| Activity/audit | Recent operational feed separated from durable privileged-command evidence. | Partial: recent feed exists; single owner and critical-command audit proof remain required. |

## Exact Global Shell And Analytics Flow Exhibits

These exhibits tie global UI symptoms back to their line-level source. Pass 8 is where duplicate shell ownership and truth-label leakage must be removed before service implementation begins.

| Exhibit | Code anchor | Current contract break | Implementation target |
| --- | --- | --- | --- |
| Mobile dashboard metric truth | `frontend/src/components/mobile/MobileDashboard.jsx:83-102,120-183,203-258` | Default/fallback stats and `LIVE` labels render as operational truth without source/completeness labels. | Use source-labelled dashboard projections and explicit degraded/unavailable states. |
| Dead patient controls in Console | `frontend/src/components/mobile/MobileDashboard.jsx:308-310` | `Book a Visit`, `Medical History` and `Emergency SOS` are interactive rows with empty handlers inside Console. | Remove or route through a deliberate canonical patient-app handoff with immediate feedback. |
| Activity feed exposure | `frontend/src/components/pages/BentoHome.jsx:516,1474-1483` and `frontend/src/services/activityService.js:16-29,189-207` | Recent activity descriptions and user labels can expose location or identity metadata in a dashboard preview. | Minimize/redact activity projection by role and separate recent feed from privileged audit. |
| Analytics CSV export | `frontend/src/components/pages/Analytics.jsx:110-154,532-536` | Export serializes active aggregate state even when slices are fallback, unauthorized, incomplete or admin-only. | Scope-aware analytics export projection with dataset, time-window and degradation labels. |
| Mobile analytics export entry | `frontend/src/components/mobile/MobileAnalytics.jsx:549` | Mobile exposes `Generate Analytics Report` through the same unverified export path. | Share the verified export projection or render report unavailable. |
| Analytics panel export event | `frontend/src/components/context/AnalyticsPanel.jsx:22` | Panel dispatches `exportAnalytics` into the route handler without owning source/permission scope. | Only emit when the active route exposes the verified export receiver. |
| Notification read failure | `frontend/src/services/notificationService.js:175-201` | Fetch failure logs user UUID and backend details, then returns empty state. | Return typed failure/unavailable state and remove identity-bearing console diagnostics. |
| Notification action metadata loss | `frontend/src/services/notificationService.js:96-121` | Legacy retry drops `action_data`, making delivered notification navigation/action semantics inconsistent. | Preserve action metadata deliberately or mark the notification as non-actionable. |
| Global error diagnostics | `frontend/src/components/common/ErrorBoundary.jsx:21-48,65-90` | Production handling logs route URL, stack and component stack to browser console. | Redacted monitoring boundary plus useful visible recovery; no browser-console diagnostic disclosure. |
| Settings plan/billing claim | `frontend/src/components/pages/SettingsPage.jsx:298-300` and `frontend/src/components/context/SettingsPanel.jsx:38-43` | Static `Free Tier`, `Upgrade`, and Billing quick action imply plan/portal capability without receiver. | Bind to Pass 2/7 lifecycle truth or render explicitly unavailable. |
| PWA registration truth | `frontend/src/index.js:43-45` and `frontend/src/serviceWorkerRegistration.js:2,23-97` | Startup registers the service worker while stale comments say registration is not called by default. | Treat PWA update/offline behavior as live and verify visible update/reload states. |
| Dormant fleet export | `frontend/src/components/dashboard/HospitalFleetManager.jsx:28,159,344-357` | Source-present component contains hard-coded operational data and `Export Report` but no mounted owner was found. | Keep dormant/excluded until provider/fleet truth and export authority exist. |

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
- Desktop, mobile and panel export actions use the same scope-aware export projection and cannot download fallback, excluded or unauthorized slices as measured analytics.

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
- no interactive patient-care row with an empty handler; either hand off to the canonical patient surface with immediate feedback or render it unavailable

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
- mojibake/encoding scan for touched text files, including visible mobile dashboard fleet copy

Frontend:

- Browser smoke on dashboard, overview, analytics, quick search, and route transitions.
- Mobile patient-role dashboard smoke confirms visit/history/SOS actions either hand off deliberately or are not exposed.
- Mobile and desktop viewport checks for route skeleton and compact loading states.
- Desktop header, mobile report action and analytics-panel export checks prove identical allowed dataset scope and disabled/degraded handling when any source slice is unavailable.
- Console error scan after route changes.

Backend/RLS/RPC:

- Analytics query fixture tests where available.
- Search privacy/RLS tests for events, history, selections.
- Trending RPC/view proof before enabling regeneration.
- Realtime subscription count/cleanup smoke.

Stop conditions:

- Do not replace mock fallbacks with new fake values.
- Do not export fallback, excluded or unauthorized analytics slices as a completed report.
- Do not expose user search history broadly.
- Do not refactor all route loading while domain owner passes are still unstable unless route shell is isolated.
