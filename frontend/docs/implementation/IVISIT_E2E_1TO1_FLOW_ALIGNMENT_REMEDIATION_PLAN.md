# iVisit End-to-End 1:1 Flow Alignment - Findings and Remediation Plan

**Date**: 2026-02-23  
**Scope**: `ivisit-app` + `ivisit-console/frontend` + live Supabase project  
**Goal**: Achieve a reliable, traceable, mobile-friendly, end-to-end flow where UI values and automation outcomes match the database 1:1.

---

## 1. Executive Summary

The platform foundation is present:
- Core schema modules exist
- Critical RPCs/triggers exist
- Mobile UI reinvention is progressing well in the console

The current blocker is not UI polish. It is **data contract drift and flow entrypoint inconsistency** between:
- `ivisit-app`
- `ivisit-console/frontend`
- Live Supabase schema + automations

### Current Conclusion
- **User bootstrap automations** are working (profiles/preferences/medical/patient wallets)
- **Emergency/payment/visit/dispatch tracking flows are not yet 1:1**
- **Seeding is not currently sufficient** for full UI parity testing

This document defines the exact fix program and validation sequence to close that gap without guesswork.

---

## 2. Audit Basis (No-Assumptions Pass)

### 2.1 What Was Audited

- `ivisit-console/frontend`
  - services
  - contexts
  - mobile pages and map flows
  - Supabase migrations/docs
- `../ivisit-app`
  - emergency, payment, visits, ambulance, realtime services/hooks
  - Supabase tests/tasks/fixes docs
- Live Supabase data (read-only)
  - using configured env in both apps

### 2.2 Environment Confirmation

Both apps point to the same Supabase host:
- `dlwtcmhdzoklveihuhjf.supabase.co`

This means cross-app mismatches are affecting the same production-like data plane.

### 2.3 Validation Guidance Sources Used

The remediation approach in this document follows the structure and rigor of:
- `../ivisit-app/supabase/tests/tasks/task_validation.md`
- `../ivisit-app/supabase/tests/tasks/comprehensive_system.md`
- `../ivisit-app/supabase/tests/fixes/verify_flow.sql`

---

## 3. Live Database Findings (Evidence Snapshot)

### 3.1 Core Counts (Read-Only Audit)

- `profiles`: 36
- `preferences`: 36
- `medical_profiles`: 36
- `patient_wallets`: 36
- `organizations`: 21
- `organization_wallets`: 17
- `hospitals`: 14
- `ambulances`: 21
- `doctors`: 2
- `emergency_requests`: 132
- `visits`: 0
- `payments`: 17
- `emergency_doctor_assignments`: 0
- `insurance_billing`: 0
- `wallet_ledger`: 7

### 3.2 Automation Health (Observed Outcomes)

#### Working
- User bootstrap automation coverage is strong:
  - `profiles -> preferences`: 36/36
  - `profiles -> medical_profiles`: 36/36
  - `profiles -> patient_wallets`: 36/36

#### Not Working / Not Backfilled
- `organizations -> organization_wallets`: 17/21 (6 missing)
- Completed emergencies do not show corresponding visit outcomes:
  - `emergency_requests`: 132
  - `visits`: 0
- Active emergencies (`accepted`) have no resource linkage/tracking fields populated:
  - `ambulance_id`: missing on active records
  - `responder_id`: missing on active records
  - `responder_location`: missing on active records

### 3.3 Payment and Flow State Evidence

- `payments`: 17
  - `pending`: 10
  - `completed`: 7
- `cash` payments present and pending:
  - `pending cash`: 6
- Many payments are not linked to emergencies (`emergency_request_id` null on several rows)

### 3.4 Seed Quality / Duplicate Signals

Observed semantic duplicates in live data samples:
- Duplicate hospital names
- Repeated ambulance call signs

This indicates current seeded/demo data is not suitable for validating full UI parity or automation edge cases.

---

## 4. Critical Findings (Root-Cause Oriented)

## 4.1 Cross-App Contract Drift (Highest Risk)

### A. `ivisit-app` emergency create payload is incompatible with `create_emergency_v4`

`create_emergency_v4` expects:
- `p_request_data.patient_location.lat`
- `p_request_data.patient_location.lng`

But `ivisit-app` builds and passes a WKT string (`POINT(lng lat)`) from `useRequestFlow`.

Impact:
- Emergency creation RPC path can fail or produce partial/invalid location handling
- Breaks the intended atomic path (emergency + payment + visit coupling)

Affected areas:
- `../ivisit-app/hooks/emergency/useRequestFlow.js`
- `../ivisit-app/services/emergencyRequestsService.js`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`

### B. `ivisit-console` visits service does not match current visits schema

Console service expects/writes fields like:
- `doctor`
- `visit_type`
- `prescription`

Current schema uses a different shape (notably `doctor_name`, `type`, and a reduced/recovered set).

Impact:
- Console UI and operations can write/read wrong columns
- Provider views and visit management are not 1:1 with DB

Affected areas:
- `frontend/src/services/visitsService.js`
- `frontend/supabase/migrations/20260219000300_logistics.sql`

### C. `ivisit-console` emergency create bypasses atomic backend flow

Console service performs direct insert into `emergency_requests` instead of using `create_emergency_v4`.

Impact:
- Bypasses atomic payment/visit coupling
- Produces divergent state between app and console
- Undermines automations and makes debugging inconsistent

Affected area:
- `frontend/src/services/emergencyService.js`

## 4.2 Realtime / Dispatch Tracking Drift

### A. Console ambulance tracking writes non-canonical columns

Console ambulance service writes fields like:
- `driver_location`
- `last_location_update`
- `driver_id`

Live table and schema behavior are centered on:
- `location`
- `profile_id`
- emergency request tracking fields (`responder_location`, `patient_location`)

Impact:
- Real-time driver tracking appears "implemented" but does not consistently update the fields the map flow uses
- Map and dispatch status become visually stale or empty

Affected area:
- `frontend/src/services/ambulancesService.js`

### B. Active emergencies are not receiving dispatch linkage

Live evidence shows active emergencies without:
- `ambulance_id`
- `responder_id`
- `responder_location`

Impact:
- Provider/operator cannot trust live dispatch state
- Polyline route and map detail UX degrades

Likely causes:
- Flow bypasses
- Schema mismatch writes
- Trigger preconditions not met by current request creation path

## 4.3 RBAC/Scoping Mismatch (Provider Usability Blocker)

`applyAuthFilter()` provider logic can scope visits/emergencies using organization IDs against hospital-scoped fields.

Impact:
- Providers can see empty/partial data despite valid records
- Mobile provider UX feels broken even with polished UI

Affected area:
- `frontend/src/services/authService.js`

## 4.4 `ivisit-app` Flow Bugs Independent of Schema

### A. Auto-payment parameter mismatch

`usePaymentFlow` passes a payment method ID where `paymentService.processPayment()` expects organization ID.

Impact:
- Auto-payment flow can fail or call the backend with wrong identifiers

### B. Auto-payment result shape mismatch

`usePaymentFlow` expects `result.payment`, while `paymentService.processPayment()` returns intent metadata (`clientSecret`, `paymentIntentId`).

Impact:
- UI state and flow transitions become inconsistent

### C. Broken import path in realtime availability services

`realtimeAvailabilityService.js` imports from `../lib/supabase`, but that file does not exist.

Impact:
- Runtime failure in realtime availability paths

## 4.5 Seeding and Validation Infrastructure Gaps

- `frontend/supabase/seed.sql` is a placeholder and references a non-present seed migration
- Current live data does not cover all UI fields or automation edge states
- Existing validation docs/scripts are useful, but mostly validate existence/accessibility rather than full flow state transitions

---

## 5. Target State (Definition of "Perfect 1:1")

The system is considered aligned only when all of the following are true:

### 5.1 Contract Alignment
- Both apps read/write the same canonical field names
- No stale column writes
- No phantom fields used in UI filtering/search/actions

### 5.2 Flow Alignment
- Emergency creation always uses the same atomic backend entrypoint (or a controlled adapter)
- Payment, emergency status, visit creation/sync, and resource assignment remain coherent
- App and console both observe the same state transitions

### 5.3 Automation Alignment
- User/org wallet automations work for new records and are backfilled for existing records
- Emergency-to-visit synchronization is observable in live data
- Dispatch/doctor assignment automation has valid preconditions and produces records

### 5.4 UI Alignment
- `ivisit-app` and console/mobile render the same business truth from DB
- No fake-empty states caused by RBAC/service mismatch
- Seeded data covers all fields used by UI components

---

## 6. Granular Fix Program (Execution Plan)

This plan is intentionally sequential. Do not reorder phases unless dependencies are satisfied.

## Phase 0 - Guardrails and Traceability (No Data Mutation)

### Objective
Freeze a reproducible validation baseline before touching schema adapters or data.

### Tasks
1. Create a contract matrix document (DB table/column -> app field -> console field).
2. Create a validation tracker using the task template from `task_validation.md`.
3. Snapshot current DB counts and key distributions (already partially done; formalize into script output).
4. Define staging/test dataset IDs and prefixes for traceable seeded records.

### Deliverables
- `contract_mismatch_matrix.md`
- `e2e_validation_tracker.md`
- `db_baseline_snapshot.json`

### Success Criteria
- [ ] Every critical flow entity is listed (emergency, visits, payments, ambulances, hospitals, wallets)
- [ ] Every known mismatch has an owner file and fix phase
- [ ] Validation checkpoints are executable and versioned

## Phase 1 - Canonical Schema Contract Adapters (Code Fixes, Non-Destructive)

### Objective
Eliminate write/read mismatches before any cleanup or reseeding.

### Tasks (Console)
1. Align `frontend/src/services/visitsService.js` to the live visits schema.
2. Align `frontend/src/services/emergencyService.js` to canonical emergency fields and atomic create path.
3. Align `frontend/src/services/ambulancesService.js` tracking fields with actual schema.
4. Fix provider/org RBAC scoping in `frontend/src/services/authService.js`.
5. Remove/replace stale `location` usage in emergency page filtering and labels.

### Tasks (App)
1. Normalize `patient_location` payload shape for `create_emergency_v4` (JSON `{ lat, lng }`, not WKT).
2. Fix `usePaymentFlow` parameter mapping to pass organization ID to payment processing.
3. Fix `usePaymentFlow` result handling (`clientSecret/paymentIntentId` vs `payment` object expectation).
4. Fix non-existent `../lib/supabase` imports to `services/supabase`.
5. Audit emergency update payload writes for columns not present in current schema and guard them.

### Success Criteria
- [ ] No service writes unknown columns for core flows
- [ ] Both apps can create/read/update core records without schema errors
- [ ] Provider-scoped views show expected data in at least one seeded/provider account

## Phase 2 - Flow Entrypoint Consolidation (Atomic Path Enforcement)

### Objective
Ensure emergency and payment flows do not split between legacy direct insert/update paths and atomic RPC paths.

### Tasks
1. Designate canonical emergency create path:
   - `create_emergency_v4` for app and console
2. Add a shared payload adapter pattern (per app) that maps UI objects to RPC schema.
3. Gate legacy direct insert paths behind explicit fallback flags (disabled by default).
4. Ensure cash payment approval/decline flows use the same RPCs across both apps.

### Success Criteria
- [ ] Emergency creation path is singular/canonical in both apps
- [ ] Cash approval/decline produce identical post-state semantics in both apps
- [ ] No duplicate status orchestration logic competes with DB automations

## Phase 3 - Automation Validation and Backfill Repair (DB Mutations, Controlled)

### Objective
Repair existing data so automations and UI can be verified on realistic state, then prove automation outcomes.

### Tasks
1. Backfill missing `organization_wallets` for existing organizations (idempotent SQL).
2. Backfill `visits` for emergency records that should have visit rows (idempotent SQL with audit table/log).
3. Add reconciliation queries for:
   - emergency->visit linkage
   - payment->emergency linkage
   - active emergency dispatch fields
4. Validate automation triggers with controlled test inserts/updates:
   - emergency completion sync to visit
   - doctor assignment/release
   - billing creation on completion

### Required Validation Scripts (Task-Template Based)
Create/refresh scripts under a traceable path (prefer app `supabase/tests/` or shared tooling):
- `validate_org_wallet_backfill.sql`
- `validate_emergency_visit_sync.sql`
- `validate_cash_payment_approval_flow.sql`
- `validate_dispatch_assignment_flow.sql`
- `validate_doctor_assignment_flow.sql`

### Success Criteria
- [ ] `organization_wallets` coverage = `organizations` coverage
- [ ] `visits` exist for intended emergency lifecycle records
- [ ] Trigger outcomes observed in live/staging test runs
- [ ] Every backfill script is idempotent and logged

## Phase 4 - Deterministic Seed Data (Full UI Coverage)

### Objective
Provide seeded data that exercises all UI-rendered states and automation branches.

### Seed Design Requirements
- Every field rendered by app and console UI should appear in at least one seeded row
- Include role coverage:
  - patient
  - provider (driver, doctor)
  - org_admin
  - admin
- Include flow coverage:
  - emergency (pending cash approval)
  - emergency (accepted/in_progress with responder tracking)
  - emergency (completed with payment + visit + billing)
  - bed booking
  - visit scheduled/completed/cancelled
  - ambulance available/on_trip/maintenance

### Tasks
1. Build deterministic seed pack (no random duplicates, stable IDs/names).
2. Separate seed layers:
   - base identities/orgs
   - hospitals/doctors/ambulances
   - emergencies/payments/visits
   - tracking and analytics shaping
3. Add validation queries proving seed coverage by UI field and flow state.

### Success Criteria
- [ ] No duplicate semantic identifiers unless intentionally modeled
- [ ] All UI empty states can be toggled intentionally, not accidentally
- [ ] All key mobile/console pages load meaningful real data

## Phase 5 - End-to-End Flow Validation (App -> DB -> Console)

### Objective
Prove the platform promise using the same database and the real UI/service stacks.

### Flow Validation Matrix (Must Pass)
1. **Cash Emergency Flow**
   - App creates emergency via atomic RPC
   - Payment row created (`pending`, `cash`)
   - Console org_admin approves
   - Payment/emergency/visit statuses update correctly
   - App sees approved state
   - Console/mobile views show same state

2. **Bed Reservation Flow**
   - App books bed emergency
   - Hospital availability updates appropriately
   - Console map/list reflects request and status

3. **Realtime Driver Tracking**
   - Driver/ambulance location updates to canonical fields
   - Active emergency map updates in console
   - App active trip UI reflects progress/location changes

4. **Visit Trigger / History Flow**
   - Emergency transitions cause visit lifecycle sync where intended
   - Visits visible in app and console with same identifiers/status

5. **Provider Mobile Comfort Checks (Console)**
   - Provider-scoped lists populate correctly
   - Mobile rails/list pagination behave with live data
   - No accidental empty states caused by RBAC scoping mismatch

### Success Criteria
- [ ] All 5 flows pass using the same Supabase project
- [ ] No manual DB patching needed during the flow run
- [ ] App and console display matching identifiers/statuses

## Phase 6 - Production Rollout and Monitoring

### Objective
Deploy safely and detect regression early.

### Tasks
1. Run pre-flight validation scripts.
2. Apply code deploys (app + console) with contract fixes.
3. Apply backfills/seeds in controlled order.
4. Re-run validation matrix.
5. Enable temporary monitoring dashboard/query pack for:
   - emergency without visit
   - active emergency without responder/ambulance
   - pending cash older than threshold
   - org without wallet

### Success Criteria
- [ ] Post-deploy validations pass
- [ ] Regression monitors remain within expected thresholds

---

## 7. Task Validation Mapping (How We Trace This Work)

This program should be executed as formal validation tasks using the template in:
- `../ivisit-app/supabase/tests/tasks/task_validation.md`

### 7.1 Existing Task Assets to Reuse

- `../ivisit-app/supabase/tests/tasks/comprehensive_system.md`
  - Good for module access/existence validation
  - Extend with real flow-state checks (not just function existence)

- `../ivisit-app/supabase/tests/fixes/verify_flow.sql`
  - Useful pattern for RPC + schema verification
  - Needs trigger-name and flow-state alignment with current migrations

- `../ivisit-app/supabase/tests/scripts/test_comprehensive_system.js`
  - Good starting script
  - Currently biased toward accessibility/existence checks

### 7.2 New Required Validation Tasks (Granular)

Create these tasks and scripts before mutating live data:

1. **Task: Contract Parity Validation (App + Console)**
   - Objective: detect field-name mismatches against current schema
   - Validation: static code scan + runtime smoke queries

2. **Task: Emergency Atomic Creation Validation**
   - Objective: prove `create_emergency_v4` works from both apps with canonical payload
   - Validation: RPC call + row state checks across `emergency_requests`, `payments`, `visits`

3. **Task: Cash Approval Lifecycle Validation**
   - Objective: verify approve/decline RPC side effects end-to-end
   - Validation: status transitions + wallet ledger + UI refresh checks

4. **Task: Dispatch and Tracking Validation**
   - Objective: verify active emergency resource linkage and location propagation
   - Validation: emergency + ambulance + map render state

5. **Task: Provider RBAC Parity Validation**
   - Objective: ensure provider sees exactly the correct records in app and console
   - Validation: seeded provider account + query/UI comparisons

6. **Task: Seed Coverage Validation**
   - Objective: confirm seeded data covers every UI-rendered field and every core state
   - Validation: SQL coverage queries + page smoke checks

---

## 8. Precise Implementation Order (First Fix Pack)

This is the recommended first execution pack before any DB cleanup:

1. **Patch app emergency create payload shape** (`patient_location` JSON object)
2. **Patch app payment auto-flow param/result mismatch**
3. **Fix app realtime availability imports**
4. **Patch console visits service schema mapping**
5. **Patch console emergency create path to atomic RPC adapter**
6. **Patch console ambulance tracking field writes**
7. **Patch console provider RBAC scoping**
8. **Patch stale emergency `location` field UI references**
9. **Run non-destructive validation scripts**
10. **Then perform backfills (wallets, visits)**

This order reduces false negatives during validation and prevents dirtying the DB with mismatched writes.

---

## 9. Risk Controls (No Mistakes Policy)

### 9.1 Data Safety
- No destructive dedupe on live data until:
  - contract fixes land
  - backups/snapshots are confirmed
  - validation scripts pass
- All DB repair scripts must be:
  - idempotent
  - transaction-scoped
  - audited with before/after counts

### 9.2 Traceability
- Every flow fix must name:
  - source file(s)
  - affected table(s)
  - validation script/task
  - expected state transition

### 9.3 Rollback Readiness
- For each SQL mutation script:
  - include a dry-run mode (SELECT only)
  - include rollback notes (or compensating script)
- For each code patch:
  - keep behavior behind explicit adapters rather than silent renames

---

## 10. Immediate Next Actions (Execution Checklist)

### 10.1 Documentation / Validation Setup
- [ ] Create contract mismatch matrix document
- [ ] Create task files for the 6 validation tasks above
- [ ] Create baseline DB snapshot script output and commit to docs artifact path

### 10.2 Code Fix Pack (Phase 1)
- [ ] Patch `ivisit-app` emergency request payload shape for `create_emergency_v4`
- [ ] Patch `ivisit-app` payment auto-flow param/result handling
- [ ] Patch `ivisit-app` broken realtime availability imports
- [ ] Patch console `visitsService` schema mapping
- [ ] Patch console `emergencyService` atomic create path
- [ ] Patch console `ambulancesService` tracking writes
- [ ] Patch console provider RBAC scoping
- [ ] Patch stale emergency `location` references in console UI/search

### 10.3 Validation Before DB Repair
- [ ] Run comprehensive system validation (extended)
- [ ] Run emergency atomic creation validation
- [ ] Run cash approval lifecycle validation
- [ ] Run provider RBAC parity validation

### 10.4 Data Repair / Seed
- [ ] Backfill missing org wallets
- [ ] Backfill missing visits for emergency history
- [ ] Build deterministic seed pack with full field coverage
- [ ] Run seed coverage validation

### 10.5 End-to-End Signoff
- [ ] Cash emergency flow passes app -> DB -> console
- [ ] Bed reservation flow passes app -> DB -> console
- [ ] Realtime driver tracking visible and updating
- [ ] Provider mobile console UX usable with live data
- [ ] App and console values match DB state 1:1

---

## 11. Final Note

The system does not need a full rewrite. It needs:
- strict contract alignment
- one canonical flow entrypoint
- deterministic seed data
- validation tasks that test outcomes, not just function existence

Once those are in place, the mobile console reinvention becomes operationally meaningful instead of purely visual.

