---
status: living
audience: executive, product leadership, investors
owner: product
last_updated: 2026-06-18
---

# Board Brief — Console UX Revamp

---

## The Problem in One Sentence

The iVisit console was built by engineers for engineers. The people who actually use it — doctors, hospital admins, and attending consultants — are not engineers, and they are failing to onboard.

---

## What the Audit Found

A deep four-agent audit conducted 2026-06-18 across 17 pages, all user roles, the full architecture, and every component pattern surfaced three categories of problems:

### 1. Trust-destroying fabricated data
Twelve hardcoded metric values are presented as live operational numbers on the dashboard. A doctor on their first login sees:
- "Response Time: 4.2 minutes" — hardcoded
- "Patient Satisfaction: 4.8/5.0" — hardcoded
- "System Health: 99%" — hardcoded
- "Beds Available: 156" — calculated as `number_of_ambulances × 13` — not real

The Analytics page generates an entirely synthetic set of charts (cardiac/trauma/respiratory breakdowns, demand heatmaps, response time curves) when there is no live data, with no disclosure to the user. A hospital administrator reviewing trends on a recently onboarded account is looking at invented data and may make staffing decisions based on it.

**This is not a UX problem. This is a clinical governance risk.**

### 2. The console does not know what role you are
Every role — doctor, hospital admin, system admin — sees the same navigation structure, the same dashboard architecture, and the same home state. A doctor cannot find their personal patient queue. A hospital admin cannot find credential approvals from the home screen. The most important task for an org_admin (verifying staff credentials) has no home screen representation at all and is buried behind a nav label called "Queue" — a word that communicates nothing.

### 3. Broken navigation contracts
Three confirmed bugs in the navigation layer:
- Hospital management appears in org_admin's nav but the route requires admin — clicking it fails silently
- Insurance management has the same mismatch
- The Organizations route exists in the nav but is absent from the route protection config

These are not cosmetic. They are the first thing an org_admin encounters when trying to do their job.

---

## What We Are Building

A revamped console that feels like a premium professional tool to a non-technical healthcare worker — closer to Apple Health than to Salesforce. Specifically:

- **For a doctor:** A personal work queue on the home screen. The three things they need (visits, emergencies, report a problem) are immediate. Nothing else is in their way.
- **For a hospital admin:** Credential approvals and staff status on the home screen. A wallet balance they can read without knowing what a "ledger" is. Navigation that uses words from their professional vocabulary, not engineering vocabulary.
- **For a system admin:** What already works, cleaned up. Global oversight with no broken nav links and no fabricated metrics.

---

## Success Metrics

These are the criteria by which the revamp will be evaluated. They are measurable, not directional.

| Metric | Current | Target | How measured |
|---|---|---|---|
| Hardcoded/fabricated metrics in production | 12+ | 0 | Code audit (grep for hardcoded fallbacks) |
| Route/nav config mismatches | 3 confirmed | 0 | Automated route alignment test |
| Time for doctor to find personal visit queue | Unknown (feature doesn't exist) | < 10 seconds cold | Manual usability test |
| Time for org_admin to find verification queue | Unknown | < 3 taps on mobile | Manual usability test |
| Native browser dialogs (`confirm`/`prompt`) in clinical flows | 3 | 0 | Code audit |
| Modal ARIA compliance | 1 of 10+ | 10 of 10 | Accessibility audit |
| Consistent modal footer pattern | 3 different patterns | 1 pattern | Code audit |
| Pages with explicit empty states | Partial | All 17 | Code audit |

---

## Investment Required

### Timeline
Five sprints. Each sprint is 1–2 weeks with a human-reviewable gate before the next begins.

| Sprint | Focus | Estimated effort |
|---|---|---|
| 1 | Trust & correctness (fabricated data, critical bugs) | 1 week |
| 2 | Home states & navigation | 1–2 weeks |
| 3 | High-traffic page polish | 1–2 weeks |
| 4 | Design token & component unification | 1 week |
| 5 | Data-gated pages (requires parallel architecture work) | 2–3 weeks |

Sprints 1–4 can begin immediately. Sprint 5 depends on architecture Pass E2 and domain-level data layer passes (estimated parallel track, 4–8 weeks).

### Resources
- 1 Frontend Developer (implementation)
- 1 Backend Developer (service-layer fixes: N+1 query, route mismatches, data layer passes)
- 1 QA (testing each sprint gate)
- Claude agents (investigation, implementation assistance, QA verification) — already configured
- No new tooling, no infrastructure changes, no database migrations required for Sprints 1–4

---

## Risk Register Summary

Full register at [planning/RISK_REGISTER.md](./RISK_REGISTER.md).

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sprint 5 blocked by architecture passes not completing | High | High | Sprints 1–4 deliver independent value; Sprint 5 is decoupled |
| Fabricated data fix breaks existing dashboard for early users | Low | Medium | Empty states with copy like "No data yet" are less alarming than wrong numbers |
| Route mismatch fix changes org_admin access scope | Medium | Medium | Audit access before and after; confirm with product owner |
| Analytics synthetic data removal is controversial (some orgs use it as a reference point) | Low | High | Add explicit "Estimated baseline — replace with real data" label; do not remove silently |
| Mobile revamp diverges further from desktop | Medium | Medium | Enforce shared component primitives before any mobile-specific work |

---

## Go / No-Go Gates

Each sprint has a gate. Work does not proceed to the next sprint until the gate is passed. Gates are verified by QA, not the implementing developer.

**Sprint 1 gate:** Zero hardcoded metric fallbacks visible to users. Zero native browser dialogs in clinical flows. Zero broken nav links. Verified by code audit + manual walkthrough on staging.

**Sprint 2 gate:** Doctor home screen shows personal visit queue. Org_admin home screen shows verification queue card. Role-fixed mobile bottom bar works for all five roles. Verified by role-switching test on staging.

**Sprint 3 gate:** Emergency actions permanently visible (not hover-only). Settings has zero dead UI elements. Support shows a role-appropriate view for providers. Health News gated at org_admin. Verified by manual walkthrough per role.

**Sprint 4 gate:** All entity modals use shared ModalShell component. Tailwind config has design token aliases. Window event bus removed from Sprint 1–3 pages. Verified by component audit + build passing.

**Sprint 5 gate:** Analytics shows real data with explicit empty states for sparse data. BentoHome shows no hardcoded fallbacks, ever. Wallet Payments tab loads without N+1 queries. Verified by network request audit + data validation.

---

## What Happens After Sprint 5

The console is in a state where:
- Non-technical healthcare users can navigate it without instruction
- Every number visible is real, or explicitly labelled as an estimate
- The design language is consistent with the patient-facing ivisit-app
- The architecture is ready for the next layer: real-time presence, scheduling, and analytics

At that point, the product enters a maintenance-and-growth mode. The console becomes a credible operational tool that can be demonstrated to hospital partners, attending consultants, and clinical governance reviewers without embarrassment.
