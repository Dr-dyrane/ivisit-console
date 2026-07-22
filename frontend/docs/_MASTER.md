---
status: living
owner: product
last_updated: 2026-06-18
authority: highest — this document governs all other docs in this repo
---

# iVisit Console — Master Execution Document

> If you read nothing else, read this. Every other document in this repo is a child of this one.

---

## What We Are Building

A healthcare operations console used by **doctors**, **hospital admins**, and **platform admins** who are not product people. It must be simple enough to onboard cold — like handing a doctor an iPad. The current console was built for developers. We are rebuilding it for the people who manage patient care.

This is not a visual polish pass. It is a deterministic, sequenced revamp of every layer: data integrity, navigation architecture, role experience, and component consistency — with each layer unlocking the next.

---

## The Four Governing Documents

Everything in this repo flows from four source-of-truth documents. Read them in this order before touching any code:

| Order | Document | What it governs |
|---|---|---|
| 1 | [CLAUDE.md](../../CLAUDE.md) | Codebase index — full source tree, tech stack, routes, conventions |
| 2 | [architecture/CONSOLE_GRAND_REFACTOR_PLAN.md](./architecture/CONSOLE_GRAND_REFACTOR_PLAN.md) | Architectural violations and the 5-layer state target |
| 3 | [design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md](./design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md) | All visual tokens — radius, spacing, motion, glass surfaces |
| 4 | [ux/CONSOLE_UX_REVAMP_PLAN.md](./ux/CONSOLE_UX_REVAMP_PLAN.md) | Role journeys, page decisions, component unification, sprint sequence |

---

## System Map: From Board to User

```
┌─────────────────────────────────────────────────────────────────┐
│  BOARD / EXECUTIVE                                              │
│  planning/BOARD_BRIEF.md                                        │
│  Vision · Success metrics · Go/No-Go gates · Risk register     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  PRODUCT                                                        │
│  planning/PRODUCT_ROADMAP.md                                    │
│  5 sprints · owners · gate criteria · dependency chain         │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼──────┐   ┌─────────▼────────┐  ┌───────▼──────────┐
│  DESIGN      │   │  ENGINEERING     │  │  DATA / BACKEND  │
│              │   │                  │  │                  │
│  ux/         │   │  implementation  │  │  architecture/   │
│  design-sys/ │   │  execution/      │  │  database/       │
│  ui-ux/      │   │  Sprint 1–5 docs │  │  services layer  │
└───────┬──────┘   └─────────┬────────┘  └───────┬──────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  AGENTS (Claude)                                                │
│  team/AGENT_EXECUTION_GUIDE.md                                  │
│  Investigation · Implementation · QA · Documentation agents    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  TESTING & QA                                                   │
│  testing/QA_PROTOCOL.md · testing/RELEASE_CHECKLIST.md         │
│  Automated · Manual · Role-gate · Device matrix · Sign-off     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  USERS' HANDS                                                   │
│  Production deploy · Monitoring · Iteration signal             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current State — Sprint Readiness

| Sprint | Name | Status | Gate |
|---|---|---|---|
| Sprint 1 | Trust & Correctness | ✅ Ready to start | Critical bugs fixed, zero fabricated metrics |
| Sprint 2 | Home & Navigation | 🔒 After Sprint 1 | Role-fixed nav ships, doctor home state live |
| Sprint 3 | High-Traffic Page Polish | 🔒 After Pass D2 | Emergency + Settings + Support done |
| Sprint 4 | Design Token Enforcement | 🔒 After ModalShell ships | All modals unified, tokens in Tailwind config |
| Sprint 5 | Data-Gated Pages | 🔒 After domain passes | Analytics, BentoHome, Wallet revamped cleanly |

**Architecture pass status (from Audit 3):**
- Pass 1A/1B (emergency render): ✅ Complete
- TanStack Query installed: ✅ Complete (zero hooks written yet)
- All other passes (E2, D2, H1, Zustand, Jotai): ⬜ Not started

---

## Collaboration Rules

1. **Agents read, humans approve.** Every agent-produced code change goes through human review before merge. Agents are executors; humans are decision-makers.
2. **Docs before code.** Any new feature or significant change needs a spec in `execution/SPRINT_N_*.md` before implementation begins.
3. **No parallel truth.** If a decision changes the UX Revamp Plan, update that document. Do not create a new doc with a conflicting decision.
4. **Gate integrity.** A sprint is not done until its gate criteria in `planning/PRODUCT_ROADMAP.md` are all green. Not "mostly done."
5. **Audit trail.** Every agent run that produces files should be summarised in the sprint doc it belongs to under "Agent Runs."
6. **Fabricated data is a blocker.** No sprint ships if any hardcoded metric is still presented as real data. This is non-negotiable.

---

## Team Structure

See [team/ROLES_AND_OWNERSHIP.md](./team/ROLES_AND_OWNERSHIP.md) for the full ownership matrix.

| Layer | Human | Agent |
|---|---|---|
| Vision & roadmap | Product Owner | Synthesis Agent |
| UX specification | Lead Designer | Investigation Agent |
| Component implementation | Frontend Developer | Implementation Agent |
| Service/data layer | Backend Developer | Implementation Agent |
| Testing & QA | QA Engineer | QA Agent |
| Documentation | All (shared) | Documentation Agent |
| Release | DevOps | — |

---

## How to Use This Repo as an Agent

If you are a Claude agent arriving at this codebase:

1. **Read CLAUDE.md first** — full source tree and conventions
2. **Read this file** — system map and current sprint state
3. **Read your sprint doc** — `execution/SPRINT_{N}_*.md` — your specific task list
4. **Read the governing docs** for your layer (design, architecture, or UX)
5. **Follow the handoff protocol** — `team/HANDOFF_PROTOCOL.md`
6. **Never write to production data** — this is a frontend console. No DB migrations, no Edge Function deploys, no Supabase production calls.

---

## Full Document Index

### Planning Layer
- [planning/BOARD_BRIEF.md](./planning/BOARD_BRIEF.md) — Executive summary, vision, KPIs, investment
- [planning/TODAY_PRODUCT_ROOM.md](./planning/TODAY_PRODUCT_ROOM.md) - Today controller/staff model, Supabase governance promise, first product slice
- [planning/PAGE_REVAMP_GATE.md](./planning/PAGE_REVAMP_GATE.md) - Page-by-page RBAC, layout, design, implementation, and QA gate
- [planning/PRODUCT_ROADMAP.md](./planning/PRODUCT_ROADMAP.md) — Sprint plan with gates and owners
- [planning/RISK_REGISTER.md](./planning/RISK_REGISTER.md) — Known risks, mitigations, owners

### Team & Collaboration
- [team/ROLES_AND_OWNERSHIP.md](./team/ROLES_AND_OWNERSHIP.md) — Human and agent ownership matrix
- [team/AGENT_EXECUTION_GUIDE.md](./team/AGENT_EXECUTION_GUIDE.md) — How to run Claude agents on this codebase
- [team/HANDOFF_PROTOCOL.md](./team/HANDOFF_PROTOCOL.md) — How work flows between layers

### UX Strategy
- [ux/CONSOLE_UX_REVAMP_PLAN.md](./ux/CONSOLE_UX_REVAMP_PLAN.md) — Master UX plan (all roles, all pages)
- [ux/mobile_dashboard_reinvention.md](./ux/mobile_dashboard_reinvention.md) — Mobile dashboard audit
- [ux/INDEX.md](./ux/INDEX.md) — UX folder index

### Design System
- [design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md](./design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md) — Token reference
- [design-system/INDEX.md](./design-system/INDEX.md) — Design system folder index

### Architecture
- [architecture/CONSOLE_GRAND_REFACTOR_PLAN.md](./architecture/CONSOLE_GRAND_REFACTOR_PLAN.md) — 12 violations, 5-layer target
- [architecture/CONSOLE_OPTIMISATION_MASTER_PLAN.md](./architecture/CONSOLE_OPTIMISATION_MASTER_PLAN.md) — Governing principles

### Sprint Execution
- [execution/SPRINT_1_TRUST_CORRECTNESS.md](./execution/SPRINT_1_TRUST_CORRECTNESS.md) — Fix fabricated data, critical bugs, nav mismatches
- [execution/SPRINT_2_HOME_NAVIGATION.md](./execution/SPRINT_2_HOME_NAVIGATION.md) — Role home states, nav architecture
- [execution/SPRINT_3_PAGE_POLISH.md](./execution/SPRINT_3_PAGE_POLISH.md) — Emergency, Settings, Support, HealthNews
- [execution/SPRINT_4_DESIGN_TOKENS.md](./execution/SPRINT_4_DESIGN_TOKENS.md) — ModalShell, Tailwind tokens, component unification
- [execution/SPRINT_5_DATA_GATED.md](./execution/SPRINT_5_DATA_GATED.md) — Analytics, BentoHome, Wallet (after data layer passes)
- [execution/SPRINT_6_COPILOT_CAPABILITY_LADDER.md](./execution/SPRINT_6_COPILOT_CAPABILITY_LADDER.md) - P1 preparation, P2 confirmation, and allowlisted P3 workflow execution
- [execution/SPRINT_7_FESTAC_REAL_ORGANIZATION_PILOT.md](./execution/SPRINT_7_FESTAC_REAL_ORGANIZATION_PILOT.md) - Planning-only path for one real Festac hospital, staff, fleet, schedules, cash, and bounded credit

### Testing & Release
- [testing/QA_PROTOCOL.md](./testing/QA_PROTOCOL.md) — Test strategy per change type
- [testing/RELEASE_CHECKLIST.md](./testing/RELEASE_CHECKLIST.md) — Pre-deploy gate checklist
