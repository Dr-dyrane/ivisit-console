# Emergency, Payment, and Capacity Contract Chart - 2026-05-24

## Status

Exact source contract pass completed for the highest-risk operational paths. No database mutation or runtime write flow was executed.

## Evidence Scope

Console UI and services:

- `frontend/src/components/modals/EmergencyRequestModal.jsx:99-165`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx:466-505`
- `frontend/src/components/modals/HospitalModal.jsx:117-124,555-663`
- `frontend/src/components/pages/HospitalsPage.jsx:191-210`
- `frontend/src/components/pages/WalletManagementPage.jsx:239-255`
- `frontend/src/services/emergencyService.js:207-374`
- `frontend/src/services/walletService.js:277-376`
- `frontend/src/services/hospitalsService.js:364-407`
- `frontend/src/hooks/useHospitals.js:157-190`

SQL receivers:

- `frontend/supabase/migrations/20260219010000_core_rpcs.sql:833-850,1432-1717,1878-1972`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql:441-627,1182-1284,1531-1607`

App reference:

- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/realtimeAvailabilityService.js:215-239`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js:310-394,563-564,647-649,969-973`

## Emergency Create Contract

The console modal supplies a single operator payload at `EmergencyRequestModal.jsx:99-131`. The service then chooses between `create_emergency_v4` and `console_create_emergency_request` based on required IDs and valid coordinates at `emergencyService.js:209-280`.

| UI field | Console service payload | SQL receiver and stored effect | Status | Finding |
| --- | --- | --- | --- | --- |
| `user_id` (`EmergencyRequestModal.jsx:110`) | Required for atomic path (`emergencyService.js:213-218`); passed as `p_user_id` (`:242-246`) | `create_emergency_v4` requires UUID (`emergency_logic.sql:468-486`) and writes `emergency_requests.user_id` (`:563-574`) | aligned | UUID identity is explicit on the atomic route. |
| `hospital_id` (`:114`) | Required for atomic path; placed in `p_request_data` (`emergencyService.js:223-231`) | Atomic RPC requires a real hospital and resolves organization (`emergency_logic.sql:515-524`) | aligned | Hospital and organization ownership are established in SQL. |
| `service_type`, `specialty`, `ambulance_type` (`:111-113,116`) | Passed in atomic `requestData` (`emergencyService.js:223-230`) | Written into `emergency_requests` (`emergency_logic.sql:563-574`) | aligned | Service classification survives atomic creation. |
| `bed_number` (`:117`) | Not included in atomic `requestData` (`emergencyService.js:223-231`) | Atomic RPC can write `p_request_data->>'bed_number'` (`emergency_logic.sql:563-574`) | confirmed drift | A bed number entered in the modal is dropped whenever the atomic route is chosen. |
| `patient_location` (`:125-131`) | Parsed and required for atomic RPC (`emergencyService.js:209-218,230`) | Atomic RPC reads `lng` and `lat` to construct geometry (`emergency_logic.sql:556-560`) | aligned | Valid coordinates determine use of the canonical creation path. |
| `status` (`:112`) | Not passed in atomic `requestData`; passed only in fallback JSONB (`emergencyService.js:257-280`) | Atomic RPC determines status from payment mode, defaulting to `in_progress` (`emergency_logic.sql:463-466,543-554`) | confirmed drift | The modal exposes operator-selected status, but it is ignored on the atomic route. |
| `total_cost`, `payment_status` (`:118-119`) | `total_cost` is only put in `paymentData` if a payment method exists; modal payload has no payment method field (`emergencyService.js:233-246`) | Atomic RPC writes total as `COALESCE(v_total_amount, 0)` and derives payment status (`emergency_logic.sql:535-554,563-574`) | confirmed drift | A modal-entered total/payment status can become `0`/RPC-derived status on atomic creation. |
| `patient_snapshot` (`:120-124`) | Passed through (`emergencyService.js:229`) | Written as JSONB (`emergency_logic.sql:563-574`) | aligned | Priority/location description snapshot reaches the emergency row. |

### Fallback Boundary

When an atomic precondition is absent, `console_create_emergency_request` accepts the broader modal payload. It consumes `status`, `total_cost`, `payment_status`, `bed_number`, and location fields (`core_rpcs.sql:1463-1574`) while establishing transition context (`:1517-1528`).

This creates two materially different console-create contracts for the same modal:

| Route | Accepts modal-selected status/cost/payment/bed number | Creates visit/payment records | Contract risk |
| --- | --- | --- | --- |
| `create_emergency_v4` | Partially; status is derived and missing payment method suppresses entered financial values; bed number is not sent by service | Yes (`emergency_logic.sql:576-613`) | UI claims fields that are not reliably persisted. |
| `console_create_emergency_request` | Yes (`core_rpcs.sql:1463-1574`) | No visit/payment insert is visible in the RPC body | Operational record can differ from the app-owned emergency lifecycle. |

## Emergency Update Contract

`updateEmergencyRequest()` passes the modal payload to `console_update_emergency_request` (`emergencyService.js:316-373`). The RPC validates allowed status transitions and records transition context before updating the request (`core_rpcs.sql:1640-1715`).

| Mutation group | Receiver behavior | Status | Finding |
| --- | --- | --- | --- |
| Hospital, service, specialty, bed, responder, location, total, payment fields | Explicitly updated with non-empty payload values (`core_rpcs.sql:1684-1702`) | aligned for operator updates | The console RPC exposes the fields expected by an operations editor. |
| Status | Canonicalized and checked through `is_valid_emergency_status_transition` before write (`:1640-1666`) | aligned | Status is protected by transition rules rather than a raw table update. |
| Patient-side updates | Console uses operator RPC; app patient behavior is a separate trust boundary identified in the service map | intentional separation | Do not merge operator and patient mutation permissions during implementation. |

## Cash Completion Contract

### Exact Flow

| Step | Evidence | Result |
| --- | --- | --- |
| Operator completes request | `EmergencyRequestsPage.jsx:466-471` awaits `completeEmergency(request.id)` first. | Request moves to terminal `completed`. |
| SQL completion receiver | `console_complete_emergency` writes `status = 'completed'` (`core_rpcs.sql:1954-1959`). | Completion is committed before manual payment begins. |
| UI prompts cash processing | Only after completion, for a cash request whose captured payment status is not completed (`EmergencyRequestsPage.jsx:472-478`). | UI initiates payment after terminal transition. |
| Wallet call | `walletService.processCashPayment()` calls legacy name `process_cash_payment` (`walletService.js:277-288`). | RPC delegates to v2 with fixed USD (`core_rpcs.sql:833-850`). |
| V2 eligibility guard | `process_cash_payment_v2` rejects `cancelled` or `completed` requests (`emergency_logic.sql:1239-1241`). | The just-completed request is ineligible. |

### Finding

**Confirmed drift, blocking cash-completion flow:** the console completion order is incompatible with its SQL payment guard. A cash emergency completed through this UI reaches `process_cash_payment_v2` only after it has become a rejected terminal request.

### Additional Payment Field Risks

| Field or identity | Console source | SQL contract | Status | Finding |
| --- | --- | --- | --- | --- |
| Organization ID | UI supplies `orgId || request.organization_id || request.hospital_id` (`EmergencyRequestsPage.jsx:496`) | V2 compares `p_organization_id` to the hospital's `organization_id` (`emergency_logic.sql:1217-1237`) | confirmed drift | Falling back to `hospital_id` guarantees a request/organization mismatch when the earlier IDs are absent. |
| Currency | Service accepts `currency` but discards it (`walletService.js:277-283`) | Legacy wrapper always delegates with `'USD'` (`core_rpcs.sql:847-848`); v2 supports `p_currency` (`emergency_logic.sql:1182-1187`) | drift suspected | Current UI prompt says USD, but the service signature implies unsupported multi-currency behavior. |
| Fee calculation | Amount reaches v2 (`walletService.js:279-283`) | V2 calculates organization fee and inserts payment (`emergency_logic.sql:1243-1282`) | aligned after eligibility fix | The ledger/payment receiver exists; ordering and identity prevent reliable use. |

## Wallet Ledger Repair Contract

| Trigger | Service behavior | Data mutation | Status | Finding |
| --- | --- | --- | --- | --- |
| Opening wallet view as org admin | Effect automatically invokes `backfillLedger(profile.organization_id)` (`WalletManagementPage.jsx:239-255`) | Reads completed payments and wallet, then inserts `wallet_ledger` rows and updates `payments.metadata` (`walletService.js:295-376`) | confirmed drift | A routine read surface implicitly runs a multi-row repair mutation. This is not an ordinary CRUD flow and needs an explicit maintenance boundary. |

No backfill was executed during this audit.

## Capacity And Availability Contract

`HospitalModal` exposes `total_beds`, `available_beds`, `icu_beds_available`, `ambulances_count`, `emergency_wait_time_minutes`, `status`, and `last_availability_update` (`HospitalModal.jsx:555-663,795-820`). The app reads these as one realtime availability surface.

Correction from the trigger ownership pass: `normalize_hospital_bed_state` is a `BEFORE INSERT OR UPDATE` trigger on `hospitals` that rebuilds bed snapshot JSON and refreshes the availability timestamp when bed state changes (`frontend/supabase/migrations/20260219000200_org_structure.sql:187-246`). Scalar bed writes therefore do not, by themselves, prove stale bed snapshots.

| UI/app-facing field | Console current or exposed writer | Canonical availability RPC effect | Status | Finding |
| --- | --- | --- | --- | --- |
| `emergency_wait_time_minutes` | Live modal save calls `updateHospital()` (`HospitalsPage.jsx:191-210`); service sends `emergency_wait_time_minutes` (`hospitalsService.js:135-138,283-291`) | `update_hospital_by_admin` updates `wait_time`, but does not extract `emergency_wait_time_minutes` (`core_rpcs.sql:242-280`); canonical availability RPC does (`emergency_logic.sql:1577-1584`) | confirmed drift | The visible ER-wait input is silently ignored on the current edit path. |
| `available_beds`, `icu_beds_available`, `total_beds` | Live modal save reaches `update_hospital_by_admin`, which updates scalar values (`core_rpcs.sql:259-273`) | Table trigger also normalizes scalar beds into `bed_availability` and updates freshness (`org_structure.sql:187-246`) | aligned for bed snapshot projection | Earlier suspected snapshot loss is mitigated at the table trigger boundary. |
| `available_beds` specialized API | `updateHospitalBedCount()` directly updates only `available_beds` and `updated_at` (`hospitalsService.js:364-383`; exported by `useHospitals.js:157-171,205-218`) | Table trigger normalizes bed snapshots even for this direct update (`org_structure.sql:187-246`) | aligned for snapshot; API ownership pending | No current component call site was found; if later used, authorization and bundled-field semantics still need review. |
| `status` specialized API | `updateHospitalStatus()` directly updates only `status` and `updated_at` (`hospitalsService.js:388-407`; exported by `useHospitals.js:175-190,205-218`) | Availability RPC couples status with actor scope and availability snapshot updates (`emergency_logic.sql:1556-1605`) | drift suspected | An exposed partial writer exists, but this pass did not find a current component invoking it. |
| Beds, wait, status, ambulance bundle | Console live modal uses admin hospital RPC; hook additionally exposes partial table writers | App passes the operational bundle through `update_hospital_availability` (`ivisit-app/services/realtimeAvailabilityService.js:215-239`) | confirmed drift for ER wait; ownership review for bundle | Current console editing loses ER-wait updates even though bed snapshot normalization is trigger-protected. |

## Implementation Pass Inputs

Implementation should not begin until these ownership decisions are recorded:

| Decision needed | Evidence-backed target |
| --- | --- |
| Console create behavior for operator-entered status, bed number, and financial fields | One explicit create contract or explicit UI separation between app-lifecycle creation and administrative record creation. |
| Cash processing transition order | Payment must be recorded through a state-eligible RPC path before or as part of terminal completion. |
| Organization identity for manual cash | Supply an organization UUID only; never substitute hospital UUID. |
| Availability writer ownership | Capacity/status operational controls should use a receiver that persists ER wait and refreshes app-consumed availability snapshot fields. |
| Ledger repair ownership | Remove normal-page auto-mutation behavior from the supported CRUD path and assign maintenance invocation/audit ownership. |
