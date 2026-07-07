---
status: living
owner: revamp
created: 2026-07-07
purpose: durable restart/continuation protocol so the console revamp survives a stopped session
---

# Console Revamp Resume Protocol

This is the durable restart plan for the iVisit Console revamp. If a Claude Code session
stops for any reason, the next run resumes exactly by following this file. It exists so the
work does not depend on one long fragile session.

The authoritative page state lives in `docs/planning/PAGE_REVAMP_GATE.md`. This file is the
*process* wrapper around it: how to wake up safely, do one slice, and hand off.

---

## 1. Hard guardrails (never violated by any cycle)

- Work only on branch `codex/ivisit-console-revamp-checkpoint-20260707` (or a child branch of it).
- Never push to `main`. Never merge to `main`. Never force-push. Push only the checkpoint branch.
- Preserve old behavior from the preservation baseline commit `f31f29f`. Old-behavior proof must
  read `git show f31f29f:<path>`, never the moving `HEAD` (HEAD has advanced past the baseline;
  see the "Preservation Baseline Re-Anchor - 2026-07-07" note in the gate doc).
- Reuse the local dev server on `localhost:3000` if it is already listening. Do not spawn a
  second dev server.
- Never print secrets. Use only the variable NAMES from `frontend/.env.local`:
  `IVISIT_TEST_ADMIN_EMAIL`, `IVISIT_TEST_ADMIN_PASSWORD`. Do not read or echo their values, and
  do not type a password into any tool call (that would expose it in the transcript). If a slice
  needs an authenticated render and a session is not already active in the browser, prefer the
  signed-out render or an already-active session; document the badge/authenticated detail as
  source-verified instead of exposing credentials.

## 2. One cycle = one page, one slice

Each wake cycle does exactly one small, coherent slice on exactly one page, in gate order
(RBAC first, layout second, data/source ownership third, visual fourth, engineering last):

1. `git status --short --branch` and `git log --oneline -5`. Understand the tree before editing.
2. Read the top of `docs/planning/PAGE_REVAMP_GATE.md` (checkpoint decision, re-anchor note,
   latest recertification) and the current page's section.
3. Pick ONE page. Default to the "Current pointer" below unless the gate already proves it done.
4. Prove current state from source, the page's contract test, and `git show f31f29f:<old path>`.
5. Do the next source-closable slice only. No repo-wide sweeps. No admitting a page on resemblance.
6. Add/update the page's contract test for the rule you changed.
7. Verify (see section 3).
8. Commit one coherent checkpoint. Push the checkpoint branch only.
9. Update the "Current pointer" below and write a resume block (section 5) in the final message.

## 3. Verification each cycle

- Focused: `npm test -- --watchAll=false --runInBand --forceExit --testPathPattern=<Page>.contract.test.js`
- Strict radius on touched revamp files: `npm run check:ui-hardgate:revamp -- <files>`
- If a page is admitted/visual: reuse `localhost:3000`, render desktop + mobile proof, verify
  no shell leakage, no duplicate nav, no framework overlay, no horizontal overflow, review the
  browser console, and exercise one interaction's feedback.
- Broad (when relevant): `npm test -- --watchAll=false --runInBand --forceExit --testPathPattern=contract\.test\.js`,
  `npm run check:ui-hardgate`, and `npm run build` when runtime/source/design-system enforcement changed.
- Hygiene on touched files: `git diff --check`, plus mojibake/non-ASCII/trailing-whitespace scans.

## 4. Stop-and-ask conditions (do not push through these)

Stop the cycle and ask the user for review only if:

- Git has conflicting uncommitted changes the cycle did not create (dirty tree at wake time).
- Local and `origin` have diverged in a way that would need a non-fast-forward or force push.
- Tests fail in a way the cycle cannot repair from repo evidence.
- The slice requires backend/RLS/RPC/Edge/receiver or app-consequence authority that does not
  exist in this repo (keep the page intake-only and document the blocker instead).
- A push to `main` or a merge would be required.

## 5. Resume block format (end every cycle with this)

```
Page handled: <page + what slice>
Proof completed: <tests + rendered proof, or "source-only, blocker: ...">
Screenshots: <ids/paths if any>
Current blockers: <backend/rendered/none>
Next exact page: <page + first action>
Branch / commit: codex/ivisit-console-revamp-checkpoint-20260707 @ <sha>, pushed, tree <clean/dirty>
```

## 6. Current pointer

- Page 24 Catch-All Not Found: ADMITTED (commit `3dbbff7`).
- Page 23 Unauthorized: visual pass in progress / admitted this cycle (see gate Page 23 section).
- Next after Page 23: Page 22 Onboarding Success, then Page 21/20/19 public-auth surfaces
  (visual pass only; their receiver/redirect/flow blockers stay intake-only). Authenticated
  intake pages (12-18) remain backend-authority blocked (not source-closable here).

## 7. How resumption actually works (and why not cloud cron)

Native Claude Code scheduled agents ("routines"/cron) run in Anthropic's cloud. They cannot
reach this machine's `localhost:3000` or drive the local browser, so they cannot do the rendered
proof this revamp requires. Therefore resumption is LOCAL:

- `scripts/revamp-resume.ps1` is a safe preflight: it verifies the branch, checks the tree is
  clean, checks whether `localhost:3000` is already serving (reuse, do not spawn a second),
  confirms the `.env.local` credential var NAMES exist (never their values), prints the latest
  commits, and emits the ready-to-run resume prompt. It makes no code edits.
- To resume by hand: run `pwsh -File frontend/scripts/revamp-resume.ps1`, read its preflight,
  then start a Claude Code session with the emitted resume prompt.
- To schedule every 30 minutes on Windows (opt-in; run once in an elevated PowerShell). This only
  runs the *preflight/notifier*; it deliberately does not auto-commit or auto-push unsupervised:
  ```powershell
  $action  = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument '-NoProfile -File "C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\scripts\revamp-resume.ps1"'
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
  Register-ScheduledTask -TaskName 'ivisit-console-revamp-resume' -Action $action -Trigger $trigger -Description 'Preflight/notify to resume the console revamp cycle'
  ```
  Remove it with `Unregister-ScheduledTask -TaskName 'ivisit-console-revamp-resume' -Confirm:$false`.

Unattended auto-commit/push every 30 minutes is intentionally NOT enabled by default: it would
run the model unsupervised against a live branch. Enable that only with explicit user intent.
