---
status: living
owner: product
last_updated: 2026-06-18
---

# Handoff Protocol

> How work moves between layers. Every handoff has a defined owner, a defined deliverable, and a defined acceptance signal. Work does not move to the next layer until the acceptance signal is confirmed.

---

## The Chain

```
Board Intent
    ↓ (PO writes sprint doc)
Product Spec
    ↓ (Designer writes UX copy + interaction spec in sprint doc)
Design Ready
    ↓ (FE/BE Dev runs Investigation Agent, reads output)
Implementation Started
    ↓ (FE/BE Dev runs Implementation Agent or writes code)
Code Complete
    ↓ (FE Dev opens PR, links to sprint task)
Peer Review
    ↓ (Another dev approves the PR)
QA Verification
    ↓ (QA Engineer runs QA Agent + manual walkthrough, signs off gate)
Staging Deploy
    ↓ (DevOps deploys to staging)
PO Acceptance
    ↓ (PO reviews on staging, confirms sprint goal is met)
Production Deploy
    ↓ (DevOps deploys to production)
Monitoring
    ↓ (DevOps + PO watch for regressions 48 hours post-deploy)
Sprint Closed
```

---

## Handoff 1: Board Intent → Product Spec

**From:** Product Owner (driven by Board Brief and strategy decisions)
**To:** Sprint doc in `execution/SPRINT_N_*.md`
**Signal that it's ready:** Sprint doc has task list, acceptance criteria, and gate criteria. Designer has been consulted on UX copy.

**Deliverable checklist:**
- [ ] Sprint goal written (one sentence)
- [ ] All tasks listed with priority (P0/P1/P2), owner, and agent flag
- [ ] Acceptance criteria per task (numbered, testable, not subjective)
- [ ] Gate criteria listed (the checklist QA will run)
- [ ] Risk Register reviewed for this sprint's risks
- [ ] Architecture dependencies confirmed (what data layer passes must be complete)

---

## Handoff 2: Product Spec → Design Ready

**From:** Lead Designer
**To:** Sprint doc updated with UX copy, interaction spec, and design tokens used
**Signal that it's ready:** Designer adds "Design Ready ✓" comment to the sprint doc with a link to any mockups

**Deliverable checklist:**
- [ ] Button labels, empty state copy, error messages written (not left as placeholders)
- [ ] Which design tokens to use for any new component (from `CONSOLE_DESIGN_SYSTEM_FROM_APP.md`)
- [ ] Interaction states defined: default, hover, active, disabled, loading, error
- [ ] Mobile behaviour specified if different from desktop
- [ ] Accessibility notes: focus order, ARIA labels, keyboard nav requirements

---

## Handoff 3: Design Ready → Implementation

**From:** Frontend Developer (or Backend Developer for service changes)
**To:** Code in a worktree branch, linked to the sprint task
**Signal that it's ready:** PR opened, linked to sprint task, `npm run build` passes, no TypeScript errors

**Before implementation starts:**
- FE Dev reads all target files themselves (not via agent)
- If the scope is large (>5 files), run an Investigation Agent first to map the current state
- Write or confirm the spec in the sprint doc is precise enough for an agent to execute

**If using an Implementation Agent:**
- Spec must match Template B in `AGENT_EXECUTION_GUIDE.md`
- Agent runs with `isolation: "worktree"`
- FE Dev reads every line of the diff before opening the PR

**PR requirements:**
- Title: `Sprint N — Task N.N: [short description]`
- Body: links to sprint doc task, links to acceptance criteria, summary of what changed
- Label: `sprint-N`, `ux-revamp`
- At least one reviewer who is not the author

---

## Handoff 4: Implementation → Peer Review

**From:** Code author (FE/BE Dev)
**To:** Another developer (not the agent's author if agent-produced)
**Signal that it's ready:** PR approved with no outstanding comments

**Reviewer checklist:**
- [ ] Code matches the spec in the sprint doc
- [ ] No hardcoded fallback numbers introduced
- [ ] No `window.confirm` / `window.prompt` introduced
- [ ] No `window.addEventListener` / `window.dispatchEvent` introduced (unless explicitly planned)
- [ ] No new locally-defined sub-components that duplicate existing shared components
- [ ] Imports are clean (no unused, no PageDataContext if the task didn't require it)
- [ ] ARIA attributes present on any new interactive element
- [ ] TypeScript: no new `any` types added without justification

---

## Handoff 5: Peer Review → QA Verification

**From:** Reviewed and approved PR (merged to staging branch)
**To:** QA sign-off checklist in the sprint doc
**Signal that it's ready:** QA Engineer marks all gate criteria as green

**QA process:**
1. QA Engineer reads the sprint doc gate criteria
2. Runs QA Agent audit (Template C in `AGENT_EXECUTION_GUIDE.md`) against changed files
3. Reads the QA Agent checklist
4. Manually verifies any criteria the agent marks as uncertain or fail
5. Performs manual walkthrough on staging:
   - Test every role affected by the sprint's changes (impersonate each role)
   - Test on mobile viewport (375px) and desktop (1280px minimum)
   - Test dark mode and light mode
   - Test with empty data (new org account) and populated data
6. Signs off gate in the sprint doc: "Gate verified ✓ — [QA Engineer name] — [date]"

---

## Handoff 6: QA → Staging Deploy

**From:** QA sign-off
**To:** Staging environment running the sprint's changes
**Signal that it's ready:** Staging deploy successful, staging URL accessible

**DevOps checklist:**
- [ ] Build passes in CI
- [ ] Deploy to staging completes without errors
- [ ] Staging URL accessible with all role types
- [ ] No console errors on page load

---

## Handoff 7: Staging → PO Acceptance

**From:** Staging deploy
**To:** PO confirms the sprint goal is met on staging
**Signal that it's ready:** PO writes "PO Acceptance ✓" in the sprint doc

**PO acceptance walkthrough:**
- PO logs into staging as each affected role
- PO confirms the sprint goal sentence is satisfied ("no fabricated data visible", "doctor can find personal queue in 10 seconds", etc.)
- PO checks that no new regression is visible on pages not part of this sprint

---

## Handoff 8: PO Acceptance → Production Deploy

**From:** PO acceptance
**To:** Production environment
**Signal that it's ready:** DevOps confirms production deploy complete

**Production deploy checklist:**
- [ ] Deploy triggered from the exact commit that passed staging
- [ ] No environment variable changes without explicit PO approval
- [ ] Post-deploy smoke test: homepage loads for each role, no JavaScript errors
- [ ] Monitoring dashboards checked 15 minutes post-deploy

---

## Handoff 9: Production Deploy → Sprint Closed

**From:** Production deploy confirmed stable (48 hours)
**To:** Sprint doc marked as Closed, roadmap updated

**Closing checklist:**
- [ ] Sprint doc status set to "Closed — [date]"
- [ ] PRODUCT_ROADMAP.md sprint status updated to ✅ Complete
- [ ] Any tasks that were deferred noted in the next sprint's doc
- [ ] Documentation Agent run to update INDEX files if new components or docs were created
- [ ] Retrospective note added to sprint doc: what went well, what didn't

---

## Emergency Rollback Protocol

If a production deploy causes a visible regression in any clinical workflow (emergency dispatch, visit management, authentication):

1. DevOps reverts to the previous deploy immediately — no waiting for a fix
2. PO is notified within 15 minutes
3. FE/BE Dev investigates the regression on staging using the reverted state
4. A hotfix PR is prepared, goes through the full QA process (abbreviated but not skipped)
5. The original sprint task that caused the regression is marked as "Blocked — regression" in the sprint doc
6. Risk Register is updated with the new risk

Rollback is never embarrassing. Fabricated data or broken clinical flows reaching real healthcare workers is.
