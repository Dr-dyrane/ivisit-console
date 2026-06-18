---
status: living
owner: product
last_updated: 2026-06-18
---

# Roles & Ownership

> Every layer of work has a single human owner and zero or one agent assistant. Ownership means: you make the final call, you write the gate sign-off, you are accountable if the gate is not met.

---

## Human Roles

### Product Owner (PO)
**Accountable for:** The roadmap, the gate criteria, and the decision of whether a sprint ships.

| Owns | Does not own |
|---|---|
| BOARD_BRIEF.md | Code implementation |
| PRODUCT_ROADMAP.md | Test execution |
| Sprint gate sign-off | Design token values |
| Risk register | Individual task estimates |
| "Go/No-Go" decision | Agent prompt writing |

**How PO interacts with agents:** The PO defines the goal of each sprint. They do not write agent prompts directly — that is the Frontend Developer or Backend Developer's job. The PO reviews the output of Investigation Agents (audit reports, synthesis docs) and uses them to update roadmap priorities.

---

### Lead Designer
**Accountable for:** What the console looks like and how it behaves at the interaction level. The design system is the source of truth for all visual decisions.

| Owns | Does not own |
|---|---|
| design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md | Route/RBAC config |
| ux/CONSOLE_UX_REVAMP_PLAN.md (UX intent) | Supabase queries |
| UX copy (button labels, empty states, error messages) | Sprint gate sign-off |
| Interaction specs in execution/ sprint docs | Agent execution |
| design-system/INDEX.md | |

**How Designer interacts with agents:** Designers write the UX copy targets in sprint docs. Design-system Investigation Agents may be used to audit for token inconsistencies across the codebase (Sprint 4). Designers review all visual output of Implementation Agents before merging.

---

### Frontend Developer
**Accountable for:** Implementing UI changes correctly and cleanly. Writing agent prompts for implementation tasks. Reviewing agent-produced code diffs.

| Owns | Does not own |
|---|---|
| All `src/components/` changes | Supabase schema changes |
| Agent prompt writing for FE tasks | Sprint gate sign-off |
| Reviewing and approving agent-produced code | UX intent decisions |
| `src/contexts/`, `src/hooks/` for UX-layer hooks | Data layer architecture passes |
| `tailwind.config.js`, shared component library | |

**How FE Dev interacts with agents:** The FE Dev writes task specs in sprint docs, runs Implementation Agents against them, reviews the diff, and merges or requests revision. They do not merge agent output without reading the code.

---

### Backend Developer
**Accountable for:** Service-layer correctness, Supabase query optimisation, route protection config, and data layer architecture passes.

| Owns | Does not own |
|---|---|
| `src/services/` changes | UI component implementation |
| `src/config/routes.jsx` | Sprint gate sign-off |
| `frontend/src/config/navigation.js` (RBAC alignment) | UX copy |
| Supabase join optimisations (N+1 fixes) | Design token values |
| Architecture pass execution (Pass 3A, 4A, 5, 6A, E2) | Agent prompt writing for FE tasks |

**How BE Dev interacts with agents:** Backend Developer uses Investigation Agents to audit service files and verify data contracts. They review and approve any agent-produced service changes before merge.

---

### QA Engineer
**Accountable for:** Verifying gate criteria are met before a sprint closes. QA is the final human who signs off. If QA does not sign off, the sprint does not close and the next sprint does not start.

| Owns | Does not own |
|---|---|
| testing/QA_PROTOCOL.md | Code implementation |
| testing/RELEASE_CHECKLIST.md | UX decisions |
| Sprint gate verification | Agent execution |
| Device/browser matrix testing | Route configuration |
| Regression testing after each sprint | |

**How QA interacts with agents:** QA may run QA Agents to perform automated code audits (checking for hardcoded fallbacks, missing ARIA attributes, broken nav links). QA does not accept agent output as gate sign-off — they verify it manually.

---

### DevOps / Release
**Accountable for:** Deploying to staging and production. Monitoring after deploy. Rollback if needed.

| Owns | Does not own |
|---|---|
| Build and deploy pipeline | Sprint planning |
| Staging environment | Code review |
| Post-deploy monitoring | Gate sign-off |
| Rollback execution | Feature decisions |

---

## Agent Roles

Agents are **executors, not decision-makers.** They read, produce output, and hand off to a human. A human must review every agent output before it is merged or promoted.

### Investigation Agent
**Purpose:** Read-only exploration. Maps existing code, finds inconsistencies, generates audit reports.

**When to use:**
- At the start of a sprint to understand the current state of files to be changed
- To verify a gate criterion is met (e.g., "confirm no hardcoded fallbacks remain")
- To produce a cross-file consistency audit (e.g., "which modals are missing ARIA?")

**What it needs:** Exact file paths to read, a clear question, a structured output format.
**What it produces:** An analysis report. Never writes to files.
**Human review:** PO or FE/BE Dev reads the report and decides what to act on.

---

### Implementation Agent
**Purpose:** Make specified code changes. Writes and edits files based on a spec.

**When to use:**
- Implementing a well-specified task from a sprint doc
- Extracting a shared component from copy-pasted code
- Migrating a set of files to a new pattern (e.g., adopting ModalShell)

**What it needs:** Exact file paths to read and edit, current state description, what to change and why, expected output format.
**What it produces:** Modified files + a brief summary of what changed and why.
**Human review:** FE Dev reads the diff completely before merging. No merge without a human reading every changed line.
**Constraint:** Never runs `supabase` CLI commands. Never modifies `.env` files. Never touches `scripts/` migration files.

---

### QA Agent
**Purpose:** Verify that code meets gate criteria. Code-audit focused.

**When to use:**
- Verifying all hardcoded fallbacks have been removed (grep audit)
- Checking that all modals have ARIA semantics
- Confirming `window.dispatchEvent` has been removed from migrated pages
- Auditing import consistency after a shared component is extracted

**What it needs:** Gate criteria from the sprint doc, list of files to audit, expected patterns to confirm absent or present.
**What it produces:** A checklist with pass/fail per criterion. Does not modify files.
**Human review:** QA Engineer reads the checklist, verifies any fails manually, signs off the gate.

---

### Documentation Agent
**Purpose:** Create or update documentation after implementation is complete.

**When to use:**
- After a sprint ships: updating the sprint doc status, updating the product roadmap
- After a new component is created: writing a doc entry in the relevant index
- After a design decision changes: updating the revamp plan to reflect what was actually shipped vs. planned

**What it needs:** What was built, what doc to update, the existing doc content (must read first).
**What it produces:** Updated markdown files.
**Human review:** Any doc-file owner (PO, Designer, FE Dev) reviews before committing.

---

## Ownership Matrix

| Document | Human owner | Agent type allowed |
|---|---|---|
| _MASTER.md | Product Owner | Documentation Agent |
| planning/BOARD_BRIEF.md | Product Owner | — |
| planning/PRODUCT_ROADMAP.md | Product Owner | Documentation Agent |
| planning/RISK_REGISTER.md | Product Owner | — |
| team/* | Product Owner | — |
| ux/CONSOLE_UX_REVAMP_PLAN.md | Lead Designer | Documentation Agent |
| design-system/* | Lead Designer | Investigation Agent |
| architecture/* | Backend Developer | Investigation Agent |
| execution/SPRINT_N_*.md | Frontend Developer | Documentation Agent |
| testing/* | QA Engineer | QA Agent |
| src/components/ | Frontend Developer | Implementation Agent |
| src/services/ | Backend Developer | Implementation Agent |
| src/config/routes.jsx | Backend Developer | Investigation Agent |
| src/config/navigation.js | Backend Developer | — |
| src/contexts/ | Frontend Developer | Implementation Agent |
| src/hooks/ | Frontend Developer | Implementation Agent |
| tailwind.config.js | Frontend Developer | — |
