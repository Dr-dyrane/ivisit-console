---
status: Locked — starts after Sprint 1 gate
owner: Frontend Developer + Lead Designer (copy)
sprint_goal: Each role's home screen orients them to their actual work. Navigation uses words that non-technical healthcare staff understand.
gate_owner: QA Engineer
blocked_by: Sprint 1 gate
last_updated: 2026-06-18
---

# Sprint 2 — Home States & Navigation

---

## Sprint Goal

> Each role's home screen shows them their work, not the platform's aggregate counts. Every navigation label uses words from a healthcare worker's professional vocabulary.

---

## Design Notes

See `ux/CONSOLE_UX_REVAMP_PLAN.md` Section 1 (Role-by-Role Experience Targets) and Section 4 (Navigation Architecture Changes) for full detail.

**Home state per role (what each card should show):**

| Role | Card 1 | Card 2 | Card 3 | Quick actions |
|---|---|---|---|---|
| Doctor | "Your visits today: N" (their facility, today) | Requests count (their facility only) | — | Start Visit, Report Problem |
| Org Admin | "Approvals: N" (approval queue count) | "Staff on shift: N" (real, or — if unavailable) | Wallet balance | Add Staff, Review Approvals |
| Admin | Active requests (platform-wide) | Approvals backlog | User count | Add Org, Manage Users |
| Sponsor | *(Impact summary — Sprint 5 or later)* | Link to Analytics | Link to Health News | — |
| Viewer | Orientation card: "Your account is pending activation. Contact your org admin." | — | — | — |

**Navigation label changes:**

| From | To | File | Location |
|---|---|---|---|
| Queue | Approvals | navigation.js | Management nav group |
| Control Center (page title) | Account Settings | SettingsPage.jsx | `usePageHeader(...)` call |
| Identity Vault (page title) | Approvals | VerificationQueue.jsx | `usePageHeader(...)` call |
| Subscriptions (nav label) | Email Subscribers | navigation.js | Management nav group |
| Ledger (tab) | Transaction History | WalletManagementPage.jsx | Tab label |
| Payments (tab) | Patient Payments | WalletManagementPage.jsx | Tab label |
| Context (mobile tab) | Quick Actions | MobileNavMenu.jsx | Tab label |

---

## Tasks

### P0

| # | Task | Owner | Agent? | Acceptance criteria |
|---|---|---|---|---|
| 2.1 | Add Approvals card to org_admin Today | FE Dev | Assist | Org_admin Today shows an "Approvals: N" card linking to /verification |
| 2.2 | Doctor home: replace platform-wide stats with facility-scoped emergency count | FE Dev | Assist | Doctor home shows their facility's active emergency count (not platform total) |
| 2.3 | Doctor home: add "Your visits today" card | FE Dev | Assist | Doctor home shows count of visits assigned to them today, with patient names if available |
| 2.4 | Role-fixed mobile bottom bar | FE Dev | — | Bottom bar slots are deterministic per role (see design notes above) |
| 2.5 | Rename nav "Queue" → "Approvals" | FE Dev | — | `navigation.js` shows "Approvals" for the verification route |
| 2.6 | Rename VerificationQueue page title | FE Dev | — | Page header reads "Approvals" not "Identity Vault" |
| 2.7 | Rename Settings page title | FE Dev | — | Page header reads "Account Settings" not "Control Center" |
| 2.8 | Rename Wallet tabs | FE Dev | — | Tabs read "Transaction History" and "Patient Payments" |

### P1

| # | Task | Owner | Agent? | Acceptance criteria |
|---|---|---|---|---|
| 2.9 | Move "Email Subscribers" out of main nav | FE Dev | — | Subscriptions/Newsletter no longer appears alongside Hospitals, Emergencies, Insurance in main management nav |
| 2.10 | Canonical mobile nav entry | FE Dev | Assist | Avatar opens account/overflow sheet; bottom island remains primary nav only with no hamburger |
| 2.11 | Rename mobile "Context" tab → "Quick Actions" | FE Dev | — | MobileNavMenu second tab reads "Quick Actions" |
| 2.12 | Add tooltip to unlabelled desktop context panel toggle | FE Dev | — | Hovering the panel toggle button shows "Quick actions & info" or similar |

### P2

| # | Task | Owner | Agent? | Acceptance criteria |
|---|---|---|---|---|
| 2.13 | Viewer home: show orientation card | FE Dev | — | Viewer role sees "Your account is pending activation" message on home screen |
| 2.14 | Remove hardcoded "Shift: Active" / "Available: Ready" footer strings | FE Dev | — | Footer strings either derive from real data or show "—" |

---

## Gate Criteria

- [ ] Doctor logs in → home screen contains a card with their personal visit queue (not a platform-wide count)
- [ ] Org_admin Today → Approvals card is visible with a count
- [ ] Mobile: provider bottom island shows Today, Requests, Visits
- [ ] Mobile: org_admin bottom island shows Today, Approvals, Staff
- [ ] Verification nav label is `Approvals`
- [ ] "Identity Vault" string does not appear in VerificationQueue.jsx and the page title is `Approvals`
- [ ] "Control Center" string does not appear in SettingsPage.jsx
- [ ] Wallet page: tabs read "Transaction History" and "Patient Payments"
- [ ] `npm run build` passes

**Gate sign-off:** *(QA Engineer)*

---

## Agent Runs Log

| Date | Agent type | Task | Output summary | Human review by |
|---|---|---|---|---|
| — | — | — | — | — |
