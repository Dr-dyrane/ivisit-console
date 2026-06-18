---
status: living
owner: Product Owner
created: 2026-06-18
source: 4-agent parallel audit (Audits A–D)
---

# Gap Report — What the Sprint Plan Doesn't Cover

> Four Investigation Agents audited the full codebase in parallel: (A) hardcoded data on all pages, (B) RBAC chain completeness, (C) data layer health, (D) unfinished/broken code. This document synthesises all findings against the existing sprint plan, calls out what's missing, and recommends plan adjustments.

---

## How to Read This Document

**Covered** = already in the sprint plan at the right priority.  
**Extends** = the plan addresses the area but the specific finding adds scope.  
**Missing** = not in the plan at all — needs to be added or explicitly deferred.

Severity P0 = misleads users, breaks clinical workflows, exposes data, or silently corrupts state.  
Severity P1 = visible UX degradation, dead code, or latent bug without immediate user harm.

---

## Section 1 — Critical Findings Not In The Plan

These are P0 issues the revamp plan does not address. All should be resolved before or alongside Sprint 1.

### 1.1 Mock Poisoning Cascade (PageDataContext)

**Source:** Audit C — `contexts/PageDataContext.jsx` line 517  
**Severity:** P0 — silent, session-wide data fabrication  

When `fetchSupportTicketsData` throws any error, it calls `setUseMockData(true)`. Every other domain fetch function starts with `if (useMockData) return;`. One support-ticket transient failure permanently switches all 14 domain fetches to their mock constants for the entire session. The user continues interacting with the app, which appears to show data, but every number is fabricated for the rest of their session with no warning.

**Additionally:** Five domains are initialised directly with mock constants (`useState(mockEmergencyData)` etc.). Before the effect fires, every widget on the dashboard shows hardcoded numbers with no loading indicator to distinguish them from real data.

**Fix:** Remove `setUseMockData(true)` from the support-ticket catch. Give each domain its own error state. Remove mock initial state; use `null` or `[]` so loading indicators fire.  
**Recommended sprint:** Sprint 1 (same sprint as BentoHome/Analytics fabrication removal)

---

### 1.2 Overview.jsx — Entirely Synthetic Dashboard

**Source:** Audit A — `components/pages/Overview.jsx`  
**Severity:** P0 — 9 fabricated metrics

Overview is a secondary admin dashboard (visible to providers and org_admins at `/` context). It contains:
- Static `avgResponseTime: 12.5` (hardcoded constant, not from any service)
- Static monthly-requests chart array `[{name:'Jan',requests:400},...]`
- Hardcoded `+12%`, `+8%`, `+5%`, `+3%` change badges on every KPI card
- `+15%` badge on chart header
- `94%` hardcoded Success Rate
- Two Framer Motion progress bars with hardcoded `width: '75%'` and `width: '94%'`

**Fix:** Remove fabricated metrics. Use real data or remove cards entirely until data exists.  
**Recommended sprint:** Sprint 1 (same category as BentoHome)

---

### 1.3 MobileAnalytics.jsx — Fabricated Mobile Stats

**Source:** Audit A — `components/mobile/MobileAnalytics.jsx`  
**Severity:** P0

- `predictedSuccessRate = ... || 78`
- `totalEmergencies: predictedTotal || 12`
- `totalHospitals: ... || Math.max(2, ...)`
- `totalAmbulances: ... || Math.max(3, ...)`

These display to mobile users as live operational metrics.

**Fix:** Same empty-state treatment as desktop Analytics.  
**Recommended sprint:** Sprint 1 (alongside Analytics.jsx)

---

### 1.4 console.log Privacy and Security Leaks

**Source:** Audit D  
**Severity:** P0 (data exposure in production browser console)

| File | Issue |
|---|---|
| `services/emergencyService.js:634,646,674,686` | Logs RPC call params + response for `approveCashPayment` / `declineCashPayment` — **payment data visible in browser console in production** |
| `components/modals/VisitModal.jsx:21–22, 120–121` | Logs all visit data and `submitData` including `hospital_id` on every open and every save |
| `services/rbacPatterns.js:91` | `console.log('RBAC Audit:', event)` fires on **every permission check system-wide** |
| `contexts/AuthContext.jsx:50,63,78,84,98,128,180,186,209` | 9 log statements trace the full auth lifecycle on every page load — exposes user session data |
| `components/common/ProtectedRoute.jsx:54,69` | Logs denied route + user role on every blocked navigation |

**Fix:** Remove all `console.log` from service layer and auth flow. Replace with structured error logging or remove entirely.  
**Recommended sprint:** Sprint 1 — these are production security/privacy issues.

---

### 1.5 /map and /health-news Route Authority Splits

**Source:** Audit B  
**Severity:** P0

**`/map`:** Declared `public: true` in `routes.jsx` but wrapped `minRole="provider"` in `App.js`. Direct URL navigation fails for all authenticated users because `checkPathAccess` reads routes.jsx (public, no nav entry, returns false).  
**`/health-news`:** `navigation.js` exposes it to `viewer(20)`. `App.js` wraps at `minRole="provider"(40)`. A viewer sees the nav item, clicks it, and gets sent to `/unauthorized`. This is a visible UX break for the viewer role.

**Fix:** Reconcile routes.jsx ↔ App.js ↔ navigation.js for both routes.  
**Recommended sprint:** Sprint 1 (same fix as hospitals/insurance route reconciliation already in Sprint 1)

---

### 1.6 VerificationQueue Bulk Actions Are Dead Code

**Source:** Audit D — `components/pages/VerificationQueue.jsx`  
**Severity:** P0

The `BulkActionBar` is rendered with "Approve Selected" / "Reject Selected" buttons. `selectedIds` state and `handleSelect`/`handleSelectAll` work correctly. But there is no `handleBulkVerify` or `handleBulkReject` handler anywhere in the file. The buttons are completely dead — selection works visually but clicking Approve or Reject triggers nothing.

(Note: Audit A separately flagged that the bulk approve/reject in BulkActionBar calls `toast.success()` with no service call — this is the same root issue.)

**Fix:** Wire real `verifyProvider` loop calls to the bulk action buttons, with a ConfirmationModal first.  
**Recommended sprint:** Sprint 1 (it is a clinical workflow stub)

---

### 1.7 WalletManagementPage Silent Data Failure

**Source:** Audit D — `components/pages/WalletManagementPage.jsx:130–132`  
**Severity:** P0 (financial feature)

`fetchData` catch block has a commented-out `toast.error`. When the entire wallet data load fails (Supabase or Stripe error), the user sees the loading state resolve to empty tables with no error message. A provider or org_admin thinks they have no transactions rather than knowing there was a fetch error.

**Fix:** Restore `toast.error` and add a retry button.  
**Recommended sprint:** Sprint 3 (fits with page polish scope)

---

### 1.8 OrganizationsPage and PricingManagementPage Fabricated KPIs

**Source:** Audit A  
**Severity:** P0

- `OrganizationsPage.jsx:403–405` — `"99.8% ↑ Optimal"` Network Health card is hardcoded
- `PricingManagementPage.jsx:564` — `"94%"` Efficiency KPI is hardcoded

**Fix:** Remove fabricated KPI cards or source from real data.  
**Recommended sprint:** Sprint 3 (page polish)

---

### 1.9 UsersPage emailVerifiedUsers Fabrication

**Source:** Audit A — `components/pages/UsersPage.jsx:245`  
**Severity:** P0

`emailVerifiedUsers: totalUsers // Fallback` — equates every user to verified. Displays as a real metric.

**Fix:** Query actual verified count or remove the metric.  
**Recommended sprint:** Sprint 1 (data fabrication category)

---

### 1.10 Modal Submit Silent Failures

**Source:** Audit D  
**Severity:** P0 (SubscriptionModal) / P1 (others)

| Modal | Issue |
|---|---|
| `SubscriptionModal` (create/edit path, line 231–234) | Completely empty `catch` block — errors swallowed entirely, user sees nothing, data not saved |
| `VerificationModal` (handleSubmit catch) | `console.error` only, no `toast.error` — user gets no feedback if save fails |
| `HospitalModal`, `UserModal`, `VisitModal` | All delegate to `onSave` prop with `if (onSave)` guard — if parent omits prop, success toast fires and modal closes without writing anything |

**Fix:** Add `toast.error` + `handleApiError` to every modal catch. Add prop validation or a runtime assertion for required `onSave` props.  
**Recommended sprint:** Sprint 3 (modal fixes) / Sprint 4 (modal shell unification will standardise this)

---

## Section 2 — Plan Extensions (Issues the Plan Partially Addresses)

These areas are in the plan but the new audit findings add scope that should be tracked explicitly.

### 2.1 Sprint 1 RBAC Fix — Scope Wider Than Three Routes

The plan fixes `/hospitals`, `/insurance`, `/organizations`. Audit B found three more:
- `/map` split authority (see 1.5 above) — add to Sprint 1
- `/health-news` viewer/provider mismatch (see 1.5 above) — add to Sprint 1
- `patient(10)` role gets blocked at `/` by `allowedRoles` exclusion in App.js — add to Sprint 1 (or explicitly call out `patient` is intentionally excluded and document why)
- `/set-password`, `/onboarding`, `/onboarding-success` absent from ROUTE_PROTECTION — add to Sprint 1 (low risk, but their absence means the fallback returns `minRole: 'admin'` if ever queried)

### 2.2 Sprint 1 Data Fabrication — Overview.jsx Not Included

Sprint 1 scope covers BentoHome and Analytics. Overview.jsx (9 P0 fabrications) and MobileAnalytics.jsx (4 P0) are currently out of scope. They should either be added to Sprint 1 or called out as a deliberate deferral.

### 2.3 Sprint 5 Architecture — Broken useAnalytics Cache

`hooks/useAnalytics.js:69–71` — `getCacheKey` appends `Date.now()`, making the hook-level cache permanently miss. Every render triggers a double analytics fan-out (2 calls × 5 parallel service calls each = 10 Supabase queries per render). This belongs in the architecture track alongside PageDataContext decomposition.

### 2.4 Sprint 3 — admin N+1 in bulkUserOperation

`services/adminService.js:209–235` — `bulkUserOperation` is named "bulk" but executes one DB write + one audit log per user ID in serial. Not in any sprint. Should be part of the backend pass that fixes walletService N+1.

---

## Section 3 — Dead Code and Structural Debt (Defer to Architecture Track)

These are real problems but the right fix is the architecture refactor, not the UX revamp sprints. Track them in `CONSOLE_GRAND_REFACTOR_PLAN.md`.

| Finding | Right home |
|---|---|
| `RouteGuard.jsx` is fully implemented but never imported anywhere in App.js — completely dead code | Architecture track: RBAC pass |
| `can()` fine-grained RBAC is wired but its result is deliberately ignored in `getAccessibleNav` | Architecture track: RBAC pass |
| All 13 domain hooks use raw `useState`+`useEffect`, zero React Query usage despite it being installed | Architecture track: Pass E1 (already planned) |
| Window event bus: 50+ `window.addEventListener`/`window.dispatchEvent` calls across 35 files | Sprint 4 Pass D2 (already planned) |
| `useActivity.js` wraps functions with `useCallback(fn, [])` incorrectly (passes result not factory) | Architecture track: technical debt pass |
| WalletManagementPage potential scope leak: `isAdmin() ? null : profile.organization_id` — depends on client-side truthiness, not RLS | Architecture track: RBAC pass |

---

## Section 4 — Recommended Sprint Plan Amendments

### Add to Sprint 1 (P0 — same correctness category, no new risk)

| New task # | Task | Files affected |
|---|---|---|
| 1.17 | Fix mock poisoning cascade: remove `setUseMockData(true)` from support-ticket catch; replace mock initial state with null/[] | PageDataContext.jsx |
| 1.18 | Remove console.log from emergencyService (payment data) | emergencyService.js:634–686 |
| 1.19 | Remove console.log from AuthContext (session data) | AuthContext.jsx |
| 1.20 | Remove console.log from rbacPatterns.js (per-check RBAC audit log) | rbacPatterns.js:91 |
| 1.21 | Remove console.log from VisitModal (patient data) | VisitModal.jsx:21–22,120–121 |
| 1.22 | Fix /map route authority split | routes.jsx + App.js |
| 1.23 | Fix /health-news minRole mismatch (viewer in nav, provider in App.js) | navigation.js |
| 1.24 | Add /set-password, /onboarding, /onboarding-success to ROUTE_PROTECTION as public | routes.jsx |
| 1.25 | Remove Overview.jsx fabricated KPIs and hardcoded chart array | Overview.jsx |
| 1.26 | Remove MobileAnalytics.jsx fabricated fallback stats | MobileAnalytics.jsx |
| 1.27 | Fix UsersPage emailVerifiedUsers = totalUsers fabrication | UsersPage.jsx:245 |
| 1.28 | Wire VerificationQueue bulk approve/reject to real verifyProvider calls (currently dead) | VerificationQueue.jsx |

### Add to Sprint 3 (page polish category)

| New task # | Task | Files affected |
|---|---|---|
| 3.14 | Restore WalletManagementPage fetchData error toast | WalletManagementPage.jsx:130 |
| 3.15 | Remove OrganizationsPage "99.8% Network Health" fabricated KPI | OrganizationsPage.jsx:403 |
| 3.16 | Remove PricingManagementPage "94% Efficiency" fabricated KPI | PricingManagementPage.jsx:564 |
| 3.17 | Fix SubscriptionModal create/edit empty catch block | SubscriptionModal.jsx:231–234 |
| 3.18 | Fix VerificationModal save with no user error feedback | VerificationModal.jsx catch |
| 3.19 | Fix SupportTicketsPage bulk delete stub (toast only, no write) | SupportTicketsPage.jsx:723 |
| 3.20 | Fix InsuranceManagementPage bulk delete stub | InsuranceManagementPage.jsx:887 |
| 3.21 | Fix SubscriptionManagementPage bulk delete stub | SubscriptionManagementPage.jsx:916 |

### Add to Sprint 4 (component unification category)

| New task # | Task | Files affected |
|---|---|---|
| 4.11 | Add onSave prop validation/assertion to HospitalModal, UserModal, VisitModal (silent success when prop missing) | All three modals |
| 4.12 | Remove ProtectedRoute console.log (role + denied path logged on every block) | ProtectedRoute.jsx:54,69 |

### Add to Architecture Track (not UX sprints)

| Finding | Architecture pass |
|---|---|
| Broken useAnalytics hook-level cache (Date.now() key) | Pass E1 — first useQuery hooks |
| adminService.bulkUserOperation N+1 | Pass B (admin service) |
| walletService.backfillMissingFeeLedger N+1 | Pass 2A (wallet facade) — already planned |
| RouteGuard dead code | RBAC pass |
| can() ignored in nav filtering | RBAC pass |

---

## Section 5 — Coverage Summary

| Sprint | Original task count | New tasks added | Total |
|---|---|---|---|
| Sprint 1 | 13 | +12 (tasks 1.17–1.28) | **25** |
| Sprint 2 | 13 | 0 | 13 |
| Sprint 3 | 13 | +8 (tasks 3.14–3.21) | **21** |
| Sprint 4 | 10 | +2 (tasks 4.11–4.12) | **12** |
| Sprint 5 | 7 | 0 | 7 |
| Architecture track | ongoing | +3 new items | — |

Sprint 1 is now more than double its original scope. The Product Owner should decide whether to:
- **(Option A) Split Sprint 1 into S1a (clinical safety) and S1b (data hygiene):** S1a = the four native dialogs + hardest fabrications (BentoHome, Analytics, EmergencyRequestsPage). S1b = console.log cleanup, Overview/Mobile/UsersPage fabrications, route fixes, mock poisoning. S1a can ship first.
- **(Option B) Keep Sprint 1 as one sprint but extend the timeline from 1 to 2 weeks.** All P0 correctness work ships together.
- **(Option C) Treat console.log/privacy items as a zero-day hotfix** separate from the sprint cadence — merge them immediately since they don't require design decisions.

**Recommendation:** Option C for the 5 console.log items (1.18–1.21, 4.12) + the mock poisoning fix (1.17) — these are bugs, not features, and can be committed directly. Then run Sprint 1 at the original scope + route fixes (1.22–1.24) + Overview/Mobile fabrications (1.25–1.26) as an extended 2-week sprint.

---

*This document should be reviewed by the Product Owner before Sprint 1 implementation begins. Once decisions are made, update SPRINT_1_TRUST_CORRECTNESS.md and PRODUCT_ROADMAP.md with the agreed task list.*
