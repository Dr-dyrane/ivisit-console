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
- `frontend/src/components/pages/WalletManagementPage.jsx:59-136`
- `frontend/src/components/modals/GlobalFinancialModals.jsx:37-184,190-340`
- `frontend/src/components/pages/PricingManagementPage.jsx:70-202,428-532`
- `frontend/src/components/views/PricingTableView.jsx:85-175`
- `frontend/src/components/mobile/MobilePricing.jsx:278-371`
- `frontend/src/services/emergencyService.js:207-374`
- `frontend/src/services/walletService.js:8-405`
- `frontend/src/services/pricingService.js:8-110`
- `frontend/src/services/hospitalsService.js:364-407`
- `frontend/src/hooks/useHospitals.js:157-190`

SQL receivers:

- `frontend/supabase/migrations/20260219010000_core_rpcs.sql:833-850,1432-1717,1878-1972`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql:441-627,1182-1284,1531-1607`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql:1615-1939`
- `frontend/supabase/migrations/20260219000400_finance.sql:5-80,164-291,742-744`
- `frontend/supabase/migrations/20260219000700_security.sql:239-260,402-433`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql:945-1000,1263-1295`

App reference:

- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/realtimeAvailabilityService.js:215-239`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js:310-394,563-564,647-649,969-973`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/pricingService.js:164-309,316-409`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payment-intent/index.ts:15-291`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payout/index.ts:13-82`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts:33-250`

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
| Fee calculation and deduction | Amount reaches v2 (`walletService.js:279-283`); UI reports fee deducted after success (`EmergencyRequestsPage.jsx:494-500`) | V2 calculates fee and inserts a completed cash payment (`emergency_logic.sql:1243-1282`). The settlement trigger is `AFTER UPDATE` only and returns immediately for cash (`finance.sql:175-191,742-744`). | confirmed drift | This console path does not visibly debit the organization wallet or credit platform ledger, even if the status-order defect is fixed. |

## Cash Dispatch Eligibility Contract

| Step | Console behavior | SQL receiver behavior | Status | Finding |
| --- | --- | --- | --- | --- |
| Pre-dispatch fee gate | `EmergencyRequestsPage.jsx:425-440` computes estimated amount and tests `if (!isEligible)` after `walletService.checkCashEligibility()`. | Service ignores `estimatedAmount` and returns the full JSONB result (`walletService.js:382-393`). `check_cash_eligibility` returns `{ eligible, balance, fee_percentage }`, with `eligible` defined as balance `>= 0` (`core_rpcs.sql:852-867`). | confirmed drift | A returned object is truthy in JavaScript regardless of its `eligible` field, and zero balance is declared eligible even though the UI states it must cover the platform fee. The dispatch guard cannot enforce the described wallet cap. |
| Identity fallback | UI selects `orgId || request.organization_id || request.hospital_id` (`EmergencyRequestsPage.jsx:429`). | Cash mutation later validates organization identity against `hospitals.organization_id` (`emergency_logic.sql:1217-1237`). | confirmed drift | A hospital UUID can be used as organization context during eligibility and subsequent cash processing. |

## Wallet Ledger Repair Contract

| Trigger | Service behavior | Data mutation | Status | Finding |
| --- | --- | --- | --- | --- |
| Opening wallet view as org admin | Effect automatically invokes `backfillLedger(profile.organization_id)` (`WalletManagementPage.jsx:239-255`) | Attempts to read completed payments and wallet, then insert `wallet_ledger` rows and update `payments.metadata` (`walletService.js:295-376`). Current RLS source exposes org payment/wallet SELECT but provides only admin SELECT for `wallet_ledger`, with no org-admin ledger insert/update policy (`security.sql:239-260,402-433`). | confirmed drift | A routine read surface attempts a maintenance mutation, while the source policy does not authorize the org-admin ledger access its screen needs. It is both wrongly placed and not a reliable repair mechanism. |

No backfill was executed during this audit.

## Stripe Funding And Payout Contract

| User-visible operation | Console request and rendering | App-owned runtime effect | Status | Finding |
| --- | --- | --- | --- | --- |
| Organization or platform top-up | `topUpWallet()` sends `amount`, `organization_id`, and nested `metadata.type`, but omits top-up discriminator and card confirmation (`walletService.js:204-222`). Modal awaits intent creation and immediately shows `Wallet topped up successfully` (`GlobalFinancialModals.jsx:150-166`). | `create-payment-intent` recognizes top-up only from top-level `is_top_up` (`create-payment-intent/index.ts:18-36,174-193`) and returns a `clientSecret` for confirmation (`:278-285`). Webhook classifies success from Stripe metadata (`stripe-webhook/index.ts:34-104`). | confirmed drift | Console does not complete the PaymentIntent and its request is classified as service payment rather than top-up. No wallet funding is proven when success is displayed. |
| Organization withdrawal | `withdrawFunds()` sends amount and organization context; modal gates only against displayed balance and immediately reports initiation (`walletService.js:183-197`; `GlobalFinancialModals.jsx:168-184,236-274`). | `create-payout` authenticates and scopes org-admin organization but creates payout without reading/reserving internal wallet balance (`create-payout/index.ts:13-82`). Webhook deducts wallet only after `payout.paid` (`stripe-webhook/index.ts:164-237`). | confirmed integrity gap | Two requests or stale displayed balance can create external payouts before internal available funds are reserved. Failed payouts have no reconciliation mutation shown. |
| Organization billing methods | Wallet page requests organization cards/status (`WalletManagementPage.jsx:73-85,157-164`); modal creates setup intents for the organization (`GlobalFinancialModals.jsx:37-97,276-337`). | `manage-payment-methods` authenticates a user but accepts resolved organization context without observed membership/admin guard and writes organization customer/payout fields (`manage-payment-methods/index.ts:15-115`). | confirmed authorization and receiver drift | Authorization and absent live organization receiver columns are detailed in `EDGE_FUNCTION_MATRIX_2026-05-24.md`. |
| Org-admin ledger display | Page queries `wallet_ledger` by org wallet id and feeds ledger KPIs/history (`WalletManagementPage.jsx:91-101`; `MobileWallet.jsx:48-118,213-380`). | Current policy provides only `"Admins see all ledger"` (`security.sql:402-403`). | confirmed policy/UI drift | Org-admin wallet screens cannot rely on the ledger collection they render under the current source policy. |

## Pricing Scope And Patient Quote Contract

Pricing rows are hospital-scoped, not organization-scoped. The app reads the selected hospital's `service_pricing` or `room_pricing` override before falling back to hospital base price, global rows, and hardcoded defaults (`ivisit-app/services/pricingService.js:164-309`; `core_rpcs.sql:945-1000,1263-1295`).

| User-visible operation | Console mapping | App/SQL receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Org-admin creates or edits a service/room override | The page supplies only `organization_id` (`PricingManagementPage.jsx:104-127`). The service resolves it to the earliest created hospital and sends that `hospital_id` to `upsert_service_pricing` / `upsert_room_pricing` (`pricingService.js:32-110`). | Tables and RPC uniqueness are keyed by `hospital_id` plus service/room type (`emergency_logic.sql:1615-1638,1661-1803`). App quote resolution reads pricing for the patient-selected hospital. | confirmed scope drift | In an organization with more than one hospital, the Console silently changes only one hospital while labelling the result as an organization override. Other patient paths quote fallback or different prices. |
| Scope rendering | List/table/mobile UI treats any hospital row as `Organization override` or `Override` and does not identify the hospital (`PricingManagementPage.jsx:184-202`; `PricingTableView.jsx:85-139`; `MobilePricing.jsx:278-331`). | SQL has no organization-level pricing row; organization is inferred through the hospital owner. | confirmed presentation drift | Operators cannot see which facility owns a price or deliberately maintain sibling-hospital overrides. |
| Unit/currency presentation | Form sends `unit`; UI displays unit and `item.currency || 'USD'` (`PricingManagementPage.jsx:110-126,161-180`; `PricingTableView.jsx:119-125`). | Pricing tables/RPCs persist no `unit` or `currency` column and quote functions return fixed USD (`emergency_logic.sql:1615-1638,1714-1727,1786-1799`; `core_rpcs.sql:1268-1295`). | confirmed display-only fields | Unit edits do not persist. USD is the SQL contract, but the UI should not imply per-rule currency configuration. |

## Capacity And Availability Contract

`HospitalModal` exposes `total_beds`, `available_beds`, `icu_beds_available`, `ambulances_count`, `emergency_wait_time_minutes`, `status`, and `last_availability_update` (`HospitalModal.jsx:555-663,795-820`). The app reads these as one realtime availability surface.

Correction from the trigger ownership pass: `normalize_hospital_bed_state` is a `BEFORE INSERT OR UPDATE` trigger on `hospitals` that rebuilds bed snapshot JSON and refreshes the availability timestamp when bed state changes (`frontend/supabase/migrations/20260219000200_org_structure.sql:187-246`). Scalar bed writes therefore do not, by themselves, prove stale bed snapshots.

| UI/app-facing field | Console current or exposed writer | Canonical availability RPC effect | Status | Finding |
| --- | --- | --- | --- | --- |
| `emergency_wait_time_minutes` | Live modal save calls `updateHospital()` (`HospitalsPage.jsx:191-210`); service sends `emergency_wait_time_minutes` (`hospitalsService.js:135-138,283-291`) | `update_hospital_by_admin` updates `wait_time`, but does not extract `emergency_wait_time_minutes` (`core_rpcs.sql:242-280`); canonical availability RPC does (`emergency_logic.sql:1577-1584`) | confirmed drift | The visible ER-wait input is silently ignored on the current edit path. |
| `available_beds`, `icu_beds_available`, `total_beds` | Live modal save reaches `update_hospital_by_admin`, which updates scalar values (`core_rpcs.sql:259-273`) | Table trigger source normalizes scalar beds into `bed_availability` and updates freshness (`org_structure.sql:187-246`) | source-aligned for forward trigger write; live population drift confirmed | Read-only confirmation found 127 hospitals with positive scalar availability but zero non-empty `bed_availability` rows across 1,278 reviewed hospitals. |
| `available_beds` specialized API | `updateHospitalBedCount()` directly updates only `available_beds` and `updated_at` (`hospitalsService.js:364-383`; exported by `useHospitals.js:157-171,205-218`) | Table trigger source normalizes bed snapshots for this direct update (`org_structure.sql:187-246`) | forward receiver defined; deployed/population proof pending | No current component call site was found; existing live capacity projection is empty and cannot be called aligned without deployed-trigger proof. |
| `status` specialized API | `updateHospitalStatus()` directly updates only `status` and `updated_at` (`hospitalsService.js:388-407`; exported by `useHospitals.js:175-190,205-218`) | Availability RPC couples status with actor scope and availability snapshot updates (`emergency_logic.sql:1556-1605`) | drift suspected | An exposed partial writer exists, but this pass did not find a current component invoking it. |
| Beds, wait, status, ambulance bundle | Console live modal uses admin hospital RPC; hook additionally exposes partial table writers | App passes the operational bundle through `update_hospital_availability` (`ivisit-app/services/realtimeAvailabilityService.js:215-239`) | confirmed drift for ER wait; ownership review for bundle | Current console editing loses ER-wait updates even though bed snapshot normalization is trigger-protected. |

## Implementation Pass Inputs

Implementation should not begin until these ownership decisions are recorded:

| Decision needed | Evidence-backed target |
| --- | --- |
| Console create behavior for operator-entered status, bed number, and financial fields | One explicit create contract or explicit UI separation between app-lifecycle creation and administrative record creation. |
| Cash processing transition order | Payment must be recorded through a state-eligible RPC path before or as part of terminal completion. |
| Cash eligibility and settlement ownership | Gate on returned `eligible` plus fee amount; route successful cash collection through a receiver that synchronously persists required wallet and ledger effects. |
| Organization identity for manual cash | Supply an organization UUID only; never substitute hospital UUID. |
| Card funding confirmation | Do not show top-up completion until a correctly classified payment intent is confirmed and reflected by backend truth. |
| Payout reservation | Reserve or atomically validate internal wallet value before creating an external payout. |
| Org-admin wallet ledger visibility | Establish scoped ledger read ownership before rendering organization finance history or projection from ledger rows. |
| Pricing ownership and facility scope | Make hospital identity explicit in Console pricing CRUD and rendering, or implement a deliberate organization-level propagation contract; do not silently choose one hospital. |
| Availability writer ownership | Capacity/status operational controls should use a receiver that persists ER wait and refreshes app-consumed availability snapshot fields. |
| Ledger repair ownership | Remove normal-page auto-mutation behavior from the supported CRUD path and assign maintenance invocation/audit ownership. |

## Read-Only Live Follow-Up

Aggregate live confirmation is recorded in `READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md` and `../../../database/console-app-alignment/READ_ONLY_AUDIT_EVIDENCE_2026-05-24.md`. It observes one terminal cash-linked request without completed payment, seven cash payment/request-hospital organization mismatches, zero non-empty hospital `bed_availability` values across 1,278 hospital rows, and zero populated ER-wait values.

A SELECT-only finance follow-up found 28 completed cash payments with positive stored fees and referenced ledger pairs. Only 6 pairs use ordinary cash-payment labels; 22 pairs are explicitly labelled `runtime_data_integrity_repair` backfill output. These reads confirm an already-repaired cash settlement population and multiple writer lanes; they do not attribute any specific payment to the current console button path.

A separate client-scoped SELECT-only pricing follow-up found 21 visible organizations with multiple hospitals, containing 410 of 422 visible service-pricing rows and 208 of 219 visible room-pricing rows. The read scope is not a population count, but it confirms that silent earliest-hospital resolution is already relevant to visible console/app pricing data.
