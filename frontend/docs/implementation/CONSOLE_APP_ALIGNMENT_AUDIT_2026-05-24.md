# Console-App Alignment Audit - 2026-05-24

## Status

Active target plan. This document exists so the next engineer or agent can continue the console alignment work without rediscovering the intent.

The detailed staged audit program now lives in `frontend/docs/implementation/CONSOLE_ALIGNMENT_AUDIT_PROGRAM_2026-05-24.md`. Stage 1 database truth work has started in `frontend/docs/implementation/STAGE_1_DATABASE_TRUTH_AUDIT_2026-05-24.md`.

## Intent

Make `ivisit-console` operationally serve the current `ivisit-app`.

The work is not a broad redesign pass. The first concern is data flow parity: schema, RPCs, service methods, CRUD surfaces, status transitions, realtime invalidation, and admin/provider operations that keep the patient app trustworthy.

## Source Doctrine

Use these sources in this order when a console decision is unclear:

1. `C:/Users/Dyrane/Documents/GitHub/ivisit-app/AGENTS.md`
2. `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/docs/REFERENCE.md`
3. `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/`
4. `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/`
5. `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/tests/validation/table_flow_trace_*.md`
6. `frontend/supabase/docs/REFERENCE.md`
7. `frontend/docs/architecture/CONSOLE_OPTIMISATION_MASTER_PLAN.md`
8. `frontend/docs/architecture/CONSOLE_GRAND_REFACTOR_PLAN.md`

When these disagree, prefer the current app schema and runtime flow over older console status docs.

## Non-Goals For This Pass

- Do not rewrite the whole console shell.
- Do not replace every provider or context at once.
- Do not turn this into a visual redesign before CRUD and RPC parity are known.
- Do not add new tables, RPCs, or UI abstractions until reuse and drift have been checked.
- Do not hide missing data behind mocks when the app depends on the real contract.

## Current Console Facts

- `frontend/src/App.js` already mounts `QueryClientProvider` and lazy routes.
- `frontend/src/App.js` still has direct `window.innerWidth` reads and a mostly blank suspense fallback.
- `frontend/src/contexts/PageDataContext.jsx` remains a broad data orchestrator with many service calls, mock fallbacks, and derived stats.
- `frontend/src/services/emergencyService.js` already calls `create_emergency_v4`, `console_create_emergency_request`, `console_update_emergency_request`, `console_dispatch_emergency`, `console_complete_emergency`, `console_cancel_emergency`, `approve_cash_payment`, `decline_cash_payment`, `retry_payment_with_different_method`, and `console_update_responder_location`.
- `frontend/src/services/walletService.js` covers organization wallet, main wallet, ledger, cash processing, and Stripe organization status flows.
- `frontend/src/services/pricingService.js` already uses `upsert_service_pricing`, `delete_service_pricing`, `upsert_room_pricing`, and `delete_room_pricing`.
- `frontend/src/services/supabaseHelpers.js` and several docs contain mojibake. Treat this as a hygiene risk when editing nearby lines.
- The app repository already contains table-flow traces that scan db, app, and console references. Reuse them before creating a new inventory script.

## Alignment Principle

The console should be the operational surface for the app, not a second product with parallel assumptions.

That means:

- App tables define console data shape.
- App RPCs define safe mutations where RLS or multi-table side effects matter.
- Console pages should call service functions, not embed new direct Supabase logic unless the service layer is missing.
- Server reads should move toward TanStack Query query functions and stable keys.
- `PageDataContext` should remain compatibility glue while high-risk flows are moved into focused services/hooks.
- Realtime should invalidate query data. It should not own durable UI state.
- UI polish is allowed when it clarifies state, pending work, failure, or action outcome.

## Core Contract Map

These contracts are the first alignment target because the patient app depends on them directly.

| Domain | App contract | Console target |
| --- | --- | --- |
| Identity | `profiles`, `preferences`, `medical_profiles`, `emergency_contacts`, `patient_wallets` | Admin/provider profile CRUD, verification, wallet visibility, no profile-shape drift |
| Organizations | `organizations`, `hospitals`, `doctors`, `ambulances`, `organization_wallets` | Provider onboarding, hospital capacity, doctor scheduling, ambulance fleet, org wallet operations |
| Emergency | `emergency_requests`, `emergency_status_transitions`, `emergency_doctor_assignments`, `payments`, `visits` | Ambulance-only, bed-only, paired flow, dispatch, completion, cancellation, payment approval |
| Pricing | `service_pricing`, `room_pricing`, ambulance `base_price`, org fee fields | CRUD for effective pricing with app-compatible cost preview |
| Payments | `payment_methods`, `payments`, `wallet_ledger`, `ivisit_main_wallet`, Stripe Edge Functions | Cash approval/decline, wallet ledger audit, Stripe status visibility, no manual ledger shortcuts |
| Discovery | `search_events`, `search_selections`, `trending_topics`, `health_news`, `subscribers` | Admin analytics and content controls that match app discovery surfaces |
| Support | `support_tickets`, `support_faqs`, `notifications`, `user_activity`, `admin_audit_log` | Operator response, notification traceability, audit-safe actions |

## Required RPC And Edge Function Parity

Treat these as the mutation surface to verify before touching UI:

- `create_emergency_v4`
- `patient_update_emergency_request`
- `console_create_emergency_request`
- `console_update_emergency_request`
- `console_dispatch_emergency`
- `console_complete_emergency`
- `console_cancel_emergency`
- `console_update_responder_location`
- `approve_cash_payment`
- `decline_cash_payment`
- `retry_payment_with_different_method`
- `process_cash_payment`
- `process_cash_payment_v2`
- `process_wallet_payment`
- `process_visit_tip`
- `record_visit_cash_tip`
- `calculate_emergency_cost_v2`
- `nearby_hospitals`
- `nearby_ambulances`
- `nearby_providers`
- `update_hospital_availability`
- `upsert_service_pricing`
- `delete_service_pricing`
- `upsert_room_pricing`
- `delete_room_pricing`
- `get_entity_id`
- `log_user_activity`
- `notify_cash_approval_org_admins`
- `manage-payment-methods`
- `create-payment-intent`
- `stripe-webhook`
- `bootstrap-demo-ecosystem`

If the console has a direct table write where the app uses an RPC for the same business action, verify RLS, audit logging, wallet side effects, status transitions, notifications, and visit/payment rows before keeping it.

## High-Risk Flow Targets

### 1. Ambulance-only Emergency

Target:

- Patient app creates request through `create_emergency_v4`.
- Console lists the request with canonical status and payment state.
- Console dispatches through `console_dispatch_emergency`.
- Responder location updates through `console_update_responder_location`.
- Console completes or cancels through the console RPCs.
- App sees the same status, responder metadata, ETA fields, payment status, and visit linkage.

Check files:

- App: `services/emergencyRequestsService.js`
- App: `services/paymentService.js`
- Console: `frontend/src/services/emergencyService.js`
- Console: `frontend/src/services/emergencyResponseService.js`
- Console: `frontend/src/components/pages/EmergencyRequestsPage.jsx`

### 2. Bed-only Emergency

Target:

- Bed request stores hospital, bed type, bed count, cost, and patient snapshot in app-compatible fields.
- Console capacity controls update hospital availability and room/pricing rows without breaking app cost selection.
- Completion or cancellation updates `emergency_requests`, `visits`, and `payments` through RPC-backed paths.

Check files:

- App: `services/pricingService.js`
- App: `services/serviceCostService.js`
- Console: `frontend/src/services/bedManagementService.js`
- Console: `frontend/src/services/pricingService.js`
- Console: `frontend/src/components/pages/HospitalsPage.jsx`

### 3. Paired Ambulance Plus Bed Flow

Target:

- Request state supports hospital assignment and ambulance assignment together.
- Console does not collapse paired service into only a ride or only a bed.
- Dispatch preserves hospital, responder, ETA, cost breakdown, and payment rows.
- Completion produces a visit that can be read in app visits surfaces.

Check files:

- App: `services/emergencyRequestsService.js`
- App: `services/visitsService.js`
- Console: `frontend/src/services/emergencyService.js`
- Console: `frontend/src/services/driverManagementService.js`
- Console: `frontend/src/services/visitsService.js`

### 4. Payment Approval And Wallet Flow

Target:

- Cash approvals use `approve_cash_payment` or `process_cash_payment*`.
- Declines use `decline_cash_payment`.
- Wallet ledger writes are owned by RPCs or verified service paths, not page-level ad hoc inserts.
- Organization wallet, main wallet, payment status, emergency status, and notifications remain consistent.

Check files:

- App: `services/paymentService.js`
- App: `services/notificationDispatcher.js`
- Console: `frontend/src/services/walletService.js`
- Console: `frontend/src/services/emergencyService.js`
- Console: `frontend/src/components/pages/WalletManagementPage.jsx`

### 5. Realtime Recovery

Target:

- Console has realtime subscriptions for operational surfaces, but durable data comes from query/service reads.
- Realtime events invalidate affected query keys and refresh emergency, hospital, ambulance, payment, wallet, notification, and visit surfaces.
- Polling fallback exists only for recovery, not as the source of truth.

Check files:

- App: `services/realtimeAvailabilityService.js`
- Console: `frontend/src/services/supabaseHelpers.js`
- Console: `frontend/src/services/supabaseMapService.js`
- Console: `frontend/src/contexts/MapContext.jsx`
- Console: `frontend/src/contexts/PageDataContext.jsx`

## First Implementation Lanes

### Lane A - Contract Inventory

Produce or refresh:

- Table list used by app services and console services.
- RPC list used by app services, app Edge Functions, and console services.
- Page-level direct Supabase usage list in console.
- Drift list where console reads or writes columns not present in current app migrations.

Useful commands:

```powershell
rg -n "rpc\('([^']+)'|from\('([^']+)'" frontend/src/services frontend/src/components frontend/src/hooks frontend/supabase -S
rg -n "rpc\('([^']+)'|from\('([^']+)'" services hooks components supabase/functions supabase/migrations -S
rg --files supabase/tests/validation -g "table_flow_trace_*.md"
```

### Lane B - Service Parity

Update console services before pages:

- `emergencyService.js`
- `emergencyResponseService.js`
- `bedManagementService.js`
- `driverManagementService.js`
- `walletService.js`
- `pricingService.js`
- `hospitalsService.js`
- `ambulancesService.js`
- `visitsService.js`
- `notificationService.js`
- `profilesService.js`

Each service should expose the operation the page needs, call the app-compatible RPC/table path, normalize rows once, and return predictable errors.

### Lane C - Page CRUD Wiring

After service parity, wire pages to those services:

- Emergency requests: dispatch, approve, decline, complete, cancel, responder updates.
- Hospitals: availability, rooms, service pricing, org ownership, verified state.
- Ambulances: fleet CRUD, assignment readiness, location/status.
- Doctors: scheduling, hospital/provider linkage.
- Visits: app-compatible visit status and request linkage.
- Wallet: payment ledger, org wallet, main wallet, cash approval.
- Verification/users/organizations: profile and org changes through admin-safe services.

### Lane D - Query And Realtime

Move high-risk reads from `PageDataContext` into focused query hooks or service-backed query functions. Start with:

- emergency requests
- payments
- wallet ledger
- hospitals
- ambulances
- visits

Keep `PageDataContext` as a compatibility consumer until each page is moved.

### Lane E - UI Feedback Needed For Operations

Only add UI work that protects operations:

- Immediate pending state after dispatch, approval, decline, completion, cancellation, and save actions.
- Clear success/failure toast or inline state.
- Skeletons or compact loading states for important routes.
- Disabled duplicate-submit paths while mutations are in flight.
- Status colors that match the iVisit way: sky/accent for in-progress, emerald/success for completed, red only for danger/emergency/telemetry-critical states.

## Known Risks

- Some console docs claim "production ready" or "no active implementation work"; those claims are stale for this alignment effort.
- `PageDataContext.jsx` can make a flow appear wired because mocks or derived stats fill gaps.
- Page-level direct Supabase calls can bypass service normalization and app-compatible RPC side effects.
- Existing mojibake can hide important comments and PULLBACK notes.
- Emergency status aliases must be canonicalized before filtering or displaying critical states.
- Wallet ledger and payment updates are easy to corrupt if a page writes rows directly.
- Realtime subscriptions can create duplicate channels if hooks/components are added casually.

## Definition Of Done

A flow is aligned only when all of these are true:

- Console reads the same source rows the app writes.
- Console writes through the same RPC/service contract when business side effects exist.
- Status, payment, cost, ETA, location, responder, and visit fields map both ways.
- The page has immediate pending, success, and failure feedback.
- Query cache or realtime recovery updates the visible surface after mutation.
- A trace command, local run, or staging run proves the path.
- The doc or matrix names any skipped check and why.

## Suggested Next Sprint Order

1. Generate the console/app table and RPC inventory from the commands above.
2. Compare that inventory against `supabase/tests/validation/table_flow_trace_*.md` in the app repo.
3. Start with emergency and payment services because they carry the highest patient trust risk.
4. Move one page at a time from direct Supabase/context reads to service-backed query/mutation hooks.
5. Run local or staging traces for ambulance-only, bed-only, paired flow, payment approval, and realtime recovery.
6. Update this document with exact file/line exhibits after each lane is implemented.

## Handoff Notes

The fastest path is not to refactor everything. Keep the console alive, make the data contracts exact, and replace broad context dependencies only where a flow needs to become reliable.

When a future agent resumes, begin with `git status --short`, then refresh the inventory commands in Lane A. If they differ from this document, update the doc first and then implement the smallest service/page changes needed for the chosen flow.
