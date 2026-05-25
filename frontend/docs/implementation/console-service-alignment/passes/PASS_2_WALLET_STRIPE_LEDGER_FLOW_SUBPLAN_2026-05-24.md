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
- `walletService.backfillMissingFeeLedger` is callable from ordinary wallet UI.
- `EmergencyRequestsPage` directly calls `walletService.checkCashEligibility` and `walletService.processCashPayment`, including hospital id fallback as organization id.
- `topUpWallet` creates a PaymentIntent and comments that Stripe/webhook later credits the wallet.

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
| Payout | Modal calls function after displayed-balance check. | Payout owner with backend reservation/sufficiency proof. |
| Payment methods | Modal/page call function actions independently. | Billing-method owner with per-action pending state. |
| Cash fee processing | Emergency page calls wallet service directly. | Emergency/payment owner delegates to wallet/ledger receiver after eligibility proof. |
| Maintenance backfill | Ordinary page button calls repair path. | Explicit maintenance-only flow with separate authorization and read-only evidence. |

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

### 2. Top-Up Lifecycle

Top-up must be modeled as a lifecycle:

- request PaymentIntent
- confirm payment through Stripe.js when required
- wait for webhook/refetch reflection or show pending confirmation
- update wallet only from backend/webhook truth

Acceptance gate:

- UI does not show wallet balance credited after PaymentIntent creation alone.
- Failure, pending, and webhook-lag states are visible.

### 3. Payout Lifecycle

Payout must be backend-authorized:

- backend proves actor can withdraw for the organization/platform scope
- backend proves funds are sufficient or reserved
- Stripe payout result is reconciled with ledger/wallet state
- failure state does not leave balance ambiguous

Acceptance gate:

- Payout submit is guarded by row/action pending state and cannot race stale displayed balance.

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
