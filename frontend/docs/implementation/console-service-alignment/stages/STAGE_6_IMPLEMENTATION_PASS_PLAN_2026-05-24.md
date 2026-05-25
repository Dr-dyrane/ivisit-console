# Stage 6 Console Alignment Implementation Pass Plan - 2026-05-24

## Status

Expanded global implementation-pass plan. Planning only; no product, database, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This plan follows the Stage 2 contract exhibits, Stage 3 capability gaps, Stage 4 L5 ownership matrix, Stage 5 full service coverage audit, and the service taxonomy in `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`. Each pass must be narrowed into its own implementation checklist before code changes begin.

The pass order below is an implementation sequence, not the console feature taxonomy. A single pass can cover several feature lanes when they share source-of-truth risk. The feature taxonomy remains the coverage gate for ensuring no service or operational surface is skipped.

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
| 1 | Emergency requests, payment/cash state, responder/map detail, linked visits, global emergency summaries and realtime. | A detail/list/payment state can be obtained or refreshed outside the declared emergency read owner. |
| 2 | Wallets, ledger, payments, Stripe reflection, payout/top-up dialogs, summaries, exports and maintenance paths. | Any money total/export/repair/action depends on a partial collection or unnamed mutation boundary. |
| 3 | Hospitals, capacity, provider taxonomy/media, discovery/import and pricing across route, global providers, map, modal lookups and app-facing quote dependencies. | Facility totals/capacity/pricing can be loaded through an unbounded or semantically different path, including a bootstrap context hidden from the page query. |
| 4 | Profiles/auth, organizations, verification, onboarding, route guards, selectors/lookups and organization-linked wallet/facility scope. | A role/identity/readiness claim uses an untraced provider/context/modal path or mismatched authority. |
| 5 | Ambulances, doctors, telemetry, scheduling, map layers, dropdown dependencies and assignment/proximity calculations. | Fleet/provider availability or assignment uses capped, fabricated, or independently loaded truth. |
| 6 | Visits, medical-history projections, emergency handoffs and all patient/provider/hospital lookup hydration. | Clinical-history completeness or edit eligibility depends on an unbounded lookup or unowned linked-state fetch. |
| 7 | Insurance, billing results, subscribers, email, support, FAQs, health news, notifications, uploads and shell-mounted care/subscriber hook consumers. | Management counts/actions or content availability mask partial, denied, failed or unproved storage/receiver paths, or hidden global command controls acquire protected/unbounded data on unrelated routes. |
| 8 | Analytics, overview/dashboard, search, trends, activity, notifications, preferences, map shell, PWA/feedback/debug utilities, shared realtime and remaining provider state. | Aggregate/search/navigation truth can still be generated from mock, stale, partial, broad or unowned sources, an allowed provider dashboard still invokes admin-only subscriber truth, or globally mounted UI utilities render unreviewed debug/accessibility behavior. |

## Global Surface Exposure And Operation Gate

Each pass must inventory the actual UI promise before implementing its owner cleanup: fields rendered, status/summary meaning, datasets exportable, controls exposed and role visibility. A correct service call is insufficient if the surface exposes data outside policy scope or advertises CRUD/commands whose receiver cannot authorize or persist the submitted fields.

| Required surface proof | Must identify | Implementation blocker |
| --- | --- | --- |
| Read/render exposure | Surface variant and role, displayed fields/KPIs/detail/export content, source and read/RLS/RPC authority, missing or excessive exposure. | An org admin can render patient/financial/clinical fields not proven visible, or a surface omits app-required truth while appearing authoritative. |
| Field meaning and completeness | Identity keys, status/amount/eligibility/provenance semantics, bounds/aggregate source, normalization and degraded states. | A UI label changes meaning from its source, renders capped data as total, or presents unavailable data as zero/complete. |
| Visible operation inventory | Every edit/delete/create/verify/approve/assign/import/export/email/payment/bulk/transition action visible to each role. | A control is left enabled because it exists in JSX without an audited operation class and receiver. |
| Mutation payload and authority | Submitted fields, table/RPC/Edge/Storage receiver, actor authorization, lifecycle legality, idempotency/audit requirements and reflected read. | A field is collected but discarded, a direct CRUD path violates RLS, or a workflow transition is treated as ordinary edit. |

## Global Receiver And Field Gate

The full source-row field register is maintained in `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`. The implementation sequence must consume it as follows:

| Pass | Projection or payload that must be fixed first | Receiver boundary that cannot be guessed during coding | First executable implementation slice after gate clearance |
| ---: | --- | --- | --- |
| 1 | Emergency request detail with transitions, chat, clinician assignment, payment and linked visit outcome | Emergency command RPCs, chat RPCs, assignment RPC, payment approval/decline and cash settlement authority | Build one detail/read projection with timeline/chat/assignment capability states and backend-derived action eligibility before altering lifecycle actions. |
| 2 | Wallet/payment/ledger view keyed by true organization and wallet identity | Stripe function authorization, webhook reflection, backend ledger writer and payout reservation | Remove automatic repair mutation and consolidate truthful read/pending/degraded states before enabling repaired money commands. |
| 3 | Facility detail containing taxonomy, media, import provenance, availability and hospital-scoped price identity | Availability RPC, provider/media policy, discovery persistence guard and quote receiver | Centralize facility reads and present the missing classification/provenance fields before modifying capacity or import writes. |
| 4 | Auth/profile/org/hospital identity chain and two separate verification lanes | Admin profile RPC supported columns, invite/auth receiver, guarded organization/onboarding/facility verification path | Remove unsupported save/action promises and make identities/lanes visible before repairing creation or verification commands. |
| 5 | Fleet/doctor/schedule projection with valid joined identity and active-request marker | Request-scoped telemetry, schedule table CRUD, clinician assignment command | Replace false fleet/schedule projections with table-backed reads before enabling corrected edits. |
| 6 | Visit projection marked administrative versus emergency-derived | Separate administrative authority, request/trigger-owned clinical lifecycle | Centralize reads and disable destructive edits for request-linked records before any CRUD extension. |
| 7 | Policy/billing/ticket/content/subscriber projection with policy and lifecycle classifications | Insurance/support authorized receiver, billing read lane, Storage proof, subscriber/email lifecycle receiver | Ship read/disabled/degraded truth surfaces first; do not preserve unauthorized authoring or subscriber controls. |
| 8 | Dashboard/search/activity/notification values labelled by verified source or unavailable state | Role-scoped aggregates, sequenced search projection, own-user notification/preference receiver, real trend generation and durable critical-audit writer | Remove fabricated/stub-success display truth, cross-role subscriber dependency and broad realtime ownership after preceding domain readers are stable. |

## Global Direct Boundary Gate

Stage 5 now maintains the direct boundary call-site register for UI, context, hook, utility and infrastructure files that access Supabase/Auth/Edge/Storage outside service owners. This register is part of implementation scope, not optional cleanup.

| Pass | Direct callers that must be reconciled in that pass | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | `EmergencyRequestsPage`, `EmergencyRequestModal`, `EmergencyDetailsModal`, `LocationCell`, emergency slices of `PageDataContext` | Emergency reads/payment projection/realtime move to the emergency owner; profile selection, geocoded display and external Google Maps handoff use bounded authorized coordinate projections rather than modal/cell-owned truth. |
| 2 | `WalletManagementPage`, wallet slices of `PageDataContext` | Finance read projection moves behind one wallet facade; ledger/money commands stay receiver-backed. |
| 3 | `HospitalsPage`, `HospitalModal` | Facility realtime/read refresh and discovery Edge interaction are owned by the facility/discovery boundary, not page/modal request assumptions. |
| 4 | `UsersPage`, `InviteUserModal`, `AuthContext`, `LoginPage`, `SetPasswordPage`, `SecurityModal`, `avatarUtils`, `SmartHeader`, `MobileNavMenu` | Identity KPI, invite and destructive workflows route through named authority; canonical Auth SDK operations are reviewed and may remain only as supported auth adapters; avatar fallback cannot leak operator identity without explicit policy. |
| 5 | `AmbulancesPage`, `AmbulanceModal`, `DoctorModal`, `LeafletMapRenderer` | Fleet counts, assignment availability and facility options use provider/fleet owners with valid relationship scope; third-party map tiles have a deliberate degradation contract independent of telemetry truth. |
| 6 | `VisitsPage` | Visit count/hydration/realtime moves to the visit model; emergency-linked records do not inherit page-owned edit/delete authority. |
| 7 | `HealthNewsManagementPage`, `HealthNewsPanel`, `SupportTicketsPanel`, `ContextAwareFAB`, `DynamicBottomBar`, `emails/ivisit106Campaign.js`, generated subscriber-email templates, `utils/runMigrations.js`, `utils/testDatabase.js` | Content/support/insurance/subscriber reads reuse scoped owners; global action controls do not mount protected list hooks until an authorized action surface needs them; email unsubscribe links route through one proven lifecycle receiver; browser-side SQL repair and diagnostics cannot serve product behavior. |
| 8 | `Analytics`, `Overview`, `useAnalytics`, remaining `PageDataContext`, `BentoHome`, `DashboardPanel`, `ContextPanel`, `ContextAwareFAB`, `DynamicBottomBar`, `QuickSearch`, `NotificationCenter`, `SettingsPage`, `PWAProvider`, `FeedbackProvider`, `serviceWorkerRegistration.js`, `lib/supabase.js` | Dashboard aggregation/realtime consumes stabilized domain truth; admin-only subscriber data is excluded from broader-role dashboards and hidden shell controls; search fields/failures are role-scoped and visible; notification/settings receivers, active PWA lifecycle, public asset delivery, dormant maintenance actions and generic subscriptions are deliberately owned, disabled or retired. |

## Global Route And Surface Gate

Stage 5 now also maintains the visible route, context-panel, primary-action and modal-receiver register. The active route guard is `App.js` plus `ProtectedRoute`; the unconsumed `RouteGuard` / `config/routes.jsx` pair is conflicting dormant configuration until explicitly consolidated.

| Pass | Visible surfaces requiring reconciliation | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | Emergency detail clinical-record action and emergency-route detail modal ownership | Selecting a linked clinical record from `/emergencies` opens a mounted, identity-correct surface or navigates deliberately; it cannot dispatch to an absent `VisitsPage` listener. |
| 2 | `/pricing` shared primary action and global financial modal invocation | A pricing surface cannot silently open wallet top-up; financial commands appear only in their intentional scoped flow with truthful pending/reflection state. |
| 3 | `/hospitals` role doctrine and `/pricing` operation meaning, report and Bulk Sync controls | Facility and rate operations have consistent allowed roles and distinct mounted/authorized command surfaces before facility/pricing cleanup closes. |
| 4 | Auth/onboarding paths, `/organizations`, `/users`, `/verification`, Quick Verify and own-user versus admin settings context | Route, navigation and context-panel roles use one explicit authority model; Quick Verify reaches a real queue state; dormant config is reconciled or retired. |
| 5 | `/map` access promise, Center Map and targeted recenter controls | Live map is visible only to the operational role permitted by its real route and telemetry scope, and each centering control calls a mounted map receiver with deliberate target semantics. |
| 6 | Visit-projection ownership used by cross-surface handoffs | Preserve the mounted visit-to-emergency receiver and supply a canonical request-derived visit projection for Pass 1's missing emergency-to-visit direction; request-derived records remain read-only where commanded upstream. |
| 7 | `/health-news`, `/insurance` and subscription Broadcast action | Advertised role access matches authorized receivers; unimplemented content/insurance/email actions are disabled rather than clickable no-ops. |
| 8 | Dashboard route doctrine, Report receiver, context-shell access, visible realtime/alert controls, notification settings and route/action loading feedback | The consolidated shell uses one route authority; dashboard Report reaches a mounted truthful projection or navigation; visible configuration has a receiver or is removed; own-user notification setting agrees with notification behavior; all actions acknowledge allowed, pending, unavailable and rejected states. |

## Global Pagination And Fetch Reliability Gate

Stage 5 maintains the route-list reliability register for the `13` paginated Console page surfaces found in source. A pagination control is not acceptance evidence unless its owner provides correct authorized dataset windows, counts, failure states and invalidation behavior.

| Pass | List/fetch surfaces requiring reconciliation | Required disposition before the pass can close |
| ---: | --- | --- |
| 1 | Emergency request list/count/payment enrichment | Keep the currently paged experience, but move paging, filter parity, current-page enrichment and invalidation behind one emergency read owner with explicit partial/failure states. |
| 2 | Wallet ledger/payment recent history and export | Name the `50`-row window as recent history or implement authoritative paged/export retrieval; no truncated preview can be presented as a complete ledger export. |
| 3 | Hospitals and pricing | Retain a paged hospital list only after removing global unbounded hospital KPI/bootstrap reads, replacing collection-derived hospital totals/capacity with scoped aggregates, and making hospital filters/sorts authoritative; replace all-hospitals/all-pricing client slicing with scoped server-paged price projection. |
| 4 | Users, organizations and two verification queues | Eliminate `1000`-row user truncation and unbounded organization/wallet loading; preserve queue paging while scoping realtime refetch to the active owned queue. |
| 5 | Ambulances, doctors and map operational feeds | Eliminate `1000`-row capped client pagination and derived incomplete totals; fleet/provider lists need server-backed paging truth, while map feed bounds and omitted-data state are explicit. |
| 6 | Visits | Move page-local paged query, enrichment and explicitly missing search into one visit read model with authoritative page/count/search and degraded relationship state. |
| 7 | Health news, insurance, subscribers and support tickets | Decouple content list availability from summary KPI failure; replace full-list/client slices and unpaged realtime refetch with scoped paged reads; distinguish unauthorized, empty and failed results. |
| 8 | Dashboard/analytics/search/map/notification consumers and shared fetch utilities | Define aggregate/feed limits and role-scoped aggregate slices, QuickSearch field exposure/cancellation/stale-response/partial-category behavior, and shell error/degraded rendering after domain list owners stabilize. |

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
| Emergency audit and communication projection | Missing surface/read owner | Add scoped status-transition timeline and chat room/message/read-state projection for operated requests. | Operator can see app-shared urgent communication/history without mutating append-only transition evidence directly. |
| Clinician assignment owner | Missing L5 capability | Add guarded `emergency_doctor_assignments`/assignment RPC projection and command contract. | Assigned clinician state is persisted and visible rather than inferred from a suggested doctor object. |
| Payment-aware invalidation | Read-only owner cleanup | Replace generic page-owned `payments` refetch with emergency/payment domain invalidation. | Payment event handling is documented at the owner boundary. |
| Action feedback guard | UI feedback | Add pending/disabled guards and backend-truth success copy for dispatch, complete, cash, and retry. | No success copy claims dispatch/completion/cash settlement before backend confirmation. |
| External location handoff | Exposure/reliability cleanup | Normalize coordinate display and Google Maps navigation through the authorized emergency projection. | Reverse-geocoded display and external navigation never disclose malformed/unapproved coordinates or imply tracking completion. |
| Fallback create contract | L5 repair | Align or retire `console_create_emergency_request` fallback relative to `create_emergency_v4`. | Fallback path either creates required linked truth or is not available for app-parity emergency creation. |
| Cash completion contract | L5 repair | Fix cash eligibility, processing order, settlement receiver, ledger/audit reflection. | Completing a cash emergency cannot show fee deducted unless ledger/payment truth confirms it. |

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
- Ensure dispatch UI derives eligibility from backend/current row state, not stale page state.
- Do not show route/tracking-ready states unless request identity, hospital/service context, route or ETA seed, pickup/patient context, and responder identity or hydrating state are available.
- Treat fallback ETA/route as degraded and visible, not confident arrival truth.

#### 1D. Cash Flow Repair

- Fix pre-dispatch cash eligibility to read the JSON result's `eligible` field and estimated-fee coverage.
- Stop using hospital UUID as organization fallback for cash eligibility or processing.
- Repair processing order so payment/fee settlement happens while the request is in a state accepted by the receiver, or move completion and settlement into one atomic backend path.
- Do not show "fee deducted" unless ledger/payment truth confirms it.
- If historical repair is needed, create a separate maintenance plan with read-only scope evidence first.

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

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Wallet read facade | Read-only owner cleanup | One service/query owner for wallet, ledger, payments, projection, Stripe status, cards. | `PageDataContext` and wallet page do not duplicate wallet/ledger/payment reads. |
| Maintenance isolation | UI/service cleanup | Move repair/backfill actions behind explicit maintenance guard or remove from ordinary UI. | Ordinary wallet refresh cannot mutate ledger/payment data. |
| Edge Function authority | L5 repair | Confirm and enforce `create-payment-intent`, `create-payout`, `manage-payment-methods`, `stripe-webhook` ownership/auth. | Organization-sensitive function calls prove actor authority before service-role operations. |
| Ledger/RLS policy | L5 repair | Align org-admin/platform-admin ledger read/write semantics. | UI wallet visibility matches deployed RLS and no unauthorized mutation is implied. |

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

#### 2E. Maintenance Isolation

- Remove automatic ledger backfill from ordinary wallet page mount.
- If retained, move repair to an admin-only maintenance command with:
  - explicit confirmation
  - dry-run/preview
  - audit log requirement
  - no execution in normal page refresh

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
| Scoped pricing UX | UI/service cleanup | Make hospital-scoped versus organization-scoped pricing explicit. | Multi-hospital orgs cannot silently write only earliest-hospital pricing. |
| Availability writer resolution | L5 repair | Route operational capacity/status/wait changes through `update_hospital_availability`; keep metadata edits separate. | Console capacity edits persist all app-visible fields intentionally. |
| Discovery authority | L5 repair | Restrict/authorize provider persistence and align modal request/response contract. | Discovery cannot write canonical provider rows without operator authority. |
| Provider catalog and media provenance | Missing capability/L5 repair | Add authorized `providers` classification and `hospital_media` provenance handling to facility operations. | Console can operate app-visible provider eligibility and media source truth, not only the base hospital row. |
| Import provenance visibility | Read owner repair | Surface `hospital_import_logs` state and failures for import actions. | Imported/pending/failed provider writes have durable operator-visible provenance. |

### Detailed Checklist

#### 3A. Facility Read Model

- Centralize hospital list/detail/count and recent facility summaries.
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
- Read-only SQL proof for trigger/policy assumptions before L5 availability/discovery repair.
- App quote comparison for selected hospital pricing after implementation.

## Pass 4 - Identity, Verification, And Onboarding Authority

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/UsersPage.jsx`
- `frontend/src/components/modals/UserModal.jsx`
- `frontend/src/components/modals/InviteUserModal.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/modals/VerificationModal.jsx`
- `frontend/src/components/navigation/SmartHeader.jsx`
- `frontend/src/components/navigation/MobileNavMenu.jsx`
- `frontend/src/lib/avatarUtils.js`
- `frontend/src/components/onboarding/OnboardingWizard.jsx`
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
| Auth-backed user creation | L5 repair | Replace raw `profiles.insert` creation with invite/auth-backed identity. | Console-created users have auth identity or are explicitly invite-pending records. |
| Verification lane split | L5 repair | Separate profile/BVN verification from facility dispatch certification. | UI copy/action cannot imply dispatch eligibility from the wrong receiver. |
| Onboarding identity repair | L5 repair | Fix hospital-as-organization insert and `profiles.organization_id` assignment. | Onboarding writes valid organization/hospital/profile relationships under RLS. |
| Avatar privacy projection | UI/media exposure cleanup | Remove identity-bearing external avatar fallback or define an approved non-identifying fallback policy. | Global/user identity surfaces do not transmit username/profile identity to third-party avatar providers without explicit disposition. |

### Detailed Checklist

#### 4A. Admin/Profile Service Boundary

- Move direct page admin delete calls into `adminService` or `profilesService`.
- Consolidate role/status/suspend/activate/delete mutations behind one authorized receiver family.
- Ensure admin profile edit fields match the receiver:
  - do not render editable email/avatar/name-component fields as saveable unless the receiver persists them
  - route email/auth identity changes through Supabase Auth/admin flow if needed
- Fix display ID bulk resolution to be entity-aware before relying on profile/provider display IDs.
- Replace or privacy-scope third-party generated-avatar fallback URLs used in identity/header surfaces.

#### 4B. Auth-Backed Creation And Invite

- Treat raw `profiles.insert` as unsafe unless the ID is proven to be an existing auth user.
- Prefer invite/auth creation for new console users.
- Move `invite-user` Edge Function invocation out of modal-local code.
- Document deployed function ownership and expected invite record/profile effects.

#### 4C. Verification Lane Split

- Keep hospital/org verification as the dispatch-authority lane.
- Rename or redesign provider/person BVN verification so it does not imply facility dispatch eligibility.
- Remove or quarantine stale onboarding approval helpers that write absent fields.
- Ensure provider approval has an authorized receiver if it must mutate another user's profile.

#### 4D. Onboarding Identity Repair

- Create or identify real `organizations` record creation.
- Create/claim hospital under organization rather than storing hospital ID in `profiles.organization_id`.
- Ensure RLS-authorized facility claim or creation receiver exists.
- Preserve onboarding draft state separately from committed organization/hospital truth.

### Pass 4 Verification

- Role/admin mutation tests for profile update/delete/role/status.
- Invite flow smoke with non-production account.
- Verification queue browser smoke for provider and organization tabs.
- Read-only schema proof for any fields used by onboarding/verification before enabling writes.
- RLS tests for org-admin, provider, platform admin, and ordinary user paths.

## Pass 5 - Provider Operations, Telemetry, Doctors, And Scheduling

### Primary Files To Inspect Before Editing

- `frontend/src/components/pages/AmbulancesPage.jsx`
- `frontend/src/components/modals/AmbulanceModal.jsx`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/modals/DoctorModal.jsx`
- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/components/pages/GodModeMap.jsx`
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
| Ambulance telemetry owner | L5 repair | Align generic location/status writes with active-request telemetry contract. | Responder map updates use request-coupled receiver when dispatch/tracking state is affected. |
| Doctor/profile automation | L5 repair | Decide doctor CRUD relationship to profile-trigger automation. | Manual doctor creation cannot create duplicate/unlinked directory truth. |
| Schedule ownership | L5 repair | Implement org-authorized `doctor_schedules` read/CRUD/conflict/statistics and remove status-derived shift fiction. | UI no longer collects shift fields that are discarded. |
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
- Add active-call guard before driver reassignment if assignment changes can trigger failover behavior.
- Move hospital lookup and occupied driver/ambulance lookup out of `AmbulanceModal` into the ambulance/provider service layer.

#### 5B. Responder Telemetry

- Preserve `console_update_responder_location` as canonical for live request tracking.
- Guard or retire generic `useAmbulances.updateLocation()` when an ambulance has an active request.
- Ensure map telemetry updates both request responder truth and linked ambulance projection through the request-scoped receiver.
- Keep map realtime as projection, not canonical emergency/ambulance state owner.
- Preserve attribution and define degraded rendering when third-party base tiles are unavailable; operational markers and telemetry retain independent truth status.

#### 5C. Doctor Creation And Profile Link

- Prefer linking an existing provider profile before creating a doctor row.
- Avoid create-then-invite flow that can create an unlinked doctor row and later trigger a profile-linked row.
- Treat name/email/phone and profile-linked facility identity as profile-projected fields for linked doctors.
- Treat specialty, license, and operational availability status as doctor-directory fields unless a later trigger contract explicitly projects them from profiles.
- Update UI copy so "invite" and "create directory row" are not presented as one guaranteed atomic operation unless backend makes it so.

#### 5D. Scheduling Ownership

- Implement actual doctor-shift CRUD using `doctor_schedules`, the existing org-authorized receiver.
- Read and write actual stored rows for date/time/shift/availability; remove the unsupported `notes` control unless a receiver is introduced.
- Keep `doctors` availability/status as operational state rather than schedule persistence.
- Do not imply ambulance crew scheduling until a persisted authorized receiver exists.

### Pass 5 Verification

- Browser smoke on `/ambulances`, `/doctors`, scheduling modal, and `/map`.
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

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Visits read model | Read-only owner cleanup | One owner for count/search/hydration and hospital/profile fallback. | `VisitsPage` does not own direct table count/search shape. |
| Request-derived guard | Service/UI cleanup | Mark emergency-derived visits as source-owned. | Manual CRUD cannot silently fight emergency-to-visit sync. |
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
| Support hook reuse | Read-only owner cleanup | Reuse support service/hook across page/panel. | Duplicate support realtime/direct reads are removed. |
| Subscriber facade | Service cleanup | Consolidate subscriber/subscription services, preserve fixed-field payload repair, and restrict commands to policy/receiver-backed authority. | Subscriber payload remains schema-current and unauthorized management controls are absent. |
| Email lifecycle owner | L5 repair | Define welcome/custom/bulk/unsubscribe state machine. | Welcome email cannot be sent twice by competing lifecycle writers. |
| Insurance billing outcome owner | Missing scoped surface | Expose authorized `insurance_billing` result/claim context alongside policy and completed-care support flows. | Admin/hospital support can inspect trigger-created billing outcomes without inventing policy mutation authority. |
| Hidden shell acquisition removal | Read-only owner cleanup | Stop global FAB/bottom-bar containers from mounting insurance/support/subscriber full-list hooks solely to supply unopened modal callbacks. | Unrelated routes and hidden viewport controls perform no protected care/subscriber reads or channels. |

### Detailed Checklist

#### 7A. Health News

- Treat the current `health_news` receiver as a curated published feed, not an authored article CMS: the current table contract and public app read path do not prove article-body authoring or console write policy.
- Remove or relabel editor fields not persisted:
  - description
  - content
  - icon
- Do not expose authored-article editing unless a later contract pass adds the receiver fields and authorized authoring policy first.
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
- `frontend/src/components/navigation/ContextPanel.jsx`
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
- `frontend/src/services/preferencesService.js`
- `frontend/src/services/supabaseHelpers.js`
- `frontend/src/App.js`
- `frontend/src/components/common/ProtectedRoute.jsx`
- `frontend/src/components/common/Skeletons.jsx`
- `frontend/src/components/common/ConsoleStartupOverlay.jsx`
- `frontend/src/index.js`
- `frontend/src/serviceWorkerRegistration.js`
- `frontend/src/components/pwa/InstallPrompt.jsx`
- `frontend/src/components/pwa/OfflineIndicator.jsx`
- `frontend/src/components/pwa/UpdateNotification.jsx`
- `frontend/src/contexts/PWAContext.jsx`
- `frontend/src/contexts/FeedbackContext.jsx`
- `frontend/src/components/ui/skeleton.jsx`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Dashboard summary facade | Read-only owner cleanup | Feed dashboard/Bento/Overview from domain selectors. | `PageDataContext` stops owning cross-domain server truth. |
| Analytics service derivation and role scope | Read-only owner cleanup | Move raw reads/chart derivation out of analytics page and exclude admin-only subscriber projections from broader-role analytics loads. | Analytics page renders from authorized service/hook outputs and a provider route cannot fail because subscriber analytics are denied. |
| Mock/demo cleanup | UI/service cleanup | Remove production mock defaults or connect visible demo preference. | A failed fetch cannot flip the authenticated shell into mock mode. |
| Realtime dedupe | Query cleanup | Remove global and duplicate page/panel channels after domain hooks own reads. | One owner per table/event family, with scoped map/modal exceptions. |
| Route/action feedback | UI cleanup | Add route skeleton and pending guards for high-risk actions. | Navigation and commands acknowledge intent immediately without false completion claims. |
| Shell utility feedback and debug disposition | UI/accessibility cleanup | Review always-mounted PWA/feedback surfaces and remove or source the visible debug version marker. | Install/offline/update prompts remain truthful; audio/haptic effects have deliberate accessibility behavior; production shell shows no hard-coded debug copy. |
| Search/trend truth and privacy | L5/read-projection repair | Scope searchable categories/fields by role, sequence parallel queries and replace success-returning stub regeneration or label unavailable state. | Shell search distinguishes no-match, partial, denied and failed results and cannot present stub trend regeneration as real. |
| Notifications/preferences/settings | UI/read-owner cleanup | Align user-scoped notification read/mark behavior with a real settings receiver and preserve intentional notification action metadata. | An unwired switch or compatibility payload loss cannot misstate notification behavior. |

### Detailed Checklist

#### 8A. Dashboard And PageDataContext Reduction

- Inventory every consumer of `usePageData`.
- Replace domain-owned data in `PageDataContext` with:
  - shell summary selectors
  - or explicit domain hooks in the consuming page/panel
- Remove production mock initial records and global `setUseMockData(true)` fallback behavior.
- Remove operational dashboard dependence on mock/demo fallback. Patient app demo preference is not a Console operational-data switch.

#### 8B. Analytics Truth

- Move raw reads from `Analytics.jsx` into `analyticsService` or `useAnalytics`.
- Do not include subscriber analytics in a provider/org/sponsor aggregate load unless the receiver and RLS prove access for that audience; admin-only subscriber metrics remain an isolated admin slice.
- Replace fixed metric-looking constants with:
  - real values
  - unavailable state
  - or demo-labelled values
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
- Reuse mobile stable-list and skeleton patterns for desktop/web route loads where appropriate.
- Add pending/disabled state to bulk/destructive commands that still rely only on toast after click.
- Remove or wire the dashboard realtime switch and alert thresholds; visible local-only state is not operational configuration.
- Wire or remove the visible settings notification switch, and define whether compatibility notifications lacking action metadata are non-actionable.
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
- PWA/feedback shell check for install/update/offline actions, debug-marker removal or authoritative version source, and accessibility preference behavior.

## Implementation Checklist Template

Before any pass starts, create or update a narrow checklist with:

| Field | Required content |
| --- | --- |
| Scope | Exact pages/services/RPCs/functions touched. |
| Source truth | Stage 2/3/4 docs and source files read. |
| Stage 5 coverage | Every service listed for the pass is either included, explicitly deferred, or marked out of scope with a reason. |
| Operation class | Per user action: scoped read projection, authorized table CRUD, workflow command, derived read-only evidence, or excluded boundary. |
| Field/receiver gate | Exact high-risk columns rendered or submitted, their source table, and the receiver/command or read projection allowed to own them. |
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
| Runtime-truth closure gate | For every entity and user-visible claim in pass scope, Stage 5 traces backend source to all consumers and each affected route/action through all globally mounted and local acquisition/receiver paths. | A route-level paged hospital query is accepted while its globally mounted KPI context still loads a capped full collection and displays it as total network truth. |
| Surface exposure/operation gate | Every in-scope route, panel, modal, responsive variant and export records rendered fields and exposed controls by role, proves read exposure authority, and assigns each action/field to authorized CRUD, workflow command, read-only evidence or disabled/excluded status. | Insurance/admin fields render under unproved RLS or an editor submits fields the canonical receiver does not persist. |
| Direct-boundary gate | The Stage 5 direct call-site register assigns every active non-service Supabase/Auth/Edge/Storage access in pass scope to move, retain as canonical adapter, disable, or retire. | A service facade is introduced while the page or context continues to read the same tables, own the same channel, invoke `exec_sql`, or claim Storage delivery independently. |
| Edge topology gate | The Stage 5 receiver register proves the addressed Edge slug, deployable source owner, authentication rule, durable writer/reflection path and any cross-repo ownership for every command, delivered link, webhook or background worker in pass scope. | Console implements an invite, email unsubscribe, wallet or discovery promise from a README/category folder while the addressed slug is missing, app-owned or behaviorally different. |
| Route/surface gate | The Stage 5 visible-surface register assigns route entitlement, navigation and panel visibility, primary action and mounted modal receiver for every operated flow in pass scope. | An org admin sees an inaccessible insurance route, a pricing action opens wallet top-up, or the emergency clinical-record button dispatches to no mounted receiver. |
| Pagination/fetch gate | The Stage 5 reliability register classifies each in-scope list/search/export as server-paged, deliberately bounded, detail-only or unavailable, and names count/filter/sort/enrichment/realtime/error behavior. | A `1000`-row client cap is displayed as the full fleet/user total, an unpaged list is presented with paging controls, or a KPI failure blanks an otherwise valid operational list. |
| Receiver gate | The Stage 2 contract exhibit names the table/RPC/Edge Function that will receive the mutation or read; an RPC source-name match proves inventory only, not authorization or behavioral correctness. | UI action says "cash fee deducted" but no backend receiver is confirmed to debit/credit ledger truth, or a present RPC is accepted without field/role/transition proof. |
| Operation-class gate | The table-policy/RPC matrices say whether each control is read projection, ordinary CRUD, workflow command, derived read-only evidence, or excluded. | A modal exposes Edit/Delete for a transition, ledger, billing-result, patient-owned, or command-owned row merely because it is selectable. |
| Field-contract gate | The table matrix/pass subplan names the exact high-risk identity, status, amount, eligibility, evidence, and linkage fields used by the surface. | Implementation discovers while coding that `hospital_id` received an organization UUID or an edited field is not persisted by the receiver. |
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
