# Stage 5 Full Service Coverage Audit - 2026-05-24

## Status

Post-checkpoint service coverage audit. Planning only; no product, database, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This stage exists to prove that every console service has an explicit audit owner before implementation begins. Earlier stages correctly prioritized emergency, payment, capacity, identity, provider operations, visits, content, and analytics. This pass closes the remaining planning gap: lower-risk, console-only, infrastructure, and supporting services must also be accounted for so no broken user flow hides outside the L5 priority set.

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
| Pass 7 - Content, support, subscribers, and email | subscription failure thread, duplicate subscriber services, support FAQs, support tickets, health news, insurance, media upload for insurance cards, notification side effects. |
| Pass 8 - Analytics, search, dashboard shell, realtime, and feedback | search telemetry services, preferences/demo mode, analytics automation, trending topics, `supabaseHelpers`, route fallback/loading, realtime ownership. |

## Service-Level Completion Criteria

A service is not considered implementation-ready until the pass plan names:

- canonical owner for reads
- canonical owner for writes/actions
- source table/RPC/Edge Function or explicit stub/manual source
- UI surfaces that consume it
- all importers and direct duplicate call sites found by the worktree scan
- field-shape assumptions for every high-risk rendered/submitted field
- unsafe parser/formatter risks, including JSON/date/number parsing and object truthiness
- realtime owner, if any
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
