---
status: Ready to start
owner: Frontend Developer + Backend Developer
sprint_goal: No user ever sees a fabricated number presented as real. No clinical action uses a native browser dialog.
gate_owner: QA Engineer
last_updated: 2026-06-18
---

# Sprint 1 — Trust & Correctness

---

## Sprint Goal

> No user ever sees a fabricated number presented as real. No clinical action uses a native browser dialog. No broken navigation links reach users.

This sprint has no visible "feature" — it is correctness work. When it ships, the product looks similar but trusts better. The next sprint can build on it.

---

## Design Notes

**UX Copy for empty states** (Lead Designer to confirm):

| Location | Current (hardcoded) | Replacement copy |
|---|---|---|
| BentoHome response time card | "23% faster today" | *(remove entirely)* |
| BentoHome satisfaction score | "4.8/5.0" | *(remove entirely)* |
| BentoHome system health | "System Health: 99%" | *(remove entirely)* |
| BentoHome stat cards (zero state) | `48`, `24`, `12` etc. | `—` |
| Analytics (no data state) | Full synthetic charts | "Activity charts will appear after 7 days of operational data." |
| DoctorsPage rating | `4.5` | `—` or *(no rating display until real ratings exist)* |
| VerificationQueue (no permission) | *(blank page)* | "You don't have access to the verification queue. Contact your organisation administrator." |

---

## Tasks

### P0 — Must ship before sprint closes

| # | Task | Owner | Agent? | Acceptance criteria |
|---|---|---|---|---|
| 1.1 | Remove all hardcoded metric fallbacks from BentoHome | FE Dev | Audit assist | Grep for `|| 48`, `|| 24`, `|| 12`, `|| 94`, `|| 8`, `|| 15` returns zero results in BentoHome.jsx |
| 1.2 | Remove `appStats.availableAmbulances * 13` Beds Available formula | FE Dev | — | No multiplication of ambulance count used to derive any metric label |
| 1.3 | Remove hardcoded sparkline chartData static array | FE Dev | — | No static `[{time:'00:00',value:5}...]` array in BentoHome |
| 1.4 | Remove hardcoded status pill strings ("System: Nominal", "Shift: Active", etc.) | FE Dev | — | Footer status pills either source from real data or are removed |
| 1.5 | Add "Estimated baseline data" banner to Analytics | FE Dev | — | Analytics page shows a dismissible banner for users/accounts with < 7 days of data |
| 1.6 | Replace `window.prompt()` for payment method selection | FE Dev | — | EmergencyRequestsPage contains zero `window.prompt` calls |
| 1.7 | Replace `confirm()` bulk cancel with ConfirmationModal | FE Dev | — | EmergencyRequestsPage contains zero `window.confirm` / `confirm(` calls |
| 1.8 | Replace `confirm()` mark-complete with ConfirmationModal | FE Dev | — | Same as above |
| 1.9 | Fix Hospitals route/nav mismatch | BE/FE Dev | — | `/hospitals` has identical minRole in routes.jsx and navigation.js |
| 1.10 | Fix Insurance route/nav mismatch | BE/FE Dev | — | `/insurance` has identical minRole in routes.jsx and navigation.js |
| 1.11 | Add `/organizations` to routes.jsx | BE/FE Dev | — | `/organizations` has an explicit entry in ROUTE_PROTECTION |
| 1.12 | Fix VerificationQueue silent empty state | FE Dev | — | When `canVerify` is false, page shows access-denied copy (see Design Notes above) |

### P1 — Should ship in this sprint, can defer to Sprint 2 if blocked

| # | Task | Owner | Agent? | Acceptance criteria |
|---|---|---|---|---|
| 1.13 | Fix Wallet Payments N+1 query | BE Dev | — | Network tab shows 1 Supabase call for Payments tab, not 50 |
| 1.14 | Remove `doctor.rating \|\| '4.5'` fallback | FE Dev | — | DoctorsPage shows `—` or nothing when rating is null |
| 1.15 | Remove `doctor.experience \|\| '5'` fallback | FE Dev | — | DoctorsPage shows `—` when experience is null |
| 1.16 | Fix Smart bottom bar role-blind recommendations | FE Dev | — | `SMART_RECOMMENDATIONS` checks role before surfacing a route |

---

## Agent Runs Log

*(FE Dev fills this in as agents are used)*

| Date | Agent type | Task | Prompt file | Output summary | Human review by |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**Recommended agent use for this sprint:**

**Run 1 — Investigation (before starting):**
Prompt: Read BentoHome.jsx, Analytics.jsx, EmergencyRequestsPage.jsx. Find every hardcoded fallback value, `window.confirm`, `window.prompt`, and static data array. Output as a table: file, line, code snippet, severity. This is the discovery step before writing any code.

**Run 2 — QA (before gate sign-off):**
Prompt: Verify all P0 tasks are complete. Grep for patterns listed in gate criteria. Return pass/fail per criterion with evidence. Do not modify files.

---

## Gate Criteria

QA Engineer verifies all of these before signing off. Every criterion must be green.

- [ ] `grep -n "|| 48\||| 24\||| 12\||| 94\||| 15\||| 8" frontend/src/components/pages/BentoHome.jsx` returns zero matches
- [ ] `grep -n "availableAmbulances \* 13" frontend/src/components/pages/BentoHome.jsx` returns zero matches
- [ ] `grep -n "window\.prompt\|window\.confirm\|\bconfirm(" frontend/src/components/pages/EmergencyRequestsPage.jsx` returns zero matches
- [ ] `routes.jsx`: `/hospitals` minRole matches `navigation.js`
- [ ] `routes.jsx`: `/insurance` minRole matches `navigation.js`
- [ ] `routes.jsx`: `/organizations` has an explicit entry
- [ ] VerificationQueue: when `canVerify` resolves to false, a visible access-denied message is displayed (not blank)
- [ ] Analytics page: an explicit empty state or banner is shown for zero/sparse data (no synthetic charts without disclosure)
- [ ] `npm run build` passes in `frontend/` with zero errors
- [ ] Manual walkthrough: org_admin can click Hospitals in nav and reach the page (not a denied error)

**Gate sign-off:** *(QA Engineer writes here when all criteria are green)*

---

## Dependencies

- None — Sprint 1 has no blocked dependencies
- Architecture track can proceed in parallel

---

## Deferred Items

*(FE Dev notes anything that could not be completed and moves it forward)*

| Task | Reason deferred | Moved to |
|---|---|---|
| — | — | — |

---

## Sprint Retrospective

*(Filled in after sprint closes)*

What went well:

What could be better:

Agent performance notes:
