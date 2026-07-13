# Stage 6 Console Alignment Implementation Pass Plan - 2026-05-24

## Status

Expanded global implementation-pass plan. Planning only; no product, database, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

Execution update, 2026-07-12: the narrowly scoped Pass 4 Auth, complete facility identity projection, tenant-bound user statistics, organization onboarding, private evidence, password recovery, and user invitation slice was implemented under explicit authorization after its end-to-end proof chain closed. The authoritative receiver, RLS/Storage, rollback harness, live and browser E2E, zero-residue cleanup, and remaining-exclusion record is `../passes/PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md`. The original checkpoint below is retained as the planning baseline and does not reopen authority for unrelated Pass 4 commands or other passes.

Source-convergence update, 2026-07-13: the current PR-admission catalog has no active source-confirmed failures, 91 resolved findings, and one explicit deployment blocker. Canonical shared-contract repairs live in the `ivisit-app` Supabase pillars and are synchronized into Console; focused contract guards, 629 Console tests, the production build, 16 App shared-contract assertions, and the rollback-only onboarding database contract pass. The local July hospital-array, organization-finance ACL, and Console operator-SELECT branches are absorbed or superseded by the consolidated App worktree and must not be merged separately. Persistent linked-project parity remains unclaimed until the App-owned source is committed, the still-new SQL is applied through the approved workflow, and role, organization, concurrency, ACL, and reflected-read behavior are verified. No persistent database mutation is authorized by this audit checkpoint.

This plan follows the Stage 2 contract exhibits, Stage 3 capability gaps, Stage 4 L5 ownership matrix, Stage 5 full service coverage audit, and the service taxonomy in `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`. Each pass must be narrowed into its own implementation checklist before code changes begin.

The pass order below is an implementation sequence, not the console feature taxonomy. A single pass can cover several feature lanes when they share source-of-truth risk. The feature taxonomy remains the coverage gate for ensuring no service or operational surface is skipped.

## Continuation Doctrine

This plan deliberately keeps the original pass order while raising the proof standard inside each pass. The order prevents scope sprawl; the end-to-end method prevents shallow implementation from missing field-shape, payload, RLS, receiver, realtime, and app-consequence defects.

Current checkpoint:

- Passes 1-8 now have pass-local subplans with end-to-end audit targets.
- Pass 1 already contains the deepest first-slice detail through its service-by-service audit, emergency detail projection target contract, modal raw-field closure matrix, and command/action target contract. Its format is different from the later `Pass E` headings, but it is not skipped.
- Passes 2-8 now include implementation sequence and blocker matrices that separate safe read/disabled-state cleanup from backend, RPC, Edge, realtime, export, email, and Storage work.
- Passes 6, 7 care/content/support, 7 subscriptions, and 8 now include exact code-exhibit sections for the drift points found in the latest sweep.
- The next audit frontier is not implementation. It is to use each pass-local exhibit table as the executable checklist for route-by-route confirmation, then mark each visible field/control as retained, disabled, moved to an owner, or blocked by receiver/RLS proof.
- No database mutation, reset, seed, cleanup, email send, storage upload, or Edge invocation is authorized during this audit checkpoint.

Current coverage by execution layer:

| Layer | Coverage status | Next audit action before implementation |
| --- | --- | --- |
| Database/RPC/RLS/Edge/Storage source truth | Stage 1, Stage 2, contract charts, live confirmation, trigger/policy/RPC matrices and Edge ownership proof cover the high-risk shared boundaries. | Keep using read-only proof only; do not run repair, reset, cleanup, seed, migration, email, Storage upload or mutating Edge calls during audit. |
| Service/query/RPC mapping | Stage 5 service coverage, service maps and pass subplans assign the main console service families to Passes 1-8. | For each active pass, re-run importer and direct-boundary scans before editing so late-added route/context consumers are not missed. |
| Hook/context/state ownership | Stage 4, Stage 5 and Stage 6 identify broad context ownership defects, especially `PageDataContext`, hidden shell hooks and duplicated realtime. | Implementation may move ownership only after the target pass has its read projection and unavailable-state contract closed. |
| Route/modal/panel/UI render | Pass 1 and Passes 6-8 contain exact code exhibits; Passes 2-5 contain first-slice field/payload targets and should receive exact route-line exhibits during their active pass checklist. | Work route by route and mark every field/control retained, disabled, moved to owner or blocked. |
| Button/form payload to receiver | Contract charts and pass subplans identify the high-risk receiver mismatches across emergency, wallet, facility, identity, provider ops, visits, care/content, subscribers and shell exports. | Before implementation, each visible command needs operation class, payload field list, receiver, authorization, pending/error behavior and reflected read. |
| App consequence | `ivisit-app` references are recorded where app-facing effects matter: emergency tracking/payment, pricing/quotes, availability, route/ETA, visits, chat, provider/facility truth and subscriber/public handoff. | Keep cross-checking `ivisit-app` during each pass; no console fix is complete if it changes app-visible lifecycle without an app consequence note. |
| Granular implementation planning | Pass 1 has first-slice contract detail; Passes 2-8 now have sequence/blocker matrices. | After route-by-route confirmation, convert each pass into a narrow implementation checklist. Detailed implementation starts only after that checklist is complete. |

Continue in this pattern:

1. Pick the next Stage 6 pass in order unless an urgent production defect explicitly interrupts it.
2. Read the pass subplan, service taxonomy rows, contract exhibits, and Stage 5 registers for that pass.
3. Close the proof chain for every in-scope service and surface: `source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence`.
4. Document exact code/SQL exhibits, importers, rendered fields, payload fields, disabled controls, missing receivers, app consequences, verification commands, and remaining blockers.
5. Implement only the first safe executable slice named by the pass after the end-to-end closure is complete.

Do not pause at pass-level inventory and call the service complete. Do not run a whole-repo service rewrite before Pass 1. The intended rhythm is pass-by-pass execution with service-level depth inside the active pass.

## Planning Rules

- Do not start implementation from a page symptom alone. Start from the source-of-truth owner named in Stage 4.
- Separate read-only owner cleanup from L5 backend contract repair.
- Do not bundle emergency/payment/backend repair with dashboard polish.
- Do not start a pass until its Stage 5 service coverage rows have been assigned to that pass or explicitly marked out of scope.
- Do not start a pass from inventory coverage alone. Stage 5 runtime-truth closure must trace every in-scope entity in both directions: all runtime consumers from the source and all mounted acquisitions/receivers from each affected route/action.
- Start every surface assessment from what it renders and what it allows each role to attempt: prove read/exposure authority before retaining fields, and prove receiver/CRUD/command authority before retaining controls.
- Do not treat the numbered passes as the complete feature list; check the feature taxonomy and service review matrix before each pass.
- Do not treat every visible table as CRUD. Before editing a surface, classify each operation as scoped read projection, policy-supported ordinary CRUD, workflow command, backend-derived read-only evidence, or excluded/separately owned.
- Treat emergency detail modal failures and subscription management failures as named user-flow threads, not isolated component bugs.
- Preserve user changes in the worktree and avoid doc-only micro-commits.
- Commit only when the relevant evidence or implementation pack is coherent and resumable.

## Global Runtime Truth Closure Gate

Service rows, table rows and the visible page component are not sufficient implementation evidence. Before a pass starts, Stage 5 must contain a claim-level runtime trace for the domain: route and globally mounted providers, background refresh/realtime paths, modals/context panels, lookup/dropdown/map/analytics/export paths, and all direct boundary calls.

| Pass | Runtime acquisition sweep that must be complete first | Failure that blocks implementation |
| ---: | --- | --- |
| 1 | Emergency requests, payment/cash state, app quote provenance, cash-approval notification delivery, triage/demo branch separation, responder/map detail, linked visits, global emergency summaries and realtime. | A detail/list/payment state can be obtained or refreshed outside the declared emergency read owner, or a mock/degraded quote, delivered notification, triage suggestion or demo writer is represented as confirmed production lifecycle truth. |
| 2 | Wallets, ledger, app wallet/tip settlement reflection, cash-approval notification provenance, Stripe reflection, payout/top-up dialogs, billing-method list/remove/primary selection, summaries, exports and maintenance paths. | Any money total/export/repair/action depends on a partial collection, mismatched billing scope, fabricated primary payout label or unnamed mutation boundary, or app settlement/delivery consequence is omitted or confused with completion. |
| 3 | Hospitals, capacity, provider taxonomy/media, discovery/import and pricing across route, global providers, map, modal lookups and app-facing quote dependencies. | Facility totals/capacity/pricing can be loaded through an unbounded or semantically different path: `HospitalsPage` passes nonexistent `pagination.pageSize`, making the first visible facility page unbounded, while PageData and Map shell acquisition add independent unbounded hospital reads. |
| 4 | Profiles/auth, organizations, verification, onboarding, route guards, selectors/lookups, panel report/export affordances, verification bulk actions and organization-linked wallet/facility scope. | A role/identity/readiness/report claim uses an untraced provider/context/modal path, mismatched authority or visible/bulk control without a receiver. |
| 5 | Ambulances, doctors, provider settings self-service edits, telemetry, scheduling, map layers, map context export/quick controls, driver command eligibility, vehicle-modal trip scope, dropdown dependencies and assignment/proximity calculations. | Fleet/provider availability or assignment uses capped, fabricated or independently loaded truth, provider self-edit exposes unproved operational status/fee authority, driver controls can select an unproved request, a vehicle modal can operate unrelated trips, or map exports/actions expose operational state without bounded authority and receivers. |
| 6 | Visits, medical-history projections, visit-tip/payment reflection, emergency handoffs and all patient/provider/hospital lookup hydration. | Clinical-history completeness or edit eligibility depends on an unbounded lookup, unowned linked-state fetch, or generic edit authority over app-settled tip/payment evidence. |
| 7 | Insurance, billing results, subscribers, email, support, FAQs, health news, disabled panel exports, dormant bulk import, route bulk deletions, notifications, uploads and shell-mounted care/subscriber hook consumers. | Management counts/actions or content availability mask partial, denied, failed or unproved storage/receiver paths, hidden global command controls acquire protected/unbounded data on unrelated routes, or unavailable export/import/deletion capability is treated as authorized. |
| 8 | Analytics, CSV/report export, overview/dashboard, search, trends, activity, notifications, preferences/settings actions, map shell, PWA/feedback/debug utilities, shared realtime and remaining provider state. | Aggregate/search/navigation/export truth can still be generated from mock, stale, partial, broad, unauthorized or unowned sources, an allowed provider dashboard still invokes admin-only subscriber truth, or visible shell/settings utilities render placeholder or unreviewed debug/accessibility behavior. |

## Global Surface Exposure And Operation Gate

Each pass must inventory the actual UI promise before implementing its owner cleanup: fields rendered, status/summary meaning, datasets exportable, controls exposed and role visibility. A correct service call is insufficient if the surface exposes data outside policy scope or advertises CRUD/commands whose receiver cannot authorize or persist the submitted fields.

| Required surface proof | Must identify | Implementation blocker |
| --- | --- | --- |
| Read/render exposure | Surface variant and role, displayed fields/KPIs/detail/export content, source and read/RLS/RPC authority, missing or excessive exposure. | An org admin can render patient/financial/clinical fields not proven visible, or a surface omits app-required truth while appearing authoritative. |
| Field meaning and completeness | Identity keys, status/amount/eligibility/provenance semantics, bounds/aggregate source, normalization and degraded states. | A UI label changes meaning from its source, renders capped data as total, or presents unavailable data as zero/complete. |
| Visible operation inventory | Every edit/delete/create/verify/approve/assign/import/export/email/payment/bulk/transition action visible to each role. | A control is left enabled because it exists in JSX without an audited operation class and receiver. |
| Mutation payload and authority | Submitted fields, table/RPC/Edge/Storage receiver, actor authorization, lifecycle legality, idempotency/audit requirements and reflected read. | A field is collected but discarded, a direct CRUD path violates RLS, or a workflow transition is treated as ordinary edit. |
| Export/generated artifact authority | Entry point, allowed fields/redaction, role and facility scope, time/filter/window/bounds, source/completeness labels and delivery receiver. | A report or downloaded file serializes raw, truncated, fallback, unauthorized or otherwise unqualified operational truth. |

## Global Receiver And Field Gate

The full source-row field register is maintained in `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`. The implementation sequence must consume it as follows:

Each flow subplan now carries a first-slice field-to-UI/payload-to-receiver closure table. Before implementation, use the pass-local closure as the executable checklist for rendered fields, submitted payloads, disabled controls, missing receivers, and app-facing consequences. Do not treat the broader Stage 6 table below as a substitute for that exact surface/control audit.

| Pass | Projection or payload that must be fixed first | Receiver boundary that cannot be guessed during coding | First executable implementation slice after gate clearance |
| ---: | --- | --- | --- |
| 1 | Emergency request detail with transitions, chat, clinician assignment, payment, app quote/notification/triage provenance and linked visit outcome | Emergency command RPCs, chat RPCs, assignment RPC, payment approval/decline, cash settlement authority, `calculate_emergency_cost_v2` and `notify_cash_approval_org_admins` consequence | Build one detail/read projection with timeline/chat/assignment capability states, quote/delivery provenance and backend-derived action eligibility before altering lifecycle actions. |
| 2 | Wallet/payment/ledger and billing-method view keyed by true platform/organization and wallet identity, including app wallet/tip settlement reflection | Stripe function authorization, method list/remove/select scope, webhook reflection, backend ledger writer, payout reservation, `process_wallet_payment`, `process_visit_tip`, `record_visit_cash_tip` and notification consequence | Remove automatic repair mutation and consolidate truthful read/pending/degraded/method-primary/settlement-reflection states before enabling repaired money commands. |
| 3 | Facility detail containing taxonomy, media, import provenance, availability and hospital-scoped price identity | Availability RPC, provider/media policy, discovery persistence guard and quote receiver | Centralize facility reads and present the missing classification/provenance fields before modifying capacity or import writes. |
| 4 | Auth/profile/org/hospital identity chain, two separate verification lanes, identity/report affordance status and verification bulk capability | Admin profile RPC supported columns, invite/auth receiver, guarded organization/onboarding/facility verification path, redacted report/export authority and bulk result/audit contract | Remove unsupported save/action/report and toast-only bulk promises before repairing creation, verification or reporting commands. |
| 5 | Fleet/doctor/schedule projection with valid joined identity, provider self-service field authority, positively authorized driver-request binding, vehicle-scoped active-trip rows and bounded map-operation export | Provider self-update and active-assignment effects, request-scoped telemetry/lifecycle commands, schedule table CRUD, clinician assignment command and map export/quick-action authority | Replace false fleet/schedule/map projections, constrain provider self-edit, remove arbitrary driver assignment fallback, constrain vehicle-modal trip controls, and disable raw map download/inert controls before enabling corrected edits. |
| 6 | Visit projection marked administrative versus emergency-derived with tip/payment evidence availability | Separate administrative authority, request/trigger-owned clinical lifecycle and app tip-settlement consequence | Centralize reads and disable destructive or financial edits for request-linked records before any CRUD extension. |
| 7 | Policy/billing/ticket/content/subscriber projection with policy and lifecycle classifications plus unavailable export/import/bulk-delete affordances | Insurance/support authorized receiver, billing read lane, Storage proof, subscriber/email lifecycle receiver and any future content export/import/destructive receiver | Ship read/disabled/degraded truth surfaces first; do not preserve unauthorized authoring or subscriber controls, and keep disabled exports/source-only bulk import/toast-only bulk deletion unavailable until receiver proof exists. |
| 8 | Dashboard/search/activity/notification values and report exports labelled by verified source or unavailable state | Role-scoped aggregates/exports, sequenced search projection, own-user notification/preference receiver, real trend generation and durable critical-audit writer | Remove fabricated/stub-success display/export truth, cross-role subscriber dependency and broad realtime ownership after preceding domain readers are stable. |

## Global Direct Boundary Gate

Stage 5 now maintains the direct boundary call-site register for UI, context, hook, utility and infrastructure files that access Supabase/Auth/Edge/Storage outside service owners. This register is part of implementation scope, not optional cleanup.

| Pass | Direct callers that must be reconciled in that pass | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | `EmergencyRequestsPage`, `EmergencyRequestModal`, `EmergencyDetailsModal`, `MobileMap`, `LocationCell`, emergency slices of `PageDataContext` | Emergency reads/payment projection/realtime move to the emergency owner; mobile map dispatch/completion and patient exposure consume the same legality/payment/cash action projection; profile selection, geocoded display and external Google Maps handoff use bounded authorized coordinate projections rather than modal/cell-owned truth. |
| 2 | `WalletManagementPage`, wallet slices of `PageDataContext` | Finance read projection moves behind one wallet facade; ledger/money commands stay receiver-backed. |
| 3 | `HospitalsPage`, `HospitalModal` | Facility realtime/read refresh and discovery Edge interaction are owned by the facility/discovery boundary, not page/modal request assumptions. |
| 4 | `UsersPage`, `UsersPanel`, `OrganizationsPage`, `VerificationQueue`, `SettingsPage`, `MobileUsers`, `MobileOrganizations`, `MobileVerification`, `MobileSettings`, `InviteUserModal`, `OrganizationDetailsStep`, `OnboardingContext`, `AuthContext`, `LoginPage`, `SetPasswordPage`, `SecurityModal`, `VerificationPanel`, `OrganizationsPanel`, `avatarUtils`, `SmartHeader`, `MobileNavMenu` | Identity KPI, auth-enriched recent-login detail, organization aggregates, responsive verification/actions, invite and destructive workflows route through named authority; existing-facility onboarding selection reaches a canonical non-duplicating claim/link receiver; canonical Auth SDK operations are reviewed and may remain only as supported auth adapters; avatar fallback cannot leak operator identity without explicit policy; mobile/desktop settings and identity report placeholders remain consistent or unavailable. |
| 5 | `AmbulancesPage`, `MobileAmbulances`, `AmbulanceModal`, `DoctorsPage`, `MobileDoctors`, `DoctorModal`, `DoctorProfileCard`, `useDoctorProfile`, `GodModeMap`, `MapContext`, `MarkerDetailPanel`, `MobileMap`, `MapPanel`, `ContextPanel`, `LeafletMapRenderer`, `MapErrorBoundary` | Fleet counts, responsive KPI meaning, assignment availability, provider self-service fields and facility options use provider/fleet owners with valid relationship scope; map has one authorized bounded feed/channel owner; desktop and mobile map emergency commands/patient exposure are deferred to Pass 1 legality; map/telemetry errors use redacted feedback; driver actions require positive responder/request assignment; vehicle modals cannot command hospital-wide trips; raw map operational export is disabled until bounded/redacted; inert selected-marker controls are removed or implemented; third-party tiles have a deliberate degradation contract independent of telemetry truth. |
| 6 | `VisitsPage` | Visit count/hydration/realtime moves to the visit model; emergency-linked records do not inherit page-owned edit/delete authority. |
| 7 | `HealthNewsManagementPage`, `HealthNewsModal`, `HealthNewsPanel`, `SupportTicketsPanel`, `InsurancePanel`, `BulkImportModal`, `ContextAwareFAB`, `DynamicBottomBar`, `emails/ivisit106Campaign.js`, generated subscriber-email templates, `utils/runMigrations.js`, `utils/testDatabase.js` | Content/support/insurance/subscriber reads reuse scoped owners; published health-news source URLs use a validated provenance-bearing safe external-navigation contract shared with the patient app; disabled care/content exports and source-only health-news import remain unavailable until scoped receivers exist; global action controls do not mount protected list hooks until an authorized action surface needs them; email unsubscribe links route through one proven lifecycle receiver; browser-side SQL repair and diagnostics cannot serve product behavior. |
| 8 | `Analytics`, `MobileAnalytics`, `AnalyticsPanel`, `Overview`, `useAnalytics`, remaining `PageDataContext`, `BentoHome`, `DashboardPanel`, `HospitalFleetManager`, `ContextPanel`, `ContextAwareFAB`, `DynamicBottomBar`, `QuickSearch`, `NotificationCenter`, `SettingsPage`, `MobileSettings`, `PWAProvider`, `FeedbackProvider`, `serviceWorkerRegistration.js`, `lib/supabase.js` | Dashboard aggregation/realtime and exported reports consume stabilized, role-scoped domain truth; exports cannot serialize fallback or admin-only slices for broader roles; search fields/failures are role-scoped and visible; notification/settings/plan receivers, active PWA lifecycle, public asset delivery, dormant mock/maintenance actions and generic subscriptions are deliberately owned, disabled or retired. |

## Global Route And Surface Gate

Stage 5 now also maintains the visible route, context-panel, primary-action and modal-receiver register. The active route guard is `App.js` plus `ProtectedRoute`; the unconsumed `RouteGuard` / `config/routes.jsx` pair is conflicting dormant configuration until explicitly consolidated.

| Pass | Visible surfaces requiring reconciliation | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | Emergency detail clinical-record action, emergency-route detail modal ownership and `/map` mobile emergency command sheet | Selecting a linked clinical record from `/emergencies` opens a mounted, identity-correct surface or navigates deliberately; it cannot dispatch to an absent `VisitsPage` listener. Mobile map dispatch/completion cannot bypass actor exposure, payment/cash or lifecycle eligibility. |
| 2 | `/pricing` shared primary action, `/wallet` payment-method controls, wallet generic analytics view and global financial modal invocation | A pricing surface cannot silently open wallet top-up; financial commands appear only in their intentional scoped flow with truthful pending/reflection state; list/remove/select card actions use one proved platform/organization scope; no card is labelled primary without receiver-backed truth; capped finance previews cannot become generic analytics totals. |
| 3 | `/hospitals` role doctrine and `/pricing` operation meaning, report and Bulk Sync controls | Facility and rate operations have consistent allowed roles and distinct mounted/authorized command surfaces before facility/pricing cleanup closes. |
| 4 | Auth/onboarding paths, `/organizations`, `/users`, `/verification`, their mobile variants, Quick Verify, verification bulk actions, identity/verification report affordances and own-user/mobile versus admin settings context | Route, navigation, responsive variants and context-panel roles use one explicit authority model; mobile organization metrics and verification actions consume the same scoped authority as desktop; Quick Verify reaches a real queue state; report/export placeholders and toast-only bulk verification remain unavailable without scoped receivers; dormant config is reconciled or retired. |
| 5 | `/settings` provider professional card, `/map` access promise and responsive variants, driver request binding, Center Map, targeted recenter controls, map JSON export, selected-marker quick controls and ambulance-modal active trips | Provider self-service fields have a named narrow command/impact contract; live map is visible only to the operational role permitted by its real route and telemetry scope; mobile emergency lifecycle actions consume Pass 1 command legality; driver/vehicle controls operate only positively linked requests or remain unavailable; each map control calls a mounted receiver or is unavailable; raw emergency/marker/settings export is disabled until explicitly bounded and redacted. |
| 6 | Visit-projection ownership used by cross-surface handoffs | Preserve the mounted visit-to-emergency receiver and supply a canonical request-derived visit projection for Pass 1's missing emergency-to-visit direction; request-derived records remain read-only where commanded upstream. |
| 7 | `/health-news`, its source-link handoff, `/insurance`, `/support-tickets`, `/subscriptions`, care/content panel exports, dormant bulk import, route bulk deletions and subscription Broadcast action | Advertised role access matches authorized receivers; published external links are validated and opened safely; unimplemented content/insurance/email/export/import/destructive actions are disabled, excluded or removed rather than clickable false-success operations. |
| 8 | Dashboard route doctrine, mobile patient-care entry ownership, shared `AnalyticsModal` semantics, Analytics CSV/report export, Report receiver, context-shell access, settings Billing/plan/Upgrade actions, dormant mock fleet dashboard, visible realtime/alert controls, notification settings and route/action loading feedback | The consolidated shell uses one route authority; mobile patient-care controls deliberately hand off to canonical patient ownership or are unavailable; reusable analytics views render domain-owned scoped/windowed projections without fabricated defaults; reports/exports and settings actions reach mounted, role-scoped truthful receivers or remain unavailable; static viewport-specific plan claims and dormant mock operational components do not count as capability; visible configuration has a receiver or is removed; own-user notification setting agrees with notification behavior; all actions acknowledge allowed, pending, unavailable and rejected states. |

## Global Pagination And Fetch Reliability Gate

Stage 5 maintains the route-list reliability register for the `13` paginated Console page surfaces found in source. A pagination control is not acceptance evidence unless its owner provides correct authorized dataset windows, counts, failure states and invalidation behavior.

| Pass | List/fetch surfaces requiring reconciliation | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | Emergency request list/count/payment enrichment | Keep the currently paged experience, but move paging, filter parity, current-page enrichment and invalidation behind one emergency read owner with explicit partial/failure states. |
| 2 | Wallet ledger/payment recent history and export | Name the `50`-row window as recent history or implement authoritative paged/export retrieval; no truncated preview can be presented as a complete ledger export. |
| 3 | Hospitals and pricing | First repair the disproved hospital page contract: `pagination.pageSize` is absent and currently leaves the first visible list unbounded. Then remove global unbounded hospital KPI/map bootstrap reads, replace collection-derived totals/capacity with scoped aggregates, make filters/sorts authoritative and replace all-hospitals/all-pricing client slicing with scoped server-paged price projection. |
| 4 | Users, organizations and two verification queues | Eliminate `1000`-row user truncation and unbounded organization/wallet loading; preserve queue paging while scoping realtime refetch to the active owned queue. |
| 5 | Ambulances, doctors and map operational feeds | Eliminate `1000`-row capped client pagination and derived incomplete totals; fleet/provider lists need server-backed paging truth, while map feed bounds and omitted-data state are explicit. |
| 6 | Visits | Move page-local paged query, enrichment and explicitly missing search into one visit read model with authoritative page/count/search and degraded relationship state. |
| 7 | Health news, insurance, subscribers and support tickets | Decouple content list availability from summary KPI failure; replace full-list/client slices and unpaged realtime refetch with scoped paged reads; distinguish unauthorized, empty and failed results. |
| 8 | Dashboard/analytics/search/map/notification consumers and shared fetch utilities | Define aggregate/feed limits and role-scoped aggregate slices, QuickSearch field exposure/cancellation/stale-response/partial-category behavior, and shell error/degraded rendering after domain list owners stabilize. |

## Global Browser Console Disclosure Gate

Protected rows and command results are exposed data even when they appear only in browser diagnostics. Each owning pass must remove or explicitly redact/development-gate the data-bearing logs proven in Stage 5.

| Pass | Live console disclosure to remove or constrain | Completion evidence |
| ---: | --- | --- |
| 1 / 2 | Cash approval/decline RPC parameters and result data from `emergencyService`; clinical visit result logged from emergency table navigation. | Cash and clinical browser smoke yields no patient/payment payload logs; backend audit/refreshed projections remain the only evidence path. |
| 4 | Auth bootstrap email/profile messages, selected user object, desktop settings resolved avatar URL, live protected-route role/path/resource denial logs, raw `SecurityModal` password-update Auth errors and onboarding facility/Auth/Storage/provisioning failures emitted by identity surfaces. | Auth/user/settings/onboarding/unauthorized smoke yields no identity-, entitlement-, credential-, provisioning-, storage-error- or identity-media-bearing console payloads. |
| 5 | Active `MapErrorBoundary` and driver map failure handlers log raw rendering or telemetry errors from the operational map. | Map degradation and driver-action smoke keeps useful visible failure state while emitting no patient/location/telemetry/provider-error payload through browser console diagnostics. |
| 6 | `VisitModal` selected visit and submitted clinical payload logs. | Visit view/edit/handoff smoke yields no clinical payload logs. |
| 7 / 8 | Insurance and support realtime payload logs from route and hidden shell-mounted hooks. | Care route and shell smoke yields no protected realtime payload logs and hidden acquisitions are removed. |
| 1-8 / 8 mechanism | Shared `utils/errorHandler.js` logs raw error objects and surfaces raw error messages in toasts for mounted page/modal operations across the domain passes. | Each pass failure smoke uses operator-safe messages and approved redacted diagnostics; no backend/Auth/Edge/Storage policy, identifier or receiver detail leaks through shared console or toast behavior. |
| 8 | Production `ErrorBoundary` writes stack, component stack and full route URL to the browser console under a monitoring label; notification read failures write user UUID plus raw backend error details; Pass 4 supplies mounted auth denial/password error paths to this global gate. | Failure, notification-degradation and auth-denial smoke uses approved redacted diagnostics, displays failed versus empty/denied state accurately and exposes no route/query/object/user identity, entitlement, Auth receiver error or stack payload in the browser console. |

## Global Responsive Aggregate Truth Gate

Mobile layouts are full operational consumers. Each pass must remove or replace any responsive `LIVE`, trend, total, ratio, response-time, availability, capacity, revenue or performance claim produced by reducing a received page/capped collection or by falling back from missing authoritative statistics.

| Pass | Responsive risk to close | Completion evidence |
| ---: | --- | --- |
| 1 | `MobileEmergency` locally derives service/status totals and response success and can render fixed/live response copy. | Mobile emergency receives the same scoped summary and lifecycle truth contract as route/detail surfaces, including measurement and unavailable states. |
| 2 | `MobileWallet` summarizes capped payment/ledger previews as operational financial state. | Mobile wallet separates preview history from authorized aggregate/balance/ledger evidence. |
| 3 | `MobileHospitals` and `MobilePricing` reduce supplied rows into capacity/fleet and price-scope/trend claims. | Responsive facility/pricing metrics declare scope, aggregate basis and quote/currency meaning or remain unavailable. |
| 4 | `MobileUsers`, `MobileOrganizations` and `MobileVerification` convert loaded rows to identity/network/trust metrics. | Responsive identity and verification metrics consume bounded authorized aggregate projections and the same command capability as desktop. |
| 5 | `MobileAmbulances` and `MobileDoctors` publish loaded-row fleet/provider availability and rating trend claims. | Responsive provider operations consume scoped aggregate projections and do not imply assignment/readiness from page rows. |
| 6 | `MobileVisits` uses loaded page results for visit metrics/search. | Responsive visit history uses the canonical paged/search/count projection and request-derived identity. |
| 7 | Care/content/subscription mobile surfaces reduce protected or paged rows into coverage, queue, publication and revenue performance. | Mobile projections use role-scoped measured aggregates or explicitly display unavailable/current-window state. |
| 8 | Dashboard/analytics responsive composition republishes degraded domain state or inert patient actions. | Shared composition preserves source status and action ownership after Pass 1-7 projections stabilize. |

## Pass Order

| Order | Pass | Primary reason | Earliest safe work | Requires backend/RPC/Edge repair before UI truth |
| ---: | --- | --- | --- | --- |
| 1 | Emergency lifecycle, communication, clinical handoff, and cash/payment truth | User safety, dispatch legality, communication, clinician handoff, and money movement meet in this path. | Centralize emergency reads/list/count/search; add scoped transition/chat/clinician-assignment projections; add safer pending/feedback states; stop page-level generic payment refetch. | Fallback emergency create parity, cash settlement, completion legality, tracking-ready route/ETA truth, emergency chat and clinician-assignment authority. |
| 2 | Wallet, payout, Stripe functions, and ledger authority | Money movement and ledger correctness must not depend on UI repair/backfill paths. | Create wallet read facade; remove duplicate context/page/service reads; isolate maintenance actions. | Edge Function authorization, wallet reservation/sufficiency, ledger RLS/mutation policy, webhook reflection. |
| 3 | Hospitals, provider catalog/media, availability, discovery, and pricing scope | Dispatch and app checkout depend on facility, catalog, media and pricing truth. | Centralize hospital/pricing reads; surface import/media provenance; mark discovery fallback read-only; expose hospital-scoped pricing honestly. | Availability receiver, provider/media authority, dispatch eligibility, public discovery writes, multi-hospital org pricing semantics. |
| 4 | Identity, verification, and onboarding authority | Access, ownership, and dispatch certification are long-lived defects. | Move admin metrics/destructive RPCs behind services; document direct Auth/MFA exceptions; connect demo preference if retained. | Auth-backed profile creation, facility dispatch verification, onboarding hospital/org identity repair. |
| 5 | Provider operations, ambulance telemetry, doctors, and scheduling | Dispatch operations need accurate responder and clinician state. | Move counts/lookups/modal reads to services; split map telemetry projection from CRUD; consolidate schedule read model. | Active-request-coupled telemetry, driver/profile assignment mirror, doctor/profile automation, `doctor_schedules` ownership. |
| 6 | Visits ownership and request-derived history | Patient history should follow emergency truth. | Create visits read model; centralize count/search/hydration; guard request-derived rows. | Canonical repair/creation strategy for fallback emergency rows and request-derived visit lifecycle. |
| 7 | Content, support, insurance billing, subscribers, and email | Patient/admin communication and billing-support surfaces need clear lifecycle and RLS. | Consolidate health-news KPIs, support hook reuse, insurance/subscriber services, scoped billing-result reads, degraded flags. | Insurance policy/billing authority, subscriber lifecycle owner, schema-current writes, welcome/unsubscribe/campaign state, support/content policies. |
| 8 | Analytics, search, dashboard shell, realtime, and feedback polish | Dashboards should summarize fixed truth, not duplicate drift. | Remove production mock defaults, move analytics derivations to services, replace blank route fallback, dedupe realtime. | Stub trend regeneration, fallback analytics truth, audit failure policy. |

## Pass 1 - Emergency Lifecycle And Cash/Payment Truth

### Inputs

- Stage 2 emergency/payment/capacity map.
- Emergency/payment/capacity contract chart.
- Ownership trigger proof for emergency-to-visit creation.
- Read-only live confirmation matrix.
- Stage 3 page/realtime/feedback findings.
- Stage 4 emergency, cash/payment, visits, wallet, and map rows.
- Stage 5 emergency detail modal and request-derived visit failure thread.

### Primary Files To Inspect Before Editing

Console UI and hooks:

- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/modals/EmergencyRequestModal.jsx`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/ui/LocationCell.jsx`
- `frontend/src/components/mobile/MobileEmergency.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/contexts/PageDataContext.jsx`

Console services:

- `frontend/src/services/emergencyService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/walletService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/visitsService.js`

Receivers and app reference:

- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `frontend/supabase/migrations/20260219000400_finance.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/emergencyRequestsService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/paymentService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Emergency read owner | Read-only owner cleanup | Move request list/count/search and summary reads out of page/context direct Supabase paths. | Page renders from emergency domain owner; no direct page count read for request totals. |
| Dispatch candidate selection contract | Workflow-command reliability repair | Move first-row unbounded ambulance/hospital/doctor selection behind a command-owned readiness projection with Pass 3/5 inputs. | Dispatch cannot call a candidate nearest/optimal/ready or claim assignment outcome until bounded selection basis and refreshed resource state are proved. |
| Emergency audit and communication projection | Missing surface/read owner | Add scoped status-transition timeline and chat room/message/read-state projection for operated requests. | Operator can see app-shared urgent communication/history without mutating append-only transition evidence directly. |
| Clinician assignment owner | Missing L5 capability | Add guarded `emergency_doctor_assignments`/assignment RPC projection and command contract. | Assigned clinician state is persisted and visible rather than inferred from a suggested doctor object. |
| Payment-aware invalidation | Read-only owner cleanup | Replace generic page-owned `payments` refetch with emergency/payment domain invalidation. | Payment event handling is documented at the owner boundary. |
| Action feedback guard | UI feedback | Add pending/disabled guards and backend-truth success copy for dispatch, complete, cash, and retry. | No success copy claims dispatch/completion/cash settlement before backend confirmation. |
| Mobile map lifecycle parity | Exposure/command repair | Route mobile selected-marker patient/contact rendering and direct dispatch/completion through the Pass 1 projection/facade. | Ambulance-id presence does not authorize completion; no mobile path bypasses payment/cash or actor exposure rules. |
| External location handoff | Exposure/reliability cleanup | Normalize coordinate display and Google Maps navigation through the authorized emergency projection. | Reverse-geocoded display and external navigation never disclose malformed/unapproved coordinates or imply tracking completion. |
| Emergency activity exposure | Audit/read-projection cleanup | Minimize address-bearing emergency activity descriptions/metadata before they enter the shared dashboard recent feed. | Audit evidence remains useful without broadly rendering pickup/destination context to dashboard readers. |
| Fallback create contract | L5 repair | Align or retire `console_create_emergency_request` fallback relative to `create_emergency_v4`. | Fallback path either creates required linked truth or is not available for app-parity emergency creation. |
| Cash completion contract | L5 repair | Fix cash eligibility, processing order, settlement receiver, ledger/audit reflection. | Completing a cash emergency cannot show fee deducted unless ledger/payment truth confirms it. |
| Patient-origin receiver provenance | Shared receiver/read-projection repair | Classify `calculate_emergency_cost_v2`, `notify_cash_approval_org_admins`, `triage-copilot`, `demo-approve-cash-payment` and `demo-dispatch-reply` in the emergency projection. | Canonical versus degraded quote and delivered-notification state are explicit; triage is persisted-context only; demo writers do not count as production success. |

### Detailed Checklist

#### 1A. Read Owner Cleanup

- Identify every emergency list/count/read path in `EmergencyRequestsPage`, `PageDataContext`, mobile emergency views, and map consumers.
- Create or refine one emergency read owner that returns:
  - paginated/list records
  - counts/KPIs
  - active dispatchable rows
  - payment retry eligibility projection
  - cash completion eligibility projection
  - stale/degraded flags when backend truth is incomplete
- Move page-level direct count reads into that owner.
- Keep `EmergencyDetailsModal` scoped realtime only for an open request detail, not as list owner.
- Replace modal/list/table direct visit lookups with the chosen emergency detail projection or request-derived visit owner.
- Remove global emergency realtime ownership from `PageDataContext` only after page/domain reads are stable.

#### 1B. Create Contract Resolution

- Patient-equivalent emergency creation from Console uses `create_emergency_v4`, because it is the receiver that establishes app-visible lifecycle, visit/payment, and transition truth.
- Keep `console_create_emergency_request` unavailable as a general create control until it either establishes the same linked contract or is exposed only as a separately labelled administrative record mode with no patient-lifecycle claim.
- For the patient-equivalent create surface, ensure UI fields that remain visible are actually sent and persisted:
  - `bed_number`
  - payment method/payment context
  - total amount/currency if supported
  - status only if the receiver intentionally accepts it
- Before any separate administrative create mode is exposed, document or repair:
  - visit linkage
  - payment creation
  - transition legality
  - app visibility expectations

#### 1C. Dispatch And Tracking Guard

- Keep `console_dispatch_emergency` as the status-changing receiver for operator dispatch.
- Replace `emergencyResponseService` first-row candidate selection with a declared selection contract consuming bounded responder, facility capacity/eligibility and clinician-readiness projections; the current unused patient-location argument cannot stand in for proximity.
- Ensure dispatch UI derives eligibility from backend/current row state, not stale page state.
- Do not show route/tracking-ready states unless request identity, hospital/service context, route or ETA seed, pickup/patient context, and responder identity or hydrating state are available.
- Treat fallback ETA/route as degraded and visible, not confident arrival truth.
- Require `MobileMap` selected-emergency actions to consume the shared emergency `actionState`; do not branch completion authority solely on `ambulance_id`.

#### 1D. Cash Flow Repair

- Fix pre-dispatch cash eligibility to read the JSON result's `eligible` field and estimated-fee coverage.
- Stop using hospital UUID as organization fallback for cash eligibility or processing.
- Repair processing order so payment/fee settlement happens while the request is in a state accepted by the receiver, or move completion and settlement into one atomic backend path.
- Do not show "fee deducted" unless ledger/payment truth confirms it.
- If historical repair is needed, create a separate maintenance plan with read-only scope evidence first.
- Treat `calculate_emergency_cost_v2` quote state and `notify_cash_approval_org_admins` delivery state as app-origin dependencies: neither authorizes dispatch release or proves settlement.
- Keep `triage-copilot` out of Console command behavior and exclude demo approval/chat writers from production emergency evidence.

#### 1E. Feedback And Duplicate Action Guards

- Add row/request-level pending state for dispatch, complete, cash process, retry payment, and cancel.
- Disable repeat clicks for the same request while a command is pending.
- Use success copy that names backend-confirmed state only:
  - "Dispatch accepted" only after dispatch RPC returns success and refreshed row agrees.
  - "Cash recorded" only after payment/ledger receiver confirms required effects.
  - "Retry prepared" only after retry receiver returns a patient-completable payment path.

### Pass 1 Verification

- Static checks:
  - `git diff --check`
  - mojibake scan for touched text files
- Frontend checks:
  - targeted lint/test command if available for emergency services/pages
  - browser smoke on `/emergencies` for list, modal, dispatch pending state, cash pending state, retry pending state
- Backend contract checks before L5 repair merge:
  - targeted RPC tests for create, dispatch, complete, cash eligibility, and cash settlement
  - read-only before/after evidence plan for any historical repair
  - no cleanup/backfill execution without explicit authorization

### Do Not Start Here

- Do not change map visuals before route/ETA truth is mapped.
- Do not backfill or repair historical emergency/payment rows from this pass plan alone.
- Do not make dashboard KPI changes before emergency owner reads are stable.

## Pass 2 - Wallet, Payout, Stripe Functions, And Ledger Authority

### Primary Files To Inspect Before Editing

Console UI:

- `frontend/src/components/pages/WalletManagementPage.jsx`
- `frontend/src/components/modals/GlobalFinancialModals.jsx`
- `frontend/src/components/context/WalletPanel.jsx`
- `frontend/src/components/mobile/MobileWallet.jsx`
- `frontend/src/contexts/PageDataContext.jsx`

Console services and receivers:

- `frontend/src/services/walletService.js`
- `frontend/src/services/activityService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/supabase/migrations/20260219000400_finance.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payment-intent/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payout/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/paymentService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/notificationDispatcher.js`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Wallet read facade | Read-only owner cleanup | One service/query owner for wallet, ledger, payments, projection, Stripe status, cards. | `PageDataContext` and wallet page do not duplicate wallet/ledger/payment reads. |
| Maintenance isolation | UI/service cleanup | Move repair/backfill actions behind explicit maintenance guard or remove from ordinary UI. | Ordinary wallet refresh cannot mutate ledger/payment data. |
| Edge Function authority | L5 repair | Confirm and enforce `create-payment-intent`, `create-payout`, `manage-payment-methods`, `stripe-webhook` ownership/auth. | Organization-sensitive function calls prove actor authority before service-role operations. |
| Billing-method scope and designation | UI/service contract repair | Reconcile platform/org method list, removal and payout-selection state in page/global modal surfaces. | No method deletion uses a different scope from the rendered list and no `Primary` badge renders without reflected selection truth. |
| Wallet analytics projection | UI/read projection repair | Replace generic modal values derived from capped wallet route arrays with labelled finance projection data or unavailable state. | Opening wallet analytics cannot present a recent bounded preview as complete financial analytics. |
| Ledger/RLS policy | L5 repair | Align org-admin/platform-admin ledger read/write semantics. | UI wallet visibility matches deployed RLS and no unauthorized mutation is implied. |
| App settlement and delivery reflection | Cross-surface read projection | Reflect `process_wallet_payment`, `process_visit_tip`, `record_visit_cash_tip` and `notify_cash_approval_org_admins` consequences where authorized; isolate `demo-approve-cash-payment`. | Wallet/visit history can distinguish settlement evidence from notification delivery and demo behavior without inventing Console mutation authority. |

### Detailed Checklist

#### 2A. Wallet Read Facade

- Move wallet summary reads out of `PageDataContext` and `WalletManagementPage` into one wallet owner.
- The facade should expose:
  - current actor role/scope
  - platform wallet or organization wallet
  - ledger rows if authorized
  - payment history with patient/profile enrichment
  - Stripe account/customer status
  - saved payment methods
  - projection/analytics values
  - degraded/unauthorized flags
- Ensure org-admin wallet UI can render a neutral empty/unauthorized state instead of noisy console errors when RLS denies ledger.
- Include authorized reflected app settlement/tip state in the finance projection when it affects displayed wallet, payment or linked-visit truth; absence is an explicit unavailable state, not zero activity.

#### 2B. Top-Up Confirmation Contract

- Ensure top-up request sends the discriminator expected by the runtime function, not only nested metadata.
- Do not show top-up success after PaymentIntent creation alone.
- UI must wait for one of:
  - Stripe confirmation path completed and backend/webhook reflected wallet state
  - explicit pending state that says confirmation is still required
- Record and display a pending/degraded state when webhook reflection has not arrived.

#### 2C. Payout Reservation Contract

- Before external payout creation, require backend proof that wallet funds are reserved or atomically sufficient.
- Prevent repeated payout clicks from racing stale displayed balances.
- Ensure failed payout reconciliation is visible and does not leave internal/external state ambiguous.

#### 2D. Card And Payout Method Authority

- Confirm actor membership/admin authority before organization card or payout-method operations.
- Confirm the live receiver columns for Stripe customer/account/payout fields.
- If fields are on `profiles` rather than `organizations`, UI must reflect that actual ownership.
- Preserve one explicit finance scope across list, remove and set-payout-method commands: platform-admin card listing currently uses `null` while deletion submits `profile.organization_id`.
- Remove the unconditional `Primary` presentation from the billing modal unless a receiver-backed field identifies the actual selected payout/default method; the imported selection command alone is not rendered truth.
- Make wallet analytics consume the same scoped/window-labelled finance projection as the route, or disable the action until that projection exists; `AnalyticsModal type="generic"` cannot upgrade capped preview data into financial evidence.

#### 2E. Maintenance Isolation

- Remove automatic ledger backfill from ordinary wallet page mount.
- If retained, move repair to an admin-only maintenance command with:
  - explicit confirmation
  - dry-run/preview
  - audit log requirement
  - no execution in normal page refresh

#### 2F. App Settlement And Notification Reflection

- Classify `process_wallet_payment`, `process_visit_tip`, and `record_visit_cash_tip` as patient-origin settlement writers whose reflected rows may appear in Console finance/history reads.
- Keep `notify_cash_approval_org_admins` delivery/reflection separate from approval, settlement, ledger distribution and emergency release truth.
- Keep `demo-approve-cash-payment` out of production wallet reporting and action acceptance; any deliberate demo state must be isolated and labelled.

### Pass 2 Verification

- Wallet service unit tests or targeted service smoke.
- Browser smoke on `/wallet` for platform admin and org-admin if test accounts are available.
- Edge Function contract tests for top-up, payout, manage methods.
- RLS/policy tests for org-admin ledger visibility and mutation.
- Webhook reflection test or documented staging verification for wallet balance/ledger update.

## Pass 3 - Hospitals, Availability, Discovery, And Pricing Scope

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/modals/HospitalModal.jsx`
- `frontend/src/components/pages/PricingManagementPage.jsx`
- `frontend/src/components/views/PricingTableView.jsx`
- `frontend/src/components/mobile/MobilePricing.jsx`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/hospitalImportService.js`
- `frontend/src/services/pricingService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/hooks/useHospitals.js`
- `frontend/supabase/migrations/20260219000200_org_structure.sql`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/pricingService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/realtimeAvailabilityService.js`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Hospital/pricing read owners | Read-only owner cleanup | Centralize hospital, capacity, pricing, and KPI reads. | Page/modal/context direct reads no longer own facility truth. |
| Hospital page-window repair | Read-only reliability prerequisite | Replace the proved `pagination.pageSize`/`itemsPerPage` contract mismatch and unify desktop/mobile refresh, buffer and load-more state with the bounded facility query. | First-page hospital list cannot return an unbounded authorized collection; counts, filters, sort and `hasMore` come from the same source. |
| Facility view-mode capability parity | Exposure/command cleanup | Project facility row capabilities once before grid, list, table, mobile and panel composition. | Switching display mode cannot broaden facility edit/delete/schedule authority or expose commands absent from the actor's receiver scope. |
| Scoped pricing UX | UI/service cleanup | Make hospital-scoped versus organization-scoped pricing explicit. | Multi-hospital orgs cannot silently write only earliest-hospital pricing. |
| Availability writer resolution | L5 repair | Route operational capacity/status/wait changes through `update_hospital_availability`; keep metadata edits separate. | Console capacity edits persist all app-visible fields intentionally. |
| Discovery authority | L5 repair | Restrict/authorize provider persistence and align modal request/response contract. | Discovery cannot write canonical provider rows without operator authority. |
| Provider catalog and media provenance | Missing capability/L5 repair | Add authorized `providers` classification and `hospital_media` provenance handling to facility operations. | Console can operate app-visible provider eligibility and media source truth, not only the base hospital row. |
| Import provenance visibility | Read owner repair | Surface `hospital_import_logs` state and failures for import actions. | Imported/pending/failed provider writes have durable operator-visible provenance. |

### Detailed Checklist

#### 3A. Facility Read Model

- Centralize hospital list/detail/count and recent facility summaries.
- Treat the current `/hospitals` pagination defect as a first-slice blocker: `usePagination(20)` returns `itemsPerPage`, while the page supplies undefined `pageSize` to a service that applies no first-page limit in that case.
- Eliminate the three-read route condition before accepting facility summary truth: the page list query, authenticated `PageDataContext.fetchHospitalsData()` and pre-authorization `MapProvider` hospital bootstrap must each be replaced, removed or deliberately bounded/scoped.
- Route `MobileHospitals` refresh, retained-loading rows and load-more affordance through the same bounded query/result status; buffered rows may not be labelled live or complete while a replacement page is pending or failed.
- Include explicit fields for:
  - scalar bed counts
  - `bed_availability`
  - ER wait/wait time
  - dispatch eligibility
  - emergency eligibility
  - verification status
  - provider taxonomy/category fields
  - discovery source/attribution fields
- Show degraded state when app-visible fields are absent or known stale.

#### 3B. Availability Writer Resolution

- Split administrative facility metadata edits from operational availability edits.
- Route visible operational capacity/status/wait controls through `update_hospital_availability`, the receiver already consumed by app realtime availability and capable of persisting ER wait with the availability snapshot.
- Keep `update_hospital_by_admin` for non-operational facility metadata only unless its receiver is deliberately expanded and proven equivalent for availability fields.
- Ensure visible ER wait input persists to the same field app availability consumes.
- Preserve `normalize_hospital_bed_state` behavior while confirming deployed trigger behavior.
- Do not use partial direct status/bed writers from hooks for visible operational controls unless they are intentionally scoped and documented.
- Fix the proved reservation-control receiver mismatch only inside the guarded request lifecycle work: `HospitalModal` calls nonexistent `cancelReservation(...)`, while the service exposes `cancelBedReservation(...)`; cancellation must remain unavailable until actor exposure and capacity reflection are also proved.

#### 3C. Discovery Authority And Attribution

- Require operator authority for any provider/hospital persistence.
- If discovery falls back to existing DB/RPC reads, label result as read-only/no-import.
- Align hospital modal request keys with the actual Edge Function response.
- Preserve Google attribution and request flags when provider discovery uses Google data.

#### 3D. Pricing Scope

- Stop labelling hospital-scoped rows as organization overrides unless propagation exists.
- Add explicit hospital selector or hospital identity display for every pricing rule.
- For org-wide pricing UX, implement deliberate propagation and conflict handling across sibling hospitals.
- Do not store/display `unit` or per-rule `currency` unless the receiver supports it.
- Keep patient quote resolution aligned with selected hospital.

### Pass 3 Verification

- Pricing service tests for single-hospital and multi-hospital orgs.
- Browser smoke on `/hospitals` and `/pricing`, including mobile pricing if touched.
- Network/read-owner proof on `/hospitals` that the first visible page is bounded, filters/sort/count share the same query contract, and mobile load-more never repeats the unbounded acquisition.
- Shell-mount proof that public/login/onboarding routes do not acquire hospital map state and that an authorized hospital route does not duplicate facility reads through bootstrap context ownership.
- Read-only SQL proof for trigger/policy assumptions before L5 availability/discovery repair.
- App quote comparison for selected hospital pricing after implementation.

## Pass 4 - Identity, Verification, And Onboarding Authority

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/UsersPage.jsx`
- `frontend/src/components/pages/OrganizationsPage.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/modals/UserModal.jsx`
- `frontend/src/components/modals/InviteUserModal.jsx`
- `frontend/src/components/modals/SecurityModal.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/mobile/MobileUsers.jsx`
- `frontend/src/components/mobile/MobileOrganizations.jsx`
- `frontend/src/components/mobile/MobileVerification.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`
- `frontend/src/components/modals/VerificationModal.jsx`
- `frontend/src/components/navigation/SmartHeader.jsx`
- `frontend/src/components/navigation/MobileNavMenu.jsx`
- `frontend/src/lib/avatarUtils.js`
- `frontend/src/components/onboarding/OnboardingWizard.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/components/onboarding/VerificationStep.jsx`
- `frontend/src/contexts/OnboardingContext.jsx`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/verificationService.js`
- `frontend/src/services/orgVerificationService.js`
- `frontend/src/services/onboardingService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/rbacPatterns.js`
- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000200_org_structure.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Admin/profile service boundary | Read-only/service cleanup | Move admin metrics, deletes, role/status mutations behind services/RPCs. | Pages no longer own destructive admin RPC calls directly. |
| Live versus dormant admin capability | Scope/capability cleanup | Repair mounted invite/direct page workflows while keeping unmounted `useAdmin` audit/export/destructive APIs outside current capability claims. | Source-present helper APIs are not implemented as product work without a mounted authorized surface. |
| Auth-backed user creation | L5 repair | Replace raw `profiles.insert` creation with invite/auth-backed identity. | Console-created users have auth identity or are explicitly invite-pending records. |
| Verification lane split | L5 repair | Separate profile/BVN verification from facility dispatch certification. | UI copy/action cannot imply dispatch eligibility from the wrong receiver. |
| Responsive identity/verification parity | UI/command authority cleanup | Align mobile organization metrics, verification actions and settings identity/provider-detail operations to the same bounded projections and action capabilities as desktop. | Mobile cannot turn loaded-row trends into network truth or reveal a command the receiver rejects. |
| Identity desktop view-mode capability parity | UI/command authority cleanup | Gate organization list/table commands and remove verification list/table no-op Delete through the same row capability/receiver projection used by primary cards. | Switching organization/verification layout cannot reveal unauthorized or inert destructive commands. |
| Users context-panel recent-login projection | Read/exposure cleanup | Replace the panel-local auth-enriched `getProfiles` read with a named, role-scoped and field-minimized recent-login projection, or remove the detail. | Opening the users panel cannot independently expose email/sign-in metadata or turn read failure into an empty result. |
| Onboarding identity repair | L5 repair | Fix hospital-as-organization insert and `profiles.organization_id` assignment. | Onboarding writes valid organization/hospital/profile relationships under RLS. |
| Existing facility claim receiver | L5 repair | Make the visible selected-hospital claim flow consume selected facility identity or stay unavailable; no unconditional insert after a claim choice. | Selecting a facility cannot silently create a duplicate hospital or report canonical ownership without reflected linkage. |
| Avatar privacy projection | UI/media exposure cleanup | Remove identity-bearing external avatar fallback or define an approved non-identifying fallback policy. | Global/user identity surfaces do not transmit username/profile identity to third-party avatar providers without explicit disposition. |
| Security, denial diagnostics and identity activity projection | Auth/read-exposure cleanup | Verify mounted own-user password/MFA Auth behavior, remove raw password/route-denial diagnostics and minimize provider-email/username activity records before dashboard display. | Auth security and denial actions remain truthful without browser disclosure, and verification evidence does not become broad identity disclosure. |

### Detailed Checklist

#### 4A. Admin/Profile Service Boundary

- Move direct page admin delete calls into `adminService` or `profilesService`.
- Consolidate role/status/suspend/activate/delete mutations behind one authorized receiver family.
- Ensure admin profile edit fields match the receiver:
  - do not render editable email/avatar/name-component fields as saveable unless the receiver persists them
  - route email/auth identity changes through Supabase Auth/admin flow if needed
- Fix display ID bulk resolution to be entity-aware before relying on profile/provider display IDs.
- Replace or privacy-scope third-party generated-avatar fallback URLs used in identity/header surfaces.
- Treat `UsersPanel` as an independent identity read owner: justify or remove its recent-login purpose, minimize email/sign-in fields, and expose failed versus empty state rather than logging and silently rendering no rows.
- Keep unmounted `useAdmin` audit/export/destructive APIs excluded until a deliberate surface and authority contract require them; do not treat them as replacements for live page flows by filename alone.

#### 4B. Auth-Backed Creation And Invite

- Treat raw `profiles.insert` as unsafe unless the ID is proven to be an existing auth user.
- Prefer invite/auth creation for new console users.
- Move `invite-user` Edge Function invocation out of modal-local code.
- Document deployed function ownership and expected invite record/profile effects.
- Treat `SecurityModal` password/MFA enrollment/unenrollment as a canonical own-user Auth adapter only after assurance state, secret display, error feedback and reflected session outcome are verified.
- Correct the visible corrupted unauthorized symbol, `SecurityModal` password-placeholder bullets and onboarding verification-summary separator while removing raw protected-route and password-update diagnostics under the encoding/browser-disclosure gates.
- Include mounted `UserListView` email/organization/provider separators in the identity UTF-8 repair and route verification gate.

#### 4C. Verification Lane Split

- Keep hospital/org verification as the dispatch-authority lane.
- Rename or redesign provider/person BVN verification so it does not imply facility dispatch eligibility.
- Remove or quarantine stale onboarding approval helpers that write absent fields.
- Ensure provider approval has an authorized receiver if it must mutate another user's profile.
- Minimize or appropriately scope the provider email/username data currently written to shared activity records during verification.
- Make `MobileVerification` consume the same provider/facility lane labels, aggregate scope and approve/reject capability as desktop; remove "LIVE"/trend language that is only computed from loaded queue rows.
- Remove the list/table verification `Delete` command while it is wired to `onDelete={() => { }}`; callback truthiness is not receiver proof.

#### 4D. Onboarding Identity Repair

- Create or identify real `organizations` record creation.
- Create/claim hospital under organization rather than storing hospital ID in `profiles.organization_id`.
- Consume selected facility id and claim state in the actual submit receiver, with conflict-safe reflected linkage; do not advertise claim while always inserting a new hospital.
- Make `OnboardingSuccessPage` consume that reflected result before showing organization identity, review-readiness or dashboard-entry claims; `OnboardingPage` footer copy is included in the same encoding gate.
- Ensure RLS-authorized facility claim or creation receiver exists.
- Preserve onboarding draft state separately from committed organization/hospital truth.
- Make `MobileOrganizations` consume the server-paged organization/wallet projection and guarded CRUD capability rather than locally describing loaded rows as network dynamics.
- Apply the same organization command capability to desktop list/table renderers before passing create/edit/delete handlers; view mode cannot bypass the page's role/receiver gate.
- Keep `MobileSettings` identity claims backend-confirmed and reconcile its view-only provider-detail operation with Pass 5's desktop provider self-edit contract deliberately.

### Pass 4 Verification

- Role/admin mutation tests for profile update/delete/role/status.
- Invite flow smoke with non-production account.
- Verification queue browser smoke for provider and organization tabs.
- Mobile viewport smoke for organization metrics/actions, verification commands and settings provider-detail identity parity.
- Auth denial and settings password-failure smoke proving clean visible credential/unauthorized copy and no role/path/resource or raw Auth error payload in the browser console.
- Onboarding existing-facility and failure smoke proving selected records are not duplicated by submit and that Auth/facility/Storage errors are rendered through bounded feedback without raw browser diagnostic payload.
- Read-only schema proof for any fields used by onboarding/verification before enabling writes.
- RLS tests for org-admin, provider, platform admin, and ordinary user paths.

## Pass 5 - Provider Operations, Telemetry, Doctors, And Scheduling

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/AmbulancesPage.jsx`
- `frontend/src/components/context/AmbulancesPanel.jsx`
- `frontend/src/components/views/AmbulanceListView.jsx`
- `frontend/src/components/views/AmbulanceTableView.jsx`
- `frontend/src/components/modals/AmbulanceModal.jsx`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/context/DoctorsPanel.jsx`
- `frontend/src/components/views/DoctorListView.jsx`
- `frontend/src/components/views/DoctorTableView.jsx`
- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/modals/DoctorModal.jsx`
- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/components/scheduling/StaffScheduler.jsx`
- `frontend/src/components/pages/GodModeMap.jsx`
- `frontend/src/contexts/MapContext.jsx`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/map/MapRenderers/GoogleMapsRenderer.jsx`
- `frontend/src/components/map/MapRefiner/GoogleMapsSmartRoute.jsx`
- `frontend/src/components/map/ErrorBoundary.jsx`
- `frontend/src/components/mobile/MobileAmbulances.jsx`
- `frontend/src/components/mobile/MobileDoctors.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/components/map/MapRenderers/LeafletMapRenderer.jsx`
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/driverManagementService.js`
- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/hooks/useAmbulances.js`
- `frontend/supabase/migrations/20260219000200_org_structure.sql`
- `frontend/supabase/migrations/20260219000300_logistics.sql`
- `frontend/supabase/migrations/20260219000900_automations.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Provider read/lookups | Read-only owner cleanup | Move doctor/ambulance counts, hospital lookups, driver occupancy, modal support reads into services. | Modals do not query supporting tables directly. |
| Provider view-mode capability parity | Exposure/command cleanup | Apply one role/row capability projection to grid, list, table, mobile and context surfaces before callbacks are composed. | Switching from grid to list/table cannot reveal edit/delete authority hidden elsewhere. |
| Provider context summary truth | Read/failure-state cleanup | Replace broad/mock/stale panel readiness claims with typed scoped fleet/doctor summary states. | `Live Fleet`, `Ready Units` and `Active Faculty` labels render only when their source proves that meaning; failed/empty/degraded states remain distinct. |
| Ambulance telemetry owner | L5 repair | Align generic location/status writes with active-request telemetry contract. | Responder map updates use request-coupled receiver when dispatch/tracking state is affected. |
| Map mount authorization | Exposure/read-owner cleanup | Stop unguarded `MapProvider` operational reads/subscriptions on public/auth/unauthorized routes and mount scoped map feeds only for authorized map consumers. | Loading login/onboarding/password/unauthorized does not issue emergency, fleet, facility or patient-location map acquisition. |
| Map singleton ownership and desktop marker authority | Exposure/command cleanup | Remove nested `/map` provider duplication and route desktop selected-marker patient exposure/dispatch/completion through Pass 1 action authority. | Entering `/map` starts one feed owner only; desktop marker detail cannot disclose or command outside the shared emergency contract. |
| Map operator location and external routing truth | Exposure/reliability cleanup | Separate denied/unavailable browser location from display center, remove coordinate-derived session decoration and label/approve external Google route computation/fallback. | No fabricated proximity/marker truth, unnecessary coordinate badge or silent straight-line route presented as traffic-aware operational route. |
| Driver and vehicle command scope | Exposure/command repair | Remove client fallback ambulance selection for drivers and prevent an ambulance modal from exposing hospital-wide request lifecycle commands. | Driver actions require proved responder/request linkage; a vehicle record operates only its own linked trip or defers to request detail. |
| Mobile map emergency handoff | Cross-pass exposure/command repair | Identify mobile map patient fields and dispatch/completion affordances as Pass 1 emergency lifecycle consumers. | Mobile layout cannot invent emergency completion or patient-exposure authority from marker shape or ambulance presence. |
| Doctor/profile automation | L5 repair | Decide doctor CRUD relationship to profile-trigger automation. | Manual doctor creation cannot create duplicate/unlinked directory truth. |
| Schedule ownership | L5 repair | Implement org-authorized `doctor_schedules` read/CRUD/conflict/statistics and remove status-derived shift fiction. | UI no longer collects shift fields that are discarded. |
| Dormant scheduler exclusion | Capability classification | Keep unmounted `StaffScheduler` outside live Console capability or retire it until rebuilt on the canonical stored-shift projection. | No hard-coded/local-only second scheduler can be rendered as operational CRUD. |
| Clinical assignment integration | Cross-pass L5 capability | Coordinate doctor availability/readiness with Pass 1's persisted `emergency_doctor_assignments` command/projection. | A doctor shown as assigned in emergency operations has a canonical assignment row/state. |
| External map-layer reliability | UI/reliability cleanup | Treat CARTO/OpenStreetMap base tiles as a deliberate external dependency of the operational map. | Tile failure renders a clear degraded state without erasing or falsifying authorized marker/telemetry truth. |

### Detailed Checklist

#### 5A. Ambulance Form And Fleet CRUD

- Remove or map UI fields that are not accepted by the current ambulance table/service:
  - `image`
  - `last_maintenance`
  - `rating`
- Remove invalid `busy` status or map it to a valid operational status with explicit copy.
- Keep administrative fleet edits separate from active dispatch controls.
- Apply fleet command capabilities to grid, list, table and mobile renderers consistently; do not pass edit/delete callbacks into an otherwise unauthorized view mode.
- Add active-call guard before driver reassignment if assignment changes can trigger failover behavior.
- Move hospital lookup and occupied driver/ambulance lookup out of `AmbulanceModal` into the ambulance/provider service layer.

#### 5B. Responder Telemetry

- Preserve `console_update_responder_location` as canonical for live request tracking.
- Remove `processedAmbulances[0]` as a driver assignment fallback in map command eligibility; no matched responder/ambulance/request relation means actions are unavailable.
- Scope ambulance-detail trip rows and lifecycle actions to the opened ambulance id, or remove them from the modal and route the operator to request detail/dispatch operations.
- Guard or retire generic `useAmbulances.updateLocation()` when an ambulance has an active request.
- Ensure map telemetry updates both request responder truth and linked ambulance projection through the request-scoped receiver.
- Keep `MobileMap` dispatch/completion gated by the Pass 1 emergency action projection; it may render provider/map layout but may not own emergency payment/cash legality.
- Keep map realtime as projection, not canonical emergency/ambulance state owner.
- Do not initialize map reads or channels from public/auth/unauthorized route shells; verify actor and active authorized surface before operational or patient-location acquisition.
- Remove route-nested map-provider duplication so `/map` consumes one bounded authorized projection and one channel set.
- Treat `MarkerDetailPanel` as an emergency detail/command surface equal to `MobileMap`; apply Pass 1 patient-field and lifecycle-command legality and repair its corrupted rendered glyph.
- Treat map browser geolocation as permissioned truth; denial/unavailability cannot become a Lagos operator marker/nearby query or coordinate-derived session display.
- Treat Google Routes as an external coordinate handoff with approved fields, visibly degraded fallback and redacted failure diagnostics.
- Preserve attribution and define degraded rendering when third-party base tiles are unavailable; operational markers and telemetry retain independent truth status.

#### 5C. Doctor Creation And Profile Link

- Prefer linking an existing provider profile before creating a doctor row.
- Avoid create-then-invite flow that can create an unlinked doctor row and later trigger a profile-linked row.
- Treat name/email/phone and profile-linked facility identity as profile-projected fields for linked doctors.
- Treat specialty, license, and operational availability status as doctor-directory fields unless a later trigger contract explicitly projects them from profiles.
- Update UI copy so "invite" and "create directory row" are not presented as one guaranteed atomic operation unless backend makes it so.
- Apply clinician command capabilities to grid, list, table and mobile renderers consistently, and replace panel-level `Active` claims with status-exact typed summary state.
- Include the mounted ambulance and doctor list separators in the encoding repair gate before closing this pass.

#### 5D. Scheduling Ownership

- Implement actual doctor-shift CRUD using `doctor_schedules`, the existing org-authorized receiver.
- Treat the live `/hospitals` facility scheduling entry point as the mounted workflow to repair; it must not claim shift persistence from status-only writes.
- Read and write actual stored rows for date/time/shift/availability; remove the unsupported `notes` control unless a receiver is introduced.
- Keep `doctors` availability/status as operational state rather than schedule persistence.
- Do not imply ambulance crew scheduling until a persisted authorized receiver exists.
- Keep `StaffScheduler` unmounted/retired unless deliberately rebuilt against `doctor_schedules`; clean its corrupted visible text before any approved mount.

### Pass 5 Verification

- Browser smoke on `/ambulances`, `/doctors`, scheduling modal, and `/map`.
- Mobile `/map` smoke for selected-emergency patient exposure and dispatch/completion unavailable/authorized states under the Pass 1 action contract.
- Public/auth route network/channel smoke proving `/login`, `/set-password`, `/onboarding` and `/unauthorized` do not initialize map domain feeds.
- `/map` singleton-provider/channel smoke proving one initial feed acquisition/channel set and desktop selected-marker Pass 1 action/exposure gating with clean encoding.
- `/map` location/routing smoke proving denied location does not seed Lagos proximity/marker truth, coordinate-derived display is removed, and external route fallback/error state is visible and redacted.
- Service tests for valid ambulance status set and doctor create/link behavior.
- Realtime smoke for responder location when an active request exists.
- Read-only proof or tests for doctor/profile automation assumptions before changing create/invite semantics.

## Pass 6 - Visits Ownership And Request-Derived History

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/VisitsPage.jsx`
- `frontend/src/components/modals/VisitModal.jsx`
- `frontend/src/components/mobile/MobileVisits.jsx`
- `frontend/src/components/views/VisitListView.jsx`
- `frontend/src/components/views/VisitTableView.jsx`
- `frontend/src/services/visitsService.js`
- `frontend/src/services/emergencyService.js`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/medicalProfilesService.js`
- `frontend/supabase/migrations/20260219000900_automations.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/visitsService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/paymentService.js`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Visits read model | Read-only owner cleanup | One owner for count/search/hydration and hospital/profile fallback. | `VisitsPage` does not own direct table count/search shape. |
| Request-derived guard | Service/UI cleanup | Mark emergency-derived visits as source-owned. | Manual CRUD cannot silently fight emergency-to-visit sync. |
| Tip/payment continuity | Cross-pass read projection | Reflect app `process_visit_tip` and `record_visit_cash_tip` outcomes as authorized read-only visit finance context. | Generic visit edit cannot alter, erase or claim patient tip settlement. |
| Fallback row strategy | L5 repair | Define repair/creation strategy for fallback emergency rows if needed. | Existing repair scope and forward contract are separate and documented. |

### Detailed Checklist

#### 6A. Visit Read Model

- Move direct table count/search reads out of `VisitsPage`.
- Hydrate visits consistently with:
  - patient profile
  - hospital/facility
  - linked emergency request by `request_id` or display fallback where intended
  - legacy aliases used by current UI
  - lifecycle/rating/tip fields
  - authorized tip/payment settlement provenance and unavailable state
- Return source markers:
  - administrative visit
  - emergency-derived visit
  - incomplete/degraded linkage
- Keep pagination/search behavior in the read owner, not page-local query construction.

#### 6B. CRUD Boundary

- Allow normal create/update/delete only for administrative scheduled/clinical visits.
- For emergency-derived rows:
  - disable delete or route to emergency lifecycle action
  - disable independent status edits unless backend says visits owns that field
  - show source-owned explanation in UI where needed
- Prevent users from creating a visit that references an emergency request unless the canonical owner supports it.
- Keep app-settled tip/payment evidence read-only in the visit projection; Pass 2 owns financial receiver/reflection decisions.

#### 6C. Fallback Row Strategy

- Keep forward repair and historical repair separate.
- If fallback-created emergency rows need visit repair, plan:
  - read-only population count
  - deterministic matching rules
  - dry-run report
  - explicit authorization before mutation
- Do not hide missing emergency-to-visit linkage by allowing ordinary manual visit creation.

### Pass 6 Verification

- Visits service tests for administrative versus emergency-derived rows.
- Browser smoke on `/visits` create/edit/delete with guarded emergency-derived row fixtures where possible.
- Read-only count check before any historical repair plan.
- App visit-history comparison for a linked emergency request.

## Pass 7 - Content, Support, Subscribers, And Email

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/HealthNewsManagementPage.jsx`
- `frontend/src/components/modals/HealthNewsModal.jsx`
- `frontend/src/components/context/HealthNewsPanel.jsx`
- `frontend/src/services/healthNewsService.js`
- `frontend/src/components/pages/SupportTicketsPage.jsx`
- `frontend/src/components/context/SupportTicketsPanel.jsx`
- `frontend/src/services/supportTicketsService.js`
- `frontend/src/hooks/useSupportTickets.js`
- `frontend/src/components/pages/SubscriptionManagementPage.jsx`
- `frontend/src/components/modals/SubscriptionModal.jsx`
- `frontend/src/emails/ivisit106Campaign.js`
- `frontend/src/components/navigation/ContextAwareFAB.jsx`
- `frontend/src/components/navigation/DynamicBottomBar.jsx`
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/subscribersService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/services/supportFaqsService.js`
- `frontend/supabase/functions/payments/sendWelcome/index.ts`
- `frontend/supabase/functions/payments/process-subscribers/index.ts`
- `frontend/supabase/functions/webhooks/index.ts`
- `frontend/supabase/migrations/20260219000500_ops_content.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/helpSupportService.js`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Health-news summary owner | Read-only owner cleanup | Move KPI/count/category reads into health-news service/hook. | Page and panel share the same content summary owner. |
| Health-news source-link contract | External navigation/content safety | Normalize/validate persisted source URL and provenance; use safe preview navigation consistent with the patient feed consumer. | A published Console content record cannot send patients or operators to malformed or unreviewed destinations. |
| Health-news view-mode command parity | UI/command authority cleanup | Replace function-object role truthiness in list/table composition with evaluated published-feed capabilities. | Switching from grid to list/table cannot reveal publish/edit/delete commands while content write policy is absent or the actor lacks authority. |
| Support hook reuse | Read-only owner cleanup | Reuse support service/hook across page/panel. | Duplicate support realtime/direct reads are removed. |
| Subscriber facade | Service cleanup | Consolidate subscriber/subscription services, preserve fixed-field payload repair, and restrict commands to policy/receiver-backed authority. | Subscriber payload remains schema-current and unauthorized management controls are absent. |
| Email lifecycle owner | L5 repair | Define welcome/custom/bulk/unsubscribe state machine. | Welcome email cannot be sent twice by competing lifecycle writers. |
| Insurance billing outcome owner | Missing scoped surface | Expose authorized `insurance_billing` result/claim context alongside policy and completed-care support flows. | Admin/hospital support can inspect trigger-created billing outcomes without inventing policy mutation authority. |
| Hidden shell acquisition removal | Read-only owner cleanup | Stop global FAB/bottom-bar containers from mounting insurance/support/subscriber full-list hooks solely to supply unopened modal callbacks. | Unrelated routes and hidden viewport controls perform no protected care/subscriber reads or channels. |

### Detailed Checklist

#### 7A. Health News

- Treat the current `health_news` receiver as a curated published feed, not an authored article CMS: the current table contract and public app read path do not prove article-body authoring or console write policy.
- Treat the published health-news `url` as an app-visible external-navigation contract: validate normalized scheme/destination/provenance and use safe external-open behavior wherever a read-only preview is retained.
- Remove or relabel editor fields not persisted:
  - description
  - content
  - icon
- Do not expose authored-article editing unless a later contract pass adds the receiver fields and authorized authoring policy first.
- Do not pass publish/edit/delete callbacks to health-news list/table variants based on a callable `isAdmin` prop; consume explicit evaluated capability values and default them unavailable during published-feed-only operation.
- Move page and panel KPI/category reads into one health-news summary service.
- Obtain policy proof before draft/read/write authoring work.

#### 7B. Support Tickets

- Align patient app ticket creation fields with console receiver fields.
- Fix or remove app-side `admin_response` insert expectation if the receiver lacks it, or add a supported receiver field intentionally.
- Keep support operations within the currently proven admin/owner policy boundary; do not expose org-admin/provider ticket management until a guarded RPC/RLS contract authorizes it.
- Keep `useSupportTickets` as the page/panel data owner and remove duplicate panel direct channels.
- Remove shell-mounted `useSupportTickets` acquisition from hidden/unrelated FAB and bottom-bar paths; a create command does not require loading the entire queue before the operator opens it.

#### 7C. Subscribers And Email

- Retain `subscriptionService.js` as the active console subscriber/email workflow facade; leave `subscribersService.js` as compatibility-only until removal proof exists.
- Preserve the current fixed-field subscriber payload repair; do not reintroduce runtime schema fallback writes.
- Replace unwindowed list reads and repeated hook-mounted subscriber channels with one bounded admin projection/invalidation owner.
- Remove `useSubscription` from globally mounted action containers until an authorized subscriber action surface is actually entered; no hidden button may cause admin-only email-list reads.
- Remove unsupported edit/delete/status controls and subscriber-tier labels that imply revenue or payment completion without billing proof.
- Define lifecycle state machine:
  - subscribed/new
  - welcome pending
  - welcome sent
  - unsubscribed
  - custom/bulk campaign sent
- Make email send operations idempotent or visibly retry-safe.
- Ensure `sendWelcome`, `process-subscribers`, webhook unsubscribe, and UI sends do not compete over the same flags.
- Verify that every sent email template resolves to one deployed unsubscribe endpoint and that its idempotent lifecycle update removes unsubscribed recipients from future allowed sends.

#### 7D. Notifications

- Keep console notification center scoped to operator activity.
- If patient app clear/delete is in scope, add policy/receiver support separately rather than changing console UI only.
- Preserve notification `action_data` unless receiver shape intentionally lacks it and UI is prepared for missing actions.

#### 7E. Insurance Shell Acquisition

- Remove shell-mounted `useInsurance` reads/subscriptions from `ContextAwareFAB` and `DynamicBottomBar`; an Add Policy command must acquire data only in its authorized route/modal lifecycle.
- Keep patient-sensitive policy projections within the proved route or explicitly scoped detail/result surface.

### Pass 7 Verification

- Service tests for subscriber payload and email lifecycle state transitions.
- Browser smoke on health-news, support tickets, subscriptions, and unrelated dashboard routes to confirm no hidden insurance/support/subscriber acquisition.
- RLS/policy tests for support and content authoring roles.
- Non-production email function test only after idempotency is defined.

## Pass 8 - Analytics, Search, Dashboard Shell, Realtime, And Feedback

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/components/pages/Overview.jsx`
- `frontend/src/components/mobile/MobileAnalytics.jsx`
- `frontend/src/components/mobile/MobileDashboard.jsx`
- `frontend/src/components/dashboard/HospitalFleetManager.jsx`
- `frontend/src/components/dev/SchemaDebugger.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/components/common/NotificationCenter.jsx`
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/services/analyticsService.js`
- `frontend/src/services/searchAnalyticsService.js`
- `frontend/src/services/searchService.js`
- `frontend/src/services/searchEventsService.js`
- `frontend/src/services/searchHistoryService.js`
- `frontend/src/services/searchSelectionsService.js`
- `frontend/src/services/trendingTopicsService.js`
- `frontend/src/services/analyticsAutomationService.js`
- `frontend/src/services/activityService.js`
- `frontend/src/utils/errorHandler.js`
- `frontend/src/services/preferencesService.js`
- `frontend/src/services/supabaseHelpers.js`
- `frontend/src/App.js`
- `frontend/src/components/common/ProtectedRoute.jsx`
- `frontend/src/components/common/Skeletons.jsx`
- `frontend/src/components/common/ConsoleStartupOverlay.jsx`
- `frontend/src/components/common/NetworkStatus.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`
- `frontend/src/index.js`
- `frontend/src/serviceWorkerRegistration.js`
- `frontend/src/components/pwa/InstallPrompt.jsx`
- `frontend/src/components/pwa/OfflineIndicator.jsx`
- `frontend/src/components/pwa/UpdateNotification.jsx`
- `frontend/src/contexts/PWAContext.jsx`
- `frontend/src/contexts/FeedbackContext.jsx`
- `frontend/src/hooks/useNetworkStatus.js`
- `frontend/src/lib/queryClient.js`
- `frontend/src/components/ui/skeleton.jsx`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Dashboard summary facade | Read-only owner cleanup | Feed dashboard/Bento/Overview from domain selectors. | `PageDataContext` stops owning cross-domain server truth. |
| Analytics service derivation and role scope | Read-only owner cleanup | Move raw reads/chart derivation out of analytics page and exclude admin-only subscriber projections from broader-role analytics loads. | Analytics page renders from authorized service/hook outputs and a provider route cannot fail because subscriber analytics are denied. |
| Shared analytics modal projection contract | UI/read projection repair | Remove fallback metric semantics from `AnalyticsModal` and require all mounted domain callers to supply typed scope/window/unavailable data from their owning pass. | No modal displays default `12m`, generic confidence indices or bounded-preview totals as proved operational analytics. |
| Mock/demo cleanup | UI/service cleanup | Remove production mock defaults or connect visible demo preference. | A failed fetch cannot flip the authenticated shell into mock mode. |
| Realtime dedupe | Query cleanup | Remove global and duplicate page/panel channels after domain hooks own reads. | One owner per table/event family, with scoped map/modal exceptions. |
| Public-route and singleton map-provider authorization | Exposure/read-owner cleanup | Remove unguarded `MapProvider` operational-feed initialization from public/auth/unauthorized routes, remove nested `/map` provider ownership and require one authorized surface mount for map datasets/channels. | Public shell navigation performs no emergency, fleet, facility or patient-location map read/subscription attempt, and authorized `/map` mounts one feed/channel owner. |
| Route/action feedback | UI cleanup | Add route skeleton and pending guards for high-risk actions. | Navigation and commands acknowledge intent immediately without false completion claims. |
| Shared responsive list feedback contract | UI/reliability cleanup | Define how `PullToRefresh`, `useStableList` and `useLoadMoreControl` consume domain-owned loading/error/page status across the live mobile routes that mount them. | Retained rows, refresh indicators and load-more controls cannot make a failed, capped or unbounded collection look current or complete. |
| Shell footer health disposition | UI/truth cleanup | Remove, neutralize or source `SmartFooter` success styling and `LIVE SYNC ACTIVE` fallback through an actual scoped freshness/health projection. | Mounted shell chrome cannot claim realtime success merely because a page has visible footer configuration. |
| Shell utility feedback and debug disposition | UI/accessibility cleanup | Review always-mounted PWA/feedback surfaces and remove or source the visible debug version marker. | Install/offline/update prompts remain truthful; audio/haptic effects have deliberate accessibility behavior; production shell shows no hard-coded debug copy. |
| Search/trend truth and privacy | L5/read-projection repair | Scope searchable categories/fields by role, sequence parallel queries and replace success-returning stub regeneration or label unavailable state. | Shell search distinguishes no-match, partial, denied and failed results and cannot present stub trend regeneration as real. |
| Notifications/preferences/settings | UI/read-owner cleanup | Align user-scoped notification read/mark behavior with a real settings receiver and preserve intentional notification action metadata. | An unwired switch or compatibility payload loss cannot misstate notification behavior. |
| Shell diagnostics, shared error feedback and sensitive activity projection | Exposure/error-state cleanup | Replace browser-console monitoring/notification error disclosure, centralize raw `errorHandler` logging/toast sanitization, consume Pass 4's auth denial/password-error cleanup and minimize identity/location-bearing activity-feed content by role. | Failures remain useful and visible without leaking route/user/entitlement/Auth-error/receiver/location/identity metadata in console output or user-facing error copy. |
| Settings plan and dormant dashboard disposition | UI/capability cleanup | Remove or correctly source desktop `Free Tier`/Upgrade claims and keep `HospitalFleetManager` excluded unless real provider/emergency projections and scoped report export exist. | Viewport-only plan claims and unmounted mock dashboards cannot be mistaken for product capability. |
| Dormant diagnostic disposition | Exposure/capability cleanup | Keep `SchemaDebugger` unmounted/retired unless an explicitly redacted development-only diagnostic policy and clean rendering are approved. | Raw operational objects cannot be surfaced through an unowned debug viewer. |
| Query/cache ownership and dormant network interceptor | State/reliability cleanup | Record `QueryClientProvider` as foundation only until domain queries migrate; keep unmounted `NetworkStatus`/`useNetworkStatus` from wrapping global fetch. | No API-reliability claim is based on an unused cache provider or global request monkey-patch. |
| Mobile dashboard patient-care disposition | Ecosystem/action cleanup | Replace empty patient-only visit/history/SOS handlers with deliberate canonical app handoff or unavailable/removed Console presentation. | Console exposes no inert patient workflow and urgent intent receives immediate meaningful feedback. |

### Detailed Checklist

#### 8A. Dashboard And PageDataContext Reduction

- Inventory every consumer of `usePageData`.
- Replace domain-owned data in `PageDataContext` with:
  - shell summary selectors
  - or explicit domain hooks in the consuming page/panel
- Remove production mock initial records and global `setUseMockData(true)` fallback behavior.
- Remove operational dashboard dependence on mock/demo fallback. Patient app demo preference is not a Console operational-data switch.
- Make dashboard recent activity a scoped/minimized projection: do not broadly render emergency address or provider identity metadata merely because writers logged it.

#### 8B. Analytics Truth

- Move raw reads from `Analytics.jsx` into `analyticsService` or `useAnalytics`.
- Do not include subscriber analytics in a provider/org/sponsor aggregate load unless the receiver and RLS prove access for that audience; admin-only subscriber metrics remain an isolated admin slice.
- Replace fixed metric-looking constants with:
  - real values
  - unavailable state
  - or demo-labelled values
- Treat `AnalyticsModal` as a display consumer only: remove its default response-time substitution and generic evidence-looking labels unless the caller provides a proved typed metric projection.
- Keep finance analytics sourced from wallet owner after Pass 2, not direct parallel reads.
- Ensure sponsor/admin dashboards distinguish inference from verified table evidence.

#### 8C. Search And Trends

- Keep quick-search trending read path if it continues to use valid read RPC.
- Define per-role QuickSearch categories and displayed fields before retaining profile email, emergency or visit result projections.
- Sequence or cancel QuickSearch requests and expose partial/denied/failure state instead of treating a rejected category as no matches.
- Do not expose trend regeneration success until RPC performs actual aggregation/update work.
- Label empty/fallback trend data as unavailable or demo, not operational analytics.
- Fix existing mojibake in search/analytics source files when touching those files, and run encoding gate.

#### 8D. Realtime Dedupe

- Remove `PageDataContext` global channels only after each domain hook owns its reads.
- Dedupe page/panel direct channels for:
  - support tickets
  - health news
  - visits
  - emergency requests
  - insurance policies
  - subscribers
- Keep scoped exceptions:
  - open detail modal row subscription
  - active map projection
  - user notification stream

#### 8E. Route And Action Feedback

- Replace blank route Suspense fallback with shell-aware skeleton/progress treatment.
- Preserve `DynamicAuthSkeleton` for auth gate.
- Separate public/auth shell utility providers from authorized operational map projection mounting so no map feed or patient-location channel starts before an eligible surface is entered.
- Reuse mobile stable-list and skeleton patterns for desktop/web route loads where appropriate.
- Add pending/disabled state to bulk/destructive commands that still rely only on toast after click.
- Remove or wire the dashboard realtime switch and alert thresholds; visible local-only state is not operational configuration.
- Wire or remove the visible settings notification switch, and define whether compatibility notifications lacking action metadata are non-actionable.
- Render notification read failure distinctly from no notifications, redact browser diagnostics, replace production `ErrorBoundary` console logging with an approved minimized failure path and make `utils/errorHandler.js` map raw receiver failures to safe actionable operator copy.
- Remove/disable the static desktop `Free Tier`/Upgrade affordance or connect it to a user-scoped Pass 2/7 billing/subscription projection with the same truth semantics on mobile.
- Keep `HospitalFleetManager` unmounted/retired unless its hard-coded operations and Export Report surface are replaced by authorized domain projections and export scope.
- Keep `SchemaDebugger` unmounted/retired unless supplied data is explicitly redacted, development-only and encoding-clean; raw object rendering is not a production diagnostic boundary.
- Keep `NetworkStatus`/`useNetworkStatus` unmounted/retired; it cannot wrap global `window.fetch` as the solution for typed error, retry, cancellation or degraded-state behavior.
- Treat `QueryClientProvider` as installed infrastructure only until each domain pass moves proved reads/mutations into owned queries with explicit freshness, retry and invalidation rules.
- Treat `PullToRefresh`, `useStableList` and `useLoadMoreControl` as feedback adapters only: every mounted mobile list must receive authoritative bounded refresh/page/error state from its domain pass before preserving rows or enabling continuation.
- Remove, neutralize or source `SmartFooter`'s success-styled `LIVE SYNC ACTIVE` fallback; shell decoration is not realtime-health evidence.
- Decide and implement the `MobileDashboard` patient-care disposition: canonical patient-app handoff with immediate feedback, or removal/unavailable rendering in Console; empty handlers are not a valid destination.
- Remove or authoritatively source `PWADebugTracker` production version copy, and review the globally mounted PWA install/offline/update notices plus active service-worker registration/reload behavior as shell-owned user actions.
- Define reduced-motion and sound/haptic preference behavior for `FeedbackProvider` before retaining feedback effects across mobile command surfaces.
- Review success copy on every command touched by prior passes.

### Pass 8 Verification

- Browser smoke across dashboard, analytics, route transitions, and context panels.
- Mobile and desktop viewport checks for skeleton/pending states.
- Console error scan after route changes.
- Encoding scan for touched search/analytics files.
- Analytics service tests or fixture-based checks for unavailable/demo states.
- Role tests for provider analytics with admin-only subscriber data unavailable.
- QuickSearch tests for out-of-order queries, partial category failure and restricted field/category projection.
- Notification/settings test for own-user preference behavior and action metadata fallback.
- Settings desktop/mobile plan-action parity check and dormant-component import scan for `HospitalFleetManager`.
- Mobile patient-role dashboard smoke confirms visit/history/SOS actions either hand off deliberately or are not exposed, and confirms fleet-detail copy passes the encoding gate.
- PWA/feedback shell check for install/update/offline actions, debug-marker removal or authoritative version source, and accessibility preference behavior.
- Shell/mobile reliability check for neutral or source-backed footer health text plus truthful refresh/buffering/load-more states on representative paged, capped and failed list projections.

## Implementation Checklist Template

Before any pass starts, create or update a narrow checklist with:

| Field | Required content |
| --- | --- |
| Scope | Exact pages/services/RPCs/functions touched. |
| Source truth | Stage 2/3/4 docs and source files read. |
| Stage 5 coverage | Every service listed for the pass is either included, explicitly deferred, or marked out of scope with a reason. |
| Operation class | Per user action: scoped read projection, authorized table CRUD, workflow command, derived read-only evidence, or excluded boundary. |
| Field/receiver gate | Exact high-risk columns rendered or submitted, their source table, and the receiver/command or read projection allowed to own them. |
| Parser/formatter gate | Database fields, imported rows, local cache values, and external payloads parsed or coerced by the UI, with allowed scalar/object/null/error shapes. |
| Safe cleanup | Read-only owner moves, UI feedback, and copy-only changes. |
| L5 repair | Backend/RPC/Edge/schema/policy changes, if any. |
| Exclusions | Related tempting work that will not be touched. |
| Data safety | Whether any read-only probe, migration, backfill, cleanup, or Edge call is involved. |
| Verification | Commands, browser checks, RLS/RPC tests, and encoding scans. |
| Commit boundary | Whether this is part of contract-truth, state-ownership, or implementation-plan pack. |

If a pass includes both safe cleanup and L5 repair, split them unless the cleanup would misrepresent truth without the repair.

## Implementation Readiness Gates

Each pass must clear these gates before code changes begin.

| Gate | Required proof | Blocking example |
| --- | --- | --- |
| Owner gate | The Stage 4 row names a single required owner for the surface/service. | `PageDataContext`, page, and service all still own the same server truth. |
| Service coverage gate | The Stage 5 ledger has no unassigned service for the pass being started. | Subscription implementation starts while `subscribersService`, `subscriptionService`, and support/email receivers still have no chosen owner. |
| Runtime-truth closure gate | For every entity and user-visible claim in pass scope, Stage 5 traces backend source to all consumers and each affected route/action through all globally mounted and local acquisition/receiver paths. | A route labelled paged is accepted while it actually passes an undefined page-size limit and its globally mounted KPI/map contexts also load unbounded hospital collections. |
| Surface exposure/operation gate | Every in-scope route, panel, modal, responsive variant and export records rendered fields and exposed controls by role, proves read exposure authority, and assigns each action/field to authorized CRUD, workflow command, read-only evidence or disabled/excluded status. | Insurance/admin fields render under unproved RLS or an editor submits fields the canonical receiver does not persist. |
| Direct-boundary gate | The Stage 5 direct call-site register assigns every active non-service Supabase/Auth/Edge/Storage access in pass scope to move, retain as canonical adapter, disable, or retire. | A service facade is introduced while the page or context continues to read the same tables, own the same channel, invoke `exec_sql`, or claim Storage delivery independently. |
| Edge topology gate | The Stage 5 receiver register proves the addressed Edge slug, deployable source owner, authentication rule, durable writer/reflection path and any cross-repo ownership for every command, delivered link, webhook or background worker in pass scope. | Console implements an invite, email unsubscribe, wallet or discovery promise from a README/category folder while the addressed slug is missing, app-owned or behaviorally different. |
| Backend-writer consequence gate | The Stage 5 generated-truth register identifies every trigger/automation that can run after an exposed command and names the refreshed visible projection or intentionally missing/read-only surface. | A doctor status edit silently reassigns an active emergency, an invite seeds a role, or emergency completion creates billing/ledger/visit state that the Console cannot render accurately. |
| Audit/event sensitivity gate | Operational activity, notification and privileged-audit writes declare permitted fields, role-scoped read projections and redaction/minimization rules before being rendered in dashboard, detail or export surfaces. | An emergency activity description publishes a pickup address or a provider verification event publishes identity metadata into a broadly visible recent feed merely because an audit row exists. |
| Route/surface gate | The Stage 5 visible-surface register assigns route entitlement, navigation and panel visibility, primary action and mounted modal receiver for every operated flow in pass scope. | An org admin sees an inaccessible insurance route, a pricing action opens wallet top-up, or the emergency clinical-record button dispatches to no mounted receiver. |
| Pagination/fetch gate | The Stage 5 reliability register classifies each in-scope list/search/export as server-paged, deliberately bounded, detail-only or unavailable, and names count/filter/sort/enrichment/realtime/error behavior. | A `1000`-row client cap is displayed as the full fleet/user total, an unpaged list is presented with paging controls, or a KPI failure blanks an otherwise valid operational list. |
| Event receiver gate | The Stage 5 custom-event reconciliation is rerun for changed controls and proves every visible emitter has a listener mounted on its active route/destination with a named role, data and command owner. | A Broadcast, Report, clinical handoff or map-centering control emits an event whose receiver exists only on another route or nowhere at all. |
| Receiver gate | The Stage 2 contract exhibit names the table/RPC/Edge Function that will receive the mutation or read; an RPC source-name match proves inventory only, not authorization or behavioral correctness. | UI action says "cash fee deducted" but no backend receiver is confirmed to debit/credit ledger truth, or a present RPC is accepted without field/role/transition proof. |
| Operation-class gate | The table-policy/RPC matrices say whether each control is read projection, ordinary CRUD, workflow command, derived read-only evidence, or excluded. | A modal exposes Edit/Delete for a transition, ledger, billing-result, patient-owned, or command-owned row merely because it is selectable. |
| Field-contract gate | The table matrix/pass subplan names the exact high-risk identity, status, amount, eligibility, evidence, and linkage fields used by the surface. | Implementation discovers while coding that `hospital_id` received an organization UUID or an edited field is not persisted by the receiver. |
| Parser/formatter gate | The Stage 5 parser register or pass checklist classifies every surviving `JSON.parse`, date/number coercion, object fallback chain, import parser and formatter assumption in scope. | A scalar `ambulance_type` value crashes the modal because the UI parsed it as JSON, or an invalid amount/date becomes a believable zero/today KPI. |
| Trace-coverage gate | Existing generated app trace output is read or regenerated for required shared tables touched by the pass; May 25 baselines complete `45/45` shared-table coverage, including missing capability and scoped/excluded boundaries; source policy/RPC evidence remains authoritative. | An implementation changes a shared-table surface without comparing against its trace and authoritative receiver contract. |
| Scope gate | The implementation checklist names files touched and files explicitly excluded. | Wallet top-up fix also edits dashboard analytics and subscriber emails. |
| Data-safety gate | The checklist says whether the pass is read-only cleanup, UI-only, L5 backend repair, schema/RLS work, Edge Function work, or historical repair. | A migration/backfill is run while the pass was only approved for service cleanup. |
| Storage-authority gate | For upload-bearing Passes 3, 4, 5 and 7, read-only deployed proof identifies bucket visibility, `storage.objects` actor/path policies, canonical object ownership, URL lifetime and cleanup/audit behavior; current source provides no active authority outside archive material. | Console preserves public media URL assumptions or a one-year insurance signed URL while App uses one-hour owner-scoped evidence and no deployed Storage policy has been proved. |
| Copy/feedback gate | User-facing success, loading, and degraded-state copy is tied to backend truth. | UI claims provider dispatch certification after only `profiles.bvn_verified` changes. |
| Verification gate | The pass lists exact commands and browser/RLS/RPC checks. | "Test manually" is the only verification statement for payment or dispatch. |
| Commit gate | The pass states whether it belongs to contract-truth, state-ownership, or implementation-plan pack. | A single finished chart or checklist is committed by itself without an explicit checkpoint reason. |

## Stop Conditions

Stop and return to audit/planning instead of implementation when any of these appear:

- A UI action maps to more than one possible receiver and the product meaning is unclear.
- A source file writes direct table state while an RPC or Edge Function owns side effects for the same workflow.
- The console can render a field but cannot prove it can persist or refresh that field.
- A planned "cleanup" changes L5 lifecycle semantics, money movement, dispatch eligibility, identity ownership, or email sending.
- A repair requires migration, backfill, cleanup, Edge Function deployment, or live write execution that has not been explicitly authorized.
- Verification requires app/console cross-repo behavior but only one repo has been checked.

## Commit Readiness

Do not commit because a single doc feels finished. A commit is appropriate only when the pack is coherent:

| Pack | Commit readiness |
| --- | --- |
| Contract truth pack | Stage 1 database truth, Stage 2 service contracts, exact exhibits, read-only proof, and Stage 3 capability gaps are indexed and internally consistent. |
| State ownership pack | Stage 4 L5 matrix is complete enough that every implementation pass has an owner and known missing consumption. |
| Implementation plan pack | Stage 6 pass plan has enough detail to start the first selected implementation pass without hidden research. |
| Interim checkpoint | Only if user requests it, a deployment/build repair baseline needs it, or an external sync/schema refresh requires a protected before/after point. |

Current status: the coverage, ownership, and operation-class checkpoints are committed locally. This receiver/field-readiness expansion is the next coherent audit checkpoint; after it is verified, each flow subplan has the required entry point for implementation sequencing without hidden field-contract research.

## First Implementation Pass Handoff

When the user authorizes implementation, start with Pass 1 unless they choose another pass. The handoff should be written as a small checklist before editing code:

```text
Pass: Emergency lifecycle and cash/payment truth
Mode: read-owner cleanup first; no backend repair until receiver checklist is confirmed
Files: exact files from Pass 1 primary list
Excluded: map visual redesign, historical repair/backfill, dashboard KPI polish
Acceptance: emergency page reads through one owner; no direct page count read; dispatch/cash/retry pending guards; no unsafe success copy
Verification: diff check, encoding scan, targeted frontend checks, browser smoke on /emergencies
Escalation: cash settlement or fallback-create repair requires explicit L5 backend checklist before mutation
```

## Verification Matrix For Implementation Passes

| Change type | Minimum verification |
| --- | --- |
| Docs-only pass planning | `git diff --check`; mojibake/non-ASCII scan on touched docs. |
| Read-only service owner cleanup | Targeted unit/service tests if present; page smoke test; no database mutation outside normal reads. |
| L5 emergency/payment/wallet repair | Targeted hardening scripts, RPC/Edge contract tests, read-only before/after evidence where safe, and explicit no-side-effect cleanup gate only when authorized. |
| UI feedback/skeleton changes | Browser/dev-server visual check for route loading, mobile/desktop layout, and action pending states. |
| Supabase/schema/type sync | `cd frontend && npm run check:database-types-encoding`, plus relevant build/type checks. |

## Commit Boundary

This plan still belongs to the broader contract-truth or implementation-plan pack. Do not commit it as a small standalone doc unless the user asks for a checkpoint.
