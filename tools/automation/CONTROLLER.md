# Revamp Controller

Control layer over the 30-min headless loop (`tools/automation/*`) and the resume protocol
(`frontend/docs/planning/REVAMP_RESUME_PROTOCOL.md`). Read this first when acting as controller.

## 1. The bottleneck is capability, not compute

The source-closable safety layer is essentially exhausted. What remains needs capabilities the
headless `claude -p` loop does not have:

- **`browser`** — per-page rendered-proof visual admissions (Login next; Onboarding/Set-Password
  re-do). The loop has no browser, so it CANNOT do these.
- **`backend`** — intake pages 12-18 need Supabase projection/receiver/RLS truth, not in this repo.

So more parallel headless agents do NOT make this faster — they spin on work they can't finish.
**Fast = route each item to the executor that can complete it. Efficient = no collisions + no re-auditing.**

## 2. Roles (route work by capability)

| Executor | Does | Cannot do |
|---|---|---|
| Headless loop (`claude -p`, 30 min) | `headless` queue items: contract-test hardening, gate/queue consistency, encoding, blocker docs | rendered proof (no browser); backend proof (no Supabase) |
| Interactive controller (Claude + Chrome MCP, or a human) | `browser` items: rendered-proof visual admissions; review what the loop pushed | — |
| (parked) | `backend` items: wait for the user to supply receiver/RLS truth | — |

The loop reads `revamp-queue.md` and picks the next `todo`+`headless` item. When only
`browser`/`backend` items remain, it records that in the gate and stops — it must not spin
or attempt work it can't finish.

## 3. No collisions (the #1 efficiency fix)

The loop + a live-editing user on ONE working tree collide: the dirty-tree guard stops the run,
or `-AllowDirty` folds your uncommitted WIP into the loop's commit and races your edits. Pick one:

- **(A) Isolation (recommended for unattended runs):** give the loop its own git worktree on a
  child branch so it never touches your main tree:
  ```powershell
  git worktree add ..\ivisit-console-autorun -b codex\revamp-autorun
  # point claude-revamp-run.ps1 $RepoRoot at that worktree; merge codex/revamp-autorun into the
  # checkpoint branch when you review.
  ```
- **(B) Discipline:** commit or stash your WIP before a wake fires, and don't edit the files the
  loop is editing. Do NOT run `-AllowDirty` while actively editing the same files.

## 4. Efficiency rules

- Queue-driven: read `revamp-queue.md` + only the target page's gate section, not the full gate.
- New files can be committed on a dirty tree (they don't collide with WIP) — use `git add <newfile>`.
- To commit into a file the user is editing, stage only your hunks (filtered `git apply --cached`);
  never `git add` the whole shared file mid-collision.
- One coherent commit per slice. Never push `main`; never force-push.

## 5. Current controller decision

- **Next fast win:** Page 19 Login (`browser`) — done by the interactive controller (real rendered proof).
- **Headless loop:** contract-test hardening + keep gate/queue consistent; skip browser/backend items.
- **Parked:** intake pages 12-18 until the user supplies Supabase receiver/RLS truth.
