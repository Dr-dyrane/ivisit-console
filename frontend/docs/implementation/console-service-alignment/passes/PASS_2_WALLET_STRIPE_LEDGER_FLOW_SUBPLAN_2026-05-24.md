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
- `PageDataContext.fetchWalletData()` performs a separate global direct wallet/ledger read and caps context ledger rows at `10`, so global context surfaces can disagree with `/wallet`.
- `BentoHome` calls `getWalletSummary()` independently and renders balance/trend/today-income from a third finance read path.
- `Analytics` calls `getFinanceAnalytics()` independently and turns wallet ledger income into finance summary charts without sharing the wallet route's scope, history window or degraded-state semantics.
- `GlobalFinancialModals` declares "Wallet topped up successfully" immediately after `topUpWallet` returns an intent, before Stripe confirmation or webhook-reflected wallet/ledger truth.
- `GlobalFinancialModals` tells the user withdrawal funds will transfer instantly and gates submission only on the displayed wallet balance before invoking the payout Edge Function.
- `WalletManagementPage` lists payment methods with platform scope (`listPaymentMethods(null)`) for a platform admin, but its delete handler always submits `profile.organization_id`; the displayed collection and destructive command can therefore use different finance scope.
- `GlobalFinancialModals` imports `setPayoutMethod` but never invokes it, while its billing list labels every saved method `Primary`; no rendered default/payout-method truth backs that badge.
- The desktop payment-detail dialog is titled `Payment Complete` for any selected payment row even though the selected row's rendered status can be non-completed.
- `WalletPanel` shows `Verified`, `Main Portfolio`, and `Linked` without binding those labels to Stripe/account evidence, and renders `projection || (wallet?.balance * 0.12)` as `Yields`, fabricating a yield when projection is zero or unavailable.
- `MobileWallet` derives credit, payment-success and period-trend metrics from the same capped route previews, so its KPI presentation cannot be read as complete finance analytics.
- `WalletManagementPage` mounts the shared `AnalyticsModal` with `type="generic"` and derives its rows from capped ledger/payment previews and the saved-method list; a polished modal does not convert recent finance previews into complete wallet analytics.
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
| Payment-method command scope and primary designation | Platform method reads use `null` scope while route deletion passes `profile.organization_id`; billing modal badges every method `Primary` without calling the imported payout-selection receiver. | Billing-method projection must carry the same actor/scope through list, remove and payout-selection actions, and render primary/default state only from receiver-backed fields. |
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
| Wallet shared analytics modal | Mounted on desktop and mobile from `WalletManagementPage`; receives `type="generic"` values derived from capped ledger/payment preview arrays and method count. | Opens through route-local analytics state rather than a finance analytics receiver. | **Blocked.** It must consume the wallet projection's declared window/scope or be unavailable; generic health/segment language cannot imply complete financial evidence. |
| `GlobalFinancialModals` top-up | Amount and saved method availability; uses USD copy. | `create-payment-intent` through `topUpWallet`; immediately says wallet was topped up. | **Blocked.** PaymentIntent creation is not wallet credit reflection or payment confirmation. |
| `GlobalFinancialModals` withdrawal/payout | Displayed available balance and USD input; promises instant primary-payout transfer. | `create-payout` through `withdrawFunds`; refreshes wallet after invocation. | **Blocked.** Client balance is not sufficiency/reservation proof and payout reflection state is unmodelled. |
| Billing/payment method modal | Lists saved Stripe methods, renders every row as `Primary`, and confirms setup intent through Stripe card setup. | `manage-payment-methods` Edge Function plus Stripe setup confirmation; imported `setPayoutMethod` is not called by the rendered modal. | **Blocked.** Setup confirmation exists, but primary/default designation is fabricated and command scope/result visibility remain unproved. |
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
| Payment method modal and route removal control | Saved-card/setup paths and unconditional `Primary` label mapped. | Stripe setup is invoked; platform-list versus deletion-scope drift and unused payout-selection receiver are proved. | Primary/default and remove-result state are not truthful until one scoped billing projection owns them. | Blocked |
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
| Manage, remove or select primary payout method | Workflow command/owner-controlled data | Stripe payment-method function and confirmation state | Carry the same platform/organization scope used to list methods into each command; render no `Primary` badge until receiver-backed selection is projected. |
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
| Payment method removal and primary label | Platform route loads cards with `listPaymentMethods(null)` but `handleDeleteMethod()` calls `deletePaymentMethod(profile.organization_id, id)`; global billing modal renders `Primary` on every method while imported `setPayoutMethod` is unused. | The visible list implies its methods share one command scope and a proved payout/default state. | `billingMethods.scope`, `methodId`, `canRemove`, `isPrimaryPayoutMethod`, mutation pending/result and refreshed list must come from one billing owner. Platform actions remain platform-scoped; no static primary badge. |
| Top-up submit | `GlobalFinancialModals.handleTopUp()` sends `Number(amount)`, description and org id; service omits top-level `is_top_up`; UI says wallet topped up. | PaymentIntent creation equals wallet funding. | Payload must include receiver-required top-up discriminator and Stripe confirmation path, then render `pending_confirmation`, `pending_webhook`, `completed`, or `failed` from reflected backend truth. |
| Withdrawal submit | `handleWithdraw()` sends `Number(amount)`, description and org id after checking only input/display state. | Payout request equals safe withdrawal initiation. | Receiver must prove actor, organization scope, sufficiency/reservation and payout reflection. UI copy says only what the receiver returns and refresh proves. |
| Amount parsing | Top-up/withdraw/cash pass `Number(amount)` after `isNaN` checks. | Any numeric-looking input is a valid money amount. | Use a money parser that rejects empty, zero, negative, non-finite and excessive precision values before payload creation; keep currency explicit. |
| Stripe status/trust labels | `WalletPanel` renders `Verified`, `Main Portfolio`, `Linked`, and yield fallback. | Static labels can represent account readiness or performance. | Only render labels backed by Stripe/account fields or wallet projection; otherwise use unavailable/not configured states. No computed fallback yield. |
| Wallet analytics modal values | `WalletManagementPage` supplies `ledger.length + payments.length`, balance-presence `active`, recent payments and category counts to `AnalyticsModal type="generic"`. | Combined capped preview rows and card count are a finance analytics summary. | Render only source-labelled recent-window values from `WalletFinanceProjection`, or remove the analytics action until an authorized aggregate owner exists. |
| Emergency cash eligibility | Page calls `checkCashEligibility(orgId, estimatedAmount)` and tests returned object truthiness. | Returned object truthiness equals eligible fee coverage. | Eligibility contract must consume `result.eligible`, `balance`, `fee_percentage`, `fee_amount` and organization identity; copy remains estimate until settlement receiver reflects actual ledger/payment state. |
| Cash settlement copy | Emergency completion path says fee deducted after `processCashPayment`. | RPC success equals wallet/ledger settled. | Settlement UI must refresh payment/request/ledger projection and distinguish recorded cash, ledger pending/missing, and settlement failed. |
| Patient quote/FX | Console displays USD/wallet currency while app owns billing quote snapshots. | Operational wallet amount equals patient display quote. | Console labels accounting currency only; patient quote/FX context appears only through the shared app quote/finance receiver or remains out of scope. |

Implementation rule: the first slice may create the wallet projection/read facade and remove optimistic/mutating read behavior, but it must not execute backfill, deploy Edge changes, or alter historical ledger/payment data.

Generated trace confirmation (May 25): `exchange_rates` now has a cross-repo table-flow trace with zero matched Console CRUD surfaces. FX remains an app billing/function dependency; this pass may expose the basis for a proven financial read only where needed and must not introduce independent Console conversion or refresh logic.

## Exact Finance Read And Receiver Exhibits

These exhibits are the next implementation handoff anchors. They are listed here so the follow-up engineer can patch from source truth instead of rediscovering the fan-out.

| Exhibit | Current code location | Contract implication |
| --- | --- | --- |
| Wallet route direct wallet read | `frontend/src/components/pages/WalletManagementPage.jsx:48-58` reads `ivisit_main_wallet` or `organization_wallets` directly. | Replace with wallet projection facade; route should not own table selection or actor scope. |
| Wallet route payment-method/status read | `WalletManagementPage.jsx:61-72` calls `listPaymentMethods()` and `getOrgStripeStatus()` directly. | Billing method/status state belongs to one finance facade or billing sub-facade with shared pending/error semantics. |
| Wallet route projection read | `WalletManagementPage.jsx:75-76` calls `getProjectedRevenue()`. | Projection must carry source window, scope and unavailable state; no local yield fallback. |
| Wallet route ledger preview | `WalletManagementPage.jsx:79-87` reads `wallet_ledger` by `wallet_id` and `.limit(50)`. | UI and export must label this as a preview unless facade provides server-paged or full export data. |
| Wallet route payment preview and N+1 profile enrichment | `WalletManagementPage.jsx:90-116` reads `payments` `.limit(50)` then reads each payer profile. | Payment history projection should return payer/request context in one controlled read path or RPC/view, not per-row UI enrichment. |
| Wallet route export | `WalletManagementPage.jsx:126-139` serializes loaded `ledger` rows and says export succeeded. | Export action must declare dataset scope, or call a server-owned full export path. |
| Wallet route footer | `WalletManagementPage.jsx:201-208` renders loaded row count as transactions recorded and includes mojibake separator. | Copy must say recent transactions when capped; encoding defect must be fixed in implementation. |
| Wallet route repair mutation | `WalletManagementPage.jsx:239-257` auto-runs `backfillMissingFeeLedger()` on org-admin mount. | Ordinary read surfaces must never mutate ledger/payment evidence. Move repair to excluded maintenance, or remove. |
| Payment detail fixed completion label | `WalletManagementPage.jsx:290` and `WalletManagementPage.jsx:630` title every selected payment as `Payment Complete`. | Dialog title/status tone must derive from payment lifecycle projection. |
| Platform-card remove scope drift | `WalletManagementPage.jsx:73-83` lists platform-admin payment methods with `null` organization scope, while `WalletManagementPage.jsx:157-165` removes a method with `profile.organization_id`. | List and destructive command must use the identical proved billing scope; do not allow a platform-visible card to be removed through an unrelated organization key. |
| Global context wallet read | `frontend/src/contexts/PageDataContext.jsx:548-563` performs another wallet/ledger direct read and caps ledger at `10`. | Global panels should consume the same facade snapshot as `/wallet`, not a separate direct read. |
| Overview wallet summary | `frontend/src/components/pages/BentoHome.jsx:545-548` calls `getWalletSummary()` independently. | Dashboard card must consume the same finance projection or a documented summary endpoint with identical scope semantics. |
| Analytics finance summary | `frontend/src/components/pages/Analytics.jsx:471` calls `getFinanceAnalytics()` independently. | Analytics must declare ledger-income basis and share finance scope/window semantics with the wallet projection. |
| Wallet panel trust/yield labels | `frontend/src/components/context/WalletPanel.jsx:56-82` renders `Verified`, `Main Portfolio`, `Linked`, and `projection || wallet.balance * 0.12`. | Trust labels and projections must be evidence-backed; no static account readiness or fabricated yield fallback. |
| Wallet panel export event | `WalletPanel.jsx:40` dispatches `exportLedger`. | Export must be route-independent and tied to the wallet facade/export owner, not whichever page listener is mounted. |
| Mobile wallet capped KPI derivation | `frontend/src/components/mobile/MobileWallet.jsx:55-124` computes credits, paid count and period trends from preview arrays. | Mobile KPI labels must say preview/recent if data is capped, or use server analytics. |
| Wallet generic analytics modal | `WalletManagementPage.jsx:375-395` and `WalletManagementPage.jsx:716-736` mount `AnalyticsModal type="generic"` over capped ledger/payment arrays and saved methods. | A shared modal must not relabel preview collections as complete finance analytics; use projection scope/window and unavailable state. |
| Top-up optimistic success | `frontend/src/components/modals/GlobalFinancialModals.jsx:150-162` calls `topUpWallet()` then says wallet topped up. | PaymentIntent creation cannot be success copy; UI needs Stripe confirmation and webhook/refetch reflection states. |
| Payout optimistic/instant copy | `GlobalFinancialModals.jsx:166-179` calls `withdrawFunds()` and closes modal after function response; modal copy promises instant transfer. | Payout must expose receiver status and ledger/wallet reflection before final copy. |
| Billing modal fabricated primary state | `GlobalFinancialModals.jsx:20-26` imports `setPayoutMethod`; `GlobalFinancialModals.jsx:293-304` renders `Primary` for every method without an action or projected selection field. | The billing surface must render actual payout/default designation and expose only authorized selection commands with reflected result state. |
| Billing masked-card mojibake | `GlobalFinancialModals.jsx:293-301` renders corrupted card mask separators. | Implementation needs encoding scan and corrected card-mask copy. |
| Top-up service payload drift | `frontend/src/services/walletService.js:204-224` sends metadata `type: wallet_topup` but not top-level `is_top_up`. | Shared `create-payment-intent` receiver expects top-level `is_top_up` and writes `is_top_up` metadata for webhook branching. |
| Payout service payload | `walletService.js:183-199` invokes `create-payout` with amount, org id, currency and description only. | UI cannot infer balance reservation or completion from invocation; receiver/webhook reflection owns final state. |
| Cash process RPC payload | `walletService.js:279-290` ignores currency and calls legacy `process_cash_payment`. | Cash settlement contract must name currency or document USD-only; Pass 1 must align emergency copy with reflected payment/ledger state. |
| Cash eligibility truthiness drift | `walletService.js:369-383` returns RPC data object or `false`; emergency code currently needs explicit `data.eligible`. | Callers must test `eligible === true` and render `balance`, `fee_percentage`, `fee_amount` where available. |
| Backfill service mutation | `walletService.js:292-366` reads completed payments, inserts `wallet_ledger`, and updates `payments.metadata`. | This is maintenance-only, not page lifecycle; it also conflicts with append-only/audit-controlled ledger doctrine unless separately approved. |

## Shared Receiver Contract Notes

The Console service names are correct enough to show intent, but several payloads do not match the shared receiver behavior exactly.

| Receiver | Inspected shared behavior | Console implementation requirement |
| --- | --- | --- |
| `create-payment-intent` | `ivisit-app/supabase/functions/payments/create-payment-intent/index.ts` reads top-level `is_top_up`, resolves `organization_id`, creates/updates a pending `payments` row and returns `clientSecret`. | Console top-up must send `is_top_up: true`, confirm through Stripe when required and wait for reflected `payments`/wallet/ledger truth. |
| `stripe-webhook` | `ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts` branches on `paymentIntent.metadata.is_top_up === "true"` and updates payment completion/failure and distribution paths. | Top-up completion copy must follow webhook/refetch state, not intent creation. Missing top-up metadata can route the event into the wrong completion branch. |
| `create-payout` | `ivisit-app/supabase/functions/payments/create-payout/index.ts` checks org-admin authorization and creates a Stripe payout; wallet/ledger mutation is handled on payout webhook events. | Console withdrawal UI must show requested/pending/payout-reflected states and avoid promising instant settlement. |
| `manage-payment-methods` | `ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts` owns setup intent, list, detach and payout-method selection. | Console must route all method actions through one billing-method owner and reflect per-action results. |
| `check_cash_eligibility` | Shared docs list `check_cash_eligibility(p_organization_id UUID)` returning JSONB; no amount parameter. | Console may display the returned wallet/fee capacity but cannot treat estimated amount as receiver-validated until the RPC supports it or another receiver owns the estimate. |
| `process_cash_payment` | Shared core RPC delegates legacy Console call to `process_cash_payment_v2(..., 'USD')`. | Console must document USD-only settlement or upgrade to the v2 receiver deliberately; do not silently pass ignored currency. |

## Finance Receiver Closure Pass 2A

This pass closes the next end-to-end audit level for wallet, Stripe and ledger before implementation. It is intentionally read-only: do not run Edge Functions, repair helpers, Stripe calls, payout calls, webhook replays, DB cleanup, DB reset or historical ledger mutation from this audit.

### Source Truth And Receiver Line Exhibits

| Source truth or receiver | Exact evidence | Consequence for Console |
| --- | --- | --- |
| Wallet table identity | `ivisit-app/supabase/migrations/20260219000400_finance.sql:5-13` defines `organization_wallets` with `organization_id`, `balance`, `currency`, `display_id`, `updated_at`; `:25-30` defines `ivisit_main_wallet` with `last_updated`, not `updated_at`. | A projection facade must normalize platform and organization wallet timestamps and scope; UI code should not assume one wallet row shape. |
| Ledger table identity | `ivisit-app/supabase/migrations/20260219000400_finance.sql:33-43` defines `wallet_ledger` by `wallet_id`, not `organization_id`. | Any Console query that wants organization ledger history must first resolve canonical `organization_wallets.id`; hospital IDs and organization IDs are not ledger filters. |
| Payment method table vs Stripe methods | `ivisit-app/supabase/migrations/20260219000400_finance.sql:46-61` defines a DB `payment_methods` table, while Console's live billing path lists Stripe methods through `manage-payment-methods`. | The first implementation must decide whether Console renders Stripe customer methods, DB payment method rows, or a merged projection. It cannot mix a Stripe list with DB-default labels unless a receiver backs the merge. |
| Payment lifecycle table | `ivisit-app/supabase/migrations/20260219000400_finance.sql:63-80` defines `payments.status` as pending/completed/failed/refunded/declined and stores `stripe_payment_intent_id`, `ivisit_fee_amount`, `metadata` and `provider_response`. | Receipt titles, success badges, retry affordances and emergency payment copy must derive from lifecycle fields, not selected-row existence. |
| Settlement trigger | `ivisit-app/supabase/migrations/20260219000400_finance.sql:166-192` returns early for non-completed, duplicate completed, cash, top-up and null-organization payments. | Normal top-up, cash and incomplete payment rows cannot be treated as organization/platform settlement ledger evidence. |
| Org/platform ledger writes | `ivisit-app/supabase/migrations/20260219000400_finance.sql:194-287` creates or locks wallets and writes net service credit plus platform fee credit when eligible payment completion is reflected. | Console should observe this generated evidence; page-load repair insertion is outside normal wallet rendering. |
| Wallet payment receiver | `ivisit-app/supabase/migrations/20260219000400_finance.sql:293-436` owns patient wallet debit, payment row creation and ledger debit for app wallet payments. | Console finance surfaces must distinguish patient-wallet debits from organization-wallet/payout ledgers; a single "wallet" label is not enough. |
| Stripe top-up/payment intent receiver | `ivisit-app/supabase/functions/payments/create-payment-intent/index.ts:18-26` reads top-level `is_top_up`; `:36-40` computes `isTopUp`; `:174-181` writes Stripe metadata including `is_top_up`; `:260-285` inserts a pending payment and returns only intent identifiers. | `walletService.topUpWallet()` must submit top-level `is_top_up: true`, then the UI must stay pending until Stripe confirmation plus webhook/refetch truth. |
| Stripe webhook top-up branch | `ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts:54-83` treats `metadata.is_top_up === "true"` as top-up/no-emergency branch and updates the payment row to completed; it does not credit an org wallet through the settlement trigger because top-ups are excluded there. | Top-up implementation cannot claim wallet balance credit unless a specific top-up wallet-credit receiver is verified or added. This is a hard blocker, not just copy polish. |
| Emergency card branch | `ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts:88-104` delegates non-top-up emergency card success to `complete_card_payment`; `:108-144` delegates failure to `fail_card_payment`. | Console emergency payment state should follow the emergency/payment receiver result, not wallet modal intent state. |
| Payout request receiver | `ivisit-app/supabase/functions/payments/create-payout/index.ts:16-32` authorizes admin/org_admin scope; `:41-52` resolves org Stripe account; `:65-75` creates Stripe payout and returns payout status. | Console withdrawal can only say a payout request was created with returned status; balance reduction and ledger effects are webhook-owned. |
| Payout webhook reflection | `ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts:164-230` deducts organization/platform wallet balance and inserts payout ledger only on `payout.paid`; `:234-237` logs failed payout but does not currently project failure state to Console. | Console needs a pending payout/reflection model and failure visibility before the withdrawal UI can be trustworthy. |
| Billing method receiver | `ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts:17-25` resolves org/display id scope; `:74-91` creates setup intents and lists Stripe methods; `:94-98` detaches; `:100-112` writes payout method fields to `organizations`. | Billing UI must carry the same scope from list to detach to payout selection and should render primary/default state from `organizations.payout_method_id` or a projection, not from every listed card. |
| Console direct wallet/service fan-out | `frontend/src/services/walletService.js:8-177`, `WalletManagementPage.jsx:59-136`, `PageDataContext.jsx:548-563`, `BentoHome.jsx:545-548` and `Analytics.jsx:471` all read or derive finance state independently. | The first implementation package is a read facade/query boundary. Component-local reads must be retired in a planned order rather than fixed one surface at a time. |
| Console mutation hotspots | `walletService.js:183-223` invokes payout and PaymentIntent receivers; `:277-289` invokes cash settlement; `:295-375` inserts ledger rows and updates payment metadata. | Implementation must separate safe commands from excluded maintenance. A route, context panel, modal or dashboard must not call repair mutation paths. |

### Payload-To-Receiver Contract Chart

| Console payload producer | Payload currently sent | Receiver expects or proves | Audit finding | Implementation target |
| --- | --- | --- | --- | --- |
| `GlobalFinancialModals.handleTopUp()` -> `walletService.topUpWallet()` | UI validates `!amount || isNaN(amount)`, sends amount, org id and description through `topUpWallet`; service sends `metadata.type = wallet_topup` but no top-level `is_top_up`. | `create-payment-intent` reads top-level `is_top_up` and writes pending payment metadata; webhook branches on Stripe metadata string `is_top_up`. | **Blocked.** Top-up can be recorded as a normal non-top-up intent and success copy fires before confirmation/reflection. | Add money parser, send `is_top_up: true`, confirm Stripe intent, then poll/refetch payment/wallet projection. |
| `GlobalFinancialModals.handleWithdraw()` -> `walletService.withdrawFunds()` | UI blocks only when `Number(amount) > wallet.balance`, then sends amount, org id, currency and description. | `create-payout` validates role/org scope and creates a Stripe payout; webhook deducts wallet only on `payout.paid`. | **Blocked.** Client balance is not reservation proof; UI promises instant transfer and has no payout failure surface. | Add receiver-backed payout status model: requested, pending, paid, failed, unavailable. |
| `WalletManagementPage.handleDeleteMethod()` -> `deletePaymentMethod()` | Route may list platform methods with `listPaymentMethods(null)` but delete with `profile.organization_id`. | `manage-payment-methods` resolves scope from provided organization id or current user profile customer. | **Blocked.** Visible card scope and destructive command scope can diverge. | Store `billingScope` with every method list and pass exactly that scope into detach/select commands. |
| Billing modal setup form | `createSetupIntent(organizationId)`, `stripe.confirmCardSetup`, then refreshes list and says source verified. | Receiver creates or reuses Stripe customer, then Stripe confirms card setup; no DB default method row is guaranteed. | **Partially usable.** Card attachment can work over HTTPS, but default/primary/payout labels are unproved. | Render "saved card" only; render payout/default labels only from receiver-backed fields. |
| Emergency cash settlement | `processCashPayment(emergencyId, orgId, amount, currency)` discards `currency` and calls legacy RPC. | `process_cash_payment` delegates to `process_cash_payment_v2(..., 'USD')`. | **Cross-pass blocker.** Cash settlement is USD-only by current receiver and needs reflected payment/request/ledger readback. | Pass 1/2 shared implementation must expose settlement result and refresh emergency/payment/ledger projections. |
| Wallet route auto repair | `backfillMissingFeeLedger(profile.organization_id)` on org-admin mount inserts `wallet_ledger` and updates `payments.metadata`. | Supabase docs require `wallet_ledger` as permanent financial audit evidence; finance trigger already writes settlement entries for eligible completions. | **Remove from ordinary flow.** This is not a read facade, it is a historical mutation. | Move to a separate maintenance-only plan with dry-run evidence and explicit authorization, or remove if obsolete. |
| Ledger export | Serializes currently loaded `ledger` state, limited to 50 rows. | No server export receiver is used. | **Blocked for "export ledger" language.** It exports a preview without saying so. | Rename to recent-window export or add a server-owned paged/full export receiver. |

### UI Field-To-Truth Chart

| UI surface | Current field/copy | Truth owner that must back it | Risk if implemented as-is |
| --- | --- | --- | --- |
| Wallet footer | `${ledger.length} Transactions Recorded - Live Balance Active` from loaded state. | Wallet projection with ledger `limit`, `totalKnown`, `windowLabel`, wallet `updatedAt` and degraded state. | A 50-row preview reads as complete financial history. |
| Receipt modal | `Payment Complete` heading, success-colored status badge, amount from selected row. | `payments.status`, `processed_at`, `provider_response`, request/payment projection. | Pending/failed/refunded payments can be visually completed. |
| WalletPanel | `Verified`, `Main Portfolio`, `Linked`, and yield fallback from balance. | Stripe/account status and wallet projection metrics. | Fabricated trust/performance claims on a financial surface. |
| MobileWallet | Credit/payment success ratios from capped route arrays. | Server analytics or projection-labelled recent-window metrics. | Preview arrays become operational KPIs. |
| Billing modal | Every saved method gets `Primary`. | `organizations.payout_method_id` or Stripe/default metadata surfaced by a billing projection. | Wrong payment/payout method trust state. |
| Top-up modal | `Complete Funding` and immediate `Wallet topped up successfully`. | Stripe confirmation, webhook-completed payment row and actual wallet-credit receiver. | User sees money success when only an intent was created. |
| Withdraw modal | "Funds will be transferred ... instantly" and `Withdrawal initiated successfully`. | Payout receiver status plus webhook reflection. | User sees settlement certainty before Stripe payout succeeds. |
| Analytics modal | `type="generic"` over ledger/payment/method counts. | Wallet finance projection or analytics receiver with declared scope/window. | Polished analytics imply complete finance truth from previews. |

### Implementation Order Locked By This Audit

1. Create the finance projection/read facade first. It must normalize actor scope, wallet shape, billing method scope, ledger preview metadata, payment lifecycle display fields, account status and metric basis.
2. Replace `/wallet`, mobile wallet, `PageDataContext`, `WalletPanel`, `BentoHome` and `Analytics` reads with the projection or smaller derived projections from the same owner.
3. Remove or isolate `backfillMissingFeeLedger()` from normal route mount before touching wallet UI copy. Any repair path needs a separate maintenance document and explicit authorization.
4. Fix top-up only after the receiver contract is explicit: `is_top_up: true`, Stripe confirmation state and reflected payment/wallet truth. If top-up wallet credit is missing in the shared backend, document and implement that backend receiver before promising funding completion.
5. Fix payout only after the UI has pending/paid/failed reflection states and the receiver can prove organization scope, sufficiency/reservation and returned payout status.
6. Fix billing method management after the shared billing owner returns or derives one `billingScope`, `canRemove`, `isPrimaryPayoutMethod`, `setupState`, `removeState` and `setPayoutState`.
7. Close emergency cash with Pass 1: cash eligibility must use `eligible === true`, canonical organization id and a reflected settlement readback.
8. Only after these receivers are mapped should design cleanup, copy polish and table layout work begin. UI polish without this projection will make false finance states look more credible.

### Remaining Audit Edge For Pass 2B

- Trace `complete_card_payment`, `fail_card_payment`, `process_cash_payment_v2`, `approve_cash_payment` and `decline_cash_payment` line-by-line into Console emergency/payment renderers.
- Confirm whether a top-up wallet-credit receiver exists outside the inspected trigger/webhook path. Current inspected evidence shows pending/completed payment row reflection, but not wallet balance credit for top-ups.
- Map `organizations` payout fields (`payout_method_id`, `payout_method_last4`, `payout_method_brand`, Stripe account readiness) to every current Console label that says primary, linked, verified, instant or payout.
- Compare finance hardening scripts in `ivisit-app/supabase/docs/TESTING.md` against Console service fields before implementation: organization wallets, patient wallets, ivisit main wallet, payment methods, wallet ledger, payments and cash fee guards.
- Produce an exact field inventory for `WalletFinanceProjection` rows before code changes: wallet fields, ledger fields, payment fields, payer/request fields, billing method fields, account status fields and metric fields.

## Emergency Payment Receiver Closure Pass 2B

This pass extends finance audit into the emergency receiver side because wallet, payment, dispatch and completion are not separable in Console. It found one hard ordering contradiction that must be fixed before cash/manual-payment implementation.

### Emergency Receiver Line Exhibits

| Receiver | Exact evidence | Console consequence |
| --- | --- | --- |
| Card success finalizer | `ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:630-740` finds a card payment by `stripe_payment_intent_id`, sets `payments.status = completed`, sets `payment_status = completed`, releases pending approval to `in_progress`, activates visits and returns request/payment ids. | Console retry/card recovery copy should listen for the payment/request projection update. It should not claim dispatch release from retry creation alone. |
| Card failure finalizer | `ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:745-834` sets payment failed and request `status = payment_declined`, `payment_status = failed`. | Console `Payment Declined` UI is receiver-backed only after this status pair appears; retry UI must keep a pending retry state until a new receiver result arrives. |
| Cash approval receiver | `ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:838-1050` locks pending cash payment/request, verifies payment/request organization match, checks request status and payment status, validates actor scope, deducts org wallet fee, credits platform wallet, marks payment completed, marks request `in_progress`, activates visit and backfills responder snapshot. | The details modal approve action is the correct authoritative receiver for pending cash flows. Its UI should present the platform fee, not the full cash amount, and must refresh request/payment/ledger/responder truth after success. |
| Cash decline receiver | `ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:1072-1177` validates pending cash payment/request, sets payment failed, request `payment_declined`, request `payment_status = failed`, and visit cancelled. | Decline copy and downstream filters must treat this as a terminal payment-declined request with cancelled visit consequence. |
| Manual cash settlement receiver | `ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql:1182-1283` rejects completed/cancelled requests, inserts a completed cash payment, sets `payment_status = completed`, and returns `payment_id` plus `fee_calculated`. | Console cannot call this after `console_complete_emergency`; if used at all, it must run before request completion or be replaced by the pending approval receiver path. |
| Console complete receiver | `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:1878-1971` completes eligible requests and frees ambulance state, but does not process cash payment or ledger effects. | Completion is a logistics receiver, not a payment receiver. Cash processing must not be attached as an afterthought after completion. |
| Legacy wrapper | `ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:832-849` exposes `process_cash_payment(...)` and delegates to `process_cash_payment_v2(..., 'USD')`. | `walletService.processCashPayment()` is USD-only today even though it accepts a currency argument. |

### Console Emergency Payment Line Exhibits

| Console surface | Exact evidence | Audit result |
| --- | --- | --- |
| Request list payment preview | `frontend/src/components/pages/EmergencyRequestsPage.jsx:187-205` loads latest payment rows with only `emergency_request_id,payment_method,status,created_at` and normalizes rows from that shallow data. | Request rows know payment method/status enough for action hints, but not amount, currency, fee, failure reason or receiver metadata. Detail projection must be used for payment decisions. |
| Realtime refresh | `EmergencyRequestsPage.jsx:223-227` subscribes to all `emergency_requests` and all `payments` changes, then refetches the page. | This can recover broad changes but is not scoped and not a substitute for receiver-specific pending/result state. |
| Dispatch eligibility check | `EmergencyRequestsPage.jsx:425-440` checks cash eligibility for admin/org-admin with `orgId || request.organization_id || request.hospital_id`, uses UUID length, passes an estimated amount that the RPC ignores, and treats returned object truthiness as eligibility. | **Blocked.** It can use a hospital UUID as organization scope and any returned object becomes eligible, even `{ eligible: false }`. Dispatch gating must use canonical organization id and `eligible === true`. |
| Complete-then-cash flow | `EmergencyRequestsPage.jsx:466-505` calls `completeEmergency()` first, then for cash jobs prompts for amount and calls `processCashPayment()`. | **Hard contradiction.** `process_cash_payment_v2` rejects completed requests, so this flow can make cash settlement impossible after logistics completion. |
| Prompt amount parser | `EmergencyRequestsPage.jsx:491-497` uses `prompt`, `isNaN`, and passes raw amount to the RPC path. | Needs the same money parser and explicit currency behavior as wallet actions; prompt-based financial mutation is not an implementation target. |
| Retry payment flow | `EmergencyRequestsPage.jsx:507-581` loads DB `payment_methods`, prompts for method selection, calls retry RPC, and says patient must complete payment. | This copy is mostly honest, but it needs pending retry state and should refresh detail projection for card success/failure receiver result. |
| Detail projection | `frontend/src/services/emergencyService.js:205-287` fetches latest payment row and visit outcome, then returns `paymentVisibilityState` and `visitVisibilityState`. | This is the right boundary to extend: it can carry fee, amount, lifecycle, receiver result and retry/cash action state into modals without UI table guesses. |
| Detail realtime | `emergencyService.js:289-312` subscribes to request, payment and visit changes for one request. | This is the canonical recovery pattern for payment approval detail; Pass 1/2 should favor this over page-wide payment subscriptions for modal actions. |
| Approve/decline services | `emergencyService.js:559-620` calls `approve_cash_payment` and `decline_cash_payment` and rejects non-success responses. | Service boundaries are good enough for first implementation, but should return typed receiver results to the UI projection instead of leaving toasts to infer consequences. |
| Cash approval UI | `frontend/src/components/modals/EmergencyDetailsModal.jsx:108-161` approves/declines using `paymentData.id` then refreshes projection; `:346-393` renders approval card. | This is the correct UI direction, but the displayed "Fee Amount" currently uses `paymentData.amount ?? request.total_cost`; that reads as full amount, not platform fee. |
| Retry UI in detail modal | `EmergencyDetailsModal.jsx:396-419` shows retry when request is `payment_declined`. | Must distinguish retry-created/pending from retry-confirmed/reflected; current state only covers button processing. |
| Action state helper | `frontend/src/utils/emergencyActions.js:16-27` only allows dispatch when `status === in_progress`; `canProcessCash` requires `status === completed` and cash not completed. | The helper mirrors the broken complete-then-cash assumption. Cash settlement should be modeled as approval-before-dispatch or pre-completion manual settlement, not completed-state cleanup. |

### Cash Flow Decision Before Implementation

Console must choose one cash lane and document it in the implementation plan before code changes:

| Lane | Receiver | Valid timing | Required UI |
| --- | --- | --- | --- |
| Approval-gated cash dispatch | `approve_cash_payment(payment_id, request_id)` | Request/payment pending approval before dispatch. | Details modal approve/decline with fee, organization balance, receiver result and projection refresh. |
| Manual cash settlement | `process_cash_payment_v2(request_id, organization_id, amount, currency)` | Before request is completed or cancelled. | Explicit settlement modal with amount parser, canonical org id and reflected payment readback. |
| Post-completion cash cleanup | None proved. | Not currently receiver-backed. | Do not implement unless a backend receiver is added and documented. |

Implementation should prefer the approval-gated lane for existing pending cash requests because it updates payment, request, visit, wallet ledger and responder truth in one receiver. If manual settlement remains needed for legacy records, it must be separated as a maintenance/manual settlement lane and must not run after `console_complete_emergency`.

### Pass 2B Implementation Locks

1. Remove the complete-then-process-cash sequence from the implementation target. It is provably incompatible with `process_cash_payment_v2`.
2. Move cash action state from `status === completed` cleanup toward receiver-backed states: `pending_cash_approval`, `approved_dispatch_released`, `declined_payment_failed`, `manual_settlement_available`, `manual_settlement_blocked`.
3. Extend `getEmergencyDetailProjection()` to include latest payment fields needed by UI: amount, currency, fee amount, method, status, processed time, failure reason/source metadata and receiver visibility.
4. Make dispatch gating use canonical organization id only. Hospital UUID fallback must become unavailable/error state, not a wallet eligibility input.
5. Replace object truthiness with explicit `eligibility?.eligible === true` and render `balance`, `fee_percentage` and computed/returned fee basis where available.
6. Keep retry copy at "retry created/patient action required" until `complete_card_payment` or `fail_card_payment` changes request/payment truth.
7. Add hardening commands to the implementation checklist: `npm run hardening:payments-surface-field-guard`, `npm run hardening:wallet-ledger-surface-field-guard`, `npm run hardening:cash-fee-contract-guard`, and the wallet/payment-method guards listed in `ivisit-app/supabase/docs/TESTING.md:270-322`.

## Finance Projection Boundary Target

Before any implementation touches the wallet route, define a read facade such as `getWalletFinanceProjection(actor, options)` or a hook/service pair with this minimum shape:

```ts
type WalletFinanceProjection = {
  actor: { userId: string; role: string; organizationId: string | null; scope: 'platform' | 'organization' | 'unavailable' };
  walletDisplay: {
    walletId: string | null;
    balance: number | null;
    currency: string;
    updatedAt: string | null;
    visibilityState: 'ready' | 'loading' | 'unauthorized' | 'missing_wallet' | 'degraded';
  };
  accountStatus: {
    stripeAccountId: string | null;
    payoutReady: boolean | null;
    billingReady: boolean | null;
    label: string;
  };
  ledgerPreview: {
    rows: WalletLedgerRow[];
    limit: number;
    windowLabel: string;
    totalKnown: number | null;
    exportScope: 'preview' | 'full' | 'server_export_required';
  };
  paymentPreview: {
    rows: PaymentHistoryRow[];
    limit: number;
    windowLabel: string;
  };
  metrics: {
    projectedRevenue30d: number | null;
    todayIncome: number | null;
    trendPercent: number | null;
    basis: 'ledger_preview' | 'server_analytics' | 'unavailable';
  };
  methods: {
    rows: StripePaymentMethod[];
    state: 'ready' | 'loading' | 'unavailable' | 'error';
  };
};
```

All surfaces that currently read wallet truth directly should consume this projection or an intentionally smaller projection derived from the same service:

- `/wallet` desktop and mobile.
- `PageDataContext.walletData`.
- `WalletPanel`.
- `BentoHome` wallet card.
- `Analytics` finance summary.
- Global financial modals for amount guard, method availability and post-action refresh.

Do not implement this projection as a broad component context first. The first implementation should be a service/query boundary that can later be consumed by route hooks and TanStack Query without reintroducing finance reads into UI components.

## WalletFinanceProjection Field Inventory Pass 2C

This inventory makes the projection implementable. It is not code authorization. It defines the smallest finance read contract that can replace duplicated Console reads while preserving backend truth, receiver timing and UI scope labels.

### Projection Owner Rule

`WalletFinanceProjection` should be built by a finance service/query owner, not by `WalletManagementPage`, `PageDataContext`, `WalletPanel`, `MobileWallet`, `BentoHome`, `Analytics` or `GlobalFinancialModals`.

The first implementation should export a read function or query hook that can be consumed by route UI and later moved into TanStack Query. It must not become another broad context that hides table reads inside global page state.

### Actor And Scope Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `actor.userId` | authenticated profile/user id | All wallet reads currently infer from `useAuth()` or `PageDataContext`. | Required before any finance read or command capability is exposed. |
| `actor.role` | `profiles.role` | Admin/org-admin/sponsor branching appears in `/wallet`, overview and analytics. | Must drive read scope and command capability; sponsor should not be silently treated as platform admin for money movement. |
| `actor.organizationId` | canonical `profiles.organization_id` -> `organizations.id` | Emergency code can fall back to `request.hospital_id`; wallet reads use `profile.organization_id`. | Must be canonical organization UUID only. Hospital UUID fallback is invalid finance scope. |
| `actor.scope` | derived from role and canonical organization id | `listPaymentMethods(null)` means platform/user scope while delete may use org scope. | Must be one of `platform`, `organization`, `user_customer`, or `unavailable`; every method and command must carry the same scope it was loaded under. |
| `actor.capabilities` | role plus receiver availability | Buttons appear from role checks and modal global events. | Include `canReadWallet`, `canTopUp`, `canRequestPayout`, `canManageBillingMethods`, `canExportLedger`, `canRunMaintenanceRepair`; repair must default false. |

### Wallet Display Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `walletDisplay.walletId` | `organization_wallets.id` or `ivisit_main_wallet.id` | Ledger queries depend on wallet id but UI code does the resolution itself. | Must be resolved before ledger reads; `null` means no ledger query and a missing-wallet state. |
| `walletDisplay.organizationId` | `organization_wallets.organization_id` | Org routes and cash flows assume wallet belongs to profile org. | Must match canonical organization id for org scope. |
| `walletDisplay.balance` | wallet table balance | Displayed as available funds in route, panel, mobile, withdraw modal and overview. | Display-only balance; payout sufficiency/reservation must still be receiver-proved. |
| `walletDisplay.currency` | wallet `currency`, default only when table is missing | UI formats USD by default in multiple places. | Must be explicit; defaulting to USD should carry `currencySource = defaulted` when no wallet row proves it. |
| `walletDisplay.updatedAt` | `organization_wallets.updated_at` or `ivisit_main_wallet.last_updated` | "Live" labels appear even when reads are capped or stale. | Normalize timestamp and expose stale/degraded state. |
| `walletDisplay.visibilityState` | wallet read result and RLS/receiver result | UI currently renders zero/silent states when reads fail. | Use `ready`, `loading`, `unauthorized`, `missing_wallet`, `degraded`, `error`; do not render balance as zero when visibility is not ready. |
| `walletDisplay.balanceLabel` | derived from visibility/currency | Route and panel copy say available funds/live balance. | Must distinguish available, unavailable, stale, pending payout reflection and preview-only. |

### Ledger Preview Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `ledgerPreview.rows[].id` | `wallet_ledger.id` | Route, panel and mobile render by row id. | Required for stable rendering. |
| `ledgerPreview.rows[].walletId` | `wallet_ledger.wallet_id` | Not displayed but needed for scope proof. | Must match `walletDisplay.walletId`; mismatches become degraded state. |
| `ledgerPreview.rows[].amount` | `wallet_ledger.amount` | Route and mobile infer signs from type then `Math.abs`. | Keep signed amount and add display sign/tone in projection to avoid UI guesswork. |
| `ledgerPreview.rows[].transactionType` | `wallet_ledger.transaction_type` | Credit/debit/payout tone and ratios are computed in UI. | Normalize allowed types and expose unknown type as neutral/degraded. |
| `ledgerPreview.rows[].description` | `wallet_ledger.description` | Directly displayed in route/panel/mobile/export. | Sanitize for CSV/export and fallback labels; do not fabricate finance event names. |
| `ledgerPreview.rows[].referenceId` | `wallet_ledger.reference_id` | Route slices it as ref; finance actions depend on payment linkage. | Include `referenceType` from metadata when present and `paymentId` when reference points to payment. |
| `ledgerPreview.rows[].externalReference` | `wallet_ledger.external_reference` | Payout/Stripe reconciliation currently not surfaced. | Needed for payout and webhook traceability; hide unless detail/export needs it. |
| `ledgerPreview.rows[].metadata` | `wallet_ledger.metadata` | Repair/backfill used metadata to mark historical fixes. | Treat as backend evidence; UI must not mutate it. |
| `ledgerPreview.limit` | query option/current `.limit(50)` or `.limit(10)` | Footer/count/export treat loaded rows as complete. | Must be explicit: route may show 50, context panel may show 4 from same projection, not separate reads. |
| `ledgerPreview.windowLabel` | derived from limit/date/scope | "Transactions recorded" and "Treasury Dynamics" imply full history. | Examples: `Latest 50 entries`, `Latest 4 entries`, `30-day server aggregate`. |
| `ledgerPreview.totalKnown` | count query or null | Current UI uses `ledger.length`. | `null` means do not say total transactions. |
| `ledgerPreview.exportScope` | receiver/export capability | Route and panel export loaded rows. | `preview`, `full`, `server_export_required`, or `unavailable`; copy must match. |

### Payment Preview Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `paymentPreview.rows[].id` | `payments.id` | Receipt/detail opens from selected row. | Required. |
| `paymentPreview.rows[].displayId` | `payments.display_id` | Mobile uses display id if present; route slices UUID. | Prefer display id for UI; keep UUID for receiver calls. |
| `paymentPreview.rows[].userId` | `payments.user_id` | Payer profile enrichment is currently N+1 in the route. | Projection should include a payer summary or declare unavailable, not force UI per-row profile reads. |
| `paymentPreview.rows[].emergencyRequestId` | `payments.emergency_request_id` | Detail links service/hospital/request context. | Required for emergency payment decisions and receipt deep link. |
| `paymentPreview.rows[].organizationId` | `payments.organization_id` | Payment and wallet settlement scope. | Must match actor scope for org views or be hidden/degraded. |
| `paymentPreview.rows[].amount` | `payments.amount` | Receipts and mobile rows display it as final amount. | Must pair with currency and lifecycle; pending amount is not completed revenue. |
| `paymentPreview.rows[].currency` | `payments.currency` | Formatters default to wallet currency. | Use payment currency, not wallet currency, when rendering payment history. |
| `paymentPreview.rows[].paymentMethod` | `payments.payment_method` | Cash/card/wallet flow decisions and table labels. | Normalize to `cash`, `card`, `wallet`, `unknown`. |
| `paymentPreview.rows[].status` | `payments.status` | Receipt title/status and metrics use completed checks. | Must drive status label/tone/title; no fixed "Payment Complete". |
| `paymentPreview.rows[].stripePaymentIntentId` | `payments.stripe_payment_intent_id` | Retry/webhook state tracing. | Hidden by default but needed by service/debug detail. |
| `paymentPreview.rows[].ivisitFeeAmount` | `payments.ivisit_fee_amount` | Cash approval UI currently displays full amount as fee. | Required for fee display; fallback may read metadata fee fields but must mark estimated/derived. |
| `paymentPreview.rows[].metadata` | `payments.metadata` | Failure/fee/top-up/source semantics live here. | Normalize `payment_kind`, `is_top_up`, `fee_amount`, `failure_reason`, `source`; raw metadata should stay behind detail/debug. |
| `paymentPreview.rows[].providerResponseState` | `provider_response` presence/status | UI currently cannot tell webhook reflected or provider failed. | Project `none`, `present`, `failed`, `unknown`; do not dump provider payload into UI. |
| `paymentPreview.limit` and `windowLabel` | query limit/date/scope | Route/mobile metrics use latest 50 as analytics. | Must label preview window and block complete-history analytics unless server aggregate exists. |

### Billing Method And Account Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `accountStatus.stripeCustomerId` | `organizations.stripe_customer_id` or `profiles.stripe_customer_id` | `manage-payment-methods` creates/uses customers for org or user scope. | Needed to explain billing readiness; never display raw id unless an admin detail/debug view needs it. |
| `accountStatus.stripeAccountId` | `organizations.stripe_account_id` | Organization list says connected/pending; wallet status says linked. | Distinguish Connect payout account from customer billing methods. |
| `accountStatus.payoutReady` | Stripe account/webhook readiness or organization derived fields | Withdraw modal promises instant transfer. | Must be `true`, `false`, or `unknown`; unknown blocks confident payout copy. |
| `accountStatus.billingReady` | payment method list/setup state | Top-up button only checks method count. | A saved card permits attempt, not completed funding. |
| `accountStatus.payoutMethodId` | `organizations.payout_method_id` | Billing modal labels every method primary. | Required to mark one primary payout method; otherwise no primary badge. |
| `methods.rows[].id` | Stripe payment method id or DB payment method id, source-labelled | Route and billing modal detach by id. | Include `source = stripe_customer | db_payment_methods`; commands must accept only source-supported ids. |
| `methods.rows[].brand/last4/expiry` | Stripe method card or DB `payment_methods` row | UI displays card masks and expiry. | Mask formatting belongs in projection; run encoding/mojibake check for bullet separators. |
| `methods.rows[].isPrimaryPayoutMethod` | organization payout fields or supported receiver | Static primary badge today. | Render true only if id matches payout method truth. |
| `methods.rows[].canRemove` | receiver capability and scope | Delete command can scope drift. | Must be false when scope is ambiguous or method source is unsupported. |
| `methods.state` | list/setup receiver result | Modals show empty list or HTTPS unavailable. | Use `ready`, `loading`, `unavailable`, `error`, `https_required`, `scope_missing`. |

### Metrics And Analytics Fields

| Projection field | Source truth | Current consumer pressure | Required behavior |
| --- | --- | --- | --- |
| `metrics.projectedRevenue30d` | `getProjectedRevenue()` style ledger aggregate or server analytics | Wallet panel uses projection or `wallet.balance * 0.12`; mobile labels `30d LIVE`. | Remove balance-derived fallback; expose `null` with unavailable copy when no proved basis exists. |
| `metrics.todayIncome` | ledger credits since local day boundary or server aggregate | BentoHome renders today income. | Must carry timezone/basis; local browser day and server day should be labelled. |
| `metrics.trendPercent` | compared aggregate windows | Overview/mobile display trend signs. | Must expose `basis` and avoid trend when previous window is zero or data is capped. |
| `metrics.inflowRatio` | current mobile computes credit count / ledger count | Mobile "Treasury Dynamics". | Either mark as recent-preview ratio or replace with server aggregate. |
| `metrics.paymentSuccessRate` | current mobile computes completed / preview payments | Mobile "Payment Success". | Must be preview-labelled or server-derived; pending/failed/refunded lifecycle must be included. |
| `metrics.basis` | derived from query/receiver | Analytics page calls separate finance analytics service. | Values: `ledger_preview`, `server_analytics`, `route_preview`, `unavailable`; UI labels must follow. |

### Command Capability Fields

| Capability | Receiver | Current trigger | Required projection guard |
| --- | --- | --- | --- |
| `commands.topUp.enabled` | `create-payment-intent` plus Stripe confirmation and top-up wallet credit receiver | Wallet route/panel/mobile/global event | Enabled only with actor scope, billing method availability, HTTPS/Stripe capability and known post-intent reflection plan. |
| `commands.withdraw.enabled` | `create-payout` plus payout webhook reflection | Wallet route/panel/mobile/global event | Enabled only with payout-ready account, receiver scope and backend sufficiency/reservation; display balance alone is insufficient. |
| `commands.manageBilling.enabled` | `manage-payment-methods` | Billing modal/global event | Enabled only when scope and Stripe customer path are known. |
| `commands.exportLedger.enabled` | preview CSV or future server export | Route and WalletPanel event | Must include `exportScope`, file scope label and row count source. |
| `commands.repairLedger.enabled` | excluded maintenance plan | Current route auto-run | Must be false in product UI. Any true value requires separate maintenance authorization and dry-run evidence. |

### Consumer Migration Map

| Current consumer | Current fields | Projection replacement | First implementation note |
| --- | --- | --- | --- |
| `/wallet` desktop route | local `wallet`, `ledger`, `payments`, `projection`, `paymentMethods`, `orgInfo` | full `WalletFinanceProjection` plus command capabilities | Remove direct Supabase reads and route-mounted `backfillMissingFeeLedger()` first. |
| `MobileWallet` | props from route arrays and derived local metrics | mobile view model derived from projection | Mobile must not compute complete finance KPIs from preview arrays. |
| `PageDataContext.walletData` | separate wallet plus latest 10 ledger read | minimal projection slice: balance, currency, latest ledger rows, states | Replace direct context reads after route projection exists; do not create a second owner. |
| `WalletPanel` | balance, projection fallback, linked/verified labels, latest four ledger rows | context panel projection slice | Remove static trust labels and balance-derived yield fallback. |
| `BentoHome` | `getWalletSummary()` independent service read | summary projection slice: balance, today income, trend and basis | Sponsor/platform scope must be explicit before rendering financial stats. |
| `Analytics` | `getFinanceAnalytics()` independent ledger read | analytics projection or server aggregate | Chart basis and role scope must match the wallet projection. |
| `GlobalFinancialModals` | amount, methods, wallet balance from `PageDataContext` | command projection plus action lifecycle states | Modals should not own finance reads; they should submit commands and render receiver/pending states. |

### Pass 2C Acceptance Gate

Implementation is not ready until the above field inventory is represented in a service contract or typed model and each consumer has a migration target. The first code slice should be allowed to render fewer metrics than today if the missing metric would otherwise be fabricated.

## Top-Up Credit And Payout Readiness Proof Pass 2D

This pass checks the remaining money-movement proof that the Console UI currently implies: wallet top-up credit, payout readiness, primary payout method and connected/verified Stripe labels.

### Top-Up Credit Proof

| Evidence | Current truth | Console implication |
| --- | --- | --- |
| `ivisit-app/supabase/functions/payments/create-payment-intent/index.ts:18-26` accepts `is_top_up`; `:260-285` inserts a pending payment and returns intent identifiers. | The receiver creates payment intent/payment row evidence, not wallet credit evidence. | Top-up UI can show "payment created" or "pending confirmation", not "wallet topped up". |
| `ivisit-app/supabase/functions/webhooks/stripe-webhook/index.ts:54-83` marks top-up/no-emergency payment rows completed on Stripe success. | The webhook updates the `payments` row. It does not update `organization_wallets`, `ivisit_main_wallet`, or `wallet_ledger` in the inspected top-up branch. | Refetching wallet after top-up may still show no credited balance if no other receiver exists. |
| `ivisit-app/supabase/migrations/20260219000400_finance.sql:166-192` sets `v_is_top_up` and returns early for top-ups in `process_payment_distribution()`. | The active settlement trigger explicitly excludes top-ups from org/platform settlement wallet writes. | A completed top-up payment row is not wallet balance proof. |
| Search of active `ivisit-app/supabase/functions`, `supabase/migrations`, `supabase/docs` and `services` found top-up credit logic only in archived legacy references and demo finance helpers, not in active production migration/function paths. | Current production source does not prove a wallet-credit receiver for Console top-ups. | Treat top-up credit receiver as missing until live/current code proves otherwise. Do not implement funding-complete copy. |
| Archived legacy references include top-up wallet-credit examples such as `top_up_patient_wallet` and `handle_payment_success` branches. | Historical intent exists but is not current authority. | Archived docs can inform design, but cannot justify current implementation without active migration/function proof. |

Implementation lock: the top-up code path cannot be marked complete by UI work alone. It needs either a current backend receiver that credits the correct platform or organization wallet and writes `wallet_ledger`, or the top-up command must be disabled/renamed to a pending payment-intent experiment until backend credit reflection is implemented.

### Payout And Stripe Readiness Field Proof

| Field or label | Active source truth | Current Console display | Audit result |
| --- | --- | --- | --- |
| `organizations.stripe_account_id` | `ivisit-app/supabase/migrations/20260219000200_org_structure.sql:5-15` defines the organization Connect account id. | `WalletManagementPage.jsx:460-462` labels `Payouts Enabled` when `orgInfo?.stripe_account_id` exists; organization views label connected/pending from the same id. | Account id existence is not payout readiness. It proves a configured id only. |
| `organizations.is_active` | `stripe-webhook` `account.updated` sets `organizations.is_active = account.details_submitted && account.payouts_enabled`; org table also defaults `is_active = true`. | Organization CRUD can edit `is_active`; views count active orgs. | `is_active` is overloaded between operational org status and Stripe readiness. Do not use it alone for payout readiness unless the projection labels its source. |
| `profiles.stripe_account_id` and profile payout fields | `ivisit-app/supabase/migrations/20260219000100_identity.sql:32-37` defines profile-level Stripe/customer/payout fields. | Console wallet currently uses org/profile customer scope depending on `organization_id` nullness. | Profile payout fields may apply to user/customer billing, not organization payout. Projection must separate profile customer, organization customer and organization Connect account. |
| `organizations.stripe_customer_id` | Created/updated by `manage-payment-methods` when an organization billing customer is needed. | Billing modal lists Stripe customer methods for org scope. | Customer id is saved-card readiness, not payout readiness. |
| `organizations.payout_method_id`, `payout_method_last4`, `payout_method_brand` | Written by `manage-payment-methods` `set-payout-method`. | Global billing modal renders every method `Primary`; wallet route can show payout method last4 if `orgInfo` contains it. | Primary badge requires exact match to `payout_method_id`; every-card primary is false. |
| `create-payout` result `payout.status` | `create-payout/index.ts:65-75` returns created Stripe payout id/status. | Withdraw modal says instant transfer and then success after invocation. | The return proves a payout request, not wallet balance deduction. Final ledger/balance reflection happens on payout webhook. |
| `stripe-webhook` `payout.paid` | `stripe-webhook/index.ts:164-230` deducts wallet and inserts payout ledger only on paid webhook. | No current Console surface shows pending/paid/failed payout lifecycle. | Payout UI needs pending and failed states before it can be safe. |
| `stripe-webhook` `payout.failed` | `stripe-webhook/index.ts:234-237` logs failure only. | No current failure read path. | Missing visible failure receiver/projection. Payout failure can be invisible after a request. |

### Account Status Projection Target

`accountStatus` should not be a single `label`. It should split billing readiness from payout readiness:

```ts
type WalletAccountStatus = {
  billingCustomer: {
    scope: 'organization' | 'user_customer' | 'platform' | 'unavailable';
    stripeCustomerId: string | null;
    hasSavedMethods: boolean | null;
    state: 'ready' | 'not_configured' | 'loading' | 'error' | 'unavailable';
  };
  connectPayout: {
    organizationId: string | null;
    stripeAccountId: string | null;
    accountConfigured: boolean | null;
    payoutsEnabled: boolean | null;
    source: 'stripe_webhook_account_updated' | 'organization_id_only' | 'manual_org_state' | 'unknown';
    state: 'ready' | 'setup_required' | 'pending_verification' | 'unknown' | 'unavailable';
  };
  payoutMethod: {
    paymentMethodId: string | null;
    brand: string | null;
    last4: string | null;
    state: 'selected' | 'missing' | 'unknown' | 'unavailable';
  };
};
```

Rendering rules:

- "Linked" may only mean billing customer/method is present, not payout-ready.
- "Payouts Enabled" may only render when payout readiness is receiver-backed, not when only `stripe_account_id` exists.
- "Primary" may only render for the one method whose id equals `payout_method_id`.
- "Instant" must not render unless the payout receiver and reflected state prove instant settlement.
- If `organizations.is_active` is used, the projection must say whether the source is Stripe webhook readiness or manually edited org state.

### Pass 2D Implementation Locks

1. Treat top-up wallet credit as a backend gap until active current code proves wallet/ledger credit for top-ups.
2. Do not preserve "Wallet topped up successfully" copy; replace with lifecycle copy tied to intent, Stripe confirmation, payment row completion and wallet-credit reflection.
3. Do not render `Payouts Enabled` from `stripe_account_id` alone.
4. Split billing customer readiness from Connect payout readiness in the projection.
5. Add payout failure visibility or keep withdrawals unavailable beyond request-created state.
6. Remove global `Primary` card badges unless backed by `payout_method_id`.
7. Keep archived top-up credit logic as historical context only; do not implement from archived SQL without reconciling current pillar migrations.

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
- Platform and organization method list/remove/select commands preserve one explicitly projected scope.
- A card is labelled primary/default only when receiver-backed payout selection truth identifies it.
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
