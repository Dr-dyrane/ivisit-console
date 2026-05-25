# Emergency Payment Capacity Service Map - 2026-05-24

## Status

First narrowed Stage 2 audit pass. Static source review only.

## Services Reviewed

Console:

- `frontend/src/services/emergencyService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/pricingService.js`
- `frontend/src/services/walletService.js`

App reference:

- `ivisit-app/services/emergencyRequestsService.js`
- `ivisit-app/services/paymentService.js`
- `ivisit-app/services/hospitalsService.js`
- `ivisit-app/services/pricingService.js`
- `ivisit-app/services/realtimeAvailabilityService.js`
- `ivisit-app/services/ambulanceService.js`
- `ivisit-app/hooks/emergency/*`

## Flow Matrix

| Flow | Console Entry | Read Path | Mutation Owner | App Reference | Status |
| --- | --- | --- | --- | --- | --- |
| Emergency create, complete app-like payload | `createEmergencyRequest(input)` | Reloads via `getEmergencyRequest()` after RPC. | `create_emergency_v4`. | App `emergencyRequestsService.create()` uses `create_emergency_v4` with payment metadata, active request preflight, and mapped response. | Mostly aligned; console needs exact payment payload parity proof. |
| Emergency create, incomplete console payload | `createEmergencyRequest(input)` fallback | RPC returns request. | `console_create_emergency_request`. | App does not use this operator fallback. | Console-specific; must prove JSONB extraction and defaults. |
| Emergency update | `updateEmergencyRequest()` | RPC response. | `console_update_emergency_request`. | App patient update uses `patient_update_emergency_request` with owned UUID resolution. | Correct trust split; needs payload field map. |
| Dispatch ambulance | `acceptEmergencyRequest()`, `dispatchEmergency()` | Reads ambulances, hospital, doctors before dispatch. | `console_dispatch_emergency`. | App subscribes to emergency and ambulance changes for realtime recovery. | Mostly aligned; selection logic is simple and must not be mistaken for app routing intelligence. |
| Bed acceptance/reservation | `dispatchEmergency()` bed path, `bedManagementService.updateReservationStatus()` | Reads emergency rows, hospitals, profiles. | `console_update_emergency_request`. | App bed runtime uses bed availability, room pricing, hospital snapshots, and active trip query preservation. | Drift suspected; console has minimal bed bucket model. |
| Complete/discharge | `completeEmergencyRequest()`, `dischargePatient()` | RPC response. | `console_complete_emergency`. | App observes terminal state and preserves terminal trip/bed context. | Aligned if RPC triggers visits/resource sync as expected. |
| Cancel | `cancelEmergencyRequest()`, `cancelBedReservation()` | RPC response. | `console_cancel_emergency`. | App patient path can cancel through patient update/service path. | Aligned at boundary; reason payload semantics need proof. |
| Responder location | `updateResponderLocation()` | Fetches updated request after RPC in two services. | `console_update_responder_location`. | App preserves ETA/route while merging server snapshots. | Aligned at RPC boundary; response shape should include enough realtime fields. |
| Cash approval | `approveCashPayment()` | RPC result only. | `approve_cash_payment`. | App creates cash requests through `create_emergency_v4`; org/admin approval uses approval RPC semantics. | Aligned high-level. |
| Cash decline | `declineCashPayment()` | RPC result only. | `decline_cash_payment`. | App payment-declined state observed by emergency/payment flows. | Aligned high-level. |
| Manual cash processing | `walletService.processCashPayment()` | RPC result only. | `process_cash_payment` legacy wrapper. | App code and docs emphasize `process_cash_payment_v2` for app-heavy flow. | Drift suspected; keep but isolate until proven. |
| Wallet summary/analytics | `walletService.getWalletSummary()`, `getFinanceAnalytics()` | `ivisit_main_wallet`, `organization_wallets`, `wallet_ledger`. | Read-only. | App payment service reads patient payment history and wallet balance; org finance is console-owned. | Needs RLS/admin proof and ledger field map. |
| Fee ledger repair | `walletService.backfillMissingFeeLedger()` | Reads payments and wallet rows. | Direct `wallet_ledger.insert`, `payments.update`. | App payment flows expect ledger/payment consistency from RPC/webhooks. | High risk; repair path should be maintenance-only, not normal UI action. |
| Hospital CRUD | `hospitalsService.create/update/delete` | `hospitals`. | Create direct insert; update/delete admin RPCs. | App hospitals service reads rich hospital/provider snapshots and derived room data. | Update/delete aligned; create direct insert needs policy/field proof. |
| Bed count/status update | `updateHospitalBedCount()`, `updateHospitalStatus()` | `hospitals`. | Direct table update. | App realtime availability update calls `update_hospital_availability`. | Drift suspected; capacity/status should likely use canonical RPC. |
| Pricing CRUD | `pricingService.save*`, `delete*` | `hospitals`, pricing tables. | `upsert_service_pricing`, `delete_service_pricing`, `upsert_room_pricing`, `delete_room_pricing`. | App checkout reads `service_pricing`, `room_pricing`, `hospitals.base_price`, and fallbacks. | Good boundary; needs field completeness and org/hospital resolution proof. |

## Claimable Current Alignment

- Emergency status-changing console actions are mostly behind console RPCs instead of raw table updates.
- Cash approval/decline use the expected RPC pair.
- Pricing CRUD already uses RPCs.
- Single-record lookups support UUID or `display_id` in emergency and hospital services.
- Console bed completion/cancel paths use emergency RPCs and rely on trigger-backed bed/resource updates.

## Drift And Missing Implementation Signals

### 1. Capacity Updates Bypass App RPC

Console still has:

```text
hospitalsService.updateHospitalBedCount() -> direct hospitals.available_beds update
hospitalsService.updateHospitalStatus() -> direct hospitals.status update
```

App reference has:

```text
realtimeAvailabilityService.updateAvailability() -> update_hospital_availability RPC
```

Audit implication: console capacity controls should be treated as drift suspected until the direct updates are proven equivalent to `update_hospital_availability`, including `last_availability_update`, wait time, status, ambulance count, trigger side effects, and RLS scope.

### 2. Manual Cash Processing Uses Legacy RPC

Console `walletService.processCashPayment()` calls `process_cash_payment`, while app code and schema docs point to `process_cash_payment_v2` for the richer app flow. Stage 2 contract evidence resolves the implementation direction: Console cash completion must route through the canonical approval/settlement receiver that confirms payment and ledger truth; the legacy manual wrapper is not a supported success path for visible fee-deducted completion.

Audit implication: do not implement new payment UI against `process_cash_payment` until the cash state machine is mapped.

### 3. Fee Ledger Backfill Is A Maintenance Surface

`walletService.backfillMissingFeeLedger()` directly writes `wallet_ledger` and updates payment metadata. It may be useful as a deterministic repair, but it is not normal app-console flow.

Audit implication: this should be documented as maintenance-only and kept out of ordinary operational UI unless explicitly guarded.

### 4. Bed Model Is Too Thin For App Parity

Console bed utilization counts emergency rows and hospital totals. App hospital logic builds room availability from:

```text
hospitals.available_beds
hospitals.icu_beds_available
hospitals.total_beds
hospitals.bed_availability
room_pricing
service_pricing
```

Audit implication: console bed UI may display total/reserved counts while missing room-type buckets, price source, and app checkout availability fields.

### 5. Edge Payment Functions Are Referenced But Not Locally Owned

Console wallet service invokes:

```text
create-payment-intent
create-payout
manage-payment-methods
```

Those function names were not found in the local console Edge Function tree reviewed in Stage 1. They may be deployed from `ivisit-app` or another project.

Audit implication: finance UI cannot be declared aligned until function ownership, deployed names, env, and webhook reflection are mapped.

## Required Field Maps For Next Pass

### Emergency RPC Payloads

Map exact fields for:

- `create_emergency_v4.p_request_data`
- `create_emergency_v4.p_payment_data`
- `console_create_emergency_request.p_payload`
- `console_update_emergency_request.p_payload`
- `console_dispatch_emergency`
- `console_update_responder_location`
- `patient_update_emergency_request.p_payload`

### Capacity Fields

Map exact fields and owning writer for:

- `hospitals.available_beds`
- `hospitals.icu_beds_available`
- `hospitals.total_beds`
- `hospitals.bed_availability`
- `hospitals.emergency_wait_time_minutes`
- `hospitals.wait_time`
- `hospitals.ambulances_count`
- `hospitals.status`
- `hospitals.dispatch_eligible`
- `hospitals.last_availability_update`

### Finance Fields

Map exact fields and owning writer for:

- `payments.status`
- `payments.payment_method_id`
- `payments.emergency_request_id`
- `payments.organization_id`
- `payments.metadata`
- `organization_wallets.balance`
- `ivisit_main_wallet.balance`
- `wallet_ledger.wallet_type`
- `wallet_ledger.wallet_id`
- `wallet_ledger.reference_id`
- `wallet_ledger.reference_type`

## Recommended Implementation Direction, Not Yet Code

- Route console capacity updates through `update_hospital_availability` or prove direct updates are intentionally broader admin-only edits.
- Treat fee ledger backfill as a maintenance command with explicit confirmation and audit log if it remains in UI.
- Keep emergency operator status transitions on console RPCs.
- Add a field map before changing any emergency/payment UI payload.
- Verify deployed payment Edge Functions before touching wallet top-up/payout UI.

## Next Service Families

1. Identity/admin/users: `profilesService`, `adminService`, `authService`, `displayIdService`.
2. Provider operations: `ambulancesService`, `doctorsService`, `staffSchedulingService`, `driverManagementService`.
3. Visits/medical/insurance: `visitsService`, `medicalProfilesService`, `insurance*`.
4. Content/search/subscribers/support: subscriber lifecycle, Edge email functions, search analytics, health news, support tickets.
