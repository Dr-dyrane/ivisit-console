---
status: living
owner: product
last_updated: 2026-06-18
tracks: UX Revamp (this doc) | Architecture Refactor (CONSOLE_GRAND_REFACTOR_PLAN.md)
---

# Product Roadmap — Console Revamp

> Two tracks run in parallel: this UX track and the architecture refactor track. Sprint 5 of this track depends on architecture passes E2, D2, H1. Everything else is independent.

---

## Track Overview

```
UX Track (this document)          Architecture Track (CONSOLE_GRAND_REFACTOR_PLAN.md)
─────────────────────────         ────────────────────────────────────────────────────
Sprint 1: Trust & Correctness     Pass A2: Zustand + Jotai install
Sprint 2: Home & Navigation       Pass D2: Domain modal atoms (replaces window events)
Sprint 3: Page Polish             Pass E1: First useQuery hooks per domain
Sprint 4: Token Unification  ←── Pass E2: PageDataContext decomposition [GATE for Sprint 5]
Sprint 5: Data-Gated Pages   ←── Pass H1: Mock data elimination [GATE for Sprint 5]
```

---

## Sprint 1 — Trust & Correctness

**Goal:** No user ever sees a fabricated number presented as real. No clinical action uses a native browser dialog.

**Owner:** Frontend Developer + Backend Developer (route fixes)
**Agent support:** Code-audit agent to verify all hardcoded values removed
**Estimated effort:** 1 week
**Sprint doc:** [execution/SPRINT_1_TRUST_CORRECTNESS.md](../execution/SPRINT_1_TRUST_CORRECTNESS.md)

### Tasks

| # | Task | Owner | Agent? | Priority |
|---|---|---|---|---|
| 1.1 | Remove 12+ hardcoded metric fallbacks from BentoHome | FE Dev | Assist | P0 |
| 1.2 | Add "Estimated baseline data" banner to Analytics | FE Dev | — | P0 |
| 1.3 | Replace `window.prompt()` in EmergencyRequestsPage with ConfirmationModal | FE Dev | — | P0 |
| 1.4 | Replace `confirm()` bulk cancel and mark-complete with ConfirmationModal | FE Dev | — | P0 |
| 1.5 | Fix Hospitals route/nav mismatch (align routes.jsx ↔ navigation.js) | BE/FE Dev | — | P0 |
| 1.6 | Fix Insurance route/nav mismatch | BE/FE Dev | — | P0 |
| 1.7 | Add `/organizations` to routes.jsx protection config | BE/FE Dev | — | P0 |
| 1.8 | Fix VerificationQueue silent empty on permission failure | FE Dev | — | P0 |
| 1.9 | Remove `appStats.availableAmbulances * 13` Beds Available metric | FE Dev | — | P0 |
| 1.10 | Fix Wallet Payments N+1 query (add profile join) | BE Dev | — | P1 |
| 1.11 | Remove `doctor.rating \|\| '4.5'` and `doctor.experience \|\| '5'` fallbacks | FE Dev | — | P1 |
| 1.12 | Fix Smart bottom bar recommending inaccessible routes | FE Dev | — | P1 |
| 1.13 | Add role check to `SMART_RECOMMENDATIONS` map | FE Dev | — | P1 |

### Gate Criteria (all must be green)
- [ ] Grep for `|| '4.5'`, `|| '5'`, `|| 94`, `|| 12`, `|| 24`, `|| 48`, `|| 8`, `|| 15` returns no results in page components
- [ ] `window.prompt` and `window.confirm` return zero results in EmergencyRequestsPage
- [ ] `/hospitals` route in routes.jsx and navigation.js have matching minRole
- [ ] `/insurance` same
- [ ] `/organizations` appears in routes.jsx
- [ ] VerificationQueue shows an access-denied state when `canVerify` is false
- [ ] Build passes (`npm run build`)
- [ ] Manual walkthrough: org_admin can click Hospitals in nav without a denied page

---

## Sprint 2 — Home & Navigation

**Goal:** Each role's home screen orients them to their actual work. Navigation uses words that non-technical healthcare staff understand.

**Owner:** Frontend Developer + Designer (copy/labels)
**Agent support:** Implementation agent for role-branched home state cards
**Estimated effort:** 1–2 weeks
**Blocked by:** Sprint 1 gate
**Sprint doc:** [execution/SPRINT_2_HOME_NAVIGATION.md](../execution/SPRINT_2_HOME_NAVIGATION.md)

### Tasks

| # | Task | Owner | Agent? | Priority |
|---|---|---|---|---|
| 2.1 | Add Approvals card to org_admin Today | FE Dev | Assist | P0 |
| 2.2 | Scope doctor home state to personal visits/facility emergencies | FE Dev | Assist | P0 |
| 2.3 | Role-fixed mobile bottom bar (deterministic slots per role) | FE Dev | — | P0 |
| 2.4 | Rename nav label "Queue" → "Approvals" | FE Dev | — | P0 |
| 2.5 | Rename page title "Identity Vault" → "Approvals" | FE Dev | — | P0 |
| 2.6 | Rename Settings page "Control Center" → "Account Settings" | FE Dev | — | P0 |
| 2.7 | Rename Wallet tabs: "Ledger" → "Transaction History", "Payments" → "Patient Payments" | FE Dev | — | P0 |
| 2.8 | Rename "Subscriptions" nav item → "Email Subscribers", move out of main nav | FE Dev | — | P1 |
| 2.9 | Canonical mobile nav: avatar opens account/overflow sheet; bottom island has no hamburger | FE Dev | Assist | P1 |
| 2.10 | Rename mobile "Context" tab → "Quick Actions" | FE Dev | — | P1 |
| 2.11 | Add tooltip to unlabelled context panel toggle on desktop | FE Dev | — | P1 |
| 2.12 | Viewer role: replace empty home with orientation card | FE Dev | — | P2 |
| 2.13 | Remove hardcoded "Shift: Active" / "Available: Ready" footer strings | FE Dev | — | P2 |

### Gate Criteria
- [ ] Doctor logs in → home screen shows their facility's emergency count and a "Your visits today" card
- [ ] Org_admin Today → Approvals card present with count
- [ ] Mobile bottom island: provider sees Today/Requests/Visits; org_admin sees Today/Approvals/Staff
- [ ] Verification nav label is `Approvals`
- [ ] "Identity Vault" does not appear on the Verification page and the page title is `Approvals`
- [ ] "Control Center" does not appear on the Settings page
- [ ] Viewer home screen has an orientation/activation message
- [ ] Build passes

---

## Sprint 3 — High-Traffic Page Polish

**Goal:** The pages used most by non-admin roles (Emergency, Settings, Support) work cleanly for every role they serve.

**Owner:** Frontend Developer
**Agent support:** QA agent to verify interaction consistency
**Estimated effort:** 1–2 weeks
**Blocked by:** Sprint 2 gate
**Sprint doc:** [execution/SPRINT_3_PAGE_POLISH.md](../execution/SPRINT_3_PAGE_POLISH.md)

### Tasks

| # | Task | Owner | Agent? | Priority |
|---|---|---|---|---|
| 3.1 | Make emergency card actions permanently visible (remove hover-only) | FE Dev | — | P0 |
| 3.2 | Add HospitalsPage KPI strip (Total, Active, Inactive, Low Capacity) | FE Dev | — | P0 |
| 3.3 | SettingsPage: remove dead UI (broken Upgrade link, stuck Notifications toggle, Language selector) | FE Dev | — | P0 |
| 3.4 | SettingsPage: remove duplicate Sign Out from header | FE Dev | — | P0 |
| 3.5 | SupportTicketsPage: provider view = "My Requests" only (role-branched) | FE Dev | Assist | P0 |
| 3.6 | HealthNewsManagementPage: raise min role to org_admin or create read-only provider feed | FE Dev | — | P1 |
| 3.7 | UsersPage: merge "Create User" + "Invite User" into single "Add User" flow | FE Dev | Assist | P1 |
| 3.8 | UsersPage: remove grid view, default to table | FE Dev | — | P1 |
| 3.9 | VisitsPage: change default sort to status-priority (active first) | FE Dev | — | P1 |
| 3.10 | PricingManagementPage: merge Services + Rooms tabs into unified list | FE Dev | — | P1 |
| 3.11 | PricingManagementPage: replace always-visible inline form with modal (consistent with all other pages) | FE Dev | — | P1 |
| 3.12 | InsuranceManagementPage: add "Verify" quick action on unverified policy cards | FE Dev | — | P2 |
| 3.13 | OrganizationsPage: add fee percentage change confirmation step | FE Dev | — | P2 |

### Gate Criteria
- [ ] Emergency card actions visible without hover on all device types
- [ ] HospitalsPage has KPI strip at top
- [ ] SettingsPage: no broken links, no permanently-checked toggle, no disabled-but-visible features
- [ ] Provider visiting SupportTicketsPage sees only their own tickets + "Report a Problem" CTA
- [ ] HealthNews either gated at org_admin or split into read-only feed
- [ ] UsersPage: single "Add User" button, no "Create vs Invite" ambiguity
- [ ] Build passes

---

## Sprint 4 — Design Token Enforcement & Component Unification

**Goal:** Every modal looks like every other modal. Every interaction pattern is implemented once and reused everywhere.

**Owner:** Frontend Developer + Designer (token naming)
**Agent support:** Implementation agent for ModalShell extraction; QA agent for consistency audit
**Estimated effort:** 1 week
**Blocked by:** Sprint 3 gate
**Sprint doc:** [execution/SPRINT_4_DESIGN_TOKENS.md](../execution/SPRINT_4_DESIGN_TOKENS.md)

### Tasks

| # | Task | Owner | Agent? | Priority |
|---|---|---|---|---|
| 4.1 | Create `src/components/ui/ModalShell.jsx` shared component | FE Dev | Assist | P0 |
| 4.2 | Create `src/components/ui/GlassSection.jsx` shared sub-component | FE Dev | Assist | P0 |
| 4.3 | Migrate DoctorModal, HospitalModal, UserModal to use ModalShell | FE Dev | Assist | P0 |
| 4.4 | Add ARIA semantics to all remaining modals | FE Dev | — | P0 |
| 4.5 | Add Tailwind config token aliases (rounded-card, rounded-inner, rounded-icon, bg-brand) | FE Dev | Assist | P0 |
| 4.6 | Create `src/contexts/PageActionsContext.jsx` (replaces window event bus) | FE Dev | Assist | P0 |
| 4.7 | Migrate Sprint 1–3 pages from window events to `usePageActions` | FE Dev | Assist | P1 |
| 4.8 | Remove modal `mode="view"` — route all entity detail to context panel | FE Dev | — | P1 |
| 4.9 | Extract `src/utils/metricsUtils.js` (calcDeltaPercent, formatSignedPercent, toDeltaBadge) | FE Dev | — | P1 |
| 4.10 | Update all mobile components using the copied metric utils to import from metricsUtils | FE Dev | Assist | P1 |

### Gate Criteria
- [ ] `grep -r "window.dispatchEvent" src/components/pages/` returns zero results for Sprint 1–3 pages
- [ ] All entity modals render via `<ModalShell>` wrapper
- [ ] `tailwind.config.js` has `rounded-card`, `rounded-inner`, `bg-brand` entries
- [ ] ARIA `role="dialog" aria-modal="true"` on all modal components
- [ ] `calcDeltaPercent` exists in exactly one file (`metricsUtils.js`)
- [ ] Build passes + no TypeScript errors

---

## Sprint 5 — Data-Gated Pages

**Goal:** Analytics shows real data. BentoHome contains no hardcoded numbers. Wallet loads without an N+1 query.

**Owner:** Frontend Developer + Backend Developer
**Agent support:** Investigation agent to verify data layer passes complete; Implementation agent
**Estimated effort:** 2–3 weeks
**Blocked by:** Sprint 4 gate AND architecture Pass E2 (PageDataContext decomposition) AND Pass H1 (mock data elimination)
**Sprint doc:** [execution/SPRINT_5_DATA_GATED.md](../execution/SPRINT_5_DATA_GATED.md)

### Pre-conditions (architecture track)
- [ ] Architecture Pass E2 complete: PageDataContext decomposed, first domain query hooks written
- [ ] Architecture Pass H1 complete: mock data removed from PageDataContext
- [ ] Architecture Pass 2A complete: wallet read facade exists
- [ ] Architecture Pass 3A complete: hospitals pagination defect fixed

### Tasks (unlocked after pre-conditions)

| # | Task | Owner | Agent? | Priority |
|---|---|---|---|---|
| 5.1 | Analytics: remove synthetic fallback chart generation, replace with explicit empty states | FE Dev | Assist | P0 |
| 5.2 | Analytics: collapse 4 duplicate chart blocks into single `<ResponseTimeChart>` component | FE Dev | Assist | P0 |
| 5.3 | BentoHome: migrate all stat cards to useQuery hooks (no PageDataContext consumption) | FE Dev | Assist | P0 |
| 5.4 | WalletManagementPage: validate N+1 fix is live, update tab labels from Sprint 2 | FE Dev | — | P0 |
| 5.5 | HospitalsPage: full revamp using pagination-correct data (after Pass 3A) | FE Dev | Assist | P1 |
| 5.6 | UsersPage: full revamp using correct count (after Pass 4A) | FE Dev | Assist | P1 |
| 5.7 | VisitsPage: visit read model integration, remove delete from emergency-derived visits | FE Dev | — | P1 |

### Gate Criteria
- [ ] Analytics page shows explicit empty state for accounts with < 7 days of data
- [ ] BentoHome stat cards source from useQuery hooks; PageDataContext removed from imports
- [ ] Network tab audit: Wallet Payments tab triggers 1 Supabase request, not 50
- [ ] `grep -r "mockEmergencyData\|mockAnalyticsData\|mockDoctorsData" src/` returns zero results
- [ ] Build passes

---

## Roadmap Summary Table

| Sprint | Goal | Gate owner | Status |
|---|---|---|---|
| 1 | Zero fabricated data, zero broken nav | QA Engineer | ⬜ Ready |
| 2 | Role-oriented home states, renamed nav | QA Engineer | 🔒 After S1 |
| 3 | High-traffic page polish | QA Engineer | 🔒 After S2 |
| 4 | Unified components, design tokens | QA Engineer | 🔒 After S3 |
| 5 | Real data everywhere | QA Engineer | 🔒 After S4 + Arch |
