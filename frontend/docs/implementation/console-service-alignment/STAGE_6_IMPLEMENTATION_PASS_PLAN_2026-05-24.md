# Stage 6 Console Alignment Implementation Pass Plan - 2026-05-24

## Status

Initial implementation-pass plan. Planning only; no product, database, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This plan follows the Stage 2 contract exhibits, Stage 3 capability gaps, and Stage 4 L5 ownership matrix. Each pass must be narrowed into its own implementation checklist before code changes begin.

## Planning Rules

- Do not start implementation from a page symptom alone. Start from the source-of-truth owner named in Stage 4.
- Separate read-only owner cleanup from L5 backend contract repair.
- Do not bundle emergency/payment/backend repair with dashboard polish.
- Preserve user changes in the worktree and avoid doc-only micro-commits.
- Commit only when the relevant evidence or implementation pack is coherent and resumable.

## Pass Order

| Order | Pass | Primary reason | Earliest safe work | Requires backend/RPC/Edge repair before UI truth |
| ---: | --- | --- | --- | --- |
| 1 | Emergency lifecycle and cash/payment truth | User safety, dispatch legality, and money movement meet in this path. | Centralize emergency reads/list/count/search; add safer pending/feedback states; stop page-level generic payment refetch. | Fallback emergency create parity, cash settlement, completion legality, tracking-ready route/ETA truth. |
| 2 | Wallet, payout, Stripe functions, and ledger authority | Money movement and ledger correctness must not depend on UI repair/backfill paths. | Create wallet read facade; remove duplicate context/page/service reads; isolate maintenance actions. | Edge Function authorization, wallet reservation/sufficiency, ledger RLS/mutation policy, webhook reflection. |
| 3 | Hospitals, availability, discovery, and pricing scope | Dispatch and app checkout depend on facility truth. | Centralize hospital/pricing reads; mark discovery fallback read-only; expose hospital-scoped pricing honestly. | Availability writer contract, provider taxonomy, dispatch eligibility, public discovery writes, multi-hospital org pricing semantics. |
| 4 | Identity, verification, and onboarding authority | Access, ownership, and dispatch certification are long-lived defects. | Move admin metrics/destructive RPCs behind services; document direct Auth/MFA exceptions; connect demo preference if retained. | Auth-backed profile creation, facility dispatch verification, onboarding hospital/org identity repair. |
| 5 | Provider operations, ambulance telemetry, doctors, and scheduling | Dispatch operations need accurate responder and clinician state. | Move counts/lookups/modal reads to services; split map telemetry projection from CRUD; consolidate schedule read model. | Active-request-coupled telemetry, driver/profile assignment mirror, doctor/profile automation, `doctor_schedules` ownership. |
| 6 | Visits ownership and request-derived history | Patient history should follow emergency truth. | Create visits read model; centralize count/search/hydration; guard request-derived rows. | Canonical repair/creation strategy for fallback emergency rows and request-derived visit lifecycle. |
| 7 | Content, support, subscribers, and email | Patient/admin communication surfaces need clear lifecycle and RLS. | Consolidate health-news KPIs, support hook reuse, subscriber services, degraded flags. | Subscriber lifecycle owner, schema-current writes, welcome/unsubscribe/campaign state, support/content policies. |
| 8 | Analytics, search, dashboard shell, realtime, and feedback polish | Dashboards should summarize fixed truth, not duplicate drift. | Remove production mock defaults, move analytics derivations to services, replace blank route fallback, dedupe realtime. | Stub trend regeneration, fallback analytics truth, audit failure policy. |

## Pass 1 - Emergency Lifecycle And Cash/Payment Truth

### Inputs

- Stage 2 emergency/payment/capacity map.
- Emergency/payment/capacity contract chart.
- Ownership trigger proof for emergency-to-visit creation.
- Read-only live confirmation matrix.
- Stage 3 page/realtime/feedback findings.
- Stage 4 emergency, cash/payment, visits, wallet, and map rows.

### Primary Files To Inspect Before Editing

Console UI and hooks:

- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/modals/EmergencyRequestModal.jsx`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
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
| Payment-aware invalidation | Read-only owner cleanup | Replace generic page-owned `payments` refetch with emergency/payment domain invalidation. | Payment event handling is documented at the owner boundary. |
| Action feedback guard | UI feedback | Add pending/disabled guards and backend-truth success copy for dispatch, complete, cash, and retry. | No success copy claims dispatch/completion/cash settlement before backend confirmation. |
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
- Remove global emergency realtime ownership from `PageDataContext` only after page/domain reads are stable.

#### 1B. Create Contract Decision

- Decide whether console create is:
  - app-lifecycle emergency creation through `create_emergency_v4`
  - administrative emergency record creation through `console_create_emergency_request`
  - or two explicit UI modes with different labels and field sets
- If using `create_emergency_v4`, ensure UI fields that remain visible are actually sent and persisted:
  - `bed_number`
  - payment method/payment context
  - total amount/currency if supported
  - status only if the receiver intentionally accepts it
- If `console_create_emergency_request` remains available, document or repair:
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
| Availability writer decision | L5 repair | Choose canonical capacity/status writer preserving normalization and ER wait. | Console capacity edits persist all app-visible fields intentionally. |
| Discovery authority | L5 repair | Restrict/authorize provider persistence and align modal request/response contract. | Discovery cannot write canonical provider rows without operator authority. |

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

#### 3B. Availability Writer Choice

- Decide whether console edits use:
  - `update_hospital_by_admin`
  - `update_hospital_availability`
  - a new console availability RPC
  - or separate administrative profile edit versus operational availability edit modes
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
- `frontend/src/components/onboarding/OnboardingWizard.jsx`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/verificationService.js`
- `frontend/src/services/orgVerificationService.js`
- `frontend/src/services/onboardingService.js`
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

### Detailed Checklist

#### 4A. Admin/Profile Service Boundary

- Move direct page admin delete calls into `adminService` or `profilesService`.
- Consolidate role/status/suspend/activate/delete mutations behind one authorized receiver family.
- Ensure admin profile edit fields match the receiver:
  - do not render editable email/avatar/name-component fields as saveable unless the receiver persists them
  - route email/auth identity changes through Supabase Auth/admin flow if needed
- Fix display ID bulk resolution to be entity-aware before relying on profile/provider display IDs.

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
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/driverManagementService.js`
- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/services/emergencyResponseService.js`
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
| Schedule ownership | L5 repair | Decide `doctor_schedules` versus status-only scheduling model. | UI no longer collects shift fields that are discarded. |

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

#### 5C. Doctor Creation And Profile Link

- Prefer linking an existing provider profile before creating a doctor row.
- Avoid create-then-invite flow that can create an unlinked doctor row and later trigger a profile-linked row.
- Decide which fields are profile-projected versus directory-owned:
  - name/email/phone
  - hospital
  - specialty
  - license
  - status
- Update UI copy so "invite" and "create directory row" are not presented as one guaranteed atomic operation unless backend makes it so.

#### 5D. Scheduling Ownership

- Choose one product meaning:
  - actual schedule CRUD using `doctor_schedules`
  - or availability/status management without date/time shift promises
- If implementing `doctor_schedules`, read and write actual rows with date/time/shift/notes.
- If keeping status-only, remove or relabel date/time/shift/notes fields so the UI does not claim persisted scheduling.
- Do not imply ambulance crew scheduling until a receiver exists.

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
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/subscribersService.js`
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
| Subscriber facade | Service cleanup | Consolidate subscriber/subscription services and remove runtime schema fallback writes. | Subscriber payload is pinned to current schema truth. |
| Email lifecycle owner | L5 repair | Define welcome/custom/bulk/unsubscribe state machine. | Welcome email cannot be sent twice by competing lifecycle writers. |

### Detailed Checklist

#### 7A. Health News

- Decide whether `health_news` is:
  - curated outbound link/news feed
  - or authored article CMS
- If curated feed, remove or relabel editor fields not persisted:
  - description
  - content
  - icon
- If authored CMS, add/pin the receiver fields and authoring policies before UI claims save.
- Move page and panel KPI/category reads into one health-news summary service.
- Obtain policy proof before draft/read/write authoring work.

#### 7B. Support Tickets

- Align patient app ticket creation fields with console receiver fields.
- Fix or remove app-side `admin_response` insert expectation if the receiver lacks it, or add a supported receiver field intentionally.
- Decide whether org-admin/provider support operations are allowed; if yes, use guarded RPC/RLS rather than direct browser table assumptions.
- Keep `useSupportTickets` as the page/panel data owner and remove duplicate panel direct channels.

#### 7C. Subscribers And Email

- Choose one console subscriber facade.
- Remove runtime schema fallback writes that delete columns after errors.
- Define lifecycle state machine:
  - subscribed/new
  - welcome pending
  - welcome sent
  - unsubscribed
  - custom/bulk campaign sent
- Make email send operations idempotent or visibly retry-safe.
- Ensure `sendWelcome`, `process-subscribers`, webhook unsubscribe, and UI sends do not compete over the same flags.

#### 7D. Notifications

- Keep console notification center scoped to operator activity.
- If patient app clear/delete is in scope, add policy/receiver support separately rather than changing console UI only.
- Preserve notification `action_data` unless receiver shape intentionally lacks it and UI is prepared for missing actions.

### Pass 7 Verification

- Service tests for subscriber payload and email lifecycle state transitions.
- Browser smoke on health-news, support tickets, subscriptions.
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
- `frontend/src/services/trendingTopicsService.js`
- `frontend/src/services/analyticsAutomationService.js`
- `frontend/src/services/activityService.js`
- `frontend/src/App.js`
- `frontend/src/components/common/ProtectedRoute.jsx`
- `frontend/src/components/common/Skeletons.jsx`
- `frontend/src/components/ui/skeleton.jsx`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`

### Work Packages

| Package | Type | Target | Acceptance gate |
| --- | --- | --- | --- |
| Dashboard summary facade | Read-only owner cleanup | Feed dashboard/Bento/Overview from domain selectors. | `PageDataContext` stops owning cross-domain server truth. |
| Analytics service derivation | Read-only owner cleanup | Move raw reads/chart derivation out of analytics page. | Analytics page renders from service/hook outputs. |
| Mock/demo cleanup | UI/service cleanup | Remove production mock defaults or connect visible demo preference. | A failed fetch cannot flip the authenticated shell into mock mode. |
| Realtime dedupe | Query cleanup | Remove global and duplicate page/panel channels after domain hooks own reads. | One owner per table/event family, with scoped map/modal exceptions. |
| Route/action feedback | UI cleanup | Add route skeleton and pending guards for high-risk actions. | Navigation and commands acknowledge intent immediately without false completion claims. |
| Search/trend truth | L5 repair | Replace success-returning stub regeneration or label unavailable state. | Analytics/search UI cannot present stub trend regeneration as real. |

### Detailed Checklist

#### 8A. Dashboard And PageDataContext Reduction

- Inventory every consumer of `usePageData`.
- Replace domain-owned data in `PageDataContext` with:
  - shell summary selectors
  - or explicit domain hooks in the consuming page/panel
- Remove production mock initial records and global `setUseMockData(true)` fallback behavior.
- If demo mode remains, wire it to `preferencesService.demo_mode_enabled` and label all affected dashboard panels.

#### 8B. Analytics Truth

- Move raw reads from `Analytics.jsx` into `analyticsService` or `useAnalytics`.
- Replace fixed metric-looking constants with:
  - real values
  - unavailable state
  - or demo-labelled values
- Keep finance analytics sourced from wallet owner after Pass 2, not direct parallel reads.
- Ensure sponsor/admin dashboards distinguish inference from verified table evidence.

#### 8C. Search And Trends

- Keep quick-search trending read path if it continues to use valid read RPC.
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
- Review success copy on every command touched by prior passes.

### Pass 8 Verification

- Browser smoke across dashboard, analytics, route transitions, and context panels.
- Mobile and desktop viewport checks for skeleton/pending states.
- Console error scan after route changes.
- Encoding scan for touched search/analytics files.
- Analytics service tests or fixture-based checks for unavailable/demo states.

## Implementation Checklist Template

Before any pass starts, create or update a narrow checklist with:

| Field | Required content |
| --- | --- |
| Scope | Exact pages/services/RPCs/functions touched. |
| Source truth | Stage 2/3/4 docs and source files read. |
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
| Receiver gate | The Stage 2 contract exhibit names the table/RPC/Edge Function that will receive the mutation or read. | UI action says "cash fee deducted" but no backend receiver is confirmed to debit/credit ledger truth. |
| Scope gate | The implementation checklist names files touched and files explicitly excluded. | Wallet top-up fix also edits dashboard analytics and subscriber emails. |
| Data-safety gate | The checklist says whether the pass is read-only cleanup, UI-only, L5 backend repair, schema/RLS work, Edge Function work, or historical repair. | A migration/backfill is run while the pass was only approved for service cleanup. |
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

Current status: still uncommitted by design. The plan is detailed enough for implementation-pass selection, but not a reason for a standalone micro-commit.

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
