# Stage 5 Service Inventory And Runtime Truth Closure Audit - 2026-05-24

## Status

Post-checkpoint service inventory and runtime-truth closure audit. Planning only; no product, database, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This stage proves that every console service has an explicit audit owner and then proves that each operational truth rendered or acted upon by the Console is traced through every runtime acquisition path. Earlier stages correctly prioritized emergency, payment, capacity, identity, provider operations, visits, content, and analytics. Service inventory is necessary, but it is not a runtime-completeness claim: a route can display or preload domain truth through globally mounted providers, shell panels, map contexts, modal lookups, analytics loaders, export handlers, or direct boundary calls that are not apparent from the route's primary service call.

## Method

Service inventory source:

- `frontend/src/services/*.js`
- import scan across `frontend/src`
- existing Stage 2, Stage 3, Stage 4, Stage 6, and contract-chart documentation

The service inventory must be refreshed with full-worktree search before each implementation pass starts. A service row is only a starting point; every route, page, modal, hook, context, view, and utility that imports or duplicates that service behavior must be read for the pass.

Required worktree scans:

```powershell
rg --files frontend/src
rg -n "from\\('|rpc\\(|functions\\.invoke|channel\\(|storage\\.|auth\\.|select\\(|insert\\(|update\\(|upsert\\(|delete\\(" frontend/src
rg -n "JSON\\.parse|new Date\\(|parseInt\\(|parseFloat\\(|Number\\(|\\|\\||\\?\\?|mock|fallback|demo|TODO|FIXME" frontend/src
rg -n "from\\('|rpc\\(|functions\\.invoke|insert\\(|update\\(|upsert\\(|delete\\(" C:/Users/Dyrane/Documents/GitHub/ivisit-app/services C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks
```

For a selected pass, every matching file is either included in the pass checklist or explicitly marked out of scope with a reason. The audit is line-by-line within that pass boundary, not a casual keyword skim.

For each service this audit records:

- source-of-truth role
- current console consumption pattern
- write or action authority
- whether prior audit coverage was explicit or only implied
- required implementation pass owner
- pre-implementation concern to preserve

## Deterministic Runtime Truth Closure Protocol

The `43/43` service-file register and the reverse shared-table ledger establish inventory coverage only. They do not establish runtime data-flow closure, list completeness, correct displayed totals, or safe implementation readiness. The hospital counterexample on May 25 proves that distinction: the route intends pagination but passes a nonexistent page-size field and executes an unbounded first-page query, while globally mounted providers independently acquire unbounded hospital collections and render potentially capped KPI truth.

No feature lane may be called fully audited or implementation-ready until it clears all five traversals below. For each lane, the first execution artifact is a surface operation and exposure ledger: read what the UI renders and offers to mutate before judging whether a service or receiver is adequate.

| Traversal | Starting point | Required search/read scope | Closure evidence |
| --- | --- | --- | --- |
| 1. Backend entity reverse trace | Every table, view, RPC result, Edge payload, Storage object class and external-provider payload in the domain. | Search service calls and direct `supabase`/Auth/Edge/Storage/fetch consumers; include shared utilities and dynamic imports. | Every consumer is assigned to a surface, provider, hook, modal, background loader, export or explicit dormant path. |
| 2. Runtime mount graph | Every live route plus `AppLayout`, shell, provider, global modal, context panel, map layer and navigation/FAB wrapper mounted with it. | Read route composition and all mounted provider effects, initializers, subscriptions and refresh functions. | Every query capable of running while the route is open is listed, even when the route component never imports it. |
| 3. Surface read/render/exposure trace | Every live route, panel, modal, table/card/detail/mobile variant, KPI, chart, search result and export, by role. | Inventory the visible fields and labels first, then trace each field/aggregate -> state/context/hook -> acquisition path -> table/RPC/function/source and read policy. | Each rendered claim proves read authorization, necessary exposure, identity/field semantics, bounds/window, filter/sort/count parity, enrichment, freshness/realtime and empty/error/unauthorized rendering. |
| 4. Surface mutation/receiver trace | Every create/edit/delete/verify/approve/transition/bulk/import/export/email/payment/assignment control exposed on the surface, by role. | After the render inventory, trace enabled control -> captured/submitted fields -> handler -> facade/direct call -> RLS/RPC/Edge/Storage receiver -> reflected read. | Each control and field is classified as authorized CRUD, workflow command, backend-derived read-only evidence or disabled/excluded boundary; UI cannot advertise unsupported mutation authority. |
| 5. Cross-surface parity trace | Every entity shared with `ivisit-app`, dispatch, billing, onboarding, patient safety or public discovery. | Compare Console reads/writes and fields to app and shared Supabase authority. | Console cannot claim management completeness while omitting app-consumed capability, identity, provenance or lifecycle truth. |

Required row schema for every runtime truth claim:

| Required field | Must answer |
| --- | --- |
| Domain entity and user-visible claim | What operational truth is displayed, selected, exported or mutated? |
| Surface and actor role | Which route/panel/modal/mobile/desktop/export surface exposes it, and which operator roles can encounter it? |
| Mount path and trigger | Which route/provider/modal/action/realtime event causes the acquisition? Does it run globally or only on demand? |
| Caller and source | Which page/context/hook/service/direct boundary reads it, and from which table/RPC/Edge/Storage/external source? |
| Read exposure authority | Does policy/RPC scope authorize that actor to see each exposed field/aggregate, and is the surface exposing only required operational data? |
| Retrieval class | Server-paged, bounded summary, bounded lookup, full authorized set with proven maximum, realtime delta, detail read, or unavailable. |
| Correctness contract | How are role scope, filters, stable order, counts, aggregates, joins/enrichment, identity, stale responses and partial failures kept truthful? |
| Visible control and submitted fields | Which mutations/actions are offered and what exact values or fields does each surface collect or send? |
| Receiver/action authority | Does RLS/RPC/Edge/Storage authorize the actor, field set and lifecycle transition, or why is the action disabled/read-only? |
| Disposition and pass | Retain, centralize, replace, disable or retire; blocking pass and validation evidence. |

### Surface Operation And Exposure Ledger Requirement

Existing Stage 2 contract charts provide evidence for selected high-risk fields and actions, but they do not waive a complete surface sweep. For every live surface in a pass, Stage 5 or its pass evidence must contain rows with this shape before implementation:

| Surface and allowed actor | Read/render promise | Read source and exposure authority | Visible mutation or action | Submitted fields and receiver authority | CRUD/command status | Required disposition/pass |
| --- | --- | --- | --- | --- | --- | --- |
| Route, panel, modal, card/table/mobile/export variant and role entitlement. | Fields, aggregates, statuses, labels, controls and downloadable data shown to the operator. | Source plus RLS/RPC/Edge/Storage authorization; identify overexposure, missing data and false labels. | Create/edit/delete/transition/approve/assign/import/export/email/payment controls, including apparent no-op controls. | Exact payload fields and supported policy/RPC/function transition, or confirmed absent receiver. | Authorized read, authorized CRUD, workflow command, derived read-only evidence, unsupported, unauthorized or unavailable. | Centralize, implement receiver, remove exposure, disable control, relabel or retire; owning pass. |

Closure rules:

- Audit both directions for every lane: entity/source -> all runtime consumers, and live route/action -> all mounted acquisitions/receivers.
- Begin each surface review from rendered exposure and available controls, not from the service API: the audit must discover incorrect read access, excess disclosure, missing data and unsupported CRUD promises.
- Never declare a surface correct from its primary list query alone; provider/bootstrap/context/map/analytics/modal/export paths mounted with that surface are part of the surface.
- Never treat a UI control as implemented because state exists; prove that it changes the authoritative query or receiver.
- Never treat a returned array length as an aggregate total unless a proven maximum bound makes it complete.
- Any newly found unrecorded runtime path reopens the affected lane, invalidates its readiness decision and triggers the same reverse trace for adjacent shared entities.

Current closure status:

| Inventory layer | Status | Meaning |
| --- | --- | --- |
| Console service files | Complete (`43/43`) | Every service has a planned lane; does not prove all runtime acquisitions. |
| Shared table capability ledger | Complete as maintained reverse inventory (`45/45`) | Table-backed capability absence is recorded; does not prove rendered claim correctness. |
| Runtime truth claims and mounted acquisition paths | In progress; not closed | Hospital discovery proves globally mounted/background paths must be swept across every lane before implementation starts. |
| Surface read/exposure and CRUD/command authority rows | In progress; not closed | Existing high-risk contract charts seed this work, but every live surface and actor entitlement still needs deterministic render-and-operation closure. |

### Global Mounted Acquisition Register

`AppLayout` mounts `MapProvider` and `PageDataProvider` around the application shell. `PageDataProvider` starts its domain loads whenever an authenticated user is available, independent of the route the operator opened; `MapProvider` initializes map collections and subscriptions without checking authentication or route authorization, including while public/auth routes are open. In addition, the live `/map` component `GodModeMap` mounts a second `MapProvider` around its content while it is already below the shell provider, so entering the operational map can initialize a duplicate feed/channel owner. These paths are therefore in scope for each affected domain pass, not deferred dashboard polish.

| Mounted owner and trigger | Entity/claim acquired globally | Retrieval behavior proven in source | Reliability/ownership disposition | Pass |
| --- | --- | --- | --- | --- |
| `PageDataContext` authenticated initialization | Emergency KPI totals/status mix/recent rows | Calls `getEmergencyRequests()` without window, then derives totals and recent rows from returned array. | Unbounded/capped collection cannot be global emergency totals; replace with owned aggregates/recent window and domain invalidation. | Pass 1 / Pass 8 |
| `PageDataContext` authenticated initialization | Verification summary | Calls `getVerificationStats()` and substitutes zero values for restricted reads. | Retain only as explicitly authorized aggregate; distinguish no access from zero pending verification. | Pass 4 / Pass 8 |
| `PageDataContext` authenticated initialization | Dashboard analytics across users, emergencies, hospitals, ambulances and subscribers | Calls `getAnalyticsData({ timeRange: 'all', includeRawData: true })`; analytics itself calls full-collection emergency/hospital/ambulance reads and produces derived values. | Duplicate broad load and derived truth cannot remain shell-owned; bounded aggregates and unavailable/degraded status required. | Pass 1 / Pass 3 / Pass 5 / Pass 7 / Pass 8 |
| `PageDataContext` authenticated initialization | Doctor totals/status/recent rows | Calls `getDoctors()` with no page window and derives totals from returned rows. | Provider totals are potentially capped and duplicate route ownership; use provider aggregates/recent projection. | Pass 5 / Pass 8 |
| `PageDataContext` authenticated initialization | Visit totals/status/today/recent rows | Calls `getVisits()` without window and derives totals from returned rows. | Clinical-history summary cannot be derived from a response-limited collection; use visit aggregate/recent projection. | Pass 6 / Pass 8 |
| `PageDataContext` authenticated initialization | Hospital network/capacity/fleet totals/recent rows | Calls `getHospitals()` without window and reduces rows for totals, beds and ambulances. | Confirmed false-completeness path: 1000 returned hospitals can be displayed as complete network capacity. | Pass 3 / Pass 8 |
| `PageDataContext` authenticated initialization | Ambulance fleet/status/recent rows | Calls `getAmbulances()` without window and derives totals from rows. | Fleet totals are potentially capped and duplicate fleet route/map state; use scoped fleet aggregates and feed owner. | Pass 5 / Pass 8 |
| `PageDataContext` authenticated initialization | User totals/role distribution and user rows | Calls `getUserStatistics()` where available, but also calls unwindowed `getProfiles()` and may derive statistics from rows. | Keep authoritative aggregate separate from bounded user list; never substitute collection length for management totals. | Pass 4 / Pass 8 |
| `PageDataContext` authenticated initialization and broad realtime | Support ticket totals/status/week/resolution time | Calls `getSupportTickets()` without window, calculates metrics from rows and switches global mock mode on failure. | Partial or failed support reads cannot create complete KPIs or mock operational truth. | Pass 7 / Pass 8 |
| `PageDataContext` authenticated initialization and realtime | Insurance policy collection | Calls `getInsurancePolicies()` without window and stores collection globally. | Patient-sensitive policy collection is unbounded and over-broad for shell state; replace with authorized summary or route-owned read. | Pass 7 / Pass 8 |
| `PageDataContext` authenticated initialization | Wallet and recent ledger preview | Directly reads main/org wallet, then loads ledger ordered by time with `.limit(10)`. | A deliberately recent preview must be labelled and remain distinct from complete ledger/history/export. | Pass 2 / Pass 8 |
| `PageDataContext` authenticated initialization and activity realtime | Recent activity | Calls bounded `getRecentActivity()` default window through RPC. | Bounded preview is acceptable only with a recent-activity label and one realtime owner. | Pass 8 |
| `PageDataContext` authenticated initialization and pricing realtime | Service and room prices plus hospital mappings | Calls `getPricing('services')` and `getPricing('rooms')`; each loads all hospital mappings and all pricing rows. | Remove unbounded duplicate pricing/bootstrap reads; use scoped price projection and independent summary truth. | Pass 3 / Pass 8 |
| `PageDataContext` authenticated initialization and organization realtime | Organizations and organization wallet balances | Calls `getOrganizations()`, which loads all organizations and all organization wallets, then derives total/active/wallet values. | Unbounded registry plus financial join cannot serve global shell totals; use scoped registry and aggregate projection. | Pass 2 / Pass 4 / Pass 8 |
| `MapProvider` shell initialization and map subscriptions, including public/auth routes | Emergency markers | `AppLayout` wraps every route and `MapContext` has no auth/route guard: it loads latest `100` emergencies and subscribes broadly to all emergency changes even on `/login`, `/set-password`, `/onboarding`, `/unauthorized` and fallback routes. | This is a public-route protected-feed attempt as well as a bounded-map issue; do not acquire or subscribe until an authorized operational map surface is entered and expose bound/completeness there. | Pass 1 / Pass 5 / Pass 8 |
| `MapProvider` shell initialization and map subscriptions, including public/auth routes | Ambulance markers | Unguarded provider loads ambulances without a window and subscribes broadly before route authorization. | Map feed cannot be an unauthenticated or unbounded second fleet owner; authorize mount and define active/viewport feed plus telemetry lifecycle. | Pass 5 / Pass 8 |
| `MapProvider` shell initialization, including public/auth routes | Hospital markers and nearby fallback | Unguarded provider loads hospitals without a window; nearby-RPC fallback also reads available hospitals without a bound. | Public/login shell must not bootstrap operational facility coverage; protected map needs geospatial/viewport bounds and unavailable/fallback labeling. | Pass 3 / Pass 5 / Pass 8 |
| `MapProvider` shell subscription, including public/auth routes | User location channel | Unguarded provider subscribes to `users` for patient locations even though the table/visibility contract is stated only as an assumption in source comments. | Disable immediately at planning priority or replace only after authenticated route mount, patient-location receiver, role scope and privacy authority are proven. | Pass 1 / Pass 4 / Pass 5 / Pass 8 |
| Nested `MapProvider` mounted by `GodModeMap` after shell `MapProvider` already mounted | Operational map emergencies, ambulances, hospitals and user-location channel | Loading `/map` mounts a second independent `MapContext` initialization/subscription effect for the same dataset families. | Retain exactly one authorized bounded map projection/channel owner; route content consumes the owner rather than recreating it. | Pass 1 / Pass 3 / Pass 5 / Pass 8 |
| `ContextAwareFAB` shell mount | Insurance policies, support tickets and subscribers | `AppShell` renders the FAB on every route; it calls `useInsurance()`, `useSupportTickets()` and `useSubscription()` before returning `null` on mobile or while the panel is open. Each hook performs initial reads and subscriptions. | A hidden command affordance must not globally acquire sensitive/full collections or admin-only subscriber data. Load command dependencies only in an authorized opened surface or share a narrowly scoped projection. | Pass 7 / Pass 8 |
| `DynamicBottomBar` shell mount | Insurance policies, support tickets and subscribers | `AppShell` renders the bottom bar on every route; it calls the same three hooks before returning `null` on non-mobile viewports. Each hook performs initial reads and subscriptions. | This duplicates the FAB hidden acquisition on all viewports and routes; remove route-independent hook mounting and use deliberate action-owned command boundaries. | Pass 7 / Pass 8 |
| `ContextPanelShell` when opened on desktop/tablet | Subscribers and domain context summaries | The shell conditionally mounts `ContextPanel`; while open it invokes `useSubscription()` regardless of active route and projects route context from `PageDataContext`. | Context-open state must not add a full admin-only subscriber fetch/channel outside `/subscriptions`; use authorized route-specific summaries only. | Pass 7 / Pass 8 |
| Global PWA, feedback and debug mounts | Browser install/update/offline state, interaction feedback, visible version marker | `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` mount outside routed content; `index.js` actively invokes `serviceWorkerRegistration.register()`. They do not read domain tables, but render or affect public and protected routes. `PWADebugTracker` displays a fixed `v1.0.33`; feedback callers can request audio and haptics. | Classify as shell utility behavior rather than unreviewed infrastructure: remove or authoritatively source production debug copy, verify active service-worker/PWA actions, and gate interaction effects through accessibility/operator expectations. | Pass 8 |

### Browser Console Disclosure Register

Browser console output is an exposure sink for this audit. Logging a loaded row, command payload or realtime payload is not harmless diagnostics when the value includes patient, identity, payment or care data.

| Live source path | Data currently emitted to browser console | Required disposition | Pass |
| --- | --- | --- | --- |
| `VisitModal.jsx` and `EmergencyRequestTableView.jsx` | Full selected visit, submitted clinical form payload, hospital id and fetched linked clinical-record result. | Remove data-bearing logs; retain only redacted development diagnostics if explicitly gated. Include console-output smoke in clinical flow verification. | Pass 6 / Pass 1 |
| `emergencyService.js` cash approval/decline functions | RPC command identifiers and returned cash-payment result object. | Remove or redact command/result logging before cash-payment workflow is enabled; audit evidence belongs to backend/reflected projection, not browser logs. | Pass 1 / Pass 2 |
| `AuthContext.jsx`, `ContextPanel.jsx` user action and desktop `SettingsPage.jsx` avatar render | Signed-in email/profile flow messages, selected user object and resolved avatar media URL on image load/failure. | Remove identity/media-bearing logs or reduce to non-sensitive development-only state events. | Pass 4 |
| `components/common/ProtectedRoute.jsx` | Live access-denial branches emit the operator role plus attempted route or protected resource name from every protected route wrapper. | Keep denial visible in the UI without browser identity/entitlement diagnostics; any retained development event must be redacted and gated. | Pass 4 / Pass 8 |
| `components/modals/SecurityModal.jsx` | Failed own-user password updates emit the raw Supabase Auth error object from a mounted settings receiver. | Render bounded recovery feedback and remove raw credential-flow diagnostics from the browser console. | Pass 4 / Pass 8 |
| `components/onboarding/OrganizationDetailsStep.jsx`, `contexts/OnboardingContext.jsx` and `services/onboardingService.js` | Mounted enrollment and facility-match paths write raw hospital-search, account-creation, organization/profile and document-upload failures to browser logs and can surface raw receiver text in toasts. | Route onboarding failures through bounded identity/provisioning feedback and redacted diagnostics only; no facility, profile, Storage or Auth error object is ordinary browser output. | Pass 4 / Pass 8 |
| `components/map/ErrorBoundary.jsx` and `components/pages/GodModeMap.jsx` | Active map rendering and driver telemetry failures write raw error/error-info objects to the browser console. | Preserve visible degraded-map/failed-action feedback while removing payload-bearing console diagnostics; telemetry/location failure details require an approved redacted sink. | Pass 1 / Pass 5 / Pass 8 |
| `components/map/MapRefiner/GoogleMapsSmartRoute.jsx` | Active external route calculation failure writes the raw Google Routes error object before substituting a straight path. | Render explicit degraded-route status and retain only redacted diagnostic state; external routing failure details are not ordinary console output. | Pass 5 / Pass 8 |
| `useInsurance.js` and `useSupportTickets.js` realtime subscriptions | Realtime policy/ticket payloads while hooks can mount route-independently from shell controls. | Remove payload logging together with hidden shell acquisition; no protected care record is written to browser console. | Pass 7 / Pass 8 |
| `notificationService.js` notification read failure | Own-user UUID plus raw backend error object/details/hint on a failed notification query. | Render a bounded unavailable notification state and retain only redacted development diagnostics; own-user scope does not authorize browser disclosure. | Pass 8 |
| `components/common/ErrorBoundary.jsx` | In production, `sendErrorToMonitoring()` writes stack, component stack, full `window.location.href` and user agent to `console.error`; route URLs can carry selected-object or workflow identity. | Replace console-labelled monitoring with an approved redacted diagnostics boundary, strip record/query identity from retained metadata and make failure feedback visible without browser disclosure. | Pass 8 |
| `utils/errorHandler.js` through mounted pages/modals | Shared `handleError()` writes the raw error object to `console.error` and presents `error.message` in a visible toast; it is invoked across emergency, facility, provider, identity/auth, visits, insurance, support, subscriber and content controls. | Make this the central redaction and operator-safe error-copy boundary: no raw backend/Auth/Edge/Storage object in console and no receiver/internal detail surfaced as operator copy. Owning passes still verify their failure states. | Pass 1-8, mechanism in Pass 8 |

Console-output closure rule (May 25): the register names proved payload-bearing paths and the shared error sink. Every implementation pass must also sweep its live services/hooks/pages for `console.log`, `console.warn` and `console.error` before completion. A generic `console.error(..., error)` is not implicitly acceptable because Supabase, Auth, Edge, Storage and realtime failures can contain identifiers, policy detail or payload context; it must be removed, redacted and development-gated, or assigned to an approved diagnostics boundary.

## Coverage Summary

| Service | Role | Current consumption signal | Prior coverage | Implementation owner |
| --- | --- | --- | --- | --- |
| `activityService.js` | Activity/audit event reads, stats, realtime, and helper logging. | Imported by `PageDataContext`, `useActivity`, emergency and verification writers; live recent feed can render address-bearing emergency descriptions while activity metadata can contain provider identity. | Explicit in Stage 4/6 as audit support, but sensitivity/exposure required deeper closure. | Pass 1 / Pass 4 writers and Pass 8 role-scoped activity projection; Pass 2 cross-cutting audit policy. |
| `adminService.js` | Admin permissions, invite, bulk user operations, suspend/delete, audit/export and analytics helpers. | Live importer found for `DoctorModal` invite only; `useAdmin` imports broad APIs but no rendered importer of that hook was found. `UsersPage` and verification operate through separate/direct paths. | Explicit, with live-versus-dormant distinction required. | Pass 4 identity/admin authority: repair live invite/direct page flows; keep unmounted admin APIs excluded unless deliberately surfaced. |
| `ambulancesService.js` | Ambulance CRUD, driver assignment, location, status, drivers. | Imported by `PageDataContext`, `useAmbulances`, pages, modals, user creation. | Explicit. | Pass 5 provider operations and ambulance telemetry. |
| `analyticsAutomationService.js` | Analytics automation/regeneration wrapper. | Service-only export; no rendered caller found. | Source-proven stubbed receiver in care/content chart. | Pass 8 disables regeneration until a real aggregation receiver exists. |
| `analyticsService.js` | Dashboard analytics, summaries, time series, performance metrics, cache. | Imported by `PageDataContext`, `useAnalytics`, analytics page. | Explicit. | Pass 8 analytics/dashboard truth. |
| `authService.js` | Current user, admin check, auth-aware query helpers, password update. | Imported by pages and `AuthContext`. | Explicit. | Pass 4 identity/auth boundary, with cross-pass guards. |
| `bedManagementService.js` | Bed/capacity records, availability actions, hospital capacity helpers. | Imported by `HospitalModal`; read/write path supports emergency capacity. | Explicit. | Pass 3 hospitals/capacity, with Pass 1 dependency. |
| `displayIdService.js` | Display ID detection and UUID/display-ID resolution. | Imported by settings/profile display surfaces and docs. | Explicit as identity helper. | Pass 4 identity infrastructure. |
| `doctorsService.js` | Doctor CRUD, profile linkage, availability/status. | Imported by `PageDataContext`, hooks, modals, visits page, user creation. | Explicit. | Pass 5 provider operations; Pass 6 visit context dependency. |
| `driverManagementService.js` | Driver profile, assignment, status, telemetry-related management. | Imported by ambulance modal and map. | Explicit. | Pass 5 provider operations and map telemetry split. |
| `emergencyResponseService.js` | Dispatch, responder location, completion response actions. | Imported by emergency page, map, mobile map, marker detail. | Explicit. | Pass 1 emergency lifecycle and Pass 5 telemetry boundaries. |
| `emergencyService.js` | Emergency list/detail/create/update/actions, cash approval/decline, realtime. | Imported by `PageDataContext`, hooks, emergency pages/modals/views. | Explicit. | Pass 1 emergency lifecycle and cash/payment truth. |
| `healthNewsService.js` | Health news CRUD, publish toggle, categories, realtime. | Imported by health news page/hook. | Explicit. | Pass 7 content. |
| `hospitalImportService.js` | Hospital import, enrichment, bulk import/update support. | Imported by `HospitalModal`. | Explicit but mostly as supporting service. | Pass 3 hospitals and public discovery ingestion. |
| `hospitalsService.js` | Hospital CRUD, verified hospital reads, specialty search, bed count. | Imported by `PageDataContext`, hooks, pages, modals, visit context. | Explicit. | Pass 3 hospitals/capacity/discovery. |
| `insurancePoliciesService.js` | Insurance policy CRUD, active policy queries, realtime. | Imported by `PageDataContext` and insurance hook subscription. | Duplicate writer; active UI workflow owner is `insuranceService.js`. | Pass 7 restricts it to compatible subscription/read support while duplicate writes are consolidated. |
| `insuranceService.js` | Insurance normalization, writes, status, card upload, realtime. | Imported by `useInsurance` and `InsuranceModal`. | Explicit as duplicate/receiver drift risk. | Pass 7 insurance lifecycle and upload path. |
| `medicalProfilesService.js` | Medical profile, allergies, conditions, medications, emergency contacts. | No direct page import in scan; supports patient safety data. | Mentioned, but thin. | Pass 6 or Pass 7 patient-care records, depending on whether consumed by visit detail. |
| `notificationService.js` | Notification creation, read state, realtime, action metadata. | Imported by notification center and many CRUD modals/pages. | Explicit as action side-effect support. | Cross-pass service, primarily Pass 7 and Pass 8 feedback. |
| `onboardingService.js` | Onboarding organization/provider profile creation and setup. | Imported by `OnboardingContext` and organization onboarding step. | Partial. | Pass 4 identity, verification, onboarding authority. |
| `organizationsService.js` | Organization CRUD/read model. | Imported by `PageDataContext`, organizations page, users page. | Not explicitly covered before this stage. | Pass 4 organization registry; Pass 2/3/7 scope dependency. |
| `orgVerificationService.js` | Organization/facility verification queue and stats. | Imported by verification queue. | Explicit. | Pass 4 facility verification authority. |
| `preferencesService.js` | User preferences, demo mode, notification toggles, sharing preferences. | No direct import in source scan; Settings switch is unwired. | Source-classified ownership split below. | Pass 8 operator notification wiring only; patient demo/privacy excluded. |
| `pricingService.js` | Service and room pricing read/write/delete. | Imported by `PageDataContext` and pricing page. | Explicit. | Pass 3 pricing scope and organization semantics. |
| `profilesService.js` | Profile CRUD, search, role reads, avatars, statistics. | Imported by `PageDataContext`, user/admin/hooks, visit context, auth. | Explicit. | Pass 4 identity; Pass 5/6 dependent profile joins. |
| `rbacPatterns.js` | Shared authorization helpers, authorized query builder, service error handling. | Imported by verification and organization verification services. | Source-classified as active verification infrastructure below. | Pass 4 security helper guardrail; never an RLS replacement. |
| `searchAnalyticsService.js` | Search analytics summaries and metrics. | Service object export, documented in analytics context. | Explicit but high-level. | Pass 8 search/analytics truth. |
| `searchEventsService.js` | Search event CRUD and realtime. | No direct import found in scan. | Not explicitly covered before this stage. | Pass 8 search telemetry lifecycle. |
| `searchHistoryService.js` | Search history CRUD, clear history, popular searches, realtime. | No direct import found in scan. | Not explicitly covered before this stage. | Pass 8 search history/privacy lifecycle. |
| `searchSelectionsService.js` | Search selection CRUD, user selections, result-type queries, realtime. | No direct import found in scan. | Not explicitly covered before this stage. | Pass 8 search selection/audit lifecycle. |
| `searchService.js` | Quick search facade across console entities. | Imported by `QuickSearch`; active history/selection writer. | Confirmed broken ambulance projection below. | Pass 8 repairs query projection and preserves it as active telemetry owner. |
| `staffSchedulingService.js` | Staff schedules, availability, conflicts, stats, realtime. | Imported by staff scheduling modal. | Source-proven receiver drift: it bypasses existing authorized `doctor_schedules` and generates rows from statuses. | Pass 5 implements doctor-shift CRUD against `doctor_schedules`; ambulance shift CRUD remains excluded without a receiver. |
| `storageService.js` | Image upload and URL helpers. | Imported by ambulance, doctor, hospital, and insurance modals. | Not explicitly covered before this stage. | Cross-pass media/upload authority, with Pass 3/5/7 consumers. |
| `subscribersService.js` | Subscriber CRUD/count/status helpers. | No direct import found in scan; overlaps `subscriptionService`. | Explicit as duplicate-risk but not owner-decided. | Pass 7 subscriber lifecycle consolidation. |
| `subscriptionService.js` | Subscriber management, bulk/custom/welcome email, status/type, realtime. | Imported by subscription hook/page/modal. | Explicit. | Pass 7 subscription and email lifecycle. |
| `supabaseHelpers.js` | Timeout/retry/batch/realtime/audit wrappers. | No direct import found in scan. | Thin infrastructure mention. | Cross-pass service infrastructure; Pass 8 audit/retry policy. |
| `supabaseMapService.js` | Map entities, subscriptions, emergency/hospital/ambulance projections. | Imported by map context and God Mode map. | Explicit. | Pass 5 map telemetry and Pass 8 realtime ownership. |
| `supportFaqsService.js` | Support FAQ CRUD, search, category, realtime. | No direct import found in scan. | Not explicitly covered before this stage. | Pass 7 support content/FAQ management. |
| `supportTicketsService.js` | Support ticket CRUD, status, counts, user tickets, realtime. | Imported by `PageDataContext`, hook, support modal/page. | Explicit. | Pass 7 support lifecycle and read owner cleanup. |
| `trendingTopicsService.js` | Trending topic CRUD/category/top topics/realtime. | No direct import found; QuickSearch reads trends through `searchService`. | Read-only/manual trend state proven below. | Pass 8 keeps generated/write controls dormant until aggregation exists. |
| `verificationService.js` | Provider verification queue, stats, realtime, permission check. | Imported by `PageDataContext` and verification queue. | Explicit. | Pass 4 provider verification authority. |
| `visitsService.js` | Visit CRUD, completion/cancel/no-show, realtime, context hydration. | Imported by `PageDataContext`, hooks, visits page, emergency views/modal. | Explicit. | Pass 6 visits ownership, with Pass 1 emergency dependency. |
| `walletService.js` | Wallet summary, finance analytics, projections, withdrawals, top-ups, Stripe setup/cards. | Imported by wallet page/modals, analytics, bento, emergency page. | Explicit. | Pass 2 wallet/Stripe/ledger, with Pass 1 cash dependency. |

Reachability reconciliation (May 25): a renewed static importer graph confirms all `43/43` service modules remain in this inventory. It additionally proves that `medicalProfilesService`, `preferencesService`, `searchAnalyticsService`, `searchEventsService`, `searchHistoryService`, `searchSelectionsService`, `subscribersService`, `supabaseHelpers`, `supportFaqsService`, `trendingTopicsService` and `analyticsAutomationService` have no external runtime importer found in `frontend/src`; they remain explicit missing-capability, compatibility or dormant-risk scope rather than live rendered workflows. `adminService` is live for doctor-invite use only in this scan; its broader `useAdmin` API family is source-present without a rendered hook consumer. Conversely, `staffSchedulingService` is live because `HospitalsPage` mounts `StaffSchedulingModal`; its status-derived fake shift persistence cannot be categorized as dormant.

## Services Newly Promoted To Explicit Coverage

These services had zero or near-zero explicit audit coverage before this stage and must not be skipped during implementation planning:

- `organizationsService.js`
- `searchEventsService.js`
- `searchHistoryService.js`
- `searchSelectionsService.js`
- `storageService.js`

## Reverse Receiver Gaps Beyond Existing Services

The service inventory is complete for `frontend/src/services/*.js`, but it cannot prove coverage of a backend capability for which Console has no service. A reverse scan of all 45 shared source-declared tables identifies these additional implementation obligations:

| Available receiver | Console runtime evidence | Disposition | Pass owner |
| --- | --- | --- | --- |
| `providers` | No table-backed provider-catalog management path; hospital CRUD omits app-visible taxonomy/eligibility. | Missing required provider catalog/classification capability. | Pass 3 |
| `hospital_media` | Type-only reference; Console mutates raw hospital image URL without provenance ownership. | Missing required facility media provenance capability. | Pass 3 |
| `doctor_schedules` | Type-only receiver reference; active scheduling service does not use table. | Missing required table-backed doctor scheduling capability. | Pass 5 |
| `emergency_doctor_assignments` | Type-only reference; no guarded clinician assignment workflow found. | Missing required emergency clinical handoff capability. | Pass 1 / Pass 5 |
| `emergency_status_transitions` | Type-only reference; no visible status-history read surface found. | Missing required read-only emergency audit timeline; mutation prohibited. | Pass 1 |
| `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages` | Type-only references while patient app has a chat service/RPC flow. | Missing required scoped emergency communication capability. | Pass 1 |
| `insurance_billing` | Type-only reference; policy UI does not show trigger-created billing outcomes. | Missing required scoped billing outcome/read-exception capability. | Pass 2 / Pass 7 |
| `exchange_rates` | Type-only reference; billing quote/rate refresh is app-owned. | Explicit dependency only; add reporting visibility only if required, no Console mutation logic. | Pass 2 |
| `documents` | Storage upload paths exist, but no data-room table operations. | Explicitly outside Console data-room ownership; do not implement here. | Pass 7 boundary check |
| `user_roles` | Type-only reference; profile/Auth receivers own effective Console identity flow. | Explicitly no parallel Console CRUD. | Pass 4 |

`hospital_import_logs` and `admin_audit_log` are the inverse case: they already have active Console service references but need durable visibility/error handling rather than a new backend receiver.
- `supportFaqsService.js`
- `preferencesService.js`
- `trendingTopicsService.js`
- `rbacPatterns.js`
- `supabaseHelpers.js`
- `medicalProfilesService.js`
- `analyticsAutomationService.js`

### Reverse App RPC And Edge Boundary Reconciliation

A May 25 reverse extraction of `ivisit-app/services`, hooks and screens closes a second form of omission: all `24/24` app-addressed table names found by the scan are represented in this alignment corpus, but six RPC names and five Edge Function slugs were not previously assigned to a Console pass or explicit exclusion. A Console audit is not comprehensive until app receivers that generate, settle, notify or qualify Console-visible truth are classified even when Console never invokes them.

| App-addressed receiver | Proven app-side meaning | Required Console treatment | Owner |
| --- | --- | --- | --- |
| `calculate_emergency_cost_v2` | Patient cost calculation used by `pricingService.js` and `serviceCostService.js`; service-cost error path can return mock cost. | Emergency/pricing must expose canonical versus degraded/fallback quote provenance and may not infer patient final charge from Console CRUD alone. | Pass 1 / Pass 3 |
| `process_wallet_payment` | Patient wallet settlement RPC invoked by `paymentService.js`. | Wallet/payment/ledger read model must reflect this settlement; no browser-side substitute or duplicate write path. | Pass 2 |
| `process_visit_tip`, `record_visit_cash_tip` | Patient visit-tip card/cash RPCs invoked by `paymentService.js`. | Preserve authorized finance/history reflection; visit CRUD cannot mutate tip truth as ordinary row fields. | Pass 2 / Pass 6 |
| `notify_cash_approval_org_admins` | Cash approval request notification RPC; `notificationDispatcher.js` has a client fallback insert branch. | Identify one authoritative notification/reflection contract and distinguish delivery from payment settlement or dispatch release. | Pass 1 / Pass 2 / Pass 8 |
| `triage-copilot` | Patient-origin AI prompt suggestion function behind app feature flag. | Consume only persisted/authorized triage context if operationally required; no Console generation claim. | Pass 1 dependency |
| `bootstrap-demo-ecosystem`, `demo-approve-cash-payment`, `demo-dispatch-reply` | Demo bootstrap, cash approval and dispatch-chat writers. | Isolate from production approval/payment/chat claims; label any deliberate demo read path. | Pass 1 / Pass 2 / Pass 8 exclusion |
| `review-demo-auth` | Patient review/demo login function. | Never treat as Console auth/onboarding authority. | Pass 4 exclusion |
| `reload_schema` | App migration/seed maintenance RPC. | Never expose as a product receiver or use as operational evidence. | Pass 8 exclusion |

Reverse service-family classification also confirms that app discovery/media helpers strengthen Pass 3 provider/media provenance; app location/routing/saved-location helpers inform operational location parity without granting Console patient saved-location CRUD; and app emergency-contact memory/API/migration helpers remain patient boundaries unless a specifically authorized emergency-detail exposure is approved.

Broad app-source confirmation (May 25): expanding the reverse scan across `950` files under app `services`, `hooks`, `screens`, `components`, `contexts`, `stores`, `machines`, `utils` and `atoms` found the same `24` statically addressed table names, `25` RPC names and `9` Edge Function slugs, with zero additional receiver names absent from this alignment corpus. Constant-backed app table adapters were also inspected (`ambulances`, `emergency_contacts`, `support_faqs`, `support_tickets`, `visits`, `notifications`, `insurance_policies`) and map to already assigned lanes or explicitly patient-scoped boundaries. This closes receiver-name discovery for the current source snapshot; it does not replace surface-level exposure, payload, role, failure, pagination or reflected-state proof in the owning passes.

## Edge Function And RPC Receiver Coverage Register

The surface audit must also reverse-trace deployable command receivers. A May 25 scan found `10` externally addressed Edge slugs in active Console code or delivered email HTML, plus one source-present subscriber worker that can alter lifecycle state without a rendered Console invocation. Function-folder presence is not enough: the deployable slug must be proved, especially where the local Console tree groups handler source under a different immediate directory name.

| Addressed Edge receiver or background writer | Console acquisition or command path | Source ownership proved in this audit | Deterministic finding and disposition | Pass |
| --- | --- | --- | --- | --- |
| `create-payment-intent` | `walletService.topUpWallet()` / financial modal; emergency card consequences share the same finance truth. | Present in `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payment-intent/index.ts`; authenticated patient-oriented receiver writes payment intent/pending payment context. | Cross-repo shared receiver, not a Console-local function. Prove operator/top-up actor context and webhook reflection before any Console success copy. | Pass 2 |
| `create-payout` | `walletService.withdrawFunds()` / withdrawal modal. | Present in `ivisit-app/supabase/functions/payments/create-payout/index.ts`; authorizes `admin`/`org_admin` and scopes org-admin payout to own organization. | Cross-repo shared receiver. Preserve backend organization/sufficiency/result checks; displayed balance alone cannot authorize payout. | Pass 2 |
| `manage-payment-methods` | `walletService` billing-method/setup/default/delete paths and financial modal. | Present in `ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts`. | Cross-repo shared receiver; organization context can create/write Stripe-customer and payout-method fields. Prove actor authorization and reflected UI state for each action. | Pass 2 |
| `discover-hospitals` | `hospitalImportService` invokes it; `HospitalModal` performs a raw direct `fetch`. | Canonical handler present in `ivisit-app/supabase/functions/discovery/discover-hospitals/handler.ts` with stable wrapper slug at `supabase/functions/discover-hospitals/index.ts`. Console-local `frontend/supabase/functions/discovery/index.ts` is instead `check-user` source. | Canonical app-owned provider discovery/import receiver. Console raw modal assumptions and local folder narrative cannot define its request/response or persistence contract. | Pass 3 |
| `invite-user` | `InviteUserModal` and `adminService`. | Console source exists only at `frontend/supabase/functions/payments/index.ts`, whose folder name does not prove an `invite-user` deployed slug. Source permits an unauthenticated request to proceed and returns a generated invite link while its mail send block is commented out. | Receiver slug/deployment and authorization are unproved; visible "invitation sent" is false from inspected source. Do not implement identity onboarding around this command until replaced or deployed/proved under its addressed slug. | Pass 4 |
| `check-user` | `LoginPage` invokes before credential flow. | Console source exists only at `frontend/supabase/functions/discovery/index.ts`, not a `check-user` slug directory; it uses service-role auth inspection and profile/email lookup. | Receiver slug/deployment is unproved, and public login behavior exposes an account/password-existence classification boundary needing explicit privacy/rate-limit doctrine. | Pass 4 |
| `sendWelcome` | `subscriptionService` explicit welcome command after subscriber creation/manual send. | Source is under `frontend/supabase/functions/payments/sendWelcome/index.ts`; deployable top-level slug source/config was not proved by this tree. | Email command source exists, but addressed slug ownership and durable lifecycle idempotency remain unproved; it conflicts with the pending-row worker flag behavior. | Pass 7 |
| `sendCustomEmail` and `sendBulkEmail` | `subscriptionService` email action methods. | Sources are under `frontend/supabase/functions/payments/sendCustomEmail/index.ts` and `sendBulkEmail/index.ts`; top-level addressed slug deployment was not proved. | Do not expose campaign send completion until authorization, deployed slugs, per-recipient result and unsubscribe eligibility are one audited command contract. | Pass 7 |
| `process-subscribers` background writer | No rendered caller found; service-role batch source selects welcome-pending subscribers. | Source is under `frontend/supabase/functions/payments/process-subscribers/index.ts`; deployment/schedule evidence was not proved here. | Source-present non-UI lifecycle writer can duplicate welcome sends after manual `sendWelcome`; it remains in audit scope even without a button. | Pass 7 |
| `unsubscribe` | Hard-coded public link emitted by campaign HTML and email-function templates. | Handler logic exists at `frontend/supabase/functions/webhooks/index.ts`, while no `frontend/supabase/functions/unsubscribe/index.ts` slug source was found. | Externally delivered command has unproved addressed deployment topology and passes email identity in the URL; centralize a verified idempotent unsubscribe receiver and delivery contract. | Pass 7 |
| `billing-quote`, `refresh-exchange-rates`, `stripe-webhook` | No direct Console invoke found; Console money/status claims depend on patient quote and Stripe-reflected truth. | Present in `ivisit-app/supabase/functions`; app finance docs name them as canonical quote/rate/reflection paths. | Explicit cross-repo dependency, not an omitted Console action. Console cannot replace these with local FX calculation or pre-webhook completion copy. | Pass 2 |
| `hospital-media` | No direct Console invoke found; patient provider discovery/media renders app-owned proxy URLs while Console edits raw facility images. | Present in `ivisit-app/supabase/functions/hospital-media/index.ts` and used by discovery media construction. | Missing Console management/provenance dependency rather than a Console mutation receiver. Facility implementation must preserve canonical media ownership. | Pass 3 |

RPC source closure finding: the same scan extracted every `supabase.rpc(...)` name called by `frontend/src` (`37` unique names), and each name has a matching non-archive source/API reference in `frontend/supabase/migrations`, `frontend/supabase/scripts`, or `frontend/supabase/docs/API_REFERENCE.md`. That establishes source inventory only. It does not authorize an action or make behavior correct: `exec_sql` remains an excluded browser maintenance boundary, trend-regeneration RPCs remain success-producing stubs, legacy/manual cash and emergency transition receivers remain Pass 1/2 behavioral gates, and role/facility/profile receivers remain Pass 3/4 authorization and identity gates.

Receiver closure rules:

- For an Edge invocation or public function URL, record the addressed slug, the deployable source owner, authentication policy, submitted fields, durable writes, reflected read and failure state. A category README or differently named handler folder is not slug proof.
- Functions owned in `ivisit-app` are shared backend dependencies, not absent services; Console passes must compare their payload/role/reflection contract rather than creating competing local receivers.
- Source-present workers, webhooks and delivered email links are in scope even when there is no visible Console button, because they mutate or promise operator-visible lifecycle truth.
- An RPC name match closes only the inventory question. Surface implementation still requires field, role, state-transition, idempotency and reflected-read verification in its owning pass.

## Backend-Generated Truth Writer Register

The reverse audit cannot stop at callable functions. Database triggers and lifecycle writers create or change state that an operator must either see accurately or must be prevented from contradicting. The following source-present writers are therefore implementation dependencies even when the Console has no direct invocation.

| Backend writer and trigger | Generated or changed truth | Current Console reflection or conflict | Required disposition | Pass |
| --- | --- | --- | --- | --- |
| `handle_new_user()` on `auth.users` insert | Creates `profiles`, `preferences`, `medical_profiles` and `patient_wallets`; takes `profiles.role` directly from `raw_user_meta_data.role` when supplied. | Console self-signup currently sends no role, but the inspected `invite-user` source accepts a requested role and emits it as invite metadata; its unauthenticated-continuation behavior could therefore seed elevated profile role if deployed as addressed. `AuthContext` separately elevates/falls back roles in the browser. | Make server-owned enrollment the only role grant: clamp initial roles, authorize invite role assignment and remove client fallback/elevation before any scoped Console route is trusted. | Pass 4; wallet/profile dependency Pass 2 |
| `handle_new_organization()` on `organizations` insert | Creates an `organization_wallets` row for canonical organization identity. | Current onboarding inserts a `hospitals` row and stores that hospital id in `profiles.organization_id`, so it neither proves organization identity nor triggers organization-wallet initialization. | Repair organization/facility creation chain before onboarding, wallet scope, pricing or org analytics can be considered aligned. | Pass 2 / Pass 4 |
| `sync_doctor_record_from_profile()` on provider profile change | Creates/updates a `doctors` row for a provider doctor and may infer earliest hospital from organization. | Doctor modal can create a doctor before invite/profile sync, producing duplicate/unlinked directory state; earliest-hospital inference repeats multi-facility ambiguity. | Choose profile-linked doctor creation and explicit facility assignment before direct doctor CRUD remains available. | Pass 4 / Pass 5 |
| Emergency status validation/logging triggers | Enforce allowed status write path and append `emergency_status_transitions`. | Console can change emergency lifecycle but has no visible transition timeline. | Render scoped append-only lifecycle evidence and keep status actions on authorized commands only. | Pass 1 |
| `notify_emergency_events()` on emergency insert/update | Creates org-admin emergency notifications and patient status-update notifications. | Own-user `NotificationCenter` is live and bounded, but Console success/action semantics can differ from trigger-created records and fallback insertion can discard `action_data`. | Keep notifications as reflected delivery evidence; align emergency action targets and do not substitute them for command success or patient dispatch truth. | Pass 1 / Pass 8 |
| `auto_assign_driver()`, `update_resource_availability()` and ambulance failover writer | Assigns/replaces ambulances and responders, changes emergency status, changes ambulance current-call state, and adjusts hospital bed availability. | Console map/fleet exposes ordinary status/location mutations and emergency marker commands without a complete automation/failover projection. | Use request-coupled command/telemetry projection, expose degraded/reassigned state and preserve canonical capacity projection. | Pass 1 / Pass 3 / Pass 5 |
| `auto_assign_doctor()`, `release_doctor_assignment()` and doctor failover writer | Writes `emergency_doctor_assignments`, doctor workload and `emergency_requests.assigned_doctor_id`; reassigns or clears clinicians during unavailability/closure. | No rendered persisted clinician-assignment surface exists; doctor directory/status actions can activate hidden reassignment behavior. | Add assignment/history projection and constrain provider status changes with active-assignment impact feedback. | Pass 1 / Pass 5 |
| `sync_emergency_to_visit()` on emergency update | Updates an existing request-linked visit across lifecycle/facility/clinician/cost changes. | Visits are rendered, but fallback Console emergency create does not create the visit row that this trigger can update. | Keep request-derived visits read-only where generated; repair forward/fallback linkage rather than inventing manual clinical rows. | Pass 1 / Pass 6 |
| `archive_emergency_chat_room_on_request_close()` | Archives urgent communication room when emergency completes/cancels. | Patient app owns chat RPC flow; Console exposes no chat room/messages/read state and therefore cannot show archived or unread operational communication. | Implement scoped communication read/command projection together with terminal archived behavior. | Pass 1 |
| `create_insurance_billing_on_completion()` | Inserts canonical `insurance_billing` result fields when an emergency completes. | Console policy UI does not show result/exception truth. A separate source-present `process_insurance_claim()` RPC inserts legacy column names (`policy_id`, `billed_amount`, `covered_amount`) not present in the canonical table declaration. | Add scoped canonical billing-result reads; keep claim creation backend-owned and retire/repair the incompatible RPC before any claim command is exposed. | Pass 2 / Pass 7 |
| `process_payment_distribution()` on completed non-cash payment | Credits organization/platform wallets and appends ledger evidence, excluding top-ups and cash. | Console displays capped ledger/payment windows and even runs direct backfill mutation on wallet mount; financial modals can claim success before trigger/webhook reflection. | Treat wallet/ledger as receiver-generated evidence, remove ordinary repair writes and wait for reflected completion before success claims. | Pass 2 |

Backend-writer closure rule: every implementation pass must identify writers that can run as a consequence of its exposed mutations and name the refreshed visible projection, failure/degraded state and any automation-created table that remains intentionally read-only. A button can be receiver-authorized and still be unsafe if it activates an invisible reassignment, billing, notification, visit or ledger consequence.

## Direct Boundary Call-Site Register

The `43/43` service-file inventory is complete, but services are not the only files touching backend truth or externally delivered command behavior. A May 25 source scan of `frontend/src/components`, `contexts`, `hooks`, `utils`, `lib`, email templates and startup infrastructure found the following direct Supabase/Auth/Edge/Storage/external boundaries outside service owners. These files are mandatory pass scope where their operation remains active; a pass cannot claim owner cleanup while leaving its listed direct caller unreviewed.

Reconciliation checkpoint (May 25): a renewed direct Supabase/Auth/Edge/Storage caller sweep of UI, contexts, hooks, utilities and libraries maps all active boundary matches to the rows below; residual mobile/skeleton matches are JavaScript `Array.from(...)` render helpers, not backend calls. Export/external-link sweep additionally identifies the health-news source URL handoff recorded below.

| Direct caller | Observed direct boundary | Current classification | Deterministic implementation disposition | Pass |
| --- | --- | --- | --- | --- |
| `components/pages/EmergencyRequestsPage.jsx` | Direct `emergency_requests` list/count reads, batched `payments` read, and page-owned realtime for both tables. | Active duplicated server/realtime owner. | Move list/count/payment eligibility/invalidation into the emergency detail/read owner before lifecycle action repair. | Pass 1 |
| `components/modals/EmergencyRequestModal.jsx` | Direct `profiles` selection for emergency create inputs. | Active input projection bypass. | Read patient/operator-selectable identity through the Pass 1/4 authorized profile projection; do not let modal shape its own identity authority. | Pass 1 / Pass 4 |
| `services/emergencyResponseService.js` dispatch candidate selection | Active dispatch loads unbounded available ambulances, loads unbounded verified hospitals when none is preselected, may load matching doctors without a limit, and chooses the first returned candidate; `findBestHospital(patientLocation, specialty)` does not use its location input. | Active workflow-command selection defect: a dispatch can choose responders/facilities/clinicians from collection order rather than bounded, scoped readiness/proximity truth. | Move candidate selection behind the Pass 1 command facade with Pass 3 facility-eligibility/capacity and Pass 5 responder/clinician projections; no dispatch success until selected resources and refreshed outcome are proved. | Pass 1 / Pass 3 / Pass 5 |
| `components/ui/LocationCell.jsx` | Direct Google reverse-geocoding `fetch` for emergency location display. | Active external projection dependency with coordinate-shape/fallback sensitivity. | Put geocoding/fallback behavior under the Pass 1 emergency location projection contract; malformed coordinates or unavailable provider must render bounded fallback truth. | Pass 1 |
| `components/modals/EmergencyDetailsModal.jsx` external map link | Visible detail action opens Google Maps with request latitude/longitude. | Active external coordinate disclosure/navigation handoff when the operator invokes it. | Validate actor and coordinate projection, label external navigation clearly and keep it distinct from Console tracking confirmation. | Pass 1 |
| `components/pages/WalletManagementPage.jsx` | Direct reads of `ivisit_main_wallet`, `organization_wallets`, `wallet_ledger`, `payments`, and profile enrichment. | Active duplicated finance read owner. | Move all finance projection reads behind the Pass 2 wallet facade; ledger stays read-only evidence except through an authorized money command. | Pass 2 |
| `components/pages/WalletManagementPage.jsx` and `components/modals/GlobalFinancialModals.jsx` payment-method controls | Platform-admin card list is loaded using platform scope, but route deletion submits `profile.organization_id`; the global billing modal displays every listed method as `Primary` without invoking its imported payout-selection command. | Active finance command-scope mismatch plus fabricated payout/default label. | One billing-method projection must own list/remove/select scope and reflected primary state; do not retain static primary badges or mismatched destructive command scope. | Pass 2 |
| `contexts/PageDataContext.jsx` | Direct wallet/ledger reads, service-triggered unbounded summary loads including hospitals/pricing, and global channels for emergency, doctors, visits, insurance, profiles, organizations, pricing, support tickets and activity. | Active cross-domain owner duplication and capped/unbounded aggregate truth risk. | Remove domain server truth and channels incrementally after each pass establishes its owner; retain shell composition only. | Passes 1-8; final reduction Pass 8 |
| `components/pages/HospitalsPage.jsx` | Page-owned hospitals realtime channel. | Active duplicate facility invalidation owner. | Route invalidation through the Pass 3 facility owner after read centralization. | Pass 3 |
| `components/modals/HospitalModal.jsx` | Raw `fetch` to `discover-hospitals` with text-search payload/response assumptions. | Active Edge Function contract bypass; already confirmed incompatible with app handler contract. | Route discovery through the Pass 3 discovery/import owner using normalized provider taxonomy/provenance and an authorized non-silent persistence boundary. | Pass 3 |
| `components/pages/UsersPage.jsx` | Direct verified-profile KPI read and direct privileged `delete_user_by_admin` RPC for single/bulk deletion. | Active identity read and workflow-command bypass. | Move KPI and destructive command invocation to the Pass 4 admin boundary; preserve explicit RPC command semantics and pending/error handling. | Pass 4 |
| `components/context/UsersPanel.jsx` mounted by `components/navigation/ContextPanel.jsx` | Independently calls `getProfiles({ sortBy: 'last_sign_in_at', limit: 5, includeAuthData: true })` and renders username, email and last-sign-in date as recent-login detail. | Active bounded but privileged identity/sign-in exposure path outside the `/users` row projection; failure is logged then appears as empty content. | Route through a field-minimized, role-scoped recent-login projection with explicit failed/empty states, or remove this panel detail if not operationally justified. | Pass 4 / Pass 8 |
| `components/modals/InviteUserModal.jsx` | Direct `invite-user` Edge Function invocation. | Active identity workflow command; known role/org/email-result drift. | Keep only behind repaired Pass 4 invite authority and truthful delivery result handling. | Pass 4 |
| `components/onboarding/OrganizationDetailsStep.jsx` through `contexts/OnboardingContext.jsx` and `services/onboardingService.js` | Selecting an existing hospital sets `selectedHospitalId` and `isClaimingExisting`, but submit unconditionally inserts a new `hospitals` row and assigns that new hospital id to `profiles.organization_id`. | Active onboarding write-contract contradiction: a visible facility-claim selection can create a duplicate facility while still corrupting organization scope. | Replace with a canonical organization/facility provision-or-claim receiver that consumes selected facility identity, blocks competing claims and reflects organization/profile/wallet/verification outcome. | Pass 4 |
| `components/pages/VerificationQueue.jsx` bulk action bar | Selected provider approve/reject controls show success and clear selection while their handlers contain placeholder comments and invoke no receiver. | Active false-success workflow controls. | Disable/remove until guarded bulk verification or per-row command aggregation persists results, audits action and refreshes queue/count truth. | Pass 4 |
| `contexts/AuthContext.jsx`, `components/pages/LoginPage.jsx`, `components/pages/SetPasswordPage.jsx`, `components/modals/SecurityModal.jsx` | Direct Supabase auth/session/password/OAuth/MFA calls; Login also invokes `check-user`. | Intentional authentication adapter surface requiring receiver review, not ordinary table CRUD. | Review as one Pass 4 auth boundary; direct Auth SDK use may remain only for supported session/credential/MFA operations with truthful feedback. | Pass 4 |
| `lib/avatarUtils.js`, `components/navigation/SmartHeader.jsx`, `components/navigation/MobileNavMenu.jsx`, `components/pages/UsersPage.jsx` | External generated-avatar URLs can include profile username or profile/user-derived seed when stored avatar media is unavailable. | Active third-party identity-media disclosure path in global/user surfaces. | Use app-owned fallback media or define a privacy-reviewed non-identifying external avatar policy; do not transmit operator identifiers casually. | Pass 4 / Pass 8 |
| `components/pages/AmbulancesPage.jsx` | Direct ambulance list/count/scoped-stat reads. | Active fleet read-owner bypass. | Move reads/KPIs behind fleet operations owner using actual hospital/organization scope. | Pass 5 |
| `components/modals/AmbulanceModal.jsx`, `components/modals/DoctorModal.jsx` | Direct hospital dropdown reads; ambulance modal also queries occupied `profile_id` assignments and loads active emergency trips by the selected ambulance's `hospital_id`, then exposes lifecycle commands on each returned request. | Active modal relationship and command-scope bypass. | Replace with provider/fleet lookup boundaries that enforce assignment and facility identity contracts; a vehicle detail modal cannot operate hospital-wide trips unless each request is proved linked to that vehicle. | Pass 5 |
| `components/pages/SettingsPage.jsx`, `components/views/DoctorProfileCard.jsx`, `hooks/useDoctorProfile.js` | Provider settings mounts a professional card that reads the current provider's doctor row and submits bio, experience, consultation fee and operational availability/status through `doctorsService.updateDoctor()`. | Active self-service provider command surface outside the doctor route/modal inventory. | Define a self-service field allowlist and active-assignment impact projection; operational status/availability and patient-facing fee/readiness cannot flow through an unrestricted doctor-row update. | Pass 5 / Pass 4 |
| `components/pages/GodModeMap.jsx` driver-mode controls | When signed-in driver identity matches no ambulance, `assignedAmbulance` falls back to the first visible ambulance; its id can then select an active request for telemetry and lifecycle buttons. | Active responder/request eligibility overexposure before command receiver invocation. | Remove fallback assignment; only a backend-authorized responder/ambulance/request projection may enable location or trip-status commands, otherwise render unassigned/unavailable state. | Pass 5 |
| `components/pages/GodModeMap.jsx` and `contexts/MapContext.jsx` | `GodModeMap` nests its own `MapProvider` beneath the provider already mounted by `AppLayout`, re-running initial operational fetches and emergency/ambulance/user-location subscriptions on `/map`. | Active duplicate server/realtime ownership on the central operations route. | Mount one authorized map projection provider only, with bounded feeds and deterministic cleanup; route components consume that single owner. | Pass 1 / Pass 3 / Pass 5 / Pass 8 |
| `components/map/MarkerDetailPanel.jsx` mounted by `components/pages/GodModeMap.jsx` | Desktop selected emergency panel renders patient phone and location, calls `dispatchEmergency()` or `completeEmergency()` from local marker status/ambulance presence, and contains a corrupted close-glyph rendering. | Active desktop emergency lifecycle/patient-data receiver hidden below map route plus visible encoding defect. | Consume Pass 1 exposure/action/payment legality projection for desktop as well as mobile, and repair text encoding under the docs/runtime encoding gate. | Pass 1 / Pass 5 |
| `components/pages/GodModeMap.jsx`, `components/map/MapRenderers/GoogleMapsRenderer.jsx` and `components/map/MapRefiner/GoogleMapsSmartRoute.jsx` | Browser location denial falls back to `LAGOS_CENTER` before nearby-hospital query/render; renderer displays a coordinate-derived `Session ID`; active route endpoints are sent to Google Routes and straight fallback is not visibly distinguished. | Active operator-location false-truth/privacy and external route-provider boundary. | Use permissioned operator-location state, remove coordinate-derived decoration, never query proximity from fabricated position, and require approved visibly degraded external-route behavior. | Pass 3 / Pass 5 / Pass 8 |
| `components/mobile/MobileMap.jsx` mounted from `components/pages/GodModeMap.jsx` | Selected emergency sheet renders patient phone/location data and directly invokes `dispatchEmergency()` or `completeEmergency()` depending on whether `ambulance_id` is present. | Active mobile emergency lifecycle and patient-data exposure boundary hidden inside a map responsive variant. | Route through the Pass 1 emergency action/exposure projection and command facade; completion cannot be enabled from ambulance-id presence without payment/cash/legal-transition truth and refreshed outcome. | Pass 1 / Pass 5 |
| `components/context/MapPanel.jsx` through `contexts/MapContext.jsx` and `components/navigation/ContextPanel.jsx` | When the map context panel is mounted, visible `Export Data` serializes the current raw `emergencyRequests`, selected marker and local settings into JSON; selected emergency/ambulance cards also show `Contact`, `Navigate`, `Call` and `Track` buttons without receivers. | Active sensitive operational export plus visible unsupported workflow controls. | Disable raw export until a role-scoped, bounded and redacted map export projection exists; remove or mark quick controls unavailable until each has a named command/navigation receiver. | Pass 5 / Pass 8 |
| `components/pages/VisitsPage.jsx` | Direct visits list/count reads, multi-table hydration (`profiles`, `emergency_requests`, `doctors`, `hospitals`), and page-owned realtime. | Active request-derived clinical owner bypass. | Move all hydration/count/subscription behavior behind one visit read model; prohibit arbitrary emergency-linked delete/status authority. | Pass 6 |
| `components/pages/HealthNewsManagementPage.jsx`, `components/context/HealthNewsPanel.jsx` | Direct health-news reads/KPIs; panel owns its own channel. | Active content read/realtime duplication over a write-unproved surface. | Use one Pass 7 published-feed read owner; keep draft/author/write controls unavailable pending policy/receiver proof. | Pass 7 |
| `components/modals/HealthNewsModal.jsx` plus patient app health-news selection | Console detail opens persisted news `url` directly in a new tab; `ivisit-app/hooks/search/useSearchScreenModel.js` opens the published item URL for patients. | Active external-navigation payload carried by app-visible published content. | Treat source URL as a validated/provenance-bearing content field; require safe external-open behavior and keep creation/publication unavailable until an authorized writer enforces the same contract. | Pass 7 |
| `components/context/SupportTicketsPanel.jsx` | Direct recent ticket read and panel-owned realtime. | Active support read/realtime duplication. | Reuse the Pass 7 support-ticket owner and its authorized scope. | Pass 7 |
| `components/pages/HealthNewsManagementPage.jsx`, `components/pages/InsuranceManagementPage.jsx`, `components/pages/SupportTicketsPage.jsx`, `components/pages/SubscriptionManagementPage.jsx` bulk action bars | Delete Selected confirmation callbacks contain placeholder deletion comments, emit deletion success and clear selection without invoking a destructive receiver. | Active false-success destructive operations across care/content/subscriber routes. | Disable/remove until each domain owns authorized selected-id deletion/lifecycle command, per-row results, audit state and reflected list/count refresh. | Pass 7 |
| `components/context/InsurancePanel.jsx`, `components/context/SupportTicketsPanel.jsx`, `components/context/HealthNewsPanel.jsx` | Each panel renders a disabled `Export (Coming Soon)` affordance over sensitive policy, ticket or content projections. | Explicitly unavailable export operations, not receiver proof. | Keep disabled or remove; no export may be enabled until allowed fields, filter/window scope, completeness, redaction and delivery receiver are documented. | Pass 7 |
| `components/modals/BulkImportModal.jsx` and `hooks/useHealthNews.js` | Source contains CSV template download and bulk health-news import methods, but only barrel export/source definitions were found and no mounted route consumer was proved. | Dormant authoring/import capability without mounted authorization or receiver proof. | Keep excluded from live surfaces until validation, write policy, provenance/audit and persisted-field contracts exist. | Pass 7 |
| `emails/ivisit106Campaign.js` and generated email templates | `SubscriptionModal` imports campaign HTML that links directly to a hard-coded `functions/v1/unsubscribe` endpoint; delivery function templates embed the same recipient action URL, while the local unsubscribe handler source is not proved as that deployed slug. | Active externally delivered subscriber command boundary with deployment/lifecycle uncertainty. | Verify one deployed idempotent unsubscribe receiver, shared URL construction and durable subscriber status projection before treating sent templates as lifecycle-complete. | Pass 7 |
| `components/pages/Analytics.jsx`, `components/mobile/MobileAnalytics.jsx`, `components/context/AnalyticsPanel.jsx`, `components/pages/Overview.jsx`, `hooks/useAnalytics.js` | Live analytics performs direct multi-domain reads and composes subscriber analytics; its page, mobile and panel export entry points download current aggregate state as CSV/report data. `Overview.jsx` and `useAnalytics.js` are source-present but not mounted by the live route scan. | Active analytics read/export bypass plus dormant alternative owners; provider-visible exports can include fallback or admin-only subscriber slices. | Replace live analytics and exports with Pass 8 verified-source, role-scoped projections after domain owners stabilize; disable export whenever slices are fallback, degraded or unauthorized; retire or deliberately re-authorize dormant alternatives. | Pass 8 |
| `components/map/MapRenderers/LeafletMapRenderer.jsx` | Operational map requests third-party CARTO tile layers with OpenStreetMap/CARTO attribution. | Active external base-map delivery dependency for emergency/fleet rendering. | Prove degraded/unavailable behavior for tile failure and preserve separation between visual tile delivery and authenticated marker/telemetry truth. | Pass 5 / Pass 8 |
| `components/pages/BentoHome.jsx` | Hard-coded public Supabase `images/map.png` URL. | Active public Storage delivery assumption outside media owner. | Keep only after public asset provenance/availability is established or replace through app-owned stable asset delivery; do not conflate with sensitive upload authority. | Pass 8 with Storage gate |
| `components/dashboard/HospitalFleetManager.jsx` | Defines fixed incident/staff/fleet/performance data and an `Export Report` affordance; no importing live route/component consumer was found in the current source scan. | Dormant mock operational/report surface, not current capability. | Keep excluded or retire; any future mount requires Pass 5 provider/emergency projections and Pass 8 scoped export truth. | Pass 5 / Pass 8 dormant |
| `components/scheduling/StaffScheduler.jsx` | Defines local mock staff and shift rows with local add/delete controls; no importing live route/component consumer was found, while the separately audited `StaffSchedulingModal` is the live workflow. | Dormant mock scheduling surface, not evidence of stored schedule CRUD. | Keep excluded or retire; any deliberate mount must consume Pass 5 `doctor_schedules` authority and repair its visible corrupted separator text. | Pass 5 dormant |
| `components/dev/SchemaDebugger.jsx` | Defines development-only rendering of raw supplied data through `JSON.stringify`, including visibly corrupted debug labels; no importing consumer was found in the current source scan. | Dormant diagnostic exposure artifact, not an approved runtime diagnostics boundary. | Keep unmounted/retire or constrain through a redacted development-only policy before any use with operational rows. | Pass 8 dormant |
| `components/context/DashboardPanel.jsx` | Defines a direct `POST /api/backup` handler, but no rendered dashboard trigger was found in the live panel scan; the rendered realtime switch and alert thresholds update local state only. | Dormant unproved maintenance handler plus active controls that imply unimplemented operational configuration. | Remove or keep the backup handler dormant unless a separately authorized auditable receiver is approved; wire or remove visible configuration controls. | Pass 8 |
| `utils/runMigrations.js` | Browser-side `exec_sql` RPC for health news, support tickets and insurance schema/policy mutation. | Dormant or unsafe maintenance boundary; never a product implementation receiver. | Exclude from operational flows and remove/retire from shipped runtime if import review confirms it is unused; schema work belongs to controlled migrations only. | Pass 7 / Pass 8 safety cleanup |
| `utils/testDatabase.js` | Direct test reads of health-news, support and insurance tables. | Dormant local diagnostic helper; not a product owner. | Keep outside product behavior or retire after import proof; never use it to authorize a runtime surface. | Pass 7 / Pass 8 safety cleanup |
| `lib/supabase.js` generic `subscribeToTable` helper | Used by source-present `Overview`, whose route was not mounted in the live route scan; direct client imports in live pages/contexts remain assigned in their own rows. | Dormant generic subscription bypass that could revive duplicate ownership if `Overview` is remounted. | Retire with dormant `Overview` or route any deliberate remount through named domain owners; do not treat it as current live realtime truth. | Pass 8 |
| `App.js` and `lib/queryClient.js` | Mount `QueryClientProvider` with global query defaults, but an import/call-site scan found no `useQuery`, `useMutation`, `useInfiniteQuery` or `useQueryClient` consumer in `frontend/src`. | Mounted but currently inert L2/cache foundation; existing server truth remains in imperative contexts/pages/services. | Do not claim TanStack Query ownership yet; each implementation pass must migrate bounded domain reads deliberately and choose retry/freshness/refetch policy appropriate to emergency or administrative data. | Pass 8 with domain passes |
| `components/common/NetworkStatus.jsx` and `hooks/useNetworkStatus.js` | `NetworkStatus` imports the hook, but no importing/mounted consumer was found; if mounted, the hook permanently replaces `window.fetch` to infer CORS/network state and never restores the original function. | Dormant global request-interception/reliability hazard, not active connectivity behavior. | Keep excluded or retire; do not mount a global fetch monkey-patch as API reliability handling. Route network/degraded state through owned PWA/query/service failure projections. | Pass 8 dormant |
| `hooks/useEmergency.js`, `hooks/useHospitals.js`, `hooks/useProfiles.js` and `hooks/useVisits.js` | Define local-state service wrappers with read/mutation/subscription APIs; current import scans found no mounted consumer for these hook exports, although their underlying services and mounted route paths are audited separately. | Dormant alternate owner surfaces; exported CRUD capability is not live rendered CRUD proof. | Keep classified in their domain passes and do not introduce them as parallel owners during implementation unless the route is deliberately migrated to one owned projection. | Pass 1 / Pass 3 / Pass 4 / Pass 6 dormant |
| `index.js` and `serviceWorkerRegistration.js` | Application startup actively calls service-worker `register()`; helper fetches and registers the service worker and can reload clients during update recovery. | Active browser-infrastructure boundary despite stale comment claiming registration is not called by default. | Include in Pass 8 PWA verification and align offline/update copy, reload behavior and version display with actual deployed cache/update lifecycle. | Pass 8 |

Call-site gate:

- For every implementation pass, rerun the direct-boundary scan and include every active direct caller in the checklist, even if its related service is already covered.
- `DoctorsPage.jsx` and `SupportTicketsPage.jsx` currently import the raw Supabase client without a matching direct call in this scan; remove those imports when their pass touches the files rather than mistaking them for separate receiver ownership.
- A direct Auth SDK surface is not automatically drift; it is allowed only where Supabase Auth itself is the canonical receiver and the user-visible result is accurate.
- A direct page/context/table read is not allowed to survive an owner-cleanup acceptance claim unless the pass explicitly justifies it as a narrow scoped exception.
- Static public legal, support, store and branding hyperlinks are not domain ownership by themselves; they enter this register only when they transmit scoped identity/location, provide an operational dependency or promise a workflow result such as unsubscribe.
- Client-side `exec_sql` and local diagnostic helpers are maintenance artifacts, not available paths for repairing missing Console functionality.

## Route, Panel, And Modal Surface Register

The service and direct-boundary inventories do not by themselves prove that an operator can reach the correct capability. A May 25 live-source comparison of `App.js`, `ProtectedRoute`, navigation configuration, context panels, context actions and modal event receivers found route authority and click-to-receiver drift that must be closed in the assigned passes.

Runtime authority finding: `App.js` renders `ProtectedRoute`, whose default minimum role is `viewer` and whose navigation-access check participates in actual access decisions. `components/common/RouteGuard.jsx` and `config/routes.jsx` are not imported outside their own module/config dependency in the active source scan; their conflicting route declarations are dormant secondary doctrine, not deployed access proof. They must be removed or reconciled before being reused.

Affordance reconciliation checkpoint (May 25): a renewed placeholder, disabled, toast-success and empty-handler sweep across live pages, panels, modals and mobile variants confirms the false-success rows below and does not label every bulk command as broken. Organization, pricing and visits bulk-delete handlers invoke their service receivers; their authorization, field and lifecycle legality remain with their owning passes, but they are not no-receiver defects. Verification and care/subscriber bulk handlers remain proven false-success controls because they clear/report completion without invoking a mutation.

| Visible route or surface | Proven current drift | Required disposition | Pass |
| --- | --- | --- | --- |
| Authentication, onboarding and dashboard routes (`/login`, `/set-password`, `/onboarding`, `/onboarding-success`, `/`) | Public onboarding/password routes and viewer-protected dashboard are defined in `App.js`, while dormant route doctrine omits onboarding/password routes and labels `/` public. | Name one route-authority source; keep authentication/onboarding access and shell feedback aligned to the live gate. | Pass 4 / Pass 8 |
| `/onboarding` and `/onboarding-success` rendered claims | Mounted wizard wrapper contains corrupted footer copy; success page labels returned submit state as organization identity/review readiness and offers dashboard entry, although current submit can insert a duplicate hospital-shaped "organization" and misassign profile scope. | Repair encoding and render success/readiness only from a canonical reflected organization/facility/profile/verification provisioning result. | Pass 4 |
| `/map` | Live route requires `provider`; navigation exposes the item without a minimum role and dormant route doctrine labels it public. | Keep operational map restricted consistently in route, navigation and any future shared route configuration. | Pass 5 / Pass 8 |
| `/hospitals` | Live route and navigation allow `org_admin`; dormant route doctrine requires `admin`. | Reconcile facility operational access before centralizing hospital commands and reads. | Pass 3 / Pass 4 |
| `/hospitals` desktop list/table view modes | Grid edit/delete is restricted to admin/org-admin, `HospitalListView` renders received edit/delete controls without a role input, and `HospitalTableView` broadens `canManage` to provider. | Resolve one facility row capability before composing grid/list/table/mobile renderers; view mode cannot alter CRUD authority. | Pass 3 / Pass 4 |
| `/health-news` | Live route requires `provider`; navigation and `ContextPanel` expose viewer access. | Hide/restrict unsupported viewer entry points or deliberately authorize a read-only viewer surface distinct from management. | Pass 7 |
| `/health-news` desktop list/table view modes | Grid evaluates management roles, but list/table receive `isAdmin` as a function reference and treat it as true, exposing publish/edit/delete before content write policy is proved. | Project content command capability before renderer composition; leave authoring unavailable under the current published-feed proof. | Pass 7 |
| `/insurance` | Live route requires `admin`; navigation exposes `org_admin` while current insurance management authority is already unproved. | Do not advertise org-admin policy management until its guarded receiver and route authority exist. | Pass 7 |
| `/users` and `/verification` | Live route and navigation allow `org_admin`; `ContextPanel` suppresses these panels unless `admin`. | Use one role definition for route, navigation and operational context; do not remove valid scoped workflow context by panel-only rule. | Pass 4 |
| `/users` desktop list view | Mounted `UserListView` renders corrupted separators within email/organization/provider identity copy. | Include the rendered identity row in Pass 4 encoding repair and route smoke; do not close user presentation with corrupted operator-visible fields. | Pass 4 |
| `/settings` | Live route and navigation allow `viewer`; `ContextPanel` suppresses settings context unless `admin`. | Separate own-user settings from admin-only system operations and align panel visibility to that split. | Pass 4 / Pass 8 |
| `/organizations` | Live route and navigation require `admin`; dormant route doctrine does not define the surface. | Add organization management to the authoritative access contract when route authority is consolidated. | Pass 4 |
| `/organizations` desktop list/table view modes | Page grid/empty-state management uses `isAdmin()`, but list/table receive edit/delete callbacks unconditionally and render configuration/termination controls without a capability input. | Apply a single organization row capability to every variant; do not allow a layout switch to expose commands outside the guarded receiver contract. | Pass 4 |
| `/emergencies`, `/visits`, `/analytics`, `/support-tickets` | Live route, navigation and panel minimum-role checks align at provider or higher in this scan; domain/receiver defects remain assigned separately. | Preserve role alignment while Passes 1, 6, 7 and 8 repair their read/command owners. | Pass 1 / Pass 6 / Pass 7 / Pass 8 |
| `/ambulances`, `/doctors`, `/wallet` | Live route, navigation and panel minimum-role checks align at `org_admin` or higher in this scan; data/command ownership is not thereby proved. | Preserve role alignment while Passes 2 and 5 repair operational and money receivers. | Pass 2 / Pass 5 |
| `/subscriptions` | Live route, navigation and panel minimum-role checks align at `admin`; the Broadcast action remains separately broken below. | Preserve platform-admin reach while subscriber/email command authority is constrained. | Pass 7 |
| `/unauthorized` and fallback route | These are live navigation/failure handling surfaces with no domain command ownership found in this scan. | Keep access-denial and not-found feedback truthful during route-authority consolidation. | Pass 8 |
| `/pricing` primary context action | `PricingContextPanel` exposes pricing creation, but the shared primary context action for `/pricing` dispatches `openTopUpModal`, opening wallet funding instead of a pricing workflow. | Keep money movement and rate management distinct; pricing-route primary action must invoke only the proven pricing operation or remain unavailable. | Pass 2 / Pass 3 |
| `/wallet` billing and card controls | Platform-admin method listing is platform-scoped but removal can be sent with profile organization scope; globally mounted billing modal declares every method `Primary` although no selection state/action is wired. | Keep method commands on one explicit platform/organization billing scope and render default/payout status only from reflected receiver truth. | Pass 2 |
| Shared analytics modal across operational routes | Live pages for emergency, hospital, ambulance, doctor, visit, user, verification, insurance, support, health news, subscription, organization, pricing, wallet and analytics mount one reusable modal over heterogeneous local stats. Its emergency renderer supplies a default response time when absent, and generic callers can label bounded previews as analytics. | Keep each route's modal projection owned by its domain pass; remove modal-level fabricated defaults/generic confidence labels and require scope/window/unavailable semantics before a modal or export counts as covered. | Pass 1-8, coordinated by Pass 8 |
| `/settings` provider professional profile card | A provider can view and edit doctor bio, experience, fee and availability/status through a settings-only card that calls the shared direct doctor update path. | Treat as a Pass 5 self-service provider command surface: keep only proved editable fields, and require active-assignment/readiness consequences before operational status or fee changes remain exposed. | Pass 5 / Pass 4 |
| `/ambulances` and `/doctors` desktop list/table view modes | Grid-card controls role-gate edit/delete, but list/table renderers receive and show the same destructive callbacks without the grid check; list row copy also contains corrupted separators. | Resolve provider/fleet capabilities before composing any renderer; display-mode changes cannot broaden mutation authority, and mounted row copy enters the encoding repair gate. | Pass 5 |
| Ambulance/doctor context panels | Mounted panels derive `Ready Units`, `Live Fleet`, `Active Faculty` and row-level `Active` labels from broad `PageDataContext` snapshots; doctor read failure is replaced with mock data, and an empty ambulance recent list is rendered as `Off duty`. | Move panels to typed scoped provider summaries with accurate statuses and failed/degraded/empty handling; never advertise mock, stale or missing rows as live readiness. | Pass 5 / Pass 8 |
| `/pricing` panel Reports and Bulk Sync actions | `PricingContextPanel` dispatches `openAnalyticsModal`, but `PricingManagementPage` has no event listener; the visible Bulk Sync button has no click handler. | Wire only a pricing-scoped mounted report/read projection and remove or disable sync until an authorized import/pricing receiver exists. | Pass 3 / Pass 8 |
| Dashboard Report action | `DashboardPanel` dispatches `openAnalyticsModal` while the analytics modal listener is mounted only on route pages such as `/analytics`, not on the dashboard route. | Navigate deliberately to analytics or mount a dashboard-owned authorized report surface; do not leave a visible no-op. | Pass 8 |
| Mobile dashboard patient-care actions | Live `MobileDashboard` presents patient-only `Book a Visit`, `Medical History` and `Emergency SOS` rows with empty handlers; its fleet expanded copy also contains a visible encoding defect. | Treat patient workflow exposure as an ecosystem ownership decision: navigate to a canonical patient-app destination or render unavailable/remove from Console; correct visible encoding in the same implementation slice. | Pass 8, consuming Pass 1 / Pass 6 ownership |
| `/map` centering actions | `useContextAction` dispatches `centerMap` and `MapPanel` dispatches `recenter-map-target`; mounted map implementations and `MapContext` consume `recenter-map` only, so these visible map commands have no matching receiver. | Use one map-control API/event, including targeted requests when supported, and verify centering from the actual map route surface. | Pass 5 / Pass 8 |
| `/map` context export and selected-marker operations | `MapPanel` exposes a live JSON download of raw emergency/marker/settings state and renders `Contact`, `Navigate`, `Call` and `Track` as clickable-looking controls without receivers. | Treat export as blocked sensitive exposure until bounded/redacted authorization is defined; treat quick controls as unavailable operations, not implemented workflow. | Pass 5 / Pass 8 |
| `/map` mobile selected-emergency sheet | Mounted mobile variant renders patient phone/location fields and exposes `Dispatch Unit` or `Mark Complete` directly from marker/ambulance-id state. | Treat as a Pass 1 emergency lifecycle surface: prove actor exposure and use the shared dispatch/completion/payment/cash eligibility projection before either command remains available. | Pass 1 / Pass 5 |
| `/map` driver telemetry/status panel | Driver-mode request selection can use an arbitrary first-ambulance fallback when the signed-in user has no matched fleet row, then publish location or advance status for the selected emergency request. | Enable no driver command until a positively authorized assignment projection binds actor, ambulance and request; unassigned is an unavailable state, never a fallback. | Pass 5 |
| Ambulance detail active-trip controls | A selected vehicle modal loads requests by hospital scope and exposes Cancel/Arrived/Complete across the resulting trip rows. | Keep lifecycle controls unavailable until rows are restricted to that ambulance or deliberately moved to request operations; do not operate unrelated vehicles from an individual record. | Pass 5 / Pass 1 |
| Emergency detail contact and report actions | `EmergencyDetailsModal` exposes `Call Patient` and `Generate Incident Report` controls without proved click/command receivers. | Remove or mark unavailable until communication/report receivers, role scope, fields and audit/result state are explicit. | Pass 1 |
| Analytics CSV/report export | `Analytics`, `MobileAnalytics` and `AnalyticsPanel` reach one download path for rendered aggregate state, including slices that may be fallback-derived or unavailable to the current role. | Export only a source-labelled, role-scoped, time-windowed aggregate projection, and disable download when required slices are degraded or unauthorized. | Pass 8 |
| Verification and organization panel report affordances | `VerificationPanel` shows a disabled export/realtime placeholder; `OrganizationsPanel` shows `Growth` and `Pulse` buttons without proved receivers. | Keep unavailable or remove until identity/approval reporting projections have explicit roles, redaction, dataset scope and mounted receivers. | Pass 4 |
| Verification bulk approve/reject | `VerificationQueue` exposes selected-row commands that currently toast approved/rejected success and clear selection without invoking a receiver. | Disable immediately or implement an authorized bulk/per-row command with partial-failure results, audit evidence and refreshed queue truth. | Pass 4 |
| Verification list/table Delete command | `VerificationQueue` deliberately passes `onDelete={() => { }}` to list/table renderers, and both render Delete whenever that callback exists. | Remove the inert destructive control until a role-scoped audited receiver and reflected result exist. | Pass 4 |
| Care/content panel exports and health-news import | Insurance, support and health-news panels display disabled exports; `BulkImportModal` contains source-only health-news import/template capability with no mounted surface proved. | Preserve export as unavailable and import as dormant/excluded until policy, fields, receiver and audit/provenance proof exist. | Pass 7 |
| Care/content/subscriber bulk deletion | Four route bulk-action bars currently confirm deletion and report success without a receiver mutation. | Treat as false-success unsupported controls; disable/remove before any read-owner cleanup is presented as an implementable surface. | Pass 7 |
| Settings billing and dormant analytics PDF affordances | `SettingsPanel` renders Billing as a toast-only coming-soon quick action; unmounted `useAnalytics` includes a PDF-export coming-soon method. | Treat billing as unavailable and PDF path as dormant until mounted authorized finance/analytics receivers are proved. | Pass 8 |
| Settings desktop plan/upgrade claim | Desktop `SettingsPage` renders static `Free Tier` copy and an `Upgrade` button with no receiver, while mobile settings omits the corresponding plan action. | Keep unavailable or implement one user-scoped plan/billing lifecycle projection; viewport cannot decide plan truth or upgrade authority. | Pass 2 / Pass 7 / Pass 8 |
| Subscription Broadcast action | `SubscriptionsPanel` dispatches `openEmailActionsModal`; `SubscriptionManagementPage` listens for create and analytics events only, so this visible action has no mounted receiver. | Disable until the authorized email lifecycle surface exists, or attach it to the single audited subscriber/email command owner. | Pass 7 |
| Verification Quick Verify action | `useContextAction` navigates to `/verification?quick=true`, but no query-param consumer was found in `VerificationQueue`. | Implement a real authorized quick-review mode or replace the control with an action the verification queue receives. | Pass 4 |
| Emergency clinical-record handoff | `EmergencyDetailsModal` dispatches `openVisitModal` and closes itself; the only visit-modal listener is in `VisitsPage`, which is not mounted on `/emergencies`. | Provide an emergency-route-owned clinical detail surface or deliberate route transition with carried identity; never close into a no-op. | Pass 1 / Pass 6 |
| Visit incident-log handoff | `VisitModal` dispatches `openEmergencyDetails`, and `VisitsPage` does mount the receiving emergency-detail modal. This is the proved working direction of the handoff. | Preserve the mounted receiver while normalizing its request identity through the Pass 1/6 read models; do not infer that the reverse handoff is implemented. | Pass 1 / Pass 6 |

### Custom Event Receiver Reconciliation

A May 25 mechanical comparison of `CustomEvent(...)` emitters to `addEventListener(...)` receivers confirms that a visible event-driven control is implemented only when its listener is mounted on the active destination path. A matching listener elsewhere in the application is not a working receiver.

| Event family | Mechanical receiver result and mounted-path interpretation | Required disposition | Pass |
| --- | --- | --- | --- |
| `centerMap`, `recenter-map-target` | Emitters exist in context/map controls; no matching listeners were found. Mounted map refiners listen only for `recenter-map`. | Consolidate to one mounted map-control event/API or keep the controls unavailable. | Pass 5 / Pass 8 |
| `openEmailActionsModal` | The subscription panel emits this event; no listener was found. | Disable Broadcast or attach it to the audited subscriber/email command owner. | Pass 7 |
| `openAnalyticsModal` | Several same-route panel/page pairs are mechanically paired, but dashboard and pricing panels emit while their active routes do not mount a receiving analytics surface. | Preserve only valid route-local pairs; deliberately navigate or mount a scoped report surface for dashboard/pricing controls. | Pass 3 / Pass 8 |
| `openVisitModal` from emergency detail | A receiver exists only on `VisitsPage`; it is not mounted when the emergency detail modal emits from `/emergencies`. | Replace with mounted detail ownership or a deliberate identity-preserving route transition. | Pass 1 / Pass 6 |
| `systemBackupTriggered` | It is emitted only from a source-defined backup handler for which no rendered current trigger was proved; no listener was found. | Keep dormant/excluded unless an authorized workflow is deliberately introduced. | Pass 8 |
| Mechanically paired route/global events | `exportLedger`, `exportAnalytics`, financial modal events, ordinary route-panel open/filter events, notification changes and `recenter-map` have listeners in their intended mounted route/global owners. | Retain only with the owning pass dataset, role, field, pending/error and reflected-result proof; a paired event alone does not authorize data or commands. | Passes 1-8 |

`openEmergencyModal` appears in a valid emergency-panel pair and in a source-defined dashboard navigation handler. No rendered dashboard control invoking that handler was found in this scan, so the latter is not recorded as a live receiver defect unless mount proof appears.

### Live Component Family Assignment

The route rows above establish access and event failures; this component-family register prevents a named route from hiding an unaudited page, modal, panel or global action container. Mobile/table/list/grid variants inherit their parent family's pass and must be checked for identical field exposure and operation authority.

| Live component family | Files or mounted components included | Required audit owner |
| --- | --- | --- |
| Public/auth/onboarding/failure | `LoginPage`, `SetPasswordPage`, `OnboardingPage`, `OnboardingSuccessPage`, `NotFoundPage`, unauthorized surface, `SecurityModal`, `ProfileEditModal`, `SupportModal` from settings | Pass 4 identity/auth; Pass 7 support handoff; Pass 8 feedback |
| Dashboard/analytics/search/notification shell | `BentoHome`, `Analytics`, `AnalyticsPanel`, `AnalyticsModal`, `DashboardPanel`, `QuickSearch`, common `NotificationCenter`, `SmartHeader`, `ContextPanelShell`, `ConsoleStartupOverlay`, `PWAProvider`, `FeedbackProvider`, `PWADebugTracker` | Pass 8, consuming domain truths from Passes 1-7 and explicitly disposing of all shell-visible utility feedback/debug behavior |
| Global action/modal containers | `ContextAwareFAB`, `DynamicBottomBar`, `GlobalFinancialModals`, `useContextAction` | Pass 8 shell ownership plus each invoked domain pass; hidden hook acquisitions are Pass 7/8 blockers |
| Emergency/map/clinical handoff | `EmergencyRequestsPage`, `GodModeMap`, `MobileMap`, `EmergencyPanel`, `MapPanel`, `EmergencyRequestModal`, `EmergencyDetailsModal` | Pass 1; map/telemetry dependencies in Pass 5 and shell cleanup in Pass 8 |
| Hospitals/pricing/import/capacity | `HospitalsPage`, `PricingManagementPage`, `HospitalsPanel`, `PricingContextPanel`, `HospitalModal`, `BulkImportModal` if wired, and capacity actions | Pass 3; financial handoff in Pass 2 and report/event cleanup in Pass 8 |
| Ambulance/doctor/scheduling/provider operations | `AmbulancesPage`, `DoctorsPage`, `AmbulancesPanel`, `DoctorsPanel`, `AmbulanceModal`, `DoctorModal`, `StaffSchedulingModal`, and the provider-only `DoctorProfileCard` mounted inside `SettingsPage` | Pass 5; settings identity exposure dependency in Pass 4 |
| Visits/history | `VisitsPage`, `VisitsPanel`, `VisitModal` and its emergency-detail handoff | Pass 6 with Pass 1 receiver dependency |
| Identity/verification/organizations/settings | `UsersPage`, `VerificationQueue`, `OrganizationsPage`, `SettingsPage`, `UsersPanel`, `VerificationPanel`, `OrganizationsPanel`, `SettingsPanel`, `UserModal`, `InviteUserModal`, `VerificationModal` | Pass 4; notification/settings wiring in Pass 8 |
| Care/content/support/subscribers | `HealthNewsManagementPage`, `InsuranceManagementPage`, `SupportTicketsPage`, `SubscriptionManagementPage`, their context panels and `HealthNewsModal`, `InsuranceModal`, `SupportTicketModal`, `SubscriptionModal` | Pass 7, with shell acquisition/realtime cleanup in Pass 8 |
| Wallet/finance projection | `WalletManagementPage`, `WalletPanel`, `GlobalFinancialModals` top-up/withdraw/billing receivers | Pass 2; shell action separation in Pass 8 |

Component primitive reconciliation (May 25): a basename sweep across page, modal and mobile source files found `73` surface-related components. The remaining shared primitives are not omitted capability lanes: `ConfirmationModal` inherits the command/receiver proof of each destructive caller; `MobileActionRail`, `MobileActivityRow`, `MobileFeaturedMetric`, `MobileKPIStrip`, `MobileListStates`, `MobileMetricList`, `MobileQuickNavPill`, `MobileSecondaryMetricCard` and `MobileSkeleton` inherit the read/action truth of their mounted mobile route owner; `MobilePageShell` and its mounted `MobileErrorBoundary` belong to Pass 8 loading/recovery feedback. They must still be read when a caller pass changes fields, action feedback or error state, but they do not justify separate feature documents.

Expanded surface basename reconciliation (May 26): a read-only sweep across `frontend/src/components/pages`, `views`, `context` and `mobile` classified `100` component files against this maintained corpus and found `0` unassigned basenames after adding the route-variant and panel anchors. This closes current component-name discovery only: operation authority remains blocked wherever the owning pass records missing receivers, role drift, unbounded reads, false status labels, corrupted rendered text or incomplete app consequence.

Operational child reconciliation (May 25): deterministic basename sweeps inspected `102` files under all non-UI operational child folders (`components/context`, `navigation`, `views`, `map`, `onboarding`, `pwa`, `dashboard`, `common`, `scheduling` and `dev`; the empty `data-rendering`, `dossier`, `icons` and `sections` families contributed no files). Previously unnamed child renderers inherit their route/panel owner unless they create an independent boundary. The sweep proved independent boundaries now recorded above: `MarkerDetailPanel` is a desktop emergency exposure/command receiver; `GodModeMap` plus `MapContext` double-mount map acquisition; `GoogleMapsRenderer`/`GoogleMapsSmartRoute` create location-display and external-route degradation/disclosure requirements; onboarding step/context/service disagree about selected-facility claiming; mounted `VerificationStep` copy has an encoding defect; and map/onboarding failure paths add browser-diagnostic sinks. It also proves `StaffScheduler` and `SchemaDebugger` are unmounted mock/diagnostic artifacts, not capabilities. Table/list renderers, `BulkActionBar`, `FilterSheet`, map visual controls/renderers, `InstallPrompt` and sibling PWA prompts, and shell navigation remain required caller-level verification scope for their assigned pass, without becoming new feature-document lanes.

Shell and mobile-control reconciliation (May 25): `AppShell` actively mounts `ContextPanelShell` from `ResponsiveSidebar` and `SmartFooter`; the footer contains an unconditional success-styled `LIVE SYNC ACTIVE` fallback whenever a visible page provides no custom content, so it cannot be treated as realtime health proof. `SmartTopNav`, its `BentoBreadcrumbs` child, and `SidebarTrigger` have no live importer found and remain dormant shell artifacts; `SmartTopNav` also contains corrupted shortcut glyph text. Across mobile routes, `PullToRefresh` is mounted by `16` live responsive variants, while `useStableList` plus `useLoadMoreControl` are mounted by `11` list variants. They are cross-pass feedback/continuity primitives only: each owning pass must prove that refresh, retained loading rows, and load-more behavior correspond to its authoritative bounded query rather than extending or cosmetically stabilizing an incomplete collection.

State and adapter reconciliation (May 25): a separate basename and boundary sweep inspected `49` files under `hooks`, `contexts`, `utils` and `lib`. Existing rows and pass contracts already classify mounted `AuthContext`, `MapContext`, `OnboardingContext`, `PageDataContext`, `PWAContext`, `FeedbackContext`, activity/analytics/context-action hooks, the live-development `schemaValidator` consumer, `visitContextUtils`, `locationUtils`, browser-side migration/test utilities and the dormant generic Supabase subscriber. New determinations above close the remaining ownership ambiguity: the mounted query provider has no query consumers yet, `NetworkStatus`/`useNetworkStatus` is an unmounted global-fetch interception hazard, and broad local-state CRUD hooks are source-present alternate owners rather than mounted workflow evidence.

Reverse direct-boundary reconciliation (May 25): a boundary/import census was followed by source inspection of every newly unnamed candidate. `UsersPanel` is the one newly proved live service-consuming exposure and is assigned above. `useAdmin` was already classified as an unmounted alternate admin API owner; `types/emergency.ts` declares shapes only; `components/ui/carousel.jsx` is a local carousel API primitive; and mobile `Array.from(...)` skeleton/layout helpers are not database `.from(...)` calls. These files must not inflate capability coverage or hide an actual caller behind textual false positives.

### Responsive Variant Closure Register

This register closes the route-to-mobile composition question directly. Shared mobile layout atoms are not separate domain owners; each mounted route variant below must consume the same scoped projection and capability map as its parent route.

| Live route | Mounted mobile variant | Domain claim/action requiring parity | Owning pass and current disposition |
| --- | --- | --- | --- |
| `/` | `MobileDashboard` | Emergency, subscription, facility and fleet KPI/trend claims from shell data; patient-only visit/history/SOS interactive-looking rows; visible corrupted fleet detail copy. | Pass 8 with Passes 1, 3, 5, 6 and 7 inputs; blocked by fallback/fixed/unscoped metric truth, empty patient-action handlers and encoding failure. |
| `/analytics` | `MobileAnalytics` | Generates report from the live export callback. | Pass 8; blocked until role-safe source-labelled export projection exists. |
| `/emergencies` | `MobileEmergency` | Patient/location/status render and mislabeled dispatch/lifecycle controls. | Pass 1; blocked under shared emergency row/action model. |
| `/map` | `MobileMap` | Patient phone/location exposure and direct dispatch/complete action sheet. | Pass 1 / Pass 5; blocked under emergency legality/payment/cash and map scope gates. |
| `/hospitals` | `MobileHospitals` | Facility KPI/capacity render plus edit/delete/schedule controls. | Pass 3 with Pass 5 schedule dependency; blocked under facility projection and command role parity. |
| `/pricing` | `MobilePricing` | Client-derived pricing metrics and edit/delete controls. | Pass 3; blocked until hospital-scoped price projection and receiver authority exist. |
| `/ambulances` and `/doctors` | `MobileAmbulances`, `MobileDoctors` | Provider/fleet KPI meaning and CRUD controls. | Pass 5; blocked by capped totals, identity/assignment and command authority. |
| `/visits` | `MobileVisits` | Local search/KPIs plus request-derived edit/delete controls. | Pass 6; blocked until visit projection and lifecycle capability are shared. |
| `/users`, `/organizations`, `/verification`, `/settings` | `MobileUsers`, `MobileOrganizations`, `MobileVerification`, `MobileSettings` | Identity, organization/wallet aggregates, verification actions and own-user/provider detail commands. | Pass 4 with Pass 5/8 settings dependencies; blocked by role/id, responsive aggregate and action-parity gaps. |
| `/health-news`, `/support-tickets`, `/insurance`, `/subscriptions` | `MobileHealthNews`, `MobileSupportTickets`, `MobileInsurance`, `MobileSubscriptions` | Content/support/policy/subscriber actions and locally-derived metrics. | Pass 7; blocked by read/write/paging/email/billing authority gaps. |
| `/wallet` | `MobileWallet` | Capped ledger/payment KPI claims and finance actions. | Pass 2; blocked until wallet/method/history projections and command scope are authoritative. |

Surface gate:

- Every implementation pass must verify route entitlement, navigation visibility, panel visibility, primary context action and modal receiver for each operated surface in scope.
- A click that dispatches an event without a receiver mounted on the current route is a broken user flow, even if both modal components exist in the repository.
- Dormant route/security configuration cannot be cited as authorization evidence; only a wired runtime guard and backend authority can prove current access.
- Cross-surface links must preserve canonical row identity and render loading, unavailable or authorization states rather than silently closing.

### Responsive Aggregate Truth Register

Responsive variants are active operational surfaces, not decorative mirrors of desktop routes. A mobile component that reduces received rows into totals, ratios or trend text must be audited independently whenever the route can be paged, capped, role-scoped, failed or partially enriched.

| Responsive surface | Confirmed local/fallback operational claim | Deterministic requirement | Pass |
| --- | --- | --- | --- |
| `MobileEmergency` | Falls back to received emergency rows for service/status totals and response-success rate, then renders `LIVE` or fixed response-time copy. | Consume a scoped emergency summary with measurement window/completeness or render unavailable/current-window state; no page rows as lifecycle performance. | Pass 1 |
| `MobileWallet` | Derives wallet/payment/ledger metrics from capped recent previews. | Consume ledger/payment aggregate projections with full/preview labeling and no financial-performance claim from recent rows. | Pass 2 |
| `MobileHospitals` and `MobilePricing` | Reduces received hospital/pricing rows into bed/fleet totals, pricing scope ratios, averages and `LIVE` trend claims. | Consume facility/capacity and price-rule aggregates with explicit facility/currency/quote basis or render unavailable. | Pass 3 |
| `MobileUsers`, `MobileOrganizations` and `MobileVerification` | Reduces received identity/organization/queue rows into active, verification, wallet and trust/network trend claims. | Consume scoped identity/organization/verification projections and receiver capabilities; no loaded-row organization or trust truth. | Pass 4 |
| `MobileAmbulances` and `MobileDoctors` | Reduces received provider/fleet rows into availability/on-route/on-call/busy/rating trend claims. | Consume scoped provider/fleet operational aggregates or render unavailable/current-window state. | Pass 5 |
| `MobileVisits` | Derives visit KPIs and search behavior from the loaded page. | Consume request/visit aggregate and server search/count ownership or clearly label bounded page results. | Pass 6 |
| `MobileInsurance`, `MobileSupportTickets`, `MobileHealthNews` and `MobileSubscriptions` | Computes policy, queue, publication and subscriber/revenue ratios or trends from received collections. | Consume authorized domain aggregates with sensitive-field/role scope and completeness, or withhold live/performance language. | Pass 7 |
| `MobileDashboard` and `MobileAnalytics` | Displays composed cross-domain metrics and patient-care actions from shared/fallback state. | Consume stabilized Pass 1-7 projections only; no fallback aggregate or inert workflow action is a Console capability. | Pass 8 |

## Pagination And Data-Access Reliability Register

Pagination controls and service names do not prove that a list is correctly paged or safely fetched. A May 25 source review found `13` route pages rendering `usePagination` or `PaginationControls`; each requires an explicit query-lifecycle disposition before its implementation pass can close.

| Visible list surface | Observed retrieval/pagination behavior | Proven risk or required guard | Pass |
| --- | --- | --- | --- |
| Emergency requests | Page constructs its own count query and paged `.range(...)` row query, then enriches current rows with payment data. | Paging exists, but query/filter/enrichment and failure ownership bypass the emergency read owner. Move paging, sort, count and enrichment state behind Pass 1 projection. | Pass 1 |
| Hospitals | `HospitalsPage` intends a 20-row window but passes `pagination.pageSize` into `getHospitals()`, while `usePagination()` exposes only `itemsPerPage`. On page one, undefined `limit` and zero `offset` skip the service's conditional limit/range branches, so its visible row query is unbounded. The same surface also renders KPI state from globally mounted `PageDataContext.fetchHospitalsData()`, which independently calls unbounded `getHospitals()` and reduces that collection. `filters`, KPI selection and table sort state are not applied to the visible query. | This is a proven cause of the 1000-hospital single-page symptom: both list rows and summary truth can represent a backend response ceiling as complete facility/capacity truth. Replace all route/bootstrap acquisition with one proved page-size/range/filter/sort/count owner plus scoped aggregate projections, and verify mobile refresh/load-more against that owner. | Pass 3 |
| Ambulances | Page first counts matching rows, then replaces truth with a `.limit(1000)` full-client set, slices locally, and resets total to fetched length. | Results and total become silently truncated beyond `1000`; filter/sort/pagination is not authoritative. Implement server-paged fleet queries and scoped stats. | Pass 5 |
| Doctors | Privileged users fetch `1000`, filter/sort/slice locally and set total from fetched length; other roles use service paging. | Admin/org-admin lists silently truncate and totals misstate large datasets. Use consistent server paging/filtering/count authority. | Pass 5 |
| Visits | Page directly constructs paged query and count, then performs page-local profile/emergency/doctor/hospital hydration; search is explicitly unimplemented for paged data. | Pagination cannot claim searchable complete clinical history; auxiliary fetch errors can yield partial context without an owned degraded contract. Move paging/search/hydration into visit read model. | Pass 6 |
| Health news | Page directly constructs count and paged query, while five KPI requests run in a single `Promise.all` before list rendering. | Failure of one summary request can fail the usable list; management query authority also bypasses the content owner. Split list from KPI failure state and keep authoring restricted. | Pass 7 |
| Insurance policies | Hook fetches policies without page window; page filters and slices the loaded collection locally. | Pagination is only client display and cannot represent a complete authorized policy set at scale. Require policy-backed paged read projection before management UI is trusted. | Pass 7 |
| Subscribers | Hook fetches without page window; page filters and slices locally; service returns `[]` for both denied/error list reads. | Full-list scale risk and empty-versus-unavailable ambiguity mask admin list failures. Use paged admin projection with explicit denied/failed state. | Pass 7 |
| Support tickets | Page changes `pagination.currentPage` but calls hook with filters only; hook fetches through service without a page window and refetches the entire result on any realtime event. | Pagination control is not backed by deterministic server paging; update storms can refetch an unbounded list. Add page-window/count ownership and scoped invalidation. | Pass 7 |
| Users | Privileged users request `1000`, slice locally, and derive totals/statistics from the fetched subset; data also depends on organization mapping and extra KPI requests. | Management totals, role counts and bulk scope become silently incomplete beyond the cap. Move page window, stats and organization enrichment behind Pass 4 admin projection. | Pass 4 |
| Verification queue | Provider and organization queues use service-backed page/limit/count results; the page subscribes to both queues and refetches on changes. | Pagination ownership is closest to correct, but invalidation must remain queue-scoped and cannot turn one active tab into duplicate background refetch ownership. | Pass 4 |
| Organizations | Page calls `getOrganizations()` for all organizations and all organization wallets, then searches and slices locally. | Unbounded registry and wallet join fetch; an optional finance dependency can block organization browsing. Add scoped paged organization projection and separate wallet availability state. | Pass 4 |
| Pricing | Service loads all hospitals plus all pricing rows, normalizes in memory, and the page filters/slices locally. | Unbounded cross-table mapping and client pagination compound the already incorrect organization/hospital pricing semantics. Require scoped server-paged pricing projection. | Pass 3 |

High-volume projections without pagination controls are also in scope:

| Surface or projection | Observed retrieval behavior | Proven risk or required guard | Pass |
| --- | --- | --- | --- |
| Wallet ledger/payment history and export | `WalletManagementPage` directly fetches at most `50` ledger rows and `50` payments, performs per-payment profile enrichment, displays the loaded ledger length as transactions recorded, and exports only the loaded rows. | A recent-window preview is presented/exported as if complete history. Label it as recent activity or add explicit server-paged history/export scope through the wallet owner. | Pass 2 |
| Wallet billing-method state and commands | Route and global modal list cards, but platform removal uses a different organization argument than platform listing and the modal represents every row as primary without selection evidence. | This is not merely display polish: destructive billing actions and payout readiness require one actor/scope/result projection. Disable false primary labels and reconcile list/remove/select command scope. | Pass 2 |
| Map initial operational feed | `supabaseMapService` limits emergency requests to `100`, while loading ambulances and hospitals without equivalent bounded/windowed scope and subscribing broadly. | Map coverage can silently omit incidents or load unbounded resources; define viewport/active-operation feed bounds and incomplete-data visibility. | Pass 5 / Pass 8 |
| Global hospital bootstrap and map pre-authorization acquisition | `AppLayout` mounts `MapProvider` and `PageDataProvider` for every route; `MapProvider` calls `supabaseMapService.fetchInitialMapData()` without auth/route guard and that service selects hospitals without a bound, while authenticated `PageDataContext.fetchHospitalsData()` separately calls unbounded `getHospitals()`. On `/hospitals`, those reads coexist with the now-proved unbounded page-row query. | Public/auth routes can attempt facility map reads, and loading `/hospitals` can issue at least three independent unbounded hospital reads, multiplying response-ceiling, exposure and stale/partial-truth risk. Gate map mount and move authenticated summaries and facility rows to bounded owned projections. | Pass 3 / Pass 5 / Pass 8 |
| Emergency dispatch resource-candidate acquisition | `emergencyResponseService.dispatchEmergency()` obtains all available ambulances, verified hospitals and matching doctors through unbounded lookups, then picks the first suitable result; the hospital selection helper accepts but does not use patient location. | Dispatch readiness/proximity is not proved and collection ceiling/order can determine assignment. Candidate reads and selection policy must be bounded, scoped, deterministic and reflected through the emergency action projection before a lifecycle command is enabled or called successful. | Pass 1 / Pass 3 / Pass 5 |
| QuickSearch | One user query executes six parallel category searches and directly records selection/history; no request sequencing or stale-result guard is visible in `QuickSearch`. | Rapid typing can display earlier results after a later query, and one category failure can collapse the combined result path. Provide debounced/cancelled/sequence-safe search with partial-category failure semantics. | Pass 8 |
| Analytics/dashboard summaries | `Analytics`, `analyticsService` and `PageDataContext` perform broad multi-domain aggregate fetches and fallback handling independently; provider-accessible analytics composes subscriber reads whose proved read authority is admin-only. | Summary failure, authorization mismatch and data-volume limits are not described as measured, partial or degraded truth; an unauthorized subscriber slice can fail or silently hollow out allowed operational analytics. Aggregate endpoints or bounded projections need source/freshness/error/role labels. | Pass 8 |
| Map JSON export | `MapPanel` downloads the mounted map context's raw emergencies, selected marker and settings, while the underlying feed has mixed bounds and broad subscription ownership. | A downloaded operational dataset cannot be more complete or less redacted than its feed; keep unavailable until scope, field allowlist, redaction, bounds and incompleteness labels are explicit. | Pass 5 / Pass 8 |
| Analytics CSV/report export | Desktop, mobile and panel entry points export currently rendered analytics state; rendered analytics can include fallback values or subscriber data not authorized for all route roles. | Export requires a role-scoped, source-labelled aggregate projection with time window and degraded/unavailable handling; never download fallback or unauthorized slices as a completed report. | Pass 8 |

Cross-cutting fetch findings:

- `withTimeout()` races a timer against a request but does not cancel the underlying fetch/query; implementations using it still need stale-response and unmount guards when filters/pages change.
- Full-list fetch plus client-side slicing is not acceptable pagination for operational tables unless a deliberately bounded reference list and maximum bound are proven.
- A paged list must keep filters, ordering, count, enrichment, realtime invalidation and export/bulk scope under one read owner; page-local reconstruction is not completion.
- Neutral unauthorized empty state is appropriate only where intended by policy; errors must not be collapsed into a believable empty operational dataset.
- Independent KPI/analytics failures must not blank a usable operational list unless the list itself cannot be trusted without that data.

Data-access gate:

- Every pass containing a list, table, queue, search or export must classify it as server-paged, deliberately bounded client collection, detail-only, or unavailable.
- For server-paged lists, verify stable sort keys, filter parity between count and rows, page reset on filter change, bounded enrichments, stale-response handling, realtime invalidation behavior and empty/error/unauthorized rendering.
- For bulk actions and exports, explicitly state whether scope is current page, selected rows, filtered result set or full authorized dataset; a truncated client collection may not masquerade as the latter.

## Parser And Field-Shape Risk Register

The May 25 emergency detail crash proved that the audit must inspect rendered field shape, not only table names and service ownership. Any `JSON.parse`, numeric coercion, date coercion, object fallback chain or display formatter touching database values is a contract boundary. A pass must prove the accepted scalar/object/null shapes before the UI renders or submits that field.

| Parser or formatter site | Field-shape assumption | Proven risk or required guard | Pass |
| --- | --- | --- | --- |
| `EmergencyDetailsModal.formatAmbulanceType()` | `emergency_requests.ambulance_type` may be an object, JSON string, plain scalar string such as `ambulance`, empty value, or malformed JSON. | The crash class is now identified: plain scalar strings must not be parsed as JSON. Keep this as a service/detail projection normalizer so list, table, modal and app parity all render the same value. | Pass 1 / Pass 5 |
| `OnboardingContext` session restore | `ivisit_onboarding_step` and `ivisit_onboarding_data` are browser-local strings. | Invalid or stale browser state currently falls back safely, but implementation must not treat restored local data as server-trusted organization, role, verification or wallet scope. | Pass 4 |
| `BulkImportModal` JSON/CSV parser | Imported rows are arbitrary file text and CSV splitting is comma-only. | Current parsing can misread quoted CSV values and the async import parser is outside the outer `try/finally` guarantee. Bulk import remains unavailable until row schema, parser errors, preview validation and receiver-side rejection are explicit. | Pass 3 / Pass 7 |
| `insuranceService.parseCoverageDetails()` and linked-payment snapshot parsing | `coverage_details` and linked payment values can arrive as objects, strings, empty values or invalid JSON. | Object parsing is guarded, but coverage/payment fields still need route-level exposure authority and exact field mapping before policy creation, verification or billing-result UI is trusted. | Pass 7 / Pass 2 |
| `walletService.backfillMissingFeeLedger()` | `payments.metadata` may be JSONB object or string; `metadata.fee` is coerced to a number for a ledger debit. | This is a browser-triggered repair mutation over money evidence, not a read projection. It must be removed from normal wallet mount or moved behind an explicitly authorized maintenance path; malformed metadata cannot silently define ledger truth. | Pass 2 |
| Wallet, support, subscriber, analytics and verification aggregators | Amounts, dates, counts and durations are frequently computed with `Number(...)` and `new Date(...)` over fetched rows. | Coercion is acceptable only after field ownership and unavailable-state rules are known; invalid dates or nonnumeric amounts must not become believable zeroes, totals or operational KPIs. | Pass 2 / Pass 4 / Pass 7 / Pass 8 |
| Search and provider-operation formatters | Status/type/category values are mapped from strings with `||` fallbacks and mixed aliases. | Alias fallbacks can hide schema drift such as absent `ambulances.hospital` or legacy visit/provider names. Each pass must replace ad hoc fallback chains with one named normalizer per read model. | Pass 5 / Pass 6 / Pass 8 |

Parser gate:

- Every pass must rerun the parser/coercion scan for its files and document each surviving parser or formatter as one of: canonical normalizer, guarded input parser, display-only formatter, unavailable feature or maintenance artifact.
- A field may not be parsed as JSON merely because some rows used to contain JSON. Check the runtime type and scalar sentinel values first.
- Numeric and date coercion must preserve unavailable, malformed and denied states. Do not collapse them into zero, today, `N/A`, or success copy unless the product explicitly defines that fallback.
- File import parsing is a receiver contract, not a convenience helper. Preview, validation, row errors, partial acceptance and rollback behavior must be specified before enabling import.

## Global Coverage Gaps Found

### Organization Registry Is A Cross-Pass Dependency

`organizationsService.js` is active in `PageDataContext`, `OrganizationsPage`, and `UsersPage`, but earlier maps treated organization identity as an implied part of identity, wallet, hospital, pricing, and subscriber scope. That is too loose for implementation.

Required plan adjustment:

- Pass 4 must own organization registry read/write semantics.
- Pass 2 must consume organization scope for wallet and Stripe state.
- Pass 3 must consume organization scope for hospital and pricing truth.
- Pass 7 must consume organization scope for subscribers/email if campaign targeting is organization-aware.

### Subscription Management Needs A Dedicated Failure Thread

Subscription management is not just content. It spans:

- duplicate services: `subscribersService.js` and `subscriptionService.js`
- `SubscriptionManagementPage`
- `SubscriptionModal`
- `useSubscription`
- welcome/custom/bulk email actions
- subscriber status/type lifecycle
- realtime subscriber updates

Required plan adjustment:

- Pass 7 retains `subscriptionService.js` as the active subscriber/email workflow facade and keeps `subscribersService.js` compatibility-only until removal proof exists.
- Email actions must distinguish queued/sent/failed state; UI must not claim delivery from a request that only started an action.
- Welcome email state must be receiver-confirmed before `welcome_email_sent` style fields are shown as truth.
- Bulk/custom email must have row-level pending, failure, and retry semantics.

### Emergency Details Modal Is A Symptom, Not The Source

`EmergencyDetailsModal` imports `getVisit` and cash approval/decline actions directly. `EmergencyRequestListView` and `EmergencyRequestTableView` also import `getVisit`. This makes the broken emergency detail modal a visible symptom of a broader owner problem:

- emergency detail projection
- request-derived visit lookup
- payment/cash eligibility
- realtime detail refresh
- dispatch/completion legality

Required plan adjustment:

- Pass 1 must define the emergency detail read model before patching modal fields.
- Pass 6 must define request-derived visit ownership before detail/list/table views fetch visits independently.
- Modal repair must not fabricate visit truth when backend has not created or linked it.

### Storage/Media Is Cross-Cutting Infrastructure

`storageService.js` is used by ambulance, doctor, hospital, and insurance surfaces but had no explicit audit owner. Upload semantics can affect provider readiness, hospital presentation, and patient insurance proof.

Required plan adjustment:

- Pass 3 owns hospital image/media implications.
- Pass 5 owns provider/ambulance image implications.
- Pass 7 owns insurance card upload implications.
- A cross-pass storage check must verify bucket, path, public/private URL, cleanup, and authorization semantics before implementation closes.

### Support FAQs Are Missing From Support Lifecycle Planning

`supportFaqsService.js` exists as a full CRUD/realtime service, but no page import was found in the source scan. Source RLS grants public reads only, so its browser management methods are dormant unauthorized promises rather than an unfinished active surface.

Determined plan adjustment:

- The patient app remains the active FAQ reader through `helpSupportService.js`, backed by public-read table policy.
- The console FAQ adapter remains dormant: it has no rendered importer and its direct create/update/delete promises are not authorized by current source RLS, which proves public SELECT only.
- Pass 7 must not expose console FAQ authoring until a deliberate admin-authorized receiver and route are specified. Retirement of dormant code is a separate cleanup pass, not part of support-ticket repair.

### Search Telemetry Services Are Orphaned From UI

`searchEventsService.js`, `searchHistoryService.js`, and `searchSelectionsService.js` currently have no direct source import in the scan, while `QuickSearch` only imports `searchService.js`.

Determined plan adjustment:

- `searchService.js` is the active QuickSearch read/event owner; it already records history and selection events through tables allowed by current own-user/authenticated policies.
- The separate CRUD/realtime telemetry adapters remain dormant and must not be wired into global admin UI without a named privacy/use case and guarded receiver.
- Pass 8 repairs the active ambulance projection: `searchService.searchAmbulances()` queries absent `ambulances.hospital`, and its rejection can blank all global-search results from the shared `Promise.all()` path.
- Admin aggregation may use the guarded search RPCs only after removing `searchAnalyticsService` fabricated fallback rows.

### Infrastructure Helpers Need A Guardrail Audit

`rbacPatterns.js` and `supabaseHelpers.js` are not visibly imported by current surfaces, but they encode security, retry, audit, and realtime patterns that implementation passes may reach for.

Required plan adjustment:

- Pass 4 must treat `rbacPatterns.js` as active verification infrastructure, not unused. It is imported by `verificationService.js` and `orgVerificationService.js`.
- Pass 8 must treat `supabaseHelpers.js` as dormant until repaired. No active import was found, and the file contains mojibake separators plus Vite-style `import.meta.env.DEV` checks in a CRA/Craco console.
- No pass should add client-side authorization helpers as a substitute for RLS/RPC/Edge authorization.

Audit notes:

- `rbacPatterns.isAdmin()` only accepts `role === 'admin'`, while some queue reads allow `org_admin` or `sponsor`. Any implementation must keep read permission, approval authority, and dispatch/readiness authority separate.
- `rbacPatterns.logAuthorizationEvent()` is disabled by design and does not persist audit evidence. It cannot satisfy critical mutation auditability.
- `supabaseHelpers.withAudit()` fire-and-forgets `log_user_activity` and swallows failures. It can support operator activity UX, but it is not sufficient for legally or financially critical mutation proof.
- Active timeout use is currently through `frontend/src/lib/utils.js:36-43`, not `supabaseHelpers.withTimeout()`. Consolidation should happen deliberately, after encoding and runtime-syntax cleanup.

### Preferences And Demo Mode Have Separate Owners

`preferencesService.js` exposes demo mode and several notification/sharing toggles but no active import was found. Stage 3 already noted demo-mode drift.

Determined plan adjustment:

- Console settings may own the signed-in operator's notification preference because `preferences.notifications_enabled` is own-user writable, but the visible switch is currently hardcoded and inactive.
- `demo_mode_enabled` and medical/contact sharing remain patient-app behavior and consent lanes; they are not console operational settings.
- Pass 8 removes production dashboard mock fallback independent of patient demo mode, and wires or removes the operator notification control with visible pending/error state.

### Trending And Analytics Automation Need Truth Labels

`trendingTopicsService.js` and `analyticsAutomationService.js` can create the appearance of dynamic intelligence even when the source is manual, stale, stubbed, or not wired.

Determined plan adjustment:

- Current visible trending rows are read-only/manual database content; automatic regeneration is disabled in implementation planning because both source RPCs report success without generating trends.
- Pass 8 removes or disables any regeneration command until a real aggregator exists, and returns empty/unavailable state rather than fabricated fallback rankings.
- Dashboard analytics must replace the synthetic `95%` no-request success rate, mock fallback operational rows, estimated on-route ambulances, and constant platform performance metrics with receiver-backed or unavailable states.

### Staff Scheduling Has A Determined Receiver

`StaffSchedulingModal` collects shift dates, times, types, edits, deletes, and conflict checks. `staffSchedulingService.js` currently answers those commands by deriving same-day fixed shifts from `doctors` and `ambulances`, updating only doctor status, and testing current status instead of stored time overlap. Its ambulance query also selects or filters absent `ambulances.hospital`.

Determined plan adjustment:

- `doctor_schedules` is the doctor-shift owner: current schema defines its date/time/type/availability rows and current RLS permits org-admin/admin management within organization scope.
- Pass 5 must read and mutate stored `doctor_schedules` rows for doctor shifts and calculate conflicts/statistics from those rows, not from status projections.
- `doctors` availability remains a separate operational state; a scheduled shift must not silently overwrite it as a proxy for schedule persistence.
- Ambulance crew/fleet assignment may remain contextual read data, but generated ambulance shift rows and ambulance shift CRUD are excluded until a persisted authorized receiver exists.
- The invalid `ambulances.hospital` projection must be removed in favor of schema-owned identity/join fields wherever fleet context remains visible.

## Updated Global Pass Assignment

| Pass | Must include after Stage 5 |
| --- | --- |
| Pass 1 - Emergency lifecycle and cash/payment truth | `EmergencyDetailsModal` detail projection, direct `getVisit` use in emergency views, cash approval/decline direct modal actions. |
| Pass 2 - Wallet, payout, Stripe functions, and ledger authority | `activityService` audit behavior, organization scope dependency, wallet summary duplication. |
| Pass 3 - Hospitals, availability, discovery, and pricing scope | `hospitalImportService`, `storageService` hospital uploads, `organizationsService` hospital ownership, pricing org semantics. |
| Pass 4 - Identity, verification, and onboarding authority | `organizationsService`, `rbacPatterns`, `onboardingService`, `verificationService`, `orgVerificationService`, `profilesService`, `authService`, display ID helpers. |
| Pass 5 - Provider operations, telemetry, doctors, and scheduling | `storageService` provider/ambulance uploads, map telemetry projection, ambulance/driver/doctor/schedule lifecycle. |
| Pass 6 - Visits ownership and request-derived history | canonical `visits.request_id` lookup; request-derived clinical completion remains read-only unless an authorized receiver is established; dormant medical-profile admin promises remain excluded without access authority. |
| Pass 7 - Content, support, subscribers, and email | subscription failure thread, duplicate subscriber services, support FAQs, support tickets, health news, insurance, media upload for insurance cards, notification side effects, and route-independent `ContextAwareFAB` / `DynamicBottomBar` hook acquisitions. |
| Pass 8 - Analytics, search, dashboard shell, realtime, and feedback | search telemetry services, preferences/demo mode, analytics automation, trending topics, `supabaseHelpers`, route fallback/loading, realtime ownership, and removal of hidden shell domain acquisitions. |

## Service-Level Completion Criteria

A service is not considered implementation-ready until the pass plan names:

- canonical owner for reads
- canonical owner for writes/actions
- source table/RPC/Edge Function or explicit stub/manual source
- UI surfaces that consume it
- all importers and direct duplicate call sites found by the worktree scan
- surface-by-role read/render exposure inventory and minimum necessary data assessment
- visible create/edit/delete/transition/export/bulk/action controls with exact operation classification
- field-shape assumptions for every high-risk rendered/submitted field
- unsafe parser/formatter risks, including JSON/date/number parsing and object truthiness
- realtime owner, if any
- pagination/window/count/search/export scope and data-access failure policy for every list surface
- loading/pending/error feedback requirements
- role/RLS/RPC authorization expectations
- app parity requirement, if the service supports patient app workflows
- console-only scope, if the service intentionally exceeds app behavior
- verification command or manual smoke path

## Subplan Prerequisite

Do not create detailed user-flow subplans until:

- Stage 5 service coverage is indexed in the alignment README.
- Stage 6 pass inputs are updated with the Stage 5 promoted services.
- Each pass has a no-unowned-service checklist.
- Emergency details and subscription management are treated as named failure threads inside their owning passes.

After those gates, the first detailed subplans should be:

1. Emergency list/detail/modal, dispatch, cash/payment, and request-derived visit flow.
2. Subscription intake/read, unsupported subscriber management writes, welcome/custom/bulk email commands, and realtime subscriber state flow.
3. Wallet/Stripe/ledger flow.
4. Organization, onboarding, verification, and provider readiness flow.
5. Hospital/capacity/pricing flow.
