# Pass 2 Wallet First Implementation Checklist - 2026-05-26

## Status

Executable implementation checklist, planning only. No product runtime code, database mutation, RPC/Edge invocation, Stripe call, payout, ledger repair, cleanup, seed, reset, migration, or historical repair is authorized by this document.

This checklist is the first safe finance slice after the wallet audit. It focuses on read projection, preview/window truth, command-readiness state, and removal of ordinary-route repair behavior. It does not implement top-up crediting, payout execution, Stripe receiver changes, cash settlement repair, full export generation, or ledger backfill.

## Required Reading Before Code

- `../passes/PASS_2_WALLET_STRIPE_LEDGER_FLOW_SUBPLAN_2026-05-24.md`
- `../contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`
- `../stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `../services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/paymentService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/notificationDispatcher.js`

## Scope

Runtime files likely in scope for the first slice:

- `frontend/src/services/walletService.js`
- `frontend/src/components/pages/WalletManagementPage.jsx`
- `frontend/src/components/context/WalletPanel.jsx`
- `frontend/src/components/mobile/MobileWallet.jsx`
- `frontend/src/contexts/PageDataContext.jsx`

Runtime files to inspect but not freely edit in the first slice:

- `frontend/src/components/modals/GlobalFinancialModals.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/hooks/useContextAction.js`
- `frontend/src/services/activityService.js`
- `frontend/src/services/organizationsService.js`

Excluded from the first slice:

- Edge Function edits or deployment.
- Stripe confirmation, payout execution or webhook repair.
- Ledger insert/update/delete, fee backfill, historical repair and cleanup.
- Emergency cash settlement ordering.
- Insurance billing exception workflow.
- Billing quote/FX refresh implementation.
- Full ledger export delivery.

## First Slice Objective

Make wallet and finance surfaces truthful without moving money.

The slice should:

1. Add or define one read-only finance projection boundary.
2. Stop ordinary wallet route render/mount paths from running fee-ledger repair.
3. Label ledger/payment arrays as recent previews unless a server total/export scope is proved.
4. Replace static or fabricated labels such as `Primary`, `Verified`, `Linked`, yield fallback and fixed `Payment Complete` titles with projection-backed or unavailable state.
5. Convert top-up, payout, billing-method, export and maintenance buttons to capability-driven pending/unavailable states.
6. Preserve current receiver calls only where already mounted, but do not add or execute a new money command.

## Projection Contract To Implement First

The first implementation should produce these render-safe values before route/panel/mobile JSX consumes them:

| Projection key | Required fields | First-slice rule |
| --- | --- | --- |
| `actorScope` | actor id, role, organization id, scope kind, scope state | Organization scope must be canonical organization id only; no hospital id fallback. |
| `walletDisplay` | wallet id, balance, currency, updated time, visibility state | Missing, unauthorized and failed reads render differently from zero balance. |
| `ledgerPreview` | rows, window label, total count state, export state | Current `50`-row route and `10`-row context reads are previews, not complete ledger history. |
| `paymentPreview` | rows, status labels, payer/request context, window label | Dialog title derives from payment status; no fixed complete label. |
| `billingMethods` | scope, rows, remove readiness, primary/default state, setup state | No static `Primary`; list/remove/select use the same scope. |
| `stripeAccount` | customer state, connect account state, payout readiness, unavailable reason | `stripe_account_id` alone is not payout-ready proof. |
| `financeMetrics` | basis, time window, values, unavailable/degraded state | Dashboard/mobile/analytics cannot turn previews into complete analytics. |
| `cashReflection` | eligibility state, settlement reflection, notification delivery state | Notification delivery is not settlement or dispatch release. |
| `appSettlementReflection` | wallet payment/tip evidence availability and source | App-origin `process_wallet_payment`, `process_visit_tip`, `record_visit_cash_tip` are read/reflection dependencies only. |
| `commandState` | top-up, payout, method remove/select, export, maintenance | Unsafe commands default to disabled with reason and receiver dependency. |

## Action Disposition

| Action | First-slice disposition |
| --- | --- |
| View wallet | Retain through projection only. |
| View ledger/payment history | Retain as recent preview unless server paging/full scope exists. |
| Export ledger | Disable or label preview export scope; do not claim full history. |
| Open finance analytics | Disable or consume projection-labelled preview metrics only. |
| Top up wallet | Keep as unavailable/pending-proof until PaymentIntent confirmation and wallet/ledger reflection are modeled. |
| Withdraw/payout | Keep unavailable beyond request-scaffold until backend sufficiency/reservation and failure reflection are proved. |
| Add card/setup intent | Keep only if actor/scope and setup-result reflection are clear; no funding success copy. |
| Remove payment method | Disable when list scope and remove scope differ or are unknown. |
| Set primary payout method | Do not render primary/default until receiver-backed selected id exists. |
| Run fee-ledger backfill | Remove from ordinary route. Maintenance requires separate authorization and dry-run plan. |
| Process emergency cash fee | Remains Pass 1/2 shared blocked lane; no post-completion settlement repair in this slice. |

## Parser, Amount, And Fallback Checks

Before editing JSX, search and classify:

```powershell
rg -n "Number\\(|parseFloat|backfillMissingFeeLedger|topUpWallet|withdrawFunds|listPaymentMethods|deletePaymentMethod|setPayoutMethod|getFinanceAnalytics|getWalletSummary|processCashPayment|checkCashEligibility|Payment Complete|Primary|Verified|Linked|projection \\|\\||exportLedger|Wallet topped up|instant" frontend/src/components frontend/src/services frontend/src/contexts
```

Required outcomes:

- Money amount parsing rejects empty, zero, negative, non-finite and over-precise values before command payload creation.
- Command readiness is not based on object truthiness.
- Failed or unauthorized finance reads do not become zero balances or empty ledgers unless explicitly labelled.
- Preview arrays do not become complete counts, success rates, revenue or export truth.
- Browser diagnostics and toasts do not expose raw Supabase, Stripe, Edge or payment objects.

## App Consequence Notes

Wallet changes affect patient app payment, emergency release, visit history, tips, notifications, payouts and sponsor finance claims.

Required consequence rules:

- PaymentIntent creation is not wallet top-up completion.
- Stripe setup intent success is not card charge or payout readiness.
- Payout invocation is not transfer completion or wallet balance deduction.
- Cash approval notification delivery is not payment settlement.
- App wallet/tip settlements are reflected backend evidence, not Console CRUD fields.
- Demo payment writers are excluded from production finance truth.
- Patient quote/FX state is app-owned unless Console adopts the same quote receiver and provenance.

## Verification

Planning/doc-only edits:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/PASS_2_WALLET_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/PASS_2_WALLET_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation checks after code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
cd frontend
npm run build
```

Browser smoke after code begins:

- `/wallet` loads for platform and organization scope without running repair/backfill.
- Ledger footer says recent/windowed when only capped rows are loaded.
- Payment detail title reflects actual payment lifecycle.
- Top-up and payout controls show pending-proof/unavailable states instead of completed money movement.
- Billing methods show no static primary/default badge.
- Wallet panel/mobile/dashboard analytics do not present preview-derived values as complete finance analytics.
- Browser console does not emit payment, ledger, Stripe, Edge, wallet, org id or raw error payloads during normal wallet viewing.

DB/RPC/Edge/Stripe hardening is not authorized during audit. If later authorized for implementation, run only the smallest relevant non-production check and follow the cleanup dry-run guard required by Stage 6.

## Commit Boundary

Commit only when one of these coherent checkpoints is reached:

- Checklist/doc planning pack is complete and verified.
- First runtime finance projection/read-disable cleanup is implemented and verified with no money movement.
- A later backend/Edge/Stripe/RLS repair is separately authorized, verified and cleanup-guarded.

Do not commit a single label or amount-parser tweak without the projection, receiver and verification notes that make it resumable.
