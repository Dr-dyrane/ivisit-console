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
- Page 23 Unauthorized: ADMITTED (commit `c6b1330`).
- Page 22 Onboarding Success: ADMITTED (commit `efac625`).
- Page 21 Onboarding: ADMITTED (commit `a7f7d10`), visual surface only. Signed-out rendered proof
  exposed that the earlier cleanup only touched the route/wizard shells; this pass canonicalized all
  five step components + the wizard step indicator and neutralized the theme's brand-red
  `bg-primary`/`text-primary`/`variant="secondary"` (—primary renders `rgb(115,17,22)`) to
  neutral foreground/muted. Seven visual files are now in the default hardgate (88 files).
  Registration-flow receivers (account/org/hospital/claim/Storage/verification/submit/skip) stay
  backend-blocked; `OnboardingContext.jsx`/`onboardingService.js` stay out of the hardgate.
- Page 19 Login: ADMITTED (commit `4d5c109`), visual surface only. Signed out via the app's own
  Settings sign-out (localStorage-clear alone re-hydrates from other tabs), then rendered `/login`
  signed out. Neutralized the red `bg-primary`/`text-primary`/`shadow-primary` submit buttons,
  brand period, shield tiles/icons, and Register/Forgot links to foreground/muted; removed
  `backdrop-blur-sm`/`focus-within:shadow-xl`/`animate-pulse`/`glass-card`. `LoginPage.jsx` in the
  default hardgate (89 files). Auth receivers (Supabase Auth, `check-user` Edge, MFA, OAuth, reset)
  stay backend-blocked; did NOT submit the email step (live Edge call + real reset email).
- NEXT: Page 20 Set Password (visual pass only; auth receiver stays intake-only). Needs a recovery
  deep-link session to render (the form only mounts under a `?type=recovery` / `PASSWORD_RECOVERY`
  session). Authenticated intake pages (12-18) remain backend-authority blocked.
- Concurrency note (2026-07-07): a parallel "interactive-cowork" session may leave uncommitted
  working-tree WIP (see the handshake table in `tools/automation/revamp-queue.md`). As checkpoint
  owner, stage ONLY your own page's files; leave `in_progress` cowork lanes (e.g. Visits, Insurance
  doc) untouched until their owner flips them to `done`. A stale `.git/index.lock` (no running git
  process, minutes old) may be safely removed per git's own guidance.

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
- To schedule every 30 minutes on Windows (opt-in; run once in an elevated PowerShell). Without
  `-Launch` the task runs the *preflight/notifier* only. With `-Launch` it does true auto-continue:
  after a clean preflight it starts Claude Code headless on the resume prompt, which may then
  commit/push to the checkpoint branch unattended:
  ```powershell
  # Preflight/notify only:
  $action  = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument '-NoProfile -File "C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\scripts\revamp-resume.ps1"'
  # Or, for unattended auto-continue, append -Launch to the argument string:
  # $action = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument '-NoProfile -File "C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\scripts\revamp-resume.ps1" -Launch'
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
  Register-ScheduledTask -TaskName 'ivisit-console-revamp-resume' -Action $action -Trigger $trigger -Description 'Preflight/notify (or -Launch auto-continue) for the console revamp cycle'
  ```
  Remove it with `Unregister-ScheduledTask -TaskName 'ivisit-console-revamp-resume' -Confirm:$false`.

Unattended auto-continue (`-Launch`) runs the model unsupervised against a live branch, so it is
opt-in. It stays safe because every run first passes the preflight guards (right branch, clean
tree, origin not ahead) and the in-session protocol still stops on the section-4 conditions; but
it needs the `claude` CLI installed on PATH and its tool permissions pre-approved to run without
prompting. On a machine where `claude` is not on PATH (as in the environment this was built in),
`-Launch` prints how to enable it and the task falls back to notify-and-emit-prompt for a human
to launch.
