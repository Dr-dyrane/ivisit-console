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

## Emergency Detail Render Contract

The detail modal is a read surface, but it is a high-risk contract because it renders app-created emergency rows, console-created fallback rows, payment rows, and visit projections in one place. The modal now uses `formatAmbulanceType()` to accept object, scalar string, JSON string, or empty `ambulance_type` values (`EmergencyDetailsModal.jsx:29-61`). That is the expected field-shape defense after the observed runtime error where a scalar value such as `ambulance` was parsed as JSON.

| Rendered field or action | Source and transform | Receiver or app reference | Status | Finding |
| --- | --- | --- | --- | --- |
| `ambulance_type` | Detail modal accepts object title/name, JSON string, or scalar string and formats scalar values by replacing separators (`EmergencyDetailsModal.jsx:29-61,598-607`). | App emergency and visit projections preserve `ambulance_type` directly from request rows (`ivisit-app/services/visitsService.js:417-421`; `ivisit-app/services/emergencyRequestsService.js:160`). | aligned after fix | This is the reference pattern for all mixed-shape emergency detail fields: guard by shape before parsing or rendering. |
| Payment approval card | Modal displays only when request status/payment state implies pending approval, then loads latest payment by request and disables approval/decline until a visible payment row exists (`EmergencyDetailsModal.jsx:75-84,101-158,350-411`; `emergencyService.js:246-287`). | `approve_cash_payment` and `decline_cash_payment` require the pending payment/request pair and request status/payment state integrity (`core_rpcs.sql:2593-2921`). | aligned direction | UI correctly avoids approving without a payment id; implementation should preserve this backend-detail refresh rather than guessing payment identity from request fields. |
| Visit outcome bridge | Projection loads linked visit only after terminal request status and labels missing terminal linkage (`emergencyService.js:246-287`; `EmergencyDetailsModal.jsx:441-504`). | App visit mapping carries emergency request fields into visit/history surfaces (`ivisit-app/services/visitsService.js:351-421`). | aligned as read check | Missing terminal visit is surfaced instead of hidden, which is useful audit telemetry for emergency-to-visit sync defects. |
| Location render | Detail modal passes `patient_location`, `pickup_location`, and `responder_location` to `LocationCell` (`EmergencyDetailsModal.jsx:554-563`). | SQL stores geometry values and responder telemetry through `jsonb_to_point_geometry`; map surfaces decode geometry for display. | aligned if `LocationCell` covers all shapes | This belongs in the field-contract checklist: geometry objects, PostGIS strings, and fallback pickup objects must all be accepted before display. |
| Retry payment method labels | Page prompt labels include bullet characters for masked cards and expiry (`EmergencyRequestsPage.jsx:524-527`). | No receiver dependency; this is text rendering only. | encoding-gate required | These non-ASCII characters are intentional, but any edit to this file must run the mojibake/non-ASCII review so they do not degrade into corrupted prompt text. |

## Mobile Emergency Field Contract

`EmergencyRequestsPage` passes the same `requests` array to the mobile emergency surface that it renders on desktop (`EmergencyRequestsPage.jsx:604-614`). Those rows are loaded from `emergency_requests`, optionally joined to the latest payment row, and normalized by `normalizeEmergencyRequestRow()` (`EmergencyRequestsPage.jsx:186-205`; `emergencyRequestMapper.js:39-68`). The mobile component should therefore render the same normalized database fields, not older alias names.

| Mobile render assumption | Actual page/service source | Status | Finding |
| --- | --- | --- | --- |
| Patient name uses `emergency.patient_name || emergency.patient?.name` (`MobileEmergency.jsx:365`). | Desktop renders `patient_snapshot.fullName`, `requester_name`, or `patient_name` (`EmergencyRequestsPage.jsx:997`); the normalizer does not synthesize `patient_name` from `patient_snapshot`. | confirmed display drift | Mobile can fall back to `Patient #...` even when the request contains a valid `patient_snapshot.fullName`. |
| Location uses `emergency.location` text (`MobileEmergency.jsx:404-405`). | Loaded rows carry `patient_location`, `pickup_location`, and `responder_location`; desktop uses `LocationCell` for those shapes (`EmergencyRequestsPage.jsx:1011-1015`). | confirmed field-shape drift | Mobile can show `Location tracking...` while desktop resolves the same row's PostGIS/object location. |
| Contact uses `contact_phone` or `patient.phone` (`MobileEmergency.jsx:411-412`). | Desktop uses `patient_snapshot.phone`, `requester_phone`, or `patient_phone` (`EmergencyRequestsPage.jsx:1001`). | confirmed display drift | Mobile can show `No contact` despite a phone in `patient_snapshot`. |
| Assigned ambulance uses `assignedAmbulance.vehicleId` and `eta` (`MobileEmergency.jsx:414-421`). | Console rows expose `ambulance_id`, responder fields, `eta_display`, and related vehicle fields after RPC dispatch; no `assignedAmbulance` object is synthesized by the page normalizer. | confirmed display drift | Mobile may hide assigned-response details that desktop/detail surfaces can render from responder fields. |
| Expanded approval action routes to `onView()` when cash approval is needed (`MobileEmergency.jsx:385-397,447-459`). | Parent `onView` opens `EmergencyDetailsModal`, which loads payment detail before approve/decline. | aligned | Cash approval is correctly directed to the backend-detail surface instead of dispatching immediately. |
| Non-approval action label says `Navigate` and calls `onEdit()`, which parent maps to `handleDispatch()` (`EmergencyRequestsPage.jsx:608-610`; `MobileEmergency.jsx:450-459`). | Main-page `handleDispatch()` includes status/cash preflight before `dispatchEmergency()`. | aligned with parent preflight; label drift | Mobile reaches the same dispatch preflight, but the label should not imply navigation if the action is backend dispatch. |
| Expanded ambulance line contains a bullet separator in text (`MobileEmergency.jsx:420`). | Text-only UI field. | encoding-gate required | This source currently contains intentional non-ASCII in mobile copy; any edit needs the same mojibake/non-ASCII review as desktop payment prompts. |

## Location Shape And Schema Guard Contract

Console already contains a schema validator that warns when emergency data uses legacy aliases such as `location` instead of `patient_location`, or `profiles` instead of `patient_snapshot` (`schemaValidator.js:136-185`). The audit finding is that this guard is not consistently connected to the surfaces that still render those aliases.

| Helper or surface | Accepted shape | Status | Finding |
| --- | --- | --- | --- |
| `parsePointInput()` in `emergencyService` | Accepts `{lat,lng}`, `{latitude,longitude}`, GeoJSON `Point`, and WKT `POINT(lng lat)` (`emergencyService.js:43-78`). | aligned with app-style inputs | This is the broader input-normalization shape console should reuse for emergency location writes. |
| `LocationCell` | Accepts PostGIS hex strings, plain strings, `.address`, and object `.lat/.lng` (`LocationCell.jsx:13-70`). | partial | It does not accept `.latitude/.longitude` objects directly, even though app code commonly uses those keys and `parsePointInput()` accepts them. |
| `locationUtils.decodePostGISGeometry()` | Accepts PostGIS hex, GeoJSON coordinates, and `.lat/.lng`; truthiness checks reject zero-valued coordinates (`locationUtils.js:11-63`). | partial | Use explicit finite-number checks rather than object truthiness before implementation. This is the same anti-pattern already documented in repo rules. |
| `locationUtils.formatEmergencyLocation()` | Formats strings, PostGIS hex, `.address`, pickup address, and `.lat/.lng` (`locationUtils.js:71-107`). | partial | It does not cover `.latitude/.longitude`, so app-shaped objects can fall through to `Location shared`. |
| `schemaValidator` | Names `location -> patient_location` and `profiles -> patient_snapshot` mismatches (`schemaValidator.js:136-185`). | useful but underused | The validator already encodes the mobile drift; implementation should wire it into high-risk row renderers or replace alias render paths. |

## Dispatch And Responder Telemetry Contract

The main emergency page and the map detail panel both call `dispatchEmergency()`, but they do not enforce identical preflight behavior. `dispatchEmergency()` itself then branches into bed-only acceptance through `console_update_emergency_request` or ambulance dispatch through `console_dispatch_emergency` (`emergencyResponseService.js:17-115`).

| Operation | Console behavior | SQL/app receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Main-page dispatch | `EmergencyRequestsPage` checks `getEmergencyActionState`, attempts cash eligibility preflight, then calls `dispatchEmergency()` (`EmergencyRequestsPage.jsx:420-447`). | Dispatch RPC rejects pending cash approval and terminal requests (`core_rpcs.sql:1763-1784`). | partially guarded | The page still has the earlier cash eligibility object-truthiness defect, but it at least routes through a preflight before dispatch. |
| Map-panel dispatch | `MarkerDetailPanel` calls `dispatchEmergency()` directly for pending/in-progress unassigned emergencies (`MarkerDetailPanel.jsx:128-146`). | Same RPC rejects pending approval and terminal states. | confirmed flow drift | Map dispatch bypasses the wallet/cash preflight attempted on the main page. Backend rejection protects correctness, but the user sees a generic dispatch failure instead of the cash/wallet explanation. |
| Ambulance assignment | Service selects the first available ambulance and passes ambulance, hospital, bed, and responder fields to `console_dispatch_emergency` (`emergencyResponseService.js:25-108`). | SQL locks request and ambulance, validates role/org scope, rejects non-dispatchable ambulance statuses, writes `status = 'accepted'`, ambulance/responder fields, and releases the previous ambulance if changed (`core_rpcs.sql:1720-1874`). | receiver aligned; selection simplistic | The RPC is strong, but the service's "best" ambulance selection is currently first-row selection, not ETA/proximity proof. Claim any optimization only after implementing and tracing route/ETA selection. |
| Bed-only dispatch | Service updates bed requests to `accepted` with hospital and generated bed number through `console_update_emergency_request` (`emergencyResponseService.js:69-84,160-169`). | Update RPC validates status transition but generated bed number is client-side random. | drift suspected | Bed acceptance reaches a guarded receiver, but bed-number allocation is not tied to a real room inventory or uniqueness contract. |
| Responder location update | Both emergency services call `console_update_responder_location`, then refetch the request (`emergencyService.js:681-708`; `emergencyResponseService.js:185-205`). | SQL requires active status, dispatch assignment, valid location JSON, scoped role, and normalizes heading (`core_rpcs.sql:2076-2177`). App tracking hooks consume responder location/heading for route recovery. | aligned receiver | Keep telemetry writes on this RPC path; avoid direct `emergency_requests` or `ambulances.location` writes from UI. |

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

## Billing FX Quote Contract

The patient app owns billing-country/currency quote behavior. It reads billing preferences, resolves a target currency, and calls `get_billing_quote` or `convert_currency_for_payment` through `billingQuoteService.getQuote()` (`C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/billingQuoteService.js:44-153`; `hooks/payment/useBillingQuoteQuery.ts:49`). The app-owned `billing-quote` Edge Function mirrors the same RPC path with a service client (`billing-quote/index.ts:33-120`). Console currently has no matching billing quote service or rendered FX quote surface in the worktree scan.

| Field/action | Console status | App/SQL receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Billing country/currency preference | No console billing preference UI/service was found in the current pass. | App preferences map `billing_country_code` and `billing_currency_code` (`preferencesService.js:25-39`); constraints require ISO-like `^[A-Z]{2}$` and `^[A-Z]{3}$` (`identity.sql:96-115`). | missing console support | Console should not display or edit regional quote behavior until it adopts the same preference shape and validation. |
| Quote calculation | No console call site for `get_billing_quote`, `convert_currency_for_payment`, or the `billing-quote` Edge Function was found. | SQL owns `exchange_rates`, `resolve_currency_for_country`, `get_billing_quote`, and `convert_currency_for_payment` (`finance.sql:82-96,902-1186`). | app-owned lane | This is not a console CRUD gap yet; it is an app-support contract. Console finance screens should avoid inventing local FX math. |
| Exchange rate refresh | Console has no rendered refresh action. | App runtime owns `refresh-exchange-rates`, which writes `exchange_rates` (`refresh-exchange-rates/index.ts:260`). | external runtime dependency | If console later needs rate administration, it must call or expose the app-owned refresh lane with admin authorization and stale-rate feedback. |
| Regional discount metadata | No console representation found. | `get_billing_quote` applies Nigerian regional discount metadata inside SQL (`finance.sql:961-1073`). | hidden app behavior | Sponsor/finance dashboards can misstate revenue if they summarize USD prices without noting patient display currency and regional quote metadata. |

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

## Bed Reservation View And Action Contract

The active reservation surface in `HospitalModal` is request-owned, not a separate bed-allocation table. `bedManagementService.getActiveReservations()` reads `emergency_requests` where `service_type = 'bed'` and status is one of `in_progress`, `accepted`, or `arrived`, then joins hospital/profile labels in the client (`bedManagementService.js:15-65`). That direction matches the app, which carries `bed_number` through emergency realtime, request, and visit projections (`ivisit-app/hooks/emergency/useEmergencyRealtime.js:141`; `ivisit-app/services/emergencyRequestsService.js:160,258`; `ivisit-app/services/visitsService.js:351-421`).

| UI/service field or action | Console behavior | App/SQL receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Active reservation list | Reads bed emergency requests with statuses `in_progress`, `accepted`, and `arrived`, then renders patient, bed category, bed number, and reserved timestamp (`bedManagementService.js:15-65`; `HospitalModal.jsx:672-751`). | Request and visit projections preserve `bed_number`; bed category is mapped in console emergency request utilities but is not proven as a separate allocation receiver in this pass. | partially aligned | Request-owned bed display is the right source, but room/category availability needs an explicit link to `room_pricing` and `bed_availability` before operators trust it as capacity truth. |
| Cancel active reservation button | View-mode button calls `bedManagementService.cancelReservation(reservation.id)` (`HospitalModal.jsx:725`). | Service exposes `cancelBedReservation()`, not `cancelReservation()` (`bedManagementService.js:142-159`); SQL guarded receiver is `console_cancel_emergency` and legacy `cancel_bed_reservation` (`core_rpcs.sql:1975,3049`; `emergency_logic.sql:1350`). | confirmed runtime defect | Clicking Cancel can throw before the canonical cancel RPC is reached. This is the same defect class as unsafe field-shape rendering: UI assumes a contract that the service does not expose. |
| Mark arrived | Button calls `updateReservationStatus(id, 'arrived')` (`HospitalModal.jsx:735`), and the service routes through `console_update_emergency_request` (`bedManagementService.js:272-291`). | SQL validates emergency status transition legality before write (`core_rpcs.sql:1585-1717`). | aligned with transition receiver | This action is correctly RPC-owned; implementation should keep it on the transition-guarded path. |
| Discharge patient | Button calls `dischargePatient()` and the service routes through `console_complete_emergency` (`HospitalModal.jsx:744`; `bedManagementService.js:124-139`). | SQL completion writes terminal `completed` (`core_rpcs.sql:1878-1972`). | aligned as transition action; display drift below | The transition path is guarded, but capacity math must not keep completed requests counted as occupied after discharge. |
| Utilization math | Service counts `arrived` and `completed` as occupied and `in_progress`/`accepted` as reserved (`bedManagementService.js:83-112`). UI displays `reservedBedsDisplay` as "occupied" and separately computes bar width from scalar hospital beds (`HospitalModal.jsx:119-123,644-662`). | App availability projection reads scalar beds plus `bed_availability`; patient room quote reads `room_pricing` for the selected hospital (`ivisit-app/services/hospitalsService.js:321-390,647,969-973`; `ivisit-app/services/pricingService.js:193-254`). | confirmed display drift | A completed bed request can remain counted as occupied, while the rendered bar is based on different scalar-bed math. Operators can see inconsistent occupied/reserved semantics. |
| Room bucket and price linkage | Active reservation list can display `bed_category` and `bed_number`, but utilization ignores room buckets and pricing rows. | `room_pricing` is hospital-scoped and app cost/room behavior depends on selected-hospital pricing plus bed availability snapshots. | missing implementation | Console cannot yet prove that a displayed reservation consumes the correct room bucket or that a room-type edit affects the patient quote for that reservation. |

## Emergency Detail Render-Coercion Contract

The detail modal is the highest-risk read surface for silent schema drift because it renders emergency rows directly after realtime and list projections. Fields such as `service_type`, `ambulance_type`, `bed_category`, `patient_location`, `pickup_location`, `responder_location`, `patient_snapshot`, `cost_breakdown`, and payment metadata must each be treated by their source type, not by optimistic parsing in JSX.

| UI receiver | Current code evidence | Source contract evidence | Status | Implementation target |
| --- | --- | --- | --- | --- |
| Ambulance type label | Current helper only calls `JSON.parse` when a string starts with `{` or `[` and otherwise formats the raw service token (`EmergencyDetailsModal.jsx:32-61`). | Console schema validator declares `ambulance_type` as a string (`schemaValidator.js:21`); app decision/payment helpers treat service type keys as strings unless a richer object is already present. | corrected current crash class | Keep this guard pattern for every field that may be either string token or object. Never parse a plain service token such as `ambulance`. |
| Location display | Modal delegates patient/pickup/responder location to `LocationCell` (`EmergencyDetailsModal.jsx:550-559`), which can render raw address strings, PostGIS hex strings, or object locations. | Shared location utilities explicitly accept `object|string` for emergency location fields and decode PostGIS only when the string starts with `0101` (`locationUtils.js:7-63`; `schemaValidator.js:23-25`). | aligned pattern | Keep location coercion in location utilities/components. Do not inline map URL or coordinate assumptions from arbitrary row fields without extracting valid coordinates first. |
| Payment metadata parsing | Wallet backfill parses `payments.metadata` only if it is a string and skips malformed values (`walletService.js:321-327`). | Supabase JSONB normally arrives as object, but older or repaired rows can be string payloads. | acceptable service-boundary guard; risky side effect noted above | JSON coercion belongs in service/helper boundaries with fallback behavior, not render branches. |
| Detail projection ownership | Modal gets payment and visit projections through `getEmergencyDetailProjection()` and realtime refresh through `subscribeToEmergencyDetail()` (`emergencyService.js:237-297`). | Detail projection reads emergency, latest payment, and terminal visit separately; it does not normalize every render field. | partially aligned | Add a shared emergency detail mapper before implementation so UI fields are already typed, labelled, and safe before rendering. |

**Audit implication:** every drift-suspected read surface needs a field-to-render coercion row, not only a table/RPC row. The `JSON.parse("ambulance")` failure would be caught by asking whether `ambulance_type` is contractually JSON, scalar text, or union-shaped before it reaches JSX.

## Facility Taxonomy And Discovery Contract

The app no longer treats every provider row as a dispatchable hospital. Its hospital service checks `provider_type`, `emergency_eligible`, `dispatch_eligible`, `booking_eligible`, `provider_source`, and `category_confidence` when projecting discovery and emergency eligibility (`ivisit-app/services/hospitalsService.js:126-131,579-589`). SQL source adds the same taxonomy to `hospitals` and exposes it through nearby/discovery RPCs (`org_structure.sql:416-503`; `core_rpcs.sql:6-123`).

| UI/service field | Console behavior | App/SQL receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Facility tier `type` | Modal labels `type` as Tier with `premium`, `standard`, `basic` (`HospitalModal.jsx:395-412`), and service writes it as `hospitals.type`. | App provider taxonomy is `provider_type`, not `type`; dispatch filtering uses `provider_type = 'hospital'` plus `emergency_eligible`. | confirmed semantic mismatch | Console tier does not control whether the row is a hospital, clinic, pharmacy, or dispatchable emergency facility. |
| `provider_type`, `emergency_eligible`, `booking_eligible`, `provider_source`, `category_confidence` | Not exposed by the active hospital modal and not in create/update payload allowlists. | SQL declares and app reads these fields; discovery functions can stamp them from provider source and category. | missing console control | Console cannot intentionally correct Explore Care taxonomy or emergency classification for provider rows. |
| `dispatch_eligible` | Console toggles `verified`, `verification_status`, and `status`; trigger derives `dispatch_eligible` from `emergency_eligible`, verification, and availability (`org_structure.sql:479-503`). | App trusts `dispatch_eligible` when present. | partial alignment | Verification/status edits can change dispatchability, but console cannot set `emergency_eligible`, so it cannot intentionally exclude non-emergency provider rows from ambulance dispatch if defaults are wrong. |
| Google text search in modal | Modal posts `{ query, mode: 'text_search', limit: 5 }` via raw `fetch` and reads `data.hospitals` (`HospitalModal.jsx:146-176`). | App-owned `discover-hospitals` handlers commonly return `data` plus metadata and support provider category, Google/Mapbox source, merge, and attribution flags. | confirmed contract drift | Current modal search can miss returned results or omit category/source flags, and it does not carry operator identity or merge intent explicitly. |
| Import service discovery | `hospitalImportService.importHospitalsFromGoogle()` invokes `discover-hospitals` with nearby coordinates, Google Places, and merge enabled (`hospitalImportService.js:13-56`). | App-owned function can persist `hospitals` and `providers` through service-role helpers. | high-authority external writer | Console import uses an app runtime writer for canonical provider truth; implementation must treat it as a backend mutation boundary, not just search autocomplete. |
| Hospital media provenance | Modal writes `hospitals.image`; media source/confidence/attribution fields and `hospital_media` rows are not managed from the UI. | App media helpers choose between provider photo, provider image, domain logo, and fallback using source/confidence metadata. | provenance drift | Manual image edits can affect app presentation without recording why the image should override discovery/fallback media. |

## Emergency Timeline, Communication, And Clinician Assignment Receiver Gaps

These receivers do not appear in the current Console service inventory as active workflow owners, but they are part of the same operator-owned emergency event. Their absence is a missing operational surface, not proof that the capability is out of scope.

| Shared receiver | Source/app evidence | Console evidence | Status | Implementation target |
| --- | --- | --- | --- | --- |
| `emergency_status_transitions` | Transition-guarded emergency RPCs record request state context before or with request updates (`ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:1585-1717`). | Present in generated database types; no rendered emergency timeline or read service was found in the runtime scan. | missing required read surface | Pass 1 renders append-only transition history in the emergency detail flow; Console must not invent or directly edit history. |
| `emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages` | App owns emergency chat creation, message send, read marker, and realtime through `ensure_emergency_chat_room`, `send_emergency_chat_message`, and `mark_emergency_chat_room_read` (`ivisit-app/services/emergencyChatService.js`; `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:3335,3475,3625,3681`). | Tables exist in generated types; no Console emergency-chat service, modal, or page consumer was found. | missing required operational communication | Pass 1 adds request-scoped communication projection and action behind existing RPC and participant authority; emergency operators cannot be absent from an active care channel. |
| `emergency_doctor_assignments` | Organization schema defines persisted assignment rows and core RPC exposes `assign_doctor_to_emergency` (`ivisit-app/supabase/migrations/20260219000200_org_structure.sql:288`; `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:1067`). | No Console service, action, or projection writes or renders the persisted assignment; detail screens can only infer staff context. | missing required clinical handoff | Pass 1 establishes emergency-detail projection/action authority and Pass 5 integrates eligible scheduled clinicians; no display-only assignment fiction. |

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
| Pricing ownership and facility scope | Make hospital identity explicit in Console pricing CRUD and rendering: active quotes are facility-scoped through `service_pricing` and `room_pricing`; never silently treat an earliest hospital as an organization override. |
| Availability writer ownership | Route capacity/status/wait operational controls through `update_hospital_availability`; keep administrative metadata editing separate unless an equivalent operational receiver is deliberately proven. |
| Bed reservation action and capacity semantics | Fix the view-mode cancel action to call the exposed cancel RPC path, and define whether completed/discharged requests should be excluded from occupied bed counts. |
| Bed room bucket ownership | Connect active bed reservations to `bed_availability` and `room_pricing` by hospital and room type before rendering capacity/price certainty from reservation rows. |
| Emergency detail field-shape standard | Treat `formatAmbulanceType()` as the minimum pattern: every mixed app/console field rendered in detail modals must be shape-checked before parsing or formatting. |
| Mobile emergency row projection | Normalize mobile rows to the same `patient_snapshot`, `patient_location`, responder, and ETA fields used by desktop/detail surfaces, or synthesize aliases once in the page normalizer. |
| Location utility consolidation | Reuse one location normalizer for `lat/lng`, `latitude/longitude`, GeoJSON, WKT, PostGIS hex, and address objects before rendering or sending responder/request location payloads. |
| Dispatch entrypoint parity | Main-page, mobile, and map-panel dispatch controls should share the same cash/wallet/status preflight and user-facing failure messages before calling the dispatch RPC. |
| Route/ETA selection proof | Do not describe console dispatch as optimized until ambulance selection uses route/ETA/proximity evidence instead of first available row selection. |
| Emergency transition timeline | Render receiver-backed `emergency_status_transitions` history in the detail flow as read-only operational truth. |
| Emergency communication | Provide request-scoped chat using the existing app/RPC participant and realtime authority; do not create a parallel message model. |
| Clinician emergency handoff | Project and command `emergency_doctor_assignments` through the guarded assignment boundary, coordinated with real scheduled or eligible clinicians. |
| Facility taxonomy ownership | Add a deliberate console owner for `provider_type`, emergency/booking eligibility, provider source, confidence, and media provenance before changing discovery/import or facility CRUD. |
| Ledger repair ownership | Remove normal-page auto-mutation behavior from the supported CRUD path and assign maintenance invocation/audit ownership. |

## Read-Only Live Follow-Up

### Demo Organization Trust Boundary (2026-07-19)

- Stable coverage-demo organizations remain visible to operators because they
  support patient fallback and QA. Their canonical ownership markers are the
  `@ivisit-demo.local` contact domain and `iVisit Coverage Network` name prefix;
  no schema field or migration is introduced.
- Console organization projections classify those rows as `simulated` at the
  service boundary. Demo organizations remain in the full registry count, but
  are excluded from funded and payout-gap totals so synthetic readiness cannot
  become operational finance truth.
- Desktop, tablet, mobile, detail, and Copilot organization contexts render
  demo provenance explicitly and show the wallet as `Simulated`, while ordinary
  organizations continue to render their receiver-owned wallet currency and
  balance.

Aggregate live confirmation is recorded in `READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md` and `../../../database/console-app-alignment/READ_ONLY_AUDIT_EVIDENCE_2026-05-24.md`. It observes one terminal cash-linked request without completed payment, seven cash payment/request-hospital organization mismatches, zero non-empty hospital `bed_availability` values across 1,278 hospital rows, and zero populated ER-wait values.

A SELECT-only finance follow-up found 28 completed cash payments with positive stored fees and referenced ledger pairs. Only 6 pairs use ordinary cash-payment labels; 22 pairs are explicitly labelled `runtime_data_integrity_repair` backfill output. These reads confirm an already-repaired cash settlement population and multiple writer lanes; they do not attribute any specific payment to the current console button path.

A separate client-scoped SELECT-only pricing follow-up found 21 visible organizations with multiple hospitals, containing 410 of 422 visible service-pricing rows and 208 of 219 visible room-pricing rows. The read scope is not a population count, but it confirms that silent earliest-hospital resolution is already relevant to visible console/app pricing data.
