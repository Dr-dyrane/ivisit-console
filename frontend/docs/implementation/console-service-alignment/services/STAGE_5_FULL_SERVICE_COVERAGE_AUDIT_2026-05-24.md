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

The `43/43` service-file register and the reverse shared-table ledger establish inventory coverage only. They do not establish runtime data-flow closure, list completeness, correct displayed totals, or safe implementation readiness. The hospital bootstrap counterexample on May 25 proves that distinction: the route's visible row query is paged while globally mounted providers still acquire an unbounded hospital collection and render potentially capped KPI truth.

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

`AppLayout` mounts `MapProvider` and `PageDataProvider` around the application shell. `PageDataProvider` starts its domain loads whenever an authenticated user is available, independent of the route the operator opened; `MapProvider` initializes map collections and subscriptions as part of the shell. These paths are therefore in scope for each affected domain pass, not deferred dashboard polish.

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
| `MapProvider` shell initialization and map subscriptions | Emergency markers | Loads latest `100` emergencies and subscribes broadly to all emergency changes. | State is a bounded operational feed, not all emergencies; expose bound/completeness and scope subscription ownership. | Pass 1 / Pass 5 / Pass 8 |
| `MapProvider` shell initialization and map subscriptions | Ambulance markers | Loads ambulances without a window and subscribes broadly. | Map feed cannot be an unbounded second fleet owner; define active/viewport feed and telemetry lifecycle. | Pass 5 / Pass 8 |
| `MapProvider` shell initialization | Hospital markers and nearby fallback | Loads hospitals without a window; nearby-RPC fallback also reads available hospitals without a bound. | Map cannot silently truncate or unboundedly load facility coverage; define geospatial/viewport bounds and unavailable/fallback labeling. | Pass 3 / Pass 5 / Pass 8 |
| `MapProvider` shell subscription | User location channel | Subscribes to `users` for patient locations even though the table/visibility contract is stated only as an assumption in source comments. | Disable or replace until patient-location receiver, role scope and privacy authority are proven. | Pass 1 / Pass 4 / Pass 5 / Pass 8 |
| `ContextAwareFAB` shell mount | Insurance policies, support tickets and subscribers | `AppShell` renders the FAB on every route; it calls `useInsurance()`, `useSupportTickets()` and `useSubscription()` before returning `null` on mobile or while the panel is open. Each hook performs initial reads and subscriptions. | A hidden command affordance must not globally acquire sensitive/full collections or admin-only subscriber data. Load command dependencies only in an authorized opened surface or share a narrowly scoped projection. | Pass 7 / Pass 8 |
| `DynamicBottomBar` shell mount | Insurance policies, support tickets and subscribers | `AppShell` renders the bottom bar on every route; it calls the same three hooks before returning `null` on non-mobile viewports. Each hook performs initial reads and subscriptions. | This duplicates the FAB hidden acquisition on all viewports and routes; remove route-independent hook mounting and use deliberate action-owned command boundaries. | Pass 7 / Pass 8 |
| `ContextPanelShell` when opened on desktop/tablet | Subscribers and domain context summaries | The shell conditionally mounts `ContextPanel`; while open it invokes `useSubscription()` regardless of active route and projects route context from `PageDataContext`. | Context-open state must not add a full admin-only subscriber fetch/channel outside `/subscriptions`; use authorized route-specific summaries only. | Pass 7 / Pass 8 |
| Global PWA, feedback and debug mounts | Browser install/update/offline state, interaction feedback, visible version marker | `PWAProvider`, `FeedbackProvider` and `PWADebugTracker` mount outside routed content; `index.js` actively invokes `serviceWorkerRegistration.register()`. They do not read domain tables, but render or affect public and protected routes. `PWADebugTracker` displays a fixed `v1.0.33`; feedback callers can request audio and haptics. | Classify as shell utility behavior rather than unreviewed infrastructure: remove or authoritatively source production debug copy, verify active service-worker/PWA actions, and gate interaction effects through accessibility/operator expectations. | Pass 8 |

## Coverage Summary

| Service | Role | Current consumption signal | Prior coverage | Implementation owner |
| --- | --- | --- | --- | --- |
| `activityService.js` | Activity/audit event reads, stats, realtime, and helper logging. | Imported by `PageDataContext`, `useActivity`, and wallet/activity flows. | Explicit in Stage 4/6 as audit support, but not independently covered. | Pass 2 and Pass 8 cross-cutting audit policy. |
| `adminService.js` | Admin permissions, invite, bulk user operations, suspend/delete, MFA/Auth helpers. | Imported by `useAdmin`, `DoctorModal`, and admin/user flows. | Explicit. | Pass 4 identity/admin authority. |
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

## Direct Boundary Call-Site Register

The `43/43` service-file inventory is complete, but services are not the only files touching backend truth or externally delivered command behavior. A May 25 source scan of `frontend/src/components`, `contexts`, `hooks`, `utils`, `lib`, email templates and startup infrastructure found the following direct Supabase/Auth/Edge/Storage/external boundaries outside service owners. These files are mandatory pass scope where their operation remains active; a pass cannot claim owner cleanup while leaving its listed direct caller unreviewed.

| Direct caller | Observed direct boundary | Current classification | Deterministic implementation disposition | Pass |
| --- | --- | --- | --- | --- |
| `components/pages/EmergencyRequestsPage.jsx` | Direct `emergency_requests` list/count reads, batched `payments` read, and page-owned realtime for both tables. | Active duplicated server/realtime owner. | Move list/count/payment eligibility/invalidation into the emergency detail/read owner before lifecycle action repair. | Pass 1 |
| `components/modals/EmergencyRequestModal.jsx` | Direct `profiles` selection for emergency create inputs. | Active input projection bypass. | Read patient/operator-selectable identity through the Pass 1/4 authorized profile projection; do not let modal shape its own identity authority. | Pass 1 / Pass 4 |
| `components/ui/LocationCell.jsx` | Direct Google reverse-geocoding `fetch` for emergency location display. | Active external projection dependency with coordinate-shape/fallback sensitivity. | Put geocoding/fallback behavior under the Pass 1 emergency location projection contract; malformed coordinates or unavailable provider must render bounded fallback truth. | Pass 1 |
| `components/modals/EmergencyDetailsModal.jsx` external map link | Visible detail action opens Google Maps with request latitude/longitude. | Active external coordinate disclosure/navigation handoff when the operator invokes it. | Validate actor and coordinate projection, label external navigation clearly and keep it distinct from Console tracking confirmation. | Pass 1 |
| `components/pages/WalletManagementPage.jsx` | Direct reads of `ivisit_main_wallet`, `organization_wallets`, `wallet_ledger`, `payments`, and profile enrichment. | Active duplicated finance read owner. | Move all finance projection reads behind the Pass 2 wallet facade; ledger stays read-only evidence except through an authorized money command. | Pass 2 |
| `contexts/PageDataContext.jsx` | Direct wallet/ledger reads, service-triggered unbounded summary loads including hospitals/pricing, and global channels for emergency, doctors, visits, insurance, profiles, organizations, pricing, support tickets and activity. | Active cross-domain owner duplication and capped/unbounded aggregate truth risk. | Remove domain server truth and channels incrementally after each pass establishes its owner; retain shell composition only. | Passes 1-8; final reduction Pass 8 |
| `components/pages/HospitalsPage.jsx` | Page-owned hospitals realtime channel. | Active duplicate facility invalidation owner. | Route invalidation through the Pass 3 facility owner after read centralization. | Pass 3 |
| `components/modals/HospitalModal.jsx` | Raw `fetch` to `discover-hospitals` with text-search payload/response assumptions. | Active Edge Function contract bypass; already confirmed incompatible with app handler contract. | Route discovery through the Pass 3 discovery/import owner using normalized provider taxonomy/provenance and an authorized non-silent persistence boundary. | Pass 3 |
| `components/pages/UsersPage.jsx` | Direct verified-profile KPI read and direct privileged `delete_user_by_admin` RPC for single/bulk deletion. | Active identity read and workflow-command bypass. | Move KPI and destructive command invocation to the Pass 4 admin boundary; preserve explicit RPC command semantics and pending/error handling. | Pass 4 |
| `components/modals/InviteUserModal.jsx` | Direct `invite-user` Edge Function invocation. | Active identity workflow command; known role/org/email-result drift. | Keep only behind repaired Pass 4 invite authority and truthful delivery result handling. | Pass 4 |
| `contexts/AuthContext.jsx`, `components/pages/LoginPage.jsx`, `components/pages/SetPasswordPage.jsx`, `components/modals/SecurityModal.jsx` | Direct Supabase auth/session/password/OAuth/MFA calls; Login also invokes `check-user`. | Intentional authentication adapter surface requiring receiver review, not ordinary table CRUD. | Review as one Pass 4 auth boundary; direct Auth SDK use may remain only for supported session/credential/MFA operations with truthful feedback. | Pass 4 |
| `lib/avatarUtils.js`, `components/navigation/SmartHeader.jsx`, `components/navigation/MobileNavMenu.jsx`, `components/pages/UsersPage.jsx` | External generated-avatar URLs can include profile username or profile/user-derived seed when stored avatar media is unavailable. | Active third-party identity-media disclosure path in global/user surfaces. | Use app-owned fallback media or define a privacy-reviewed non-identifying external avatar policy; do not transmit operator identifiers casually. | Pass 4 / Pass 8 |
| `components/pages/AmbulancesPage.jsx` | Direct ambulance list/count/scoped-stat reads. | Active fleet read-owner bypass. | Move reads/KPIs behind fleet operations owner using actual hospital/organization scope. | Pass 5 |
| `components/modals/AmbulanceModal.jsx`, `components/modals/DoctorModal.jsx` | Direct hospital dropdown reads; ambulance modal also queries occupied `profile_id` assignments. | Active modal relationship bypass. | Replace with provider/fleet lookup boundaries that enforce assignment and facility identity contracts. | Pass 5 |
| `components/pages/VisitsPage.jsx` | Direct visits list/count reads, multi-table hydration (`profiles`, `emergency_requests`, `doctors`, `hospitals`), and page-owned realtime. | Active request-derived clinical owner bypass. | Move all hydration/count/subscription behavior behind one visit read model; prohibit arbitrary emergency-linked delete/status authority. | Pass 6 |
| `components/pages/HealthNewsManagementPage.jsx`, `components/context/HealthNewsPanel.jsx` | Direct health-news reads/KPIs; panel owns its own channel. | Active content read/realtime duplication over a write-unproved surface. | Use one Pass 7 published-feed read owner; keep draft/author/write controls unavailable pending policy/receiver proof. | Pass 7 |
| `components/context/SupportTicketsPanel.jsx` | Direct recent ticket read and panel-owned realtime. | Active support read/realtime duplication. | Reuse the Pass 7 support-ticket owner and its authorized scope. | Pass 7 |
| `emails/ivisit106Campaign.js` and generated email templates | `SubscriptionModal` imports campaign HTML that links directly to a hard-coded `functions/v1/unsubscribe` endpoint; delivery function templates embed the same recipient action URL, while the local unsubscribe handler source is not proved as that deployed slug. | Active externally delivered subscriber command boundary with deployment/lifecycle uncertainty. | Verify one deployed idempotent unsubscribe receiver, shared URL construction and durable subscriber status projection before treating sent templates as lifecycle-complete. | Pass 7 |
| `components/pages/Analytics.jsx`, `components/pages/Overview.jsx`, `hooks/useAnalytics.js` | Live `Analytics.jsx` performs direct multi-domain reads and composes subscriber analytics; `Overview.jsx` and `useAnalytics.js` are source-present but not mounted by the live route scan. | Active analytics bypass plus dormant alternative owners; provider-visible analytics can depend on admin-only subscriber scope. | Replace live analytics with Pass 8 verified-source, role-scoped projections after domain owners stabilize; retire or deliberately re-authorize dormant alternatives; unsupported metrics become unavailable, not inferred. | Pass 8 |
| `components/map/MapRenderers/LeafletMapRenderer.jsx` | Operational map requests third-party CARTO tile layers with OpenStreetMap/CARTO attribution. | Active external base-map delivery dependency for emergency/fleet rendering. | Prove degraded/unavailable behavior for tile failure and preserve separation between visual tile delivery and authenticated marker/telemetry truth. | Pass 5 / Pass 8 |
| `components/pages/BentoHome.jsx` | Hard-coded public Supabase `images/map.png` URL. | Active public Storage delivery assumption outside media owner. | Keep only after public asset provenance/availability is established or replace through app-owned stable asset delivery; do not conflate with sensitive upload authority. | Pass 8 with Storage gate |
| `components/context/DashboardPanel.jsx` | Defines a direct `POST /api/backup` handler, but no rendered dashboard trigger was found in the live panel scan; the rendered realtime switch and alert thresholds update local state only. | Dormant unproved maintenance handler plus active controls that imply unimplemented operational configuration. | Remove or keep the backup handler dormant unless a separately authorized auditable receiver is approved; wire or remove visible configuration controls. | Pass 8 |
| `utils/runMigrations.js` | Browser-side `exec_sql` RPC for health news, support tickets and insurance schema/policy mutation. | Dormant or unsafe maintenance boundary; never a product implementation receiver. | Exclude from operational flows and remove/retire from shipped runtime if import review confirms it is unused; schema work belongs to controlled migrations only. | Pass 7 / Pass 8 safety cleanup |
| `utils/testDatabase.js` | Direct test reads of health-news, support and insurance tables. | Dormant local diagnostic helper; not a product owner. | Keep outside product behavior or retire after import proof; never use it to authorize a runtime surface. | Pass 7 / Pass 8 safety cleanup |
| `lib/supabase.js` generic `subscribeToTable` helper | Used by source-present `Overview`, whose route was not mounted in the live route scan; direct client imports in live pages/contexts remain assigned in their own rows. | Dormant generic subscription bypass that could revive duplicate ownership if `Overview` is remounted. | Retire with dormant `Overview` or route any deliberate remount through named domain owners; do not treat it as current live realtime truth. | Pass 8 |
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

| Visible route or surface | Proven current drift | Required disposition | Pass |
| --- | --- | --- | --- |
| Authentication, onboarding and dashboard routes (`/login`, `/set-password`, `/onboarding`, `/onboarding-success`, `/`) | Public onboarding/password routes and viewer-protected dashboard are defined in `App.js`, while dormant route doctrine omits onboarding/password routes and labels `/` public. | Name one route-authority source; keep authentication/onboarding access and shell feedback aligned to the live gate. | Pass 4 / Pass 8 |
| `/map` | Live route requires `provider`; navigation exposes the item without a minimum role and dormant route doctrine labels it public. | Keep operational map restricted consistently in route, navigation and any future shared route configuration. | Pass 5 / Pass 8 |
| `/hospitals` | Live route and navigation allow `org_admin`; dormant route doctrine requires `admin`. | Reconcile facility operational access before centralizing hospital commands and reads. | Pass 3 / Pass 4 |
| `/health-news` | Live route requires `provider`; navigation and `ContextPanel` expose viewer access. | Hide/restrict unsupported viewer entry points or deliberately authorize a read-only viewer surface distinct from management. | Pass 7 |
| `/insurance` | Live route requires `admin`; navigation exposes `org_admin` while current insurance management authority is already unproved. | Do not advertise org-admin policy management until its guarded receiver and route authority exist. | Pass 7 |
| `/users` and `/verification` | Live route and navigation allow `org_admin`; `ContextPanel` suppresses these panels unless `admin`. | Use one role definition for route, navigation and operational context; do not remove valid scoped workflow context by panel-only rule. | Pass 4 |
| `/settings` | Live route and navigation allow `viewer`; `ContextPanel` suppresses settings context unless `admin`. | Separate own-user settings from admin-only system operations and align panel visibility to that split. | Pass 4 / Pass 8 |
| `/organizations` | Live route and navigation require `admin`; dormant route doctrine does not define the surface. | Add organization management to the authoritative access contract when route authority is consolidated. | Pass 4 |
| `/emergencies`, `/visits`, `/analytics`, `/support-tickets` | Live route, navigation and panel minimum-role checks align at provider or higher in this scan; domain/receiver defects remain assigned separately. | Preserve role alignment while Passes 1, 6, 7 and 8 repair their read/command owners. | Pass 1 / Pass 6 / Pass 7 / Pass 8 |
| `/ambulances`, `/doctors`, `/wallet` | Live route, navigation and panel minimum-role checks align at `org_admin` or higher in this scan; data/command ownership is not thereby proved. | Preserve role alignment while Passes 2 and 5 repair operational and money receivers. | Pass 2 / Pass 5 |
| `/subscriptions` | Live route, navigation and panel minimum-role checks align at `admin`; the Broadcast action remains separately broken below. | Preserve platform-admin reach while subscriber/email command authority is constrained. | Pass 7 |
| `/unauthorized` and fallback route | These are live navigation/failure handling surfaces with no domain command ownership found in this scan. | Keep access-denial and not-found feedback truthful during route-authority consolidation. | Pass 8 |
| `/pricing` primary context action | `PricingContextPanel` exposes pricing creation, but the shared primary context action for `/pricing` dispatches `openTopUpModal`, opening wallet funding instead of a pricing workflow. | Keep money movement and rate management distinct; pricing-route primary action must invoke only the proven pricing operation or remain unavailable. | Pass 2 / Pass 3 |
| `/pricing` panel Reports and Bulk Sync actions | `PricingContextPanel` dispatches `openAnalyticsModal`, but `PricingManagementPage` has no event listener; the visible Bulk Sync button has no click handler. | Wire only a pricing-scoped mounted report/read projection and remove or disable sync until an authorized import/pricing receiver exists. | Pass 3 / Pass 8 |
| Dashboard Report action | `DashboardPanel` dispatches `openAnalyticsModal` while the analytics modal listener is mounted only on route pages such as `/analytics`, not on the dashboard route. | Navigate deliberately to analytics or mount a dashboard-owned authorized report surface; do not leave a visible no-op. | Pass 8 |
| `/map` centering actions | `useContextAction` dispatches `centerMap` and `MapPanel` dispatches `recenter-map-target`; mounted map implementations and `MapContext` consume `recenter-map` only, so these visible map commands have no matching receiver. | Use one map-control API/event, including targeted requests when supported, and verify centering from the actual map route surface. | Pass 5 / Pass 8 |
| Subscription Broadcast action | `SubscriptionsPanel` dispatches `openEmailActionsModal`; `SubscriptionManagementPage` listens for create and analytics events only, so this visible action has no mounted receiver. | Disable until the authorized email lifecycle surface exists, or attach it to the single audited subscriber/email command owner. | Pass 7 |
| Verification Quick Verify action | `useContextAction` navigates to `/verification?quick=true`, but no query-param consumer was found in `VerificationQueue`. | Implement a real authorized quick-review mode or replace the control with an action the verification queue receives. | Pass 4 |
| Emergency clinical-record handoff | `EmergencyDetailsModal` dispatches `openVisitModal` and closes itself; the only visit-modal listener is in `VisitsPage`, which is not mounted on `/emergencies`. | Provide an emergency-route-owned clinical detail surface or deliberate route transition with carried identity; never close into a no-op. | Pass 1 / Pass 6 |
| Visit incident-log handoff | `VisitModal` dispatches `openEmergencyDetails`, and `VisitsPage` does mount the receiving emergency-detail modal. This is the proved working direction of the handoff. | Preserve the mounted receiver while normalizing its request identity through the Pass 1/6 read models; do not infer that the reverse handoff is implemented. | Pass 1 / Pass 6 |

### Live Component Family Assignment

The route rows above establish access and event failures; this component-family register prevents a named route from hiding an unaudited page, modal, panel or global action container. Mobile/table/list/grid variants inherit their parent family's pass and must be checked for identical field exposure and operation authority.

| Live component family | Files or mounted components included | Required audit owner |
| --- | --- | --- |
| Public/auth/onboarding/failure | `LoginPage`, `SetPasswordPage`, `OnboardingPage`, `OnboardingSuccessPage`, `NotFoundPage`, unauthorized surface, `SecurityModal`, `ProfileEditModal`, `SupportModal` from settings | Pass 4 identity/auth; Pass 7 support handoff; Pass 8 feedback |
| Dashboard/analytics/search/notification shell | `BentoHome`, `Analytics`, `AnalyticsPanel`, `AnalyticsModal`, `DashboardPanel`, `QuickSearch`, common `NotificationCenter`, `SmartHeader`, `ContextPanelShell`, `ConsoleStartupOverlay`, `PWAProvider`, `FeedbackProvider`, `PWADebugTracker` | Pass 8, consuming domain truths from Passes 1-7 and explicitly disposing of all shell-visible utility feedback/debug behavior |
| Global action/modal containers | `ContextAwareFAB`, `DynamicBottomBar`, `GlobalFinancialModals`, `useContextAction` | Pass 8 shell ownership plus each invoked domain pass; hidden hook acquisitions are Pass 7/8 blockers |
| Emergency/map/clinical handoff | `EmergencyRequestsPage`, `GodModeMap`, `EmergencyPanel`, `MapPanel`, `EmergencyRequestModal`, `EmergencyDetailsModal` | Pass 1; map/telemetry dependencies in Pass 5 and shell cleanup in Pass 8 |
| Hospitals/pricing/import/capacity | `HospitalsPage`, `PricingManagementPage`, `HospitalsPanel`, `PricingContextPanel`, `HospitalModal`, `BulkImportModal` if wired, and capacity actions | Pass 3; financial handoff in Pass 2 and report/event cleanup in Pass 8 |
| Ambulance/doctor/scheduling/provider operations | `AmbulancesPage`, `DoctorsPage`, `AmbulancesPanel`, `DoctorsPanel`, `AmbulanceModal`, `DoctorModal`, `StaffSchedulingModal` | Pass 5 |
| Visits/history | `VisitsPage`, `VisitsPanel`, `VisitModal` and its emergency-detail handoff | Pass 6 with Pass 1 receiver dependency |
| Identity/verification/organizations/settings | `UsersPage`, `VerificationQueue`, `OrganizationsPage`, `SettingsPage`, `UsersPanel`, `VerificationPanel`, `OrganizationsPanel`, `SettingsPanel`, `UserModal`, `InviteUserModal`, `VerificationModal` | Pass 4; notification/settings wiring in Pass 8 |
| Care/content/support/subscribers | `HealthNewsManagementPage`, `InsuranceManagementPage`, `SupportTicketsPage`, `SubscriptionManagementPage`, their context panels and `HealthNewsModal`, `InsuranceModal`, `SupportTicketModal`, `SubscriptionModal` | Pass 7, with shell acquisition/realtime cleanup in Pass 8 |
| Wallet/finance projection | `WalletManagementPage`, `WalletPanel`, `GlobalFinancialModals` top-up/withdraw/billing receivers | Pass 2; shell action separation in Pass 8 |

Surface gate:

- Every implementation pass must verify route entitlement, navigation visibility, panel visibility, primary context action and modal receiver for each operated surface in scope.
- A click that dispatches an event without a receiver mounted on the current route is a broken user flow, even if both modal components exist in the repository.
- Dormant route/security configuration cannot be cited as authorization evidence; only a wired runtime guard and backend authority can prove current access.
- Cross-surface links must preserve canonical row identity and render loading, unavailable or authorization states rather than silently closing.

## Pagination And Data-Access Reliability Register

Pagination controls and service names do not prove that a list is correctly paged or safely fetched. A May 25 source review found `13` route pages rendering `usePagination` or `PaginationControls`; each requires an explicit query-lifecycle disposition before its implementation pass can close.

| Visible list surface | Observed retrieval/pagination behavior | Proven risk or required guard | Pass |
| --- | --- | --- | --- |
| Emergency requests | Page constructs its own count query and paged `.range(...)` row query, then enriches current rows with payment data. | Paging exists, but query/filter/enrichment and failure ownership bypass the emergency read owner. Move paging, sort, count and enrichment state behind Pass 1 projection. | Pass 1 |
| Hospitals | The visible table requests a service-backed window, but `HospitalsPage` also renders KPI state from globally mounted `PageDataContext.fetchHospitalsData()`, which calls unbounded `getHospitals()` and derives total/availability/bed/fleet metrics from the returned collection. `filters`, KPI selection and table sort state are not passed into that page-window query or otherwise applied to its rendered rows. | Supabase's default response ceiling can make a 1000-hospital collection look like complete network/capacity truth while visible filter/sort controls are non-authoritative. Replace bootstrap collection-derived stats with scoped count/aggregate projections and one paged/filterable/sortable facility read owner. | Pass 3 |
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
| Map initial operational feed | `supabaseMapService` limits emergency requests to `100`, while loading ambulances and hospitals without equivalent bounded/windowed scope and subscribing broadly. | Map coverage can silently omit incidents or load unbounded resources; define viewport/active-operation feed bounds and incomplete-data visibility. | Pass 5 / Pass 8 |
| Authenticated global hospital bootstrap | `AppLayout` mounts `MapProvider` and `PageDataProvider` for every route; authenticated initialization loads hospitals for global KPI state and map state, while pricing initialization reads hospital mappings for both service and room pricing. | Loading `/hospitals` can issue multiple unbounded hospital reads independent of its paged table, multiplying the 1000-row ceiling and stale/partial truth risk. Move global summaries and map/pricing dependencies to bounded owned projections. | Pass 3 / Pass 8 |
| QuickSearch | One user query executes six parallel category searches and directly records selection/history; no request sequencing or stale-result guard is visible in `QuickSearch`. | Rapid typing can display earlier results after a later query, and one category failure can collapse the combined result path. Provide debounced/cancelled/sequence-safe search with partial-category failure semantics. | Pass 8 |
| Analytics/dashboard summaries | `Analytics`, `analyticsService` and `PageDataContext` perform broad multi-domain aggregate fetches and fallback handling independently; provider-accessible analytics composes subscriber reads whose proved read authority is admin-only. | Summary failure, authorization mismatch and data-volume limits are not described as measured, partial or degraded truth; an unauthorized subscriber slice can fail or silently hollow out allowed operational analytics. Aggregate endpoints or bounded projections need source/freshness/error/role labels. | Pass 8 |

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
