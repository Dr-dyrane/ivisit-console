# Pass 2 Wallet, Stripe, And Ledger Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, cleanup, payout, Stripe call, migration, or ledger repair is authorized by this document.

This subplan covers console wallet management, payment methods, top-ups, payouts, ledger visibility, payment history, finance analytics, cash-payment fee handling, and repair/backfill controls.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/WalletManagementPage.jsx`
- `frontend/src/components/modals/GlobalFinancialModals.jsx`
- `frontend/src/components/context/WalletPanel.jsx`
- `frontend/src/components/mobile/MobileWallet.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/services/walletService.js`
- `frontend/src/services/activityService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/hooks/useContextAction.js`

Patient-app and shared receiver evidence:

- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/payment/workflow_map.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/paymentService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/billingQuoteService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219000400_finance.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219000700_security.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219000900_automations.sql`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payment-intent/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/create-payout/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/billing-quote/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/payments/refresh-exchange-rates/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts`

Audit docs:

- Stage 3 capability gap audit.
- Stage 4 L5 ownership audit.
- Stage 5 service coverage audit.
- Stage 6 implementation pass plan.
- Emergency/payment/capacity contract chart.
- Read-only live confirmation matrix.

Observed source signals:

- `WalletManagementPage` owns direct Supabase reads for `ivisit_main_wallet`, `organization_wallets`, `wallet_ledger`, and `payments`.
- `walletService.js` also reads wallets, ledger, analytics, Stripe status, and payment methods.
- `GlobalFinancialModals` executes top-up, withdrawal, setup intent, and payment-method flows from modal state.
- The shared context action for `/pricing` dispatches `openTopUpModal`, so a pricing-route primary action currently enters wallet funding rather than pricing management.
- `walletService.backfillMissingFeeLedger` is callable from ordinary wallet UI.
- `EmergencyRequestsPage` directly calls `walletService.checkCashEligibility` and `walletService.processCashPayment`, including hospital id fallback as organization id.
- `topUpWallet` creates a PaymentIntent and comments that Stripe/webhook later credits the wallet.
- `WalletManagementPage` loads only the latest `50` ledger rows and `50` payments, enriches payments per row, reports loaded ledger length as transactions recorded, and exports only that loaded ledger window.
- `WalletManagementPage` automatically calls `backfillMissingFeeLedger` when an organization admin mounts the route; that helper directly inserts `wallet_ledger` debit rows and updates `payments.metadata`.
- `GlobalFinancialModals` declares "Wallet topped up successfully" immediately after `topUpWallet` returns an intent, before Stripe confirmation or webhook-reflected wallet/ledger truth.
- `GlobalFinancialModals` tells the user withdrawal funds will transfer instantly and gates submission only on the displayed wallet balance before invoking the payout Edge Function.
- The desktop payment-detail dialog is titled `Payment Complete` for any selected payment row even though the selected row's rendered status can be non-completed.
- `WalletPanel` shows `Verified`, `Main Portfolio`, and `Linked` without binding those labels to Stripe/account evidence, and renders `projection || (wallet?.balance * 0.12)` as `Yields`, fabricating a yield when projection is zero or unavailable.
- `MobileWallet` derives credit, payment-success and period-trend metrics from the same capped route previews, so its KPI presentation cannot be read as complete finance analytics.
- Console source contains corrupted separator bytes in wallet footer and displayed card masking text; these are visible financial-copy defects to repair during implementation.
- The patient app already has a billing quote service and adopted quote snapshot on core checkout/payment owners, while Console has no `get_billing_quote` or `exchange_rates` consumer and formats wallet/payment values as wallet currency or USD.
- The live Console invokes `create-payment-intent`, `create-payout`, and `manage-payment-methods`, but those receiver sources are owned in `ivisit-app/supabase/functions`, not in the Console Edge Function tree. They are shared finance receivers that require cross-repo payload, authorization and reflection validation before Console financial actions are implementable.
- The patient-app function tree additionally owns `billing-quote`, `refresh-exchange-rates`, and `stripe-webhook`; none is a direct Console invocation in this scan, but they are authoritative dependencies for patient quote meaning, FX freshness and Stripe-confirmed completion.
- Shared `handle_new_organization()` creates an organization wallet only when a canonical `organizations` row is inserted; the current Console onboarding path inserts a hospital and writes that hospital id as profile organization scope, so wallet existence/scope cannot be assumed from completed onboarding.
- `process_payment_distribution()` appends organization/platform ledger effects only when a non-cash, non-top-up payment transitions to completed. This makes page-mount ledger backfill and pre-reflection modal success copy direct contradictions of the canonical generated-evidence path.

## User Flow

Operator path:

1. Open wallet management.
2. See platform or organization wallet balance, ledger, payment history, projected revenue, and Stripe status.
3. Add, list, delete, or select payment methods.
4. Top up wallet using a saved card.
5. Withdraw or request payout.
6. Export ledger.
7. See cash-payment fee effects from emergency flows.
8. Run maintenance repair only through explicit, authorized maintenance controls.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Wallet summary | Page direct reads plus service reads plus `PageDataContext`. | Wallet read facade. |
| Ledger visibility | Direct wallet-id filtering in page/service. | RLS-aware ledger owner with neutral unauthorized/degraded state. |
| Payment history | Page direct `payments` query and profile enrichment. | Wallet/payment history projection. |
| Top-up | Modal calls function and may treat setup as sufficient. | Stripe/payment owner with pending webhook reflection state. |
| Pricing-route top-up entry | Shared page action opens a money command from a rate-management surface. | Deliberately scoped finance entry only; pricing operations remain separate in Pass 3. |
| Payout | Modal calls function after displayed-balance check. | Payout owner with backend reservation/sufficiency proof. |
| Payment methods | Modal/page call function actions independently. | Billing-method owner with per-action pending state. |
| Cash fee processing | Emergency page calls wallet service directly. | Emergency/payment owner delegates to wallet/ledger receiver after eligibility proof. |
| Maintenance backfill | Ordinary org-admin route mount automatically calls a repair path that writes ledger/payment metadata. | Explicit maintenance-only flow with separate authorization and read-only evidence. |
| Ledger/history window and export | Latest-`50` preview is displayed and exported without explicit incomplete-history scope. | Wallet-owned server-paged history or clearly labelled recent-window view/export semantics. |
| Displayed verification/linked/yield labels | Context panel supplies static trust labels and a balance-derived yield fallback. | Evidence-backed account state and projection, or unavailable state; no invented performance/status claim. |
| Payment detail status | Any selected row opens a detail surface headed as complete. | Title/status and financial effects derived from the actual projected payment lifecycle. |
| Billing currency and patient quote relationship | Console formats USD/wallet currency without consuming the app quote lane. | Keep operational wallet accounting currency explicit; surface patient display quote context only through shared finance quote truth. |

## Surface Read, Exposure, And Operation Closure

| Surface and mounted path | What it reads and renders now | Mutation or receiver path | Deterministic audit result |
| --- | --- | --- | --- |
| `/wallet` desktop balance, ledger and payment tabs | Direct platform/org wallet row, latest `50` ledger rows, latest `50` payments with per-row profile lookups, projection and payment methods. Footer reports loaded ledger count as transactions recorded. | Top-up, withdraw, method management events; route mount auto-runs ledger backfill for org admins; export emits the loaded ledger window only. | **Blocked, high risk.** A read surface mutates derived financial evidence, and capped recent windows are represented/exported as if complete history. |
| Desktop payment detail dialog | Selected payment fields, patient/payer and emergency/hospital context; fixed heading `Payment Complete`. | Read-only dialog over page-selected payment row. | **Blocked.** A pending, failed or refunded row can be visibly labelled completed. |
| `WalletPanel` global context surface | Balance, projection/yield, linked/verified copy and four recent ledger rows from global context wallet data. | Top-up, withdraw and `exportLedger` events. | **Blocked.** Static trust state and fabricated yield fallback are not receiver-backed; export can depend on which route is mounted. |
| `MobileWallet` route variant | Same wallet, latest ledger/payment previews and payment methods; derives inflow/payment-success trends and counts in-client. | Top-up, withdrawal, billing, analytics and payment-detail callbacks. | **Blocked.** Metrics appear analytic but are calculated from capped preview collections without explicit scope. |
| `GlobalFinancialModals` top-up | Amount and saved method availability; uses USD copy. | `create-payment-intent` through `topUpWallet`; immediately says wallet was topped up. | **Blocked.** PaymentIntent creation is not wallet credit reflection or payment confirmation. |
| `GlobalFinancialModals` withdrawal/payout | Displayed available balance and USD input; promises instant primary-payout transfer. | `create-payout` through `withdrawFunds`; refreshes wallet after invocation. | **Blocked.** Client balance is not sufficiency/reservation proof and payout reflection state is unmodelled. |
| Billing/payment method modal | Lists saved Stripe methods and confirms setup intent through Stripe card setup. | `manage-payment-methods` Edge Function plus Stripe setup confirmation; payout-method function exists in service. | **Partially traced.** Setup confirmation is present; actor scope, detach/default payout result visibility and corrupted masked-card copy remain gates. |
| Emergency cash boundary | Emergency page invokes cash eligibility and settlement with possible hospital-id fallback. | `check_cash_eligibility` and `process_cash_payment` RPC paths. | **Blocked dependency from Pass 1.** Amount input is ignored by eligibility helper, organization identity can be incorrect, and settled-copy requires refreshed ledger/payment truth. |
| Patient billing quote dependency | No found Console quote/rate consumer; operational wallet UI displays USD/wallet currency. | Patient app calls billing quote/conversion RPCs and renders quote snapshots. | **Explicit dependency only.** Console must not calculate FX locally or confuse accounting currency with the patient's display quote. |
| Insurance billing outcome | No found Console rendered `insurance_billing` result surface. | Trigger creates outcomes; shared RLS permits scoped reads. | **Missing required read dependency.** Pass 7 owns the result/exception surface; Pass 2 must account for it in finance projection semantics. |
| Cross-repo Edge receiver ownership | Console calls top-up, payout and method-management slugs whose inspected implementations exist only in the patient-app/shared Supabase tree. | `ivisit-app` Edge Functions and Stripe webhook own command/result behavior. | **Receiver topology proved, behavior still blocked.** Do not introduce parallel Console functions; validate roles, organization scope, pending/webhook reflection and deployment together. |
| Wallet initialization and ledger automation | Onboarding and payment completion can appear to establish organization money truth. | `handle_new_organization()` creates org wallet only for canonical organizations; `process_payment_distribution()` creates credited ledger effects only after eligible completed payments. | **Blocked cross-pass dependency.** Pass 4 must repair org creation/scope; this pass must observe generated ledger/reflection instead of repairing it from a normal read surface. |

## Patient-Facing Dependency Closure

| App-owned financial truth | Evidence | Console obligation |
| --- | --- | --- |
| Card/cash/wallet lanes remain distinct | Patient payment workflow names `create-payment-intent`, cash approval and wallet ledger effects as separate receiver paths. | Do not use top-up, manual cash or a ledger repair path as interchangeable proof of payment completion. |
| Billing currency quote snapshot | Patient billing plan and `billingQuoteService` use server quote/conversion RPC results and stale/fallback metadata. | Label Console wallet accounting currency explicitly and avoid claiming patient-facing charged/display value without the quote snapshot. |
| Ledger reflection and emergency status | Shared receivers write payment/request/ledger consequences from guarded commands and webhook/automation paths. | Money success copy and analytics must follow refreshed receiver-backed state; normal page mount cannot repair ledger evidence. |
| Insurance settlement outcome | Shared automation creates `insurance_billing` after eligible completion, with scoped RLS. | Wallet reporting must acknowledge insurance result dependency while policy/result workflow is implemented in Pass 7. |

## Pass 2 Deterministic Surface Register

| Surface family | Read/render closure | Command/receiver closure | Completeness and reflection closure | Status |
| --- | --- | --- | --- | --- |
| Desktop wallet history/payment route | Direct reads mapped. | Backfill, events and selected-payment detail mapped. | Latest-`50` and N+1 enrichment/export remain incomplete. | Blocked |
| Wallet context panel | Read labels and event paths mapped. | Top-up/withdraw/export event receivers traced. | Global projection uses unsupported trust/yield labels. | Blocked |
| Mobile wallet | Visible fields/KPIs mapped. | Route callbacks mapped. | Client trends use capped previews. | Blocked |
| Top-up and payout modals | Amount/method/balance promises mapped. | Edge Function invocations mapped. | Webhook/payout reflection and truth copy missing. | Blocked |
| Payment method modal | Saved-card/setup paths mapped. | Stripe setup and Edge calls mapped. | Full management/result authority needs confirmation. | Partial / blocked |
| Emergency cash financial effects | Pass 1 path linked. | RPC/service drift mapped. | Payment/ledger reflection not safely presented. | Blocked dependency |
| App quote and insurance outcome | Backend/app dependency traced. | No Console receiver required for FX; Pass 7 owns insurance surface. | Finance meaning cannot close without explicit dependency treatment. | Missing dependency/read surface |

## Cross-Pass Finance Register

| Dependent pass | Finance dependency that must not be lost |
| --- | --- |
| Pass 1 - emergency lifecycle | Cash eligibility, approval/manual settlement ordering, retry payment and confirmed ledger/payment copy. |
| Pass 3 - facility and pricing | Hospital-scoped patient prices versus operational wallet accounting and the accidental pricing-route top-up action. |
| Pass 4 - organization identity | Canonical organization/wallet scope and Stripe account ownership; no hospital UUID substitution. |
| Pass 6 - visits/outcomes | Clinical outcomes associated with billed emergency/payment records. |
| Pass 7 - insurance and subscriptions | Trigger-created insurance billing result/exception read surface; subscriber lifecycle is separate from payment/wallet authority. |
| Pass 8 - analytics and global shell | Finance widgets, export, global modal mounting and all aggregate/source labels. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View organization/platform balance | Scoped read projection | `organization_wallets`, `ivisit_main_wallet`, Stripe status projection | One wallet facade; preserve actor scope. |
| View ledger/history | Backend-derived read-only evidence | `wallet_ledger`, `payments` | No normal UI ledger insert, rewrite, or repair. |
| Export ledger/history | Scoped data export | Wallet read/export owner with declared dataset scope | Do not export a capped recent preview as complete ledger history. |
| Top up or withdraw/payout | Workflow command | Stripe Edge Function/webhook and guarded payout receiver | Render pending/reflection state until backend truth changes. |
| Enter top-up from surrounding routes | Workflow navigation and command exposure | Wallet-owned action surface | Remove the accidental `/pricing` entry point unless explicitly redesigned and authorized as a finance handoff. |
| Manage payment method | Workflow command/owner-controlled data | Stripe payment-method function and confirmation state | Do not direct-administer patient or organization payment rows. |
| Process emergency cash fee | Workflow command | Approved cash settlement/payment RPC | Emergency path delegates; no false fee-deducted copy. |
| Run historical repair | Excluded from ordinary UI | Separate authorized maintenance plan | Remove from normal wallet operations. |
| Render trust/status/yield analytics | Backend-derived read-only evidence | Wallet/account/reflection projection | Do not render static `Verified`/`Linked` or calculated fallback yield as proved financial state. |
| Display patient quote or FX basis | Scoped dependency read only where required | Patient billing quote lane / finance RPCs | No Console-side currency conversion or refresh command unless separately authorized. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Wallet/payment identity | actor scope, `organization_id`, wallet identity, payment `emergency_request_id`, amount, method, status and currency | Never substitute `hospital_id` for organization identity; do not expose money action without scoped identity proof. |
| Ledger and cash settlement evidence | balance, fee percentage, ledger amount/type/reference/time and reflected payment/request state | Ledger is derived backend evidence; no page-load insertion/backfill or UI-only fee-deducted claim. |
| Stripe action/reflection state | customer/account/method ownership, top-up discriminator, intent/payout pending, webhook-reflected completion/failure | Funding and payout stay pending until authoritative reflection; organization-sensitive functions require actor authorization proof. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

The first wallet implementation slice must make the finance surface truthful before changing money movement. It should start by replacing direct page reads and optimistic copy with one normalized wallet projection and explicit command lifecycle states.

| UI field or action | Current render or payload site | Current assumption | Required projection or receiver contract |
| --- | --- | --- | --- |
| Wallet balance and currency | `WalletManagementPage.fetchData()` reads `ivisit_main_wallet` or `organization_wallets`; panels/mobile consume that row. | A visible row equals current available funds. | `walletDisplay.balance`, `currency`, `updatedAt`, `scope`, `availableForPayout`, and `visibilityState`; payout must not rely on the display balance as reservation proof. |
| Wallet scope | Page uses admin versus org-admin role and `profile.organization_id`; emergency cash falls back to `request.hospital_id`. | Any UUID-shaped org/hospital field can scope finance reads/actions. | `financeScope.organizationId` must be canonical organization UUID only; hospital UUID fallback is invalid and must produce unavailable/error state. |
| Ledger rows and transaction count | Page loads `.limit(50)` ledger rows; footer says `${ledger.length} Transactions Recorded`; export uses loaded rows. | Latest preview is complete ledger history. | `ledgerPreview.rows`, `ledgerPreview.windowLabel`, `ledgerTotal` when authorized, and export scope. UI copy must say recent window unless server-paged/full export exists. |
| Ledger mutation/backfill | Wallet route auto-runs `backfillMissingFeeLedger(profile.organization_id)`. | Normal read route may self-heal financial evidence. | Ordinary wallet mount performs no mutation. Any repair becomes excluded maintenance with explicit authorization, dry-run/read-only evidence and separate commit plan. |
| Payment history row | Page loads latest `50` payments and profile-enriches each row; detail title says `Payment Complete`. | Selected payment is complete and fully enriched. | `paymentDisplay.statusLabel`, `statusTone`, `amount`, `currency`, `payer`, `requestLink`, and `visibilityState`; dialog title must derive from row lifecycle, not a fixed complete state. |
| Payment method list | Page/modal call `listPaymentMethods(orgId)` from route and global modal. | Method availability means a top-up can complete. | `billingMethods.state` and per-method ownership/action state. A saved method permits a payment attempt only; it is not funding completion. |
| Top-up submit | `GlobalFinancialModals.handleTopUp()` sends `Number(amount)`, description and org id; service omits top-level `is_top_up`; UI says wallet topped up. | PaymentIntent creation equals wallet funding. | Payload must include receiver-required top-up discriminator and Stripe confirmation path, then render `pending_confirmation`, `pending_webhook`, `completed`, or `failed` from reflected backend truth. |
| Withdrawal submit | `handleWithdraw()` sends `Number(amount)`, description and org id after checking only input/display state. | Payout request equals safe withdrawal initiation. | Receiver must prove actor, organization scope, sufficiency/reservation and payout reflection. UI copy says only what the receiver returns and refresh proves. |
| Amount parsing | Top-up/withdraw/cash pass `Number(amount)` after `isNaN` checks. | Any numeric-looking input is a valid money amount. | Use a money parser that rejects empty, zero, negative, non-finite and excessive precision values before payload creation; keep currency explicit. |
| Stripe status/trust labels | `WalletPanel` renders `Verified`, `Main Portfolio`, `Linked`, and yield fallback. | Static labels can represent account readiness or performance. | Only render labels backed by Stripe/account fields or wallet projection; otherwise use unavailable/not configured states. No computed fallback yield. |
| Emergency cash eligibility | Page calls `checkCashEligibility(orgId, estimatedAmount)` and tests returned object truthiness. | Returned object truthiness equals eligible fee coverage. | Eligibility contract must consume `result.eligible`, `balance`, `fee_percentage`, `fee_amount` and organization identity; copy remains estimate until settlement receiver reflects actual ledger/payment state. |
| Cash settlement copy | Emergency completion path says fee deducted after `processCashPayment`. | RPC success equals wallet/ledger settled. | Settlement UI must refresh payment/request/ledger projection and distinguish recorded cash, ledger pending/missing, and settlement failed. |
| Patient quote/FX | Console displays USD/wallet currency while app owns billing quote snapshots. | Operational wallet amount equals patient display quote. | Console labels accounting currency only; patient quote/FX context appears only through the shared app quote/finance receiver or remains out of scope. |

Implementation rule: the first slice may create the wallet projection/read facade and remove optimistic/mutating read behavior, but it must not execute backfill, deploy Edge changes, or alter historical ledger/payment data.

Generated trace confirmation (May 25): `exchange_rates` now has a cross-repo table-flow trace with zero matched Console CRUD surfaces. FX remains an app billing/function dependency; this pass may expose the basis for a proven financial read only where needed and must not introduce independent Console conversion or refresh logic.

## Implementation Packages

### 1. Wallet Read Facade

Create one facade/hook that returns:

- actor role and scope
- platform wallet or organization wallet
- wallet balance/currency/updated time
- ledger rows and ledger authorization/degraded state
- payment history rows with emergency/profile context
- projected revenue and finance analytics
- Stripe/customer/account status
- payment methods
- loading, refreshing, empty, unauthorized, and stale flags

Acceptance gate:

- `WalletManagementPage`, wallet panels, mobile wallet, analytics finance widgets, and `PageDataContext` do not duplicate wallet/ledger/payment reads.
- History counts, derived metrics and exports declare recent-window scope or use an authoritative paged/export dataset.
- Payment-detail status headings and account/Stripe trust labels come from projected evidence, not static copy.

### 2. Top-Up Lifecycle

Top-up must be modeled as a lifecycle:

- request PaymentIntent
- confirm payment through Stripe.js when required
- wait for webhook/refetch reflection or show pending confirmation
- update wallet only from backend/webhook truth

Acceptance gate:

- UI does not show wallet balance credited after PaymentIntent creation alone.
- Failure, pending, and webhook-lag states are visible.
- A top-up intent cannot produce completed-funding copy before Stripe confirmation and backend reflection are visible.

### 3. Payout Lifecycle

Payout must be backend-authorized:

- backend proves actor can withdraw for the organization/platform scope
- backend proves funds are sufficient or reserved
- Stripe payout result is reconciled with ledger/wallet state
- failure state does not leave balance ambiguous

Acceptance gate:

- Payout submit is guarded by row/action pending state and cannot race stale displayed balance.
- The UI does not promise instant transfer unless the payout receiver returns and reflects that exact completed state.

### 4. Payment Method Management

Consolidate:

- create setup intent
- list payment methods
- delete payment method
- set payout method

Acceptance gate:

- Method actions refresh through the billing owner.
- Success copy names exactly what was confirmed: setup intent, card linked, method removed, payout method selected.

### 5. Cash Fee And Emergency Boundary

Emergency cash handling must not be an ad hoc wallet page concern:

- cash eligibility must use organization id, not hospital id fallback
- estimated fee must be shown as estimated until backend confirms settlement
- process cash payment must run before/inside legal emergency completion state
- ledger/payment reflection must be confirmed before "fee deducted" copy

Acceptance gate:

- Emergency pass and wallet pass agree on the cash fee receiver and copy.

### 6. Maintenance Isolation

Move repair/backfill actions out of ordinary wallet refresh:

- require explicit maintenance mode or remove from regular UI
- require read-only before/after evidence plan
- require dry-run summary if available
- require authorization proof

Acceptance gate:

- Ordinary wallet viewing cannot mutate ledger/payment data.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on wallet page for platform admin and org admin.
- Add payment card flow in non-production.
- Top-up flow verifies pending/webhook reflection state.
- Payout flow verifies duplicate-click guard.
- Ledger export still works from facade data.

Backend/Edge/RLS:

- RLS tests for platform admin, org admin, ordinary user wallet/ledger visibility.
- Edge Function tests for `create-payment-intent`, `create-payout`, and `manage-payment-methods`.
- Webhook reflection test or documented staging verification.
- Read-only proof before any maintenance repair/backfill.

Stop conditions:

- Do not run ledger backfill from this subplan.
- Do not show successful top-up/payout without backend reflected state.
- Do not use hospital id as organization id fallback.
