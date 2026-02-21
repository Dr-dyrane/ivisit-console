---
description: Git Rules and Scope Validation Workflow
---

# 🛡️ Git Workflow Rules

Before any code is committed or pushed, the system MUST perform a scope validation to prevent "Accidental Deletions" or "Scope Creep."

## 📋 The Validation Rule
Every contribution must be measured against the **Task Scope**.

1. **Grep Before Edit**: Always check for the existence of CSS variables or utility classes before modifying parent blocks.
2. **Git Diff Audit**: Before adding to git, run a `git diff` on the target file.
   - 🚩 **RED FLAG**: If you see blocks of code removed that aren't mentioned in the task requirements, STOP.
   - 🚩 **RED FLAG**: If `:root` tokens are removed without an explicit request to change the design system, REVERT.
3. **Comparison with Ground Truth**: Compare against the current `Stable Revision` (listed in `/docs/validations/`) to ensure total continuity.

## 🚀 Commit Protocol
- [ ] Check `git diff` for unintended deletions.
- [ ] Verify that no "Core Tokens" (Glow, Glass, Geo) have been removed.
- [ ] Ensure the V-Count and Documentation in `/docs/validations/` are updated.
