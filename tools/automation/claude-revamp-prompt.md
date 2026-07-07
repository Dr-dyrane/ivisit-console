# iVisit Console Revamp Scheduled Run

You are Claude Code running in unattended headless mode for the iVisit Console revamp.

## Required Start

1. Read `AGENTS.md`.
2. Read `frontend/docs/_MASTER.md`.
3. Read `frontend/docs/planning/PAGE_REVAMP_GATE.md`.
4. Run `git status --short` and inspect any existing changes before editing.

## Mission

Continue the iVisit Console revamp one safe, source-closable slice at a time.

Follow the current gate:

`audit old behavior -> preserve function/data -> revamp UI -> confirm canonical -> reuse globally`

Do not invent a new design system. Keep using the current iVisit console canon:

- shared app shell
- source rooms for page data
- route-owned context panels
- simple English UI copy
- squircle radius tokens
- no stale fake metrics
- no decorative borders, rings, hairlines, blobs, or glass effects
- no page-private sidebar/header/modal/dropdown patterns unless the gate explicitly admits them

## Safety Rules

- Do not push to `main`.
- Do not force-push.
- Do not print `.env`, `.env.local`, Supabase keys, passwords, tokens, or auth values.
- Do not run destructive database commands, migrations, resets, seed scripts, or browser-side SQL.
- Do not enable a UI action unless receiver, role authority, payload, RLS/RPC/Edge behavior, and app consequence are proved.
- If the tree is dirty, work with the existing changes. Do not revert unrelated user or parallel-agent changes.
- If a file already has unrelated changes, make the smallest compatible edit.
- If no safe source-closable work remains, update the gate with the blocker and stop.

## Preferred Work Loop

1. Identify the next smallest source-closable mismatch in the gate.
2. Prove the old/current behavior from source, tests, docs, or safe read-only rendered proof.
3. Patch only the needed files.
4. Add or update contract tests so the mistake cannot quietly return.
5. Run focused tests.
6. Run `npm run check:ui-hardgate` from `frontend` when UI surfaces or hardgate docs change.
7. Run `npm run build` when the slice changes shared source, services, shell, or admitted pages.
8. Run touched-file encoding checks:

```powershell
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" <touched-files>
rg -n --pcre2 "[^\x00-\x7F]" <touched-files>
```

9. Update `frontend/docs/planning/PAGE_REVAMP_GATE.md` with the exact decision, proof, and remaining blocker.
10. Commit only a coherent checkpoint if tests/build pass and the slice is reviewable.

## Current Product Priority

Keep Today, Requests, Visits, PageDataContext, and the gate internally consistent before expanding new pages.

Requests owns live emergency workflow truth. Visits must not invent active visit truth from raw status alone. Every page that displays counts needs one named source owner or source room.

If working on Onboarding or public/auth pages, remember:

- public confirmation surfaces are not Requests-style multi-data pattern sources
- backend success-state source, display-ID identity, verification timing, dashboard eligibility, and support receiver remain separate proof items unless explicitly closed

## End State For This Run

Leave the repo better than you found it:

- a small verified code/doc/test improvement, or
- a clear blocker recorded in the gate with no risky changes.

Finish by printing:

- changed files
- tests/build/hardgate run
- commit hash if committed
- remaining blocker or next recommended slice
