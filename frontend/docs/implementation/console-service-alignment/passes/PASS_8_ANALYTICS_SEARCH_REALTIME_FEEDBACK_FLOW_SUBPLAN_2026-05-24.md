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
- `frontend/src/components/navigation/ResponsiveSidebar.jsx`
- `frontend/src/components/navigation/SmartFooter.jsx`
- `frontend/src/components/navigation/SmartTopNav.jsx`
- `frontend/src/components/navigation/BentoBreadcrumbs.jsx`
- `frontend/src/components/navigation/SidebarTrigger.jsx`
- `frontend/src/components/navigation/NotificationCenter.jsx`
- `frontend/src/components/common/NotificationCenter.jsx`
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/components/common/ConsoleStartupOverlay.jsx`
- `frontend/src/components/common/NetworkStatus.jsx`
- `frontend/src/components/mobile/PullToRefresh.jsx`
- `frontend/src/components/mobile/useLoadMoreControl.js`
- `frontend/src/components/mobile/useStableList.js`
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
- `frontend/src/hooks/useNetworkStatus.js`
- `frontend/src/hooks/useAnalytics.js`
- `frontend/src/hooks/useActivity.js`
- `frontend/src/hooks/useContextAction.js`
- `frontend/src/lib/queryClient.js`
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
- `AppShell` actively mounts `ContextPanelShell` and `SmartFooter` on navigated shell routes. The footer renders a success/check treatment and `LIVE SYNC ACTIVE` fallback whenever visible footer configuration omits custom content; that fallback is UI copy, not proved realtime health.
- `SmartTopNav`, its `BentoBreadcrumbs` child, and `SidebarTrigger` have no live importer in the inspected graph; `SmartTopNav` includes corrupted shortcut-glyph copy. They are dormant/excluded shell artifacts until explicitly mounted and repaired.
- `BentoHome` mounts `MobileDashboard` on small viewports; it renders completion target comparisons, paid-member language and facility/fleet summary claims from the same global/fallback-prone dashboard data, so mobile dashboard truth is independently in the live surface boundary.
- `PullToRefresh` is mounted by `16` live mobile route variants; `useStableList` and `useLoadMoreControl` are mounted by `11` live mobile list variants. The helpers provide refresh/buffering/load-more interaction state only and must not turn a capped, unbounded, failed or stale parent collection into apparent complete/live truth.
- `MobileDashboard` also renders a patient-only `Medical Services` strip with tappable `Book a Visit`, `Medical History` and `Emergency SOS` rows whose handlers are empty functions; it advertises canonical patient flows inside Console without navigation or command receivers.
- `MobileDashboard` includes visible corrupted separator text in fleet-state expanded copy, so mobile dashboard implementation must pass the same encoding gate as finance and analytics surfaces.
- `App.js` also renders `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` outside the routed shell. PWA install/offline/update notices and feedback bursts therefore exist across authenticated and public routes, while a visible hard-coded version badge is rendered on every route.
- `App.js` mounts `MapProvider` inside `AppLayout` around public/auth and protected routes alike, and `MapContext` performs initial map reads plus emergency/ambulance/assumed-user-location subscriptions without an auth or route guard. Public/login/onboarding routes can therefore initiate operational feed acquisition despite never rendering `/map`.
- The live `/map` route mounts a second `MapProvider` inside `GodModeMap` beneath the shell provider, so authorized entry can still duplicate feed initialization and subscriptions unless shell ownership is consolidated.
- Live map children also expose shell/reliability truth: `GodModeMap` treats geolocation denial as `LAGOS_CENTER` for nearby lookup/render and derives a visible session badge from coordinates, while `GoogleMapsSmartRoute` transmits active route endpoints to Google Routes and silently substitutes a straight path on failure.
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
- Live `ProtectedRoute` emits denied actor role plus attempted route/resource to the browser console, and the settings-mounted `SecurityModal` emits raw password-update Auth errors. These identity-owned failure paths are Pass 4 repairs and Pass 8 shell disclosure-gate inputs.
- `utils/errorHandler.js` is a shared mounted failure boundary used by pages/modals across Passes 1-7: `handleError()` logs each raw error object and turns its raw message into visible toast copy. A pass cannot close its browser-disclosure or truthful-feedback gate while retaining this global bypass.
- Map and onboarding child boundaries add active diagnostic sinks: `MapErrorBoundary`/driver map handlers log raw render or telemetry failures, while onboarding step/context/service paths log raw facility-search, Auth, Supabase and Storage failures during enrollment.
- `PageDataContext` reads recent activity through the bounded `get_recent_activity` RPC but also subscribes globally to `user_activity`; `useActivity` exposes a second global activity subscription path. The dashboard feed is a recent preview and must not be labeled as complete audit history.
- The live feed renders `activity.description` through `transformActivityData()`. Current emergency activity writers include pickup/destination address values in description/metadata, and provider verification activity writes provider email/username metadata. Activity is therefore an identity/location exposure projection as well as an audit/realtime ownership issue.
- `analyticsAutomationService` calls trend update RPCs and reads trending views/history.
- `BentoHome` assumes a hard-coded public Supabase map image asset, and `DashboardPanel` defines a dormant `/api/backup` handler without a named audited receiver or failure-facing workflow.
- `HospitalFleetManager.jsx` contains hard-coded staff, incident, fleet and performance values plus an `Export Report` control, but no importing/mounted consumer was found in the active source scan. It is dormant mock operational UI, not audited dashboard capability.
- `components/dev/SchemaDebugger.jsx` is a development-only raw-object renderer using `JSON.stringify(data, null, 2)` with visibly corrupted debug labels, but no importing/mounted consumer was found. It is a dormant diagnostic exposure artifact, not a current monitoring capability.
- `App.js` mounts `QueryClientProvider` with the defaults from `lib/queryClient.js`, but no `useQuery`, `useMutation`, `useInfiniteQuery` or `useQueryClient` consumer exists in the inspected source tree. TanStack Query is an inert installed foundation, not current server-cache ownership.
- `components/common/NetworkStatus.jsx` has no importing/mounted consumer in the source scan. Its `useNetworkStatus` hook would replace `window.fetch` globally, keep the wrapper after unmount and interpret every request through component state; it is a dormant API-fetch reliability hazard, not shell network truth.
- App-origin `notify_cash_approval_org_admins` can create or fall back to inserted notifications for cash approval requests; notification analytics and action metadata must not describe delivery as settlement or emergency release.
- App demo writers (`bootstrap-demo-ecosystem`, `demo-approve-cash-payment`, `demo-dispatch-reply`) and maintenance `reload_schema` can never be counted as production dashboard, finance, chat or operational system capability without explicit isolated demo/maintenance treatment.
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
| Public-route map acquisition | Unguarded `MapProvider` initializes operational map reads and channels on every route, including public/auth routes. | Route- and role-authorized map projection mount; no emergency/fleet/facility/patient-location feed attempt from login/onboarding/unauthorized shell. |
| Duplicate authorized-map acquisition | `GodModeMap` nests a second `MapProvider` inside the already provider-wrapped route tree. | One scoped shell-or-route map projection owner with deterministic subscription cleanup and no duplicate refresh/channel behavior. |
| Map location and external routing shell truth | Map substitutes a real-looking Lagos operator location after geolocation failure, displays a coordinate-derived session label and sends route endpoints to external Google route computation with silent straight-line fallback. | Permissioned map-location and approved external-route projections with visible unavailable/degraded state; no coordinate decoration or fabricated proximity. |
| Route/action feedback | Some route and action paths can blank or overclaim success. | Shell loading/pending/degraded feedback standard. |
| Shared responsive refresh and continuation feedback | Mobile list helpers can keep previous rows visible during loading and trigger parent pagination, while the parent may itself be client-sliced, capped or unbounded. | Domain-owned refresh/page/error projection with explicit buffering and bounded `hasMore`; Pass 8 owns the shared feedback standard, not domain truth. |
| Shell footer status truth | Mounted `SmartFooter` can present success styling and `LIVE SYNC ACTIVE` when visible without custom footer content. | Footer may display live/success status only from a proved scoped health/freshness projection; otherwise render neutral context or no status. |
| Globally mounted utility feedback | PWA banners, interaction bursts/audio/haptics and a visible hard-coded version badge mount independently of route/domain workflow. | Deliberately owned shell utilities: truthful build/version display or no debug artifact, accessible preference-aware interaction feedback, and tested install/offline/update behavior. |
| Public asset and dormant backup handler | Dashboard assumes a public Storage asset; source contains an unproved `/api/backup` handler not evidenced as a rendered current control. | App-owned stable asset delivery; remove dormant command or enable only through an authorized/audited operations boundary. |
| Dashboard/map route doctrine | Live guard and dormant route configuration disagree about public versus operational access. | One routed shell access authority with visible allowed/rejected/loading states. |
| Dashboard report entry | Dashboard Report dispatches a page-local modal event whose receiver is mounted only on other routes. | Deliberate analytics navigation or mounted dashboard report projection with accurate source labels. |
| Mobile dashboard patient-care entries | The live mobile dashboard renders `Book a Visit`, `Medical History` and `Emergency SOS` as interactive rows for a patient role, but each uses an empty click handler. | Decide ecosystem ownership deliberately: route authenticated patient flows to the canonical patient app surface or remove/mark unavailable in Console; do not count dead controls as coverage. |
| Search and aggregate fetch reliability | Parallel search/summary fetches can fail or complete out of order without a declared partial/stale result contract. | Query-sequenced or cancellable reads with bounded aggregate/search scope and visible partial/degraded states. |
| Dashboard switches and thresholds | Visible realtime and alert settings change local component state only while global channels remain active. | Persisted, authorized configuration with a real runtime receiver, or remove disabled-looking controls. |
| Notification preference and action metadata | Settings claims a notification toggle without wiring; legacy insert retry can discard notification action metadata. | One own-user notification preference owner and deliberate compatibility behavior that preserves or visibly omits actions. |
| App cash-approval notification and demo/maintenance writers | App notification delivery may use RPC or fallback insertion; app demo and schema-reload receivers exist outside Console production operations. | Reflect notification delivery provenance separately from lifecycle outcomes, and exclude demo/maintenance receiver results from production metrics, realtime status and capability claims. |
| Failure diagnostics and notification query failure | Production error handling logs full route/stack metadata, notification read failure logs user UUID plus raw backend error while rendering empty state, protected-route rejection logs role/path/resource, settings password failure logs raw Auth errors, shared `handleError()` logs/toasts raw receiver errors across routed operations, and mounted map/onboarding child paths log raw operational/provisioning failures. | One redacted diagnostic and operator-safe copy policy plus visible denied/failed/degraded notification, auth, provisioning, map-command and route-error presentation; never use browser console or backend error text as the monitoring/user-feedback sink. |
| Settings Billing quick action and dormant PDF export | `SettingsPanel` renders a Billing action that only toasts `Billing portal coming soon`; source-present unmounted `useAnalytics` exposes `PDF export coming soon`. | Keep billing visibly unavailable or route to a proved wallet/billing surface; keep dormant PDF export outside capability claims unless it consumes the authorized analytics export projection. |
| Settings plan/upgrade claim | Desktop settings displays `Free Tier` and a visible `Upgrade` button with no handler while mobile does not present the same plan surface. | Billing/subscription projection with an explicit receiver or unavailable state; no static viewport-specific plan assertion. |
| Dormant mock fleet dashboard | `HospitalFleetManager` defines fixed operational and performance data with an export affordance but is not mounted in the active route graph. | Retire or leave explicitly excluded; do not mount until it consumes provider/fleet/emergency truth and a scoped export receiver. |
| Dormant raw schema debugger | `SchemaDebugger` would expose supplied object payloads in development UI and carries corrupted debug copy, but no mounted consumer was found. | Keep unmounted/retire or permit only a redacted development-only policy; do not use it with operational records as a diagnostics shortcut. |
| Installed query-cache foundation without consumers | `QueryClientProvider` is mounted with blanket cache/retry/focus defaults while no inspected code consumes TanStack Query. | Treat current data ownership as imperative until domain passes deliberately migrate bounded queries and set freshness/retry behavior by operational risk. |
| Dormant global fetch interception | `NetworkStatus` is unmounted, but `useNetworkStatus` permanently replaces `window.fetch` if introduced. | Keep excluded or retire; use owned network/degraded/query state rather than global request monkey-patching. |
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
| Map-provider mount authority | Route class, authenticated actor/role, enabled map dataset classes and channel cleanup | Do not initialize `MapContext` operational feed on public/auth routes or for actors without map authority. | Public Console navigation cannot trigger operational or patient-location reads merely because the provider wraps the router. |
| Map-provider singleton ownership | Authorized map surface, feed owner id, channel set and cleanup/refetch state | `GodModeMap` must consume one authorized map projection provider rather than remounting a second provider under the shell. | Entering `/map` cannot duplicate operational or location subscriptions/fetches. |
| Map location/routing exposure | Location permission state, display center versus operator position, external route-provider purpose, disclosed endpoints, fallback state and diagnostic redaction | Do not call/display fallback center as the operator location or send/display location-derived information without authorization and truth labels. | Shell/map does not expose coordinates or portray degraded routing/proximity as live operational truth. |
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
| `MapProvider` / `MapContext` route mount | Mounted above every route in `AppLayout`, including public/auth/unauthorized routes; unlike `PageDataContext`, no `user` guard gates its initialization effect. | Fetches bounded emergencies, unbounded ambulances/hospitals and subscribes to emergency, ambulance and assumed patient-location streams. | Map refresh and map-local projection updates. | Critical pre-authorization acquisition defect: map operations must mount only for authenticated authorized surfaces and use bounded scoped feeds. |
| `GodModeMap` nested `MapProvider` | Live only on `/map`, but mounted beneath the already active shell provider. | Repeats the map feed initialization/subscription effect for an authorized operational route. | Route map refresh/marker selection through its private context. | Critical duplicate-owner defect: consolidate to one scoped map provider before realtime or refresh behavior can be trusted. |
| Map location and route-provider children | Live on `/map` through `GodModeMap`, `GoogleMapsRenderer` and `GoogleMapsSmartRoute`. | Browser position or fallback center, nearby facilities, coordinate-derived session badge and externally computed endpoint routes. | Geolocation acquisition, nearby RPC/fallback, Google Routes call and straight-line fallback rendering. | Critical truth/exposure boundary: preserve denied/unavailable location, remove decorative coordinate disclosure, and label/approve external route computation and degraded geometry. |
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
| `components/dev/SchemaDebugger.jsx` | Source-present development component; no importer or live mount found in inspected source scan. | Would display supplied raw objects and corrupted diagnostic labels. | No mounted command or monitoring receiver proved. | Dormant/excluded diagnostic surface: keep unmounted/retire or require redacted development-only inputs and clean encoding before use. |
| `App.js` / `lib/queryClient.js` | Provider is mounted globally, but no TanStack Query consumer was found in source scan. | No rendered query-derived state; current routes continue imperative context/page/service reads. | No query invalidation/refetch owner currently operates. | Inert foundation only: do not count as L2 migration or use blanket defaults as proof of emergency/admin read policy. |
| `components/common/NetworkStatus.jsx` / `hooks/useNetworkStatus.js` | Source-present only; no live importer found. | Would render online/CORS status based on globally wrapped fetch responses. | Would replace `window.fetch` without restoration if mounted. | Dormant/excluded reliability hazard: never mount as the remedy for API error, pagination or degraded-data handling. |
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
| Dormant operational components | Source-present dashboard/report/diagnostic/reliability components are classified before any future mount. | `Overview`, `useAnalytics`, `HospitalFleetManager`, `SchemaDebugger` and `NetworkStatus` are dormant/excluded until deliberately re-authorized. |
| Query/cache ownership | A mounted data-cache provider is not counted as ownership without consuming domain queries and invalidation policy. | Failed/missing implementation: `QueryClientProvider` is present but there are no TanStack Query consumers in inspected source. |
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
| Protected-route/security diagnostics | `frontend/src/components/common/ProtectedRoute.jsx:54,69` and `frontend/src/components/modals/SecurityModal.jsx:186-193` | Denial logs operator role plus attempted path/resource; password-change error logs raw Auth failure detail. | Consume Pass 4 bounded denial/recovery state and prohibit browser console identity/credential-flow error disclosure. |
| Shared action error feedback | `frontend/src/utils/errorHandler.js:8-64` plus mounted page/modal importers | `handleError()` logs raw Supabase/Auth/Edge/Storage errors and uses raw `error.message` as visible operator toast copy across domain commands. | Provide a redacted diagnostic adapter and an action-safe feedback mapper; domain passes prove meaningful failure state without exposing internal receiver detail. |
| Settings plan/billing claim | `frontend/src/components/pages/SettingsPage.jsx:298-300` and `frontend/src/components/context/SettingsPanel.jsx:38-43` | Static `Free Tier`, `Upgrade`, and Billing quick action imply plan/portal capability without receiver. | Bind to Pass 2/7 lifecycle truth or render explicitly unavailable. |
| PWA registration truth | `frontend/src/index.js:43-45` and `frontend/src/serviceWorkerRegistration.js:2,23-97` | Startup registers the service worker while stale comments say registration is not called by default. | Treat PWA update/offline behavior as live and verify visible update/reload states. |
| Dormant fleet export | `frontend/src/components/dashboard/HospitalFleetManager.jsx:28,159,344-357` | Source-present component contains hard-coded operational data and `Export Report` but no mounted owner was found. | Keep dormant/excluded until provider/fleet truth and export authority exist. |
| Dormant raw schema debugger | `frontend/src/components/dev/SchemaDebugger.jsx:12-113` | Source-present development component can stringify raw supplied data and renders corrupted diagnostic labels; no mounted owner was found. | Keep dormant/excluded or constrain to redacted development-only payloads with clean encoding before any deliberate mount. |

## Pass 8E Implementation Sequence And Blocker Matrix

Pass 8 is the shell and cross-cutting pass. It must not become a shortcut around Passes 1-7. Its first implementation work should remove false confidence, centralize projection contracts, and make unsupported commands unavailable before any new aggregate, report, export, realtime, or feedback capability is added.

### Pass 8E Work Order

1. Shell projection inventory and registry.
   - Can start now.
   - Create a read-only registry of route-level shell consumers, their source owner, live/dormant status, projection readiness, export readiness, realtime owner, and fallback state.
   - Do not fetch domain tables from the registry. It is a contract surface only.
2. Mock and fallback metric downgrade.
   - Can start now.
   - Replace visible dashboard, analytics, modal, trend, and mobile dashboard constants with unavailable, degraded, demo, or source-pending labels.
   - Do not invent replacement numbers.
3. Export and report command downgrade.
   - Can start now.
   - Disable or guard desktop analytics CSV, mobile analytics report, analytics panel export, dashboard report, dormant fleet export, and dormant PDF export until a scope-aware export projection exists.
   - The user-facing state should explain unavailable or source-pending status without implying a completed report.
4. Search sequence and partial-failure contract.
   - Can start now.
   - Define query sequence identity, per-category success/error/denied/capped states, matched fields, allowed result fields, and stale-response rejection.
   - Do not expand searchable categories before role-safe projections are proved.
5. Notification, settings, PWA, feedback, and diagnostics cleanup.
   - Can start now for visible false claims and diagnostics.
   - Remove or bind the hard-coded PWA debug marker, align service-worker comments with active registration, render notification read failures as unavailable instead of empty, and centralize `ErrorBoundary`/`errorHandler`/identity diagnostics behind redacted operator-safe failure behavior.
   - Neutralize or source `SmartFooter`'s success-styled `LIVE SYNC ACTIVE` fallback; a mounted footer cannot manufacture realtime health.
   - Sound, haptic, and animation feedback must respect explicit accessibility/operator preferences before any new global feedback behavior is added.
6. Responsive refresh and continuation contract.
   - Can start now as a shared feedback specification; domain wiring waits for each owner pass.
   - Define loading, refreshing, buffered-old-row, failed-refresh, page-continuation and end-of-results states for `PullToRefresh`, `useStableList` and `useLoadMoreControl`.
   - Do not allow these shared controls to present a capped, client-sliced or unbounded collection as live or complete.
7. PageDataContext retirement plan.
   - Starts after Passes 1-7 define domain projections.
   - Convert `PageDataContext` from durable domain server truth into shell summary composition, route support, and optional domain hook aggregation.
   - Do not move every domain into one new broad context.
8. Dashboard and analytics route migration.
   - Starts after domain projections exist for emergency, finance, facility, identity, provider ops, visits, care/content, and subscribers.
   - Route cards, charts, comparison copy, and modal entries must render source, scope, time window, completeness, freshness, and unavailable states.
9. Realtime ownership consolidation.
   - Starts after domain data owners are named.
   - Global realtime should invalidate or refresh domain projections. It must not hold canonical data or directly drive UI truth.
   - Keep justified scoped exceptions for map/modal/detail surfaces only.
10. Aggregate, report, and export receivers.
   - Blocked until role, scope, dataset, redaction, time-window, and auditability are proved.
   - Exports must refuse fallback, unauthorized, incomplete, or demo slices unless the file itself clearly records that state.
11. Trend, search telemetry, and analytics automation.
    - Blocked until policy proves actor scope, privacy boundaries, source provenance, no-op behavior, and admin-only command authority.
    - No stub-success regeneration may appear as a completed production operation.

### Pass 8E Blocker Matrix

| Area | Can start now | Must wait for Pass 1-7 projections | Blocked until receiver or policy proof |
| --- | --- | --- | --- |
| Dashboard and mobile dashboard | Remove mock/default/fixed operational claims, dead patient controls, corrupted visible text, and false live labels. | Real KPI cards, source-labelled cross-domain summaries, patient-app handoff copy, recent activity redaction. | Export/report generation, patient-flow command receivers inside Console, public/sponsor performance claims. |
| Analytics route and modal | Disable false CSV/report output, remove default response time and fixed trend language, label unavailable slices. | Role-safe analytics projection for emergency, wallet, facilities, providers, visits, care, support, and subscribers. | Downloadable reports, subscriber analytics for non-admin roles, computed trends without comparison windows. |
| QuickSearch | Define query sequencing, partial results, capped results, denied/error states, matched fields, and stale-response policy. | Domain result projections and field whitelists by role. | Sensitive cross-domain search telemetry, global profile email exposure, admin trend regeneration. |
| PageDataContext | Document retirement targets and remove shell-only mock truth. | Domain hook/query owners for every consumed table family. | Any new broad server-truth context replacing `PageDataContext`. |
| Realtime | Inventory table/channel ownership and duplicate subscriptions. | Domain invalidation/query owners. | UI state driven directly from global realtime payloads, unscoped channels, cleanup-free subscriptions. |
| Notifications and preferences | Render notification read failure truthfully, remove raw diagnostics, and align visible toggles with actual receivers. | Own-user preference projection and role-aware notification action metadata. | Cross-user notification administration, compatibility retry that silently drops actions. |
| PWA, feedback, and diagnostics | Remove hard-coded debug artifact or bind it to build metadata; make PWA registration docs truthful; redact console diagnostics and sanitize shared action-error toast copy. | Operator preference model for haptics, sound, reduced motion, and route feedback density. | New global feedback behaviors or raw backend failure copy without accessibility and disclosure proof. |
| Footer and responsive list feedback | Neutralize unsupported `LIVE SYNC ACTIVE` footer health copy and define buffered/refresh/load-more feedback states. | Domain-owned bounded pagination, refresh, freshness and error projections from Passes 1-7. | Calling cached/buffered/capped/unbounded rows current or complete merely because feedback controls animate. |
| Activity and audit | Label dashboard activity as bounded recent preview and document sensitive fields. | Role-minimized activity projection from domain owners. | Treating recent activity as durable privileged-command audit proof. |
| Dormant operational components | Keep `Overview`, `useAnalytics`, `HospitalFleetManager`, `SchemaDebugger`, `NetworkStatus`, navigation notification mock, and example analytics excluded. | Explicit remount plan with projection owners and redacted diagnostic/reliability policy where applicable. | Mounting hard-coded fleet/performance/export, raw-data diagnostic or global-fetch interception UI as live capability. |
| Query/cache migration | Record the mounted but currently unused `QueryClientProvider` as foundation only. | Domain-owned query migration after Passes 1-7 establish scope and mutation/refetch contracts. | Treating global cache defaults as already-correct emergency, financial or provider query behavior. |

### Pass 8E First Implementation Ticket Contract

The first implementation ticket should be a read-only shell truth and command-readiness pass. It should introduce or document a `consoleShellProjection` boundary that consumes existing domain projections when they exist and otherwise returns explicit unavailable states.

Required slices:

- `domainProjectionStatus`: route/domain, owner pass, readiness, live/dormant classification, source doc, source code anchor.
- `dashboardMetricReadiness`: metric key, source owner, actor scope, time window, fallback state, freshness, render label.
- `analyticsExportReadiness`: actor role, included domains, excluded domains, completeness, degraded reason, redaction status, downloadable boolean.
- `searchReadiness`: query sequence id, category, allowed fields, matched field, result cap, success/error/denied state, stale-response guard.
- `realtimeOwnershipRegistry`: table/channel, domain owner, invalidation target, cleanup proof, scoped exception reason.
- `notificationPreferenceReadiness`: own-user notification read state, action metadata state, setting receiver, unavailable/error state.
- `utilityFeedbackReadiness`: PWA build/version source, install/update/offline state, feedback preference state, reduced-motion state, diagnostics redaction state.

Command readiness booleans should include at minimum:

- `canExportAnalytics`
- `canExportDashboard`
- `canOpenDashboardReport`
- `canUseGlobalSearch`
- `canRecordSearchTelemetry`
- `canRegenerateTrends`
- `canUseRealtimeChannel`
- `canUpdateNotificationPreference`
- `canDismissNotification`
- `canInstallPWA`
- `canTriggerFeedback`
- `canShowDebugTracker`

The first implementation ticket must not change:

- domain CRUD mutations
- export file generation
- realtime channel creation
- service-worker registration behavior beyond truthful comments/debug display
- notification writes or deletes
- preference writes
- trend generation RPCs
- database migrations
- Edge Functions
- storage assets
- patient-app command ownership

### Pass 8E Acceptance Gates

- No route displays mock, fallback, dormant, or fixed values as measured operational truth.
- `PageDataContext` is no longer accepted as a future source of durable domain truth.
- Every analytics/export/report entry point is disabled or guarded until actor, dataset, window, completeness, redaction, and degradation state are known.
- QuickSearch is sequence-safe and category-partial; denied or failed categories are not presented as no match.
- Notification reads distinguish empty, loading, unavailable, and failed states.
- Settings toggles and billing actions either have a real receiver or render as unavailable.
- PWA, feedback, and diagnostics are treated as live shell utilities with truthful build/update/accessibility state.
- Realtime is an invalidation/refresh layer, not a hidden global UI state owner.
- Activity feed labels its preview scope and does not substitute for critical audit evidence.
- Dormant operational components remain excluded until they consume owned projections.
- `QueryClientProvider` remains labelled foundation-only until domain queries, invalidation and risk-specific freshness/retry policies actually consume it.
- `NetworkStatus`/`useNetworkStatus` remains excluded or retired; shell reliability must not rely on replacing global `window.fetch`.
- `SmartFooter` renders no unsupported health/success assertion, and shared mobile refresh/load-more/buffering primitives do not promote parent collection completeness.

### Pass 8E Verification Commands

Static and documentation checks:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/passes/PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/passes/PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md
```

Implementation-readiness checks after code begins:

```powershell
rg -n "mock|fallback|default|Export Report|Generate Analytics Report|openAnalyticsModal|PWADebugTracker|console\\.error|serviceWorkerRegistration\\.register|useMockData|successRate: 95|12\\.0m|patient satisfaction|Free Tier|Upgrade" frontend/src
rg -n "channel\\(|subscribe\\(|removeChannel|on\\('postgres_changes'|get_recent_activity|searchAll|trending|notification" frontend/src
```

## Pass 8A Shell Surface-By-Surface Confirmation Ledger

This ledger is the continuation map for the cross-cutting shell pass. Pass 8 must consume domain truth from Passes 1-7; it must not become a shortcut that reimplements emergency, finance, facility, provider, visit, care or subscriber ownership in a dashboard layer.

| Surface or service edge | Current proof to retain | Required disposition before implementation | Stop condition |
| --- | --- | --- | --- |
| `PageDataContext` | Initializes mock/fallback domain data and broad realtime channels across emergency, visits, doctors, verification, support and analytics. | Retire as durable server-truth owner; keep only shell summary composition or explicit domain projection aggregation after Passes 1-7 exist. | Do not create a new broad context that owns all domain data again. |
| Dashboard/Bento home | `BentoHome` renders summaries, activity, trends and fallback-prone metrics; `Overview` is source-present but not the live route. | Replace fixed/fallback measured claims with source-labelled, unavailable, degraded or demo states. | No patient satisfaction, response, request, facility or fleet claim without owner/time-window/completeness proof. |
| Mobile dashboard | `MobileDashboard` renders live labels, corrupted copy risk, and patient-only rows with empty handlers. | Remove/degrade unsupported patient controls or hand off deliberately to canonical patient app surface with immediate feedback; run encoding gate when touched. | No interactive row with an empty handler. |
| Analytics route and modal | `Analytics.jsx`, `MobileAnalytics`, `AnalyticsPanel`, and `AnalyticsModal` can export or display fallback/default aggregate values. | Disable export/report until actor, dataset, scope, time window, completeness, redaction and source state are known. | No CSV/report over fallback, unauthorized or incomplete slices. |
| Subscriber-dependent analytics | Provider-accessible analytics can call admin-only subscriber analytics through route/service aggregate loading. | Isolate subscriber metrics to admin scope or render subscriber slice unavailable for non-admin actors. | No provider/org analytics path loads global subscriber truth. |
| QuickSearch | Shell searches multiple domains and profile email with independent caps and all-or-empty failure behavior. | Add sequence id, per-category role projection, partial/error/denied state and stale-response guard. | No denied/failed category is presented as ordinary no results. |
| Trending and automation | Trend services and automation can report success while source/provenance/no-op behavior is unproved. | Label trend source as live/view/manual/stub/unavailable; disable regeneration until receiver proves real update. | No stub success copy. |
| Notification center and preferences | Mounted notification center reads bounded own-user stream; settings toggle is hard-coded; failure can log user id and backend details while returning empty. | Add typed loading/empty/failed/unavailable states; wire or disable settings toggle; remove identity-bearing diagnostics. | No failed notification read rendered as empty. |
| PWA, feedback and diagnostics | PWA provider, install/offline/update notices, service worker registration, feedback audio/haptics and debug tracker mount globally. | Treat as live shell utilities with truthful version/build/update state and accessibility/preference rules. | No hard-coded debug badge or new sound/haptic behavior without preference proof. |
| Shell footer and mobile list feedback | `SmartFooter` mounts from `AppShell` and can show `LIVE SYNC ACTIVE`; `PullToRefresh` mounts in 16 live mobile variants and stable-list/load-more helpers mount in 11 list variants. | Source or neutralize footer health copy; define buffered/refresh/load-more states that inherit each domain's bounded projection and failure state. | No success-styled shell status or mobile continuation affordance becomes proof of freshness/completeness. |
| Query-cache foundation and dormant network interceptor | `App.js` mounts `QueryClientProvider` but no source consumer uses it; unmounted `NetworkStatus` would globally wrap fetch if introduced. | Keep query ownership explicitly unimplemented until domain migration; keep network interceptor excluded/retired. | No claim of API reliability, cache ownership or degraded-state handling from inert/global wrapper infrastructure. |
| Error boundary and browser diagnostics | ErrorBoundary logs route URL/stack/component stack in production console, shared `errorHandler` logs raw errors and exposes raw messages in toasts across routed actions, and mounted map/onboarding child boundaries log raw operational/provisioning errors. | Replace with redacted approved diagnostics and operator-safe visible recovery/action feedback across route, map and enrollment failures. | No browser console or raw receiver message as production monitoring/feedback sink for sensitive failures. |
| Activity feed and audit | `get_recent_activity`, `user_activity` subscription and activity transformation can expose location/identity metadata. | Label dashboard activity as bounded recent preview; minimize fields by role; keep privileged audit separate. | No recent feed treated as durable critical-command audit proof. |
| Context panels and shell actions | ContextPanel/FAB/bottom bar can mount domain hooks and emit route events across dashboard/analytics/search. | Remove hidden protected acquisitions and require mounted receivers before visible events. | No dead report/export/broadcast event or hidden protected list load. |
| Dormant operational components | `HospitalFleetManager`, navigation notification mock, dormant `useAnalytics`, and backup/export handlers exist in source. | Keep explicitly excluded or remount only after they consume owned projections and authorized receivers. | No hard-coded operational/export UI becomes live capability. |

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
- no auth denial, password failure, notification failure or route-error browser log carrying actor, entitlement, receiver or route/object detail

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
- Source/mount check proving `NetworkStatus` does not introduce a global `window.fetch` wrapper as shell reliability handling.
- Query ownership check proving any claimed TanStack Query migration has named domain consumers, invalidation behavior and risk-specific retry/freshness policy rather than only a mounted provider.
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
