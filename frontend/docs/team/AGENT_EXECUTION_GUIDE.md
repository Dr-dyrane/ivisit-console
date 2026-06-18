---
status: living
owner: frontend developer
last_updated: 2026-06-18
---

# Agent Execution Guide

> How to use Claude agents on the ivisit-console codebase. Read this before spawning any agent. Agents are powerful and fast — a badly briefed agent can produce plausible-looking wrong code that takes longer to unpick than to write correctly.

---

## The Golden Rules

1. **Read before you delegate.** Before spawning an agent to change a file, read that file yourself. You need to understand what is there to verify what the agent produces.
2. **Specs first.** An agent without a spec produces approximate code. Write the task spec in the sprint doc, then give it to the agent.
3. **Every agent output gets human eyes.** No agent-produced file is merged without a human reading the full diff. Not "skimmed." Read.
4. **Agents do not make product decisions.** "Fix this modal" is a task. "Decide how the verification flow should work" is not. Decisions belong to humans. Execution belongs to agents.
5. **Isolation for implementation.** All Implementation Agents run with `isolation: "worktree"` to work on a copy of the repo. Never run an implementation agent on the live working tree.

---

## The Context Hierarchy

Every agent needs context. Give context in this order of priority:

```
1. CLAUDE.md (codebase index)          — always include a reference
2. _MASTER.md (system map)             — always include for sprint work
3. Relevant governing doc              — design system, architecture, or UX plan
4. Sprint doc for the task             — execution/SPRINT_N_*.md
5. Exact file paths to read            — specific, not "the components folder"
6. Current state description           — what it looks like now
7. What to change and why              — explicit, not implied
8. Expected output format              — "return as text" vs "write files"
```

Never rely on an agent "knowing" the codebase from training data. Codebase state changes constantly. Always give explicit file paths and read them first.

---

## Agent Types and When to Use Each

### Investigation Agent (read-only, no worktree needed)

Use when: you need to understand something before deciding what to do.

```
subagent_type: "general-purpose"
isolation: none
```

**Good uses:**
- Auditing 10+ files for a pattern (as we did for the 4-sprint audit)
- Checking if a gate criterion is met (grep + read)
- Understanding what a component currently does before writing a spec for it
- Mapping how data flows from service → hook → page → component

**Prompt structure:**
```
Context: [what this is, why it matters]
Files to read: [exact paths, 5-20 files]
Questions to answer: [numbered list, specific]
Output format: [structured sections, return as text, no file writes]
```

**Parallel investigation** (multiple agents simultaneously):
When you need to audit multiple independent domains at once, spawn all agents in a single message — each gets its own file list and question set. We used this pattern for the 4-sprint audit (17 pages + roles + architecture + components, all in parallel). The synthesis happens after all agents return.

---

### Implementation Agent (writes files, always use worktree)

Use when: you have a complete spec and want code produced.

```
subagent_type: "general-purpose"
isolation: "worktree"
```

**Good uses:**
- Extracting a shared component from copy-pasted code across multiple files
- Migrating a set of files to a new pattern (all modals → ModalShell)
- Writing a new context or hook to a spec
- Applying a list of mechanical changes across many files (rename, remove, replace)

**Prompt structure:**
```
Context: [what this codebase is, tech stack, relevant conventions from CLAUDE.md]
Current state: [what the files look like now — paste relevant snippets or give exact file paths to read first]
Task: [exactly what to change — numbered steps, no ambiguity]
Constraints: [what NOT to touch, what NOT to import, what patterns to follow]
Verification: [how to confirm the change is correct — build command, grep pattern, etc.]
Output: [write to these files; return a summary of changes]
```

**After the agent returns:**
1. Read the diff in full
2. Check against the sprint doc acceptance criteria
3. Run `npm run build` in the workspace
4. If everything passes: merge
5. If anything is wrong: do NOT send the agent back on the same task with a vague "fix it" instruction — rewrite the spec to be more precise, then re-run

---

### QA Agent (read-only, verifies gate criteria)

Use when: a sprint is complete and you need to verify gate criteria before sign-off.

```
subagent_type: "general-purpose"
isolation: none
```

**Prompt structure:**
```
Context: [what sprint just completed, what changed]
Gate criteria: [exact list from the sprint doc]
Files to audit: [the changed files + any they might have affected]
For each criterion, check: [specific grep patterns, file reads, or logic checks]
Output: [checklist — criterion | pass/fail | evidence]
```

**Important:** QA Agent output is a starting point for the QA Engineer, not a replacement for them. The QA Engineer reads the checklist and manually verifies any criterion the agent marks as uncertain.

---

### Synthesis Agent (reads multiple docs, produces plans)

Use when: you have findings from multiple agents and need them integrated into a single document.

```
subagent_type: "general-purpose"
isolation: none
```

This is how we produced `CONSOLE_UX_REVAMP_PLAN.md` — four parallel investigation agents returned their findings, then a synthesis pass combined them.

**Prompt structure:**
```
Context: [what this is for, what decisions will be made from it]
Input documents: [paste summaries or give file paths to read]
Produce: [exact document structure, sections, decisions to make]
Tone: [deterministic — decisions not suggestions; action not observation]
Output: [write to file path X]
```

---

## Sprint Execution Flow (step by step)

```
1. PO writes sprint doc (execution/SPRINT_N_*.md) with task list + gate criteria
   ↓
2. Designer confirms UX copy and interaction spec for the sprint's pages
   ↓
3. FE Dev runs Investigation Agent on target files
   "What is the current state of these files? What do I need to know before changing them?"
   ↓
4. FE Dev reads the investigation output, updates their understanding
   ↓
5. FE Dev runs Implementation Agent (isolation: worktree) per task or task group
   "Change X in these files. Here is the exact spec."
   ↓
6. FE Dev reads the diff, runs npm run build, verifies locally
   ↓
7. FE Dev opens PR — links to sprint task, attaches agent summary
   ↓
8. Another team member reviews (not the agent's author)
   ↓
9. QA Engineer runs QA Agent on changed files against gate criteria
   ↓
10. QA Engineer manually verifies gate criteria
    ↓
11. QA signs off → sprint gate is marked green → PO approves → merge + deploy to staging
    ↓
12. Documentation Agent updates sprint doc status and roadmap
    ↓
13. PO reviews staging → next sprint begins
```

---

## Common Agent Prompt Templates

### Template A — Hardcoded value audit (Investigation)

```
You are auditing the ivisit-console React codebase for hardcoded metric fallbacks.

Context: This is a healthcare operations dashboard. Hardcoded fallback numbers presented as real data are a trust and clinical governance issue.

Files to read:
- C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\src\components\pages\BentoHome.jsx
- [other page files]

Task: Find every instance of a numeric or string fallback value that could be shown to users as if it were real data. Look for:
- `|| N` where N is a number and the left side is fetched data
- `|| 'string'` where the string could be mistaken for real status (e.g. '4.5', 'Active', 'Nominal')
- Hardcoded chart/sparkline data arrays
- Hardcoded trend strings ('23% faster', '+12%', etc.)
- Formulas that fabricate a metric (e.g. someCount * 13)

For each finding, output:
File | Line number | Code snippet | What it shows to users | Severity (P0/P1)

Return as text. Do not write any files.
```

---

### Template B — Component migration (Implementation, worktree)

```
You are migrating modal components in the ivisit-console to use a new shared ModalShell component.

Context:
- This is a React 18 codebase (CRA + CRACO) using shadcn/ui, Tailwind CSS, Framer Motion
- All conventions are in C:\Users\Dyrane\Documents\GitHub\ivisit-console\CLAUDE.md
- The design system is at C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\docs\design-system\CONSOLE_DESIGN_SYSTEM_FROM_APP.md

First, read these files:
- C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\src\components\ui\ModalShell.jsx [the new component]
- C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\src\components\modals\DoctorModal.jsx [to migrate]

Task:
1. Read ModalShell.jsx to understand its props and slot structure
2. Rewrite DoctorModal.jsx to use ModalShell as its outer wrapper
3. Keep all form fields, validation, and submit logic identical — only the shell changes
4. Remove the locally-defined GlassCard component if it exists in DoctorModal.jsx (use GlassSection from ui/ instead)
5. Verify the z-index is now inherited from ModalShell (do not hardcode z-[120])
6. Add aria-labelledby pointing to the modal title element if not already present

Constraints:
- Do not change any form field names, IDs, or submit handlers
- Do not change the modal open/close prop interface (onClose, isOpen)
- Do not import from PageDataContext
- Do not use window.addEventListener or window.dispatchEvent

After writing the file, run: the build would succeed if you ran npm run build in the frontend/ directory. Confirm no unused imports remain.

Return a summary: what changed, what was removed, what props are now inherited from ModalShell.
```

---

### Template C — Gate verification (QA)

```
You are verifying Sprint 1 gate criteria for the ivisit-console.

Sprint 1 goal: Zero hardcoded metric fallbacks. Zero native browser dialogs in clinical flows. Zero broken nav links.

Gate criteria to check (from execution/SPRINT_1_TRUST_CORRECTNESS.md):
1. No `|| N` numeric fallbacks in page components for metrics shown to users
2. No `window.prompt` or `window.confirm` in EmergencyRequestsPage
3. /hospitals minRole in routes.jsx matches navigation.js
4. /insurance minRole in routes.jsx matches navigation.js
5. /organizations has an explicit entry in routes.jsx
6. VerificationQueue shows access-denied UI when canVerify is false

Files to check:
- C:\Users\...\frontend\src\components\pages\BentoHome.jsx
- C:\Users\...\frontend\src\components\pages\EmergencyRequestsPage.jsx
- C:\Users\...\frontend\src\config\routes.jsx
- C:\Users\...\frontend\src\config\navigation.js
- C:\Users\...\frontend\src\components\pages\VerificationQueue.jsx

For each criterion:
- State: PASS or FAIL
- Evidence: the specific code or absence of code that confirms it
- If FAIL: quote the exact line that needs fixing

Return as a checklist table. Do not modify any files.
```

---

## What Agents Must Never Do

These constraints apply to every agent run, every time. If an agent's output does any of the following, discard it entirely and rewrite the prompt with explicit constraints:

- Run `supabase` CLI commands
- Modify `.env`, `.env.local`, or any environment variable file
- Write to `scripts/` migration files
- Call any Supabase Edge Function
- Create Supabase RPC functions or policies
- Import or call `supabase.auth.admin.*` methods
- Access, read, or write any file outside of `frontend/src/` and `frontend/docs/` unless explicitly specified
- Create documentation files (`.md`) unless explicitly asked
- Remove a file without confirming the removal is safe (check for imports first)
